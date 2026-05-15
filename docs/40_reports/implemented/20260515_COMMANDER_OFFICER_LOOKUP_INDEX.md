# Commander Officer Lookup Index

**Date:** 2026-05-15
**Run ID:** `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1799`
**Baseline:** n1794 final hash `7ef09f55d6494edd`
**Result:** n1799 final hash `7ef09f55d6494edd`

## Summary
- Added a reusable `OfficerCombatLookup` for the direct-probe defender-power hot path.
- Rejected the first rank-local index placement because index construction outweighed the saved officer scans.
- Retained a one-pass batch-level lookup built once per direct-target batch; final save stayed byte-identical.

## Changes Made
### Combat Math
- `src/sim/combat/combat_math.ts` now exposes `buildOfficerCombatLookup(...)` and accepts an optional lookup in `getThreeTierOfficerMod(...)` and `computeDefenderPower(...)`.
- The lookup indexes named officer state/data, active army commanders by faction, and active corps commanders by corps id.
- Army/corps commander precedence remains deterministic by preserving the lowest officer id when multiple active candidates match.
- All existing callers without a lookup keep the original scan fallback.

### Direct Probe Prediction
- `src/sim/combat/commander/emit.ts` builds the lookup once in `predictDirectEnemyTargets(...)` and profiles it under `.probe.deriveObjectives.predictDirectTargets.officerIndex`.
- `src/sim/combat/combat_predictor.ts` threads the optional lookup through ranked defender-power calculation into `computeDefenderPower(...)`.

### Tests
- `tests/officer_system.test.ts` proves repeated lookup-backed `getThreeTierOfficerMod(...)` calls do not rescan `named_officers` or `named_officer_data`.
- `tests/bot_orders_perf_profile.test.ts` guards the direct-probe lookup wiring and profile label shape.
- `tests/docs_desktop_v09_truth.test.ts` keeps roadmap truth aligned with this retained CPU lane.

## Profile Results

| Label | n1794 total ns | n1799 total ns | Delta |
|-------|----------------|----------------|-------|
| `.rankDefendersByPower` | 83,109,300 | 57,417,200 | -25,692,100 |
| `.rankDefendersByPower.computeDefenderPower` | 74,042,300 | 48,679,100 | -25,363,200 |
| `.rankDefendersByPower.computeDefenderPower.officer` | 23,403,700 | 3,038,800 | -20,364,900 |
| `.predictDirectTargets.officerIndex` | n/a | 18,951,800 | +18,951,800 |
| Officer net | 23,403,700 | 21,990,600 | -1,413,100 |
| Rank + officer index net | 83,109,300 | 76,369,000 | -6,740,300 |

Additional n1799 labels:
- `.predictDirectTargets`: 185,766,400ns
- `.buildOperations`: 237,682,800ns
- `.probe.deriveObjectives`: 206,998,300ns
- `.terrainFactors`: 5,244,100ns
- `.frontDensity`: 2,129,700ns plus `.frontDensityIndex`: 853,000ns
- `.supply`: 1,705,800ns

## Rejected Candidate
- n1797 built the officer index inside `rankDefendersByPowerWithEntries(...)`.
- It kept the final hash but cost 26,869,900ns in `.rankDefendersByPower.officerIndex`, producing a net regression versus the n1794 officer scan.
- The retained placement moved construction to the direct-target batch boundary and simplified the builder to one officer-state pass.

## Validation
- Red first: `tests/officer_system.test.ts` failed on missing `buildOfficerCombatLookup`.
- Red first: `tests/bot_orders_perf_profile.test.ts` failed until direct-probe lookup wiring existed.
- Green focused: `npx.cmd vitest run tests\officer_system.test.ts tests\bot_orders_perf_profile.test.ts tests\docs_desktop_v09_truth.test.ts tests\commander\operation_emit_overlap_guards.test.ts tests\commander\corridor_quality_guard.test.ts tests\commander\elite_formation_utilization.test.ts tests\commander\commander.test.ts --reporter=dot` passed 154/154.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed with CRLF warnings only.
- Profile proof: n1799 kept final hash `7ef09f55d6494edd`, matching n1794.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/combat_math.ts` | Added lookup builder and optional lookup-backed officer modifier path. |
| `src/sim/combat/combat_predictor.ts` | Threaded optional officer lookup through defender ranking. |
| `src/sim/combat/commander/emit.ts` | Built batch-level direct-target officer lookup with profile label. |
| `tests/officer_system.test.ts` | Added no-rescan lookup regression. |
| `tests/bot_orders_perf_profile.test.ts` | Guarded lookup/profile wiring. |
| `tests/docs_desktop_v09_truth.test.ts` | Guarded roadmap/report truth for the retained lane. |
| `.claude/napkin.md` | Updated current CPU runbook guidance. |
| `docs/40_reports/README.md` | Registered latest commander CPU report. |
| `docs/PROJECT_LEDGER.md` | Added lane ledger entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Recorded reusable index-placement lesson. |
| `docs/plans/MASTER_ROADMAP.md` | Updated current CPU profile status and next target guidance. |

## Next Steps
- Use a fresh n1799+ profile before picking the next CPU lane.
- Likely direct-probe candidates are `terrainFactors`, `sectorLookup`, `attackerPower`, or `overextension`, depending on the next measured split.
- Do not rebuild rank-local officer indexes; their construction cost was already rejected.
