import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatEther,
  parseEther,
  parseUnits,
} from "ethers";
import { kvConfigured, kvGet, kvSet } from "./kv";

export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_RPC_URL =
  process.env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const ROBINHOOD_EXPLORER_URL = "https://robinhoodchain.blockscout.com";
export const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";
export const UNISWAP_UNIVERSAL_ROUTER = "0x8876789976decbfcbbbe364623c63652db8c0904";

type MainnetMode = "off" | "dry-run" | "live";
type TradeAction = "BUY" | "SELL";
type TradeStatus = "planned" | "confirmed" | "rejected" | "failed";

export interface MainnetTradeRecord {
  id: string;
  agentId: string;
  action: TradeAction;
  symbol: string;
  usdCents: number;
  status: TradeStatus;
  reason?: string;
  txHash?: string;
  approvalTxHash?: string;
  createdAt: string;
}

export interface MainnetExecutionResult {
  mode: MainnetMode;
  status: TradeStatus;
  reason?: string;
  txHash?: string;
  approvalTxHash?: string;
}

interface MainnetState {
  day: string;
  daySpentCents: number;
  totalSpentCents: number;
  trades: MainnetTradeRecord[];
}

interface RobinhoodAsset {
  tokenSymbol: string;
  status: string;
  currentMultiplier: string;
  deployments: { contractAddress: string; chainId: number }[];
}

interface QuoteResponse {
  routing: string;
  quote: {
    chainId?: number;
    swapper?: string;
    priceImpact?: number | string;
    gasFeeUSD?: string;
    txFailureReasons?: string[];
    input?: { amount?: string; token?: string };
    output?: { token?: string; recipient?: string };
  };
  permitData?: {
    domain: Record<string, unknown>;
    types: Record<string, { name: string; type: string }[]>;
    values: Record<string, unknown>;
  } | null;
}

interface SwapResponse {
  swap: {
    to: string;
    from?: string;
    data: string;
    value?: string;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

const STATE_KEY = "agentsinhood:mainnet:v1";
const ASSET_CACHE_MS = 60 * 60 * 1000;
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
];

let assetCache: { expiresAt: number; assets: RobinhoodAsset[] } | null = null;
let memoryState: MainnetState | null = null;
let executionQueue: Promise<unknown> = Promise.resolve();

function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function mainnetMode(): MainnetMode {
  const value = String(process.env.MAINNET_MODE || "off").toLowerCase();
  return value === "live" || value === "dry-run" ? value : "off";
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function freshState(): MainnetState {
  return { day: utcDay(), daySpentCents: 0, totalSpentCents: 0, trades: [] };
}

async function loadMainnetState(): Promise<MainnetState> {
  if (kvConfigured()) {
    const raw = await kvGet(STATE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MainnetState;
        if (parsed && Array.isArray(parsed.trades)) {
          if (parsed.day !== utcDay()) {
            parsed.day = utcDay();
            parsed.daySpentCents = 0;
          }
          memoryState = parsed;
          return parsed;
        }
      } catch {
        // Ignore malformed state and start from a safe empty budget.
      }
    }
  }
  if (!memoryState) memoryState = freshState();
  if (memoryState.day !== utcDay()) {
    memoryState.day = utcDay();
    memoryState.daySpentCents = 0;
  }
  return memoryState;
}

async function saveMainnetState(state: MainnetState): Promise<void> {
  state.trades = state.trades.slice(-200);
  memoryState = state;
  if (kvConfigured()) await kvSet(STATE_KEY, JSON.stringify(state));
}

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = executionQueue.then(fn, fn);
  executionQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function configuredWallet(): Wallet | null {
  const key = process.env.MAINNET_PRIVATE_KEY;
  if (!key) return null;
  try {
    return new Wallet(key);
  } catch {
    throw new Error("MAINNET_PRIVATE_KEY is not a valid EVM private key");
  }
}

export function mainnetWalletAddress(): string | null {
  return configuredWallet()?.address || process.env.MAINNET_WALLET_ADDRESS || null;
}

export function assertMainnetConfiguration(): void {
  const mode = mainnetMode();
  const tradeMax = envInt("MAINNET_MAX_TRADE_USD_CENTS", 5);
  const dailyMax = envInt("MAINNET_DAILY_BUDGET_USD_CENTS", 1000);
  const totalMax = envInt("MAINNET_TOTAL_BUDGET_USD_CENTS", 200);

  if (tradeMax < 1 || tradeMax > 25) {
    throw new Error("MAINNET_MAX_TRADE_USD_CENTS must be between 1 and 25");
  }
  if (dailyMax < tradeMax || dailyMax > 1000) {
    throw new Error("MAINNET_DAILY_BUDGET_USD_CENTS must be between the trade maximum and 1000");
  }
  if (totalMax < tradeMax) {
    throw new Error("MAINNET_TOTAL_BUDGET_USD_CENTS must cover at least one trade");
  }
  if (mode === "live") {
    if (process.env.MAINNET_LIVE_CONFIRM !== "I_UNDERSTAND_REAL_FUNDS") {
      throw new Error("Live mode is locked. Set MAINNET_LIVE_CONFIRM=I_UNDERSTAND_REAL_FUNDS after review");
    }
    if (!configuredWallet()) throw new Error("Live mode requires MAINNET_PRIVATE_KEY");
    if (!process.env.UNISWAP_API_KEY) throw new Error("Live mode requires UNISWAP_API_KEY");
    if (!kvConfigured()) throw new Error("Live mode requires persistent KV for budget and idempotency state");
  }
}

async function fetchAssets(): Promise<RobinhoodAsset[]> {
  if (assetCache && assetCache.expiresAt > Date.now()) return assetCache.assets;
  const response = await fetch("https://api.robinhood.com/rhj/assets", {
    headers: { accept: "application/json", "user-agent": "AgentsInHood/1.0" },
  });
  if (!response.ok) throw new Error(`Robinhood asset registry returned ${response.status}`);
  const body = (await response.json()) as { assets?: RobinhoodAsset[] };
  const assets = Array.isArray(body.assets) ? body.assets : [];
  assetCache = { expiresAt: Date.now() + ASSET_CACHE_MS, assets };
  return assets;
}

async function resolveStockToken(symbol: string): Promise<{ address: string; multiplier: number }> {
  const assets = await fetchAssets();
  const asset = assets.find(
    (candidate) =>
      candidate.tokenSymbol.toUpperCase() === symbol.toUpperCase() &&
      candidate.status === "ASSET_STATUS_ACTIVE",
  );
  const deployment = asset?.deployments.find((item) => item.chainId === ROBINHOOD_CHAIN_ID);
  if (!asset || !deployment) throw new Error(`${symbol} has no active Robinhood Chain mainnet deployment`);
  const multiplier = Number(asset.currentMultiplier || "1");
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error(`${symbol} has an invalid multiplier`);
  return { address: deployment.contractAddress, multiplier };
}

async function uniswapRequest<T>(path: string, body: unknown): Promise<T> {
  const apiKey = process.env.UNISWAP_API_KEY;
  if (!apiKey) throw new Error("UNISWAP_API_KEY is not configured");
  const response = await fetch(`https://trade-api.gateway.uniswap.org/v1${path}`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "x-universal-router-version": "2.1.1",
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 240);
    try {
      const parsed = JSON.parse(text) as { detail?: string; errorCode?: string };
      detail = parsed.detail || parsed.errorCode || detail;
    } catch {
      // Keep the bounded text response.
    }
    throw new Error(`Uniswap ${path} returned ${response.status}: ${detail}`);
  }
  return JSON.parse(text) as T;
}

function validateQuote(
  quoteResponse: QuoteResponse,
  walletAddress: string,
  tokenIn: string,
  tokenOut: string,
): void {
  const { quote, routing } = quoteResponse;
  if (!["CLASSIC", "WRAP", "UNWRAP"].includes(routing)) {
    throw new Error(`Unsupported route ${routing}; only atomic AMM routes are allowed`);
  }
  if (quote.chainId !== undefined && quote.chainId !== ROBINHOOD_CHAIN_ID) {
    throw new Error(`Quote is for chain ${quote.chainId}, expected ${ROBINHOOD_CHAIN_ID}`);
  }
  if (quote.swapper && quote.swapper.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error("Quote swapper does not match the configured wallet");
  }
  if (quote.input?.token && quote.input.token.toLowerCase() !== tokenIn.toLowerCase()) {
    throw new Error("Quote input token does not match the requested asset");
  }
  if (quote.output?.token && quote.output.token.toLowerCase() !== tokenOut.toLowerCase()) {
    throw new Error("Quote output token does not match the requested asset");
  }
  if (quote.output?.recipient && quote.output.recipient.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error("Quote recipient does not match the configured wallet");
  }
  if ((quote.txFailureReasons || []).length > 0) {
    throw new Error(`Quote simulation failed: ${quote.txFailureReasons!.join(", ")}`);
  }
  const impactPercent = Number(quote.priceImpact || 0);
  const maxImpactPercent = envNumber("MAINNET_MAX_PRICE_IMPACT_PERCENT", 1);
  if (!Number.isFinite(impactPercent) || impactPercent > maxImpactPercent) {
    throw new Error(`Price impact ${impactPercent}% exceeds ${maxImpactPercent}%`);
  }
  const gasUsd = Number(quote.gasFeeUSD || 0);
  const maxGasUsd = envInt("MAINNET_MAX_GAS_USD_CENTS", 5) / 100;
  if (Number.isFinite(gasUsd) && gasUsd > maxGasUsd) {
    throw new Error(`Estimated gas $${gasUsd.toFixed(4)} exceeds $${maxGasUsd.toFixed(2)}`);
  }
}

function txRequest(swap: SwapResponse["swap"]): {
  to: string;
  data: string;
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
} {
  if (swap.to.toLowerCase() !== UNISWAP_UNIVERSAL_ROUTER.toLowerCase()) {
    throw new Error(`Swap target ${swap.to} is not the pinned Universal Router`);
  }
  if (!swap.data || swap.data === "0x") throw new Error("Swap calldata is empty");
  return {
    to: swap.to,
    data: swap.data,
    value: swap.value ? BigInt(swap.value) : undefined,
    gasLimit: swap.gasLimit ? BigInt(swap.gasLimit) : undefined,
    gasPrice: swap.gasPrice ? BigInt(swap.gasPrice) : undefined,
    maxFeePerGas: swap.maxFeePerGas ? BigInt(swap.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: swap.maxPriorityFeePerGas
      ? BigInt(swap.maxPriorityFeePerGas)
      : undefined,
  };
}

async function amountForTrade(
  action: TradeAction,
  usdCents: number,
  stockPriceUsd: number,
  ethPriceUsd: number,
  tokenAddress: string,
  multiplier: number,
  provider: JsonRpcProvider,
  walletAddress: string,
): Promise<string> {
  const usd = usdCents / 100;
  if (action === "BUY") {
    if (!Number.isFinite(ethPriceUsd) || ethPriceUsd <= 0) throw new Error("ETH/USD price is unavailable");
    return parseEther((usd / ethPriceUsd).toFixed(18)).toString();
  }
  if (!Number.isFinite(stockPriceUsd) || stockPriceUsd <= 0) throw new Error("Stock price is unavailable");
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  const [decimals, balance] = (await Promise.all([
    token.decimals(),
    token.balanceOf(walletAddress),
  ])) as [bigint, bigint];
  const desiredTokens = usd / (stockPriceUsd * multiplier);
  const desired = parseUnits(desiredTokens.toFixed(Number(decimals)), Number(decimals));
  const amount = desired < balance ? desired : balance;
  if (amount <= 0n) throw new Error(`No ${action === "SELL" ? symbolForError(tokenAddress) : ""} balance to sell`);
  return amount.toString();
}

function symbolForError(tokenAddress: string): string {
  return `token (${tokenAddress.slice(0, 6)}…${tokenAddress.slice(-4)})`;
}

async function maybeApprove(
  wallet: Wallet,
  tokenAddress: string,
  tokenOut: string,
  amount: string,
): Promise<string | undefined> {
  const response = await uniswapRequest<{
    cancel?: SwapResponse["swap"] | null;
    approval?: SwapResponse["swap"] | null;
  }>("/check_approval", {
    walletAddress: wallet.address,
    amount,
    token: tokenAddress,
    tokenOut,
    tokenOutChainId: ROBINHOOD_CHAIN_ID,
    chainId: ROBINHOOD_CHAIN_ID,
    includeGasInfo: true,
    urgency: "normal",
  });
  if (response.cancel) throw new Error("Approval reset is required; manual review needed");
  if (!response.approval) return undefined;
  if (response.approval.to.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error("Approval target does not match the official stock token");
  }
  const tx = await wallet.sendTransaction({
    to: response.approval.to,
    data: response.approval.data,
    value: response.approval.value ? BigInt(response.approval.value) : undefined,
    gasLimit: response.approval.gasLimit ? BigInt(response.approval.gasLimit) : undefined,
  });
  const receipt = await tx.wait(1);
  if (!receipt || receipt.status !== 1) throw new Error("Token approval transaction failed");
  return receipt.hash;
}

async function executeLiveTrade(args: {
  action: TradeAction;
  symbol: string;
  usdCents: number;
  stockPriceUsd: number;
  ethPriceUsd: number;
}): Promise<{ txHash: string; approvalTxHash?: string }> {
  const baseWallet = configuredWallet();
  if (!baseWallet) throw new Error("MAINNET_PRIVATE_KEY is not configured");
  const provider = new JsonRpcProvider(ROBINHOOD_RPC_URL, {
    chainId: ROBINHOOD_CHAIN_ID,
    name: "robinhood-mainnet",
  });
  const wallet = baseWallet.connect(provider);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== ROBINHOOD_CHAIN_ID) throw new Error("RPC returned the wrong chain");

  const { address: stockToken, multiplier } = await resolveStockToken(args.symbol);
  const tokenIn = args.action === "BUY" ? NATIVE_TOKEN : stockToken;
  const tokenOut = args.action === "BUY" ? stockToken : NATIVE_TOKEN;
  const amount = await amountForTrade(
    args.action,
    args.usdCents,
    args.stockPriceUsd,
    args.ethPriceUsd,
    stockToken,
    multiplier,
    provider,
    wallet.address,
  );

  const balanceBefore = await provider.getBalance(wallet.address);
  const reserve = parseEther(process.env.MAINNET_MIN_GAS_RESERVE_ETH || "0.001");
  if (args.action === "BUY" && balanceBefore - BigInt(amount) < reserve) {
    throw new Error(`Gas reserve protected; wallet has ${formatEther(balanceBefore)} ETH`);
  }

  let approvalTxHash: string | undefined;
  if (args.action === "SELL") {
    approvalTxHash = await maybeApprove(wallet, tokenIn, tokenOut, amount);
  }

  const quoteResponse = await uniswapRequest<QuoteResponse>("/quote", {
    type: "EXACT_INPUT",
    tokenInChainId: ROBINHOOD_CHAIN_ID,
    tokenOutChainId: ROBINHOOD_CHAIN_ID,
    tokenIn,
    tokenOut,
    amount,
    swapper: wallet.address,
    slippageTolerance: envNumber("MAINNET_SLIPPAGE_PERCENT", 0.5),
    routingPreference: "FASTEST",
    protocols: ["V4", "V3", "V2"],
  });
  validateQuote(quoteResponse, wallet.address, tokenIn, tokenOut);

  let signature: string | undefined;
  if (quoteResponse.permitData) {
    signature = await wallet.signTypedData(
      quoteResponse.permitData.domain,
      quoteResponse.permitData.types,
      quoteResponse.permitData.values,
    );
  }
  const swapResponse = await uniswapRequest<SwapResponse>("/swap", {
    quote: quoteResponse.quote,
    permitData: quoteResponse.permitData,
    signature,
    simulateTransaction: true,
    safetyMode: "SAFE",
    refreshGasPrice: true,
    urgency: "normal",
  });
  const request = txRequest(swapResponse.swap);
  if (swapResponse.swap.from && swapResponse.swap.from.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Swap transaction sender does not match the configured wallet");
  }
  if (args.action === "BUY" && (request.value || 0n) > BigInt(amount)) {
    throw new Error("Swap transaction attempts to spend more ETH than quoted");
  }
  await provider.estimateGas({ ...request, from: wallet.address });
  const tx = await wallet.sendTransaction(request);
  const receipt = await tx.wait(1);
  if (!receipt || receipt.status !== 1) throw new Error("Swap transaction failed");
  return { txHash: receipt.hash, approvalTxHash };
}

export async function executeMainnetTrade(args: {
  id: string;
  agentId: string;
  action: TradeAction;
  symbol: string;
  usdAmount: number;
  stockPriceUsd: number;
  ethPriceUsd: number;
  reasoning: string;
}): Promise<MainnetExecutionResult> {
  return runExclusive(async () => {
    const mode = mainnetMode();
    const usdCents = Math.round(args.usdAmount * 100);
    if (mode === "off") return { mode, status: "rejected", reason: "mainnet mode is off" };

    const state = await loadMainnetState();
    const prior = state.trades.find((trade) => trade.id === args.id);
    if (prior) {
      return {
        mode,
        status: prior.status,
        reason: "duplicate decision",
        txHash: prior.txHash,
        approvalTxHash: prior.approvalTxHash,
      };
    }

    const maxTrade = envInt("MAINNET_MAX_TRADE_USD_CENTS", 5);
    const dailyBudget = envInt("MAINNET_DAILY_BUDGET_USD_CENTS", 1000);
    const totalBudget = envInt("MAINNET_TOTAL_BUDGET_USD_CENTS", 200);
    let rejection: string | undefined;
    if (usdCents < 1 || usdCents > maxTrade) rejection = `trade must be between 1 and ${maxTrade} cents`;
    else if (state.daySpentCents + usdCents > dailyBudget) rejection = "daily circuit breaker reached";
    else if (state.totalSpentCents + usdCents > totalBudget) rejection = "pilot lifetime budget reached";

    const record: MainnetTradeRecord = {
      id: args.id,
      agentId: args.agentId,
      action: args.action,
      symbol: args.symbol,
      usdCents,
      status: rejection ? "rejected" : "planned",
      reason: rejection || args.reasoning.slice(0, 280),
      createdAt: new Date().toISOString(),
    };
    state.trades.push(record);
    if (rejection) {
      await saveMainnetState(state);
      return { mode, status: "rejected", reason: rejection };
    }

    state.daySpentCents += usdCents;
    state.totalSpentCents += usdCents;
    await saveMainnetState(state);

    if (mode === "dry-run") {
      return { mode, status: "planned", reason: "validated by local risk controls; no transaction sent" };
    }

    try {
      const result = await executeLiveTrade({
        action: args.action,
        symbol: args.symbol,
        usdCents,
        stockPriceUsd: args.stockPriceUsd,
        ethPriceUsd: args.ethPriceUsd,
      });
      record.status = "confirmed";
      record.txHash = result.txHash;
      record.approvalTxHash = result.approvalTxHash;
      record.reason = args.reasoning.slice(0, 280);
      await saveMainnetState(state);
      return { mode, status: "confirmed", ...result };
    } catch (error) {
      record.status = "failed";
      record.reason = (error as Error).message.slice(0, 280);
      await saveMainnetState(state);
      return { mode, status: "failed", reason: record.reason };
    }
  });
}

export async function getPublicMainnetStatus(): Promise<{
  network: string;
  chainId: number;
  mode: MainnetMode;
  walletAddress: string | null;
  walletBalanceEth: string | null;
  dailyBudgetUsd: number;
  dailySpentUsd: number;
  totalBudgetUsd: number;
  totalSpentUsd: number;
  trades: MainnetTradeRecord[];
}> {
  const state = await loadMainnetState();
  const walletAddress = mainnetWalletAddress();
  let walletBalanceEth: string | null = null;
  if (walletAddress) {
    try {
      const provider = new JsonRpcProvider(ROBINHOOD_RPC_URL, {
        chainId: ROBINHOOD_CHAIN_ID,
        name: "robinhood-mainnet",
      });
      walletBalanceEth = formatEther(await provider.getBalance(walletAddress));
    } catch {
      walletBalanceEth = null;
    }
  }
  return {
    network: "Robinhood Chain",
    chainId: ROBINHOOD_CHAIN_ID,
    mode: mainnetMode(),
    walletAddress,
    walletBalanceEth,
    dailyBudgetUsd: envInt("MAINNET_DAILY_BUDGET_USD_CENTS", 1000) / 100,
    dailySpentUsd: state.daySpentCents / 100,
    totalBudgetUsd: envInt("MAINNET_TOTAL_BUDGET_USD_CENTS", 200) / 100,
    totalSpentUsd: state.totalSpentCents / 100,
    trades: [...state.trades].reverse().slice(0, 50),
  };
}

export function mainnetExplorerTxUrl(hash: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/tx/${hash}`;
}
