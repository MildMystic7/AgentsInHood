// ─────────────────────────────────────────────────────────────────────────────
// Data model — mirrors the shape served by the original Agentic Quant Wars API
// so the frontend contract is identical.
// ─────────────────────────────────────────────────────────────────────────────

export type TradeType = "BUY" | "SELL" | "SWAP";

export interface Holding {
  symbol: string;
  name: string;
  chain: string;
  chainId: number;
  tokens: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPct: number;
}

export interface Portfolio {
  cash: number;
  totalValue: number;
  pnl: number;
  pnlPct: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  holdings: Holding[];
}

export interface PortfolioPoint {
  hour: number;
  value: number;
  cash: number;
}

export interface Trade {
  type: TradeType;
  stock: string; // token symbol (field name kept from the original stock-trading lineage)
  stockName: string;
  sector: string;
  tokens: number;
  price: number;
  value: number;
  hour: number;
  timestamp: number;
  reasoning: string;
  fromChainId: number;
  toChainId: number;
  fromSymbol: string;
  toSymbol: string;
}

export interface ReasoningLog {
  hour: number;
  timestamp: number;
  text: string;
  trade: string;
}

export interface Agent {
  id: string;
  name: string;
  model: string;
  color: string;
  colorLight: string;
  avatar: string;
  tagline: string;
  walletAddress: string;
  portfolio: Portfolio;
  trades: Trade[];
  reasoningLogs: ReasoningLog[];
  portfolioHistory: PortfolioPoint[];
}

export interface Competition {
  start: string;
  end: string;
  durationHours: number;
  startingCapital: number;
}

/** GET /api/agents/summary — light payload (trades/reasoning intentionally empty). */
export interface SummaryResponse {
  agentData: Record<string, Agent>;
  tokenPrices: Record<string, number>;
  /** Real live spot prices (CoinGecko) for the market ticker. */
  market: Record<string, number>;
  marketLive: boolean;
  season: number;
  rankings: Agent[];
  competition: Competition;
  live: boolean;
}

/** GET /api/agents/history — the heavy logs. */
export interface HistoryResponse {
  agentHistory: Record<string, { trades: Trade[]; reasoningLogs: ReasoningLog[] }>;
}

// ── Engine-internal ──────────────────────────────────────────────────────────

export type Provider = "anthropic" | "openai" | "google" | "minimax";

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  provider: Provider;
  /** Exact model id to request from the provider (overrides the provider default). */
  llmModel?: string;
  color: string;
  colorLight: string;
  avatar: string;
  tagline: string;
  walletAddress: string;
  /** Persona injected into the system prompt to give each brain a distinct style. */
  persona: string;
}

export interface TokenConfig {
  symbol: string;
  name: string;
  chain: string;
  chainId: number;
  basePrice: number;
  /** Per-hour volatility (std dev of log-returns) used by the price simulator. */
  vol: number;
  drift: number;
}

/** What an LLM (or the mock) returns for one decision cycle. */
export interface Decision {
  action: TradeType | "HOLD";
  symbol?: string; // target token for BUY/SELL
  usdAmount?: number; // size in USD
  reasoning: string; // natural-language rationale shown in the AI Reasoning feed
}
