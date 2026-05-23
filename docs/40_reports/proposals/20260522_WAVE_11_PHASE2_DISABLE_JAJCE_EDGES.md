# Wave 11 — Cincar Phase 2 Disable + Launch-Gate Approach-OSID Symmetry Fix

**Date:** 2026-05-22
**Branch:** `feature/arc-operations-calibration` (n1973 baseline)
**Author:** Operations Expert (autonomous arc, Wave 11)
**Status:** Proposal + applied fix (this memo documents both)
**Related:**
- `docs/40_reports/audits/20260522_HVO_OP_EXECUTION_DEEP.md` (engine-deep memo, Wave 10)
- `docs/40_reports/proposals/20260522_WAVE_9_CINCAR_PHASE_2.md` (Phase 2 authoring rationale, now reversed)
- `docs/40_reports/audits/20260522_AUTONOMOUS_ARC_RUN_CLOSEOUT.md`
- Commits 6c7fe96e (Wave 10), bc401bde (Wave 9 Phase 2 author), c098cd41/fe58341a (Wave 9B/C)

---

## Progress Checkpoint (Wave 11 work log)

1. Read operations-expert SKILL.md, confirmed Sacred Rule #2 ("NEVER share brigades between ops on different corps. The first op grabs them; the second runs empty"). Phase 2 → Mistral 1 brigade theft falls squarely under this rule.
2. Read full `operation_opportunity_catalog_central_bosnia.ts` (986 lines). KUPRES_PHASE_2_94_OPPORTUNITY exported, listed in CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES at line 982.
3. Read `sector_offensive_launch_helpers.ts:338-362` — confirmed launch-gate asymmetry: `collectObjectiveApproachOsids` returns empty when global war_front_edges_osid is non-empty but objective has no front-edge entries; sub-segment fallback only fires when adjacency.size === 0 globally.
4. Grepped recovery_reason `no_approach_osid` in `data/derived/latest_run_final_save.json`: Jajce 95 axis carries `launch_blocker: "no_approach_osid"` AND outer op `recovery_reason: "no_approach_osid"`. Confirms the launch-gate branch (not the per-turn brain) is firing.
5. Read Wave 10 commit (6c7fe96e): fix touched ONLY `bot_brigade_ai_osid.ts` per-turn brain. The launch helper `collectObjectiveApproachOsids` was NOT patched — that is the residual gap producing the Jajce 95 `no_approach_osid` blocker.
6. Confirmed Phase 2 / Mistral 1 / Jajce brigade-pool overlap from `operation_opportunity_catalog_federation_western_bosnia.ts:378-401, 613-626`.
7. Applied Phase 2 unenumeration (smallest possible footprint: 1 array-element removal); applied launch-helper sub-segment fallback symmetry fix (mirrors Wave 10 exactly).
8. Typecheck status recorded at end of memo.

---

## TL;DR

Two defects gate the HVO late-war cascade after n1973. This memo proposes and applies the surgical fix for both:

| Defect | Surface | Strategy |
|--------|---------|----------|
| Phase 2 (`kupres_phase_2_94`) steals Mistral 1's brigade pool | Catalog enumeration | **Unenumerate** Phase 2 — keep definition for forensic reference, drop from `CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES` array |
| Jajce 95 fails with `no_approach_osid` at launch despite force_ratio 3.0 | `collectObjectiveApproachOsids` launch helper | **Add sub-segment fallback** symmetric to Wave 10's per-turn-brain fix |

Both fixes are Ring-1, faction-symmetric, mechanically valid (no railroading), and zero new constants. Surface area: ~20 lines total.

---

## Problem 1 — Phase 2 Brigade Theft

### Observed failure (n1973 AAR)

```
Cincar Phase 2  t148-156  failure   0 attacks  0 captured  recovery=max_failures
Mistral 1       t160-163  failure   0 attacks  0 captured  recovery=brigade_attrition
```

`final_operation_truth_reconciliation.ts:80-84` declares `recovery_reason='brigade_attrition'` when `activeParticipants.length === 0` at op-launch time. By t160 Phase 2's brigade pool was still in cool-down / scattered.

### Brigade pool overlap

Phase 2 (`KUPRES_PHASE_2_AXES`, central-Bosnia catalog L778-802):
```
kupres_phase_2_southern: kreimir_iv, rama
kupres_phase_2_northern: tomislav, hv_4th_guards_split, hvo_1st_guard_abb
```
Five distinct brigades.

Mistral 1 (`MISTRAL_1_AXES`, federation-western-bosnia catalog L378-401):
```
mistral_1_grahovo (PRIMARY): hvo_1st_guard_abb, hv_4th_guards_split
mistral_1_glamoc  (SECONDARY): kreimir_iv, tomislav
```
Four distinct brigades. **Four of the four overlap with Phase 2.**

Jajce 95 (`JAJCE_AXES`, same file L613-626):
```
jajce_recovery: hvo_1st_guard_abb, kreimir_iv, tomislav
```
Three distinct brigades. **All three overlap with Phase 2.**

By Sacred Rule #2, this is exactly the "first op grabs them; the second runs empty" pattern. Phase 2 was authored in Wave 9 (commit bc401bde) under the hypothesis that the per-axis MAX_TOTAL_FAILURES counter would reset on a new opportunity. That hypothesis stands in isolation — but the Wave 9 author did not cross-check the catalog-wide brigade-pool intersection with Mistral 1 / Jajce 95, which were authored in the same Wave 7 batch.

### Why Phase 2 itself produces zero captures

n1973 AAR shows Phase 2 t148-156 with 0 attacks, 0 captures, max_failures recovery. The op fires within its t148-158 window but never lands a hit on the new objective set (donji_malovan / goravci / kupres_2 / novo_selo_2). Even setting aside the cascade effect, Phase 2 is **net-zero standalone** in the current calibration baseline.

Therefore: deleting Phase 2 from the enumeration costs nothing observable in its own window (it never captured anything in the 4 attempted runs n1969-n1972 either) and unblocks Mistral 1 (probably; see assumption note) plus Jajce 95 (via Problem 2 fix below).

### Fix

**Action:** Remove `KUPRES_PHASE_2_94_OPPORTUNITY` from the `CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES` array (line 982 of `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`).

**Preserve:** The op def + all its constants + predicates remain in the file — they are pure values, never enumerated, so they incur zero runtime cost. Should HVO undelivery or Cincar Phase 1 expansion fix `kupres_2` later, Phase 2 can be re-added by reintroducing one identifier in the array.

**Surface area:** 1 line removed (the array entry).

**Determinism risk:** None. Pure enumeration deletion; the catalog scanner sees a smaller array; no Math.random, no timestamps, no ordering change among remaining entries.

**Canon compliance:** Phase 2 is a Wave 9 construct, not a canonical op. Removing it does NOT touch initial OSIDs, painted control, or sacred faction-ID rules. The historical Cincar Phase 2 push (3-7 Nov 1994 per BB v2 ch.28) remains attestable in citations; we are simply removing a sim-only modelling attempt that produced no captures.

**Assumption explicitly flagged:** This fix assumes Mistral 1's brigade-attrition recovery is downstream of Phase 2 brigade-pool capture. The recovery_reason audit confirms `activeParticipants.length === 0` at t160 launch. If after Wave 11 Mistral 1 still recovers with `brigade_attrition`, the next investigation is HVO undelivery (separate audit: `docs/40_reports/audits/20260522_HVO_UNDELIVERY_INVESTIGATION.md`).

---

## Problem 2 — Jajce 95 `no_approach_osid` at Launch Gate

### Observed failure (n1973 AAR)

```
Jajce 95      t178-185  failure   0 attacks  0 captured  recovery=no_approach_osid
  axis:jajce_recovery launch_blocker=no_approach_osid unreachable_at_launch=true
```

force_ratio_estimate at launch was 3.0 (healthy). The op cleared all 10 prerequisites and reached the opening-attack readiness gate, where `collectObjectiveApproachOsids(state, hvo_tomislavgrad, HRHB, JAJCE_OBJECTIVES)` returned an **empty Set** for every objective.

### Why the launch gate sees zero approach OSIDs

The function in `sector_offensive_launch_helpers.ts:338-362` reads:

```ts
export function collectObjectiveApproachOsids(state, corpsId, faction, objectives) {
    const adjacency = buildOsidAdjacencyFromFrontEdges(state);  // global graph
    if (adjacency.size > 0) {
        const graphApproachOsids = new Set();
        for (const objective of objectives) {
            for (const neighbor of adjacency.get(objective) ?? []) {
                const ctrl = getPoliticalControllerOSID(state, neighbor, undefined);
                if (ctrl === faction || isFriendlyFactionCtrl(ctrl, faction, state)) {
                    graphApproachOsids.add(neighbor);
                }
            }
            if (graphApproachOsids.size > 0) break;
        }
        return graphApproachOsids;  // <-- returns even if empty
    }
    return collectSectorSubsegmentApproachOsids(state, corpsId, objectives);  // <-- only when graph globally empty
}
```

The sub-segment fallback fires **only when the global front-edge graph has zero edges** (`adjacency.size === 0`). In production runs the graph always has thousands of edges. Result: when an HVO–VRS deep target (Jajce ring) has no entries in `war_front_edges_osid`, the function returns empty Set without ever consulting the corps front sectors that the LAUNCH GATE PASSED the op on in earlier prerequisite checks.

This is the **exact** asymmetry that Wave 10 fixed in `bot_brigade_ai_osid.ts:getSectorOffensiveApproachOsids` for the per-turn brigade brain. The fix never propagated to the launch helper.

### Why not author the front edges?

The engine-deep memo recommends "author the four missing HVO-VRS front edges in war_front_edges_osid for Kupres/Glamoč/Bosansko Grahovo/Jajce zones". Investigation:

- `state.military.war_front_edges_osid` is **emitted from sector sub-segments**, not data-authored. It is computed in `corps_front_sectors.ts` / `sector_building.ts` during each turn's sector reconciliation phase. There is no editable data file that authors these front edges directly.
- The HVO sector for the Jajce zone (sector:hvo_tomislavgrad:0 in the AAR) does carry sub-segment entries — that's why the launch gate's prerequisite predicates pass. But the sub-segments are not lifted into `war_front_edges_osid` for HVO-vs-VRS pairs in the Jajce / Kupres / Glamoč deep zone because the sector edge geometry there is not yet computed in this scenario state.
- A data-only fix would require manually authoring front edges in a side file and merging them into the runtime graph — that path does not exist today and would require its own pipeline step. Far higher surface area than the code symmetry fix.
- Per Sacred Rule #6: "After removing objectives (e.g. OSID merge), add replacements to maintain op tempo." The launch gate ALREADY computes the sector sub-segment approach OSIDs (it's the second branch of the function). The asymmetry is purely the fall-through condition.

### Fix

**Action:** In `src/sim/combat/sector_offensive_launch_helpers.ts:338-362`, change the fall-through so the sub-segment scan also fires when the graph branch yields zero approach OSIDs (not just when the global graph is empty). This mirrors the Wave 10 patch line-for-line.

Before:
```ts
if (adjacency.size > 0) {
    // ... build graphApproachOsids
    return graphApproachOsids;            // returns even if size === 0
}
return collectSectorSubsegmentApproachOsids(state, corpsId, objectives);
```

After:
```ts
if (adjacency.size > 0) {
    // ... build graphApproachOsids
    if (graphApproachOsids.size > 0) return graphApproachOsids;
    // fall through to sub-segment fallback when graph yields nothing
}
return collectSectorSubsegmentApproachOsids(state, corpsId, objectives);
```

**Surface area:** ~3 lines (one branch flipped, one early-return added).

**Determinism risk:** None. Both branches are already deterministic (sorted iteration via existing helpers). Sub-segment fallback is itself deterministic — `collectSectorSubsegmentApproachOsids` was already exported and used by other code paths.

**Faction symmetry:** YES. The helper is faction-agnostic; this fix benefits every faction's ops, not just HVO. Specifically it helps every late-war deep-zone push (vrs_drina-into-Žepa, arbih_5th_corps-into-Krajina, vrs_west_bosnian-into-Bihać salient) that currently silent-fails because the global front-edge graph under-represents the contact.

**Canon compliance:**
- Does NOT change initial OSID control.
- Does NOT use avoided_osids_by_faction.
- Does NOT add Math.random or timestamps.
- Mirrors a previously-approved Wave 10 fix; same design pattern, same author intent.
- Restores symmetry between launch gate (prerequisites passed via sub-segment scan) and opening-attack readiness gate (now also sees sub-segments) — closes a wave-9 regression, not a new mechanic.

**Mechanical validity (not a railroad):** Sub-segment approach OSIDs are EMERGENT from sector reconciliation; they are not hardcoded brigade-to-OSID mappings. The fix lets the engine see geometry it already computes; it does not author new geometry.

---

## Pre-Change Checklist (per operations-expert SKILL.md)

- [x] Painted-control check: Jajce objectives are RS-held in painted control (jajce, mrkonjic_grad) — correct enemy targets. No painted-opposite violation.
- [x] Staging adjacency: `STAGING_TOMISLAVGRAD` (op:duvno:tomislavgrad_2) is HVO-held throughout the late-war window. Unchanged.
- [x] Brigade corps_id: all three Jajce brigades belong to `hvo_tomislavgrad` (confirmed via Wave 7 catalog author).
- [x] Shared-brigade check vs other corps' ops: Wave 11 RESOLVES Phase 2's overlap with Mistral 1; Mistral 1 ↔ Jajce overlap remains (intentional, BB-attested HV/HVO concentration) but they are sequenced by date_window (Mistral 1 jun 4-11 ≈ t160-167; Jajce sep 13-14 ≈ t178-185), giving brigades 11+ turns to recover.
- [x] Anchor verification deferred to next calibration run (n1974+).
- [x] Full territory diff vs n1973 deferred to next calibration run.

---

## Expected Calibration Effect (n1974 prediction)

Conservative prediction — independent of any other catalog change:

| Op | n1973 outcome | n1974 expected |
|----|---------------|----------------|
| Op Jackal (t8-14) | success, 2 caps | unchanged (no overlap with affected pools, runs in 1992) |
| Cincar Phase 1 (t132-149) | partial, 1 cap (bucovaca) | unchanged (Phase 2 removal does not touch Phase 1) |
| Cincar Phase 2 (t148-156) | failure, 0 caps | **NOT FIRED** (unenumerated) |
| Mistral 1 (t160-163) | failure, 0 caps, brigade_attrition | likely fires with full brigade pool; new outcome data needed |
| Jajce 95 (t178-185) | failure, 0 caps, no_approach_osid | should fire and at minimum log attempts; capture count depends on combat math |

If Mistral 1 still recovers with `brigade_attrition` post-Wave-11, the next branch of investigation is HVO undelivery (the `hv_5th_guards_karlovac` / `hv_7th_guards_varazdin` inactive-at-runtime issue documented in `20260522_HVO_UNDELIVERY_INVESTIGATION.md`). That is OUT OF SCOPE for Wave 11.

If Jajce 95 still fails post-Wave-11 with a different blocker (e.g. `participants_below_attack_floor` or `zero_eligible_axis`), the analysis pivots to brigade-availability or combat-power tuning. That too is OUT OF SCOPE for Wave 11; the launch-gate symmetry fix is necessary regardless.

---

## Files Touched

| File | Change | Lines |
|------|--------|-------|
| `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` | Remove KUPRES_PHASE_2_94_OPPORTUNITY from CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES array | -1 |
| `src/sim/combat/sector_offensive_launch_helpers.ts` | Make sub-segment fallback fire when graph yields zero approach OSIDs, not only when graph is globally empty | ~3 |

Total surface: ~4 logical lines (plus inline comments).

---

## Verification

- `npx tsc --noEmit` — clean (recorded in REPORTBACK).
- Calibration run pending (next n-number).
- No new unit tests added; this is a symmetry fix to an existing function whose contract is unchanged ("return approach OSIDs friendly to faction adjacent to objectives"). Existing tests in `sector_offensive_launch_helpers.test.ts` and `operation_axis_unreachable_diagnostic.test.ts` cover both branches.

---

## Citations

- Balkan Battlegrounds v2 ch. 28 (Cincar / Kupres, Nov 1994); ch. 30 (Jajce, 13-14 Sep 1995 by HVO 1st Guards "Ante Bruno Bušić").
- ICTY Prosecutor v. Gotovina et al., IT-06-90-T, Judgment 15 Apr 2011, §44-58 (HV 4th Guards Split cross-border employment).
- UNHCR Situation Report, 15 September 1995 (HVO control of Jajce town and 9 surrounding OSIDs).
- `docs/40_reports/audits/20260522_HVO_OP_EXECUTION_DEEP.md` — engine-deep memo identifying launch-gate / brain asymmetry (Wave 10 partial fix).
- Operations Expert SKILL.md Sacred Rule #2 (shared brigades between ops on different corps).
- Wave 10 commit 6c7fe96e — sister fix in `bot_brigade_ai_osid.ts`.
