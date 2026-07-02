import type { AgentConfig, TokenConfig, Competition } from "./types";

// Chain ids (EVM + Solana's LI.FI/Jumper non-EVM id) — same universe as the original.
export const CHAINS: Record<number, string> = {
  1: "Ethereum",
  42161: "Arbitrum",
  8453: "Base",
  1151111081099710: "Solana",
};

export const STARTING_CAPITAL = 1000;
export const DURATION_HOURS = 168; // 7 days

// Tick cadence: seconds of real time that represent one simulated "hour".
export const TICK_SECONDS = Number(process.env.ARENA_TICK_SECONDS ?? 7);

// Fixed epoch anchoring the perpetual "seasons". Because the whole simulation is
// derived deterministically from (epoch, now, seed), every serverless instance
// computes the exact same live state with no shared database — the key to making
// a real-time arena work on Vercel. A new season starts every DURATION_HOURS ticks.
export const EPOCH = Date.UTC(2026, 0, 1); // 2026-01-01T00:00:00Z
export const BASE_SEED = 20260701;

/** The four competing brains. Swap names/models freely — this is our own lineup. */
export const AGENTS: AgentConfig[] = [
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
      "You are a hyperactive degen scalper. You trade often, love volatility, and rotate aggressively into memecoins and small caps chasing outsized returns. High risk, high energy.",
  },
];

/**
 * Tradable universe. USDC is the cash/settlement asset. Prices are seeded near
 * realistic levels; the simulator random-walks them from here.
 */
export const TOKENS: TokenConfig[] = [
  { symbol: "USDC", name: "USD Coin", chain: "Ethereum", chainId: 1, basePrice: 1, vol: 0.0002, drift: 0 },
  { symbol: "ETH", name: "Ethereum", chain: "Arbitrum", chainId: 42161, basePrice: 1593.2, vol: 0.018, drift: 0.0003 },
  { symbol: "WBTC", name: "Wrapped Bitcoin", chain: "Ethereum", chainId: 1, basePrice: 61840, vol: 0.015, drift: 0.0004 },
  { symbol: "SOL", name: "Solana", chain: "Solana", chainId: 1151111081099710, basePrice: 75.79, vol: 0.03, drift: 0.0006 },
  { symbol: "LINK", name: "Chainlink", chain: "Arbitrum", chainId: 42161, basePrice: 7.29, vol: 0.028, drift: 0.0002 },
  { symbol: "AAVE", name: "Aave", chain: "Ethereum", chainId: 1, basePrice: 92.4, vol: 0.032, drift: 0.0003 },
  { symbol: "ARB", name: "Arbitrum", chain: "Arbitrum", chainId: 42161, basePrice: 0.63, vol: 0.035, drift: 0.0 },
  { symbol: "AERO", name: "Aerodrome", chain: "Base", chainId: 8453, basePrice: 0.78, vol: 0.045, drift: 0.0005 },
  { symbol: "UNI", name: "Uniswap", chain: "Ethereum", chainId: 1, basePrice: 6.15, vol: 0.03, drift: 0.0001 },
  { symbol: "PEPE", name: "Pepe", chain: "Ethereum", chainId: 1, basePrice: 0.0000071, vol: 0.07, drift: 0.001 },
  { symbol: "SHIB", name: "Shiba Inu", chain: "Ethereum", chainId: 1, basePrice: 0.0000094, vol: 0.06, drift: 0.0005 },
  { symbol: "PENGU", name: "Pudgy Penguins", chain: "Solana", chainId: 1151111081099710, basePrice: 0.021, vol: 0.08, drift: 0.0012 },
];

export const TRADABLE = TOKENS.filter((t) => t.symbol !== "USDC");

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
