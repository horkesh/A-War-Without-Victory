# 2026-04-07 - v0.8-to-v0.9 Desktop Packaging / electron-builder Contract Productization

## Summary

Productized the repo's first explicit packaged-desktop contract without pretending that a full installer/release system already exists.

Before this lane, desktop startup truth and startup snapshot enforcement were strong, but packaging still had an architectural gap:

- the repo had a guarded local desktop bundle path
- CI enforced the canonical `desktop:release:check` path
- but there was no explicit packaged-desktop contract describing how Electron would assemble runtime files into a packaged `resources/` layout

This lane closes that gap by:

- defining a canonical `electron-builder` contract in `package.json`
- adding one canonical packaging command, `desktop:package:dir`
- making that command inherit `desktop:release:check` before packaging
- documenting the packaged `resources/` layout that `electron-main.cjs` already expects

## Why this lane

The next risk after release/CI snapshot enforcement was not startup truth itself. It was future misuse:

- a later packaging step could grow into a second, weaker path
- runtime already had packaged-resource assumptions
- those assumptions were not yet codified in a product-owned packaging contract

That made the packaging story harder to explain than the build story.

## Audit findings

### Canonical before the change

- `desktop:release:check` already defined the canonical shipped-build verification path.
- `tools/desktop_bundle_sim.mjs` already enforced baked startup snapshot validity before producing `dist/desktop/desktop_sim.cjs`.
- `src/desktop/electron-main.cjs` already knew how packaged resources should be resolved:
  - `resources/app/`
  - `resources/app/warroom/`
  - `resources/dist/desktop/desktop_sim.cjs`
  - `resources/data/...`
  - `resources/assets/...`

### Packaging-contract gap before the change

- `electron-builder` existed only as a dependency, not as an owned product contract
- there was no canonical packaged-desktop command
- there was no checked builder config proving packaged layout matched runtime assumptions
- desktop docs still described packaged mode as "see electron-builder config if added"

## Design

### Ownership after cleanup

- **Primary truth gate:** `desktop:release:check`
- **Packaged-desktop productization command:** `desktop:package:dir`
- **Packaged layout owner:** `package.json` `build` config
- **Runtime consumer of that layout:** `src/desktop/electron-main.cjs`

### Rules after cleanup

1. Builder truth remains primary.
2. The baked startup snapshot remains derived and already validated before packaging.
3. `desktop:package:dir` must never bypass `desktop:release:check`.
4. `electron-builder` config must map packaged resources to the exact directories the runtime already expects.
5. No hidden snapshot regeneration is introduced in packaging.

### What was intentionally deferred

- installer targets such as NSIS/MSI
- code signing
- publish/upload flow
- a broader multi-platform packaging matrix

## Implementation

### Files changed

- `package.json`
- `src/desktop/README.md`
- `tests/desktop_packaging_contract.test.ts`

### What changed

- Added `desktop:package:dir`:
  - `npm run desktop:release:check`
  - then `electron-builder --dir --publish never`
- Added explicit `build` config in `package.json`:
  - `appId`
  - `productName`
  - `dist-packaged/` output directory
  - minimal `files` contract for Electron app entrypoints
  - explicit `extraResources` contract for:
    - `dist/desktop`
    - `dist/tactical-map`
    - `dist/warroom`
    - `data/derived`
    - `data/source`
    - `data/ui`
    - `assets`
  - explicit `win.signAndEditExecutable=false` so this bounded `dir`-target package flow does not depend on Windows sign/edit helper extraction privileges
- Added `tests/desktop_packaging_contract.test.ts` to guard:
  - package-script ownership
  - packaging inheriting `desktop:release:check`
  - packaged resource layout matching `electron-main.cjs` expectations
- Updated `src/desktop/README.md` so packaged mode is now documented as a real contract rather than a placeholder note

## Verification

### Targeted commands

- `npx.cmd tsx --test tests/desktop_packaging_contract.test.ts tests/desktop_release_ci_guardrails.test.ts tests/desktop_startup_snapshot_guardrails.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:dir`

### Full commands

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Proof points

- packaged-desktop now has one explicit command instead of an implied future path
- packaging cannot skip the existing startup snapshot and build guard because it inherits `desktop:release:check`
- the packaged resource layout is now explicit and test-guarded
- docs no longer overstate packaged mode as hypothetical

## Architectural outcome

The desktop packaging story is now easier to explain:

1. scenario authoring defines April 1992 truth
2. the canonical startup builder defines startup-save truth
3. the baked startup snapshot is derived and guard-checked
4. `desktop:release:check` verifies the shipped build inputs
5. `desktop:package:dir` packages Electron using the same checked inputs and the explicit `resources/` layout contract

That is a more product-owned story than "Electron packaging could be added later and probably copy the right files."

## Residual risks

- The repo still does not own a full installer/release-publish workflow.
- The current packaging contract is Windows `dir`-target productization, not a finished installer story.
- Future installer/release steps must be wired through `desktop:package:dir` or an equivalent checked contract, rather than inventing a second path.

## Integration notes

This was a parallel-safe lane, so governance docs were not edited directly.

Follow-up integration notes for the other agent or the integration pass:

- `docs/PROJECT_LEDGER.md`
  - Add a 2026-04-07 entry for `Desktop Packaging / electron-builder Contract Productization`
  - Record that packaged desktop now has an explicit `electron-builder` contract and canonical `desktop:package:dir` command gated by `desktop:release:check`
- `docs/plans/MASTER_ROADMAP.md`
  - Mark the packaging-contract lane complete only if the repo keeps the current `desktop:package:dir` + `build` config contract
  - Note that installer/publish flow remains deferred
- `.claude/architect_notes.md`
  - Record the reusable lesson: when runtime already assumes a packaged resources layout, productize that exact layout under one guarded packaging command rather than letting a future installer flow invent its own file-copy contract
