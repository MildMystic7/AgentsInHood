import type { AgentConfig, TokenConfig, Competition } from "./types";

// Native chains of the Robinhood-listed universe (EVM ids where they exist,
// synthetic ids for non-EVM networks).
export const CHAINS: Record<number, string> = {
  1: "Ethereum",
  43114: "Avalanche",
  1151111081099710: "Solana",
  2001: "Bitcoin",
  2002: "XRP Ledger",
  2003: "Dogecoin",
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
      "You are a hyperactive degen scalper. You trade often, love volatility, and rotate aggressively into memecoins and small caps chasing outsized returns. High risk, high energy.",
  },
];

/**
 * Tradable universe: coins listed on Robinhood (matching our $ALPHA launch on
 * Robinhood Chain). USDC is the cash/settlement asset. Base prices are only the
 * offline fallback — live levels come from CoinGecko anchors.
 */
export const TOKENS: TokenConfig[] = [
  { symbol: "USDC", name: "USD Coin", chain: "Ethereum", chainId: 1, basePrice: 1, vol: 0.0002, drift: 0 },
  { symbol: "BTC", name: "Bitcoin", chain: "Bitcoin", chainId: 2001, basePrice: 60000, vol: 0.013, drift: 0.0004 },
  { symbol: "ETH", name: "Ethereum", chain: "Ethereum", chainId: 1, basePrice: 1600, vol: 0.018, drift: 0.0003 },
  { symbol: "SOL", name: "Solana", chain: "Solana", chainId: 1151111081099710, basePrice: 77, vol: 0.03, drift: 0.0006 },
  { symbol: "XRP", name: "XRP", chain: "XRP Ledger", chainId: 2002, basePrice: 2.2, vol: 0.028, drift: 0.0002 },
  { symbol: "DOGE", name: "Dogecoin", chain: "Dogecoin", chainId: 2003, basePrice: 0.16, vol: 0.045, drift: 0.0006 },
  { symbol: "AVAX", name: "Avalanche", chain: "Avalanche", chainId: 43114, basePrice: 18, vol: 0.032, drift: 0.0003 },
  { symbol: "LINK", name: "Chainlink", chain: "Ethereum", chainId: 1, basePrice: 7.4, vol: 0.028, drift: 0.0002 },
  { symbol: "UNI", name: "Uniswap", chain: "Ethereum", chainId: 1, basePrice: 6.2, vol: 0.03, drift: 0.0001 },
  { symbol: "AAVE", name: "Aave", chain: "Ethereum", chainId: 1, basePrice: 85, vol: 0.032, drift: 0.0003 },
  { symbol: "SHIB", name: "Shiba Inu", chain: "Ethereum", chainId: 1, basePrice: 0.0000043, vol: 0.06, drift: 0.0005 },
  { symbol: "PEPE", name: "Pepe", chain: "Ethereum", chainId: 1, basePrice: 0.0000023, vol: 0.07, drift: 0.001 },
  { symbol: "BONK", name: "Bonk", chain: "Solana", chainId: 1151111081099710, basePrice: 0.000012, vol: 0.075, drift: 0.001 },
  { symbol: "WIF", name: "dogwifhat", chain: "Solana", chainId: 1151111081099710, basePrice: 0.65, vol: 0.07, drift: 0.0008 },
  { symbol: "PENGU", name: "Pudgy Penguins", chain: "Solana", chainId: 1151111081099710, basePrice: 0.0062, vol: 0.08, drift: 0.0012 },
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
