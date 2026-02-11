# Terrain Pipeline Audit (H6.0–H6.4.2)

Technical reference for the AWWV terrain pipeline. **Phase H6.5 — documentation and audit only. No execution. No data generated.**

---

## 1. Overview

### Terrain phases (H6.0–H6.4.2)

| Phase | Type | Description |
|-------|------|-------------|
| H6.0 | Executable | SVG → world georeferencing (ADM3-anchored). Produces `georef/svg_to_world_transform.json`, audit reports. |
| H6.1 | Executable | Contract hygiene for settlements dataset (awwv_meta, checksum). No terrain logic. |
| H6.2 | Executable | OSM roads/waterways snapshots + Copernicus DEM clip. **Requires osmium + gdalwarp.** |
| H6.3 | Documentation / guardrail | Toolchain preflight (osmium, gdalwarp) wired into H6.2 scripts. Fail-fast when tools missing. |
| H6.4 | Execution attempt | Run H6.2 on host. **NOT EXECUTED** — osmium/GDAL absent. Ledgered as precondition failure. |
| H6.4.1 | Executable | Container runner (Docker) for H6.2. `run_h6_2_snapshots.sh` / `run_h6_2_snapshots.ps1`. |
| H6.4.2 | Execution attempt | Run H6.2 via container. **NOT EXECUTED** — Docker absent. Ledgered as precondition failure. |

### Data-only vs executable

- **H6.0, H6.1, H6.2, H6.4.1:** Produce derived artifacts when run.
- **H6.3:** Code/guardrail only; no new outputs.
- **H6.4, H6.4.2:** Execution phases; ledgered even when they fail (tools/Docker missing).

### Blocked by tooling vs by design

- **By tooling:** H6.2 requires osmium and gdalwarp. H6.4.2 requires Docker. Scripts fail fast with clear hints.
- **By design:** Terrain snapshots are **not consumed** by simulation yet. H6.6 (terrain scalar derivation) is planned but not implemented. Snapshots exist for future scalar derivation and validation.

---

## 2. Execution prerequisites

### External tools

| Tool | Required for | Install hint |
|------|--------------|--------------|
| osmium (osmium-tool) | H6.2 OSM snapshot | https://osmcode.org/osmium-tool/ |
| gdalwarp (GDAL) | H6.2 DEM clip | https://gdal.org/ |
| Docker | H6.4.2 container runner | Docker Desktop or Docker Engine |

### Phases that require them

- **H6.2 (direct):** osmium for OSM; gdalwarp for DEM.
- **H6.4.2 (container):** Docker only; osmium and GDAL are inside the container.

### Phases that explicitly do NOT require them

- **H6.0, H6.1:** No osmium, GDAL, or Docker. Pure TypeScript/Node.
- **H6.5:** No execution. Documentation and comment hardening only.

---

## 3. Determinism guarantees

### Where determinism is enforced

- **OSM snapshots:** Features sorted by osm_id; awwv_meta.checksum_sha256 on content.
- **DEM clip:** Audit records sha256 of output TIF.
- **Audits:** No timestamps; stable ordering; toolchain.tools version strings from first line of stdout/stderr.

### Audits + sha256 instead of heavy artifacts

- OSM GeoJSON + .gz, DEM TIF, and audit JSON/TXT are committed when produced.
- Sha256 in audits enables integrity checks without re-running. `validate_map_contracts.ts` uses audits when present.

### Why failed execution phases are still ledgered

- H6.4 and H6.4.2 document precondition failures (missing tools, missing Docker).
- Ledger entries capture error output, expected outputs, and next steps for a tool-enabled machine.
- This prevents silent retries and ensures a clean handoff for future execution.

---

## 4. Known operational blockers

| Blocker | Effect | Why it's not a design failure |
|---------|--------|-------------------------------|
| Missing osmium | H6.2 OSM snapshot cannot run | Tool is external; install hint provided. Preflight fails fast. |
| Missing GDAL (gdalwarp) | H6.2 DEM clip cannot run | Same as above. |
| Missing Docker | H6.4.2 container path cannot run | Container is optional; host tools are alternative. |
| Dirty working tree | Not a hard blocker | Some scripts may behave differently; best practice is clean tree before execution. |

These are **operational preconditions**, not architectural flaws. The pipeline is designed to fail fast and record what was attempted.

---

## 5. Next executable phase (preview only)

**H6.6: Terrain scalar derivation (validation-only)** — **NOT implemented yet.**

- **Planned:** Derive terrain scalars (e.g., elevation, roughness) from DEM clip and/or OSM snapshots for settlement/substrate reference.
- **Scope:** Validation and data-layer only; no simulation logic changes.
- **Status:** Placeholder. Implementation deferred until H6.2/H6.4.2 execution produces artifacts.

---

## References

- `docs/PROJECT_LEDGER.md` — Changelog for H6.0–H6.4.2
- `scripts/map/phase_h6_2_snapshot_osm_terrain.ts` — OSM roads + waterways
- `scripts/map/phase_h6_2_snapshot_dem_clip.ts` — DEM clip
- `scripts/map/_shared/toolchain_preflight.ts` — Preflight helper
- `tools/terrain_toolchain/` — Docker runner (H6.4.1)
- `scripts/map/validate_map_contracts.ts` — Contract validation (terrain when present)
