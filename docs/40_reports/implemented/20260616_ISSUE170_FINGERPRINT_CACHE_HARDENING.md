# Issue #170 Fingerprint and Cache Hardening

Date: 2026-06-16

## Summary

Newton's issue #170 audit produced three actionable hardening findings. This batch closes the structural-fingerprint P1 locally and integrates the P2/P3 final-sector cache hardening produced by the Pyrrhic agents.

## Closed Findings

1. Structural fingerprint v2:
   `tools/diagnostics/structural_fingerprint.cjs` now fingerprints sorted `control_delta.flips` rows (`settlement_id`, `municipality_id`, `from`, `to`) as well as the existing control counts, anchors, benchmarks, and run shape. Equal-count OSID swaps can no longer pass the CI determinism gate.

2. Final-sector front-edge cache key:
   `src/sim/combat/final_sector_truth_reconciliation.ts` now fingerprints sorted `war_front_edges_osid` content (`edge_id`, endpoints, and faction sides), not just the front-edge array length.

3. Final-sector operation-roster regression:
   `tests/final_sector_truth_reconciliation.test.ts` now dynamically proves that mutating `corps_command.active_operations[*].participating_brigades` invalidates cached sector truth and rebuilds.

## Artifacts

- New 40w structural fingerprint: `f282883abbab76cf`.
- Structural-fingerprint schema: `2`.
- Pinned 40w control counts: HRHB 89 / RBiH 250 / RS 373.
- Pinned 40w control flips: 123 sorted rows.

## Verification

- `node_modules\.bin\vitest.cmd run tests\structural_fingerprint.test.ts --pool=forks --reporter=dot`
- `npm run ci:structural-fingerprint:update`
- Agent red/green evidence for the front-edge cache test and operation-roster dynamic test is recorded in the delegated handoff summaries.

## Determinism

All new fingerprints use deterministic string ordering over scalar fields. No timestamps, randomness, scenario source data, save schema, golden baseline manifest, 188w floor, or packaged installer artifacts changed.
