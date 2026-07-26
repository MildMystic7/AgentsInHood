"use client";

import { useMemo, useState } from "react";
import styled from "@emotion/styled";
import { AnimatePresence, motion } from "framer-motion";
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

const Toggle = styled.button<{ accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${(p) => p.accent};
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;

  .arrow {
    display: inline-block;
    transition: transform 0.18s ease;
  }

  &[aria-expanded="true"] .arrow {
    transform: rotate(180deg);
  }

  &:hover {
    filter: brightness(1.15);
  }

  &:focus-visible {
    outline: 2px solid ${(p) => p.accent};
    outline-offset: 5px;
    border-radius: 2px;
  }
`;

const Expanded = styled(motion.div)`
  overflow: hidden;
`;

const ContextIntro = styled.p`
  margin: 16px 0 10px;
  color: var(--dim);
  font-family: var(--font-mono);
  font-size: 10.5px;
  line-height: 1.5;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Detail = styled.div`
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.018);

  dt {
    margin-bottom: 6px;
    color: var(--faint);
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    color: var(--dim);
    font-size: 12.5px;
    line-height: 1.55;
  }
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
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

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
            <Sub>Published rationale plus the observable market, portfolio, and risk inputs recorded before each action.</Sub>
          </div>
        </SectionHead>

        <Tabs role="tablist" aria-label="Filter reasoning by agent">
          <Tab
            active={filter === "all"}
            accent="var(--accent)"
            onClick={() => setFilter("all")}
            role="tab"
            aria-selected={filter === "all"}
            aria-label="Show reasoning from all agents"
          >
            All
          </Tab>
          {agents.map((a) => (
            <Tab
              key={a.id}
              active={filter === a.id}
              accent={a.color}
              onClick={() => setFilter(a.id)}
              role="tab"
              aria-selected={filter === a.id}
              aria-label={`Show reasoning from ${a.name}`}
            >
              {a.name}
            </Tab>
          ))}
        </Tabs>

        <List>
          {logs.map((l, i) => {
            const logKey = `${l.agentId}-${l.timestamp}`;
            const isExpanded = expandedLog === logKey;
            const detailsId = `reasoning-details-${l.agentId}-${l.timestamp}`;

            return (
              <Log
                key={`${logKey}-${i}`}
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
                  <Pill tone={l.trade.startsWith("BUY") ? "green" : l.trade.startsWith("SELL") ? "red" : l.trade.startsWith("SWAP") ? "gold" : "dim"}>
                    {l.trade}
                  </Pill>
                  <span className="hour">Hour {l.hour}</span>
                </LogHead>
                <Text>{l.text}</Text>
                {l.details && (
                  <>
                    <Toggle
                      type="button"
                      accent={l.color}
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => setExpandedLog(isExpanded ? null : logKey)}
                    >
                      {isExpanded ? "Show less" : "See more"}
                      <span className="arrow" aria-hidden="true">↓</span>
                    </Toggle>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <Expanded
                          id={detailsId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <ContextIntro>Decision context · recorded at Hour {l.hour}</ContextIntro>
                          <DetailGrid>
                            <Detail>
                              <dt>Market signal</dt>
                              <dd>{l.details.marketSignal}</dd>
                            </Detail>
                            <Detail>
                              <dt>Portfolio context</dt>
                              <dd>{l.details.portfolioContext}</dd>
                            </Detail>
                            <Detail>
                              <dt>Risk discipline</dt>
                              <dd>{l.details.riskDiscipline}</dd>
                            </Detail>
                          </DetailGrid>
                        </Expanded>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </Log>
            );
          })}
          {logs.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--faint)" }}>The agents are thinking…</div>
          )}
        </List>
      </Container>
    </Section>
  );
}
