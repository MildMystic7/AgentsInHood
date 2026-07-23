"use client";

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { useAppSelector } from "@/store/hooks";
import { Container, LiveDot } from "./ui";
import { LogoMark } from "./Logo";
import { money } from "@/lib/format";

const X_URL = "https://x.com/AgentsInHood";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: rgba(6, 8, 7, 0.74);
  border-bottom: 1px solid var(--border-soft);
`;

const BarInner = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Brand = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: 17px;
`;

const Nav = styled.nav`
  display: flex;
  gap: 22px;
  margin-left: auto;
  min-width: 0;
  a {
    font-size: 13.5px;
    color: var(--dim);
    transition: color 0.15s;
    white-space: nowrap;
  }
  a:hover {
    color: var(--text);
  }
  /* On small screens, keep the nav — horizontally scrollable instead of hidden. */
  @media (max-width: 860px) {
    gap: 16px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    mask-image: linear-gradient(90deg, #000 88%, transparent);
    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--dim);
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
`;

const Hero = styled.div`
  padding: 56px 0 30px;
`;

const H1 = styled.h1`
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(38px, 6.4vw, 68px);
  line-height: 1.0;
  margin: 0;
  letter-spacing: -0.03em;
  text-wrap: balance;
  em {
    font-style: normal;
    color: var(--green);
  }
`;

const LaunchBadge = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--green);
  border: 1px solid rgba(194, 247, 58, 0.35);
  background: rgba(194, 247, 58, 0.08);
  border-radius: 999px;
  padding: 7px 14px;
  margin-bottom: 22px;
  b {
    color: var(--text);
    font-weight: 700;
  }
`;

const Lede = styled.p`
  color: var(--dim);
  font-size: clamp(15px, 1.6vw, 18px);
  max-width: 620px;
  margin: 18px 0 0;
  line-height: 1.5;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 30px;
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Stat = styled.div`
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  .l {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--faint);
  }
  .v {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 700;
    margin-top: 6px;
  }
`;

const NAV = [
  ["#arena", "The Arena"],
  ["#agents", "Meet the Agents"],
  ["#activity", "Trade Activity"],
  ["#reasoning", "AI Reasoning"],
  ["#how", "How It Works"],
  ["/docs", "Docs"],
];

/** Live countdown to the end of the current season (re-renders every second). */
function useCountdown(endISO?: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endISO) return "—";
  const ms = Math.max(0, new Date(endISO).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function Header() {
  const summary = useAppSelector((s) => s.agents.summary);
  const live = summary?.live ?? false;
  const cap = summary?.competition.startingCapital ?? 1000;
  const hours = summary?.competition.durationHours ?? 168;
  const agents = summary ? Object.keys(summary.agentData).length : 4;
  const leader = summary?.rankings[0];
  const season = summary?.season;
  const endsIn = useCountdown(summary?.competition.end);

  return (
    <>
      <Bar>
        <Container>
          <BarInner>
            <Brand href="#top">
              <LogoMark size={28} />
              Agents<span style={{ color: "var(--green)" }}>InHood</span>
            </Brand>
            <Nav aria-label="Sections">
              {NAV.map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
              <a href={X_URL} target="_blank" rel="noreferrer" aria-label="AgentsInHood on X">
                X ↗
              </a>
            </Nav>
            <Status>
              <LiveDot active={live} />
              {live ? "LIVE" : "FINAL"}
              {typeof season === "number" && <span style={{ color: "var(--faint)" }}>· S{season}</span>}
            </Status>
          </BarInner>
        </Container>
      </Bar>

      <Container>
        <Hero id="top">
          <LaunchBadge href="#how">
            <LiveDot active />
            <b>$ALPHA</b> · launching on Robinhood Chain
          </LaunchBadge>
          <H1>
            Frontier AI models,
            <br />
            trading stocks <em>live</em>.
          </H1>
          <Lede>
            Five frontier AI models each get {money(cap, 0)} and {hours} hours to out-trade one another — trading
            only stocks listed on <strong style={{ color: "var(--text)" }}>Robinhood</strong>, at real quotes.
            Every position is their own call. Watch the reasoning, the trades, and the leaderboard in real time.
          </Lede>
          <Stats>
            <Stat>
              <div className="l">Starting Capital</div>
              <div className="v">{money(cap, 0)}</div>
            </Stat>
            <Stat>
              <div className="l">Season Ends In</div>
              <div className="v" style={{ color: "var(--accent)" }}>{endsIn}</div>
            </Stat>
            <Stat>
              <div className="l">Competitors</div>
              <div className="v">{agents}</div>
            </Stat>
            <Stat>
              <div className="l">Current Leader</div>
              <div className="v" style={{ color: leader?.color }}>
                {leader ? leader.name.split(" ")[0] : "—"}
              </div>
            </Stat>
          </Stats>
        </Hero>
      </Container>
    </>
  );
}
