import { network } from "hardhat";

const { viem, networkName } = await network.connect();

console.log(`Deploying to ${networkName}...`);

const [deployer] = await viem.getWalletClients();
const owner = deployer.account.address;

console.log("Owner:", owner);

const loanToken = await viem.deployContract("LoanToken", [
  "Loan Token",
  "LOAN",
  owner,
]);

console.log("LoanToken deployed to:", loanToken.address);

const stakingTokenAddress = loanToken.address; // temporary testing token
const priceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD
const ltvBps = 5000n; // 50%

const staking = await viem.deployContract("CrossChainStaking", [
  stakingTokenAddress,
  loanToken.address,
  priceFeed,
  ltvBps,
  owner,
]);

console.log("CrossChainStaking deployed to:", staking.address);

await loanToken.write.addMinter([staking.address]);

console.log("CrossChainStaking added as LoanToken minter");