# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-16 — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, lane tests 12/12 GREEN, 40w smoke not required (predicates inert in 40w window)
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lane:** Wave 15 at `e43c4abc` (107 events) — handoffs items #1 (recovery-side variants) and #4 (equipment-quality recovery half) addressed.

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-16

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **107 events** (Wave 15 close).

Post-lane catalog: **113 events** (delta +6).

Wave-15-lineage event count: **83 events**
Wave-16-lineage event count: **89 events** (83 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_negotiating_capital_recovery_RBiH` | Recovery-side — Wave-15 successor handoff #1 (negotiation-capital recovery half) | `and`, `patron_pressure_above`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `negotiation_capital`, `cost_ledger_annotation` |
| 2 | `csq_negotiating_capital_recovery_RS` | Recovery-side — RS variant; closes recovery-leverage triad | `and`, `patron_pressure_above`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `negotiation_capital`, `cost_ledger_annotation` |
| 3 | `csq_negotiating_capital_recovery_HRHB` | Recovery-side — HRHB variant; closes recovery-leverage triad | `and`, `patron_pressure_above`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `negotiation_capital`, `cost_ledger_annotation` |
| 4 | `csq_spring_thaw_supply_recovery_RBiH` | Recovery-side — Wave-15 successor handoff #1 (spring-thaw counterpart to winter_supply_attrition) | `and`, `supply_below`, `flag_at_least`, `flag_not_set` | `narrative`, `supply_delta`, `cohesion_change`, `cost_ledger_annotation` |
| 5 | `csq_spring_thaw_supply_recovery_RS` | Recovery-side — RS variant; closes spring-thaw pair (RBiH + RS — HRHB winter variant exists at Wave-3, HRHB spring-thaw is a future Wave-17 candidate) | `and`, `supply_below`, `flag_at_least`, `flag_not_set` | `narrative`, `supply_delta`, `cohesion_change`, `cost_ledger_annotation` |
| 6 | `csq_equipment_quality_recovery_streak_RBiH` | Recovery-side — Wave-15 successor handoff #4 (equipment-quality recovery half — substrate from Wave-3) | `and`, `dimension_above`, `flag_at_least`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cohesion_change`, `cost_ledger_annotation` |

## Historical anchors

1. **`csq_negotiating_capital_recovery_RBiH`** — RBiH negotiating-leverage recovery. Documented 1995 ARBiH leverage recovery during sustained Washington-Agreement period. BB II Ch.49-55; Holbrooke 'To End a War' 1998; Burg & Shoup 2000.

2. **`csq_negotiating_capital_recovery_RS`** — RS faction-mirror. Documented 1995 RS leverage recovery during Contact-Group / pre-Dayton period under sustained Belgrade pressure. BB II Ch.49-55.

3. **`csq_negotiating_capital_recovery_HRHB`** — HRHB faction-mirror; closes recovery-leverage triad. Documented 1994-1995 HVO leverage recovery during Washington-Agreement / Federation-period sustained Zagreb pressure. BB II Ch.41-42; Burg & Shoup 2000.

4. **`csq_spring_thaw_supply_recovery_RBiH`** — Recovery counterpart to Wave-8/Wave-9-redo winter supply attrition triad. Documented 1993 / 1994 ARBiH spring-thaw quartermaster relief into central enclaves once mountain routes reopened. BB II Ch.31; Hoare 'How Bosnia Armed' 2004.

5. **`csq_spring_thaw_supply_recovery_RS`** — RS faction-mirror. Documented 1993 / 1994 VRS spring-thaw quartermaster relief into the high country once mountain routes reopened. BB II Ch.31, eastern theatre logistics.

6. **`csq_equipment_quality_recovery_streak_RBiH`** — Equipment-quality recovery half on the existing Wave-3 substrate. Distinct from `csq_arbih_doctrine_modernization` (gates on doctrine_reform_initiated flag) and `csq_post_dayton_train_and_equip_RBiH` (gates on post-Dayton normalization) — this event gates only on patron-confidence + paused offensive (the ordinary recovery half rather than a structural inflection). Documented 1994-1995 ARBiH cadre rotation onto new manuals during sustained Federation-period training-cycle expansion. BB II Ch.41-43; Hoare 2004.

## Spec adherence

- **Ring 1 only** — every event predicate is faction-symmetric or faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6 boundaries. No `enclave_resilience.ts` reference. No `rupture_consequences.ts` reference. No atrocity-as-tactic content.
- **No new condition kinds** — every predicate uses pre-existing kinds from `event_types.ts` (whitelist enforced by audit test in lane suite).
- **No new effect kinds** — every effect uses pre-existing kinds from `event_types.ts` / `apply_effects.ts` (whitelist enforced by audit test). STOP rule respected — substrate-then-content rule honored.
- **Faction-agnostic mechanism** — each event picks ONE responding_faction by default historical convention, but the underlying condition predicates do not branch on `if (faction === 'X')` — they read parameterized fields. The same predicate fires for any faction the event is authored against.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / enclave_resilience.ts touch.**
- **No §6 surface** — no rupture-event content, no atrocity-recording, no enclave-defense codepath. `enclave_resilience_aggregate` and Srebrenica / Drina event flags are NOT used in this lane's predicates.
- **Determinism preserved** — additive entries; sort-stable application order in `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read time. No `Math.random` / `Date.now` / `new Date` / locale-sort / environment-leak.

## Engine-truth corrections noted

Two engine-truth points reviewed during this lane (relative to predecessor inline test commentary):

1. **`dimension_above` uses `>=`, not strict `>`** (`event_types.ts:535-537`). Lapsed test for `csq_negotiating_capital_recovery_RS` uses `patron_confidence: 54` (which fails the `>=55` check), not 55. Documented in test file inline comment.
2. **`applyNegotiationBreakdown` writes only to `neg.capital[faction][dimension]`** (`apply_effects.ts:268-280`). `negotiating_leverage` lives on `strategic_dimensions`, NOT on `capital`. Therefore `negotiation_capital` effects targeting `negotiating_leverage` are no-ops at the writer level; the player-facing accounting lands via `dimension_shifts` on the event (a separate code path) and via the cost-ledger annotation. The test asserts on the cost-ledger annotation (the canonical reckoning surface) rather than on a leverage delta. Documented in test file inline comment.

These match Wave-15's engine-truth correction note (`patron_pressure_above` is `>=` not strict `>`).

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit -p tsconfig.json` | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_16.test.ts` | **12/12 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 turn_min audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| 40w smoke required? | **NO** — every authored event has `turn_min >= 50` and 40w runs to turn 40, so all six predicates are out-of-window in 40w by construction. Byte-stable to Wave 15 baseline. |

## Predicate inertness analysis (why Wave 16 doesn't fire in 40w)

- Event 1 (`csq_negotiating_capital_recovery_RBiH`): `turn_min` = 80.
- Event 2 (`csq_negotiating_capital_recovery_RS`): `turn_min` = 80.
- Event 3 (`csq_negotiating_capital_recovery_HRHB`): `turn_min` = 80.
- Event 4 (`csq_spring_thaw_supply_recovery_RBiH`): `turn_min` = 70.
- Event 5 (`csq_spring_thaw_supply_recovery_RS`): `turn_min` = 70.
- Event 6 (`csq_equipment_quality_recovery_streak_RBiH`): `turn_min` = 90.

All `turn_min` values are `>= 50`, so a 40w (turn 40) run cannot fire any of these. By construction, 40w hash is byte-stable to Wave 15 baseline.

## Sensitive-history compliance assertions

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention (verified by audit test #4).
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- No `enclave_resilience.ts` touch.
- No `rupture_consequences.ts` touch.
- No `event_types.ts` modification (no new condition or effect kinds).
- No atrocity-as-tactic content. All six events model recovery / leverage / supply rebound mechanics on Federation, RS, and HRHB sides; none gate on offensive paramilitary mode or atrocity flags.
- Determinism preserved — additive JSON entries; same `EFFECT_KIND_ORDER` application order; existing writers; existing cost-ledger annotation single-reader / single-writer contract preserved.
- Reuse of existing kinds — no new union members in `EventEffect` / `EventCondition`. STOP rule met (audit tests enforce).
- AUDIT-ONLY framing applied where appropriate (cost_ledger_annotation on every event; no rupture/OOB/paint/political_controllers touch).

## Files changed

| Path | Change |
|------|--------|
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_industrial_conscription_wave_HRHB` |
| `tests/divergence_events_wave_16.test.ts` | new — per-event predicate + consequence proofs + audit gates |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_16.md` | new — this file |

## Wave-15 successor handoffs addressed

From the Wave-15 closeout's "Successor handoffs (Wave 16+ candidates)" list:

- [x] **Recovery-side variants — `csq_negotiation_capital_recovery`** — Shipped Wave 16 as RBiH + RS + HRHB triad (`csq_negotiating_capital_recovery_RBiH/RS/HRHB`).
- [x] **Recovery-side variants — spring-thaw counterpart to `csq_winter_supply_attrition`** — Shipped Wave 16 as RBiH + RS pair (`csq_spring_thaw_supply_recovery_RBiH/RS`). HRHB variant deferred to Wave-17 (the winter HRHB variant is at Wave-3 already; the spring-thaw HRHB completion is a one-off mirror).
- [x] **Equipment-quality recovery half** — Shipped Wave 16 as RBiH variant (`csq_equipment_quality_recovery_streak_RBiH`). RS and HRHB mirrors are Wave-17 candidates.

Net effect:
- Negotiating-capital-recovery triad: **COMPLETE** (RBiH + RS + HRHB at Wave-16).
- Spring-thaw-supply-recovery pair: **PARTIAL** (RBiH + RS at Wave-16; HRHB is Wave-17 candidate).
- Equipment-quality-recovery streak: **PARTIAL** (RBiH at Wave-16; RS + HRHB are Wave-17 candidates).

## Successor handoffs (Wave 17+ candidates)

- `csq_spring_thaw_supply_recovery_HRHB` — completes spring-thaw triad.
- `csq_equipment_quality_recovery_streak_RS` and `csq_equipment_quality_recovery_streak_HRHB` — completes equipment-quality-recovery triad.
- Civilian/refugee dimension events using existing ghost flags (`winter_held_through_turn`, `corridor_blocked_through_turn`, `arms_embargo_compliant_through_turn`, `political_unity_held_through_turn`) — verify ghost flag substrate exists in scenario consequences before consuming. Wave-15 carry-over.
- Faction-symmetric supply-corridor health streak events (corridor_open / closed streak triggers using `morale_low_streak`-style streak counter). Wave-15 carry-over.
- Continue mirror-gap closure: grep for any single-faction event ids that should have multi-faction counterparts (e.g. `csq_grain_corridor_reopened` is RBiH-only).
- STOP-gated themes deferred:
  - `csq_doctrine_drift_RS` — needs prior `corps_reorganization_active_RS` or `doctrine_reform_initiated_RS` progenitor; defer until substrate authored.
  - `csq_third_party_arms_channel_RS` — needs Belgrade-pipeline-attenuation progenitor; defer.
- STOP rule remains enforced — do not invent new condition or effect kinds without a substrate audit lane first (Equipment-Quality-Modifier precedent).

## Boundaries respected

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- AUDIT-ONLY ledger annotations on every event (cost_ledger_annotation effect is the canonical reckoning surface).
- Determinism preserved — additive entries; sort-stable application order in `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read time.
- Reuse of existing kinds — no new union members in `EventEffect` / `EventCondition`. STOP rule met.
- File ownership respected — no touch to `src/sim/`, `data/scenarios/timelines/`, or `src/sim/events/event_types.ts` (DO NOT MODIFY).
