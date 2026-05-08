# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-17 — Closeout

**Date:** 2026-05-07
**Status:** CLOSED — 8/8 events shipped, lane tests 14/14 GREEN, 40w hash byte-stable
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lane:** Wave 16 (113 events at `7ad31214`) — handoffs items #1, #2, #3 addressed; additional mirror-gap closures shipped.

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-17

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **113 events** (Wave 16 close).

Post-lane catalog: **121 events** (delta +8).

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_spring_thaw_supply_recovery_HRHB` | Recovery-side — Wave-16 successor handoff #1 (closes spring-thaw triad) | `and`, `supply_below`, `flag_at_least`, `flag_not_set` | `narrative`, `supply_delta`, `cohesion_change`, `cost_ledger_annotation` |
| 2 | `csq_equipment_quality_recovery_streak_RS` | Recovery-side — Wave-16 successor handoff #2 | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 3 | `csq_equipment_quality_recovery_streak_HRHB` | Recovery-side — Wave-16 successor handoff #3 (closes equipment-quality recovery triad) | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 4 | `csq_grain_corridor_reopened_RS` | Mirror gap — Wave-3 progenitor was RBiH-only | `and`, `flag_equals`, `flag_at_least`, `flag_not_set` | `narrative`, `supply_delta`, `cost_ledger_annotation` |
| 5 | `csq_grain_corridor_reopened_HRHB` | Mirror gap — closes triad | `and`, `flag_equals`, `flag_at_least`, `flag_not_set` | `narrative`, `supply_delta`, `cost_ledger_annotation` |
| 6 | `csq_arms_pipeline_disrupted_RBiH` | Mirror gap — Wave-5 progenitor was RS-only | `and`, `supply_below`, `flag_at_least`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `recruitment_modifier`, `cost_ledger_annotation` |
| 7 | `csq_arms_pipeline_disrupted_HRHB` | Mirror gap — closes triad | `and`, `supply_below`, `flag_at_least`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `recruitment_modifier`, `cost_ledger_annotation` |
| 8 | `csq_captured_equipment_windfall_RS` | Mirror gap — Wave-5 progenitor was RBiH-only | `and`, `flag_at_least`, `territory_loss_window`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `morale_change`, `cost_ledger_annotation` |

## Historical anchors

1. **`csq_spring_thaw_supply_recovery_HRHB`** — HVO spring-thaw quartermaster relief on the Lasva Valley and Posušje-Tomislavgrad supply spine once the mountain routes reopened, 1993-1994 (BB II Ch.41-42; Hoare 'How Bosnia Armed' 2004).

2. **`csq_equipment_quality_recovery_streak_RS`** — VRS cadre rotation onto new manuals during sustained Belgrade-side training-cycle expansion, 1994-1995 (BB II Ch.43-47).

3. **`csq_equipment_quality_recovery_streak_HRHB`** — HVO cadre rotation onto Croatian-army-supplied manuals during sustained Federation-period training-cycle expansion, 1994-1995 (BB II Ch.41-42; Burg & Shoup 2000 on Federation military integration).

4. **`csq_grain_corridor_reopened_RS`** — UNHCR-coordinated humanitarian corridor reopens through the Posavina agricultural belt, 1993-1994 (BB II Ch.30-32).

5. **`csq_grain_corridor_reopened_HRHB`** — UNHCR-coordinated humanitarian corridor reopens through the Neretva and Adriatic-coast spine, 1993-1994 (BB II Ch.41-42).

6. **`csq_arms_pipeline_disrupted_RBiH`** — Iran-pipeline interdiction patterns affecting ARBiH munitions reliability, 1993-1994 (BB II Ch.30, Vrabec arms-flow research; Wiebes 'Intelligence and the War in Bosnia 1992-1995', 2002).

7. **`csq_arms_pipeline_disrupted_HRHB`** — Croatia-side pipeline interdiction patterns affecting HVO munitions reliability, 1994 (BB II Ch.41-42; Wiebes 2002).

8. **`csq_captured_equipment_windfall_RS`** — VRS capture patterns from 1992-1993 Drina and Posavina operations (BB II Ch.20-25; Hoare 'How Bosnia Armed' 2004 on early-war ARBiH equipment loss).

## Spec adherence

- **Ring 1 only** — every event predicate is faction-symmetric or faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6 boundaries. No `enclave_resilience.ts` reference. No `rupture_consequences.ts` reference. No atrocity-as-tactic content.
- **No new condition kinds** — every predicate uses pre-existing kinds from `event_types.ts` (whitelist enforced by audit test).
- **No new effect kinds** — every effect uses pre-existing kinds from `event_types.ts` / `apply_effects.ts` (whitelist enforced by audit test). STOP rule respected.
- **Faction-agnostic mechanism** — each event picks ONE responding_faction by default historical convention, but the underlying condition predicates do not branch on `if (faction === 'X')` — they read parameterized fields. The same predicate fires for any faction the event is authored against.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / enclave_resilience.ts touch.**
- **No §6 surface** — no rupture-event content, no atrocity-recording, no enclave-defense codepath.
- **Determinism preserved** — additive entries; sort-stable application order in `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read time. No `Math.random` / `Date.now` / `new Date` / locale-sort / environment-leak.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_17.test.ts` | **14/14 GREEN** (1 loader sanity + 8 per-event + 1 loader audit + 1 turn_min audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| 40w hash | **`86ebf26ae0271465`** — byte-stable to Wave-16 baseline |
| 40w smoke required? | **YES — performed.** Hash matches baseline by construction (all turn_min ≥ 50). |

## Predicate inertness analysis (why Wave 17 doesn't fire in 40w)

- Event 1 (`csq_spring_thaw_supply_recovery_HRHB`): `turn_min` = 70.
- Event 2 (`csq_equipment_quality_recovery_streak_RS`): `turn_min` = 90.
- Event 3 (`csq_equipment_quality_recovery_streak_HRHB`): `turn_min` = 90.
- Event 4 (`csq_grain_corridor_reopened_RS`): `turn_min` = 50.
- Event 5 (`csq_grain_corridor_reopened_HRHB`): `turn_min` = 50.
- Event 6 (`csq_arms_pipeline_disrupted_RBiH`): `turn_min` = 60.
- Event 7 (`csq_arms_pipeline_disrupted_HRHB`): `turn_min` = 60.
- Event 8 (`csq_captured_equipment_windfall_RS`): `turn_min` = 50.

All `turn_min` values are >= 50, so a 40w (turn 40) run cannot fire any of these. By construction, 40w hash is byte-stable to Wave 16 baseline. **VERIFIED:** post-impl `npm run sim:scenario:run:40w` returned `final_state_hash: 86ebf26ae0271465`.

## Engine-truth corrections noted

One engine-truth point reviewed during this lane:

1. **`territory_loss_window` reads `state.turn_summaries[i].territory_snapshot[faction]`, NOT `faction_territory_pct`** (`event_types.ts:667-680`). Index 0 = latest. Test seed for `csq_captured_equipment_windfall_RS` builds the array with the correct field name.

## Files changed

| Path | Change |
|------|--------|
| `data/scenarios/events/consequences.json` | additive — 8 new events appended after `csq_equipment_quality_recovery_streak_RBiH` |
| `tests/divergence_events_wave_17.test.ts` | new — per-event predicate + consequence proofs + audit gates |
| `docs/40_reports/implemented/20260507_DIVERGENCE_EVENTS_WAVE_17.md` | new — this file |

## Wave-16 successor handoffs addressed

From the Wave-16 closeout's "Successor handoffs (Wave 17+ candidates)" list:

- [x] `csq_spring_thaw_supply_recovery_HRHB` — completes spring-thaw triad. **Shipped Wave 17.**
- [x] `csq_equipment_quality_recovery_streak_RS` — completes equipment-quality-recovery triad. **Shipped Wave 17.**
- [x] `csq_equipment_quality_recovery_streak_HRHB` — completes equipment-quality-recovery triad. **Shipped Wave 17.**

Net effect:
- Spring-thaw-supply-recovery triad: **COMPLETE** (RBiH + RS at Wave-16, HRHB at Wave-17).
- Equipment-quality-recovery streak: **COMPLETE** (RBiH at Wave-16, RS + HRHB at Wave-17).
- Grain-corridor-reopened triad: **COMPLETE** (RBiH at Wave-3, RS + HRHB at Wave-17).
- Arms-pipeline-disrupted triad: **COMPLETE** (RS at Wave-5, RBiH + HRHB at Wave-17).
- Captured-equipment-windfall pair: **PARTIAL** (RBiH at Wave-5, RS at Wave-17; HRHB still open).

## Successor handoffs (Wave 18+ candidates)

- `csq_captured_equipment_windfall_HRHB` — closes captured-equipment-windfall triad.
- Civilian/refugee dimension events using existing ghost flags (`winter_held_through_turn`, `corridor_blocked_through_turn`, `arms_embargo_compliant_through_turn`, `political_unity_held_through_turn`) — verify ghost flag substrate exists in scenario consequences before consuming. Wave-15/16 carry-over.
- Faction-symmetric supply-corridor health streak events (corridor_open / closed streak triggers using `morale_low_streak`-style streak counter). Wave-15/16 carry-over.
- STOP-gated themes deferred:
  - `csq_doctrine_drift_RS` — needs prior `corps_reorganization_active_RS` or `doctrine_reform_initiated_RS` progenitor; defer until substrate authored.
  - `csq_third_party_arms_channel_RS` — needs Belgrade-pipeline-attenuation progenitor; defer.

## Saturation assessment

After Wave 17 the catalog stands at **121 events**. Faction-symmetric mirror gaps that remain (Wave-18 candidates) are now down to one specific event (`csq_captured_equipment_windfall_HRHB`) plus STOP-gated themes that require substrate-first authoring. Recovery-side coverage is now broadly complete across the spring-thaw, equipment-quality-recovery, grain-corridor, and back-channel surfaces. Wave 18 should be considered an honest assessment turn — if no clean candidate remains after dedup and substrate audit, close events-authoring for v0.9.0.

## Sensitive-history compliance assertions

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- No `enclave_resilience.ts` touch.
- No `rupture_consequences.ts` touch.
- No `event_types.ts` modification (no new condition or effect kinds).
- No atrocity-as-tactic content. The captured-equipment-windfall_RS event reads major_operation_success_RS + RBiH territory loss as triggers; no atrocity flags consumed.
- Determinism preserved — additive JSON entries; same `EFFECT_KIND_ORDER` application order; existing writers; existing cost-ledger annotation single-reader / single-writer contract preserved.
- Reuse of existing kinds — no new union members in `EventEffect` / `EventCondition`. STOP rule met (audit tests enforce).
- AUDIT-ONLY framing applied where appropriate (cost_ledger_annotation on every event; no rupture/OOB/paint/political_controllers touch).

## Boundaries respected

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- AUDIT-ONLY ledger annotations on every event (cost_ledger_annotation effect is the canonical reckoning surface).
- Determinism preserved — additive entries; sort-stable application order in `applyEventEffects`.
- Reuse of existing kinds — no new union members in `EventEffect` / `EventCondition`. STOP rule met.
- File ownership respected — no touch to `src/sim/`, `data/scenarios/timelines/`, or `src/sim/events/event_types.ts` (DO NOT MODIFY).
