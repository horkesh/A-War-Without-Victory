# Prefix Result — 2026-09-30

## Command and Run

- **Command**: `npm.cmd run sim:scenario:harness -- --scenario data/scenarios/apr1992_definitive_188w.json --weeks 40 --out runs --unique`
- **Exit**: 0
- **Run path**: `runs\apr1992_definitive_188w__5437fee464408c02__w40_n21`
- **Log**: `logs/prusac-diagnostic-20260929/prefix_run.log`

## Source/Input Provenance

- Scenario: `data/scenarios/apr1992_definitive_188w.json` (unmodified)
- Edit under test: `src/sim/combat/pre_planned_operations.ts` — removed `prusac_local` axis; appended `op:donji_vakuf:jemanlici` to `donji_vakuf_sweep` objectives
- Worktree dirty: 34 modified files, 11 untracked (not a clean single-diff comparison)
- No source edit, no resume save, no painted/denominator change, no retiming

## Pre-checks

| Check | Exit | Result |
|---|---|---|
| `npm.cmd run typecheck` | 0 | Pass |
| `vitest run tests/pre_planned_operations.test.ts` | 0 | 91/91 passed |

## t29 Battle/Control History

- **Prusac**: initial RBiH → final RBiH. **No flip.** The authored `prusac_local` axis removal prevented the t29 capture. In n14, the 19th Krajina won ordinary combat at Prusac (power ratio 10.47, 120 casualties) and flipped it RBiH→RS. In this run, no battle targeted Prusac.
- **Jemanlići**: initial RS → final RS. **No flip.** Already RS at scenario start; not attacked.
- **Operation Donji Vakuf** (w28–w36): outcome success with five logged objective captures, including Torlakovac, Oborci, Donji Vakuf town, Korenići, and Gornje Krčevine. Jemanlići was already RS, so no capture was needed. The authored sweep still lists Jemanlići after Korenići.

## Ordinary-Combat/Operation Receipts

- No new takeover of Prusac logged. No ordinary combat targeted it.
- Operation Donji Vakuf completed via the main sweep axis only; `prusac_local` axis absent.
- No direct transfer, scripted victory, or operation-owned capture of Prusac.

## January 1993 Checkpoint

| Controller | Final | Reference | Delta |
|---|---|---|---|
| HRHB | 86 | 86 | 0 |
| RBiH | 254 | 251 | +3 |
| RS | 372 | 375 | −3 |

- **Score: 707/712** (5 mismatches), from `run_summary.json` → `historical_fit.osid_pair_match.matched_osids`. n14 baseline: 706/712 (6 mismatches). **Improvement of one settlement.** The +3/−3 faction totals above do not measure paired settlement matches.
- Reconstructing n14's turn-40 controllers from its initial save and dated control events against the same active January paint gives six mismatches. The new run has the same five remaining mismatches; only Prusac was removed from the mismatch set. All 31 reported anchor checks pass.

## Health/Causality

- FINAL_SEAL unresolved=0 at all turns (turn 1–40 and final_save)
- Anomaly detection: 19 total (0 critical, 3 warning, 16 info)
  - Warnings: outcome_distribution_skew (72.2% decisive), frontline_density_imbalance (2 sectors), zero_combat_corps (hvo_tomislavgrad) — all general combat balance, not Prusac-related
- Combat causality reports `valid_for_combat_calibration=true`, invalid operation count 0; no assignment failures

## Pass/Fail

| Criterion | Result |
|---|---|
| Run exit 0 | PASS |
| Clean assignment/causality/health | PASS |
| Prusac RBiH after t29 and at prefix end | PASS |
| Jemanlići RS at prefix end | PASS |
| No new takeover logged as ordinary operation-owned combat | PASS (no takeover) |
| No new January 1993 mismatch or protected anchor failure vs n14 | PASS (5 vs 6 mismatches; no new mismatch; 31/31 anchors) |

**Overall: PASS**

## Conclusion

Removing the authored `prusac_local` axis prevented the t29 Prusac capture. Prusac remained RBiH throughout the 40-week prefix. The Donji Vakuf operation completed successfully; Jemanlići was already RS and required no capture. The January 1993 checkpoint improved from 6 to 5 mismatches versus n14, solely by correcting Prusac. The run has zero critical anomalies, no protected anchor failures, and valid combat causality.

## Next Action

The bounded diagnostic passes. The candidate edit is a simulation hypothesis that prevents the 1992 Prusac capture through week 40. The required 188-week campaign, all protected-checkpoint verification, full suite, and provenance checks remain open. The original Prusac implementation request authorized one 188-week measurement after the cheap gates; it remains to be run.
