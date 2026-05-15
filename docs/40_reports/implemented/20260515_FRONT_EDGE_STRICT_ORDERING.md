# Front Edge Strict Ordering

**Date:** 2026-05-15
**Run ID:** Not applicable
**Baseline:** `computeFrontEdges(...)` and `computeFrontEdgesOsid(...)` sorted with `localeCompare`
**Result:** Both front-edge outputs sort with `strictCompare`

## Summary
- Replaced locale-sensitive front-edge sorting with the repo's deterministic `strictCompare` comparator.
- Added a focused regression for SID-keyed and OSID-keyed front-edge outputs.
- Propagated the determinism rule into the map geometry master and determinism test matrix.

## Changes Made
### Front Edge Ordering
- `src/map/front_edges.ts` now imports `strictCompare` and uses it for final front-edge list ordering in both `computeFrontEdges(...)` and `computeFrontEdgesOsid(...)`.
- Edge normalization remains unchanged; only the final output sort comparator changed.

### Regression Guard
- `tests/front_edges_strict_order.test.ts` covers two operational ids whose locale collation order differs from strict codepoint order.
- The guard covers both the legacy SID-keyed path and the OSID political-controller path.

### Documentation
- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` now lists the strict front-edge ordering guard under stable-ordering coverage.
- `docs/40_reports/MAP_GEOMETRY_MASTER.md` records `strictCompare` as the canonical front-edge output comparator.
- `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, `.claude/napkin.md`, and `docs/40_reports/README.md` were updated for discoverability.

## Determinism Review
- `docs/20_engineering/CODE_CANON.md` requires stable ordering for collections and iterables.
- `docs/10_canon/Engine_Invariants_v0_9_0.md` requires OSID-keyed output iteration to use `strictCompare`.
- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` tracks stable-ordering gates.
- No determinism risks found: this lane replaces locale-dependent comparison with the canonical comparator and adds a targeted stable-ordering gate.

## Validation
- Red: with the old `localeCompare` sort restored temporarily, `npx.cmd vitest run tests\front_edges_strict_order.test.ts --reporter=dot` failed 2/2 on reversed order.
- Green: after restoring `strictCompare`, the same command passed 2/2.
- Focused gate: `npx.cmd vitest run tests\front_edges_strict_order.test.ts tests\calibration.test.ts tests\dev_ui_phase17.test.ts tests\sandbox_slice_determinism.test.ts --reporter=dot` passed 15/15.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed with CRLF warnings only.

## Files Changed

| File | Change |
|------|--------|
| `src/map/front_edges.ts` | Replaced final list `localeCompare` sort with `strictCompare`. |
| `tests/front_edges_strict_order.test.ts` | Added focused SID/OSID strict-order regression. |
| `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` | Added front-edge ordering gate. |
| `docs/40_reports/MAP_GEOMETRY_MASTER.md` | Documented strict front-edge comparator rule. |
| `docs/40_reports/README.md` | Registered the implementation report near map geometry references. |
| `docs/PROJECT_LEDGER.md` | Added lane ledger entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Recorded locale collation gotcha. |
| `.claude/napkin.md` | Added reusable map-geometry ordering guidance. |

## Next Steps
- Use `strictCompare` rather than `localeCompare` for any future OSID/SID output ordering.
- If a future renderer wants display-locale sorting, keep that local to presentation labels and never use it for persisted or derived geometry outputs.
