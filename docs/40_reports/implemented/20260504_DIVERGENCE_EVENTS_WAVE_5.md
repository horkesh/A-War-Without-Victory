# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-5 — Closeout

**Date:** 2026-05-04
**Status:** CLOSED — 7/7 events shipped, 250/250 focused regression GREEN
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 4 (10 events), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (event 658241df)

---

## What shipped

7 new Ring 1 / no-§6 / faction-agnostic divergence events appended to
`data/scenarios/events/consequences.json`. Total event count advances by 7
from the post-Wave-4 baseline, closing the v0.9.0 ~30-event breadth target.

| # | event_id | Theme | 1-line consequence |
|---|----------|-------|--------------------|
| 1 | `csq_arms_pipeline_disrupted` | equipment-flow chain (negative) | equipment_quality_modifier 0.92x for 30 turns + recruitment_modifier 0.95x for 30 turns; chains on `patron_arms_review_active` flag |
| 2 | `csq_captured_equipment_windfall` | equipment-flow chain (positive) | equipment_quality_modifier 1.06x for 20 turns + morale +3; predicate uses `flag_at_least(major_operation_success)` AND `territory_loss_window(RS, 2%, 6)` |
| 3 | `csq_post_dayton_arms_normalization` | equipment-flow chain (late-war) | equipment_quality_modifier 1.04x for 30 turns + supply +10 + dimension shifts; chains on `post_dayton_phase` flag |
| 4 | `csq_back_channel_communication` | negotiation/diplomatic | negotiating_leverage +5 + alliance_lock floor 0.15 (25 turns); patron-pressure + patron-confidence gated, mutex with prior firing |
| 5 | `csq_third_party_mediation_offered` | negotiation/diplomatic stretch | DECISION (engage / decline); engaging trades cohesion -3 for international_credibility +7 + standing +5; AUDIT-ONLY ledger annotation |
| 6 | `csq_doctrine_reform_initiated` | doctrine/operational (positive) | recruitment_modifier 1.08x for 25 turns + cohesion +3; gated on dimension_above(internal_cohesion, 55) AND cumulative_casualties flag ≥ 30 |
| 7 | `csq_corps_reorganization_attempted` | doctrine/operational (mixed) | cohesion -5 short-term + recruitment_modifier 1.05x for 25 turns; gated on war_exhaustion ≥ 55 AND morale_avg < 45; mutex via `corps_reorganization_active_HRHB` |

## Spec adherence

- **Ring 1 only**: every event predicate is faction-symmetric or faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6 boundaries.
- **No new condition kinds**: every predicate uses pre-existing kinds — `supply_below`, `flag_at_least`, `flag_not_set`, `flag_equals`, `dimension_above`, `dimension_below`, `patron_pressure_above`, `morale_average_below`, `alliance_below`, `territory_loss_window`, `and`.
- **No new effect kinds**: every effect uses pre-existing kinds — `equipment_quality_modifier` (reused from 658241df), `recruitment_modifier`, `cohesion_change`, `morale_change`, `supply_delta`, `alliance_lock`, `negotiation_capital`, `cost_ledger_annotation`, `narrative`. STOP rule respected.
- **AUDIT-ONLY framing applied** on `csq_third_party_mediation_offered` engage/decline branches — annotations are the canonical reckoning surface; no rupture/OOB/paint/political_controllers touch.
- **Decision events use `requires_player_response: true` + `bot_response_logic: "strategic_weighted"`** matching the Wave 4 / Mission D precedent.
- **Equipment-flow chain consumes substrate from event 658241df**. `csq_arms_pipeline_disrupted` is the structural inversion of `csq_patron_equipment_delivery_confirmed` (same kind, opposite sign); `csq_captured_equipment_windfall` is the operational counterpart; `csq_post_dayton_arms_normalization` is the late-war normalization path.

## Faction-agnostic verification

Test #10 in the lane suite walks the predicate tree of every event and asserts
no condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string —
i.e. no event's predicate fires only at a specific municipality literal.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 precedents). The predicates themselves remain
parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | Pre-existing `war_phases.ts` errors (lines 1175, 1193) from sibling agent's uncommitted edits; lane-owned files contribute no new tsc errors. |
| Lane tests `tests/divergence_events_wave_5.test.ts` | **10/10 GREEN** (1 loader sanity + 7 per-event + 1 loader audit + 1 faction-agnostic audit) |
| Focused regression (17 files: divergence + consequence + cost_ledger + event_effects + event_conditions + event_decisions + event_timing + integration + rupture + evaluate) | **250/250 GREEN** |
| 40w smoke required? | **NO** — earliest event `turn_min` is 30 (`csq_captured_equipment_windfall`), but it gates on `flag_at_least(major_operation_success)` AND a 6-turn territory_loss_window of 2%; the 40w calibration scenario hasn't been observed to satisfy a major-op success flag at this scope. Other events have `turn_min` 50+ (4 events), 60+ (1 event), 70+ (1 event), 80+ (1 event), 140+ (1 event). Expected hash-drift class: **NONE**. |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a `lapsed` sibling that violates one key clause, and asserts evaluateCondition is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are then asserted against the writer's known shape (`alliance_locks`, `recruitment_modifiers`, `equipment_quality_modifiers`, `cost_ledger_annotations`, brigade `cohesion`/`morale`, `general_supply_reserve`).
- For event 4 (`csq_back_channel_communication`): the `negotiation_capital` writer guards `if (dimension in cap)` so a missing dimension key is a no-op. The cost-ledger annotation is the canonical assertion; the dimension_shifts are payload-verified rather than applied (those flow through `evaluate_events`, not `applyEventEffects`).
- For event 2 (`csq_captured_equipment_windfall`): the `territory_loss_window` predicate reads `turn_summaries[]` (most-recent-first); the test seeds 7 entries to ensure `windowIdx = min(6, summaries.length - 1) = 6` and the loss arithmetic resolves cleanly (oldest 0.52 - latest 0.45 = 0.07 ≥ 0.02 ✓).

## Files changed

| Path | Change |
|------|--------|
| `data/scenarios/events/consequences.json` | additive — 7 new events appended after event #28 (`csq_partition_referendum_proposal`) |
| `tests/divergence_events_wave_5.test.ts` | new — 10 tests (1 loader sanity + 7 per-event + 1 loader audit + 1 faction-agnostic audit) |
| `docs/40_reports/implemented/20260504_DIVERGENCE_EVENTS_WAVE_5.md` | new — this file |

## Boundaries respected

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- AUDIT-ONLY framing applied on `csq_third_party_mediation_offered` per spec.
- Determinism preserved — additive entries; sort-stable application order in `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read time.
- Reuse of existing kinds — no new union members in `EventEffect` / `EventCondition`. STOP rule met.

## Concurrent context

Four sibling agents in flight (188w Reconstitution verification; bot-orders
instrumentation retry; Map That Scars validation; Phase 5 test review). None
claim ownership of `data/scenarios/events/consequences.json` or new event
tests; no overlap observed.

## Theme close-out

The v0.9.0 ~30-event breadth target is satisfied across:
- alliance/diplomatic chain (Mission D + R2-2 + Wave 4)
- patron/external chain (Wave 4)
- economic/logistic chain (Wave 4)
- mobilization chain (Wave 4)
- equipment-flow chain (Wave 5: 3 events)
- negotiation/diplomatic chain (Wave 5: 2 events)
- doctrine/operational chain (Wave 5: 2 events)

All chains use existing condition + effect substrate; no new effect kinds were
required after the equipment-quality-modifier substrate landed in 658241df.
