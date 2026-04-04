<#
.SYNOPSIS
    Send a Windows notification. Never fails -- all errors are silently swallowed.

.PARAMETER Message
    Notification body text.

.PARAMETER Title
    Notification title (default: AWWV Handoff).

.NOTES
    Canonical method: WScript.Shell Popup (modal dialog, auto-dismisses after timeout).
    Confirmed working on Windows 11 Pro 10.0.26200 (2026-04-04).

    Methods tested and their status:
      BurntToast              -- NOT INSTALLED on this machine; kept as optional first-try
      msg *                   -- exit 0 but no visible popup on Windows 11 + bash context
      Windows.UI.Notifications via Add-Type -AssemblyName -- assembly not found
      ContentType=WindowsRuntime Add-Type -- C# compiler rejects [void] keyword syntax
      WScript.Shell Popup     -- CONFIRMED WORKING; modal dialog, auto-dismiss after timeout
#>
param(
    [string]$Message = "Task complete",
    [string]$Title   = "AWWV Handoff"
)

$notified = $false

# Attempt 1: BurntToast (best UX if installed -- install once with Install-Module BurntToast)
if (-not $notified) {
    try {
        $bt = Get-Module -ListAvailable BurntToast -ErrorAction SilentlyContinue
        if ($bt) {
            Import-Module BurntToast -ErrorAction Stop
            New-BurntToastNotification -Text $Title, $Message -ErrorAction Stop
            Write-Host "[notify] BurntToast: delivered" -ForegroundColor Green
            $notified = $true
        } else {
            Write-Host "[notify] BurntToast: not installed -- skipped" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "[notify] BurntToast: failed -- $_" -ForegroundColor DarkGray
    }
}

# Attempt 2: WScript.Shell Popup -- CANONICAL PATH (confirmed working on this machine)
# Modal dialog, always visible, auto-dismisses after 8 seconds. Returns 1 (OK) or -1 (timeout).
if (-not $notified) {
    try {
        $wsh = New-Object -ComObject WScript.Shell -ErrorAction Stop
        $popupResult = $wsh.Popup($Message, 8, $Title, 0)
        Write-Host "[notify] WScript.Shell Popup: delivered (result=$popupResult)" -ForegroundColor Green
        $notified = $true
    } catch {
        Write-Host "[notify] WScript.Shell Popup: failed -- $_" -ForegroundColor DarkGray
    }
}

# Attempt 3: msg * (built-in Windows; works in some terminal-services configurations)
if (-not $notified) {
    try {
        $msgOut = & msg * /TIME:5 "AWWV: $Message" 2>&1
        $msgExit = $LASTEXITCODE
        if ($msgExit -eq 0) {
            Write-Host "[notify] msg *: sent (exit 0, visibility not guaranteed)" -ForegroundColor DarkGray
        } else {
            Write-Host "[notify] msg *: failed (exit $msgExit)" -ForegroundColor DarkGray
        }
        # Do not set $notified -- msg * silently fails on Windows 11 without terminal services
    } catch {
        Write-Host "[notify] msg *: failed -- $_" -ForegroundColor DarkGray
    }
}

if (-not $notified) {
    Write-Host "[notify] all visual methods failed -- audio only" -ForegroundColor Yellow
    try { [console]::beep(800, 300) } catch { }
}

# Always print the colored summary to terminal as secondary signal
Write-Host ""
Write-Host "*** $Title ***" -ForegroundColor Cyan
Write-Host "    $Message" -ForegroundColor Yellow
Write-Host ""

exit 0
