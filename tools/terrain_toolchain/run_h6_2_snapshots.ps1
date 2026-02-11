# Phase H6.4.1 — Run H6.2 terrain snapshots in container (osmium + gdalwarp)
# Usage: .\tools\terrain_toolchain\run_h6_2_snapshots.ps1 [-Only osm|dem|all]
# Default: all

param(
    [ValidateSet("osm", "dem", "all")]
    [string]$Only = "all"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$ImageName = "awwv-terrain-h6_2"
$ImageTag = "h6.4.1"

Write-Host "=== Phase H6.4.1 container runner ==="
Write-Host "Repo root: $RepoRoot"
Write-Host "Only: $Only"
Write-Host ""

# Verify Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: docker not found. Install Docker and ensure it is on PATH."
    exit 1
}
docker --version
$null = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: docker info failed. Is Docker daemon running?"
    exit 1
}

# Build image if not present
$imageCheck = docker image inspect "${ImageName}:${ImageTag}" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Building ${ImageName}:${ImageTag}..."
    docker build -t "${ImageName}:${ImageTag}" $ScriptDir
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# Mount repo; mount node_modules from host if present (avoids slow npm ci)
$NodeModulesPath = Join-Path $RepoRoot "node_modules"
$Volumes = @("-v", "${RepoRoot}:/work")
if (Test-Path $NodeModulesPath) {
    $Volumes += "-v", "${NodeModulesPath}:/work/node_modules:ro"
    Write-Host "Using host node_modules (read-only mount)"
} else {
    Write-Host "node_modules not present on host; will run npm ci in container"
}

function Invoke-DockerRun {
    param([string[]]$Command)
    $dockerArgs = @("run", "--rm") + $Volumes + @("-w", "/work", "${ImageName}:${ImageTag}") + $Command
    & docker @dockerArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# Task C: Print tool versions (paste into ledger)
Write-Host "=== Tool versions (paste into ledger) ==="
$versionScript = 'echo "osmium: $(osmium --version 2>/dev/null || echo ?)"; echo "gdalwarp: $(gdalwarp --version 2>&1 | head -1)"; echo "node: $(node --version)"; echo "npm: $(npm --version)"'
Invoke-DockerRun bash, "-c", $versionScript
Write-Host ""

# npm ci if node_modules not mounted
if (-not (Test-Path $NodeModulesPath)) {
    Write-Host "Running npm ci..."
    Invoke-DockerRun npm, ci
    Write-Host ""
}

# Run snapshots
if ($Only -eq "osm" -or $Only -eq "all") {
    Write-Host "Running OSM terrain snapshot..."
    Invoke-DockerRun npm, run, map:snapshot:osm-terrain:h6_2
    Write-Host ""
}

if ($Only -eq "dem" -or $Only -eq "all") {
    Write-Host "Running DEM clip snapshot..."
    Invoke-DockerRun npm, run, map:snapshot:dem-clip:h6_2
    Write-Host ""
}

# Validations
Write-Host "Running validations..."
Invoke-DockerRun npm, run, map:contracts:validate
Invoke-DockerRun npm, run, typecheck
Invoke-DockerRun npm, test
Write-Host ""
Write-Host "=== H6.2 snapshots complete. Outputs in data/derived/terrain/ ==="
