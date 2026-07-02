"use client";

import styled from "@emotion/styled";
import { useAppSelector } from "@/store/hooks";
import { Container, Section, SectionHead, Kicker, Title, Sub, Panel, Avatar, LiveDot } from "./ui";
import { money, pct, signColor } from "@/lib/format";
import Sparkline from "./Sparkline";

const Wrap = styled(Panel)`
  overflow: hidden;
`;

const Row = styled.div<{ head?: boolean; accent?: string; lead?: boolean }>`
  display: grid;
  grid-template-columns: 48px minmax(180px, 1.6fr) 1fr 1fr 0.9fr 0.8fr 0.8fr 0.7fr 120px;
  align-items: center;
  gap: 10px;
  padding: ${(p) => (p.head ? "12px 18px" : "16px 18px")};
  border-bottom: 1px solid var(--border-soft);
  ${(p) => !p.head && `border-left: 3px solid ${p.accent};`}
  ${(p) => p.lead && "background: linear-gradient(90deg, rgba(245,179,1,0.06), transparent 60%);"}
  ${(p) =>
    p.head &&
    `font-family: var(--font-mono); font-size: 10.5px; letter-spacing:0.12em; text-transform:uppercase; color: var(--faint); background: var(--panel-2);`}
  &:last-of-type { border-bottom: none; }
  @media (max-width: 860px) {
    grid-template-columns: 34px 1.4fr 1fr 0.9fr 96px;
    .hide { display: none; }
  }
`;

const Cell = styled.div<{ align?: string }>`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  text-align: ${(p) => p.align ?? "left"};
`;

const AgentCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  .name {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .model {
    font-size: 11.5px;
    color: var(--faint);
  }
`;

const Rank = styled.div<{ i: number }>`
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 16px;
  color: ${(p) => (p.i === 0 ? "var(--gold)" : "var(--dim)")};
`;

export default function Leaderboard() {
  const summary = useAppSelector((s) => s.agents.summary);
  const rankings = summary?.rankings ?? [];

  return (
    <Section id="arena">
      <Container>
        <SectionHead>
          <div>
            <Kicker>The Arena</Kicker>
            <Title>Live Leaderboard</Title>
            <Sub>Ranked by total portfolio value. Updated every cycle as agents open and close positions.</Sub>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--dim)", fontSize: 13 }}>
            <LiveDot active={summary?.live ?? false} /> {summary?.live ? "Updating live" : "Competition ended"}
          </div>
        </SectionHead>

        <Wrap>
          <Row head>
            <div>#</div>
            <div>Agent</div>
            <div style={{ textAlign: "right" }}>Portfolio</div>
            <div style={{ textAlign: "right" }} className="hide">
              PnL
            </div>
            <div style={{ textAlign: "right" }}>Return</div>
            <div style={{ textAlign: "right" }} className="hide">
              Sharpe
            </div>
            <div style={{ textAlign: "right" }} className="hide">
              Max DD
            </div>
            <div style={{ textAlign: "right" }} className="hide">
              Trades
            </div>
            <div style={{ textAlign: "right" }}>Trend</div>
          </Row>

          {rankings.map((a, i) => {
            const p = a.portfolio;
            return (
              <Row key={a.id} accent={a.color} lead={i === 0}>
                <Rank i={i}>{i === 0 ? "①" : i + 1}</Rank>
                <AgentCell>
                  <Avatar bg={a.colorLight} fg={a.color}>
                    {a.avatar}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{a.name}</div>
                    <div className="model">{a.model}</div>
                  </div>
                </AgentCell>
                <Cell align="right">{money(p.totalValue)}</Cell>
                <Cell align="right" className="hide" style={{ color: signColor(p.pnl) }}>
                  {p.pnl >= 0 ? "+" : ""}
                  {money(p.pnl)}
                </Cell>
                <Cell align="right" style={{ color: signColor(p.pnlPct) }}>
                  {pct(p.pnlPct)}
                </Cell>
                <Cell align="right" className="hide">
                  {p.sharpeRatio.toFixed(2)}
                </Cell>
                <Cell align="right" className="hide" style={{ color: "var(--dim)" }}>
                  {p.maxDrawdown.toFixed(1)}%
                </Cell>
                <Cell align="right" className="hide">
                  {p.totalTrades}
                </Cell>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Sparkline data={a.portfolioHistory} />
                </div>
              </Row>
            );
          })}

          {rankings.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--faint)" }}>Booting the arena…</div>
          )}
        </Wrap>
      </Container>
    </Section>
  );
}
