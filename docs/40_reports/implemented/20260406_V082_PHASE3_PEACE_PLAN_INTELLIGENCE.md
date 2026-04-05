# v0.8.2 Phase 3 — Peace Plan & Negotiation Intelligence

**Date:** 2026-04-06
**Type:** Implementation — v0.8.2 Political Leader Bot Phase 3
**Phase in series:** 3 of 7
**Status:** ACCEPTED
**Baseline:** 2546/2546 vitest, tsc clean (Phase 2 close)
**Verification:** tsc clean, 2596/2596 vitest (181 files), 50 new tests

---

## Purpose

Phase 1 established personality profiles and situational assessment. Phase 2 wired those into event-option scoring (`scorePoliticalOption`) and replaced `pickBotResponseV1` for `strategic_weighted` / `capital_based` / `capital_weighted` events.

Phase 3 extends the political intelligence layer in three directions:

1. **Schema hardening** — `responding_faction` is now an explicit optional field on `EventDefinition`, eliminating the soft `dimension_shifts[0].faction` convention that Phase 2 identified as debt.
2. **Force-readiness signal** — `combat_effective_brigades` is computed each turn and injected into `NegotiationBreakdown`, replacing the hardcoded 0.5 fallback that `computePoliticalAssessment` was using.
3. **Peace plan intelligence** — `computeBotResponse` in `peace_plans.ts` is replaced by a personality-aware dispatcher that encodes historically verified RS rejection floors, patron hard-overrides, and Izetbegovic's documented resistance-from-weakness strategy.

Phase 3 is the first phase that changes how bot factions respond to peace plan proposals. The scenario hash changes.

---

## Deliverables

### 1. `EventDefinition.responding_faction` schema hardening (`event_types.ts`)

Added `responding_faction?: FactionId` as an explicit optional field on `EventDefinition`.

Fallback chain in `evaluate_events.ts` (3-tier, explicit priority):
1. `def.responding_faction` — new explicit field
2. `def.dimension_shifts[0].faction` — original Phase 2 convention
3. `def.response_options[0].dimension_shifts[0].faction` — deeper fallback
4. `null` → falls through to `pickBotResponseV1`

New events should set `responding_faction` explicitly. Existing events are backward compatible — the fallback chain preserves prior behavior.

---

### 2. `computeCombatEffectiveBrigades()` pipeline step (`compute_combat_effective.ts`)

New pure function. Counts active brigades meeting readiness thresholds per faction:
- `personnel >= 200`
- `morale >= 40`
- status: active

Written to `NegotiationBreakdown.combat_effective_brigades` (new optional field on the type).

Pipeline placement: new step `compute-combat-effective-brigades` inserted before `evaluate-peace-plans` in `war_phases.ts`. Step count: 148 → 149 (verified in `war_phase_step_order.test.ts`).

`computePoliticalAssessment` now reads this field instead of the hardcoded 0.5 fallback, giving the assessment a real force-readiness signal for the first time.

---

### 3. `survivalScore` — 5th scoring component (`political_event_decision.ts`)

Addresses the RBiH posture inversion documented as Phase 2 debt. Izetbegovic historically resisted partition from weakness by leaning on international legitimacy rather than conceding (ICTY IT-95-5/18 paras. 54-56).

**Activation condition:**
```
archetype === 'survival_internationalist' && situation_score < 50
```

**Formula:**
```
survivalScore = (50 - situation_score) / 50
              × international_standing_weight
              × 0.40
              × (1 if option is defiant/hold-out, -1 if conciliatory)
```

Applied to options with `aggression_affinity >= 0` (defiant/hold-out): positive contribution.
Applied to options with `aggression_affinity < 0` (conciliatory): negative contribution.

This creates a smooth gradient: at `situation_score = 0` the modifier is at full strength (`international_standing_weight × 0.40`); at `situation_score = 50` it is zero; above 50 it does not fire. The modifier is additive with the existing four components — it does not override hard blocks or the patron component.

---

### 4. `computePoliticalPeacePlanResponse()` (`political_peace_plan.ts`, new file)

Replaces the territory-% + patron-override-50 dumb bot in `peace_plans.ts`. Full dispatch chain:

**Gate 1 — Cutileiro exclusion:**
Cutileiro Plan (March 1992) is excluded from personality scoring. It was a pre-war, non-genuine negotiation process — the historical dynamics are fundamentally different from VOPP, O-S, and Contact Group. Bot falls through to legacy behavior for this plan.

**Gate 2 — RS territory floor (hard reject):**
If the proposed RS territory allocation falls more than 18 percentage points below the RS faction's current `territorial_control_ratio`, RS issues a hard reject regardless of patron pressure.

Threshold sourced from ICTY case record data across three plans:
| Plan | RS territory (proposed) | RS current (approx.) | Gap |
|---|---|---|---|
| Vance-Owen (Jan 1993) | ~43% | ~70% | ~27pp → rejected |
| Owen-Stoltenberg (Aug 1993) | ~52% | ~70% | ~18pp → partially engaged |
| Contact Group (Jul 1994) | ~49% | ~70% | ~21pp → rejected |

The 18pp threshold represents the minimum gap at which RS historically engaged rather than outright rejected. The patron override is bypassed at this gate — Karadzic defied Milosevic on VOPP even at peak patron pressure.

**Gate 3 — Patron hard override:**
If `patron_confidence >= 80` (patron at peak authority), the faction is forced to accept regardless of territorial calculus. Represents Washington Agreement (HRHB, 1994) and Milosevic's successful O-S pressure (RS, Aug 1993 temporary engagement).

**Normal scoring path:**
All other cases route through `scorePoliticalOption` with a territory bias modifier applied to the accept option's `aggression_affinity`:
```
territory_bias = clamp(
  (proposed_territory - current_territory) / current_territory,
  -0.3, +0.3
)
```
A plan that proposes more territory than the faction currently holds shifts the accept option toward positive `aggression_affinity` (accepting it is an aggressive gain). A plan that proposes less territory shifts it negative (accepting is a concession). Cap ±0.3 prevents territory from overwhelming personality.

---

## Historian Verification Summary

| Claim | Decision | Basis |
|---|---|---|
| RBiH resisted partition from weakness via international legitimacy | VERIFIED | ICTY IT-95-5/18 paras. 54-56 (Karadzic): Izetbegovic's strategic reliance on international community documented throughout. `survivalScore` correctly encodes this. |
| RS territory floor at ~18pp gap | VERIFIED (3-data-point basis) | VOPP (~27pp gap, hard reject), O-S (~18pp gap, temporary engagement), CG (~21pp gap, hard reject). Threshold is conservative. Flagged for calibration validation. |
| Cutileiro non-genuine dynamics | VERIFIED | Pre-war process; Izetbegovic's subsequent withdrawal from initialed agreement is widely documented. Exclusion is correct. |
| HRHB patron_sensitivity | CONFIRMED (Phase 2 baseline) | Washington Agreement 1994 demonstrates Zagreb's effective hard-override authority over HRHB. Patron hard override gate at 80 is correct for HRHB. |
| Patron bypass on RS VOPP | VERIFIED | Karadzic rejected VOPP against Milosevic's explicit pressure. Hard reject gate bypasses patron override at RS territory floor — correct. |

---

## Known Phase 4 Debt

| Item | Description | Recommended Phase |
|---|---|---|
| `territory_trend` in PoliticalAssessment | Field and computation from `turn_summaries` already in place; not yet consumed by scoring. A political leader's calculus is shaped by trend, not just position. | Phase 4 |
| RS territory floor calibration | 18pp threshold based on 3 data points. Needs validation against calibration runs once peace plan events fire regularly. | Phase 4 (validation pass) |
| Patron phone call events | Milosevic/Zagreb pressure calls with ICTY-sourced dialogue. `patron_confidence` dimension shifts. Full dramatic presentation (full-screen modal, urgency timer). | Phase 4 |
| Vance-Owen / Contact Group plan-specific tuning | Plan-specific personality overrides deferred until Phase 3 proves stable in calibration. | Phase 4 |
| Owen-Stoltenberg RBiH tactical-acceptance pattern | "Accept knowing RS rejects" game-theoretic behavior — RBiH accepting O-S for international optics while RS hard-rejects is not yet modeled. Requires plan-specific branch logic. | Phase 4 |

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. `computeCombatEffectiveBrigades` and `computePoliticalPeacePlanResponse` are pure functions. All tie-breaks by lexicographic ID. |
| GameState as single source of truth | PASS | `combat_effective_brigades` written to `NegotiationBreakdown` via pipeline step; consumed by `computePoliticalAssessment` from that field only. No parallel reads. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant to this phase. |
| Historical claims sourced | PASS | ICTY IT-95-5/18 cited. Three-plan dataset for RS floor documented above. |
| No `Math.random()` | PASS | |
| Legacy fallback preserved | PASS | `pickBotResponseV1` remains default for all non-political logic types and for Cutileiro. |
| Explicit parameter contract | PASS | `computePoliticalPeacePlanResponse` takes explicit `GameState`, `PeacePlan`, and faction — no hidden reads inside the function. |
| Pipeline step count | PASS | `war_phase_step_order.test.ts` updated: 148→149. |

**Status: GO.** All checks pass. No blockers.

---

## Files

| File | Change |
|---|---|
| `src/sim/events/event_types.ts` | Added `responding_faction?: FactionId` to `EventDefinition` |
| `src/sim/events/evaluate_events.ts` | 3-tier fallback chain for `respondingFaction` derivation |
| `src/state/negotiation_types.ts` | Added `combat_effective_brigades?: number` to `NegotiationBreakdown` |
| `src/sim/negotiation/compute_combat_effective.ts` | NEW — `computeCombatEffectiveBrigades()` |
| `src/sim/turn_phases/war_phases.ts` | New `compute-combat-effective-brigades` step before `evaluate-peace-plans` |
| `tests/war_phase_step_order.test.ts` | Step count 148→149 |
| `src/sim/political/political_event_decision.ts` | 5th scoring component: `survivalScore` |
| `src/sim/political/political_peace_plan.ts` | NEW — `computePoliticalPeacePlanResponse()` |
| `src/sim/negotiation/peace_plans.ts` | `computeBotResponse` → personality dispatcher |
| `tests/sim/political/political_peace_plan.test.ts` | NEW — 22 tests |
| `tests/sim/negotiation/compute_combat_effective.test.ts` | NEW — 14 tests |
| `tests/sim/political/survivalScore.test.ts` | NEW — 14 tests |

---

## Tests

50 new tests across 3 new test files:

| File | Count | Coverage |
|---|---|---|
| `tests/sim/political/survivalScore.test.ts` | 14 | `survivalScore` fires only for `survival_internationalist` below threshold; smooth gradient; zero above situation_score 50; additive with other components; does not fire for RS/HRHB archetypes |
| `tests/sim/negotiation/compute_combat_effective.test.ts` | 14 | Threshold enforcement (personnel 200, morale 40); inactive brigades excluded; per-faction isolation; zero-brigade edge case; result written to `NegotiationBreakdown` |
| `tests/sim/political/political_peace_plan.test.ts` | 22 | Cutileiro exclusion; RS hard reject at >18pp gap; RS engages at ≤18pp gap; patron override at >= 80; territory bias clamp (±0.3); territory bias positive for favorable terms; RBiH defiance via survivalScore from weakness; HRHB patron hard-accept; normal scoring path; deterministic tie-break |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2596/2596 (181 files)
- 50 new tests: all pass
- Phase political suite (Phases 1–3): 22 + 22 + 14 + 22 = 80 tests

---

## Phase 4 Recommended Lane

**v0.8.2 Phase 4 — Patron Phone Calls and Territory Trend**

Primary deliverables:
1. `territory_trend` consumed by `scorePoliticalOption`: week-over-week territorial delta from `turn_summaries` feeds into assessment, creating urgency scaling for factions losing ground.
2. Patron phone call events (8-12): Milosevic/Zagreb/Holbrooke pressure calls with ICTY-sourced dialogue. Full-screen modal, urgency timer, `patron_confidence` dimension shifts.
3. RS territory floor calibration validation: run 40w calibration scenario with peace plan events active; validate 18pp threshold against emergent RS accept/reject behavior.
4. Owen-Stoltenberg RBiH tactical-acceptance branch: plan-specific logic for "accept knowing RS rejects" game-theoretic pattern.

Gate: Phase 3 closed and on `main` (now closed).
