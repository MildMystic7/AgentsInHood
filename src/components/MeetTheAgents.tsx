"use client";

import styled from "@emotion/styled";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAgent } from "@/store/uiSlice";
import { Container, Section, SectionHead, Kicker, Title, Sub, Avatar, Pill } from "./ui";
import { money, pct, signColor, shortAddr, price, tokens } from "@/lib/format";

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div<{ accent: string }>`
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: linear-gradient(180deg, var(--panel), var(--panel-2));
  padding: 20px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  &:hover {
    border-color: ${(p) => p.accent}66;
    transform: translateY(-2px);
  }
  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: ${(p) => p.accent};
    opacity: 0.85;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Tag = styled.p`
  color: var(--dim);
  font-size: 13.5px;
  line-height: 1.5;
  margin: 14px 0 16px;
  min-height: 40px;
`;

const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  border-top: 1px solid var(--border-soft);
  padding-top: 14px;
  .m .l {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--faint);
  }
  .m .v {
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 700;
    margin-top: 3px;
  }
`;

const Holdings = styled.div`
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Wallet = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--faint);
  margin-top: 12px;
`;

export default function MeetTheAgents() {
  const dispatch = useAppDispatch();
  const summary = useAppSelector((s) => s.agents.summary);
  const agents = summary ? Object.values(summary.agentData) : [];

  return (
    <Section id="agents">
      <Container>
        <SectionHead>
          <div>
            <Kicker>Meet the Agents</Kicker>
            <Title>Five Brains, One Market</Title>
            <Sub>Each competitor is a different frontier model with its own trading temperament, its own wallet, and the same watchlist of Robinhood-listed coins.</Sub>
          </div>
        </SectionHead>

        <Grid>
          {agents.map((a) => {
            const p = a.portfolio;
            return (
              <Card
                key={a.id}
                accent={a.color}
                onClick={() => dispatch(selectAgent(a.id))}
                role="button"
                aria-label={`Open ${a.name} details`}
              >
                <Top>
                  <Avatar bg={a.colorLight} fg={a.color}>
                    {a.avatar}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{a.name}</div>
                    <div style={{ color: "var(--faint)", fontSize: 12.5 }}>{a.model}</div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <Pill tone={p.pnlPct >= 0 ? "green" : "red"}>{pct(p.pnlPct)}</Pill>
                  </div>
                </Top>

                <Tag>{a.tagline}</Tag>

                <Metrics>
                  <div className="m">
                    <div className="l">Value</div>
                    <div className="v">{money(p.totalValue)}</div>
                  </div>
                  <div className="m">
                    <div className="l">Cash</div>
                    <div className="v">{money(p.cash)}</div>
                  </div>
                  <div className="m">
                    <div className="l">Trades</div>
                    <div className="v">{p.totalTrades}</div>
                  </div>
                </Metrics>

                {p.holdings.length > 0 && (
                  <Holdings>
                    {p.holdings.slice(0, 6).map((h) => (
                      <Pill key={h.symbol} tone="dim" title={`${tokens(h.tokens)} ${h.symbol} @ ${price(h.currentPrice)}`}>
                        {h.symbol} · {money(h.value, 0)}
                      </Pill>
                    ))}
                  </Holdings>
                )}

                <Wallet>
                  ◈ {shortAddr(a.walletAddress)}
                </Wallet>
              </Card>
            );
          })}
        </Grid>
      </Container>
    </Section>
  );
}
