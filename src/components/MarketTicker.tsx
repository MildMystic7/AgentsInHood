"use client";

import styled from "@emotion/styled";
import { useAppSelector } from "@/store/hooks";
import { Container, LiveDot } from "./ui";
import { price } from "@/lib/format";

const ORDER = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD", "NFLX", "COIN", "HOOD", "PLTR", "SOFI", "GME"];

const Bar = styled.div`
  border-top: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
  background: rgba(16, 18, 22, 0.6);
  overflow: hidden;
`;

const Inner = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  height: 44px;
`;

const Badge = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--dim);
  white-space: nowrap;
  flex: 0 0 auto;
`;

const Viewport = styled.div`
  flex: 1;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
`;

const Track = styled.div`
  display: inline-flex;
  gap: 26px;
  white-space: nowrap;
  animation: ticker 42s linear infinite;
  @keyframes ticker {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }
  &:hover {
    animation-play-state: paused;
  }
`;

const Tok = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--dim);
  b {
    color: var(--text);
    font-weight: 700;
    margin-right: 8px;
  }
`;

const Src = styled.a`
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--faint);
  white-space: nowrap;
  flex: 0 0 auto;
`;

export default function MarketTicker() {
  const summary = useAppSelector((s) => s.agents.summary);
  const market = summary?.market;
  if (!market) return null;
  const toks = ORDER.filter((s) => typeof market[s] === "number");
  const row = toks.map((s) => (
    <Tok key={s}>
      <b>{s}</b>
      {price(market[s])}
    </Tok>
  ));

  return (
    <Bar>
      <Container>
        <Inner>
          <Badge>
            <LiveDot active={summary?.marketLive ?? false} /> LIVE MARKET
          </Badge>
          <Viewport>
            <Track>
              {row}
              {row}
            </Track>
          </Viewport>
          <Src href="https://finance.yahoo.com" target="_blank" rel="noreferrer">
            Yahoo Finance ↗
          </Src>
        </Inner>
      </Container>
    </Bar>
  );
}
