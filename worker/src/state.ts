import { kvGet, kvSet } from "./kv";
import { STARTING_CAPITAL } from "./config";
import type { PortfolioState } from "./decide";

function freshState(): PortfolioState {
  return { cash: STARTING_CAPITAL, holdings: {}, totalTrades: 0 };
}

export async function loadState(agentId: string): Promise<PortfolioState> {
  const raw = await kvGet(`worker:portfolio:${agentId}`);
  if (!raw) return freshState();
  try {
    const parsed = JSON.parse(raw) as Partial<PortfolioState>;
    return { cash: parsed.cash ?? STARTING_CAPITAL, holdings: parsed.holdings ?? {}, totalTrades: parsed.totalTrades ?? 0 };
  } catch {
    return freshState();
  }
}

export async function saveState(agentId: string, state: PortfolioState): Promise<void> {
  await kvSet(`worker:portfolio:${agentId}`, JSON.stringify(state));
}
