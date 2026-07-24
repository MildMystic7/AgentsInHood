import "dotenv/config";
import { createServer } from "http";
import { AGENTS } from "./config";
import { getQuoteSnapshot } from "./quotes";
import { decide } from "./decide";
import { loadState, saveState } from "./state";
import { buy, sell } from "./portfolio";
import {
  assertMainnetConfiguration,
  executeMainnetTrade,
  getPublicMainnetStatus,
  mainnetExplorerTxUrl,
} from "./mainnet";
import { escapeHtml, sendTelegramMessage, telegramConfigured } from "./telegram";

// Five independent decision loops feed one serialized Robinhood Chain mainnet
// executor. Risk controls, not agent confidence, decide whether a transaction
// is allowed to leave the shared wallet.
const MIN_THINK_MS = 30 * 1000;
const MAX_THINK_MS = 3 * 60 * 1000;
const MIN_TRADE_USD = 0.01;
const MAX_TRADE_USD = 0.05;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomThinkMs(): number {
  return Math.floor(MIN_THINK_MS + Math.random() * (MAX_THINK_MS - MIN_THINK_MS));
}

function randomTradeUsd(): number {
  return Number((MIN_TRADE_USD + Math.random() * (MAX_TRADE_USD - MIN_TRADE_USD)).toFixed(2));
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
  const executedUsd =
    decision.action === "BUY"
      ? buy(state, decision.symbol, microUsd, price)
      : sell(state, decision.symbol, microUsd, price);

  if (executedUsd === null) {
    console.log(`[${agent.id}] skip — ${decision.action} ${decision.symbol} is not executable`);
    return;
  }

  const decisionId = `${agent.id}:${Date.now()}:${decision.action}:${decision.symbol}`;
  const execution = await executeMainnetTrade({
    id: decisionId,
    agentId: agent.id,
    action: decision.action,
    symbol: decision.symbol,
    usdAmount: executedUsd,
    stockPriceUsd: price,
    ethPriceUsd: snapshot.ethUsd,
    reasoning: decision.reasoning,
  });

  if (execution.status === "rejected" || execution.status === "failed") {
    console.log(
      `[${agent.id}] ${decision.action} ${decision.symbol} rejected — ${execution.reason || execution.status}`,
    );
    return;
  }

  // In live mode the local portfolio only moves after an on-chain confirmation.
  // Off/dry-run preserve the arena behaviour without pretending a tx exists.
  if (execution.mode === "live" && execution.status !== "confirmed") {
    console.log(
      `[${agent.id}] ${decision.action} ${decision.symbol} rejected on mainnet — ${execution.reason || execution.status}`,
    );
    return;
  }

  await saveState(agent.id, state);
  const executionLabel =
    execution.mode === "dry-run"
      ? "dry run"
      : execution.mode === "off"
        ? "arena only"
        : "mainnet confirmed";
  console.log(
    `[${agent.id}] ${decision.action} ${decision.symbol} $${executedUsd.toFixed(2)} — ${executionLabel} — ${decision.reasoning}${
      execution.txHash ? ` (tx ${execution.txHash})` : ""
    }`,
  );

  if (telegramConfigured()) {
    const emoji = decision.action === "BUY" ? "🟢" : "🔴";
    const lines = [
      `${emoji} <b>${escapeHtml(agent.name)}</b> — ${decision.action} ${escapeHtml(decision.symbol)}`,
      `$${executedUsd.toFixed(2)} @ $${price.toFixed(2)}`,
      `&#8220;${escapeHtml(decision.reasoning)}&#8221;`,
    ];
    if (execution.txHash) {
      lines.push(`⛓ <a href="${mainnetExplorerTxUrl(execution.txHash)}">Verify mainnet trade</a>`);
    } else {
      lines.push(`Mode: ${escapeHtml(executionLabel)}`);
    }
    await sendTelegramMessage(lines.join("\n"));
  }
}

async function runAgent(agent: (typeof AGENTS)[number]): Promise<void> {
  for (;;) {
    await sleep(randomThinkMs());
    try {
      await tick(agent);
    } catch (error) {
      console.error(`[${agent.id}] tick failed:`, (error as Error).message);
    }
  }
}

function startHealthServer(): void {
  const port = Number(process.env.PORT) || 3000;
  createServer(async (req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("cache-control", "no-store");

    if (req.url === "/mainnet/status") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(await getPublicMainnetStatus(), null, 2));
      return;
    }
    if (req.url === "/state") {
      const states = await Promise.all(
        AGENTS.map(async (agent) => ({
          id: agent.id,
          name: agent.name,
          ...(await loadState(agent.id)),
        })),
      );
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ agents: states }, null, 2));
      return;
    }
    res.end("AgentsInHood worker is running.\n");
  }).listen(port, () => console.log(`Health server listening on :${port}`));
}

async function main(): Promise<void> {
  assertMainnetConfiguration();
  const status = await getPublicMainnetStatus();
  console.log(`AgentsInHood worker starting — ${AGENTS.length} agents, one shared executor.`);
  console.log(
    "Telegram:",
    telegramConfigured() ? "configured" : "not configured (set TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)",
  );
  console.log(
    "Mainnet:",
    `${status.mode}, wallet ${status.walletAddress || "not configured"}, daily circuit breaker $${status.dailyBudgetUsd.toFixed(2)}`,
  );

  startHealthServer();

  AGENTS.forEach((agent, index) => {
    setTimeout(() => {
      void runAgent(agent);
    }, index * 3000);
  });
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
