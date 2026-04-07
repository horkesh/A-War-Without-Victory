# 2026-04-07 - v0.8-to-v0.9 Packaged Desktop CI Runtime Probe Enforcement

## Summary

Extended the packaged-desktop runtime probe from a local-only command into the repo's CI shipped-build contract.

Before this lane, the repo could:

- verify startup snapshot truth
- verify shipped desktop build inputs via `desktop:release:check`
- package the unpacked Windows desktop artifact
- launch a local packaged-runtime smoke with `desktop:package:probe`

But CI still stopped one step early:

- GitHub Actions verified build inputs on Ubuntu
- it did not launch the packaged Windows executable itself
- stale or broken packaged runtime/resource resolution could still slip past CI even when local probing existed

This lane closes that seam by making CI run the real packaged-runtime probe on `windows-latest` through the canonical `desktop:package:probe` path.

## Why this lane

The repo already had a strong local contract:

1. `desktop:startup-snapshot:check`
2. `desktop:release:check`
3. `desktop:package:dir`
4. `desktop:package:probe`

The remaining risk was shipped-build enforcement drift:

- developers could prove packaged runtime locally
- CI still only proved build inputs
- the branch could stay green without ever launching the packaged executable in packaged mode

That made shipped truth weaker than repo truth.

## Audit findings

### Canonical before the change

- `desktop:package:probe` already owned the canonical packaged-runtime smoke.
- `tools/desktop_packaged_runtime_probe.mjs` already launched `dist-packaged/win-unpacked/A War Without Victory.exe` directly.
- `src/desktop/electron-main.cjs` already exposed the stable probe mode via `AWWV_DESKTOP_RUNTIME_PROBE=1`.
- `.github/workflows/desktop-release-guard.yml` already enforced `desktop:release:check` on PRs and `main`.

### Remaining seam before the change

- the desktop release guard workflow only ran on `ubuntu-latest`
- no CI job exercised the packaged Windows executable
- no CI job proved packaged resource boot/runtime resolution end to end

## Design

### Ownership after cleanup

- **Builder truth:** canonical startup builder
- **Derived startup artifact:** baked `apr_1992_initial_save.json`
- **Canonical packaged-runtime probe:** `desktop:package:probe`
- **CI enforcement owner:** `.github/workflows/desktop-release-guard.yml`

### Rules after cleanup

1. CI must not invent a second packaged-runtime path.
2. CI must run the same `desktop:package:probe` command developers run locally.
3. Ubuntu keeps the fast build-input verification path.
4. Windows adds the packaged-runtime execution path.
5. No hidden startup snapshot regeneration is introduced.

### What was intentionally deferred

- installer or publish workflows
- multi-platform packaged runtime probes beyond Windows
- UI-level packaged interaction tests

## Implementation

### Files changed

- `.github/workflows/desktop-release-guard.yml`
- `tests/desktop_release_ci_guardrails.test.ts`
- `src/desktop/README.md`

### What changed

- Extended `.github/workflows/desktop-release-guard.yml` with a new `desktop-packaged-runtime-probe` job.
- The workflow now:
  - keeps the existing Ubuntu `desktop-release-check` job
  - adds a dependent `windows-latest` job that runs `npm run desktop:package:probe`
- Extended `tests/desktop_release_ci_guardrails.test.ts` so the workflow contract is guarded in source:
  - dedicated packaged-runtime probe job exists
  - it runs on `windows-latest`
  - it invokes `npm run desktop:package:probe`
- Updated `src/desktop/README.md` so the desktop contract now truthfully explains that CI enforces the packaged-runtime probe, not just the build-input gate.

## Verification

### Targeted commands

- `npx.cmd tsx --test tests/desktop_release_ci_guardrails.test.ts tests/desktop_packaged_runtime_probe.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`

### Full commands

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Proof points

- source tests now fail if CI drops the Windows packaged-runtime probe job
- CI is now wired to the same canonical packaged-runtime path as local validation
- no second probe or packaging path was introduced
- startup/build truth remains chained through the same existing commands

## Architectural outcome

The CI/release story is now easier to explain:

1. Ubuntu verifies desktop build inputs with `desktop:release:check`
2. Windows verifies the packaged executable itself with `desktop:package:probe`
3. both paths share the same startup snapshot contract and packaging contract

That is stronger than "the packaged runtime smoke exists locally, and CI might run it later."

## Residual risks

- CI now probes the unpacked Windows packaged runtime, but it still does not cover installer artifacts.
- The packaged-runtime probe is still headless and does not perform UI interaction.
- Only the Windows packaged target participates in this CI runtime contract today.

## Integration notes

This was a parallel-safe lane, so governance docs were not edited directly.

### `docs/PROJECT_LEDGER.md`

Add a 2026-04-07 entry for `Packaged Desktop CI Runtime Probe Enforcement` noting that:

- `.github/workflows/desktop-release-guard.yml` now runs `desktop:package:probe` on `windows-latest`
- shipped-build CI now proves the packaged Windows executable boots in packaged mode and resolves packaged startup/map resources
- no second packaged-runtime path was introduced

Suggested ledger note text:

> 2026-04-07 - Packaged Desktop CI Runtime Probe Enforcement: extended the desktop release guard workflow with a Windows packaged-runtime job that runs `desktop:package:probe`. CI now validates not only desktop build inputs (`desktop:release:check`) but also the unpacked packaged executable's packaged-mode boot, startup snapshot loading, and tactical-map resource serving. The packaged-runtime contract still flows through the existing guarded commands; no hidden regeneration or alternate packaging path was introduced.

### `docs/plans/MASTER_ROADMAP.md`

Mark the lane complete only if roadmap text matches the delivered scope:

- CI now enforces the unpacked Windows packaged-runtime probe
- installer/publish flow remains deferred
- packaged UI interaction smoke remains deferred

### `.claude/architect_notes.md`

Record the reusable lesson:

- once a local packaged-runtime probe exists, ship-truth CI should invoke that exact probe on the platform that actually runs the packaged artifact instead of inventing a lighter-weight substitute
