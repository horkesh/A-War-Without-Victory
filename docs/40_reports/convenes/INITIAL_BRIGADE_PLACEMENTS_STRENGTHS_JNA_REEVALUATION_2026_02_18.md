# Initial Brigade Placements, Strengths, and JNA Heavy Brigades — Reevaluation

**Date:** 2026-02-18  
**Type:** Investigation / Reevaluation  
**Scope:** Phase II start, OOB-based scenarios (e.g. `apr1992_definitive_52w`), initial formations, equipment composition, placement.

---

## 1. Summary

- **Placements:** Initial brigade placement uses one HQ settlement per municipality (`municipalityHqSettlement[home_mun]`). All brigades in the same municipality share that HQ; no per-brigade or per-corps differentiation. Acceptable for current design; optional improvement: distinct placements for key heavy brigades if historical fidelity requires it.
- **Initial strength (personnel):** Mandatory brigades created via `runBotRecruitment` get `effectiveManpower = min(brigade.manpower_cost, pool)`, with a floor of `MIN_MANDATORY_SPAWN` (200) to spawn at all. Typical `manpower_cost` is 800 (`MIN_BRIGADE_SPAWN`). So initial personnel is 800 (or less if pool is thin). Reinforcement then tops brigades toward `MAX_BRIGADE_PERSONNEL`. As designed.
- **JNA heavy brigades — finding:** **They are not correctly represented** when the scenario uses **recruitment_mode: "player_choice"** and **init_formations_oob: true**. In that path, formations are created by `runBotRecruitment` → `buildRecruitedFormation` → `buildBrigadeComposition(equipClass)` using **generic** `EQUIPMENT_CLASS_TEMPLATES` (mechanized: 12 tanks, 6 artillery; motorized: 4 tanks, 4 artillery). RS-specific JNA inheritance (40 tanks, 30 artillery per Systems Manual §3 and `equipment_effects.ts` DEFAULT_COMPOSITION) is **not** applied to these formations, because composition is set at creation from the template. So RS mechanized/motorized OOB brigades start with 12/6 or 4/4 instead of the canon 40/30.

---

## 2. How initial formations are created (definitive scenario)

For `apr1992_definitive_52w`:

- `start_phase: "phase_ii"`, `init_formations_oob: true`, `recruitment_mode: "player_choice"`.
- `createOobFormations()` is called; with `player_choice` it runs `runBotRecruitment()` (mandatory + elective), **not** `createOobFormationsAtPhaseIEntry()`.
- **Mandatory** brigades: built with `buildRecruitedFormation(brigade, brigade.default_equipment_class, effectiveManpower, ...)`. Composition comes from `buildBrigadeComposition(default_equipment_class)` → `EQUIPMENT_CLASS_TEMPLATES[equipClass]`.
- **Elective** brigades: same; composition from equipment class template.

So every RS brigade (mechanized or motorized) gets:

- **mechanized:** 800 infantry, 12 tanks, 6 artillery (template).
- **motorized:** 850 infantry, 4 tanks, 4 artillery (template).

Canon (Systems Manual §3, `equipment_effects.ts`): RS default 800 infantry, **40 tanks, 30 artillery** (JNA inheritance). That default is only used in `ensureBrigadeComposition(formation)` when `formation.composition` is **missing** — i.e. when formations are created by `createOobFormationsAtPhaseIEntry()` (no composition set). So the **only** path that currently gives RS the heavy profile is the one that does **not** use runBotRecruitment (e.g. scenarios with no player_choice or with `no_initial_brigade_formations` and deferred creation).

---

## 3. OOB data (RS heavy units)

In `data/source/oob_brigades.json`, RS has multiple brigades with `default_equipment_class` **mechanized** or **motorized**, e.g.:

- **Mechanized:** rs_1st_armored, rs_2nd_armored, rs_1st_sarajevo_mechanized, …
- **Motorized:** rs_1st_guards_motorized, rs_16th_krajina_motorized, rs_27th_derventa_motorized, rs_43rd_prijedor_motorized, …

These are the JNA-heavy units. With the current recruitment path they receive the **generic** mechanized (12/6) or motorized (4/4) template, not the RS 40/30 profile.

---

## 4. Placements

- `hq_sid` is set from `municipalityHqSettlement[brigade.home_mun]` (or fallback from `resolveValidHqSid`). One settlement per municipality; all brigades in that municipality share the same HQ.
- No per-brigade or per-corps offset. For Banja Luka (many brigades), they all share the same HQ settlement. Acceptable unless we want distinct historical positions for specific heavy units.

---

## 5. Recommendations

1. **JNA heavy (RS composition):** When creating formations from OOB (either via `runBotRecruitment` or via `createOobFormationsAtPhaseIEntry`), apply a **faction + equipment-class override** for RS:
   - If faction is RS and `default_equipment_class` is **mechanized** or **motorized**, set composition to the RS JNA-heavy profile (e.g. 800 infantry, 40 tanks, 30 artillery, 5 aa_systems from `DEFAULT_COMPOSITION.RS`) instead of the generic template.
   - Keep generic templates for RS mountain/light_infantry and for other factions.
   - Implementation options: (a) in `buildRecruitedFormation` / `buildBrigadeComposition`, pass faction and use RS override for mechanized/motorized; or (b) after creating formations in runBotRecruitment, for each RS formation with mechanized/motorized, set `formation.composition` to the RS default; or (c) central helper that returns composition(faction, equipmentClass) with RS override.

2. **Placement:** No change required for current design. If historical placement of specific heavy brigades is later required, extend placement logic (e.g. per-brigade or per-corps overrides in OOB or scenario).

3. **Personnel:** Keep current rule (effectiveManpower from pool, floor MIN_MANDATORY_SPAWN; reinforcement tops up). No change.

4. **Canon/spec:** Phase II Spec §12 already notes that JNA equipment transfer to RS is not implemented and RS brigades receive default composition from equipment_effects. This reevaluation clarifies that in the **player_choice + runBotRecruitment** path they actually receive the **generic** template, not the RS default. Updating the implementation note to mention the recruitment-path gap and the recommended override would keep canon accurate.

---

## 6. References

- `src/sim/recruitment_engine.ts`: `runBotRecruitment`, `buildRecruitedFormation`, mandatory branch (effectiveManpower, buildBrigadeComposition(equipClass)).
- `src/state/recruitment_types.ts`: `EQUIPMENT_CLASS_TEMPLATES` (mechanized 12/6, motorized 4/4).
- `src/sim/phase_ii/equipment_effects.ts`: `DEFAULT_COMPOSITION` (RS 40/30), `ensureBrigadeComposition`.
- `src/scenario/oob_phase_i_entry.ts`: `createOobFormationsAtPhaseIEntry` (personnel MIN_BRIGADE_SPAWN, no composition).
- Systems Manual §3: default profiles by faction; RS 40 tanks, 30 artillery.
- Phase II Spec §12: JNA transfer not implemented; RS default from equipment_effects.
