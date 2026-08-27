param()

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$checkerPath = Join-Path $repoRoot "scripts/repo/check_re_scope.ps1"

if (-not (Test-Path -LiteralPath $checkerPath)) {
    throw "RED: RE scope checker is not implemented at $checkerPath"
}

$script:failures = @()

function Invoke-Git {
    param(
        [string]$WorkingDirectory,
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    $output = & git -C $WorkingDirectory @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed:`n$($output -join "`n")"
    }
    return $output
}

function Write-TextFile {
    param([string]$Root, [string]$RelativePath, [string]$Content)

    $path = Join-Path $Root $RelativePath
    $parent = Split-Path -Parent $path
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    Set-Content -LiteralPath $path -Value $Content -NoNewline
}

function New-ScopeFixture {
    $root = Join-Path ([System.IO.Path]::GetTempPath()) ("awwv-re-scope-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $root | Out-Null
    Invoke-Git $root init | Out-Null
    Invoke-Git $root config user.email "scope-guard@example.invalid" | Out-Null
    Invoke-Git $root config user.name "Scope Guard Test" | Out-Null
    Invoke-Git $root config core.autocrlf false | Out-Null

    Write-TextFile $root "src/allowed.ts" "baseline`n"
    Write-TextFile $root "src/outside.ts" "baseline`n"
    Write-TextFile $root "data/scenarios/war_1992.json" "{}`n"
    Write-TextFile $root "data/scenarios/war_1995.json" "{}`n"
    Invoke-Git $root add . | Out-Null
    Invoke-Git $root commit -m "fixture" | Out-Null
    $base = "$(Invoke-Git $root rev-parse HEAD)".Trim()

    $lock = [ordered]@{
        schema_version = 1
        status = "active"
        lane = "RE"
        task = "guard-test"
        packet = "guard-test"
        base_commit = $base
        allowlist = @(
            "src/allowed.ts",
            "src/allowed-renamed.json",
            "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json",
            "scripts/repo/check_re_scope.ps1",
            ".husky/pre-commit"
        )
        denylist = @(
            "data/scenarios/**",
            "data/calibration/**",
            "data/source/calibration/**",
            "data/reference/**",
            "data/refs/**",
            "docs/10_canon/FORAWWV.md"
        )
        long_run_policy = [ordered]@{
            permitted = $false
            maximum_clean_pairs_per_exact_commit = 1
        }
        failure_policy = [ordered]@{
            read_only_diagnoses_per_failure = 1
            out_of_scope_implementation = "stop-and-queue"
            calibration_result_authorizes_re_fix = $false
        }
    }
    Write-TextFile $root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($lock | ConvertTo-Json -Depth 5)
    return [pscustomobject]@{ Root = $root; Lock = $lock }
}

function Invoke-Guard {
    param([string]$Root, [switch]$Staged)

    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $checkerPath, "-RepoRoot", $Root)
    if ($Staged) { $arguments += "-Staged" }
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & powershell.exe @arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    return [pscustomobject]@{ ExitCode = $exitCode; Output = ($output -join "`n") }
}

function Assert-Guard {
    param(
        [string]$Name,
        [scriptblock]$Arrange,
        [int]$ExpectedExit,
        [string[]]$ExpectedText = @(),
        [switch]$Staged
    )

    $fixture = New-ScopeFixture
    try {
        & $Arrange $fixture
        $result = Invoke-Guard -Root $fixture.Root -Staged:$Staged
        if ($result.ExitCode -ne $ExpectedExit) {
            throw "expected exit $ExpectedExit, got $($result.ExitCode):`n$($result.Output)"
        }
        foreach ($text in $ExpectedText) {
            if ($result.Output -notmatch [regex]::Escape($text)) {
                throw "expected output containing '$text':`n$($result.Output)"
            }
        }
        Write-Output "PASS: $Name"
    }
    catch {
        $script:failures += "FAIL: ${Name}: $($_.Exception.Message)"
    }
    finally {
        Remove-Item -LiteralPath $fixture.Root -Recurse -Force
    }
}

Assert-Guard "accepts an allowed working-tree file" {
    param($fixture)
    Write-TextFile $fixture.Root "src/allowed.ts" "changed`n"
} 0 @("RE scope check: OK")

Assert-Guard "accepts an allowed staged file" {
    param($fixture)
    Write-TextFile $fixture.Root "src/allowed.ts" "changed`n"
    Invoke-Git $fixture.Root add src/allowed.ts | Out-Null
    Invoke-Git $fixture.Root add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null
} 0 @("RE scope check: OK") -Staged

Assert-Guard "rejects war_1992.json and war_1995.json" {
    param($fixture)
    Write-TextFile $fixture.Root "data/scenarios/war_1992.json" "{`"changed`":1992}`n"
    Write-TextFile $fixture.Root "data/scenarios/war_1995.json" "{`"changed`":1995}`n"
} 1 @("data/scenarios/war_1992.json", "data/scenarios/war_1995.json", "denylist")

Assert-Guard "rejects a staged file outside the allowlist" {
    param($fixture)
    Write-TextFile $fixture.Root "src/outside.ts" "changed`n"
    Invoke-Git $fixture.Root add src/outside.ts | Out-Null
    Invoke-Git $fixture.Root add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null
} 1 @("src/outside.ts", "allowlist") -Staged

Assert-Guard "rejects a working rename from a denied source into an allowed destination" {
    param($fixture)
    Invoke-Git $fixture.Root mv data/scenarios/war_1992.json src/allowed-renamed.json | Out-Null
} 1 @("data/scenarios/war_1992.json", "denylist")

Assert-Guard "rejects a staged rename from an outside source into an allowed destination" {
    param($fixture)
    Invoke-Git $fixture.Root mv src/outside.ts src/allowed-renamed.json | Out-Null
    Invoke-Git $fixture.Root add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null
} 1 @("src/outside.ts", "allowlist") -Staged

Assert-Guard "staged mode fails when a new lock remains untracked" {
    param($fixture)
    Write-TextFile $fixture.Root "src/allowed.ts" "changed`n"
    Invoke-Git $fixture.Root add src/allowed.ts | Out-Null
} 1 @("missing RE scope lock in the staged index") -Staged

Assert-Guard "staged mode fails when the lock is omitted" {
    param($fixture)
    Remove-Item -LiteralPath (Join-Path $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json")
    Write-TextFile $fixture.Root "src/allowed.ts" "changed`n"
    Invoke-Git $fixture.Root add src/allowed.ts | Out-Null
} 1 @("missing RE scope lock in the staged index") -Staged

Assert-Guard "staged mode fails when a tracked lock is deleted" {
    param($fixture)
    Invoke-Git $fixture.Root add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null
    Invoke-Git $fixture.Root commit -m "track lock" | Out-Null
    Invoke-Git $fixture.Root rm docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null
} 1 @("missing RE scope lock in the staged index") -Staged

Assert-Guard "clean post-packet commit passes as sealed" {
    param($fixture)
    Invoke-Git $fixture.Root add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null
    Invoke-Git $fixture.Root commit -m "complete packet" | Out-Null
} 0 @("RE scope check: SEALED")

Assert-Guard "sealed stale lock rejects any new change" {
    param($fixture)
    Invoke-Git $fixture.Root add docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json | Out-Null
    Invoke-Git $fixture.Root commit -m "complete packet" | Out-Null
    Write-TextFile $fixture.Root "src/allowed.ts" "changed`n"
} 1 @("base_commit mismatch")

Assert-Guard "rejects wildcard allowlist entries" {
    param($fixture)
    $fixture.Lock.allowlist = @("src/**", "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json")
    Write-TextFile $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($fixture.Lock | ConvertTo-Json -Depth 5)
} 1 @("allowlist entries must be exact repository files")

Assert-Guard "rejects a lock that differs from the approved worktree hash" {
    param($fixture)
    Invoke-Git $fixture.Root config extensions.worktreeConfig true | Out-Null
    Invoke-Git $fixture.Root config --worktree awwv.reScope.approvedLockSha256 "0000000000000000000000000000000000000000000000000000000000000000" | Out-Null
} 1 @("approved lock SHA-256 mismatch")

Assert-Guard "accepts an explicit future long-run permission while retaining the one-pair limit" {
    param($fixture)
    $fixture.Lock.long_run_policy.permitted = $true
    Write-TextFile $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($fixture.Lock | ConvertTo-Json -Depth 5)
} 0 @("RE scope check: OK")

Assert-Guard "rejects a long-run policy above one clean pair" {
    param($fixture)
    $fixture.Lock.long_run_policy.maximum_clean_pairs_per_exact_commit = 2
    Write-TextFile $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($fixture.Lock | ConvertTo-Json -Depth 5)
} 1 @("long_run_policy must set an explicit boolean")

Assert-Guard "fails closed when the lock is missing" {
    param($fixture)
    Remove-Item -LiteralPath (Join-Path $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json")
} 1 @("missing RE scope lock")

Assert-Guard "fails closed when the lock schema is stale" {
    param($fixture)
    $fixture.Lock.schema_version = 0
    Write-TextFile $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($fixture.Lock | ConvertTo-Json -Depth 5)
} 1 @("unsupported schema_version")

Assert-Guard "fails closed when HEAD does not match base_commit" {
    param($fixture)
    $fixture.Lock.base_commit = "0000000000000000000000000000000000000000"
    Write-TextFile $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($fixture.Lock | ConvertTo-Json -Depth 5)
} 1 @("base_commit mismatch")

Assert-Guard "rejects checker maintenance outside RE-GUARDRAIL" {
    param($fixture)
    $fixture.Lock.task = "RE-T2"
    Write-TextFile $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($fixture.Lock | ConvertTo-Json -Depth 5)
    Write-TextFile $fixture.Root "scripts/repo/check_re_scope.ps1" "changed`n"
} 1 @("guard maintenance requires task RE-GUARDRAIL")

Assert-Guard "rejects project-hook maintenance outside RE-GUARDRAIL" {
    param($fixture)
    $fixture.Lock.task = "RE-T2"
    Write-TextFile $fixture.Root "docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json" ($fixture.Lock | ConvertTo-Json -Depth 5)
    Write-TextFile $fixture.Root ".husky/pre-commit" "changed`n"
} 1 @("guard maintenance requires task RE-GUARDRAIL")

function Assert-RepositoryContract {
    param([string]$Name, [scriptblock]$Assertion)
    try {
        & $Assertion
        Write-Output "PASS: $Name"
    }
    catch {
        $script:failures += "FAIL: ${Name}: $($_.Exception.Message)"
    }
}

Assert-RepositoryContract "package exposes the manual RE scope command" {
    $package = Get-Content -Raw -LiteralPath (Join-Path $repoRoot "package.json") | ConvertFrom-Json
    if ($package.scripts.'governance:re:scope' -ne 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/repo/check_re_scope.ps1') {
        throw "missing or incorrect governance:re:scope script"
    }
}

Assert-RepositoryContract "package exposes external hook install and verify commands" {
    $package = Get-Content -Raw -LiteralPath (Join-Path $repoRoot "package.json") | ConvertFrom-Json
    if ($package.scripts.'governance:re:hook:install' -ne 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/repo/install_re_scope_hook.ps1 -Mode Install') {
        throw "missing or incorrect governance:re:hook:install script"
    }
    if ($package.scripts.'governance:re:hook:verify' -ne 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/repo/install_re_scope_hook.ps1 -Mode Verify') {
        throw "missing or incorrect governance:re:hook:verify script"
    }
}

Assert-RepositoryContract "active pre-commit blocks on staged RE scope before typecheck decisions" {
    $hook = Get-Content -Raw -LiteralPath (Join-Path $repoRoot ".husky/pre-commit")
    $scopeIndex = $hook.IndexOf('check_re_scope.ps1 -Staged')
    $typecheckDecisionIndex = $hook.IndexOf('needs_typecheck=0')
    if ($scopeIndex -lt 0) { throw "pre-commit does not invoke the staged RE scope checker" }
    if ($typecheckDecisionIndex -lt 0 -or $scopeIndex -gt $typecheckDecisionIndex) {
        throw "RE scope checker must run before the hook can skip or run typecheck"
    }
}

Assert-RepositoryContract "project hook delegates scope only after external pinned verification" {
    $hook = Get-Content -Raw -LiteralPath (Join-Path $repoRoot ".husky/pre-commit")
    if ($hook -notmatch 'AWWV_RE_EXTERNAL_SCOPE_VERIFIED') {
        throw "project hook lacks the external-verification delegation guard"
    }
}

Assert-RepositoryContract "guard scripts have explicit stable EOL attributes" {
    $attributes = Get-Content -Raw -LiteralPath (Join-Path $repoRoot ".gitattributes")
    if ($attributes -notmatch '(?m)^\.husky/\* text eol=lf\s*$') {
        throw "missing LF rule for .husky/*"
    }
    if ($attributes -notmatch '(?m)^\*\.ps1 text eol=lf\s*$') {
        throw "missing LF rule for *.ps1"
    }
}

if ($script:failures.Count -gt 0) {
    $script:failures | ForEach-Object { Write-Output $_ }
    exit 1
}

Write-Output "RE scope guard tests: PASS"
exit 0
