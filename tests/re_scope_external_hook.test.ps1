param()

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$installerPath = Join-Path $repoRoot "scripts/repo/install_re_scope_hook.ps1"

if (-not (Test-Path -LiteralPath $installerPath)) {
    throw "RED: external RE scope hook installer is not implemented"
}

$fixture = Join-Path ([System.IO.Path]::GetTempPath()) ("awwv-re-hook-" + [guid]::NewGuid().ToString("N"))
$hooksDirectory = Join-Path $fixture "external-hooks"
New-Item -ItemType Directory -Path $fixture | Out-Null

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & git -C $fixture @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($exitCode -ne 0) { throw "git $($Arguments -join ' ') failed: $($output -join '; ')" }
    return $output
}

function Write-FixtureFile {
    param([string]$RelativePath, [string]$Content)
    $path = Join-Path $fixture $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path) | Out-Null
    Set-Content -LiteralPath $path -Value $Content -NoNewline
}

try {
    Invoke-Git init | Out-Null
    Invoke-Git config user.email "scope-hook@example.invalid" | Out-Null
    Invoke-Git config user.name "Scope Hook Test" | Out-Null
    Invoke-Git config core.autocrlf false | Out-Null

    Copy-Item -LiteralPath (Join-Path $repoRoot "scripts/repo/check_re_scope.ps1") -Destination (New-Item -ItemType Directory -Force -Path (Join-Path $fixture "scripts/repo")).FullName
    Write-FixtureFile ".husky/pre-commit" "#!/bin/sh`nexit 0`n"
    Write-FixtureFile "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" @'
{
  "schema_version": 1,
  "status": "active",
  "lane": "RE",
  "task": "RE-GUARDRAIL",
  "packet": "external-hook-test",
  "base_commit": "0000000000000000000000000000000000000000",
  "allowlist": ["docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json"],
  "denylist": ["data/scenarios/**", "data/calibration/**", "data/source/calibration/**", "data/reference/**", "data/refs/**", "docs/10_canon/FORAWWV.md"],
  "long_run_policy": {"permitted": false, "maximum_clean_pairs_per_exact_commit": 1},
  "failure_policy": {"read_only_diagnoses_per_failure": 1, "out_of_scope_implementation": "stop-and-queue", "calibration_result_authorizes_re_fix": false}
}
'@
    Invoke-Git add . | Out-Null
    Invoke-Git commit -m "fixture guard" | Out-Null

    $lockFile = Join-Path $fixture "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json"
    $lock = Get-Content -Raw -LiteralPath $lockFile | ConvertFrom-Json
    $lock.base_commit = "$(Invoke-Git rev-parse HEAD)".Trim()
    Write-FixtureFile "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($lock | ConvertTo-Json -Depth 6)
    Invoke-Git add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Install -RepoRoot $fixture -HooksDirectory $hooksDirectory
    if ($LASTEXITCODE -ne 0) { throw "installer failed" }

    $configuredHooks = "$(Invoke-Git config --worktree --get core.hooksPath)".Trim()
    if ($configuredHooks -cne $hooksDirectory) { throw "worktree hooksPath was not installed exactly" }
    foreach ($key in @(
        "awwv.reScope.approvedLockSha256",
        "awwv.reScope.approvedCheckerSha256",
        "awwv.reScope.approvedProjectHookSha256",
        "awwv.reScope.externalRunnerSha256",
        "awwv.reScope.externalPreCommitSha256"
    )) {
        $value = "$(Invoke-Git config --worktree --get $key)".Trim()
        if ($value -notmatch '^[0-9a-f]{64}$') { throw "missing pinned hash config: $key" }
    }
    foreach ($path in @("pre-commit", "invoke_re_scope_pre_commit.ps1", "re_scope_hook_manifest.json")) {
        if (-not (Test-Path -LiteralPath (Join-Path $hooksDirectory $path))) { throw "missing installed external hook file: $path" }
    }

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Verify -RepoRoot $fixture -HooksDirectory $hooksDirectory
    if ($LASTEXITCODE -ne 0) { throw "verification failed after install" }

    foreach ($tamperPath in @("invoke_re_scope_pre_commit.ps1", "pre-commit")) {
        Set-Content -LiteralPath (Join-Path $hooksDirectory $tamperPath) -Value "exit 0`n" -NoNewline
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $tamperOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Verify -RepoRoot $fixture -HooksDirectory $hooksDirectory 2>&1
            $tamperExit = $LASTEXITCODE
        }
        finally {
            $ErrorActionPreference = $previousPreference
        }
        if ($tamperExit -eq 0) { throw "verification accepted tampered external file: $tamperPath" }
        if (($tamperOutput -join "`n") -notmatch "external manifest reviewed hashes mismatch") {
            throw "tampered external file failure was not explicit for ${tamperPath}: $($tamperOutput -join '; ')"
        }
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Install -RepoRoot $fixture -HooksDirectory $hooksDirectory
        if ($LASTEXITCODE -ne 0) { throw "reinstall failed after tampering $tamperPath" }
    }

    Write-FixtureFile ".husky/pre-commit" "#!/bin/sh`n# changed after review`nexit 0`n"
    Invoke-Git add .husky/pre-commit | Out-Null
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $hookTamperOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Verify -RepoRoot $fixture -HooksDirectory $hooksDirectory 2>&1
        $hookTamperExit = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($hookTamperExit -eq 0) { throw "verification accepted a staged project hook changed after review" }
    if (($hookTamperOutput -join "`n") -notmatch "external manifest reviewed hashes mismatch") {
        throw "staged project-hook tamper failure was not explicit"
    }
    Invoke-Git restore --staged --worktree .husky/pre-commit | Out-Null
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Install -RepoRoot $fixture -HooksDirectory $hooksDirectory
    if ($LASTEXITCODE -ne 0) { throw "reinstall failed after restoring project hook" }

    Invoke-Git commit -m "activate reviewed packet lock" | Out-Null

    # Re-arm a reviewed packet whose allowlist names a denied path. Deny precedence must still
    # block it, and the external hook must execute the pinned INDEX checker even if the working
    # checker is replaced with a no-op after review.
    $lock = Get-Content -Raw -LiteralPath $lockFile | ConvertFrom-Json
    $lock.base_commit = "$(Invoke-Git rev-parse HEAD)".Trim()
    $lock.allowlist = @($lock.allowlist) + "data/scenarios/blocked.json"
    Write-FixtureFile "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($lock | ConvertTo-Json -Depth 6)
    Write-FixtureFile "data/scenarios/blocked.json" "{}`n"
    Invoke-Git add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json data/scenarios/blocked.json | Out-Null
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Install -RepoRoot $fixture -HooksDirectory $hooksDirectory
    if ($LASTEXITCODE -ne 0) { throw "re-arm failed" }
    Write-FixtureFile "scripts/repo/check_re_scope.ps1" "exit 0`n"

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $commitOutput = & git -C $fixture commit -m "must be blocked by staged checker" 2>&1
        $commitExit = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($commitExit -eq 0) { throw "external hook accepted denied staged path through a no-op working checker" }
    if (($commitOutput -join "`n") -notmatch "data/scenarios/blocked.json.*denylist") {
        throw "external hook did not report the staged checker's denylist violation: $($commitOutput -join '; ')"
    }

    Invoke-Git config --worktree awwv.reScope.approvedLockSha256 "0000000000000000000000000000000000000000000000000000000000000000" | Out-Null
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $verifyOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -Mode Verify -RepoRoot $fixture -HooksDirectory $hooksDirectory 2>&1
        $verifyExit = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($verifyExit -eq 0) { throw "verification accepted a tampered approved lock hash" }
    if (($verifyOutput -join "`n") -notmatch "approved lock hash config mismatch") {
        throw "tampered-hash failure was not explicit"
    }

    Write-Output "RE external scope hook tests: PASS"
}
finally {
    Remove-Item -LiteralPath $fixture -Recurse -Force
}
