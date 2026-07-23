const { Wallet } = require("ethers");

const wallet = Wallet.createRandom();

console.log("New burner wallet — TESTNET ONLY. Never send real assets to it.\n");
console.log("  Address:     ", wallet.address);
console.log("  Private key: ", wallet.privateKey);
console.log("\nNext steps:");
console.log("  1. Fund this address with free Robinhood Chain testnet ETH:");
console.log("       https://faucet.testnet.chain.robinhood.com/");
console.log("  2. Put the private key above in your .env as WORKER_PRIVATE_KEY=...");
console.log("  3. Run `npm run compile && npm run deploy` to deploy the ledger contract.");
