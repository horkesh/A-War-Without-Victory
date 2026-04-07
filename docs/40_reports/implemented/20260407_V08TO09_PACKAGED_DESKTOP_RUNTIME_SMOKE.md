# 2026-04-07 - v0.8-to-v0.9 Packaged Desktop Runtime Smoke + Unpacked Launch Probe

## Summary

Added a real packaged-runtime probe on top of the existing packaged-desktop contract.

Before this lane, the repo could:

- guard startup snapshot truth
- verify the shipped desktop build inputs
- produce an unpacked packaged desktop artifact

But it still could not prove one crucial runtime fact:

- that the unpacked packaged executable actually boots in packaged mode and resolves the runtime resources it expects

This lane closes that seam by adding one canonical packaged-runtime probe command:

- `npm run desktop:package:probe`

That command:

1. builds the unpacked packaged desktop artifact through `desktop:package:dir`
2. launches the packaged executable itself in a dedicated probe mode
3. verifies packaged resource files, startup-snapshot loading, desktop sim loading, and tactical-map HTTP serving
4. emits a stable manifest and exits

## Why this lane

The packaging contract was already explicit, but there was still a missing runtime proof:

- package assembly was proven
- packaged resource layout was proven on disk
- but the executable itself had not been asked to boot in packaged mode and use those resources

That left the desktop product story one step short of convincing.

## Audit findings

### Canonical before the change

- `desktop:release:check` already owned the shipped-build verification gate.
- `desktop:package:dir` already owned the unpacked package contract.
- `src/desktop/electron-main.cjs` already contained the packaged-runtime assumptions:
  - `resources/app/`
  - `resources/app/warroom/`
  - `resources/dist/desktop/desktop_sim.cjs`
  - `resources/data/...`
  - `resources/assets/...`

### Remaining runtime seam before the change

- there was no owned packaged-launch probe
- the repo could package the executable, but not prove that the packaged executable itself could:
  - boot in packaged mode
  - load the desktop sim bundle from packaged resources
  - load the baked `apr_1992` startup snapshot from packaged resources
  - serve tactical-map assets/data from the packaged resource tree

## Design

### Ownership after cleanup

- **Packaged build contract:** `desktop:package:dir`
- **Packaged runtime probe contract:** `desktop:package:probe`
- **Probe runtime owner:** `src/desktop/electron-main.cjs`
- **External probe runner:** `tools/desktop_packaged_runtime_probe.mjs`

### Rules after cleanup

1. No second launch path is introduced.
2. The packaged executable itself is the thing being probed.
3. The probe remains subordinate to `desktop:package:dir`, which remains subordinate to `desktop:release:check`.
4. Probe output is stable and machine-readable.
5. No hidden regeneration is introduced.

### What was intentionally deferred

- full packaged UI interaction smoke
- installer/product publish flow
- multi-platform packaged runtime probes

## Implementation

### Files changed

- `package.json`
- `src/desktop/electron-main.cjs`
- `src/desktop/README.md`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`

### What changed

- Added `desktop:package:probe` to `package.json`:
  - `npm run desktop:package:dir`
  - then `node tools/desktop_packaged_runtime_probe.mjs`
- Added a dedicated packaged probe mode in `src/desktop/electron-main.cjs`, gated by `AWWV_DESKTOP_RUNTIME_PROBE=1`.
- The probe mode now verifies, in packaged runtime:
  - packaged `dist/desktop/desktop_sim.cjs`
  - packaged tactical-map index
  - packaged Warroom index
  - packaged baked startup snapshot
  - successful `startNewCampaign(...)` loading via packaged resources
  - successful tactical-map server responses for `/` and the startup snapshot route
- Added `tools/desktop_packaged_runtime_probe.mjs` to launch the unpacked packaged executable, require the stable success manifest, and fail loudly otherwise.
- Added `tests/desktop_packaged_runtime_probe.test.ts` to guard:
  - package-script ownership
  - probe-mode ownership in `electron-main.cjs`
  - probe-tool ownership over the unpacked packaged executable

## Verification

### Targeted commands

- `npx.cmd tsx --test tests/desktop_packaged_runtime_probe.test.ts tests/desktop_packaging_contract.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:dir`
- `npm.cmd run desktop:package:probe`

### Full commands

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Proof points

- the packaged executable itself now emits a stable runtime success manifest
- the probe verifies packaged resource loading instead of just package assembly
- the probe is chained through the existing packaged-desktop contract, so it cannot weaken build/startup truth

## Architectural outcome

The packaged-desktop story is now easier to explain:

1. `desktop:release:check` proves shipped-build inputs
2. `desktop:package:dir` assembles the unpacked packaged artifact
3. `desktop:package:probe` launches that packaged artifact and proves it can actually use its packaged resources

That is a stronger contract than "the package exists, so it probably boots."

## Residual risks

- The probe is a headless packaged runtime smoke, not a full packaged UI interaction test.
- It validates the current unpacked Windows target only.
- Future installer/publish lanes must keep this probe or an equivalent packaged-runtime check in the chain.

## Integration notes

This was a parallel-safe lane, so governance docs were not edited directly.

- `docs/PROJECT_LEDGER.md`
  - Add a 2026-04-07 entry for `Packaged Desktop Runtime Smoke + Unpacked Launch Probe`
  - Record that `desktop:package:probe` now launches the unpacked packaged executable itself and verifies packaged resources plus baked startup consumption at runtime
- `docs/plans/MASTER_ROADMAP.md`
  - Mark the lane complete only if roadmap text says the unpacked packaged artifact now has a real runtime smoke/probe
  - Keep installer/publish/UI-runtime interaction explicitly deferred
- `.claude/architect_notes.md`
  - Record the reusable lesson: once packaging exists, add a probe that launches the packaged executable itself in a headless validation mode rather than inferring runtime truth from on-disk files alone
