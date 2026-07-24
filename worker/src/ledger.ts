import { Contract, JsonRpcProvider, Wallet } from "ethers";

const ABI = [
  "function logTrade(string agentId, string action, string symbol, uint256 usdCents, string reasoning) external",
  "event TradeLogged(string agentId, string action, string symbol, uint256 usdCents, string reasoning, uint256 timestamp)",
];

let contract: Contract | null = null;
let wallet: Wallet | null = null;

export function ledgerConfigured(): boolean {
  return Boolean(process.env.WORKER_PRIVATE_KEY && process.env.LEDGER_CONTRACT_ADDRESS);
}

// Robinhood Chain testnet — an Arbitrum Orbit L2, chain id 46630.
const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

function getContract(): Contract {
  if (contract) return contract;
  const rpcUrl = process.env.ROBINHOOD_TESTNET_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
  // Explicit network avoids ethers' auto-detection dance for a chain it doesn't ship presets for.
  const provider = new JsonRpcProvider(rpcUrl, { chainId: ROBINHOOD_TESTNET_CHAIN_ID, name: "robinhood-testnet" });
  wallet = new Wallet(process.env.WORKER_PRIVATE_KEY!, provider);
  contract = new Contract(process.env.LEDGER_CONTRACT_ADDRESS!, ABI, wallet);
  return contract;
}

// All five agents share ONE wallet, and at the fast cadence they fire almost
// simultaneously — so we MUST serialize on-chain sends. Two safeguards:
//   1) a promise-chain mutex so only one tx is built/sent at a time, and
//   2) a locally-managed nonce (incremented per send) so concurrent agents
//      can't grab the same nonce and collide ("nonce too low" / NONCE_EXPIRED).
// On any failure the managed nonce is cleared so the next send re-syncs from
// the chain's pending count.
let sendQueue: Promise<unknown> = Promise.resolve();
let managedNonce: number | null = null;

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = sendQueue.then(fn, fn);
  sendQueue = run.then(() => undefined, () => undefined); // keep the chain alive regardless of outcome
  return run;
}

/**
 * Writes one trade decision permanently on-chain (Robinhood Chain testnet).
 * Returns the transaction hash on success, or null if unconfigured/failed —
 * never throws, so a chain hiccup never takes down the agent loop itself.
 * Serialized: safe to call concurrently from all five agent loops.
 */
export async function logTradeOnChain(agentId: string, action: "BUY" | "SELL", symbol: string, usdAmount: number, reasoning: string): Promise<string | null> {
  if (!ledgerConfigured()) return null;
  return runExclusive(async () => {
    try {
      const c = getContract();
      const usdCents = Math.round(usdAmount * 100);
      if (managedNonce === null) managedNonce = await wallet!.getNonce("pending");
      const tx = await c.logTrade(agentId, action, symbol, usdCents, reasoning.slice(0, 280), { nonce: managedNonce });
      managedNonce++;
      const receipt = await tx.wait();
      return receipt?.hash ?? tx.hash;
    } catch (err) {
      managedNonce = null; // force a fresh nonce read on the next attempt
      console.error(`[ledger] failed to log ${agentId} ${action} ${symbol}:`, (err as Error).message);
      return null;
    }
  });
}

export function explorerTxUrl(hash: string): string {
  return `https://explorer.testnet.chain.robinhood.com/tx/${hash}`;
}
