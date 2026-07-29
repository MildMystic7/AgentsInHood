import hre from "hardhat";

const { ethers } = await hre.network.create();

const startDelaySeconds = Number(process.env.PREDICTION_START_DELAY_SECONDS ?? "900");
if (!Number.isInteger(startDelaySeconds) || startDelaySeconds < 300) {
  throw new Error("PREDICTION_START_DELAY_SECONDS must be an integer of at least 300 seconds.");
}

const [deployer] = await ethers.getSigners();
const latestBlock = await ethers.provider.getBlock("latest");
if (!latestBlock) {
  throw new Error("Unable to read the latest block.");
}

const startsAt = latestBlock.timestamp + startDelaySeconds;
const vault = await ethers.deployContract("AgentPredictionVault", [
  startsAt,
  deployer.address,
]);
await vault.waitForDeployment();

const address = await vault.getAddress();
console.log(`Prediction vault: ${address}`);
console.log(`Owner: ${deployer.address}`);
console.log(`Starts at: ${new Date(startsAt * 1000).toISOString()}`);
console.log(`Betting closes: ${new Date((startsAt + 3600) * 1000).toISOString()}`);
console.log(`Challenge ends: ${new Date((startsAt + 10800) * 1000).toISOString()}`);
