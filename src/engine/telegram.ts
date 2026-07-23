// Minimal Telegram Bot API client. No SDK needed — one fetch call per message.
// Silently no-ops when unconfigured so nothing ever depends on it being set up.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function telegramConfigured(): boolean {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sends one message. Returns true on success. Never throws. */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sends several messages in order with a small delay to stay under Telegram's rate limit. */
export async function sendTelegramMessages(texts: string[], delayMs = 250): Promise<number> {
  let sent = 0;
  for (const text of texts) {
    const ok = await sendTelegramMessage(text);
    if (ok) sent += 1;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  return sent;
}
