# Mainnet launch runbook

Status: **prepared, not deployed, and launch-locked**.

This runbook deliberately separates reversible preparation from irreversible
mainnet transactions. Do not paste private keys into chat, Git, Vercel, or the
website. The final deployment transactions are the launch and must be initiated
by the project owner only after every gate below is evidenced.

## Gate 1 — evidence before deployment

- Keep the written legal/licensing confirmation and its scope in private project
  records. Confirm that it covers the exact operator, territories, asset, custody
  model, eligibility process, marketing copy, and prize mechanics being launched.
- Obtain an independent audit of the final commit and record the audited commit
  hash. This repository's automated tests are not an independent audit.
- Publish round rules, eligibility terms, privacy notice, risk notice, dispute
  procedure, cancellation procedure, and support contact at stable URLs.
- Establish documented geofencing, age/identity checks, sanctions screening, and
  wallet-eligibility operations to the extent required by the written advice.
- Prepare monitoring and an incident owner. Decide in advance when the round must
  be cancelled and how the evidence hash will be published.

Any failed or unclear item is a stop condition.

## Gate 2 — separate authority

1. Create a Robinhood Chain mainnet Safe multisig with at least two independent
   signers and a threshold greater than one.
2. Fund a separate, single-use deployment wallet with gas only.
3. Never use the arena worker key, a participant wallet, or the Safe signer seed
   as the deployment key.
4. Record the Safe address as `PREDICTION_OWNER_ADDRESS`. The deployment scripts
   reject an EOA owner and reject an owner equal to the deployer.

The Safe controls eligibility and result publication. It cannot withdraw, sweep,
or drain participant funds from the vault.

## Gate 3 — local protected configuration

From `chain/`, store the deployment key in Hardhat's encrypted keystore:

```powershell
npx hardhat keystore set PREDICTION_MAINNET_DEPLOYER_PRIVATE_KEY
```

Set the non-secret launch values in the same terminal:

```powershell
$env:ROBINHOOD_MAINNET_RPC_URL="https://your-production-rpc"
$env:PREDICTION_MAINNET_LAUNCH_ACK="I_HAVE_WRITTEN_APPROVAL_AND_ACCEPT_MAINNET_RISK"
$env:PREDICTION_OWNER_ADDRESS="0xSAFE..."
$env:PREDICTION_START_DELAY_SECONDS="86400"
$env:PREDICTION_DISPUTE_SECONDS="3600"
$env:PREDICTION_MINIMUM_STAKE_ETH="0.001"
$env:PREDICTION_MAXIMUM_STAKE_PER_WALLET_ETH="0.05"
$env:PREDICTION_MAXIMUM_POOL_ETH="0.5"
```

Use a production RPC. The public Robinhood endpoint is rate-limited and is not
the production default for the website or deployment scripts.

## Gate 4 — final launch transactions

These commands spend real gas and create immutable mainnet contracts. They are
intentionally not run during preparation.

1. Deploy the eligibility registry:

   ```powershell
   npm run deploy-registry:mainnet
   ```

2. Save its address and submit allowlist changes through the Safe. To create
   batch calldata without exposing a signer:

   ```powershell
   $env:PREDICTION_ELIGIBLE_ACCOUNTS="0xA...,0xB..."
   npm run encode:eligibility
   ```

   Send the printed calldata from the Safe to the registry address.

3. Configure the registry address and deploy the vault:

   ```powershell
   $env:PREDICTION_ELIGIBILITY_REGISTRY_ADDRESS="0xREGISTRY..."
   npm run deploy:mainnet
   ```

4. Save the vault address, transaction hashes, timestamps, constructor values,
   compiler version, and Git commit. Verify the exact source and constructor
   arguments on Robinhood Chain Blockscout.

5. Run the read-only deployment check:

   ```powershell
   $env:PREDICTION_VAULT_ADDRESS="0xVAULT..."
   npm run preflight:mainnet
   ```

Do not continue unless source verification and preflight both pass.

## Gate 5 — website staged with transactions disabled

Configure Vercel with:

```env
NEXT_PUBLIC_PREDICTION_NETWORK=mainnet
NEXT_PUBLIC_PREDICTION_LAUNCH_ENABLED=false
NEXT_PUBLIC_PREDICTION_VAULT_ADDRESS=0xVAULT...
NEXT_PUBLIC_ROBINHOOD_MAINNET_RPC_URL=https://your-production-rpc
NEXT_PUBLIC_PREDICTION_TERMS_URL=https://www.agentsinhood.xyz/your-published-terms
```

Deploy and inspect the page. It must show **Mainnet launch locked**, and wallet
transactions must remain disabled.

Only after the contract, source verification, timestamps, Safe ownership,
eligibility registry, terms, monitoring, and page have all been checked should
the owner change:

```env
NEXT_PUBLIC_PREDICTION_LAUNCH_ENABLED=true
```

That Vercel change is the final website enablement. It does not alter contract
timers and cannot undo an already submitted contract transaction.

## Settlement

1. Publish a result artifact containing the scoring inputs, final percentages,
   end timestamp, source response, and audited code commit.
2. Hash that exact artifact and have the Safe call `proposeResult`.
3. Keep the evidence public for the complete on-chain dispute window.
4. If the proposal is wrong, retract it during the dispute window with a public
   reason hash and propose a corrected result.
5. After the dispute window, anyone can call `finalizeResult`. The Safe can no
   longer retract or cancel the matured proposal.
6. Winners claim their proportional payout themselves. A cancelled round gives
   each participant an exact pull-payment refund.
