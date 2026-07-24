import { NextResponse } from "next/server";
import { getHistoryResponse, getSummaryResponse, seasonAndHour } from "@/engine/engine";
import { kvConfigured, kvGet, kvSet } from "@/engine/kv";
import { escapeHtml, sendTelegramMessage, telegramConfigured } from "@/engine/telegram";
import { AGENTS } from "@/engine/config";
import type { Trade } from "@/engine/types";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Drip-feed design: new trades are enqueued as soon as they're detected, but at
// most ONE queued chunk is actually sent per invocation — gated by a randomized
// 1–10 minute cooldown stored in KV. However often this endpoint gets polled
// (every few seconds or every few minutes), Telegram only ever sees a slow,
// human-watchable trickle, never a burst of everything at once.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BACKLOG_HOURS = 24; // how far back we'll ever catch up in one go
const EVENTS_PER_CHUNK = 3; // trades grouped into one Telegram message
const MAX_QUEUE_LENGTH = 60; // self-heals instead of growing forever if something's stuck
const MIN_GAP_SECONDS = 60; // 1 minute
const MAX_GAP_SECONDS = 600; // 10 minutes
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
    `${t.value.toFixed(2)}% of baseline · reference $${t.price.toFixed(2)} · Hour ${t.hour} · Season ${season}`,
    `&#8220;${escapeHtml(t.reasoning)}&#8221;`,
  ].join("\n");
}

function randomGapMs(): number {
  return Math.floor(MIN_GAP_SECONDS + Math.random() * (MAX_GAP_SECONDS - MIN_GAP_SECONDS)) * 1000;
}

function parseQueue(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  const [storedSeason, storedHour, queueRaw, nextSendAtRaw] = await Promise.all([
    kvGet("notify:season"),
    kvGet("notify:hour"),
    kvGet("notify:queue"),
    kvGet("notify:nextSendAt"),
  ]);

  const hadPriorState = storedSeason !== null;
  const sameSeason = hadPriorState && Number(storedSeason) === season;
  const rawLastHour = sameSeason ? Number(storedHour ?? -1) : -1;
  const effectiveLastHour = Math.max(rawLastHour, hour - MAX_BACKLOG_HOURS);

  let queue = parseQueue(queueRaw);

  // ── Enqueue anything new since the last check ──────────────────────────────
  const [summary, history] = await Promise.all([getSummaryResponse(), getHistoryResponse()]);
  const agentName: Record<string, string> = {};
  for (const a of Object.values(summary.agentData)) agentName[a.id] = a.name;

  type Ev = { agentId: string; trade: Trade };

  // Collect each agent's new trades separately (oldest-first), dropping any that
  // repeat the same move+reasoning as that agent's previous kept trade — so a
  // hyperactive agent can't fill the feed with near-identical lines.
  const perAgent: Record<string, Ev[]> = {};
  for (const cfg of AGENTS) {
    const trades = history.agentHistory[cfg.id]?.trades ?? []; // newest-first
    const kept: Ev[] = [];
    let lastSig = "";
    for (let i = trades.length - 1; i >= 0; i--) {
      const t = trades[i];
      if (t.hour <= effectiveLastHour) continue;
      const sig = `${t.type}|${t.stock}|${t.reasoning}`;
      if (sig === lastSig) continue; // skip back-to-back duplicate from the same agent
      lastSig = sig;
      kept.push({ agentId: cfg.id, trade: t });
    }
    if (kept.length) perAgent[cfg.id] = kept;
  }

  // Round-robin merge across agents so consecutive events rotate between models,
  // instead of one talkative agent dominating an entire batch.
  const events: Ev[] = [];
  const lanes = AGENTS.map((a) => perAgent[a.id]).filter((l): l is Ev[] => !!l && l.length > 0);
  const cursors = lanes.map(() => 0);
  let remaining = lanes.reduce((n, l) => n + l.length, 0);
  while (remaining > 0) {
    for (let li = 0; li < lanes.length; li++) {
      if (cursors[li] < lanes[li].length) {
        events.push(lanes[li][cursors[li]]);
        cursors[li]++;
        remaining--;
      }
    }
  }

  if (hadPriorState && !sameSeason) {
    queue.push(`🚀 <b>New 24h cycle</b> — S${season} is live. Every strategy starts at index 100.00.`);
  }
  for (let i = 0; i < events.length; i += EVENTS_PER_CHUNK) {
    const chunk = events.slice(i, i + EVENTS_PER_CHUNK);
    queue.push(chunk.map((e) => formatEvent(agentName[e.agentId] ?? e.agentId, e.trade, season)).join("\n\n———\n\n"));
  }
  if (queue.length > MAX_QUEUE_LENGTH) queue = queue.slice(queue.length - MAX_QUEUE_LENGTH);

  // ── Send at most one queued chunk, gated by the random cooldown ────────────
  const now = Date.now();
  let nextSendAtMs = nextSendAtRaw ? Number(nextSendAtRaw) : 0;
  let sent = 0;

  if (queue.length > 0 && now >= nextSendAtMs) {
    const [msg, ...rest] = queue;
    const ok = await sendTelegramMessage(msg);
    if (ok) {
      queue = rest;
      sent = 1;
    }
    nextSendAtMs = now + randomGapMs(); // reschedule regardless, so a failure can't hammer Telegram in a loop
  }

  await Promise.all([
    kvSet("notify:season", String(season), MARKER_TTL_SECONDS),
    kvSet("notify:hour", String(hour), MARKER_TTL_SECONDS),
    kvSet("notify:queue", JSON.stringify(queue), MARKER_TTL_SECONDS),
    kvSet("notify:nextSendAt", String(nextSendAtMs), MARKER_TTL_SECONDS),
  ]);

  return NextResponse.json({
    ok: true,
    season,
    hour,
    newlyEnqueued: events.length,
    queueDepth: queue.length,
    sentThisRun: sent,
    nextSendInSeconds: Math.max(0, Math.round((nextSendAtMs - now) / 1000)),
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
