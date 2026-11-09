/**
 * The delegation folder (DC plan amendment A1, owner 2026-11-08): the campaign's
 * receipt, placed on the table when Dayton opens. Generated from state, never
 * authored per faction.
 *
 * It answers four questions for the player's delegation:
 *  - what you hold now against your height in the war (settlement counts, so both
 *    numbers use one measure);
 *  - which enclaves you kept and lost, and which condemnations you bring to the table;
 *  - who holds your pen: your patron's override authority against the level at which
 *    it can sign concessions over your head;
 *  - which earlier peace plans were refused, by whom, what they offered, and what the
 *    war cost after each refusal (weeks, the dead on all sides, civilians displaced).
 *    The dead come from the Verdict's own sources (war_dead.ts), stamped on each plan
 *    answer, so the folder and the Verdict agree. The folder states the sequence; it
 *    does not claim the cost was caused by the refusal.
 *
 * Visibility: built for the player's faction only. Other factions appear only in
 * public facts (who answered a plan how, the plan's offered shares, all-sides totals).
 * The all-sides soldier dead are deliberately shown here, before the Verdict (owner
 * ruling 2026-11-08: "Keep all-sides"); during the war the projection still scopes the
 * casualty ledger to the player's own side.
 * Sources: political_controllers, turn_summaries (every turn is kept), negotiation
 * capital and patron relationships, peace_plan_history, the verdict's condemnation
 * collector. Deterministic: sorted iteration, integer counts, no clock or RNG.
 */
import type { FactionId, GameState } from '../../state/game_state.js';
import type { DelegationFolder, WarCostLine } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPeacePlanById } from './peace_plan_data.js';
import { PATRON_FORCE_THRESHOLD } from './patron_leverage.js';
import { currentCondemnationFlags } from './scoring.js';
import { warDeadTotals } from './war_dead.js';

const FACTIONS: readonly FactionId[] = ['RBiH', 'RS', 'HRHB'];

interface TurnCost { turn: number; displaced: number; net: Partial<Record<string, number>> }

/**
 * Per-turn series from the turn summaries. Battle tallies are deliberately NOT used for
 * the dead: they miss non-battle attrition, so they disagree with the Verdict. The dead
 * come from war_dead.ts (the Verdict's sources) and the per-plan stamp.
 */
function turnCosts(state: GameState): TurnCost[] {
    return (state.turn_summaries ?? [])
        .map(s => ({
            turn: s.turn,
            displaced: Math.max(0, s.displacement_total ?? 0),
            net: s.territory_net ?? {},
        }))
        .sort((a, b) => a.turn - b.turn);
}

/** Build the folder for the player's faction, or undefined when there is no player faction. */
export function buildDelegationFolder(state: GameState): DelegationFolder | undefined {
    const faction = state.meta?.player_faction;
    if (!faction || !FACTIONS.includes(faction)) return undefined;
    const turn = state.meta.turn;
    const controllers = state.political?.political_controllers ?? {};
    const cells = Object.keys(controllers).sort(strictCompare);
    const held = cells.filter(o => controllers[o] === faction).length;

    // Height of the war: walk the per-turn territory deltas back from today's count.
    const costs = turnCosts(state);
    const netAll = costs.reduce((sum, c) => sum + (c.net[faction] ?? 0), 0);
    let running = held - netAll;
    let peak = running;
    let peakTurn = costs.length ? costs[0]!.turn - 1 : turn;
    for (const c of costs) {
        running += c.net[faction] ?? 0;
        if (running > peak) { peak = running; peakTurn = c.turn; }
    }
    if (peak < held) { peak = held; peakTurn = turn; }

    const neg = state.military?.negotiation;
    const capital = neg?.capital?.[faction];
    const patron = neg?.patron_relationships?.[faction];
    const override = Math.round(patron?.override_authority ?? 0);

    const displacedSince = (after: number) => costs.filter(c => c.turn > after).reduce((sum, c) => sum + c.displaced, 0);
    const deadNow = warDeadTotals(state);

    const refused = (neg?.peace_plan_history ?? [])
        .filter(row => row.resolved && Object.values(row.responses ?? {}).includes('rejected'))
        .map(row => ({ row, plan: getPeacePlanById(row.plan_id) }))
        // Plans removed from the catalog (Cutileiro, pre-war) are not shown.
        .filter(({ plan }) => plan && plan.id !== 'dayton')
        .sort((a, b) => a.row.turn_offered - b.row.turn_offered || strictCompare(a.row.plan_id, b.row.plan_id))
        .map(({ row, plan }) => {
            const refusedBy = FACTIONS.filter(f => row.responses?.[f] === 'rejected');
            const since = row.resolved_turn ?? row.turn_offered;
            const stamp = row.dead_at_resolution;
            return {
                plan_id: row.plan_id,
                turn_offered: row.turn_offered,
                proposed_split: { RBiH: plan?.proposed_split.RBiH ?? 0, RS: plan?.proposed_split.RS ?? 0, HRHB: plan?.proposed_split.HRHB ?? 0 },
                refused_by: refusedBy,
                player_answer: (row.responses?.[faction] ?? 'pending') as 'accepted' | 'rejected' | 'pending',
                weeks_since: Math.max(0, turn - since),
                dead_since: stamp
                    ? { military: Math.max(0, deadNow.military - stamp.military), civilian: Math.max(0, deadNow.civilian - stamp.civilian) }
                    : null,
                displaced_since: displacedSince(since),
            };
        });

    // What declining cost (DC A5): only on the table reopened after this faction declined.
    const decline = neg?.dayton_decline;
    const declined = decline && decline.faction === faction ? {
        declined_turn: decline.declined_turn,
        weeks_since: Math.max(0, turn - decline.declined_turn),
        dead_since: decline.dead_at_decline
            ? {
                military: Math.max(0, deadNow.military - decline.dead_at_decline.military),
                civilian: Math.max(0, deadNow.civilian - decline.dead_at_decline.civilian),
            }
            : null,
        displaced_since: displacedSince(decline.declined_turn),
        held_then: decline.held_at_decline ?? null,
        held_now: held,
    } : undefined;

    return {
        faction,
        turn,
        settlements: { held, total: cells.length, peak, peak_turn: peakTurn },
        enclaves: {
            held: [...(capital?.enclaves_held ?? [])].sort(strictCompare),
            lost: [...(capital?.enclaves_lost ?? [])].sort(strictCompare),
        },
        condemnation: currentCondemnationFlags(state, faction),
        patron: {
            override_authority: override,
            force_threshold: PATRON_FORCE_THRESHOLD,
            can_force: override >= PATRON_FORCE_THRESHOLD,
        },
        refused_plans: refused,
        war: warCostLine(state),
        ...(declined ? { declined } : {}),
    };
}

/**
 * The war's cost line (the folder's `war`), for the signing beat (DC A5). Same sources as the
 * folder: every kept turn summary for weeks and displacement, war_dead.ts for the dead.
 */
export function warCostLine(state: GameState): WarCostLine {
    const costs = turnCosts(state);
    return {
        weeks: costs.length,
        dead: warDeadTotals(state),
        displaced: costs.reduce((sum, c) => sum + c.displaced, 0),
    };
}

/** Stamp taken when a faction declines Dayton, so the forced table can say what declining cost (DC A5). */
export function declineStamp(state: GameState, faction: string): { dead_at_decline: { military: number; civilian: number }; held_at_decline: number } {
    const controllers = state.political?.political_controllers ?? {};
    return {
        dead_at_decline: warDeadTotals(state),
        held_at_decline: Object.keys(controllers).filter(o => controllers[o] === faction).length,
    };
}
