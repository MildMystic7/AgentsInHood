"use client";

import { useMemo } from "react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { Container, Section, SectionHead, Kicker, Title, Sub, Panel, Avatar } from "./ui";
import { money } from "@/lib/format";
import type { Trade } from "@/engine/types";

const CHAINS: Record<number, string> = {
  0: "Cash",
  10: "NASDAQ",
  20: "NYSE",
};

const Feed = styled(Panel)`
  overflow: hidden;
  max-height: 520px;
  overflow-y: auto;
`;

const Item = styled(motion.div)`
  display: grid;
  grid-template-columns: 40px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 13px 18px;
  border-bottom: 1px solid var(--border-soft);
  &:last-child {
    border-bottom: none;
  }
`;

const Type = styled.span<{ t: Trade["type"] }>`
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  color: ${(p) => (p.t === "BUY" ? "var(--green)" : p.t === "SELL" ? "var(--red)" : "var(--gold)")};
  background: ${(p) =>
    p.t === "BUY" ? "rgba(0,200,5,0.12)" : p.t === "SELL" ? "rgba(255,80,0,0.12)" : "rgba(245,179,1,0.12)"};
`;

const Route = styled.div`
  font-family: var(--font-mono);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  .chain {
    font-size: 11px;
    color: var(--faint);
  }
`;

const Amt = styled.div`
  text-align: right;
  font-family: var(--font-mono);
  .v {
    font-weight: 700;
    font-size: 14px;
  }
  .h {
    font-size: 11px;
    color: var(--faint);
  }
`;

interface Enriched extends Trade {
  agentId: string;
  color: string;
  colorLight: string;
  avatar: string;
}

export default function TradeActivity() {
  const summary = useAppSelector((s) => s.agents.summary);
  const history = useAppSelector((s) => s.agents.history);

  const trades = useMemo<Enriched[]>(() => {
    if (!history || !summary) return [];
    const all: Enriched[] = [];
    for (const [id, h] of Object.entries(history.agentHistory)) {
      const meta = summary.agentData[id];
      if (!meta) continue;
      for (const t of h.trades) {
        all.push({ ...t, agentId: id, color: meta.color, colorLight: meta.colorLight, avatar: meta.avatar });
      }
    }
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
  }, [history, summary]);

  return (
    <Section id="activity">
      <Container>
        <SectionHead>
          <div>
            <Kicker>Trade Activity</Kicker>
            <Title>The Order Flow</Title>
            <Sub>Every buy, sell, and rotation as it happens — across the full Robinhood stock universe, from AAPL to GME.</Sub>
          </div>
        </SectionHead>

        <Feed>
          {trades.map((t, i) => {
            // The stock side of the trade (BUY buys toSymbol, SELL sells fromSymbol).
            const stockSymbol = t.type === "SELL" ? t.fromSymbol : t.toSymbol;
            const exchange = CHAINS[t.type === "SELL" ? t.fromChainId : t.toChainId] ?? "";
            return (
              <Item
                key={`${t.agentId}-${t.timestamp}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Avatar bg={t.colorLight} fg={t.color}>
                  {t.avatar}
                </Avatar>
                <Route>
                  <Type t={t.type}>{t.type}</Type>
                  <span>
                    <strong style={{ color: t.color }}>{stockSymbol}</strong>
                    {t.type === "SWAP" && (
                      <>
                        {" "}
                        → <strong style={{ color: t.color }}>{t.toSymbol}</strong>
                      </>
                    )}
                  </span>
                  <span className="chain">{exchange}</span>
                </Route>
                <Amt>
                  <div className="v">{money(t.value)}</div>
                  <div className="h">H{t.hour}</div>
                </Amt>
              </Item>
            );
          })}
          {trades.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--faint)" }}>Waiting for the first trades…</div>
          )}
        </Feed>
      </Container>
    </Section>
  );
}
