[CmdletBinding()]
param(
    [string]$RpcUrl = $env:ROBINHOOD_MAINNET_RPC_URL,
    [string]$OwnerAddress = $env:PREDICTION_OWNER_ADDRESS,
    [string]$EligibleAccounts = $env:PREDICTION_INITIAL_ELIGIBLE_ACCOUNTS,
    [string]$MinimumStakeEth = "0.0001",
    [string]$MaximumStakePerWalletEth = "0.005",
    [string]$MaximumPoolEth = "0.05",
    [int]$StartDelaySeconds = 86400,
    [int]$DisputeSeconds = 3600,
    [string]$TermsUrl = "https://www.agentsinhood.xyz/predict/rules"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Read-RequiredValue {
    param(
        [string]$CurrentValue,
        [string]$Prompt
    )

    if (-not [string]::IsNullOrWhiteSpace($CurrentValue)) {
        return $CurrentValue.Trim()
    }

    $entered = Read-Host $Prompt
    if ([string]::IsNullOrWhiteSpace($entered)) {
        throw "$Prompt is required."
    }
    return $entered.Trim()
}

$RpcUrl = Read-RequiredValue $RpcUrl "Production Robinhood Chain RPC URL"
$OwnerAddress = Read-RequiredValue $OwnerAddress "Deployed owner-contract address"
$EligibleAccounts = Read-RequiredValue $EligibleAccounts "Initial eligible wallet addresses (comma-separated)"

$privateKeyWasProvided = -not [string]::IsNullOrWhiteSpace(
    $env:PREDICTION_MAINNET_DEPLOYER_PRIVATE_KEY
)
$privateKeyPlaintext = $null
$privateKeyPointer = [IntPtr]::Zero

try {
    if (-not $privateKeyWasProvided) {
        $securePrivateKey = Read-Host "Single-use deployer private key" -AsSecureString
        $privateKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
            $securePrivateKey
        )
        $privateKeyPlaintext = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
            $privateKeyPointer
        )
        if ($privateKeyPlaintext -notmatch '^0x[0-9a-fA-F]{64}$') {
            throw "The deployer private key must be 0x followed by 64 hexadecimal characters."
        }
        $env:PREDICTION_MAINNET_DEPLOYER_PRIVATE_KEY = $privateKeyPlaintext
    }

    $env:ROBINHOOD_MAINNET_RPC_URL = $RpcUrl
    $env:PREDICTION_OWNER_ADDRESS = $OwnerAddress
    $env:PREDICTION_INITIAL_ELIGIBLE_ACCOUNTS = $EligibleAccounts
    $env:PREDICTION_START_DELAY_SECONDS = [string]$StartDelaySeconds
    $env:PREDICTION_DISPUTE_SECONDS = [string]$DisputeSeconds
    $env:PREDICTION_MINIMUM_STAKE_ETH = $MinimumStakeEth
    $env:PREDICTION_MAXIMUM_STAKE_PER_WALLET_ETH = $MaximumStakePerWalletEth
    $env:PREDICTION_MAXIMUM_POOL_ETH = $MaximumPoolEth
    $env:PREDICTION_TERMS_URL = $TermsUrl

    Write-Host ""
    Write-Host "This will deploy two immutable contracts on Robinhood Chain mainnet." -ForegroundColor Yellow
    Write-Host "Website launch remains disabled after contract deployment." -ForegroundColor Yellow
    $confirmation = Read-Host "Type LAUNCH MAINNET to continue"
    if ($confirmation -cne "LAUNCH MAINNET") {
        throw "Launch cancelled. No deployment command was run."
    }

    $env:PREDICTION_MAINNET_LAUNCH_ACK =
        "I_HAVE_WRITTEN_APPROVAL_AND_ACCEPT_MAINNET_RISK"

    npm run launch:mainnet
    if ($LASTEXITCODE -ne 0) {
        throw "Mainnet launch command failed. Keep the website launch switch disabled."
    }

    Write-Host ""
    Write-Host "Contracts deployed. Keep this terminal output and send only the public manifest back to Codex." -ForegroundColor Green
    Write-Host "Never send the private key." -ForegroundColor Yellow
}
finally {
    if (-not $privateKeyWasProvided) {
        Remove-Item Env:PREDICTION_MAINNET_DEPLOYER_PRIVATE_KEY -ErrorAction SilentlyContinue
    }
    $privateKeyPlaintext = $null
    if ($privateKeyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($privateKeyPointer)
    }
}
