# LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-9 — Closeout

**Date:** 2026-05-05
**Status:** VERDICT-REPORT-ONLY — events authoring lost in stage-but-not-commit Wave 9 batch index instability. Agent reported 11/11 lane tests + 166/166 focused regression GREEN at peak; both the events JSON additions to `consequences.json` AND the test file were dropped from the index between agent's stage call and parent's commit phase. Test file would FAIL without the events; deleted. Events themselves never made it to disk in stable form. Re-dispatch needed in a serial (non-parallel) second batch to actually author the events. Event names + design intent preserved in this report for re-dispatch reference.
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lanes:** Wave 8 (6 events), Wave 5 (7 events), Wave 4 (10 events), Mission D (11 events), R2-2 (6 events), Equipment-Quality-Modifier substrate (event 658241df)

---

## Lane

LANE-NIGHTSHIFT-DIVERGENCE-EVENTS-WAVE-9

## Event count delta

Pre-lane catalog: **65 events** (Wave 8 close).
Post-lane catalog: **71 events** (delta +6).

Wave-8-lineage event count: **41 events** (Wave 8 close).
Wave-9-lineage event count: **47 events** (41 + 6).

## Event list

| # | event_id | Theme | Condition kinds used | Effect kinds used |
|---|----------|-------|----------------------|-------------------|
| 1 | `csq_war_exhaustion_high_streak_RS` | Wave-8 mirror — exhaustion (RS) | `and`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cohesion_change`, `cost_ledger_annotation` |
| 2 | `csq_supply_corridor_chronic_strain_RS` | Wave-8 mirror — chronic supply (RS Posavina) | `and`, `supply_below`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `recruitment_modifier`, `cost_ledger_annotation` |
| 3 | `csq_winter_supply_attrition_RBiH` | Wave-8 mirror — winter logistics (RBiH siege defenders) | `and`, `supply_below`, `flag_at_least`, `morale_average_below`, `flag_not_set` | `narrative`, `cohesion_change`, `supply_delta`, `cost_ledger_annotation` |
| 4 | `csq_post_cease_fire_recruitment_decline` | Recovery-side — demobilization slope | `and`, `alliance_above`, `flag_at_least`, `flag_not_set` | `narrative`, `recruitment_modifier`, `cost_ledger_annotation` |
| 5 | `csq_third_party_arms_channel` | Recovery-side — alternate equipment channel | `and`, `dimension_below`, `patron_pressure_above`, `flag_not_set` | `narrative`, `equipment_quality_modifier`, `cost_ledger_annotation` |
| 6 | `csq_arbih_resistance_revival` | Recovery-side — enclave-defender morale surge | `and`, `territory_loss_window`, `morale_average_below`, `flag_not_set` | `narrative`, `recruitment_modifier`, `morale_change`, `cost_ledger_annotation` |

## Historical anchors

1. **csq_war_exhaustion_high_streak_RS** — Mirror of Wave 8 RBiH-leaning event. Documented late-1994 / 1995 VRS manpower-pool attenuation as Croatian and joint-federation operations expanded the casualty list. BB II Ch.49; Hoare on cross-faction late-war demographic strain.
2. **csq_supply_corridor_chronic_strain_RS** — Mirror of Wave 8 HRHB-leaning event. Documented 1994-1995 VRS Posavina corridor strain (Brčko bottleneck) under sustained ARBiH/HVO pressure on the corridor's flanks. BB II Ch.34.
3. **csq_winter_supply_attrition_RBiH** — Mirror of Wave 8 RS-leaning event. Documented 1992-93 / 1993-94 winter ARBiH supply strain in the Sarajevo siege ring and central Bosnia enclaves; cohesion drain under cold-weather logistics squeeze. BB II Ch.31.
4. **csq_post_cease_fire_recruitment_decline** — Documented 1994 Washington Agreement period and intermittent local cease-fires producing recruitment droop as the political class demobilized rhetoric while the front lines remained active. BB II Ch.41-42; Burg & Shoup 2000.
5. **csq_third_party_arms_channel** — Documented Iran flights (1994-1995), Croatia-pipeline arrangements, and mujahideen / volunteer arms channels emerging as primary patron pipelines registered pressure or suspension. BB II Ch.30, 49; Wiebes (2002) on covert arms flows.
6. **csq_arbih_resistance_revival** — Documented enclave-defender morale surges under sustained territory loss (Bihać 1994-95, Goražde defense doctrine). Recruitment surge tied to existential pressure rather than political mobilization. BB II Ch.43-46.

## Spec adherence

- **Ring 1 only** — every event predicate is faction-symmetric or faction-agnostic; none cross the SENSITIVE_HISTORY_DESIGN_GATE Ring-2 / §6 boundaries.
- **No new condition kinds** — every predicate uses pre-existing kinds. STOP rule respected (audit test enforces).
- **No new effect kinds** — every effect uses pre-existing kinds. STOP rule respected (audit test enforces).
- **Faction-agnostic mechanism** — each event picks ONE responding_faction by default historical convention, but the underlying condition predicates do not branch on `if (faction === 'X')`. The same predicate fires for any faction the event is authored against.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / enclave_resilience.ts touch.**
- **No §6 surface** — no rupture-event content, no atrocity-recording, no enclave-defense codepath. `enclave_resilience_aggregate` and Srebrenica / Drina event flags are NOT used in this lane's predicates.
- **Determinism preserved** — additive entries; sort-stable application order in `applyEventEffects`; cost-ledger annotations sorted (turn, tag) at read time.

## Files changed

| Path | Change |
|------|--------|
| `data/scenarios/events/consequences.json` | additive — 6 new events appended |
| `tests/divergence_events_wave_9.test.ts` | new — 11 tests (1 loader sanity + 6 per-event + 1 loader audit + 1 faction-agnostic audit + 1 condition-kinds audit + 1 effect-kinds audit) |
| `docs/40_reports/implemented/20260505_DIVERGENCE_EVENTS_WAVE_9.md` | new — this file |

## Verification gates (TBD — populated after implementation)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | TBD |
| Lane tests `tests/divergence_events_wave_9.test.ts` | TBD |
| Focused regression `tests/divergence_events_wave_*.test.ts tests/consequence*.test.ts` | TBD |
| 40w smoke hash | TBD |

## Successor handoffs (Wave 10 candidates)

- More Wave-8 mirrors not yet authored: `csq_political_split_temporary` mirrors for RBiH or RS; `csq_mobilization_demographics_strained` mirror for HRHB.
- More recovery-side variants: `csq_doctrine_drift` (counterpart to `csq_doctrine_reform_initiated`); `csq_alliance_repair_after_lapse` (counterpart to `csq_alliance_drift_silent_w20`); seasonal supply-windfall variant.
- Equipment-substrate consumers beyond what Waves 5/8/9 added: post-Dayton train-and-equip detail event, Croatia-pipeline scaled variant.
- STOP rule remains enforced — do not invent new condition or effect kinds without a substrate audit lane first.

## Boundaries respected

- Faction-agnostic predicates — no hardcoded faction names in conditions; effects target the responding faction by convention.
- Ring 1 only — no §6 wiring, no genocide_condemnation flips, no political_controllers writes.
- No FORAWWV / paint anchor / OOB / rupture wiring touched.
- No `enclave_resilience.ts` touch.
- No `event_types.ts` modification (no new condition or effect kinds).
- AUDIT-ONLY ledger annotations on every event (cost_ledger_annotation effect is the canonical reckoning surface).
- Determinism preserved — additive entries; sort-stable application order in `applyEventEffects`; cost-ledger annotations sorted at read time.
