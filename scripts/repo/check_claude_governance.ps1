param(
    [switch]$Staged
)

$ErrorActionPreference = "Stop"

function Get-ChangedFiles {
    if ($Staged) {
        return @(git diff --cached --name-only --diff-filter=ACMR)
    }

    $files = @()
    $files += @(git diff --name-only --diff-filter=ACMR)
    $files += @(git diff --cached --name-only --diff-filter=ACMR)
    return $files | Sort-Object -Unique
}

function Require-Section {
    param(
        [string]$Content,
        [string]$Section
    )

    return $Content -match [regex]::Escape($Section)
}

$changed = Get-ChangedFiles | Where-Object { $_ -and $_.Trim() -ne "" }
if (-not $changed -or $changed.Count -eq 0) {
    Write-Output "Claude governance check: no relevant changed files."
    exit 0
}

$artifactPath = "docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md"
$requiresGovernance = $false
$roadmapChanged = $false
$operationsChanged = $false

foreach ($file in $changed) {
    if ($file -eq "docs/plans/MASTER_ROADMAP.md") {
        $requiresGovernance = $true
        $roadmapChanged = $true
        continue
    }

    if ($file -match '^src/sim/combat/' -or
        $file -match '^src/ui/map/' -or
        $file -eq 'src/desktop/electron-main.cjs' -or
        $file -match '^docs/20_engineering/' -or
        $file -match '^\.claude/commands/' -or
        $file -match '^\.claude/agents/') {
        $requiresGovernance = $true
    }

    if ($file -match 'sector_offensive|operation_preparation|operation_prediction|bot_corps_operations|OperationsPanel|OpsPlanningModal|OperationBriefingModal|CorpsFrontPanel|OperationsSection') {
        $operationsChanged = $true
        $requiresGovernance = $true
    }
}

if (-not $requiresGovernance) {
    Write-Output "Claude governance check: no governed files changed."
    exit 0
}

if (-not (Test-Path $artifactPath)) {
    Write-Error "Claude governance check failed: missing $artifactPath"
    exit 1
}

$content = Get-Content -Raw -Path $artifactPath
$missing = @()

$requiredSections = @(
    "## Task",
    "## Canonical owner",
    "## Demoted path",
    "## Decision boundary",
    "## Done means",
    "## UI/report truth",
    "## Roadmap slot",
    "## What this unlocks"
)

foreach ($section in $requiredSections) {
    if (-not (Require-Section -Content $content -Section $section)) {
        $missing += $section
    }
}

if ($roadmapChanged) {
    $roadmapSections = @(
        "## Exact milestone changes",
        "## Exact renumbering",
        "## Items moved",
        "## Sequencing risks avoided"
    )

    foreach ($section in $roadmapSections) {
        if (-not (Require-Section -Content $content -Section $section)) {
            $missing += $section
        }
    }
}

if ($operationsChanged) {
    if (-not (Require-Section -Content $content -Section "## Operations gate")) {
        $missing += "## Operations gate"
    }
}

if ($missing.Count -gt 0) {
    Write-Error ("Claude governance check failed. Missing sections in ACTIVE_TASK_GOVERNANCE.md:`n- " + ($missing -join "`n- "))
    exit 1
}

Write-Output "Claude governance check: OK"
exit 0
