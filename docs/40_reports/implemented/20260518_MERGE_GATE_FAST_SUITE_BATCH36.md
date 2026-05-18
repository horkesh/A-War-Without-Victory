# Merge Gate Fast Suite Repair - Batch 36

**Plan:** `docs/plans/2026-05-18-autonomous-roadmap-lane-bank.md` Batch 36.

## Scope

Batch 36 repairs the full fast-suite merge gate after focused Batch 19-35 validation missed stale schema, fixture, and docs-truth tests. No engine behavior code changed. The lane updates tests, migration fixtures, and generated canonical artifacts so the full fast Vitest slice, baselines, typecheck, and map build all agree with the current v14 loaded-game contract.

## Accepted changes

- Minimal test state builders now include `meta.player_faction: 'RBiH'` where they model loaded gameplay state.
- Legacy migration tests that intentionally exercise old ARBiH/VRS/HVO or pre-default save shapes now declare legacy `schema_version: 0` so the migration registry, not the fixture author, fills v3-v14 defaults.
- New save-migration round-trip fixtures cover v12 top-level optional arrays and v13 negotiation counter-offer defaults before v14 player-faction materialization.
- `data/derived/startup/apr_1992_initial_save.json` is regenerated at schema v14 with negotiation/counter-offer defaults.
- `tools/diagnostics/output/save_migration_drift.json` is regenerated for the current v14 registry.
- Player-knowledge integrity now pins the current contract: missing `meta.player_faction` at adapter fallback does not mean observer-mode enemy-truth leakage.
- Sector offensive idle-recovery tests now expect the more specific current blocker codes from `evaluateOpeningAttackReadiness`.
- Baseline CI guardrail now counts the added `scenario-anchors` nested map install job.

## Codex integration correction

Claude's handoff skipped one stale `tests/docs_desktop_v09_truth.test.ts` assertion block. Codex did not accept that as-is. The test now remains active and checks the current durable roadmap/canon contracts instead of skipping the case.

## Verification

- `npx.cmd vitest run tests/docs_desktop_v09_truth.test.ts tests/player_knowledge_integrity.test.ts tests/save_migration_round_trip_contract.test.ts tests/save_migration_drift_audit.test.ts tests/startup_snapshot_contract.test.ts --reporter=dot` - PASS, 5 files / 39 tests.
- `npm.cmd run typecheck` - PASS.
- `npm.cmd test` - PASS, full fast suite exit 0 after the docs-truth repair.
- `npm.cmd run test:baselines` - PASS, "Baseline regression: all scenarios match."
- `npm.cmd run desktop:map:build` - PASS, existing Vite externalization/chunk warnings only.
- `git diff --check` - PASS before docs propagation; rerun required before commit.

## Determinism

No sim behavior code changed. Baseline regression remains green. Startup snapshot bytes intentionally move from schema v12 to schema v14 because the committed artifact must match canonical builder truth and current strict loaded-game validation.

## Files changed

- `data/derived/startup/apr_1992_initial_save.json`
- `tools/diagnostics/output/save_migration_drift.json`
- `tests/fixtures/save_migration/v12_top_level_optional_arrays.json`
- `tests/fixtures/save_migration/v13_negotiation_counter_offers.json`
- Fixture/schema/doc-truth tests touched by the v14 loaded-state contract.
