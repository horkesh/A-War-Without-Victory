# Operation And Harness Contract Hardening

**Date:** 2026-04-08
**Scope:** operation injection/trigger sequencing, scenario summary compatibility, and recovery-harness truth
**Result:** stale operation tests removed, noop harness noise cut, triggered-op timing tightened to real prerequisites, and recovery contracts now pass cleanly alongside the sector-truth lane

## Summary
- Restored backward-compatible `phase_ii_attack_resolution` reporting so older scenario diagnostics still read the same authority block while the modern `attack_resolution` block remains intact.
- Hardened pre-planned injection so empty-roster harness states do not validate or inject the entire operation catalog.
- Tightened `Operation Herzegovina Consolidation` to trigger only after `Operation Visegrad` and `Operation Foca` are actually recorded complete, closing the noop-harness false-trigger seam.
- Narrowed displacement fallback warnings so they only fire when operational sector truth should exist for a live brigade force, not in intentional empty-roster compatibility runs.
- Updated recovery/test contracts to match current operation truth instead of stale `Teočak` assumptions.

## Changes Made

### Scenario summary compatibility
- [src/scenario/scenario_runner.ts](/F:/A-War-Without-Victory/src/scenario/scenario_runner.ts)
  - Reintroduced the legacy `phase_ii_attack_resolution` alias in run summaries so older diagnostics and proof tests continue reading the expected block.

### Pre-planned operation hardening
- [src/sim/combat/pre_planned_operations.ts](/F:/A-War-Without-Victory/src/sim/combat/pre_planned_operations.ts)
  - Added `hasInjectableBrigadeRoster(...)` and skip pre-planned injection entirely when the state has no active brigade roster.
- [tests/pre_planned_operations.test.ts](/F:/A-War-Without-Victory/tests/pre_planned_operations.test.ts)
  - Realigned the catalog to the live 13-op list.
  - Replaced dead `Teočak` assertions with live deferred `Operation Jackal` behavior checks.

### Triggered operation sequencing
- [src/sim/combat/triggered_operations.ts](/F:/A-War-Without-Victory/src/sim/combat/triggered_operations.ts)
  - `Operation Herzegovina Consolidation` now requires completed-history proof for both `Operation Visegrad` and `Operation Foca` before it can trigger.
- [tests/triggered_operations.test.ts](/F:/A-War-Without-Victory/tests/triggered_operations.test.ts)
  - Added explicit coverage for the new prerequisite contract and for the negative case where the history is absent.

### Displacement warning precision
- [src/sim/displacement_pipeline/displacement_triggers.ts](/F:/A-War-Without-Victory/src/sim/displacement_pipeline/displacement_triggers.ts)
  - Legacy fallback warnings now require both operational mapping context and a live active-brigade roster.
- [tests/sector_frontline_truth_wave3.test.ts](/F:/A-War-Without-Victory/tests/sector_frontline_truth_wave3.test.ts)
- [tests/sector_frontline_truth_wave4.test.ts](/F:/A-War-Without-Victory/tests/sector_frontline_truth_wave4.test.ts)
  - Updated the warning contract to distinguish operational-context missing-sector faults from intentional empty-roster compatibility runs.

### Recovery harness contract
- [package.json](/F:/A-War-Without-Victory/package.json)
  - Moved the Vitest-owned operation-diagnostics test out of the `tsx --test` block and into the Vitest segment of `recovery:check`.
- [tests/scenario_vrs_operation_proof.test.ts](/F:/A-War-Without-Victory/tests/scenario_vrs_operation_proof.test.ts)
  - Updated proof expectations to read completed-operation progress from `operation_aars.json`, the real archival authority, rather than stale `active_operations` assumptions.

## Verification

### Commands
- `cmd /c npx tsx --test tests\\pre_planned_operations.test.ts`
- `cmd /c npx tsx --test tests\\triggered_operations.test.ts`
- `cmd /c npx vitest run tests\\sector_frontline_truth_wave3.test.ts tests\\sector_frontline_truth_wave4.test.ts`
- `cmd /c npx tsx --test tests\\scenario_activity_diagnostics_h1_7.test.ts`
- `cmd /c npm run recovery:check`

### Outcome
- Recovery gate passed.
- `noop_4w` and `noop_4w_bots` scenario harnesses no longer emit false `Herzegovina Consolidation` or empty-roster pre-planned-op validation noise.
- Operation proof, activity diagnostics, triggered-op coverage, and pre-planned-op coverage all pass on the updated contracts.

## Lessons Learned
- Trigger conditions must encode historical and mechanical prerequisites, not just “currently idle” corps state, or noop harnesses will accidentally satisfy them.
- Compatibility warnings need an ownership test: if the engine intentionally has no live brigade force, “missing sector truth” is not a fault.
- Proof tests should read the real authority for completed operations (`operation_aars.json`), not live-op runtime slots that are supposed to be empty after completion.
- A recovery gate only stays trustworthy if each test runs under the runner that actually owns its contract.
