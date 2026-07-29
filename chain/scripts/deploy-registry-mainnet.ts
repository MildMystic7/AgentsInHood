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
if (!ethers.isAddress(owner) || owner === ethers.ZeroAddress) {
  throw new Error("PREDICTION_OWNER_ADDRESS must be a non-zero multisig address.");
}
if ((await ethers.provider.getCode(owner)) === "0x") {
  throw new Error("PREDICTION_OWNER_ADDRESS must be a deployed multisig contract.");
}

const [deployer] = await ethers.getSigners();
if (owner.toLowerCase() === deployer.address.toLowerCase()) {
  throw new Error("The registry owner must be separate from the deployment signer.");
}

const registry = await ethers.deployContract("WalletEligibilityRegistry", [owner]);
await registry.waitForDeployment();

console.log(`Eligibility registry: ${await registry.getAddress()}`);
console.log(`Registry owner: ${owner}`);
