export const MAINNET_WALLET_ADDRESS = "0xD4b34024432612f3a3E9e8Bf3f76b0eD6b956cdb";
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
  dailyBudgetUsd: number;
  dailySpentUsd: number;
  totalBudgetUsd: number;
  totalSpentUsd: number;
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
    dailyBudgetUsd: 10,
    dailySpentUsd: 0,
    totalBudgetUsd: 2,
    totalSpentUsd: 0,
    trades: [],
    connected: false,
  };
}
