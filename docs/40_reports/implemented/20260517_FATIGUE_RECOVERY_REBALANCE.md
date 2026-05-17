# Fatigue Recovery Rebalance

**Date:** 2026-05-17
**Plan:** `docs/plans/2026-05-17-fatigue-recovery-rebalance-plan.md`
**Owner selected:** D - winter / war-exhaustion modulation
**Result:** Implemented as a late-war exhausted recent-combat residue floor.

## Summary

The fatigue gap was classified as late-war recovery erasing all traces of recent combat for exhausted factions, not as a missing global fatigue multiplier. The implemented lever leaves `FRONTLINE_FATIGUE_PER_TURN`, `FATIGUE_RECOVERY_INTERVAL`, `FATIGUE_MAX`, combat fatigue accumulation, and `getFatigueMult()` unchanged.

`applyFatigueRecovery(...)` now preserves a fatigue floor of `1` for active formations whose faction has high war exhaustion, whose latest engagement was recent, and whose current turn is in the late-war window. The iteration is sorted by formation id and the diagnostic emits sorted, timestamp-free JSON.

## Baseline Diagnostic

Diagnostic: `tools/diagnostics/fatigue_distribution_audit.cjs`

| bucket | n1740 mean | n1740 pct_zero | n1741 mean | n1741 pct_zero | classified source |
|---|---:|---:|---:|---:|---|
| sector_front | 0.275 | 94.944 | 0.000 | 100.000 | n1740 residue combat-driven; n1741 final save had no residue |
| sector_reserve | 0.000 | 100.000 | 0.000 | 100.000 | none |
| sector_rear | 0.000 | 100.000 | 0.000 | 100.000 | none |
| operation_participant | 0.000 | 100.000 | 0.000 | 100.000 | none |
| engaged_this_turn | 0.091 | 90.909 | n/a | n/a | combat-driven |
| unassigned | n/a | n/a | 0.000 | 100.000 | none |

Baseline artifacts:
- 40w n1740: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1740`, final hash `86ebf26ae0271465`, replay mode.
- 188w n1741: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1741`, final hash `a4bf8b8095050881`, final-save fallback because `replay_save_sequence.json` was 1,004,403,335 bytes.

## Lever

Runtime file: `src/state/formation_fatigue.ts`

Added constants:
- `LATE_WAR_FATIGUE_STRAIN_TURN = 104`
- `EXHAUSTION_FATIGUE_STRAIN_THRESHOLD = 80`
- `RECENT_COMBAT_FATIGUE_STRAIN_TURNS = 80`
- `EXHAUSTED_RECENT_COMBAT_FATIGUE_FLOOR = 1`

Mechanism:
- Ignore early/mid war turns.
- Read faction `state.political.war_exhaustion`.
- Read the formation's latest `brigade_history.engagements[*].turn`.
- If the faction is exhausted and the formation fought recently, apply the residue floor after normal recovery and frontline duty fatigue.

## After Diagnostic

| artifact | final hash | diagnostic mode | sector_front mean | sector_front pct_zero | anchors | benchmarks |
|---|---|---|---:|---:|---:|---:|
| n1862 40w | `c0d8212847398b8f` | replay | 0.150 | 96.532 | 27/27 | 6/6 |
| n1863 188w | `c757c82da8cd8b67` | final-save fallback | 0.416 | 58.416 | 25/27 | 6/6 |

After artifacts:
- 40w: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1862`
- 188w: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1863`
- 188w replay fallback used because `replay_save_sequence.json` was 865,031,805 bytes.

The 188w `sector_front.pct_zero` moved from 100.000 to 58.416, inside the design-gated 40-70% band and above the 30% over-correction stop gate. The 40w run retained all 27 anchors.

## Stop Gates

| gate | status | evidence |
|---|---|---|
| 40w major anchor flip | PASS | n1862 has 27/27 anchors and 6/6 benchmarks. |
| 188w sector_front pct_zero below 30% | PASS | n1863 sector_front pct_zero is 58.416. |
| Sensitive-history capture outcome appears/disappears | REVIEWED | n1863 remains `OPEN_P0`; watched Operation Cerska-Kamenica, Krivaja-95, and Stupcanica-95 remain missing, and Srebrenica/Zepa event visibility matches n1844. Srebrenica RS-held cells moved from 1/11 in n1844 to 2/11 in n1863 while the capital remains RBiH-held and all-RS remains false. |
| 188w anchors | KNOWN CURRENT-LATE-WAR ISSUE | n1863 has 25/27 anchors. Teocak/Krstac 2 expected RBiH actual RS; Brcko expected RS actual RBiH. This matches the current integrated late-war issue noted outside this fatigue lane; 40w anchor gate is clean. |

No sensitive-history stop gate was treated as tripped because no watched outcome appeared or disappeared relative to current n1844 evidence. The one-cell Srebrenica drift is recorded as residual review risk.

## Verification

| Command | Exit | Evidence |
|---|---:|---|
| `npx.cmd vitest run tests\fatigue_distribution_audit_diagnostic.test.ts` | 0 | Diagnostic fixture test passed. |
| `npx.cmd vitest run tests\fatigue_exhaustion_coupling.test.ts` before implementation | 1 | Red test: late-war exhausted recent-combat reserve formation recovered to 0 instead of preserving residue. |
| `npx.cmd vitest run tests\fatigue_exhaustion_coupling.test.ts` after implementation | 0 | Focused owner-D test passed. |
| `npx.cmd vitest run tests\fatigue_distribution_audit_diagnostic.test.ts tests\fatigue_exhaustion_coupling.test.ts tests\formation_fatigue_frontline_assignment.test.ts tests\attack_resource_aftermath.test.ts` | 0 | 4 files, 23 tests passed. |
| `npm.cmd run typecheck` | 1 | Blocked by unrelated out-of-lane errors in `corps_operation_readiness.ts` and `tests/ui/pre_advance_command_review.test.ts`. |
| `npm.cmd run sim:scenario:run:40w` | 0 | n1862, hash `c0d8212847398b8f`, 27/27 anchors, 6/6 benchmarks. |
| `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs` | 0 | n1863, hash `c757c82da8cd8b67`, 25/27 anchors, 6/6 benchmarks. |

Typecheck blockers observed:
- `src/sim/combat/corps_operation_readiness.ts(482,26)`: `factionPoolPressure` is undefined.
- `tests/ui/pre_advance_command_review.test.ts(221,11)`, `(222,11)`, `(240,24)`: paramilitary review fixture/type mismatch around `estimated_civilian_risk`.

These files are outside the fatigue lane ownership and were not edited.

## Files Changed

| File | Change |
|---|---|
| `tools/diagnostics/fatigue_distribution_audit.cjs` | Deterministic fatigue distribution diagnostic with replay/final-save modes and source classification. |
| `tests/fatigue_distribution_audit_diagnostic.test.ts` | Fixture-backed diagnostic stability coverage. |
| `tests/fixtures/fatigue_distribution/compact_run/replay_save_sequence.json` | Compact replay fixture. |
| `tests/fixtures/fatigue_distribution/compact_run/run_summary.json` | Compact run metadata fixture. |
| `docs/40_reports/audits/20260517_FATIGUE_OWNER_CLASSIFICATION.md` | Baseline diagnostic and owner-D design gate record. |
| `src/state/formation_fatigue.ts` | Late-war exhausted recent-combat residue floor in sorted fatigue recovery loop. |
| `tests/fatigue_exhaustion_coupling.test.ts` | Owner-D red/green behavior coverage. |
| `docs/40_reports/implemented/20260517_FATIGUE_RECOVERY_REBALANCE.md` | This implementation report. |
| `docs/40_reports/CONSOLIDATED_BACKLOG.md` | Closed the fatigue backlog row with evidence link. |

## Scope Notes

Per the lane handoff, this did not edit supply, paramilitary, RBiH-HRHB, strict-null, FORAWWV, or global calibration/roadmap/ledger docs. `CALIBRATION_MASTER.md`, `MASTER_ROADMAP.md`, `PROJECT_LEDGER.md`, and `PROJECT_LEDGER_KNOWLEDGE.md` were intentionally left untouched in this independent lane.
