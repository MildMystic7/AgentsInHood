# AlphaHood worker

A persistent process (deployed on Railway) that runs alongside the main
Vercel-hosted site. Unlike the site's stateless, deterministic engine, this is
a real, always-on Node process — each agent thinks on its own independent
random **2–10 minute** timer, and every real trade it makes is permanently
logged on **Robinhood Chain's public testnet** (chain id `46630`) — zero real
financial value, but the same chain (and, later, the same Stock Token
standard) the real thing runs on. Testnet ETH is free from the faucet and
can't be exchanged for anything real.

Trades are penny-sized ($0.01–$0.05), matching the size of the real wallet
this is a rehearsal for. Starting capital is $8, same as the real wallet.

## Why Robinhood Chain (not a generic testnet)

Robinhood Chain is a real, live Arbitrum Orbit L2 — public testnet since
Feb 2026, mainnet since Jul 1 2026 — purpose-built for tokenized stocks
("Stock Tokens": AAPL, TSLA, etc. as ERC-20s, tradeable 24/7 with real DEX
liquidity via Arcus/Uniswap/Lighter on mainnet). That makes it the correct
target for this project, not just "a" testnet.

**Current scope is intentionally the logging model, not real Stock Token
swaps yet.** Stock Tokens exist on testnet too, but per Robinhood's own docs
"testnet token addresses differ from mainnet" and "not all Stock Tokens may be
deployed on testnet" — and no DEX/router address is documented for either
network. Wiring up real swaps against unverified/guessed contract addresses
would be actively unsafe, so `AlphaHoodLedger.sol` sticks to logging (agentId,
action, symbol, USD size, reasoning) as an on-chain event, which needs no
third-party contract addresses at all. Swapping real Stock Tokens is a natural
phase 2 once the testnet token + DEX addresses are confirmed from Robinhood's
docs (https://docs.robinhood.com/chain) rather than guessed.

## Why a separate service

The main site (`../src`) runs on Vercel and is intentionally stateless —
perfect for a free, always-live public leaderboard, but it can't hold a
private key safely or run real multi-minute timers. This worker is the
opposite: one long-running process, holding a **testnet-only** signing key,
built specifically for the "real agent decisions, real timers, real on-chain
record" use case. It's fully self-contained (its own copy of the agent
personas/config) so it can be deployed independently without any monorepo
build complexity.

## 1. Install

```bash
cd worker
npm install
```

## 2. Generate a burner wallet (testnet only)

```bash
npm run new-wallet
```

Prints a fresh address + private key. **Never reuse a real/mainnet key here.**
Fund the printed address with free Robinhood Chain testnet ETH:
- https://faucet.testnet.chain.robinhood.com/ (connect/paste the address; this
  step needs a browser — it's protected against scripted claims)

Put the private key in `worker/.env` as `WORKER_PRIVATE_KEY=...` (copy
`.env.example` to `.env` first).

## 3. Compile and deploy the ledger contract

```bash
npm run compile
npm run deploy
```

Prints the deployed contract address — put it in `.env` as
`LEDGER_CONTRACT_ADDRESS=...`. You can view the contract and every trade it
ever logs at `https://explorer.testnet.chain.robinhood.com/address/<address>`.

The contract (`contracts/AlphaHoodLedger.sol`) never holds funds — it only
emits events. Only the deploying wallet (the "operator") can log trades, which
keeps the ledger meaningful without any custody/withdrawal risk.

## 4. Add the shared KV + Telegram vars

Copy these from your Vercel project's environment variables (Storage tab /
Settings → Environment Variables) into `worker/.env`:
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` — same Upstash Redis instance, used
  here to persist each agent's $8 paper portfolio across restarts.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — same bot, so trades from this
  worker land in the same chat, each with a link to the on-chain transaction.

## 5. Run locally

```bash
npm run dev
```

Watch the console — each agent logs when it thinks, trades, or skips. Trades
will start appearing in Telegram (with a "View on-chain" link) and on the
Robinhood Chain testnet explorer as they happen (every 2–10 minutes per agent).

Check `http://localhost:3000/state` any time for the current portfolio JSON.

## 6. Deploy to Railway

1. `railway login` (opens a browser to authorize the CLI).
2. From the `worker/` directory: `railway init` (or link to an existing
   project), then set the Railway service's **root directory** to `worker`.
3. In the Railway dashboard, add all the variables from `worker/.env` as
   service Variables (never commit `.env` — it's gitignored).
4. `railway up` (or just push to GitHub if you connect the repo — Railway
   redeploys automatically).
5. Set the start command to `npm run build && npm start` (or configure it as
   the Railway build/start commands in the dashboard).

The worker exposes a tiny HTTP server (`/` for a liveness check, `/state` for
the current portfolios) so Railway's health checks have something to hit.
