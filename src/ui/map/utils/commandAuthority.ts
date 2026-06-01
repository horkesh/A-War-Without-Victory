export const FORCE_LAUNCH_COST = 15;
/**
 * Cost of a PROACTIVE presidential force-launch (override-without-proposal):
 * forcing a corps plan the officer holds at 'ready' but never surfaced as a
 * proposal. Higher than FORCE_LAUNCH_COST (15) because the officer made no
 * recommendation at all — the president is overriding silence, not a no-go.
 */
export const PROACTIVE_FORCE_LAUNCH_COST = 25;
/**
 * Cost of AUTHORING a brand-new corps operation the officer never proposed
 * (Free War Phase 4, #67). Distinct from forcing an existing held/ready plan:
 * here the president invents the operation outright — selecting target + axis +
 * brigades the staff never staged. Priced equal to a proactive force-launch (25)
 * because both override the officer's silence rather than a surfaced no-go.
 */
export const AUTHOR_OP_COST = 25;
/**
 * Cost of the STOP-OP presidential lever (Presidential Command Model slice 1/N):
 * the president HALTS a live operation, trading the military opportunity for
 * command authority. Priced equal to a proactive force-launch (25) because the
 * president is overriding the officer's in-progress effort rather than approving
 * or declining a proposal. MUST match autonomy_ipc_contract.cjs (STOP_OP_COST = 25)
 * and the stage-op-halt-order IPC handler (op_halt.cjs).
 */
export const STOP_OP_COST = 25;
/**
 * Cost of the REQUEST-OP presidential lever (Presidential Command Model slice 2/N):
 * the president names a strategic OBJECTIVE (target OSID) for a corps and the engine
 * builds the operation a commander would (auto-selecting brigades + axis). Priced
 * equal to AUTHOR_OP_COST / STOP_OP_COST (25) because the president is directing the
 * officer's effort toward a chosen target rather than approving or declining a
 * proposal. MUST match autonomy_ipc_contract.cjs (REQUEST_OP_COST = 25) and the
 * stage-op-directive-order IPC handler (op_directive_staging.cjs).
 */
export const REQUEST_OP_COST = 25;
/**
 * Cost of the ELITE-DEPLOY presidential lever (Presidential Command Model):
 * the president authorizes RELEASING an elite/special formation from the
 * strategic reserve to a corps that requested it. Priced equal to a STOP-OP /
 * proactive force-launch (25) because committing the strategic reserve is a
 * high-stakes command-authority decision the president owns. MUST match
 * autonomy_ipc_contract.cjs (ELITE_DEPLOY_COST = 25). The CA debit lives ONLY
 * in the player IPC path (approveReserveRequest in desktop_sim.ts) — NEVER in
 * deployEliteLoan / evaluateArmyReserveAssignments / tickEliteLoans, which run
 * in calibration/headless where command_authority is absent.
 */
export const ELITE_DEPLOY_COST = 25;
export const COMMAND_AUTHORITY_RECOVERY_PER_TURN = 2;
