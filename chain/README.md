# Challenge 02 prediction vault

`AgentPredictionVault` is a single-round, native-token pari-mutuel pool for a
three-hour AgentsInHood battle. The source supports Robinhood Chain Testnet and a
separately gated Robinhood Chain mainnet deployment. No mainnet contract is
deployed by this repository.

## Lifecycle

1. `Scheduled` — the contract exists but the battle has not started.
2. `Open` — for one hour, eligible participants can add stake, move their complete
   position to another agent, or withdraw any valid amount.
3. `Locked` — for two hours, no position can change.
4. `AwaitingResolution` — the owner multisig publishes a winner and evidence hash.
5. `Result review` — the proposal remains public for the immutable dispute period.
6. `Resolved` — after review, anyone can finalize and winner backers claim.
7. `Cancelled` — every participant independently claims an exact refund.

The payout for a winning position is:

```text
complete round pool × individual winning stake ÷ all winning stake
```

Claims reduce both the remaining pool and remaining winning stake. The last
winning claim collects any integer-division dust, so the tracked pool is fully
distributed without iterating over participant addresses.

## Contract-enforced protections

- OpenZeppelin `Ownable2Step` and `ReentrancyGuard`.
- Immutable minimum stake, per-wallet maximum, total-pool cap, and dispute time.
- Optional wallet-eligibility registry that stores only an address-level boolean.
- No owner withdrawal, sweep, or drain function.
- Direct transfers are rejected; tracked stake enters through `placeBet`.
- Checks-effects-interactions and participant-initiated pull payments.
- Result publication cannot begin before the three-hour end timestamp.
- A non-zero evidence hash is mandatory for proposal, retraction, or cancellation.
- A matured result proposal cannot be retracted or cancelled; anyone can finalize it.
- Ownership cannot be renounced while a round may still need resolution.
- An unbacked winner automatically puts the round into exact-refund mode.

The owner multisig remains a trusted result proposer and emergency canceller before
a proposal matures. The evidence hash and dispute period make that authority
observable; they do not turn the mechanism into a decentralized oracle.

## Local verification

```bash
npm install
npm test
npm run build
npm run typecheck
```

The suite covers timing boundaries, stake and pool limits, eligibility,
authorization, proposal review, proportional payouts, exact refunds, direct
transfer rejection, and ownership safety.

## Testnet deployment

Use a dedicated test-only wallet:

```powershell
npx hardhat keystore set PREDICTION_DEPLOYER_PRIVATE_KEY
$env:ROBINHOOD_TESTNET_RPC_URL="https://rpc.testnet.chain.robinhood.com"
$env:PREDICTION_START_DELAY_SECONDS="900"
npm run deploy:testnet
```

Testnet defaults are configurable through the `PREDICTION_MINIMUM_STAKE_ETH`,
`PREDICTION_MAXIMUM_STAKE_ETH`, `PREDICTION_MAXIMUM_POOL_ETH`, and
`PREDICTION_DISPUTE_SECONDS` environment variables.

## Publishing and finalizing a result

Publish an immutable evidence artifact containing the final scores, end timestamp,
source response, and exact code commit. Hash the artifact and propose it:

```powershell
$env:PREDICTION_VAULT_ADDRESS="0x..."
$env:PREDICTION_WINNER_ID="0"
$env:PREDICTION_EVIDENCE_HASH="0x..."
npm run propose:testnet
```

After the printed review deadline, anyone can run:

```powershell
npm run finalize:testnet
```

If the result cannot be established, the owner can use `npm run cancel:testnet`
before a proposal matures. Cancellation enables participant refunds; it never
transfers the pool to the owner.

Agent IDs are stable:

| ID | Agent |
| --- | --- |
| 0 | Gemini 3.1 Pro |
| 1 | MiniMax M2.5 |
| 2 | GPT-5.4 |
| 3 | Claude Opus 4.8 |
| 4 | Fable 5 |

## Mainnet preparation

The mainnet scripts enforce chain ID `4663`, a contract-based owner, a separate
deployment signer, a deployed eligibility registry, explicit immutable limits, at
least 24 hours of notice, at least one hour of result review, and an exact launch
acknowledgement. The frontend adds an independent launch lock.

These controls do not replace independent audit or legal/licensing requirements.
The project owner must perform all irreversible transactions. Follow
[`MAINNET_LAUNCH_RUNBOOK.md`](MAINNET_LAUNCH_RUNBOOK.md) without skipping gates.
