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
/**
 * Cost of the REPLACE-CO presidential lever (Presidential Command Model slice 3/N):
 * the president sacks a corps's commanding officer and installs a replacement,
 * trading command authority for a cohesion/morale cost. Priced equal to the other
 * override levers (25) — sacking a serving commander mid-war is a costly political
 * act. MUST match autonomy_ipc_contract.cjs (REPLACE_CO_COST = 25) and the
 * stage-co-replacement-order handler (co_replacement.cjs). The faction asymmetry
 * (RS officer-corps revolt risk) emerges from officer-disposition DATA flowing
 * through proposeAutonomousArmyLaunch post-sacking, NOT from a faction-keyed cost.
 */
export const REPLACE_CO_COST = 25;
/**
 * Cost of the FRONT-VISIT presidential leadership action (Presidential Command
 * Surface design §10): the president visits the front as a morale/leadership
 * gesture, force-queuing the authored `visit_to_front_<faction>` event. Priced
 * LOWER than the override levers (10, matching the stabilize-command-relationship
 * action) because it is a leadership gesture, not an officer override. MUST match
 * autonomy_ipc_contract.cjs (FRONT_VISIT_COST = 10) and the initiate-front-visit
 * IPC handler (electron-main.cjs). Cooldown/cap use the event's voluntary action cadence
 * (max_fires 5 / cooldown 10t), not a CA-side timer.
 */
export const FRONT_VISIT_COST = 10;
/**
 * Cost of the ADDRESS-THE-NATION presidential leadership action (Presidential
 * Command Surface design §10, deferred companion to the shipped front visit):
 * the president addresses the nation over the airwaves, force-queuing the authored
 * `address_to_nation_<faction>` event. Priced like the front visit (10) — a
 * leadership gesture, not an officer override. Unlike the front visit it is
 * faction-wide (no reachability gate). MUST match autonomy_ipc_contract.cjs
 * (ADDRESS_NATION_COST = 10) and the initiate-address-nation IPC handler.
 */
export const ADDRESS_NATION_COST = 10;
/**
 * Cost of the DECORATE-A-UNIT presidential leadership action (Presidential
 * Command Surface design §10, deferred companion to the shipped front visit):
 * the president decorates a REGULAR formation (bright line — never paramilitaries
 * or atrocity-associated units), force-queuing the authored
 * `decorate_a_unit_<faction>` event with one branch per eligible regular unit so
 * the player picks WHICH to honour. Priced like the front visit (10). MUST match
 * autonomy_ipc_contract.cjs (DECORATE_UNIT_COST = 10) and the
 * initiate-decorate-unit IPC handler.
 */
export const DECORATE_UNIT_COST = 10;
export {
    COMMAND_AUTHORITY_BASE_RECOVERY_PER_TURN as COMMAND_AUTHORITY_RECOVERY_PER_TURN,
    COMMAND_AUTHORITY_RESERVE_MAX,
} from '../../../shared/commandAuthorityEconomy.js';
