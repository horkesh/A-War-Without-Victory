# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-15 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, lane tests GREEN, 40w smoke not required (predicates inert in 40w window)
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 14 (6 events at `8d6bdd87`), Wave 13 (6 events at `47ef3788`), Wave 12 (6 events at `cea53cb1`), Wave 11 (6 events at `c406fd9c`), Wave 10 (6 events at `d59abaa4`), Wave 9-redo (6 events at `6c39b6a8`), Wave 8 (6 events at `940e92b3`), Wave 5 (7 events at `1f7b6282`), Wave 4 (10 events at `013bd633`), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (`658241df`)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-15

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **101 events** (Wave 14 close).

Post-lane catalog: **107 events** (delta +6).

Wave-14-lineage event count: **77 events**
Wave-15-lineage event count: **83 events** (77 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_demobilization_pressure_wave_RBiH` | Wave-3 mirror — RBiH variant of csq_demobilization_pressure_wave (Wave-14 successor handoff) | `and`, `flag_at_least`, `patron_pressure_above`, `flag_not_set` | `narrative`, `recruitment_modifier`, `aggression_modifier`, `cost_ledger_annotation` |
| 2 | `csq_demobilization_pressure_wave_HRHB` | Wave-3 mirror — HRHB variant; closes demobilization-wave triad | `and`, `flag_at_least`, `patron_pressure_above`, `flag_not_set` | `narrative`, `recruitment_modifier`, `aggression_modifier`, `cost_ledger_annotation` |
| 3 | `csq_paramilitary_refusal_streak_HRHB` | Wave-14 mirror — HRHB variant | `and`, `paramilitary_mode_equals`, `flag_at_least`, `flag_not_set` | `narrative`, `cohesion_change`, `cost_ledger_annotation` |
| 4 | `csq_paramilitary_refusal_streak_RS` | Wave-14 mirror — RS variant; closes refusal-streak triad | `and`, `paramilitary_mode_equals`, `flag_at_least`, `flag_not_set` | `narrative`, `cohesion_change`, `cost_ledger_annotation` |
| 5 | `csq_industrial_conscription_wave_RS` | Wave-3 mirror — RS variant of csq_industrial_conscription_wave | `and`, `flag_at_least`, `territory_loss_window`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 6 | `csq_industrial_conscription_wave_HRHB` | Wave-3 mirror — HRHB variant; closes industrial-conscription triad | `and`, `flag_at_least`, `territory_loss_window`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cohesion_change`, `cost_ledger_annotation` |

## Historical anchors

1. **`csq_demobilization_pressure_wave_RBiH`** — RBiH faction-mirror of
   Wave-3 progenitor `csq_demobilization_pressure_wave` (RS). Documented
   1995 ARBiH manpower walk-back patterns under sustained Washington
   pressure during the post-Dayton period: families return to streets,
   recruitment offices reduce quotas. BB II Ch.49-55; Burg & Shoup 2000.

2. **`csq_demobilization_pressure_wave_HRHB`** — HRHB faction-mirror;
   closes the demobilization-wave triad. Documented 1995 HVO manpower
   walk-back patterns under sustained Zagreb pressure during the
   post-Washington-Agreement period. BB II Ch.41-42; Burg & Shoup 2000.

3. **`csq_paramilitary_refusal_streak_HRHB`** — HRHB faction-mirror of
   Wave-14 `csq_paramilitary_refusal_streak_RBiH`. Documented 1994-1995
   HVO integration of volunteer battalions back into the rear-area pool
   during the Washington-Agreement period. The rear_pocket mode is the
   recovery / refusal stance, NOT the offensive one — no atrocity-as-tactic
   content. BB II Ch.41-42; Hoare 'How Bosnia Armed' 2004.

4. **`csq_paramilitary_refusal_streak_RS`** — RS faction-mirror; closes
   the refusal-streak triad. Documented 1994-1995 VRS integration of
   volunteer battalions back into the rear-area pool during the Contact
   Group plan period. The rear_pocket mode is the recovery / refusal
   stance — no atrocity-as-tactic content. BB II Ch.43-47; Hoare 2004.

5. **`csq_industrial_conscription_wave_RS`** — RS faction-mirror of Wave-3
   progenitor `csq_industrial_conscription_wave` (RBiH). Documented 1995
   VRS industrial mobilization expansion under territorial pressure during
   Operation Storm and the post-Krajina collapse period. BB II Ch.49-55.

6. **`csq_industrial_conscription_wave_HRHB`** — HRHB faction-mirror;
   closes the industrial-conscription triad. Documented 1993-1994 HVO
   industrial mobilization expansion under territorial pressure during the
   Lasva-Vitez and Mostar campaigns. BB II Ch.41-42.

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

Audit test #4 walks the predicate tree of every Wave 15 event and asserts no
condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string.
Audit test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6
enforces the no-new-effect-kinds STOP rule. Audit test #3 enforces
`turn_min ≥ 50` so 40w smoke is byte-stable by construction.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + Wave 11
+ Wave 12 + Wave 13 + Wave 14 precedents). The predicates themselves remain
parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit -p tsconfig.json` | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_15.test.ts` | **12/12 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 turn_min audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| 40w smoke required? | **NO** — every authored event has `turn_min >= 50` and 40w runs to turn 40, so all six predicates are out-of-window in 40w by construction. Byte-stable to Wave 14 baseline. |

## Predicate inertness analysis (why Wave 15 doesn't fire in 40w)

- Event 1 (`csq_demobilization_pressure_wave_RBiH`): `turn_min` = 100.
- Event 2 (`csq_demobilization_pressure_wave_HRHB`): `turn_min` = 100.
- Event 3 (`csq_paramilitary_refusal_streak_HRHB`): `turn_min` = 70.
- Event 4 (`csq_paramilitary_refusal_streak_RS`): `turn_min` = 70.
- Event 5 (`csq_industrial_conscription_wave_RS`): `turn_min` = 50.
- Event 6 (`csq_industrial_conscription_wave_HRHB`): `turn_min` = 50.

All `turn_min` values are >= 50, so a 40w (turn 40) run cannot fire any of
these. By construction, 40w hash is byte-stable to Wave 14 baseline.

## Sensitive-history compliance assertions

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- No `enclave_resilience.ts` touch.
- No `rupture_consequences.ts` touch.
- No `event_types.ts` modification (no new condition or effect kinds).
- No atrocity-as-tactic content. The paramilitary_refusal_streak HRHB and
  RS events read the rear_pocket mode (the recovery / refusal stance), NOT
  the offensive mode.
- Determinism preserved — additive JSON entries; same `EFFECT_KIND_ORDER`
  application order; existing writers; existing cost-ledger annotation
  single-reader / single-writer contract preserved.
- Reuse of existing kinds — no new union members in `EventEffect` /
  `EventCondition`. STOP rule met (audit tests 5 + 6 enforce).
- AUDIT-ONLY framing applied where appropriate (cost_ledger_annotation
  on every event; no rupture/OOB/paint/political_controllers touch).

## Files changed

| Path | Change |
|------|--------|
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_paramilitary_refusal_streak_RBiH` |
| `tests/divergence_events_wave_15.test.ts` | new — per-event predicate + consequence proofs + audit gates |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_15.md` | new — this file |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a
  `lapsed` sibling that violates one key clause, and asserts evaluateCondition
  is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are
  then asserted against the writer's known shape.
- Engine-truth quirks honored:
  - `flag_at_least` uses `>=` (event_types.ts:627)
  - `patron_pressure_above` reads `.override_authority` and uses `>=`
    (event_types.ts:551-553) — note: prior wave comments inaccurately
    described this as strict `>`; the engine truth is `>=`.
  - `paramilitary_mode_equals` aggregates over active formations:
    'offensive' if any active formation has paramilitary_mode='offensive',
    else 'rear_pocket' (event_types.ts:594)
  - `territory_loss_window` reads `state.turn_summaries` most-recent-first
    (index 0 = latest); test helper builds the array in that order
    (event_types.ts:666-680).

## Wave-14 successor handoffs addressed

From the Wave-14 closeout's "Successor handoffs (Wave 15+ candidates)" list:

- [x] `csq_demobilization_pressure_wave_RBiH` — Wave-3 RBiH mirror. **Shipped Wave 15.**
- [x] `csq_demobilization_pressure_wave_HRHB` — Wave-3 HRHB mirror. **Shipped Wave 15.**
- [x] `csq_paramilitary_refusal_streak_HRHB` — Wave-14 HRHB mirror. **Shipped Wave 15.**
- [x] `csq_paramilitary_refusal_streak_RS` — Wave-14 RS mirror. **Shipped Wave 15.**

Net effect:
- Demobilization-wave triad: COMPLETE (RS at Wave-3, RBiH + HRHB at Wave-15).
- Paramilitary-refusal-streak triad: COMPLETE (RBiH at Wave-14, HRHB + RS at Wave-15).
- Industrial-conscription-wave triad: COMPLETE (RBiH at Wave-3, RS + HRHB at Wave-15) — bonus closure not on Wave-14 handoff list but adjacent and faction-agnostic.

## Successor handoffs (Wave 16+ candidates)

- Recovery-side variants not yet covered:
  - `csq_negotiation_capital_recovery` (counterpart to negotiation-capital drain events)
  - Spring-thaw recovery variant (counterpart to `csq_winter_supply_attrition`)
- Civilian / refugee dimension events using ghost observer flags (e.g.
  `winter_held_through_turn`, `corridor_blocked_through_turn`,
  `arms_embargo_compliant_through_turn`, `political_unity_held_through_turn`).
  These ghost flags exist in `data/codex/ghost_entries/` but no first-class
  consumer event has yet been authored.
- ARBiH revival mirror chain — verify HRHB / RS counterparts not yet shipped.
- Faction-symmetric supply-corridor health events (corridor_open / closed
  streak triggers).
- Faction-symmetric exhaustion / equipment-quality recovery events
  (substrate exists from Wave 3 but content side recovery half is sparse).
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
