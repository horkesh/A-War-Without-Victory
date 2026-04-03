# 2026-04-03 - Legacy SID combat authority demotion

## Summary
- Demoted the old SID combat path to explicit compatibility-only status in code comments and reporting surfaces.
- Hardened the scenario harness so weekly combat rollups prefer canonical `attack_resolution_osid` output whenever both OSID and legacy SID summaries are present.
- Added a regression test proving that canonical OSID summaries outrank legacy SID summaries and that legacy data is only used as a fallback when OSID data is absent.

## Files changed
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_end_report.ts`
- `src/sim/combat/battle_resolution.ts`
- `src/sim/combat/resolve_attack_orders.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/sim/turn_pipeline_types.ts`
- `tests/scenario_activity_truth.test.ts`

## Why
- The repo already treats `attack_resolution_osid` as canonical war-phase combat, but the scenario harness still had a live aggregation seam where `resolve_attack_orders` could outrank OSID data if both were present.
- That is exactly the kind of false-authority inversion that makes reports drift away from the engine and leads future cleanup work into the wrong layer.
- The comments around the legacy SID path were also too soft, which made a compatibility fallback still look like a co-equal combat owner.

## Verification
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\scenario_activity_truth.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\brigade_territory_reconciliation.test.ts tests\\commander_driven_brigade_assignment.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
