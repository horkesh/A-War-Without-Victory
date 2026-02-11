# Terrain Toolchain Runner (Phase H6.4.1)

Runs H6.2 terrain snapshot scripts (OSM roads/waterways, DEM clip) inside a pinned Docker container. Use this when osmium and gdalwarp are not installed locally.

## Purpose and Scope

- **H6.2 runner only** — No simulation logic. Produces deterministic terrain snapshot artifacts under `data/derived/terrain/`.
- Container includes: osmium-tool, gdal-bin (gdalwarp), Node.js (from pinned base image).
- Runner satisfies existing preflight; snapshot scripts are unchanged.

## Prerequisites

- **Docker** — Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine (Linux).
- Ensure `docker --version` and `docker info` succeed.

## Usage

From repo root:

**Bash (macOS, Linux, Git Bash):**
```bash
./tools/terrain_toolchain/run_h6_2_snapshots.sh
```

**PowerShell (Windows):**
```powershell
.\tools\terrain_toolchain\run_h6_2_snapshots.ps1
```

## Run Only OSM or Only DEM

**Bash:**
```bash
./tools/terrain_toolchain/run_h6_2_snapshots.sh --only=osm
./tools/terrain_toolchain/run_h6_2_snapshots.sh --only=dem
./tools/terrain_toolchain/run_h6_2_snapshots.sh --only=all
```

**PowerShell:**
```powershell
.\tools\terrain_toolchain\run_h6_2_snapshots.ps1 -Only osm
.\tools\terrain_toolchain\run_h6_2_snapshots.ps1 -Only dem
.\tools\terrain_toolchain\run_h6_2_snapshots.ps1 -Only all
```

## Outputs

After a successful run, outputs appear under `data/derived/terrain/`:

- `osm_roads_snapshot_h6_2.geojson` (.gz)
- `osm_waterways_snapshot_h6_2.geojson` (.gz)
- `osm_snapshot_audit_h6_2.json`, `.txt`
- `dem_clip_h6_2.tif`
- `dem_snapshot_audit_h6_2.json`, `.txt`

## Recording Tool Versions and Hashes

The runner prints tool versions to stdout before running snapshots. Paste them into the H6.4 ledger entry when you perform the actual run.

Audit files (`osm_snapshot_audit_h6_2.json`, `dem_snapshot_audit_h6_2.json`) already include `toolchain.tools` with versions and `sha256` checksums. Use those for canonical evidence.

## Strategy: node_modules

- **If `node_modules` exists on host:** Mounted read-only into the container. Avoids slow `npm ci` inside the container.
- **If not present:** Runner runs `npm ci` inside the container before snapshots.

## Troubleshooting

### Docker Desktop file sharing (Windows)

Ensure the repo path is allowed for file sharing. Docker Desktop → Settings → Resources → File sharing. Add the drive or parent directory if needed.

### WSL2 (Windows)

If using WSL2, run the script from a WSL terminal so paths resolve correctly. Alternatively, use the PowerShell script from Windows with the repo on a Windows path (e.g. under `C:\` or `OneDrive`).

### Permissions (Linux)

If `run_h6_2_snapshots.sh` is not executable:
```bash
chmod +x tools/terrain_toolchain/run_h6_2_snapshots.sh
```

### Determinism

`map:contracts:determinism` is not run inside the container (can hit file locks on shared mounts). Run it on the host after the container run:
```bash
npm run map:contracts:determinism
```

### Pinned Image

Image: `awwv-terrain-h6_2:h6.4.1`  
Base: `node:22.12.0-bookworm`  
See `tools/terrain_toolchain/Dockerfile` for the full build.
