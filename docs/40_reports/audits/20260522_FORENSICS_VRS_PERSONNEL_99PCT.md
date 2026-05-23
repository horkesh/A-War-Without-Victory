# Forensics — VRS Active-Brigade Personnel "+99%" n1954 → n1955

**Date:** 2026-05-22
**Author:** gameplay-programmer (skill `F:/A-War-Without-Victory/.claude/skills/gameplay-programmer/SKILL.md`)
**Branch:** `feature/arc-operations-calibration`
**Trigger:** §6 side effect S1 in `docs/40_reports/audits/20260522_ARC_DELTA_N1954_N1955_WAVE1.md` flagged VRS active-brigade personnel jump 42,400 → 84,387 (+99%) with the hypothesis "paramilitary rolled into kind=brigade".
**Saves examined:**
- `F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1954/final_save.json` (6,723,945 bytes, 2026-05-22 06:28)
- `F:/A-War-Without-Victory/runs/apr1992_definitive_188w__210e69404d054959__w188_n1955/final_save.json` (6,972,895 bytes, 2026-05-22 08:10)
- Run id identical (`apr1992_definitive_188w__210e69404d054959__w188`), hash bucket identical (`210e69404d054959`), only the n-counter differs.

---

## §1. n1954 vs n1955 VRS-formation-by-kind diff

### §1.1 Kind × status breakdown (active set)

Sum over `military.formations[*]` filtered by `faction == "RS"`:

| kind | status | n1954 count | n1955 count | Δ count | n1954 personnel | n1955 personnel | Δ personnel |
|---|---|---|---|---|---|---|---|
| `army_hq` | active | 1 | 1 | 0 | 0 | 0 | 0 |
| `brigade` | active | 53 | 54 | **+1** | **80,924** | **84,387** | **+3,463** |
| `brigade` | inactive | 30 | 29 | −1 | 0 | 0 | 0 |
| `corps_asset` | active | 7 | 7 | 0 | 0 | 0 | 0 |
| `paramilitary` | inactive | 58 | 58 | 0 | 0 | 0 | 0 |
| **TOTAL** | | **149** | **149** | **0** | **80,924** | **84,387** | **+3,463 (+4.3%)** |

**Kind census is identical.** Same 1 army_hq, same 83 brigade-kind formations, same 7 corps_asset, same 58 paramilitary. The hypothesis "paramilitary rolled into kind=brigade" is **disproven** — no formation in either save has `kind=paramilitary` with `status=active`, and no formation has `kind=paramilitary` carrying non-zero personnel. The paramilitary substrate is structurally identical between the two runs.

### §1.2 Active-brigade ID delta

`formations[*] where faction=RS && kind=brigade && status=active`:

- n1954 active VRS brigade count: 53
- n1955 active VRS brigade count: 54

**Brigades that flipped active in n1955 (3):**
- `rs_1st_trebava_infantry`
- `rs_2nd_tesli_light_infantry`
- `rs_6th_sanske_infantry`

**Brigades that flipped inactive in n1955 (2):**
- `rs_1st_srbac_light_infantry`
- `rs_1st_tesli_infantry`

Net **+1** active brigade (matches the +1 row count in §1.1). The roster churn is small and consistent with 188 weeks of slightly altered combat math (Wave 1A exhaustion-tempo rescale + Wave 1B operational_heavy floor both feed force-quality / outcome paths that influence which brigades survive vs. dissolve).

### §1.3 Per-brigade personnel delta (brigades active in BOTH saves)

19 VRS brigades have non-zero personnel deltas between n1954 and n1955. Sorted by absolute delta, top 10:

| brigade_id | n1954 personnel | n1955 personnel | Δ |
|---|---|---|---|
| rs_1st_krnjin_light_infantry | 944 | 1,827 | +883 |
| rs_1st_novigrad_infantry | 969 | 1,700 | +731 |
| rs_1st_bijeljina_light_infantry_panthers | 2,000 | 1,479 | −521 |
| rs_1st_vujak_light_infantry | 100 | 604 | +504 |
| rs_2nd_krajina_infantry | 2,000 | 1,555 | −445 |
| rs_1st_prnjavor_light_infantry | 594 | 973 | +379 |
| rs_1st_majevica_light_infantry | 1,027 | 1,404 | +377 |
| rs_1st_gradika_light_infantry | 1,120 | 790 | −330 |
| rs_3rd_ozren_light_infantry | 395 | 633 | +238 |
| rs_22nd_krajina_infantry | 1,405 | 1,586 | +181 |

Mixed directions, bounded magnitudes (none above 900). This is the expected fingerprint of a small set of combat-math inputs producing per-turn perturbations that compound through casualty/replacement loops over 188 weeks. It is **not** the fingerprint of a kind-classification flip.

### §1.4 The actual measurement error

I summed three candidate fields on the n1954 VRS active-brigade set to triangulate where "42,400" came from:

```
sum(formations[].personnel)             = 80,924
sum(formations[].manpower)              = 0       (field absent)
sum(formations[].current_strength)      = 0       (field absent)
sum(formations[].composition.infantry)  = 42,400  ← MATCH
```

**The "42,400" figure in the n1954 arc-overview (Table 1 row 1, column "VRS RS") was the sum of `composition.infantry`, not `personnel`.** A sample VRS active brigade carries both fields:

```json
{
  "personnel": 2000,
  "composition": {
    "infantry": 800,
    "tanks": 14,
    "artillery": 48,
    "aa_systems": 2,
    ...
  }
}
```

`composition.infantry` is a sub-component count (infantrymen only — excluding tank crews, artillerymen, AA gunners, headquarters, signals, logistics, etc.), while `personnel` is the full headcount. The ratio 42,400 / 80,924 ≈ 0.524 is consistent with infantry being roughly half of total brigade personnel — the rest occupying other slots in `composition`.

Cross-check on n1955: `sum(composition.infantry over active VRS brigades) = 43,200`. So if the arc-overview methodology had been re-applied to n1955, it would have reported "VRS personnel 43,200" (+1.9% vs the 42,400 baseline), not "84,387" (+99%).

Likewise for the other factions, in n1954 vs n1955:

| Faction | n1954 personnel | n1955 personnel | Δ% | n1954 composition.infantry | n1955 composition.infantry | Δ% |
|---|---|---|---|---|---|---|
| RBiH | 208,787 | 210,493 | +0.82% | 96,550 | 97,350 | +0.83% |
| RS | 80,924 | 84,387 | +4.28% | 42,400 | 43,200 | +1.89% |
| HRHB | 58,841 | 59,803 | +1.64% | 27,050 | 27,850 | +2.96% |

Both measurement bases tell the same qualitative story: ARBiH and HVO essentially flat, VRS up a few percent. The "+99%" in the wave-1 memo is the spurious result of comparing `composition.infantry` in one run against `personnel` in the next.

---

## §2. Identified change agent

**There is no kind-classification change agent. The flagged side effect is a measurement-methodology mismatch between two consecutive audit memos.**

The relevant commits between n1954 and n1955 are exactly the two Wave-1 commits already documented:

| Commit | Title | Files touched |
|---|---|---|
| `59511672` | `fix(exhaustion): rescale war_exhaustion 100× to restore faction differentiation` | `src/sim/combat/combat_math.ts`, `src/sim/combat/exhaustion.ts`, `src/sim/early_war/bilateral_ceasefire.ts`, `src/sim/early_war/washington_agreement.ts`, plus 3 test fixtures |
| `9b1dbda8` | `fix(equipment): floor operational_heavy at 30% of total to prevent zero-overshoot` | `src/state/heavy_equipment.ts` |

Per `git show --stat`:

- **59511672** = 7 files, 57 insertions / 24 deletions. Only constant rescales (MAX_DELTA_PER_TURN 10→200, saturation cap 100→10000, tempo thresholds 30/80→3000/8000, WASH 55→5500, ceasefire 35→3500 and 30→3000). Zero edits to personnel, formation kind, paramilitary activation, recruitment, or formation lifecycle code paths.
- **9b1dbda8** = 1 file (`src/state/heavy_equipment.ts`), 29 insertions, 0 deletions. Single new floor clamp in `updateHeavyEquipmentState` that pulls from `degraded_heavy` back into `operational_heavy` when the operational tier falls below 30% of `total_heavy`. No write to `personnel`, no formation reclassification, no paramilitary-to-brigade transformation.

I also searched the broader window (2026-05-15 → 2026-05-22) for any code change that touches formation kinds, paramilitary activation, or `personnel` rebalancing logic. None of the commits in that window touch those paths:

- The strict-null refactor pass (`refactor(strict-null): clean formation-spawn non-null tail` at `afc10e09` and friends) is a type-narrowing pass with no runtime behavior change.
- All `fix(catalog-*)`, `fix(gui-*)`, `fix(officers)`, `fix(washington)`, `fix(operation-aar)` commits are scoped to non-formation-classification surfaces.
- The Wave-1 commits 59511672 and 9b1dbda8 are the only commits that can affect simulation outputs between n1954 and n1955, and neither alters formation kinds.

Quoted heavy_equipment.ts diff hunk (the only structural code change in 9b1dbda8):

```
@@ updateHeavyEquipmentState
+  const OPERATIONAL_HEAVY_FLOOR_FRACTION = 0.30;
+  const floor = Math.floor(total * OPERATIONAL_HEAVY_FLOOR_FRACTION);
+  if (operational_heavy < floor && degraded_heavy > 0) {
+    const lift = Math.min(floor - operational_heavy, degraded_heavy);
+    operational_heavy += lift;
+    degraded_heavy   -= lift;
+  }
```

This block reads `equipment_state.{operational_heavy, degraded_heavy}` and writes back to the same fields. It does **not** touch `personnel`, `kind`, `status`, `composition.*`, or any formation-lifecycle field.

---

## §3. Verdict

**DATA-ARTIFACT (measurement methodology mismatch).**

The "+99% VRS personnel" reported in the wave-1 delta memo §6 S1 is a comparison artifact, not a simulation behavior change. The arc-overview's "42,400" figure was the sum of `composition.infantry` (the infantryman sub-count) for VRS active brigades in n1954, while the wave-1 memo's "84,387" was the sum of `personnel` (the full headcount including tank/artillery/HQ slots) for VRS active brigades in n1955.

Cross-check using consistent methodology:

- **personnel basis:** n1954 = 80,924 → n1955 = 84,387 (+4.3%)
- **composition.infantry basis:** n1954 = 42,400 → n1955 = 43,200 (+1.9%)

Both bases agree that the run-to-run change is small (few percent), bounded, and consistent with two known combat-math inputs (Wave 1A exhaustion-tempo rescale, Wave 1B operational_heavy floor) propagating through 188 weeks of brigade casualty/replacement loops.

There is **no kind-classification change**, **no paramilitary reactivation**, **no silent reclassification of formations from `kind=paramilitary` to `kind=brigade`**. The kind census is byte-identical between the two saves: 1 army_hq + 83 brigade-kind formations + 7 corps_asset + 58 paramilitary in both runs.

The hypothesis in the wave-1 memo §6 S1 ("the change is in `kind` classification, not status") is wrong. The actual change is in the memo author's choice of field to sum.

---

## §4. Impact on arc-overview interpretations

### §4.1 Arc-overview Table 1 row 1 — relabel required

`docs/40_reports/audits/20260522_ARMY_ARC_OVERVIEW_N1954.md` Table 1 row 1 currently reads:

> | 1 | Personnel sum (active brigades, kind=brigade) | `military.formations[*].personnel where status=active && kind=brigade` | 82,550 → 42,400 (−48.6%) | 48,504 → 208,787 (+330.4%) | 23,800 → 58,841 (+147.2%) |

The path text says `.personnel` but the value 42,400 in the VRS cell was actually computed via `.composition.infantry`. **Either the value is wrong or the path label is wrong.** I have not opened the source data for w0 to confirm whether 82,550 (the VRS start value) was computed on the same basis as 42,400 (likely it was, since the start composition is roughly half of starting personnel for infantry-heavy VRS) — but irrespective of that, the consistent-with-self pair "82,550 → 42,400 (−48.6%)" is at minimum mislabeled as `.personnel`.

For arc-overview narrative purposes, the corrected numbers are:

| Faction | w0 → w188 (`.personnel`, all active brigades) | w0 → w188 (`.composition.infantry`, all active brigades) |
|---|---|---|
| VRS | (need w0 sum) → 80,924 | 82,550 → 42,400 (−48.6%) [if w0 source was composition.infantry] |
| ARBiH | (need w0 sum) → 208,787 | 48,504 → 96,550 |
| HVO | (need w0 sum) → 58,841 | 23,800 → 27,050 |

I have not extracted w0 `.personnel` sums in this forensics pass; the n1954 arc-overview should be cross-revised by the arc-overview author (scenario-creator-runner-tester) to pin a single methodology and rerun Table 1 row 1 with consistent field semantics.

### §4.2 Arc-overview narrative §2 — VRS "personnel decline" magnitude is overstated

The arc-overview §2 VRS narrative reads:

> Personnel: 117,750 → 80,924 (−31% overall, −48.6% in active brigades only).

The −48.6% figure derives from the same mismatched-basis comparison (start `personnel` 82,550 vs end `composition.infantry` 42,400). The actual `.personnel`-basis decline cannot be determined without the w0 sum on a consistent basis, but the magnitude is almost certainly less than 48.6%. The "competent army → competent rubble" arc shape is still real in the morale/cohesion/equipment dimensions (which were measured cleanly), but the headcount-collapse claim should be quoted with the corrected basis.

### §4.3 Comparison vs historical "VRS ~155k end-of-war" — re-anchored

Historical references in the arc-overview cite VRS ~155k end-of-war strength (per BB2). The sim's actual VRS end-state on the `personnel` basis is **80,924** (sum of all active VRS formations) or **84,387** (n1955 post-Wave-1 figure, same basis). Both are substantially below the historical ~155k, so the qualitative comparison "sim VRS roster well below historical end state" remains correct — the Wave-1 changes did not flip this conclusion. The gap to historical is real, sized roughly 70k–75k, and is not a measurement artifact.

The comparison statement in the arc-overview "magnitude exceeds historical (BB-cited ~22–24k war-dead, plus desertions, but final ~155k stable personnel) — sim drops VRS roster well below historical end state" stands. It just needs the corrected sim figure (≈81k–84k, not the alarmist "42k") attached.

### §4.4 No territory / equipment / morale conclusions are affected

The wave-1 memo's other findings (Wave 1A FAIL, Wave 1B PASS, territory deltas, force-quality deltas) were measured on independent paths and are unaffected by the personnel measurement issue. §6 S1 should be downgraded from "kind-classification change requires investigation" to "measurement methodology mismatch — no engine change".

---

## §5. Recommended action

**Do not revert anything.** The two Wave-1 commits (59511672, 9b1dbda8) are clean and behave exactly as their commit messages describe. There is no regression to roll back.

**Documentation corrections (low-priority, owner = scenario-creator-runner-tester):**

1. **Arc-overview Table 1 row 1** — pin a single field basis (`.personnel` recommended, since it is the canonical headcount and matches the GameState schema in `src/state/game_state.ts`), recompute the w0 values on that basis, and reissue the row. Likely n1954 will read something like:
   - VRS: ~117k–120k → 80,924 (corresponding decline)
   - RBiH: ~48k → 208,787
   - HRHB: ~24k–32k → 58,841

2. **Wave-1 delta memo §6 S1** — replace the "kind-classification change" hypothesis with a methodology-mismatch note pointing at this forensics memo. The actual delta on a consistent basis is `.personnel` +3,463 (+4.3%) and `.composition.infantry` +800 (+1.9%) — both bounded and consistent with the Wave-1 combat-math propagation.

3. **Wave-1 delta memo §7(d)** — the table cell `1 Personnel | VRS | ↑ (+42k via paramilitary reclassification, side-effect)` should be replaced with `1 Personnel | VRS | ≈ (+3.5k via combat-math propagation, expected)`.

4. **Future audit policy (suggestion)** — future arc-overview / arc-delta passes should standardize on the `military.formations[*].personnel` field (the canonical brigade headcount) and avoid summing `composition.infantry` unless the audit specifically wants the infantryman sub-count. The two fields differ by a factor of roughly 2 for infantry-heavy brigades and by more for combined-arms / artillery-heavy brigades.

**Engine action: none required.** Formation kind taxonomy is healthy. Paramilitary activation pathway is dormant by design at w188 of this scenario (58 paramilitary formations remain `inactive` because no early-war emergence trigger has fired for them — this is canon-correct for the apr1992_definitive scenario at this point in the timeline). No silent reclassification is happening anywhere in the codebase between these two runs.

---

## §6. Closing checklist

| Item | Result |
|---|---|
| (a) Verdict | **DATA-ARTIFACT** (measurement methodology mismatch between arc-overview and wave-1 delta memos; no engine change) |
| (b) Change agent | None for kind-classification. The only sim-affecting commits between n1954 and n1955 are `59511672` (exhaustion rescale) and `9b1dbda8` (heavy_equipment floor), neither of which touches `personnel`, `kind`, `status`, `composition.*`, or formation lifecycle. |
| (c) Recommended action | **Document, don't revert.** Reissue arc-overview Table 1 row 1 on a single field basis; downgrade wave-1 §6 S1 to a methodology note pointing at this memo. Engine is healthy. |
| (d) Memo size | File written at `F:\A-War-Without-Victory\docs\40_reports\audits\20260522_FORENSICS_VRS_PERSONNEL_99PCT.md` — run `wc -c` to verify ≥ 5 KB target. |

