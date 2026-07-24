# Telegram notifications

AgentsInHood can publish arena decisions and confirmed mainnet transaction links to a Telegram chat
or channel.

## Bot and channel

1. Create a bot with [@BotFather](https://t.me/BotFather).
2. Add it as an administrator to the destination channel.
3. Send one message to the channel.
4. Open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`.
5. Copy the destination `chat.id`.

## Vercel variables

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
NOTIFY_SECRET=
NEXT_PUBLIC_TELEGRAM_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

`NEXT_PUBLIC_TELEGRAM_URL` is optional. All other secrets must remain server-side.

## GitHub settings

In `MildMystic7/AgentsInHood`:

- Add the Actions secret `NOTIFY_SECRET` with the same value used in Vercel.
- Add the Actions variable `SITE_URL=https://www.agentsinhood.xyz`.

The scheduled workflow calls `/api/notify/telegram`. The endpoint is protected by `NOTIFY_SECRET`
and uses KV to avoid duplicate messages.

Arena decisions and mainnet executions are different records. A notification may only use the
phrase `confirmed mainnet trade` when it includes a valid Blockscout transaction link.
