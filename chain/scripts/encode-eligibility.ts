import { Interface, isAddress } from "ethers";

const rawAccounts = process.env.PREDICTION_ELIGIBLE_ACCOUNTS?.trim() ?? "";
const accounts = rawAccounts
  .split(",")
  .map((account) => account.trim())
  .filter(Boolean);

if (accounts.length === 0 || accounts.length > 100) {
  throw new Error("Provide between 1 and 100 comma-separated eligible accounts.");
}
if (accounts.some((account) => !isAddress(account))) {
  throw new Error("Every PREDICTION_ELIGIBLE_ACCOUNTS entry must be a valid address.");
}

const registryInterface = new Interface([
  "function setEligibilityBatch(address[] accounts,bool[] eligible)",
]);
const calldata = registryInterface.encodeFunctionData("setEligibilityBatch", [
  accounts,
  accounts.map(() => true),
]);

console.log(`Wallet count: ${accounts.length}`);
console.log(`Safe calldata: ${calldata}`);
