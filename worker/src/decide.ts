import { TOKENS, type AgentConfig } from "./config";
import type { QuoteSnapshot } from "./quotes";

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

  const r2 = rand(); // independent draw so the *wording* varies even when the move repeats
  const mom = (s: string) => momentum[s] ?? 0;
  const fmt = (s: string) => `${mom(s) >= 0 ? "+" : ""}${mom(s).toFixed(2)}%`;
  // Live quotes are often nearly flat (momentum ≈ 0), so gates keyed purely on
  // big momentum almost never fire. Every persona below therefore has a
  // characteristic *fallback* trade — the point of this worker is to compare the
  // agents head-to-head on-chain, which only works if all five actually trade.
  const buyValue = round(Math.min(cash * (0.25 + r * 0.35), cash));

  switch (agent.id) {
    case "fable": {
      // Strategic mastermind — EV blend of momentum and mean reversion, moderate cadence.
      const bigWinner = held.find((s) => mom(s) > 2 && state.holdings[s].tokens * prices[s] > value * 0.15);
      if (bigWinner && r > 0.55) {
        return { action: "SELL", symbol: bigWinner, usdAmount: round(state.holdings[bigWinner].tokens * prices[bigWinner] * 0.4), reasoning: pick([
          `${bigWinner} extended ${fmt(bigWinner)} above my fair-value band; banking 40% and letting the rest ride. Take the certain gain.`,
          `Trimming ${bigWinner} (${fmt(bigWinner)}) — the expected value of locking in beats the marginal upside from here.`,
        ], r2) };
      }
      if (coldest && mom(coldest) < -0.4 && r > 0.4) {
        return { action: "BUY", symbol: coldest, usdAmount: buyValue, reasoning: pick([
          `${coldest} at ${fmt(coldest)} is a statistical overreaction — mean reversion favours entry, downside is defined.`,
          `Fading the drop in ${coldest} (${fmt(coldest)}); the selloff is overdone relative to fair value. Sizing with conviction.`,
        ], r2) };
      }
      if (hottest && r > 0.35) {
        return { action: "BUY", symbol: hottest, usdAmount: buyValue, reasoning: pick([
          `Momentum in ${hottest} (${fmt(hottest)}) checks out a few moves ahead — joining the trend with measured size.`,
          `${hottest} is the highest-EV setup on the board right now (${fmt(hottest)}); deploying deliberately.`,
        ], r2) };
      }
      if (held.length && r > 0.5) {
        const lag = pick(held, r2);
        return { action: "SELL", symbol: lag, usdAmount: round(state.holdings[lag].tokens * prices[lag]), reasoning: `Recycling ${lag} (${fmt(lag)}) into higher expected value — a superior mind changes course on the evidence.` };
      }
      return { action: "BUY", symbol: coldest ?? hottest, usdAmount: buyValue, reasoning: pick([
        `Nothing screaming right now, so I take the highest-EV name on offer — ${coldest ?? hottest} (${fmt(coldest ?? hottest)}) — and size it modestly.`,
        `Deploying a measured tranche into ${coldest ?? hottest} (${fmt(coldest ?? hottest)}); patience is a position, but so is a disciplined bid.`,
      ], r2) };
    }
    case "gpt": {
      // Decisive momentum executor — the most active besides MiniMax.
      const loser = held.find((s) => mom(s) < -0.4);
      if (loser && r < 0.35) return { action: "SELL", symbol: loser, usdAmount: round(state.holdings[loser].tokens * prices[loser]), reasoning: pick([
        `${loser} rolled over (${fmt(loser)}); cutting fast to protect capital and free up powder.`,
        `Booking out of ${loser} at ${fmt(loser)} — losers get cut, no debate.`,
      ], r2) };
      if (hottest) return { action: "BUY", symbol: hottest, usdAmount: buyValue, reasoning: pick([
        `${hottest} is leading the tape at ${fmt(hottest)}; deploying into strength — momentum begets momentum.`,
        `Chasing ${hottest} (${fmt(hottest)}) — strongest name on the board, and I ride winners.`,
        `Loading ${hottest} at ${fmt(hottest)}; the trend is my friend until it isn't.`,
      ], r2) };
      return { action: "BUY", symbol: hottest, usdAmount: buyValue, reasoning: `Tape's quiet, but I don't sit on my hands — taking the strongest name, ${hottest} (${fmt(hottest)}), and pressing.` };
    }
    case "claude": {
      // Patient value — trades the least, keeps dry powder, but still acts on a dip.
      const winner = held.find((s) => mom(s) > 1.5);
      if (winner && r > 0.6) return { action: "SELL", symbol: winner, usdAmount: round(state.holdings[winner].tokens * prices[winner] * 0.5), reasoning: pick([
        `Taking partial profit on ${winner} (${fmt(winner)}) — banking the gain, staying disciplined.`,
        `Trimming ${winner} (${fmt(winner)}) back to a core position; no need to be greedy.`,
      ], r2) };
      if (coldest && r > 0.45) {
        return { action: "BUY", symbol: coldest, usdAmount: round(Math.min(cash * 0.18, cash)), reasoning: pick([
          `${coldest} at ${fmt(coldest)} is where patience pays — scaling in a small tranche, keeping the rest in reserve.`,
          `Building ${coldest} (${fmt(coldest)}) slowly; the thesis is strong and the price is finally reasonable.`,
        ], r2) };
      }
      return { action: "BUY", symbol: coldest ?? hottest, usdAmount: round(Math.min(cash * 0.15, cash)), reasoning: pick([
        `Adding a careful starter in ${coldest ?? hottest} (${fmt(coldest ?? hottest)}) — small size, strong thesis, room to average down.`,
        `Putting a little dry powder to work in ${coldest ?? hottest} (${fmt(coldest ?? hottest)}); conviction builds one tranche at a time.`,
      ], r2) };
    }
    case "gemini": {
      // Balanced quant — diversify into unheld names, trim concentration.
      const overweight = [...held].sort((a, b) => state.holdings[b].tokens * prices[b] - state.holdings[a].tokens * prices[a])[0];
      if (overweight && state.holdings[overweight].tokens * prices[overweight] > value * 0.4 && r < 0.4) {
        return { action: "SELL", symbol: overweight, usdAmount: round(state.holdings[overweight].tokens * prices[overweight] * 0.3), reasoning: `${overweight} is oversized in the book; trimming to manage concentration and cap drawdown.` };
      }
      const unheld = symbols.filter((s) => !held.includes(s));
      const target = unheld.length ? pick(unheld, r) : hottest;
      if (target) return { action: "BUY", symbol: target, usdAmount: round(Math.min(cash * 0.22, cash)), reasoning: pick([
        `Adding ${target} (${fmt(target)}) to diversify the book and improve the risk-adjusted profile.`,
        `Rotating a tranche into ${target} (${fmt(target)}) — spreading correlation, keeping the sleeve balanced.`,
        `Topping up ${target} (${fmt(target)}) to rebalance toward my target weights.`,
      ], r2) };
      return { action: "BUY", symbol: hottest, usdAmount: round(Math.min(cash * 0.2, cash)), reasoning: `Book's balanced, so I lean into the sleeve with momentum — ${hottest} (${fmt(hottest)}) — keeping weights in check.` };
    }
    case "minimax":
    default: {
      // Hyperactive scalper — highest cadence, loves high-beta and fast flips.
      if (held.length && r < 0.35) {
        const flip = pick(held, r2);
        return { action: "SELL", symbol: flip, usdAmount: round(state.holdings[flip].tokens * prices[flip]), reasoning: pick([
          `Flipping ${flip} (${fmt(flip)}) to rotate into the next mover — no diamond hands here.`,
          `Dumping ${flip} at ${fmt(flip)}; it's done moving and I need the powder for the next spike.`,
          `Cutting ${flip} (${fmt(flip)}) loose — I trade the tape, not the ticker.`,
        ], r2) };
      }
      const target = highBeta.length && r > 0.4 ? pick(highBeta, r) : hottest;
      if (target) return { action: "BUY", symbol: target, usdAmount: round(Math.min(cash * (0.4 + r * 0.4), cash)), reasoning: pick([
        `Piling into ${target} (${fmt(target)}) — high-beta is where the moves are, want in before the tape confirms.`,
        `${target} (${fmt(target)}) is my kind of chaos — going in heavy before the crowd wakes up.`,
        `Front-running the momentum in ${target} (${fmt(target)}); fortune favours the fast.`,
        `Ripping the trigger on ${target} at ${fmt(target)} — the volatility is the opportunity.`,
      ], r2) };
      return { action: "BUY", symbol: hottest, usdAmount: round(Math.min(cash * 0.5, cash)), reasoning: `Never flat for long — slamming into ${hottest} (${fmt(hottest)}), the next spike waits for no one.` };
    }
  }
}
