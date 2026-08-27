/**
 * Policies — the swappable "how would this president play?".
 *
 * Swapping policy is how you explore different outcomes without writing a new
 * run script. Every policy is pure and synchronous: given the same context it
 * makes the same choice, so a whole run replays byte-identically (the guarantee
 * `president_playthrough.replayDecisionLog` rests on).
 *
 * NO Math.random() here. `seeded` uses an explicit, reproducible PRNG whose seed
 * is recorded in the run config.
 */

import type { GameState, FactionId } from '../../src/state/game_state.js';
import type { TurnDecisionContext } from '../ai_play/president_playthrough.js';
import { pendingProposals } from '../ai_play/president_playthrough.js';
import type { DecisionChoice, LeverPlan, Policy } from './types.js';

// ── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Corps belonging to `faction`. NOTE the faction lives on `military.formations[id]`,
 * not on the `corps_command` entry — reading it off `corps_command` yields undefined
 * and silently returns zero corps, which reads as "the engine gave me no corps".
 */
function corpsIds(state: GameState, faction: FactionId): string[] {
    const cc = (state as any).military?.corps_command ?? {};
    const formations = (state as any).military?.formations ?? {};
    return Object.keys(cc)
        .filter((id) => formations[id]?.faction === faction)
        // Skip army-level staffs. `vrs_main_staff` sits in corps_command but is not a
        // field command, so the engine correctly refuses every lever aimed at it —
        // 376 `not_a_field_command` refusals per RS counterfactual run, all harness noise.
        .filter((id) => !/_main_staff$|_staff$|_hq$/.test(id))
        .sort();
}

/** OSIDs under any controller other than the player's, sorted for determinism. */
function enemyHeldOsids(state: GameState, faction: FactionId): string[] {
    const pc = (state as any)?.political?.political_controllers ?? {};
    return Object.keys(pc)
        .filter((id) => pc[id] && pc[id] !== faction)
        .sort();
}

/**
 * Accept every pending pre-planned-operation authorization.
 *
 * This is NOT optional garnish. The 2026-08-05 RS run pattern-matched only
 * `APPROVE_OP:` and left the whole `HISTORICAL_OP:` slate unaccepted for 188
 * weeks, producing `operations_launched: 0` and a run that measured political
 * agency while silently measuring no military agency at all. Every policy below
 * inherits this so that mistake cannot recur by omission.
 */
function acceptOperationAuthorizations(state: GameState): LeverPlan['proposals'] {
    return [...pendingProposals(state, 'HISTORICAL_OP:'), ...pendingProposals(state, 'APPROVE_OP:')]
        .map((p) => ({ proposalId: (p.proposal_id ?? p.id) as string, accept: true }))
        .sort((a, b) => a.proposalId.localeCompare(b.proposalId));
}

/** Deterministic 32-bit PRNG (mulberry32). Seeded explicitly, never from the clock. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── The policies ─────────────────────────────────────────────────────────────

/**
 * Historical: the R8 choice policy, in order — authored historical default,
 * else staff recommendation (logged as a player input, not a historical claim),
 * else the first option. This is the baseline every other policy is measured
 * against, and the one whose findings are the most damning: if the *intended*
 * playthrough is broken, everything is.
 */
export const historical: Policy = {
    id: 'historical',
    description: 'Authored historical default; falls back to staff recommendation, then first option.',
    decide(ctx: TurnDecisionContext): DecisionChoice[] {
        return ctx.pending_decisions.map((d) => {
            const chosen =
                d.options.find((o) => o.is_historical_default) ??
                d.options.find((o) => o.is_staff_recommended) ??
                d.options[0];
            return {
                eventId: d.event_id,
                responseId: chosen?.id ?? '',
                rationale: chosen?.is_historical_default
                    ? 'historical default'
                    : chosen?.is_staff_recommended
                      ? 'no authored default; took staff recommendation'
                      : 'no authored default and no staff recommendation; took first option',
            };
        });
    },
    levers(state) {
        return { proposals: acceptOperationAuthorizations(state) };
    },
    /**
     * REJECT, despite this being the "historical" policy — and the reason matters.
     *
     * Accepting the Cutileiro Plan in `historical` decision mode ENDS THE CAMPAIGN at
     * turn 2 (measured: accept -> game_over at turn 2; reject -> war continues). A
     * baseline that stops in April 1992 measures nothing.
     *
     * Historically Cutileiro WAS signed on 18 March 1992 and then Izetbegović withdrew,
     * and the war happened anyway. The engine has no withdrawal path, so "accept" and
     * "the historical outcome" are not the same thing here. Rejecting reproduces the
     * historical TRAJECTORY (war continues) even though it does not reproduce the
     * historical SIGNATURE. Recorded in the diary as an open question rather than
     * silently encoded here.
     */
    peacePlan: () => 'rejected',
};

/**
 * Counterfactual: always the option explicitly marked counterfactual, else any
 * option that is not the historical default. Answers "how hard does the engine
 * pull the player back toward history?" and stresses branches the authored path
 * never touches — which is exactly where the event-data defects live.
 */
export const counterfactual: Policy = {
    id: 'counterfactual',
    description: 'Always the counterfactual option; else any non-historical-default option.',
    decide(ctx: TurnDecisionContext): DecisionChoice[] {
        return ctx.pending_decisions.map((d) => {
            const chosen =
                d.options.find((o) => o.historical_marker === 'counterfactual') ??
                d.options.find((o) => !o.is_historical_default) ??
                d.options[0];
            return {
                eventId: d.event_id,
                responseId: chosen?.id ?? '',
                rationale: 'maximal divergence from the historical record',
            };
        });
    },
    levers(state, faction) {
        const ids = corpsIds(state, faction);
        // Order attacks at enemy-held ground. A "counterfactual" president who never
        // orders an offensive measures political agency only — the exact gap that made
        // the 2026-08-05 RS run report zero military agency without saying so.
        const enemyHeld = enemyHeldOsids(state, faction);
        return {
            proposals: acceptOperationAuthorizations(state),
            replace_co: ids.map((corpsId) => ({ corpsId })),
            request_op: enemyHeld.length
                ? ids.map((corpsId, i) => ({ corpsId, targetOsid: enemyHeld[i % enemyHeld.length] }))
                : [],
        };
    },
    peacePlan: () => 'rejected',
};

/**
 * Staff: always do what the CoS recommends. The "trusting president" — surfaces
 * decisions where the staff recommendation is missing, self-contradictory, or
 * points at an option the engine then refuses.
 */
export const staffRec: Policy = {
    id: 'staff',
    description: 'Always the staff-recommended option; else the historical default.',
    decide(ctx: TurnDecisionContext): DecisionChoice[] {
        return ctx.pending_decisions.map((d) => {
            const chosen =
                d.options.find((o) => o.is_staff_recommended) ??
                d.options.find((o) => o.is_historical_default) ??
                d.options[0];
            return { eventId: d.event_id, responseId: chosen?.id ?? '', rationale: 'deferred to staff' };
        });
    },
    levers(state) {
        return { proposals: acceptOperationAuthorizations(state) };
    },
    // Same reason as `historical`: accepting ends the campaign at turn 2.
    peacePlan: () => 'rejected',
};

/**
 * Seeded: a reproducible random walk across the option space. The broadest net
 * for event-data defects, because over enough turns it reaches branches no
 * hand-authored policy would pick. Vary `--seed` to widen coverage.
 */
export function seeded(seed: number): Policy {
    const rand = mulberry32(seed);
    return {
        id: `seeded:${seed}`,
        description: `Reproducible pseudo-random option choice (mulberry32, seed ${seed}).`,
        decide(ctx: TurnDecisionContext): DecisionChoice[] {
            return ctx.pending_decisions.map((d) => {
                const chosen = d.options[Math.floor(rand() * d.options.length)] ?? d.options[0];
                return { eventId: d.event_id, responseId: chosen?.id ?? '', rationale: `seeded walk (${seed})` };
            });
        },
        levers(state) {
            return { proposals: acceptOperationAuthorizations(state) };
        },
        peacePlan: () => (rand() < 0.5 ? 'accepted' : 'rejected'),
    };
}

/**
 * Passive: answer nothing that can be left unanswered, fire no levers, accept no
 * operations. The floor case — what happens to a president who does nothing?
 * Any progress-blocking deadlock shows up here first and cheapest.
 *
 * NOTE this is the one policy that deliberately does NOT accept operation
 * authorizations; `operations_launched: 0` is the expected result here, not a bug.
 */
export const passive: Policy = {
    id: 'passive',
    description: 'Answer only blocking decisions, take the first option, fire nothing.',
    decide(ctx: TurnDecisionContext): DecisionChoice[] {
        return ctx.pending_decisions
            .filter((d) => d.requires_player_response)
            .map((d) => ({
                eventId: d.event_id,
                responseId: d.options[0]?.id ?? '',
                rationale: 'minimum required to advance',
            }));
    },
    peacePlan: () => 'rejected',
};

export const POLICIES: Record<string, Policy> = {
    [historical.id]: historical,
    [counterfactual.id]: counterfactual,
    [staffRec.id]: staffRec,
    [passive.id]: passive,
};

/** Resolve a policy id from the CLI. `seeded:<n>` is constructed on demand. */
export function resolvePolicy(id: string): Policy {
    if (id.startsWith('seeded:')) {
        const seed = Number(id.slice('seeded:'.length));
        if (!Number.isFinite(seed)) throw new Error(`Bad seed in policy id: ${id}`);
        return seeded(seed);
    }
    const p = POLICIES[id];
    if (!p) throw new Error(`Unknown policy '${id}'. Known: ${Object.keys(POLICIES).join(', ')}, seeded:<n>`);
    return p;
}
