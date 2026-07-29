import hre from "hardhat";

const { ethers } = await hre.network.create();

const address = process.env.PREDICTION_VAULT_ADDRESS?.trim() ?? "";
const winner = Number(process.env.PREDICTION_WINNER_ID ?? "");
const evidenceHash = process.env.PREDICTION_EVIDENCE_HASH?.trim() ?? "";

if (!ethers.isAddress(address)) {
  throw new Error("PREDICTION_VAULT_ADDRESS must be a valid contract address.");
}
if (!Number.isInteger(winner) || winner < 0 || winner > 4) {
  throw new Error("PREDICTION_WINNER_ID must be an integer from 0 to 4.");
}
if (!ethers.isHexString(evidenceHash, 32) || evidenceHash === ethers.ZeroHash) {
  throw new Error("PREDICTION_EVIDENCE_HASH must be a non-zero bytes32 hash.");
}

const vault = await ethers.getContractAt("AgentPredictionVault", address);
const endsAt = Number(await vault.challengeEndsAt());
const latestBlock = await ethers.provider.getBlock("latest");
if (!latestBlock || latestBlock.timestamp < endsAt) {
  throw new Error(
    `The challenge is still running. It ends at ${new Date(endsAt * 1000).toISOString()}.`,
  );
}

const transaction = await vault.resolve(winner, evidenceHash);
console.log(`Resolution transaction: ${transaction.hash}`);
await transaction.wait();
console.log(`Winner ${winner} confirmed for vault ${address}.`);
