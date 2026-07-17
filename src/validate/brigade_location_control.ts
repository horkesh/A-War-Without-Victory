/**
 * War phase: validate physical combat formations have exact-control placement.
 */

import type { GameState } from '../state/game_state.js';
import { getPoliticalControllerOSID } from '../state/settlement_control.js';
import type { ValidationIssue } from './validate.js';

const PHYSICAL_COMBAT_KINDS = new Set([
    'brigade',
    'militia',
    'og',
    'operational_group',
    'jna_phantom',
    'hv_phantom',
    'paramilitary',
]);

/**
 * Runs only in war phase. Corps, corps assets, and army HQs are non-spatial command records.
 */
export function validateBrigadeLocationControl(state: GameState): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (state.meta?.phase !== 'war') return issues;

    const formations = state.military.formations ?? {};
    for (const [formationId, f] of Object.entries(formations)) {
        if (!f || f.status !== 'active') continue;
        const kind = (f as { kind?: string }).kind ?? 'brigade';
        if (!PHYSICAL_COMBAT_KINDS.has(kind)) continue;

        const locOsid = (f as { location_osid?: string }).location_osid;
        if (!locOsid) {
            issues.push({
                severity: 'error',
                code: 'formation.location_missing',
                message: `Active physical formation ${formationId} (${f.faction ?? 'unknown'}) has no location_osid`,
                path: `formations.${formationId}.location_osid`
            });
            continue;
        }

        const factionId = (f as { faction?: string }).faction;

        const controller = getPoliticalControllerOSID(state, locOsid);
        if (controller !== factionId) {
            issues.push({
                severity: 'error',
                code: 'formation.location_not_controlled',
                message: `Formation ${formationId} (${factionId}) has location_osid ${locOsid} but controller is ${controller ?? 'null'}`,
                path: `formations.${formationId}.location_osid`
            });
        }
    }
    return issues;
}
