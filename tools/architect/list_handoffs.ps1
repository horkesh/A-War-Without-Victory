<#
.SYNOPSIS
    List pending handoff inbox items.
    Shows: run_id | task_name | status | generated_at

.EXAMPLE
    .\tools\architect\list_handoffs.ps1
#>

$ErrorActionPreference = "SilentlyContinue"

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { $repoRoot = "F:\A-War-Without-Victory" }

$inboxDir = Join-Path $repoRoot "handoffs\inbox"

if (-not (Test-Path $inboxDir)) {
    Write-Host "Inbox is empty (directory not found: $inboxDir)" -ForegroundColor DarkGray
    exit 0
}

$items = Get-ChildItem -Path $inboxDir -Filter "*.json" | Sort-Object LastWriteTime -Descending

if ($items.Count -eq 0) {
    Write-Host "Inbox is empty." -ForegroundColor DarkGray
    exit 0
}

Write-Host ""
Write-Host "=== AWWV Handoff Inbox ===" -ForegroundColor Cyan
Write-Host ("{0,-45} {1,-25} {2,-15} {3}" -f "RUN_ID", "TASK_NAME", "STATUS", "GENERATED_AT") -ForegroundColor White
Write-Host ("{0,-45} {1,-25} {2,-15} {3}" -f ("-"*44), ("-"*24), ("-"*14), ("-"*24)) -ForegroundColor DarkGray

foreach ($item in $items) {
    try {
        $review = Get-Content $item.FullName -Raw | ConvertFrom-Json
        $runId       = if ($review.run_id)       { $review.run_id }       else { $item.BaseName }
        $taskName    = if ($review.task_name)     { $review.task_name }    else { "?" }
        $status      = if ($review.status)        { $review.status }       else { "unknown" }
        $generatedAt = if ($review.generated_at)  { $review.generated_at } else { "?" }

        # Truncate for display
        if ($runId.Length    -gt 44) { $runId    = $runId.Substring(0,41) + "..." }
        if ($taskName.Length -gt 24) { $taskName = $taskName.Substring(0,21) + "..." }

        $color = if ($status -eq "needs_review") { "Yellow" } else { "Gray" }

        Write-Host ("{0,-45} {1,-25} {2,-15} {3}" -f $runId, $taskName, $status, $generatedAt) -ForegroundColor $color
    } catch {
        Write-Host "  [parse error] $($item.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Total: $($items.Count) item(s). Use .\tools\architect\show_handoff.ps1 to inspect." -ForegroundColor DarkGray
Write-Host ""
