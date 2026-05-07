import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

console.log("ETH key exists:", !!process.env.ETH_PRIVATE_KEY);
console.log("SOL key exists:", !!process.env.SOL_PRIVATE_KEY);
console.log("SOL key starts with:", process.env.SOL_PRIVATE_KEY?.slice(0, 5));
console.log("SOL key length:", process.env.SOL_PRIVATE_KEY?.length);