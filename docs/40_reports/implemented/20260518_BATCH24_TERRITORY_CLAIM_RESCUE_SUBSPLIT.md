# Batch 24 — `territory-claim-rescue` Sub-Attribution

**Date:** 2026-05-18
**Baseline:** Batch 23 / 40w n1900 `b14179d65639860c`
**Result:** Phase A (`ensureMinimumSectorCoverage:territory-claim-rescue`) split into two natural sub-blocks. New evidence shows the original "pre-pass zero-front rescue" is only 2.4% of the phase cost; the 4-step "zero-assigned rescue" (Step 1 promote reserve / 1b pull rear / 1c pull reserve / 2 transfer surplus) is **97% (1466.9 ms / 1502 calls)** — the actual Phase A hotspot.

## Change

Nested two `perfTime` callbacks inside the existing `ensureMinimumSectorCoverage:territory-claim-rescue` wrapper:

- `:zero-front` — wraps the original `for (corpsSectors)` loop that pulls brigades physically in zero-front-sector territory (lines 1413-1468 of `src/sim/combat/brigade_assignment.ts`, ~57 lines).
- `:zero-assigned` — wraps the second `for (corpsSectors)` loop that runs the 4-step rescue (Step 1 promote reserve, Step 1b pull rear, Step 1c pull reserve, Step 2 transfer from surplus) for sectors with zero assigned brigades after Step 0 (lines 1471-1594, ~125 lines).

Static-contract test extended to require the two new label literals.

## Evidence (n1901)

| Label | Aggregate ms / 40w | Calls | % of parent |
|---|---:|---:|---:|
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` | **1466.9** | 1502 | 97.4% |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-front` | 36.8 | 1502 | 2.4% |
| Parent `ensureMinimumSectorCoverage:territory-claim-rescue` | 1505.7 | 1502 | 100% |

Sum of children = 1503.7 ms; parent = 1505.7 ms; attribution overhead = 2 ms (<0.2%) — clean.

The `:zero-assigned` block iterates `sectorsByCorps` and for each zero-assigned sector runs four sequential sub-passes that build candidate lists via `corpsSectors.filter(...).flatMap(...).sort(...)` over donor sectors with several BFS reachability checks. Both the candidate-list rebuild work and the per-iteration `countActiveBrigadesByOsid(formations)` call are likely contributors.

## Byte-Identity Proof

Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1901`
Final state hash: `b14179d65639860c` — matches Batch 17 baseline literally.

| Check | Result |
|---|---|
| 40w hash matches `b14179d65639860c` | yes |
| `validate_run_consistency` | PASS (0 violations) |
| anchors / benchmarks | 27/27 / 6/6 |
| `tests/sector_partition_*.test.ts + final_sector_truth_* + war_phase_step_order` | 65/65 PASS |
| `npm.cmd run typecheck` | PASS |

Scenario expert: "GO. Nested sub-attribution is byte-identical, calibration-flat, and confirms that Phase A cost is concentrated almost entirely in the multi-step `zero-assigned` block — not the original `zero-front` rescue. This pinpoints the hot region for any future Phase A optimization."

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_assignment.ts` | Wrapped Phase A's two natural sub-blocks (`zero-front` and `zero-assigned`) in nested `perfTime` callbacks under the existing `:territory-claim-rescue` parent. |
| `tests/sector_partition_instrumentation.test.ts` | Static contract extended to require the two new label literals. |
| `docs/40_reports/implemented/20260518_BATCH24_TERRITORY_CLAIM_RESCUE_SUBSPLIT.md` | This report. |

Plus parent-doc propagation (SECTOR_MASTER, MASTER_BACKLOG_EXECUTION_QUEUE, PROJECT_LEDGER, PROJECT_LEDGER_KNOWLEDGE, napkin).

## Next Target

`ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` (1466.9 ms / 1502 calls / ~1.0 ms-per-call, 97% of `:territory-claim-rescue`). Either:
1. Further sub-attribution into the 4 inner steps (Step 1 promote, Step 1b rear, Step 1c reserve, Step 2 surplus) for a 4-way split. Each step has its own `for (corpsSectors).filter(...)` + sort + BFS reachability work.
2. Direct byte-identical optimization: the `countActiveBrigadesByOsid(formations)` call inside `flatMap` callbacks at lines 1501 / 1532 is rebuilt per donor sector per step — likely hoisting candidate.

Also remaining: `:severe-rescue` (1054 ms, ~290 lines, 39% of `:ensure-coverage`).
