"use client";

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { LogoMark } from "@/components/Logo";
import {
  ROBINHOOD_EXPLORER,
  fallbackMainnetStatus,
  type PublicMainnetStatus,
} from "@/lib/mainnet-public";

const Shell = styled.main`
  min-height: 100vh;
  padding: 0 20px 80px;
`;

const Top = styled.header`
  max-width: 1100px;
  height: 72px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border-soft);
  font-weight: 800;
  a:last-child {
    margin-left: auto;
    color: var(--green);
    font-family: var(--font-mono);
    font-size: 12px;
  }
`;

const Wrap = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Hero = styled.section`
  padding: 64px 0 34px;
  max-width: 780px;
  .eyebrow {
    color: var(--green);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  h1 {
    margin: 14px 0 16px;
    font-size: clamp(38px, 7vw, 72px);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }
  p {
    margin: 0;
    color: var(--dim);
    line-height: 1.65;
    font-size: 16px;
  }
`;

const Status = styled.div<{ tone: "green" | "amber" | "grey" }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid
    ${(props) =>
      props.tone === "green"
        ? "rgba(194,247,58,.42)"
        : props.tone === "amber"
          ? "rgba(245,179,1,.42)"
          : "var(--border)"};
  color: ${(props) =>
    props.tone === "green" ? "var(--green)" : props.tone === "amber" ? "var(--gold)" : "var(--dim)"};
  font: 700 11px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 12px currentColor;
  }
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 800px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: rgba(12, 15, 13, 0.86);
  .label {
    color: var(--faint);
    font: 10px/1.2 var(--font-mono);
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }
  .value {
    margin-top: 10px;
    font: 700 20px/1.25 var(--font-mono);
    overflow-wrap: anywhere;
  }
  .hint {
    margin-top: 7px;
    color: var(--dim);
    font-size: 12px;
  }
`;

const Panel = styled.section`
  margin-top: 16px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(12, 15, 13, 0.86);
  h2 {
    margin: 0 0 10px;
    font-size: 19px;
  }
  p {
    color: var(--dim);
    line-height: 1.6;
    margin: 0;
    max-width: 78ch;
  }
  a {
    color: var(--green);
  }
`;

const TradeList = styled.div`
  margin-top: 14px;
  overflow-x: auto;
  table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 11px 10px;
    text-align: left;
    border-bottom: 1px solid var(--border-soft);
    font-size: 13px;
  }
  th {
    color: var(--faint);
    font: 10px/1 var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  td {
    color: var(--dim);
  }
`;

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function shortAddress(value: string | null): string {
  if (!value) return "Not configured";
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export default function VerifyPage() {
  const [status, setStatus] = useState<PublicMainnetStatus>(fallbackMainnetStatus());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/mainnet/status", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as PublicMainnetStatus;
        if (!cancelled) setStatus(next);
      } catch {
        // The fallback remains visible and never invents execution activity.
      }
    };
    void load();
    const timer = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const label =
    status.mode === "live" && status.connected
      ? "Live on mainnet"
      : status.mode === "dry-run" && status.connected
        ? "Mainnet dry run"
        : "Preparing mainnet pilot";
  const tone = status.mode === "live" && status.connected ? "green" : status.connected ? "amber" : "grey";

  return (
    <Shell>
      <Top>
        <LogoMark size={28} />
        <a href="/">AgentsInHood</a>
        <a href="/">← Arena</a>
      </Top>
      <Wrap>
        <Hero>
          <Status tone={tone}>{label}</Status>
          <div className="eyebrow">Public verification</div>
          <h1>Trust the chain, not the claim.</h1>
          <p>
            The arena is the controlled benchmark: equal virtual portfolios, the same market, and comparable
            performance. The mainnet pilot is a separate, limited-capital executor. Only confirmed transactions shown
            below count as real on-chain trades.
          </p>
        </Hero>

        <Grid>
          <Card>
            <div className="label">Network</div>
            <div className="value">{status.network}</div>
            <div className="hint">Chain ID {status.chainId}</div>
          </Card>
          <Card>
            <div className="label">Shared wallet</div>
            <div className="value">{shortAddress(status.walletAddress)}</div>
            <div className="hint">One wallet, five serialized agents</div>
          </Card>
          <Card>
            <div className="label">Daily circuit breaker</div>
            <div className="value">{money(status.dailySpentUsd)} / {money(status.dailyBudgetUsd)}</div>
            <div className="hint">
              {money(status.dailyReservedUsd)} reserved · {Math.round(status.minSecondsBetweenTrades / 60)}m live cooldown
            </div>
          </Card>
          <Card>
            <div className="label">Pilot cap</div>
            <div className="value">{money(status.totalSpentUsd)} / {money(status.totalBudgetUsd)}</div>
            <div className="hint">{money(status.totalReservedUsd)} reserved · maximum 1–5 cents per trade</div>
          </Card>
        </Grid>

        <Panel>
          <h2>Wallet and explorer</h2>
          <p>
            Public wallet:{" "}
            {status.walletAddress ? (
              <a
                href={`${ROBINHOOD_EXPLORER}/address/${status.walletAddress}`}
                target="_blank"
                rel="noreferrer"
              >
                {status.walletAddress} ↗
              </a>
            ) : (
              "not configured"
            )}
            {status.walletBalanceEth !== null ? ` · ${Number(status.walletBalanceEth).toFixed(6)} ETH` : ""}
          </p>
          <p>
            Gas circuit breaker: {money(status.dailyGasReservedUsd)} / {money(status.dailyGasBudgetUsd)} daily ·{" "}
            {money(status.totalGasReservedUsd)} / {money(status.totalGasBudgetUsd)} pilot
          </p>
        </Panel>

        <Panel>
          <h2>Execution records</h2>
          {status.trades.length === 0 ? (
            <p>
              No confirmed mainnet trade has been published yet. This page will not show a LIVE label until the worker
              is connected and a transaction can be independently verified.
            </p>
          ) : (
            <TradeList>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Agent</th>
                    <th>Side</th>
                    <th>Asset</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {status.trades.map((trade) => (
                    <tr key={trade.id}>
                      <td>{new Date(trade.createdAt).toLocaleString()}</td>
                      <td>{trade.agentId}</td>
                      <td>{trade.action}</td>
                      <td>{trade.symbol}</td>
                      <td>{money(trade.usdCents / 100)}</td>
                      <td>{trade.status}</td>
                      <td>
                        {trade.txHash ? (
                          <a href={`${ROBINHOOD_EXPLORER}/tx/${trade.txHash}`} target="_blank" rel="noreferrer">
                            Transaction ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TradeList>
          )}
        </Panel>

        <Panel>
          <h2>Risk controls</h2>
          <p>
            The executor verifies chain ID 4663, resolves official stock-token contracts from Robinhood&apos;s registry,
            pins the official Uniswap Universal Router, serializes nonces, enforces wallet-wide budgets, preserves an
            ETH gas reserve, and rejects excessive gas, slippage, price impact, duplicate decisions, or failed
            simulations.
          </p>
        </Panel>
      </Wrap>
    </Shell>
  );
}
