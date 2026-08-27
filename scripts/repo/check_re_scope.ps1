param(
    [switch]$Staged,
    [string]$RepoRoot
)

$ErrorActionPreference = "Stop"
$lockRelativePath = "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json"
$requiredDenyPatterns = @(
    "data/scenarios/**",
    "data/calibration/**",
    "data/source/calibration/**",
    "data/reference/**",
    "data/refs/**",
    "docs/10_canon/FORAWWV.md"
)

function Stop-ScopeCheck {
    param([string]$Message)
    Write-Error "RE scope check failed: $Message"
    exit 1
}

function Get-NormalizedPath {
    param([string]$Path)
    return ($Path.Trim() -replace '\\', '/')
}

function Test-ValidRepoPattern {
    param([string]$Pattern)
    if ([string]::IsNullOrWhiteSpace($Pattern)) { return $false }
    $normalized = Get-NormalizedPath $Pattern
    return -not ([System.IO.Path]::IsPathRooted($normalized) -or $normalized -match '(^|/)\.\.(/|$)')
}

function Test-PathMatchesPattern {
    param([string]$Path, [string]$Pattern)
    $normalizedPath = Get-NormalizedPath $Path
    $normalizedPattern = Get-NormalizedPath $Pattern
    $escaped = [regex]::Escape($normalizedPattern)
    $escaped = $escaped.Replace('\*\*', '__DOUBLE_STAR__')
    $escaped = $escaped.Replace('\*', '[^/]*')
    $escaped = $escaped.Replace('__DOUBLE_STAR__', '.*')
    $escaped = $escaped.Replace('\?', '[^/]')
    return $normalizedPath -match "^$escaped`$"
}

function Get-Sha256Hex {
    param([byte[]]$Bytes)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace("-", "").ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
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
    if (-not $process.Start()) { Stop-ScopeCheck "cannot start git show for $RevisionPath" }
    $memory = New-Object System.IO.MemoryStream
    try {
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $errorText = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) {
            Stop-ScopeCheck "cannot read $RevisionPath from git: $errorText"
        }
        return $memory.ToArray()
    }
    finally {
        $memory.Dispose()
        $process.Dispose()
    }
}

function Get-OptionalWorktreeConfig {
    param([string]$Key)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = @(& git config --worktree --get $Key 2>$null)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -eq 1) { return $null }
    if ($exitCode -ne 0) { Stop-ScopeCheck "cannot read worktree config '$Key'" }
    return ($output -join "`n").Trim()
}

function Get-GitLines {
    param([string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = @(& git @Arguments 2>$null)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -ne 0) {
        Stop-ScopeCheck "git $($Arguments -join ' ') failed with exit code $exitCode"
    }
    return @($output | ForEach-Object { "$_" } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Get-LockContent {
    if ($Staged) {
        $stagedLockPath = @(Get-GitLines @("ls-files", "--cached", "--", $lockRelativePath))
        if ($stagedLockPath.Count -eq 0) {
            Stop-ScopeCheck "missing RE scope lock in the staged index: $lockRelativePath"
        }
        return Get-GitBlobBytes ":$lockRelativePath"
    }

    $lockPath = Join-Path $RepoRoot $lockRelativePath
    if (-not (Test-Path -LiteralPath $lockPath -PathType Leaf)) {
        Stop-ScopeCheck "missing RE scope lock: $lockRelativePath"
    }
    return [System.IO.File]::ReadAllBytes($lockPath)
}

function Get-ChangedFiles {
    if ($Staged) {
        return @(Get-GitLines @("diff", "--cached", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB"))
    }

    $files = @()
    $files += @(Get-GitLines @("diff", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB"))
    $files += @(Get-GitLines @("diff", "--cached", "--no-renames", "--name-only", "--diff-filter=ACDMRTUXB"))
    $files += @(Get-GitLines @("ls-files", "--others", "--exclude-standard"))
    return @($files | ForEach-Object { Get-NormalizedPath $_ } | Sort-Object -Unique)
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $rootOutput = @(& git rev-parse --show-toplevel 2>&1)
    if ($LASTEXITCODE -ne 0 -or $rootOutput.Count -ne 1) {
        Stop-ScopeCheck "cannot resolve repository root"
    }
    $RepoRoot = $rootOutput[0]
}

try {
    $RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
}
catch {
    Stop-ScopeCheck "repository root does not exist: $RepoRoot"
}

Push-Location $RepoRoot
try {
    $resolvedGitRoot = Get-GitLines @("rev-parse", "--show-toplevel") | Select-Object -First 1
    if ((Resolve-Path -LiteralPath $resolvedGitRoot).Path -ne $RepoRoot) {
        Stop-ScopeCheck "RepoRoot is not the repository root: $RepoRoot"
    }

    $lockBytes = Get-LockContent
    try {
        $lock = ([System.Text.Encoding]::UTF8.GetString($lockBytes)) | ConvertFrom-Json
    }
    catch {
        Stop-ScopeCheck "lock is not valid JSON: $($_.Exception.Message)"
    }

    if ($lock.schema_version -ne 1) {
        Stop-ScopeCheck "unsupported schema_version '$($lock.schema_version)'; expected 1"
    }
    if ($lock.status -ne "active") {
        Stop-ScopeCheck "lock is stale because status is '$($lock.status)'; expected active"
    }
    foreach ($field in @("lane", "task", "packet", "base_commit")) {
        if ([string]::IsNullOrWhiteSpace("$($lock.$field)")) {
            Stop-ScopeCheck "lock is missing required field '$field'"
        }
    }
    if ($lock.lane -ne "RE") {
        Stop-ScopeCheck "lock lane must be 'RE', got '$($lock.lane)'"
    }
    if ("$($lock.base_commit)" -notmatch '^[0-9a-f]{40}$') {
        Stop-ScopeCheck "base_commit must be a full lowercase 40-character commit id"
    }

    $allowlist = @($lock.allowlist)
    $denylist = @($lock.denylist)
    if ($allowlist.Count -eq 0) { Stop-ScopeCheck "allowlist must not be empty" }
    if ($denylist.Count -eq 0) { Stop-ScopeCheck "denylist must not be empty" }
    foreach ($path in $allowlist) {
        if (-not (Test-ValidRepoPattern "$path") -or "$path" -match '[*?\[]') {
            Stop-ScopeCheck "allowlist entries must be exact repository files; invalid entry '$path'"
        }
    }
    foreach ($pattern in $denylist) {
        if (-not (Test-ValidRepoPattern "$pattern")) {
            Stop-ScopeCheck "invalid repository pattern '$pattern'"
        }
    }
    foreach ($requiredPattern in $requiredDenyPatterns) {
        if ($denylist -notcontains $requiredPattern) {
            Stop-ScopeCheck "denylist is missing mandatory pattern '$requiredPattern'"
        }
    }

    if ($null -eq $lock.long_run_policy -or
        $lock.long_run_policy.permitted -isnot [bool] -or
        $lock.long_run_policy.maximum_clean_pairs_per_exact_commit -ne 1) {
        Stop-ScopeCheck "long_run_policy must set an explicit boolean permitted value and maximum_clean_pairs_per_exact_commit=1"
    }
    if ($null -eq $lock.failure_policy -or
        $lock.failure_policy.read_only_diagnoses_per_failure -ne 1 -or
        $lock.failure_policy.out_of_scope_implementation -ne "stop-and-queue" -or
        $lock.failure_policy.calibration_result_authorizes_re_fix -ne $false) {
        Stop-ScopeCheck "failure_policy must enforce one diagnosis, stop-and-queue, and non-authorizing calibration"
    }

    $approvedLockHash = Get-OptionalWorktreeConfig "awwv.reScope.approvedLockSha256"
    if ($approvedLockHash) {
        $actualLockHash = Get-Sha256Hex $lockBytes
        if ($actualLockHash -cne $approvedLockHash.ToLowerInvariant()) {
            Stop-ScopeCheck "approved lock SHA-256 mismatch"
        }
    }
    $approvedCheckerHash = Get-OptionalWorktreeConfig "awwv.reScope.approvedCheckerSha256"
    if ($approvedCheckerHash) {
        $checkerBytes = if ($Staged) {
            Get-GitBlobBytes ":scripts/repo/check_re_scope.ps1"
        }
        else {
            [System.IO.File]::ReadAllBytes((Join-Path $RepoRoot "scripts/repo/check_re_scope.ps1"))
        }
        if ((Get-Sha256Hex $checkerBytes) -cne $approvedCheckerHash.ToLowerInvariant()) {
            Stop-ScopeCheck "approved checker SHA-256 mismatch"
        }
    }

    $changedFiles = @(Get-ChangedFiles)

    $headCommit = "$(Get-GitLines @("rev-parse", "HEAD") | Select-Object -First 1)".Trim()
    if ($headCommit -cne "$($lock.base_commit)") {
        if ($changedFiles.Count -gt 0) {
            Stop-ScopeCheck "base_commit mismatch: lock=$($lock.base_commit), HEAD=$headCommit"
        }
        & git merge-base --is-ancestor "$($lock.base_commit)" HEAD 2>$null
        if ($LASTEXITCODE -ne 0) {
            Stop-ScopeCheck "sealed lock base is not an ancestor of HEAD"
        }
        Write-Output "RE scope check: SEALED (clean tree; lane=$($lock.lane); task=$($lock.task); packet=$($lock.packet); packet-base=$($lock.base_commit); HEAD=$headCommit)"
        exit 0
    }

    $violations = @()
    $protectedGuardPaths = @(".husky/pre-commit", "scripts/repo/check_re_scope.ps1")
    if ($lock.task -ne "RE-GUARDRAIL" -and @($changedFiles | Where-Object { $protectedGuardPaths -ccontains $_ }).Count -gt 0) {
        Stop-ScopeCheck "guard maintenance requires task RE-GUARDRAIL"
    }
    foreach ($file in $changedFiles) {
        $normalizedFile = Get-NormalizedPath $file
        $deniedBy = @($denylist | Where-Object { Test-PathMatchesPattern $normalizedFile "$_" })
        if ($deniedBy.Count -gt 0) {
            $violations += "$normalizedFile (denylist: $($deniedBy -join ', '))"
            continue
        }
        $allowed = $allowlist -ccontains $normalizedFile
        if (-not $allowed) {
            $violations += "$normalizedFile (outside allowlist)"
        }
    }

    if ($violations.Count -gt 0) {
        Stop-ScopeCheck ("scope violations:`n- " + ($violations -join "`n- "))
    }

    $mode = if ($Staged) { "staged" } else { "working tree" }
    Write-Output "RE scope check: OK ($mode; lane=$($lock.lane); task=$($lock.task); packet=$($lock.packet); base=$headCommit)"
    exit 0
}
finally {
    Pop-Location
}
