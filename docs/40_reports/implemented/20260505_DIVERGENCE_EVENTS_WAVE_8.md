# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-8 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, 155/155 focused regression GREEN, 40w hash byte-identical
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 5 (7 events), Wave 4 (10 events), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (event 658241df)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-8

## Event count delta

The lane spec framed this as the catalog "currently at 35 events (Wave 7
baseline); target ~40-42 with this lane." That number reflects the
event-authoring lineage (Wave 4 closed at 28; Wave 5 closed at 35; Wave 6 / 7
were perf and trajectory lanes that did NOT touch consequences.json).

Pre-lane catalog (consequences.json top-level array length): **59 events**
(includes pre-Wave-4 baseline events + Mission D + R2-2 + Wave 4 + Wave 5).

Post-lane catalog: **65 events** (delta +6).

Wave-5-lineage event count: **35 events** (Wave 5 close)
Wave-8-lineage event count: **41 events** (35 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_war_exhaustion_high_streak` | mobilization/exhaustion (negative, late-war) | `and`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 2 | `csq_patron_arms_pipeline_attenuated` | equipment-flow (patron-pressure variant) | `and`, `dimension_below`, `patron_pressure_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `recruitment_modifier`, `cost_ledger_annotation` |
| 3 | `csq_supply_corridor_chronic_strain` | economic/logistic (chronic strain) | `and`, `supply_below`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `recruitment_modifier`, `cost_ledger_annotation` |
| 4 | `csq_mobilization_demographics_strained` | mobilization (late-war demographic) | `and`, `flag_at_least`, `flag_not_set` | `narrative`, `recruitment_modifier`, `morale_change`, `cost_ledger_annotation` |
| 5 | `csq_political_split_temporary` | faction-internal political | `and`, `alliance_below`, `flag_at_least`, `dimension_below`, `flag_not_set` | `narrative`, `cohesion_change`, `negotiation_capital`, `cost_ledger_annotation` |
| 6 | `csq_winter_supply_attrition` | logistic/operational (seasonal) | `and`, `supply_below`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `supply_delta`, `cost_ledger_annotation` |

## Historical anchors (1-2 sentences each)

1. **csq_war_exhaustion_high_streak** — Documented late-1994 / 1995 ARBiH
   manpower-pool attenuation as cumulative cohorts rotated through casualty
   lists. Hoare, *How Bosnia Armed* (2004); BB II Ch.49.
2. **csq_patron_arms_pipeline_attenuated** — Documented late-1994 Belgrade-Pale
   tension attenuating VRS munitions reliability. Distinct from the formal
   patron-arms-review writer; models a quieter de-rating of the pipeline. BB II
   Ch.34, Vrabec arms-flow research.
3. **csq_supply_corridor_chronic_strain** — Documented 1994-1995 HVO logistics
   strain on the Posušje-Tomislavgrad corridor under Croatia-side
   reorganization. BB II Ch.41-42.
4. **csq_mobilization_demographics_strained** — Documented 1995 ARBiH age-class
   strain following two years of mobilization. Hoare 2004; Burg & Shoup 2000.
5. **csq_political_split_temporary** — Documented 1993-1994 Croat Defence
   Council political fractures over Washington Agreement direction. BB II
   Ch.41; Burg & Shoup 2000.
6. **csq_winter_supply_attrition** — Documented 1992-93 / 1993-94 winter VRS
   supply strain at altitude (Sarajevo siege rotation logistics). BB II Ch.31.

## Spec adherence

- **Ring 1 only**: every event predicate is faction-symmetric or
  faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6
  boundaries.
- **No new condition kinds**: every predicate uses pre-existing kinds —
  enforced by audit test #5 in the lane suite (whitelist of allowed kinds
  from `event_types.ts`). The whitelist matches the 31 condition kinds
  already present on the union.
- **No new effect kinds**: every effect uses pre-existing kinds — enforced by
  audit test #6 in the lane suite (whitelist of 18 allowed effect kinds from
  `event_types.ts`). STOP rule respected.
- **Faction-agnostic mechanism**: each event picks ONE responding_faction by
  default historical convention, but the underlying condition predicates do
  not branch on `if (faction === 'X')` — they read parameterized fields. The
  same predicate fires for any faction the event is authored against.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring /
  enclave_resilience.ts touch.**
- **No §6 surface**: no rupture-event content, no atrocity-recording, no
  enclave-defense codepath. `enclave_resilience_aggregate` and Srebrenica /
  Drina event flags are NOT used in this lane's predicates.
- **Determinism preserved**: additive entries; sort-stable application order in
  `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read
  time. No `Math.random` / `Date.now` / `new Date` / locale-sort /
  environment-leak.

## Faction-agnostic verification

Audit test #4 walks the predicate tree of every Wave 8 event and asserts no
condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string. Audit
test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6 enforces
the no-new-effect-kinds STOP rule.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 precedents). The predicates themselves
remain parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_8.test.ts` | **11/11 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| Focused regression `npx vitest run tests/divergence_events_wave_*.test.ts tests/consequence*.test.ts` | **155/155 GREEN** across 9 files (Wave 4 + Wave 5 + Wave 8 + 6 consequence files) |
| 40w smoke required? | **YES — RAN.** Run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1650`. final_state_hash: `ef03ab4d6c5ecd28`. **Byte-identical to baseline (Wave 7 napkin entry n1640/n1649).** Hash drift class: **NONE**. Events are correctly condition-gated; predicates do not fire in 40w window. |

## Hash check (40w byte-identical to baseline)

n1650 final_state_hash: `ef03ab4d6c5ecd28`
Baseline (Wave 7 napkin n1640/n1649): `ef03ab4d6c5ecd28`
**MATCH**: byte-identical.

Predicate inertness analysis (why Wave 8 doesn't fire in 40w):
- Earliest `turn_min` = 50 (events 5 + 6); 40w runs to turn 40 → out of window.
- Events 1, 2, 3 have `turn_min` ≥ 60.
- Event 4 has `turn_min` = 80.
- All events are gated on event_flags written by other events that themselves
  do not fire in 40w (`cumulative_casualties_x100_*`, `war_exhaustion_x100_*`)
  AND condition compounds (mutex flags, dimension thresholds).

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
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_corps_reorganization_attempted` |
| `tests/divergence_events_wave_8.test.ts` | new — 11 tests (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_8.md` | new — this file |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a
  `lapsed` sibling that violates one key clause, and asserts evaluateCondition
  is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are
  then asserted against the writer's known shape.
- Engine-truth quirks honored:
  - `dimension_above` uses `>=` despite its name (event_types.ts:536)
  - `dimension_below` uses strict `<` (event_types.ts:540) — lapsed
    assertions tighten thresholds accordingly to reliably miss
  - `patron_pressure_above` reads `.override_authority` not `.support_level`
    (event_types.ts:553)
  - `negotiation_capital` writer guards `if (dimension in cap)` so a missing
    dimension key is a no-op — `international_credibility` is pre-seeded on
    the test capital fixture so event 5's effect lands

## Successor handoffs (Wave 9 candidates)

- **Wave 9 candidates (Ring 1 / no §6 / additive)**:
  - Faction-mirror inversion of selected Wave 8 events (e.g. RS variant of
    `csq_war_exhaustion_high_streak`, RBiH variant of
    `csq_winter_supply_attrition`, HRHB variant of
    `csq_mobilization_demographics_strained`) — predicates are
    faction-agnostic; mirroring is a low-risk additive lane.
  - Recovery / positive-side mobilization events (post-cease-fire
    demobilization wave precedent — `csq_demobilization_pressure_wave`
    already exists; could add `csq_post_cease_fire_recruitment_decline`).
  - Black-market patron channel positive variant (`csq_third_party_arms_offer`
    chained on patron_confidence drop — equipment-flow positive uplift in
    response to attenuation).
  - Doctrine-fatigue inverse pair to `csq_doctrine_reform_initiated`
    (`csq_doctrine_drift` — long static engagement → cohesion drift, not yet
    authored).
- **Equipment substrate consumer events beyond #11** (Croatia pipeline, Iran
  flights, post-Dayton train-and-equip detail) — Wave 5 closed three
  equipment-flow events; Wave 8 added one more (event 2 here); more remain.
- **STOP rule remains enforced**: do not invent new condition or effect kinds
  without a substrate audit lane first (Equipment-Quality-Modifier
  precedent). If a Wave 9 event needs new substrate, STOP-AND-ASK.

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
- File ownership respected — no touch to `src/sim/combat/osid_graph_analysis.ts`
  (Wave 8 Lane B), `src/ui/map/` (Wave 8 Lane D),
  `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md`
  (Wave 8 Lane A), or `src/sim/events/event_types.ts` (DO NOT MODIFY).

## Concurrent context

Three sibling Wave 8 lanes in flight per spec file-ownership table:
- Lane B: `osid_graph_analysis` inner-loop optimization
- Lane D: force-quality glow on tactical map
- Lane A: officer-casualty-mult Phase 0 panel

None claim ownership of `data/scenarios/events/consequences.json`,
`tests/divergence_events_*.test.ts`, or new event tests; no overlap observed.
