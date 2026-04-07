# 2026-04-07 - v0.8-to-v0.9 Release/CI Startup Snapshot Enforcement

## Summary

Extended startup snapshot enforcement from the local desktop bundle path into the repo's actual CI/release-facing build contract.

The repo already had:

- a canonical startup builder
- a committed baked April 1992 startup artifact
- a local guarded desktop sim bundle path

The remaining gap was shipped-truth enforcement:

- CI did not run any desktop build path
- no canonical release-check script existed
- local guarded bundling was stronger than repo-level shipped-build guarantees

This lane closes that seam by defining one canonical desktop release-check command and making GitHub Actions enforce it on pull requests and `main`.

## Why this lane

The previous lane made stale startup data materially harder to ship locally, but it still left the repo with an avoidable mismatch:

- developers could rely on `desktop:sim:build`
- CI only ran typecheck, tests, and baseline regression
- the branch could stay green without proving desktop build artifacts still honored the baked startup snapshot contract

That meant repo truth was ahead of shipped-truth guarantees.

## Audit findings

### Canonical before the change

- `tools/desktop_bundle_sim.mjs` already enforced `build_startup_snapshot.ts --check` before bundling the desktop sim.
- `src/desktop/desktop_sim.ts` already consumed the baked `apr_1992` startup snapshot.
- `npm run desktop` already called the guarded `desktop:sim:build` transitively.

### Remaining shipped-artifact seam before the change

- there was no dedicated desktop release-check script describing the full shipped-build contract
- GitHub Actions did not run a desktop build workflow at all
- therefore PR/main could go green without running the guarded desktop artifact path

## Design

### Ownership after cleanup

- **Builder truth:** `buildScenarioStartupState(...)`
- **Derived startup artifact contract:** `src/scenario/startup_snapshot.ts`
- **Local guarded desktop sim bundle:** `tools/desktop_bundle_sim.mjs`
- **Canonical shipped-build verification path:** `npm run desktop:release:check`
- **CI enforcement owner:** `.github/workflows/desktop-release-guard.yml`

### Rules after cleanup

1. Builder truth remains primary.
2. The baked startup snapshot remains derived.
3. `desktop:release:check` is the canonical shipped-build verification command.
4. CI must run that command on PRs and `main`.
5. No hidden regeneration is allowed in CI or release checks; stale artifacts fail loudly instead.

### What was intentionally deferred

- electron-builder packaging or installer productization
- artifact publishing/release upload workflow
- broader multi-snapshot support beyond `apr_1992`

## Implementation

### Files changed

- `package.json`
- `.github/workflows/desktop-release-guard.yml`
- `tests/desktop_release_ci_guardrails.test.ts`
- `src/desktop/README.md`

### What changed

- Added `desktop:release:check` to `package.json`:
  - `npm run desktop:map:build`
  - `npm run desktop:sim:build`
  - `npm run warroom:build`
- Tightened `npm run desktop` so it launches through `desktop:release:check` before starting Electron.
- Added `.github/workflows/desktop-release-guard.yml` to run `npm run desktop:release:check` on pull requests to `main` and pushes to `main`.
- Added `tests/desktop_release_ci_guardrails.test.ts` to guard:
  - package-script ownership
  - desktop launch using the canonical release-check path
  - CI workflow enforcement on PR/main
- Updated `src/desktop/README.md` so the desktop workflow docs now describe the release-check contract explicitly.

## Verification

### Targeted commands

- `npx.cmd tsx --test tests/desktop_release_ci_guardrails.test.ts tests/desktop_startup_snapshot_guardrails.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`

### Full commands

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Proof points

- the repo now has one explicit canonical desktop release/build verification command
- CI now runs that command on the branch states that matter for shipped truth
- the guarded desktop sim build still enforces stale/missing snapshot failure inside that broader release-check path
- valid startup artifacts still pass the release-check flow cleanly

## Architectural outcome

The release/build story is now easier to explain:

1. scenario authoring defines April 1992 truth
2. the canonical builder defines startup-save truth
3. the repo commits a derived startup snapshot
4. `desktop:release:check` defines the shipped desktop build contract
5. GitHub Actions enforces that contract on PRs and `main`

That is a stronger system than "local builds are guarded, but CI might never exercise the shipped desktop path."

## Residual risks

- There is still no full installer/release-publish workflow in the repo, only build verification.
- The CI guard covers the current shipped-build contract, but not future packaging steps if those are introduced elsewhere.
- Only `apr_1992` currently participates in the baked startup snapshot contract.

## Follow-up recommendation

Next best lane: **Desktop Packaging / electron-builder Contract Productization**

That would extend the same explicit truth boundary from build verification into an actual packaged desktop artifact workflow, if and when the repo is ready to own one.
