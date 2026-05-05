# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-9-REDO — Closeout

**Date:** 2026-05-05
**Status:** CLOSED — 6/6 events shipped, 11/11 lane tests + 166/166 focused regression GREEN, 40w hash byte-identical to baseline (in isolation)
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 9 first attempt (verdict-only at `cbd6a0fb`), Wave 8 (6 events at `940e92b3`), Wave 5 (7 events), Wave 4 (10 events), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (`658241df`)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-9-REDO

## Why a redo

The first Wave 9 attempt reported 11/11 lane tests + 166/166 focused regression
GREEN at peak, but its events JSON additions to `consequences.json` AND its
test file were both lost from the git index between the agent's stage call and
the parent's commit phase. Stable artifacts were never produced. The
verdict-only report at `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_9.md`
preserved the event names + design intent. This redo lane authors fresh per
that intent.

The redo is dispatched solo (not parallel) with a verify-before-exit check
mandated in the lane spec.

## Event count delta

Pre-lane catalog (consequences.json top-level array length): **65 events**
(Wave 8 close — pre-Wave-4 baseline + Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8).

Post-lane catalog: **71 events** (delta +6).

Wave-8-lineage event count: **41 events** (Wave 8 close)
Wave-9-redo-lineage event count: **47 events** (41 + 6)

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_war_exhaustion_high_streak_RS` | Wave-8 mirror — exhaustion (RS variant) | `and`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 2 | `csq_supply_corridor_chronic_strain_RS` | Wave-8 mirror — chronic supply (RS Posavina/Brčko) | `and`, `supply_below`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `recruitment_modifier`, `cost_ledger_annotation` |
| 3 | `csq_winter_supply_attrition_RBiH` | Wave-8 mirror — winter logistics (RBiH siege ring) | `and`, `supply_below`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `supply_delta`, `cost_ledger_annotation` |
| 4 | `csq_post_cease_fire_recruitment_decline` | Recovery / political — demobilization slope | `and`, `alliance_above`, `flag_at_least`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cost_ledger_annotation` |
| 5 | `csq_third_party_arms_channel` | Recovery / equipment-flow — alternate pipeline | `and`, `dimension_below`, `patron_pressure_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cost_ledger_annotation` |
| 6 | `csq_arbih_resistance_revival` | Recovery / morale-revival — existential-pressure surge | `and`, `territory_loss_window`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `morale_change`, `cost_ledger_annotation` |

## Historical anchors (1-2 sentences each)

1. **csq_war_exhaustion_high_streak_RS** — Mirror of Wave 8
   `csq_war_exhaustion_high_streak`. Documented late-1994 / 1995 VRS
   manpower-pool attenuation as Croatian and joint-federation operations
   expanded the casualty list. BB II Ch.49; Hoare on cross-faction late-war
   demographic strain.
2. **csq_supply_corridor_chronic_strain_RS** — Mirror of Wave 8
   `csq_supply_corridor_chronic_strain`. Documented 1994-1995 VRS Posavina
   corridor strain (Brčko bottleneck) under sustained ARBiH/HVO pressure on
   the corridor's flanks. BB II Ch.34.
3. **csq_winter_supply_attrition_RBiH** — Mirror of Wave 8
   `csq_winter_supply_attrition`. Documented 1992-93 / 1993-94 winter ARBiH
   supply strain in the Sarajevo siege ring and central Bosnia enclaves;
   cohesion drain under cold-weather logistics squeeze. BB II Ch.31.
4. **csq_post_cease_fire_recruitment_decline** — Documented 1994 Washington
   Agreement period and intermittent local cease-fires producing recruitment
   droop as the political class demobilized rhetoric while the front lines
   remained active. BB II Ch.41-42; Burg & Shoup 2000.
5. **csq_third_party_arms_channel** — Documented Iran flights (1994-1995),
   Croatia-pipeline arrangements, and mujahideen / volunteer arms channels
   emerging as primary patron pipelines registered pressure or suspension. BB
   II Ch.30, 49; Wiebes (2002) on covert arms flows.
6. **csq_arbih_resistance_revival** — Documented enclave-defender morale
   surges under sustained territory loss (Bihać 1994-95, Goražde defense
   doctrine). Recruitment surge tied to existential pressure rather than
   political mobilization. BB II Ch.43-46.

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
  time. No `Math.random` / `Date.now` / `new Date` / locale-sort / environment-leak.

## Faction-agnostic verification

Audit test #4 walks the predicate tree of every Wave 9-redo event and asserts
no condition contains a hardcoded `osid`, `from_osid`, or `to_osid` string.
Audit test #5 enforces the no-new-condition-kinds STOP rule. Audit test #6
enforces the no-new-effect-kinds STOP rule.

`responding_faction` is set per-event because the engine requires a canonical
responder for the bot auto-respond path; this is the established convention
(Mission D + R2-2 + Wave 4 + Wave 5 + Wave 8 precedents). The predicates
themselves remain parameterized.

## Verification gates

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` (project) | **clean** (no output) |
| Lane tests `tests/divergence_events_wave_9.test.ts` | **11/11 GREEN** (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| Focused regression `npx vitest run tests/divergence_events_wave_*.test.ts tests/consequence*.test.ts` | **166/166 GREEN** across 10 files (Wave 4 + Wave 5 + Wave 8 + Wave 9-redo + 6 consequence files) |
| 40w smoke required? | **YES — RAN.** First run with concurrent Lane A (OCM Phase 1 redo) modifications in working tree produced drift `4d2a55f6afa75254` ≠ baseline `ef03ab4d6c5ecd28`; isolation re-run with Lane A's `attack_post_battle_effects.ts` + `officer_quality_update.ts` stashed produced n1664 hash `ef03ab4d6c5ecd28` **byte-identical to baseline**. Wave 9-redo events are hash-safe in isolation. |

## Hash check (40w byte-identical to baseline, in isolation)

n1664 final_state_hash (Lane A stashed, only Wave 9-redo events + test file present): `ef03ab4d6c5ecd28`
Baseline (Wave 8 napkin n1640/n1649/n1650): `ef03ab4d6c5ecd28`
**MATCH**: byte-identical.

Predicate inertness analysis (why Wave 9-redo doesn't fire in 40w):
- Earliest `turn_min` = 50 (events 3 + 6); 40w runs to turn 40 → out of window.
- Events 1, 2, 4, 5 have `turn_min` ≥ 60.
- All events are gated on event_flags written by other events that themselves
  do not fire in 40w (`cumulative_casualties_x100_*`, `war_exhaustion_x100_*`)
  AND condition compounds (mutex flags, dimension thresholds).
- Event 6 (`csq_arbih_resistance_revival`) gates on `territory_loss_window`
  which requires `state.turn_summaries[]` to exceed window depth (default 10).

## Concurrent-lane interaction note

Lane A (OCM Phase 1 implementation redo) was running in parallel during this
redo lane. Lane A's modifications to `src/sim/combat/attack_post_battle_effects.ts`
and `src/sim/combat/officer_quality_update.ts` (~56 LOC of substantive
combat-math change) showed up as concurrent working-tree modifications during
this lane's smoke run, producing a hash drift that was NOT caused by the
events lane. Confirmed via isolation re-run with Lane A's files stashed:
hash returned to baseline byte-identical. This redo's commit includes ONLY
the events lane files (consequences.json + tests/divergence_events_wave_9.test.ts
+ this report); Lane A's files are explicitly not staged.

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
| `data/scenarios/events/consequences.json` | additive — 6 new events appended after `csq_winter_supply_attrition` |
| `tests/divergence_events_wave_9.test.ts` | new — 11 tests (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_9_REDO.md` | new — this file |

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
  - `alliance_above` uses strict `>` (event_types.ts:497) — `csq_post_cease_fire_recruitment_decline` lapsed asserts `alliance ≤ 0.55`
  - `patron_pressure_above` reads `.override_authority` not `.support_level`
    (event_types.ts:553)
  - `territory_loss_window` reads `state.turn_summaries[]` most-recent-first;
    test seeds 11 entries with index 0 latest dropping below the older
    snapshots so loss = past − latest ≥ 0.03 (event 6 fires)

## Successor handoffs (Wave 10 candidates)

- More Wave-8 mirrors not yet authored: `csq_political_split_temporary`
  mirrors for RBiH or RS; `csq_mobilization_demographics_strained` mirror for
  HRHB; `csq_patron_arms_pipeline_attenuated` mirror for HRHB.
- More recovery-side variants: `csq_doctrine_drift` (counterpart to
  `csq_doctrine_reform_initiated`); `csq_alliance_repair_after_lapse`
  (counterpart to `csq_alliance_drift_silent_w20`); seasonal supply-windfall
  variant.
- Equipment-substrate consumers beyond what Waves 5/8/9-redo added: post-
  Dayton train-and-equip detail event, Croatia-pipeline scaled variant.
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
- File ownership respected — no touch to Lane A's territory
  (`src/sim/combat/officer_quality_update.ts`, `attack_resolution_osid.ts`,
  `attack_post_battle_effects.ts`), `src/sim/combat/osid_graph_analysis.ts`,
  `bot_corps_ai.ts`, `bot_brigade_ai_osid.ts`, `src/ui/map/`, or
  `src/sim/events/event_types.ts` (DO NOT MODIFY).

## Concurrent context (Wave 9 redos)

Two solo redo lanes in flight per spec:
- Lane A redo: OCM Phase 1 implementation (`src/sim/combat/officer_quality_update.ts` + `attack_post_battle_effects.ts`)
- Lane D redo (this lane): Divergence Events Wave 9

Both dispatched solo (non-parallel) per the verdict-only outcome of the first
Wave 9 batch. This lane's commit explicitly stages ONLY the 3 events-lane
files and does NOT include any of Lane A's working-tree modifications.
