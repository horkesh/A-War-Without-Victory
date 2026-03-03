/**
 * Phase II: Validate that every brigade/OG with location_osid is in territory its faction controls.
 * Invariant: formation.location_osid implies political_controllers[location_osid] === formation.faction.
 */

import type { GameState } from '../state/game_state.js';
import { getPoliticalControllerOSID } from '../state/settlement_control.js';
import type { ValidationIssue } from './validate.js';

const LOCATION_KINDS = new Set(['brigade', 'og', 'operational_group']);

/**
 * Validates that each active formation with location_osid (brigade/OG) is in an OSID
 * controlled by that formation's faction. Runs only in war phase.
 */
export function validateBrigadeLocationControl(state: GameState): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (state.meta?.phase !== 'war') return issues;

    const formations = state.formations ?? {};
    for (const [formationId, f] of Object.entries(formations)) {
        if (!f || f.status !== 'active') continue;
        const kind = (f as { kind?: string }).kind;
        if (!kind || !LOCATION_KINDS.has(kind)) continue;

        const locOsid = (f as { location_osid?: string }).location_osid;
        if (!locOsid) continue;

        const factionId = (f as { faction?: string }).faction;
        if (!factionId) continue;

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
