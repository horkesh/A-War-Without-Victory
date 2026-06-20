# Operation Reevaluation on Brigade Loss: Commander Assessment and Corps CO Decision

**Status:** DESIGN SPEC (not implementation)
**Author:** Game Designer
**Date:** 2026-03-29
**Depends on:** MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md (main/support designation)
**Canon refs:** Rulebook v0.7 SS6.4 (ops-only doctrine), SS7.2 (operation preparation — postpone/abort precedent), SS7.3 (stall caps); Systems Manual v0.7 SS6.4 (corps command), SS6.8 (pioneer attacks), SS6.9 (brigade no-destruction), SS7.4 (brigade dissolution), SS7.6 (operation preparation system), SS7.7 (elite brigade loans)

---

## 1. Problem Statement

When a brigade is removed from an active operation — dissolved, withdrawn by JNA departure, recalled from elite loan, or destroyed in a pocket — the operation continues as if nothing happened. The remaining brigades attack the same objectives with reduced force, often leading to:

1. **Suicide offensives:** An operation that was viable with 4 brigades grinds on with 2, taking catastrophic casualties on objectives the force can no longer capture.
2. **Phantom participants:** The `participating_brigades` list shrinks but the operation's scope (objectives, axes) does not. Axes with zero brigades remain in `executing` status.
3. **No commander agency:** A real operation commander who loses a third of their force mid-operation would immediately reassess. The current system has no reassessment — it relies on the blunt failure-count abort (`MAX_TOTAL_FAILURES = 5`) to eventually kill the operation.

The existing `removeFromActiveOperation()` in `brigade_dissolution.ts` handles the mechanical cleanup (filter brigade from `participating_brigades` and `axes[].assigned_brigades`). This spec adds the **decision layer** on top: the commander evaluates whether the operation remains feasible, and the corps CO acts on that evaluation.

---

## 2. Design Principles

**P1: The commander reacts to loss, not the clock.** Current abort logic is turn-based (failure counts, stall timers). This system is event-based: a brigade removal triggers an immediate reassessment. Both systems coexist — the event-based reevaluation catches problems faster than waiting for failures to accumulate.

**P2: Scope reduction before abort.** A real commander first tries to salvage what has been gained. If the main effort axis lost its spearhead but the secondary axis captured two objectives, the commander does not throw everything away — they declare partial success and consolidate. Abort is the last resort.

**P3: The CO decides, not the commander.** The operation commander assesses and recommends. The corps CO (bot AI or player) decides. This mirrors the existing preparation system where the commander issues a go/no-go recommendation but the CO can override (Rulebook SS7.2: "The player can force-launch an operation at any preparation phase, overriding the commander's recommendation").

**P4: Reinforcement is rare and costly.** Pulling a sector reserve into a mid-operation reinforcement is not free — it weakens the defensive line and requires movement turns. The CO only does this when the prize justifies the risk.

**P5: Compatible with main/support designation.** When the MAIN brigade is lost, reevaluation includes main redesignation per MULTI_BRIGADE_OPERATION_DESIGN_SPEC SS3.2. The reevaluation flow calls the same `selectMainBrigade()` logic.

---

## 3. Trigger Conditions

Reevaluation fires whenever a brigade is removed from an active operation in `execution` phase. Specifically, reevaluation fires **after** the mechanical removal (the existing `removeFromActiveOperation()` pattern) and **before** the next attack resolution.

### 3.1 Trigger Sources

| Source | Where it happens today | Removal pattern |
|--------|----------------------|-----------------|
| **Brigade dissolution** | `brigade_dissolution.ts` — `removeFromActiveOperation()` | 2-of-3 criteria met (personnel < 400, cohesion <= 20, morale <= 15) |
| **JNA phantom withdrawal** | `jna_phantom_brigades.ts` — filter from `participating_brigades` + `axes` | JNA departure timeline |
| **Elite loan recall** | `sector_offensive.ts` — loan timeout, need expired | Army HQ recalls brigade (Rulebook SS7.7: "op_complete or need_expired") |
| **Elite loan non-arrival** | `sector_offensive.ts` — staging timeout drops non-arrived loans | Loan brigade never reached the sector |
| **Pocket destruction** | (future) enclave collapse mechanics | Brigade surrounded and eliminated |
| **Manual withdrawal** | (future) player pulls brigade from operation | Player decision |

### 3.2 Gate: Only During Execution

Reevaluation only fires when `op.phase === 'execution'`. During `planning`, brigade loss simply delays preparation (fewer brigades to stage). During `recovery`, the operation is already winding down.

### 3.3 Gate: Not for Probes

Probes (`op.type === 'probe'`) are small, expendable reconnaissance actions. If the probe brigade is lost, the probe is simply marked complete. No reevaluation. This is consistent with MULTI_BRIGADE_OPERATION_DESIGN_SPEC SS9.6: "Probes are small (1-2 brigades) and do not need main/support designation."

---

## 4. Commander Assessment

The operation commander runs a structured assessment when triggered. This produces a `ReevaluationAssessment` — a data object that captures the commander's analysis and recommendation.

### 4.1 Assessment Steps

The commander evaluates in order:

**Step 1: Check for empty axes.**
For each axis in `op.axes`, check if `axis.assigned_brigades.length === 0`. An axis with zero brigades is immediately marked `status: 'complete'` (it cannot execute). Record the axis as `abandoned`.

**Step 2: Main brigade redesignation.**
For each axis that still has brigades, check if `axis.main_brigade_id` was the removed brigade. If so, run `selectMainBrigade()` (MULTI_BRIGADE_OPERATION_DESIGN_SPEC SS3.2) against the remaining axis brigades. If a viable MAIN is found, redesignate. If no viable MAIN exists (all remaining brigades are combat-ineffective or disrupted), mark the axis as `stalled_no_main`.

**Step 3: Force ratio prediction.**
For each axis that is still viable (has a MAIN), run the combat predictor (`predictCombatOutcome` from `combat_predictor.ts`) against the axis's current objective using the remaining brigades. Record the predicted outcome.

**Step 4: Aggregate assessment.**
Count:
- `viable_axes`: axes where the predictor estimates `costly_victory` or better
- `marginal_axes`: axes where the predictor estimates `stalemate` (achievable with reinforcement)
- `nonviable_axes`: axes where the predictor estimates `repulsed` or worse, plus axes with zero brigades or no viable MAIN

### 4.2 Commander Recommendation

Based on the aggregate assessment, the commander issues one recommendation:

| Condition | Recommendation | Rationale |
|-----------|---------------|-----------|
| All remaining axes viable | **CONTINUE** | Force is sufficient. Proceed as planned. |
| Some axes viable, some not | **REDUCE_SCOPE** | Drop nonviable axes, consolidate remaining force on viable objectives. |
| No axes viable, but marginal axes exist AND sector reserves available | **REINFORCE** | Remaining force is close — one more brigade tips the balance. |
| No axes viable, no marginal axes, OR total remaining brigades < `MIN_OPERATION_STRENGTH` | **ABORT** | Operation has lost critical mass. Cut losses. |

**MIN_OPERATION_STRENGTH** (suggested: 1). An operation with zero brigades is dead. An operation with 1 brigade may still hold captured ground but cannot realistically continue attacking. The threshold is deliberately low because the combat predictor already gates on force ratio — this is a last-resort floor.

### 4.3 Commander Personality Influence

The operation commander's personality (competence + aggressiveness) shapes the assessment, consistent with the existing preparation system (Systems Manual SS7.6):

- **Aggressive commanders** (aggressiveness > 0.6) treat `stalemate` predictions as `costly_victory` (they believe they can push through). This shifts borderline cases from REDUCE_SCOPE to CONTINUE, and from REINFORCE to REDUCE_SCOPE.
- **Cautious commanders** (aggressiveness < 0.3) treat `costly_victory` predictions as `stalemate`. They recommend scope reduction earlier.
- **Competent commanders** (competence > 0.7) get a more accurate combat prediction (reduced noise). Their assessments are more trustworthy.

This reuses the existing personality formulas from `operation_preparation.ts` — no new personality mechanics.

---

## 5. Corps CO Decision

The corps CO receives the commander's assessment and decides the response. For bot factions, this is automatic. For the player faction, this surfaces as a decision event.

### 5.1 Bot CO Decision Logic

The bot CO follows a deterministic decision tree:

```
if recommendation == CONTINUE:
    accept → operation continues unchanged

else if recommendation == REDUCE_SCOPE:
    for each nonviable axis:
        mark axis status = 'complete'
        redistribute axis brigades to viable axes (if adjacent)
        or issue return march to sector reserve positions
    if objectives already captured > 0:
        record partial_success
    continue with reduced scope

else if recommendation == REINFORCE:
    search corps sector reserves for eligible brigade:
        - not disrupted
        - not combat-ineffective (personnel >= 400)
        - reachable (BFS distance to nearest operation OSID <= MAX_REINFORCE_DISTANCE)
    if eligible reserve found:
        assign to most-needed axis (fewest brigades, or axis with marginal prediction)
        add to op.participating_brigades and axis.assigned_brigades
        enter repositioning (per MULTI_BRIGADE_OPERATION_DESIGN_SPEC SS4.2)
    else:
        fall through to REDUCE_SCOPE logic
        if no viable axes remain after reduction: ABORT

else if recommendation == ABORT:
    beginRecovery(op, turn, 'brigade_loss_abort', state)
    issue return marches for all participating brigades
    record failure
```

**MAX_REINFORCE_DISTANCE** (suggested: 4 hops). A reserve brigade more than 4 hops away would take too long to arrive — the operation will have stalled by then. This is consistent with the existing `MAX_REPOSITIONING_TURNS = 3` from the multi-brigade spec.

### 5.2 Bot CO Override: Doctrine Influence

The corps stance modifies the CO's willingness to reinforce:

- **Offensive stance:** CO is more willing to reinforce (accepts REINFORCE recommendation when reserves are available, even at `MAX_REINFORCE_DISTANCE`).
- **Balanced stance:** CO follows commander recommendation without modification.
- **Defensive stance:** CO never reinforces (defensive corps should not be running operations in the first place per `bot_corps_directives.ts` line 1001, but if one inherited an active op, the CO would not weaken the defense further).

### 5.3 Player CO: Decision Event

For the player's faction, the commander's assessment surfaces as a **decision event** — a briefing panel that interrupts the turn with the commander's report and options.

**Event structure:**

```
OPERATION REEVALUATION — [Operation Name]
Commander [Officer Name] reports:

"[Brigade Name] has been [dissolved/withdrawn/recalled]. Our [main/axis N]
force is reduced to [X] brigades.

Assessment: [Predicted outcome against [objective name]].

I recommend: [CONTINUE / REDUCE_SCOPE / REINFORCE / ABORT]."

Options:
  [1] Accept recommendation — [description of what happens]
  [2] Continue anyway — override commander, press the attack with reduced force
  [3] Reinforce — pull [Reserve Brigade Name] from [Sector Name] (available/unavailable)
  [4] Abort — enter recovery, free the corps slot
```

**Option availability:**
- Option 2 (continue) is always available. The player can always override.
- Option 3 (reinforce) is only available if an eligible sector reserve exists within `MAX_REINFORCE_DISTANCE`. If no reserve is available, the option is greyed out with explanation.
- Option 4 (abort) is always available.

**Canon justification (Rulebook SS7.2):** "The player can force-launch an operation... overriding the commander's recommendation — at the risk of attacking with incomplete intelligence and insufficient forces." The same override authority applies here. The player can ignore the commander's abort recommendation and press on — at the risk of catastrophic losses.

**Bot auto-resolve:** When the player does not interact with the event (e.g., auto-advance mode), the bot CO logic (SS5.1) applies as a fallback.

---

## 6. Interaction with Main/Support Designation

This spec depends on and extends the MULTI_BRIGADE_OPERATION_DESIGN_SPEC.

### 6.1 Main Brigade Lost

When the removed brigade was the axis MAIN:

1. The reevaluation's Step 2 calls `selectMainBrigade()` from the multi-brigade spec.
2. If a support brigade qualifies as the new MAIN, redesignation happens immediately. The reevaluation continues with the new MAIN in the prediction.
3. If no support brigade qualifies (all combat-ineffective or disrupted), the axis is `stalled_no_main`. The commander must recommend REDUCE_SCOPE or ABORT for this axis.

**Example:** Operation Drina has Axis North with 285th (MAIN) and 260th (SUPPORT). The 285th is dissolved after taking catastrophic casualties. The 260th is adjacent to the objective and has 1,200 personnel — it becomes the new MAIN. The combat predictor re-runs with the 260th alone: predicted `stalemate`. Commander recommends REDUCE_SCOPE if Axis South is still viable, or ABORT if not.

### 6.2 Support Brigade Lost

When a support brigade is removed:

1. The axis MAIN is unchanged.
2. The combat predictor re-runs with reduced force (fewer support brigades contributing `SUPPORT_POWER_FRACTION`).
3. If the prediction drops below `costly_victory`, the axis becomes marginal or nonviable.

### 6.3 Repositioning After Reinforcement

When the CO decides to reinforce and assigns a reserve brigade:

1. The new brigade is added to the axis as SUPPORT.
2. The axis enters the repositioning sub-state (MULTI_BRIGADE_OPERATION_DESIGN_SPEC SS4.2).
3. The reinforcement brigade marches toward its assigned support position.
4. The readiness check (SS4.3) must pass before the axis attacks again.

This means reinforcement has a real time cost: the axis pauses for 1-3 turns while the reinforcement arrives. The operation does not get free combat power.

---

## 7. Recovery Reasons

A new `recovery_reason` value is needed:

```typescript
recovery_reason?: 'completed' | 'max_failures' | 'orphaned_sector' | 'no_logged_attempt'
                | 'manual_termination' | 'probe_complete' | 'brigade_loss_abort';
```

**`brigade_loss_abort`**: The operation was aborted because brigade losses made it infeasible. This is distinct from `max_failures` (which is attrition-based) and `manual_termination` (which is CO choice without a precipitating loss event).

**Recovery duration for `brigade_loss_abort`:** 1 turn. The operation was cut short by external circumstances, not by grinding failure. The corps should be freed quickly to reassign brigades. This is consistent with `manual_termination` (also 1 turn).

**Failed objective recording:** `brigade_loss_abort` records uncaptured objectives as failures (same as `max_failures`), feeding the `failed_offensive_objectives` cooldown system. This prevents the bot from immediately relaunching the same operation that just failed due to force loss.

---

## 8. Scope Reduction Mechanics

When the CO accepts REDUCE_SCOPE:

### 8.1 Axis Abandonment

Nonviable axes have their status set to `'complete'` (not a new status — reuse existing). Their uncaptured objectives are recorded as failures.

### 8.2 Brigade Redistribution

Brigades from abandoned axes can be redistributed to surviving axes if:
- The brigade is not disrupted
- The brigade is not combat-ineffective
- A friendly path exists from the brigade's current OSID to the surviving axis's operating area (within `MAX_REINFORCE_DISTANCE` hops)

Redistributed brigades are added as SUPPORT to the receiving axis and trigger repositioning.

Brigades that cannot be redistributed (disrupted, too far away, combat-ineffective) receive return march orders to their home sector.

### 8.3 Partial Success

If `op.objective_capture_count > 0` (or for multi-axis: any axis has `objective_capture_count > 0`) at the time of scope reduction, the operation is flagged as a partial success for AAR purposes. This does not affect the `recovery_reason` — the operation may still eventually complete its reduced objectives or fail them.

### 8.4 Schwerpunkt Adjustment

If the abandoned axis was the schwerpunkt axis (its objectives included `op.schwerpunkt_osid`), the schwerpunkt shifts to the most advanced surviving axis. If no surviving axis targets the schwerpunkt OSID, the schwerpunkt is cleared.

---

## 9. New State Fields

### 9.1 On CorpsOperation

```typescript
interface CorpsOperation {
    // ... existing fields ...

    /** Last reevaluation result (for AAR and player briefing). */
    last_reevaluation?: ReevaluationAssessment;

    /** Turn of last reevaluation (prevent multiple reevaluations per turn). */
    last_reevaluation_turn?: number;
}
```

### 9.2 ReevaluationAssessment Type

```typescript
interface ReevaluationAssessment {
    /** Turn the assessment was made. */
    turn: number;
    /** Brigade that was lost (triggering the reevaluation). */
    lost_brigade_id: FormationId;
    /** Cause of brigade removal. */
    loss_cause: 'dissolution' | 'jna_withdrawal' | 'elite_recall' | 'pocket_destruction' | 'manual_withdrawal';
    /** Commander's recommendation. */
    recommendation: 'continue' | 'reduce_scope' | 'reinforce' | 'abort';
    /** Per-axis viability after loss. */
    axis_assessments: AxisReevaluation[];
    /** CO's decision (may differ from recommendation). */
    co_decision?: 'continue' | 'reduce_scope' | 'reinforce' | 'abort';
    /** Brigade assigned as reinforcement (if co_decision === 'reinforce'). */
    reinforcement_brigade_id?: FormationId;
}

interface AxisReevaluation {
    axis_id: string;
    /** Remaining brigade count on this axis after loss. */
    remaining_brigades: number;
    /** Whether the MAIN brigade was the one lost. */
    main_lost: boolean;
    /** New MAIN brigade (if redesignated), or null if no viable MAIN. */
    new_main_brigade_id: FormationId | null;
    /** Predicted outcome against current objective with remaining force. */
    predicted_outcome: PredictedOutcome | null;
    /** Axis viability classification. */
    viability: 'viable' | 'marginal' | 'nonviable';
}
```

### 9.3 Constants (suggested, tunable)

| Constant | Value | Rationale |
|----------|-------|-----------|
| `MIN_OPERATION_STRENGTH` | 1 | Floor: operation with 0 brigades is dead |
| `MAX_REINFORCE_DISTANCE` | 4 | Max BFS hops for reserve brigade to reach operation area |
| `REEVALUATION_COOLDOWN_TURNS` | 0 | Reevaluation can fire every turn (but only once per turn per op) |
| `AGGRESSIVE_OUTCOME_BOOST` | 1 | Aggressive commanders treat outcomes as one tier better |
| `CAUTIOUS_OUTCOME_PENALTY` | 1 | Cautious commanders treat outcomes as one tier worse |
| `REINFORCE_RECOVERY_DURATION` | 1 | Recovery turns for brigade_loss_abort |

---

## 10. Pipeline Integration

### 10.1 Trigger Point

The reevaluation must fire **after** `removeFromActiveOperation()` and **before** the next `advance-sector-offensives` tick. There are two integration approaches:

**Option A: Inline in removal sites.** Each place that calls `removeFromActiveOperation()` also calls `reevaluateOperationAfterLoss()`. This is explicit but requires touching 4+ call sites (dissolution, JNA withdrawal, elite recall, loan timeout).

**Option B: Detect-and-fire in `advance-sector-offensives`.** At the top of each `advanceSectorOffensives()` tick, compare `op.participating_brigades` against the previous turn's snapshot. If brigades are missing, fire reevaluation. This is centralized but requires a snapshot mechanism.

**Recommended: Option A.** It is explicit, matches the existing pattern (each removal site already does its own cleanup), and does not require state snapshots. The reevaluation function is called once, immediately after removal, with the loss cause as a parameter.

### 10.2 Modified Functions

1. **`removeFromActiveOperation()`** (`brigade_dissolution.ts`): After filtering the brigade from lists, call `reevaluateOperationAfterLoss(state, op, corpsId, brigadeId, 'dissolution')`. The function gains a `lossCause` parameter.

2. **JNA withdrawal sites** (`jna_phantom_brigades.ts`): After filtering, call `reevaluateOperationAfterLoss(state, op, corpsId, phantomId, 'jna_withdrawal')`.

3. **Elite loan recall/timeout** (`sector_offensive.ts`): After filtering, call `reevaluateOperationAfterLoss(state, op, corpsId, loanBrigadeId, 'elite_recall')`.

4. **`advance-sector-offensives`** (`sector_offensive.ts`): After CO decision, if `co_decision === 'abort'`, call `beginRecovery(op, turn, 'brigade_loss_abort', state)`. If `co_decision === 'reduce_scope'`, mark nonviable axes as complete and redistribute. If `co_decision === 'reinforce'`, add the reserve brigade to the operation.

### 10.3 New Module

**`src/sim/combat/operation_reevaluation.ts`** — contains:
- `reevaluateOperationAfterLoss()` — the trigger function
- `assessOperationFeasibility()` — the commander assessment logic
- `botCorpsDecision()` — the bot CO decision tree
- `applyReevaluationDecision()` — executes the CO's decision (abort, reduce, reinforce)

### 10.4 Player Event Integration

For the player faction, `reevaluateOperationAfterLoss()` emits a decision event instead of calling `botCorpsDecision()`. The event is queued in the turn's event list and presented in the briefing panel. The player's choice is resolved before the next combat phase.

---

## 11. Interaction with Existing Abort Mechanics

The reevaluation system **coexists** with existing abort triggers. It does not replace them.

| Existing trigger | Still active? | Interaction |
|-----------------|---------------|-------------|
| `MAX_TOTAL_FAILURES = 5` | Yes | If reevaluation continues but failures accumulate, the existing abort fires. Reevaluation catches the problem faster in many cases. |
| `MAX_MOVEMENT_ONLY_EXECUTION_TURNS = 4` | Yes | Unchanged. Movement stalls are a different problem from force loss. |
| `orphaned_sector` | Yes | If the sector is destroyed (e.g., enemy captures all sector OSIDs), the orphan check fires before reevaluation would matter. |
| `manual_termination` | Yes | Player/bot can still manually halt an operation regardless of reevaluation. |
| Zero-progress early abort (multi-axis) | Yes | Cumulative failure logic still applies across axes. |
| Consecutive catastrophic abort (per-axis) | Yes | Two catastrophics on the same objective still stall the axis. |

**Priority:** If multiple abort triggers fire on the same turn, the first one to call `beginRecovery()` wins (the function is idempotent — subsequent calls on an operation already in `recovery` are no-ops).

---

## 12. Edge Cases

### 12.1 Multiple Brigades Lost Same Turn

If two brigades are dissolved on the same turn (e.g., both hit the 2-of-3 threshold), reevaluation fires twice. The second reevaluation sees the state after the first reevaluation's decision was applied.

**Guard:** `last_reevaluation_turn` prevents redundant reevaluations within the same turn. If reevaluation already fired this turn, the second removal skips reevaluation — the first reevaluation already accounted for the reduced force.

**Correction:** Actually, the second removal further reduces force beyond what the first reevaluation saw. The guard should allow re-reevaluation: update `last_reevaluation_turn` to prevent infinite loops but allow a second pass if force changed again. Implementation: reevaluation fires once per removal event, but the CO decision is only applied once per turn (latest wins).

### 12.2 Reevaluation During Repositioning

If a brigade is lost while the axis is in the repositioning sub-state (MULTI_BRIGADE_OPERATION_DESIGN_SPEC SS4.2), the reevaluation runs against the NEXT objective (the one being repositioned for), not the current one. The combat prediction uses the repositioning target as the objective.

### 12.3 Single-Brigade Operation Loses Its Brigade

If `op.participating_brigades` drops to length 0, the operation is dead. The reevaluation skips the assessment and directly recommends ABORT. The CO has no choice but to accept — there is no force to continue with.

### 12.4 Reinforcement Brigade Also Lost

If the CO decides to reinforce, and the reinforcement brigade is dissolved before it arrives (e.g., it was already weakened), the arrival check in `sector_offensive.ts` handles this — the brigade never arrives, the axis times out on repositioning, and normal stall logic applies. No special handling needed.

### 12.5 Operation in Planning Phase

If a brigade is lost during `planning` phase, no reevaluation fires (SS3.2 gate). However, the force ratio estimate for the preparation assessment should naturally degrade because the commander's `force_ratio_estimate` is recomputed each preparation tick. A reduced force may cause the commander to recommend postponement or abort during the normal preparation assessment. No special handling needed — the existing preparation system handles this.

### 12.6 Legacy (Non-Multi-Axis) Operations

For operations without `axes` (legacy flat structure), the reevaluation applies to the operation as a whole rather than per-axis. The single prediction runs against `op.objectives[op.current_objective_index]` with all remaining `participating_brigades`. The recommendation is CONTINUE, REINFORCE, or ABORT (REDUCE_SCOPE does not apply — there are no axes to drop).

---

## 13. AAR Integration

The reevaluation assessment is recorded in the operation's AAR:

1. **Weekly log entry:** When reevaluation fires, a `weekly_log` entry is added: `"w[turn]: [Brigade Name] lost ([cause]). Commander recommends [recommendation]. CO decides [decision]."` This uses the existing `OperationWeeklyEntry` format.

2. **Final AAR:** The `last_reevaluation` field on the operation is included in the operation's after-action report. If scope was reduced, the AAR notes which axes were abandoned and why. If the operation was aborted due to brigade loss, the AAR records it as `brigade_loss_abort` (distinct from attrition-based failure).

3. **Anomaly detector integration:** The existing anomaly detector (`src/scenario/anomaly_detector.ts`) should flag operations where reevaluation fires more than twice — this indicates the operation was planned with inadequate force or the brigades are being attrited too fast.

---

## 14. Calibration Impact Assessment

**Expected effects:**

- Operations will abort SOONER when they lose critical brigades. This reduces the "suicide offensive" pattern where depleted operations grind on. Fewer total casualties per operation, but more failed operations.
- RS blitz phase (w0-12) may see fewer completed objectives if JNA phantom withdrawals trigger reevaluation. The VRS early operations depend heavily on JNA brigades that withdraw mid-operation. **Mitigation:** JNA withdrawal is scheduled and predictable — the bot should not assign JNA brigades to operations that extend past their withdrawal date. This is an existing problem that reevaluation exposes, not creates.
- Scope reduction preserves partial gains. Currently, a failed operation records ALL uncaptured objectives as failures. With scope reduction, axes that captured objectives are recorded as successes while abandoned axes are recorded as failures. This may improve bot learning (the `failed_offensive_objectives` cooldown is more targeted).
- Reinforcement from sector reserves may weaken defensive lines. This is intentional — it models the real tradeoff of committing reserves to offensive operations.

**Calibration levers:**
- `MAX_REINFORCE_DISTANCE`: Higher = CO can pull reserves from farther away (more reinforcement, weaker defense).
- `AGGRESSIVE_OUTCOME_BOOST` / `CAUTIOUS_OUTCOME_PENALTY`: Controls how easily aggressive commanders continue vs cautious ones abort.
- Removing the reevaluation for specific operation types (e.g., exempt pre-planned blitz operations from reevaluation during w0-12).

---

## 15. Open Questions for Operations Expert

1. Should reevaluation fire for `elite_recall` when the recall is expected (operation completing normally)? The loan lifecycle says loans end on `op_complete` — if the operation is completing, reevaluation is moot. But if the army HQ force-recalls mid-operation (need expired elsewhere), that IS a meaningful loss.

2. Should the bot CO ever override the commander's ABORT recommendation and continue? The player can (SS5.3, option 2). The bot CO currently follows a strict decision tree. An aggressive corps commander (from the officer system) might override ABORT → CONTINUE. Is this worth modeling?

3. For scope reduction, should the operation's `schwerpunkt_osid` update automatically, or should the CO explicitly choose the new main effort? Automatic is simpler; explicit is more realistic but adds complexity.

4. Should reevaluation produce a morale effect on remaining brigades? Losing a comrade formation mid-battle has psychological impact. A small cohesion penalty (e.g., -5) on remaining participating brigades would model this. But it risks cascading dissolution.

---

## 16. Implementation Priority

This spec should be implemented AFTER the multi-brigade main/support spec (MULTI_BRIGADE_OPERATION_DESIGN_SPEC), since reevaluation depends on the main/support designation system for Step 2 (main redesignation) and Step 6 (repositioning after reinforcement).

**Suggested implementation order:**
1. `OperationNotification` type and `TurnNotificationQueue` infrastructure
2. New `recovery_reason` value (`brigade_loss_abort`)
3. `ReevaluationAssessment` type and `AxisReevaluation` type
4. `assessOperationFeasibility()` — commander assessment logic
5. `botCorpsDecision()` — bot CO decision tree
6. `applyReevaluationDecision()` — abort, reduce scope, reinforce execution
7. Wire trigger into `removeFromActiveOperation()` and other removal sites
8. Wire informational notifications into all existing operation state changes (axis complete, repositioning, recovery, objective skip, stall)
9. Player decision event UI (briefing panel integration)
10. AAR integration (notifications feed weekly_log)
11. Calibration pass

---

## 17. Operation Notification and Decision Framework

Every state change in an active operation must surface to the player. Nothing happens silently. For bot factions, all notifications are auto-resolved by the bot CO. For the player faction, notifications are either **informational** (player acknowledges) or **decisional** (player chooses a response).

### 17.1 Notification Categories

All operation notifications share a common structure:

```typescript
interface OperationNotification {
    /** Turn the notification was generated. */
    turn: number;
    /** Operation this notification concerns. */
    operation_name: string;
    /** Corps running the operation. */
    corps_id: FormationId;
    /** Notification type (determines UI treatment). */
    type: OperationNotificationType;
    /** Whether the player must respond (decisional) or just acknowledge (informational). */
    requires_decision: boolean;
    /** Human-readable summary for the briefing panel. */
    headline: string;
    /** Detailed body text (commander's voice). */
    body: string;
    /** Available options (only if requires_decision === true). */
    options?: OperationNotificationOption[];
    /** Bot auto-resolve choice (used for bot factions, or as player fallback in auto-advance). */
    bot_default_option?: string;
}

interface OperationNotificationOption {
    id: string;
    label: string;
    description: string;
    /** Whether this option is currently available (greyed out if false). */
    available: boolean;
    /** Reason the option is unavailable (shown as tooltip). */
    unavailable_reason?: string;
}
```

### 17.2 Notification Catalog

Every operation state change maps to a notification:

| Event | Type | Decisional? | Headline Template | When |
|-------|------|-------------|-------------------|------|
| **Brigade removed** | `brigade_lost` | No (info only) | "Commander reports: [Brigade] destroyed. [Op] reduced to [N] brigades." | After `removeFromActiveOperation()` |
| **Commander reevaluation** | `reevaluation` | **Yes** | "Commander [Name] reassessing [Op] after loss of [Brigade]." | After assessment, before CO decision |
| **Axis emptied** | `axis_abandoned` | No | "[Axis Name] has no remaining brigades. Axis abandoned." | During reevaluation Step 1 |
| **Main brigade redesignated** | `main_redesignated` | No | "[New Main] takes over as spearhead on [Axis Name]." | During reevaluation Step 2 |
| **Reinforcement assigned** | `reinforcement_assigned` | No | "[Reserve Brigade] pulled from [Sector] to reinforce [Op]." | After CO decides REINFORCE |
| **Scope reduced** | `scope_reduced` | No | "[Op] scope reduced: [N] axes abandoned, [M] objectives dropped." | After CO decides REDUCE_SCOPE |
| **Operation stalled** | `op_stalled` | **Yes** | "[Op] stalled: no eligible attackers for [N] turns. Continue or abort?" | When `idle_execution_turn_streak` hits threshold |
| **Objective already captured** | `objective_skipped` | No | "[Objective OSID] already under friendly control. Advancing to next target." | When axis skips a friendly-controlled objective |
| **Axis stalled** | `axis_stalled` | No | "[Axis Name] stalled after [N] consecutive failures on [Objective]." | When axis hits consecutive catastrophic or failure cap |
| **Axis completed** | `axis_completed` | No | "[Axis Name] completed: [N]/[M] objectives captured." | When axis status changes to `complete` |
| **Operation entering recovery** | `op_recovery` | No | "[Op] entering recovery. [N] objectives captured, [M] failed. [X] casualties." | When `beginRecovery()` is called |
| **Operation completed** | `op_completed` | No | "[Op] complete. [Summary of results]." | When recovery ends and op is removed |
| **Repositioning started** | `repositioning` | No | "[Axis Name] repositioning for [Next Objective]. Estimated [N] turns." | When axis enters repositioning sub-state |
| **Repositioning timeout** | `repositioning_timeout` | No | "[Axis Name] attacking [Objective] with partial support — repositioning timed out." | When `MAX_REPOSITIONING_TURNS` exceeded |

### 17.3 Decisional Events (Player Faction)

For the player faction, decisional notifications pause the turn and present a briefing panel. The player must respond before the turn advances past the combat phase.

**Reevaluation decision** (from SS5.3, expanded):

```
OPERATION REEVALUATION — Operation Corridor

Commander Maj. Slavko Lisica reports:

"1st Posavina Brigade destroyed at Derventa. Northern axis reduced to
2 brigades. Combat predictor: STALEMATE against brod_2 with remaining
force.

Southern axis remains viable: 3 brigades, predicted COSTLY VICTORY
against modrica_2.

I recommend: REDUCE SCOPE — abandon Northern axis, consolidate on
Southern objectives."

[1] Accept: Reduce scope (abandon Northern axis, 2 brigades return to sector)
[2] Continue: Press both axes with reduced force
[3] Reinforce: Pull 327th Motorized from Doboj sector reserve (3 hops, ~2 turns)
[4] Abort: End operation, enter recovery (1 turn), free corps slot
```

**Stall decision** (new):

```
OPERATION STALL — Operation Una

Commander reports:

"Operation Una has made no attacks for 3 consecutive turns. All assigned
brigades are either in transit, disrupted, or facing unfavorable odds.
Objectives remaining: 2/4.

Continue waiting, or abort?"

[1] Continue: Wait for brigades to reach position (risk further stall)
[2] Abort: End operation, enter recovery
```

### 17.4 Informational Events (Player Faction)

Informational notifications appear in the turn briefing panel (or sidebar log) but do not pause the turn. The player can review them at their leisure. They serve the principle that **nothing happens to the player's operations in silence**.

Examples:

```
[TURN 23] Operation Drina — 285th East Bosnia Brigade dissolved.
           Operation reduced from 4 to 3 brigades.

[TURN 23] Operation Drina — Axis East: 260th Brigade designated as
           new spearhead (was support).

[TURN 25] Operation Drina — Axis West: Objective rastosnica_2 already under
           friendly control. Advancing to next target (vitinica_2).

[TURN 27] Operation Drina — Axis East completed: 2/3 objectives captured.

[TURN 28] Operation Drina entering recovery. 4 of 6 objectives captured.
           Casualties: 1,847 (1 brigade dissolved). Duration: 8 turns.
```

### 17.5 Bot Faction Auto-Resolution

For bot factions, all notifications are generated but immediately auto-resolved:
- Informational notifications are logged to the operation's `weekly_log` for AAR purposes.
- Decisional notifications are resolved by `botCorpsDecision()` (SS5.1). The chosen option is logged.
- No UI display for bot faction notifications (they are internal bookkeeping).

### 17.6 Pipeline Placement

Notifications are emitted during the `advance-sector-offensives` step and the `apply-brigade-dissolution` step. They are collected into a per-turn notification queue:

```typescript
interface TurnNotificationQueue {
    operation_notifications: OperationNotification[];
}
```

This queue is consumed by:
1. **Electron UI**: The briefing panel reads the queue and displays notifications. Decisional events block turn advance until resolved.
2. **Scenario runner** (headless): Decisional events are auto-resolved by bot logic. Notifications are logged to the run output for debugging.
3. **AAR system**: All notifications feed into the operation's weekly log.

### 17.7 Notification Deduplication

Multiple notifications can fire on the same turn for the same operation (e.g., brigade lost + reevaluation + axis abandoned). These are NOT deduplicated — each is a distinct event that the player should see. However, they are **ordered** to tell a coherent story:

1. Brigade lost (what happened)
2. Axis abandoned / main redesignated (immediate consequences)
3. Commander reevaluation (assessment and recommendation)
4. CO decision (what the player/bot decided)
5. Reinforcement assigned / scope reduced (execution of decision)

This ordering is enforced by the notification queue's insertion order, which follows the reevaluation flow's step order.

---

## Blockers

**None.** Canon explicitly supports this design:

- **Rulebook SS7.2** establishes the commander assessment / CO override pattern for operations. This spec extends that pattern from preparation to execution.
- **Rulebook SS7.2** states "The player can force-launch an operation... overriding the commander's recommendation." The same authority to override applies to reevaluation recommendations.
- **Systems Manual SS7.6** defines the preparation state machine with abort as a valid outcome. This spec adds abort-from-execution, which is a natural extension.
- **Systems Manual SS7.4** defines brigade dissolution. This spec adds a consequence for dissolution during active operations — currently missing from canon.

Canon is **silent** on mid-operation reassessment. The Rulebook describes preparation-phase assessment and execution-phase failure counts, but does not describe what happens when a participating brigade is removed mid-execution. This spec fills that gap. No canon conflict.
