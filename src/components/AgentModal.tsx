"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { AnimatePresence, motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeAgent } from "@/store/uiSlice";
import { Avatar, Pill } from "./ui";
import { pct, signColor } from "@/lib/format";

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(4, 5, 7, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 5vh 16px 40px;
`;

const Sheet = styled(motion.div)<{ accent: string }>`
  width: 100%;
  max-width: 720px;
  background: linear-gradient(180deg, var(--panel), var(--panel-2));
  border: 1px solid var(--border);
  border-top: 3px solid ${(p) => p.accent};
  border-radius: var(--radius);
  padding: 24px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  .name {
    font-weight: 800;
    font-size: 21px;
  }
  .model {
    color: var(--faint);
    font-size: 13px;
  }
`;

const Close = styled.button`
  margin-left: auto;
  background: var(--panel-3);
  color: var(--dim);
  border: 1px solid var(--border);
  border-radius: 9px;
  width: 34px;
  height: 34px;
  font-size: 16px;
  cursor: pointer;
  &:hover {
    color: var(--text);
  }
`;

const Tagline = styled.p`
  color: var(--dim);
  font-size: 13.5px;
  line-height: 1.5;
  margin: 12px 0 16px;
`;

const Grid6 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  .m {
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
  }
  .m .l {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--faint);
  }
  .m .v {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 700;
    margin-top: 3px;
  }
`;

const SubTitle = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 20px 0 10px;
`;

const HoldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-soft);
  &:last-of-type {
    border-bottom: none;
  }
  .sym {
    font-weight: 700;
    width: 62px;
  }
  .chain {
    color: var(--faint);
    font-size: 11px;
    width: 84px;
  }
  .amt {
    color: var(--dim);
    flex: 1;
  }
`;

const Reason = styled.div`
  border-left: 2px solid var(--border);
  padding: 8px 12px;
  margin-bottom: 10px;
  .t {
    font-size: 13.5px;
    line-height: 1.55;
  }
  .h {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--faint);
    margin-top: 4px;
  }
`;

const Verification = styled.a`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--faint);
  margin-top: 16px;
`;

export default function AgentModal() {
  const dispatch = useAppDispatch();
  const id = useAppSelector((s) => s.ui.selectedAgentId);
  const summary = useAppSelector((s) => s.agents.summary);
  const history = useAppSelector((s) => s.agents.history);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const agent = id && summary ? summary.agentData[id] : null;

  useEffect(() => {
    if (!agent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(closeAgent());
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [agent, dispatch]);

  const reasoning = useMemo(() => {
    if (!id || !history) return [];
    return (history.agentHistory[id]?.reasoningLogs ?? []).slice(0, 8);
  }, [id, history]);

  const chartData = useMemo(() => agent?.portfolioHistory ?? [], [agent]);
  const start = summary?.competition.startingCapital ?? 100;

  return (
    <AnimatePresence>
      {agent && (
        <Backdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => dispatch(closeAgent())}
          role="dialog"
          aria-modal="true"
          aria-label={`${agent.name} details`}
        >
          <Sheet
            accent={agent.color}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Head>
              <Avatar bg={agent.colorLight} fg={agent.color}>
                {agent.avatar}
              </Avatar>
              <div>
                <div className="name">{agent.name}</div>
                <div className="model">{agent.model}</div>
              </div>
              <Pill tone={agent.portfolio.pnlPct >= 0 ? "green" : "red"}>{pct(agent.portfolio.pnlPct)}</Pill>
              <Close onClick={() => dispatch(closeAgent())} aria-label="Close">
                ✕
              </Close>
            </Head>

            <Tagline>{agent.tagline}</Tagline>

            <Grid6>
              <div className="m">
                <div className="l">Arena Index</div>
                <div className="v">{agent.portfolio.totalValue.toFixed(2)}</div>
              </div>
              <div className="m">
                <div className="l">Return</div>
                <div className="v" style={{ color: signColor(agent.portfolio.pnlPct) }}>{pct(agent.portfolio.pnlPct)}</div>
              </div>
              <div className="m">
                <div className="l">Cash Weight</div>
                <div className="v">
                  {agent.portfolio.totalValue > 0
                    ? ((agent.portfolio.cash / agent.portfolio.totalValue) * 100).toFixed(1)
                    : "0.0"}%
                </div>
              </div>
              <div className="m">
                <div className="l">Sharpe</div>
                <div className="v">{agent.portfolio.sharpeRatio.toFixed(2)}</div>
              </div>
              <div className="m">
                <div className="l">Max DD</div>
                <div className="v">{agent.portfolio.maxDrawdown.toFixed(1)}%</div>
              </div>
              <div className="m">
                <div className="l">Decisions</div>
                <div className="v">{agent.portfolio.totalTrades}</div>
              </div>
            </Grid6>

            <SubTitle>Performance Index</SubTitle>
            <div style={{ width: "100%", height: 180 }}>
              {mounted && chartData.length > 1 && (
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#20242c" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: "#626873", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      tickLine={false}
                      axisLine={{ stroke: "#23272f" }}
                      tickFormatter={(h) => `H${h}`}
                      minTickGap={30}
                    />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tick={{ fill: "#626873", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v) => Number(v).toFixed(0)}
                    />
                    <ReferenceLine y={start} stroke="#3a3f4a" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="value" stroke={agent.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {agent.portfolio.holdings.length > 0 && (
              <>
                <SubTitle>Holdings</SubTitle>
                {agent.portfolio.holdings.map((h) => (
                  <HoldRow key={h.symbol}>
                    <span className="sym">{h.symbol}</span>
                    <span className="chain">{h.chain}</span>
                    <span className="amt">Benchmark weight</span>
                    <span style={{ fontWeight: 700 }}>
                      {agent.portfolio.totalValue > 0 ? ((h.value / agent.portfolio.totalValue) * 100).toFixed(1) : "0.0"}%
                    </span>
                    <span style={{ color: signColor(h.pnlPct), width: 72, textAlign: "right" }}>{pct(h.pnlPct)}</span>
                  </HoldRow>
                ))}
              </>
            )}

            {reasoning.length > 0 && (
              <>
                <SubTitle>Latest Reasoning</SubTitle>
                {reasoning.map((r, i) => (
                  <Reason key={`${r.timestamp}-${i}`}>
                    <div className="t">{r.text}</div>
                    <div className="h">
                      Hour {r.hour} · {r.trade}
                    </div>
                  </Reason>
                ))}
              </>
            )}

            <Verification href="/verify">Shared mainnet pilot · verify confirmed execution →</Verification>
          </Sheet>
        </Backdrop>
      )}
    </AnimatePresence>
  );
}
