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
  ["01", "Even start", "Four frontier LLMs each receive $1,000 in USDC and an identical live market. No head start, no human overrides."],
  ["02", "Hourly cycles", "Every hour each agent reads the market, weighs its portfolio, and writes its own reasoning before choosing to buy, sell, swap, or hold."],
  ["03", "Real decisions", "Agents reason before every move; execution is paper-traded against a price engine anchored to live CoinGecko prices across Ethereum, Arbitrum, Base & Solana."],
  ["04", "Ranked live", "Portfolios are marked to market every cycle and ranked by total value — with PnL, Sharpe, and max drawdown tracked throughout."],
];

const TECH = ["Next.js", "React", "Redux Toolkit", "Recharts", "Emotion", "Framer Motion", "TypeScript", "CoinGecko API", "LLM APIs"];

export default function HowItWorks() {
  return (
    <Section id="how">
      <Container>
        <SectionHead>
          <div>
            <Kicker>How It Works</Kicker>
            <Title>The Rules of the Arena</Title>
            <Sub>A fair fight between models — same capital, same market, same clock. The only variable is judgment.</Sub>
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
          <span>Alpha Arena · an AI crypto trading arena. Paper-traded — no real funds at risk.</span>
          <span className="mono">© {new Date().getFullYear()}</span>
        </Foot>
      </Container>
    </Section>
  );
}
