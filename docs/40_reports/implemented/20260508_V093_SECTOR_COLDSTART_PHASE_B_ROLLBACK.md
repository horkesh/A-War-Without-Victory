# LANE-NIGHTSHIFT-V093-SECTOR-COLDSTART-PHASE-B-IMPL — ROLLBACK + STOP-AND-RECOMMEND

**Lane:** `LANE-NIGHTSHIFT-V093-SECTOR-COLDSTART-PHASE-B-IMPL`
**Date:** 2026-05-08
**Status:** ROLLED BACK pre-commit per ST-G3-drift; v0.9.3 wall-clock surface CLOSED-FOR-V0.9.3 as STOP-AND-RECOMMEND.
**Predecessor:** Phase A consult at `33f78431` (`docs/40_reports/audits/20260508_V093_SECTOR_COLDSTART_PHASE_A_CONSULT.md`)

## What was attempted

Per Phase A's DISPATCHABLE-WITH-PLAN verdict: per-invocation memoization of `mapOsidsToCorps` inside `buildCorpsFrontSectors`. Agent (`a2bedc76`) shipped uncommitted modifications to:

- `src/sim/combat/sector_territory.ts`
- `src/sim/combat/corps_front_sectors.ts` (5 call sites at lines 478, 531, 1510, 1677, 2385)
- `tests/sector_partition_map_osids_to_corps_property.test.ts` (NEW)

Agent died waiting for vitest event before committing. Parent recovered the working tree to verify gates.

## Gate verdicts

| Gate | Result |
|---|---|
| typecheck | clean |
| **G1** — property test ≥10,000 trials | **PASS** (3/3 tests, 3164 ms) |
| **G3** — 40w hash byte-stability | **FAIL** |
|  &nbsp; &nbsp; baseline (no Phase B) | `86ebf26ae0271465` |
|  &nbsp; &nbsp; with Phase B (uncommitted) | `6987b576495bb18e` |

Live baseline confirmed by stash + smoke before/after: HEAD `33f78431` produces `86ebf26ae0271465`. Phase B uncommitted impl drifts to `6987b576495bb18e`.

## The G1-vs-G3-divergence finding

**G1 property test passed 10,000+ randomized fixtures**, proving function-level return-value byte-equality between legacy and memoized paths. **G3 production hash drifts on the actual 40w scenario.**

This pattern names a specific failure mode: **the function's return value is byte-equal under G1, but the memoization introduces production-level side effect or ordering difference that G1 doesn't catch.** Likely culprits (not investigated; deferred):

- Cache lifetime broader than per-invocation (module-level Map shared across calls)
- Shared mutable state in cache value path
- Map iteration ordering subtly different from object key iteration in production code paths consuming the result
- Cache key collision on a faction-symmetric edge case real data exercises

**Durable lesson (candidate KNOWLEDGE entry):** G1 property test on function returns is necessary but not sufficient for G3 byte-stability. When G1 passes and G3 fails, the bug is in cross-call state, not in the function semantics. Add a G1.5 *integration property test* that runs `buildCorpsFrontSectors` end-to-end with cache ON vs cache OFF and asserts identity of the final structure.

## Rollback

Per ST-G3-drift binding stop trigger + Tarjan precedent `a60d39c9` discipline reference ("G3 hash drifts from baseline → ROLL BACK before commit. Investigate as a separate lane"):

- `git checkout -- src/sim/combat/corps_front_sectors.ts src/sim/combat/sector_territory.ts`
- `rm tests/sector_partition_map_osids_to_corps_property.test.ts`
- Working tree clean of Phase B changes; no commit; no push.

## Verdict — v0.9.3 wall-clock surface

**STOP-AND-RECOMMEND CLOSURE for v0.9.3.** No optimization commit lands.

The Phase A audit + this Phase B attempt + the rollback + the G1-vs-G3-divergence finding are valuable substrate for a future v0.9.4+ retry, but the cold-start optimization itself is deferred. v0.9.3 closes with:

- a11y Lanes A/B/C/D/E shipped (4/4 P0 v1.0-ship blockers)
- Perf-memory CLOSED today (LANE D streaming)
- Wall-clock perf wall remains open (target <100 ms/turn vs current 3,094 ms; cold-start band the highest-leverage future surface but G3-discipline-bound)

## Recommendation for v0.9.4+ retry (if scheduled)

1. **Read this report first** to understand the G1-vs-G3-divergence pattern.
2. **Add G1.5 integration property test** before re-attempting any memoization: a smoke harness that calls `buildCorpsFrontSectors` end-to-end with cache ON vs cache OFF on real fixture data; asserts identity of the returned sector list. This catches cross-call leakage that G1 alone misses.
3. **Investigate the cache-lifetime path** in the rolled-back implementation (uncommitted; not on disk anymore). The `agent ID a2bedc76` transcript may have the diff if needed for forensic analysis.
4. **Consider the alternative: structural simplification of `buildFactionSectors` or `recoverDroppedFrontEdges` directly** rather than memoizing `mapOsidsToCorps`. Phase A audit ranked this lower in calibration safety but it's worth re-evaluating now that the simpler memoization path failed G3.

## Sensitive-history compliance

- Ring 1 (audit + roll-back only); no §6 surface; no FORAWWV; no engine code committed.
- Faction-symmetric: rollback is faction-agnostic.
- Determinism preserved (no source code remains).
