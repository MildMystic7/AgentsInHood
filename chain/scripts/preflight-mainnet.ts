import hre from "hardhat";

const { ethers } = await hre.network.create();

const address = process.env.PREDICTION_VAULT_ADDRESS?.trim() ?? "";
if (!ethers.isAddress(address)) {
  throw new Error("PREDICTION_VAULT_ADDRESS must be a valid contract address.");
}

const network = await ethers.provider.getNetwork();
if (network.chainId !== 4_663n) {
  throw new Error(`Wrong chain ${network.chainId}; expected Robinhood mainnet 4663.`);
}
if ((await ethers.provider.getCode(address)) === "0x") {
  throw new Error("Vault address has no deployed bytecode.");
}

const vault = await ethers.getContractAt("AgentPredictionVault", address);
const [
  owner,
  registry,
  startsAt,
  bettingClosesAt,
  challengeEndsAt,
  minimumStake,
  maximumStake,
  maximumPool,
  disputeSeconds,
  totalPool,
  settlement,
  resultProposed,
] = await Promise.all([
  vault.owner(),
  vault.eligibilityRegistry(),
  vault.startsAt(),
  vault.bettingClosesAt(),
  vault.challengeEndsAt(),
  vault.minimumStake(),
  vault.maximumStakePerWallet(),
  vault.maximumTotalPool(),
  vault.resultDisputeDuration(),
  vault.totalPool(),
  vault.settlement(),
  vault.resultProposed(),
]);

if (registry === ethers.ZeroAddress || (await ethers.provider.getCode(registry)) === "0x") {
  throw new Error("Eligibility registry is missing or has no bytecode.");
}
if ((await ethers.provider.getCode(owner)) === "0x") {
  throw new Error("Vault owner is not a deployed multisig contract.");
}
if (totalPool !== 0n || settlement !== 0n || resultProposed) {
  throw new Error("The vault is not in a clean pre-launch state.");
}
if (bettingClosesAt !== startsAt + 3_600n || challengeEndsAt !== startsAt + 10_800n) {
  throw new Error("Vault timing invariants do not match the reviewed challenge.");
}

console.log("MAINNET PREFLIGHT PASSED");
console.log(`Vault: ${address}`);
console.log(`Owner: ${owner}`);
console.log(`Eligibility registry: ${registry}`);
console.log(`Starts at: ${new Date(Number(startsAt) * 1000).toISOString()}`);
console.log(`Minimum stake: ${ethers.formatEther(minimumStake)} ETH`);
console.log(`Maximum per wallet: ${ethers.formatEther(maximumStake)} ETH`);
console.log(`Maximum total pool: ${ethers.formatEther(maximumPool)} ETH`);
console.log(`Dispute duration: ${disputeSeconds} seconds`);
