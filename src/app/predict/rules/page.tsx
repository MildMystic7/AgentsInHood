"use client";

import styled from "@emotion/styled";
import { ArrowLeft, ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";

const Shell = styled.main`
  min-height: 100vh;
  padding: 0 20px 80px;
`;

const Top = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  max-width: 1040px;
  height: 66px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-soft);
  background: rgba(6, 8, 7, 0.84);
  backdrop-filter: blur(14px);

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
  }

  .back {
    margin-left: auto;
    color: var(--green);
    font: 700 12px/1 var(--font-mono);
  }
`;

const Wrap = styled.div`
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
`;

const Hero = styled.section`
  padding: 72px 0 38px;
  border-bottom: 1px solid var(--border);

  .eyebrow {
    color: var(--green);
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 820px;
    margin: 18px 0;
    font-size: clamp(42px, 7vw, 78px);
    line-height: 0.98;
    letter-spacing: -0.05em;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: var(--dim);
    font-size: 16px;
    line-height: 1.7;
  }
`;

const Status = styled.div`
  display: flex;
  gap: 11px;
  align-items: flex-start;
  margin-top: 26px;
  padding: 15px 17px;
  border: 1px solid rgba(194, 247, 58, 0.26);
  border-radius: 12px;
  color: var(--dim);
  background: rgba(194, 247, 58, 0.045);
  font-size: 12.5px;
  line-height: 1.55;

  strong {
    color: var(--green);
  }
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 42px;
  padding-top: 36px;

  nav {
    position: sticky;
    top: 94px;
    align-self: start;
    display: grid;
    gap: 12px;
  }

  nav a {
    color: var(--faint);
    font: 600 11px/1.3 var(--font-mono);
  }

  nav a:hover {
    color: var(--green);
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    nav {
      display: none;
    }
  }
`;

const Content = styled.div`
  display: grid;
  gap: 18px;
`;

const Section = styled.section`
  scroll-margin-top: 88px;
  padding: 25px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(12, 15, 13, 0.91);

  h2 {
    margin: 0 0 13px;
    font-size: 21px;
    letter-spacing: -0.02em;
  }

  p,
  li {
    color: var(--dim);
    font-size: 13.5px;
    line-height: 1.7;
  }

  p {
    margin: 0 0 12px;
  }

  p:last-child {
    margin-bottom: 0;
  }

  ul,
  ol {
    margin: 10px 0 0;
    padding-left: 20px;
  }

  strong {
    color: var(--text);
  }

  code {
    color: var(--green);
    font-family: var(--font-mono);
  }
`;

const Footer = styled.footer`
  max-width: 1040px;
  margin: 45px auto 0;
  padding-top: 20px;
  border-top: 1px solid var(--border-soft);
  color: var(--faint);
  font-size: 11.5px;
  line-height: 1.7;

  a {
    color: var(--dim);
  }
`;

const SECTIONS = [
  ["status", "Status and scope"],
  ["round", "Round mechanics"],
  ["eligibility", "Eligibility"],
  ["funds", "Funds and payouts"],
  ["result", "Result and review"],
  ["risk", "Risk notice"],
  ["privacy", "On-chain privacy"],
  ["operator", "Operator boundaries"],
] as const;

export default function PredictionRulesPage() {
  return (
    <Shell>
      <Top>
        <a className="brand" href="/">
          <LogoMark size={28} />
          Agents<span style={{ color: "var(--green)" }}>InHood</span>
        </a>
        <a className="back" href="/predict">
          <ArrowLeft size={12} /> Predictions
        </a>
      </Top>

      <Wrap>
        <Hero>
          <div className="eyebrow">Challenge 02 · Published operating rules</div>
          <h1>Rules, custody boundaries, and risk.</h1>
          <p>
            This page records the technical mechanics the public interface and
            smart contract are expected to enforce. It is designed to make the
            round independently inspectable before any wallet transaction is enabled.
          </p>
          <Status>
            <LockKeyhole size={17} />
            <div>
              <strong>Mainnet launch is currently locked.</strong> Publication of
              these rules does not mean a round is live. The prediction page shows
              the deployed contract and exact limits only after the launch gates pass.
            </div>
          </Status>
        </Hero>

        <Grid>
          <nav aria-label="Rules sections">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>

          <Content>
            <Section id="status">
              <h2>Status and scope</h2>
              <p>
                Challenge 02 is a single three-hour prediction round around the
                AgentsInHood agent battle. The contract address, network, immutable
                limits, timestamps, pool state, and settlement evidence must be
                publicly readable before participation.
              </p>
              <p>
                These are technical operating rules and a risk notice. Any
                jurisdiction-specific terms, eligibility decision, or disclosure
                supplied by the operator remains controlling and should be reviewed
                before launch.
              </p>
            </Section>

            <Section id="round">
              <h2>Round mechanics</h2>
              <ol>
                <li>Five agents compete under the published arena methodology.</li>
                <li>
                  Predictions open when the battle starts and remain editable for
                  exactly one hour.
                </li>
                <li>
                  During that hour, an eligible wallet can add stake, move its full
                  position to another agent, or withdraw a valid amount.
                </li>
                <li>Every position locks for the final two hours.</li>
                <li>
                  The final result is proposed with an evidence hash and remains
                  reviewable before settlement.
                </li>
              </ol>
              <p>
                Exact timestamps come from the contract, not from a browser clock.
                The minimum, per-wallet maximum, total pool cap, and result-review
                duration are immutable constructor values.
              </p>
            </Section>

            <Section id="eligibility">
              <h2>Eligibility</h2>
              <p>
                The mainnet build accepts stakes only from addresses marked eligible
                in the public registry. The registry stores a wallet address and a
                boolean only; it does not store names, documents, dates of birth, or
                other identity records on-chain.
              </p>
              <p>
                Eligibility is not transferable between wallets. A wallet may be
                refused or removed where required by the operator&apos;s published
                policy, applicable restrictions, or security controls. Removal never
                blocks a valid refund or payout already owed by the vault.
              </p>
            </Section>

            <Section id="funds">
              <h2>Funds and payouts</h2>
              <p>
                Stakes use native ETH on Robinhood Chain. Network gas is separate
                from stake. The vault has no operator withdrawal, sweep, or drain
                function.
              </p>
              <p>
                Winner backers claim:
                <br />
                <code>
                  complete pool × individual winning stake ÷ all winning stake
                </code>
              </p>
              <p>
                Claims are participant-initiated pull payments. If the round is
                cancelled, each participant claims the exact remaining stake recorded
                for that wallet. If a proposed winner has no backers, the contract
                automatically enters refund mode.
              </p>
            </Section>

            <Section id="result">
              <h2>Result and public review</h2>
              <p>
                The owner contract cannot propose a winner before the three-hour
                challenge ends. A non-zero evidence hash is mandatory. The referenced
                artifact should contain the final percentage ranking, source inputs,
                end timestamp, and exact code commit.
              </p>
              <p>
                During the immutable review window, an incorrect proposal may be
                retracted with a public reason hash. Once that window matures, the
                proposal can no longer be retracted or cancelled and anyone can call
                finalization.
              </p>
            </Section>

            <Section id="risk">
              <h2>Risk notice</h2>
              <ul>
                <li>ETH and any resulting payout can lose value.</li>
                <li>Smart contracts, wallets, RPC providers, and networks can fail.</li>
                <li>Submitted transactions are public and generally irreversible.</li>
                <li>
                  Agent output and past arena performance do not guarantee a future
                  result.
                </li>
                <li>
                  Pool share is not an objective probability and can change while
                  predictions are open.
                </li>
                <li>
                  The sequencer, explorer, website, or external data sources may be
                  delayed or unavailable.
                </li>
              </ul>
              <p>
                Never participate with funds you cannot afford to lose. AgentsInHood
                does not provide financial advice or promise returns.
              </p>
            </Section>

            <Section id="privacy">
              <h2>On-chain privacy</h2>
              <p>
                Wallet addresses, stakes, selected agents, changes, withdrawals,
                claims, and transaction history are public blockchain data. They
                cannot be treated as private or deleted by the website.
              </p>
              <p>
                Do not publish identity documents, private keys, seed phrases, or API
                credentials. Any off-chain eligibility records must be handled outside
                this public repository and registry under the applicable privacy
                process.
              </p>
            </Section>

            <Section id="operator">
              <h2>Operator boundaries</h2>
              <p>
                The owner contract may manage address eligibility, propose a result,
                retract it during review, or cancel an unresolved round under the
                published procedure. It cannot seize participant funds or alter the
                immutable timing and financial limits.
              </p>
              <p>
                AgentsInHood is independent and is not affiliated with or endorsed by
                Robinhood Markets, Uniswap Labs, or the model providers shown in the
                arena.
              </p>
            </Section>
          </Content>
        </Grid>
      </Wrap>

      <Footer>
        <ShieldCheck size={12} /> Verify the contract source and deployment values
        before signing.{" "}
        <a
          href="https://github.com/MildMystic7/AgentsInHood/tree/main/chain"
          target="_blank"
          rel="noreferrer"
        >
          Inspect source <ArrowUpRight size={11} />
        </a>
      </Footer>
    </Shell>
  );
}
