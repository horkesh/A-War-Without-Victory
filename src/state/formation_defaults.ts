/** Shared creation-time and legacy-save defaults. Preserve authored valid values.
 * Keep new live formations equivalent to their canonical save/reload representation.
 * No I/O, RNG, clocks, or scenario-specific decisions.
 */
import type {FormationState} from './game_state.js';
import {canonicalizePoliticalSideId,defaultArmyLabelForSide,POLITICAL_SIDES,type ArmyLabel,type PoliticalSideId} from './identity.js';

export function initializeFormationDefaults(form:FormationState,turn:number):void {
    if (typeof form.faction === 'string') {
        const oldFaction = form.faction;
        const canonicalFaction = canonicalizePoliticalSideId(oldFaction);
        form.faction = canonicalFaction;
        if ((oldFaction === 'ARBiH' || oldFaction === 'VRS' || oldFaction === 'HVO') && !form.force_label) {
            form.force_label = oldFaction as ArmyLabel;
        }
        if (POLITICAL_SIDES.includes(canonicalFaction as PoliticalSideId) && !form.force_label) {
            form.force_label = defaultArmyLabelForSide(canonicalFaction as PoliticalSideId);
        }
    }
    if (!form.ops || typeof form.ops !== 'object' || Array.isArray(form.ops)) {
        form.ops = { fatigue: 0, last_supplied_turn: null };
    } else {
        if (typeof form.ops.fatigue !== 'number' || !Number.isFinite(form.ops.fatigue) || form.ops.fatigue < 0) form.ops.fatigue = 0;
        if (form.ops.last_supplied_turn !== null && (!Number.isInteger(form.ops.last_supplied_turn) || form.ops.last_supplied_turn > turn)) {
            form.ops.last_supplied_turn = null;
        }
    }
    if (form.kind === undefined) form.kind = 'brigade';
    if (form.readiness === undefined) form.readiness = 'active';
    if (form.cohesion === undefined) form.cohesion = 60;
    if (form.morale === undefined || form.morale === null) form.morale = 60;
    form.morale = Math.max(0, Math.min(100, form.morale));
    if (form.activation_gated === undefined) form.activation_gated = false;
    if (form.activation_turn === undefined) form.activation_turn = null;
}
