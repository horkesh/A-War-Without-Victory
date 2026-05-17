# Brigade Dissolution Historical Anchors

Date: 2026-05-17
Plan: `docs/plans/2026-05-17-brigade-dissolution-threshold-plan.md`

Source base: this register uses the already integrated Historian audit at `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md`. It does not introduce new unsourced historical claims.

## Register

| Partition | Formation | Faction | OOB id | Week / window | Evidence | Threshold implication |
|---|---|---:|---|---:|---|---|
| `historically_destroyed` | 9th Grahovo Light Infantry | RS | `rs_9th_grahovo_light_infantry` | late war, Operation Storm/Maestral | Historian audit classifies it as combat destruction with BB1 p.455 (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:171`); OOB id at `data/source/oob_brigades.json:2472`. | Valid combat-dissolution anchor if scenario lifecycle reaches destruction. |
| `historically_reconstituted` | Cerska/Kamenica pocket forces | RBiH | no single current OOB id identified in this pass | Mar 1993 / later Srebrenica absorption | Historian audit: Cerska/Kamenica pocket forces overrun, survivors absorbed into Srebrenica defenders and later 28th Division (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:173`). | Reconstitution/administrative lineage anchor, not a simple threshold-only proof row. |
| `administratively_disbanded` | Vitezovi Brigade Vitez | HRHB | `hrhb_vitezovi_brigade_vitez` | early 1994 / after Washington Agreement | Historian audit: active/effective through autumn 1993, then absorbed administratively into 3rd HVO Guards Brigade; not destroyed in combat (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:127`, `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:132`, `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:135`, `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:137`, `data/source/oob_brigades.json:3353`). | Any sim `destroyed` lifecycle for this unit is a false-positive candidate, not evidence to tune combat destruction upward. |
| `administratively_disbanded` | ARBiH 9th Mountain Brigade | RBiH | not mapped in this pass | Oct 1993 | Historian audit: government crackdown/disbandment, not external combat destruction (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:172`, `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:179`). | Administrative lifecycle, outside threshold tuning. |
| `administratively_disbanded` | ARBiH 10th Mountain Brigade | RBiH | not mapped in this pass | Oct 1993 | Same Historian audit row as above (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:172`, `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:179`). | Administrative lifecycle, outside threshold tuning. |
| `historically_intact` | 1st Zvornik Light Infantry / Krivaja participant | RS | `rs_1st_zvornik` | July 1995 roster | OOB id exists at `data/source/oob_brigades.json:2764`; existing Krivaja tests document the calibration false-positive and expected survival in the late-war roster (`tests/krivaja_roster_phase_1.test.ts:172`). | Must not dissolve before the Krivaja-95 window. Existing VRS threshold step-curve protects this row. |
| `historically_intact` | 1st Bratunac Light Infantry / Krivaja participant | RS | `rs_1st_bratunac` | July 1995 roster | OOB id exists at `data/source/oob_brigades.json:2782`; Historian audit lists Bratunac in the Krivaja-95 participant set (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:141`). | Must not dissolve before the Krivaja-95 window. |
| `historically_intact` | Skelani Battalion / Krivaja participant | RS | `rs_skelani_battalion` | July 1995 roster | OOB id exists at `data/source/oob_brigades.json:4208`; existing Krivaja tests pin survival under the late-war morale threshold (`tests/krivaja_roster_phase_1.test.ts:204`). | Must not dissolve before the Krivaja-95 window. Existing VRS threshold step-curve protects this row. |

## Non-Anchor Correction

The 65th Protection Motorized Regiment is not a dissolution-threshold anchor in this lane. The Historian audit classifies it as a VRS Main Staff mobile reserve/fire brigade and Krivaja-95 participant, not RBiH and not a static HQ-security unit (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:158`, `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:164`, `docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md:166`). Current OOB agrees on VRS Main Staff identity (`data/source/oob_brigades.json:2959`, `data/source/oob_brigades.json:2960`, `data/source/oob_brigades.json:2962`).

## Calibration Decision

No data-side threshold change is justified by this local audit/test pass. The newly added path tests demonstrate the existing mechanism handles the specified structural paths without production edits. Scenario lifecycle verification is still required before closing the backlog row, especially for the Vitezovi false-positive candidate and the late-war RS anchor rows.
