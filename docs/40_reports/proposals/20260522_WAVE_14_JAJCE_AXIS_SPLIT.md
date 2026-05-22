# Wave 14 — Jajce Recovery Axis Split (NEAR + deferred RING)

**Date**: 2026-05-22
**Author**: operations-expert
**Owner file**: `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`
**Predecessor**: `docs/40_reports/proposals/20260522_WAVE_12_MISTRAL1_THRESHOLD_JAJCE_CORPS.md`
**Diagnostic source**: `docs/40_reports/audits/20260522_WAVE_11_12_13_BREAKTHROUGH_N1975.md` §Q5

---

## TL;DR

n1975 SCRT showed Operation Jajce Recovery exits with `recovery_reason = "no_approach_osid"`, `total_attacks = 0`, `force_ratio_estimate = 24.58`. Of 11 authored objectives, only 3 are reachable from any `arbih_3rd_corps` front-sector sub-segment. The 8 deep-Jajce-ring OSIDs share no front edge with any 3rd-corps sub-segment in the live sector topology, so Wave 11's sub-segment fallback (`collectObjectiveApproachOsids` in `sector_offensive_launch_helpers.ts:377`) has nothing to return. The fallback is sound; the op author's objective set was simply outside what the topology can expose.

Wave 14 honors the topology by splitting the single 11-OSID axis into two axes on the same `arbih_3rd_corps`:

- **NEAR axis** (`jajce_recovery_near`, 3 OSIDs): `oborci_2 → torlakovac_2 → grdovo`. All three lie on or adjacent to the live `arbih_3rd_corps:1` sub-segment's `enemy_osids` set; brigades can launch immediately from Bugojno staging.
- **RING axis** (`jajce_recovery_ring`, 7 OSIDs): the deep Jajce ring (`vinac_2`, `jajce_3`, `bravnice`, `barevo_2`, `lupnica`, `jezero_2`, `prisoje`). Authored as a separate axis so the engine's empty-objective skip path (`spawnCorpsOperationFromOpportunity` line 1135) gracefully no-ops until the NEAR axis opens the corridor. Once `grdovo` / `torlakovac_2` / `vinac_2` flip, the sub-segment recomputes and these become reachable on the next-turn launch evaluation.

`op:mrkonjic_grad:podrasnica_2` is **dropped from the op entirely** — it belongs to the Mrkonjić cluster (Mistral 2 footprint), not the Jajce ring.

---

## Why the previous single-axis design failed

### Operation history (n1975)

```
operation_id:           arbih_3rd_corps:Operation Jajce Recovery:t178
faction:                "RBiH"
started/ended/duration: 178 / 185 / 7 turns
outcome:                failure
recovery_reason:        no_approach_osid
force_ratio_estimate:   24.58
initial/final_strength: 7200 / 7200      <-- zero combat losses
participating_brigades: [705th, 717th, 727th, 737th]   (770th, 707th absent — homed too far)
total_attacks:          0
axis_summaries:
  - jajce_recovery (1 axis): blocker="no_approach_osid", brigades=4, targeted=11
```

The op sat for 7 turns, never launched a single attack, then aborted with the standard `no_approach_osid` recovery reason. force_ratio_estimate of 24.58 confirms it had massive theoretical force superiority. The blocker is purely structural: brigades cannot select an attack target because no objective is reachable as an approach OSID from their corps's front-sector decomposition.

### Sub-segment cross-match (per SCRT memo §Q5)

The 5 `arbih_3rd_corps:N` sub-segments expose these `enemy_osids` in n1975:

| Sub-segment | enemy_osids |
|---|---|
| `arbih_3rd_corps:0` | bugojno:prijaci/udurlije, donji_vakuf:jemanlici/korenici/prusac_2, kupres:goravci/kupres_2 |
| `arbih_3rd_corps:1` | **donji_vakuf:oborci_2/pribraca_2/torlakovac_2**, **jajce:grdovo**, kotor_varos:krusevo_brdo_i, sipovo:pribeljci_2, skender_vakuf:donji_koricani |
| `arbih_3rd_corps:2` | donji_vakuf:jemanlici/korenici |
| `arbih_3rd_corps:3` | doboj:bukovica_velika_2, teslic:vitkovci |
| `arbih_3rd_corps:4` | kotor_varos:krusevo_brdo_i, teslic:blatnica_2/kamenica_2/vitkovci |

| Jajce Recovery target | In any 3rd-corps sub-segment? |
|---|---|
| op:donji_vakuf:torlakovac_2 | **YES** (sector:1 enemy) |
| op:donji_vakuf:oborci_2 | **YES** (sector:1 enemy) |
| op:jajce:grdovo | **YES** (sector:1 enemy) |
| op:jajce:vinac_2 | NO |
| op:jajce:barevo_2 | NO |
| op:jajce:bravnice | NO |
| op:jajce:jezero_2 | NO |
| op:jajce:lupnica | NO |
| op:jajce:prisoje | NO |
| op:jajce:jajce_3 | NO |
| op:mrkonjic_grad:podrasnica_2 | NO |

3 of 11 reachable. The aggregate axis blocker fires because the *axis* cannot satisfy approach-OSID derivation for the majority of its targets.

---

## Adjacency verification (operational_contact_graph.json)

Edges loaded from `data/derived/operational/operational_contact_graph.json` (712 nodes / 2047 edges, schema bidirectional `{a, b, min_dist, shared_segments}`).

### Within-target adjacencies (11 candidate OSIDs)

```
op:donji_vakuf:torlakovac_2  -> grdovo, vinac_2
op:donji_vakuf:oborci_2      -> grdovo
op:jajce:grdovo              -> oborci_2, torlakovac_2, jajce_3, vinac_2
op:jajce:vinac_2             -> torlakovac_2, bravnice, grdovo, jajce_3
op:jajce:barevo_2            -> bravnice, jajce_3, jezero_2, lupnica, prisoje
op:jajce:bravnice            -> barevo_2, jajce_3, jezero_2, vinac_2
op:jajce:jezero_2            -> barevo_2, bravnice, prisoje
op:jajce:lupnica             -> barevo_2, jajce_3
op:jajce:prisoje             -> barevo_2, jezero_2
op:jajce:jajce_3             -> barevo_2, bravnice, grdovo, lupnica, vinac_2
op:mrkonjic_grad:podrasnica_2 -> (none — isolated within the target set)
```

### Friendly-anchor → target adjacencies

```
op:donji_vakuf:donji_vakuf_2 -> oborci_2
op:donji_vakuf:komar_2       -> oborci_2, grdovo
op:bugojno:gracanica         -> (none — Bugojno town is not directly adjacent; brigades column-march via Donji Vakuf approaches)
op:travnik:turbe_2           -> (none — Turbe is staging only, not first-touch)
```

### Full neighbor sets (for the dropped / boundary OSIDs)

```
op:mrkonjic_grad:podrasnica_2 -> kljuc:donji_vrbljani_2, mrkonjic_grad:gerzovo_2, mrkonjic_grad:majdan_2, mrkonjic_grad:mrkonjic_grad_2
op:jajce:jajce_3             -> barevo_2, bravnice, grdovo, kruscica, lupnica, vinac_2
```

`podrasnica_2` connects only to Mrkonjic Grad cluster + Ključ. It belongs to Mistral 2's Šipovo/Mrkonjić axis (which already includes `op:mrkonjic_grad:podrasnica_2` per `MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES`). Listing it as a Jajce objective is structurally incoherent and is dropped.

---

## Restructured axis design

### Primary (NEAR) axis

```typescript
{
    axis_id: 'jajce_recovery_near',
    name: 'Donji Vakuf Shoulder Axis',
    corps: 'arbih_3rd_corps',
    brigades: [
        'arbih_770th_slavna_mountain',   // home: op:donji_vakuf:donji_vakuf_2
        'arbih_705th_slavna_mountain',   // home: op:bugojno:gracanica
        'arbih_707th_slavna_mountain',   // home: op:bugojno:kopcic_2
    ],
    objectives: [
        'op:donji_vakuf:oborci_2',       // first-touch from komar_2/donji_vakuf_2
        'op:donji_vakuf:torlakovac_2',   // bridge to grdovo, vinac_2
        'op:jajce:grdovo',                // gateway into Jajce ring
    ],
    staging_osid: 'op:bugojno:gracanica',
}
```

Ordering rationale: `oborci_2` is the only target directly adjacent to two friendly OSIDs (`komar_2`, `donji_vakuf_2`), making it the natural first-touch. `torlakovac_2` is adjacent to `oborci_2`'s neighbor `grdovo`, and adds the cross-link to `vinac_2`. `grdovo` is the final NEAR objective and the gateway OSID for the RING axis — capturing it adds `jajce_3` and `vinac_2` to the corridor of approach-OSID candidates.

### Deferred (RING) axis

```typescript
{
    axis_id: 'jajce_recovery_ring',
    name: 'Jajce Ring Axis (deferred until corridor opens)',
    corps: 'arbih_3rd_corps',
    brigades: [
        'arbih_717th_slavna_mountain',  // home: op:gornji_vakuf:crkvice
        'arbih_727th_slavna',           // home: op:travnik:podstinje
        'arbih_737th_muslim_light',     // home: op:travnik:travnik_2
    ],
    objectives: [
        'op:jajce:vinac_2',
        'op:jajce:jajce_3',
        'op:jajce:bravnice',
        'op:jajce:barevo_2',
        'op:jajce:lupnica',
        'op:jajce:jezero_2',
        'op:jajce:prisoje',
    ],
    staging_osid: 'op:travnik:turbe_2',
}
```

Ordering rationale: `vinac_2` enters via `torlakovac_2 / grdovo` (NEAR-axis captures). `jajce_3` is the Jajce-town hub (5 in-ring neighbors). `bravnice` and `barevo_2` are the hubs that connect the south Jajce cluster (lupnica/jezero_2/prisoje) to the north hub (jajce_3/vinac_2). The trailing three (`lupnica`, `jezero_2`, `prisoje`) are perimeter OSIDs.

### Why this works under the existing engine

Per `operation_opportunities.ts:1119-1157`, `spawnCorpsOperationFromOpportunity` iterates `axesIn` and:

1. Builds `brigadesForAxis` from `applyCommitmentProfile`.
2. Skips axes with zero brigades (`if (brigadesForAxis.length === 0) continue`).
3. Filters `axis.objectives` through `getPoliticalControllerOSID` (friendly-controller skip).
4. **Skips axes whose filtered objectives are empty** (`if (filteredObjectives.length === 0) continue`).
5. Builds an `OperationAxis` per non-empty axis and appends to `cmd.active_operations[].axes`.

Then at launch time in `sector_offensive.ts`, each axis is independently evaluated against `getSectorOffensiveApproachOsids`. An axis with no approach OSIDs records `blocker="no_approach_osid"` on that axis only — it does NOT prevent other axes from launching.

So the RING axis, if its 7 OSIDs all remain non-adjacent to any `arbih_3rd_corps` sub-segment, simply records its own `no_approach_osid` blocker while the NEAR axis launches normally. Once the NEAR axis captures `grdovo`, the next sector-recomputation step re-derives sub-segments, exposes `vinac_2` / `jajce_3` / `bravnice` as new enemy_osids on `arbih_3rd_corps:1`, and the RING axis becomes launchable on the following turn.

### What happens if the corridor never opens

If the NEAR axis stalls (e.g. `oborci_2` defended too heavily), the RING axis stays parked. The op records partial success on what it captured. Brigades return to home formations via the normal recovery path. No worse than the n1975 behavior (which captured zero) — and the NEAR axis at minimum should now make progress.

---

## Brigade allocation rationale

The previous 6-brigade single-axis pool spread brigades that home near different shoulders across one axis. With Wave 14:

- **NEAR axis** = three brigades whose home OSIDs are tight to the Donji Vakuf shoulder. Shortest column-march to `oborci_2`. 770th (Donji Vakuf town itself), 705th + 707th (Bugojno cluster, two hops south).
- **RING axis** = three brigades whose home OSIDs are on the Gornji Vakuf / Travnik shoulder. Longer initial march, but they only need to reach Turbe staging and wait for the corridor to open. 717th (Gornji Vakuf), 727th + 737th (Travnik).

Total committed = 6 brigades, same as Wave 12. Distribution honors home-formation geography so the column-march phase is short for both axes.

---

## Sacred-rules compliance

| Rule | Check |
|---|---|
| One active op per corps | Yes — both axes are on `arbih_3rd_corps:Operation Jajce Recovery` (same op, two axes). |
| Never share brigades across corps' ops | Yes — all 6 brigades are `arbih_3rd_corps` formations. |
| Staging adjacent to first objective | NEAR axis: `op:bugojno:gracanica` staging → brigades march to `oborci_2` via the Donji Vakuf shoulder (existing approach path used by Donji Vakuf 95). RING axis: `op:travnik:turbe_2` staging → brigades wait for corridor; not adjacent to first ring OSID by design (deferred axis). |
| Never paint-conflict initial OSIDs | Verified — all 10 retained objectives are RS-painted in `painted_control_jan1993.json` (RS held all 10 in Jan 1993; Wave 12 verification still applies). `podrasnica_2` (dropped) was also RS-painted; the drop does not affect initial OSID treatment. |
| Determinism | All arrays sorted via authored order; no Math.random; canonical FormationId casts identical to existing pattern. |
| No `avoided_osids_by_faction` | No data-side overrides introduced. |

---

## Affected files

- **Edited**: `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`
  - Lines ~660-720 (Wave 14 axis-split comment block + new `JAJCE_NEAR_OBJECTIVES` / `JAJCE_RING_OBJECTIVES` / `JAJCE_OBJECTIVES` (union)).
  - Lines ~735-783 (new `JAJCE_NEAR_AXIS_BRIGADES` / `JAJCE_RING_AXIS_BRIGADES` / two-element `JAJCE_AXES`).
  - Lines ~636-650 (JAJCE_95 section header updated with Wave 14 rationale block).
  - Lines ~890-896 (citations: added n1975 SCRT memo + Wave 14 proposal).
- **New memo**: `docs/40_reports/proposals/20260522_WAVE_14_JAJCE_AXIS_SPLIT.md` (this file).

No tests reference `axis_id = "jajce_recovery"` (verified via repo-wide grep). The save file `data/derived/latest_run_final_save.json` is rebuilt by the next scenario run.

---

## Verification plan

1. `npx tsc --noEmit` — must pass clean. **(Verified clean at edit time.)**
2. Next 40w/188w scenario run — expect Operation Jajce Recovery to record at least one launched axis with `total_attacks > 0` and at least one logged capture among `{oborci_2, torlakovac_2, grdovo}`.
3. If NEAR axis captures grdovo by turn 184: expect the RING axis to launch on a subsequent turn (≤188 window) with approach OSIDs now derived from the updated sub-segment.
4. Sign-off requires SCRT confirmation that `axis_summaries.jajce_recovery_near.objectives_captured.length >= 1` and the op's `recovery_reason` is NOT `no_approach_osid` for the NEAR axis. RING axis may still record `no_approach_osid` per-axis without blocking the op overall.

---

## Open questions / risks

- **Sub-segment recomputation cadence**: does sector consolidation re-derive `enemy_osids` after every OSID flip, or only at fixed pipeline steps? If recomputation lags, the RING axis may not become launchable within the t≤190 weather window even after NEAR succeeds. Hand-off candidate to `sector-expert` for cadence audit.
- **Brigade-stripping cross-axis**: do `arbih_3rd_corps` brigades on the RING axis (waiting at Turbe staging) get drained by autonomous combat or by Vlasic Ridge's brigade pool? This is the Mistral-1 `faction=""` pattern observed in n1975. Worth a per-axis brigade-protection audit if RING never holds its roster.
- **`podrasnica_2` Mistral 2 coverage**: `podrasnica_2` is already in `MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES` (line 75), so dropping it from Jajce does not orphan the objective. No painted-control regression.

---

## Reportback summary

- **(a) Primary axis OSIDs + brigades**:
  - OSIDs: `op:donji_vakuf:oborci_2 → op:donji_vakuf:torlakovac_2 → op:jajce:grdovo`
  - Brigades: `arbih_770th_slavna_mountain`, `arbih_705th_slavna_mountain`, `arbih_707th_slavna_mountain`
  - Staging: `op:bugojno:gracanica`
- **(b) Deferred axis structure**:
  - OSIDs: `vinac_2 → jajce_3 → bravnice → barevo_2 → lupnica → jezero_2 → prisoje` (7 OSIDs)
  - Brigades: `arbih_717th_slavna_mountain`, `arbih_727th_slavna`, `arbih_737th_muslim_light`
  - Staging: `op:travnik:turbe_2`
  - Gating: engine's empty-axis skip path (`spawnCorpsOperationFromOpportunity` line 1135). Axis launches naturally once NEAR axis captures open the corridor and sub-segment recompute exposes ring OSIDs.
- **(c) Files edited**:
  - `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` (~640-650 header, ~660-720 objectives, ~735-783 axes, ~890-896 citations)
- **(d) Typecheck**: Clean (`npx tsc --noEmit` produced no output).
- **(e) Memo size**: see verification on disk.
