# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-4 — Closeout

**Date:** 2026-05-04
**Status:** CLOSED — 10/10 events shipped, 172/172 focused regression GREEN
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (event #11)

---

## What shipped

10 new Ring 1 / no-§6 / faction-agnostic divergence events appended to
`data/scenarios/events/consequences.json`. Total event count is now **28** (18
prior + 10 new), advancing v0.9.0 closure breadth toward the ~30-event target.

| # | event_id | Theme | 1-line consequence |
|---|----------|-------|--------------------|
| 1 | `csq_separate_track_recovery` | alliance/diplomacy | Alliance recovery above 0.25 after silent drift; ceiling-locked at 0.55 for 20 turns; cohesion +2 to both alliance partners |
| 2 | `csq_alliance_reset_after_rupture` | alliance/diplomacy | Alliance resets above 0.10 after low-water-mark + joint-command collapse; floor-locked at 0.10 for 30 turns; +3 negotiating leverage to both partners |
| 3 | `csq_tripartite_federation_overture` | alliance/diplomacy stretch | Decision event (engage / decline) for tripartite federation proposal; alliance floor-lock on engage; trades international standing for negotiating leverage |
| 4 | `csq_patron_equipment_delivery_confirmed` | patron/external | +4% equipment-quality multiplier (25 turns) + supply +15 + patron confidence +5 under sustained pressure & confidence |
| 5 | `csq_international_tribunal_observation` | patron/external | International standing -7 + patron confidence -4 + AUDIT-ONLY ledger annotation; no rupture wiring |
| 6 | `csq_black_market_supply_route` | economic/logistic | Supply +20 + cohesion -3 under low supply + rear exhaustion |
| 7 | `csq_refugee_labor_mobilization` | economic/logistic | Recruitment x1.08 (25 turns) + cohesion -2 chained on prior absorption strain |
| 8 | `csq_late_war_volunteer_surge` | mobilization | Recruitment x1.12 (15 turns) + morale +2 under territory_loss_window + late exhaustion |
| 9 | `csq_reservist_exhaustion_callup` | mobilization | Recruitment x1.15 (20 turns) + cohesion -5 + morale -2 under exhaustion + low avg morale; mutex with demobilization wave |
| 10 | `csq_partition_referendum_proposal` | stretch ahistorical | Decision event (engage / refuse); engaging trades cohesion + negotiating leverage for international credibility/standing; AUDIT-ONLY ledger annotation; no OSID flips |

## Spec adherence

- **Ring 1 only**: every event predicate is faction-symmetric or faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6 boundaries.
- **No new condition kinds**: every predicate uses pre-existing kinds — `alliance_above`, `alliance_below`, `flag_at_least`, `flag_equals`, `flag_not_set`, `dimension_above`, `dimension_below`, `patron_pressure_above`, `war_crimes_above`, `morale_average_below`, `supply_below`, `displaced_in_aggregate`, `territory_loss_window`, `and`.
- **No new effect kinds**: every effect uses pre-existing kinds — `alliance_lock`, `cohesion_change`, `cost_ledger_annotation`, `morale_change`, `recruitment_modifier`, `equipment_quality_modifier`, `supply_delta`, `narrative`, `negotiation_capital`. STOP rule respected.
- **AUDIT-ONLY framing applied** on tribunal observation, partition referendum, and tripartite federation engage — annotations are the canonical reckoning surface; no rupture/OOB/paint/political_controllers touch.
- **Decision events use `requires_player_response: true` + `bot_response_logic: "strategic_weighted"`** matching the precedent established by `csq_separate_peace_overture` and `csq_patron_recovery_offer`.

## Faction-agnostic verification

Test #11 in the lane suite walks the predicate tree of every event and asserts
no condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string —
i.e. no event's predicate fires only at a specific municipality literal.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(see Mission D + R2-2 precedents). The predicate themselves remain
parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | clean (no output) |
| Lane tests `tests/divergence_events_wave_4.test.ts` | **12/12 GREEN** (10 per-event + 1 loader audit + 1 faction-agnostic audit) |
| Focused regression (10 files: divergence + consequence + cost_ledger + rupture) | **172/172 GREEN** |
| 40w smoke required? | **NO** — earliest event `turn_min` is 40, and both turn-40 events have additional aggregate predicates (displaced ≥ 80k, exhaustion ≥ 50, prior absorption strain) that the 40w calibration scenario hasn't been observed to satisfy. Expected hash-drift class: **NONE**. |

## Test design notes

- Each per-event test seeds a `fires` state that satisfies the predicate, a `lapsed` sibling that violates one key clause, and asserts evaluateCondition is true/false respectively.
- `applyEventEffects` is called directly (no rng path); state mutations are then asserted against the writer's known shape (`alliance_locks`, `recruitment_modifiers`, `equipment_quality_modifiers`, `cost_ledger_annotations`, brigade `cohesion`/`morale`, `general_supply_reserve`).
- One bug was caught and fixed during the run: `dimension_above` uses `>=` despite its name (verified at `event_types.ts:536`). The lapsed assertion for test #3 was tightened to set `effective_value = 40` so the comparison against threshold 50 reliably misses. An inline comment captures the engine truth for future readers.

## Files changed

| Path | Change |
|------|--------|
| `data/scenarios/events/consequences.json` | additive — 10 new events appended after event #18 (`csq_weapons_embargo_partial_lift`) |
| `tests/divergence_events_wave_4.test.ts` | new — 12 tests (10 per-event + 2 audits) |
| `docs/40_reports/implemented/20260504_DIVERGENCE_EVENTS_WAVE_4.md` | new — this file |

## Boundaries respected

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- AUDIT-ONLY framing applied where required (tribunal, partition, tripartite engage).
- Determinism preserved — additive entries; sort-stable application order in `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read time.
- Reuse of existing kinds — no new union members in `EventEffect` / `EventCondition`. STOP rule met.

## Concurrent context

Three sibling agents in flight (reconstitution policy review; bot-orders
instrumentation; test review Phase 4). None claim ownership of
`data/scenarios/events/consequences.json` or new event tests; no overlap
expected.
