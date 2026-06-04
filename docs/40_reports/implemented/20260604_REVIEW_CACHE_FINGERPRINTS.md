# Review Cache Fingerprints

Date: 2026-06-04
Branch: `codex/review-cache-p1`
Base: `1ee4a9da`
Type: Engine correctness / cache invalidation hardening

## Summary

The GitHub Codex review sweep created issue #170 for unresolved old review comments. This packet closes the P1 cache/fingerprint subset:

- OSID supply reachability cache keys now include deterministic edge topology, not only sources and controlled OSIDs.
- OSID corridor and supply-state derivation caches now include edge topology, and supply-state cache keys include the per-faction open-corridor set.
- Final-sector truth reconciliation fingerprints now include corps-command active-operation participant state, matching the commander-review input read by `buildCorpsFrontSectors(...)`.

No scenario data, save schema, UI, calibration constants, event content, or player-facing behavior changed. Baseline artifacts remain byte-identical.

## Review Threads Covered

- PR #3: per-faction supply BFS cache ignored edge topology.
- PR #4: supply-state cache ignored corridor/open-edge input.
- PR #5: final-sector truth reconciliation cache ignored operation roster input.

## Verification

- Red proof: focused tests failed before implementation for all three invalidation gaps.
- Green proof: `node node_modules\vitest\vitest.mjs run tests\supply_reachability_cache.test.ts tests\supply_state_derivation_cache.test.ts tests\final_sector_truth_reconciliation.test.ts --reporter=dot` passed 14/14.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run test:baselines` passed with all scenarios matching.

## Remaining Issue #170 Work

Issue #170 remains open for non-cache P1/P2 items:

- P1 bilateral flip counting without `mun_id`.
- P1 Ahmici alliance-collapse same-turn effect.
- P1 Chain 3 missing source-event flags.
- P1 enclave fallback-resilience denominator domain decision.
- P2 same-axis concentration support.
- P2 Trnovo controlled waypoint preservation.
- P2 TG anchor-only readiness domain decision.
- P2 Phase E diagnostic OFF-pass skip, assigned separately.
- P2 HRHB faction-level Graz branch coverage.
