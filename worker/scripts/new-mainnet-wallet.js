const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const envPath = path.join(__dirname, "..", ".env");
if (
  fs.existsSync(envPath) &&
  /^MAINNET_PRIVATE_KEY=0x[0-9a-fA-F]{64}$/m.test(fs.readFileSync(envPath, "utf8"))
) {
  console.error("A mainnet wallet already exists in worker/.env. Refusing to overwrite it.");
  process.exit(1);
}

const wallet = Wallet.createRandom();
const examplePath = path.join(__dirname, "..", ".env.example");
let content = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(examplePath, "utf8");

content = content
  .replace(/^MAINNET_PRIVATE_KEY=.*$/m, `MAINNET_PRIVATE_KEY=${wallet.privateKey}`)
  .replace(/^MAINNET_WALLET_ADDRESS=.*$/m, `MAINNET_WALLET_ADDRESS=${wallet.address}`);
fs.writeFileSync(envPath, content, { encoding: "utf8", mode: 0o600 });

console.log("Dedicated mainnet wallet created. The private key was saved locally and was not printed.");
console.log("Address:", wallet.address);
console.log("Mode: dry-run (no transaction can be sent yet)");
