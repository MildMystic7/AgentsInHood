require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const privateKey = process.env.WORKER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Set WORKER_PRIVATE_KEY in worker/.env first (run `npm run new-wallet` to generate one).");
    process.exit(1);
  }

  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "AlphaHoodLedger.sol", "AlphaHoodLedger.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("Contract not compiled yet. Run `npm run compile` first.");
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying from:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "test ETH");
  if (balance === 0n) {
    console.error("\nThis wallet has 0 testnet ETH. Fund it from a Base Sepolia faucet first, then retry.");
    console.error("e.g. https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\nAlphaHoodLedger deployed at:", address);
  console.log("View on explorer:", `https://sepolia.basescan.org/address/${address}`);
  console.log("\nAdd this to worker/.env and to your Railway service variables:");
  console.log(`LEDGER_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
