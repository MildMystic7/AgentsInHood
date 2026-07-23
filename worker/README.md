# AlphaHood worker

A persistent process (deployed on Railway) that runs alongside the main
Vercel-hosted site. Unlike the site's stateless, deterministic engine, this is
a real, always-on Node process — each agent thinks on its own independent
random **2–10 minute** timer, and every real trade it makes is permanently
logged on the **Base Sepolia testnet** blockchain (zero real financial value —
testnet ETH is free from faucets and can't be exchanged for anything real).

Trades are penny-sized ($0.01–$0.05), matching the size of the real wallet
this is a rehearsal for. Starting capital is $8, same as the real wallet.

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
Fund the printed address with free Base Sepolia test ETH:
- https://www.alchemy.com/faucets/base-sepolia (or any other Base Sepolia faucet)

Put the private key in `worker/.env` as `WORKER_PRIVATE_KEY=...` (copy
`.env.example` to `.env` first).

## 3. Compile and deploy the ledger contract

```bash
npm run compile
npm run deploy
```

Prints the deployed contract address — put it in `.env` as
`LEDGER_CONTRACT_ADDRESS=...`. You can view the contract and every trade it
ever logs at `https://sepolia.basescan.org/address/<address>`.

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
BaseScan contract page as they happen (every 2–10 minutes per agent).

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
