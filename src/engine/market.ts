import { TOKENS } from "./config";

// Stocks we quote (everything tradable — cash "USD" is pinned to 1).
const SYMBOLS = TOKENS.filter((t) => t.symbol !== "USD").map((t) => t.symbol);
const FALLBACK: Record<string, number> = Object.fromEntries(TOKENS.map((t) => [t.symbol, t.basePrice]));

// Yahoo Finance "spark" endpoint returns every symbol's live price in one call,
// with no API key — perfect for a real-time anchor for Robinhood-listed stocks.
async function fetchQuotes(revalidate: number): Promise<Record<string, number> | null> {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${SYMBOLS.join(",")}&range=1d&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; AgentsInHood/1.0)" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      spark?: { result?: { symbol: string; response?: { meta?: { regularMarketPrice?: number } }[] }[] };
    };
    const out: Record<string, number> = {};
    for (const r of data?.spark?.result ?? []) {
      const p = r.response?.[0]?.meta?.regularMarketPrice;
      if (typeof p === "number" && p > 0) out[r.symbol] = p;
    }
    return Object.keys(out).length >= 4 ? out : null;
  } catch {
    return null;
  }
}

// Remember the last successful real fetch so a transient block doesn't drop us
// back to the static seed — real prices stay "sticky".
let lastAnchor: Record<string, number> | null = null;
let lastLive: Record<string, number> | null = null;

/**
 * Anchor prices: a stable real-market base for the deterministic simulation.
 * Cached for hours so a season's price levels don't shift underneath the replay.
 */
export async function getAnchorPrices(): Promise<{ prices: Record<string, number>; live: boolean }> {
  const real = await fetchQuotes(6 * 3600);
  if (real) {
    lastAnchor = { ...FALLBACK, ...real };
    return { prices: lastAnchor, live: true };
  }
  return { prices: lastAnchor ?? { ...FALLBACK }, live: lastAnchor !== null };
}

/** Live ticker prices: near-real-time real quotes for the market strip. */
export async function getLivePrices(): Promise<{ prices: Record<string, number>; live: boolean }> {
  const real = await fetchQuotes(60);
  if (real) {
    lastLive = { ...FALLBACK, ...real };
    return { prices: lastLive, live: true };
  }
  return { prices: lastLive ?? { ...FALLBACK }, live: lastLive !== null };
}
