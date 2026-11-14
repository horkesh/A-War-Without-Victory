import type {FactionId, GameState} from '../../state/game_state.js';
import {strictCompare} from '../../state/validateGameState.js';

/** Broad staff authority; manual historical assistance stays operation-scoped downstream. */
export function selectStaffControlledFactions(state: GameState): FactionId[] {
    const playerFaction = state.meta.headless_scenario_auto_control
        ? null
        : state.meta.player_faction ?? null;
    const assistedExecutionActive = (state.meta.autonomy_level ?? 0) >= 1;
    return (state.factions ?? [])
        .map(f => f.id)
        .filter((fid): fid is FactionId =>
            playerFaction == null || assistedExecutionActive || fid !== playerFaction
        )
        .sort(strictCompare);
}

/**
 * True when Level-1 (Assisted) player approval governs this faction's corps commander: autonomy is
 * exactly 1 AND the faction is the human player's. Bot factions never wait for an approval no one can
 * give, so at Level 1 they plan and launch exactly as at any other level. Headless auto-control runs
 * have no human player, so this is always false there.
 */
export function isLevel1PlayerApprovalFaction(state: GameState, faction: FactionId | null | undefined): boolean {
    if ((state.meta?.autonomy_level ?? 0) !== 1) return false;
    const playerFaction = state.meta?.headless_scenario_auto_control
        ? null
        : state.meta?.player_faction ?? null;
    return playerFaction != null && faction != null && faction === playerFaction;
}

/**
 * The player faction only while it is manually controlled (autonomy 0); null when there is no
 * player or its staff is in control. Player-only behaviour keys on this, so a staff-controlled
 * player follows exactly the bot path.
 */
export function selectManualPlayerFaction(state: GameState): FactionId | null {
    const playerFaction = state.meta?.headless_scenario_auto_control
        ? null
        : state.meta?.player_faction ?? null;
    if (playerFaction == null) return null;
    // Same staff-control threshold as selectStaffControlledFactions above.
    return (state.meta?.autonomy_level ?? 0) >= 1 ? null : playerFaction;
}
