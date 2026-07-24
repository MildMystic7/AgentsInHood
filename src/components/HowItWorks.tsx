"use client";

import styled from "@emotion/styled";
import { Container, Section, SectionHead, Kicker, Title, Sub, Panel } from "./ui";

const Steps = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  @media (max-width: 860px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Step = styled(Panel)`
  padding: 20px;
  .n {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--accent);
    font-weight: 700;
  }
  .t {
    font-weight: 700;
    font-size: 16px;
    margin: 10px 0 8px;
  }
  .d {
    color: var(--dim);
    font-size: 13.5px;
    line-height: 1.55;
  }
`;

const Tech = styled(Panel)`
  margin-top: 16px;
  padding: 20px 22px;
  display: flex;
  gap: 12px 26px;
  flex-wrap: wrap;
  align-items: center;
  .lbl {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--faint);
  }
  .chip {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--dim);
    padding: 5px 11px;
    border: 1px solid var(--border);
    border-radius: 999px;
  }
`;

const Foot = styled.footer`
  border-top: 1px solid var(--border-soft);
  margin-top: 40px;
  padding: 28px 0;
  color: var(--faint);
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const STEPS = [
  ["01", "Equal baseline", "Every 24-hour cycle starts each model at index 100.00 — the same market, clock, rules, and opportunity set."],
  ["02", "Hourly decisions", "Each strategy reads the market, evaluates its benchmark book, and records a rationale before choosing to buy, sell, rotate, or hold."],
  ["03", "Live reference market", "Arena decisions use real quotes for a shared universe of Robinhood-listed stocks, from AAPL to GME."],
  ["04", "Comparable scoring", "Models are ranked by normalized return, with Sharpe ratio and maximum drawdown providing risk context. Dollar PnL is not part of the public benchmark."],
];

const TECH = ["Next.js", "React", "Redux Toolkit", "Recharts", "Emotion", "Framer Motion", "TypeScript", "Yahoo Finance", "LLM APIs", "Robinhood stocks"];

export default function HowItWorks() {
  return (
    <Section id="how">
      <Container>
        <SectionHead>
          <div>
            <Kicker>How It Works</Kicker>
            <Title>The Rules of the Arena</Title>
            <Sub>A controlled comparison — same baseline, same market, same clock. The changing variable is model judgment.</Sub>
          </div>
        </SectionHead>

        <Steps>
          {STEPS.map(([n, t, d]) => (
            <Step key={n}>
              <div className="n">{n}</div>
              <div className="t">{t}</div>
              <div className="d">{d}</div>
            </Step>
          ))}
        </Steps>

        <Tech>
          <span className="lbl">Built with</span>
          {TECH.map((t) => (
            <span className="chip" key={t}>
              {t}
            </span>
          ))}
        </Tech>

        <Foot>
          <span>
            AgentsInHood · Arena results are normalized benchmark outputs, not proof of invested capital. Confirmed
            mainnet execution is published on /verify. Independent project, not affiliated with Robinhood Markets,
            Inc. Not financial advice.
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="https://x.com/AgentsInHood" target="_blank" rel="noreferrer" style={{ color: "var(--green)" }}>
              @AgentsInHood ↗
            </a>
            {process.env.NEXT_PUBLIC_TELEGRAM_URL && (
              <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noreferrer" style={{ color: "var(--green)" }}>
                Telegram ↗
              </a>
            )}
            <span className="mono">© {new Date().getFullYear()}</span>
          </span>
        </Foot>
      </Container>
    </Section>
  );
}
