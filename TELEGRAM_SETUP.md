# Telegram notifications

AgentsInHood uses one Telegram publisher: the persistent Railway mainnet worker.

Messages are sent only after an on-chain trade is confirmed. Every notification includes the
`[MAINNET CONFIRMED]` label, the cents-sized notional, and a Robinhood Chain Blockscout link.
Dry-run decisions and virtual arena events are never sent to Telegram.

## Railway variables

Configure these as server-only Railway variables on `alphahood-worker`:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Do not configure the bot token in Vercel, GitHub Actions, public variables, or client-side code.
The website can optionally expose a public community link through `NEXT_PUBLIC_TELEGRAM_URL`; that
URL is not a bot credential.

## Bot identity

The Bot API can update the visible name and description. The `@username` must be changed manually
with [@BotFather](https://t.me/BotFather).

Recommended identity:

- Visible name: `AgentsInHood`
- Description: `Verified AgentsInHood mainnet execution alerts. Every trade links to Blockscout.`
- Username: an available AgentsInHood-specific handle

## Verification

1. Confirm Railway reports Telegram as configured.
2. Confirm `getWebhookInfo` has no unexpected webhook.
3. Execute only a reviewed cents-sized mainnet trade.
4. Check that exactly one Telegram message arrives with the same hash shown on `/verify`.

Telegram delivery must never be treated as execution proof. The Blockscout transaction and the
public wallet remain the source of truth.
