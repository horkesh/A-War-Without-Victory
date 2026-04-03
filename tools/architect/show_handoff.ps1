<#
.SYNOPSIS
    Show details of a handoff inbox item, including a paste-ready architect summary.

.PARAMETER RunId
    Specific run ID to display. If omitted, shows the most recent inbox item.

.EXAMPLE
    .\tools\architect\show_handoff.ps1
    .\tools\architect\show_handoff.ps1 -RunId 20260403_190000_sector-cleanup
#>

param(
    [string]$RunId
)

$ErrorActionPreference = "SilentlyContinue"

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { $repoRoot = "F:\A-War-Without-Victory" }

$inboxDir = Join-Path $repoRoot "handoffs\inbox"

if (-not (Test-Path $inboxDir)) {
    Write-Host "Inbox directory not found: $inboxDir" -ForegroundColor Red
    exit 1
}

# Resolve target file
$targetFile = $null
if ($RunId) {
    $targetFile = Join-Path $inboxDir "$RunId.json"
    if (-not (Test-Path $targetFile)) {
        Write-Host "No inbox item found for run ID: $RunId" -ForegroundColor Red
        exit 1
    }
} else {
    # Most recent
    $latest = Get-ChildItem -Path $inboxDir -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Host "Inbox is empty." -ForegroundColor DarkGray
        exit 0
    }
    $targetFile = $latest.FullName
}

# Parse
$review = $null
try {
    $review = Get-Content $targetFile -Raw | ConvertFrom-Json
} catch {
    Write-Host "Failed to parse $targetFile" -ForegroundColor Red
    exit 1
}

# --- Detailed display ---
Write-Host ""
Write-Host "=== HANDOFF REVIEW ===" -ForegroundColor Cyan
Write-Host "Run ID:       $($review.run_id)"
Write-Host "Task:         $($review.task_name)"
Write-Host "Status:       $($review.status)" -ForegroundColor $(if ($review.status -eq "needs_review") { "Yellow" } else { "Gray" })
Write-Host "Branch:       $($review.branch)"
Write-Host "Commit:       $($review.commit_hash)"
Write-Host "Session ID:   $($review.session_id)"
Write-Host "Generated:    $($review.generated_at)"
Write-Host ""

Write-Host "--- SUMMARY ---" -ForegroundColor White
Write-Host $review.summary
Write-Host ""

if ($review.files_changed -and $review.files_changed.Count -gt 0) {
    Write-Host "--- FILES CHANGED ($($review.files_changed.Count)) ---" -ForegroundColor White
    foreach ($f in $review.files_changed) {
        Write-Host "  - $f"
    }
    Write-Host ""
}

if ($review.completion_block) {
    Write-Host "--- COMPLETION BLOCK ---" -ForegroundColor White
    Write-Host $review.completion_block
    Write-Host ""
}

# --- Paste-ready architect block ---
$separator = "=" * 60
$taskDisplay = $review.task_name
$pasteBlock = @"

$separator
=== HANDOFF RESULT: $taskDisplay ===
Run:    $($review.run_id)
Branch: $($review.branch) | Commit: $($review.commit_hash)
Status: $($review.status)

SUMMARY:
$(if ($review.summary.Length -gt 300) { $review.summary.Substring(0,300) + "..." } else { $review.summary })

FILES CHANGED:
$(if ($review.files_changed -and $review.files_changed.Count -gt 0) { ($review.files_changed | ForEach-Object { "- $_" }) -join "`n" } else { "(none detected)" })

COMPLETION BLOCK:
$(if ($review.completion_block) { $review.completion_block } else { "(none found)" })
$separator

"@

Write-Host "--- PASTE THIS TO ARCHITECT ---" -ForegroundColor Cyan
Write-Host $pasteBlock

# Also copy result dir path for convenience
$resultDir = Join-Path $repoRoot "handoffs\results\$($review.run_id)"
if (Test-Path $resultDir) {
    Write-Host "Full response: $resultDir\response.md" -ForegroundColor DarkGray
}
