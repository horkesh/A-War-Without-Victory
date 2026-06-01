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
export const COMMAND_AUTHORITY_RECOVERY_PER_TURN = 2;
