import "dotenv/config";
import bs58 from "bs58";

import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";

export function getSolanaKeypair() {
  const secret = process.env.SOL_PRIVATE_KEY;

  if (!secret) {
    throw new Error("SOL_PRIVATE_KEY missing");
  }

  const secretKey = Uint8Array.from(JSON.parse(secret));

  return Keypair.fromSecretKey(secretKey);
}

export function getEthereumWallet() {
  const privateKey = process.env.ETH_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("ETH_PRIVATE_KEY missing");
  }

  return new ethers.Wallet(privateKey);
}