import { NextResponse } from "next/server";
import { getHistoryResponse, getSummaryResponse, seasonAndHour } from "@/engine/engine";
import { kvConfigured, kvGet, kvSet } from "@/engine/kv";
import { escapeHtml, sendTelegramMessages, telegramConfigured } from "@/engine/telegram";
import { AGENTS } from "@/engine/config";
import type { Trade } from "@/engine/types";

export const dynamic = "force-dynamic";

// How far back we're willing to catch up in one run. Bounds the worst case
// (arena rolled over a new season, or this endpoint wasn't polled for a while)
// so a single invocation never has to fire off hundreds of messages.
const MAX_BACKLOG_HOURS = 24;
const EVENTS_PER_MESSAGE = 5;
const MAX_MESSAGES_PER_RUN = 20;
const MARKER_TTL_SECONDS = 60 * 60 * 24 * 400; // ~400 days — effectively permanent

const EMOJI: Record<Trade["type"], string> = { BUY: "🟢", SELL: "🔴", SWAP: "🟡" };

function isAuthorized(req: Request): boolean {
  const expected = process.env.NOTIFY_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const provided = req.headers.get("x-notify-secret") ?? url.searchParams.get("secret");
  return provided === expected;
}

function formatEvent(agentName: string, t: Trade, season: number): string {
  const emoji = EMOJI[t.type];
  return [
    `${emoji} <b>${escapeHtml(agentName)}</b> — ${t.type} ${escapeHtml(t.stock)} <i>(${escapeHtml(t.stockName)})</i>`,
    `$${t.value.toFixed(2)} @ $${t.price.toFixed(2)} · Hour ${t.hour} · Season ${season}`,
    `&#8220;${escapeHtml(t.reasoning)}&#8221;`,
  ].join("\n");
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  if (!telegramConfigured()) {
    return NextResponse.json({ ok: false, reason: "telegram_not_configured" });
  }
  if (!kvConfigured()) {
    return NextResponse.json({ ok: false, reason: "kv_not_configured" });
  }

  const { season, hour } = seasonAndHour();
  const [storedSeason, storedHour] = await Promise.all([kvGet("notify:season"), kvGet("notify:hour")]);
  const hadPriorState = storedSeason !== null;
  const sameSeason = hadPriorState && Number(storedSeason) === season;
  const rawLastHour = sameSeason ? Number(storedHour ?? -1) : -1;
  const effectiveLastHour = Math.max(rawLastHour, hour - MAX_BACKLOG_HOURS);

  const [summary, history] = await Promise.all([getSummaryResponse(), getHistoryResponse()]);
  const agentName: Record<string, string> = {};
  for (const a of Object.values(summary.agentData)) agentName[a.id] = a.name;

  type Ev = { agentId: string; trade: Trade };
  const events: Ev[] = [];
  for (const cfg of AGENTS) {
    const trades = history.agentHistory[cfg.id]?.trades ?? []; // newest-first
    for (let i = trades.length - 1; i >= 0; i--) {
      const t = trades[i];
      if (t.hour > effectiveLastHour) events.push({ agentId: cfg.id, trade: t });
    }
  }
  events.sort((a, b) => a.trade.hour - b.trade.hour);

  const messages: string[] = [];
  if (hadPriorState && !sameSeason) {
    messages.push(`🚀 <b>New season</b> — S${season} is live. All agents reset to $1,000.`);
  }

  for (let i = 0; i < events.length; i += EVENTS_PER_MESSAGE) {
    const chunk = events.slice(i, i + EVENTS_PER_MESSAGE);
    messages.push(chunk.map((e) => formatEvent(agentName[e.agentId] ?? e.agentId, e.trade, season)).join("\n\n———\n\n"));
  }

  const toSend = messages.slice(0, MAX_MESSAGES_PER_RUN);
  const sent = toSend.length > 0 ? await sendTelegramMessages(toSend) : 0;

  await Promise.all([kvSet("notify:season", String(season), MARKER_TTL_SECONDS), kvSet("notify:hour", String(hour), MARKER_TTL_SECONDS)]);

  return NextResponse.json({
    ok: true,
    season,
    hour,
    events: events.length,
    messagesQueued: messages.length,
    messagesSent: sent,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
