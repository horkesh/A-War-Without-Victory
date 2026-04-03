<#
.SYNOPSIS
    Execute a Claude Code handoff prompt non-interactively.

.DESCRIPTION
    Reads a markdown prompt file from handoffs/, executes it via `claude -p`,
    captures JSON output (session ID, result, cost), and writes results to
    handoffs/results/<timestamp>_<name>/.

.PARAMETER PromptFile
    Path to the handoff prompt markdown file.

.PARAMETER Name
    Human-readable name for this run (used in folder name and session label).
    Defaults to the prompt filename without extension.

.PARAMETER Worktree
    If set, runs in an isolated git worktree via --worktree.

.PARAMETER Model
    Model to use (default: opus).

.PARAMETER PermissionMode
    Permission mode (default: bypassPermissions for automated runs).

.PARAMETER MaxBudget
    Maximum USD budget for this run (default: 5).

.EXAMPLE
    .\run_handoff.ps1 -PromptFile handoffs\sector-cleanup.md
    .\run_handoff.ps1 -PromptFile handoffs\sector-cleanup.md -Name "sector-v1" -Worktree
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$PromptFile,

    [string]$Name,

    [switch]$Worktree,

    [string]$Model = "opus",

    [string]$PermissionMode = "bypassPermissions",

    [double]$MaxBudget = 5.0
)

$ErrorActionPreference = "Stop"

# Resolve paths
$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { $repoRoot = "F:\A-War-Without-Victory" }

$promptPath = Resolve-Path $PromptFile -ErrorAction Stop
$promptContent = Get-Content -Path $promptPath -Raw

if (-not $Name) {
    $Name = [System.IO.Path]::GetFileNameWithoutExtension($promptPath)
}

# Create timestamped result directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runId = "${timestamp}_${Name}"
$resultDir = Join-Path $repoRoot "handoffs\results\$runId"
New-Item -ItemType Directory -Path $resultDir -Force | Out-Null

# Log metadata
$meta = @{
    run_id = $runId
    name = $Name
    prompt_file = $promptPath.Path
    model = $Model
    permission_mode = $PermissionMode
    max_budget = $MaxBudget
    worktree = $Worktree.IsPresent
    started_at = (Get-Date -Format "o")
    status = "running"
}
$meta | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $resultDir "meta.json")

# Copy prompt for audit trail
Copy-Item $promptPath (Join-Path $resultDir "prompt.md")

Write-Host "=== AWWV Handoff Runner ===" -ForegroundColor Cyan
Write-Host "Run ID:   $runId"
Write-Host "Prompt:   $($promptPath.Path)"
Write-Host "Model:    $Model"
Write-Host "Budget:   `$$MaxBudget"
Write-Host "Worktree: $($Worktree.IsPresent)"
Write-Host ""

# Build claude command
# NOTE: $args is a reserved automatic variable in PowerShell; use $claudeArgs to avoid splatting issues.
$claudeArgs = @(
    "-p"
    "--output-format", "json"
    "--model", $Model
    "--permission-mode", $PermissionMode
    "--max-budget-usd", $MaxBudget.ToString([System.Globalization.CultureInfo]::InvariantCulture)
    "--name", "handoff:$Name"
)

if ($Worktree) {
    $claudeArgs += "--worktree"
}

# Set handoff env vars so Stop/Notification hooks can scope themselves
$env:AWWV_HANDOFF_RUN_ID     = $runId
$env:AWWV_HANDOFF_RESULT_DIR = $resultDir

Write-Host "Executing claude..." -ForegroundColor Yellow
$startTime = Get-Date

try {
    # Pipe prompt content to claude via stdin
    $rawResult = $promptContent | claude @claudeArgs 2>&1
    $exitCode = $LASTEXITCODE
} catch {
    $rawResult = $_.Exception.Message
    $exitCode = 1
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

# Save raw output
$rawResult | Set-Content (Join-Path $resultDir "raw_output.json") -Encoding UTF8

# Try to parse JSON result
$parsed = $null
$sessionId = $null
$resultText = ""
try {
    $parsed = $rawResult | ConvertFrom-Json
    $sessionId = $parsed.session_id
    $resultText = $parsed.result
    if (-not $resultText -and $parsed.content) {
        # Handle array-of-blocks format
        $resultText = ($parsed.content | Where-Object { $_.type -eq "text" } | ForEach-Object { $_.text }) -join "`n"
    }
} catch {
    # Not JSON — treat raw output as text
    $resultText = ($rawResult | Out-String).Trim()
}

# Save parsed outputs
if ($resultText) {
    $resultText | Set-Content (Join-Path $resultDir "response.md") -Encoding UTF8
}
if ($sessionId) {
    $sessionId | Set-Content (Join-Path $resultDir "session_id.txt") -Encoding UTF8
}

# Update metadata
$meta.status = if ($exitCode -eq 0) { "completed" } else { "failed" }
$meta.finished_at = (Get-Date -Format "o")
$meta.duration_seconds = [math]::Round($duration, 1)
$meta.exit_code = $exitCode
if ($sessionId) { $meta.session_id = $sessionId }
$meta | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $resultDir "meta.json")

# Generate inbox artifact unconditionally — Stop hook fires before response.md/meta.json
# are written, so we always regenerate here with complete data.
$reviewFile = Join-Path $resultDir "architect_review.json"
$writeReviewScript = Join-Path $PSScriptRoot "hooks\write_review.ps1"
if (Test-Path $writeReviewScript) {
    try {
        & powershell -ExecutionPolicy Bypass -File $writeReviewScript -ResultDir $resultDir
    } catch {
        Write-Warning "Could not generate architect_review.json: $_"
    }
}

# Slack notification (no-op if AWWV_SLACK_WEBHOOK_URL not set)
$notifySlack = Join-Path $PSScriptRoot "hooks\notify_slack.ps1"
if (Test-Path $notifySlack) {
    $review = $null
    try { $review = Get-Content $reviewFile -Raw | ConvertFrom-Json } catch { }
    if ($review) {
        $slackMsg    = if ($review.summary)    { $review.summary }    else { '' }
        $slackStatus = if ($review.status)     { $review.status }     else { 'needs_review' }
        $slackSid    = if ($review.session_id) { $review.session_id } else { '' }
        $slackCommit = if ($review.commit_hash){ $review.commit_hash } else { '' }
        & powershell -ExecutionPolicy Bypass -File $notifySlack `
            -Title "AWWV Handoff" `
            -Message $slackMsg `
            -Status $slackStatus `
            -RunId $runId `
            -SessionId $slackSid `
            -CommitHash $slackCommit `
            -ResultPath $resultDir
    }
}

# Clear handoff env vars (scope cleanup)
$env:AWWV_HANDOFF_RUN_ID     = $null
$env:AWWV_HANDOFF_RESULT_DIR = $null

# Summary
Write-Host ""
Write-Host "=== Run Complete ===" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })
Write-Host "Status:     $($meta.status)"
Write-Host "Duration:   $([math]::Round($duration, 1))s"
Write-Host "Results:    $resultDir"
if ($sessionId) {
    Write-Host "Session ID: $sessionId" -ForegroundColor Cyan
    Write-Host "Resume:     claude -r $sessionId"
}
if (Test-Path $reviewFile) {
    Write-Host "Review:     $reviewFile" -ForegroundColor Cyan
    Write-Host "Inbox:      .\tools\architect\show_handoff.ps1" -ForegroundColor DarkGray
}
Write-Host ""

# Return result dir for scripting
return $resultDir
