<#
.SYNOPSIS
    Generate architect_review.json and copy to handoffs/inbox/.
    Idempotent — safe to call multiple times.

.PARAMETER ResultDir
    Absolute path to the handoff result directory.
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$ResultDir
)

$ErrorActionPreference = "SilentlyContinue"

# Resolve repo root
$repoRoot = (git -C $ResultDir rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { $repoRoot = "F:\A-War-Without-Victory" }

$metaFile     = Join-Path $ResultDir "meta.json"
$responseFile = Join-Path $ResultDir "response.md"
$reviewFile   = Join-Path $ResultDir "architect_review.json"
$inboxDir     = Join-Path $repoRoot "handoffs\inbox"

# Bail if meta.json doesn't exist — nothing to review
if (-not (Test-Path $metaFile)) {
    Write-Warning "write_review.ps1: meta.json not found in $ResultDir"
    exit 1
}

# Read meta
$meta = Get-Content $metaFile -Raw | ConvertFrom-Json

# Read response text
$responseText = ""
if (Test-Path $responseFile) {
    $responseText = Get-Content $responseFile -Raw -Encoding UTF8
}

# Summary: first 500 chars
$summary = if ($responseText.Length -gt 500) { $responseText.Substring(0, 500) } else { $responseText }
$summary = $summary.Trim()

# Completion block: lines after "## Done" or "Done means:" pattern
$completionBlock = ""
$donePattern = [regex]'(?im)^(##\s*Done|Done means:)'
$doneMatch = $donePattern.Match($responseText)
if ($doneMatch.Success) {
    $afterDone = $responseText.Substring($doneMatch.Index + $doneMatch.Length).Trim()
    # Take up to 1000 chars of what follows
    $completionBlock = if ($afterDone.Length -gt 1000) { $afterDone.Substring(0, 1000) } else { $afterDone }
    $completionBlock = $completionBlock.Trim()
}

# Git info — run from repo root
$commitHash = (git -C $repoRoot log -1 --pretty=%H 2>$null) -replace "`n",""
$branch     = (git -C $repoRoot branch --show-current 2>$null) -replace "`n",""
$filesChangedRaw = git -C $repoRoot diff --name-only HEAD 2>$null
$filesChanged = @()
if ($filesChangedRaw) {
    $filesChanged = $filesChangedRaw -split "`n" | Where-Object { $_ -ne "" }
}

# Also check untracked/staged (git status --short)
$statusRaw = git -C $repoRoot status --short 2>$null
$statusFiles = @()
if ($statusRaw) {
    $statusFiles = ($statusRaw -split "`n" | Where-Object { $_ -ne "" } | ForEach-Object { $_.Substring(3).Trim() })
}
# Merge and deduplicate
$allChanged = ($filesChanged + $statusFiles) | Sort-Object -Unique

# Build review object
$review = [ordered]@{
    task_name        = $meta.name
    run_id           = $meta.run_id
    session_id       = if ($meta.session_id) { $meta.session_id } else { "" }
    branch           = $branch
    commit_hash      = $commitHash
    summary          = $summary
    files_changed    = $allChanged
    tests_run        = $false
    completion_block = $completionBlock
    status           = "needs_review"
    generated_at     = (Get-Date -Format "o")
}

$reviewJson = $review | ConvertTo-Json -Depth 6
$reviewJson | Set-Content $reviewFile -Encoding UTF8

# Copy to inbox
if (-not (Test-Path $inboxDir)) {
    New-Item -ItemType Directory -Path $inboxDir -Force | Out-Null
}
$inboxFile = Join-Path $inboxDir "$($meta.run_id).json"
$reviewJson | Set-Content $inboxFile -Encoding UTF8

Write-Host "Review written: $reviewFile" -ForegroundColor Green
Write-Host "Inbox copy:     $inboxFile" -ForegroundColor Green
