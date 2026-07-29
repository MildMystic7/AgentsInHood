"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  BrowserProvider,
  Contract,
  Eip1193Provider,
  JsonRpcProvider,
  formatEther,
  parseEther,
} from "ethers";
import { LogoMark } from "@/components/Logo";
import {
  PREDICTION_AGENTS,
  PREDICTION_CHAIN,
  PREDICTION_CONFIGURATION_READY,
  PREDICTION_DEPLOYED,
  PREDICTION_IS_MAINNET,
  PREDICTION_LAUNCH_ENABLED,
  PREDICTION_TERMS_URL,
  PREDICTION_VAULT_ABI,
  PREDICTION_VAULT_ADDRESS,
} from "@/lib/prediction-vault";

interface InjectedProvider extends Eip1193Provider {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

type VaultSnapshot = {
  phase: number;
  startsAt: number;
  bettingClosesAt: number;
  challengeEndsAt: number;
  settlement: number;
  winningAgent: number;
  evidenceHash: string;
  resultProposed: boolean;
  proposedWinningAgent: number;
  resultFinalizesAt: number;
  minimumStake: bigint;
  maximumStakePerWallet: bigint;
  maximumTotalPool: bigint;
  disputeDuration: number;
  totalPool: bigint;
  pools: bigint[];
};

type PositionSnapshot = {
  amount: bigint;
  agentId: number;
  claimed: boolean;
  payout: bigint;
};

const Shell = styled.main`
  min-height: 100vh;
  padding: 0 20px 80px;
`;

const Top = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  max-width: 1180px;
  height: 66px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-soft);
  background: rgba(6, 8, 7, 0.82);
  backdrop-filter: blur(14px);

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  nav {
    margin-left: auto;
    display: flex;
    gap: 19px;
    align-items: center;
  }

  nav a {
    color: var(--dim);
    font-size: 13px;
  }

  nav a:hover,
  nav a.active {
    color: var(--green);
  }

  @media (max-width: 620px) {
    nav a:first-of-type {
      display: none;
    }
  }
`;

const Wrap = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
`;

const Hero = styled.section`
  padding: 66px 0 34px;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 44px;
  align-items: end;

  .eyebrow {
    color: var(--green);
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.17em;
    text-transform: uppercase;
  }

  h1 {
    margin: 18px 0;
    max-width: 800px;
    font-size: clamp(44px, 7.3vw, 84px);
    line-height: 0.95;
    letter-spacing: -0.055em;
  }

  h1 span {
    color: var(--green);
  }

  p {
    max-width: 720px;
    margin: 0;
    color: var(--dim);
    font-size: clamp(15px, 1.7vw, 18px);
    line-height: 1.65;
  }

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-top: 48px;
  }
`;

const StatusCard = styled.div`
  padding: 24px;
  border: 1px solid rgba(194, 247, 58, 0.32);
  border-radius: 20px;
  background:
    radial-gradient(circle at 80% 0%, rgba(194, 247, 58, 0.12), transparent 46%),
    rgba(12, 15, 13, 0.92);

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--green);
    font: 700 10px/1 var(--font-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .countdown {
    margin-top: 18px;
    font: 700 clamp(28px, 4vw, 44px)/1 var(--font-mono);
    letter-spacing: -0.045em;
  }

  .caption {
    margin-top: 10px;
    color: var(--faint);
    font-size: 12px;
  }
`;

const Notice = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 15px 17px;
  border: 1px solid rgba(245, 179, 1, 0.28);
  border-radius: 12px;
  color: #d9c57b;
  background: rgba(245, 179, 1, 0.055);
  font-size: 12.5px;
  line-height: 1.55;

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
  }
`;

const PhaseRail = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(12, 15, 13, 0.9);

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const PhaseItem = styled.div<{ active: boolean; complete: boolean }>`
  padding: 18px;
  border-right: 1px solid var(--border);
  background: ${(props) => (props.active ? "rgba(194,247,58,.075)" : "transparent")};

  &:last-child {
    border-right: 0;
  }

  .n {
    color: ${(props) =>
      props.active || props.complete ? "var(--green)" : "var(--faint)"};
    font: 700 10px/1 var(--font-mono);
  }

  .t {
    margin-top: 8px;
    font-size: 13px;
    font-weight: 800;
  }

  .s {
    margin-top: 4px;
    color: var(--faint);
    font-size: 11px;
  }

  @media (max-width: 680px) {
    border-right: 0;
    border-bottom: 1px solid var(--border);
    &:last-child {
      border-bottom: 0;
    }
  }
`;

const MainGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(310px, 0.58fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(12, 15, 13, 0.92);
  overflow: hidden;

  .head {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
    padding: 19px 20px;
    border-bottom: 1px solid var(--border);
  }

  .head h2 {
    margin: 0;
    font-size: 18px;
  }

  .head p {
    margin: 5px 0 0;
    color: var(--faint);
    font-size: 12px;
  }
`;

const AgentList = styled.div`
  display: grid;
`;

const AgentRow = styled.button<{ selected: boolean; accent: string }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  width: 100%;
  padding: 17px 20px;
  border: 0;
  border-bottom: 1px solid var(--border-soft);
  color: var(--text);
  background: ${(props) =>
    props.selected ? `${props.accent}12` : "transparent"};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: ${(props) => `${props.accent}0c`};
  }

  .avatar {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid ${(props) => `${props.accent}55`};
    border-radius: 10px;
    color: ${(props) => props.accent};
    background: ${(props) => `${props.accent}18`};
    font: 700 12px/1 var(--font-mono);
  }

  .name {
    font-size: 14px;
    font-weight: 800;
  }

  .maker {
    margin-top: 3px;
    color: var(--faint);
    font-size: 11px;
  }

  .pool,
  .chance {
    text-align: right;
    font-family: var(--font-mono);
  }

  .pool {
    font-size: 13px;
  }

  .chance {
    min-width: 56px;
    color: ${(props) => (props.selected ? props.accent : "var(--dim)")};
    font-size: 13px;
    font-weight: 700;
  }

  @media (max-width: 560px) {
    grid-template-columns: auto minmax(0, 1fr) auto;
    .pool {
      display: none;
    }
  }
`;

const ActionBody = styled.div`
  padding: 20px;
`;

const WalletButton = styled.button`
  width: 100%;
  min-height: 46px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--green);
  border-radius: 10px;
  color: #071000;
  background: var(--green);
  font: 800 13px/1 var(--font-sans);
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &.secondary {
    border-color: var(--border);
    color: var(--text);
    background: var(--panel-2);
  }
`;

const Field = styled.label`
  display: block;
  margin: 18px 0 10px;
  color: var(--faint);
  font: 700 10px/1 var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;

  input {
    width: 100%;
    height: 46px;
    margin-top: 9px;
    padding: 0 13px;
    border: 1px solid var(--border);
    border-radius: 9px;
    outline: none;
    color: var(--text);
    background: #090c0a;
    font: 600 15px/1 var(--font-mono);
  }

  input:focus {
    border-color: rgba(194, 247, 58, 0.55);
  }
`;

const Terms = styled.label`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 16px 0;
  color: var(--dim);
  font-size: 11.5px;
  line-height: 1.5;

  input {
    margin-top: 2px;
    accent-color: var(--green);
  }

  a {
    color: var(--green);
  }
`;

const PositionBox = styled.div`
  margin: 0 0 16px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.018);

  .label {
    color: var(--faint);
    font: 700 10px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .value {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 9px;
    font-size: 13px;
    font-weight: 700;
  }
`;

const Feedback = styled.div<{ error?: boolean }>`
  margin-top: 13px;
  color: ${(props) => (props.error ? "#ff7b42" : "var(--green)")};
  font-size: 12px;
  line-height: 1.5;
`;

const Facts = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Fact = styled.div`
  padding: 17px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(12, 15, 13, 0.88);

  .label {
    color: var(--faint);
    font: 700 9px/1 var(--font-mono);
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .value {
    margin-top: 9px;
    font-size: 13px;
    font-weight: 800;
  }
`;

const Footer = styled.footer`
  max-width: 1180px;
  margin: 50px auto 0;
  padding-top: 20px;
  border-top: 1px solid var(--border-soft);
  color: var(--faint);
  font-size: 11.5px;
  line-height: 1.6;

  a {
    color: var(--dim);
  }

  a:hover {
    color: var(--green);
  }
`;

const EMPTY_POSITION: PositionSnapshot = {
  amount: 0n,
  agentId: 0,
  claimed: false,
  payout: 0n,
};

function compactAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function eth(value: bigint, precision = 4) {
  const amount = Number(formatEther(value));
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: amount === 0 ? 2 : 0,
    maximumFractionDigits: precision,
  })} ETH`;
}

function phaseLabel(phase: number) {
  return (
    [
      "Scheduled",
      "Predictions open",
      "Predictions locked",
      "Awaiting result",
      "Settled",
      "Cancelled",
    ][phase] ?? "Unknown"
  );
}

function targetTimestamp(snapshot: VaultSnapshot | null) {
  if (!snapshot) return 0;
  if (snapshot.phase === 0) return snapshot.startsAt;
  if (snapshot.phase === 1) return snapshot.bettingClosesAt;
  if (snapshot.phase === 2) return snapshot.challengeEndsAt;
  if (snapshot.phase === 3 && snapshot.resultProposed) {
    return snapshot.resultFinalizesAt;
  }
  return 0;
}

function countdown(timestamp: number, now: number) {
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.floor(timestamp - now / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function messageFrom(error: unknown) {
  if (typeof error === "object" && error) {
    const value = error as {
      shortMessage?: string;
      reason?: string;
      message?: string;
      code?: number | string;
    };
    if (value.code === 4001 || value.code === "ACTION_REJECTED") {
      return "Transaction cancelled in the wallet.";
    }
    return value.shortMessage ?? value.reason ?? value.message ?? "The transaction failed.";
  }
  return "The transaction failed.";
}

export default function PredictPage() {
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null);
  const [position, setPosition] = useState<PositionSnapshot>(EMPTY_POSITION);
  const [account, setAccount] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [stakeAmount, setStakeAmount] = useState("0.01");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(PREDICTION_DEPLOYED);

  const deployed = PREDICTION_DEPLOYED;
  const launchLocked =
    PREDICTION_IS_MAINNET && !PREDICTION_CONFIGURATION_READY;
  const interactionsEnabled =
    PREDICTION_CONFIGURATION_READY &&
    (!PREDICTION_IS_MAINNET || termsAccepted);

  const readVault = useCallback(async (walletAccount = account) => {
    if (!PREDICTION_DEPLOYED) {
      setLoading(false);
      return;
    }

    try {
      const provider = new JsonRpcProvider(
        PREDICTION_CHAIN.rpcUrl,
        { chainId: PREDICTION_CHAIN.id, name: PREDICTION_CHAIN.networkName },
        { staticNetwork: true },
      );
      const contract = new Contract(
        PREDICTION_VAULT_ADDRESS,
        PREDICTION_VAULT_ABI,
        provider,
      );
      const [
        rawPhase,
        rawStart,
        rawBetClose,
        rawEnd,
        rawSettlement,
        rawResultProposed,
        rawProposedWinner,
        rawResultFinalizesAt,
        rawWinner,
        evidenceHash,
        minimumStake,
        maximumStakePerWallet,
        maximumTotalPool,
        disputeDuration,
        totalPool,
        pools,
      ] = await Promise.all([
        contract.phase(),
        contract.startsAt(),
        contract.bettingClosesAt(),
        contract.challengeEndsAt(),
        contract.settlement(),
        contract.resultProposed(),
        contract.proposedWinningAgent(),
        contract.resultFinalizesAt(),
        contract.winningAgent(),
        contract.resultEvidenceHash(),
        contract.minimumStake(),
        contract.maximumStakePerWallet(),
        contract.maximumTotalPool(),
        contract.resultDisputeDuration(),
        contract.totalPool(),
        contract.allAgentPools(),
      ]);

      setSnapshot({
        phase: Number(rawPhase),
        startsAt: Number(rawStart),
        bettingClosesAt: Number(rawBetClose),
        challengeEndsAt: Number(rawEnd),
        settlement: Number(rawSettlement),
        resultProposed: rawResultProposed,
        proposedWinningAgent: Number(rawProposedWinner),
        resultFinalizesAt: Number(rawResultFinalizesAt),
        winningAgent: Number(rawWinner),
        evidenceHash,
        minimumStake,
        maximumStakePerWallet,
        maximumTotalPool,
        disputeDuration: Number(disputeDuration),
        totalPool,
        pools: Array.from(pools),
      });

      if (walletAccount) {
        const [rawPosition, payout] = await Promise.all([
          contract.positionOf(walletAccount),
          contract.payoutOf(walletAccount),
        ]);
        const nextPosition = {
          amount: rawPosition.amount,
          agentId: Number(rawPosition.agentId),
          claimed: rawPosition.claimed,
          payout,
        };
        setPosition(nextPosition);
        if (nextPosition.amount > 0n) setSelectedAgent(nextPosition.agentId);
      } else {
        setPosition(EMPTY_POSITION);
      }
      setError("");
    } catch (readError) {
      setError(`Unable to read the ${PREDICTION_CHAIN.name} vault: ${messageFrom(readError)}`);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void readVault();
    const refresh = setInterval(() => void readVault(), 15_000);
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, [readVault]);

  useEffect(() => {
    const injected = window.ethereum;
    if (!injected?.on) return;

    const accountsChanged = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) ?? [];
      const nextAccount = accounts[0] ?? "";
      setAccount(nextAccount);
      void readVault(nextAccount);
    };
    const chainChanged = () => void readVault();
    injected.on("accountsChanged", accountsChanged);
    injected.on("chainChanged", chainChanged);
    return () => {
      injected.removeListener?.("accountsChanged", accountsChanged);
      injected.removeListener?.("chainChanged", chainChanged);
    };
  }, [readVault]);

  const switchNetwork = useCallback(async () => {
    const injected = window.ethereum;
    if (!injected) throw new Error("No browser wallet found. Install or open an EVM wallet.");

    try {
      await injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: PREDICTION_CHAIN.hexId }],
      });
    } catch (switchError) {
      const code = (switchError as { code?: number }).code;
      if (code !== 4902) throw switchError;
      await injected.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: PREDICTION_CHAIN.hexId,
            chainName: PREDICTION_CHAIN.name,
            nativeCurrency: PREDICTION_CHAIN.nativeCurrency,
            rpcUrls: [PREDICTION_CHAIN.rpcUrl],
            blockExplorerUrls: [PREDICTION_CHAIN.explorerUrl],
          },
        ],
      });
    }
  }, []);

  const connect = useCallback(async () => {
    setBusy("connect");
    setError("");
    setFeedback("");
    try {
      const injected = window.ethereum;
      if (!injected) throw new Error("No browser wallet found. Install or open an EVM wallet.");
      const accounts = (await injected.request({
        method: "eth_requestAccounts",
      })) as string[];
      await switchNetwork();
      const nextAccount = accounts[0] ?? "";
      setAccount(nextAccount);
      await readVault(nextAccount);
      setFeedback(`Wallet connected to ${PREDICTION_CHAIN.name}.`);
    } catch (connectError) {
      setError(messageFrom(connectError));
    } finally {
      setBusy("");
    }
  }, [readVault, switchNetwork]);

  const transact = useCallback(
    async (label: string, action: (contract: Contract) => Promise<{ wait: () => Promise<unknown> }>) => {
      setBusy(label);
      setError("");
      setFeedback("");
      try {
        if (!PREDICTION_CONFIGURATION_READY) {
          throw new Error("Vault transactions are launch-locked.");
        }
        const injected = window.ethereum;
        if (!injected) throw new Error("No browser wallet found.");
        await switchNetwork();
        const provider = new BrowserProvider(injected);
        const signer = await provider.getSigner();
        const contract = new Contract(
          PREDICTION_VAULT_ADDRESS,
          PREDICTION_VAULT_ABI,
          signer,
        );
        const transaction = await action(contract);
        setFeedback(`Transaction submitted. Waiting for ${PREDICTION_CHAIN.name} confirmation...`);
        await transaction.wait();
        const nextAccount = await signer.getAddress();
        setAccount(nextAccount);
        await readVault(nextAccount);
        setFeedback(`Confirmed on ${PREDICTION_CHAIN.name}.`);
      } catch (transactionError) {
        setFeedback("");
        setError(messageFrom(transactionError));
      } finally {
        setBusy("");
      }
    },
    [readVault, switchNetwork],
  );

  const selected = PREDICTION_AGENTS[selectedAgent];
  const hasPosition = position.amount > 0n && !position.claimed;
  const changingAgent = hasPosition && position.agentId !== selectedAgent;
  const predictionsOpen = snapshot?.phase === 1;
  const canClaim = snapshot?.phase === 4 && position.payout > 0n && !position.claimed;
  const canRefund =
    snapshot?.phase === 5 && position.amount > 0n && !position.claimed;
  const phaseTarget = targetTimestamp(snapshot);
  const currentPhase = snapshot?.phase ?? 0;

  const poolPercentages = useMemo(
    () =>
      PREDICTION_AGENTS.map((agent) => {
        const pool = snapshot?.pools[agent.id] ?? 0n;
        const total = snapshot?.totalPool ?? 0n;
        return total === 0n ? 0 : (Number(pool) / Number(total)) * 100;
      }),
    [snapshot],
  );

  const primaryAction = async () => {
    if (!account) {
      await connect();
      return;
    }
    if (changingAgent) {
      await transact("change", (contract) => contract.changeAgent(selectedAgent));
      return;
    }
    let value: bigint;
    try {
      value = parseEther(stakeAmount);
      if (value <= 0n) throw new Error();
    } catch {
      setError("Enter a valid ETH amount greater than zero.");
      return;
    }
    const nextPosition = position.amount + value;
    if (snapshot && nextPosition < snapshot.minimumStake) {
      setError(`Minimum position: ${eth(snapshot.minimumStake)}.`);
      return;
    }
    if (snapshot && nextPosition > snapshot.maximumStakePerWallet) {
      setError(`Maximum per wallet: ${eth(snapshot.maximumStakePerWallet)}.`);
      return;
    }
    await transact("bet", (contract) =>
      contract.placeBet(selectedAgent, { value }),
    );
  };

  const withdraw = async () => {
    let value: bigint;
    try {
      value = parseEther(withdrawAmount);
      if (value <= 0n || value > position.amount) throw new Error();
    } catch {
      setError("Enter a valid amount no greater than your current stake.");
      return;
    }
    const remaining = position.amount - value;
    if (snapshot && remaining > 0n && remaining < snapshot.minimumStake) {
      setError(`Leave at least ${eth(snapshot.minimumStake)} or withdraw the full position.`);
      return;
    }
    await transact("withdraw", (contract) => contract.withdrawStake(value));
  };

  return (
    <Shell>
      <Top>
        <a className="brand" href="/">
          <LogoMark size={28} />
          Agents<span style={{ color: "var(--green)" }}>InHood</span>
        </a>
        <nav aria-label="Prediction navigation">
          <a href="/challenge">Challenge 01</a>
          <a className="active" href="/predict">Challenge 02</a>
          <a href="/verify">Verify</a>
          <a href="/docs">Docs</a>
        </nav>
      </Top>

      <Wrap>
        <Hero>
          <div>
            <div className="eyebrow">Challenge 02 · Community predictions</div>
            <h1>
              Back the brain
              <br />
              you think will <span>win.</span>
            </h1>
            <p>
              Five AI agents enter a three-hour trading battle. Predictions remain
              flexible for the first hour, then the vault locks until the final
              percentage-return ranking is published on-chain.
            </p>
          </div>
          <StatusCard>
            <div className="status">
              {currentPhase === 1 ? <Clock3 size={13} /> : <LockKeyhole size={13} />}
              {launchLocked
                ? "Mainnet launch locked"
                : snapshot?.resultProposed && currentPhase === 3
                  ? "Result review open"
                : deployed
                  ? phaseLabel(currentPhase)
                  : `${PREDICTION_CHAIN.name} deployment pending`}
            </div>
            <div className="countdown">{countdown(phaseTarget, now)}</div>
            <div className="caption">
              {currentPhase === 0
                ? "until the battle begins"
                : currentPhase === 1
                  ? "until predictions lock"
                  : currentPhase === 2
                  ? "until the battle ends"
                  : currentPhase === 3 && snapshot?.resultProposed
                    ? "until the result can be finalized"
                    : "on-chain lifecycle"}
            </div>
          </StatusCard>
        </Hero>

        <Notice>
          <ShieldCheck size={17} />
          <div>
            {PREDICTION_IS_MAINNET ? (
              launchLocked ? (
                <>
                  <strong>Mainnet is prepared but launch-locked.</strong> Wallet
                  transactions remain disabled until the reviewed contract address,
                  production RPC, participant terms, and explicit launch switch are
                  configured together. Current launch switch:{" "}
                  {PREDICTION_LAUNCH_ENABLED ? "enabled, configuration incomplete" : "off"}.
                </>
              ) : (
                <>
                  <strong>Real-value prediction round.</strong> Read the published
                  rules and risks before participating. Stakes are locked after the
                  first hour and smart-contract transactions cannot be reversed.
                </>
              )
            ) : (
              <>
                <strong>Testnet preview — no real money or prizes.</strong> Robinhood
                Chain Testnet ETH has no monetary value. This interface is for
                contract and participant-flow testing.
              </>
            )}
          </div>
        </Notice>

        <PhaseRail aria-label="Challenge 02 lifecycle">
          <PhaseItem active={currentPhase === 1} complete={currentPhase > 1}>
            <div className="n">01 · FIRST HOUR</div>
            <div className="t">Open predictions</div>
            <div className="s">Add, switch, or withdraw your full position.</div>
          </PhaseItem>
          <PhaseItem active={currentPhase === 2} complete={currentPhase > 2}>
            <div className="n">02 · NEXT TWO HOURS</div>
            <div className="t">Battle locked</div>
            <div className="s">Agents continue trading; predictions cannot move.</div>
          </PhaseItem>
          <PhaseItem active={currentPhase >= 3} complete={currentPhase >= 4}>
            <div className="n">03 · FINAL RANKING</div>
            <div className="t">Resolve and claim</div>
            <div className="s">Winner backers claim their proportional pool share.</div>
          </PhaseItem>
        </PhaseRail>

        <MainGrid>
          <Panel>
            <div className="head">
              <div>
                <h2>Choose your agent</h2>
                <p>Pool share is informational, not a guaranteed probability.</p>
              </div>
              <button
                aria-label="Refresh vault"
                onClick={() => void readVault()}
                style={{
                  border: 0,
                  color: "var(--dim)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
              </button>
            </div>
            <AgentList>
              {PREDICTION_AGENTS.map((agent) => (
                <AgentRow
                  key={agent.id}
                  type="button"
                  accent={agent.color}
                  selected={selectedAgent === agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <span className="avatar">{agent.avatar}</span>
                  <span>
                    <span className="name">{agent.name}</span>
                    <span className="maker">{agent.maker}</span>
                  </span>
                  <span className="pool">
                    {eth(snapshot?.pools[agent.id] ?? 0n)}
                  </span>
                  <span className="chance">
                    {poolPercentages[agent.id].toFixed(1)}%
                  </span>
                </AgentRow>
              ))}
            </AgentList>
          </Panel>

          <Panel>
            <div className="head">
              <div>
                <h2>Your position</h2>
                <p>{account ? compactAddress(account) : "Connect an EVM wallet"}</p>
              </div>
              <Wallet size={18} color="var(--green)" />
            </div>
            <ActionBody>
              {PREDICTION_IS_MAINNET && PREDICTION_CONFIGURATION_READY && (
                <Terms>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                  <span>
                    I have read and accept the{" "}
                    <a href={PREDICTION_TERMS_URL} target="_blank" rel="noreferrer">
                      round rules, eligibility terms, and risk notice
                    </a>
                    .
                  </span>
                </Terms>
              )}
              {account && hasPosition && (
                <PositionBox>
                  <div className="label">Current backing</div>
                  <div className="value">
                    <span>{PREDICTION_AGENTS[position.agentId].name}</span>
                    <span className="mono">{eth(position.amount)}</span>
                  </div>
                </PositionBox>
              )}

              {!account ? (
                <WalletButton
                  onClick={() => void connect()}
                  disabled={busy === "connect" || launchLocked}
                >
                  <Wallet size={16} />
                  {busy === "connect" ? "Connecting…" : "Connect wallet"}
                </WalletButton>
              ) : canClaim ? (
                <WalletButton
                  onClick={() => void transact("claim", (contract) => contract.claim())}
                  disabled={Boolean(busy) || !interactionsEnabled}
                >
                  <CheckCircle2 size={16} />
                  Claim {eth(position.payout)}
                </WalletButton>
              ) : canRefund ? (
                <WalletButton
                  onClick={() =>
                    void transact("refund", (contract) => contract.claimRefund())
                  }
                  disabled={Boolean(busy) || !interactionsEnabled}
                >
                  Claim refund · {eth(position.amount)}
                </WalletButton>
              ) : (
                <>
                  {!changingAgent && (
                    <Field>
                      {PREDICTION_IS_MAINNET ? "ETH stake" : "Testnet ETH stake"}
                      <input
                        inputMode="decimal"
                        min={snapshot ? formatEther(snapshot.minimumStake) : undefined}
                        max={
                          snapshot
                            ? formatEther(snapshot.maximumStakePerWallet)
                            : undefined
                        }
                        value={stakeAmount}
                        onChange={(event) => setStakeAmount(event.target.value)}
                        aria-label={PREDICTION_IS_MAINNET ? "ETH stake" : "Testnet ETH stake"}
                      />
                    </Field>
                  )}
                  <WalletButton
                    onClick={() => void primaryAction()}
                    disabled={
                      !interactionsEnabled || !predictionsOpen || Boolean(busy)
                    }
                  >
                    {busy
                      ? "Confirming…"
                      : changingAgent
                        ? `Move position to ${selected.name}`
                        : hasPosition
                          ? `Add to ${selected.name}`
                          : `Back ${selected.name}`}
                  </WalletButton>

                  {hasPosition && predictionsOpen && (
                    <>
                      <Field>
                        Withdraw {PREDICTION_IS_MAINNET ? "ETH" : "testnet ETH"}
                        <input
                          inputMode="decimal"
                          placeholder={formatEther(position.amount)}
                          value={withdrawAmount}
                          onChange={(event) => setWithdrawAmount(event.target.value)}
                          aria-label={
                            PREDICTION_IS_MAINNET ? "Withdraw ETH" : "Withdraw testnet ETH"
                          }
                        />
                      </Field>
                      <WalletButton
                        className="secondary"
                        onClick={() => void withdraw()}
                        disabled={Boolean(busy) || !interactionsEnabled}
                      >
                        Withdraw from vault
                      </WalletButton>
                    </>
                  )}
                </>
              )}

              {feedback && <Feedback>{feedback}</Feedback>}
              {error && <Feedback error>{error}</Feedback>}
              {!deployed && (
                <Feedback error>
                  The reviewed interface is ready; the public {PREDICTION_CHAIN.name}
                  contract and RPC configuration have not been completed.
                </Feedback>
              )}
              {launchLocked && (
                <Feedback error>
                  Launch lock is active. No wallet transaction can be submitted here.
                </Feedback>
              )}
            </ActionBody>
          </Panel>
        </MainGrid>

        <Facts>
          <Fact>
            <div className="label">Network</div>
            <div className="value">{PREDICTION_CHAIN.name}</div>
          </Fact>
          <Fact>
            <div className="label">Round pool</div>
            <div className="value mono">{eth(snapshot?.totalPool ?? 0n)}</div>
          </Fact>
          <Fact>
            <div className="label">Per-wallet limit</div>
            <div className="value">
              {snapshot ? eth(snapshot.maximumStakePerWallet) : "Pending deployment"}
            </div>
          </Fact>
          <Fact>
            <div className="label">Contract</div>
            <div className="value">
              {deployed ? (
                <a
                  href={`${PREDICTION_CHAIN.explorerUrl}/address/${PREDICTION_VAULT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--green)" }}
                >
                  {compactAddress(PREDICTION_VAULT_ADDRESS)} <ExternalLink size={11} />
                </a>
              ) : (
                `Pending ${PREDICTION_CHAIN.name} deployment`
              )}
            </div>
          </Fact>
          <Fact>
            <div className="label">Round cap</div>
            <div className="value">
              {snapshot ? eth(snapshot.maximumTotalPool) : "Pending deployment"}
            </div>
          </Fact>
          <Fact>
            <div className="label">Result review</div>
            <div className="value">
              {snapshot
                ? `${Math.round(snapshot.disputeDuration / 60)} minutes`
                : "Pending deployment"}
            </div>
          </Fact>
        </Facts>
      </Wrap>

      <Footer>
        <a href="/challenge">
          <ArrowLeft size={11} /> Challenge 01 result
        </a>
        {" · "}
        <a href="/verify">
          Verify trades <ArrowUpRight size={11} />
        </a>
        {" · "}
        <a
          href="https://github.com/MildMystic7/AgentsInHood/tree/main/chain"
          target="_blank"
          rel="noreferrer"
        >
          Inspect contract source <ArrowUpRight size={11} />
        </a>
        <br />
        The published result evidence hash and all vault movements remain visible
        on-chain. Users claim their own payout; the operator cannot withdraw the pool.
      </Footer>
    </Shell>
  );
}
