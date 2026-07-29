import hre from "hardhat";

const { ethers } = await hre.network.create();

const REQUIRED_ACK = "I_HAVE_WRITTEN_APPROVAL_AND_ACCEPT_MAINNET_RISK";
if (process.env.PREDICTION_MAINNET_LAUNCH_ACK !== REQUIRED_ACK) {
  throw new Error("Mainnet launch acknowledgement is missing.");
}

const network = await ethers.provider.getNetwork();
if (network.chainId !== 4_663n) {
  throw new Error(`Refusing deployment on chain ${network.chainId}; expected 4663.`);
}

const owner = process.env.PREDICTION_OWNER_ADDRESS?.trim() ?? "";
const registry = process.env.PREDICTION_ELIGIBILITY_REGISTRY_ADDRESS?.trim() ?? "";
if (!ethers.isAddress(owner) || owner === ethers.ZeroAddress) {
  throw new Error("PREDICTION_OWNER_ADDRESS must be a non-zero multisig address.");
}
if ((await ethers.provider.getCode(owner)) === "0x") {
  throw new Error("PREDICTION_OWNER_ADDRESS must be a deployed multisig contract.");
}
if (!ethers.isAddress(registry) || registry === ethers.ZeroAddress) {
  throw new Error("PREDICTION_ELIGIBILITY_REGISTRY_ADDRESS is required for mainnet.");
}
if ((await ethers.provider.getCode(registry)) === "0x") {
  throw new Error("The eligibility registry address has no deployed bytecode.");
}

const startDelaySeconds = Number(process.env.PREDICTION_START_DELAY_SECONDS ?? "");
const disputeSeconds = Number(process.env.PREDICTION_DISPUTE_SECONDS ?? "");
if (!Number.isInteger(startDelaySeconds) || startDelaySeconds < 86_400) {
  throw new Error("Mainnet must be scheduled at least 24 hours before it starts.");
}
if (!Number.isInteger(disputeSeconds) || disputeSeconds < 3_600) {
  throw new Error("Mainnet dispute duration must be at least 3600 seconds.");
}

const minimumStake = ethers.parseEther(process.env.PREDICTION_MINIMUM_STAKE_ETH ?? "");
const maximumStake = ethers.parseEther(
  process.env.PREDICTION_MAXIMUM_STAKE_PER_WALLET_ETH ?? "",
);
const maximumPool = ethers.parseEther(process.env.PREDICTION_MAXIMUM_POOL_ETH ?? "");
if (minimumStake <= 0n || maximumStake < minimumStake || maximumPool < maximumStake) {
  throw new Error("Invalid mainnet stake or pool limits.");
}

const [deployer] = await ethers.getSigners();
if (owner.toLowerCase() === deployer.address.toLowerCase()) {
  throw new Error("The vault owner must be separate from the deployment signer.");
}

const latestBlock = await ethers.provider.getBlock("latest");
if (!latestBlock) throw new Error("Unable to read the latest block.");
const startsAt = latestBlock.timestamp + startDelaySeconds;

const vault = await ethers.deployContract("AgentPredictionVault", [
  startsAt,
  owner,
  minimumStake,
  maximumStake,
  maximumPool,
  disputeSeconds,
  registry,
]);
await vault.waitForDeployment();

console.log(`Prediction vault: ${await vault.getAddress()}`);
console.log(`Owner: ${owner}`);
console.log(`Eligibility registry: ${registry}`);
console.log(`Starts at: ${new Date(startsAt * 1000).toISOString()}`);
console.log(`Betting closes: ${new Date((startsAt + 3_600) * 1000).toISOString()}`);
console.log(`Challenge ends: ${new Date((startsAt + 10_800) * 1000).toISOString()}`);
console.log(`Dispute duration: ${disputeSeconds} seconds`);
console.log(`Minimum stake: ${ethers.formatEther(minimumStake)} ETH`);
console.log(`Maximum per wallet: ${ethers.formatEther(maximumStake)} ETH`);
console.log(`Maximum total pool: ${ethers.formatEther(maximumPool)} ETH`);
