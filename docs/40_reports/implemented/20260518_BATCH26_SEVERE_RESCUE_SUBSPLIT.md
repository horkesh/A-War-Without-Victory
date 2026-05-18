# Batch 26 — `:severe-rescue` Sub-Attribution

**Date:** 2026-05-18
**Baseline:** Batch 25 / 40w n1902 `b14179d65639860c`
**Result:** Phase E (`:severe-rescue`, ~290 lines) split into three nested sub-passes. n1903 evidence shows `:floor-completion` is the dominant child at 696ms / 1502 calls (65% of severe-rescue parent), followed by `:quiet-self-relief` 250ms (23%) and `:severe-relief` 115ms (11%). Children sum to 99.8% of parent — clean attribution.

## Change

`src/sim/combat/brigade_assignment.ts` Phase E (severe-rescue) is structurally three sequential passes:

1. **Quiet self-relief** (~49 lines): for sectors already manned but below their frontage floor, promote rear/reserve brigades the sector already owns rather than asking siblings to donate.
2. **Floor completion** (~98 lines): for low-density recipients, transfer surplus brigades from same-corps donors with adequate density advantage.
3. **Severe relief** (~85+ lines): for low-density high-threat recipients, transfer rear/reserve/front brigades from same-component donors.

Each pass body is now wrapped in its own `perfTime` child under the existing `:severe-rescue` parent label.

## Evidence (n1903)

| Label | Aggregate ms / 40w | Calls | % of parent |
|---|---:|---:|---:|
| `ensureMinimumSectorCoverage:severe-rescue:floor-completion` | **696.4** | 1502 | 65.5% |
| `ensureMinimumSectorCoverage:severe-rescue:quiet-self-relief` | 249.7 | 1502 | 23.5% |
| `ensureMinimumSectorCoverage:severe-rescue:severe-relief` | 114.9 | 1502 | 10.8% |
| Sum of children | 1061.0 | — | 99.8% |
| Parent `:severe-rescue` | 1063.4 | 1502 | 100% |

Attribution overhead = 2.4 ms (~0.2%) — clean.

## Byte-Identity Proof

Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1903`
Final state hash: `b14179d65639860c` — matches Batch 17 baseline literally.

| Check | Result |
|---|---|
| 40w hash matches `b14179d65639860c` | yes |
| `validate_run_consistency` | PASS (0 violations) |
| anchors / benchmarks | 27/27 / 6/6 |
| `tests/sector_partition_*.test.ts + final_sector_truth_* + war_phase_step_order` | 65/65 PASS |
| `npm.cmd run typecheck` | PASS |

## Cumulative Sector-Perf Landscape (Session So Far)

| Phase | Pre-session ms | Now ms | Net change |
|---|---:|---:|---:|
| `applyFinalSectorOwnerTruthPass:normalize-buckets` | 2013.9 | 294.7 | **-1719 (-85%)** [Batch 22] |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` | 1466.9 | 805.0 | **-662 (-45%)** [Batch 25] |
| `ensureMinimumSectorCoverage:severe-rescue` | 1054.5 | 1063.4 | +9 (noise) |
| Sum of wins | | | **~2.4 s saved on the 40w simulation bucket** |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_assignment.ts` | Three nested `perfTime` wrappers under `:severe-rescue` for the natural sub-pass boundaries. |
| `tests/sector_partition_instrumentation.test.ts` | Static contract extended to require the three new label literals. |
| `docs/40_reports/implemented/20260518_BATCH26_SEVERE_RESCUE_SUBSPLIT.md` | This report. |

Plus parent-doc propagation.

## Next Target (Batch 27+)

`:floor-completion` 696ms / 1502 calls is the new dominant inner child. Looking at lines 1891 and the per-recipient candidate-list build, the pattern is similar to Batch 25's hoist target: `activeCounts` is built per recipient (line 1891) and consumed read-only inside the candidate `.flatMap`. Likely byte-identical hoist candidate. Estimated saving: ~250–350ms based on pattern from Batch 25's 45% win.
