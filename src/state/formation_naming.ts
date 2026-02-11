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
 */

import type { FactionId } from './game_state.js';

/**
 * Returns a stable formation name for (faction, mun_id, kind, ordinal).
 * Fallback: "<Faction> <mun_id> Brigade|Militia <ordinal>". No cross-faction name reuse.
 * For historical names use OOB init (init_formations_oob) so formations come from oob_brigades.json.
 */
export function resolveFormationName(
  faction: FactionId,
  mun_id: string,
  kind: 'militia' | 'brigade',
  ordinal: number
): string {
  const kindLabel = kind === 'militia' ? 'Militia' : 'Brigade';
  return `${faction} ${mun_id} ${kindLabel} ${ordinal}`;
}
