"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import {
  Activity,
  ArrowUpRight,
  Check,
  Clock3,
  Code2,
  LockKeyhole,
  Radio,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import {
  DEFAULT_CHALLENGE_MANIFEST,
  challengeState,
  type ChallengeManifest,
  type ChallengeState,
} from "@/lib/challenge-public";
import {
  ROBINHOOD_EXPLORER,
  fallbackMainnetStatus,
  type PublicMainnetStatus,
  type PublicMainnetTrade,
} from "@/lib/mainnet-public";
import type { SummaryResponse } from "@/engine/types";

const AGENT_ORDER = ["gemini", "minimax", "gpt", "claude", "fable"];
const AGENT_FALLBACK = {
  gemini: { name: "Gemini 3.1 Pro", model: "Google", color: "#4285f4", avatar: "Ge" },
  minimax: { name: "MiniMax M2.5", model: "MiniMax", color: "#e5484d", avatar: "M" },
  gpt: { name: "GPT-5.4", model: "OpenAI", color: "#10a37f", avatar: "G" },
  claude: { name: "Claude Opus 4.8", model: "Anthropic", color: "#d97757", avatar: "C" },
  fable: { name: "Fable 5", model: "Independent", color: "#f5b301", avatar: "F5" },
} as const;

const Shell = styled.main`
  min-height: 100vh;
  padding: 0 20px 80px;
`;

const Top = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  max-width: 1180px;
  height: 66px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border-soft);
  background: rgba(6, 8, 7, 0.78);
  backdrop-filter: blur(14px);

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  nav {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 20px;
    a {
      color: var(--dim);
      font-size: 13px;
    }
    a:hover,
    a.active {
      color: var(--green);
    }
  }

  @media (max-width: 560px) {
    nav {
      gap: 13px;
    }
    nav a:first-of-type {
      display: none;
    }
  }
`;

const Wrap = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 48px;
  align-items: end;
  padding: 76px 0 44px;

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--green);
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.17em;
    text-transform: uppercase;
  }

  h1 {
    margin: 18px 0 20px;
    max-width: 760px;
    font-size: clamp(46px, 7.5vw, 88px);
    line-height: 0.94;
    letter-spacing: -0.055em;
    text-wrap: balance;
  }

  h1 span {
    color: var(--green);
  }

  p {
    max-width: 690px;
    margin: 0;
    color: var(--dim);
    font-size: clamp(15px, 1.7vw, 18px);
    line-height: 1.65;
  }

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-top: 52px;
  }
`;

const Clock = styled.div<{ state: ChallengeState }>`
  position: relative;
  min-height: 264px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid
    ${(props) =>
      props.state === "live" || props.state === "verified"
        ? "rgba(194,247,58,.52)"
        : "var(--border)"};
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 38%, rgba(194, 247, 58, 0.13), transparent 52%),
    rgba(12, 15, 13, 0.9);

  &::before {
    content: "";
    position: absolute;
    width: 210px;
    height: 210px;
    border: 1px solid rgba(194, 247, 58, 0.16);
    border-radius: 50%;
  }

  .inside {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: 34px 20px;
  }

  .state {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: ${(props) => (props.state === "preparing" ? "var(--gold)" : "var(--green)")};
    font: 700 10px/1 var(--font-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .time {
    margin-top: 18px;
    font: 700 clamp(29px, 5vw, 48px)/1 var(--font-mono);
    letter-spacing: -0.045em;
  }

  .caption {
    margin-top: 12px;
    color: var(--faint);
    font: 10px/1.4 var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
`;

const PhaseRail = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(12, 15, 13, 0.9);
  overflow: hidden;

  @media (max-width: 700px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Phase = styled.div<{ active: boolean; complete: boolean }>`
  min-width: 0;
  padding: 17px 18px;
  border-right: 1px solid var(--border);
  background: ${(props) =>
    props.active ? "rgba(194,247,58,.075)" : "transparent"};

  &:last-child {
    border-right: 0;
  }

  .n {
    color: ${(props) =>
      props.active || props.complete ? "var(--green)" : "var(--faint)"};
    font: 700 10px/1 var(--font-mono);
  }

  .t {
    margin-top: 8px;
    font-size: 13px;
    font-weight: 700;
  }

  .s {
    margin-top: 4px;
    color: var(--faint);
    font-size: 11px;
  }

  @media (max-width: 700px) {
    &:nth-of-type(2) {
      border-right: 0;
    }
    &:nth-of-type(-n + 2) {
      border-bottom: 1px solid var(--border);
    }
  }
`;

const MetricGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Metric = styled.div`
  min-width: 0;
  padding: 19px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: rgba(12, 15, 13, 0.86);

  .topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--faint);
  }

  .label {
    font: 10px/1.2 var(--font-mono);
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .value {
    margin-top: 12px;
    font: 700 22px/1.15 var(--font-mono);
    overflow-wrap: anywhere;
  }

  .hint {
    margin-top: 8px;
    color: var(--dim);
    font-size: 12px;
    line-height: 1.45;
  }
`;

const Section = styled.section`
  padding-top: 52px;

  .section-kicker {
    color: var(--green);
    font: 700 10px/1 var(--font-mono);
    letter-spacing: 0.17em;
    text-transform: uppercase;
  }

  .section-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin: 10px 0 20px;
  }

  h2 {
    margin: 0;
    font-size: clamp(27px, 4vw, 38px);
    letter-spacing: -0.035em;
  }

  .section-head p {
    max-width: 520px;
    margin: 0;
    color: var(--dim);
    font-size: 13px;
    line-height: 1.55;
    text-align: right;
  }

  @media (max-width: 650px) {
    .section-head {
      display: block;
    }
    .section-head p {
      margin-top: 10px;
      text-align: left;
    }
  }
`;

const ReadinessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Readiness = styled.div<{ ready: boolean }>`
  padding: 16px;
  border: 1px solid ${(props) => (props.ready ? "rgba(194,247,58,.3)" : "var(--border)")};
  border-radius: var(--radius-sm);
  background: ${(props) => (props.ready ? "rgba(194,247,58,.045)" : "rgba(12,15,13,.84)")};

  .icon {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    color: ${(props) => (props.ready ? "var(--green)" : "var(--faint)")};
    border: 1px solid currentColor;
    border-radius: 9px;
  }

  .title {
    margin-top: 13px;
    font-size: 13px;
    font-weight: 800;
  }

  .status {
    margin-top: 5px;
    color: ${(props) => (props.ready ? "var(--green)" : "var(--dim)")};
    font: 10px/1.4 var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`;

const AgentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 940px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const AgentCard = styled.div<{ accent: string }>`
  min-width: 0;
  padding: 17px;
  border: 1px solid var(--border);
  border-top: 2px solid ${(props) => props.accent};
  border-radius: var(--radius-sm);
  background: rgba(12, 15, 13, 0.88);

  .agent-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .avatar {
    width: 35px;
    height: 35px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    color: ${(props) => props.accent};
    border: 1px solid ${(props) => props.accent}66;
    border-radius: 9px;
    background: ${(props) => props.accent}18;
    font: 700 11px/1 var(--font-mono);
  }

  .name {
    overflow: hidden;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .model {
    margin-top: 2px;
    color: var(--faint);
    font-size: 10px;
  }

  .agent-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 17px;
  }

  .agent-stats span {
    display: block;
    color: var(--faint);
    font: 9px/1.3 var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .agent-stats b {
    display: block;
    margin-top: 5px;
    font: 700 15px/1 var(--font-mono);
  }

  .latest {
    min-height: 32px;
    margin-top: 15px;
    padding-top: 12px;
    border-top: 1px solid var(--border-soft);
    color: var(--dim);
    font-size: 11px;
    line-height: 1.45;
  }
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: 14px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(12, 15, 13, 0.88);

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0;
    font-size: 17px;
  }

  .badge {
    padding: 5px 8px;
    color: var(--faint);
    border: 1px solid var(--border);
    border-radius: 999px;
    font: 700 9px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .badge.locked {
    color: var(--green);
    border-color: rgba(194, 247, 58, 0.34);
  }
`;

const Ledger = styled.div`
  display: grid;
  gap: 7px;
`;

const LedgerRow = styled.div`
  display: grid;
  grid-template-columns: 92px minmax(110px, 1fr) 64px 64px 76px;
  gap: 10px;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-soft);
  color: var(--dim);
  font-size: 11px;

  &:last-child {
    border-bottom: 0;
  }

  .time,
  .side,
  .size {
    font-family: var(--font-mono);
  }

  .side.buy {
    color: var(--green);
  }

  .side.sell {
    color: var(--red);
  }

  a {
    color: var(--green);
  }

  @media (max-width: 560px) {
    grid-template-columns: 72px minmax(92px, 1fr) 52px 58px;
    .size {
      display: none;
    }
  }
`;

const Empty = styled.div`
  min-height: 184px;
  display: grid;
  place-items: center;
  padding: 28px;
  color: var(--dim);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  text-align: center;

  svg {
    display: block;
    margin: 0 auto 13px;
    color: var(--faint);
  }

  b {
    display: block;
    color: var(--text);
    margin-bottom: 6px;
  }

  span {
    display: block;
    max-width: 390px;
    font-size: 12px;
    line-height: 1.55;
  }
`;

const ManifestList = styled.dl`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 18px;
  margin: 0;

  div {
    min-width: 0;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-soft);
  }

  dt {
    color: var(--faint);
    font: 9px/1.2 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  dd {
    margin: 7px 0 0;
    overflow-wrap: anywhere;
    font-size: 12px;
    line-height: 1.45;
  }

  code {
    color: var(--green);
    font-family: var(--font-mono);
  }
`;

const ManifestHash = styled.div`
  margin-top: 16px;
  padding: 13px;
  color: var(--dim);
  border: 1px solid var(--border-soft);
  border-radius: 9px;
  background: rgba(6, 8, 7, 0.66);
  font: 10px/1.5 var(--font-mono);
  overflow-wrap: anywhere;

  span {
    display: block;
    margin-bottom: 5px;
    color: var(--faint);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const Foot = styled.footer`
  display: flex;
  justify-content: space-between;
  gap: 22px;
  margin-top: 56px;
  padding: 22px 0;
  color: var(--faint);
  border-top: 1px solid var(--border-soft);
  font-size: 11px;
  line-height: 1.5;

  a {
    color: var(--green);
  }

  @media (max-width: 600px) {
    display: block;
    div + div {
      margin-top: 10px;
    }
  }
`;

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function shortAddress(value: string | null): string {
  if (!value) return "Pending";
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function formatWindow(value: string | null): string {
  if (!value) return "Pending lock";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function clockValue(
  manifest: ChallengeManifest,
  state: ChallengeState,
  now: number,
): { value: string; caption: string } {
  if (state === "verified") return { value: "COMPLETE", caption: "Final ledger verified" };
  const target =
    state === "preparing" ? manifest.startAt : manifest.endAt;
  if (!target) return { value: "TIME PENDING", caption: "Start time publishes when rules lock" };
  const ms = Math.max(0, Date.parse(target) - now);
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    value: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    caption: state === "preparing" ? "Until the challenge begins" : "Until the 24H window closes",
  };
}

function stateLabel(state: ChallengeState): string {
  if (state === "live") return "Challenge live";
  if (state === "finalizing") return "Finalizing results";
  if (state === "verified") return "Run verified";
  return "Pre-launch control room";
}

function phaseIndex(state: ChallengeState): number {
  return { preparing: 0, live: 1, finalizing: 2, verified: 3 }[state];
}

function latestTrade(
  trades: PublicMainnetTrade[],
  agentId: string,
): PublicMainnetTrade | undefined {
  return trades.find((trade) => trade.agentId === agentId);
}

export default function ChallengePage() {
  const [manifest, setManifest] = useState<ChallengeManifest>(
    DEFAULT_CHALLENGE_MANIFEST,
  );
  const [mainnet, setMainnet] = useState<PublicMainnetStatus>(
    fallbackMainnetStatus(),
  );
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [manifestResponse, mainnetResponse, summaryResponse] =
        await Promise.all([
          fetch("/api/challenge", { cache: "no-store" }),
          fetch("/api/mainnet/status", { cache: "no-store" }),
          fetch("/api/agents/summary", { cache: "no-store" }),
        ]);
      if (manifestResponse.ok) {
        setManifest((await manifestResponse.json()) as ChallengeManifest);
      }
      if (mainnetResponse.ok) {
        setMainnet((await mainnetResponse.json()) as PublicMainnetStatus);
      }
      if (summaryResponse.ok) {
        setSummary((await summaryResponse.json()) as SummaryResponse);
      }
    } catch {
      // Safe local fallbacks stay visible without inventing live activity.
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = setInterval(load, 15_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, [load]);

  const state = challengeState(manifest, now);
  const clock = clockValue(manifest, state, now);
  const activePhase = phaseIndex(state);
  const challengeTrades = useMemo(() => {
    if (!manifest.startAt || !manifest.endAt) return [];
    const start = Date.parse(manifest.startAt);
    const end = Date.parse(manifest.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
    return mainnet.trades.filter((trade) => {
      const createdAt = Date.parse(trade.createdAt);
      return Number.isFinite(createdAt) && createdAt >= start && createdAt <= end;
    });
  }, [mainnet.trades, manifest.endAt, manifest.startAt]);
  const confirmed = useMemo(
    () =>
      challengeTrades.filter(
        (trade) => trade.status === "confirmed" && trade.txHash,
      ),
    [challengeTrades],
  );
  const confirmedNotional = confirmed.reduce(
    (total, trade) => total + trade.usdCents / 100,
    0,
  );
  const walletMatches =
    Boolean(manifest.walletAddress && mainnet.walletAddress) &&
    manifest.walletAddress!.toLowerCase() ===
      mainnet.walletAddress!.toLowerCase();
  const walletFunded =
    walletMatches &&
    Number(mainnet.walletBalanceEth || 0) > 0 &&
    Number(mainnet.walletBalanceUsdg || 0) > 0;
  const runtimeMatches =
    mainnet.chainId === 4663 &&
    mainnet.maxPriceImpactPercent ===
      manifest.rules.maxPriceImpactPercent &&
    mainnet.slippagePercent === manifest.rules.slippagePercent &&
    mainnet.minSecondsBetweenTrades === manifest.rules.cooldownSeconds;

  const phaseCopy = [
    ["01", "Preparing", "Wallet, rules, and public window"],
    ["02", "Live", "Five agents, one executor"],
    ["03", "Finalizing", "Close ledger and score the run"],
    ["04", "Verified", "Champion of Run 01"],
  ];

  return (
    <Shell>
      <Top>
        <a className="brand" href="/">
          <LogoMark size={29} />
          Agents<span style={{ color: "var(--green)" }}>InHood</span>
        </a>
        <nav aria-label="Challenge navigation">
          <a href="/">Arena</a>
          <a className="active" href="/challenge">Challenge</a>
          <a href="/predict">Challenge 02</a>
          <a href="/verify">Verify</a>
          <a href="/docs">Docs</a>
        </nav>
      </Top>

      <Wrap>
        <Hero>
          <div>
            <div className="eyebrow">
              <Radio size={14} />
              Phase 05 · 24H on-chain challenge
            </div>
            <h1>
              Five agents.
              <br />
              One wallet.
              <br />
              <span>24 hours.</span>
            </h1>
            <p>
              A public Robinhood Chain experiment under fixed risk limits.
              Follow every agent, every confirmed transaction, and every
              operational state from preparation to the verified final result.
            </p>
          </div>
          <Clock state={state}>
            <div className="inside">
              <div className="state">
                {state === "live" ? <Activity size={13} /> : <Clock3 size={13} />}
                {stateLabel(state)}
              </div>
              <div className="time">{clock.value}</div>
              <div className="caption">{clock.caption}</div>
            </div>
          </Clock>
        </Hero>

        <PhaseRail aria-label="Challenge lifecycle">
          {phaseCopy.map(([number, title, subtitle], index) => (
            <Phase
              key={number}
              active={activePhase === index}
              complete={activePhase > index}
            >
              <div className="n">
                {activePhase > index ? "✓" : number}
              </div>
              <div className="t">{title}</div>
              <div className="s">{subtitle}</div>
            </Phase>
          ))}
        </PhaseRail>

        <MetricGrid>
          <Metric>
            <div className="topline">
              <div className="label">Competitors</div>
              <Activity size={15} />
            </div>
            <div className="value">{manifest.rules.agents} agents</div>
            <div className="hint">Same market, clock, and base-100 starting point</div>
          </Metric>
          <Metric>
            <div className="topline">
              <div className="label">Execution</div>
              <WalletCards size={15} />
            </div>
            <div className="value">{shortAddress(manifest.walletAddress)}</div>
            <div className="hint">One serialized Robinhood Chain wallet</div>
          </Metric>
          <Metric>
            <div className="topline">
              <div className="label">Confirmed notional</div>
              <Check size={15} />
            </div>
            <div className="value">
              {money(confirmedNotional)} / {money(manifest.rules.grossNotionalCapUsd)}
            </div>
            <div className="hint">
              Only confirmed on-chain trades count
            </div>
          </Metric>
          <Metric>
            <div className="topline">
              <div className="label">Execution records</div>
              <ShieldCheck size={15} />
            </div>
            <div className="value">{confirmed.length}</div>
            <div className="hint">
              Public proof links available on the verification ledger
            </div>
          </Metric>
        </MetricGrid>

        <Section>
          <div className="section-kicker">Launch gates</div>
          <div className="section-head">
            <h2>Nothing goes live quietly.</h2>
            <p>
              Each gate is checked independently. A green state means the
              corresponding evidence is currently available.
            </p>
          </div>
          <ReadinessGrid>
            <Readiness ready={Boolean(manifest.commitSha)}>
              <div className="icon"><Code2 size={16} /></div>
              <div className="title">Code revision</div>
              <div className="status">
                {manifest.commitSha ? `Commit ${manifest.commitSha.slice(0, 7)}` : "Pending deployment proof"}
              </div>
            </Readiness>
            <Readiness ready={manifest.locked}>
              <div className="icon"><LockKeyhole size={16} /></div>
              <div className="title">Run manifest</div>
              <div className="status">
                {manifest.locked ? "Rules locked" : "Draft · start time pending"}
              </div>
            </Readiness>
            <Readiness ready={walletFunded}>
              <div className="icon"><WalletCards size={16} /></div>
              <div className="title">Challenge wallet</div>
              <div className="status">
                {walletFunded ? "ETH + USDG detected" : "Awaiting fresh-wallet funding"}
              </div>
            </Readiness>
            <Readiness ready={mainnet.connected && runtimeMatches && walletMatches}>
              <div className="icon"><ShieldCheck size={16} /></div>
              <div className="title">Execution controls</div>
              <div className="status">
                {mainnet.connected && runtimeMatches && walletMatches ? "Worker connected · wallet and limits match" : "Safely locked or disconnected"}
              </div>
            </Readiness>
          </ReadinessGrid>
        </Section>

        <Section>
          <div className="section-kicker">The field</div>
          <div className="section-head">
            <h2>Five strategies, measured together.</h2>
            <p>
              Arena performance remains normalized. This view counts only
              confirmed mainnet execution attributed to each agent.
            </p>
          </div>
          <AgentGrid>
            {AGENT_ORDER.map((id) => {
              const fallback = AGENT_FALLBACK[id as keyof typeof AGENT_FALLBACK];
              const agent = summary?.agentData[id];
              const trades = confirmed.filter((trade) => trade.agentId === id);
              const latest = latestTrade(challengeTrades, id);
              const notional = trades.reduce(
                (total, trade) => total + trade.usdCents / 100,
                0,
              );
              return (
                <AgentCard key={id} accent={agent?.color || fallback.color}>
                  <div className="agent-head">
                    <div className="avatar">{agent?.avatar || fallback.avatar}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{agent?.name || fallback.name}</div>
                      <div className="model">{agent?.model || fallback.model}</div>
                    </div>
                  </div>
                  <div className="agent-stats">
                    <div>
                      <span>Confirmed</span>
                      <b>{trades.length}</b>
                    </div>
                    <div>
                      <span>Notional</span>
                      <b>{money(notional)}</b>
                    </div>
                  </div>
                  <div className="latest">
                    {latest
                      ? `${latest.action} ${latest.symbol} · ${latest.status}`
                      : "Awaiting the first challenge decision."}
                  </div>
                </AgentCard>
              );
            })}
          </AgentGrid>
        </Section>

        <Section>
          <div className="section-kicker">Proof layer</div>
          <div className="section-head">
            <h2>The run, without the black box.</h2>
            <p>
              The ledger and manifest make the challenge inspectable while it
              happens and reproducible after it ends.
            </p>
          </div>
          <TwoCol>
            <Panel>
              <div className="panel-head">
                <h3>Latest confirmed execution</h3>
                <a className="badge locked" href="/verify">
                  Full ledger <ArrowUpRight size={10} />
                </a>
              </div>
              {confirmed.length === 0 ? (
                <Empty>
                  <div>
                    <Radio size={22} />
                    <b>No challenge transaction yet.</b>
                    <span>
                      Preparing and rejected activity never appears as a real
                      trade. The first row is published only after confirmation.
                    </span>
                  </div>
                </Empty>
              ) : (
                <Ledger>
                  {confirmed.slice(0, 7).map((trade) => (
                    <LedgerRow key={trade.id}>
                      <div className="time">
                        {new Date(trade.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div>{trade.agentId}</div>
                      <div className={`side ${trade.action.toLowerCase()}`}>
                        {trade.action}
                      </div>
                      <div>{trade.symbol}</div>
                      <div className="size">
                        <a
                          href={`${ROBINHOOD_EXPLORER}/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {money(trade.usdCents / 100)} ↗
                        </a>
                      </div>
                    </LedgerRow>
                  ))}
                </Ledger>
              )}
            </Panel>

            <Panel>
              <div className="panel-head">
                <h3>Run manifest</h3>
                <span className={`badge ${manifest.locked ? "locked" : ""}`}>
                  {manifest.locked ? "Locked" : "Draft"}
                </span>
              </div>
              <ManifestList>
                <div>
                  <dt>Run</dt>
                  <dd>{manifest.runId}</dd>
                </div>
                <div>
                  <dt>Code</dt>
                  <dd>
                    {manifest.commitSha ? (
                      <a
                        href={`https://github.com/MildMystic7/AgentsInHood/commit/${manifest.commitSha}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <code>{manifest.commitSha.slice(0, 12)}</code>
                      </a>
                    ) : "Pending"}
                  </dd>
                </div>
                <div>
                  <dt>Starts</dt>
                  <dd>{formatWindow(manifest.startAt)}</dd>
                </div>
                <div>
                  <dt>Ends</dt>
                  <dd>{formatWindow(manifest.endAt)}</dd>
                </div>
                <div>
                  <dt>Trade size</dt>
                  <dd>{money(manifest.rules.minTradeUsd)}–{money(manifest.rules.maxTradeUsd)}</dd>
                </div>
                <div>
                  <dt>Gross cap</dt>
                  <dd>{money(manifest.rules.grossNotionalCapUsd)}</dd>
                </div>
                <div>
                  <dt>Cooldown</dt>
                  <dd>{Math.round(manifest.rules.cooldownSeconds / 60)} minutes</dd>
                </div>
                <div>
                  <dt>Winner</dt>
                  <dd>{manifest.rules.scoring.join(" · ")}</dd>
                </div>
              </ManifestList>
              <ManifestHash>
                <span>SHA-256 manifest fingerprint</span>
                {manifest.manifestHash || "Generated when the deployed revision is available"}
              </ManifestHash>
            </Panel>
          </TwoCol>
        </Section>

        <Foot>
          <div>
            AgentsInHood is an independent research and entertainment project.
            Not affiliated with Robinhood Markets, Inc. Not financial advice.
          </div>
          <div>
            <a href="/verify">Verify execution</a> ·{" "}
            <a href="/predict">Challenge 02 testnet</a> ·{" "}
            <a href="https://github.com/MildMystic7/AgentsInHood" target="_blank" rel="noreferrer">
              Source code
            </a>
          </div>
        </Foot>
      </Wrap>
    </Shell>
  );
}
