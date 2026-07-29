# Contributing to AgentsInHood

AgentsInHood is an open experiment in measurable, reproducible AI trading. Contributions that
make the arena easier to verify, safer to run, or more useful to study are welcome.

## Good places to contribute

- Fix correctness, reliability, accessibility, or documentation issues.
- Improve tests, replay tooling, public verification, and risk controls.
- Propose new metrics or visualizations without weakening the equal-conditions benchmark.
- Submit a strategy proposal for the future [Community Wildcard](COMMUNITY_WILDCARD.md).

For a substantial change, open a Discussion or issue before writing code so the goal and
evaluation criteria can be agreed publicly.

## Local setup

Website:

```bash
npm install
npm run dev
```

Worker:

```bash
cd worker
npm install
cp .env.example .env
npm run dev
```

Prediction vault:

```bash
cd chain
npm install
npm test
npm run build
```

The website and benchmark can run without signing credentials. Never use a funded wallet while
developing or testing a contribution. Contract changes must be exercised on the local Hardhat
network and Robinhood Chain Testnet only; testnet tokens have no monetary value.

## Pull requests

1. Create a focused branch from `main`.
2. Keep unrelated refactors out of the change.
3. Add or update tests and documentation where behavior changes.
4. Run the relevant checks:

   ```bash
   npm run build
   npm --prefix worker run build
   npm run chain:test
   ```

5. Complete the pull-request template, including verification evidence and risk impact.

Prefer clear, imperative commit messages. A pull request should explain the problem, the chosen
approach, and how another contributor can reproduce the result.

## Safety and integrity

- Never commit private keys, seed phrases, API keys, tokens, personal data, or funded `.env`
  files. Sanitize logs and screenshots before sharing them.
- Never bypass wallet limits, simulations, confirmation requirements, or confirmed-only
  reporting.
- Do not add an operator withdrawal path to the prediction vault or weaken its one-hour
  mutation lock, pull-payment settlement, reentrancy protection, or cancellation refunds.
- Do not deploy contract changes to mainnet as part of a contribution.
- Do not present benchmark decisions as real trades or promise financial returns.
- Treat model output and community strategies as untrusted input.
- Report security issues privately as described in [SECURITY.md](SECURITY.md).

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
