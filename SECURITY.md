# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability. Use the repository's **Security**
tab to submit a private vulnerability report to the maintainers.

Include the affected component and commit, reproduction steps, realistic impact, and a suggested
fix if available. Do not include a live private key, seed phrase, API token, or other secret. If a
secret may have been exposed, rotate or revoke it immediately before sending the report.

Reports involving signing, wallet access, transaction validation, budget or circuit-breaker
bypasses, dependency compromise, public verification integrity, prediction-vault fund safety,
incorrect payout accounting, result-resolution authorization, reentrancy, denial of claims, or
secret disclosure are treated as high priority.

The prediction vault is an unaudited testnet prototype. Do not send assets with monetary value to
it. A future mainnet proposal must receive an independent smart-contract audit and legal review;
passing the repository tests is not a substitute for either review.

There is currently no bug-bounty program or guaranteed response time. Please allow maintainers a
reasonable remediation window before public disclosure.
