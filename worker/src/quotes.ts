import { TOKENS } from "./config";

const SYMBOLS = TOKENS.map((t) => t.symbol);
const FEED_SYMBOLS = [...SYMBOLS, "ETH-USD"];
const HISTORY_LEN = 6;

// Module-level in-memory rolling price history, shared across every agent's
// independent timer — one process, one price feed. Momentum resets on
// restart, which only affects flavor text, never correctness.
const history: Record<string, number[]> = {};

/** Live real stock quotes via Yahoo Finance's keyless "spark" endpoint. */
async function fetchQuotes(): Promise<Record<string, number>> {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${FEED_SYMBOLS.join(",")}&range=1d&interval=1d`;
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; AgentsInHoodWorker/1.0)" } });
  if (!res.ok) throw new Error(`quotes fetch failed: ${res.status}`);
  const data = (await res.json()) as {
    spark?: { result?: { symbol: string; response?: { meta?: { regularMarketPrice?: number } }[] }[] };
  };
  const out: Record<string, number> = {};
  for (const r of data?.spark?.result ?? []) {
    const p = r.response?.[0]?.meta?.regularMarketPrice;
    if (typeof p === "number" && p > 0) out[r.symbol] = p;
  }
  return out;
}

export interface QuoteSnapshot {
  prices: Record<string, number>;
  ethUsd: number;
  /** % change vs. the oldest sample still in the rolling window. */
  momentum: Record<string, number>;
}

export async function getQuoteSnapshot(): Promise<QuoteSnapshot> {
  const feed = await fetchQuotes();
  const ethUsd = feed["ETH-USD"];
  if (!ethUsd) throw new Error("ETH/USD quote is unavailable");
  const prices = Object.fromEntries(Object.entries(feed).filter(([symbol]) => symbol !== "ETH-USD"));
  const momentum: Record<string, number> = {};
  for (const [symbol, price] of Object.entries(prices)) {
    const h = history[symbol] ?? [];
    h.push(price);
    if (h.length > HISTORY_LEN) h.shift();
    history[symbol] = h;
    const first = h[0];
    momentum[symbol] = first > 0 ? ((price - first) / first) * 100 : 0;
  }
  return { prices, ethUsd, momentum };
}
