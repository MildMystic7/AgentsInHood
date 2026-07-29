# Challenge 02 prediction vault

`AgentPredictionVault` is a single-round, native-token pari-mutuel pool for a
three-hour AgentsInHood battle. The current build targets Robinhood Chain Testnet
only. Testnet ETH has no monetary value.

## Lifecycle

1. `Scheduled` — the contract exists but the battle has not started.
2. `Open` — for one hour, participants can add stake, move their complete
   position to another agent, or withdraw any amount.
3. `Locked` — for two hours, no position can change.
4. `AwaitingResolution` — the challenge is over and the evidence can be
   published.
5. `Resolved` — winner backers independently claim their share.
6. `Cancelled` — every participant independently claims an exact refund.

The payout for a winning position is:

```text
complete round pool × individual winning stake ÷ all winning stake
```

Claims reduce both the remaining pool and remaining winning stake. This makes
the final winning claim collect any integer-division dust, so the entire tracked
pool is distributed without iterating over participant addresses.

## Security properties in the prototype

- OpenZeppelin `Ownable2Step` and `ReentrancyGuard`.
- No owner withdrawal, sweep, or drain function.
- Direct token transfers are rejected; stake enters through `placeBet`.
- Checks-effects-interactions and participant-initiated pull payments.
- The result cannot be published before the three-hour end timestamp.
- A non-zero evidence hash is required for resolution or cancellation.
- Ownership cannot be renounced while a round may still require resolution.
- An unbacked winner automatically puts the round into exact-refund mode.

The owner is still a trusted result publisher in this prototype. That is an
explicit testnet limitation, not a decentralized oracle claim.

## Local verification

```bash
npm install
npm test
npm run build
npm run typecheck
```

The test suite covers open-window mutations, the lock boundary, owner
authorization, proportional payouts, double-claim prevention, exact refunds,
direct-transfer rejection, ownership safety, and mandatory evidence.

## Robinhood Chain Testnet deployment

Use a dedicated test-only wallet. Never reuse the Railway worker key.

Store the deployer key with Hardhat's encrypted keystore:

```powershell
npx hardhat keystore set PREDICTION_DEPLOYER_PRIVATE_KEY
$env:ROBINHOOD_TESTNET_RPC_URL="https://rpc.testnet.chain.robinhood.com"
$env:PREDICTION_START_DELAY_SECONDS="900"
npm run deploy:testnet
```

The deployer needs testnet ETH for gas. Save the printed contract address and
timestamps, confirm the bytecode on the testnet explorer, then configure Vercel:

```env
NEXT_PUBLIC_PREDICTION_VAULT_ADDRESS=0x...
```

The public interface will then read the pool and submit participant
transactions directly from `/predict`.

## Publishing the result

Create an immutable result artifact containing the final agent scores, end
timestamp, source API response, and the exact code commit. Publish the artifact,
calculate its `bytes32` hash, and resolve only after verifying the values:

```powershell
$env:ROBINHOOD_TESTNET_RPC_URL="https://rpc.testnet.chain.robinhood.com"
$env:PREDICTION_VAULT_ADDRESS="0x..."
$env:PREDICTION_WINNER_ID="0"
$env:PREDICTION_EVIDENCE_HASH="0x..."
npm run resolve:testnet
```

Agent IDs are stable:

| ID | Agent |
| --- | --- |
| 0 | Gemini 3.1 Pro |
| 1 | MiniMax M2.5 |
| 2 | GPT-5.4 |
| 3 | Claude Opus 4.8 |
| 4 | Fable 5 |

If the final result cannot be established, use the same evidence process and
`npm run cancel:testnet` after the round ends. Cancellation enables participant
refunds; it does not transfer the pool to the owner.

## Mainnet is a new project gate

Do not add a `robinhoodMainnet` network and redeploy this prototype unchanged.
A real-value proposal needs, at minimum:

1. applicable Portuguese and target-market legal/licensing approval;
2. an independent audit of the final bytecode and frontend;
3. a reviewed resolution mechanism, such as an oracle or a multisig with a
   published scoring artifact and dispute procedure;
4. production RPC and monitoring rather than the rate-limited public endpoint;
5. incident, cancellation, recovery, and participant-support procedures;
6. explicit asset, minimum/maximum stake, geographic, and eligibility rules;
7. a fresh deployment, verified source, multisig owner, and end-to-end test run.

Only after those gates should a separately reviewed mainnet configuration and
deployment script be added.
