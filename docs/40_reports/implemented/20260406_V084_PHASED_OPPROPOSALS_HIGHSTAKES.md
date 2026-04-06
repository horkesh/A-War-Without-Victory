# v0.8.4 Phase D — Op Proposals, High-Stakes Event Gate, Roadmap Truth

**Date:** 2026-04-06
**Status:** ACCEPTED
**Milestone:** v0.8.4 Autonomy Depth

---

## What Changed

### A. Op-Planning Proposals (Level 1 domain 2)

**`src/sim/ai_commander/proposal_generation.ts`** — added `generateLevel1OpProposals()`:
- Returns `PendingProposalReview[]` at `autonomy_level === 1` only.
- Signal: corps qualifies when `commander_state.current_plan.status === 'ready'` OR `decision_trace.winning_intent_id` contains `'stage_operation'` or `'launch_opportunity'`.
- Proposal ID format: `PROP_<turn>_ops_<seq>` (deterministic, seq = 0-based sorted index).
- `proposed_action` format: `APPROVE_OP:<corpsId>:<planId>` (colon-delimited).
- Domain: `'ops'` (new domain value added to `PendingProposalReview.domain` union).
- `current_value: 'pending'`, `proposed_value: 'approved'`.
- Same-turn duplicate guard: skips corps that already has a `player_op_response` for the same `plan_id` on the same turn.
- Sorted iteration via `strictCompare`. No `Math.random()`, no `Date.now()`.

**`src/state/game_state.ts`** — two additions to `CorpsCommandState`:
- `player_op_response?: { plan_id: string; approved: boolean; turn: number }` — stores player's accept/reject response for an op proposal. Cleared each turn by `apply-autonomy-transition`.

**`src/state/game_state.ts`** — `PendingProposalReview.domain` union extended:
- Was: `'military' | 'political' | 'events'`
- Now: `'military' | 'political' | 'events' | 'ops'`

**`src/sim/turn_phases/war_phases.ts`** — two changes:
- `apply-autonomy-transition`: clears `player_op_response` on all corps command entries each turn (stale response safety).
- New pipeline step `generate-level1-op-proposals` (step 154) inserted immediately after `generate-level1-proposals`. Calls `generateLevel1OpProposals()` and appends to `pending_proposal_reviews`. Step count: 153 → 154.

**`src/sim/combat/commander/commander_loop.ts`** — Level 1 plan-launch guard in `applyCommanderOutput()`:
- At `autonomy_level === 1`, if the commander loop produced a plan with `status === 'executing'`:
  - `player_op_response.approved === false` → plan abandoned (set to null), `status_reason` set, early return (no operations emitted).
  - No `player_op_response` yet → plan held at `'ready'`, early return (no operations emitted this turn).
  - `player_op_response.approved === true` → fall through, apply output normally.
- Guard uses `state.meta?.autonomy_level` (safe for headless test states without `meta`).

**`src/desktop/electron-main.cjs`** — `APPROVE_OP:` branch in both IPC handlers:
- `accept-proposal`: sets `player_op_response = { plan_id, approved: true, turn }` on the corps command entry.
- `reject-proposal`: sets `player_op_response = { plan_id, approved: false, turn }` on the corps command entry.

### B. High-Stakes Event: Sarajevo UNPROFOR Ultimatum

**`data/scenarios/events/war_1994.json`** — upgraded existing `nato_ultimatum_sarajevo_1994` event:
- Added `requires_player_response: true` — exercises the Level 3 gate from Phase B.
- Added `responding_faction: "RS"`.
- Added `bot_response_logic: "strategic_weighted"`.
- Added `priority: 50`.
- Added two `response_options`:
  - `comply_withdraw_hwez`: international_standing +8, patron_confidence −5, military_credibility −4. Sets flag `sarajevo_hwez_complied`.
  - `defy_ultimatum_hwez`: international_standing −12, patron_confidence +4, military_credibility +5. Sets flag `sarajevo_hwez_defied`.
- Narrative extended with player-facing decision framing.
- Trigger unchanged: turn 96 (≈ Feb 1994), requires `markale_massacre_1994` and `sarajevo_siege_active` flag.

**Level 3 gate verification:** `evaluate_events.ts:217` gate `autonomy_level < 3 || def.requires_player_response === true` already handles this correctly — at Level 3, the event is still queued to `pending_event_decisions`. Gate confirmed working by new tests.

### C. Turn-Advance Block for `pending_event_decisions` (Assessment)

Searched `electron-main.cjs` for `pending_event_decisions` block on `advance-turn`. **No block exists** — the turn can advance even when `pending_event_decisions` is non-empty. The event queuing gate in `evaluate_events.ts` is the only enforcement mechanism today.

**Phase D scope note:** Adding a turn-advance block for `requires_player_response` events is Phase E scope. The gate at evaluate_events.ts is sufficient for Phase D validation — the event is correctly queued and the player decision surface already exists (event decision IPC was wired in v0.8.2).

### D. Tests

**`tests/sim/autonomy/autonomy_phase_d.test.ts`** (new, 33 tests):
- `generateLevel1OpProposals` guard conditions (7 tests)
- Proposal shape from ready plan (7 tests)
- Proposal from `decision_trace` winning_intent_id signal (3 tests)
- Multiple corps deterministic ordering (2 tests)
- Determinism — same inputs → identical outputs (1 test)
- `player_op_response` same-turn skip guard (3 tests)
- `requires_player_response` Level 3 gate via `evaluateEvents` (5 tests)
- `player_op_response` schema field (3 tests)
- `domain: 'ops'` valid in `PendingProposalReview` (1 test)

**`tests/war_phase_step_order.test.ts`** — step count updated 153 → 154.

### E. Roadmap and Architect Notes

- `docs/plans/MASTER_ROADMAP.md` — Phase D entry added under v0.8.4, Phases A/B/C confirmed closed.
- `.claude/architect_notes.md` — Phase D CLOSED lane entry prepended to Active/Recent Accepted Lanes.

---

## Player-Visible Truth

At Level 1 Assisted autonomy:
- When a corps commander's plan reaches `status: 'ready'` (or decision trace signals intent to launch), the player sees an `APPROVE_OP:` proposal card in the Autonomy Panel.
- Accepting → `player_op_response.approved = true` → plan launches normally next turn.
- Rejecting → `player_op_response.approved = false` → plan is abandoned, corps returns to planning phase.
- No response → plan is held at `'ready'` and does not emit operations until the player acts.

For the `nato_ultimatum_sarajevo_1994` event (turn 96, RS player faction): the event is always surfaced as a player decision at all autonomy levels (0–3), because `requires_player_response: true` overrides the Level 3 Observer auto-resolve path.

---

## Canonical Owners

| Component | File |
|---|---|
| Op proposal generation | `src/sim/ai_commander/proposal_generation.ts` |
| Plan-launch guard | `src/sim/combat/commander/commander_loop.ts::applyCommanderOutput` |
| player_op_response schema | `src/state/game_state.ts::CorpsCommandState` |
| Pipeline step | `src/sim/turn_phases/war_phases.ts` |
| IPC handlers | `src/desktop/electron-main.cjs` |
| High-stakes event | `data/scenarios/events/war_1994.json` |

---

## Verification

- `npx.cmd tsc --noEmit -p tsconfig.json`: **CLEAN**
- `npm.cmd run test:vitest`: **2846/2846 passed (196 files)**
- `npm.cmd run desktop:map:build`: **CLEAN** (pre-existing chunk size warning, not Phase D)

---

## What Phase E Should Address

1. **Turn-advance block for `requires_player_response` events** — currently the turn can advance while `pending_event_decisions` has unresolved high-stakes events. Phase E should add a gate in `advance-turn` IPC handler that blocks advance when any pending decision has `requires_player_response: true`.
2. **AutonomyPanel UI for op proposals** — `APPROVE_OP:` proposals are generated and stored but the `AutonomyPanel.tsx` does not yet distinguish op proposals from stance proposals visually. Phase E can add domain-specific card rendering.
3. **Op proposal description enrichment** — currently uses `plan.objective_description`. Phase E can enrich with estimated force strength, zone name, enemy threat rating from the commander briefing.
4. **gradacac_2 P0** — pre-existing calibration anchor failure, unrelated to Phase D.
