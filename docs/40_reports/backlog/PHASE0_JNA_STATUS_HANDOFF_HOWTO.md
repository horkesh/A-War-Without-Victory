# Phase 0 JNA_status hand-off: How to proceed (2.1)

**Date:** 2026-02-24  
**Purpose:** Confirm JNA_status (transition_begun, withdrawal_progress, asset_transfer_RS) is in Phase 0 §7/§8 and actually passed into Phase I; add to contract or implementation if missing.  
**Source:** [20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md) §2.1, [ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](../convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md).

---

## 1. Audit result

### Canon (Phase 0 Spec)

- **§7.7 JNA Status** — Present. Lists: transition_begun (boolean), withdrawal_progress (0.0–1.0), asset_transfer_RS (0.0–1.0). "Required by Phase I §3 (JNA_status)."
- **§8 Output Contract** — Present. The JS block includes `JNA_status: { transition_begun, withdrawal_progress, asset_transfer_RS }`.

So the **contract is already in place** (gap was closed 2026-02-23 per napkin/convene).

### Phase I

- **Phase I Spec §3** — Expects JNA_status (transition_begun, withdrawal_progress, asset_transfer_RS).
- **Code** — Reads `state.phase_i_jna` in jna_transition.ts, phase_i_to_phase_ii.ts, militia_emergence.ts, authority_degradation.ts. Serialization and validation include phase_i_jna.

### Implementation: where JNA_status is set at Phase 0→I

| Path | Where transition happens | Is phase_i_jna set at transition? |
|------|---------------------------|------------------------------------|
| **Warroom / desktop** | run_phase0_turn.ts: runPhase0TurnAndAdvance → runPhase0Turn (phase0/turn.ts) → applyPhase0ToPhaseITransition; then applyPhaseIHandoff(working) | **Yes.** applyPhaseIHandoff sets phase_i_jna to { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 } when missing. |
| **Scenario runner (runOneTurn)** | state/turn_pipeline.ts runOneTurn → runPhase0Turn (phase0/turn.ts) → applyPhase0ToPhaseITransition. **No** applyPhaseIHandoff. | **Yes (as of 2026-02-24).** applyPhase0ToPhaseITransition now sets state.phase_i_jna at transition (Option A1); both paths receive it at the same moment. |

So: **canon is satisfied; implementation gap closed 2026-02-24:** both scenario runner and warroom paths set `phase_i_jna` at the moment of Phase 0→I transition. Transition audit fields (`phase_0_end_turn`, `phase_1_start_turn`, `escalation_reason`) are persisted in `state.meta` at transition.

---

## 2. Recommendations

### A. Set JNA_status at transition (single place)

**Option A1 — In applyPhase0ToPhaseITransition (phase0/referendum.ts)**  
When setting `meta.phase = 'phase_i'`, also set `state.phase_i_jna` to the Phase 0 output:

- `transition_begun`: `true` if RS is already declared at transition, else `false` (Phase I will set it true on first turn when RS declared).
- `withdrawal_progress`: `0`
- `asset_transfer_rs`: `0`

**Pros:** One place; both scenario runner and warroom use the same Phase 0 turn (referendum.ts), so both paths get phase_i_jna at transition.  
**Cons:** referendum.ts must read faction state (RS declared); currently it only touches meta.

**Option A2 — In runOneTurn after runPhase0Turn**  
In state/turn_pipeline.ts runOneTurn, after `runPhase0Turn(working, ...)`, if `working.meta.phase === 'phase_i'`, set `working.phase_i_jna` to the same canonical initial value (and optionally call an applyPhaseIHandoff-like helper that only sets phase_i_jna if missing, to avoid duplicating logic).

**Pros:** No change to referendum.ts; hand-off logic stays in pipeline.  
**Cons:** Warroom path still uses applyPhaseIHandoff in run_phase0_turn.ts; we have two places that can set phase_i_jna (both idempotent if “set if missing”).

**Suggested:** **Option A1** — set phase_i_jna inside applyPhase0ToPhaseITransition so the contract is satisfied at the single transition point. Then run_phase0_turn.ts applyPhaseIHandoff can leave phase_i_jna as-is when already set (it currently only sets when `!state.phase_i_jna`).

### B. transition_begun at hand-off

Per Phase 0 design, at war start RS is usually already declared, so JNA transition has “begun” in narrative terms. Setting `transition_begun = true` at hand-off when RS is declared matches the contract and avoids a one-turn delay; Phase I jna_transition.ts will then just advance withdrawal/asset_transfer. So in applyPhase0ToPhaseITransition, set `transition_begun` from RS declared state (e.g. from state.factions / RS.declared).

### C. Contract wording (optional)

Add one sentence to Phase 0 §7.7 or §8 implementation-note: “At transition, implementation must set state.phase_i_jna from this JNA_status; Phase I reads state.phase_i_jna.” No change to the JSON shape.

### D. transition.phase_0_end_turn / phase_1_start_turn / escalation_reason

§8 Output Contract also lists `transition: { phase_0_end_turn, phase_1_start_turn, escalation_reason }`. These are not yet stored in state.meta at transition. Treat as separate, small follow-up: either add to meta at applyPhase0ToPhaseITransition or document as “optional audit fields” and add later.

---

## 3. Suggested order of work

1. **Implement Option A1:** In `applyPhase0ToPhaseITransition` (phase0/referendum.ts), when setting `meta.phase = 'phase_i'`, set `state.phase_i_jna` to `{ transition_begun: RS declared, withdrawal_progress: 0, asset_transfer_rs: 0 }`. Use existing faction lookup (e.g. same pattern as isReferendumEligible) to read RS declared.
2. **Keep applyPhaseIHandoff:** In run_phase0_turn.ts, leave `if (!state.phase_i_jna) { ... }` so warroom path still initializes if for some reason phase_i_jna were missing; after A1 it will usually already be set.
3. **Optional:** Add implementation-note to Phase 0 §7.7: “At transition, implementation sets state.phase_i_jna from this output; Phase I reads state.phase_i_jna.”
4. **Optional (follow-up):** Persist transition.phase_0_end_turn, phase_1_start_turn, escalation_reason in meta or a small transition object when transitioning.

---

## 4. Verification

- Run a Phase 0 scenario that transitions to Phase I (e.g. phase0_full_progression_20w or equivalent). After the transition turn, assert `state.phase_i_jna` is defined and has transition_begun, withdrawal_progress, asset_transfer_rs.
- Run the same from scenario_runner (runOneTurn path) and from warroom/desktop; both should have phase_i_jna set at the same transition turn.

---

## 5. References

- Phase 0 Spec §7.7, §8 (docs/10_canon/Phase_0_Specification_v0_5_0.md)
- Phase I Spec §3 (docs/10_canon/Phase_I_Specification_v0_5_0.md)
- applyPhase0ToPhaseITransition: src/phase0/referendum.ts
- applyPhaseIHandoff: src/ui/warroom/run_phase0_turn.ts
- runOneTurn: src/state/turn_pipeline.ts
- runJNATransition: src/sim/phase_i/jna_transition.ts
