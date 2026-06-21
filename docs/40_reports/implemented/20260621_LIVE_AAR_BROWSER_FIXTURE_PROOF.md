# Live AAR Browser Fixture Proof

**Date:** 2026-06-21
**Result:** Implemented

## Summary

- Closed the live browser sweep gap where Records AAR formation-link proof could pass with `skipped:no-visible-aar-battle-row`.
- Added a QA-only in-memory fixture that loads the committed April 1992 startup save and attaches one deterministic turn-summary battle row for the live sweep.
- Kept the change harness-only: no scenario file, startup artifact, simulation path, save schema, calibration baseline, or packaged artifact changed.

## Changes Made

### Deterministic AAR Fixture

- `tools/ui/live_surface_browser_sweep.cjs` now reads `data/derived/startup/apr_1992_initial_save.json`, deep-clones it in memory, and attaches one synthetic `turn_summaries` entry for turn 1.
- The fixture pins:
  - OSID: `op:gradacac:donja_tramosnica_2`
  - Attacker: `arbih_213th_vitezka_mountain`
  - Defender: `rs_1st_birac`
- The fixture is loaded through `window.handleManualSaveLoad(...)` after the first-hour, archive, and Codex live checks complete, so it does not erase decision-receipt evidence before those proofs run.

### Live Proof Hardening

- `runRecordsAarFormationLinkLiveProof(...)` now hard-fails when no AAR battle row or formation link renders.
- The previous skip evidence values are removed from the tool contract.
- The sweep evidence now records the fixture source and pinned IDs, and the live proof must end with `recordsAarFormationLinkLiveProof: true`.

## Verification

- Red proof: `node node_modules\vitest\vitest.mjs run tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` failed before implementation because `buildRecordsAarLiveProofFixtureState` was absent.
- Green focused proof passed 6/6 after implementation.
- `node --check tools\ui\live_surface_browser_sweep.cjs` passed.
- `npm.cmd run qa:live-surface:browser` passed. Evidence showed:
  - `recordsAarFormationLinkLiveProof: true`
  - fixture source `data/derived/startup/apr_1992_initial_save.json`
  - pinned OSID/attacker/defender IDs
  - `serverPortCleanupVerified: true`
- Temporary `.tmp_live_surface_browser_sweep` evidence was inspected and removed.

## Files Changed

| File | Change |
| --- | --- |
| `tools/ui/live_surface_browser_sweep.cjs` | Added QA-only in-memory Records AAR fixture load and converted AAR proof skips to hard failures. |
| `tests/ui/first_hour_browser_gate_contract.test.ts` | Pinned fixture helper, source save path, battle IDs, no-skip contract, and proof ordering. |

## Next Steps

- Keep the fixture in the browser harness only; do not advance the sim or alter scenario/startup artifacts to satisfy UI proof.
- The BCS/native LQA next slice should add inventory/status guardrails for issue #237 without changing prose unless native review is available.
