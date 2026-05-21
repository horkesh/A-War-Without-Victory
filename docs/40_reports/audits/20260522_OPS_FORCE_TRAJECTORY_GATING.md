# Operations Force-Trajectory Gating Audit (2026-05-22)

**Status:** COMPLETE - read-only audit.
**Author:** Codex operations review.
**Question:** Can existing late-war opportunity operations (`sana_95`, `mistral_2_95`, `kupres_cincar_94`, `vlasic_ridge_95`) deliver the painted Krajina collapse organically under the current force-trajectory substrate, or do we need catalog/engine follow-up?

---

## 0. Method

Read-only inventory of:

- `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
- `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`
- `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`
- `src/sim/combat/corps_operation_readiness.ts`
- `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md`
- `docs/40_reports/audits/20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md`

No source, scenario, anchor, or tuning edits were made.

## 1. Findings

### 1.1 Existing late-war ops are macro-gated, not comparative-force-gated

The current catalog gates late-war opportunities on:

- Date window.
- Political/alliance context.
- Staging control.
- Live enemy-held objectives.
- Attacker corps readiness.
- Attacker faction supply pressure.
- Optional commander/axis-coordination traits.

The catalog does not currently gate on attacker-versus-defender trajectory comparison. There is no predicate that asks whether VRS Krajina defender readiness, officer quality, equipment condition, cohesion, morale, or supply state has fallen below the attacking corps by a required margin.

Concrete examples:

- `sana_95` checks Storm theater rupture, Bihac pocket staging anchors, 5th Corps `operation_readiness >= 0.40`, live RS-held objectives, and RBiH supply pressure below 90. See `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:186`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:194`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:217`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:236`, and `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:266`.
- `mistral_2_95` checks Federation authorization, HVO/HV readiness floors, HRHB supply pressure, Livno/Kupres-Cincar staging, RS-held objectives, Storm rupture, and HVO axis coordination. See `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:136`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:145`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:163`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:171`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:201`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:213`, and `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:220`.
- `kupres_cincar_94` and `vlasic_ridge_95` follow the same pattern: attacker readiness/supply/staging plus live RS-held objectives, not defender trajectory comparison. See `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:229`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:240`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:296`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:308`, and `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:319`.

### 1.2 The force-quality helper has enough attacker substrate, but its contract stops before combat math

`computeCorpsOperationReadiness(...)` already combines officer quality, faction officer maturity, capability profile, cohesion, morale, exhaustion, pool pressure, equipment support, and consecutive failures into named traits. The file header explicitly states that this helper "does NOT touch combat math" and "only shapes whether/how plans get proposed, accepted, and staged" (`src/sim/combat/corps_operation_readiness.ts:9`).

The computed traits include `operation_readiness`, `axis_coordination`, `support_delivery`, `failure_recovery`, `reserve_response`, and `collapse_susceptibility` (`src/sim/combat/corps_operation_readiness.ts:380`). This is enough to express an attacker readiness threshold. It is not yet a complete late-war collapse mechanism because current opportunity gates do not compare those attacker traits against the defending corps/faction at the target theater.

### 1.3 The painted gap is too large to treat as a pure threshold-tuning problem

The fresh painted-compare packet reports a flat sim faction-area profile from w104 to w188: RS 61.0%, RBiH 26.4%, HRHB 12.6%. The historical Oct 1995 target is approximately RS 47-51%, RBiH 28-33%, HRHB 18-23%. That leaves the current sim overholding RS by roughly 10 percentage points and underholding HRHB by roughly 5.4 percentage points at the Oct 1995 target.

Because the current profile is flat across Apr 1994, Apr 1995, and Oct 1995, the issue is not merely "late-war ops launch but are slightly weak." The current evidence indicates that the Mistral/Sana/Storm delivery chain is not producing enough territorial transfer in the current run set.

### 1.4 The code-gap memo remains valid, but it is not the whole answer

`20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md` identifies four catalog-coverage gaps:

- Ljeto 95 for Glamoc/Bosansko Grahovo.
- Donji Vakuf 95.
- Jajce arm inside `mistral_2_95`.
- Juzni Potez extraction from `mistral_2_95`.

Those gaps explain a real subset of missing Oct 1995 HRHB/RBiH painted OSIDs. They do not replace the need for force-trajectory gating because even a complete catalog still needs the engine to decide whether the live VRS defender state has degraded enough for late-war operations to execute with appropriate tempo and failure risk.

## 2. Verdict

Existing late-war ops are necessary but not sufficient.

The current catalog can represent opportunity availability, staging, and attacker readiness. It cannot yet prove that Krajina collapse emerges organically from relative force trajectory because the decisive comparison is missing: attacker operational readiness versus defender theater degradation.

Do not solve this by adding broad global multipliers or by relaxing every late-war operation threshold. The safer path is:

1. Preserve the current catalog as the macro-availability layer.
2. Add compact diagnostics that record why each late-war opportunity is eligible, blocked, launched, skipped, or under-delivered.
3. Add a targeted comparative defender-trajectory predicate/read model for Krajina-facing late-war opportunities.
4. Fill the lowest-risk catalog gaps in the order already identified: Donji Vakuf 95, Jajce arm, Juzni Potez, then Ljeto 95.

## 3. Next implementation lane

The next code lane should not tune outcomes yet. It should persist enough trace to separate four cases that currently look similar in painted output:

- Catalog operation never became eligible.
- Catalog operation became eligible but was blocked by live prerequisites.
- Operation launched but failed on launch feasibility or validation.
- Operation launched and progressed, but combat resolution under-delivered.

After that trace exists, implement the lowest-risk catalog gap (`donji_vakuf_95`) or the Krajina defender-trajectory predicate depending on which trace row proves to be the actual blocker in the fresh 188w run.

---
---

# PART 2 — Detailed Predicate Inventory + 4-Section Audit Deliverable

**Author:** operations-expert (parallel review).
**Constraint:** Read-only. No source/scenario/anchor edits performed. Codex's parallel `src/sim/combat/*` edits are not affected.

This second pass complements Part 1 with the file:line predicate inventory, the H1-cross-referenced root-cause classification, the smallest gating-change set, and the irreducible BB code-gap residue — directly answering the four-section deliverable in the dispatch prompt.

## §1 Launch-feasibility input inventory (per op)

Every late-war opportunity uses the 9-axis predicate vocabulary defined in `operation_opportunities.ts`:
```
date_window | political_authorization | corps_readiness | logistics |
staging_access | weather_season | commander_confidence | enemy_weakness |
alliance_context | force_quality
```

### §1.1 What each axis reads, with file:line citations

| Axis | Cited predicate (file:line) | What it READS in live state |
|---|---|---|
| `date_window` | `dateWindowSana` (`catalog_5th_corps.ts:178`), `dateWindowTigar` (`catalog_5th_corps.ts:461`), `dateWindowApwb` (`catalog_5th_corps.ts:726`), `dateWindowUna` (`catalog_5th_corps.ts:1072`), `dateWindowBreza` (`catalog_5th_corps.ts:1178`), `dateWindowPauk` (`catalog_5th_corps.ts:1274`), `dateWindowGrmec` (`catalog_5th_corps.ts:1440`), `dateWindowMistral` (`catalog_federation_western_bosnia.ts:130`), `dateWindowVlasic` (`catalog_central_bosnia.ts:193`), `dateWindowKupresCincar` (`catalog_central_bosnia.ts:272`) | `turn` ONLY |
| `political_authorization` | `politicalAuthorizationMistral` (`catalog_federation_western_bosnia.ts:136`) | `state.political.war_alliance_rbih_hrhb`, `state.political.rbih_hrhb_state.washington_signed` |
| `corps_readiness` | `corpsReadinessSana` (`catalog_5th_corps.ts:219`), `corpsReadinessTigar` (`catalog_5th_corps.ts:482`), `corpsReadinessApwb` (`catalog_5th_corps.ts:762`), `corpsReadinessUna` (`catalog_5th_corps.ts:1078`), `corpsReadinessBreza` (`catalog_5th_corps.ts:1184`), `corpsReadinessPauk` (`catalog_5th_corps.ts:1280`), `corpsReadinessMistral` (`catalog_federation_western_bosnia.ts:145`), `corpsReadinessVlasic` (`catalog_central_bosnia.ts:229`), `corpsReadinessKupresCincar` (`catalog_central_bosnia.ts:308`) | `computeCorpsOperationReadiness(state, attackerCorpsId).operation_readiness >= floor` (0.25 to 0.40) |
| `logistics` | `logisticsSana` (`catalog_5th_corps.ts:267`), `logisticsTigar` (`catalog_5th_corps.ts:511`), `logisticsApwb` (`catalog_5th_corps.ts:790`), `logisticsT3` (`catalog_5th_corps.ts:1022`), `logisticsMistral` (`catalog_federation_western_bosnia.ts:163`), `logisticsVlasic` (`catalog_central_bosnia.ts:240`), `logisticsKupresCincar` (`catalog_central_bosnia.ts:319`) | `getFactionLiveSupplyPressure(state, faction) < ceiling` (90 to 95) |
| `staging_access` | `stagingAccessSana` (`catalog_5th_corps.ts:195`), `pocketSurvivalTigar` (`catalog_5th_corps.ts:469`), `stagingAccessApwb` (`catalog_5th_corps.ts:744`), `pocketSurvivalT3` (`catalog_5th_corps.ts:954`), `stagingAccessGrmec` (`catalog_5th_corps.ts:1447`), `stagingAccessMistral` (`catalog_federation_western_bosnia.ts:171`), `stagingAccessVlasic` (`catalog_central_bosnia.ts:207`), `stagingAccessKupresCincar` (`catalog_central_bosnia.ts:286`) | `getPoliticalControllerOSID(state, osid)` on pocket-survival anchor sets + sometimes Tigar-approach anchors or Kupres/Cincar dependency anchors |
| `weather_season` | `weatherSeasonMistral` (`catalog_federation_western_bosnia.ts:187`), `weatherSeasonVlasic` (`catalog_central_bosnia.ts:267`), `weatherSeasonKupresCincar` (`catalog_central_bosnia.ts:346`) | `turn` only (calendar season proxy) |
| `commander_confidence` | `commanderConfidenceSana` (`catalog_5th_corps.ts:276`), `commanderConfidenceTigar` (`catalog_5th_corps.ts:501`), `commanderConfidenceApwb` (`catalog_5th_corps.ts:780`), `commanderConfidenceMistral` (`catalog_federation_western_bosnia.ts:192`), `commanderConfidenceVlasic` (`catalog_central_bosnia.ts:248`), `commanderConfidenceKupresCincar` (`catalog_central_bosnia.ts:327`) | `state.military.corps_command?.[CORPS]?.commander_state` — checks PRESENCE only, never strength |
| `enemy_weakness` | `enemyWeaknessSana` (`catalog_5th_corps.ts:239`), `enemyWeaknessSanaFollowOn` (`catalog_5th_corps.ts:256`), `threatPressureT3` (`catalog_5th_corps.ts:996`), `enemyWeaknessMistral` (`catalog_federation_western_bosnia.ts:201`), `enemyWeaknessVlasic` (`catalog_central_bosnia.ts:217`), `enemyWeaknessKupresCincar` (`catalog_central_bosnia.ts:296`) | `getPoliticalControllerOSID` on target sets — COUNTS how many OSIDs are still in enemy hands. **NEVER compares defender vs attacker force quality.** |
| `alliance_context` | `allianceContextSana` (`catalog_5th_corps.ts:187`), `allianceContextPreStorm` (`catalog_5th_corps.ts:1032`), `allianceContextMistral` (`catalog_federation_western_bosnia.ts:213`), `allianceContextVlasic` (`catalog_central_bosnia.ts:199`), `allianceContextKupresCincar` (`catalog_central_bosnia.ts:278`) | `isWesternTheaterRuptured(state)` / `isPreStormWesternTheater(state)` / `state.political.war_alliance_rbih_hrhb` |
| `force_quality` | `forceQualityTigar` (`catalog_5th_corps.ts:528`), `forceQualityApwb` (`catalog_5th_corps.ts:804`), `forceQualityMistral` (`catalog_federation_western_bosnia.ts:220`), `forceQualityVlasic` (`catalog_central_bosnia.ts:256`), `forceQualityKupresCincar` (`catalog_central_bosnia.ts:335`); `alwaysGreen` on Sana (`catalog_5th_corps.ts:329`) | `computeCorpsOperationReadiness(state, attackerCorpsId).{staging_reliability \| failure_recovery \| axis_coordination} >= floor` (0.30 to 0.40) |

### §1.2 What predicates DO NOT read (the trajectory blindspots)

The catalog has **zero predicates** that read any of the following live state — even though the substrate exists:

1. **Defender force-quality COMPARISON.** No predicate computes any version of `defender_power / attacker_power` or `defender_trait_aggregate`. The closest is `enemy_weakness`, which only counts OSIDs.
2. **Defender equipment quality.** `support_delivery` reads ATTACKER `composition.tanks + artillery` only; never defender's.
3. **Per-OSID supply state.** Predicates use faction-mean `getFactionLiveSupplyPressure`, never `supply_by_osid` for the specific objective.
4. **Per-brigade attacker morale / cohesion / exhaustion FLOORS.** They feed `computeCorpsOperationReadiness` traits, but no predicate checks "is brigade X above morale floor 40?"
5. **Patron arms-flow signals.** The `equipment_quality_modifier` substrate (`active_modifiers.ts:43`) IS multiplied into combat math at `combat_math.ts:1301` (attacker) and `:1463` (defender) — so combat outcomes ARE responsive. But NO predicate inspects `state.military.equipment_quality_modifiers`. A patron event that drops VRS equipment-quality by 30% would change combat — but no op gate would *notice* the trajectory.
6. **Comms-quality signals.** No state field exists (HIST-GAP-3 in engine-health audit). No predicate could read it even if it wanted to.
7. **Officer-quality COMPARISON between sides.** Officer-quality feeds `operation_readiness` for ATTACKER corps only; no op asks "how good is the enemy commander?"

### §1.3 The seven readiness traits (the substrate the catalog HAS but underuses)

`computeCorpsOperationReadiness` (`corps_operation_readiness.ts:380-461`) is a faction-agnostic pure helper that derives:

| Trait | Formula (file:line) | Inputs |
|---|---|---|
| `operation_readiness` | `0.30·officerQ + 0.20·cohesion + 0.15·morale + 0.15·(1-exhaustion) + 0.10·maturity + 0.10·organizational_maturity` (line 401-408) | OOB + GameState |
| `staging_reliability` | `0.40·organizational_maturity + 0.25·training_quality + 0.20·officerQ + 0.15·(1-exhaustion)` (line 410-415) | same |
| `axis_coordination` | `0.40·maturity + 0.30·doctrine_attack + 0.20·officerQ + 0.10·cohesion` (line 417-422) | same |
| `support_delivery` | `0.50·equipSupport + 0.30·capability.equipment + 0.20·(1-poolPressure)` (line 424-428) | same |
| `failure_recovery` | `0.35·morale + 0.25·officerQ + 0.20·cohesion + 0.20·failureFloor` (line 430-436) | same |
| `reserve_response` | `0.40·maturity + 0.30·organizational_maturity + 0.30·(1-poolPressure)` (line 438-442) | same |
| `collapse_susceptibility` | `0.40·(1-morale) + 0.30·(1-cohesion) + 0.20·failureSat + 0.10·(1-officerQ)` (line 444-450) | same |

**Critical observation:** the helper is faction-agnostic. Pointing it at a DEFENDER corps is byte-stable and pure — same code path, same determinism. The gap is purely that no predicate has ever called it on a defender corps_id.

### §1.4 Per-op input inventory

| Op | Family | Faction | Window | corps_readiness floor | force_quality trait | logistics ceiling | enemy_weakness reads |
|---|---|---|---|---|---|---|---|
| `sana_95` | fifth_corps | RBiH | 175-200 | 0.40 | n_a (alwaysGreen) | 90 (RBiH) | RS-held count among 4 Petrovac/Sanski/Ključ OSIDs |
| `sana_95_follow_on` | fifth_corps | RBiH | 175-200 | 0.40 | n_a | 90 | RS-held count among 3 interior OSIDs |
| `mistral_2_95` | federation_western_bosnia | HRHB | 175-190 | 0.36 (BOTH corps) | optional axis_coordination ≥ 0.35 | 90 (HRHB) | RS-held count among 20 Drvar/Šipovo/Mrkonjić OSIDs |
| `kupres_cincar_94` | central_bosnia_vlasic | HRHB | 132-142 | 0.34 | optional axis_coordination ≥ 0.34 | 90 (HRHB) | RS-held count among 3 Kupres OSIDs |
| `vlasic_ridge_95` | central_bosnia_vlasic | RBiH | 152-166 | 0.36 | optional axis_coordination ≥ 0.35 | 90 (RBiH) | RS-held count among 7 Vlasic/Skender OSIDs |
| `tigar_sloboda_94` | fifth_corps | RBiH | 113-122 | 0.30 | optional staging_reliability ≥ 0.30 | 95 | n_a (alwaysGreen) |
| `apwb_pressure_94` | fifth_corps | RBiH | 113-130 | 0.40 | optional failure_recovery ≥ 0.40 | 95 | n_a |
| `una_94` (T3) | fifth_corps | RBiH | 113-115 | 0.25 | n_a | 95 (optional) | ≥1 of 6 threat-ring OSIDs hostile (`threatPressureT3`) |
| `breza_94` (T3) | fifth_corps | RBiH | 125-130 | 0.30 | n_a | 95 (optional) | ≥1 of 6 threat-ring OSIDs hostile |
| `pauk_94_95` (T3) | fifth_corps | RBiH | 135-145 | 0.30 | n_a | 95 (optional) | ≥1 of 6 threat-ring OSIDs hostile |
| `grmec_94` | fifth_corps | RBiH | 133-138 | 0.40 | (live RS-held axis check) | 90 | live RS-held on Grmeč axis |

---

## §2 Why current ops don't deliver the painted Krajina collapse (root-cause classification)

### §2.1 Per-op classification

| Op | Painted-target territory should deliver | Root cause it doesn't |
|---|---|---|
| `sana_95` | Krupa + Petrovac + Ključ + Sanski Most (28 OSIDs to RBiH per BB1 pp.417, 419-420) | **Launches but loses combat predictor at the launch-feasibility gate.** `evaluateLaunchFeasibility` (`sector_offensive_launch_helpers.ts:73-224`) requires `ratio >= VICTORY_THRESHOLD_COSTLY` (= 1.0). The H1 watched-ops audit shows defender stacks of 600-1228 power vs attacker stacks of 170-215 — ratios of 0.14 to 0.33 — when VRS is at full strength with entrenchment ×1.5+, hold posture ×1.2, terrain class ×1.5+, officer ×1.228, morale ×1.065. Sana 95 fights the SAME-faction defender (VRS Krajina) in a comparable defender posture. Without a VRS-degradation trajectory, ratio stays below threshold and the op never launches. |
| `mistral_2_95` | Drvar + Šipovo + Mrkonjić-axis (16 OSIDs to HRHB per BB1 pp.418, 427) | **MIX: dual-corps gate + axis-conflation + same launch-feasibility issue.** Predicate `corpsReadinessMistral` (`catalog_federation_western_bosnia.ts:145-161`) requires BOTH `hvo_main_staff` AND `hvo_tomislavgrad` ≥ 0.36. Combined with Mistral 2's conflation of Maestral (Sep 8-15) with Juzni Potez (Oct 8-11), and the same launch-feasibility ratio problem on the defender stack. |
| `kupres_cincar_94` | Kupres + Cincar (3 OSIDs to HRHB) | **Probably LAUNCHES and succeeds (painted_apr1995 already shows HRHB holding Kupres).** Not a contributor to the Oct 1995 gap. |
| `vlasic_ridge_95` | Vlasic ridge / Skender Vakuf, 4 OSIDs | **PARTIAL — historically pivoted away.** BB1 p.419 explicitly says ARBiH 7th Corps push was aborted in favor of the western collapse. Painted_oct1995 shows this area unchanged — so vlasic_ridge_95 correctly produces small/no territory shift. |
| `tigar_sloboda_94`, `apwb_pressure_94` | Pre-1995 5th Corps containment | **Out of scope.** Pre-Storm windows. |
| `una_94`, `breza_94`, `pauk_94_95` | T3 defensive crisis (no offensive territory) | **Out of scope.** T3 substrate skips `buildCorpsOperation`. |
| `grmec_94` | Bihać-Grabež breakout, 6 OSIDs (historically rolled back) | **Out of scope** for Krajina collapse. |

### §2.2 The two true root causes producing the painted gap

1. **Predictor pessimism on raw attacker-vs-defender power.** From the H1 audit: a 4-defender VRS East Bosnian stack at 600 personnel each, hold-posture, 12 turns entrenchment, terrain class 1.575, officer 1.228, morale 1.065 → defender power 643.6. Attacker stack 215 → ratio 0.334. **Same mechanic blocks Sana if VRS Krajina stays at full strength when w175 arrives.**
2. **Predicates never see attacker-vs-defender CHANGE.** Even if VRS personnel pool dropped 40% by Aug 1995, existing ops can't detect this — `enemy_weakness` only counts OSIDs, `corps_readiness` only reads attacker traits, no predicate reads `equipment_quality_modifiers`, and no predicate calls `computeCorpsOperationReadiness` on a defender corps.

The painted-compare flat-line 61.0/26.4/12.6 from w104-w188 (per `20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md`) confirms the late-war ops aren't moving territory.

---

## §3 Minimum gating changes to make existing ops trajectory-responsive

### §3.1 Recommended smallest set

| # | Change | File:line target | Risk | Estimated painted-gap closure |
|---|---|---|---|---|
| 1 | New `enemy_weakness` predicate reading defender-corps `computeCorpsOperationReadiness.{collapse_susceptibility, operation_readiness}` + `getActiveEquipmentQualityMultiplier(state, 'RS', turn)` for Sana/Mistral targets. Replaces or augments OSID-count check. | `catalog_5th_corps.ts:239` (`enemyWeaknessSana`), `catalog_federation_western_bosnia.ts:201` (`enemyWeaknessMistral`) — additive, ~30 lines | LOW (helper is faction-agnostic, pure, byte-stable) | ~6-8pp |
| 2 | Lower `SANA_READINESS_FLOOR` 0.40 → 0.35 | `catalog_5th_corps.ts:218` — 1 line | LOW | ~1pp insurance vs post-Pauk exhaustion |
| 3 | Split `mistral_2_95` into `maestral_95` (w175-w180) + `juzni_potez_95` (w181-w184), OR extend mistral_2_95 with a Jajce sub-axis | `catalog_federation_western_bosnia.ts` — moderate refactor | MEDIUM (axis conflation cleanup) | ~3-4pp + Jajce 8 OSIDs |

(Already wired correctly — confirmed during this audit, NO change needed:)
- `getActiveEquipmentQualityMultiplier` is already multiplied into attacker power (`combat_math.ts:1301`) AND defender power (`combat_math.ts:1463`).
- `computeCorpsOperationReadiness` is pure and faction-agnostic — pointing it at defender corps is byte-stable.

### §3.2 Answering the three concrete VRS-degradation questions

**Q: "If VRS personnel pool drops 40% by Aug 1995, does `sana_95` launch-feasibility change?"**
- **Currently:** No. None of Sana's gates read VRS personnel or any defender-corps state.
- **With Change 1:** Yes. Defender `cohesion` drops with depleted brigades, `collapse_susceptibility` rises, `operation_readiness` falls. Predicate flips GREEN. Combat math also responds (lower defender base power).

**Q: "If VRS equipment-quality multiplier degrades 30% by Aug 1995, do existing predicates see it?"**
- **Currently:** Combat math sees it on both sides (already wired). But NO PREDICATE in any catalog inspects `equipment_quality_modifiers`. The launch gate is blind to the trajectory.
- **With Change 1:** Yes — predicate multiplies in `getActiveEquipmentQualityMultiplier(state, 'RS', turn)`.

**Q: "If VRS comms quality drops (HIST-GAP-3), do existing ops have anything that reads comms?"**
- No state field exists. No predicate could read it. **Irreducible — needs a new mechanic in the engine, not just a gating change.**

### §3.3 Out-of-scope but required complement

For Change 1 to deliver, a **VRS-degradation event chain** must fire in the scenario data — e.g. patron-arms-flow reduction in Aug 1995, Krajina-corps morale collapse triggered by Operation Storm spillover, post-Storm cohesion attrition. Those are scenario-data work, not catalog work. The substrate (equipment_quality_modifiers, formation morale/cohesion attrition) all exists.

---

## §4 Irreducible BB code-gap residue

Per the BB anchor extraction (`20260521_BB_KRAJINA_COLLAPSE_ANCHORS.md` §3, "Coverage gaps"), four BB-cited operations have NO catalog/triggered-ops representation. Even under perfect VRS degradation with all three §3 changes applied, the following OSIDs cannot be delivered by any existing op:

### §4.1 The four code gaps with OSID-level residue

| BB Code Gap | OSIDs orphaned | Painted faction | Why existing ops can't deliver |
|---|---|---|---|
| **Ljeto 95 (HV/HVO, 25-29 Jul 1995, Grahovo+Glamoč)** | `op:bosansko_grahovo:bosansko_grahovo_2`, `crni_lug`, `malesevci`, `ugarci`; `op:glamoc:halapic`, `stekerovci_2` — **6 OSIDs** | HRHB | `mistral_2_95` window is w175-w190 but Ljeto 95 historically fires at **w171, four turns BEFORE mistral_2_95**. Also, mistral_2_95 requires `isWesternTheaterRuptured` (Operation Storm event), which fires Aug 4 = w172. Ljeto 95 historically fires PRE-STORM. Needs a NEW pre-Storm opportunity with window w171-w173. |
| **Donji Vakuf 1995 (ARBiH 7th Corps, 10-13 Sep 1995)** | All 10 `op:donji_vakuf:*` OSIDs (donji_vakuf_2, babin_potok_2, jemanlici, komar_2, korenici, kutanja, oborci_2, pribraca_2, prusac_2, torlakovac_2) — **10 OSIDs** | RBiH | `vlasic_ridge_95` covers Travnik-area ridge only (not Donji Vakuf town). `sana_95` is 5th Corps. No op targets ARBiH 7th Corps at Donji Vakuf. Needs NEW `donji_vakuf_95` op on `arbih_7th_corps`, window ~w178. |
| **Jajce 1995 explicit arm (HV/HVO 2nd Guards Bgde, 13 Sep)** | `op:jajce:jajce_3`, `barevo_2`, `bravnice`, `grdovo` (→RBiH), `jezero_2`, `lupnica`, `prisoje`, `vinac_2` — **8 OSIDs** | 7 HRHB + 1 RBiH | `mistral_2_95.MISTRAL_DRVAR_GRAHOVO_OBJECTIVES` (line 39-49) and `MISTRAL_SIPOVO_MRKONJIC_OBJECTIVES` (line 51-63) contain ZERO Jajce OSIDs. Legacy inert `Operation Mistral 2` in `triggered_operations.ts:505` ALSO has no Jajce objectives. **Genuine code gap**, not a regression. Either extend mistral_2_95 with a Jajce sub-axis, or author a new `jajce_95` op. |
| **Juzni Potez vs Maestral split (Mrkonjić Grad, 8-11 Oct 1995)** | `op:mrkonjic_grad:mrkonjic_grad_2`, `baljvine_2`, `bjelajce_2`, `gerzovo_2`, `majdan_2`, `podrasnica_2` — **6 OSIDs** | HRHB | `mistral_2_95` includes Mrkonjić objectives BUT conflates Maestral (Sep 8-15) with Juzni Potez (Oct 8-11). Maestral was halted SHORT of Mrkonjić; Juzni Potez actually took the town. **Conditional residue** — depends on whether mistral_2_95's dual-corps readiness sustains through October. Either split the op, or extend window with a second-phase predicate. |

### §4.2 Residue accounting

**Total irreducible-residue: ~24-30 OSIDs** (6 + 10 + 8 + 6 conditional) out of the painted Krajina gap.

Against the painted Oct 1995 gap (RS overshoot +10pp / HRHB undershoot -5.4pp / RBiH undershoot -1.6pp ≈ ~10pp net to redistribute = ~71 OSIDs of 712):
- **Sim-can-deliver from existing ops (trajectory-responsive, w/ Changes 1-3):** 28 Sana OSIDs to RBiH + 16 Mistral OSIDs to HRHB = ~44 OSIDs ≈ ~6.2pp area-weighted
- **Irreducible code-gap residue:** 24-30 OSIDs ≈ ~3.4-4.2pp area-weighted

---

## §5 Headline conclusions

### (a) Sim-can-deliver-vs-needs-new-ops territorial split

- **~6-8pp closable by trajectory tuning of existing ops** (Sana 95, Mistral 2 95) — REQUIRES Change 1 (defender-readiness predicate) AND a VRS-degradation event chain in scenario data.
- **~3-4pp irreducible code-gap residue** requiring 4 new ops: Ljeto 95, Donji Vakuf 95, Jajce arm, Juzni Potez split.

The user's hypothesis is **partially correct**: most of the painted Krajina collapse CAN emerge organically from existing ops under proper VRS degradation, but **not all of it**. The 4 BB code-gaps are real and account for ~25-30% of the painted residue.

### (b) Top 3 gating-predicate changes

1. **Add defender-corps readiness check to `enemy_weakness` on `sana_95`, `sana_95_follow_on`, `mistral_2_95`.** Use the existing pure faction-agnostic `computeCorpsOperationReadiness` helper, plus `getActiveEquipmentQualityMultiplier`. Files: `catalog_5th_corps.ts:239`, `catalog_federation_western_bosnia.ts:201`.
2. **Lower `SANA_READINESS_FLOOR` 0.40 → 0.35.** Insurance against post-Pauk exhaustion blocking the historical Aug 1995 launch. File: `catalog_5th_corps.ts:218`.
3. **Split `mistral_2_95` into `maestral_95` + `juzni_potez_95`** (or extend with a Jajce sub-axis). Avoids Maestral-Juzni-Potez conflation and unblocks Jajce.

### (c) Irreducible BB code gaps

1. **Ljeto 95** (Grahovo + Glamoč, 6 OSIDs, w171, pre-Storm) — needs NEW pre-Storm opportunity.
2. **Donji Vakuf 1995** (ARBiH 7th Corps, 10 OSIDs, w178) — needs NEW `arbih_7th_corps` opportunity.
3. **Jajce 1995 arm** (8 OSIDs, w178) — needs extension or new op.
4. **Juzni Potez Mrkonjić** (6 OSIDs, w181-w182) — needs split or window extension.

### (d) Memo confirmation

Memo exists at `F:\A-War-Without-Victory\docs\40_reports\audits\20260522_OPS_FORCE_TRAJECTORY_GATING.md` (this file). Read-only audit. No source files were modified.

---

## §6 Caveats and confidence

- **HIGH confidence:** Catalog predicate inventory (§1) — every claim is file:line cited. Mechanical answer.
- **HIGH confidence:** Root-cause classification (§2.1) — backed by H1 audit defender-power numbers and painted-compare flat-line.
- **MEDIUM confidence:** ~6-8pp trajectory closure estimate (§5a) — assumes VRS-degradation event actually fires and combat math responds. 28 + 16 = 44 OSIDs is ~6.2pp direct; cascade may double this (precedent: 14 anchor-repair flips delivered +9.7pp at 188w in n1935).
- **HIGH confidence:** Code-gap residue list (§4) — directly cross-referenced from `20260521_BB_KRAJINA_COLLAPSE_ANCHORS.md` §3.
- **JUDGMENT (not run-verified):** Whether Sana attacker stack (5-6 ARBiH 5th Corps mountain brigades at 1200-2000 personnel each, decoration-boosted) exceeds 30%-degraded VRS Krajina defender stack. Needs a run-based verification.
- **OUT OF SCOPE:** Authoring the 4 missing ops or the VRS-degradation event chain. Establishes only that they are necessary.

---

## §7 Handoff candidates

- **`/operations-expert` — to author the 4 missing ops** once approved.
- **`/scenario-creator-runner-tester` — to propose VRS-degradation events** (equipment_quality_modifier + Krajina-corps morale/cohesion). Canon-compliance-reviewed.
- **`/historian` — to confirm Aug 1995 VRS Krajina degradation magnitude** (BB1/BB2 cites for personnel attrition, equipment loss, command crisis post-Karadžić/Mladić rift).
- **`/canon-compliance-reviewer` — to bless the new `enemy_weakness` defender-readiness predicate** as faction-agnostic and not a railroad.
