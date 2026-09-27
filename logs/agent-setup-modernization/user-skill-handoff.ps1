[CmdletBinding()]
param(
    [ValidateSet('Verify','Apply','Rollback')][string]$Mode = 'Verify',
    [string]$UserSkillRoot = 'C:/Users/User/.codex/skills',
    [string]$ReceiptPath,
    [switch]$SessionBoundaryConfirmed
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module Microsoft.PowerShell.Utility -ErrorAction Stop
$setupRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$setupManifest = Get-Content -Raw -LiteralPath (Join-Path $setupRoot '.agent/skill-distribution.json') | ConvertFrom-Json
$setupUserRoot = [IO.Path]::GetFullPath($UserSkillRoot).TrimEnd('\','/')

function Assert-Unlinked([string]$Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -Force -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked path requires manual reconciliation: $cursor" }
        }
        $parent = Split-Path -Parent $cursor
        if ($parent -eq $cursor) { break }
        $cursor = $parent
    }
}

if ($Mode -ne 'Verify' -and -not $SessionBoundaryConfirmed) { throw 'Apply/rollback requires an authorized coordinated session boundary. Verify is read-only.' }
if ($Mode -ne 'Verify' -and -not $ReceiptPath) { throw 'Provide a fresh receipt path outside the installed skill tree.' }
if ($ReceiptPath) {
    $ReceiptPath = [IO.Path]::GetFullPath($ReceiptPath)
    Assert-Unlinked $ReceiptPath
    if ($ReceiptPath.StartsWith($setupUserRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Receipt must be outside the installed skill tree' }
    if (Test-Path -LiteralPath $ReceiptPath) { throw 'Receipt already exists; retain it and choose a fresh path' }
}

# Check EVERY input before writing any file. Originals remain outside the repo.
$setupRows = @(foreach ($adapter in $setupManifest.adapters) {
    if ($adapter.name -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') { throw 'Invalid adapter name' }
    $target = [IO.Path]::GetFullPath((Join-Path $setupUserRoot ($adapter.name + '/SKILL.md')))
    if (-not $target.StartsWith($setupUserRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Target escapes installed root' }
    $candidate = Join-Path $setupRoot $adapter.adapter
    $source = Join-Path $setupRoot $adapter.project_source
    foreach ($path in @($target,$candidate,$source,$adapter.original_backup)) { Assert-Unlinked $path }
    if ((Get-FileHash -LiteralPath $candidate).Hash -cne $adapter.adapter_sha256) { throw "Candidate changed: $($adapter.name)" }
    if ((Get-FileHash -LiteralPath $source).Hash -cne $adapter.project_source_sha256) { throw "Project source changed: $($adapter.name); reconcile and re-review" }
    if ((Get-FileHash -LiteralPath $adapter.original_backup).Hash -cne $adapter.original_sha256) { throw "Original backup changed: $($adapter.name)" }
    $current = (Get-FileHash -LiteralPath $target).Hash
    if ($Mode -eq 'Rollback') {
        if ($current -cne $adapter.adapter_sha256 -and $current -cne $adapter.original_sha256) { throw "Newer installed edit: $($adapter.name); preserve it and reconcile manually" }
    } elseif ($current -cne $adapter.original_sha256) {
        throw "Installed file changed since inventory: $($adapter.name); preserve it and reconcile manually"
    }
    [pscustomobject]@{ name=$adapter.name; target=$target; candidate=$candidate; original=$adapter.original_backup; before=$current; original_sha256=$adapter.original_sha256; candidate_sha256=$adapter.adapter_sha256 }
})

if ($Mode -eq 'Verify') {
    Write-Output "Read-only preflight OK: $($setupRows.Count) named installed entrypoints match saved originals; candidates and source hashes match. No activation performed."
    exit 0
}

New-Item -ItemType Directory -Force -Path (Split-Path $ReceiptPath) | Out-Null
$setupCompleted = New-Object 'System.Collections.Generic.List[object]'
try {
    foreach ($row in $setupRows) {
        # Ownership at the coordinated boundary is required in addition to hashes.
        if ((Get-FileHash -LiteralPath $row.target).Hash -cne $row.before) { throw "Concurrent edit detected: $($row.name)" }
        $from = if ($Mode -eq 'Apply') { $row.candidate } else { $row.original }
        [IO.File]::Copy($from, $row.target, $true)
        $expected = if ($Mode -eq 'Apply') { $row.candidate_sha256 } else { $row.original_sha256 }
        if ((Get-FileHash -LiteralPath $row.target).Hash -cne $expected) { throw "Write verification failed: $($row.name)" }
        if ($Mode -eq 'Rollback') { [IO.File]::SetLastWriteTimeUtc($row.target, [IO.File]::GetLastWriteTimeUtc($row.original)) }
        $setupCompleted.Add([ordered]@{ name=$row.name; path=$row.target; before_sha256=$row.before; after_sha256=$expected })
    }
    [ordered]@{ mode=$Mode; status='completed'; files=$setupCompleted; user_root=$setupUserRoot; runtime_reload='owner must start a fresh session and verify discovery/routing; this script does not restart any session' } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
    Write-Output "$Mode completed for $($setupRows.Count) entrypoints. Receipt: $ReceiptPath. Runtime reload is still owner-controlled."
} catch {
    [ordered]@{ mode=$Mode; status='partial; reconcile before proceeding'; files=$setupCompleted; user_root=$setupUserRoot; error=$_.Exception.Message } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
    throw
}
