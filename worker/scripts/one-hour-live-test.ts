import dotenv from "dotenv";

dotenv.config({ path: ".env", override: false });

const PREFLIGHT_ONLY = process.env.ONE_HOUR_TEST_PREFLIGHT_ONLY === "true";
const WINDOW_MS = 60 * 60 * 1000;
const INTERVAL_MS = 11 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;
const MAX_TRADES = 6;

process.env.MAINNET_MODE = PREFLIGHT_ONLY ? "dry-run" : "live";
process.env.MAINNET_MAX_TRADE_USD_CENTS = "1";
process.env.MAINNET_MAX_PRICE_IMPACT_PERCENT = "10";
process.env.MAINNET_SLIPPAGE_PERCENT = "10";
process.env.MAINNET_MIN_SECONDS_BETWEEN_TRADES = "600";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitWithHeartbeat(until: number, windowEndsAt: number): Promise<void> {
  while (Date.now() < until && Date.now() < windowEndsAt) {
    const remaining = Math.min(until, windowEndsAt) - Date.now();
    await sleep(Math.min(HEARTBEAT_MS, Math.max(1, remaining)));
    console.log(
      JSON.stringify({
        event: "heartbeat",
        at: new Date().toISOString(),
        nextAttemptAt: new Date(Math.min(until, windowEndsAt)).toISOString(),
        windowEndsAt: new Date(windowEndsAt).toISOString(),
      }),
    );
  }
}

async function main(): Promise<void> {
  if (
    !PREFLIGHT_ONLY &&
    process.env.ONE_HOUR_TEST_CONFIRM !== "I_UNDERSTAND_SIX_REAL_TRADES"
  ) {
    throw new Error(
      "Set ONE_HOUR_TEST_CONFIRM=I_UNDERSTAND_SIX_REAL_TRADES for the monitored live window",
    );
  }

  const [
    {
      assertMainnetConfiguration,
      executeMainnetTrade,
      mainnetExplorerTxUrl,
    },
    { getQuoteSnapshot },
    { sendConfirmedTradeNotification },
  ] = await Promise.all([
    import("../src/mainnet"),
    import("../src/quotes"),
    import("../src/telegram"),
  ]);

  assertMainnetConfiguration();
  const startedAt = Date.now();
  const windowEndsAt = startedAt + WINDOW_MS;
  const windowId = new Date(startedAt).toISOString();
  let confirmed = 0;
  let attempted = 0;

  console.log(
    JSON.stringify({
      event: PREFLIGHT_ONLY ? "preflight-start" : "window-start",
      windowId,
      windowEndsAt: new Date(windowEndsAt).toISOString(),
      maximumTrades: PREFLIGHT_ONLY ? 1 : MAX_TRADES,
      usdPerTrade: 0.01,
      symbol: "AAPL",
      autonomousAgentDecision: false,
    }),
  );

  const iterations = PREFLIGHT_ONLY ? 1 : MAX_TRADES;
  for (let index = 0; index < iterations && Date.now() < windowEndsAt; index++) {
    if (index > 0) {
      const scheduledAt = startedAt + index * INTERVAL_MS;
      await waitWithHeartbeat(scheduledAt, windowEndsAt);
      if (Date.now() >= windowEndsAt) break;
    }

    attempted++;
    const snapshot = await getQuoteSnapshot();
    const stockPriceUsd = snapshot.prices.AAPL;
    if (!stockPriceUsd) throw new Error("AAPL reference price is unavailable");

    const result = await executeMainnetTrade({
      id: `${PREFLIGHT_ONLY ? "preflight" : "smoke-1h"}:${windowId}:${index + 1}:BUY:AAPL`,
      agentId: "system-test",
      action: "BUY",
      symbol: "AAPL",
      usdAmount: 0.01,
      stockPriceUsd,
      ethPriceUsd: snapshot.ethUsd,
      reasoning:
        "Controlled one-hour smoke test using a fixed one-cent AAPL route; not an autonomous agent decision.",
    });

    let telegramSent = false;
    if (!PREFLIGHT_ONLY && result.status === "confirmed" && result.txHash) {
      confirmed++;
      telegramSent = await sendConfirmedTradeNotification({
        agentName: `1h smoke test #${index + 1}`,
        action: "BUY",
        symbol: "AAPL",
        usdAmount: 0.01,
        referencePriceUsd: stockPriceUsd,
        txUrl: mainnetExplorerTxUrl(result.txHash),
      });
    }

    console.log(
      JSON.stringify({
        event: "attempt",
        attempt: index + 1,
        at: new Date().toISOString(),
        referenceStockPriceUsd: stockPriceUsd,
        referenceEthPriceUsd: snapshot.ethUsd,
        telegramSent,
        ...result,
      }),
    );

    if (PREFLIGHT_ONLY) {
      process.exit(result.status === "planned" ? 0 : 2);
    }
  }

  await waitWithHeartbeat(windowEndsAt, windowEndsAt);
  console.log(
    JSON.stringify({
      event: "window-complete",
      at: new Date().toISOString(),
      attempted,
      confirmed,
      maximumTrades: MAX_TRADES,
    }),
  );
  process.exit(0);
}

void main();
