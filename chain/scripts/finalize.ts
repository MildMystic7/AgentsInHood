import hre from "hardhat";

const { ethers } = await hre.network.create();

const address = process.env.PREDICTION_VAULT_ADDRESS?.trim() ?? "";
if (!ethers.isAddress(address)) {
  throw new Error("PREDICTION_VAULT_ADDRESS must be a valid contract address.");
}

const vault = await ethers.getContractAt("AgentPredictionVault", address);
if (!(await vault.resultProposed())) {
  throw new Error("No result proposal exists.");
}

const finalizesAt = Number(await vault.resultFinalizesAt());
const latestBlock = await ethers.provider.getBlock("latest");
if (!latestBlock || latestBlock.timestamp < finalizesAt) {
  throw new Error(
    `The dispute window is active until ${new Date(finalizesAt * 1000).toISOString()}.`,
  );
}

const transaction = await vault.finalizeResult();
console.log(`Finalization transaction: ${transaction.hash}`);
await transaction.wait();
console.log(`Result finalized for vault ${address}.`);
