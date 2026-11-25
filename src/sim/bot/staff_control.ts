import type {FactionId, GameState} from '../../state/game_state.js';
import {strictCompare} from '../../state/validateGameState.js';

/**
 * The factions the staff (bot) pipeline runs for: every faction, the player's included, at
 * every autonomy level (player-override model, owner 2026-11-25: "There should be no drift
 * between live and headless games"; Engine Invariants §14.10a). A live game the human leaves
 * alone is the bot playing their faction. Their explicit orders override the staff's choice per
 * decision (a staged brigade order, a recruitment hold, a refusal, a hold); the autonomy level
 * only decides what is surfaced to them, never whether the decision is made.
 */
export function selectStaffControlledFactions(state: GameState): FactionId[] {
    return (state.factions ?? [])
        .map(f => f.id)
        .sort(strictCompare);
}

/**
 * True when a commander plan can be put to the President for Level-1 review: it names at least
 * one target OSID (`generateLevel1OpProposals`). Surfacing only: a plan that cannot be put to them
 * launches on the staff's clock like any other (player-override model, §14.10a).
 */
export function isLevel1ProposablePlan(plan: { readonly target_osids?: readonly string[] } | null | undefined): boolean {
    return plan != null && Array.isArray(plan.target_osids) && plan.target_osids.length > 0;
}

/**
 * True when this faction's staff op plans are SURFACED to the President for review: autonomy is
 * exactly 1 AND the faction is the human player's. Surfacing only (player-override model,
 * §14.10a): the plan launches on the headless turn unless they explicitly refuses it. Headless
 * auto-control runs have no human player, so this is always false there.
 */
export function isLevel1PlayerApprovalFaction(state: GameState, faction: FactionId | null | undefined): boolean {
    if ((state.meta?.autonomy_level ?? 0) !== 1) return false;
    const playerFaction = state.meta?.headless_scenario_auto_control
        ? null
        : state.meta?.player_faction ?? null;
    return playerFaction != null && faction != null && faction === playerFaction;
}

/**
 * The player faction while the game is at autonomy 0 (Full Control); null when there is no
 * player or the level is 1-3. Since the player-override model (§14.10a) the staff pipeline runs
 * for the player at every level, so this decides only what is surfaced to them at Level 0 (a
 * brigade order they stages there overrides the staff's for that unit). The §6 paramilitary
 * request path still keys on it until its own panel rules (lane C s8 ruling Q7c).
 */
export function selectManualPlayerFaction(state: GameState): FactionId | null {
    const playerFaction = state.meta?.headless_scenario_auto_control
        ? null
        : state.meta?.player_faction ?? null;
    if (playerFaction == null) return null;
    return (state.meta?.autonomy_level ?? 0) >= 1 ? null : playerFaction;
}
