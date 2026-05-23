# Sana 95 Combat Balance Investigation — n1992

**Date:** 2026-05-23
**Branch:** feature/arc-operations-calibration
**Run:** apr1992_definitive_188w__210e69404d054959__w188_n1992
**Status:** IN PROGRESS — investigation report

## Summary

The Wave 27 OSID-pair spatial-match metric flagged 25 OSIDs in the Sana 95
delivery (Sanski Most 9, Bos. Petrovac 8, Bihać 4, Ključ 4) where the sim
holds RS but the painted oct1995 reference has RBiH. These represent the
historical ARBiH 5th Corps Krajina liberation drive (Sep-Oct 1995,
Operation Sana). The Wave 24 SCRT memo recorded a cas ratio of
**138 attacker / 1151 defender = 1 : 8.3** on 4 attacks over 9 turns by
5 brigades, yielding **0/18 captures**. This memo investigates why a
favorable cas ratio fails to produce OSID flips.

## Lead finding: ghost defenders

**Whole save (n1992 t188): 37 / 248 brigades are "ghost defenders" — personnel = 0
but `equipment_state.operational_heavy > 0`.** By faction: RS 28, HRHB 8, RBiH 1.

VRS 2nd Krajina alone: **5 of 8 brigades are ghosts** (status = `inactive`,
readiness = `overextended`, personnel = 0, heavy = 17 each = 85 heavy weapons
nominally still defending OSIDs that the historical Operation Sana captured):

| Brigade | Location OSID | Heavy | Status | Morale | Cohesion |
|---|---|---:|---|---:|---:|
| 17th Ključ Light Infantry | op:livno:gubin_2 | 17 | inactive | 0 | 15 |
| 3rd Petrovac Light Infantry | op:bihac:trubar | 17 | inactive | 38 | 0 |
| 5th Glamoč Light Infantry | op:glamoc:glamoc_2 | 17 | inactive | 95 | 0 |
| 7th Krajina Motorized | op:bosansko_grahovo:bosansko_grahovo_2 | 17 | inactive | 95 | 0 |
| 9th Grahovo Light Infantry | op:bihac:racic | 17 | inactive | 0 | 23 |

Note `composition.infantry = 800` but `personnel = 0` — composition is the
static OOB allocation; personnel is the live count. Heavy is held statically in
`equipment_state.operational_heavy` (a count, not a ratio of personnel).

## (a) ARBiH 5th Corps OOB at t188

**10 brigades, 18000 / 18000 personnel (100%), 60 operational heavy.**
All light_infantry. Concentration is around Bihać–Bos. Krupa:

| Brigade | Personnel | Heavy | Morale | Cohesion | Location |
|---|---:|---:|---:|---:|---|
| 501st Slavna Mountain | 1800 | 6 | 93 | 72 | op:bihac:bihac_2 |
| 502nd Vitezka Mountain | 1800 | 6 | 86 | 72 | op:bihac:brekovica_2 |
| 503rd Slavna Mountain | 1800 | 6 | 100 | 96 | op:bihac:brekovica_2 |
| 504th Cazin Light | 1800 | 6 | 93 | 78 | op:bihac:bihac_2 |
| 505th Vitezka Mountain | 1800 | 6 | 81 | 70 | op:bosanska_krupa:jasenica_2 |
| 506th Mountain | 1800 | 6 | 100 | 96 | op:bihac:brekovica_2 |
| 510th Bosnian Liberation | 1800 | 6 | 95 | 91 | op:bosanska_krupa:vranjska_2 |
| 511th Slavna Mountain | 1800 | 6 | 100 | 66 | op:bosanska_krupa:jasenica_2 |
| 517th Light | 1800 | 6 | 95 | 91 | op:bosanska_krupa:veliki_badic |
| 101st Bihać HVO Brigade | 1800 | 6 | 100 | 100 | op:bihac:bihac_2 |

Versus historical Sep 1995 5th Corps (BB v2 ch.30): light mountain infantry,
limited artillery, no armor. Sim matches doctrine (light_infantry, 6 heavy
each), and personnel is at max — the attacker side is healthy.

## (b) VRS 2nd Krajina defender power

**8 brigades, 4810 / 16200 personnel (30%), 136 operational heavy.**
5 of 8 are personnel=0 ghosts (see above). Living brigades:

| Brigade | Personnel | Heavy | Morale | Cohesion | Location |
|---|---:|---:|---:|---:|---|
| 11th Krupa Light Infantry | 2000 | 17 | 25 | 68 | op:bosanska_krupa:gornja_suvaja |
| 15th Bihać Infantry | 2000 | 17 | 20 | 68 | op:bihac:ripac |
| 1st Drvar Light Infantry | 810 | 17 | 6 | 18 | op:bosanski_petrovac:jasenovac_2 |

Even the "living" brigades are post-Storm broken: morale 6–25, cohesion 18 on
the 1st Drvar. But heavy counts (17 each) are intact — `operational_heavy`
does not decay with personnel collapse.

## (c) Combat predictor formula

**Defender power chain** (src/sim/combat/combat_math.ts):

`computeDefenderPower` → `computeDefenderPowerBreakdown` (line 1332) →
`basePower(formation)` (line 896) ×
postureMult × entrenchmentMult × corpsDefMult × resilienceMult × disruptionMult ×
supplyMult × terrainMult × urbanMult × forestMult × enclaveMult × toTerrainMult ×
perBrigadeTerrainBonus × frontDensityMult × officerMult × ethnicMult × fatigueMult ×
homeMult × moralePenalty × (envelope soft-cap collapse on {urban, forest, enclave}).

**`basePower` (line 896–904):**

```ts
export function basePower(formation: FormationState): number {
    const personnel = formation.personnel ?? 0;
    const eq = getEquipmentRatio(formation);
    const rawExp = Math.max(0, Math.min(1, formation.experience ?? 0));
    const expMult = EXPERIENCE_BASE + EXPERIENCE_SCALE * rawExp;
    const coh = Math.max(0, Math.min(100, formation.cohesion ?? 60)) / 100;
    const honorMult = getHonorMult(formation);
    return personnel * eq * expMult * coh * honorMult;
}
```

**Key truth: `basePower = personnel × …`**. With `personnel = 0`, the entire
defender power product is 0 regardless of `operational_heavy`, terrain, posture,
or entrenchment. **A true ghost (personnel=0) contributes ZERO defender power
to the combat predictor.** Heavy equipment counts feed `getEquipmentRatio`
(condition-weighted heavy_proportion), which is just a multiplier — when
personnel=0, the multiplier multiplies 0.

That eliminates the naive "ghosts inflate defender power" hypothesis. But
the puzzle remains: on the key Sana 95 OSIDs, defenders at t188 are:

| OSID | Defender | Pers | Heavy | Morale | Cohes | Status |
|---|---|---:|---:|---:|---:|---|
| op:bihac:ripac | 15th Bihać Inf | 2000 | 17 | 20 | 68 | active |
| op:bihac:racic | 9th Grahovo | 0 | 17 | 0 | 23 | inactive |
| op:bihac:trubar | 3rd Petrovac | 0 | 17 | 38 | 0 | inactive |
| op:bihac:orasac_2 | (none — undefended) | — | — | — | — | — |
| op:bos_petrovac:jasenovac_2 | 1st Drvar | 810 | 17 | 6 | 18 | active |
| op:sanski_most:sanski_most_2 | (none) | — | — | — | — | — |
| op:kljuc:kljuc_2 | (none) | — | — | — | — | — |
| op:bos_petrovac:bos_petrovac_2 | (none) | — | — | — | — | — |

Most key OSIDs (sanski_most_2, kljuc_2, bos_petrovac_2, orasac_2) have NO
brigade defender at t188. They should fall to militia-only resolution, which
on a 100% strength ARBiH 5th Corps assault should be a flip.

## (d) Why cas-ratio 1:8 does not translate to captures

**watched_operations.json at t188 — the smoking gun is what's MISSING:**

| Turn | Operation | Window | Status | Blocker |
|---:|---|---|---|---|
| 11 | Herzegovina Consolidation | 11 | launched | — |
| 40 | Cerska-Kamenica | 40 | launched | — |
| 188 | Kotor Varos | 10 | not_launched | already_owned_objectives |
| 188 | **Krivaja-95** (RS→Srebrenica) | 170-178 | not_launched | build_defender_power_too_high (att=110, def=689) |
| 188 | **Krivaja-95** | 170-178 | unknown | brigade_ineligible |
| 188 | **Stupčanica-95** (RS→Žepa) | 172-180 | not_launched | build_defender_power_too_high (att=100, def=1118) |

**Operation Sana is not in the watched-operations list at all.** The defender
formations on the only `build_defender_power_too_high` records are
`arbih_280th/281st/282nd_east_bosnian_light`, `arbih_1st_cerska`,
`arbih_283rd/284th/285th` — these are ARBiH defenders of the eastern enclaves
(Srebrenica / Žepa) being attacked by RS Krivaja-95 / Stupčanica-95.
**They are not Sana 95 axes.**

**The actual Sana 95 problem is that the operation never enters the build/launch
pipeline at all.** There is no watched record, no blocker, no force-ratio
estimate. The 4 attacks Wave 24 reported (1:8 cas ratio, 0/18 captures) were
either ad-hoc bot-driven assaults (not declared ops) or were attributed to
some other operation umbrella.

This reframes the question. The Sana 95 problem is **not** a combat-balance
problem and **not** a build-feasibility-gate problem. It is one of:

1. **Operation catalog miss**: Sana 95 is not registered in
   `operation_opportunity_catalog_federation_western_bosnia.ts` for the
   170–180 window, so it never reaches the build-time predictor.
2. **Sector-offensive assignment miss**: 5th Corps is launching sector-level
   attacks (ad-hoc, no named op), and those *do* fire (the 4 attacks with
   1:8 cas ratio), but they are throwing 1–2 brigades per attack instead of
   the 5–7 brigade concentration Sana 95 actually used historically.
3. **Brigade-assignment gate**: 5th Corps is full personnel (18000/18000), but
   maybe stuck in defensive `sector` assignments rather than being released
   to an `operation` assignment for the Sana axis.

The ghost-defender finding remains a real cohesion issue (37 brigades
holding "operational_heavy"=17 with 0 personnel cluttering OOB), but it is
**not** the proximate cause of the 0/18 Sana 95 captures. Per the
`computeDefenderPower` chain (combat_math.ts:1306–1330) and
`basePower` (combat_math.ts:896), personnel=0 → defender power=0, and
`sector_offensive_launch_helpers.ts:151` already filters
`status !== 'active'` out of the defender list at the build-feasibility gate.
The ghosts are inert.

### Why 1:8 cas ratio yields no flip when an attack DOES fire

For the 4 attacks Wave 24 reported, the live defenders are:
- op:bihac:ripac → 15th Bihać Inf (2000 pers, 17 heavy, morale 20)
- op:bos_petrovac:jasenovac_2 → 1st Drvar (810 pers, 17 heavy, morale 6)

Defender base = 2000 × eq × exp × (68/100) × honor. With 17 heavy /
(800 inf + 17 heavy) and condition ~0.61, getEquipmentRatio ≈ 1.05; coh 0.68;
expMult ≈ 1.0–1.1. So defender base ≈ 2000 × 1.05 × 1.05 × 0.68 ≈ **1500**.
Then × posture(1.4) × terrain (~1.5 for hilly Krajina) × officerMult ≈
**>3000**. Attacker 5th Corps brigade: 1800 × ~1.0 × ~0.95 × ~0.78 × 1.4 ≈
**1860** per brigade. **One ARBiH brigade vs the 15th Bihać needs ratio
≥ 1.2 to even attempt (VICTORY_THRESHOLD_COSTLY).** 1860 / 3000 = 0.62 —
below threshold; that attack doesn't even pass feasibility. To win, ARBiH
needs **3+ brigades concentrated** on one OSID — which is exactly the
historical Sana 95 doctrine and exactly what the sim is failing to
concentrate.

OSID flip mechanism: only fires when defender retreats / dissolves and the
attacker advances per `attack_resolution_osid.ts`. With defender power
sustained by terrain × posture × heavy on the *living* defenders, attacker
ratio never crosses the victory threshold, defender doesn't retreat,
no flip — even though attacker is bleeding defender 8:1 in raw casualties.
**Casualties don't flip OSIDs; force ratio at resolution does.**

## (e) Smallest fix recommendation

**Decisive recommendation: instrument Sana 95 in watched_operations and add
a catalog entry, not a combat-balance knob.**

The investigation rules OUT:
- **Ghost-defender inflation of build predictor** —
  `sector_offensive_launch_helpers.ts:151` already gates `status !== 'active'`,
  and `basePower(personnel=0) = 0` (combat_math.ts:896).
- **Combat math being wrong** — defender power is dominated by terrain × posture
  × officer + 2000 personnel on the 15th Bihać. That's correct math.
- **Casualty engine being unfair** — 1:8 ratio is the engine telling the truth:
  light infantry rifles eating an entrenched defender's flesh slowly, never
  reaching the force-ratio victory threshold.

The investigation rules IN:
- **Sana 95 has no operation registry entry** for the 170–180 window. There
  are zero watched records for the offensive itself. Krivaja-95 and
  Stupčanica-95 are watched (RS-side eastern offensives); Sana 95 is not.
- **5th Corps brigades are launching sector-level attacks** with insufficient
  concentration. Historical Sana 95 used 5–7 brigades per axis; sim is
  attempting 1–2.

### Recommended fix (smallest surface area, decisive)

**Option E1 (decisive):** Add Sana 95 to
`src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`
with the 170–180 turn window, attackers = ARBiH 5th Corps (501st, 502nd,
503rd, 505th, 510th, 511th, 517th + 101st HVO), targets = the 25
mis-painted OSIDs (Sanski Most cluster + Bos. Petrovac cluster + Bihać cluster
+ Ključ cluster). This routes the offensive through the catalog → build →
launch pipeline, which forces brigade concentration via the
`participating_brigades` mechanism in `corps_operation_helpers.ts`. Side
effect: it will appear in watched_operations.json so we can see exactly
where it blocks.

**Why not Option (a) raise SANA_95_DEFENDER_WEAKNESS_FLOOR**: there is no
predictor block on Sana 95 to lower against — the offensive isn't in the
predictor at all. Tuning a floor that never fires is no-op.

**Why not Option (c) "VRS 2nd Krajina post-Storm collapse" modifier**:
faction-asymmetric modifier introduces fragility. The defender power on the
living 15th Bihać (morale 20, cohesion 68) is *already* visibly post-Storm
collapsed in the breakdown. The asymmetry that's missing is **attacker
concentration**, not **defender weakness**.

**Why not Option (d) lower MIN_LAUNCH_FORCE_RATIO_FLOOR for ARBiH 5th**:
faction-asymmetric victory threshold. Hides the structural bug
(no operation = no concentration) behind a global tuning knob.

### Side-finding (separate from Sana 95 fix)

**Ghost brigades (37/248 with personnel=0 + heavy>0) are a real OOB
cleanup item but don't drive Sana 95.** Recommend: in
`brigade_dissolution.ts` or the post-battle equipment update, set
`equipment_state.operational_heavy = 0` whenever `personnel = 0`. Heavy
weapons aren't conjured by men who don't exist. This is faction-symmetric,
hash-affecting (RS 28 + HRHB 8 + RBiH 1 brigades), and is a hygiene fix that
prevents future build-predictor surprises if any code path picks up
`operational_heavy` independent of `personnel`.

### Acceptance test

After E1, the n1993 run should show in `watched_operations.json`:
- One or more `Operation Sana` records in window 170–188
- Either `launch_status: launched` (and visible attack records in the
  brigade history), or a specific `blocker_code` we can diagnose
- The 25 mis-painted OSIDs should see >0 attack attempts versus the current
  4 attacks total

If Sana 95 launches with concentration ≥4 brigades per axis and still
yields 0 captures, THEN tune
`SANA_95_DEFENDER_WEAKNESS_FLOOR` or apply a post-Storm collapse modifier.

## File:line citations

- `src/sim/combat/combat_math.ts:896` — `basePower(formation)` = personnel × eq × exp × coh × honor
- `src/sim/combat/combat_math.ts:1306` — `computeDefenderPower` entry
- `src/sim/combat/combat_math.ts:1332` — `computeDefenderPowerBreakdown` full product
- `src/sim/combat/sector_offensive_launch_helpers.ts:151` — `status !== 'active'` defender filter
- `src/sim/combat/sector_offensive_launch_helpers.ts:200–202` — `VICTORY_THRESHOLD_COSTLY` gate
- `src/sim/combat/battle_resolution.ts:447` — `computeCombatPower` peace-phase
- `src/sim/combat/attack_resolution_osid.ts` — OSID flip resolver (T4 combat consequence)
- `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` — recommended fix site

## Data citations

- Run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1992/`
  - `final_save.json` — t188 OOB
  - `watched_operations.json` — 6 records, none Sana-named
- Wave 24 memo: `docs/40_reports/audits/20260523_WAVE_24_REORDER_INEFFECTIVE_N1987.md`
- Historical reference: BB v2 ch.30 (Sep 1995 5th Corps Krajina drive)

