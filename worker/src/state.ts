import { kvConfigured, kvGet, kvSet } from "./kv";
import { STARTING_CAPITAL } from "./config";
import type { PortfolioState } from "./decide";
import { scopedKey } from "./run-scope";

// In-process source of truth. KV (if configured) is a best-effort backup so
// portfolios survive restarts. The public arena can fall back to memory, but
// mainnet live mode separately requires persistent KV before it will start.
const memory = new Map<string, PortfolioState>();

function freshState(): PortfolioState {
  return { cash: STARTING_CAPITAL, holdings: {}, totalTrades: 0 };
}

function clone(s: PortfolioState): PortfolioState {
  return { cash: s.cash, holdings: JSON.parse(JSON.stringify(s.holdings)), totalTrades: s.totalTrades };
}

export async function loadState(agentId: string): Promise<PortfolioState> {
  const key = scopedKey(`worker:portfolio:${agentId}`);
  const cached = memory.get(key);
  if (cached) return clone(cached);

  if (kvConfigured()) {
    const raw = await kvGet(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<PortfolioState>;
        const state: PortfolioState = {
          cash: parsed.cash ?? STARTING_CAPITAL,
          holdings: parsed.holdings ?? {},
          totalTrades: parsed.totalTrades ?? 0,
        };
        memory.set(key, state);
        return clone(state);
      } catch {
        // fall through to fresh
      }
    }
  }

  const fresh = freshState();
  memory.set(key, fresh);
  return clone(fresh);
}

export async function saveState(agentId: string, state: PortfolioState): Promise<void> {
  const key = scopedKey(`worker:portfolio:${agentId}`);
  memory.set(key, clone(state));
  if (kvConfigured()) {
    await kvSet(key, JSON.stringify(state));
  }
}
