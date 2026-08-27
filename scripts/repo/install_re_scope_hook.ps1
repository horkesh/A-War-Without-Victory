param(
    [ValidateSet("Install", "Verify")]
    [string]$Mode = "Verify",
    [string]$RepoRoot,
    [string]$HooksDirectory
)

$ErrorActionPreference = "Stop"
$lockPath = "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json"
$checkerPath = "scripts/repo/check_re_scope.ps1"
$projectHookPath = ".husky/pre-commit"

function Stop-Installer {
    param([string]$Message)
    Write-Error "RE external hook $($Mode.ToLowerInvariant()) failed: $Message"
    exit 1
}

function Invoke-GitLines {
    param([string[]]$Arguments, [switch]$AllowMissing)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = @(& git @Arguments 2>$null)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($AllowMissing -and $exitCode -eq 1) { return @() }
    if ($exitCode -ne 0) { Stop-Installer "git $($Arguments -join ' ') exited $exitCode" }
    return @($output | ForEach-Object { "$_" })
}

function Get-GitBlobBytes {
    param([string]$RevisionPath)
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "git"
    $startInfo.Arguments = "show `"$RevisionPath`""
    $startInfo.WorkingDirectory = $RepoRoot
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { Stop-Installer "cannot start git show for $RevisionPath" }
    $memory = New-Object System.IO.MemoryStream
    try {
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $errorText = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { Stop-Installer "cannot read reviewed blob ${RevisionPath}: $errorText" }
        return $memory.ToArray()
    }
    finally {
        $memory.Dispose()
        $process.Dispose()
    }
}

function Get-Sha256Hex {
    param([byte[]]$Bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace("-", "").ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function Get-ConfigValue {
    param([string]$Key)
    return "$(Invoke-GitLines @("config", "--worktree", "--get", $Key) -AllowMissing)".Trim()
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = "$(Invoke-GitLines @("rev-parse", "--show-toplevel"))".Trim()
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Push-Location $RepoRoot
try {
    if ([string]::IsNullOrWhiteSpace($HooksDirectory)) {
        $gitDirectory = "$(Invoke-GitLines @("rev-parse", "--git-dir"))".Trim()
        if (-not [System.IO.Path]::IsPathRooted($gitDirectory)) { $gitDirectory = Join-Path $RepoRoot $gitDirectory }
        $HooksDirectory = Join-Path $gitDirectory "re-scope-hooks"
    }
    $HooksDirectory = [System.IO.Path]::GetFullPath($HooksDirectory)

    $lockBytes = Get-GitBlobBytes ":$lockPath"
    $checkerBytes = Get-GitBlobBytes ":$checkerPath"
    $projectHookBytes = Get-GitBlobBytes ":$projectHookPath"
    $lockHash = Get-Sha256Hex $lockBytes
    $checkerHash = Get-Sha256Hex $checkerBytes
    $projectHookHash = Get-Sha256Hex $projectHookBytes
    $manifestPath = Join-Path $HooksDirectory "re_scope_hook_manifest.json"
    $runnerPath = Join-Path $HooksDirectory "invoke_re_scope_pre_commit.ps1"
    $preCommitPath = Join-Path $HooksDirectory "pre-commit"

    if ($Mode -eq "Install") {
        New-Item -ItemType Directory -Force -Path $HooksDirectory | Out-Null

        $quotedRoot = $RepoRoot.Replace("'", "''")
        $runner = @"
`$ErrorActionPreference = "Stop"
`$repoRoot = '$quotedRoot'
`$expectedLockHash = '$lockHash'
`$expectedCheckerHash = '$checkerHash'
`$expectedProjectHookHash = '$projectHookHash'

function Get-Sha256Hex([byte[]]`$bytes) {
    `$sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString(`$sha.ComputeHash(`$bytes))).Replace("-", "").ToLowerInvariant() }
    finally { `$sha.Dispose() }
}
function Get-IndexBlobBytes([string]`$path) {
    `$psi = New-Object System.Diagnostics.ProcessStartInfo
    `$psi.FileName = "git"
    `$psi.Arguments = "show :`$path"
    `$psi.WorkingDirectory = `$repoRoot
    `$psi.UseShellExecute = `$false
    `$psi.RedirectStandardOutput = `$true
    `$psi.RedirectStandardError = `$true
    `$process = New-Object System.Diagnostics.Process
    `$process.StartInfo = `$psi
    if (-not `$process.Start()) { throw "cannot start git show for staged `$path" }
    `$memory = New-Object System.IO.MemoryStream
    try {
        `$process.StandardOutput.BaseStream.CopyTo(`$memory)
        `$errorText = `$process.StandardError.ReadToEnd()
        `$process.WaitForExit()
        if (`$process.ExitCode -ne 0) { throw "staged `$path is unavailable: `$errorText" }
        return `$memory.ToArray()
    } finally { `$memory.Dispose(); `$process.Dispose() }
}

`$lockBytes = Get-IndexBlobBytes '$lockPath'
`$checkerBytes = Get-IndexBlobBytes '$checkerPath'
if ((Get-Sha256Hex `$lockBytes) -cne `$expectedLockHash) { throw "staged RE lock differs from reviewed pinned lock" }
if ((Get-Sha256Hex `$checkerBytes) -cne `$expectedCheckerHash) { throw "staged RE checker differs from reviewed pinned checker" }

`$tempChecker = [System.IO.Path]::GetTempFileName() + '.ps1'
`$tempHook = [System.IO.Path]::GetTempFileName() + '.sh'
try {
    [System.IO.File]::WriteAllBytes(`$tempChecker, `$checkerBytes)
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File `$tempChecker -Staged -RepoRoot `$repoRoot
    if (`$LASTEXITCODE -ne 0) { exit `$LASTEXITCODE }

    `$projectHookBytes = Get-IndexBlobBytes '$projectHookPath'
    if ((Get-Sha256Hex `$projectHookBytes) -cne `$expectedProjectHookHash) { throw "staged project hook differs from reviewed pinned hook" }
    [System.IO.File]::WriteAllBytes(`$tempHook, `$projectHookBytes)
    `$shCommand = Get-Command sh.exe -ErrorAction SilentlyContinue
    `$shExe = if (`$shCommand) { `$shCommand.Source } else { `$null }
    if (-not `$shExe) {
        `$cursor = Split-Path (Get-Command git.exe).Source -Parent
        for (`$i = 0; `$i -lt 5 -and -not `$shExe; `$i++) {
            foreach (`$relative in @('sh.exe', 'bin\sh.exe', 'usr\bin\sh.exe')) {
                `$candidate = Join-Path `$cursor `$relative
                if (Test-Path -LiteralPath `$candidate) { `$shExe = `$candidate; break }
            }
            `$cursor = Split-Path `$cursor -Parent
        }
    }
    if (-not `$shExe) { throw "Git for Windows sh.exe not found" }
    `$env:AWWV_RE_EXTERNAL_SCOPE_VERIFIED = '1'
    & `$shExe `$tempHook
    exit `$LASTEXITCODE
} finally {
    Remove-Item -LiteralPath `$tempChecker, `$tempHook -Force -ErrorAction SilentlyContinue
    Remove-Item Env:AWWV_RE_EXTERNAL_SCOPE_VERIFIED -ErrorAction SilentlyContinue
}
"@
        [System.IO.File]::WriteAllText($runnerPath, $runner, (New-Object System.Text.UTF8Encoding($false)))
        $runnerForShell = $runnerPath.Replace("\", "/").Replace('"', '\"')
        $preCommit = "#!/bin/sh`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$runnerForShell`"`n"
        [System.IO.File]::WriteAllText($preCommitPath, $preCommit, (New-Object System.Text.UTF8Encoding($false)))

        $runnerHash = Get-Sha256Hex ([System.IO.File]::ReadAllBytes($runnerPath))
        $externalHookHash = Get-Sha256Hex ([System.IO.File]::ReadAllBytes($preCommitPath))

        $manifest = [ordered]@{
            schema_version = 1
            repo_root = $RepoRoot
            hooks_directory = $HooksDirectory
            approved_lock_sha256 = $lockHash
            approved_checker_sha256 = $checkerHash
            approved_project_hook_sha256 = $projectHookHash
            external_runner_sha256 = $runnerHash
            external_pre_commit_sha256 = $externalHookHash
        }
        [System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))

        Invoke-GitLines @("config", "extensions.worktreeConfig", "true") | Out-Null
        Invoke-GitLines @("config", "--worktree", "core.hooksPath", $HooksDirectory) | Out-Null
        Invoke-GitLines @("config", "--worktree", "awwv.reScope.approvedLockSha256", $lockHash) | Out-Null
        Invoke-GitLines @("config", "--worktree", "awwv.reScope.approvedCheckerSha256", $checkerHash) | Out-Null
        Invoke-GitLines @("config", "--worktree", "awwv.reScope.approvedProjectHookSha256", $projectHookHash) | Out-Null
        Invoke-GitLines @("config", "--worktree", "awwv.reScope.externalRunnerSha256", $runnerHash) | Out-Null
        Invoke-GitLines @("config", "--worktree", "awwv.reScope.externalPreCommitSha256", $externalHookHash) | Out-Null
        Write-Output "RE external scope hook installed for the reviewed staged lock/checker."
    }

    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { Stop-Installer "missing external manifest" }
    if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) { Stop-Installer "missing external PowerShell runner" }
    if (-not (Test-Path -LiteralPath $preCommitPath -PathType Leaf)) { Stop-Installer "missing external pre-commit hook" }
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    if ($manifest.schema_version -ne 1 -or $manifest.repo_root -cne $RepoRoot -or $manifest.hooks_directory -cne $HooksDirectory) {
        Stop-Installer "external manifest identity mismatch"
    }
    $actualRunnerHash = Get-Sha256Hex ([System.IO.File]::ReadAllBytes($runnerPath))
    $actualExternalHookHash = Get-Sha256Hex ([System.IO.File]::ReadAllBytes($preCommitPath))
    if ($manifest.approved_lock_sha256 -cne $lockHash -or
        $manifest.approved_checker_sha256 -cne $checkerHash -or
        $manifest.approved_project_hook_sha256 -cne $projectHookHash -or
        $manifest.external_runner_sha256 -cne $actualRunnerHash -or
        $manifest.external_pre_commit_sha256 -cne $actualExternalHookHash) {
        Stop-Installer "external manifest reviewed hashes mismatch"
    }
    if ((Get-ConfigValue "core.hooksPath") -cne $HooksDirectory) { Stop-Installer "worktree hooksPath config mismatch" }
    if ((Get-ConfigValue "awwv.reScope.approvedLockSha256") -cne $lockHash) { Stop-Installer "approved lock hash config mismatch" }
    if ((Get-ConfigValue "awwv.reScope.approvedCheckerSha256") -cne $checkerHash) { Stop-Installer "approved checker hash config mismatch" }
    if ((Get-ConfigValue "awwv.reScope.approvedProjectHookSha256") -cne $projectHookHash) { Stop-Installer "approved project-hook hash config mismatch" }
    if ((Get-ConfigValue "awwv.reScope.externalRunnerSha256") -cne $actualRunnerHash) { Stop-Installer "external runner hash config mismatch" }
    if ((Get-ConfigValue "awwv.reScope.externalPreCommitSha256") -cne $actualExternalHookHash) { Stop-Installer "external pre-commit hash config mismatch" }
    Write-Output "RE external scope hook verification: OK"
}
finally {
    Pop-Location
}
