import {
  AGENTS,
  STARTING_CAPITAL,
  DURATION_HOURS,
  TICK_SECONDS,
  EPOCH,
  BASE_SEED,
  TRADABLE,
  TOKENS,
  CHAINS,
} from "./config";
import { PriceFeed, mulberry32 } from "./prices";
import { decide, mockDecide, type DecisionContext } from "./llm";
import { getAnchorPrices, getLivePrices } from "./market";
import { kvConfigured, kvGet, kvSet } from "./kv";
import type {
  Agent,
  AgentConfig,
  Competition,
  Decision,
  HistoryResponse,
  Holding,
  Portfolio,
  ReasoningLog,
  SummaryResponse,
  Trade,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic, stateless arena engine.
//
// There is no background process and no shared database. The entire live state is
// a pure function of (EPOCH, now, BASE_SEED) replayed on demand, so every Vercel
// serverless invocation computes the exact same leaderboard. A fresh "season"
// (new competition, $1,000 each) starts every DURATION_HOURS ticks — the arena is
// perpetually live. Stock price *levels* are anchored to real Yahoo Finance quotes.
// ─────────────────────────────────────────────────────────────────────────────

const CASH = TOKENS.find((t) => t.symbol === "USD")!;
const tokenBySymbol = Object.fromEntries(TOKENS.map((t) => [t.symbol, t]));
const MOMENTUM_WINDOW = 4;

interface HeldPosition {
  tokens: number;
  avgCost: number;
}

interface EngineAgent {
  cfg: AgentConfig;
  cash: number;
  holdings: Map<string, HeldPosition>;
  trades: Trade[];
  reasoningLogs: ReasoningLog[];
  portfolioHistory: { hour: number; value: number; cash: number }[];
  peak: number;
  maxDrawdown: number;
  totalTrades: number;
}

export function seasonAndHour(): { season: number; hour: number } {
  const ticks = Math.max(0, Math.floor((Date.now() - EPOCH) / (TICK_SECONDS * 1000)));
  return { season: Math.floor(ticks / DURATION_HOURS), hour: ticks % DURATION_HOURS };
}

function seasonStartMs(season: number): number {
  return EPOCH + season * DURATION_HOURS * TICK_SECONDS * 1000;
}

function fresh(cfg: AgentConfig): EngineAgent {
  return {
    cfg,
    cash: STARTING_CAPITAL,
    holdings: new Map(),
    trades: [],
    reasoningLogs: [],
    portfolioHistory: [{ hour: 0, value: STARTING_CAPITAL, cash: STARTING_CAPITAL }],
    peak: STARTING_CAPITAL,
    maxDrawdown: 0,
    totalTrades: 0,
  };
}

// ── Pure replay of one season up to `uptoHour` ───────────────────────────────
function simulate(season: number, uptoHour: number, anchors: Record<string, number>): EngineAgent[] {
  const seed = BASE_SEED + season * 1000003;
  const prices = new PriceFeed(seed, anchors);
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0); // independent stream for decisions
  const seasonStart = seasonStartMs(season);

  const window: Record<string, number[]> = {};
  for (const t of TOKENS) window[t.symbol] = [prices.price(t.symbol)];

  const agents = AGENTS.map(fresh);

  for (let h = 1; h <= uptoHour; h++) {
    prices.tick();
    for (const t of TOKENS) {
      const w = window[t.symbol];
      w.push(prices.price(t.symbol));
      if (w.length > MOMENTUM_WINDOW) w.shift();
    }
    const momentum = momentumOf(window);
    const ts = seasonStart + h * 3600 * 1000;

    for (const a of agents) {
      const ctx = contextFor(a, prices, momentum, h);
      const d = mockDecide(a.cfg, ctx, rng);
      applyDecision(a, d, prices, h, ts);
    }
    for (const a of agents) snapshot(a, prices, h);
  }
  return agents;
}

function momentumOf(window: Record<string, number[]>): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of TOKENS) {
    const w = window[t.symbol];
    const first = w[0];
    const last = w[w.length - 1];
    m[t.symbol] = first > 0 ? ((last - first) / first) * 100 : 0;
  }
  return m;
}

function contextFor(a: EngineAgent, prices: PriceFeed, momentum: Record<string, number>, hour: number): DecisionContext {
  return {
    hour,
    cashUSDC: a.cash,
    totalValue: totalValue(a, prices),
    holdings: [...a.holdings.entries()].map(([symbol, p]) => ({ symbol, tokens: p.tokens, value: p.tokens * prices.price(symbol) })),
    prices: prices.snapshot(),
    momentum,
    tradable: TRADABLE.map((t) => ({ symbol: t.symbol, chain: t.chain })),
  };
}

// ── Trade application ────────────────────────────────────────────────────────
function applyDecision(a: EngineAgent, d: Decision, prices: PriceFeed, hour: number, ts: number): void {
  const symbol = d.symbol && tokenBySymbol[d.symbol] && d.symbol !== "USD" ? d.symbol : undefined;
  const amount = d.usdAmount ?? 0;
  let logTrade = "No trade this cycle";

  if (d.action === "BUY" && symbol) {
    const usd = Math.min(amount, a.cash);
    if (usd >= 5) {
      buy(a, symbol, usd, prices, hour, ts, d.reasoning);
      logTrade = `BUY ${symbol} $${usd.toFixed(2)}`;
    }
  } else if (d.action === "SELL" && symbol && a.holdings.has(symbol)) {
    const pos = a.holdings.get(symbol)!;
    const value = pos.tokens * prices.price(symbol);
    const usd = amount > 0 ? Math.min(amount, value) : value;
    if (usd >= 1) {
      sell(a, symbol, usd, prices, hour, ts, d.reasoning);
      logTrade = `SELL ${symbol} $${usd.toFixed(2)}`;
    }
  } else if (d.action === "SWAP" && symbol) {
    const from = [...a.holdings.entries()].sort(
      (x, y) => y[1].tokens * prices.price(y[0]) - x[1].tokens * prices.price(x[0])
    )[0];
    if (from && from[0] !== symbol) {
      const value = from[1].tokens * prices.price(from[0]);
      swap(a, from[0], symbol, value, prices, hour, ts, d.reasoning);
      logTrade = `SWAP ${from[0]}→${symbol} $${value.toFixed(2)}`;
    } else if (a.cash >= 5) {
      const usd = Math.min(Math.max(amount, a.cash * 0.25), a.cash);
      buy(a, symbol, usd, prices, hour, ts, d.reasoning);
      logTrade = `BUY ${symbol} $${usd.toFixed(2)}`;
    }
  }

  a.reasoningLogs.push({ hour, timestamp: ts, text: d.reasoning, trade: logTrade });
}

function buy(a: EngineAgent, symbol: string, usd: number, prices: PriceFeed, hour: number, ts: number, reasoning: string): void {
  const price = prices.price(symbol);
  const tokens = usd / price;
  a.cash -= usd;
  const pos = a.holdings.get(symbol) ?? { tokens: 0, avgCost: 0 };
  const newTokens = pos.tokens + tokens;
  pos.avgCost = newTokens > 0 ? (pos.avgCost * pos.tokens + price * tokens) / newTokens : price;
  pos.tokens = newTokens;
  a.holdings.set(symbol, pos);
  record(a, "BUY", symbol, tokens, price, usd, hour, ts, reasoning, CASH.chainId, tokenBySymbol[symbol].chainId, "USD", symbol);
}

function sell(a: EngineAgent, symbol: string, usd: number, prices: PriceFeed, hour: number, ts: number, reasoning: string): void {
  const price = prices.price(symbol);
  const pos = a.holdings.get(symbol)!;
  const tokens = Math.min(usd / price, pos.tokens);
  pos.tokens -= tokens;
  a.cash += tokens * price;
  if (pos.tokens <= 1e-9) a.holdings.delete(symbol);
  record(a, "SELL", symbol, tokens, price, tokens * price, hour, ts, reasoning, tokenBySymbol[symbol].chainId, CASH.chainId, symbol, "USD");
}

function swap(a: EngineAgent, fromSym: string, toSym: string, usd: number, prices: PriceFeed, hour: number, ts: number, reasoning: string): void {
  const fromPrice = prices.price(fromSym);
  const toPrice = prices.price(toSym);
  const fromPos = a.holdings.get(fromSym)!;
  const fromTokens = Math.min(usd / fromPrice, fromPos.tokens);
  const proceeds = fromTokens * fromPrice;
  fromPos.tokens -= fromTokens;
  if (fromPos.tokens <= 1e-9) a.holdings.delete(fromSym);
  const toTokens = proceeds / toPrice;
  const toPos = a.holdings.get(toSym) ?? { tokens: 0, avgCost: 0 };
  const newTokens = toPos.tokens + toTokens;
  toPos.avgCost = newTokens > 0 ? (toPos.avgCost * toPos.tokens + toPrice * toTokens) / newTokens : toPrice;
  toPos.tokens = newTokens;
  a.holdings.set(toSym, toPos);
  record(a, "SWAP", toSym, toTokens, toPrice, proceeds, hour, ts, reasoning, tokenBySymbol[fromSym].chainId, tokenBySymbol[toSym].chainId, fromSym, toSym);
}

function record(
  a: EngineAgent,
  type: Trade["type"],
  symbol: string,
  tokens: number,
  price: number,
  value: number,
  hour: number,
  timestamp: number,
  reasoning: string,
  fromChainId: number,
  toChainId: number,
  fromSymbol: string,
  toSymbol: string
): void {
  a.trades.push({
    type,
    stock: symbol,
    stockName: tokenBySymbol[symbol]?.name ?? symbol,
    sector: "",
    tokens,
    price,
    value,
    hour,
    timestamp,
    reasoning,
    fromChainId,
    toChainId,
    fromSymbol,
    toSymbol,
  });
  a.totalTrades += 1;
}

// ── Metrics ──────────────────────────────────────────────────────────────────
function holdingsValue(a: EngineAgent, prices: PriceFeed): number {
  let v = 0;
  for (const [symbol, p] of a.holdings) v += p.tokens * prices.price(symbol);
  return v;
}
function totalValue(a: EngineAgent, prices: PriceFeed): number {
  return a.cash + holdingsValue(a, prices);
}
function snapshot(a: EngineAgent, prices: PriceFeed, hour: number): void {
  const value = totalValue(a, prices);
  a.portfolioHistory.push({ hour, value: r2(value), cash: r2(a.cash) });
  a.peak = Math.max(a.peak, value);
  const dd = a.peak > 0 ? ((a.peak - value) / a.peak) * 100 : 0;
  a.maxDrawdown = Math.max(a.maxDrawdown, dd);
}
function sharpe(a: EngineAgent): number {
  const h = a.portfolioHistory;
  if (h.length < 3) return 0;
  const rets: number[] = [];
  for (let i = 1; i < h.length; i++) if (h[i - 1].value > 0) rets.push((h[i].value - h[i - 1].value) / h[i - 1].value);
  if (rets.length < 2) return 0;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const variance = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length;
  const std = Math.sqrt(variance);
  return std > 0 ? r2((mean / std) * Math.sqrt(24)) : 0;
}

function portfolioOf(a: EngineAgent, prices: PriceFeed): Portfolio {
  const holdings: Holding[] = [...a.holdings.entries()].map(([symbol, p]) => {
    const price = prices.price(symbol);
    const t = tokenBySymbol[symbol];
    const value = p.tokens * price;
    const cost = p.avgCost * p.tokens;
    return {
      symbol,
      name: t?.name ?? symbol,
      chain: t?.chain ?? CHAINS[t?.chainId] ?? "Ethereum",
      chainId: t?.chainId ?? 1,
      tokens: r6(p.tokens),
      avgCost: rp(p.avgCost),
      currentPrice: rp(price),
      value: r2(value),
      pnl: r2(value - cost),
      pnlPct: cost > 0 ? r2(((value - cost) / cost) * 100) : 0,
    };
  });
  const tv = totalValue(a, prices);
  return {
    cash: r2(a.cash),
    totalValue: r2(tv),
    pnl: r2(tv - STARTING_CAPITAL),
    pnlPct: r2(((tv - STARTING_CAPITAL) / STARTING_CAPITAL) * 100),
    maxDrawdown: r2(a.maxDrawdown),
    sharpeRatio: sharpe(a),
    totalTrades: a.totalTrades,
    holdings: holdings.sort((x, y) => y.value - x.value),
  };
}

function toAgent(a: EngineAgent, prices: PriceFeed, includeLogs: boolean): Agent {
  return {
    id: a.cfg.id,
    name: a.cfg.name,
    model: a.cfg.model,
    color: a.cfg.color,
    colorLight: a.cfg.colorLight,
    avatar: a.cfg.avatar,
    tagline: a.cfg.tagline,
    walletAddress: a.cfg.walletAddress,
    portfolio: portfolioOf(a, prices),
    trades: includeLogs ? a.trades : [],
    reasoningLogs: includeLogs ? a.reasoningLogs : [],
    portfolioHistory: a.portfolioHistory,
  };
}

function competitionFor(season: number): Competition {
  const start = new Date(seasonStartMs(season));
  const end = new Date(seasonStartMs(season + 1));
  return { start: start.toISOString(), end: end.toISOString(), durationHours: DURATION_HOURS, startingCapital: STARTING_CAPITAL };
}

// ── Memoized state per (season, hour, anchor) ────────────────────────────────
interface Snap {
  key: string;
  season: number;
  hour: number;
  anchors: Record<string, number>;
  agents: EngineAgent[];
  prices: PriceFeed;
}
let cached: Snap | null = null;

async function getState(): Promise<Snap> {
  const { season, hour } = seasonAndHour();
  const { prices: anchors } = await getAnchorPrices();
  const key = `${season}:${hour}:${Math.round((anchors.ETH ?? 0) * 100)}`;
  if (cached && cached.key === key) return cached;
  const agents = simulate(season, hour, anchors);
  const prices = new PriceFeed(BASE_SEED + season * 1000003, anchors);
  for (let h = 0; h < hour; h++) prices.tick(); // fast-forward prices to `hour`
  cached = { key, season, hour, anchors, agents, prices };
  await enrichWithRealLLM(cached);
  return cached;
}

// Optional: replace the latest cycle's reasoning with a real LLM call. Off unless
// ARENA_LIVE_LLM=true. Consistency across serverless instances comes from KV
// (Vercel KV / Upstash): the first lambda to see a new hour generates + stores,
// everyone else reads the same text. Falls back to in-memory cache locally, and
// any failure silently keeps the deterministic mock reasoning.
const llmCache = new Map<string, string>();
async function enrichWithRealLLM(snap: Snap): Promise<void> {
  if (String(process.env.ARENA_LIVE_LLM ?? "false") !== "true" || snap.hour < 1) return;
  const useKv = kvConfigured();
  await Promise.all(
    snap.agents.map(async (a) => {
      const k = `arena:r:${snap.season}:${snap.hour}:${a.cfg.id}`;
      let text = llmCache.get(k);
      if (text === undefined && useKv) {
        const stored = await kvGet(k);
        if (stored) {
          text = stored;
          llmCache.set(k, stored);
        }
      }
      if (text === undefined) {
        try {
          const ctx = contextFor(a, snap.prices, momentumOf(windowFrom(snap.prices)), snap.hour);
          text = (await decide(a.cfg, ctx)).reasoning;
          llmCache.set(k, text);
          if (useKv) await kvSet(k, text);
        } catch {
          return;
        }
      }
      const last = a.reasoningLogs[a.reasoningLogs.length - 1];
      if (last && last.hour === snap.hour) last.text = text;
    })
  );
}
function windowFrom(prices: PriceFeed): Record<string, number[]> {
  const w: Record<string, number[]> = {};
  for (const t of TOKENS) w[t.symbol] = [prices.price(t.symbol)];
  return w;
}

// ── Public API (used by the route handlers) ──────────────────────────────────
export async function getSummaryResponse(): Promise<SummaryResponse> {
  const snap = await getState();
  const { prices: market, live: marketLive } = await getLivePrices();
  const agentData: Record<string, Agent> = {};
  for (const a of snap.agents) agentData[a.cfg.id] = toAgent(a, snap.prices, false);
  const rankings = Object.values(agentData).sort((x, y) => y.portfolio.totalValue - x.portfolio.totalValue);
  const tokenPrices: Record<string, number> = {};
  for (const t of TOKENS) tokenPrices[t.symbol] = rp(snap.prices.price(t.symbol));
  return {
    agentData,
    tokenPrices,
    market,
    marketLive,
    season: snap.season,
    rankings,
    competition: competitionFor(snap.season),
    live: true,
  };
}

export async function getHistoryResponse(): Promise<HistoryResponse> {
  const snap = await getState();
  const agentHistory: HistoryResponse["agentHistory"] = {};
  for (const a of snap.agents) {
    agentHistory[a.cfg.id] = { trades: [...a.trades].reverse(), reasoningLogs: [...a.reasoningLogs].reverse() };
  }
  return { agentHistory };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
function r4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
/** Price rounder that preserves precision for sub-cent tokens (PEPE, SHIB, …). */
function rp(n: number): number {
  if (n === 0) return 0;
  return Math.abs(n) >= 1 ? Math.round(n * 1e4) / 1e4 : Number(n.toPrecision(5));
}
function r6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
