/**
 * Formation lifecycle event processing.
 *
 * Processes territory-based disbands, merges, and other scripted events.
 * Run once per turn before recruitment.
 *
 * Events are loaded from data/source/formation_lifecycle_events.json.
 * Trigger types: territory_loss (emergent), week (scripted).
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FactionId, GameState, FormationState } from '../state/game_state.js';
import { removeFromActiveOperation } from './combat/brigade_dissolution.js';

/** A lifecycle event definition from the data file. */
export interface LifecycleEventDef {
    type: 'disband' | 'merge' | 'rename';
    formation_id: string;
    trigger_condition: 'territory_loss' | 'week' | 'personnel_collapse';
    trigger_municipality?: string;
    trigger_turn?: number;
    target_id?: string;
    new_name?: string;
    reason: string;
}

interface LifecycleEventsFile {
    events: LifecycleEventDef[];
}

let cachedEvents: LifecycleEventDef[] | null = null;

/** Load lifecycle events from data file. Cached after first load. */
export async function loadLifecycleEvents(baseDir?: string): Promise<LifecycleEventDef[]> {
    if (cachedEvents) return cachedEvents;
    const dir = baseDir || (typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '');
    const path = resolve(dir, 'data/source/formation_lifecycle_events.json');
    try {
        const raw = JSON.parse(await readFile(path, 'utf8')) as LifecycleEventsFile;
        cachedEvents = raw.events ?? [];
    } catch {
        cachedEvents = [];
    }
    return cachedEvents;
}

/**
 * Check if a municipality has been majority-lost to enemy.
 * Returns true if the faction that owned the formation no longer controls
 * any OSID in the municipality.
 */
function isMunicipalityLost(state: GameState, municipality: string, faction: FactionId): boolean {
    const controllers = state.political.political_controllers ?? {};
    // Check if any OSID in the municipality is still controlled by this faction
    for (const [osid, controller] of Object.entries(controllers)) {
        if (osid.startsWith(`op:${municipality}:`) && controller === faction) {
            return false; // Still controls at least one OSID
        }
    }
    return true; // No OSIDs in this municipality belong to the faction
}

/**
 * Process all lifecycle events for this turn.
 * Returns the number of events that fired.
 */
export function processLifecycleEvents(
    state: GameState,
    events: LifecycleEventDef[],
): number {
    const turn = state.meta?.turn ?? 0;
    let fired = 0;

    for (const event of events) {
        const formation = state.military.formations?.[event.formation_id];
        if (!formation) continue;
        if (formation.status !== 'active') continue;
        if (formation.lifecycle_status === 'disbanded' || formation.lifecycle_status === 'merged' || formation.lifecycle_status === 'destroyed') continue;

        let shouldFire = false;

        switch (event.trigger_condition) {
            case 'territory_loss':
                if (event.trigger_municipality) {
                    shouldFire = isMunicipalityLost(state, event.trigger_municipality, formation.faction);
                }
                break;
            case 'week':
                shouldFire = event.trigger_turn != null && turn >= event.trigger_turn;
                break;
            case 'personnel_collapse':
                shouldFire = (formation.personnel ?? 0) < 100;
                break;
        }

        if (!shouldFire) continue;

        switch (event.type) {
            case 'disband':
                removeFromActiveOperation(state, formation.id, formation.corps_id);
                formation.status = 'inactive';
                formation.lifecycle_status = 'destroyed';
                formation.personnel = 0;
                formation.destruction_turn = turn;
                fired++;
                break;
            case 'merge':
                if (event.target_id && state.military.formations?.[event.target_id]) {
                    const target = state.military.formations[event.target_id];
                    // Transfer remaining personnel to target
                    target.personnel = (target.personnel ?? 0) + (formation.personnel ?? 0);
                    removeFromActiveOperation(state, formation.id, formation.corps_id);
                    formation.status = 'inactive';
                    formation.lifecycle_status = 'merged';
                    formation.personnel = 0;
                    fired++;
                }
                break;
            case 'rename':
                if (event.new_name) {
                    formation.name = event.new_name;
                    fired++;
                }
                break;
        }
    }

    return fired;
}

/**
 * Check available_until field on formations — disband expired ones.
 */
export function processAvailableUntil(state: GameState): number {
    const turn = state.meta?.turn ?? 0;
    let disbanded = 0;
    // We need to check OOB data, but available_until is not on FormationState.
    // This should be handled at formation creation / scenario level instead.
    // For now, this is a stub. The formation_lifecycle_events.json handles explicit disbands.
    return disbanded;
}
