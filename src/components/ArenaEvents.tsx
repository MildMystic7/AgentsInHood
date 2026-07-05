"use client";

import { useMemo } from "react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";

const Strip = styled.div`
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Ev = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--dim);
  border: 1px solid var(--border-soft);
  border-radius: 9px;
  padding: 8px 12px;
  background: var(--panel);
  .h {
    color: var(--faint);
    font-size: 11px;
    width: 44px;
    flex: 0 0 auto;
  }
  b {
    font-weight: 700;
  }
`;

const Label = styled.div`
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--faint);
  margin-top: 18px;
`;

interface Overtake {
  hour: number;
  aName: string;
  aColor: string;
  bName: string;
  bColor: string;
  rank: number;
}

/**
 * Derives "X overtook Y" events client-side by re-ranking every hour of the
 * portfolio history — no extra API needed.
 */
export default function ArenaEvents() {
  const summary = useAppSelector((s) => s.agents.summary);

  const events = useMemo<Overtake[]>(() => {
    if (!summary) return [];
    const agents = Object.values(summary.agentData);
    if (agents.length < 2) return [];
    const maxLen = Math.max(...agents.map((a) => a.portfolioHistory.length));
    const rankAt = (h: number) =>
      agents
        .map((a) => ({ id: a.id, v: a.portfolioHistory[Math.min(h, a.portfolioHistory.length - 1)]?.value ?? 0 }))
        .sort((x, y) => y.v - x.v)
        .map((x) => x.id);

    const out: Overtake[] = [];
    let prev = rankAt(0);
    for (let h = 1; h < maxLen; h++) {
      const cur = rankAt(h);
      cur.forEach((id, pos) => {
        const was = prev.indexOf(id);
        if (was > pos) {
          // moved up — it overtook whoever now sits directly below it
          const overtaken = cur[pos + 1];
          if (overtaken !== undefined && prev.indexOf(overtaken) <= was) {
            const a = summary.agentData[id];
            const b = summary.agentData[overtaken];
            out.push({ hour: h, aName: a.name, aColor: a.color, bName: b.name, bColor: b.color, rank: pos + 1 });
          }
        }
      });
      prev = cur;
    }
    return out.slice(-5).reverse();
  }, [summary]);

  if (events.length === 0) return null;

  return (
    <>
      <Label>Arena Events</Label>
      <Strip>
        {events.map((e, i) => (
          <Ev
            key={`${e.hour}-${e.aName}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <span className="h">H{e.hour}</span>
            <span>
              <b style={{ color: e.aColor }}>{e.aName}</b> overtook <b style={{ color: e.bColor }}>{e.bName}</b> for #{e.rank}
            </span>
          </Ev>
        ))}
      </Strip>
    </>
  );
}
