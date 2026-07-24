import type { AgentConfig, TokenConfig, Competition } from "./types";

// Exchanges the Robinhood-listed stocks trade on. (Kept under the name CHAINS
// so the rest of the engine's routing fields don't need renaming.)
export const CHAINS: Record<number, string> = {
  0: "Cash",
  10: "NASDAQ",
  20: "NYSE",
};

export const STARTING_CAPITAL = 1000;
export const DURATION_HOURS = 24; // one competition cycle = 24 hours

// Tick cadence: seconds of real time that represent one simulated "hour".
// One tick == one real hour, so a full 24-tick cycle spans a real 24 hours —
// agents deliberate and trade roughly once an hour, and each cycle ends a day
// later with a clear winner. Override with ARENA_TICK_SECONDS if ever needed.
export const TICK_SECONDS = Number(process.env.ARENA_TICK_SECONDS ?? 3600);

// Fixed epoch anchoring the perpetual "seasons". Because the whole simulation is
// derived deterministically from (epoch, now, seed), every serverless instance
// computes the exact same live state with no shared database — the key to making
// a real-time arena work on Vercel. A new season starts every DURATION_HOURS ticks.
export const EPOCH = Date.UTC(2026, 0, 1); // 2026-01-01T00:00:00Z
export const BASE_SEED = 20260701;

/** The five competing brains. Swap names/models freely — this is our own lineup. */
export const AGENTS: AgentConfig[] = [
  {
    id: "fable",
    name: "Fable 5",
    model: "Anthropic",
    provider: "anthropic",
    llmModel: "claude-fable-5",
    color: "#f5b301",
    colorLight: "#f5b30133",
    avatar: "F5",
    tagline:
      "Anthropic's new Mythos-class flagship — is Fable 5 really the best brain in trading and logic? The arena will answer.",
    walletAddress: "0xA1pha000000000000000000000000000000FABLE",
    persona:
      "You are a strategic mastermind trader. You reason several moves ahead, size positions by conviction and expected value, exploit both momentum and mean reversion, and manage risk like a professional. Precise, calculated, unshakeable.",
  },
  {
    id: "gpt",
    name: "GPT-5.4",
    model: "OpenAI",
    provider: "openai",
    color: "#10a37f",
    colorLight: "#10a37f33",
    avatar: "G",
    tagline: "OpenAI's everything model — relentless multi-step executor with Codex DNA",
    walletAddress: "0xA1pha00000000000000000000000000000000GPT",
    persona:
      "You are a decisive momentum trader. You size up fast, cut losers quickly, and chase strength. You favour majors but will rotate into narrative plays when momentum is undeniable.",
  },
  {
    id: "claude",
    name: "Claude Opus 4.8",
    model: "Anthropic",
    provider: "anthropic",
    color: "#d97757",
    colorLight: "#d9775733",
    avatar: "C",
    tagline: "Anthropic's patient heavyweight — grinds through the hardest positions with conviction",
    walletAddress: "0xA1pha0000000000000000000000000000000CLDE",
    persona:
      "You are a patient, risk-aware value trader. You build positions slowly, keep dry powder, and only act when your thesis is strong. You would rather hold cash than force a marginal trade.",
  },
  {
    id: "gemini",
    name: "Gemini 3.1 Pro",
    model: "Google",
    provider: "google",
    color: "#4285f4",
    colorLight: "#4285f433",
    avatar: "Ge",
    tagline: "Google's multimodal reasoner — reads the whole market and still has tokens to spare",
    walletAddress: "0xA1pha00000000000000000000000000000GEMINI",
    persona:
      "You are a balanced quant. You diversify across chains, watch correlation, and rebalance methodically. You like asymmetric setups and manage drawdown tightly.",
  },
  {
    id: "minimax",
    name: "MiniMax M2.5",
    model: "MiniMax",
    provider: "minimax",
    color: "#e5484d",
    colorLight: "#e5484d33",
    avatar: "M",
    tagline: "The dark horse — trained in the trenches, hyperactive and fearless",
    walletAddress: "0xA1pha0000000000000000000000000000MINIMAX",
    persona:
      "You are a hyperactive momentum scalper. You trade often, love volatility, and rotate aggressively into high-beta names — TSLA, NVDA, COIN, HOOD, PLTR, GME — chasing outsized returns. High risk, high energy.",
  },
];

/**
 * Tradable universe: stocks listed on Robinhood. USD is the cash/settlement
 * asset. Base prices are only the offline fallback — live levels come from the
 * real-time quote anchors (Yahoo Finance). Per-hour vol reflects each name's beta.
 */
export const TOKENS: TokenConfig[] = [
  { symbol: "USD", name: "US Dollar", chain: "Cash", chainId: 0, basePrice: 1, vol: 0, drift: 0 },
  { symbol: "AAPL", name: "Apple", chain: "NASDAQ", chainId: 10, basePrice: 325, vol: 0.009, drift: 0.0003 },
  { symbol: "MSFT", name: "Microsoft", chain: "NASDAQ", chainId: 10, basePrice: 480, vol: 0.009, drift: 0.0003 },
  { symbol: "NVDA", name: "NVIDIA", chain: "NASDAQ", chainId: 10, basePrice: 212, vol: 0.02, drift: 0.0006 },
  { symbol: "TSLA", name: "Tesla", chain: "NASDAQ", chainId: 10, basePrice: 374, vol: 0.024, drift: 0.0004 },
  { symbol: "AMZN", name: "Amazon", chain: "NASDAQ", chainId: 10, basePrice: 220, vol: 0.012, drift: 0.0003 },
  { symbol: "GOOGL", name: "Alphabet", chain: "NASDAQ", chainId: 10, basePrice: 195, vol: 0.011, drift: 0.0003 },
  { symbol: "META", name: "Meta Platforms", chain: "NASDAQ", chainId: 10, basePrice: 620, vol: 0.013, drift: 0.0004 },
  { symbol: "AMD", name: "AMD", chain: "NASDAQ", chainId: 10, basePrice: 165, vol: 0.02, drift: 0.0004 },
  { symbol: "NFLX", name: "Netflix", chain: "NASDAQ", chainId: 10, basePrice: 900, vol: 0.014, drift: 0.0003 },
  { symbol: "COIN", name: "Coinbase", chain: "NASDAQ", chainId: 10, basePrice: 320, vol: 0.03, drift: 0.0005 },
  { symbol: "HOOD", name: "Robinhood Markets", chain: "NASDAQ", chainId: 10, basePrice: 104, vol: 0.028, drift: 0.0006 },
  { symbol: "PLTR", name: "Palantir", chain: "NASDAQ", chainId: 10, basePrice: 75, vol: 0.026, drift: 0.0005 },
  { symbol: "SOFI", name: "SoFi Technologies", chain: "NASDAQ", chainId: 10, basePrice: 22, vol: 0.028, drift: 0.0004 },
  { symbol: "GME", name: "GameStop", chain: "NYSE", chainId: 20, basePrice: 28, vol: 0.035, drift: 0.0 },
];

export const TRADABLE = TOKENS.filter((t) => t.symbol !== "USD");

export function competition(startISO: string): Competition {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + DURATION_HOURS * 3600 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    durationHours: DURATION_HOURS,
    startingCapital: STARTING_CAPITAL,
  };
}
