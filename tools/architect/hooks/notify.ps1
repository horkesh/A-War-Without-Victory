<#
.SYNOPSIS
    Send a Windows notification. Never fails — all errors are silently swallowed.

.PARAMETER Message
    Notification body text.

.PARAMETER Title
    Notification title (default: AWWV Handoff).
#>
param(
    [string]$Message = "Task complete",
    [string]$Title = "AWWV Handoff"
)

# Always non-fatal
try {
    # Attempt 1: BurntToast module (best UX, optional dep)
    $bt = Get-Module -ListAvailable BurntToast -ErrorAction SilentlyContinue
    if ($bt) {
        Import-Module BurntToast -ErrorAction SilentlyContinue
        New-BurntToastNotification -Text $Title, $Message -ErrorAction SilentlyContinue
        exit 0
    }
} catch { }

try {
    # Attempt 2: msg * (built-in Windows, works without extra deps)
    & msg * /TIME:5 "AWWV: $Message" 2>$null
} catch { }

try {
    # Attempt 3: Terminal bell + colored Write-Host
    [console]::beep(800, 300)
} catch { }

Write-Host ""
Write-Host "*** $Title ***" -ForegroundColor Cyan
Write-Host "    $Message" -ForegroundColor Yellow
Write-Host ""
