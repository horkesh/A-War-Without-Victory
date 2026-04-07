# 2026-04-07 - v0.8-to-v0.9 Desktop Startup Packaging Guardrails + Snapshot Drift Gate

## Summary

Moved the April 1992 baked startup snapshot from "checkable" to "enforced in the authoritative desktop build path."

The repo already had:

- a canonical startup builder
- a committed baked startup artifact
- a manual drift check command

The remaining gap was packaging/build truth: `desktop:sim:build` could still bundle desktop startup code without first proving the baked artifact matched builder truth.

This lane closes that seam by making the desktop sim bundle fail loudly when the snapshot is missing or stale.

## Why this lane

The previous lane productized the startup artifact but left enforcement as a manual discipline:

- `npm run desktop:startup-snapshot:check` existed
- `npm run desktop:startup-snapshot:build` could repair drift
- desktop `apr_1992` startup consumed the baked artifact

But the repo contract was still too soft:

- a developer could skip the drift check
- `desktop:sim:build` could still ship a stale artifact
- packaging/build truth depended on remembering the right command, not on the build guarding itself

This lane keeps the builder as primary truth while making stale snapshot shipping materially harder.

## Audit findings

### Canonical before the change

- `src/scenario/startup_snapshot.ts` already owned snapshot path definitions, builder-derived payload generation, artifact loading, and drift validation.
- `tools/scenario_runner/build_startup_snapshot.ts` already exposed explicit `--write` and `--check` modes.
- `src/desktop/desktop_sim.ts` already consumed the baked `apr_1992` startup artifact.

### Remaining seam before the change

- `tools/desktop_bundle_sim.mjs` still bundled `src/desktop/desktop_sim.ts` directly through esbuild with no mandatory snapshot validation step.
- That made the authoritative desktop sim bundle path trust artifact presence instead of artifact validity.

## Design

### Ownership after cleanup

- **Scenario authoring truth:** scenario JSON under `data/scenarios/`
- **Canonical startup builder truth:** `buildScenarioStartupState(...)`
- **Derived startup artifact contract:** `src/scenario/startup_snapshot.ts`
- **Guarded desktop bundle gate:** `tools/desktop_bundle_sim.mjs`
- **Desktop consumer:** `src/desktop/desktop_sim.ts`

### Rules after cleanup

1. Builder truth remains primary.
2. The baked startup snapshot remains a one-way derived artifact.
3. `desktop:sim:build` must validate the snapshot before bundling.
4. Missing or stale artifact state is a hard build failure with an explicit remediation command.

### What was intentionally deferred

- CI/release pipeline enforcement beyond the local authoritative desktop build path
- additional packaged startup artifacts beyond `apr_1992`
- automatic regeneration during build (guarded failure was preferred over hidden mutation)

## Implementation

### Files changed

- `tools/desktop_bundle_sim.mjs`
- `tests/desktop_startup_snapshot_guardrails.test.ts`
- `src/desktop/README.md`

### What changed

- Added a startup snapshot validation gate at the top of `tools/desktop_bundle_sim.mjs`.
  - The script now runs `tools/scenario_runner/build_startup_snapshot.ts --check` through `tsx` before invoking esbuild.
  - If validation fails, `desktop:sim:build` aborts with an explicit message telling the developer to run `npm run desktop:startup-snapshot:build` and commit the result.
- Added `tests/desktop_startup_snapshot_guardrails.test.ts` covering:
  - source-boundary proof that the guarded build script invokes the snapshot check
  - missing-snapshot failure
  - stale-snapshot failure
- Updated `src/desktop/README.md` so the desktop build flow documents the new guardrail truthfully.

## Verification

### Targeted commands

- `npx.cmd tsx --test tests/desktop_startup_snapshot_guardrails.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:sim:build`

### Full commands

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Proof points

- missing or stale `data/derived/startup/apr_1992_initial_save.json` now causes the desktop sim build to fail
- valid artifacts still pass both the explicit check command and the guarded desktop build
- desktop startup contract remains unchanged: the desktop still consumes the baked artifact, but now the build enforces artifact validity automatically

## Architectural outcome

The startup packaging story is easier to explain:

1. scenario authoring defines April 1992 truth
2. the canonical startup builder produces startup-save truth
3. the repo commits a baked derived artifact
4. the authoritative desktop sim bundle path refuses to ship that artifact unless it still matches builder truth

That is a stronger contract than "the snapshot exists and there is a script you are supposed to remember to run."

## Residual risks

- The guardrail currently lives in the authoritative local desktop build path, but not yet in any future CI/release-specific packaging workflow.
- Only `apr_1992` has this baked artifact and drift gate today.
- The repo still relies on explicit regeneration (`desktop:startup-snapshot:build`) instead of a broader packaging/publish policy.

## Follow-up recommendation

Next best lane: **Release/CI Startup Snapshot Enforcement**

That would extend the same truth gate into any future packaging or CI release workflow so the local build guard and release guard cannot drift apart.
