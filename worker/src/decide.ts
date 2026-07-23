import { STARTING_CAPITAL, TOKENS, type AgentConfig } from "./config";
import type { QuoteSnapshot } from "./quotes";

// Persona gating thresholds below were tuned against a $1,000 reference
// portfolio; this scales them to whatever STARTING_CAPITAL actually is (e.g.
// $8) so "cash > 40" behaves as "cash > 4% of capital" at any size.
const SCALE = STARTING_CAPITAL / 1000;

export interface Holding {
  tokens: number;
  avgCost: number;
}

export interface PortfolioState {
  cash: number;
  holdings: Record<string, Holding>;
  totalTrades: number;
}

export type Action = "BUY" | "SELL" | "HOLD";

export interface Decision {
  action: Action;
  symbol?: string;
  usdAmount?: number;
  reasoning: string;
}

const HIGH_BETA = new Set(["TSLA", "NVDA", "AMD", "COIN", "HOOD", "PLTR", "SOFI", "GME"]);

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}
function round(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100);
}
function totalValue(state: PortfolioState, prices: Record<string, number>): number {
  let v = state.cash;
  for (const [symbol, h] of Object.entries(state.holdings)) v += h.tokens * (prices[symbol] ?? 0);
  return v;
}

/**
 * One decision for one agent, given real live quotes. Persona-driven, in the
 * same spirit as the main site's generator, tuned for a slower, one-decision-
 * per-random-interval cadence rather than an hourly tick.
 */
export function decide(agent: AgentConfig, state: PortfolioState, snapshot: QuoteSnapshot, rand: () => number = Math.random): Decision {
  const r = rand();
  const { prices, momentum } = snapshot;
  const symbols = TOKENS.map((t) => t.symbol).filter((s) => prices[s] !== undefined);
  const ranked = [...symbols].sort((a, b) => (momentum[b] ?? 0) - (momentum[a] ?? 0));
  const hottest = ranked[0];
  const coldest = ranked[ranked.length - 1];
  const highBeta = symbols.filter((s) => HIGH_BETA.has(s));
  const held = Object.keys(state.holdings);
  const cash = state.cash;
  const value = totalValue(state, prices);

  const mom = (s: string) => momentum[s] ?? 0;
  const fmt = (s: string) => `${mom(s) >= 0 ? "+" : ""}${mom(s).toFixed(2)}%`;

  switch (agent.id) {
    case "fable": {
      const bigWinner = held.find((s) => mom(s) > 2.5 && state.holdings[s].tokens * prices[s] > value * 0.15);
      if (bigWinner && r > 0.45) {
        return { action: "SELL", symbol: bigWinner, usdAmount: round(state.holdings[bigWinner].tokens * prices[bigWinner] * 0.4), reasoning: `${bigWinner} extended ${fmt(bigWinner)} above my fair-value band; banking 40% of the position, letting the rest ride. Expected value says take the certain gain.` };
      }
      if (cash > 40 * SCALE && coldest && mom(coldest) < -1.8 && r > 0.55) {
        return { action: "BUY", symbol: coldest, usdAmount: round(Math.min(cash * 0.3, cash)), reasoning: `${coldest} at ${fmt(coldest)} is a statistical overreaction — mean reversion favours entry here. Sizing at 30% of cash, defined downside.` };
      }
      if (cash > 30 * SCALE && hottest && mom(hottest) > 0.8 && r > 0.3) {
        return { action: "BUY", symbol: hottest, usdAmount: round(Math.min(cash * (0.25 + r * 0.2), cash)), reasoning: `Momentum in ${hottest} (${fmt(hottest)}) is confirmed, not noise. Joining with conviction sizing — checks out a few moves ahead.` };
      }
      const laggard = held.find((s) => mom(s) < -1.2 && state.holdings[s].tokens * prices[s] > 15 * SCALE);
      if (laggard && r > 0.6) {
        return { action: "SELL", symbol: laggard, usdAmount: round(state.holdings[laggard].tokens * prices[laggard]), reasoning: `${laggard} thesis invalidated (${fmt(laggard)}); recycling capital to higher expected value.` };
      }
      return { action: "HOLD", reasoning: "No edge above my threshold right now. The best trade is often the one you don't make." };
    }
    case "gpt": {
      if (cash > 30 * SCALE && hottest && mom(hottest) > 0.3) {
        return { action: "BUY", symbol: hottest, usdAmount: round(Math.min(cash * (0.3 + r * 0.3), cash)), reasoning: `${hottest} is leading the tape at ${fmt(hottest)}; deploying into strength.` };
      }
      const loser = held.find((s) => mom(s) < -0.5);
      if (loser) return { action: "SELL", symbol: loser, usdAmount: round(state.holdings[loser].tokens * prices[loser]), reasoning: `${loser} rolled over (${fmt(loser)}); cutting fast to protect capital.` };
      return { action: "HOLD", reasoning: "No clean momentum setup right now — staying patient." };
    }
    case "claude": {
      if (cash > 50 * SCALE && coldest && mom(coldest) < -1 && r > 0.5) {
        return { action: "BUY", symbol: coldest, usdAmount: round(Math.min(cash * 0.2, cash)), reasoning: `${coldest} is oversold at ${fmt(coldest)}; scaling in a small tranche, keeping the rest in reserve.` };
      }
      const winner = held.find((s) => mom(s) > 2);
      if (winner && r > 0.6) return { action: "SELL", symbol: winner, usdAmount: round(state.holdings[winner].tokens * prices[winner] * 0.5), reasoning: `Taking partial profit on ${winner} (${fmt(winner)}) — banking the gain, staying disciplined.` };
      return { action: "HOLD", reasoning: "Thesis unchanged, nothing mispriced enough to act on." };
    }
    case "gemini": {
      const underexposed = symbols.find((s) => !held.includes(s) && mom(s) > 0);
      if (cash > 40 * SCALE && underexposed && r > 0.35) {
        return { action: "BUY", symbol: underexposed, usdAmount: round(Math.min(cash * 0.25, cash)), reasoning: `Adding ${underexposed} (${fmt(underexposed)}) to diversify and improve the risk-adjusted profile.` };
      }
      const overweight = [...held].sort((a, b) => state.holdings[b].tokens * prices[b] - state.holdings[a].tokens * prices[a])[0];
      if (overweight && state.holdings[overweight].tokens * prices[overweight] > value * 0.4) {
        return { action: "SELL", symbol: overweight, usdAmount: round(state.holdings[overweight].tokens * prices[overweight] * 0.3), reasoning: `${overweight} is oversized in the book; trimming to manage concentration.` };
      }
      return { action: "HOLD", reasoning: "Book is balanced — no rebalance needed this cycle." };
    }
    case "minimax":
    default: {
      if (cash > 20 * SCALE && r > 0.25) {
        const target = highBeta.length && r > 0.4 ? pick(highBeta, r) : hottest;
        if (target) return { action: "BUY", symbol: target, usdAmount: round(Math.min(cash * (0.4 + r * 0.4), cash)), reasoning: `Piling into ${target} — high-beta names are where the moves are, want in before the tape confirms.` };
      }
      if (held.length && r < 0.4) {
        const flip = pick(held, r);
        return { action: "SELL", symbol: flip, usdAmount: round(state.holdings[flip].tokens * prices[flip]), reasoning: `Flipping ${flip} to rotate into the next mover — no diamond hands here.` };
      }
      return { action: "HOLD", reasoning: "Reloading — waiting for the next spike to pounce." };
    }
  }
}
