// Railway is the single Telegram publisher. Only confirmed mainnet executions
// with a public transaction link are eligible for notification.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function telegramConfigured(): boolean {
  return Boolean(BOT_TOKEN && CHAT_ID);
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendConfirmedTradeNotification(args: {
  agentName: string;
  action: "BUY" | "SELL";
  symbol: string;
  usdAmount: number;
  referencePriceUsd: number;
  txUrl: string;
}): Promise<boolean> {
  const lines = [
    "<b>[MAINNET CONFIRMED]</b>",
    `<b>${escapeHtml(args.agentName)}</b> — ${args.action} ${escapeHtml(args.symbol)}`,
    `Notional $${args.usdAmount.toFixed(2)} · reference $${args.referencePriceUsd.toFixed(2)}`,
    `<a href="${args.txUrl}">Verify on Robinhood Chain</a>`,
    "<i>Publisher: AgentsInHood Railway executor</i>",
  ];
  return sendTelegramMessage(lines.join("\n"));
}
