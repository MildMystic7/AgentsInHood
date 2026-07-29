# AgentsInHood mainnet worker

This persistent worker runs five independent agent loops and passes their proposals through one
serialized, wallet-wide execution gate on Robinhood Chain mainnet.

The default is `dry-run`. No real transaction is possible until every required live control is
present.

## Safety model

- One dedicated wallet for all five agents.
- $0.01–$0.05 per proposed trade.
- $10 daily circuit breaker.
- $1.75 initial lifetime pilot cap.
- Minimum `0.001 ETH` gas reserve.
- USDG is the settlement asset for Stock Token buys and sells; ETH is used only for gas.
- Official Robinhood Stock Token registry lookup on every cached asset refresh.
- Official Uniswap Universal Router pinned for chain `4663`.
- Quote simulation, recipient, token, chain, gas, 10% maximum price impact, and 10% slippage checks.
- Serialized approvals and swaps to prevent nonce collisions.
- Persistent KV required for live budget and idempotency state. Railway Redis
  (`REDIS_URL`) and Upstash REST (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) are supported.

## Local setup

```bash
npm install
copy .env.example .env
npm run new-mainnet-wallet
npm run dev
```

`new-mainnet-wallet` refuses to overwrite an existing mainnet key. It writes the private key to the
ignored local `.env` file and prints only the public address.

To rotate an existing wallet without losing access to it:

```powershell
$env:ROTATE_MAINNET_WALLET_CONFIRM="CREATE_FRESH_WALLET_AND_ARCHIVE_CURRENT"
npm run rotate-mainnet-wallet
```

The command verifies that the current key matches its address, archives the complete previous
configuration under the Git-ignored `worker/.wallets/` directory, and activates a fresh wallet in
the local `.env`. It never prints either private key. Do not change the Railway wallet address
until the new wallet is funded, backed up, and passes a read-only balance check.

Set a unique `MAINNET_RUN_ID` before a fresh public challenge, for example
`24h-2026-07-28`. Mainnet budgets, idempotency records, transaction history, and every agent
portfolio are scoped to that run ID. Leaving it unset preserves the existing production state.
The complete launch and monitoring checklist is in [`24H_CHALLENGE.md`](24H_CHALLENGE.md).

## Modes

```env
MAINNET_MODE=off
MAINNET_MODE=dry-run
MAINNET_MODE=live
```

- `off`: agent portfolios can run locally; no mainnet plan is accepted.
- `dry-run`: proposals must pass budgets, official-token resolution, and a real Uniswap quote; no transaction is sent.
- `live`: real approvals and swaps may be signed.

Live mode additionally requires:

```env
MAINNET_PRIVATE_KEY=
UNISWAP_API_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
MAINNET_LIVE_CONFIRM=I_UNDERSTAND_REAL_FUNDS
```

The executor has independent notional and gas circuit breakers. Its production defaults reserve at
most 5 cents of gas per transaction, 50 cents per day, and $1 over the entire pilot. A shared-wallet
cooldown allows no more than one live attempt every 10 minutes. Conservative reservations are made
before broadcasting and are not refunded automatically after a failed attempt.

Telegram credentials belong only to this Railway worker. Dry-run plans never trigger messages;
only confirmed mainnet executions with Blockscout proof are published.

Confirmed and failed execution records are retained separately from the short diagnostic tail of
routine cooldown rejections, so agent activity cannot evict verifiable transactions from the
public audit feed. `MAINNET_AUDIT_TRADES_JSON` can merge independently verified legacy records
into that feed after an operational recovery; it must contain public transaction data only.

## One-hour monitored smoke test

`npm run one-hour-live-test` is a deliberately constrained operational test, not an autonomous
agent competition. It can submit at most six fixed `$0.01` AAPL buys over one hour, separated by
eleven minutes. Every confirmed trade uses the normal budgets, gas reserve, Redis idempotency, and
Telegram proof path.

The runner refuses live execution unless both confirmations are present:

```env
MAINNET_LIVE_CONFIRM=I_UNDERSTAND_REAL_FUNDS
ONE_HOUR_TEST_CONFIRM=I_UNDERSTAND_SIX_REAL_TRADES
```

Set `ONE_HOUR_TEST_PREFLIGHT_ONLY=true` to validate a fresh quote without signing or broadcasting.

Do not put a private key in Git, chat, screenshots, logs, Vercel public variables, or the website.
Use a dedicated Railway secret and keep an offline backup.

## Public endpoints

- `GET /` — health response
- `GET /state` — local agent portfolios
- `GET /mainnet/status` — public mode, wallet, budgets, balance, and recent execution records

The main website proxies `/mainnet/status` through `/api/mainnet/status`; it never receives the
private key or Uniswap API key.

## Launch checklist

1. Build and run in `dry-run`.
2. Confirm the wallet backup and public address.
3. Configure a single Railway replica and persistent KV.
4. Add the Uniswap API key as a Railway secret.
5. Connect the website status proxy and verify it still says dry-run.
6. Confirm the Robinhood Chain network and wallet address again.
7. Fund only the agreed pilot amount, leaving the gas reserve intact.
8. Review a fresh quote and simulation.
9. Set live confirmation only for the monitored launch window.
10. Verify each transaction independently on Blockscout before allowing another.
