/**
 * Army HQ override generation.
 * High-weight army priorities that the assigned corps is ignoring
 * trigger direct army-level overrides forcing action.
 */
import type { GameState, ArmyHQOverride, FactionId } from '../../state/game_state.js';
import { getCorpsArmyPriorities } from './bot_strategy.js';
import { munFromOsid } from './osid_adjacency.js';

/** Only the most critical priorities trigger full overrides. */
const ARMY_HQ_OVERRIDE_WEIGHT_THRESHOLD = 80;
/** Medium-weight priorities trigger probes for intel. */
const PROBE_WEIGHT_THRESHOLD = 50;
/** Corps must be idle this many turns before HQ forces action. */
const MIN_IDLE_TURNS_FOR_OVERRIDE = 6;
/** Max target OSIDs per override — keeps operations focused. */
const MAX_OVERRIDE_TARGET_OSIDS = 5;

/**
 * Generate army HQ overrides for this turn.
 * Examines each corps: if a high-weight priority exists, the corps has no active
 * operation, and it hasn't operated recently, army HQ forces action.
 * Weight >= 80 → full offensive. Weight 50-79 → probe.
 * At most one override per corps per turn.
 */
export function generateArmyHQOverrides(
    state: GameState,
    faction: FactionId,
): ArmyHQOverride[] {
    const overrides: ArmyHQOverride[] = [];
    const turn = state.meta.turn;
    const corpsCommand = state.military.corps_command ?? {};
    const formations = state.military.formations;
    const pc = state.political.political_controllers ?? {};

    // Find all corps for this faction
    const factionCorps: string[] = [];
    for (const [id, f] of Object.entries(formations)) {
        if (f.faction === faction && f.kind === 'corps' && f.status === 'active') {
            factionCorps.push(id);
        }
    }
    factionCorps.sort();

    for (const corpsId of factionCorps) {
        const cc = corpsCommand[corpsId];
        // Skip if corps has an active operation
        if (cc?.active_operation) continue;

        const priorities = getCorpsArmyPriorities(faction, corpsId, turn);

        for (const p of priorities) {
            if (p.weight < PROBE_WEIGHT_THRESHOLD) continue;

            // Idle check: corps hasn't operated recently
            const lastOpTurn = cc?.last_completed_operation_turn ?? 0;
            if (turn - lastOpTurn < MIN_IDLE_TURNS_FOR_OVERRIDE) continue;

            // Build target OSIDs
            const targetOsids: string[] = [];

            // Direct OSID targets first
            if (p.target_osids) {
                for (const osid of p.target_osids) {
                    const ctrl = pc[osid];
                    if (ctrl && ctrl !== faction) {
                        targetOsids.push(osid);
                    }
                }
            }

            // Derive from municipalities if no direct targets
            if (targetOsids.length === 0 && p.target_municipalities.length > 0) {
                const targetMuns = new Set(p.target_municipalities);
                for (const [osid, controller] of Object.entries(pc)) {
                    if (controller === faction) continue;
                    const mun = munFromOsid(osid);
                    if (mun && targetMuns.has(mun)) {
                        targetOsids.push(osid);
                        if (targetOsids.length >= MAX_OVERRIDE_TARGET_OSIDS) break;
                    }
                }
                targetOsids.sort();
            }

            if (targetOsids.length === 0) continue;

            if (p.weight >= ARMY_HQ_OVERRIDE_WEIGHT_THRESHOLD) {
                overrides.push({
                    corps_id: corpsId,
                    operation_name: `HQ: ${p.name}`,
                    min_brigades: 3,
                    target_osids: targetOsids.slice(0, MAX_OVERRIDE_TARGET_OSIDS),
                    reason: `Army HQ directive: ${p.name} (weight ${p.weight})`,
                    issued_turn: turn,
                    type: 'offensive',
                });
            } else {
                overrides.push({
                    corps_id: corpsId,
                    operation_name: `Probe: ${p.name}`,
                    min_brigades: 1,
                    target_osids: targetOsids.slice(0, 2),
                    reason: `Intel probe: ${p.name}`,
                    issued_turn: turn,
                    type: 'probe',
                    max_brigades: 2,
                });
            }
            break; // One override per corps per turn
        }
    }

    return overrides;
}
