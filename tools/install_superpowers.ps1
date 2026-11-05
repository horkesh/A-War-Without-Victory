<#
Preview one named import, inspect ReviewPath and ReviewPath.diff, then apply the
same inputs with -Apply. Replacement also requires -Replace and a fresh BackupRoot.
This tool never decides which policy is authoritative: reconcile it before import.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')][string]$Name,
    [string]$SourceRoot = (Join-Path $PSScriptRoot '../.agent/superpowers-repo/skills'),
    [string]$DestinationRoot = (Join-Path $PSScriptRoot '../.claude/skills'),
    [Parameter(Mandatory = $true)][string]$ReviewPath,
    [switch]$Apply,
    [switch]$Replace,
    [string]$BackupRoot
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Windows PowerShell can auto-load Utility inside a helper's local scope, leaving
# its script functions (notably Get-FileHash) unavailable to the next helper.
Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop

function Get-SafePath([string]$Path) {
    $full = [IO.Path]::GetFullPath($Path).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $cursor = $full
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -Force -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Linked paths are not supported: $cursor"
            }
        }
        $parent = Split-Path -Parent $cursor
        if ($parent -eq $cursor) { break }
        $cursor = $parent
    }
    return $full
}

function Test-Within([string]$Child, [string]$Parent) {
    return $Child.Equals($Parent, [StringComparison]::OrdinalIgnoreCase) -or
        $Child.StartsWith($Parent + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
}

function Assert-Separate([string]$Left, [string]$Right) {
    if ((Test-Within $Left $Right) -or (Test-Within $Right $Left)) {
        throw "Paths must be separate, not equal or nested: $Left ; $Right"
    }
}

function Get-Tree([string]$Root) {
    if (-not (Test-Path -LiteralPath $Root)) { return }
    if (-not (Test-Path -LiteralPath $Root -PathType Container)) { throw "Expected directory: $Root" }
    $queue = New-Object 'System.Collections.Generic.Queue[string]'
    $queue.Enqueue($Root)
    $rows = New-Object 'System.Collections.Generic.List[object]'
    while ($queue.Count -gt 0) {
        foreach ($item in Get-ChildItem -Force -LiteralPath $queue.Dequeue()) {
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked skill content is not supported: $($item.FullName)" }
            $relative = $item.FullName.Substring($Root.Length + 1).Replace('\', '/')
            if ($item.PSIsContainer) {
                $rows.Add([ordered]@{ path=$relative; kind='directory'; sha256='' })
                $queue.Enqueue($item.FullName)
            } else {
                $rows.Add([ordered]@{ path=$relative; kind='file'; sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $item.FullName).Hash })
            }
        }
    }
    return $rows | Sort-Object { $_.path }
}

$setupSourceRoot = Get-SafePath $SourceRoot
$setupDestinationRoot = Get-SafePath $DestinationRoot
Assert-Separate $setupSourceRoot $setupDestinationRoot
$setupSource = Get-SafePath (Join-Path $setupSourceRoot $Name)
$setupTarget = Get-SafePath (Join-Path $setupDestinationRoot $Name)
if (-not (Test-Within $setupSource $setupSourceRoot) -or -not (Test-Within $setupTarget $setupDestinationRoot)) { throw 'Skill escapes its declared root' }
$setupReview = Get-SafePath $ReviewPath
if ((Test-Within $setupReview $setupSourceRoot) -or (Test-Within $setupReview $setupDestinationRoot)) { throw 'Review receipt must be outside source and destination trees' }
$setupBefore = @(Get-Tree $setupTarget)
$setupAfter = @(Get-Tree $setupSource)
if (-not (Test-Path -LiteralPath (Join-Path $setupSource 'SKILL.md') -PathType Leaf)) { throw 'Named source has no SKILL.md' }
$setupExists = Test-Path -LiteralPath $setupTarget
$setupState = [ordered]@{ schema=1; name=$Name; source=$setupSource; target=$setupTarget; target_exists=$setupExists; replace=[bool]$Replace; before=$setupBefore; after=$setupAfter }
$setupStateJson = $setupState | ConvertTo-Json -Depth 8 -Compress

if (-not $Apply) {
    New-Item -ItemType Directory -Force -Path (Split-Path $setupReview) | Out-Null
    $setupEmpty = $null
    $setupDiffBefore = $setupTarget
    if (-not $setupExists) {
        $setupEmpty = Join-Path ([IO.Path]::GetTempPath()) ('awwv-skill-empty-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $setupEmpty | Out-Null
        $setupDiffBefore = $setupEmpty
    }
    try {
        $setupDiff = @(& git diff --no-index --no-ext-diff --no-textconv -- $setupDiffBefore $setupSource)
        $setupDiffExit = $LASTEXITCODE
        if ($setupDiffExit -notin @(0,1)) { throw "Diff failed: exit $setupDiffExit" }
        [IO.File]::WriteAllText($setupReview + '.diff', ($setupDiff -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
    } finally {
        if ($setupEmpty) { Remove-Item -LiteralPath $setupEmpty }
    }
    $setupReceipt = [ordered]@{ state=$setupState; diff_sha256=(Get-FileHash -LiteralPath ($setupReview + '.diff')).Hash }
    $setupReceipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $setupReview -Encoding UTF8
    Write-Output "Preview only. Inspect $setupReview and $setupReview.diff. No skills changed."
    if ($setupExists -and -not $Replace) { Write-Output 'Existing skill: applying this preview is refused. Reconcile the difference, then preview with -Replace if replacement is intended.' }
    exit 0
}

if ($setupExists -and -not $Replace) { throw 'Existing skill; overwrite refused. An intentional replacement needs a new -Replace preview and backup.' }
if (-not (Test-Path -LiteralPath $setupReview -PathType Leaf) -or -not (Test-Path -LiteralPath ($setupReview + '.diff') -PathType Leaf)) { throw 'Preview receipt and diff are required before applying' }
$setupReceipt = Get-Content -Raw -LiteralPath $setupReview | ConvertFrom-Json
if (($setupReceipt.state | ConvertTo-Json -Depth 8 -Compress) -cne $setupStateJson) { throw 'Inputs changed since preview; inspect a fresh preview before applying' }
if ($setupReceipt.diff_sha256 -cne (Get-FileHash -LiteralPath ($setupReview + '.diff')).Hash) { throw 'Review diff changed since preview' }
$setupBackup = $null
if ($setupExists) {
    if (-not $BackupRoot) { throw 'Replacement requires BackupRoot outside both skill trees' }
    $setupBackupRoot = Get-SafePath $BackupRoot
    Assert-Separate $setupBackupRoot $setupSourceRoot
    Assert-Separate $setupBackupRoot $setupDestinationRoot
    $setupBackup = Get-SafePath (Join-Path $setupBackupRoot $Name)
    if (Test-Path -LiteralPath $setupBackup) { throw 'Backup already exists; use a fresh BackupRoot' }
}

# Stage a private full tree first. Do not merge incoming skills into local content.
New-Item -ItemType Directory -Force -Path $setupDestinationRoot | Out-Null
$setupStage = Join-Path $setupDestinationRoot ('.import-' + $Name + '-' + [guid]::NewGuid().ToString('N'))
Copy-Item -LiteralPath $setupSource -Destination $setupStage -Recurse
if ((@(Get-Tree $setupStage) | ConvertTo-Json -Depth 8 -Compress) -cne ($setupAfter | ConvertTo-Json -Depth 8 -Compress)) { throw "Staged content differs; retained for diagnosis: $setupStage" }
# Recheck for intervening edits immediately before moving anything.
if ((@(Get-Tree $setupTarget) | ConvertTo-Json -Depth 8 -Compress) -cne ($setupBefore | ConvertTo-Json -Depth 8 -Compress) -or (Test-Path -LiteralPath $setupTarget) -ne $setupExists) { throw "Destination changed during staging; stage retained: $setupStage" }
if ($setupBackup) {
    New-Item -ItemType Directory -Force -Path $setupBackupRoot | Out-Null
    # Both exact resolved paths were checked above; moving preserves the original tree.
    Move-Item -LiteralPath $setupTarget -Destination $setupBackup
}
try {
    Move-Item -LiteralPath $setupStage -Destination $setupTarget
} catch {
    if ($setupBackup -and -not (Test-Path -LiteralPath $setupTarget)) { Move-Item -LiteralPath $setupBackup -Destination $setupTarget }
    throw
}
$setupApplied = [ordered]@{ name=$Name; target=$setupTarget; backup=$setupBackup; review=$setupReview; installed=@(Get-Tree $setupTarget) }
$setupApplied | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath ($setupReview + '.applied.json') -Encoding UTF8
Write-Output "Imported $Name. Receipt: $setupReview.applied.json"
