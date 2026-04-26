# Option J — Equipment Class Promotion Proposal

**Date:** 2026-04-24
**Issue:** #13 (N1297 organizational readiness gate locks corps with 0 main_effort tier brigades into defensive stance)
**Scope:** Surgical promotion of 7 brigades in `data/source/oob_brigades.json` to unblock historically-offensive corps.

## Premise correction

Earlier diagnosis claimed "all 249 brigades have `equipment_class: unspecified`." This was **wrong**. Current distribution (from `default_equipment_class`):

| Class          | Count | `getEquipmentOffensivePriority` |
|----------------|-------|---------------------------------|
| light_infantry | 137   | 0                               |
| mountain       | 79    | 1 (active_defense)              |
| motorized      | 20    | 2 (main_effort)                 |
| mechanized     | 6     | 3 (main_effort)                 |
| police         | 5     | 0                               |
| special        | 2     | 0                               |

26 brigades already qualify for `main_effort` tier. The real problem is which corps own them.

## Corps-level diagnosis

Corps with 0 main_effort brigades (permanently locked in defensive stance by N1297):

| Faction | Corps                     | Brigades | Historical posture      |
|---------|---------------------------|----------|-------------------------|
| HRHB    | hvo_central_bosnia        | 12       | **Offensive (Ahmići 1993)** — fix required |
| HRHB    | hvo_northwest_bosnia      | 8        | Defensive (lost to VRS) — leave |
| HRHB    | hvo_tomislavgrad          | 3        | Static enclave — leave |
| RS      | vrs_east_bosnian          | 10       | **Offensive (Corridor 92)** — fix required |
| RS      | vrs_drina                 | 9        | **Offensive (Srebrenica 1995)** — fix required |
| RS      | vrs_herzegovina           | 8        | Defensive — leave |
| RBiH    | arbih_general_staff       | 2        | Elite, but `special` class (by design) — leave |
| RBiH    | arbih_2nd_corps           | 40       | **"Most offensive-capable ARBiH corps" (OOB p.109)** — fix required |
| RBiH    | arbih_3rd_corps           | 27       | **Offensive (Central Bosnia 1993)** — fix required |
| RBiH    | arbih_4th_corps           | 11       | **Offensive (Mostar 1994+)** — fix required |
| RBiH    | arbih_5th_corps           | 10       | Besieged pocket until 1995 — leave |

## Proposed promotions (6 brigades, 2.4% of force — after empirical rollback of rs_1st_zvornik)

### HRHB (+2)

| Brigade ID | Old | New | Citation |
|---|---|---|---|
| `hrhb_vitezovi_brigade_vitez` | light_infantry | **motorized** | HVO_OOB_MASTER.md:194-198 — "Elite unit, best-equipped Central Bosnia HVO, ~1,500-2,000; Ahmići Massacre participants"; HVO_OOB_MASTER.md:263-268 — Vitezovi led Ahmići attack April 16 1993 |
| `hvo_4th_guard_sinovi_posavine` | light_infantry | **motorized** | BB1 p.212 (ORBAT chart shows HVO Guards Brigades as elite formations); BB1 p.417 "all three HVO Guards brigades" characterized as "elite shock units"; consistency with 1st/2nd/3rd Guards (already mechanized). Motorized (not mechanized) reflects Posavina supply constraints |

### RS (+2)

| Brigade ID | Old | New | Citation |
|---|---|---|---|
| `rs_1st_semberija_light_infantry` | mountain | **motorized** | VRS_OOB_MASTER.md:226 — East Bosnian Corps had "Motorized/mechanized elements"; VRS_OOB_MASTER.md:64 — "Corridor 92 (June-July 1992) — Secured Posavina Corridor"; 1st Semberija was Bijeljina-based core formation |
| ~~`rs_1st_zvornik`~~ | mountain | _reverted_ | **REJECTED after empirical test.** Promotion caused Srebrenica (op:srebrenica:srebrenica_2) to fall at w40 (Jan 1993) vs. historical July 1995 (w170+). VRS Drina Corps was siege-defensive 1992-1994 per BB/OOB; only became offensive in late 1995 (Directive 7 / Operation Krivaja). Mountain class (active_defense tier) is the historically-correct posture |

### RBiH (+3)

| Brigade ID | Old | New | Citation |
|---|---|---|---|
| `arbih_9th_muslim_liberation` | light_infantry | **motorized** | ARBIH_OOB_MASTER.md:355 — "2nd Corps: 9th Muslim Liberation (Smoluca *)"; ARBIH_OOB_MASTER.md:369 — "* = elite/liberation in source"; ARBIH_OOB_MASTER.md:109 — "2nd Corps — Most offensive-capable ARBiH corps" |
| `arbih_7th_vitezka_muslim_liberation` | light_infantry | **motorized** | ARBIH_OOB_MASTER.md:126-128 — "7th Muslim Brigade: Elite shock troops, ~1,500-2,000, Most effective ARBiH infantry, some mujahideen, controversial" |
| `arbih_4th_muslim_light` | light_infantry | **motorized** | ARBIH_OOB_MASTER.md:357 — "4th Corps: 4th Muslim Light (Bradina *)" elite-marked |

## Expected behavior change

| Faction | main_effort before | main_effort after | Corps unblocked |
|---------|-------------------:|------------------:|---|
| HRHB    | 6                  | 8                 | hvo_central_bosnia (Ahmići-era blocker) |
| RS      | 14                 | 15                | vrs_east_bosnian |
| RBiH    | 6                  | 9                 | arbih_2nd_corps, arbih_3rd_corps, arbih_4th_corps |

Per-faction promotion rate: HRHB 5.0%, RS 1.2%, RBiH 2.4% — all well below the 10-15% historian-imposed ceiling.

## Deliberate non-promotions

- **HRHB Guards Brigades (special class) — not reclassified.** `special` is a game-mechanical equipment template (400 inf / high cohesion, per recruitment_types.ts:50). Changing class would mutate the recruitment template.
- **RBiH Guards + Black Swans — not reclassified.** Same reason.
- **RBiH 5th Corps (Bihać)** — historically besieged/defensive until Dudaković 1995 offensives. Leave for later iteration.
- **VRS Herzegovina Corps** — historically defensive.
- **HVO Posavina / Tomislavgrad** — historically defensive/static.

## Validation plan

1. `npx tsc --noEmit` + `npm run test:vitest` — no regressions.
2. Refresh baselines (`UPDATE_BASELINES=1 npm run sim:scenario:run:default`).
3. 188w run: expect HRHB attack orders per 188w to rise from historical ~2 toward ~20+.
