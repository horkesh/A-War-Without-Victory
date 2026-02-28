/**
 * Deterministic formation naming (plan: militia_and_brigade_formation_system).
 * Historical OoB names can be added via data lookup; fallback is deterministic.
 * Never reuse another faction's historical name.
 *
 * Historical names: Formations created from OOB at Phase I entry (oob_brigades.json) get
 * historical names (e.g. "5th Kozara Light Infantry Brigade"). Emergent spawn uses this
 * fallback only. To give emergent brigades historical names would require a lookup
 * (faction, home_mun) -> name from OOB masters or a derived dataset (see docs/knowledge/
 * ARBIH, HVO, VRS_ORDER_OF_BATTLE_MASTER.md).
 *
 * Phase I Overhaul (Phase B): TO detachment and TO battalion naming added.
 * - TO Detachment: "TO <mun_id>"
 * - TO Battalion:  "TO Bn <mun_id>"
 * - Brigade fallback: "<faction> <mun_id> Brigade <ordinal>" (unchanged)
 */

import { MIN_BATTALION_THRESHOLD } from './formation_constants.js';
import type { FactionId } from './game_state.js';

/**
 * Returns a stable formation name for (faction, mun_id, kind, ordinal).
 *
 * For kind === 'militia' (TO detachments / battalions):
 *   - If personnel >= MIN_BATTALION_THRESHOLD (500): "TO Bn <mun_id>"
 *   - Otherwise: "TO <mun_id>"
 *
 * For kind === 'brigade':
 *   - Fallback: "<faction> <mun_id> Brigade <ordinal>"
 *
 * No cross-faction name reuse. For historical names use OOB init (init_formations_oob).
 *
 * @param personnel - Optional; used to distinguish detachment vs battalion for militia kind.
 */
export function resolveFormationName(
    faction: FactionId,
    mun_id: string,
    kind: 'militia' | 'brigade',
    ordinal: number,
    personnel?: number
): string {
    if (kind === 'militia') {
        if (personnel !== undefined && personnel >= MIN_BATTALION_THRESHOLD) {
            return `TO Bn ${mun_id}`;
        }
        return `TO ${mun_id}`;
    }
    return `${faction} ${mun_id} Brigade ${ordinal}`;
}
