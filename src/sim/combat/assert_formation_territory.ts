import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { ValidationIssue } from '../../validate/validate.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';

const PHYSICAL_COMBAT_KINDS = new Set([
    'brigade',
    'militia',
    'og',
    'operational_group',
    'jna_phantom',
    'hv_phantom',
    'paramilitary',
]);

/** Return deterministic issues for active physical formations outside friendly control. */
export function assertFormationsInFriendlyTerritory(state: GameState): ValidationIssue[] {
    const controllers = state.political?.political_controllers ?? {};
    const formations = state.military.formations ?? {};
    const issues: ValidationIssue[] = [];

    for (const formationId of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[formationId]!;
        if (formation.status !== 'active') continue;
        const kind = formation.kind ?? 'brigade';
        if (!PHYSICAL_COMBAT_KINDS.has(kind)) continue;

        const locationOsid = formation.location_osid;
        const path = `military.formations.${formationId}.location_osid`;
        if (!locationOsid) {
            issues.push({
                severity: 'error',
                code: 'formation.location_missing',
                message: `Active physical formation ${formationId} (${formation.faction}) has no location_osid`,
                path,
            });
            continue;
        }

        const controller = controllers[locationOsid] ?? null;
        if (controller !== null && isFriendlyFaction(controller, formation.faction, state)) continue;

        issues.push({
            severity: 'error',
            code: 'formation.location_not_friendly',
            message: `Active physical formation ${formationId} (${formation.faction}) is at ${locationOsid} controlled by ${controller ?? 'null'}`,
            path,
        });
    }

    return issues;
}
