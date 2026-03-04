$src = Join-Path $PSScriptRoot ".." ".agent\superpowers-repo\skills"
$dst = Join-Path $PSScriptRoot ".." ".claude\skills"

Get-ChildItem $src -Directory | ForEach-Object {
    $target = Join-Path $dst $_.Name
    Copy-Item -Path $_.FullName -Destination $target -Recurse -Force
    Write-Host "Copied: $($_.Name)"
}

Write-Host "`nDone. Skills installed to .claude/skills/"
