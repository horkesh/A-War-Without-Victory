# LANE-2026-05-02-B3-ANOMALY-SECTOR-SUBTYPE — Type A/B Classification of Sector Coverage Gaps

**Date:** 2026-05-02
**Status:** RESOLVED. Pure read-side enrichment of existing anomaly checks. No engine state mutation, no scenario data, no combat math touched.
**Predecessor:** Mission B Tier 1 panel on n1621. /sector-expert finding: 3 empty sectors + 3 undefended front subsegments emit a single warning each, conflating distinct root causes (pool-exhausted vs misallocated).
**Verification commit:** *(this commit)*

## Lane summary

`detectEmptyContestedSector` and `detectUndefendedFrontSubsegments` (anomaly checks #8 and #19 in `src/scenario/anomaly_detector.ts`) previously emitted ONE warning per detector regardless of root cause. /sector-expert Tier 1 finding on n1621: the same warning shape masks distinct routings:

- **Type A — pool_exhausted:** the owning corps has 0 unassigned active brigades. The gap exists because the corps is genuinely thin. Routes to `/operations-expert` + `/formation-expert` (replacement pool, reconstitution policy).
- **Type B — misallocated:** the owning corps has 1+ unassigned active brigades sitting elsewhere. The gap could be filled by reassignment. Routes to `/corps-army-commander` (rebalance).
- **Type C — structural orphan:** sub-segment exists with edges but no owning sector covers them. Out of scope here; reserved for future iteration.

This lane adds an optional `subtype` field on `AnomalyReport` and emits one report per subtype when both occur, so consumers can filter on `subtype` and route to the correct specialist.

## Phase 0 — Tier 1 panel finding

`/sector-expert` n1621 evidence:
- vrs_drina:3 empty (15 edges) — vrs_drina has 4 destroyed brigades and only 5 active for 9 sectors. **pool_exhausted.**
- hvo_central_bosnia:4 empty (7 edges) — HVO CB has 5 brigades stacked in sector 0 (Kiseljak/Vitez), surplus. **misallocated.**
- arbih_4th_corps:1 empty (6 edges) — 4th Corps has 9 brigades in sector 0 (Mostar concentration), surplus. **misallocated.**

The single-warning shape concealed the per-sector routing.

## Phase 1 — red-first tests

`tests/anomaly_detector_sector_subtype.test.ts` (4 tests):

| Test | Purpose | Pre-fix | Post-fix |
|---|---|---|---|
| T1 pool_exhausted detection | corps with all brigades assigned and sector empty → subtype=pool_exhausted | RED | GREEN |
| T2 misallocated detection | corps with 2+ unassigned brigades and sector empty → subtype=misallocated | RED | GREEN |
| T3 undefended_front_subsegments respect subtype | sub-segment gap=true with corps having no surplus → subtype=pool_exhausted | RED | GREEN |
| T4 both subtypes coexist | when 2 corps differ, two distinct reports of the same type are emitted | RED | GREEN |

Pre-implementation: 4/4 RED. Post-implementation: 4/4 GREEN in 78ms.

## Phase 2 — implementation

### `src/scenario/anomaly_types.ts`
Added optional `subtype?: string;` field to `AnomalyReport` with JSDoc explaining its purpose (sub-classification within a `type` for routing distinct root causes).

### `src/scenario/anomaly_detector.ts`

Added pure read-only classifier:

```ts
function classifyCorpsBrigadeAvailability(state, corpsId): 'pool_exhausted' | 'misallocated' {
    // Count active brigade-kind formations belonging to corps.
    // Subtract those already attached to any of the corps's sectors.
    // If surplus >= 1 → 'misallocated'; else → 'pool_exhausted'.
}
```

Modified both detect functions to:
1. Group flagged sectors / sub-segments by owning corps.
2. Classify each corps via `classifyCorpsBrigadeAvailability`.
3. Emit one `AnomalyReport` per subtype found, each carrying the matching entity list.

When only one subtype occurs, only one report is emitted. When both occur, two distinct reports are emitted.

Determinism: `sortedKeys` + `strictCompare` throughout. No `Math.random` / `Date.now` / `new Date` / locale sort. No GameState mutation.

## Phase 3 — verification

- **Lane tests:** `tests/anomaly_detector_sector_subtype.test.ts` 4/4 PASS in 78ms.
- **Anomaly regression:** 19/19 PASS across 5 suites (`anomaly_detector_sector_subtype` + `anomaly_detector_deployment_truth` + `anomaly_morale_collapse_truth` + `integration_anomaly` + `territorial_anomaly_sector_coverage_truth`).
- **Typecheck:** `npx tsc --noEmit -p tsconfig.json` clean.
- **No scenario re-run required:** anomaly detection runs at scenario-summary time and is read-only over GameState. A fresh 188w would emit subtype-tagged reports; the test fixture already proves the classifier produces correct subtypes for both cases.

## Stop-gate compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO `combat_math.ts` outcome-formula changes | ✓ |
| 2 | NO engine state mutation | ✓ — pure read-only over GameState |
| 3 | NO scenario data / OOB / painted target reads | ✓ |
| 4 | NO calibration tuning | ✓ |
| 5 | NO sensitive-history surface | ✓ — Ring 1 read-side enrichment |
| 6 | NO Codex UI files | ✓ |
| 7 | NO `Math.random` / `Date.now` / `new Date` | ✓ |
| 8 | NO faction-specific hardcode | ✓ — classifier accepts arbitrary corpsId |
| 9 | NO `--no-verify` | ✓ |

## Sensitive-history compliance

Ring 1 read-side enrichment. No engine behavior change. No § 6 sign-off required (read-side anomaly classification is parity with existing diagnostic enrichment patterns).

## Hash drift class

**No hash drift.** GameState unchanged; only post-run anomaly report shape.

## Files changed

- PATCH: `src/scenario/anomaly_types.ts` (+10/-1 — `subtype?: string;` field with JSDoc)
- PATCH: `src/scenario/anomaly_detector.ts` (+~80/-20 — `classifyCorpsBrigadeAvailability` helper + per-subtype report emission in 2 detect functions)
- NEW: `tests/anomaly_detector_sector_subtype.test.ts` (4/4 GREEN, ~210 LOC)
- NEW: `docs/40_reports/implemented/20260502_ANOMALY_SECTOR_SUBTYPE.md` (this report)
- PATCH: `docs/PROJECT_LEDGER.md` (entry appended at top)
- PATCH: `.claude/napkin.md` (Current State prepended)

## Cross-lane attribution

- /sector-expert (Tier 1 finding + classifier proposal)
- /orchestrator (synthesis + implementation + tests)

## Successor handoffs

- **Type C structural orphan detection** — sub-segment exists but no sector covers (brcko_2-class problem from n1279). Future lane; out of scope here.
- **Cost Ledger / Records consumption** — UI surfaces showing sector gaps could now filter by subtype to highlight what the player's corps allocation is doing wrong. Owner: /ui-ux-developer if real player-loop gap.
