import "dotenv/config"; // loads worker/.env locally; on Railway, env comes from the platform (no .env, harmless)
import { createServer } from "http";
import { AGENTS } from "./config";
import { getQuoteSnapshot } from "./quotes";
import { decide } from "./decide";
import { loadState, saveState } from "./state";
import { buy, sell } from "./portfolio";
import { explorerTxUrl, ledgerConfigured, logTradeOnChain } from "./ledger";
import { escapeHtml, sendTelegramMessage, telegramConfigured } from "./telegram";

// ─────────────────────────────────────────────────────────────────────────────
// AlphaHood worker: a persistent process (Railway), unlike the main site's
// stateless/serverless engine (Vercel). Each agent runs its own independent
// loop, "thinking" for a random 2-10 minutes between decisions — a real
// timer, not a simulated tick. Every executed trade is a penny-sized paper
// position AND, if configured, a permanent on-chain log entry on Base Sepolia
// testnet — verifiable, immutable, zero real financial risk.
// ─────────────────────────────────────────────────────────────────────────────

// Each agent acts on its own random 30s–3min interval — independent per agent,
// so the combined feed stays lively but every bet still gets its own beat.
const MIN_THINK_MS = 30 * 1000;
const MAX_THINK_MS = 3 * 60 * 1000;
const MIN_TRADE_USD = 0.01;
const MAX_TRADE_USD = 0.05;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function randomThinkMs(): number {
  return Math.floor(MIN_THINK_MS + Math.random() * (MAX_THINK_MS - MIN_THINK_MS));
}
function randomTradeUsd(): number {
  return Number((MIN_TRADE_USD + Math.random() * (MAX_TRADE_USD - MIN_TRADE_USD)).toFixed(4));
}

async function tick(agent: (typeof AGENTS)[number]): Promise<void> {
  const snapshot = await getQuoteSnapshot();
  const state = await loadState(agent.id);
  const decision = decide(agent, state, snapshot);

  if (decision.action === "HOLD" || !decision.symbol) {
    console.log(`[${agent.id}] HOLD — ${decision.reasoning}`);
    return;
  }

  const price = snapshot.prices[decision.symbol];
  if (!price) {
    console.log(`[${agent.id}] skip — no live price for ${decision.symbol}`);
    return;
  }

  const microUsd = randomTradeUsd();
  const executedUsd = decision.action === "BUY" ? buy(state, decision.symbol, microUsd, price) : sell(state, decision.symbol, microUsd, price);

  if (executedUsd === null) {
    console.log(`[${agent.id}] skip — ${decision.action} ${decision.symbol} not executable right now`);
    return;
  }

  await saveState(agent.id, state);

  const txHash = await logTradeOnChain(agent.id, decision.action, decision.symbol, executedUsd, decision.reasoning);
  console.log(`[${agent.id}] ${decision.action} ${decision.symbol} $${executedUsd.toFixed(4)} — ${decision.reasoning}${txHash ? ` (tx ${txHash})` : ""}`);

  if (telegramConfigured()) {
    const emoji = decision.action === "BUY" ? "🟢" : "🔴";
    const lines = [
      `${emoji} <b>${escapeHtml(agent.name)}</b> — ${decision.action} ${escapeHtml(decision.symbol)}`,
      `$${executedUsd.toFixed(4)} @ $${price.toFixed(2)}`,
      `&#8220;${escapeHtml(decision.reasoning)}&#8221;`,
    ];
    if (txHash) lines.push(`⛓ <a href="${explorerTxUrl(txHash)}">View on-chain</a>`);
    else if (ledgerConfigured()) lines.push(`⛓ on-chain log failed this time — see worker logs`);
    await sendTelegramMessage(lines.join("\n"));
  }
}

async function runAgent(agent: (typeof AGENTS)[number]): Promise<void> {
  for (;;) {
    await sleep(randomThinkMs());
    try {
      await tick(agent);
    } catch (err) {
      console.error(`[${agent.id}] tick failed:`, (err as Error).message);
    }
  }
}

function startHealthServer(): void {
  const port = Number(process.env.PORT) || 3000;
  createServer(async (req, res) => {
    if (req.url === "/state") {
      const states = await Promise.all(AGENTS.map(async (a) => ({ id: a.id, name: a.name, ...(await loadState(a.id)) })));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ agents: states }, null, 2));
      return;
    }
    res.end("AlphaHood worker is running.\n");
  }).listen(port, () => console.log(`Health server listening on :${port}`));
}

async function main(): Promise<void> {
  console.log(`AlphaHood worker starting — ${AGENTS.length} agents, each trading on a random 30s-3min interval.`);
  console.log("Telegram:", telegramConfigured() ? "configured" : "not configured (set TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)");
  console.log("On-chain ledger:", ledgerConfigured() ? "configured" : "not configured (set WORKER_PRIVATE_KEY / LEDGER_CONTRACT_ADDRESS)");

  startHealthServer();

  // Stagger start times a little so five agents don't hit Yahoo Finance in the same instant.
  AGENTS.forEach((agent, i) => {
    setTimeout(() => {
      void runAgent(agent);
    }, i * 3000);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
