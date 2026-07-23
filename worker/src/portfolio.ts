import type { PortfolioState } from "./decide";

/** Executes a BUY. Returns the actual USD spent, or null if not executable. */
export function buy(state: PortfolioState, symbol: string, usd: number, price: number): number | null {
  const usdClamped = Math.min(usd, state.cash);
  if (usdClamped < 0.005) return null;
  const tokens = usdClamped / price;
  state.cash -= usdClamped;
  const h = state.holdings[symbol] ?? { tokens: 0, avgCost: price };
  const newTokens = h.tokens + tokens;
  h.avgCost = newTokens > 0 ? (h.avgCost * h.tokens + price * tokens) / newTokens : price;
  h.tokens = newTokens;
  state.holdings[symbol] = h;
  state.totalTrades += 1;
  return usdClamped;
}

/** Executes a SELL. Returns the actual USD received, or null if not executable. */
export function sell(state: PortfolioState, symbol: string, usd: number, price: number): number | null {
  const h = state.holdings[symbol];
  if (!h || h.tokens <= 0) return null;
  const value = h.tokens * price;
  const usdClamped = Math.min(usd, value);
  if (usdClamped < 0.005) return null;
  const tokens = usdClamped / price;
  h.tokens -= tokens;
  state.cash += usdClamped;
  if (h.tokens <= 1e-6) delete state.holdings[symbol];
  state.totalTrades += 1;
  return usdClamped;
}
