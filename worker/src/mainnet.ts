import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from "ethers";
import { kvConfigured, kvGet, kvSet } from "./kv";
import { scopedKey } from "./run-scope";

export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_RPC_URL =
  process.env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const ROBINHOOD_EXPLORER_URL = "https://robinhoodchain.blockscout.com";
export const USDG_TOKEN = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
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
  dayReservedCents: number;
  totalReservedCents: number;
  dayConfirmedCents: number;
  totalConfirmedCents: number;
  dayGasReservedMicros: number;
  totalGasReservedMicros: number;
  lastLiveAttemptAt?: string;
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

// v4 separates confirmed notional from conservative trade and gas reservations.
const STATE_KEY = "agentsinhood:mainnet:v4";
const ASSET_CACHE_MS = 60 * 60 * 1000;
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
];

let assetCache: { expiresAt: number; assets: RobinhoodAsset[] } | null = null;
let memoryState: MainnetState | null = null;
let memoryStateKey: string | null = null;
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
  return {
    day: utcDay(),
    dayReservedCents: 0,
    totalReservedCents: 0,
    dayConfirmedCents: 0,
    totalConfirmedCents: 0,
    dayGasReservedMicros: 0,
    totalGasReservedMicros: 0,
    trades: [],
  };
}

async function loadMainnetState(): Promise<MainnetState> {
  const activeStateKey = scopedKey(STATE_KEY);
  if (memoryStateKey !== activeStateKey) {
    memoryState = null;
    memoryStateKey = activeStateKey;
  }
  if (kvConfigured()) {
    const raw = await kvGet(activeStateKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MainnetState;
        if (parsed && Array.isArray(parsed.trades)) {
          if (parsed.day !== utcDay()) {
            parsed.day = utcDay();
            parsed.dayReservedCents = 0;
            parsed.dayConfirmedCents = 0;
            parsed.dayGasReservedMicros = 0;
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
    memoryState.dayReservedCents = 0;
    memoryState.dayConfirmedCents = 0;
    memoryState.dayGasReservedMicros = 0;
  }
  return memoryState;
}

async function saveMainnetState(state: MainnetState): Promise<void> {
  state.trades = state.trades.slice(-200);
  memoryState = state;
  const activeStateKey = scopedKey(STATE_KEY);
  memoryStateKey = activeStateKey;
  if (kvConfigured()) await kvSet(activeStateKey, JSON.stringify(state));
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
  const gasPerTxMax = envInt("MAINNET_MAX_GAS_USD_CENTS", 5);
  const dailyGasMax = envInt("MAINNET_DAILY_GAS_BUDGET_USD_CENTS", 50);
  const totalGasMax = envInt("MAINNET_TOTAL_GAS_BUDGET_USD_CENTS", 100);
  const cooldownSeconds = envInt("MAINNET_MIN_SECONDS_BETWEEN_TRADES", 600);
  const maxPriceImpactPercent = envNumber("MAINNET_MAX_PRICE_IMPACT_PERCENT", 10);
  const slippagePercent = envNumber("MAINNET_SLIPPAGE_PERCENT", 10);

  if (tradeMax < 1 || tradeMax > 25) {
    throw new Error("MAINNET_MAX_TRADE_USD_CENTS must be between 1 and 25");
  }
  if (dailyMax < tradeMax || dailyMax > 1000) {
    throw new Error("MAINNET_DAILY_BUDGET_USD_CENTS must be between the trade maximum and 1000");
  }
  if (totalMax < tradeMax || totalMax > 1000) {
    throw new Error("MAINNET_TOTAL_BUDGET_USD_CENTS must cover one trade and be at most 1000");
  }
  if (gasPerTxMax < 1 || gasPerTxMax > 25) {
    throw new Error("MAINNET_MAX_GAS_USD_CENTS must be between 1 and 25");
  }
  if (dailyGasMax < gasPerTxMax || dailyGasMax > 500) {
    throw new Error("MAINNET_DAILY_GAS_BUDGET_USD_CENTS must cover one transaction and be at most 500");
  }
  if (totalGasMax < gasPerTxMax || totalGasMax > 500) {
    throw new Error("MAINNET_TOTAL_GAS_BUDGET_USD_CENTS must cover one transaction and be at most 500");
  }
  if (cooldownSeconds < 60 || cooldownSeconds > 3600) {
    throw new Error("MAINNET_MIN_SECONDS_BETWEEN_TRADES must be between 60 and 3600");
  }
  if (maxPriceImpactPercent < 0.01 || maxPriceImpactPercent > 10) {
    throw new Error("MAINNET_MAX_PRICE_IMPACT_PERCENT must be between 0.01 and 10");
  }
  if (slippagePercent < 0.01 || slippagePercent > 10) {
    throw new Error("MAINNET_SLIPPAGE_PERCENT must be between 0.01 and 10");
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
  const maxImpactPercent = envNumber("MAINNET_MAX_PRICE_IMPACT_PERCENT", 10);
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

async function assertTransactionBudget(
  provider: JsonRpcProvider,
  walletAddress: string,
  request: {
    to: string;
    data: string;
    value?: bigint;
    gasLimit?: bigint;
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  },
  ethPriceUsd: number,
): Promise<number> {
  if (!Number.isFinite(ethPriceUsd) || ethPriceUsd <= 0) {
    throw new Error("ETH/USD price is unavailable for the gas check");
  }
  const estimatedGas =
    request.gasLimit || (await provider.estimateGas({ ...request, from: walletAddress }));
  const feeData = await provider.getFeeData();
  const feePerGas =
    request.maxFeePerGas || request.gasPrice || feeData.maxFeePerGas || feeData.gasPrice;
  if (!feePerGas) throw new Error("Unable to determine the transaction gas price");

  const gasWei = estimatedGas * feePerGas;
  const gasUsd = Number(formatEther(gasWei)) * ethPriceUsd;
  const gasMicros = Math.max(1, Math.ceil(gasUsd * 1_000_000));
  const maxGasUsd = envInt("MAINNET_MAX_GAS_USD_CENTS", 5) / 100;
  if (!Number.isFinite(gasUsd) || gasUsd > maxGasUsd) {
    throw new Error(`Estimated transaction gas $${gasUsd.toFixed(4)} exceeds $${maxGasUsd.toFixed(2)}`);
  }

  const balance = await provider.getBalance(walletAddress);
  const reserve = parseEther(process.env.MAINNET_MIN_GAS_RESERVE_ETH || "0.001");
  if (balance - (request.value || 0n) - gasWei < reserve) {
    throw new Error("Transaction would breach the protected ETH gas reserve");
  }
  return gasMicros;
}

async function desiredInputAmount(
  action: TradeAction,
  usdCents: number,
  stockPriceUsd: number,
  tokenAddress: string,
  multiplier: number,
  provider: JsonRpcProvider,
): Promise<string> {
  const usd = usdCents / 100;
  if (action === "BUY") {
    const usdg = new Contract(USDG_TOKEN, ERC20_ABI, provider);
    const decimals = Number(await usdg.decimals());
    return parseUnits(usd.toFixed(decimals), decimals).toString();
  }
  if (!Number.isFinite(stockPriceUsd) || stockPriceUsd <= 0) throw new Error("Stock price is unavailable");
  const token = new Contract(tokenAddress, ERC20_ABI, provider);
  const decimals = Number(await token.decimals());
  const desiredTokens = usd / (stockPriceUsd * multiplier);
  return parseUnits(desiredTokens.toFixed(decimals), decimals).toString();
}

function symbolForError(tokenAddress: string): string {
  return `token (${tokenAddress.slice(0, 6)}…${tokenAddress.slice(-4)})`;
}

async function maybeApprove(
  wallet: Wallet,
  tokenAddress: string,
  tokenOut: string,
  amount: string,
  ethPriceUsd: number,
  reserveGas: (gasMicros: number) => Promise<void>,
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
  const provider = wallet.provider;
  if (!(provider instanceof JsonRpcProvider)) throw new Error("Approval wallet has no mainnet provider");
  const approvalRequest = {
    to: response.approval.to,
    data: response.approval.data,
    value: response.approval.value ? BigInt(response.approval.value) : undefined,
    gasLimit: response.approval.gasLimit ? BigInt(response.approval.gasLimit) : undefined,
    gasPrice: response.approval.gasPrice ? BigInt(response.approval.gasPrice) : undefined,
    maxFeePerGas: response.approval.maxFeePerGas
      ? BigInt(response.approval.maxFeePerGas)
      : undefined,
    maxPriorityFeePerGas: response.approval.maxPriorityFeePerGas
      ? BigInt(response.approval.maxPriorityFeePerGas)
      : undefined,
  };
  const gasMicros = await assertTransactionBudget(
    provider,
    wallet.address,
    approvalRequest,
    ethPriceUsd,
  );
  await reserveGas(gasMicros);
  const tx = await wallet.sendTransaction(approvalRequest);
  const receipt = await tx.wait(1);
  if (!receipt || receipt.status !== 1) throw new Error("Token approval transaction failed");
  return receipt.hash;
}

interface PreparedQuote {
  provider: JsonRpcProvider;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  quoteResponse: QuoteResponse;
}

async function prepareQuote(
  args: {
    action: TradeAction;
    symbol: string;
    usdCents: number;
    stockPriceUsd: number;
  },
  walletAddress: string,
): Promise<PreparedQuote> {
  const provider = new JsonRpcProvider(ROBINHOOD_RPC_URL, {
    chainId: ROBINHOOD_CHAIN_ID,
    name: "robinhood-mainnet",
  });
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== ROBINHOOD_CHAIN_ID) throw new Error("RPC returned the wrong chain");

  const { address: stockToken, multiplier } = await resolveStockToken(args.symbol);
  const tokenIn = args.action === "BUY" ? USDG_TOKEN : stockToken;
  const tokenOut = args.action === "BUY" ? stockToken : USDG_TOKEN;
  const amount = await desiredInputAmount(
    args.action,
    args.usdCents,
    args.stockPriceUsd,
    stockToken,
    multiplier,
    provider,
  );
  const quoteResponse = await uniswapRequest<QuoteResponse>("/quote", {
    type: "EXACT_INPUT",
    tokenInChainId: ROBINHOOD_CHAIN_ID,
    tokenOutChainId: ROBINHOOD_CHAIN_ID,
    tokenIn,
    tokenOut,
    amount,
    swapper: walletAddress,
    slippageTolerance: envNumber("MAINNET_SLIPPAGE_PERCENT", 10),
    routingPreference: "BEST_PRICE",
  });
  validateQuote(quoteResponse, walletAddress, tokenIn, tokenOut);
  return { provider, tokenIn, tokenOut, amount, quoteResponse };
}

async function validateDryRunTrade(args: {
  action: TradeAction;
  symbol: string;
  usdCents: number;
  stockPriceUsd: number;
}): Promise<string> {
  const walletAddress = mainnetWalletAddress();
  if (!walletAddress) throw new Error("MAINNET_WALLET_ADDRESS is not configured");
  return (await prepareQuote(args, walletAddress)).quoteResponse.routing;
}

async function executeLiveTrade(args: {
  action: TradeAction;
  symbol: string;
  usdCents: number;
  stockPriceUsd: number;
  ethPriceUsd: number;
}, reserveGas: (gasMicros: number) => Promise<void>): Promise<{
  txHash: string;
  approvalTxHash?: string;
}> {
  const baseWallet = configuredWallet();
  if (!baseWallet) throw new Error("MAINNET_PRIVATE_KEY is not configured");
  const prepared = await prepareQuote(args, baseWallet.address);
  const { provider, tokenIn, tokenOut, amount, quoteResponse } = prepared;
  const wallet = baseWallet.connect(provider);

  const inputToken = new Contract(tokenIn, ERC20_ABI, provider);
  const inputBalance = (await inputToken.balanceOf(wallet.address)) as bigint;
  if (inputBalance < BigInt(amount)) {
    throw new Error(`Insufficient ${args.action === "BUY" ? "USDG" : symbolForError(tokenIn)} balance`);
  }

  const balanceBefore = await provider.getBalance(wallet.address);
  const reserve = parseEther(process.env.MAINNET_MIN_GAS_RESERVE_ETH || "0.001");
  if (balanceBefore < reserve) {
    throw new Error(`Gas reserve protected; wallet has ${formatEther(balanceBefore)} ETH`);
  }

  const approvalTxHash = await maybeApprove(
    wallet,
    tokenIn,
    tokenOut,
    amount,
    args.ethPriceUsd,
    reserveGas,
  );

  let signature: string | undefined;
  if (quoteResponse.permitData) {
    signature = await wallet.signTypedData(
      quoteResponse.permitData.domain,
      quoteResponse.permitData.types,
      quoteResponse.permitData.values,
    );
  }
  const swapBody: Record<string, unknown> = {
    quote: quoteResponse.quote,
    simulateTransaction: true,
    safetyMode: "SAFE",
    refreshGasPrice: true,
    urgency: "normal",
  };
  if (quoteResponse.permitData) swapBody.permitData = quoteResponse.permitData;
  if (signature) swapBody.signature = signature;
  const swapResponse = await uniswapRequest<SwapResponse>("/swap", swapBody);
  const request = txRequest(swapResponse.swap);
  if (swapResponse.swap.from && swapResponse.swap.from.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("Swap transaction sender does not match the configured wallet");
  }
  if ((request.value || 0n) > 0n) {
    throw new Error("USDG/stock-token swap unexpectedly requests native ETH value");
  }
  const gasMicros = await assertTransactionBudget(
    provider,
    wallet.address,
    request,
    args.ethPriceUsd,
  );
  await reserveGas(gasMicros);
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
    const cooldownMs = envInt("MAINNET_MIN_SECONDS_BETWEEN_TRADES", 600) * 1000;
    let rejection: string | undefined;
    if (usdCents < 1 || usdCents > maxTrade) rejection = `trade must be between 1 and ${maxTrade} cents`;
    else if (state.dayReservedCents + usdCents > dailyBudget) rejection = "daily circuit breaker reached";
    else if (state.totalReservedCents + usdCents > totalBudget) rejection = "pilot lifetime budget reached";
    else if (mode === "live" && state.lastLiveAttemptAt) {
      const elapsed = Date.now() - Date.parse(state.lastLiveAttemptAt);
      if (Number.isFinite(elapsed) && elapsed < cooldownMs) {
        rejection = "shared-wallet live cooldown is active";
      }
    }

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
    if (mode === "dry-run") {
      if (rejection) return { mode, status: "rejected", reason: rejection };
      try {
        const routing = await validateDryRunTrade({
          action: args.action,
          symbol: args.symbol,
          usdCents,
          stockPriceUsd: args.stockPriceUsd,
        });
        record.reason = `Uniswap ${routing} quote validated; no transaction sent`;
        return { mode, status: "planned", reason: record.reason };
      } catch (error) {
        record.status = "rejected";
        record.reason = `Dry-run quote rejected: ${(error as Error).message.slice(0, 240)}`;
        return { mode, status: "rejected", reason: record.reason };
      }
    }

    // Dry-run quotes are intentionally read-only. This prevents a persistent
    // simulator from overwriting the live executor's Redis state.
    state.trades.push(record);
    if (rejection) {
      await saveMainnetState(state);
      return { mode, status: "rejected", reason: rejection };
    }

    // Budget is reserved only when the executor is actually allowed to submit
    // a transaction. Dry-run plans never count as real spend.
    state.dayReservedCents += usdCents;
    state.totalReservedCents += usdCents;
    state.lastLiveAttemptAt = new Date().toISOString();
    await saveMainnetState(state);

    const reserveGas = async (gasMicros: number): Promise<void> => {
      const dailyGasLimitMicros =
        envInt("MAINNET_DAILY_GAS_BUDGET_USD_CENTS", 50) * 10_000;
      const totalGasLimitMicros =
        envInt("MAINNET_TOTAL_GAS_BUDGET_USD_CENTS", 100) * 10_000;
      if (state.dayGasReservedMicros + gasMicros > dailyGasLimitMicros) {
        throw new Error("daily gas circuit breaker reached");
      }
      if (state.totalGasReservedMicros + gasMicros > totalGasLimitMicros) {
        throw new Error("pilot lifetime gas budget reached");
      }
      state.dayGasReservedMicros += gasMicros;
      state.totalGasReservedMicros += gasMicros;
      await saveMainnetState(state);
    };

    try {
      const result = await executeLiveTrade({
        action: args.action,
        symbol: args.symbol,
        usdCents,
        stockPriceUsd: args.stockPriceUsd,
        ethPriceUsd: args.ethPriceUsd,
      }, reserveGas);
      record.status = "confirmed";
      record.txHash = result.txHash;
      record.approvalTxHash = result.approvalTxHash;
      record.reason = args.reasoning.slice(0, 280);
      state.dayConfirmedCents += usdCents;
      state.totalConfirmedCents += usdCents;
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
  trades: MainnetTradeRecord[];
}> {
  const state = await loadMainnetState();
  const walletAddress = mainnetWalletAddress();
  let walletBalanceEth: string | null = null;
  let walletBalanceUsdg: string | null = null;
  const positions: { symbol: string; tokenAddress: string; balance: string }[] = [];
  if (walletAddress) {
    try {
      const provider = new JsonRpcProvider(ROBINHOOD_RPC_URL, {
        chainId: ROBINHOOD_CHAIN_ID,
        name: "robinhood-mainnet",
      });
      walletBalanceEth = formatEther(await provider.getBalance(walletAddress));
      const usdg = new Contract(USDG_TOKEN, ERC20_ABI, provider);
      const [usdgBalance, usdgDecimals] = (await Promise.all([
        usdg.balanceOf(walletAddress),
        usdg.decimals(),
      ])) as [bigint, bigint];
      walletBalanceUsdg = formatUnits(usdgBalance, Number(usdgDecimals));

      const confirmedSymbols = [
        ...new Set(
          state.trades
            .filter((trade) => trade.status === "confirmed" && trade.txHash)
            .map((trade) => trade.symbol.toUpperCase()),
        ),
      ];
      for (const symbol of confirmedSymbols) {
        try {
          const { address } = await resolveStockToken(symbol);
          const token = new Contract(address, ERC20_ABI, provider);
          const [balance, decimals] = (await Promise.all([
            token.balanceOf(walletAddress),
            token.decimals(),
          ])) as [bigint, bigint];
          if (balance > 0n) {
            positions.push({
              symbol,
              tokenAddress: address,
              balance: formatUnits(balance, Number(decimals)),
            });
          }
        } catch {
          // A balance lookup must never make the whole public status unavailable.
        }
      }
    } catch {
      walletBalanceEth = null;
      walletBalanceUsdg = null;
    }
  }
  return {
    network: "Robinhood Chain",
    chainId: ROBINHOOD_CHAIN_ID,
    mode: mainnetMode(),
    walletAddress,
    walletBalanceEth,
    walletBalanceUsdg,
    positions,
    dailyBudgetUsd: envInt("MAINNET_DAILY_BUDGET_USD_CENTS", 1000) / 100,
    dailyReservedUsd: state.dayReservedCents / 100,
    dailySpentUsd: state.dayConfirmedCents / 100,
    totalBudgetUsd: envInt("MAINNET_TOTAL_BUDGET_USD_CENTS", 200) / 100,
    totalReservedUsd: state.totalReservedCents / 100,
    totalSpentUsd: state.totalConfirmedCents / 100,
    dailyGasBudgetUsd: envInt("MAINNET_DAILY_GAS_BUDGET_USD_CENTS", 50) / 100,
    dailyGasReservedUsd: state.dayGasReservedMicros / 1_000_000,
    totalGasBudgetUsd: envInt("MAINNET_TOTAL_GAS_BUDGET_USD_CENTS", 100) / 100,
    totalGasReservedUsd: state.totalGasReservedMicros / 1_000_000,
    minSecondsBetweenTrades: envInt("MAINNET_MIN_SECONDS_BETWEEN_TRADES", 600),
    maxPriceImpactPercent: envNumber("MAINNET_MAX_PRICE_IMPACT_PERCENT", 10),
    slippagePercent: envNumber("MAINNET_SLIPPAGE_PERCENT", 10),
    trades: [...state.trades].reverse().slice(0, 50),
  };
}

export function mainnetExplorerTxUrl(hash: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/tx/${hash}`;
}
