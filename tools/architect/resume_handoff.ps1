<#
.SYNOPSIS
    Resume a previous Claude Code handoff session.

.DESCRIPTION
    Looks up a session ID from a handoff result directory and resumes it
    interactively or with a new prompt.

.PARAMETER ResultDir
    Path to a handoffs/results/<run_id>/ directory.

.PARAMETER SessionId
    Direct session ID (alternative to ResultDir).

.PARAMETER Prompt
    Optional follow-up prompt. If omitted, resumes interactively.

.EXAMPLE
    .\resume_handoff.ps1 -ResultDir handoffs\results\20260403_190000_sector-v1
    .\resume_handoff.ps1 -SessionId abc-123 -Prompt "Now run the tests"
#>

param(
    [string]$ResultDir,
    [string]$SessionId,
    [string]$Prompt
)

$ErrorActionPreference = "Stop"

if (-not $SessionId -and $ResultDir) {
    $sidFile = Join-Path $ResultDir "session_id.txt"
    if (Test-Path $sidFile) {
        $SessionId = (Get-Content $sidFile).Trim()
    } else {
        # Try meta.json
        $metaFile = Join-Path $ResultDir "meta.json"
        if (Test-Path $metaFile) {
            $meta = Get-Content $metaFile | ConvertFrom-Json
            $SessionId = $meta.session_id
        }
    }
}

if (-not $SessionId) {
    Write-Host "ERROR: No session ID found. Provide -SessionId or -ResultDir with a saved session." -ForegroundColor Red
    exit 1
}

Write-Host "Resuming session: $SessionId" -ForegroundColor Cyan

if ($Prompt) {
    # Non-interactive follow-up
    $Prompt | claude -r $SessionId -p --output-format json
} else {
    # Interactive resume
    claude -r $SessionId
}
