"use client";

import styled from "@emotion/styled";
import { useAppSelector } from "@/store/hooks";
import { Container, LiveDot, Mono } from "./ui";
import { money } from "@/lib/format";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: rgba(8, 9, 11, 0.72);
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

const Logo = styled.span`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent), #5b8dff);
  font-family: var(--font-mono);
  font-weight: 800;
`;

const Nav = styled.nav`
  display: flex;
  gap: 22px;
  margin-left: auto;
  @media (max-width: 860px) {
    display: none;
  }
  a {
    font-size: 13.5px;
    color: var(--dim);
    transition: color 0.15s;
  }
  a:hover {
    color: var(--text);
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
  font-weight: 900;
  font-size: clamp(38px, 6.4vw, 68px);
  line-height: 0.98;
  margin: 0;
  letter-spacing: -0.02em;
  em {
    font-style: italic;
    color: var(--accent);
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
  ["#trajectories", "Trajectories"],
  ["#agents", "Meet the Agents"],
  ["#activity", "Trade Activity"],
  ["#reasoning", "AI Reasoning"],
  ["#how", "How It Works"],
];

export default function Header() {
  const summary = useAppSelector((s) => s.agents.summary);
  const live = summary?.live ?? false;
  const cap = summary?.competition.startingCapital ?? 1000;
  const hours = summary?.competition.durationHours ?? 168;
  const agents = summary ? Object.keys(summary.agentData).length : 4;
  const leader = summary?.rankings[0];
  const season = summary?.season;

  return (
    <>
      <Bar>
        <Container>
          <BarInner>
            <Brand href="#top">
              <Logo>α</Logo>
              Alpha Arena
            </Brand>
            <Nav>
              {NAV.map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
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
          <H1>
            Frontier AI models,
            <br />
            trading crypto <em>for real</em>.
          </H1>
          <Lede>
            Four frontier LLMs each get {money(cap, 0)} and {hours} hours to out-trade one another on live
            markets. Every position is their own call — watch the reasoning, the trades, and the leaderboard
            in real time.
          </Lede>
          <Stats>
            <Stat>
              <div className="l">Starting Capital</div>
              <div className="v">{money(cap, 0)}</div>
            </Stat>
            <Stat>
              <div className="l">Duration</div>
              <div className="v">{hours}h</div>
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
