# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-14 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, lane tests GREEN, 40w smoke not required (predicates inert in 40w window)
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 13 (6 events at `47ef3788`), Wave 12 (6 events at `cea53cb1`), Wave 11 (6 events at `c406fd9c`), Wave 10 (6 events at `d59abaa4`), Wave 9-redo (6 events at `6c39b6a8`), Wave 8 (6 events at `940e92b3`), Wave 5 (7 events at `1f7b6282`), Wave 4 (10 events at `013bd633`), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (`658241df`)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-14

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **95 events** (Wave 13 close).

Post-lane catalog: **101 events** (delta +6).

Wave-13-lineage event count: **71 events**
Wave-14-lineage event count: **77 events** (71 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_extended_truce_streak_HRHB` | Wave-13 mirror — HRHB variant of new Wave-13 truce-streak event (Wave-13 successor handoff explicitly flagged) | `and`, `alliance_above`, `flag_not_set` | `narrative`, `cohesion_change`, `cost_ledger_annotation` |
| 2 | `csq_extended_truce_streak_RS` | Wave-13 mirror — RS variant of new Wave-13 truce-streak event (Wave-13 successor handoff explicitly flagged) | `and`, `alliance_above`, `flag_not_set` | `narrative`, `cohesion_change`, `cost_ledger_annotation` |
| 3 | `csq_mediator_engagement_streak_HRHB` | Wave-13 mirror — HRHB variant of new Wave-13 mediator-streak event (Wave-13 successor handoff explicitly flagged) | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `negotiation_capital`, `cost_ledger_annotation` |
| 4 | `csq_mediator_engagement_streak_RS` | Wave-13 mirror — RS variant of new Wave-13 mediator-streak event (Wave-13 successor handoff explicitly flagged) | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `negotiation_capital`, `cost_ledger_annotation` |
| 5 | `csq_back_channel_communication_RS` | Wave-4 mirror — RS variant; closes back-channel triad (RBiH at Wave-4, HRHB at Wave-13, RS at Wave-14) | `and`, `patron_pressure_above`, `dimension_above`, `flag_not_set` | `narrative`, `negotiation_capital`, `alliance_lock`, `cost_ledger_annotation` |
| 6 | `csq_paramilitary_refusal_streak_RBiH` | NEW faction-symmetric streak — Wave-13 successor handoff #5 'paramilitary_streak_refused' ghost entry promoted to first-class. Sustained rear_pocket aggregate + moderate war-exhaustion → cohesion uplift | `and`, `paramilitary_mode_equals`, `flag_at_least`, `flag_not_set` | `narrative`, `cohesion_change`, `cost_ledger_annotation` |

## Historical anchors

1. **`csq_extended_truce_streak_HRHB`** — HRHB faction-mirror of Wave-13
   `csq_extended_truce_streak_RBiH`. Documented 1994-1995 HVO institutional
   recovery during sustained Washington-Agreement-period activity:
   compressed training cycles lengthen again on the Croat-majority axis,
   recruitment offices in West Mostar and Posusje stabilize. The
   alliance_above predicate is the only first-class engine alliance
   (RBiH-HRHB) so it serves as a faction-agnostic recovery proxy. BB II
   Ch.41-42; Burg & Shoup 2000.
2. **`csq_extended_truce_streak_RS`** — RS faction-mirror of Wave-13
   `csq_extended_truce_streak_RBiH`. Documented 1994-1995 VRS institutional
   recovery during sustained-quiet periods on the Posavina and Drina axes:
   cease-fire-streak proxy via alliance_above per Wave-9-redo + Wave-12 +
   Wave-13 precedent. BB II Ch.43-46; Burg & Shoup 2000.
3. **`csq_mediator_engagement_streak_HRHB`** — HRHB faction-mirror of
   Wave-13 `csq_mediator_engagement_streak_RBiH`. Documented 1994-1995
   HVO/Croatia mediator-channel leverage accrual during sustained Zagreb
   engagement: patron_confidence holds at "engaged" rather than
   "performative", war-exhaustion is moderate. BB II Ch.41-42; Burg &
   Shoup 2000.
4. **`csq_mediator_engagement_streak_RS`** — RS faction-mirror of Wave-13
   `csq_mediator_engagement_streak_RBiH`. Documented 1994-1995 VRS/Belgrade
   mediator-channel leverage accrual during sustained patron engagement.
   BB II Ch.43-47; Burg & Shoup 2000.
5. **`csq_back_channel_communication_RS`** — RS faction-mirror of Wave-4
   `csq_back_channel_communication` (RBiH progenitor) and Wave-13
   `csq_back_channel_communication_HRHB`. Closes the back-channel triad.
   Documented 1994-1995 VRS/Belgrade back-channel deconfliction with
   Western mediators during the Contact Group plan and Operation Deliberate
   Force-period diplomacy. BB II Ch.43-47; Burg & Shoup 2000.
6. **`csq_paramilitary_refusal_streak_RBiH`** — NEW faction-symmetric
   streak event. Wave-13 successor handoff #5 ('paramilitary_streak_refused'
   ghost entry) promoted to first-class. Models the cohesion accrual when
   the aggregate paramilitary mode (per BrigadeFormation.paramilitary_mode
   read at event_types.ts:594) holds at 'rear_pocket' and war-exhaustion
   is moderate. Anchor authored as RBiH because the recovery-side cohesion
   register is most documented on the Federation side; HRHB and RS variants
   are valid future Wave-15+ candidates. The rear_pocket mode is the
   recovery / refusal stance, NOT the offensive one — no atrocity-as-tactic
   content. BB II Ch.41-43; Hoare 'How Bosnia Armed' (2004).

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

Audit test #4 walks the predicate tree of every Wave 14 event and asserts no
condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string.
Audit test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6
enforces the no-new-effect-kinds STOP rule.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + Wave 10 + Wave 11
+ Wave 12 + Wave 13 precedents). The predicates themselves remain parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_14.test.ts` | **11/11 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| 40w smoke required? | **NO** — every authored event has `turn_min >= 60` and 40w runs to turn 40, so all six predicates are out-of-window in 40w by construction. Byte-stable to Wave 13 baseline. |

## Predicate inertness analysis (why Wave 14 doesn't fire in 40w)

- Event 1 (`csq_extended_truce_streak_HRHB`): `turn_min` = 70.
- Event 2 (`csq_extended_truce_streak_RS`): `turn_min` = 70.
- Event 3 (`csq_mediator_engagement_streak_HRHB`): `turn_min` = 70.
- Event 4 (`csq_mediator_engagement_streak_RS`): `turn_min` = 70.
- Event 5 (`csq_back_channel_communication_RS`): `turn_min` = 60.
- Event 6 (`csq_paramilitary_refusal_streak_RBiH`): `turn_min` = 70.

All `turn_min` values are >= 60, so a 40w (turn 40) run cannot fire any of
these. By construction, 40w hash is byte-stable to Wave 13 baseline.

## Sensitive-history compliance assertions

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- No `enclave_resilience.ts` touch.
- No `rupture_consequences.ts` touch.
- No `event_types.ts` modification (no new condition or effect kinds).
- No atrocity-as-tactic content. The paramilitary_refusal_streak event
  reads the rear_pocket mode (the recovery / refusal stance), NOT the
  offensive mode.
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
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_mediator_engagement_streak_RBiH` |
| `tests/divergence_events_wave_14.test.ts` | new — per-event predicate + consequence proofs + audit gates |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_14.md` | new — this file |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a
  `lapsed` sibling that violates one key clause, and asserts evaluateCondition
  is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are
  then asserted against the writer's known shape.
- Engine-truth quirks honored:
  - `dimension_above` uses `>=` despite its name (event_types.ts:536)
  - `alliance_above` uses strict `>` (event_types.ts:497)
  - `patron_pressure_above` reads `.override_authority` (event_types.ts:553)
  - `flag_at_least` uses `>=` (event_types.ts:627)
  - `paramilitary_mode_equals` aggregates over active formations:
    'offensive' if any active formation has paramilitary_mode='offensive',
    else 'rear_pocket' (event_types.ts:594)

## Wave-13 successor handoffs addressed

From the Wave-13 closeout's "Successor handoffs (Wave 14+ candidates)" list:

- [x] `csq_extended_truce_streak_HRHB` — HRHB variant of Wave-13 truce-streak. **Shipped Wave 14.**
- [x] `csq_mediator_engagement_streak_RS` — RS variant of Wave-13 mediator-streak. **Shipped Wave 14.**
- [x] `csq_mediator_engagement_streak_HRHB` — HRHB variant of Wave-13 mediator-streak. **Shipped Wave 14.**
- [x] `csq_back_channel_communication_RS` — RS variant of Wave-4 back-channel; closes triad. **Shipped Wave 14.**
- [x] `csq_paramilitary_refusal_streak_RBiH` — NEW faction-symmetric event (lane spec successor handoff #5; 'paramilitary_streak_refused' ghost entry promoted to first-class). **Shipped Wave 14.**
- (added by Wave 14) `csq_extended_truce_streak_RS` — RS variant of Wave-13 truce-streak (closes truce-streak triad alongside HRHB).

Net effect:
- Truce-streak triad: COMPLETE (RBiH at Wave-13, HRHB + RS at Wave-14).
- Mediator-streak triad: COMPLETE (RBiH at Wave-13, HRHB + RS at Wave-14).
- Back-channel triad: COMPLETE (RBiH at Wave-4, HRHB at Wave-13, RS at Wave-14).
- Demographic-strain triad was completed at Wave-13 (Wave-12 had HRHB; Wave-13 added RS).

## Successor handoffs (Wave 15+ candidates)

- Faction-mirror gaps not yet authored:
  - `csq_demobilization_pressure_wave_RBiH`, `_HRHB` — RBiH and HRHB mirrors of Wave-3 demobilization-wave (still open).
  - `csq_paramilitary_refusal_streak_HRHB`, `_RS` — HRHB and RS mirrors of new Wave-14 paramilitary-refusal-streak event.
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
