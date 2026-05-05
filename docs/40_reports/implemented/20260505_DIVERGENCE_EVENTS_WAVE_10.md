# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-10 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, 11/11 lane tests + 177/177 focused regression GREEN, 40w hash byte-identical to baseline
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 9 redo (6 events at `cbd6a0fb` lineage), Wave 8 (6 events), Wave 5 (7 events), Wave 4 (10 events), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-10

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **71 events** (Wave 9-redo close).

Post-lane catalog: **77 events** (delta +6).

Wave-9-redo-lineage event count: **47 events**
Wave-10-lineage event count: **53 events** (47 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_supply_corridor_chronic_strain_HRHB` | Wave-8 mirror — chronic supply (HRHB Posušje-Tomislavgrad) | `and`, `supply_below`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `recruitment_modifier`, `cost_ledger_annotation` |
| 2 | `csq_post_dayton_train_and_equip_RBiH` | Recovery / arms-channel — post-Dayton train-and-equip pipeline | `and`, `flag_at_least`, `alliance_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `recruitment_modifier`, `cost_ledger_annotation` |
| 3 | `csq_arbih_doctrine_modernization` | Recovery / doctrine — officer-class generational turnover | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 4 | `csq_iran_arms_channel_attenuation` | Mirror inversion — third-party channel attenuation under mediator pressure | `and`, `flag_at_least`, `patron_pressure_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cost_ledger_annotation` |
| 5 | `csq_political_split_temporary_RBiH` | Wave-8 mirror — temporary political split (RBiH variant) | `and`, `alliance_below`, `flag_at_least`, `dimension_below`, `flag_not_set` | `narrative`, `cohesion_change`, `negotiation_capital`, `cost_ledger_annotation` |
| 6 | `csq_doctrine_drift` | Counterpart — drift after reform inflection | `and`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `recruitment_modifier`, `cost_ledger_annotation` |

## Historical anchors (1-2 sentences each)

1. **csq_supply_corridor_chronic_strain_HRHB** — HRHB faction-mirror of Wave-8
   `csq_supply_corridor_chronic_strain`. Documented 1994-1995 HVO logistics
   strain on the Posušje-Tomislavgrad corridor under Croatia-side
   reorganization. BB II Ch.41-42.
2. **csq_post_dayton_train_and_equip_RBiH** — Successor to
   `csq_post_dayton_arms_normalization` with a distinct alliance-gated trigger.
   Documented late-1995/1996 Federation-framework train-and-equip pipeline
   following the Washington Agreement. Wiebes 'Intelligence and the War in
   Bosnia 1992-1995' (2002); Burg & Shoup 2000.
3. **csq_arbih_doctrine_modernization** — Documented late-war ARBiH
   officer-class generational turnover and informal doctrine evolution as the
   pre-war academy cohort gave way to wartime cadre. Hoare 'How Bosnia Armed'
   (2004); BB II Ch.43-49. Chains off Wave-8's `csq_doctrine_reform_initiated`.
4. **csq_iran_arms_channel_attenuation** — Mirror inversion of Wave-9-redo's
   `csq_third_party_arms_channel`. Documented 1995-1996 mediator-capital
   pressure on the Iran/Croatia arms channels following Dayton's signature.
   Wiebes 2002; BB II Ch.49.
5. **csq_political_split_temporary_RBiH** — RBiH faction-mirror of Wave-8
   `csq_political_split_temporary`. Documented 1993-1994 RBiH political
   fractures over Geneva and Vance-Owen direction. Burg & Shoup 2000;
   BB II Ch.32.
6. **csq_doctrine_drift** — Counterpart event to
   `csq_doctrine_reform_initiated`. Documented late-war institutional erosion
   in forces where cadre rotation outpaces reform consolidation. Hoare 2004;
   Burg & Shoup 2000.

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

Audit test #4 walks the predicate tree of every Wave 10 event and asserts no
condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string. Audit
test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6 enforces
the no-new-effect-kinds STOP rule.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8 + Wave 9-redo precedents). The
predicates themselves remain parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_10.test.ts` | **11/11 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| Focused regression `npx vitest run tests/divergence_events_wave_*.test.ts tests/consequence*.test.ts` | **177/177 GREEN** across 11 files (Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + 6 consequence files) |
| 40w smoke required? | **YES — RAN.** Run dir `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1674`. final_state_hash: `987cfe1dcdb272f8`. **Byte-identical to baseline (immediate predecessor n1672 = `987cfe1dcdb272f8`).** Hash drift class: **NONE**. Events are correctly condition-gated; predicates do not fire in 40w window. |

## Hash check (40w byte-identical to baseline)

n1674 final_state_hash: `987cfe1dcdb272f8`
Baseline (immediate predecessor n1672 on same scenario manifest hash `3649b3861a87e6ea`): `987cfe1dcdb272f8`
**MATCH**: byte-identical.

Predicate inertness analysis (why Wave 10 doesn't fire in 40w):

- Earliest `turn_min` = 60 (events 1 + 5); 40w runs to turn 40 → out of window.
- Event 2 has `turn_min` = 140; event 3 = 80; event 4 = 90; event 6 = 100.
- All events are gated on event_flags written by other events that themselves
  do not fire in 40w (`post_dayton_phase`, `doctrine_reform_initiated_RBiH`,
  `third_party_arms_channel_active_RBiH`, `war_exhaustion_x100_*`) AND
  condition compounds (mutex flags, dimension thresholds).

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
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_arbih_resistance_revival` |
| `tests/divergence_events_wave_10.test.ts` | new — 11 tests (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_10.md` | new — this file |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a
  `lapsed` sibling that violates one key clause, and asserts evaluateCondition
  is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are
  then asserted against the writer's known shape.
- Engine-truth quirks honored:
  - `dimension_above` uses `>=` despite its name (event_types.ts:536) —
    `csq_arbih_doctrine_modernization` lapsed asserts cohesion = 55 < 60
  - `dimension_below` uses strict `<` (event_types.ts:540) —
    `csq_political_split_temporary_RBiH` lapsed asserts cohesion = 50 ≥ 45
  - `alliance_above` uses strict `>` (event_types.ts:497) —
    `csq_post_dayton_train_and_equip_RBiH` lapsed asserts alliance = 0.45 ≤ 0.50
  - `patron_pressure_above` reads `.override_authority` (event_types.ts:553) —
    `csq_iran_arms_channel_attenuation` seeds `override_authority` ≥ 35
  - `negotiation_capital` writer guards `if (dimension in cap)` so a missing
    dimension key is a no-op — `international_credibility` is pre-seeded on
    the test capital fixture so event 5's effect lands

## Successor handoffs (Wave 11 candidates)

- More Wave-8/9 mirrors not yet authored: HRHB variant of
  `csq_war_exhaustion_high_streak`; RS variant of `csq_winter_supply_attrition`;
  HRHB variant of `csq_post_cease_fire_recruitment_decline`.
- More recovery-side variants: `csq_negotiation_capital_recovery` (counterpart
  to negotiation-capital drain events); seasonal supply-windfall variant
  (counterpart to `csq_winter_supply_attrition`).
- Equipment-substrate consumers beyond Wave 10: HRHB train-and-equip detail
  event; RS Belgrade-pipeline normalization variant.
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
- File ownership respected — no touch to `src/sim/`, `data/scenarios/timelines/`,
  or `src/sim/events/event_types.ts` (DO NOT MODIFY).
