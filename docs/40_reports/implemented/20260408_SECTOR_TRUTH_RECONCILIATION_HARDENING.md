# Sector Truth Reconciliation Hardening

**Date:** 2026-04-08
**Run ID:** `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1367`
**Baseline:** final saved sector truth from `n1367`
**Result:** sector builder sealed against reserve-only/stale-metric/untruthful-assignment output; end-of-turn sector truth rebuilt after late brigade writers; same-corps front overlap cleanup made edge-truth-safe

## Summary
- Hardened the sector builder so late assignment cleanup can no longer leave a live sector reserve-only or with stale density/power metrics.
- Added a final end-of-turn sector reconciliation pass after recruitment, mobilization, elite-loan recall, and final front refresh.
- Replaced delete-only sibling front de-overlap with edge-aware front ownership transfer and subsegment rebuild, so overlap cleanup cannot leave `edge_ids` contradicting `friendly_osids`.
- Verified with targeted tests, typecheck, and a rebuild of the real `n1367` final save.

## Changes Made

### Builder sealing
- [src/sim/combat/brigade_assignment.ts](/F:/A-War-Without-Victory/src/sim/combat/brigade_assignment.ts)
  - Generalized the old Sarajevo-only zero-assigned guard so any live sector with a truthful one-hop reserve candidate keeps one frontline assignee instead of serializing as reserve-only.
- [src/sim/combat/corps_front_sectors.ts](/F:/A-War-Without-Victory/src/sim/combat/corps_front_sectors.ts)
  - Recompute sector metrics after merge/contiguity repair before syncing assignments back to formations.
  - Added a final builder seal after reachability demotion: rerun minimum coverage, rerun reserve/frontline normalization, and rerun sector power/threat recompute.

### Final authority rebuild
- [src/sim/combat/final_sector_truth_reconciliation.ts](/F:/A-War-Without-Victory/src/sim/combat/final_sector_truth_reconciliation.ts)
  - New helper that rebuilds final `corps_front_sectors`, reassigns brigades to subsegments, refreshes unresolved brigades through the builder, and recomputes `sector_combat_ratings`.
- [src/sim/turn_phases/war_phases.ts](/F:/A-War-Without-Victory/src/sim/turn_phases/war_phases.ts)
  - Added `reconcile-final-sector-truth` immediately after `rederive-osid-front-segments`, making end-of-turn sectors the final authority after late brigade/location writers.

### Truth-preserving transfer and overlap normalization
- [src/sim/combat/brigade_assignment.ts](/F:/A-War-Without-Victory/src/sim/combat/brigade_assignment.ts)
  - Tightened the late equalization and moderate-pressure reinforcement passes so they cannot steal brigades that donor sectors already truthfully own by frontline, territory, or one-hop reserve claim.
- [src/sim/combat/corps_front_sectors.ts](/F:/A-War-Without-Victory/src/sim/combat/corps_front_sectors.ts)
  - Reworked sibling overlap cleanup to transfer the actual incident `edge_ids` to the canonical owner, rebuild subsegment geometry from edge truth, and absorb sectors that collapse into pure overlap artifacts.

### Regression coverage
- [tests/sector_builder_sealing.test.ts](/F:/A-War-Without-Victory/tests/sector_builder_sealing.test.ts)
  - Proves a truthful one-hop reserve candidate is promoted so the final live sector is not reserve-only.
- [tests/final_sector_truth_reconciliation.test.ts](/F:/A-War-Without-Victory/tests/final_sector_truth_reconciliation.test.ts)
  - Proves a late-created brigade is folded back into final sector truth, unresolved state is cleared, and sector ratings are refreshed.
- [tests/war_phase_step_order.test.ts](/F:/A-War-Without-Victory/tests/war_phase_step_order.test.ts)
  - Locks in the new late-writer ordering contract.
- [tests/sector_coverage_truth_preservation.test.ts](/F:/A-War-Without-Victory/tests/sector_coverage_truth_preservation.test.ts)
  - Locks that density equalization and moderate-pressure reinforcement cannot steal brigades that are already truthfully owned by donor territory.
- [tests/sector_front_overlap_canonicalization.test.ts](/F:/A-War-Without-Victory/tests/sector_front_overlap_canonicalization.test.ts)
  - Locks that sibling overlap normalization transfers real edge ownership and leaves subsegment front geometry consistent.
- [src/sim/combat/sector_truth_audit.ts](/F:/A-War-Without-Victory/src/sim/combat/sector_truth_audit.ts)
- [tools/scenario_runner/audit_sector_truth.ts](/F:/A-War-Without-Victory/tools/scenario_runner/audit_sector_truth.ts)
- [tests/sector_truth_audit.test.ts](/F:/A-War-Without-Victory/tests/sector_truth_audit.test.ts)
  - Added a deterministic save-audit path so sector truth can be checked directly for reserve-only sectors, stale metrics, overlap, edge/subsegment mismatch, and untruthful brigade ownership without relying on anomaly summaries.

## Verification

### Commands
- `cmd /c npx tsc --noEmit`
- `cmd /c npx vitest run tests/sector_builder_sealing.test.ts tests/final_sector_truth_reconciliation.test.ts tests/sector_power_threat_recompute.test.ts tests/war_phase_step_order.test.ts`
- `cmd /c npx vitest run tests/corps_front_sector_corps_ownership.test.ts tests/hvo_central_bosnia_sectors.test.ts`
- `cmd /c npx vitest run tests/sector_builder_sealing.test.ts tests/final_sector_truth_reconciliation.test.ts tests/sector_frontline_truth_wave1.test.ts tests/commander_driven_brigade_assignment.test.ts tests/hvo_central_bosnia_sectors.test.ts tests/corps_front_sector_corps_ownership.test.ts tests/war_phase_step_order.test.ts`

### Real-save rebuild audit (`n1367`)
- reserve-only live sectors: `6 -> 0`
- stale-density sectors: `2 -> 0`
- same-corps overlapping front OSIDs: `14 -> 0`
- untruthful assigned brigades: `2 -> 0`
- edge / front-geometry mismatches after overlap cleanup: `18 -> 0`
- unresolved brigades in rebuilt sector truth: `0`

## Lessons Learned
- Sector truth needs two different hardening layers: builder sealing and final authority rebuild. Either one alone leaves holes.
- A final front-edge refresh without a final sector rebuild creates a split-brain save: newer fronts layered over older sectors.
- Merge passes that zero metrics are acceptable only if a guaranteed recompute runs before sync/save.
- Sibling front de-overlap is not safe if it edits only `friendly_osids`. If a cleanup changes front ownership, it must move the corresponding `edge_ids` and then rebuild subsegment geometry from edge truth.
- Late balancing passes are just as dangerous as early coverage rescue. Any brigade transfer step that ignores physical truth can silently reintroduce false sector ownership after earlier passes repaired it.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/brigade_assignment.ts` | generalized reserve-only guard |
| `src/sim/combat/corps_front_sectors.ts` | post-merge metric refresh and final builder seal |
| `src/sim/combat/corps_front_sectors.ts` | edge-aware sibling overlap normalization and empty-sector absorption |
| `src/sim/combat/final_sector_truth_reconciliation.ts` | new final authority rebuild |
| `src/sim/combat/sector_truth_audit.ts` | deterministic sector-truth audit utility |
| `src/sim/turn_phases/war_phases.ts` | new `reconcile-final-sector-truth` step |
| `tools/scenario_runner/audit_sector_truth.ts` | CLI wrapper for save-file sector audits |
| `tests/sector_builder_sealing.test.ts` | new regression |
| `tests/final_sector_truth_reconciliation.test.ts` | new regression |
| `tests/sector_coverage_truth_preservation.test.ts` | equalization truth-preservation regressions |
| `tests/sector_front_overlap_canonicalization.test.ts` | edge-aware overlap normalization regression |
| `tests/sector_truth_audit.test.ts` | audit-regression coverage |
| `tests/war_phase_step_order.test.ts` | ordering contract update |

## Next Steps
- Re-run the stitched bilateral audit for Bosanska Krupa, Konjic-Foča, and Rogatica-Goražde under the hardened builder to verify the sector pairings now stay truthful on both sides.
- Decide whether loaned brigades with no truthful same-component sector should remain explicitly unresolved through end-of-turn truth or receive a dedicated late holding rule.
