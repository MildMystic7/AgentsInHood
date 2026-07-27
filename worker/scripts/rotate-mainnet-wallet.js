const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const REQUIRED_CONFIRMATION = "CREATE_FRESH_WALLET_AND_ARCHIVE_CURRENT";

if (process.env.ROTATE_MAINNET_WALLET_CONFIRM !== REQUIRED_CONFIRMATION) {
  console.error(
    `Refusing to rotate. Set ROTATE_MAINNET_WALLET_CONFIRM=${REQUIRED_CONFIRMATION}`,
  );
  process.exit(1);
}

const workerDir = path.join(__dirname, "..");
const envPath = path.join(workerDir, ".env");
const walletDir = path.join(workerDir, ".wallets");

if (!fs.existsSync(envPath)) {
  console.error("worker/.env does not exist. Use new-mainnet-wallet first.");
  process.exit(1);
}

const current = fs.readFileSync(envPath, "utf8");
const privateKey = current.match(/^MAINNET_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m)?.[1];
const configuredAddress = current.match(/^MAINNET_WALLET_ADDRESS=(0x[0-9a-fA-F]{40})$/m)?.[1];

if (!privateKey || !configuredAddress) {
  console.error("The current wallet configuration is incomplete; nothing was changed.");
  process.exit(1);
}

const currentWallet = new Wallet(privateKey);
if (currentWallet.address.toLowerCase() !== configuredAddress.toLowerCase()) {
  console.error("The current private key and address do not match; nothing was changed.");
  process.exit(1);
}

const freshWallet = Wallet.createRandom();
const next = current
  .replace(/^MAINNET_PRIVATE_KEY=.*$/m, `MAINNET_PRIVATE_KEY=${freshWallet.privateKey}`)
  .replace(/^MAINNET_WALLET_ADDRESS=.*$/m, `MAINNET_WALLET_ADDRESS=${freshWallet.address}`);

fs.mkdirSync(walletDir, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(
  walletDir,
  `mainnet-${currentWallet.address}-${stamp}.env`,
);
const tempPath = path.join(workerDir, `.env.rotate-${process.pid}.tmp`);

fs.writeFileSync(tempPath, next, { encoding: "utf8", mode: 0o600, flag: "wx" });
fs.renameSync(envPath, backupPath);
try {
  fs.renameSync(tempPath, envPath);
} catch (error) {
  fs.renameSync(backupPath, envPath);
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  throw error;
}

console.log("Fresh mainnet wallet created; private key was saved locally and not printed.");
console.log("Previous wallet:", currentWallet.address);
console.log("Previous configuration archived:", path.relative(workerDir, backupPath));
console.log("New address:", freshWallet.address);
console.log("Activation: pending funding and explicit Railway/Vercel rotation.");
