// Generates a burner testnet wallet and writes the private key DIRECTLY to
// worker/.env — never printed to stdout/logs. Only the public address (safe
// to share) is printed. TESTNET ONLY.
const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const wallet = Wallet.createRandom();
const envPath = path.join(__dirname, "..", ".env");

let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");

if (/^WORKER_PRIVATE_KEY=.*$/m.test(content)) {
  content = content.replace(/^WORKER_PRIVATE_KEY=.*$/m, `WORKER_PRIVATE_KEY=${wallet.privateKey}`);
} else {
  content += `\nWORKER_PRIVATE_KEY=${wallet.privateKey}\n`;
}
fs.writeFileSync(envPath, content, "utf8");

console.log("Burner wallet generated and private key saved to worker/.env (not printed here).");
console.log("Address:", wallet.address);
console.log("Fund it (free): https://faucet.testnet.chain.robinhood.com/");
