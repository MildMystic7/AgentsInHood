import { isAddress } from "ethers";

export const PREDICTION_CHAIN = {
  id: 46_630,
  hexId: "0xb626",
  name: "Robinhood Chain Testnet",
  nativeCurrency: {
    name: "Testnet Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
} as const;

const configuredAddress = process.env.NEXT_PUBLIC_PREDICTION_VAULT_ADDRESS?.trim() ?? "";

export const PREDICTION_VAULT_ADDRESS = isAddress(configuredAddress)
  ? configuredAddress
  : "";

export const PREDICTION_AGENTS = [
  {
    id: 0,
    key: "gemini",
    name: "Gemini 3.1 Pro",
    maker: "Google",
    avatar: "Ge",
    color: "#4285f4",
  },
  {
    id: 1,
    key: "minimax",
    name: "MiniMax M2.5",
    maker: "MiniMax",
    avatar: "M",
    color: "#e5484d",
  },
  {
    id: 2,
    key: "gpt",
    name: "GPT-5.4",
    maker: "OpenAI",
    avatar: "G",
    color: "#10a37f",
  },
  {
    id: 3,
    key: "claude",
    name: "Claude Opus 4.8",
    maker: "Anthropic",
    avatar: "C",
    color: "#d97757",
  },
  {
    id: 4,
    key: "fable",
    name: "Fable 5",
    maker: "Independent",
    avatar: "F5",
    color: "#f5b301",
  },
] as const;

export const PREDICTION_VAULT_ABI = [
  "function phase() view returns (uint8)",
  "function startsAt() view returns (uint64)",
  "function bettingClosesAt() view returns (uint64)",
  "function challengeEndsAt() view returns (uint64)",
  "function settlement() view returns (uint8)",
  "function winningAgent() view returns (uint8)",
  "function resultEvidenceHash() view returns (bytes32)",
  "function totalPool() view returns (uint256)",
  "function allAgentPools() view returns (uint256[5])",
  "function positionOf(address account) view returns (tuple(uint128 amount,uint8 agentId,bool claimed))",
  "function payoutOf(address account) view returns (uint256)",
  "function placeBet(uint8 agentId) payable",
  "function changeAgent(uint8 newAgentId)",
  "function withdrawStake(uint256 amount)",
  "function claim() returns (uint256 payout)",
  "function claimRefund() returns (uint256 amount)",
  "event BetPlaced(address indexed account,uint8 indexed agentId,uint256 addedAmount,uint256 positionAmount)",
  "event AgentChanged(address indexed account,uint8 indexed previousAgent,uint8 indexed newAgent)",
  "event StakeWithdrawn(address indexed account,uint8 indexed agentId,uint256 amount)",
  "event RoundResolved(uint8 indexed winningAgent,bytes32 indexed evidenceHash,uint256 totalPool)",
  "event RoundCancelled(bytes32 indexed evidenceHash,uint256 refundablePool)",
  "event PayoutClaimed(address indexed account,uint8 indexed agentId,uint256 stake,uint256 payout)",
  "event RefundClaimed(address indexed account,uint256 amount)",
] as const;
