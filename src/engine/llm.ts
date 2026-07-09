import type { AgentConfig, Decision, TradeType } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Provider-agnostic "brain" for each agent.
//
// We call REAL LLMs over plain server-side `fetch` (one uniform code path for
// four providers). When a provider key is absent — or ARENA_FORCE_MOCK=true, or
// any call errors — we fall back to a high-quality built-in reasoning generator
// so a live demo NEVER stalls waiting on an API.
// ─────────────────────────────────────────────────────────────────────────────

export interface DecisionContext {
  hour: number;
  cashUSDC: number;
  totalValue: number;
  holdings: { symbol: string; tokens: number; value: number }[];
  prices: Record<string, number>;
  /** Recent % change per token over the last few hours (momentum signal). */
  momentum: Record<string, number>;
  tradable: { symbol: string; chain: string }[];
}

const FORCE_MOCK = String(process.env.ARENA_FORCE_MOCK ?? "false") === "true";

const MODELS = {
  anthropic: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
  openai: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  google: process.env.GOOGLE_MODEL ?? "gemini-1.5-flash",
  minimax: process.env.MINIMAX_MODEL ?? "abab6.5s-chat",
};

function keyFor(provider: AgentConfig["provider"]): string | undefined {
  switch (provider) {
    case "anthropic": return process.env.ANTHROPIC_API_KEY;
    case "openai": return process.env.OPENAI_API_KEY;
    case "google": return process.env.GOOGLE_API_KEY;
    case "minimax": return process.env.MINIMAX_API_KEY;
  }
}

function systemPrompt(agent: AgentConfig): string {
  return [
    `You are ${agent.name}, an autonomous crypto trading agent in a live competition.`,
    agent.persona,
    `You manage a real paper-trading portfolio. Every hour you make ONE decision.`,
    `Respond with STRICT JSON only, no prose, matching:`,
    `{"action":"BUY|SELL|SWAP|HOLD","symbol":"<token symbol or empty>","usdAmount":<number>,"reasoning":"<one or two sentences>"}`,
    `Rules: usdAmount must be <= available cash for BUY. Keep reasoning specific (mention the token and why). Prefer decisive, in-character moves.`,
  ].join(" ");
}

function userPrompt(ctx: DecisionContext): string {
  const holdings = ctx.holdings.length
    ? ctx.holdings.map((h) => `${h.symbol}: ${h.tokens.toFixed(4)} ($${h.value.toFixed(2)})`).join(", ")
    : "none";
  const market = ctx.tradable
    .map((t) => `${t.symbol} $${(ctx.prices[t.symbol] ?? 0).toPrecision(4)} (${(ctx.momentum[t.symbol] ?? 0) >= 0 ? "+" : ""}${(ctx.momentum[t.symbol] ?? 0).toFixed(2)}% recent)`)
    .join("\n");
  return [
    `Hour ${ctx.hour}. Portfolio value $${ctx.totalValue.toFixed(2)}, cash (USDC) $${ctx.cashUSDC.toFixed(2)}.`,
    `Current holdings: ${holdings}.`,
    `Market:\n${market}`,
    `Make your move for this hour.`,
  ].join("\n");
}

// ── Real providers ───────────────────────────────────────────────────────────

async function callAnthropic(agent: AgentConfig, ctx: DecisionContext, key: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: agent.llmModel ?? MODELS.anthropic,
      max_tokens: 400,
      system: systemPrompt(agent),
      messages: [{ role: "user", content: userPrompt(ctx) }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  const block = (data.content ?? []).find((b: any) => b.type === "text");
  return block?.text ?? "";
}

async function callOpenAICompatible(url: string, model: string, agent: AgentConfig, ctx: DecisionContext, key: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt(agent) },
        { role: "user", content: userPrompt(ctx) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`${model} ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGoogle(agent: AgentConfig, ctx: DecisionContext, key: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.google}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(agent) }] },
      contents: [{ role: "user", parts: [{ text: userPrompt(ctx) }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 400 },
    }),
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseDecision(text: string): Decision | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]);
    const action = String(raw.action ?? "HOLD").toUpperCase() as Decision["action"];
    return {
      action: ["BUY", "SELL", "SWAP", "HOLD"].includes(action) ? action : "HOLD",
      symbol: raw.symbol ? String(raw.symbol).toUpperCase() : undefined,
      usdAmount: Number(raw.usdAmount) || 0,
      reasoning: String(raw.reasoning ?? "").slice(0, 400) || "No rationale provided.",
    };
  } catch {
    return null;
  }
}

/** Main entry: get one decision for an agent. Real LLM if possible, else mock. */
export async function decide(agent: AgentConfig, ctx: DecisionContext): Promise<Decision> {
  const key = keyFor(agent.provider);
  if (FORCE_MOCK || !key) return mockDecide(agent, ctx);
  try {
    let text = "";
    if (agent.provider === "anthropic") text = await callAnthropic(agent, ctx, key);
    else if (agent.provider === "openai") text = await callOpenAICompatible("https://api.openai.com/v1/chat/completions", MODELS.openai, agent, ctx, key);
    else if (agent.provider === "google") text = await callGoogle(agent, ctx, key);
    else if (agent.provider === "minimax") {
      const base = process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1/text/chatcompletion_v2";
      text = await callOpenAICompatible(base, MODELS.minimax, agent, ctx, key);
    }
    return parseDecision(text) ?? mockDecide(agent, ctx);
  } catch {
    // Never let a live demo break on an API hiccup.
    return mockDecide(agent, ctx);
  }
}

// ── Built-in reasoning generator (deterministic-ish, persona-driven) ─────────

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

/**
 * Produces varied, realistic reasoning + a trade in each agent's character.
 * Uses the live momentum signal so the narrative tracks the market. Accepts an
 * RNG so the whole simulation can be replayed deterministically (serverless-safe).
 */
export function mockDecide(agent: AgentConfig, ctx: DecisionContext, rand: () => number = Math.random): Decision {
  const r = rand();
  const ranked = [...ctx.tradable].sort((a, b) => (ctx.momentum[b.symbol] ?? 0) - (ctx.momentum[a.symbol] ?? 0));
  const hottest = ranked[0];
  const coldest = ranked[ranked.length - 1];
  const memecoins = ctx.tradable.filter((t) => ["DOGE", "SHIB", "PEPE", "BONK", "WIF", "PENGU"].includes(t.symbol));
  const heldSymbols = new Set(ctx.holdings.map((h) => h.symbol));
  const cash = ctx.cashUSDC;

  const mom = (s: string) => (ctx.momentum[s] ?? 0);
  const fmt = (s: string) => `${mom(s) >= 0 ? "+" : ""}${mom(s).toFixed(2)}%`;

  switch (agent.id) {
    case "fable": {
      // Strategic mastermind: expected-value blend of momentum and mean reversion,
      // conviction-based sizing, methodical profit-taking and risk control.
      const bigWinner = ctx.holdings.find((h) => mom(h.symbol) > 2.5 && h.value > ctx.totalValue * 0.15);
      if (bigWinner && r > 0.45) {
        return { action: "SELL", symbol: bigWinner.symbol, usdAmount: round(bigWinner.value * 0.4), reasoning: `${bigWinner.symbol} extended ${fmt(bigWinner.symbol)} above my fair-value band; banking 40% of the position and letting the rest ride with a trailed thesis. Expected value says take the certain gain.` };
      }
      if (cash > 80 && mom(coldest.symbol) < -1.8 && r > 0.55) {
        const size = Math.min(cash * 0.3, cash);
        return { action: "BUY", symbol: coldest.symbol, usdAmount: round(size), reasoning: `${coldest.symbol} at ${fmt(coldest.symbol)} is a statistical overreaction on ${coldest.chain} — mean reversion favours entry here. Sizing at 30% of cash; asymmetric risk/reward, defined downside.` };
      }
      if (cash > 60 && mom(hottest.symbol) > 0.8 && r > 0.3) {
        const size = Math.min(cash * (0.25 + r * 0.2), cash);
        return { action: "BUY", symbol: hottest.symbol, usdAmount: round(size), reasoning: `Momentum in ${hottest.symbol} (${fmt(hottest.symbol)}) is confirmed across my lookback window, not noise. Joining the trend with conviction sizing — the logic checks out three moves ahead.` };
      }
      const laggard = ctx.holdings.find((h) => mom(h.symbol) < -1.2 && h.value > 20);
      if (laggard && r > 0.6) {
        return { action: "SELL", symbol: laggard.symbol, usdAmount: round(laggard.value), reasoning: `${laggard.symbol} thesis invalidated (${fmt(laggard.symbol)}); a superior mind changes course the moment the evidence does. Recycling capital to higher expected value.` };
      }
      return { action: "HOLD", usdAmount: 0, reasoning: `No edge above my threshold this hour. The best trade is often the one you don't make — patience is a position too.` };
    }
    case "gpt": {
      // Momentum executor: chase strength, cut laggards.
      if (cash > 60 && mom(hottest.symbol) > 0.3) {
        const size = Math.min(cash * (0.3 + r * 0.3), cash);
        return { action: "BUY", symbol: hottest.symbol, usdAmount: round(size), reasoning: `${hottest.symbol} is leading the tape at ${fmt(hottest.symbol)} on ${hottest.chain}; deploying into strength and riding the momentum.` };
      }
      const loser = ctx.holdings.find((h) => mom(h.symbol) < -0.5);
      if (loser) return { action: "SELL", symbol: loser.symbol, usdAmount: round(loser.value), reasoning: `${loser.symbol} rolled over (${fmt(loser.symbol)}); cutting the loser fast to protect capital and keep dry powder.` };
      return { action: "HOLD", usdAmount: 0, reasoning: `No clean momentum setup this hour — staying patient rather than forcing a marginal trade.` };
    }
    case "claude": {
      // Patient value: buy the dip sparingly, otherwise hold cash.
      if (cash > 100 && mom(coldest.symbol) < -1 && r > 0.5) {
        const size = Math.min(cash * 0.2, cash);
        return { action: "BUY", symbol: coldest.symbol, usdAmount: round(size), reasoning: `${coldest.symbol} is oversold at ${fmt(coldest.symbol)}; scaling in a small tranche on ${coldest.chain} with conviction, keeping the rest in reserve.` };
      }
      const winner = ctx.holdings.find((h) => mom(h.symbol) > 2);
      if (winner && r > 0.6) return { action: "SELL", symbol: winner.symbol, usdAmount: round(winner.value * 0.5), reasoning: `Taking partial profit on ${winner.symbol} (${fmt(winner.symbol)}) — banking the gain and staying disciplined.` };
      return { action: "HOLD", usdAmount: 0, reasoning: `Thesis unchanged and nothing mispriced enough to act on. Holding cash beats a forced trade.` };
    }
    case "gemini": {
      // Balanced quant: diversify, rebalance.
      const underexposed = ctx.tradable.find((t) => !heldSymbols.has(t.symbol) && mom(t.symbol) > 0);
      if (cash > 80 && underexposed && r > 0.35) {
        const size = Math.min(cash * 0.25, cash);
        return { action: "BUY", symbol: underexposed.symbol, usdAmount: round(size), reasoning: `Adding ${underexposed.symbol} on ${underexposed.chain} (${fmt(underexposed.symbol)}) to diversify across chains and improve the risk-adjusted profile.` };
      }
      const overweight = [...ctx.holdings].sort((a, b) => b.value - a.value)[0];
      if (overweight && overweight.value > ctx.totalValue * 0.4) return { action: "SELL", symbol: overweight.symbol, usdAmount: round(overweight.value * 0.3), reasoning: `${overweight.symbol} is now oversized in the book; trimming to manage concentration and cap drawdown.` };
      return { action: "HOLD", usdAmount: 0, reasoning: `Portfolio is balanced and correlations look fine — no rebalance needed this cycle.` };
    }
    case "minimax":
    default: {
      // Degen scalper: hyperactive, loves memecoins.
      if (cash > 40 && r > 0.25) {
        const target = memecoins.length && r > 0.4 ? pick(memecoins, r) : hottest;
        const size = Math.min(cash * (0.4 + r * 0.4), cash);
        return { action: "BUY", symbol: target.symbol, usdAmount: round(size), reasoning: `Sending it into ${target.symbol} (${fmt(target.symbol)}) on ${target.chain} — volatility is the opportunity, aping the momentum before it runs.` };
      }
      if (ctx.holdings.length && r < 0.4) {
        const flip = pick(ctx.holdings, r);
        return { action: "SELL", symbol: flip.symbol, usdAmount: round(flip.value), reasoning: `Flipping ${flip.symbol} (${fmt(flip.symbol)}) to rotate into the next mover — no diamond hands here.` };
      }
      return { action: "HOLD", usdAmount: 0, reasoning: `Reloading — waiting for the next volatility spike to pounce.` };
    }
  }
}

function round(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100);
}
