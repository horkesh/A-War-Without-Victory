# Batch 27 — `:floor-completion` activeCounts Hoist Attempt + Revert

**Date:** 2026-05-18
**Baseline:** Batch 26 / 40w n1903 `b14179d65639860c`
**Result:** Hoist attempt was byte-identical (hash unchanged) but consistently REGRESSED the targeted label by ~+210 ms / +30% across two confirmation runs. Reverted. Captured the surprise as a durable rule about Map sparseness in V8.

## What was attempted

Move `const activeCounts = countActiveBrigadesByOsid(formations);` from inside the per-recipient `for` loop in `ensureMinimumSectorCoverage:severe-rescue:floor-completion` (was line 1895) to once-per-pass (before the recipient loop). Theory: `moveBrigadeToFrontTarget(...)` already updates `activeCounts` in-place with the exact delta a fresh `countActiveBrigadesByOsid(formations)` rebuild would produce, so persisting the Map across recipients should be byte-identical and skip ~125 rebuild calls per pass × 1502 passes = many redundant builds.

Same pattern as Batch 25's hoist that yielded a clean -45% saving on `:zero-assigned`.

## What happened

| Run | `:floor-completion` ms | Calls | vs Batch 26 baseline (696.4 ms) |
|---|---:|---:|---:|
| Batch 26 n1903 (pre-hoist baseline) | 696.4 | 1502 | — |
| Batch 27 n1904 (hoisted) | 902.5 | 1502 | +206 / +29.6% |
| Batch 27 n1905 (hoisted, confirmation) | 907.5 | 1502 | +211 / +30.3% |
| Batch 27 n1906 (reverted) | 710.1 | 1502 | +13.7 / +2% (within noise) |

Both hoisted runs agree to within 5 ms. Not noise — a real, consistent ~+210 ms regression. Byte-identity held throughout (hash `b14179d65639860c` in all three runs).

## Hypothesis for the regression

The hoisted activeCounts Map accumulates entries across recipients and across the whole pass. Each `moveBrigadeToFrontTarget(...)` mutation can grow the Map by introducing a previously-absent OSID. Over the lifetime of one pass, the Map's footprint is the UNION of OSIDs touched by any move. The per-recipient fresh build, by contrast, produces a TIGHTER Map containing only currently-occupied OSIDs at the moment of the build (no transient empty-count entries).

V8's Map lookup cost is proportional to the underlying hash-table capacity, not just the live entry count. A sparser Map means more memory traffic and worse cache behavior, plausibly dominating the per-recipient rebuild cost (~few μs per build × 125 recipients = ~1 ms saved per pass) by an order of magnitude.

The Batch 25 hoist worked because `:zero-assigned` runs ~3-4 small loops per recipient (Step 1 / 1b / 1c / 2) and the Map stays tight; the Batch 27 site runs a much larger candidate `.flatMap` per recipient and accumulates more transient OSID activity.

## Decision

Reverted the hoist. Restored the per-recipient `countActiveBrigadesByOsid(formations)` rebuild at line 1895. Added an inline comment in the source documenting the failed attempt and the Map-sparseness hypothesis so future maintainers don't repeat the experiment.

n1906 (post-revert) confirms `:floor-completion` returned to 710.1 ms — within run-to-run variance of the Batch 26 baseline 696.4 ms.

## Byte-Identity Proof

| Check | n1906 (revert) | Result |
|---|---|---|
| 40w final_state_hash | `b14179d65639860c` | matches Batch 17 baseline literally |
| `node tools/validate_run_consistency.cjs runs/.../n1906` | PASS | 0 violations across all 13 invariant checks; 4 pre-existing informational below-floor advisories unchanged |
| run_summary `bot_benchmark_evaluation` | `passed=6 failed=0 evaluated=6` | 6/6 |
| `npm.cmd run typecheck` | PASS | |

## Durable Rule

**Map-sparseness check before hoisting per-iteration rebuilds in tight loops:** When the per-iteration build is a `Map` populated by counting/scanning a moderately large input set, and the hoisted version would accumulate entries via in-place mutation across many iterations, the V8 perf characteristics may invert the expected win. Check empirically with a second confirmation run before declaring victory. Specifically for `countActiveBrigadesByOsid(formations)`: hoist only works when the surrounding loop's mutations stay small (Batch 25's `:zero-assigned` had ~2-4 moves per recipient, hoist saved 45%); fails when the loop accumulates many transient OSID mutations (Batch 27's `:floor-completion` had up to FLOOR_COMPLETION_MAX_TRANSFERS=2 moves per recipient but iterated many more recipients before reset).

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_assignment.ts` | Restored per-recipient `const activeCounts = countActiveBrigadesByOsid(formations);` at line 1895 with a new inline comment documenting the failed Batch 27 hoist attempt and the Map-sparseness hypothesis. |
| `docs/40_reports/implemented/20260518_BATCH27_FLOOR_COMPLETION_HOIST_REVERT.md` | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, PROJECT_LEDGER_KNOWLEDGE, napkin, SECTOR_MASTER, MASTER_BACKLOG_EXECUTION_QUEUE).

## Next Target

Continue Phase E exploration without the failed hoist. Candidates:
- Sub-attribute `:floor-completion` 696 ms into its own internal regions to find a tighter optimization target.
- Look at `:quiet-self-relief` 250 ms for a similar but smaller hoist (its inner `while` loop has a per-iteration activeCounts rebuild too at line 1833 — same pattern as Batch 25 but with smaller mutation count, may succeed).
- Pivot to a non-sector lane (strict-null, CI/test feedback loop, 188w endgame verification).
