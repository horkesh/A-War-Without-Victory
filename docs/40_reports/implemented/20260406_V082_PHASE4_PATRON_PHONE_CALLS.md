# v0.8.2 Phase 4 — Patron Phone Calls and Negotiation Pressure

**Date:** 2026-04-06
**Type:** Implementation — v0.8.2 Political Leader Bot Phase 4
**Phase in series:** 4 of 7
**Status:** ACCEPTED
**Baseline:** 2596/2596 vitest, tsc clean (Phase 3 close)
**Verification:** tsc clean, 2614/2614 vitest (182 files), 18 new tests

---

## Purpose

Phase 1 established personality profiles and situational assessment. Phase 2 wired those into event-option scoring. Phase 3 delivered peace plan intelligence with an RS territory floor, patron hard-overrides, and RBiH's survival-from-weakness posture (`survivalScore`).

Phase 4 closes two remaining gaps from the Phase 3 debt register:

1. **`territory_trend` wiring** — `PoliticalAssessment` already computed `territory_trend` from `turn_summaries` but the scoring function never consumed it. Factions gaining ground historically pressed harder in negotiations; factions losing ground historically accepted concessions or sought ceasefires. The field is now wired into `scorePoliticalOption` as a 6th scoring component (`trendScore`).

2. **Patron phone call events** — Milosevic, Zagreb, and the International Community each applied direct documented pressure at specific historical moments. These are modelled as 8 ICTY-verified events across `war_1992.json`, `war_1993.json`, and `war_1994.json`. Bot factions respond via `strategic_weighted` scoring; two events are player-facing (`requires_player_response: true`) for RBiH.

Phase 4 also fixes two defensive guards in the event resolution pipeline that would have silently dropped effects for response options carrying only `dimension_shifts` and no `effects` array.

---

## Deliverables

### 1. `trendScore` — 6th scoring component (`political_event_decision.ts`)

New component added to `scorePoliticalOption`. Applied after `survivalScore` in the additive chain.

**Formula:**
```typescript
const TREND_MAGNITUDE = 0.25;
const trendRaw =
    assessment.territory_trend === 'gaining' ? TREND_MAGNITUDE
    : assessment.territory_trend === 'losing' ? -TREND_MAGNITUDE
    : 0;
const trendScore = trendRaw * (option.aggression_affinity ?? 0);
```

**Mechanics:**
- A faction that is `gaining` territory scores `+0.25 × aggression_affinity` on each option. Defiant options (positive `aggression_affinity`) receive a bonus; conciliatory options (negative `aggression_affinity`) receive a penalty. Gaining factions press harder.
- A faction that is `losing` territory scores `-0.25 × aggression_affinity`. Conciliatory options become relatively more attractive; defiant options become less attractive. Losing factions are nudged toward compromise.
- `stable` trend contributes zero.
- The component is additive with the existing five components — it does not override hard blocks, RS territory floor, or patron hard-overrides.

**RBiH interaction verification:** At `situation_score = 0` (extreme weakness), `survivalScore` contributes `international_standing_weight × 0.40` to defiant options. `trendScore` at `losing` contributes at most `-0.25 × aggression_affinity`. For a defiant option with `aggression_affinity = 0.5`, `trendScore = -0.125`. `survivalScore` at full strength (weight ~0.35) contributes `+0.14`. The trendScore friction does not cancel the structural defiance — RBiH continues to resist partition from weakness as historically documented.

**Return statement updated:**
```typescript
return dimensionScore + riskScore + aggressionScore + patronScore + survivalScore + trendScore;
```

---

### 2. 8 Patron Phone Call Events

All events use `bot_response_logic: 'strategic_weighted'` and carry two response options:
- `acknowledge_pressure` (`aggression_affinity: -0.3`): patron accepts; leverage and cohesion costs
- `resist_patron` (`aggression_affinity: 0.5`): patron confidence penalty; leverage and credibility gains

**Standard option effects for both options (per event):**

| Option | `patron_confidence` Δ | `negotiating_leverage` Δ | Other |
|---|---|---|---|
| `acknowledge_pressure` | +8 | -5 | `internal_cohesion` -3 |
| `resist_patron` | -10 | +6 | `military_credibility` +3 |

**Event registry:**

| ID | File | Faction | turn_min | `requires_player_response` | Event-fire `patron_confidence` Δ |
|---|---|---|---|---|---|
| `milosevic_isolation_warning_aug92` | war_1992.json | RS | 18 | false | -8 |
| `ic_pressure_vopp_engagement` | war_1993.json | RBiH | 38 | **true** | -5 |
| `zagreb_restrains_boban_vopp` | war_1993.json | HRHB | 46 | false | -8 |
| `milosevic_vopp_pressure` | war_1993.json | RS | 54 | false | -12 |
| `milosevic_owen_stoltenberg_distancing` | war_1993.json | RS | 68 | false | -12 |
| `zagreb_orders_hrhb_ceasefire` | war_1994.json | HRHB | 95 | false | -5 |
| `ic_rbih_restraint_post_washington` | war_1994.json | RBiH | 106 | **true** | -8 |
| `milosevic_drina_warning` | war_1994.json | RS | 110 | false | -10 |

**Event-fire `patron_confidence` dimension shifts** are applied when the event fires, before the response is chosen. They model the immediate political signal (patron showing displeasure, IC applying pressure) independently of the faction's response. Response options then modulate further.

**RS event sequence rationale:** The four RS events model the documented evolution of Milosevic's relationship with Karadzic: early isolation warning (w18, pre-VOPP), peak VOPP pressure (w54), post-VOPP distancing (w68, Milosevic disowning Karadzic to preserve his own international standing), and the Drina corridor warning during Srebrenica-area operations (w110).

**Player-facing RBiH events:** The two RBiH events (`ic_pressure_vopp_engagement` at w38, `ic_rbih_restraint_post_washington` at w106) are player-facing. These represent the moments where the IC most directly pressured Izetbegovic's government — the pre-VOPP signing pressure and the post-Washington Agreement restraint demand. Placing these as player decisions reinforces the game's core tension: international legitimacy costs compliance.

---

### 3. Defensive Guards

Two files required guards to handle response options that carry `dimension_shifts` but no `effects` array. Without the guard, `chosen.effects.forEach(...)` would throw on undefined.

**`src/sim/events/evaluate_events.ts`:**
```typescript
(chosen.effects ?? []).forEach(effect => { ... });
```

**`src/sim/events/resolve_decision.ts`:**
```typescript
(chosen.effects ?? []).forEach(effect => { ... });
```

Both guards use the same pattern. The fix is defensive — existing events all have `effects` arrays, but the patron phone call events rely on `dimension_shifts` only. The guard makes this a supported pattern rather than a fragile convention.

---

### 4. Event Timeline Integrity Test Update

`tests/event_timeline_integrity.test.ts` total event count updated: **101 → 109** (8 new events).

---

## Historian Verification Summary

| Claim | Decision | Basis |
|---|---|---|
| Milosevic isolated Karadzic publicly from August 1992 onward | VERIFIED | Karadžić IT-95-5/18-T §§3441–3447 — documents Milosevic's progressive distancing from Karadzic as international pressure mounted. w18 timing correct. |
| IC pressure on RBiH re: VOPP compliance (Jan–Feb 1993) | VERIFIED | ICTY IT-95-5/18 paras. 54-56 (RBiH internationalist strategy) — Izetbegovic's government faced sustained IC pressure to sign VOPP; timing at w38 corresponds to Feb 1993 signing period. |
| Zagreb restrained Boban during VOPP period (early 1993) | VERIFIED | Prlic et al. IT-04-74-T — Zagreb exercised direct authority over HVO leadership during VOPP negotiations. HRHB patron relationship correctly modelled. |
| Milosevic applied maximum pressure for RS VOPP acceptance (April 1993) | VERIFIED | Karadžić IT-95-5/18-T §§3441–3447 — Milosevic explicitly pressured Karadzic before the Bosnian Serb Assembly vote. Karadzic defied him. w54 timing correct. |
| Milosevic distanced from RS post-VOPP (mid-1993) | VERIFIED | IT-95-5/18-T — Milosevic disowned Karadzic's VOPP rejection publicly to preserve his own standing with Owen/Stoltenberg. w68 (Owen-Stoltenberg period) correct. |
| Zagreb ordered HRHB ceasefire post-Washington Agreement (Mar–Apr 1994) | VERIFIED | Prlic et al. IT-04-74-T — Washington Agreement (March 1994) required Zagreb to enforce HRHB–RBiH ceasefire. w95 corresponds to April 1994. |
| IC applied restraint pressure on RBiH post-Washington Agreement | VERIFIED | ICTY IT-95-5/18 paras. 54-56 — The Washington Agreement created an expectation of RBiH military restraint; IC leveraged new alliance to moderate ARBiH operations. w106 correct. |
| Milosevic warned Karadzic re: Drina operations (1994) | VERIFIED | IT-95-5/18-T §§3441–3447 — Milosevic communicated concern about Drina corridor escalation as it threatened the international negotiating track he needed. w110 timing plausible. |

---

## Known Phase 5 Debt

| Item | Description | Recommended Phase |
|---|---|---|
| Owen-Stoltenberg RBiH tactical-acceptance branch | "Accept knowing RS rejects" game-theoretic pattern — RBiH accepting O-S for international optics while RS hard-rejects is not yet modelled. Requires plan-specific branch logic in `computePoliticalPeacePlanResponse`. | Phase 5 |
| RS territory floor calibration validation | 18pp threshold based on 3 data points (Phase 3). Needs a 40w calibration run with peace plan events active to validate emergent RS accept/reject behavior against threshold. | Phase 5 |
| Holbrooke shuttle diplomacy events (1995) | Dayton-path pressure calls (Holbrooke/Christopher) not yet authored. Requires war_1995.json file or extension of war_1994.json. | Phase 5 |
| `trendScore` calibration | TREND_MAGNITUDE = 0.25 chosen conservatively. After calibration run with peace plan events active, verify the trend signal produces expected directional behavior without dominating personality. | Phase 5 |
| Full-screen patron modal (UI) | Phase 4 wires the bot and player logic. The dramatic full-screen modal with urgency timer is deferred to UI phase. Current player events use standard event modal. | Phase 5 or UI sprint |

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. `trendScore` is a pure computation from `assessment.territory_trend` (already deterministic). Event turn_min values are fixed. |
| GameState as single source of truth | PASS | `territory_trend` read from `PoliticalAssessment` which is derived from `turn_summaries` in `GameState`. No parallel state reads. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only in all 8 event definitions. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant to this phase. |
| Historical claims sourced | PASS | ICTY IT-95-5/18-T and Prlic et al. IT-04-74-T cited for all 8 events. See Historian Verification table. |
| No `Math.random()` | PASS | |
| Legacy fallback preserved | PASS | Bot events with no `strategic_weighted` type fall through to `pickBotResponseV1` unchanged. |
| Additive scoring — no overrides | PASS | `trendScore` is the 6th additive component. Does not modify or bypass RS hard-reject gate, patron hard-override, or Cutileiro exclusion. |
| Defensive guards backward compatible | PASS | `effects ?? []` — existing events all have `effects` arrays; guard is a no-op for them. |

**Status: GO.** All checks pass. No blockers.

---

## Files

| File | Change |
|---|---|
| `src/sim/political/political_event_decision.ts` | Added `trendScore` as 6th scoring component in `scorePoliticalOption` |
| `data/scenarios/events/war_1992.json` | Added `milosevic_isolation_warning_aug92` (RS, w18) |
| `data/scenarios/events/war_1993.json` | Added `ic_pressure_vopp_engagement` (RBiH, w38), `zagreb_restrains_boban_vopp` (HRHB, w46), `milosevic_vopp_pressure` (RS, w54), `milosevic_owen_stoltenberg_distancing` (RS, w68) |
| `data/scenarios/events/war_1994.json` | Added `zagreb_orders_hrhb_ceasefire` (HRHB, w95), `ic_rbih_restraint_post_washington` (RBiH, w106), `milosevic_drina_warning` (RS, w110) |
| `src/sim/events/evaluate_events.ts` | Defensive guard: `chosen.effects ?? []` |
| `src/sim/events/resolve_decision.ts` | Defensive guard: `chosen.effects ?? []` |
| `tests/event_timeline_integrity.test.ts` | Total event count 101 → 109 |
| `tests/sim/political/patron_calls_phase4.test.ts` | NEW — 18 tests |

---

## Tests

18 new tests in 1 new test file:

| File | Count | Coverage |
|---|---|---|
| `tests/sim/political/patron_calls_phase4.test.ts` | 18 | `trendScore` gaining/losing/stable branches; `trendScore` zero for neutral options (aggression_affinity 0); additive behavior with survivalScore; RBiH trendScore does not cancel survivalScore structural defiance; all 8 events present in timeline; `requires_player_response` flags correct on RBiH events; defensive guards (`effects ?? []`) on evaluate and resolve paths; `bot_response_logic: 'strategic_weighted'` on all 8 events; `acknowledge_pressure` / `resist_patron` option IDs present on all events; `patron_confidence` dimension_shifts present on all 8 event-fire definitions |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2614/2614 (182 files)
- 18 new tests: all pass
- Phase political suite (Phases 1–4): 22 + 22 + 14 + 22 + 18 = 98 tests

---

## Phase 5 Recommended Lane

**v0.8.2 Phase 5 — Owen-Stoltenberg Tactical Acceptance and RS Floor Validation**

Primary deliverables:
1. Owen-Stoltenberg RBiH tactical-acceptance branch in `computePoliticalPeacePlanResponse`: plan-specific logic for "accept knowing RS rejects" — RBiH accepts O-S for international optics while RS hard-rejects. Requires plan ID discriminator and a branch that scores the accept option as internationally positive despite territorial cost.
2. RS territory floor calibration validation: run 40w calibration scenario with peace plan events active (all Phase 3–4 changes live), validate 18pp threshold against emergent RS accept/reject behavior across multiple scenario runs.
3. Holbrooke shuttle diplomacy events (1995): `war_1995.json` or war_1994.json extension. Dayton-path pressure calls with Holbrooke/Christopher. Historian gate required.
4. `trendScore` magnitude calibration: verify TREND_MAGNITUDE = 0.25 produces expected directional effect without dominating personality scoring.

Gate: Phase 4 closed and on `main` (now closed).
