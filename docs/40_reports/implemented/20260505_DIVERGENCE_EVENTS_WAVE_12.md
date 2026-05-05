# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-12 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, 11/11 lane tests + 206/206 focused regression GREEN, 40w hash byte-identical to baseline
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 11 (6 events at `c406fd9c` lineage), Wave 10 (6 events), Wave 9-redo (6 events), Wave 8 (6 events), Wave 5 (7 events), Wave 4 (10 events), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (`658241df`)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-12

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **83 events** (Wave 11 close).

Post-lane catalog: **89 events** (delta +6).

Wave-11-lineage event count: **59 events**
Wave-12-lineage event count: **65 events** (59 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_war_exhaustion_high_streak_HRHB` | Wave-8 mirror — sustained exhaustion + low morale (HRHB Croat-majority municipalities) | `and`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 2 | `csq_supply_corridor_chronic_strain_RBiH` | Wave-8 mirror — chronic supply (RBiH Sarajevo siege ring / central enclave corridors) | `and`, `supply_below`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `recruitment_modifier`, `cost_ledger_annotation` |
| 3 | `csq_mobilization_demographics_strained_HRHB` | Wave-8 mirror — late-war age-class strain (HRHB) | `and`, `flag_at_least`, `flag_not_set` | `narrative`, `recruitment_modifier`, `morale_change`, `cost_ledger_annotation` |
| 4 | `csq_arbih_doctrine_modernization_HRHB` | Wave-10 mirror — officer-class generational turnover (HRHB Lasva cadre) | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 5 | `csq_post_cease_fire_recruitment_decline_HRHB` | Wave-9-redo mirror — post-Washington-Agreement demobilization drift (HRHB) | `and`, `alliance_above`, `flag_at_least`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cost_ledger_annotation` |
| 6 | `csq_patron_arms_pipeline_attenuated_HRHB` | Wave-8 mirror — Croatia-pipeline attenuation under patron pressure (HRHB) | `and`, `dimension_below`, `patron_pressure_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `recruitment_modifier`, `cost_ledger_annotation` |

## Historical anchors (1-2 sentences each)

1. **csq_war_exhaustion_high_streak_HRHB** — HRHB faction-mirror of Wave-8
   `csq_war_exhaustion_high_streak` and Wave-8 `csq_war_exhaustion_high_streak_RS`.
   Documented 1994-1995 HVO manpower-pool attenuation in the Croat-majority
   municipalities of Herzegovina and central Bosnia under sustained Lasva
   Valley combat losses. Hoare 'How Bosnia Armed' (2004); BB II Ch.41-42, 49.
2. **csq_supply_corridor_chronic_strain_RBiH** — RBiH faction-mirror of Wave-8
   `csq_supply_corridor_chronic_strain` (HRHB progenitor) and Wave-9-redo
   `csq_supply_corridor_chronic_strain_RS`. Documented 1992-1995 ARBiH
   chronic supply strain in the Sarajevo siege ring, the Sarajevo-Tuzla
   corridor, and the central Bosnia enclave routes. BB II Ch.31, 43-46;
   Hoare 2004 on ARBiH logistics.
3. **csq_mobilization_demographics_strained_HRHB** — HRHB faction-mirror of
   Wave-8 `csq_mobilization_demographics_strained` (RBiH progenitor).
   Documented 1994-1995 HVO age-class strain in the Croat-majority
   municipalities — recruitment-pool attrition compounded by departure rolls
   to Croatia proper and to the Federation territories. Hoare 2004; Burg &
   Shoup 2000; BB II Ch.41-42, 49.
4. **csq_arbih_doctrine_modernization_HRHB** — HRHB faction-mirror of Wave-10
   `csq_arbih_doctrine_modernization` (RBiH progenitor). Documented late-war
   HVO informal doctrine evolution as the Lasva-cadre cohort adopted
   post-Washington Agreement training norms. The HRHB chain references
   `corps_reorganization_active_HRHB` (the existing HVO reform inflection)
   rather than `doctrine_reform_initiated_RBiH` so faction-internal causality
   is preserved. Hoare 2004; Burg & Shoup 2000; BB II Ch.42-49.
5. **csq_post_cease_fire_recruitment_decline_HRHB** — HRHB faction-mirror of
   Wave-9-redo `csq_post_cease_fire_recruitment_decline`. Documented 1994
   Washington Agreement period and intermittent local cease-fires producing
   recruitment droop on the HVO side as the political class in West Mostar
   demobilized rhetoric while the Lasva Valley front lines remained active.
   The engine's only first-class alliance is RBiH-HRHB, so the cease-fire
   framing references the post-Washington Agreement period for both factions.
   BB II Ch.41-42; Burg & Shoup 2000.
6. **csq_patron_arms_pipeline_attenuated_HRHB** — HRHB faction-mirror of Wave-8
   `csq_patron_arms_pipeline_attenuated` (RS progenitor). Documented 1994-1995
   Croatia-side patron tension affecting HV-cadre arms reliability to the HVO
   formations, parallel to the documented Belgrade-Pale tension affecting VRS
   munitions reliability captured by the RS progenitor. Reuses
   equipment_quality_modifier substrate. BB II Ch.41-42; Wiebes 'Intelligence
   and the War in Bosnia 1992-1995' (2002) on Croatia-pipeline arms-flow.

## Spec adherence

- **Ring 1 only** — every event predicate is faction-symmetric or
  faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6
  boundaries.
- **No new condition kinds** — every predicate uses pre-existing kinds —
  enforced by audit test #5 in the lane suite (whitelist of allowed kinds
  from `event_types.ts`). The whitelist matches the 31 condition kinds
  already present on the union.
- **No new effect kinds** — every effect uses pre-existing kinds — enforced
  by audit test #6 in the lane suite (whitelist of 18 allowed effect kinds
  from `event_types.ts`). STOP rule respected.
- **Faction-agnostic mechanism** — each event picks ONE responding_faction
  by default historical convention, but the underlying condition predicates
  do not branch on `if (faction === 'X')` — they read parameterized fields.
  The same predicate fires for any faction the event is authored against.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring
  / enclave_resilience.ts touch.**
- **No §6 surface** — no rupture-event content, no atrocity-recording, no
  enclave-defense codepath. `enclave_resilience_aggregate` and Srebrenica /
  Drina event flags are NOT used in this lane's predicates.
- **Determinism preserved** — additive entries; sort-stable application order
  in `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read
  time. No `Math.random` / `Date.now` / `new Date` / locale-sort /
  environment-leak.

## Faction-agnostic verification

Audit test #4 walks the predicate tree of every Wave 12 event and asserts no
condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string. Audit
test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6 enforces
the no-new-effect-kinds STOP rule.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + Wave 11
precedents). The predicates themselves remain parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_12.test.ts` | **11/11 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| Focused regression `npx vitest run tests/divergence_events_wave_*.test.ts tests/consequence*.test.ts tests/divergence_events_consequences.test.ts` | **206/206 GREEN** across 14 files (Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + Wave 11 + Wave 12 + 7 consequence files) |
| 40w smoke required? | **YES — RAN.** Run dir `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1679`. final_state_hash: `987cfe1dcdb272f8`. **Byte-identical to baseline (Wave 11 close at n1675 = `987cfe1dcdb272f8`).** Hash drift class: **NONE**. Events are correctly condition-gated; predicates do not fire in 40w window. |

## Hash check (40w byte-identical to baseline)

n1679 final_state_hash: `987cfe1dcdb272f8`
Baseline (Wave 11 close at n1675 on same scenario manifest hash `3649b3861a87e6ea`): `987cfe1dcdb272f8`
**MATCH**: byte-identical.

Predicate inertness analysis (why Wave 12 doesn't fire in 40w):

- Event 1 (`csq_war_exhaustion_high_streak_HRHB`): `turn_min` = 70; 40w runs to turn 40 → out of window.
- Event 2 (`csq_supply_corridor_chronic_strain_RBiH`): `turn_min` = 60; 40w runs to turn 40 → out of window.
- Event 3 (`csq_mobilization_demographics_strained_HRHB`): `turn_min` = 80; 40w runs to turn 40 → out of window.
- Event 4 (`csq_arbih_doctrine_modernization_HRHB`): `turn_min` = 80; chains off `corps_reorganization_active_HRHB` flag. Out of 40w window.
- Event 5 (`csq_post_cease_fire_recruitment_decline_HRHB`): `turn_min` = 60; chains off cumulative_casualties + alliance threshold. Out of 40w window.
- Event 6 (`csq_patron_arms_pipeline_attenuated_HRHB`): `turn_min` = 60; chains off patron_confidence + patron_pressure. Out of 40w window.

## Sensitive-history compliance assertions

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- No `enclave_resilience.ts` touch.
- No `event_types.ts` modification (no new condition or effect kinds).
- Determinism preserved — additive JSON entries; same `EFFECT_KIND_ORDER`
  application order; existing writers; existing cost-ledger annotation single-
  reader / single-writer contract preserved.
- Reuse of existing kinds — no new union members in `EventEffect` /
  `EventCondition`. STOP rule met (audit tests 5 + 6 enforce).
- AUDIT-ONLY framing applied where appropriate (cost_ledger_annotation
  on every event; no rupture/OOB/paint/political_controllers touch).

## Files changed

| Path | Change |
|------|--------|
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_arbih_resistance_revival_HRHB` |
| `tests/divergence_events_wave_12.test.ts` | new — 11 tests (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_12.md` | new — this file |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a
  `lapsed` sibling that violates one key clause, and asserts evaluateCondition
  is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are
  then asserted against the writer's known shape.
- Engine-truth quirks honored:
  - `dimension_above` uses `>=` despite its name (event_types.ts:536) —
    `csq_arbih_doctrine_modernization_HRHB` lapsed asserts cohesion = 55 < 60
  - `dimension_below` uses strict `<` (event_types.ts:540) —
    `csq_patron_arms_pipeline_attenuated_HRHB` lapsed asserts patron_confidence = 35 (not <35)
  - `alliance_above` uses strict `>` (event_types.ts:497) —
    `csq_post_cease_fire_recruitment_decline_HRHB` lapsed asserts alliance = 0.55 (not >0.55)
  - `morale_average_below` uses strict `<` (event_types.ts:564) —
    `csq_war_exhaustion_high_streak_HRHB` lapsed asserts morale_avg = 50 (not <50)
  - `supply_below` uses strict `<` (event_types.ts:520) —
    `csq_supply_corridor_chronic_strain_RBiH` lapsed asserts supply = 30 (not <30)
  - `flag_at_least` uses `>=` (event_types.ts:627) —
    `csq_mobilization_demographics_strained_HRHB` lapsed seeds cumulative_casualties = 55 (< 60)
  - `patron_pressure_above` reads `.override_authority` (event_types.ts:553) —
    `csq_patron_arms_pipeline_attenuated_HRHB` seeds `override_authority` ≥ 25

## Successor handoffs (Wave 13 candidates)

- Remaining cross-faction mirrors not yet authored:
  - `csq_war_exhaustion_high_streak_HRHB` — DONE THIS WAVE
  - `csq_supply_corridor_chronic_strain_RBiH` — DONE THIS WAVE
  - `csq_mobilization_demographics_strained_HRHB` — DONE THIS WAVE
  - `csq_mobilization_demographics_strained_RS` (Wave-8 mirror; not yet authored)
  - `csq_political_split_temporary_HRHB` already exists as Wave-8 progenitor `csq_political_split_temporary`; SKIP
  - `csq_doctrine_drift_RS` (would need either a prior `arms_pipeline_attenuated_active_RS` chain progenitor or a new "VRS doctrine reform attempted" progenitor first; the current `csq_doctrine_reform_initiated_RBiH` and `csq_corps_reorganization_active_HRHB` chains do not have an RS-side prior)
  - `csq_third_party_arms_channel_RS` (would need a Belgrade-pipeline-attenuation progenitor first)
- Recovery-side variants not yet covered:
  - `csq_negotiation_capital_recovery` (counterpart to negotiation-capital drain events)
  - Spring-thaw recovery variant (counterpart to `csq_winter_supply_attrition`)
  - `csq_arbih_doctrine_modernization_RS` (RS variant — needs `corps_reorganization_active_RS` progenitor; doesn't currently exist)
- Counterfactual / divergence narrative ideas (held in reserve; require careful historical anchoring before authoring):
  - `csq_mass_displacement_avoided` — counterfactual displacement-not-occurred
  - `csq_negotiated_arms_pause` — bilateral arms-channel pause when negotiation_capital high + alliance moderate
  - `csq_post_ceasefire_demobilization_voluntary` — recovery event when ceasefire predicate satisfied + war_exhaustion high
- STOP rule remains enforced — do not invent new condition or effect kinds
  without a substrate audit lane first (Equipment-Quality-Modifier precedent).

## Boundaries respected

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- AUDIT-ONLY ledger annotations on every event (cost_ledger_annotation
  effect is the canonical reckoning surface).
- Determinism preserved — additive entries; sort-stable application order in
  `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read
  time.
- Reuse of existing kinds — no new union members in `EventEffect` /
  `EventCondition`. STOP rule met.
- File ownership respected — no touch to `src/sim/`,
  `data/scenarios/timelines/`, or `src/sim/events/event_types.ts`
  (DO NOT MODIFY).
