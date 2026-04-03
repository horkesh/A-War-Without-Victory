<#
.SYNOPSIS
    Send a Slack notification for handoff events.
    No-op (prints SKIPPED) if no webhook URL is available.
    Prints SENT on success, ERROR:<msg> on failure.

.PARAMETER WebhookUrl
    Explicit webhook URL. Takes precedence over AWWV_SLACK_WEBHOOK_URL env var.
    Pass from the caller to avoid relying on env var inheritance into subprocesses.
.PARAMETER Title
    Notification title.
.PARAMETER Message
    Summary text (first ~150 chars shown).
.PARAMETER Status
    One of: needs_review, blocked, needs_input, completed.
.PARAMETER RunId
    Handoff run identifier.
.PARAMETER SessionId
    Claude session ID.
.PARAMETER CommitHash
    Git HEAD at completion.
.PARAMETER ResultPath
    Path to result directory.
.PARAMETER DryRun
    Print payload without sending.
#>
param(
    [string]$WebhookUrl = "",
    [string]$Title   = "AWWV Handoff",
    [string]$Message = "",
    [string]$Status  = "needs_review",
    [string]$RunId   = "",
    [string]$SessionId  = "",
    [string]$CommitHash = "",
    [string]$ResultPath = "",
    [switch]$DryRun
)

# Status emoji mapping
$emojiMap = @{
    "needs_review" = [char]::ConvertFromUtf32(0x1F4CB)  # clipboard
    "blocked"      = [char]::ConvertFromUtf32(0x1F6A8)  # rotating light
    "needs_input"  = [char]::ConvertFromUtf32(0x270B)    # raised hand
    "completed"    = [char]::ConvertFromUtf32(0x2705)    # check mark
}
$emoji = if ($emojiMap.ContainsKey($Status)) { $emojiMap[$Status] } else { "" }

# Extract task name from run ID (strip timestamp prefix)
$taskName = if ($RunId) { $RunId -replace '^\d{8}_\d{6}_', '' } else { "unknown" }

# Truncate message to 150 chars
$snippet = if ($Message.Length -gt 150) { $Message.Substring(0, 150) + "..." } else { $Message }
$snippet = ($snippet -replace "`r`n|`n", " ").Trim()

# Short commit hash
$shortCommit = if ($CommitHash.Length -ge 8) { $CommitHash.Substring(0, 8) } else { $CommitHash }

# Build message text
$lines = @("$emoji *$Title $Status*")
if ($taskName)    { $lines += "Task: $taskName" }
if ($RunId)       { $lines += "Run: $RunId" }
if ($shortCommit) { $lines += "Commit: $shortCommit" }
if ($SessionId)   { $lines += "Session: $SessionId" }
if ($ResultPath)  { $lines += "Path: $ResultPath" }
if ($snippet)     { $lines += "" ; $lines += "> $snippet" }

$text = $lines -join "`n"

# Build payload
$payload = @{ text = $text } | ConvertTo-Json -Depth 2 -Compress

if ($DryRun) {
    Write-Host "[DryRun] Slack payload:" -ForegroundColor Cyan
    Write-Host $payload
    exit 0
}

# Resolve webhook URL: explicit parameter takes precedence over env var.
# Caller should pass -WebhookUrl to avoid relying on env var inheritance
# across powershell subprocess boundaries.
$resolvedUrl = if ($WebhookUrl) { $WebhookUrl } else { $env:AWWV_SLACK_WEBHOOK_URL }
if (-not $resolvedUrl) {
    Write-Output "SKIPPED"
    exit 0
}

# Send — emit status word so caller can log it; never throw.
try {
    Invoke-RestMethod -Uri $resolvedUrl -Method Post -ContentType "application/json" -Body $payload -ErrorAction Stop | Out-Null
    Write-Output "SENT"
} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
}

exit 0
