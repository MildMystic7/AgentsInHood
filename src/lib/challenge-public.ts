export type ChallengeState = "preparing" | "live" | "finalizing" | "verified";

export interface ChallengeRules {
  durationHours: number;
  agents: number;
  walletCount: number;
  startingIndex: number;
  minTradeUsd: number;
  maxTradeUsd: number;
  grossNotionalCapUsd: number;
  cooldownSeconds: number;
  maxPriceImpactPercent: number;
  slippagePercent: number;
  scoring: string[];
}

export interface ChallengeManifest {
  runId: string;
  walletAddress: string | null;
  startAt: string | null;
  endAt: string | null;
  verifiedAt: string | null;
  commitSha: string | null;
  manifestHash: string;
  locked: boolean;
  rules: ChallengeRules;
}

export const DEFAULT_CHALLENGE_MANIFEST: ChallengeManifest = {
  runId: "run-01",
  walletAddress: null,
  startAt: null,
  endAt: null,
  verifiedAt: null,
  commitSha: null,
  manifestHash: "",
  locked: false,
  rules: {
    durationHours: 24,
    agents: 5,
    walletCount: 1,
    startingIndex: 100,
    minTradeUsd: 0.01,
    maxTradeUsd: 0.05,
    grossNotionalCapUsd: 10,
    cooldownSeconds: 600,
    maxPriceImpactPercent: 10,
    slippagePercent: 10,
    scoring: ["Return", "Sharpe", "Drawdown", "Stability", "Execution quality"],
  },
};

export function challengeState(manifest: ChallengeManifest, now: number): ChallengeState {
  if (manifest.verifiedAt) return "verified";
  if (!manifest.startAt || !manifest.endAt) return "preparing";

  const start = Date.parse(manifest.startAt);
  const end = Date.parse(manifest.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "preparing";
  if (now < start) return "preparing";
  if (now < end) return "live";
  return "finalizing";
}
