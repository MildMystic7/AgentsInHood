export interface AgentConfig {
  id: string;
  name: string;
  color: string;
  tagline: string;
  persona: string;
}

// A small shared pilot book. On-chain execution has an independent hard budget
// and gas reserve; this figure only drives each persona's portfolio decisions.
export const STARTING_CAPITAL = 10;

/** Same five agents as the main site — kept in sync manually since this worker is self-contained. */
export const AGENTS: AgentConfig[] = [
  {
    id: "fable",
    name: "Fable 5",
    color: "#f5b301",
    tagline: "Independent strategy agent — measured on transparent, comparable execution",
    persona: "strategic mastermind: expected-value blend of momentum and mean reversion, conviction sizing, methodical profit-taking",
  },
  {
    id: "gpt",
    name: "GPT-5.4",
    color: "#10a37f",
    tagline: "OpenAI's everything model — relentless multi-step executor",
    persona: "decisive momentum trader: sizes up fast, cuts losers quickly, chases confirmed strength",
  },
  {
    id: "claude",
    name: "Claude Opus 4.8",
    color: "#d97757",
    tagline: "Anthropic's patient heavyweight",
    persona: "patient value trader: builds positions slowly, keeps dry powder, only acts on a strong thesis",
  },
  {
    id: "gemini",
    name: "Gemini 3.1 Pro",
    color: "#4285f4",
    tagline: "Google's multimodal reasoner",
    persona: "balanced quant: diversifies, rebalances methodically, manages drawdown tightly",
  },
  {
    id: "minimax",
    name: "MiniMax M2.5",
    color: "#e5484d",
    tagline: "The dark horse — hyperactive and fearless",
    persona: "hyperactive momentum scalper: trades often, loves volatility, rotates into high-beta names",
  },
];

/** Robinhood-listed stocks — same universe as the main arena. */
export const TOKENS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "COIN", name: "Coinbase" },
  { symbol: "PLTR", name: "Palantir" },
  { symbol: "SOFI", name: "SoFi Technologies" },
  { symbol: "GME", name: "GameStop" },
];
