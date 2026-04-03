<#
.SYNOPSIS
    Create a new handoff prompt file from the standard template.

.PARAMETER Name
    Kebab-case name for the handoff (e.g. "sector-cleanup", "friction-wiring").

.EXAMPLE
    .\new_handoff.ps1 -Name sector-cleanup
    # Creates handoffs/sector-cleanup.md from template
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Name
)

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) { $repoRoot = "F:\A-War-Without-Victory" }

$targetPath = Join-Path $repoRoot "handoffs\$Name.md"

if (Test-Path $targetPath) {
    Write-Host "ERROR: $targetPath already exists." -ForegroundColor Red
    exit 1
}

$templatePath = Join-Path $repoRoot "handoffs\TEMPLATE.md"
if (-not (Test-Path $templatePath)) {
    Write-Host "ERROR: Template not found at $templatePath" -ForegroundColor Red
    exit 1
}

Copy-Item $templatePath $targetPath
Write-Host "Created: $targetPath" -ForegroundColor Green
Write-Host "Edit the file, then run:"
Write-Host "  .\tools\architect\run_handoff.ps1 -PromptFile handoffs\$Name.md" -ForegroundColor Cyan
