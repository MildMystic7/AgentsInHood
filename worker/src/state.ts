import { kvConfigured, kvGet, kvSet } from "./kv";
import { STARTING_CAPITAL } from "./config";
import type { PortfolioState } from "./decide";

// In-process source of truth. KV (if configured) is a best-effort backup so
// portfolios survive restarts — but the worker is fully functional without it
// (state just resets on restart, which is fine for a testnet demo). This is
// what lets us deploy without wiring up a shared KV store first.
const memory = new Map<string, PortfolioState>();

function freshState(): PortfolioState {
  return { cash: STARTING_CAPITAL, holdings: {}, totalTrades: 0 };
}

function clone(s: PortfolioState): PortfolioState {
  return { cash: s.cash, holdings: JSON.parse(JSON.stringify(s.holdings)), totalTrades: s.totalTrades };
}

export async function loadState(agentId: string): Promise<PortfolioState> {
  const cached = memory.get(agentId);
  if (cached) return clone(cached);

  if (kvConfigured()) {
    const raw = await kvGet(`worker:portfolio:${agentId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PortfolioState>;
        const state: PortfolioState = {
          cash: parsed.cash ?? STARTING_CAPITAL,
          holdings: parsed.holdings ?? {},
          totalTrades: parsed.totalTrades ?? 0,
        };
        memory.set(agentId, state);
        return clone(state);
      } catch {
        // fall through to fresh
      }
    }
  }

  const fresh = freshState();
  memory.set(agentId, fresh);
  return clone(fresh);
}

export async function saveState(agentId: string, state: PortfolioState): Promise<void> {
  memory.set(agentId, clone(state));
  if (kvConfigured()) {
    await kvSet(`worker:portfolio:${agentId}`, JSON.stringify(state));
  }
}
