require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

async function main() {
  const rpcUrl = process.env.ROBINHOOD_TESTNET_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
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

  const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: ROBINHOOD_TESTNET_CHAIN_ID, name: "robinhood-testnet" });
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("Deploying from:", wallet.address);
  console.log("Network: Robinhood Chain testnet (chain id", ROBINHOOD_TESTNET_CHAIN_ID + ")");
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "test ETH");
  if (balance === 0n) {
    console.error("\nThis wallet has 0 testnet ETH. Fund it first, then retry:");
    console.error("  https://faucet.testnet.chain.robinhood.com/");
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\nAlphaHoodLedger deployed at:", address);
  console.log("View on explorer:", `https://explorer.testnet.chain.robinhood.com/address/${address}`);
  console.log("\nAdd this to worker/.env and to your Railway service variables:");
  console.log(`LEDGER_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
