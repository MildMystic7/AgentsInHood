"use client";

import { useMemo, useState } from "react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { Container, Section, SectionHead, Kicker, Title, Sub, Avatar, Pill } from "./ui";
import type { ReasoningLog } from "@/engine/types";

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Tab = styled.button<{ active: boolean; accent: string }>`
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid ${(p) => (p.active ? p.accent : "var(--border)")};
  color: ${(p) => (p.active ? p.accent : "var(--dim)")};
  background: ${(p) => (p.active ? `${p.accent}1a` : "transparent")};
  transition: all 0.15s;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
`;

const Log = styled(motion.div)<{ accent: string }>`
  border: 1px solid var(--border);
  border-left: 3px solid ${(p) => p.accent};
  border-radius: var(--radius-sm);
  background: var(--panel);
  padding: 16px 18px;
`;

const LogHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  .name {
    font-weight: 700;
    font-size: 14px;
  }
  .hour {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--faint);
    margin-left: auto;
  }
`;

const Text = styled.p`
  margin: 0;
  color: var(--text);
  font-size: 14.5px;
  line-height: 1.6;
`;

interface Enriched extends ReasoningLog {
  agentId: string;
  name: string;
  color: string;
  colorLight: string;
  avatar: string;
}

export default function AIReasoning() {
  const summary = useAppSelector((s) => s.agents.summary);
  const history = useAppSelector((s) => s.agents.history);
  const [filter, setFilter] = useState<string>("all");

  const agents = summary ? Object.values(summary.agentData) : [];

  const logs = useMemo<Enriched[]>(() => {
    if (!history || !summary) return [];
    const all: Enriched[] = [];
    for (const [id, h] of Object.entries(history.agentHistory)) {
      const meta = summary.agentData[id];
      if (!meta) continue;
      for (const r of h.reasoningLogs) {
        all.push({ ...r, agentId: id, name: meta.name, color: meta.color, colorLight: meta.colorLight, avatar: meta.avatar });
      }
    }
    return all
      .filter((l) => filter === "all" || l.agentId === filter)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 16);
  }, [history, summary, filter]);

  return (
    <Section id="reasoning">
      <Container>
        <SectionHead>
          <div>
            <Kicker>AI Reasoning</Kicker>
            <Title>Inside Their Heads</Title>
            <Sub>The rationale each model writes before it acts. This is the actual decision-making, not a summary.</Sub>
          </div>
        </SectionHead>

        <Tabs>
          <Tab active={filter === "all"} accent="var(--accent)" onClick={() => setFilter("all")}>
            All
          </Tab>
          {agents.map((a) => (
            <Tab key={a.id} active={filter === a.id} accent={a.color} onClick={() => setFilter(a.id)}>
              {a.name}
            </Tab>
          ))}
        </Tabs>

        <List>
          {logs.map((l, i) => (
            <Log
              key={`${l.agentId}-${l.timestamp}-${i}`}
              accent={l.color}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <LogHead>
                <Avatar bg={l.colorLight} fg={l.color}>
                  {l.avatar}
                </Avatar>
                <span className="name" style={{ color: l.color }}>
                  {l.name}
                </span>
                <Pill tone={l.trade.startsWith("BUY") ? "green" : l.trade.startsWith("SELL") ? "red" : l.trade.startsWith("SWAP") ? "accent" : "dim"}>
                  {l.trade}
                </Pill>
                <span className="hour">Hour {l.hour}</span>
              </LogHead>
              <Text>{l.text}</Text>
            </Log>
          ))}
          {logs.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--faint)" }}>The agents are thinking…</div>
          )}
        </List>
      </Container>
    </Section>
  );
}
