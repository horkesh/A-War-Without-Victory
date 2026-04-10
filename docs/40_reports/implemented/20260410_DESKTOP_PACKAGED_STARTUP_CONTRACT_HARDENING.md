# 2026-04-10 Desktop Packaged Startup Contract Hardening

## Lane summary

- **Lane:** `fix(desktop): harden packaged startup contract`
- **Type:** Packaged/runtime surface hardening
- **Canonical owner after cleanup:** the packaged desktop startup contract defined by `package.json` app files plus the baked `apr_1992` startup artifact generated from `src/scenario/startup_snapshot.ts`
- **Demoted path:** implicit relative `require(...)` assumptions inside `electron-main.cjs` and stale baked startup artifact drift

## Candidate seams considered

1. **Packaged desktop startup contract**
   - Chosen.
   - Live packaged runtime proof was failing with a real main-process crash instead of reaching the canonical probe manifest.
2. **Startup snapshot verification interference**
   - Deferred.
   - Real but narrower proof-path hygiene; it did not outrank the shipped packaged runtime crash.
3. **Gorazde residual territorial pair**
   - Demoted.
   - Still content/runtime audit territory.
4. **Podrinje stranded lifecycle ownership**
   - Demoted.
   - Still redesign-blocked.
5. **444th Konjic overextension**
   - Demoted.
   - Still realism/doctrine, not truth-owner hardening.

## Exact seam

The packaged Windows desktop could boot into a main-process crash before the runtime probe reached its manifest:

- the packaged app failed with `Cannot find module './autonomy_ipc_contract.cjs'`
- `electron-main.cjs` also had a second local helper dependency on `settings_store.cjs`
- the packaged startup artifact had to be re-baked to stay byte-for-byte aligned with the canonical builder truth after the recent engine/runtime hardening chain

So the live seam was not a renderer/UI problem. It was a packaged startup contract problem: shipped desktop startup depended on local main-process helpers and a baked startup artifact that the packaging contract was not explicitly keeping current.

## Change

1. Hardened the packaged app file contract in `package.json`
   - added `src/desktop/autonomy_ipc_contract.cjs`
   - added `src/desktop/settings_store.cjs`
2. Hardened the packaging proof in `tests/desktop_packaging_contract.test.ts`
   - asserts the explicit packaged app file list
   - scans `electron-main.cjs` for local `require('./*.cjs')` dependencies and proves every helper is shipped
3. Re-baked `data/derived/startup/apr_1992_initial_save.json`
   - refreshed the packaged startup artifact to current canonical builder truth after the 2026-04-09 hardening chain

## Why scenario proof is not relevant

This lane does not change simulation logic or player-facing scenario outcomes. The strongest truthful proof is the shipped packaged runtime path itself:

- startup snapshot validation
- guarded desktop bundling
- packaged build
- packaged runtime probe manifest

## Before / after proof

### Baseline

- packaged runtime failed before manifest proof
- user-visible failure: packaged Electron main process crashed with `Cannot find module './autonomy_ipc_contract.cjs'`
- the packaged startup path also depended on a baked `apr_1992` artifact that had drifted behind current builder truth

### Post-fix

- `desktop:startup-snapshot:check` passes
- `desktop:package:probe` reaches and prints the canonical packaged runtime manifest
- manifest now proves:
  - packaged `desktop_sim.cjs` exists
  - packaged startup snapshot exists
  - packaged Warroom and tactical-map routes reach `did-finish-load`
  - packaged startup loads with `player_faction = RBiH`, `turn = 0`, `recruitment_ready = true`
  - tactical map bridge push/reaction proof succeeds in packaged mode

## Verification

### Targeted

- `npx.cmd vitest run tests/desktop_autonomy_boundary_truth.test.ts`
  - passed
  - `1` file / `4` tests
- `node --test tests/desktop_packaging_contract.test.ts tests/desktop_packaged_runtime_probe.test.ts`
  - passed
  - `6` tests
- `npm.cmd run desktop:startup-snapshot:check`
  - passed
- `npm.cmd run desktop:package:probe`
  - passed
  - packaged manifest emitted successfully

### Full verification bar

- `npm.cmd run test:vitest`
  - passed
  - `241` files / `3123` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed
- `npm.cmd run recovery:check`
  - passed

## Files changed

- `data/derived/startup/apr_1992_initial_save.json`
- `package.json`
- `tests/desktop_packaging_contract.test.ts`
- `docs/40_reports/implemented/20260410_DESKTOP_PACKAGED_STARTUP_CONTRACT_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual board after lane

- **Next bounded hardening candidate:** startup-snapshot proof-path interference (`desktop_startup_snapshot_guardrails.test.ts` mutates the committed artifact in place)
- **Content/runtime audit:** Gorazde residual territorial pair
- **Redesign-blocked:** Podrinje stranded same-faction brigade lifecycle
- **Later realism:** 444th Konjic salient discipline
