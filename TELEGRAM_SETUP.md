# Telegram trade notifications — setup

AlphaHood can push every real trade (Order Flow) — with the agent's reasoning
attached (AI Reasoning) — straight to a Telegram chat or channel. This is a
one-time setup you do yourself (creating a bot requires your own Telegram
account); everything else is already built and wired up in the code.

## How it works

There's no server running in the background — the site is fully serverless.
Instead, a scheduled **GitHub Action** (`.github/workflows/telegram-notify.yml`)
pings `/api/notify/telegram` every ~5 minutes (GitHub's practical floor for free
scheduled workflows — see the note below). That endpoint:

1. Figures out the current season/hour (same deterministic clock the arena uses).
2. Reads a small **queue** from your KV store — trades detected but not yet sent.
3. Adds any new trades since the last check to the queue (grouped in chunks of 3,
   each with the agent's own reasoning attached). Skips `HOLD` cycles entirely —
   only real trades get queued, so it never spams.
4. Sends **at most one queued chunk** per invocation — gated by a random
   1–10 minute cooldown stored in KV. However often this endpoint gets pinged,
   Telegram only ever sees a slow, human-watchable trickle — never a burst of
   everything at once.
5. Caps how far back it will ever catch up (24 hours of simulated time, and a
   maximum queue depth) so a missed run or a season rollover can't flood your
   chat — it just drains a bit slower until it's caught up.

> **On the 1–10 minute pacing:** GitHub's free scheduled workflows have a
> documented floor of ~5 minutes between runs (and can occasionally run later
> under load). That means the *fastest* this can realistically deliver a
> message is roughly every 5 minutes, even though the code's cooldown allows
> as little as 1. If you want the full 1–10 minute range in practice, add a
> free external minute-level cron (e.g. [cron-job.org](https://cron-job.org))
> pinging the same URL every minute — the drip logic already handles being
> polled that often correctly, it just needs a caller that shows up that often.
> The GitHub Action works fine on its own if ~5–15 minute pacing is close enough.

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
  { "ok": true, "season": 13920, "hour": 42, "newlyEnqueued": 3, "queueDepth": 2, "sentThisRun": 1, "nextSendInSeconds": 347 }
  ```
  `newlyEnqueued` is how many new trades were just added to the queue this run,
  `queueDepth` is how many chunks are still waiting, `sentThisRun` is 0 or 1
  (this endpoint only ever sends one message per call), and `nextSendInSeconds`
  is the randomized cooldown before another message is allowed out.

  `ok: false` with a `reason` field means something isn't configured yet
  (`telegram_not_configured`, `kv_not_configured`, or `unauthorized`).

## Optional: show a public link on the site

If your channel is public, set `NEXT_PUBLIC_TELEGRAM_URL` (e.g.
`https://t.me/your_channel`) in Vercel — a "Follow on Telegram" link appears
in the site footer automatically. Leave it unset and the link simply doesn't
render (never a broken/fake link on the live site).
