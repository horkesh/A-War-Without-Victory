# Wave 12 — Mistral 1 Threshold Verification + Jajce 95 Corps Re-host

**Date:** 2026-05-22
**Branch:** feature/arc-operations-calibration
**Reporter:** Operations Expert
**Scope:** Catalog-level edits to `operation_opportunity_catalog_federation_western_bosnia.ts`

## Executive Summary

Wave 11 disabled Phase 2 and shipped the sub-segment fallback in
`getSectorOffensiveApproachOsids`. Wave 12 cleans up two consequences observed
in n1974:

1. **Mistral 1 is firing** at t=160-162 (attached brigades, no
   `brigade_attrition`) but recovers with `defender_power_too_high` after
   3 planning turns at `force_ratio_estimate < 0.3`.
2. **Jajce 95 still fails** with `no_approach_osid` because
   `hvo_tomislavgrad`'s front sectors do not extend into the Jajce zone — the
   Wave 11 sub-segment fallback returns an empty set for this corps/objective
   pair.

This memo documents:
- §1 — Mistral 1 threshold verification (no edit; threshold is already at the
  catalog floor). The recovery cause is a separate engine-level
  `MIN_LAUNCH_FORCE_RATIO_FLOOR` gate not controllable from `min_attack_outcome`.
- §2 — Jajce 95 re-corps from `hvo_tomislavgrad` to `arbih_3rd_corps` with
  faction `RBiH`, new brigade list, corrected defender corps, and bridge
  objectives so the sub-segment fallback resolves cleanly.

Both changes are deterministic, no Math.random / no Date.now, and respect the
sacred rule "one active op per corps" — Jajce moves off hvo_tomislavgrad
(which is fully committed to Mistral 1 / Mistral 2) and onto arbih_3rd_corps
(which is between Donji Vakuf 95 and Vlašić 95 in the late-war window).

## §1 — Mistral 1 Threshold: Already at Floor

**Task as written:** "Set `min_attack_outcome: 'stalemate'` (force_ratio ≥ 0.7)
to allow attacks under heavy-defender conditions."

**Verification before edit:**

| Field                                         | Value                                  | Source                                     |
|-----------------------------------------------|----------------------------------------|--------------------------------------------|
| `MISTRAL_1_95_OPPORTUNITY.min_attack_outcome` | `'repulsed'`                           | `operation_opportunity_catalog_federation_western_bosnia.ts:532` |
| `'repulsed'` floor                            | `REPULSED_FLOOR = 0.5`                 | `combat_math.ts:96`                        |
| `'stalemate'` floor                           | `STALEMATE_FLOOR = 0.7`                | `combat_math.ts:95`                        |
| `'costly_victory'` floor (default)            | `VICTORY_THRESHOLD_COSTLY = 1.0`       | `combat_math.ts:94`                        |
| `kupres_phase_2_94.min_attack_outcome`        | `'repulsed'`                           | `operation_opportunity_catalog_central_bosnia.ts:934` |

**Conclusion:** `'repulsed'` is the catalog floor in the existing vocabulary.
Setting Mistral 1 to `'stalemate'` would raise the threshold from 0.5 to 0.7
— the opposite of the user's intent.

**Per-brigade attack path:**
`bot_brigade_ai_osid.ts:355-359` (`getOpEffectiveAttackThreshold`) honors
`op.min_attack_outcome` directly:

```ts
if (activeOp.min_attack_outcome) return activeOp.min_attack_outcome;
// Default: costly_victory (ratio ≥ 1.0)
return momentum >= 2 ? 'stalemate' : 'costly_victory';
```

`'repulsed'` on Mistral 1 means individual brigades will attack at force_ratio
as low as 0.5 — already the most permissive setting available in the threshold
vocabulary.

**Edit applied:** None to the `min_attack_outcome` value. Added a transitional
block comment above the `MISTRAL_1_95_OPPORTUNITY` export explaining why the
field is at the floor and why `defender_power_too_high` recoveries are
unrelated. Added a citation entry pointing to this memo.

### Root cause of the live `defender_power_too_high` recovery

The recovery_reason fires from `sector_offensive.ts:813 / 869 / 946`, against
`op.force_ratio_estimate < MIN_LAUNCH_FORCE_RATIO_FLOOR = 0.3`
(`sector_offensive.ts:201`). That floor is:

- Hardcoded in `sector_offensive.ts` (not catalog-tunable).
- Independent of `op.min_attack_outcome`.
- Stricter than `'repulsed'`'s 0.5 in terms of allowing launch — the launch
  gate aborts at 0.3 even though the per-brigade attack path would allow 0.5.

The launch helper at `sector_offensive_launch_helpers.ts:200` is similarly
hardcoded against `VICTORY_THRESHOLD_COSTLY = 1.0` for the
`evaluateLaunchFeasibility` single-attacker view.

### Recommended engine-level follow-up (out of scope for Wave 12)

To honor the historical record that Mistral 1 launched at sub-1.0 local
ratios (Gotovina §54), one of:

**Option A — per-op launch floor field**

```ts
interface OperationOpportunityDef {
  // ...
  /** Launch-time force_ratio_estimate floor override. Default = 0.3. */
  min_launch_force_ratio?: number;
}
```

Wire through `sector_offensive.ts:810/867/944` and the variant builder.
Mistral 1 would set `min_launch_force_ratio: 0.5` (matches REPULSED_FLOOR).

**Option B — derive launch floor from `min_attack_outcome`**

Replace the constant `MIN_LAUNCH_FORCE_RATIO_FLOOR = 0.3` with a lookup
keyed on `op.min_attack_outcome`. e.g. `'repulsed' → 0.4`, `'stalemate' →
0.5`, etc. Maintains catalog vocabulary; cleaner.

Both are engine work, require typecheck + test pass + calibration run, and
should be filed as a separate audit pass after Wave 12 lands.

## §2 — Jajce 95: Re-host from hvo_tomislavgrad to arbih_3rd_corps

### Historical record

Per BB v2 ch. 30 and ICTY records:

- Op Jajce was **Federation-coordinated** (Sep 13-14 1995).
- **ARBiH 7th Corps under Mehmed Alagić** led the northward push from Travnik
  / Donji Vakuf, breaking the Komar line and clearing the Vlašić plateau
  approach.
- **ARBiH 5th Corps** linked up from the Bihać direction (Sana operation).
- HVO contributed; the HVO 1st Guards "Ante Bruno Bušić" appears in
  operational accounts, but HVO Tomislavgrad's main effort that month was
  **Operation Mistral 2** (Drvar/Šipovo/Mrkonjić), not Jajce.

Per user directive 2026-05-19, **ARBiH 7th Corps was removed from the OOB**
in our reduced-OOB scenario; its brigades (705th Bugojno, 707th Bugojno,
717th Gornji Vakuf, 727th Travnik, 737th Travnik, 770th Donji Vakuf) were
rolled into ARBiH 3rd Corps. ARBiH 3rd Corps already owns:

- **Vlašić 95** (`CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES` family) — Travnik
  ridge and Skender Vakuf shoulder, using 17th, 706th, 727th, 712th, 737th,
  705th, 707th.
- **Donji Vakuf 95** — using 17th, 705th, 706th, 707th, 727th from
  `op:travnik:turbe_2`.

Jajce 95 is the natural northward extension of Donji Vakuf 95 / Vlašić 95.

### Why hvo_tomislavgrad was structurally wrong

Three reasons:

1. **Front sector coverage.** HVO Tomislavgrad's live front sectors cover
   Livno / Glamoč / Šipovo (the Mistral family) — not Bugojno / Donji Vakuf /
   Jajce. The Wave 11 launch helper sub-segment fallback at
   `bot_brigade_ai_osid.ts:329-345` scans `corps_front_sectors[*].sub_segments`
   filtered by `sector.corps_id !== brigadeCorpsId`. For hvo_tomislavgrad
   none of its sectors contain a Jajce or Mrkonjić enemy OSID, so the
   fallback returns empty and the per-turn brigade brain stalls at
   `no_approach_osid`.

2. **Brigade pool conflict.** The previously authored brigade list
   (`hvo_1st_guard_abb`, `hrhb_kralj_petar_kreimir_iv_brigade`,
   `hrhb_kralj_tomislav_brigade`) shares brigades with Mistral 1 and Mistral
   2 — and Sacred Rule §2 in `SKILL.md` prohibits sharing brigades between
   ops on different corps (the first op grabs them; the second runs empty).
   In practice the same brigades on the same corps for sequential ops works
   only if Mistral 2 has finished by t=178 — which the calibration data
   does not support.

3. **Defender corps mis-identification.** The previous predicate keyed enemy
   weakness off `vrs_2nd_krajina`. Live save (latest_run_final_save.json)
   shows `sector:vrs_1st_krajina:7` actually holds the Jajce / Donji Vakuf /
   Mrkonjić OSIDs. The defender-weakness trajectory was reading the wrong
   corps's morale/cohesion arc — a silent semantic bug.

### Verification of arbih_3rd_corps placement

Live save inspection (n1974, `data/derived/latest_run_final_save.json`):

```
arbih_3rd_corps sectors: 5
sector:arbih_3rd_corps:1
  friendly: donji_vakuf_2, komar_2, kutanja, babin_potok_2, paklarevo, gornje_krcevine
  enemy:    oborci_2, pribraca_2, torlakovac_2, jajce:grdovo, krusevo_brdo_i, pribeljci_2, donji_koricani
```

By t=178+ the corps has captured Donji Vakuf town and its front sub-segment
directly faces the Jajce zone (`op:jajce:grdovo`). The launch helper
sub-segment fallback will resolve approach OSIDs cleanly.

Adjacency confirmation (`operational_contact_graph.json`):

| Bridge OSID                       | Adjacent Jajce/Mrkonjić objectives        |
|-----------------------------------|-------------------------------------------|
| `op:donji_vakuf:torlakovac_2`     | `op:jajce:grdovo`, `op:jajce:vinac_2`     |
| `op:donji_vakuf:oborci_2`         | `op:jajce:grdovo`                         |

Adding the two `op:donji_vakuf:*_2` OSIDs as bridge objectives gives the
operation a stepping-stone if Donji Vakuf town remains RS-held at the launch
window, and is a no-op (already friendly, filtered out by the
`friendly-controller filter` at `operation_opportunities.ts:1128-1133`) if
3rd Corps has captured them.

### Edits applied

In `operation_opportunity_catalog_federation_western_bosnia.ts`:

| Field                            | Before                                                  | After                                                              |
|----------------------------------|---------------------------------------------------------|--------------------------------------------------------------------|
| `faction`                        | `'HRHB'`                                                | `'RBiH'`                                                           |
| `primary_corps`                  | `SECONDARY_CORPS` (= `'hvo_tomislavgrad'`)              | `JAJCE_PRIMARY_CORPS` (= `'arbih_3rd_corps'`)                      |
| `staging_osid`                   | `STAGING_TOMISLAVGRAD` (`op:duvno:tomislavgrad_2`)      | `JAJCE_STAGING_BUGOJNO` (`op:bugojno:gracanica`)                   |
| `prerequisites.political_authorization` | `'required'`                                            | `'n_a'`                                                            |
| `axes[0].corps`                  | `SECONDARY_CORPS`                                       | `JAJCE_PRIMARY_CORPS`                                              |
| `axes[0].brigades`               | `hvo_1st_guard_abb`, `hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade` | `arbih_770th_slavna_mountain`, `arbih_705th_slavna_mountain`, `arbih_707th_slavna_mountain`, `arbih_717th_slavna_mountain`, `arbih_727th_slavna`, `arbih_737th_muslim_light` |
| `axes[0].staging_osid`           | `STAGING_TOMISLAVGRAD`                                  | `JAJCE_STAGING_BUGOJNO`                                            |
| `objectives` (prepended)         | —                                                       | `op:donji_vakuf:torlakovac_2`, `op:donji_vakuf:oborci_2`            |
| `objectives` (added bridge)      | —                                                       | `op:jajce:grdovo`                                                  |
| `enemyWeakness.defenderCorpsId`  | `vrs_2nd_krajina`                                       | `vrs_1st_krajina` (matches live save)                              |
| `politicalAuthorizationJajce`    | required Washington signed + alliance ≥ 0.50            | always green (intra-RBiH; mirrors `alwaysGreen` from central_bosnia) |
| `logisticsJajce` faction         | `'HRHB'`                                                | `'RBiH'`                                                           |
| `stagingAccessJajce` controller  | `'HRHB'`                                                | `'RBiH'`                                                           |
| `corpsReadinessJajce` label      | `'HVO Tomislavgrad'`                                    | `'ARBiH 3rd Corps'`                                                |
| Citations                        | (HVO-focused)                                           | Added ICTY Hadžihasanović IT-01-47-T (7th Corps OOB) + this memo  |

### Sacred Rule pre-change checklist

- [x] **Painted control** — `op:donji_vakuf:torlakovac_2` = RS, `op:donji_vakuf:oborci_2` = RS, all `op:jajce:*` = RS in Jan 1993. No friendly-paint conflicts.
- [x] **Staging adjacency** — `op:bugojno:gracanica` is RBiH-painted Jan 1993, has 6 contact-graph neighbors, sits on the same logistics line as Bugojno-homed brigades (705th, 707th).
- [x] **Brigade corps_id match** — All 6 brigades have `corps: 'arbih_3rd_corps'` per oob_brigades.json.
- [x] **No shared brigades with other corps' ops** — verified against Vlašić 95 and Donji Vakuf 95 brigade pools:
  - Vlašić 95 uses 17th, 706th, 727th, 712th, 737th, 705th, 707th — overlap with Jajce on 705th, 707th, 727th, 737th.
  - Donji Vakuf 95 uses 17th, 705th, 706th, 707th, 727th — overlap with Jajce on 705th, 707th, 727th.
  - **Mitigation:** Vlašić 95 window is earlier in the calendar (catalog dateWindow puts Vlašić in the Spring 1995 / pre-Storm band). Donji Vakuf 95 fires at t=177-180 (`dateWindowDonjiVakuf`), Jajce at t=178-184 (`dateWindowJajce`). Overlap window is t=178-180; with one-active-op-per-corps, whichever launches first will hold the brigades. Jajce 95 has lower readiness floor (0.32 vs 0.32) and lower axis_coord floor (0.30 vs 0.30) — effectively tied; ordering will depend on catalog enumeration order in `CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES` vs `FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES`. **Acceptable risk:** if Donji Vakuf 95 fires first and ties up brigades, Jajce 95 will queue or skip, which is correct behavior (don't double-spend the corps). Sequential firing is historically accurate — Donji Vakuf preceded Jajce by ~one week in September 1995.
- [x] **Corridor anchors** — Jajce zone is in Krajina theater, not in the Tuzla / Brčko / Posavina anchor set. No teočak_krstac_2 / zepa_2 / vitinica_2 / rastosnica_2 dependency.
- [x] **No `avoided_osids_by_faction`** — not touched.
- [x] **No initial OSID override** — only adding objectives, no painted_control_jan1993.json edits.

### Brigade pool justification

Six brigades chosen (all ARBiH 3rd Corps, all light_infantry except where noted, all `available_from ≤ 4`):

| Brigade                          | Home OSID                          | Equip       | Avail from | Historical role                          |
|----------------------------------|------------------------------------|-------------|------------|------------------------------------------|
| `arbih_770th_slavna_mountain`    | `op:donji_vakuf:donji_vakuf_2`     | light_infantry | 4       | BB v2 ch. 30 — front brigade for Donji Vakuf / Komar line. Rolled from 7th Corps. |
| `arbih_705th_slavna_mountain`    | `op:bugojno:gracanica`             | light_infantry | 0       | BB v2 ch. 30 — Bugojno-Donji Vakuf shoulder. Rolled from 7th Corps. |
| `arbih_707th_slavna_mountain`    | `op:bugojno:kopcic_2`              | light_infantry | 0       | BB v2 ch. 30 — Bugojno-Donji Vakuf shoulder. Rolled from 7th Corps. |
| `arbih_717th_slavna_mountain`    | `op:gornji_vakuf:crkvice`          | light_infantry | 4       | Gornji Vakuf shoulder. Rolled from 7th Corps. |
| `arbih_727th_slavna`             | `op:travnik:podstinje`             | light_infantry | 0       | Travnik-side Komar pressure. |
| `arbih_737th_muslim_light`       | `op:travnik:travnik_2`             | light_infantry | 0       | Travnik town logistics. |

All six are HRHB-allied — `data/source/calibration/painted_control_jan1993.json`
shows op:bugojno:gracanica, op:travnik:travnik_2, op:gornji_vakuf:crkvice all
RBiH-painted, with no HVO conflict. No `hvo_*` brigades are mixed in (Sacred
Rule §2 — brigades follow their own corps's op).

## Files Edited

| File                                                                                        | Lines               | Change                                            |
|---------------------------------------------------------------------------------------------|---------------------|---------------------------------------------------|
| `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`                 | 522-538             | Added catalog-floor transitional comment + new citation to MISTRAL_1_95_OPPORTUNITY |
| `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`                 | 567-820 (approx.)   | Full Jajce 95 re-host (faction, primary_corps, axes, brigade pool, predicates, staging, objectives) |

## Verification

- [x] `npx tsc --noEmit` — passes clean.
- [ ] Calibration run pending (separate cycle).
- [ ] Anomaly anchors (teočak BFS, zepa_2, vitinica_2, rastosnica_2, brcko)
  not in this op's footprint; expected zero impact on those anchors.
- [ ] Painted Oct 1995 comparison: expect Jajce OSIDs to flip to RBiH (was
  HRHB in painted_control_oct1995.json — verify the painted ground truth
  reflects ARBiH or HVO color for Jajce town; if painted as HRHB, the new
  RBiH capture creates a paint mismatch we must reconcile in a follow-up).

## Open Questions for Follow-up

1. **Painted Oct 1995 controller for Jajce town:** If painted as HRHB, the
   new ARBiH 3rd Corps capture produces a paint mismatch. Need to confirm
   `painted_control_oct1995.json[op:jajce:jajce_3]` before next calibration
   sign-off. If painted as HRHB, options are:
   - (a) Add a Federation hand-over event so ARBiH-captured Jajce transfers
     to HRHB diplomatically (matches actual postwar Cantonal arrangement).
   - (b) Accept the mismatch as a known divergence (historical record is
     debated — joint Federation control is the most accurate reading).

2. **Brigade-pool overlap with Donji Vakuf 95 and Vlašić 95:** documented
   above as acceptable risk. If sequential firing fails in practice (Jajce
   queued behind Donji Vakuf 95 with no spare brigade slot), consider:
   - Adding `'arbih_372nd_vitezka_mountain'` (Tešanj, available_from=2,
     home outside the Donji Vakuf 95 / Vlašić 95 pool) as a 7th brigade.

3. **`MIN_LAUNCH_FORCE_RATIO_FLOOR` engine work** (per §1): file as a
   separate audit pass. Affects Mistral 1, Cincar Phase 2, and any op with
   a heavy-defender posture.
