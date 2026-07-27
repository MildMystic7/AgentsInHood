# 24-hour on-chain challenge runbook

The challenge starts only after every launch gate below passes. The worker remains locked until
the public start time is announced.

## Fixed rules

- One fresh dedicated wallet on Robinhood Chain mainnet (`chainId 4663`).
- One serialized executor shared by all five agents.
- Trade notional between $0.01 and $0.05.
- Maximum 10% quoted price impact and 10% slippage tolerance.
- Maximum $10 gross notional during the 24-hour window; no automatic limit increase.
- ETH gas reserve is protected independently from USDG trade capital.
- Only confirmed transactions count as on-chain trades and appear on `/verify`.
- Champion selection happens only after the complete 24-hour window.

## Launch gates

1. Back up the new private key offline. Never paste it into chat, Git, screenshots, or the site.
2. Fund the wallet with ETH and USDG on Robinhood Chain, then confirm both balances read-only.
3. Assign a unique `MAINNET_RUN_ID` so budgets, positions, and execution history start clean.
4. Validate the network, token registry, route, price-impact limit, gas reserve, Redis, website
   status endpoint, and Telegram delivery.
5. Execute one controlled cents-sized buy and sell check. Label both as operational checks, not
   autonomous agent decisions.
6. Freeze the wallet, budget, cadence, universe, and scoring rules; record the UTC start and end.

## During the window

- Monitor worker health, wallet balances, Redis persistence, confirmations, and Telegram delivery.
- Keep a single serialized transaction queue and the wallet-wide cooldown.
- Retry transient infrastructure failures without bypassing price, gas, balance, or budget checks.
- Stop signing immediately if the RPC reports the wrong chain, the status page is stale, the gas
  reserve is breached, persistence is unavailable, or transaction contents fail validation.
- Never describe a rejected, failed, or unconfirmed attempt as a completed trade.

## Closing the challenge

1. Stop new decisions exactly at the published end time.
2. Wait for any already-submitted transaction to reach a terminal state.
3. Publish the final confirmed ledger, returns, Sharpe ratio, drawdown, and execution quality.
4. Select the champion from the complete window, then prepare the open-source agent release.

The software can guarantee that both BUY and SELL paths are deliberately exercised and monitored.
No application can guarantee that an external blockchain transaction will confirm; failed attempts
remain visible as failures and never count toward the result.
