/**
 * Peace-phase Overhaul Phase C: Phased corps activation.
 *
 * In bottom_up recruitment mode, corps are NOT all created at Peace phase entry.
 * Instead they activate at their historical `available_from` turn:
 *   - RS (VRS): available_from 0 — created at Peace phase entry by createOobFormations
 *   - HRHB (HVO OZs): available_from 10 — activated by this step at turn 10
 *   - RBiH (ARBiH corps): available_from 24 — activated by this step at turn 24
 *
 * auto_oob mode is unchanged: all corps are created at Peace phase entry.
 *
 * Deterministic: corps entries iterated in sorted id order.
 * No file I/O — oobCorps is passed in from the pipeline's recruitmentCatalogCache.
 */

import { resolveLocationOsid, type CanonicalToOperationalMap } from '../../data/operational_data.js';
import type { OobCorps } from '../../scenario/oob_loader.js';
import type {
    FormationId,
    FormationState,
    GameState,
    MunicipalityId,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { initializeCorpsCommand } from '../combat/corps_command.js';

export interface ActivateCorpsReport {
    corps_activated: number;
    corps_ids: string[];
}

/**
 * Activate corps whose `available_from <= currentTurn` that do not yet exist in state.formations.
 *
 * Called every Peace phase turn by the `activate-corps` pipeline step.
 * Gated on `state.meta.recruitment_mode === 'bottom_up'` — the pipeline step already checks this,
 * but callers may also call directly.
 *
 * After creating new corps, calls `initializeCorpsCommand(state)` (idempotent) so the new corps
 * get their command state and any existing eligible brigades (corps_id tags) are assigned.
 *
 * @param state         Mutable GameState to update.
 * @param oobCorps      Corps catalog (loaded from oob_corps.json by pipeline cache).
 * @param currentTurn   Current simulation turn (state.meta.current_turn ?? state.meta.turn).
 * @param sidToMun      OSID/SID → mun1990_id mapping (for factionHasPresenceInMun check). Optional.
 * @param municipalityHqSettlement  mun1990_id → hq_sid mapping. Optional.
 * @param canonicalToOperational    For deriving location_osid from hq_sid. Optional.
 */
export function activateCorpsForTurn(
    state: GameState,
    oobCorps: OobCorps[],
    currentTurn: number,
    sidToMun?: Map<SettlementId, MunicipalityId>,
    municipalityHqSettlement?: Record<string, string>,
    canonicalToOperational?: CanonicalToOperationalMap
): ActivateCorpsReport {
    const report: ActivateCorpsReport = { corps_activated: 0, corps_ids: [] };

    if (!state.formations || typeof state.formations !== 'object') {
        (state as GameState & { formations: Record<string, FormationState> }).formations = {};
    }

    // Sort by id for deterministic activation order
    const sortedCorps = [...oobCorps].sort((a, b) => strictCompare(a.id, b.id));

    let anyCreated = false;
    for (const c of sortedCorps) {
        // Only activate entries whose available_from turn has arrived
        if (c.available_from > currentTurn) continue;
        // Idempotent: skip if already exists
        if (state.formations[c.id]) continue;

        // Faction presence check (optional — skip if sidToMun not provided)
        if (sidToMun) {
            const pc = state.political_controllers ?? {};
            let hasFactionPresence = false;
            if (state.municipalities?.[c.hq_mun]?.control === 'fragmented') {
                // Fragmented mun — skip
                continue;
            }
            for (const [sid, mun] of sidToMun) {
                if (mun === c.hq_mun && pc[sid] === c.faction) {
                    hasFactionPresence = true;
                    break;
                }
            }
            if (!hasFactionPresence) continue;
        }

        const hq_sid = municipalityHqSettlement?.[c.hq_mun];
        const location_osid =
            c.hq_osid ??
            (canonicalToOperational && hq_sid
                ? resolveLocationOsid(hq_sid, canonicalToOperational)
                : undefined);

        const formation: FormationState = {
            id: c.id as FormationId,
            faction: c.faction,
            name: c.name,
            created_turn: currentTurn,
            status: 'active',
            assignment: null,
            tags: [`mun:${c.hq_mun}`],
            kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
            personnel: 0,
            ...(hq_sid ? { hq_sid } : {}),
            ...(location_osid != null ? { location_osid } : {})
        };
        state.formations[c.id] = formation;
        report.corps_activated += 1;
        report.corps_ids.push(c.id);
        anyCreated = true;
    }

    // Sort the ids list for deterministic output
    report.corps_ids.sort(strictCompare);

    // If any new corps were created, initialize their command state.
    // initializeCorpsCommand is idempotent — safe to call each turn.
    if (anyCreated) {
        initializeCorpsCommand(state);
    }

    return report;
}
