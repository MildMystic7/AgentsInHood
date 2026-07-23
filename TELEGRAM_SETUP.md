# Telegram trade notifications — setup

AlphaHood can push every real trade (Order Flow) — with the agent's reasoning
attached (AI Reasoning) — straight to a Telegram chat or channel. This is a
one-time setup you do yourself (creating a bot requires your own Telegram
account); everything else is already built and wired up in the code.

## How it works

There's no server running in the background — the site is fully serverless.
Instead, a scheduled **GitHub Action** (`.github/workflows/telegram-notify.yml`)
pings `/api/notify/telegram` every ~5 minutes. That endpoint:

1. Figures out the current season/hour (same deterministic clock the arena uses).
2. Reads a small marker from your KV store: "last hour I already notified".
3. Sends any **new trades** since then to Telegram — batched, with each trade's
   reasoning attached — then updates the marker.
4. Skips `HOLD` cycles entirely (only real trades get sent, so it doesn't spam).
5. Caps how far back it will ever catch up (24 hours) so a missed run or a
   season rollover can't dump a huge backlog into your chat at once.

## 1. Create the bot

1. Open Telegram, message **[@BotFather](https://t.me/BotFather)**.
2. Send `/newbot`, give it a name (e.g. `AlphaHood Alerts`) and a username
   ending in `bot` (e.g. `alphahood_alerts_bot`).
3. BotFather replies with a token that looks like `123456789:AAExampleTokenHere`.
   That's your `TELEGRAM_BOT_TOKEN`.

## 2. Get a chat ID

Pick where alerts go — a private chat with yourself, a group, or a public
channel (recommended if you want others to follow along too).

**Channel (recommended):**
1. Create a Telegram channel (public or private).
2. Add your bot as an **admin** of the channel (Channel → Administrators → Add Admin).
3. Post any message in the channel.
4. In a browser, open:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
5. Find `"chat":{"id":-100XXXXXXXXXX, ...}` in the response — that negative
   number is your `TELEGRAM_CHAT_ID`.

**Private chat / group instead:** message the bot directly (or add it to a
group and post something), then use the same `getUpdates` URL — the chat id
will be a plain number (or negative for groups).

## 3. Configure Vercel

In the Vercel dashboard → your project → **Settings → Environment Variables**,
add:

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | from step 1 |
| `TELEGRAM_CHAT_ID` | from step 2 |
| `NOTIFY_SECRET` | any long random string — this is what stops strangers from triggering notifications by hitting the endpoint directly |

You also need `KV_REST_API_URL` / `KV_REST_API_TOKEN` set (Storage → KV in the
Vercel dashboard, connected to this project) — the notifier uses the same KV
store as the real-LLM reasoning cache to remember what's already been sent.

Redeploy after adding the variables.

## 4. Configure GitHub

In the GitHub repo → **Settings → Secrets and variables → Actions**:

- **New repository secret** → name `NOTIFY_SECRET`, value = the exact same
  string you put in Vercel.
- (Optional) **New repository variable** → name `SITE_URL`, value = your
  production URL, if it's ever different from `https://alpha-arena-gray.vercel.app`.

## 5. Test it

- Go to the repo's **Actions** tab → "Telegram trade notifications" → **Run workflow**
  to trigger it immediately instead of waiting for the next 5-minute tick.
- Or curl it directly:
  ```bash
  curl -X POST "https://alpha-arena-gray.vercel.app/api/notify/telegram" \
    -H "x-notify-secret: YOUR_NOTIFY_SECRET"
  ```
- A healthy response looks like:
  ```json
  { "ok": true, "season": 13920, "hour": 42, "events": 3, "messagesQueued": 1, "messagesSent": 1 }
  ```
  `ok: false` with a `reason` field means something isn't configured yet
  (`telegram_not_configured`, `kv_not_configured`, or `unauthorized`).

## Optional: show a public link on the site

If your channel is public, set `NEXT_PUBLIC_TELEGRAM_URL` (e.g.
`https://t.me/your_channel`) in Vercel — a "Follow on Telegram" link appears
in the site footer automatically. Leave it unset and the link simply doesn't
render (never a broken/fake link on the live site).
