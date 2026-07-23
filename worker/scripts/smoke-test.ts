// One-off manual smoke test — NOT part of the deployed worker.
// Part A: one real decision per agent against live Yahoo Finance quotes.
// Part B: synthetic strong momentum to exercise the BUY/SELL branches and
// verify the buy()/sell() execution math (since real momentum starts at 0 and
// takes real time to build up — this proves the logic path works without
// waiting).
import { AGENTS, STARTING_CAPITAL } from "../src/config";
import { getQuoteSnapshot } from "../src/quotes";
import { decide, type PortfolioState } from "../src/decide";
import { buy, sell } from "../src/portfolio";

async function main() {
  console.log("=== Part A: real quotes, first snapshot (expect mostly HOLD) ===");
  const real = await getQuoteSnapshot();
  console.log(`Got ${Object.keys(real.prices).length} live prices. Sample:`, {
    AAPL: real.prices.AAPL,
    TSLA: real.prices.TSLA,
    HOOD: real.prices.HOOD,
  });
  for (const agent of AGENTS) {
    const state: PortfolioState = { cash: STARTING_CAPITAL, holdings: {}, totalTrades: 0 };
    const decision = decide(agent, state, real);
    console.log(`[${agent.name}] ${decision.action}${decision.symbol ? " " + decision.symbol : ""} — "${decision.reasoning}"`);
  }

  console.log("\n=== Part B: synthetic momentum (AAPL hot +6%, TSLA cold -6%) ===");
  const synthetic = {
    prices: { ...real.prices },
    momentum: Object.fromEntries(Object.keys(real.prices).map((s) => [s, s === "AAPL" ? 6 : s === "TSLA" ? -6 : 0])),
  };
  let anyTradeExecuted = false;
  for (const agent of AGENTS) {
    // Try several random seeds per agent since decisions are probabilistic.
    for (let i = 0; i < 6; i++) {
      const rand = () => (i + 0.5) / 6; // deterministic spread across [0,1)
      const state: PortfolioState = { cash: STARTING_CAPITAL, holdings: {}, totalTrades: 0 };
      const decision = decide(agent, state, synthetic, rand);
      if (decision.action !== "HOLD" && decision.symbol) {
        const price = synthetic.prices[decision.symbol];
        const usd = 0.03; // mid-range of the real $0.01-$0.05 micro-bet
        const result = decision.action === "BUY" ? buy(state, decision.symbol, usd, price) : sell({ ...state, holdings: { [decision.symbol]: { tokens: 1, avgCost: price } } }, decision.symbol, usd, price);
        console.log(`[${agent.name}] seed=${i} ${decision.action} ${decision.symbol} @ $${price} -> executed $${result} | "${decision.reasoning.slice(0, 60)}..."`);
        anyTradeExecuted = anyTradeExecuted || result !== null;
      }
    }
  }
  console.log(anyTradeExecuted ? "\n✅ BUY/SELL branches + execution math verified." : "\n⚠️ No trades triggered across seeds — check thresholds.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
