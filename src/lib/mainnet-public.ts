export const MAINNET_WALLET_ADDRESS = "0x24380E7cBF708137CE2A7CB471B96850ecE985BA";
export const PREVIOUS_TEST_WALLET_ADDRESS = "0xD4b34024432612f3a3E9e8Bf3f76b0eD6b956cdb";
export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_EXPLORER = "https://robinhoodchain.blockscout.com";

export interface PublicMainnetTrade {
  id: string;
  agentId: string;
  action: "BUY" | "SELL";
  symbol: string;
  usdCents: number;
  status: "planned" | "confirmed" | "rejected" | "failed";
  reason?: string;
  txHash?: string;
  approvalTxHash?: string;
  createdAt: string;
}

export interface PublicMainnetStatus {
  network: string;
  chainId: number;
  mode: "off" | "dry-run" | "live";
  walletAddress: string | null;
  walletBalanceEth: string | null;
  walletBalanceUsdg: string | null;
  positions: { symbol: string; tokenAddress: string; balance: string }[];
  dailyBudgetUsd: number;
  dailyReservedUsd: number;
  dailySpentUsd: number;
  totalBudgetUsd: number;
  totalReservedUsd: number;
  totalSpentUsd: number;
  dailyGasBudgetUsd: number;
  dailyGasReservedUsd: number;
  totalGasBudgetUsd: number;
  totalGasReservedUsd: number;
  minSecondsBetweenTrades: number;
  maxPriceImpactPercent: number;
  slippagePercent: number;
  trades: PublicMainnetTrade[];
  connected: boolean;
}

export function fallbackMainnetStatus(): PublicMainnetStatus {
  return {
    network: "Robinhood Chain",
    chainId: ROBINHOOD_CHAIN_ID,
    mode: "off",
    walletAddress: MAINNET_WALLET_ADDRESS,
    walletBalanceEth: null,
    walletBalanceUsdg: null,
    positions: [],
    dailyBudgetUsd: 10,
    dailyReservedUsd: 0,
    dailySpentUsd: 0,
    totalBudgetUsd: 10,
    totalReservedUsd: 0,
    totalSpentUsd: 0,
    dailyGasBudgetUsd: 0.5,
    dailyGasReservedUsd: 0,
    totalGasBudgetUsd: 1,
    totalGasReservedUsd: 0,
    minSecondsBetweenTrades: 600,
    maxPriceImpactPercent: 10,
    slippagePercent: 10,
    trades: [],
    connected: false,
  };
}
