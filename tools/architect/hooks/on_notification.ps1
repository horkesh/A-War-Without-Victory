<#
.SYNOPSIS
    Notification hook — fires when Claude emits a user notification
    (e.g. waiting for input, permission needed).
    Checks AWWV_HANDOFF_RESULT_DIR; if absent, is a silent no-op.
    Reads JSON context from stdin (Claude hook protocol).
#>

$ErrorActionPreference = "SilentlyContinue"

# Read stdin
$stdinRaw = ""
try {
    $stdinRaw = [Console]::In.ReadToEnd()
} catch { }

# Scope guard
$resultDir = $env:AWWV_HANDOFF_RESULT_DIR
if (-not $resultDir -or -not (Test-Path $resultDir)) {
    exit 0
}

# Parse notification data
$message   = ""
$sessionId = ""
try {
    $hookData  = $stdinRaw | ConvertFrom-Json
    $message   = if ($hookData.message)    { $hookData.message }    else { "" }
    $sessionId = if ($hookData.session_id) { $hookData.session_id } else { "" }
} catch { }

# Append to notifications.log
$logFile  = Join-Path $resultDir "notifications.log"
$logEntry = "[$(Get-Date -Format 'o')] $message"
Add-Content -Path $logFile -Value $logEntry -Encoding UTF8

# Ring terminal bell
try { [console]::beep(800, 300) } catch { }

# If the notification is about waiting for input, write a status marker
$needsInput = $message -imatch '(waiting|input|permission|confirm|proceed)'
if ($needsInput) {
    "needs_input" | Set-Content (Join-Path $resultDir "status.txt") -Encoding UTF8
}

exit 0
