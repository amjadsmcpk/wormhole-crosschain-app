import dotenv from "dotenv";
import { getSolanaKeypair, getEthereumWallet } from "./wallets";

dotenv.config({ path: ".env.local" });

const solWallet = getSolanaKeypair();
const ethWallet = getEthereumWallet();

console.log("Solana address:", solWallet.publicKey.toBase58());
console.log("Ethereum address:", ethWallet.address);