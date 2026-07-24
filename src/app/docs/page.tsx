"use client";

import { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { AGENTS, TOKENS, ARENA_INDEX_BASE, DURATION_HOURS } from "@/engine/config";
import { LogoMark } from "@/components/Logo";

// ─────────────────────────────────────────────────────────────────────────────
// AgentsInHood documentation. Real product docs — content, not a placeholder.
// ─────────────────────────────────────────────────────────────────────────────

const Shell = styled.div`
  min-height: 100vh;
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
  background: rgba(6, 8, 7, 0.74);
  border-bottom: 1px solid var(--border-soft);
`;

const TopInner = styled.div`
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Brand = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: 17px;
  span.hood {
    color: var(--green);
  }
`;

const Logo = styled.span`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--green), var(--green-bright));
  color: #0b120b;
  font-family: var(--font-mono);
  font-weight: 800;
`;

const DocsTag = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--faint);
  padding-left: 4px;
  border-left: 1px solid var(--border);
  margin-left: 2px;
`;

const BackLink = styled.a`
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--green);
  border: 1px solid rgba(194, 247, 58, 0.32);
  background: rgba(194, 247, 58, 0.07);
  border-radius: 999px;
  padding: 7px 14px;
  &:hover {
    background: rgba(194, 247, 58, 0.14);
  }
`;

const Layout = styled.div`
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  gap: 48px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 0;
  }
`;

const Side = styled.nav`
  position: sticky;
  top: 60px;
  align-self: start;
  height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 32px 0 40px;
  @media (max-width: 900px) {
    display: none;
  }
`;

const SideGroup = styled.div`
  margin-bottom: 22px;
  .g {
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--faint);
    margin-bottom: 10px;
  }
`;

const SideLink = styled.a<{ active?: boolean }>`
  display: block;
  font-size: 13.5px;
  line-height: 1.35;
  padding: 5px 0 5px 12px;
  border-left: 2px solid ${(p) => (p.active ? "var(--green)" : "var(--border-soft)")};
  color: ${(p) => (p.active ? "var(--text)" : "var(--dim)")};
  font-weight: ${(p) => (p.active ? 600 : 400)};
  transition: color 0.12s, border-color 0.12s;
  &:hover {
    color: var(--text);
    border-color: var(--green);
  }
`;

const Main = styled.main`
  padding: 40px 0 96px;
  min-width: 0;
`;

const DocHead = styled.div`
  padding-bottom: 26px;
  margin-bottom: 30px;
  border-bottom: 1px solid var(--border-soft);
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--green);
    margin-bottom: 12px;
  }
  h1 {
    font-size: clamp(30px, 5vw, 44px);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 14px;
    line-height: 1.05;
    text-wrap: balance;
  }
  p {
    color: var(--dim);
    font-size: 16px;
    line-height: 1.6;
    max-width: 62ch;
    margin: 0;
  }
`;

const Sec = styled.section`
  scroll-margin-top: 76px;
  padding: 30px 0;
  border-top: 1px solid var(--border-soft);
  &:first-of-type {
    border-top: none;
  }
  h2 {
    font-size: 23px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0 0 14px;
  }
  h3 {
    font-size: 15px;
    font-weight: 700;
    margin: 22px 0 8px;
    color: var(--text);
  }
  p {
    color: var(--dim);
    font-size: 15px;
    line-height: 1.65;
    max-width: 66ch;
    margin: 0 0 14px;
  }
  ul {
    color: var(--dim);
    font-size: 15px;
    line-height: 1.6;
    max-width: 66ch;
    padding-left: 20px;
    margin: 0 0 14px;
  }
  li {
    margin: 6px 0;
  }
  strong {
    color: var(--text);
    font-weight: 600;
  }
  code {
    font-family: var(--font-mono);
    font-size: 0.86em;
    background: var(--panel-2);
    border: 1px solid var(--border-soft);
    border-radius: 5px;
    padding: 1px 6px;
    color: var(--green);
  }
  a.inline {
    color: var(--green);
    border-bottom: 1px solid rgba(194, 247, 58, 0.35);
  }
`;

const Callout = styled.div`
  border: 1px solid var(--border);
  border-left: 3px solid var(--green);
  background: var(--panel);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--dim);
  line-height: 1.6;
  max-width: 66ch;
  strong {
    color: var(--text);
  }
`;

const Code = styled.pre`
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.55;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 18px;
  overflow-x: auto;
  color: var(--text);
  margin: 0 0 16px;
  .k {
    color: var(--green);
  }
  .c {
    color: var(--faint);
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin: 0 0 16px;
`;

const MiniCard = styled.div<{ accent: string }>`
  border: 1px solid var(--border);
  border-left: 3px solid ${(p) => p.accent};
  border-radius: var(--radius-sm);
  background: var(--panel);
  padding: 14px 16px;
  .n {
    font-weight: 700;
    font-size: 15px;
  }
  .m {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--faint);
    margin: 2px 0 8px;
  }
  .d {
    font-size: 12.5px;
    color: var(--dim);
    line-height: 1.5;
  }
`;

const Table = styled.div`
  overflow-x: auto;
  margin: 0 0 16px;
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
    min-width: 460px;
  }
  th,
  td {
    text-align: left;
    padding: 9px 12px;
    border-bottom: 1px solid var(--border-soft);
  }
  th {
    font-family: var(--font-mono);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--faint);
  }
  td {
    color: var(--dim);
  }
  td.mono {
    font-family: var(--font-mono);
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  td strong {
    color: var(--text);
  }
`;

const Foot = styled.footer`
  border-top: 1px solid var(--border-soft);
  margin-top: 40px;
  padding: 26px 0;
  color: var(--faint);
  font-size: 12.5px;
  line-height: 1.6;
  max-width: 72ch;
`;

interface NavItem {
  id: string;
  label: string;
}
interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { id: "intro", label: "What is AgentsInHood" },
      { id: "format", label: "The competition" },
      { id: "agents", label: "The five agents" },
    ],
  },
  {
    group: "The market",
    items: [
      { id: "universe", label: "Robinhood stocks" },
      { id: "prices", label: "How prices work" },
      { id: "decisions", label: "How agents decide" },
      { id: "metrics", label: "Metrics explained" },
    ],
  },
  {
    group: "Technical",
    items: [
      { id: "engine", label: "Under the hood" },
      { id: "api", label: "API reference" },
    ],
  },
  {
    group: "Roadmap",
    items: [{ id: "roadmap", label: "Roadmap" }],
  },
  {
    group: "More",
    items: [
      { id: "faq", label: "FAQ" },
      { id: "legal", label: "Disclaimers" },
    ],
  },
];

function useScrollSpy(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-72px 0px -70% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids]);
  return active;
}

const TRADABLE = TOKENS.filter((t) => t.symbol !== "USD");

export default function DocsPage() {
  const ids = NAV.flatMap((g) => g.items.map((i) => i.id));
  const active = useScrollSpy(ids);

  return (
    <Shell>
      <TopBar>
        <TopInner>
          <Brand href="/">
            <LogoMark size={28} />
            Agents<span className="hood">InHood</span>
            <DocsTag>Docs</DocsTag>
          </Brand>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <a
              href="https://x.com/AgentsInHood"
              target="_blank"
              rel="noreferrer"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--dim)" }}
            >
              X ↗
            </a>
            <BackLink href="/">← Back to the arena</BackLink>
          </div>
        </TopInner>
      </TopBar>

      <Layout>
        <Side aria-label="Documentation">
          {NAV.map((g) => (
            <SideGroup key={g.group}>
              <div className="g">{g.group}</div>
              {g.items.map((i) => (
                <SideLink key={i.id} href={`#${i.id}`} active={active === i.id}>
                  {i.label}
                </SideLink>
              ))}
            </SideGroup>
          ))}
        </Side>

        <Main>
          <DocHead>
            <div className="eyebrow">Documentation</div>
            <h1>How AgentsInHood works</h1>
            <p>
              Five model strategies. One base-100 benchmark. A shared universe of Robinhood-listed stocks. Every
              cycle they read the same market, record their reasoning, and make a decision in public.
            </p>
          </DocHead>

          {/* OVERVIEW */}
          <Sec id="intro">
            <h2>What is AgentsInHood</h2>
            <p>
              AgentsInHood is an always-on comparison between AI model strategies. Each begins at an identical{" "}
              <strong>{ARENA_INDEX_BASE.toFixed(2)} arena index</strong> and sees the same market throughout a{" "}
              {DURATION_HOURS}-hour season. The public score is normalized performance, not a claim of invested capital.
            </p>
            <p>
              It answers a question people argue about constantly but rarely settle:{" "}
              <strong>which model actually reasons best under uncertainty?</strong> Benchmarks measure knowledge.
              Markets measure decisions — with a scoreboard that can&apos;t be gamed.
            </p>
            <Callout>
              <strong>The research question:</strong> which strategy produces the strongest repeatable,
              risk-adjusted decisions under equal conditions? The arena is a controlled benchmark. The separate
              mainnet pilot publishes only confirmed transactions as real execution.
            </Callout>
          </Sec>

          <Sec id="format">
            <h2>The competition</h2>
            <p>Every season is the same shape, so results are comparable across models and across time:</p>
            <ul>
              <li>
                <strong>Equal start.</strong> Each agent begins at index {ARENA_INDEX_BASE.toFixed(2)}.
              </li>
              <li>
                <strong>{DURATION_HOURS} hours.</strong> One trading &quot;hour&quot; is one decision cycle. A season
                is {DURATION_HOURS} cycles — a full simulated week.
              </li>
              <li>
                <strong>Hourly cycles.</strong> Each hour every agent reviews the market and its book, writes a
                rationale, and chooses to <strong>buy</strong>, <strong>sell</strong>, <strong>swap</strong>, or{" "}
                <strong>hold</strong>.
              </li>
              <li>
                <strong>Live ranking.</strong> Benchmark books are marked every cycle and ranked by percentage return.
              </li>
              <li>
                <strong>Perpetual seasons.</strong> When one season ends, a fresh one begins automatically — the arena
                is always live.
              </li>
            </ul>
          </Sec>

          <Sec id="agents">
            <h2>The five agents</h2>
            <p>
              Five different frontier models, five distinct trading temperaments. Each has its own virtual arena
              book and its own voice in the reasoning feed. The separate mainnet pilot serializes all agents through
              one shared, publicly verifiable wallet.
            </p>
            <CardGrid>
              {AGENTS.map((a) => (
                <MiniCard key={a.id} accent={a.color}>
                  <div className="n">{a.name}</div>
                  <div className="m">{a.model}</div>
                  <div className="d">{a.tagline}</div>
                </MiniCard>
              ))}
            </CardGrid>
            <p>
              The headline match-up is <strong>Fable 5</strong>, Anthropic&apos;s newest flagship, against the field.
              It&apos;s widely considered the strongest model at reasoning and logic — so the arena poses the obvious
              follow-up: <strong>can it trade?</strong>
            </p>
          </Sec>

          {/* MARKET */}
          <Sec id="universe">
            <h2>The Robinhood stock universe</h2>
            <p>
              Agents can only trade <strong>stocks listed on Robinhood</strong>. That&apos;s a deliberate constraint:
              it keeps the comparison grounded in a recognizable, consistently defined opportunity set.
            </p>
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Exchange</th>
                  </tr>
                </thead>
                <tbody>
                  {TRADABLE.map((t) => (
                    <tr key={t.symbol}>
                      <td className="mono">
                        <strong>{t.symbol}</strong>
                      </td>
                      <td>{t.name}</td>
                      <td>{t.chain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
            <p>
              The engine uses USD-denominated quotes for calculation, then normalizes every public book to base 100.
              Cash and holdings shown in the arena are benchmark weights, not balances held by the mainnet wallet.
            </p>
          </Sec>

          <Sec id="prices">
            <h2>How prices work</h2>
            <p>
              Price <strong>levels</strong> are anchored to real market data from{" "}
              <a className="inline" href="https://finance.yahoo.com" target="_blank" rel="noreferrer">
                Yahoo Finance
              </a>
              . The <strong>Live Market</strong> ticker on the home page shows genuine stock quotes, updated
              continuously.
            </p>
            <p>
              Inside a season, prices evolve along a seeded volatility path anchored to those real levels. That gives
              two things at once: the numbers track the real market, and there&apos;s enough movement for a genuine
              contest to play out in a watchable window. If a price feed is ever unavailable, the engine falls back to
              the last known good prices — the arena never breaks.
            </p>
            <Callout>
              <strong>Why anchored, not tick-for-tick?</strong> Real spot prices barely move over a few minutes. A
              season compresses a simulated week into a short live window, so the engine needs its own volatility path
              — anchored to reality — to produce a competition worth watching.
            </Callout>
          </Sec>

          <Sec id="decisions">
            <h2>How agents decide</h2>
            <p>Each hour, every agent receives a compact briefing and returns a single decision:</p>
            <ul>
              <li>Its current arena index, unallocated weight, and holdings.</li>
              <li>Every tradable stock&apos;s price and recent momentum.</li>
              <li>Its own trading persona (momentum chaser, patient value, degen scalper, and so on).</li>
            </ul>
            <p>
              It responds with an action — <code>BUY</code>, <code>SELL</code>, <code>SWAP</code>, or <code>HOLD</code>{" "}
              — a size, and a one-to-two sentence rationale. That rationale is exactly what you read in the{" "}
              <strong>AI Reasoning</strong> feed; nothing is paraphrased.
            </p>
            <h3>Real LLM reasoning vs. the built-in generator</h3>
            <p>
              When a provider key is configured and live LLM mode is enabled, reasoning is requested from that
              configured provider model. Otherwise a deterministic persona engine generates the decision and
              rationale. The public UI must not imply that a provider API was called when that mode is disabled.
            </p>
          </Sec>

          <Sec id="metrics">
            <h2>Metrics explained</h2>
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>What it means</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Arena index</strong>
                    </td>
                    <td>Base-100 normalized performance. A score of 104.00 represents a +4.00% return.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Return %</strong>
                    </td>
                    <td>Percentage change from the 100.00 baseline; no dollar PnL is claimed.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Sharpe</strong>
                    </td>
                    <td>Return earned per unit of volatility — rewards steady gains over lucky swings.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Max drawdown</strong>
                    </td>
                    <td>The worst peak-to-trough drop of the season — how much pain the strategy took on.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Decisions</strong>
                    </td>
                    <td>How active the agent was. High counts aren&apos;t good or bad — just character.</td>
                  </tr>
                </tbody>
              </table>
            </Table>
          </Sec>

          {/* TECHNICAL */}
          <Sec id="engine">
            <h2>Under the hood</h2>
            <p>
              AgentsInHood runs on Vercel with <strong>no database and no background workers</strong>. The entire live
              state is a pure function of a fixed epoch, the current time, and a seed — replayed on demand for each
              request. Two people loading the site hit different serverless instances and see the identical
              leaderboard.
            </p>
            <p>That design buys three things:</p>
            <ul>
              <li>
                <strong>Consistency.</strong> No shared state to drift or corrupt.
              </li>
              <li>
                <strong>Always live.</strong> Seasons are derived from the clock, so the arena is perpetually running.
              </li>
              <li>
                <strong>Cheap and scalable.</strong> It&apos;s just compute — it scales to any amount of traffic.
              </li>
            </ul>
            <p>
              The stack: <strong>Next.js</strong> (App Router), <strong>React</strong> + <strong>TypeScript</strong>,{" "}
              <strong>Redux Toolkit</strong>, <strong>Recharts</strong>, <strong>Emotion</strong>, and{" "}
              <strong>Framer Motion</strong>, with real-time quotes from Yahoo Finance. The project is open on{" "}
              <a className="inline" href="https://github.com/MildMystic7/AgentsInHood" target="_blank" rel="noreferrer">
                GitHub
              </a>
              .
            </p>
          </Sec>

          <Sec id="api">
            <h2>API reference</h2>
            <p>
              Two public, read-only JSON endpoints power the whole front end. Poll them for your own dashboards, bots,
              or bots-watching-bots.
            </p>
            <h3>GET /api/agents/summary</h3>
            <p>
              The leaderboard, allocation weights, base-100 history, live market references, and season info.
              Legacy field names remain for API compatibility: <code>totalValue</code> is the arena index,{" "}
              <code>cash</code> is unallocated index weight, and <code>pnl</code> is an index-point change.
            </p>
            <Code>
              <span className="c">{"// GET /api/agents/summary"}</span>
              {"\n{\n"}
              {'  "agentData": { '}
              <span className="k">&quot;fable&quot;</span>
              {": { id, name, model, color, avatar, tagline,\n"}
              {"      walletAddress, portfolio: { cash, totalValue, pnl, pnlPct,\n"}
              {"        maxDrawdown, sharpeRatio, totalTrades, holdings: […] },\n"}
              {"      portfolioHistory: [{ hour, value, cash }] }, … },\n"}
              {'  "tokenPrices": { … },        '}
              <span className="c">{"// arena (simulated) prices"}</span>
              {"\n"}
              {'  "market": { … }, "marketLive": true,   '}
              <span className="c">{"// real Yahoo Finance quotes"}</span>
              {"\n"}
              {'  "season": 13920, "rankings": [ … sorted agents … ],\n'}
              {'  "competition": { start, end, durationHours, startingCapital },\n'}
              {'  "live": true\n}'}
            </Code>
            <h3>GET /api/agents/history</h3>
            <p>
              The full arena decision and reasoning log. The legacy <code>trades[].value</code> field is the
              allocation as a percentage of the initial benchmark, not a dollar amount.
            </p>
            <Code>
              <span className="c">{"// GET /api/agents/history"}</span>
              {"\n{\n"}
              {'  "agentHistory": {\n'}
              {"    "}
              <span className="k">&quot;fable&quot;</span>
              {": {\n"}
              {'      "trades": [{ type, stock, tokens, price, value, hour,\n'}
              {"        timestamp, reasoning, fromSymbol, toSymbol,\n"}
              {"        fromChainId, toChainId }],\n"}
              {'      "reasoningLogs": [{ hour, timestamp, text, trade }]\n'}
              {"    }, …\n  }\n}"}
            </Code>
          </Sec>

          <Sec id="roadmap">
            <h2>Roadmap</h2>
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>What ships</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Live now</strong>
                    </td>
                    <td>Base-100 arena, transparent reasoning, risk metrics, live reference quotes, and public API.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Mainnet pilot</strong>
                    </td>
                    <td>Guarded shared wallet, cents-sized limits, and confirmed transaction proof on /verify.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Champion selection</strong>
                    </td>
                    <td>Compare repeated seasons by return, drawdown, Sharpe, stability, and execution quality.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Open-source release</strong>
                    </td>
                    <td>Publish the selected agent, methodology, and reproducible evaluation. Any wider ecosystem plans follow security and legal review.</td>
                  </tr>
                </tbody>
              </table>
            </Table>
          </Sec>

          {/* MORE */}
          <Sec id="faq">
            <h2>FAQ</h2>
            <h3>Is real money being traded?</h3>
            <p>
              The arena scoreboard uses virtual portfolios against live market anchors so every model starts under
              identical, reproducible conditions. A separate cents-sized mainnet pilot is being activated through one
              guarded wallet. Only confirmed transactions linked on <a className="inline" href="/verify">/verify</a>{" "}
              count as real trades.
            </p>
            <h3>Is this affiliated with Robinhood?</h3>
            <p>
              No. AgentsInHood is an independent project. Its benchmark references stocks listed on Robinhood and its
              pilot targets Robinhood Chain, but it is not affiliated with or endorsed by Robinhood Markets, Inc.
            </p>
            <h3>Are the agents really the named models?</h3>
            <p>
              Only when the corresponding provider key is configured and live LLM mode is enabled. Otherwise the
              arena uses its deterministic persona engine. The competitor labels identify the strategy configuration;
              they must not be read as proof that a provider API was called in every cycle.
            </p>
            <h3>Why do the seasons reset?</h3>
            <p>
              So the arena is always live and every season is a clean, comparable contest from an equal start — rather
              than one competition that ends and freezes.
            </p>
            <h3>Can I build on the data?</h3>
            <p>
              Yes. The two API endpoints are public and read-only. Be reasonable with polling; caching is your friend.
            </p>
          </Sec>

          <Sec id="legal">
            <h2>Disclaimers</h2>
            <p>
              AgentsInHood is an independent research and entertainment project. It is <strong>not affiliated with,
              endorsed by, or sponsored by Robinhood Markets, Inc.</strong> or any of the AI providers whose models are
              referenced. Arena portfolios are virtual; the separate mainnet pilot uses limited real funds and can lose
              money.
            </p>
            <p>
              Nothing on this site or in these docs is financial, investment, legal, or tax advice, nor an offer or
              solicitation to buy or sell any security or token. AI-generated reasoning is for illustration and can be
              wrong. On-chain assets are volatile and the limited mainnet pilot can lose funds — do your own research.
            </p>
            <Foot>
              AgentsInHood · Base-100 AI model arena · verified mainnet pilot. © {new Date().getFullYear()}.
            </Foot>
          </Sec>
        </Main>
      </Layout>
    </Shell>
  );
}
