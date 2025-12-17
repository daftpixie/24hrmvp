<#
.SYNOPSIS
    WalletConnect Cloud Diagnostic Tool
    
.DESCRIPTION
    Tests if your WalletConnect Project ID is valid and domains are configured.
#>

$ErrorActionPreference = "Stop"

Write-Host @"

================================================================
   WalletConnect Cloud Diagnostic Tool
================================================================

"@ -ForegroundColor Cyan

# Get Project ID
$projectId = $null
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=([a-f0-9]+)') {
        $projectId = $matches[1]
    }
}

if (-not $projectId) {
    $projectId = Read-Host "Enter your WalletConnect Project ID"
}

Write-Host "`nProject ID: $projectId" -ForegroundColor Yellow
Write-Host "Testing connection to WalletConnect Cloud..." -ForegroundColor Gray

# Test the WalletConnect Cloud API
try {
    $response = Invoke-WebRequest -Uri "https://relay.walletconnect.com" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "[OK] WalletConnect relay is reachable" -ForegroundColor Green
} catch {
    Write-Host "[!] Cannot reach WalletConnect relay - check network" -ForegroundColor Red
}

# Test project config endpoint (this is what fails with 403)
try {
    $configUrl = "https://api.web3modal.org/getProjects?projectId=$projectId"
    $response = Invoke-RestMethod -Uri $configUrl -Method GET -TimeoutSec 5
    Write-Host "[OK] Project ID is valid" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        Write-Host @"

[X] HTTP 403 Forbidden - Domain not allowlisted

Your Project ID exists but 'localhost' is not in the allowed domains.

FIX:
1. Go to https://cloud.walletconnect.com/
2. Select your project
3. Click "Domains" in the sidebar  
4. Add these domains:
   - localhost
   - 24hrmvp.xyz
5. Save and wait 1-2 minutes for propagation

"@ -ForegroundColor Red
    } elseif ($statusCode -eq 404) {
        Write-Host @"

[X] HTTP 404 Not Found - Project does not exist

The Project ID '$projectId' was not found.

FIX:
1. Go to https://cloud.walletconnect.com/
2. Verify the project exists
3. Copy the correct Project ID
4. Update .env.local

"@ -ForegroundColor Red
    } else {
        Write-Host "[!] Unexpected error: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host @"

================================================================
   Manual Verification Steps
================================================================

1. Open: https://cloud.walletconnect.com/

2. Find your project "24HRMVP"

3. Check the "Domains" section:
   
   Required domains:
   +------------------+
   | localhost        |  <- For development
   | 24hrmvp.xyz      |  <- For production
   +------------------+

4. If domains are missing, add them and save.

5. Wait 1-2 minutes for changes to propagate.

6. Run: npm run dev

"@ -ForegroundColor Cyan
