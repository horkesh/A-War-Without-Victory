# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-13 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, lane tests + focused regression GREEN, 40w smoke not required (predicates inert in 40w window)
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 12 (6 events at `cea53cb1`), Wave 11 (6 events at `c406fd9c`), Wave 10 (6 events at `d59abaa4`), Wave 9-redo (6 events at `6c39b6a8`), Wave 8 (6 events at `940e92b3`), Wave 5 (7 events at `1f7b6282`), Wave 4 (10 events at `013bd633`), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (`658241df`)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-13

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **89 events** (Wave 12 close).

Post-lane catalog: **95 events** (delta +6).

Wave-12-lineage event count: **65 events**
Wave-13-lineage event count: **71 events** (65 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_post_cease_fire_recruitment_decline_RS` | Wave-9-redo mirror — RS variant of post-ceasefire recruitment droop (alliance_above used as faction-agnostic ceasefire proxy per Wave-9-redo + Wave-12 precedent) | `and`, `alliance_above`, `flag_at_least`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cost_ledger_annotation` |
| 2 | `csq_arbih_resistance_revival_RS` | Wave-11 mirror — RS variant of territory-loss resistance revival | `and`, `territory_loss_window`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `morale_change`, `cost_ledger_annotation` |
| 3 | `csq_mobilization_demographics_strained_RS` | Wave-8 mirror — RS variant of cumulative casualties + exhaustion mobilization strain (Wave 12 successor list explicit gap) | `and`, `flag_at_least`, `flag_not_set` | `narrative`, `recruitment_modifier`, `morale_change`, `cost_ledger_annotation` |
| 4 | `csq_back_channel_communication_HRHB` | Wave-4 mirror — HRHB variant of back-channel diplomatic opening | `and`, `patron_pressure_above`, `dimension_above`, `flag_not_set` | `narrative`, `negotiation_capital`, `alliance_lock`, `cost_ledger_annotation` |
| 5 | `csq_extended_truce_streak_RBiH` | NEW faction-symmetric streak — sustained alliance-above + low cumulative-casualties => recovery-side cohesion uplift (recovery counterpart to Wave-9-redo recruitment-decline; faction-symmetric mechanism) | `and`, `alliance_above`, `flag_not_set` | `narrative`, `cohesion_change`, `cost_ledger_annotation` |
| 6 | `csq_mediator_engagement_streak_RBiH` | NEW faction-symmetric streak — sustained patron-confidence above threshold + moderate war-exhaustion => negotiating-leverage accrual without full back-channel; recovery-adjacent | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `negotiation_capital`, `cost_ledger_annotation` |

## Historical anchors

1. **`csq_post_cease_fire_recruitment_decline_RS`** — RS faction-mirror of Wave-9-redo
   `csq_post_cease_fire_recruitment_decline` and Wave-12 `csq_post_cease_fire_recruitment_decline_HRHB`.
   Documented 1994-1995 VRS recruitment-droop episodes during local cease-fire
   periods around the Sarajevo and Bihac axes when the political class in Pale
   demobilized rhetoric while front-line activity continued. The engine's only
   first-class alliance is RBiH-HRHB so the alliance_above predicate is reused
   as a faction-agnostic "war activity ebbs" proxy per the Wave-9-redo and
   Wave-12 precedents. BB II Ch.43-46; Burg & Shoup 2000.
2. **`csq_arbih_resistance_revival_RS`** — RS faction-mirror of Wave-11
   `csq_arbih_resistance_revival` (RBiH progenitor) and Wave-11
   `csq_arbih_resistance_revival_HRHB`. Documented 1995 VRS rear-area morale
   surges during Croatian Operation Storm spillover and the August 1995 NATO
   Operation Deliberate Force as the RS faced existential pressure on the
   Krajina-Posavina axis. Faction-symmetric mechanism — predicate fires for
   any faction the event is parameterized against. BB II Ch.46-48.
3. **`csq_mobilization_demographics_strained_RS`** — RS faction-mirror of
   Wave-8 `csq_mobilization_demographics_strained` (RBiH progenitor) and
   Wave-12 `csq_mobilization_demographics_strained_HRHB`. Documented 1994-1995
   VRS age-class strain in the Krajina and Posavina under cumulative casualties
   and sustained exhaustion. The Wave 12 successor handoffs section explicitly
   flagged this as still missing. BB II Ch.43-49; Hoare 'How Bosnia Armed' (2004).
4. **`csq_back_channel_communication_HRHB`** — HRHB faction-mirror of Wave-4
   `csq_back_channel_communication` (RBiH progenitor). Documented HVO/Croatia
   back-channel deconfliction with Western mediators during 1993-1994 Lasva
   Valley fighting. Faction-internal causality preserved by chaining off
   HRHB patron_pressure and patron_confidence values rather than the RBiH-side
   analogue. BB II Ch.41-42; Burg & Shoup 2000 on HRHB / mediator deconfliction.
5. **`csq_extended_truce_streak_RBiH`** — NEW faction-symmetric streak event.
   Recovery-side counterpart to Wave-9-redo `csq_post_cease_fire_recruitment_decline`:
   rather than penalizing recruitment droop, models the cohesion uplift that
   accrues when an alliance threshold holds with low cumulative casualties on
   the responding-faction side. Documented 1994-1995 Federation-side cohesion
   recovery during sustained Washington-Agreement-period activity. BB II Ch.41-42;
   Burg & Shoup 2000. Anchor authored as RBiH because the alliance is the only
   first-class engine alliance; HRHB and RS variants are valid future Wave-14+
   candidates with same faction-symmetric mechanism.
6. **`csq_mediator_engagement_streak_RBiH`** — NEW faction-symmetric streak
   event. Recovery-adjacent counterpart to Wave-4 `csq_back_channel_communication`:
   models the negotiating-leverage accrual when patron-confidence holds above
   a threshold and war-exhaustion is moderate (not high enough to trigger
   the demobilization-pressure or fatigue events). Documented 1994-1995 ARBiH
   negotiating-leverage accrual during sustained patron engagement. The
   patron_pressure / patron_confidence axes used here are the same surfaces
   already exercised by Wave-4 back_channel and Wave-8/12 patron_arms_pipeline
   events. BB II Ch.43-47; Burg & Shoup 2000.

## Spec adherence

- **Ring 1 only** — every event predicate is faction-symmetric or
  faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6
  boundaries. No `enclave_resilience.ts` reference. No `rupture_consequences.ts`
  reference. No atrocity-as-tactic content.
- **No new condition kinds** — every predicate uses pre-existing kinds from
  `event_types.ts` (whitelist enforced by audit test #5 in lane suite).
- **No new effect kinds** — every effect uses pre-existing kinds from
  `event_types.ts` / `apply_effects.ts` (whitelist enforced by audit test #6).
  STOP rule respected — substrate-then-content rule honored.
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

Audit test #4 walks the predicate tree of every Wave 13 event and asserts no
condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string.
Audit test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6
enforces the no-new-effect-kinds STOP rule.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + Wave 11
+ Wave 12 precedents). The predicates themselves remain parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_13.test.ts` | **11/11 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| Focused regression `npx vitest run tests/divergence_events_wave_*.test.ts tests/consequence*.test.ts tests/divergence_events_consequences.test.ts` | **217/217 GREEN** across 15 files (Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + Wave 11 + Wave 12 + Wave 13 + 7 consequence files) |
| 40w smoke required? | **NO** — every authored event has `turn_min >= 50` and 40w runs to turn 40, so all six predicates are out-of-window in 40w by construction. Byte-stable to Wave 12 baseline. |

## Predicate inertness analysis (why Wave 13 doesn't fire in 40w)

- Event 1 (`csq_post_cease_fire_recruitment_decline_RS`): `turn_min` = 60.
- Event 2 (`csq_arbih_resistance_revival_RS`): `turn_min` = 50; relies on `territory_loss_window` over 10-turn window — 40w can in principle intersect at turn ≥ 50. **Out of 40w window.**
- Event 3 (`csq_mobilization_demographics_strained_RS`): `turn_min` = 80.
- Event 4 (`csq_back_channel_communication_HRHB`): `turn_min` = 60.
- Event 5 (`csq_extended_truce_streak_RBiH`): `turn_min` = 70.
- Event 6 (`csq_mediator_engagement_streak_RBiH`): `turn_min` = 70.

All `turn_min` values are >= 50, so a 40w (turn 40) run cannot fire any of
these. By construction, 40w hash is byte-stable to Wave 12 baseline.

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
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_patron_arms_pipeline_attenuated_HRHB` |
| `tests/divergence_events_wave_13.test.ts` | new — per-event predicate + consequence proofs + audit gates |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_13.md` | new — this file |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a
  `lapsed` sibling that violates one key clause, and asserts evaluateCondition
  is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are
  then asserted against the writer's known shape.
- Engine-truth quirks honored:
  - `dimension_above` uses `>=` despite its name (event_types.ts:536)
  - `dimension_below` uses strict `<` (event_types.ts:540)
  - `alliance_above` uses strict `>` (event_types.ts:497)
  - `morale_average_below` uses strict `<` (event_types.ts:564)
  - `flag_at_least` uses `>=` (event_types.ts:627)
  - `patron_pressure_above` reads `.override_authority` (event_types.ts:553)

## Successor handoffs (Wave 14+ candidates)

- Faction-mirror gaps not yet authored:
  - `csq_winter_supply_attrition_RS` — already exists (RS is the progenitor for that family — verified)
  - `csq_back_channel_communication_RS` — RS variant; would mirror Wave-4 progenitor on RS axis
  - `csq_demobilization_pressure_wave_RBiH`, `_HRHB` — RBiH and HRHB mirrors of Wave-3 demobilization-wave
  - `csq_extended_truce_streak_HRHB` — HRHB variant of new Wave-13 truce-streak event
  - `csq_mediator_engagement_streak_RS`, `_HRHB` — RS and HRHB variants
- Recovery-side variants not yet covered:
  - `csq_negotiation_capital_recovery` (counterpart to negotiation-capital drain events)
  - Spring-thaw recovery variant (counterpart to `csq_winter_supply_attrition`)
- STOP-gated themes deferred:
  - `csq_doctrine_drift_RS` — needs prior `corps_reorganization_active_RS` or
    `doctrine_reform_initiated_RS` progenitor; defer until substrate authored.
  - `csq_third_party_arms_channel_RS` — needs Belgrade-pipeline-attenuation
    progenitor; defer.
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
