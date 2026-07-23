// One-off end-to-end test: writes ONE real logTrade transaction to the
// deployed contract on Robinhood Chain testnet, then reads it back. Proves the
// full on-chain path works before deploying the always-on worker to Railway.
import "dotenv/config";
import { logTradeOnChain, explorerTxUrl, ledgerConfigured } from "../src/ledger";
import { Contract, JsonRpcProvider } from "ethers";

async function main() {
  if (!ledgerConfigured()) {
    console.error("Not configured — need WORKER_PRIVATE_KEY + LEDGER_CONTRACT_ADDRESS in worker/.env");
    process.exit(1);
  }

  console.log("Sending a real test logTrade transaction to Robinhood Chain testnet...");
  const hash = await logTradeOnChain("fable", "BUY", "AAPL", 0.03, "End-to-end test — first on-chain decision logged by AlphaHood.");
  if (!hash) {
    console.error("Transaction failed (see error above).");
    process.exit(1);
  }
  console.log("✅ Confirmed on-chain. tx:", hash);
  console.log("   Explorer:", explorerTxUrl(hash));

  // Read the event back from the chain to prove it's really there.
  const provider = new JsonRpcProvider(process.env.ROBINHOOD_TESTNET_RPC_URL || "https://rpc.testnet.chain.robinhood.com", {
    chainId: 46630,
    name: "robinhood-testnet",
  });
  const abi = ["event TradeLogged(string agentId, string action, string symbol, uint256 usdCents, string reasoning, uint256 timestamp)"];
  const c = new Contract(process.env.LEDGER_CONTRACT_ADDRESS!, abi, provider);
  const receipt = await provider.getTransactionReceipt(hash);
  const logs = receipt ? await c.queryFilter(c.filters.TradeLogged(), receipt.blockNumber, receipt.blockNumber) : [];
  console.log(`   Read back ${logs.length} TradeLogged event(s) in that block.`);
  for (const log of logs) {
    const a = (log as any).args;
    console.log(`     -> ${a.agentId} ${a.action} ${a.symbol} ${Number(a.usdCents) / 100} USD`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
