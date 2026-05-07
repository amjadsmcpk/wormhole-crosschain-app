import { wormhole, Wormhole } from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import { getTokenDecimals } from "./helpers";

async function executeCrossChainTransfer() {
  const wh = await wormhole("Testnet", [evm, solana]);

  const sendChain = wh.getChain("Solana");

  // Get native token (SOL)
  const token = Wormhole.tokenId(sendChain.chain, "native");

  console.log("Getting cross-chain token:", token.address);

  // Get token decimals
  const decimals = await getTokenDecimals(wh, token, sendChain);

  console.log("Token decimals:", decimals);

  // Supported chains
  const supportedChains = [
    "Solana",
    "Sepolia",
    "BaseSepolia",
    "ArbitrumSepolia",
    "OptimismSepolia",
    "Polygon",
    "Avalanche"
  ];

  supportedChains.forEach((chainName) => {
    const chain = wh.getChain(chainName as any);
    console.log(`🔹 ${chain.chain}`);
  });
}

executeCrossChainTransfer().catch(console.error);