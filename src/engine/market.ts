import { TOKENS } from "./config";

// Symbol → CoinGecko id (Robinhood-listed universe).
const CG_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  BONK: "bonk",
  WIF: "dogwifcoin",
  PENGU: "pudgy-penguins",
  USDC: "usd-coin",
};

const FALLBACK: Record<string, number> = Object.fromEntries(TOKENS.map((t) => [t.symbol, t.basePrice]));

async function fetchCoinGecko(revalidate: number): Promise<Record<string, number> | null> {
  const ids = Array.from(new Set(Object.values(CG_IDS))).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  try {
    // `next.revalidate` puts the response in Vercel's shared Data Cache, so every
    // serverless instance reads identical prices (and we stay within rate limits).
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const out: Record<string, number> = {};
    for (const [sym, id] of Object.entries(CG_IDS)) {
      const p = data?.[id]?.usd;
      if (typeof p === "number" && p > 0) out[sym] = p;
    }
    return Object.keys(out).length >= 4 ? out : null;
  } catch {
    return null;
  }
}

// Remember the last successful real fetch so a transient rate-limit doesn't drop
// us back to the static seed — real prices stay "sticky" for the demo.
let lastAnchor: Record<string, number> | null = null;
let lastLive: Record<string, number> | null = null;

/**
 * Anchor prices: a stable real-market base for the deterministic simulation.
 * Cached for hours so a season's price levels don't shift underneath the replay.
 */
export async function getAnchorPrices(): Promise<{ prices: Record<string, number>; live: boolean }> {
  const real = await fetchCoinGecko(6 * 3600);
  if (real) {
    lastAnchor = { ...FALLBACK, ...real };
    return { prices: lastAnchor, live: true };
  }
  return { prices: lastAnchor ?? { ...FALLBACK }, live: lastAnchor !== null };
}

/** Live ticker prices: near-real-time real spot prices for the market strip. */
export async function getLivePrices(): Promise<{ prices: Record<string, number>; live: boolean }> {
  const real = await fetchCoinGecko(30);
  if (real) {
    lastLive = { ...FALLBACK, ...real };
    return { prices: lastLive, live: true };
  }
  return { prices: lastLive ?? { ...FALLBACK }, live: lastLive !== null };
}
