<#
.SYNOPSIS
    Stop hook — fires when Claude finishes a non-interactive session.
    Checks AWWV_HANDOFF_RESULT_DIR; if absent, is a silent no-op.
    Reads JSON context from stdin (Claude hook protocol).
#>

$ErrorActionPreference = "SilentlyContinue"

# Read stdin (Claude passes hook JSON here)
$stdinRaw = ""
try {
    $stdinRaw = [Console]::In.ReadToEnd()
} catch { }

# Scope guard — only act in handoff runs
$resultDir = $env:AWWV_HANDOFF_RESULT_DIR
$runId     = $env:AWWV_HANDOFF_RUN_ID
if (-not $resultDir -or -not (Test-Path $resultDir)) {
    exit 0
}

# Parse stdin for session context
$sessionId = ""
try {
    $hookData  = $stdinRaw | ConvertFrom-Json
    $sessionId = if ($hookData.session_id) { $hookData.session_id } else { "" }
} catch { }

# Write completion_signal.json
$signal = [ordered]@{
    run_id       = $runId
    session_id   = $sessionId
    status       = "completed"
    timestamp    = (Get-Date -Format "o")
    hook_source  = "Stop"
}
$signalFile = Join-Path $resultDir "completion_signal.json"
$signal | ConvertTo-Json -Depth 4 | Set-Content $signalFile -Encoding UTF8

# Generate architect_review.json (inbox artifact)
$scriptRoot = $PSScriptRoot
$writeReview = Join-Path $scriptRoot "write_review.ps1"
if (Test-Path $writeReview) {
    try {
        & powershell -ExecutionPolicy Bypass -File $writeReview -ResultDir $resultDir 2>$null
    } catch { }
}

# Fire Windows notification
$notify = Join-Path $scriptRoot "notify.ps1"
if (Test-Path $notify) {
    try {
        $taskName = if ($runId) { $runId -replace '^\d{8}_\d{6}_','' } else { "task" }
        & powershell -ExecutionPolicy Bypass -File $notify -Title "AWWV Handoff Complete" -Message "Run finished: $taskName" 2>$null
    } catch { }
}

exit 0
