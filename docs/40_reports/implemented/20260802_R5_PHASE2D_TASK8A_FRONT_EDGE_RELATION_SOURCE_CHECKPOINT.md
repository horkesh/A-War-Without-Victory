# R5 Phase 2d Task 8A Front-Edge Relation Source Checkpoint

**Date:** 2026-08-02
**Baseline:** `2d72d75e3e8250c0fe09739648a61522cd7efd14` (`c7004af13f186e585393b44f71651edb42e57a7f`)
**Branch:** `codex/r5-phase2d-front-edge-relation`
**Result:** Source correctness accepted; post-integration exact-parent measurement recorded `PASS_RETAIN` at `0fd36157b` — **superseded 2026-08-03, see "Final Disposition: Reverted" at the end of this document.** The retained state below is preserved as-written for the audit trail; it is no longer current.

## Summary

- `buildCorpsFrontSectors(...)` now creates at most one standard and one strict `SectorFrontEdgeRelation` per used faction for one invocation, then discards them at return.
- Existing subset builders remain independently callable through `test-only-legacy-edge-adjacency`; production reconciliation ownership and receipts are unchanged.
- Complete three-mode x 100 real-save equivalence crossed the reconciliation boundary and compared reports, sessions, receipt order, geometry-build order, installed sectors, the entire `GameState`, warnings/diagnostics, serialized bytes, and a deterministic candidate rerun.
- The source checkpoint itself made no timing claim. A later exclusive exact-parent packet retained the integrated candidate; its evidence is recorded below without rewriting the source-review history.

## Implementation

### Invocation-local relation

`src/sim/combat/sector_front_edge_relation.ts` builds the standard Case A/B and strict Case-B maps from the complete faction edge universe with the existing trusted algorithms. Subset queries filter those maps without changing `strictCompare` neighbor order. The context owns no `GameState`, formation, sector, receipt, global, module cache, `WeakMap`, environment switch, or cross-turn state.

`buildCorpsFrontSectors(...)` validates the explicit strategy before inspecting state, constructs relations lazily after canonical edge metadata exists, and threads the read-only relation through owned construction, split, consolidation, recovery, sealing, sibling-ownership, and final-geometry paths. Factionless or synthetic shared-OSID work remains on exact legacy semantics.

### Fail-closed compatibility

The relation wrapper detects duplicate edge IDs before `Set` conversion. Duplicate IDs, outside-universe edges, metadata mismatch, faction mismatch, adjacency-identity mismatch, or centroid-identity mismatch execute the unchanged legacy subset builder. Pair-query incompatibility returns control to the unchanged pairwise check.

Expected factionless production calls use the explicit `synthetic-factionless` receipt. The pristine real-save counter proof observes 46 such fallbacks per builder invocation while every unexpected canonical fallback reason remains zero. A second invocation doubles constructions and receipts, proving call-local ownership; the test-only legacy strategy leaves candidate counters unchanged.

## TDD and Review

The first tool attempt lacked worktree dependencies and is infrastructure evidence only. After the dependency junction was present, the behavioral RED was the missing `sector_front_edge_relation` module. A second RED proved an unknown strategy did not fail before state inspection. Both became GREEN after the relation and explicit strategy boundary were implemented.

Independent review then blocked two evidence defects:

1. The first 300-case property stopped at the builder boundary. It was replaced with a reconciliation-boundary oracle using the existing `vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors')` seam to force the independent legacy strategy without touching production reconciliation.
2. Synthetic production helpers executed legacy behavior directly but did not increment candidate fallback receipts. Those exact midpoint, decomposition, recursive oversized-split, and factionless temp-metadata paths now enter the exact wrapper fallback; functional coverage proves output equality and receipt visibility.

The repaired long property passed with the following exact command:

```powershell
npm.cmd exec -- vitest run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts -t "invocation-local front-edge relations preserve reconciliation reports, sessions, receipts, geometry order, sectors, full state, warnings, bytes, and rerun hashes across production modes and 100 real-save variants" --pool=forks --reporter=dot
```

Result: 1 passed / 10 skipped; property `635172 ms`; total `637.46 s`. The reviewer retained that full-boundary evidence after reviewing the focused receipt-observability hardening and returned final PASS with no findings. Per parent direction, the 300-case property was not rerun a second time for this source checkpoint.

## Fast Verification

- Final relation/reconciliation/dependent matrix: 6 files / 76 tests passed.
- Pristine real-save reconciliation oracle plus construction/fallback ownership: 2 passed / 9 skipped.
- TypeScript: `npm.cmd run typecheck` passed.
- Determinism static scan: 1 file / 1 test passed; the plan's older `determinism:static` package script is absent at this parent.
- `git diff --check` and report-index link checks passed.

The exact final commands were:

```powershell
node_modules\.bin\vitest.cmd run tests/sector_front_edge_relation.test.ts tests/sector_partition_instrumentation.test.ts tests/final_sector_reconciliation_session.test.ts tests/final_sector_truth_reconciliation.test.ts tests/real_save_sector_truth_contracts.test.ts tests/sector_territory_contiguity_repair.test.ts --pool=forks --reporter=dot
node_modules\.bin\vitest.cmd run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts -t "relation matches the independent legacy strategy on the pristine real-save fixture|constructs at most one standard/strict relation" --pool=forks --reporter=dot
npm.cmd run typecheck
node_modules\.bin\vitest.cmd run tests/determinism_static_scan_r1_5.test.ts --pool=forks --reporter=dot
git diff --check
```

No approved baseline, scenario, profile, performance, Electron, package, or release command belongs to this checkpoint.

## Files Changed

| Area | Files | Change |
|---|---|---|
| Relation | `src/sim/combat/sector_front_edge_relation.ts` | New invocation-local standard/strict relation, exact fallbacks, and explicit counters. |
| Builder integration | `src/sim/combat/corps_front_sectors.ts` | Lazy per-faction ownership, strategy seam, and all owned live call chains. |
| Sector helpers | `src/sim/combat/sector_building.ts`, `sector_splitting.ts`, `sector_territory.ts` | Stable subset queries and observable exact synthetic fallbacks. |
| Tests | `tests/sector_front_edge_relation.test.ts`, `sector_partition_buildCorpsFrontSectors_integration.test.ts`, `sector_partition_instrumentation.test.ts`, `final_sector_reconciliation_session.test.ts` | Function, ownership, full reconciliation, receipt, byte, and static contracts. |
| Documentation | Phase 2c/2d plan, this report, reports indices, and `PROJECT_LEDGER.md` | Source-checkpoint truth and pending measurement boundary. |

## Determinism and Canon Propagation

Neighbor ordering remains `strictCompare`-sorted, the relation is invocation-owned, and no new random, clock, locale, filesystem-order, persisted, or cross-turn input exists. The independent oracle proves state and serialized-byte equivalence across all production modes.

The propagation scan found no rule, threshold, save schema, receipt ownership, historical content, scenario data, player-visible behavior, or canon contract change. `docs/10_canon/FORAWWV.md` and the canon set therefore remain untouched. `MASTER_ROADMAP.md` and `COMMAND_BOARD.md` are intentionally left for root after integration to avoid concurrent R7 documentation collisions.

## Post-Integration Measurement Disposition

The exclusive runtime packet completed after integration. Candidate `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141` has exact parent `5987daea518501745bc94be3939589ea5e767c23`; candidate/control trees are `c92a6a05956bf42a24afd762f5c6815ad65c7d1f` / `bf71a0240b010a080824958277e9ce933c3c402e`. The authoritative manifest is `data/derived/_debug/r5_phase2d_task8a_integrated/measurement_manifest.json`, SHA-256 `50b78332ebae96f4dd767da61c89e398c1bead91a246e1a945d657b36cea138d`, and records `PASS_RETAIN`.

All 14 inspected saves are exactly `5,085,892` bytes with SHA-256 `9d2a59dc1097ff3b69d3cec2d19962af32b7199de9f0b311d1dea4c562a596b4`. Unexpected canonical fallbacks remain zero. Combined adjacency inclusive time falls `81.610253%`; `buildCorpsFrontSectors` inclusive time falls `7.075305%`. Two of three alternating pairs improve; median pair improvement is `2.599063%`, maximum regression is `1.766058%`, and mean moves from `1,106.024517` to `1,086.310925 ms/turn` (`1.782383%`). Every predeclared retention gate passes.

Memory remains a watch rather than a benefit: phase-boundary sampled peak heap moves `215.045822 -> 291.751656 MB`, and the fresh retained-source profile samples `281.241852 MB`. That fresh profile still ranks `buildCorpsFrontSectors` first at `295.866225 ms/turn` and `26.224914%` of sampled application time. The next authorized work is the separate [Phase 2e pure full-solve/serial-commit extraction plan](../../plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md). Task 6 remains closed until that enabling extraction is accepted and a new profile passes its exact authorization gate.

## Final Disposition: Reverted (2026-08-03)

**The `PASS_RETAIN` disposition above is superseded.** All exact-output equivalence evidence in this document — the 100-real-save property, the 14-inspected-save byte comparison, and every retention-gate number — was measured exclusively against `apr1992_definitive_40w.json` (the 40-week scenario). No approved 188-week scenario run was part of the retention protocol at any stage.

During R4 Phase 5 integrated-proof work, a fresh 188-week scenario run at exactly this commit (`0fd36157b`) found the candidate is **not** output-equivalent to the legacy path at that horizon:

- `op:doboj:boljanic_2`, `op:gracanica:petrovo_2`, and `op:zvornik:zvornik` — three named historical anchors, all in the same Drina/Posavina corridor — flip RS→RBiH at exactly this commit and no other commit in a ~100-commit bisection window (R3 closure `7068a0c6c` through this branch's HEAD).
- `matched_osids` (aggregate historical fit) moves 610→638/712 at the same commit — the aggregate score improves even as the three named anchors regress, which is why an aggregate-only check would not have caught this either.
- Two anchors unrelated to this corridor (`op:brcko:brcko`, `brcko_corridor_jan1993`) that failed at every earlier bisection point flip back to passing at this same commit — a clean single-cause trade-off signature, not independent noise.
- Bisection method: five isolated git worktrees at successive commits between `7068a0c6c` and HEAD, each given a fresh `npm install` and a full `npm run sim:scenario:run:188w` against `apr1992_definitive_188w.json`, comparing named `anchor_checks` results. Full trace retained in `PROJECT_LEDGER.md` (2026-08-03 entries) and the R4 Phase 5 execution log.

This is a direct recurrence of this project's own previously-documented lesson: **"40w GO + green CI is a false-green for combat-behavior changes — validate at 188w before declaring GO"** (see `docs/life_lessons.md` / calibration memory; the same failure pattern previously broke the Zvornik sacred anchor via a different change that also passed 40w and two independent reviews).

**Disposition:** Reverted. `src/sim/combat/sector_front_edge_relation.ts` (deleted), `corps_front_sectors.ts`, `sector_building.ts`, `sector_splitting.ts`, `sector_territory.ts`, and the associated test files are restored to their pre-`0fd36157b` state. No commit after `0fd36157b` touched any of these files or imported the new module, so the revert is isolated — nothing else on this branch depends on the reverted change.

**Process lesson for the next front-edge/sector-topology candidate:** a single-invocation, sampled real-save equivalence property (however large — 100 variants, 14 inspected saves) proves the function is correct for the specific inputs it was fed. It does not prove a full multi-turn campaign is unaffected, because a rare divergent branch triggered even once early in a 188-turn campaign compounds forward through every subsequent turn's state. The retention protocol for this lane should require an actual full-length (188-week) scenario comparison — not just sampled snapshots — before a `PASS_RETAIN` disposition is recorded. Task 6 and any future Phase 2d/2e candidate touching this call graph should treat this as a mandatory gate, not an optional strengthening.
