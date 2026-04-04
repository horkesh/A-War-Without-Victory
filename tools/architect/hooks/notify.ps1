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
    # Attempt 3: Native Windows toast API (no extra dependencies required)
    Add-Type -AssemblyName Windows.UI.Notifications -ErrorAction SilentlyContinue
    Add-Type -AssemblyName Windows.Data.Xml.Dom -ErrorAction SilentlyContinue
    $template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02
    $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template)
    $xml.GetElementsByTagName("text")[0].AppendChild($xml.CreateTextNode($Title)) | Out-Null
    $xml.GetElementsByTagName("text")[1].AppendChild($xml.CreateTextNode($Message)) | Out-Null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("AWWV").Show($toast)
} catch { }

try {
    # Attempt 4: Terminal bell (always-available audio signal)
    [console]::beep(800, 300)
} catch { }

Write-Host ""
Write-Host "*** $Title ***" -ForegroundColor Cyan
Write-Host "    $Message" -ForegroundColor Yellow
Write-Host ""
