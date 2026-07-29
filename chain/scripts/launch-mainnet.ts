import hre from "hardhat";

const { ethers } = await hre.network.create();

const REQUIRED_ACK = "I_HAVE_WRITTEN_APPROVAL_AND_ACCEPT_MAINNET_RISK";
if (process.env.PREDICTION_MAINNET_LAUNCH_ACK !== REQUIRED_ACK) {
  throw new Error("Mainnet launch acknowledgement is missing.");
}

const network = await ethers.provider.getNetwork();
if (network.chainId !== 4_663n) {
  throw new Error(`Refusing launch on chain ${network.chainId}; expected 4663.`);
}

const owner = process.env.PREDICTION_OWNER_ADDRESS?.trim() ?? "";
if (!ethers.isAddress(owner) || owner === ethers.ZeroAddress) {
  throw new Error("PREDICTION_OWNER_ADDRESS must be a non-zero contract address.");
}
if ((await ethers.provider.getCode(owner)) === "0x") {
  throw new Error("PREDICTION_OWNER_ADDRESS has no deployed contract bytecode.");
}

const eligibleAccounts = (
  process.env.PREDICTION_INITIAL_ELIGIBLE_ACCOUNTS ?? ""
)
  .split(",")
  .map((account) => account.trim())
  .filter(Boolean);
if (
  eligibleAccounts.length === 0 ||
  eligibleAccounts.length > 100 ||
  eligibleAccounts.some((account) => !ethers.isAddress(account)) ||
  new Set(eligibleAccounts.map((account) => account.toLowerCase())).size !==
    eligibleAccounts.length
) {
  throw new Error("Initial eligibility list must contain 1-100 unique valid addresses.");
}

const startDelaySeconds = Number(process.env.PREDICTION_START_DELAY_SECONDS ?? "");
const disputeSeconds = Number(process.env.PREDICTION_DISPUTE_SECONDS ?? "");
if (!Number.isInteger(startDelaySeconds) || startDelaySeconds < 86_400) {
  throw new Error("Mainnet must be scheduled at least 24 hours before it starts.");
}
if (!Number.isInteger(disputeSeconds) || disputeSeconds < 3_600) {
  throw new Error("Mainnet result review must be at least 3600 seconds.");
}

const minimumStake = ethers.parseEther(
  process.env.PREDICTION_MINIMUM_STAKE_ETH ?? "",
);
const maximumStake = ethers.parseEther(
  process.env.PREDICTION_MAXIMUM_STAKE_PER_WALLET_ETH ?? "",
);
const maximumPool = ethers.parseEther(
  process.env.PREDICTION_MAXIMUM_POOL_ETH ?? "",
);
if (minimumStake <= 0n || maximumStake < minimumStake || maximumPool < maximumStake) {
  throw new Error("Invalid mainnet stake or pool limits.");
}

const [deployer] = await ethers.getSigners();
if (owner.toLowerCase() === deployer.address.toLowerCase()) {
  throw new Error("Owner contract and deployment signer must be separate.");
}

const latestBlock = await ethers.provider.getBlock("latest");
if (!latestBlock) throw new Error("Unable to read the latest block.");
const startsAt = latestBlock.timestamp + startDelaySeconds;

console.log("Deploying eligibility registry...");
const registry = await ethers.deployContract("WalletEligibilityRegistry", [
  owner,
  eligibleAccounts,
]);
await registry.waitForDeployment();
const registryAddress = await registry.getAddress();

console.log("Deploying prediction vault...");
const vault = await ethers.deployContract("AgentPredictionVault", [
  startsAt,
  owner,
  minimumStake,
  maximumStake,
  maximumPool,
  disputeSeconds,
  registryAddress,
]);
await vault.waitForDeployment();
const vaultAddress = await vault.getAddress();

if (
  (await vault.owner()).toLowerCase() !== owner.toLowerCase() ||
  (await vault.eligibilityRegistry()).toLowerCase() !==
    registryAddress.toLowerCase() ||
  (await vault.totalPool()) !== 0n ||
  (await vault.settlement()) !== 0n
) {
  throw new Error("Post-deployment invariant check failed. Keep website launch disabled.");
}

const manifest = {
  chainId: Number(network.chainId),
  deployer: deployer.address,
  owner,
  registryAddress,
  vaultAddress,
  initiallyEligibleWallets: eligibleAccounts.length,
  startsAt,
  bettingClosesAt: startsAt + 3_600,
  challengeEndsAt: startsAt + 10_800,
  disputeSeconds,
  minimumStakeEth: ethers.formatEther(minimumStake),
  maximumStakePerWalletEth: ethers.formatEther(maximumStake),
  maximumPoolEth: ethers.formatEther(maximumPool),
  registryDeploymentTransaction: registry.deploymentTransaction()?.hash ?? "",
  vaultDeploymentTransaction: vault.deploymentTransaction()?.hash ?? "",
};

console.log("MAINNET CONTRACT DEPLOYMENT COMPLETE — WEBSITE REMAINS LOCKED");
console.log(JSON.stringify(manifest, null, 2));
