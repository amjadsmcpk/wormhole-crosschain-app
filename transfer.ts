import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { wormhole, amount, Wormhole } from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";

import { getSigner, getTokenDecimals } from "./helpers";

import {
  createTransfer,
  updateTransfer,
} from "./transfer-state";

type ErrorType =
  | "GUARDIAN_TIMEOUT"
  | "RPC_ERROR"
  | "INSUFFICIENT_GAS"
  | "CONTRACT_ERROR"
  | "WALLET_ERROR"
  | "ALREADY_REDEEMED"
  | "UNKNOWN_ERROR";

function transferUrl(txid: string): string {
  return `https://wormholescan.io/#/tx/${txid}?network=Testnet`;
}

function logStatus(status: string, message: string) {
  console.log(`[${status}] ${message}`);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getFullError(error: unknown): string {
  try {
    return JSON.stringify(
      error,
      Object.getOwnPropertyNames(error),
      2
    );
  } catch {
    return String(error);
  }
}

function classifyError(error: unknown): ErrorType {
  const msg = getFullError(error).toLowerCase();

  if (
    msg.includes("vaa") ||
    msg.includes("attestation") ||
    msg.includes("timeout")
  ) {
    return "GUARDIAN_TIMEOUT";
  }

  if (
    msg.includes("already redeemed") ||
    msg.includes("already completed")
  ) {
    return "ALREADY_REDEEMED";
  }

  if (
    msg.includes("rpc") ||
    msg.includes("network") ||
    msg.includes("connection")
  ) {
    return "RPC_ERROR";
  }

  if (
    msg.includes("gas") ||
    msg.includes("out of gas")
  ) {
    return "INSUFFICIENT_GAS";
  }

  if (
    msg.includes("contract") ||
    msg.includes("revert")
  ) {
    return "CONTRACT_ERROR";
  }

  if (
    msg.includes("signer") ||
    msg.includes("wallet") ||
    msg.includes("privatekey")
  ) {
    return "WALLET_ERROR";
  }

  return "UNKNOWN_ERROR";
}

function recoverySuggestion(type: ErrorType): string {
  switch (type) {
    case "GUARDIAN_TIMEOUT":
      return "Guardian VAA may be delayed. Retry later.";

    case "ALREADY_REDEEMED":
      return "Transfer may already be completed.";

    case "RPC_ERROR":
      return "RPC provider may be unstable.";

    case "INSUFFICIENT_GAS":
      return "Add more Sepolia ETH.";

    case "CONTRACT_ERROR":
      return "Verify contract address and balances.";

    case "WALLET_ERROR":
      return "Check wallet private keys.";

    default:
      return "Check FULL_ERROR logs.";
  }
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  label: string,
  options = {
    maxAttempts: 5,
    initialDelay: 3000,
    maxDelay: 15000,
    backoffMultiplier: 1.5,
  }
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= options.maxAttempts;
    attempt++
  ) {
    try {
      logStatus(
        "TRY",
        `${label} attempt ${attempt}/${options.maxAttempts}`
      );

      return await operation();
    } catch (error) {
      lastError = error;

      const type = classifyError(error);

      logStatus("ERROR", `${label} failed`);
      logStatus("ERROR_TYPE", type);

      logStatus(
        "MESSAGE",
        getErrorMessage(error)
      );

      logStatus(
        "FULL_ERROR",
        getFullError(error)
      );

      logStatus(
        "RECOVERY",
        recoverySuggestion(type)
      );

      if (attempt < options.maxAttempts) {
        const delay = Math.min(
          options.initialDelay *
            Math.pow(
              options.backoffMultiplier,
              attempt - 1
            ),
          options.maxDelay
        );

        logStatus(
          "RETRYING",
          `Retrying in ${delay / 1000} seconds`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );
      }
    }
  }

  throw new Error(
    `${label} failed after ${options.maxAttempts} attempts`,
    {
      cause: lastError,
    }
  );
}

async function executeCrossChainTransfer() {
  const transferRecord = createTransfer();

  try {
    logStatus(
      "START",
      "Starting advanced cross-chain transfer"
    );

    logStatus(
      "TRANSFER_ID",
      transferRecord.id
    );

    const wh = await wormhole("Testnet", [
      solana,
      evm,
    ]);

    const sendChain = wh.getChain("Solana");
    const rcvChain = wh.getChain("Sepolia");

    logStatus(
      "SIGNER",
      "Loading wallets"
    );

    const source = await getSigner(sendChain);
    const destination = await getSigner(rcvChain);

    updateTransfer(
      transferRecord.id,
      {
        status: "SIGNER_READY",
      },
      "SIGNER_READY"
    );

    logStatus(
      "SENDER",
      source.address.address.toString()
    );

    logStatus(
      "RECEIVER",
      destination.address.address.toString()
    );

    const token = Wormhole.tokenId(
      sendChain.chain,
      "native"
    );

    const decimals =
      await getTokenDecimals(
        wh,
        token,
        sendChain
      );

    const amt = "0.01";

    const transferAmount = amount.units(
      amount.parse(amt, decimals)
    );

    logStatus(
      "TOKEN",
      token.address.toString()
    );

    logStatus(
      "AMOUNT",
      `${amt} SOL`
    );

    const xfer = await wh.tokenTransfer(
      token,
      transferAmount,
      source.address,
      destination.address,
      "TokenBridge",
      undefined
    );

    logStatus(
      "INITIATED",
      "Creating source transaction on Solana"
    );

    const srcTxids =
      await executeWithRetry(
        () =>
          xfer.initiateTransfer(
            source.signer
          ),
        "Source transfer"
      );

    updateTransfer(
      transferRecord.id,
      {
        status: "SOURCE_SUBMITTED",
        sourceTx: srcTxids[0],
      },
      "SOURCE_SUBMITTED"
    );

    logStatus(
      "SOURCE_TX",
      srcTxids[0]
    );

    logStatus(
      "WORMHOLESCAN_SOURCE",
      transferUrl(srcTxids[0])
    );

    updateTransfer(
      transferRecord.id,
      {
        status: "VAA_PENDING",
      },
      "VAA_PENDING"
    );

    logStatus(
      "ATTESTING",
      "Waiting for Guardian VAA"
    );

    await executeWithRetry(
      () =>
        xfer.fetchAttestation(
          5 * 60 * 1000
        ),
      "Guardian attestation"
    );

    updateTransfer(
      transferRecord.id,
      {
        status: "VAA_RECEIVED",
      },
      "VAA_RECEIVED"
    );

    logStatus(
      "VAA_RECEIVED",
      "Guardian VAA received successfully"
    );

    updateTransfer(
      transferRecord.id,
      {
        status:
          "DESTINATION_SUBMITTED",
      },
      "DESTINATION_SUBMITTED"
    );

    logStatus(
      "COMPLETING",
      "Redeeming transfer on Sepolia"
    );

    const destTxids =
      await executeWithRetry(
        () =>
          xfer.completeTransfer(
            destination.signer
          ),
        "Destination redemption"
      );

    updateTransfer(
      transferRecord.id,
      {
        status: "COMPLETED",
        destinationTx: destTxids[0],
      },
      "COMPLETED"
    );

    logStatus(
      "COMPLETED",
      "Cross-chain transfer successful"
    );

    logStatus(
      "DESTINATION_TX",
      destTxids[0]
    );

    logStatus(
      "WORMHOLESCAN_DESTINATION",
      transferUrl(destTxids[0])
    );
  } catch (error) {
    const type = classifyError(error);

    updateTransfer(
      transferRecord.id,
      {
        status: "RECOVERABLE",
        errorType: type,
        recoverySuggestion:
          recoverySuggestion(type),
      },
      "RECOVERABLE_ERROR"
    );

    logStatus(
      "FAILED",
      "Transfer failed"
    );

    logStatus(
      "ERROR_TYPE",
      type
    );

    logStatus(
      "MESSAGE",
      getErrorMessage(error)
    );

    logStatus(
      "FULL_ERROR",
      getFullError(error)
    );

    logStatus(
      "RECOVERY",
      recoverySuggestion(type)
    );
  }
}

executeCrossChainTransfer();