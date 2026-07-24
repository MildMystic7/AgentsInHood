"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppSelector } from "@/store/hooks";
import { Container, Section, SectionHead, Kicker, Title, Sub, Panel } from "./ui";

const ChartWrap = styled(Panel)`
  padding: 20px 16px 8px;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 6px 4px;
  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: var(--dim);
    font-weight: 600;
  }
  i {
    width: 12px;
    height: 3px;
    border-radius: 2px;
    display: inline-block;
  }
`;

const TipBox = styled.div`
  background: var(--panel-3);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  .h {
    color: var(--faint);
    margin-bottom: 6px;
  }
  .r {
    display: flex;
    justify-content: space-between;
    gap: 18px;
  }
`;

export default function Trajectories() {
  const summary = useAppSelector((s) => s.agents.summary);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const agents = useMemo(() => (summary ? Object.values(summary.agentData) : []), [summary]);

  const data = useMemo(() => {
    if (!agents.length) return [];
    const maxLen = Math.max(...agents.map((a) => a.portfolioHistory.length));
    const rows: Record<string, number>[] = [];
    for (let h = 0; h < maxLen; h++) {
      const row: Record<string, number> = { hour: h };
      for (const a of agents) {
        const pt = a.portfolioHistory[h];
        if (pt) row[a.id] = pt.value;
      }
      rows.push(row);
    }
    return rows;
  }, [agents]);

  return (
    <Section id="trajectories">
      <Container>
        <SectionHead>
          <div>
            <Kicker>Trajectories</Kicker>
            <Title>Performance Index</Title>
            <Sub>Base 100 makes model performance comparable without implying that the benchmark book is real capital.</Sub>
          </div>
        </SectionHead>

        <ChartWrap>
          <Legend>
            {agents.map((a) => (
              <span key={a.id}>
                <i style={{ background: a.color }} /> {a.name}
              </span>
            ))}
          </Legend>
          <div style={{ width: "100%", height: 340 }}>
            {mounted && data.length > 1 && (
              <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="#20242c" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#626873", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={{ stroke: "#23272f" }}
                    tickFormatter={(h) => `H${h}`}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tick={{ fill: "#626873", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                    tickFormatter={(v) => Number(v).toFixed(0)}
                  />
                  <ReferenceLine y={summary?.competition.startingCapital ?? 100} stroke="#3a3f4a" strokeDasharray="4 4" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const sorted = [...payload].sort((a, b) => (b.value as number) - (a.value as number));
                      return (
                        <TipBox>
                          <div className="h">Hour {label}</div>
                          {sorted.map((p) => {
                            const a = agents.find((x) => x.id === p.dataKey);
                            return (
                              <div className="r" key={p.dataKey as string}>
                                <span style={{ color: a?.color }}>{a?.name}</span>
                                <span>{Number(p.value).toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </TipBox>
                      );
                    }}
                  />
                  {agents.map((a) => (
                    <Line
                      key={a.id}
                      type="monotone"
                      dataKey={a.id}
                      stroke={a.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartWrap>
      </Container>
    </Section>
  );
}
