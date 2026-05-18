# Batch 22 — Autonomous Multi-Lane Closeout (Single-Lane)

**Date:** 2026-05-18
**Baseline:** Batch 21 / 40w n1898 `b14179d65639860c`
**Result:** Lane A shipped — `normalizeFinalSectorBuckets:friendly-universe` reduced 1897.3 ms → 10.0 ms (–99.5%) plus 78.6 ms of new precompute, net –1808 ms on the dominant sector-perf hotspot identified by Batch 21. Lane B (ensureMinimumSectorCoverage 5-phase attribution) was attempted, hit a closure-scope blocker, and was reverted; it will return in a later batch with a proper shared-closure hoist.

## Summary

| Lane | Status | Net change |
|---|---|---|
| A — `normalizeFinalSectorBuckets` friendlyUniverse hoist | implemented | `:friendly-universe` 1897.3 → 10.0 ms (–99.5%); `:normalize-buckets` parent 2013.9 → 294.7 ms (–85%); 40w byte-identical at `b14179d65639860c`. |
| B — `ensureMinimumSectorCoverage` 5-phase attribution | **reverted** | Phase wraps broke closure scope: `needed`/`DENSITY_FLOOR_*` declared in Phase B (`density-floor`) are referenced from Phase E (`severe-rescue`). Re-attempt needs to either hoist the shared closures out to function scope or use a non-wrapping attribution mechanism. |
| C — Report + propagation + commit | this report | |

## Lane A: `normalizeFinalSectorBuckets` friendlyUniverse Hoist

### Change

In `src/sim/combat/corps_front_sectors.ts`, precompute `friendlyUniverseByFaction: Map<FactionId, Set<string>>` ONCE at the start of `normalizeFinalSectorBuckets`, then each per-sector iteration reads its faction's pre-built set via `Map.get`. The per-sector `Object.entries(politicalControllers).filter(...).map(...)` rebuild is gone.

```typescript
const friendlyUniverseByFaction = _perfTime(
    'normalizeFinalSectorBuckets:friendly-universe-precompute',
    () => {
        if (!politicalControllers) return null;
        const result = new Map<FactionId, Set<string>>();
        for (const [osid, controller] of Object.entries(politicalControllers)) {
            if (controller == null) continue;
            let set = result.get(controller);
            if (!set) {
                set = new Set<string>();
                result.set(controller, set);
            }
            set.add(osid);
        }
        return result;
    },
);
for (const sector of sectors) {
    ...
    const friendlyUniverse = _perfTime('normalizeFinalSectorBuckets:friendly-universe', () =>
        friendlyUniverseByFaction
            ? friendlyUniverseByFaction.get(sector.faction) ?? new Set<string>()
            : new Set(territorySet)
    );
    ...
}
```

### Byte-identity argument

1. **Set contents identical.** `Object.entries(politicalControllers).filter(c === sector.faction)` produces the same OSIDs that my precompute groups into `friendlyUniverseByFaction.get(sector.faction)`.
2. **Insertion order preserved.** `Object.entries` iterates string-keyed own properties in declaration order. The precompute walks the same iteration order and adds OSIDs to per-faction Sets in that order. Per-sector consumption gets the same Set with the same insertion order.
3. **Reference identity unused.** Downstream consumption uses `.has(osid)` only inside the `reserveBand` build. No identity comparisons; no mutation; safe to share references across sectors of the same faction.
4. **Fallback path preserved.** When `politicalControllers` is `undefined`, the precompute returns `null`, the per-sector lookup falls through to `new Set(territorySet)` — byte-identical to the original fallback.
5. **No politicalControllers entries for sector.faction.** Old code: `new Set([])` = empty Set. New code: `friendlyUniverseByFaction.get(sector.faction) ?? new Set<string>()` = empty Set. Same.

### Run evidence — Batch 21 (pre-hoist, n1898) vs Batch 22 (post-hoist, n1899)

| Label | n1898 (pre) | n1899 (post) | Delta |
|---|---:|---:|---:|
| `normalizeFinalSectorBuckets:friendly-universe-precompute` | — (new) | 78.6 ms | +78.6 |
| `normalizeFinalSectorBuckets:friendly-universe` | 1897.3 ms | 10.0 ms | **–1887.3 (–99.5%)** |
| `normalizeFinalSectorBuckets:reserve-band` | 86.1 | 89.1 | +3.0 (noise) |
| `normalizeFinalSectorBuckets:brigade-classify` | 110.2 | 100.5 | –9.7 (noise) |
| `normalizeFinalSectorBuckets:write-back` | 88.8 | 84.0 | –4.8 (noise) |
| `applyFinalSectorOwnerTruthPass:normalize-buckets` (parent) | 2013.9 | 294.7 | **–1719.2 (–85%)** |

Net wall-clock saving on the `:normalize-buckets` branch: **~1.7 seconds per 40w run.** That is ~5% of the 40w simulation bucket, on a hot per-sector path that ran 42,227 times before and runs once-per-call now for the heavy O(politicalControllers) work.

### Verification

40w n1899 final hash `b14179d65639860c` — matches Batch 17 baseline literally.

| Check | Result |
|---|---|
| 40w hash matches `b14179d65639860c` | yes |
| `node tools/validate_run_consistency.cjs runs/.../n1899` | PASS (15/15 invariant checks; pre-existing benign sector-floor advisories unchanged) |
| run_summary anchors | 27/27 PASS |
| run_summary bot benchmarks | 6/6 PASS |
| `npm.cmd run typecheck` | PASS |
| `tests/sector_partition_*.test.ts + final_sector_truth_* + war_phase_step_order` (6 files / 64 tests) | PASS |

Scenario expert: "GO for byte-identity merge. Lane A is clean — Ring 1, no §6, no canon surface, no behavioral delta, ~1.8 s win on a hot path."

## Lane B: `ensureMinimumSectorCoverage` 5-Phase Attribution (Reverted)

### What was attempted

Wrap each of the five top-level phases of `ensureMinimumSectorCoverage` (territory-claim-rescue, density-floor, idle-equalization, moderate-reinforcement, severe-rescue) in `_perfTime` callbacks via injected `perfTime` parameter. Same pattern as `buildMultiSectorsForCorps` in `sector_building.ts`.

### Why it failed

The phases share lexical closures declared at section boundaries. Specifically:
- Phase B (density-floor) declares `const needed = (s: CorpsFrontSector) => ...` and `const DENSITY_FLOOR_EDGES_PER_BRIGADE / DENSITY_FLOOR_THREAT_GATE` constants.
- Phase E (severe-rescue) reads `needed` at 10+ sites (lines 1873, 1880, 1895, 1931, 1970×2, 1975, 1990, 2012, 2069).

Wrapping each phase in its own `() => {}` callback creates a fresh scope, so Phase E's references to `needed` resolve to nothing → 10× `TS2304: Cannot find name 'needed'` errors.

### Path forward

Either:
1. Hoist all shared closures (`needed`, helper constants) up to function-body scope BEFORE the phase wrappers begin. This is a structural refactor that's safe but verbose (~30 lines of moves).
2. Use a non-wrapping attribution mechanism — accumulator timings via `process.hrtime.bigint()` recorded directly. Forbidden by the `_perfTime` instrumentation contract (which the static-grep tests enforce).
3. Move each phase body to its own helper function. Each helper takes the shared closures as parameters. Larger refactor but cleanest.

Recommendation: option 1 (hoist) in a dedicated batch with its own byte-identity proof.

### Revert summary

- `src/sim/combat/brigade_assignment.ts`: function signature returned to original 6 args; 5 phase wrappers and the closing `});` removed; type alias `EnsureMinimumSectorCoveragePerfTimer` removed.
- `src/sim/combat/corps_front_sectors.ts`: two `ensureMinimumSectorCoverage(...)` call sites inside `sealMergedSectorTruth` reverted to original 6-arg form.
- `tests/sector_partition_instrumentation.test.ts`: `static contract: ensureMinimumSectorCoverage` test removed.

## Files Changed

| File | Lane | Change |
|---|---|---|
| `src/sim/combat/corps_front_sectors.ts` | A | `friendlyUniverseByFaction` precompute hoisted out of the per-sector loop in `normalizeFinalSectorBuckets`; new `:friendly-universe-precompute` sidecar label; per-sector `:friendly-universe` lookup now reads from the precomputed Map. |
| `docs/40_reports/implemented/20260518_BATCH22_AUTONOMOUS_MULTI_LANE.md` | C | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, PROJECT_LEDGER_KNOWLEDGE, napkin, SECTOR_MASTER, MASTER_BACKLOG_EXECUTION_QUEUE).

## Next Targets

1. **Sector perf Batch 23 (closure-hoist + attribute)**: hoist `needed` and density-floor constants out of `ensureMinimumSectorCoverage`'s phase B to function scope, then wrap each of the 5 phases with `_perfTime`. Target: identify which of the 5 phases drives the 2666 ms / 1502 calls (1.78 ms/call) ensure-coverage cost.
2. **Sector perf Batch 23 alt (descend without attribution)**: bypass attribution and directly inspect `ensureMinimumSectorCoverage` source for an obvious byte-identical optimization (e.g., per-sector enemy-personnel preview already at lines 334-356).
3. **Strict-null Phase 2**: 21 remaining combat escapes; most are in `corps_front_sectors.ts` (7) / `sector_*` (8) / gated `paramilitary_sweep.ts` (3) / gated `supply_condition.ts` (1). Long-tail; clean candidates outside sector territory are limited.
4. **Other queue lanes**: CI/test feedback loop plan, 188w endgame verification (long run), diplomacy panel (UI), BCS localization scaffold.
