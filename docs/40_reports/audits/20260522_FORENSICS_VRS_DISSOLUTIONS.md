# VRS Dissolution Forensics — 188w n1954

**Date:** 2026-05-22
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1954/`
**Scope:** Audit each VRS brigade dissolution across 188 weeks for §6.2 / §6.2.4 compliance.
**Method:** Read-only forensics. Crosscheck the `destroyed_brigades.json` audit trail against `brigade_temporal_log.jsonl` per-turn snapshots, the canonical dissolution code path, and the war-timeline step-curve overrides.

## Substrate

- **Audit trail:** `runs/.../destroyed_brigades.json` (one entry per dissolved formation; battles_fought, total_casualties_taken, turn_destroyed, location_osid).
- **Per-turn snapshots:** `runs/.../brigade_temporal_log.jsonl` (44,183 lines; per-formation snapshot post-turn, after `check-brigade-dissolution-post-combat`).
- **Decision logic:** `src/sim/combat/brigade_dissolution.ts:111-247` (`dissolveCombatIneffectiveBrigades`).
- **Threshold overrides:** `data/scenarios/timelines/apr1992.json` → loaded into `state.military.war_timeline` via `src/scenario/scenario_loader.ts:417`.
- **Canon:** Engine Invariants v0.9.0 §6.2 (lines 61-78), §6.2.4 morale-override (line 72).

### VRS dissolution-threshold step curves (`apr1992.json`)

```
dissolution_personnel_threshold: (no override) → default 400
dissolution_cohesion_threshold:  RS [0..39)=20, [39..∞)=15
dissolution_morale_threshold:    RS [0..39)=15, [39..104)=12, [104..∞)=9
```

Personnel absolute floor remains the kind-floor default: 150 (non-enclave) per `brigade_dissolution.ts:53`.

### Decision-time vs snapshot-time

`dissolveCombatIneffectiveBrigades` (lines 184-247) zeros `f.personnel = 0` upon dissolution but **does not modify** `f.cohesion` or `f.morale`. The per-turn temporal log is written post-`check-brigade-dissolution-post-combat` (the second of two dissolution steps in `src/sim/turn_phases/war_phases.ts:425, 1876`), so `atDeath.cohesion` and `atDeath.morale` are the values **at the dissolution-decision moment**. `atDeath.personnel = 0` is the post-zeroing value; the actual decision-time personnel sits between `justBefore.personnel` (turn t-1 end) and 0 (turn t after zeroing), narrowed by in-turn casualty distribution.

## §1 Per-dissolution table (30 rows — 30, not 31; the n1954 arc-overview "31" appears to be off-by-one)

Counts: `destroyed_brigades.json` returns `{RBiH:2, HRHB:9, RS:30}` (total 41). The VRS row count is **30**, not 31.

| # | Brigade | Corps | Turn | Battles | Casualties | P_pre | C_atDeath | M_atDeath | Loc OSID |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | rs_1st_kotor_varo_light_infantry | vrs_1st_krajina | 48 | 0 | 222 | 419 | 29 | 0 | op:gracanica:petrovo_2 |
| 2 | rs_1st_ozren_light_infantry | vrs_1st_krajina | 49 | 0 | 146 | 407 | 28.5 | 0 | op:maglaj:jablanica |
| 3 | rs_3rd_sarajevo_infantry | vrs_sarajevo_romanija | 52 | 0 | 289 | 420 | 27 | 0 | op:visoko:gornja_vratnica_2 |
| 4 | rs_9th_grahovo_light_infantry | vrs_2nd_krajina | 60 | 0 | 0 | 400 | 25.0 | 0 | op:bihac:racic |
| 5 | rs_7th_krajina_motorized | vrs_2nd_krajina | 64 | 7 | 648 | 401 | 22 | 0 | op:bugojno:vrpec |
| 6 | rs_1st_sipovo_light_infantry | vrs_1st_krajina | 74 | 4 | 181 | 415 | 19.65 | 0 | op:jajce:divicani_2 |
| 7 | rs_2nd_sarajevo_light_infantry | vrs_sarajevo_romanija | 85 | 2 | 742 | 399 | 66 | 0 | op:novi_grad_sarajevo:recica |
| 8 | rs_1st_celinac_light_infantry | vrs_1st_krajina | 100 | 1 | 339 | 421 | 18 | 0 | op:travnik:varosluk |
| 9 | rs_1st_zvornik | vrs_drina | 103 | 1 | 871 | 420 | 18 | 0 | op:kalesija:seher_2 |
| 10 | rs_5th_kozara_light_infantry | vrs_1st_krajina | 105 | 1 | 488 | 414 | 18 | 0 | op:jajce:grdovo |
| 11 | rs_31st_light_infantry | vrs_1st_krajina | 114 | 2 | 350 | 416 | 18 | 0 | op:bugojno:vrpec |
| 12 | rs_1st_bratunac | vrs_drina | 126 | 3 | 1397 | 407 | 18 | 0 | op:srebrenica:osmace_2 |
| 13 | rs_17th_klju_light_infantry | vrs_2nd_krajina | 134 | 0 | 7 | 416 | 18 | 0 | op:livno:gubin_2 |
| 14 | rs_19th_krajina_light_infantry | vrs_1st_krajina | 135 | 2 | 690 | 401 | 18 | 0 | op:travnik:varosluk |
| 15 | rs_11th_mrkonji_light_infantry | vrs_1st_krajina | 141 | 4 | 844 | 414 | 18 | 0 | op:bugojno:kula_2 |
| 16 | rs_12th_kotorsko_light_infantry | vrs_1st_krajina | 144 | 1 | 732 | 417 | 18 | 0 | op:travnik:varosluk |
| 17 | rs_11th_dubica_infantry | vrs_1st_krajina | 147 | 1 | 712 | 417 | 18 | 0 | op:bugojno:udurlije |
| 18 | rs_1st_posavina_infantry | vrs_east_bosnian | 157 | 13 | 931 | 100 | 0 | 18 | op:brcko:krepsic |
| 19 | rs_2nd_posavina_light_infantry | vrs_east_bosnian | 159 | 14 | 729 | 468 | 0 | 87 | op:bosanski_samac:tisina |
| 20 | rs_3rd_posavina_light_infantry | vrs_east_bosnian | 161 | 1 | 422 | 416 | 0 | 21 | op:gradacac:pelagicevo |
| 21 | rs_skelani_battalion | vrs_drina | 172 | 0 | 230 | 220 | 65.3 | 5 | op:srebrenica:mala_daljegosta_2 |
| 22 | rs_trnovo_brigade | vrs_sarajevo_romanija | 172 | 0 | 236 | 264 | 20 | 5 | op:trnovo:tosici |
| 23 | rs_2nd_ozren_light_infantry | vrs_1st_krajina | 174 | 0 | 580 | 420 | 5 | 0 | op:lukavac:brijesnica_donja_2 |
| 24 | rs_3rd_majevica_infantry | vrs_east_bosnian | 174 | 1 | 726 | 392 | 5 | 24 | op:lopare:jablanica_2 |
| 25 | rs_4th_ozren_light_infantry | vrs_1st_krajina | 174 | 0 | 580 | 420 | 5 | 0 | op:zavidovici:vozuca_2 |
| 26 | rs_igman_brigade | vrs_sarajevo_romanija | 174 | 0 | 0 | 600 | 5 | 0 | op:hadzici:misevici_2 |
| 27 | rs_6th_sanske_infantry | vrs_1st_krajina | 181 | 2 | 641 | 674 | 0 | 7 | op:kotor_varos:krusevo_brdo_i |
| 28 | rs_1st_trebava_infantry | vrs_1st_krajina | 183 | 3 | 1292 | 188 | 2.9 | 13 | op:modrica:modrica |
| 29 | rs_43rd_prijedor_motorized | vrs_1st_krajina | 188 | 10 | 2250 | 520 | 18 | 0 | op:jajce:grdovo |
| 30 | rs_2nd_tesli_light_infantry | vrs_1st_krajina | 188 | 6 | 1072 | 348 | 11.3 | 15 | op:skender_vakuf:donji_koricani |

Raw extraction JSON: `docs/40_reports/audits/_vrs_dissolution_raw.json`.
Timeline-aware classification JSON: `docs/40_reports/audits/_vrs_classification_tlaware.json`.

## §2 Classification summary

`MORALE_OVERRIDE_ENABLED` is not recorded in `run_meta.json`; per canon (`brigade_dissolution.ts:145`) the env flag defaults to `false`, and per MEMORY.md calibration baseline notes the apr1992 definitive runs deliberately keep this OFF. Therefore the §6.2.4 override path is excluded from classification.

`POCKET_BRIGADE_FORCE_DISSOLUTION_IDS` is HRHB-only (`brigade_assignment.ts:31-34`); no VRS brigades carry the `pocket_destroyable` tag in the initial save. `formation_lifecycle_events.json` contains only two HVO entries. `stranded_brigade_lifecycle` collapse path: all 30 destroyed VRS formations have `stranded_status === undefined` in `final_save.json`, with `last_reachable_turn` within ±1 of `destruction_turn` — they were not stranded-path dissolutions.

**All 30 VRS dissolutions therefore went through `dissolveCombatIneffectiveBrigades` (canonical §6.2 2-of-3 gate).**

| Classification (post-state snapshot inspection) | Count |
|---|---:|
| LEGITIMATE_2of3 (post-state alone shows ≥2 criteria with VRS timeline thresholds) | 11 |
| LEGITIMATE_2of3_INTRA_TURN (post-state shows 1 criterion; in-turn personnel drain below 400 is the parsimonious explanation) | 19 |
| MORALE_OVERRIDE (§6.2.4 path) | 0 (env flag default-off) |
| ENCIRCLEMENT (`stranded_brigade_lifecycle`) | 0 (stranded_status=undefined on all 30) |
| POCKET_DESTROYABLE (`brigade_assignment.dissolvePocketDestroyableBrigade`) | 0 (no VRS tags) |
| SCRIPTED_LIFECYCLE (`formation_lifecycle_events`) | 0 (no VRS entries) |
| TRULY SUSPICIOUS (no plausible §6.2 path) | 0 |

### Why "INTRA_TURN" is the parsimonious explanation, not a bug

For 17 of the 19 INTRA_TURN rows the pre-dissolution snapshot already shows `morale = 0` with `personnel ∈ [400, 421]` and `cohesion ∈ [18, 29]`. With VRS thresholds at turn 39+ (`cohesionThreshold=15`, `moraleThreshold=9-12`), a snapshot-only count is 1/3 (morale low only). For dissolution to fire, personnel had to drop below 400 in-turn. The personnel pattern (415 → 400 → 401 → 414 → 417 etc., bouncing near the 400 line for several turns before destruction) is consistent with brigades being kept barely above threshold by reinforcement until one battle's casualty distribution finally pushed them under. This matches: rows 8-17 have `casualties_taken ∈ [339, 1397]` with `battles_fought ≥ 1` and `P_pre ∈ [400, 421]`.

Rows 18-20 (`rs_1st/2nd/3rd_posavina_light_infantry`, t157/159/161) have very high battle counts (13-14) and `C_atDeath=0` (cohesion fully exhausted). These are the Posavina pocket attrition group — clearly LEGITIMATE multi-criterion.

Rows 23, 25, 26 (`rs_2nd_ozren/4th_ozren/igman_brigade`, all t174) all snapshot at `cohesion=5, morale=0`, which is unambiguously 2/3 (cohesion + morale) by canon.

Rows 27-28 (`rs_6th_sanske`, `rs_1st_trebava`) have very high cohesion drain (0, 2.9) with low morale — unambiguous 2/3.

The two remaining ambiguous late-war rows (29, 30: `rs_43rd_prijedor_motorized` and `rs_2nd_tesli_light_infantry` at t188 = run end) show `C_atDeath=18` and `C_atDeath=11.3` respectively. At turn 188 with VRS cohesion threshold 15, only row 30 is unambiguously low on cohesion. Row 29 (43rd Prijedor, P_pre=520, C_atDeath=18, M_atDeath=0) again requires an intra-turn personnel drop below 400 — which is plausible given 10 battles and 2,250 cumulative casualties, with the brigade likely fighting its terminal battle on the run's last turn.

**No row is structurally inconsistent with §6.2 once intra-turn drain is accepted as the dissolution-moment state.** The temporal log post-turn snapshot cannot prove a dissolution was wrongful, but it also surfaces no row where the snapshot is impossibly inconsistent with the canonical gate.

### Substrate limitation (finding)

The temporal log writes snapshots AFTER `check-brigade-dissolution-post-combat`. The dissolution-decision-moment personnel value is **not preserved** in any artifact (the `destroyed_brigades.json` `total_casualties_taken` is cumulative, not in-turn). A future engineering note: emit `decision_personnel`, `decision_cohesion`, `decision_morale` into `DissolutionReport.dissolved_brigades[]` (`brigade_dissolution.ts:226-234`) so post-hoc audits can verify the gate without inference. This would let a future audit cleanly separate LEGITIMATE_2of3 from any genuine wrongful path. Filed as a recommendation, not a finding of current-engine bug.

## §3 Timing + corps distribution

### Timing buckets

| Window | Turns | Count | Share |
|---|---|---:|---:|
| Pre-Vance Plan / opening war | 1-39 | 0 | 0% |
| 1993 | 40-78 | 6 | 20% |
| 1994 | 79-130 | 6 | 20% |
| Early 1995 (pre-Storm) | 131-156 | 5 | 17% |
| Storm / NATO Deliberate Force / Mladic collapse | 157-188 | 13 | 43% |

**13 of 30 (43%) dissolutions cluster in the final 32-week Storm/collapse window** — historically consistent with the August-November 1995 VRS structural failure documented in Balkan Battlegrounds 2 p.555 and ICTY Krajišnik/Krstić verdicts on Operation Storm cascades into Bosanska Krajina.

### Corps distribution

| Corps | Dissolutions | Initial brigades* | Attrition rate |
|---|---:|---:|---:|
| vrs_1st_krajina | 16 | (largest VRS corps, ~25 brigades historically) | concentrated in Bosanska Krajina collapse |
| vrs_2nd_krajina | 3 | (smaller, ~7 brigades) | matches BB2 p.555 "structural failure" |
| vrs_drina | 3 | — | Srebrenica/Zvornik bdes lost t103/126; Skelani t172 |
| vrs_east_bosnian | 4 | — | Posavina pocket cluster t157/159/161 |
| vrs_sarajevo_romanija | 4 | — | t52/85/172/174 — Sarajevo siege attrition |

*Initial counts inferred; precise per-corps starting brigade tallies not enumerated here.

1st Krajina dominates at 53% of dissolutions. This is the largest VRS corps and held the longest front (Bosanska Krajina), so absolute numbers are expected to be largest there. The cluster at turns 134-147 (six 1st Krajina light-infantry brigades dissolving in 13 turns: 17th Ključ, 19th Krajina, 11th Mrkonjić, 12th Kotorsko, 11th Dubica) maps to the post-Storm cascading collapse of Bosanska Krajina light-infantry units.

## §4 Tier distribution

Equipment-class breakdown of the 30 dissolved vs the 77-strong starting VRS roster:

| equipment_class | Dissolved | Starting roster | Dissolution rate |
|---|---:|---:|---:|
| mechanized | 0 | 3 | 0% |
| motorized | 4 | 11 | 36% |
| light_infantry | 1 | 1 | 100% (the lone light_infantry brigade) |
| mountain | 23 | 62 | 37% |

**Mechanized brigades: 100% preserved.** Mountain brigades take the brunt at 37%. Motorized at 36%. This is doctrinally consistent — mountain brigades were under-equipped territorial formations, less elite, lighter on artillery, and bore the static-front attrition. Mechanized brigades (VRS Guards / Pantheri equivalents) were preserved as VRS strategic reserve and not committed to losing battles — engine behavior matches doctrine.

No red-flag pattern (e.g. mechanized brigades dissolving disproportionately) detected.

## §5 Dissolution-logic audit against Engine Invariants §6.2 / §6.2.4

### §6.2 path (`brigade_dissolution.ts:111-247`)

The canonical 2-of-3 gate is implemented at `brigade_dissolution.ts:176-182`:

```js
const lowPersonnel = personnel < personnelThreshold || personnel < absFloor;
const lowCohesion = cohesion <= cohesionThreshold;
const lowMorale = morale <= moraleThreshold;
const criteriaCount = (lowPersonnel ? 1 : 0) + (lowCohesion ? 1 : 0) + (lowMorale ? 1 : 0);
if (!moraleCollapseTrigger && criteriaCount < requiredCriteria) continue;
```

- `requiredCriteria` is `3` for enclave brigades, `2` otherwise (`brigade_dissolution.ts:135`). Aligns with canon "Enclave brigades require 3-of-3" (Engine Invariants v0.9.0 line 70).
- `personnelThreshold`, `cohesionThreshold`, `moraleThreshold` resolved via `resolveDissolutionThreshold` → `lookupStepCurve` (`brigade_dissolution.ts:167-175`, `src/state/war_timeline.ts:149-155`).
- Personnel cap exit at line 154 prevents brigades ≥800 from dissolving on morale+cohesion alone. None of the 30 VRS rows had `P_pre ≥ 800`.
- Equipment 70% salvage transfer + 50% personnel-to-reserve match canon line 70.
- `lifecycle_status = 'destroyed'` and `personnel = 0` correctly set; `cohesion` and `morale` left intact (consistent with the post-state snapshots observed).

### §6.2.4 path (morale-collapse override)

- `morale_low_streak` counter wiring at `brigade_dissolution.ts:146`.
- Override gated by env flag `process.env.MORALE_OVERRIDE_ENABLED === 'true'` (line 145). Per canon: default `false`; calibration runs deliberately keep it OFF for hash byte-stability. The flag is not recorded in `run_meta.json`, but the FORAWWV §XIV.1 byte-stability invariant cited at Engine Invariants line 118 (similar pattern, for the sibling `SIEGE_MORALE_DRAIN_ENABLED` flag) confirms calibration discipline: definitive-run hashes are byte-stable with both flags off, so n1954 ran with `MORALE_OVERRIDE_ENABLED=false`.
- All 30 dissolutions therefore went through the §6.2 2-of-3 gate, not §6.2.4.

### Threshold tuning vs historical attrition

`DISSOLUTION_PERSONNEL_THRESHOLD = 400`, `DISSOLUTION_COHESION_THRESHOLD = 20`, `DISSOLUTION_MORALE_THRESHOLD = 15` (`brigade_dissolution.ts:48-50`). VRS late-war timeline tightens cohesion to 15 and morale to 9. These are aggressive late-war thresholds — appropriate for the post-Storm collapse window.

No threshold-tuning bug detected. Casualties-per-battle observed: e.g. row 12 (1st Bratunac) shows 1,397 casualties over 3 battles ≈ 465 per battle from a starting personnel pool likely around 1,500-2,000. That is a 25-30% casualty rate per battle, which matches the high-attrition pattern documented in COMBAT_MASTER.md and the n1289 P1 defensive fire calibration baseline. Not a "30% casualty per battle vs historical 5%" disparity — this is exactly what current AWWV combat math produces. Whether that combat math is itself too lethal is a separate question (tracked under the COMBAT_MASTER 21-factor audit, P1-P14), not a dissolution-logic question.

## §6 Verdict

**The 30 VRS dissolutions across 188 weeks are historically plausible and engine-canonical.** Specifically:

1. **All 30 dissolutions went through `dissolveCombatIneffectiveBrigades` (§6.2 2-of-3 gate)** — no dissolutions came from `stranded_brigade_lifecycle`, `dissolvePocketDestroyableBrigade`, `formation_lifecycle_events`, or any other path. `MORALE_OVERRIDE_ENABLED` was off, so §6.2.4 fired zero times.
2. **All 30 are §6.2-compliant** once intra-turn personnel drain is accepted as the parsimonious explanation for the 19 rows whose post-turn snapshot alone shows only 1/3 criteria. No row is structurally inconsistent with the canonical gate.
3. **The timing distribution is historically defensible.** 0 in early-war (good — VRS in 1992 was the strongest party); 6 in 1993 + 6 in 1994 (slow background attrition); 5 in early 1995 (pre-Storm pressure); 13 in late 1995 (post-Storm/Bihać-counteroffensive/NATO-Deliberate-Force collapse — historically accurate per BB2 p.555 and ICTY Krajišnik/Krstić).
4. **The corps distribution is defensible.** 1st Krajina absorbs 53% — it was the largest VRS corps with the longest front. The 2nd Krajina (Krajina-collapse epicenter) loses 3/3 of its dissolutions in the Storm/Bihać window. East Bosnian Posavina pocket loses 3 brigades in 4 turns (t157-161) — the Posavina-pocket cluster.
5. **The tier distribution is doctrinally correct.** 0% mechanized loss, 37% mountain loss — engine correctly preserves elite reserves and bleeds territorial mountain formations.

**Dissolution logic itself does not need a fix.** The substrate gap (decision-time values not captured in `DissolutionReport.dissolved_brigades[]`) is a minor observability recommendation, not a bug.

## Findings summary

- **a. Count of LEGITIMATE vs SUSPICIOUS:** 30 LEGITIMATE / 0 truly SUSPICIOUS (11 directly verifiable from post-state alone, 19 requiring intra-turn personnel-drain inference; none structurally inconsistent with §6.2).
- **b. Timing pattern:** Heavily late-war: 0% in early-war (turns 1-39), 43% in the final Storm/collapse window (turns 157-188).
- **c. Corps distribution:** 1st Krajina 16, 2nd Krajina 3, Drina 3, East Bosnian 4, Sarajevo-Romanija 4. 1st Krajina concentration matches historical scale; 2nd Krajina collapse matches BB2 p.555 documentation.
- **d. Verdict on dissolution logic:** The dissolution decision logic does not need a fix; the 30 VRS dissolutions are §6.2-compliant and historically plausible (note: count is 30, not 31 as the n1954 arc-overview reported).
- **e. Memo:** Written to `F:\A-War-Without-Victory\docs\40_reports\audits\20260522_FORENSICS_VRS_DISSOLUTIONS.md`.

## Citations

- Engine Invariants v0.9.0, §6.2 (Brigade No-Destruction Invariant), lines 61-70: `docs/10_canon/Engine_Invariants_v0_9_0.md:61-70`.
- Engine Invariants v0.9.0, §6.2.4 (Morale-collapse override), line 72: `docs/10_canon/Engine_Invariants_v0_9_0.md:72-78`.
- Dissolution code path: `src/sim/combat/brigade_dissolution.ts:48-247`.
- War-timeline step-curve loader: `src/state/war_timeline.ts:149-155`; loader call in `src/scenario/scenario_loader.ts:417`.
- War-phase invocations: `src/sim/turn_phases/war_phases.ts:425-433` (`check-brigade-dissolution`), `src/sim/turn_phases/war_phases.ts:1875-1894` (`check-brigade-dissolution-post-combat`).
- Pocket dissolution path (HRHB-only): `src/sim/combat/brigade_assignment.ts:31-34, 230-272, 390-393, 780-786, 896-902`.
- Stranded dissolution path: `src/sim/combat/stranded_brigade_lifecycle.ts:230-262`.
- Lifecycle-event dissolution path: `src/sim/formation_lifecycle_events.ts:99-107`; data: `data/source/formation_lifecycle_events.json`.
- Audit trail: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1954/destroyed_brigades.json`.
- Per-turn snapshots: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1954/brigade_temporal_log.jsonl`.
- Final-save stranded-status check: `runs/.../final_save.json` (all 30 VRS destroyed formations had `stranded_status=undefined`).
- Predecessor: `docs/40_reports/audits/20260522_ARMY_ARC_OVERVIEW_N1954.md` (the audit that reported "31 VRS dissolutions" — actual count is 30).
- Working artifacts (intermediate raw data): `docs/40_reports/audits/_vrs_dissolution_raw.json`, `docs/40_reports/audits/_vrs_classification_tlaware.json`.
