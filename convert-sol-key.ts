import fs from "fs";
import bs58 from "bs58";

const raw = fs.readFileSync("/home/codespace/.config/solana/id.json", "utf8");
const arr = JSON.parse(raw);
const base58Key = bs58.encode(Uint8Array.from(arr));

console.log(base58Key);