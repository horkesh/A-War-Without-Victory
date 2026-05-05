# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-11 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, 11/11 lane tests + 195/195 focused regression GREEN, 40w hash byte-identical to baseline
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 10 (6 events at `d59abaa4` lineage), Wave 9-redo (6 events), Wave 8 (6 events), Wave 5 (7 events), Wave 4 (10 events), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (`658241df`)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-11

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **77 events** (Wave 10 close).

Post-lane catalog: **83 events** (delta +6).

Wave-10-lineage event count: **53 events**
Wave-11-lineage event count: **59 events** (53 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_winter_supply_attrition_HRHB` | Wave-8/9 mirror — winter logistics (HRHB Lasva Valley) | `and`, `supply_below`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `supply_delta`, `cost_ledger_annotation` |
| 2 | `csq_political_split_temporary_RS` | Wave-8/10 mirror — temporary political split (RS Pale-Banja Luka) | `and`, `flag_at_least`, `dimension_below`, `flag_not_set` | `narrative`, `cohesion_change`, `negotiation_capital`, `cost_ledger_annotation` |
| 3 | `csq_doctrine_drift_HRHB` | Wave-10 mirror — doctrine drift after corps reorganization (HRHB) | `and`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `recruitment_modifier`, `cost_ledger_annotation` |
| 4 | `csq_post_dayton_train_and_equip_HRHB` | Wave-10 mirror — post-Dayton train-and-equip (HRHB / Federation side) | `and`, `flag_at_least`, `alliance_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `recruitment_modifier`, `cost_ledger_annotation` |
| 5 | `csq_iran_arms_channel_attenuation_HRHB` | Wave-10 mirror — Croatia-pipeline mediator pressure (HRHB) | `and`, `flag_at_least`, `patron_pressure_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cost_ledger_annotation` |
| 6 | `csq_arbih_resistance_revival_HRHB` | Wave-9-redo mirror — existential-pressure surge (HRHB Lasva Valley) | `and`, `territory_loss_window`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `morale_change`, `cost_ledger_annotation` |

## Historical anchors (1-2 sentences each)

1. **csq_winter_supply_attrition_HRHB** — HRHB faction-mirror of Wave-8
   `csq_winter_supply_attrition` and Wave-9-redo `csq_winter_supply_attrition_RBiH`.
   Documented 1993-94 / 1994-95 HVO Lasva Valley and Posušje-Tomislavgrad winter
   supply strain under Croatia-side reorganization. BB II Ch.41-42; Hoare 'How
   Bosnia Armed' (2004) on HVO logistics.
2. **csq_political_split_temporary_RS** — Wave-8 / Wave-10 mirror — RS variant
   of `csq_political_split_temporary`. Documented 1994-1995 RS leadership
   fracture between the Pale war-party (Karadžić, Mladić) and the Banja Luka
   civilian caucus over Vance-Owen and Contact Group plan acceptance. BB II
   Ch.34, 49; Burg & Shoup 2000.
3. **csq_doctrine_drift_HRHB** — HRHB faction-mirror of Wave-10
   `csq_doctrine_drift`. Documented late-war HVO institutional erosion as the
   post-Washington Agreement reorganization cadre rotated out under sustained
   Lasva Valley combat. BB II Ch.42, 49; Burg & Shoup 2000; Hoare 2004 on HVO
   command turnover.
4. **csq_post_dayton_train_and_equip_HRHB** — HRHB faction-mirror of Wave-10
   `csq_post_dayton_train_and_equip_RBiH`. Documented late-1995/1996
   Federation-framework train-and-equip pipeline applied to HVO formations
   within the joint Federation military structure. Wiebes 'Intelligence and the
   War in Bosnia 1992-1995' (2002); Burg & Shoup 2000.
5. **csq_iran_arms_channel_attenuation_HRHB** — HRHB faction-mirror of Wave-10
   `csq_iran_arms_channel_attenuation`. Documented 1995-1996 mediator-capital
   pressure on the Croatia / HV-cadre arms channels following Dayton's
   signature, parallel to the Iran-channel pressure on the RBiH side. The
   prior-flag chain is honored (third_party_arms_channel_active_HRHB rather
   than _RBiH) — faction-internal causality preserved. Wiebes 2002; BB II
   Ch.41-42, 49.
6. **csq_arbih_resistance_revival_HRHB** — HRHB faction-mirror of Wave-9-redo
   `csq_arbih_resistance_revival`. Documented 1993-1994 HVO Lasva Valley
   defensive consolidation under sustained ARBiH pressure — Vitez, Busovača,
   and the Kiseljak pocket holdouts where existential-pressure recruitment
   surges emerged from sustained territorial regression rather than from
   political mobilization. BB II Ch.41-42; Burg & Shoup 2000 on HVO Lasva
   Valley defense doctrine.

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

Audit test #4 walks the predicate tree of every Wave 11 event and asserts no
condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string. Audit
test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6 enforces
the no-new-effect-kinds STOP rule.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10
precedents). The predicates themselves remain parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_11.test.ts` | **11/11 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| Focused regression `npx vitest run tests/divergence_events_wave_*.test.ts tests/consequence*.test.ts tests/divergence_events_consequences.test.ts` | **195/195 GREEN** across 13 files (Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + Wave 11 + 7 consequence files) |
| 40w smoke required? | **YES — RAN.** Run dir `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1675`. final_state_hash: `987cfe1dcdb272f8`. **Byte-identical to baseline (immediate predecessor n1674 = `987cfe1dcdb272f8`).** Hash drift class: **NONE**. Events are correctly condition-gated; predicates do not fire in 40w window. |

## Hash check (40w byte-identical to baseline)

n1675 final_state_hash: `987cfe1dcdb272f8`
Baseline (immediate predecessor n1674 on same scenario manifest hash `3649b3861a87e6ea`): `987cfe1dcdb272f8`
**MATCH**: byte-identical.

Predicate inertness analysis (why Wave 11 doesn't fire in 40w):

- Earliest `turn_min` = 50 (events 1 + 6); 40w runs to turn 40 → out of window.
- Event 2 has `turn_min` = 60; event 3 = 100; event 4 = 140; event 5 = 90.
- All events are gated on event_flags written by other events that themselves
  do not fire in 40w (`war_exhaustion_x100_*`, `cumulative_casualties_x100_*`,
  `corps_reorganization_active_HRHB`, `post_dayton_phase`,
  `third_party_arms_channel_active_HRHB`) AND condition compounds (mutex
  flags, dimension thresholds).
- Event 6 (`csq_arbih_resistance_revival_HRHB`) gates on `territory_loss_window`
  which requires `state.turn_summaries[]` to exceed window depth (default 10).

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
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_doctrine_drift` |
| `tests/divergence_events_wave_11.test.ts` | new — 11 tests (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_11.md` | new — this file |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a
  `lapsed` sibling that violates one key clause, and asserts evaluateCondition
  is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are
  then asserted against the writer's known shape.
- Engine-truth quirks honored:
  - `dimension_below` uses strict `<` (event_types.ts:540) —
    `csq_political_split_temporary_RS` lapsed asserts cohesion = 45 (not <45)
  - `alliance_above` uses strict `>` (event_types.ts:497) —
    `csq_post_dayton_train_and_equip_HRHB` lapsed asserts alliance = 0.5 (not >0.5)
  - `morale_average_below` uses strict `<` (event_types.ts:564) —
    `csq_doctrine_drift_HRHB` and `csq_arbih_resistance_revival_HRHB` lapsed
    assert morale_avg = 45 (not <45)
  - `supply_below` uses strict `<` (event_types.ts:520) —
    `csq_winter_supply_attrition_HRHB` lapsed asserts supply = 40 (not <40)
  - `patron_pressure_above` reads `.override_authority` (event_types.ts:553) —
    `csq_iran_arms_channel_attenuation_HRHB` seeds `override_authority` ≥ 35
  - `negotiation_capital` writer guards `if (dimension in cap)` so a missing
    dimension key is a no-op — `international_credibility` is pre-seeded on
    the test capital fixture so event 2's effect lands
  - `territory_loss_window` reads `state.turn_summaries[]` most-recent-first;
    test seeds 11 entries with index 0 latest (snap=0.10) lower than older
    snapshots (snap=0.20) so loss = past − latest = 0.10 ≥ 0.03

## Successor handoffs (Wave 12 candidates)

- More Wave-8 / Wave-9 / Wave-10 mirrors not yet authored:
  - `csq_war_exhaustion_high_streak_HRHB` (HRHB variant of Wave 8 progenitor)
  - `csq_supply_corridor_chronic_strain_RBiH` (RBiH variant — siege ring corridor)
  - `csq_doctrine_drift_RS` (RS variant — would need either prior `arms_pipeline_attenuated_active_RS` chain or a new "VRS doctrine reform attempted" progenitor first)
  - `csq_mobilization_demographics_strained_RS` and `_HRHB` (Wave-8 mirrors)
- More recovery-side variants: `csq_negotiation_capital_recovery` (counterpart
  to negotiation-capital drain events); seasonal supply-windfall variant
  (counterpart to `csq_winter_supply_attrition`); spring-thaw recovery variant.
- Equipment-substrate consumers beyond Wave 11: RS Belgrade-pipeline
  normalization variant; ARBiH munition-windfall variant.
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
