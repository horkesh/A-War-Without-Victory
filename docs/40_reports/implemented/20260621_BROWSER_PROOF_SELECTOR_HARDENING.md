# Browser Proof Selector Hardening

**Date:** 2026-06-21  
**Type:** Browser-QA harness and proof-hook hardening.

## Summary

This batch makes first-hour and live-surface browser gates less brittle and more exact:

- Foundational event response buttons now expose stable `data-event-id` and `data-response-id` hooks, so the first-hour gate selects opening responses by event data instead of localized prose.
- First-hour evidence now records raw-label absence per faction and per surface (`records`, `chronicle`) and writes the JSON after dev-server cleanup so the artifact can prove `serverPortCleanupVerified`.
- Live-surface selector helpers now scan visible/enabled matches instead of trusting the first `querySelector(...)` match.
- Records AAR live proof now targets the injected fixture OSID and attacker formation exactly, and records the clicked formation id in evidence.

## Verification

- `node --check tools\ui\first_hour_browser_gate.cjs; node --check tools\ui\live_surface_browser_sweep.cjs` -> passed.
- `npx.cmd vitest run tests\ui\first_hour_browser_gate_contract.test.ts --reporter=dot` -> 6/6 passed.
- `npm.cmd run qa:first-hour:browser` -> passed; evidence showed all three foundational flows resolved by response id, per-faction Records/Chronicle raw-label checks, and `serverPortCleanupVerified`.
- `npm.cmd run qa:live-surface:browser` -> passed; evidence showed exact AAR fixture proof for `op:gradacac:donja_tramosnica_2` and `arbih_213th_vitezka_mountain`, battle-marker proof, operation-opportunity routing/ledger proof, and `serverPortCleanupVerified`.
- `npm.cmd run typecheck` -> passed.
- `git diff --check` -> passed.
- `npm.cmd run qa:player-journeys` -> 245/245 passed.
- `npm.cmd run desktop:map:build` -> passed; Vite emitted the existing browser-external/chunk-size warnings but exited 0.

## Determinism / Scope

Browser harness, UI proof attributes, tests, and docs only. No simulation logic, scenario data, save schema, generated artifact, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
