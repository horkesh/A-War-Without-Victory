# A1 — Wire CampaignPlan into Corps Briefing (closes ARMY-GAP-1)

**Lane:** `LANE-NIGHTSHIFT-A1-WIRE-CAMPAIGN-PLAN-TO-BRIEFING`
**Date:** 2026-05-06
**Status:** CLOSED — wiring already present at code level; binding regression suite added.
**DDR (authoritative):** `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (commit `eee308e0`).
**Audit P0 closed:** `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md` — ARMY-GAP-1.

---

## Summary

The audit (2026-03-30 repo-health consolidated) flagged ARMY-GAP-1 as a P0:
> "The `CampaignPlan` from `army_hq_gathering.ts` is currently never read by corps CO briefings — strategic layer is structurally disconnected."

Investigation under this lane found that the wiring is **already in place** at the code level:

1. **Producer:** `src/sim/combat/army_hq_gathering.ts` line 1004-1007 —
   `evaluateArmyHQGathering()` writes `state.military.campaign_plans[faction]`.
2. **Consumer:** `src/sim/combat/commander/briefing.ts` line 376 —
   `collectCampaignIntent()` reads `state.military.campaign_plans?.[faction]`
   and surfaces six fields onto `CommanderBriefing`:
   - `campaign_role` (front priority role: primary / secondary / economy / contain)
   - `campaign_offensive_targets` (offensive target shortlist)
   - `campaign_hold_targets` (hold-at-all-costs targets, merged into `must_hold_osids`)
   - `campaign_stance_ceiling` (doctrine override stance ceiling)
   - `campaign_sync_role` (synchronized-op participant role, if any)
   - `campaign_sync_targets` (synchronized-op target OSIDs)
3. **Pipeline ordering:** `src/sim/turn_phases/war_phases.ts` —
   `evaluate-army-hq-gathering` (L1137) runs **before**
   `generate-bot-corps-orders` (L1148) within the same turn, so commander
   briefings see the freshly-written plan, not a stale one.
4. **State shape:** `src/state/game_state.ts` L1978 — `campaign_plans?: Record<string, CampaignPlan | null>` is on `MilitaryState`. `validateGameState.ts` L392-429 validates the structure on save/load.

The gap reported by the audit was real at the time the audit was filed (around v0.8 corps-commander rollout), but it was closed in-flight during the v0.8.1 maturity work (see `docs/40_reports/implemented/20260317_ARMY_HQ_GATHERING_V047.md` and `tests/commander/briefing_campaign_intent.test.ts`). The audit entry is stale.

**Lane outcome:** zero engine code changes; one binding regression test file added.

---

## Files touched

```
A  tests/a1_army_hq_campaign_plan_wired.test.ts                          (+ test file, ~340 lines)
A  docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md
```

No engine files modified. No scenario data touched. No `political_controllers`,
no FORAWWV, no paint anchor, no §6 surface.

---

## Tests authored (T1–T7, all GREEN)

`tests/a1_army_hq_campaign_plan_wired.test.ts` — 7 tests, ~340 lines.

| # | Test | What it pins |
|---|------|--------------|
| T1 | `GameState.military` carries `campaign_plans` field | Typed slot exists; round-trips a plan through it. |
| T2 | `briefing.ts` reads `state.military.campaign_plans?.[faction]` (static-grep) | If a future refactor removes the read, this fails. Also pins surfaced field names. |
| T3 | Each faction has its own slot (RBiH, RS, HRHB) | Faction-symmetric, no hardcode of any one faction. |
| T4 | Determinism: re-running `buildBriefing` produces identical campaign fields | No nondeterminism leaked into the wiring. |
| T5 | War-phase ordering: `evaluate-army-hq-gathering` precedes `generate-bot-corps-orders` | Briefings see fresh plans, not stale. |
| T6 | Static-grep guards on `briefing.ts`: no `Math.random`, `Date.now`, `new Date`; `collectCampaignIntent` body has no faction string literals | Determinism + faction-symmetry guards. Strips comments before scanning. |
| T7 | `assessTheater + generateCampaignPlan` is byte-stable across two identical inputs; `evaluateArmyHQGathering` persists a plan into state | The wiring layer adds zero behavior drift. |

Test result:
```
✓ tests/a1_army_hq_campaign_plan_wired.test.ts  (7 tests)
Test Files  1 passed (1)
     Tests  7 passed (7)
```

---

## Regression test suites (all GREEN)

```
tests/army_hq_gathering.test.ts                                   (66 tests)
tests/commander/briefing_campaign_intent.test.ts                  (14 tests)
tests/commander/commander.test.ts                                 (54 tests)
tests/commander/commander_belief_layer.test.ts                    (14 tests)
tests/commander/commander_maturity_phase1.test.ts                 (18 tests)
tests/commander/commander_phase3_candidate_competition.test.ts    (43 tests)
tests/commander/commander_phase4_lesson_personality.test.ts       (25 tests)
tests/commander/commander_phase5_constraint_preference.test.ts    (24 tests)
tests/commander/commander_phase6_trace_qa.test.ts                 (14 tests)
tests/commander/anti_paralysis_supply_gate.test.ts                ( 3 tests)
tests/commander/corridor_quality_guard.test.ts                    ( 6 tests)
tests/commander/elite_formation_utilization.test.ts               (36 tests)
tests/commander/operation_emit_overlap_guards.test.ts             ( 2 tests)
tests/commander/reinforcement_signal_flow.test.ts                 ( 1 test)
tests/commander/sector_reassignment_emit_truth.test.ts            ( 1 test)
tests/commander_driven_brigade_assignment.test.ts                 (12 tests)
tests/commander_override.test.ts                                  (32 tests)
tests/commander_override_reachability.test.ts                     ( 1 test)
                                                                 ----------
                                                                  366 tests, 18 suites — ALL GREEN
```

`npx tsc --noEmit -p tsconfig.json` — clean (no output, exit 0).

---

## 40w smoke (parent runs)

The lane spec requires the parent to run the 40w smoke. Per
`docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md`
hash-stability guidance and lane MORALE_OVERRIDE_ENABLED requirement:

```
MORALE_OVERRIDE_ENABLED=true npm run sim:scenario:run:40w
```

Predecessor 40w hash (n1692, Krivaja P1.5): `073f15c25768dfa0`.

**Expected: BYTE-IDENTICAL hash.** This lane added zero engine code (only
the test file and report); the wiring it documents was already operational
in the predecessor run that produced `073f15c25768dfa0`. If the hash drifts,
that is a STOP-AND-ASK signal — but the structural-zero-change scope of
this lane makes drift implausible.

---

## STOP-AND-ASK conditions (none triggered)

- **40w smoke hash drift:** N/A — lane added no engine code; parent runs the smoke.
- **`gather-army-hq` step missing:** N/A — `evaluate-army-hq-gathering` already exists at war_phases.ts L1137 and runs before `generate-bot-corps-orders` at L1148.
- **CampaignPlan API requires significant refactoring:** N/A — API is stable and the consumer reads it correctly.

---

## Path forward

- **A2:** Army CO loop — political-directive vocabulary + Army CO interpretation. The wiring this lane confirms is the substrate A2 will extend.
- **A3:** Order Interpretation extension to army level (advisory shape per DDR Q2).
- **A4:** Bot political personalities (per-faction tolerance for Army-CO insubordination, DDR Q4).
- **A5:** UI surface for Army CO briefings + override path with `political_capital` cost (DDR Q1).

---

## DDR citations

Per `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md`:
- **Q1** — Army CO is advisory; player issues political directives; corps-level override path costs `political_capital`. The CampaignPlan surface this lane closes is exactly the substrate that will translate political directives into corps front_priorities + doctrine_override.
- **Q2** — Army CO authority is ADVISORY (compliance-score thresholds 0.80 / 0.50 / 0.25). The current CampaignPlan already encodes per-corps `role`, `suggested_stance`, and `corps_stance_ceilings`; A2 will add the compliance score on top.
- **Cross-cutting:** Ring 1 / faction-symmetric / no §6 — this lane's tests pin all three.

---

**Lane closed. Binding regression net in place. Ready for A2.**
