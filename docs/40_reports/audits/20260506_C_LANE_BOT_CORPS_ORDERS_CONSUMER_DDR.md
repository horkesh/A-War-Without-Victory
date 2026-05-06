# C-Lane DDR — bot_corps_orders Consumer Wire

**Lane:** LANE-NIGHTSHIFT-C-LANE-PHASE-0-PANEL
**Date:** 2026-05-06
**Predecessors:** A-lane DDR (`eee308e0`), B-lane DDR (`941bd68e`), A1 (`18136710`), A3 (`c8ff93d8`), A4 (`93c75b1d`), B1 (`44053a32`), B2 (`d019bef7`).
**B-lane 188w A/B finding:** All 5 binding thresholds PASS, observable telemetry = 0 — `bot_corps_orders` does not consume A3's translated `corps_directives[]`. C-lane closes that gap.

## Overview

A3's `interpretArmyDirective(state, faction, directive)` builds a per-corps `ArmyCorpsDirective[]` (`{corps_id, role, deviated}`) but the result is **never written to GameState** — only the `army_directive_pushback` event and decision-trace are persisted. `bot_corps_ai.generateAllCorpsOrders` and the v0.8 commander loop read `state.military.campaign_plans?.[faction].front_priorities` (A1's CampaignPlan path) for `briefing.campaign_role`; they never see A3's translation. C-lane wires A3's output into the same consumer surface so the political → army → corps chain becomes observable.

## Q1 — Consumer location

**Recommendation:** Option **(a) variant** — store A3's per-corps directive **into GameState** at A3 emit time, then **read it inside `assembleCampaignIntent` (briefing.ts:376-403)** so it overlays/replaces `FrontPriority['role']` from CampaignPlan before `briefing.campaign_role` is populated. Insertion points:

1. **Producer side (state write):** modify `applyArmyDirectiveInterpretation` (army_order_interpretation.ts:641) to write the returned `corps_directives[]` to a NEW state slot `state.military.army_corps_directives_by_faction[faction]: Record<corpsId, ArmyCorpsDirective>`. Pure additive write; A3's existing return shape unchanged.
2. **Consumer side (state read):** in `assembleCampaignIntent` (briefing.ts:376), after the `frontPriority` lookup, look up `state.military.army_corps_directives_by_faction?.[faction]?.[corpsId]`. If present, OVERRIDE `role: frontPriority?.role` with the A3-translated role. The `briefing.campaign_role` field is the single chokepoint already wired through `plan.ts` (10 references — guards offensive plan generation at lines 121, 279, 295, 627, 873, 1775) and `decide.ts` stance logic, so a one-line override propagates everywhere campaign role currently matters.

Rejected: option (b) pre-filter — would require new commander-loop entry hook and duplicated stance-screening logic. Rejected option (c) post-overlay — too late; commander has already decided. Option (a)-variant is the smallest cone of change and matches the A1 wire pattern (CampaignPlan → briefing → commander) the team already established.

## Q2 — Directive→action mapping

A3 already maps verb → `ArmyCorpsDirectiveRole` (`primary` / `secondary` / `economy` / `contain`) via `rawRoleForVerb` (army_order_interpretation.ts:191-207). Because `briefing.campaign_role` is the integration point, the **existing** plan/decide logic already encodes role → behavior. C-lane MUST NOT add a new mapping — it reuses the role ladder. Concrete corps-CO behavior (already shipped in plan.ts/decide.ts):

| Verb | Target-corps role | Non-target role | Existing campaign_role behavior |
|---|---|---|---|
| `HOLD_AT_ALL_COSTS` | primary | economy | target: full op generation; non-target: `economy` blocks new offensive plans (plan.ts:121) |
| `PRESS_OFFENSIVE` | primary | secondary | both eligible for offensive (`wantsCampaignPush`, plan.ts:1775) |
| `MAINTAIN_CORRIDOR` | primary | economy | target presses; non-target locked to defensive |
| `PREPARE_RESERVE` | secondary | economy | secondary still allows offensive but lower priority; reserves preserved |
| `HONOR_TRUCE` | contain | contain | `contain` forbids offensive plan (plan.ts:121) — full freeze |
| `BALANCE_FRONTS` | secondary | economy | mixed posture (default) |

Behavior is therefore **emergent from the existing role ladder + plan.ts gates** — C-lane adds zero new behavior tables. (If A3's compliance-driven `deviated:true` shifts the role one step, that already reroutes the same gates downstream.)

## Q3 — Calibration risk band + telemetry

**Firing magnitude bound (188w × 3 factions × ~2-4 corps/faction ≈ 1700-2300 directive-applications).** Not all produce observable change:
- **Lower bound (~10% observable):** ~170-230 corps-decisions deviate from CampaignPlan's `front_priorities` role; only a fraction of those cross a plan.ts gate (offensive→economy/contain freeze, or vice versa). Realistic lower-bound observable count: **~50-80 plan-level state changes / 188w**.
- **Upper bound (~40% observable):** when most factions land on misaligned verbs, MODIFIED/PARTIAL/REFUSED categories shift roles ±1 step on the ladder; **~700-900 plan-gate evaluations** see different inputs, **~250-400 produce observable plan/op divergences** vs B-lane-active baseline.

**MUST-emit telemetry (so the chain is observable in weekly_report.jsonl — the gap that produced B-lane's zero-telemetry 188w finding):**
1. `army_directive_application` per (faction × corps × turn): `{verb, raw_role, applied_role, deviated, source: 'a3'|'campaign_plan_fallback'}`. Emit at C-lane consumer site, NOT at A3 emit site (A3 already writes the trace, but the trace doesn't tell us whether the consumer actually used it).
2. `corps_role_overlay_count` weekly aggregate (per faction): how many corps got an A3-derived role override this turn vs CampaignPlan default.
3. Optional (recommended): a `chain_observability_check` weekly assertion — count of `produce-political-directive` emits in N turns must equal count of `army_corps_directives_by_faction` writes ± epsilon.

These three counters give the post-run panel the legible signal that B-lane lacked.

**Risk band: MEDIUM.** Same band as B-lane — overlay shifts `briefing.campaign_role` for non-player factions, which gates plan.ts offensive eligibility, which feeds op generation, which feeds territory. Bounded by A3's `MAX_DIRECTIVE_DEVIATION = 1`, but the role ladder itself is binary at the offensive-plan gate (primary/secondary allow; economy/contain forbid) — a single 1-step shift can flip an entire corps from offensive to defensive plans. 40w byte-stable until populated leader-data triggers actual verb emission (B2 already calibration-active).

## Q4 — Pipeline ordering

**Confirmed.** Current ordering (`war_phases.ts:1148-1238`): `evaluate-army-hq-gathering` → `produce-political-directive` (B1) → `evaluate-army-co-transitions` (A4) → `apply-army-directive-interpretation` (A3) → `generate-bot-corps-orders`.

C-lane writes the `army_corps_directives_by_faction` slot **inside** `applyArmyDirectiveInterpretation` (no new pipeline step needed — same step that builds the data persists it). Reads happen at briefing assembly inside `runCommanderForCorps`, which is already invoked from `generate-bot-corps-orders`. **No new pipeline step.** This is strictly cheaper than introducing a `consume-army-directive` step and avoids a third write-then-read hop.

If the implementation lane prefers a separate pipeline step for symmetry with B1's `produce-political-directive` framing, the alternative is a new `apply-army-directive-to-state` step inserted **between** A3 and `generate-bot-corps-orders`, with A3 reverted to pure-function shape. Either is acceptable; the in-A3 write is recommended for minimal pipeline surface.

## Q5 — Phase 1 dispatch shape

**Recommendation: SPLIT into C1 + C2** — mirrors the B1+B2 pattern that worked.

- **C1 — Consumer wire infrastructure (LOW risk, byte-stable):** add `army_corps_directives_by_faction` slot to GameState; A3 writes to it; briefing.ts reads it. Add env flag `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED` for byte-stable A/B. Unit tests for the briefing-overlay precedence (A3 wins over CampaignPlan when present; CampaignPlan fallback when absent). 40w byte-stable because B2 leader_data is the only path that produces a non-null directive, and A3's compliance defaults to FULL when stubbornness/competence are at their pre-A4 defaults.
- **C2 — Telemetry surface (LOW risk, calibration-neutral):** the three counters in Q3 wired into weekly_report.jsonl; post-run panel hooks. Strictly observability; no behavior change.

C1 and C2 can land in the same commit if the touch surface stays under ~120 LOC; otherwise split for clean reviewability. Mini-panel optional but **NOT REQUIRED** for SHIP — the 40w byte-stable A/B (env flag set) is the gate, same as B1.

## Sensitive-history compliance

Faction-symmetric mechanism: the consumer wire is a pure read of `state.military.army_corps_directives_by_faction[faction][corpsId]` with NO `if (faction === 'X')` branches. Asymmetry continues to flow from data (B2's leader profiles → B1's verb selection → A3's role translation → C-lane's overlay).

**§6 surface verification REQUIRED:** the consumer wire CAN shift Krivaja-95 / Stupčanica-95 outcomes via Drina Corps `campaign_role` overlay (e.g., `HONOR_TRUCE` → `contain` → `plan.ts:121` blocks new offensive plans → autonomous-launch path becomes the only Mladić-class trigger for those operations). Floor compliance is preserved structurally — `political_controllers`, paint anchors, OOB stats, rupture wiring, `enclave_resilience.ts` are NOT touched. But the §6 sensitive-history reviewer must confirm that `briefing.campaign_role = 'contain'` does not cascade into a code path that prevents the canonical genocide-adjacent operations from firing when historical conditions are met. Recommendation: C-lane Phase 1 SHIP gate includes a §6 check identical to A3's pattern (`9b9650e4` MORALE_OVERRIDE Phase 0 panel).

## Go/no-go recommendation

**GO.** Risk band: **MEDIUM**. Phase 1 dispatch shape: **SPLIT C1 (consumer wire) + C2 (telemetry surface)**, both LOW-risk, both 40w byte-stable behind env flag. Mini-panel NOT REQUIRED. §6 verification REQUIRED at SHIP gate (recommendation: lightweight reviewer pass, not full panel).

The consumer wire is the smallest possible piece preventing observable B-lane behavior at 188w. The chain is now `B2 leader_data → B1 producer → A3 interpreter → [C-lane consumer wire] → bot_corps_orders` and the integration point — `briefing.campaign_role` — already gates 10 plan.ts call sites and decide.ts stance logic. C-lane buys observable behavior with surgical state-slot + briefing-overlay surgery.
