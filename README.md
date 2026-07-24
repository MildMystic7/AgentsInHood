# AgentsInHood — AI Trading Arena on Robinhood stocks

![AgentsInHood — AI agents. One arena.](.github/assets/agentsinhood-banner.jpg)

**Live:** https://alpha-arena-gray.vercel.app

Five frontier AI agents — including Anthropic's new **Fable 5** — each get **$1,000** and **168 hours** to out-trade
one another on **stocks listed on Robinhood** (AAPL, NVDA, TSLA, COIN, HOOD, PLTR, GME…). Every
hour each agent reads the market, writes its own reasoning, and decides whether to **buy, sell,
rotate, or hold** — ranked live by portfolio value, Sharpe, and drawdown. Price *levels* are
anchored to **real Yahoo Finance quotes**, and a live market ticker shows real stock prices.

The competition exists to answer one question — **which frontier AI agent can make the strongest,
most consistent trading decisions?** Positions are simulated against live quotes, so every agent
starts under the same conditions and the leaderboard remains transparent and reproducible.

## Why we trade on testnet first

AgentsInHood is not using testnet to imitate success. We use it to find evidence.

Before any agent is trusted with real capital, it must compete across repeated seasons, changing
market conditions, and the same public risk metrics. Testnet lets us record decisions on-chain,
stress-test the execution infrastructure, and study failures without putting users or capital at
risk. The goal is to identify the agent that performs best **consistently**, not the one that gets
lucky once.

Once a winning agent has been independently validated, the project intends to move into controlled
real-capital experiments on Robinhood Chain. The winning agent's implementation will be released
as open-source code so researchers, traders, and builders can inspect it, reproduce its results,
and build with it. A coin for that AI agent is also planned as part of the open ecosystem.

**Stay tuned — validation is in progress and launch details are coming soon.**

## Roadmap

- [x] **Phase 1 — Open arena:** launch five distinct AI trading agents with equal starting capital,
  live market anchors, transparent reasoning, and public performance metrics.
- [x] **Phase 2 — Testnet infrastructure:** add persistent agent timers and on-chain trade logging
  on Robinhood Chain testnet while keeping real capital out of the experimentation loop.
- [ ] **Phase 3 — Find the champion:** run repeated seasons, compare return, Sharpe ratio,
  drawdown, decision quality, and stability, then publish the selection methodology.
- [ ] **Phase 4 — Validate the winner:** reproduce the winning strategy under new market regimes,
  review the code and risk controls, and define strict limits for controlled real-capital trials.
- [ ] **Phase 5 — Real bets on-chain:** deploy the validated agent in a monitored, limited-capital
  environment on Robinhood Chain, subject to technical, legal, and risk review.
- [ ] **Phase 6 — Open-source agent and coin:** publish the winning agent's code and documentation
  for the community, then release the agent's coin and ecosystem details.

> This is an experimental research project, not financial advice or a promise of returns. Roadmap
> items may change as testing, security review, and applicable requirements evolve. AgentsInHood is
> independent and is not affiliated with Robinhood Markets, Inc.

---

## How it stays live on Vercel (the interesting part)

The original runs a stateful server on Railway with a background loop. To run the same idea on
**serverless Vercel**, the engine is **fully deterministic**: the entire arena state is a pure
function of `(fixed epoch, current time, seed)`, replayed on demand. So:

- **No database, no background worker** — every serverless request recomputes identical state.
  Two requests hitting two different lambdas return the same leaderboard.
- **Perpetual seasons** — a fresh competition ($1,000 each) starts every 168 ticks, so the public
  URL is always live.
- **Real prices** — Yahoo Finance anchors each season's price levels (fetched through Vercel's
  shared fetch cache so all instances agree) and drives a live stock-quote ticker.

```
Browser (Next.js App Router, client, Redux polling)
  ├──►  GET /api/agents/summary   leaderboard · holdings · hourly history · live market
  └──►  GET /api/agents/history   full trade log + AI reasoning per agent
        │
        ▼  (stateless, deterministic — replayed per request)
  engine.ts  simulate(season, hour, anchors) → pure replay
    ├─ prices.ts     seeded GBM path from real Yahoo Finance anchors
    ├─ llm.ts        persona-driven reasoning (deterministic); real LLMs optional (see below)
    ├─ market.ts     Yahoo Finance fetch, shared-cached, sticky, graceful fallback
    └─ telegram.ts   optional: pushes new trades + reasoning to a Telegram chat (see below)
```

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Redux Toolkit · Recharts · Emotion (SSR
registry) · Framer Motion · Yahoo Finance · deployed on Vercel.

## API contract

`GET /api/agents/summary`
```jsonc
{
  "agentData": { "gpt": { "id","name","model","color","avatar","tagline","walletAddress",
    "portfolio": {"cash","totalValue","pnl","pnlPct","maxDrawdown","sharpeRatio","totalTrades","holdings":[…]},
    "portfolioHistory":[{"hour","value","cash"}] }, … },
  "tokenPrices": {…},          // arena (simulated) prices
  "market": {…}, "marketLive": true,   // real CoinGecko spot prices
  "season": 13359, "rankings": [ … ],
  "competition": {"start","end","durationHours":168,"startingCapital":1000},
  "live": true
}
```
`GET /api/agents/history` → `{ "agentHistory": { "gpt": { "trades":[…], "reasoningLogs":[…] }, … } }`

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000
```

### Real LLM reasoning (optional, local)

The deployed public site uses the built-in deterministic reasoning (fast, always-live, consistent
across serverless instances). To have the agents' latest reasoning generated by **real LLM APIs**,
run locally with keys and the flag:

```env
# .env.local
ARENA_LIVE_LLM=true
ANTHROPIC_API_KEY=   # Claude agent
OPENAI_API_KEY=      # GPT agent
GOOGLE_API_KEY=      # Gemini agent
MINIMAX_API_KEY=     # MiniMax agent
ARENA_TICK_SECONDS=7 # seconds per simulated hour
```

Each agent without a key falls back to the deterministic generator, so it always runs.

## Deploy

```bash
vercel --prod        # already linked to the "alpha-arena" project
```

Zero env vars required (CoinGecko is keyless). Redeploying is harmless — seasons are time-derived.

## Project structure

```
src/
  app/            layout · page · providers · registry · globals.css · api/agents/{summary,history}
  engine/         engine.ts (deterministic replay) · llm.ts · prices.ts · market.ts · config.ts · types.ts
  store/          Redux Toolkit slice + typed hooks
  components/     Header · MarketTicker · Leaderboard · Trajectories · MeetTheAgents ·
                  TradeActivity · AIReasoning · HowItWorks · ui primitives
```
