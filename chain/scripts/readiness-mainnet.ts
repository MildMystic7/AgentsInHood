import {
  JsonRpcProvider,
  formatEther,
  isAddress,
  parseEther,
} from "ethers";

const REQUIRED_ACK = "I_HAVE_WRITTEN_APPROVAL_AND_ACCEPT_MAINNET_RISK";
const failures: string[] = [];

function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

function integer(name: string, minimum: number) {
  const parsed = Number(value(name));
  if (!Number.isInteger(parsed) || parsed < minimum) {
    failures.push(`${name} must be an integer of at least ${minimum}.`);
  }
  return parsed;
}

function ether(name: string) {
  try {
    const parsed = parseEther(value(name));
    if (parsed <= 0n) throw new Error();
    return parsed;
  } catch {
    failures.push(`${name} must be a positive ETH amount.`);
    return 0n;
  }
}

const rpcUrl = value("ROBINHOOD_MAINNET_RPC_URL");
const owner = value("PREDICTION_OWNER_ADDRESS");
const termsUrl = value("PREDICTION_TERMS_URL");
const startDelay = integer("PREDICTION_START_DELAY_SECONDS", 86_400);
const disputeSeconds = integer("PREDICTION_DISPUTE_SECONDS", 3_600);
const minimumStake = ether("PREDICTION_MINIMUM_STAKE_ETH");
const maximumStake = ether("PREDICTION_MAXIMUM_STAKE_PER_WALLET_ETH");
const maximumPool = ether("PREDICTION_MAXIMUM_POOL_ETH");

if (value("PREDICTION_MAINNET_LAUNCH_ACK") !== REQUIRED_ACK) {
  failures.push("PREDICTION_MAINNET_LAUNCH_ACK does not match the required acknowledgement.");
}
if (!URL.canParse(rpcUrl) || !rpcUrl.startsWith("https://")) {
  failures.push("ROBINHOOD_MAINNET_RPC_URL must be a production HTTPS endpoint.");
}
if (!isAddress(owner)) {
  failures.push("PREDICTION_OWNER_ADDRESS must be a valid contract address.");
}
if (!URL.canParse(termsUrl) || !termsUrl.startsWith("https://")) {
  failures.push("PREDICTION_TERMS_URL must be a published HTTPS page.");
}
if (maximumStake > 0n && minimumStake > maximumStake) {
  failures.push("Minimum stake cannot exceed the per-wallet maximum.");
}
if (maximumPool > 0n && maximumStake > maximumPool) {
  failures.push("Per-wallet maximum cannot exceed the total pool cap.");
}

const eligibleAccounts = value("PREDICTION_INITIAL_ELIGIBLE_ACCOUNTS")
  .split(",")
  .map((account) => account.trim())
  .filter(Boolean);
const uniqueEligibleAccounts = new Set(
  eligibleAccounts.map((account) => account.toLowerCase()),
);
if (
  eligibleAccounts.length === 0 ||
  eligibleAccounts.length > 100 ||
  eligibleAccounts.some((account) => !isAddress(account))
) {
  failures.push("PREDICTION_INITIAL_ELIGIBLE_ACCOUNTS must contain 1-100 valid addresses.");
}
if (uniqueEligibleAccounts.size !== eligibleAccounts.length) {
  failures.push("PREDICTION_INITIAL_ELIGIBLE_ACCOUNTS contains duplicates.");
}

if (failures.length === 0) {
  try {
    const provider = new JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
    });
    const network = await provider.getNetwork();
    if (network.chainId !== 4_663n) {
      failures.push(`RPC returned chain ${network.chainId}; expected 4663.`);
    }
    if ((await provider.getCode(owner)) === "0x") {
      failures.push("PREDICTION_OWNER_ADDRESS has no deployed contract bytecode.");
    }
  } catch (error) {
    failures.push(
      `RPC or owner check failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  try {
    const response = await fetch(termsUrl, { redirect: "follow" });
    if (!response.ok) {
      failures.push(`Rules page returned HTTP ${response.status}.`);
    }
  } catch (error) {
    failures.push(
      `Rules page check failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

if (failures.length > 0) {
  console.error("MAINNET READINESS: BLOCKED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("MAINNET READINESS: PASSED");
  console.log(`Owner contract: ${owner}`);
  console.log(`Initially eligible wallets: ${eligibleAccounts.length}`);
  console.log(`Start notice: ${startDelay} seconds`);
  console.log(`Result review: ${disputeSeconds} seconds`);
  console.log(`Minimum stake: ${formatEther(minimumStake)} ETH`);
  console.log(`Maximum per wallet: ${formatEther(maximumStake)} ETH`);
  console.log(`Maximum pool: ${formatEther(maximumPool)} ETH`);
  console.log(`Rules: ${termsUrl}`);
}
