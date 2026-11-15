/**
 * Default-off `defence` receipts (AWWV_DEBUG_REASON_CODES=defence), 2026-11-16, package "1994-95
 * attack and defence", step 0.
 *
 * For every settlement a faction lost in combat on the previous turn, one stdout line, written at the
 * start of that faction's brigade pass (where counter-attacks are decided). It records:
 *   - the defending sector that owns the lost OSID (line, reserve and rear brigades);
 *   - every own brigade within MAX_HOPS: hops, corps stance, sector role, strength against design,
 *     cohesion, disruption, posture, operation, and which counter-attack gates it passes;
 *   - whether a counter-attack trigger exists (a brigade retreated from the lost OSID, or its sector
 *     has a recent retreat);
 *   - the nearest idle own brigade (no operation; reserve, rear or unassigned, or not on a front).
 * The receipts separate three causes of a thin defence: brigades in the wrong place, a reserve reaction
 * that does not fire, and brigades too weak to hold.
 *
 * OBSERVATION ONLY. Reads state the pass already holds; writes nothing to GameState or reports, and no
 * decision reads it. With the topic off it returns before reading anything. Deterministic: events,
 * sectors and brigades are visited in strictCompare order; BFS expands sorted neighbours.
 */

import type { CorpsFrontSector, FactionId, FormationState, GameState } from '../../state/game_state.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';
import { strictCompare } from '../../state/validateGameState.js';
import { COUNTER_ATTACK_MIN_COHESION, COUNTER_ATTACK_MIN_PERSONNEL } from './bot_constants.js';
import { emitDefenceRecord, isReasonCodeTopicEnabled } from './reason_code_debug.js';

const MAX_HOPS = 3;
const IDLE_SEARCH_HOPS = 8;
const MAX_NEAR_ROWS = 16;

interface SectorRole { sector: CorpsFrontSector; isReserve: boolean }

function bfs(start: string, adjacency: ReadonlyMap<string, readonly string[]>, maxHops: number): Map<string, number> {
    const dist = new Map<string, number>([[start, 0]]);
    let frontier = [start];
    for (let h = 1; h <= maxHops && frontier.length > 0; h++) {
        const next: string[] = [];
        for (const osid of frontier) {
            for (const n of [...(adjacency.get(osid) ?? [])].sort(strictCompare)) {
                if (dist.has(n)) continue;
                dist.set(n, h);
                next.push(n);
            }
        }
        frontier = next.sort(strictCompare);
    }
    return dist;
}

export function emitDefenceTrace(
    state: GameState,
    faction: FactionId,
    brigades: readonly FormationState[],
    adjacency: ReadonlyMap<string, readonly string[]>,
    sectorRoleByBrigade: ReadonlyMap<string, SectorRole>,
    sectorRecentRetreats: ReadonlyMap<string, ReadonlyArray<{ osid: string; turn: number }>>,
): void {
    if (!isReasonCodeTopicEnabled('defence')) return;
    const turn = state.meta?.turn ?? 0;
    const lost = (state.political?.control_events ?? [])
        .filter(e => e.turn === turn - 1 && e.from === faction && e.mechanism === 'combat')
        .sort((a, b) => strictCompare(a.settlement_id, b.settlement_id));
    if (lost.length === 0) return;

    const corpsCommand = state.military.corps_command ?? {};
    const inOperation = new Map<string, string>();
    for (const cid of Object.keys(corpsCommand).sort(strictCompare)) {
        for (const op of corpsCommand[cid]?.active_operations ?? []) {
            for (const bid of op.participating_brigades ?? []) if (!inOperation.has(bid)) inOperation.set(bid, `${op.type}:${op.phase}:${op.name}`);
        }
    }
    const sectors = Object.values(state.military.corps_front_sectors ?? {})
        .filter(s => s.faction === faction)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    const own = [...brigades].filter(b => b.status === 'active' && b.location_osid).sort((a, b) => strictCompare(a.id, b.id));

    const row = (b: FormationState, hops: number) => {
        const corpsId = b.corps_id ?? null;
        const stance = corpsId ? corpsCommand[corpsId]?.stance ?? null : null;
        const role = sectorRoleByBrigade.get(b.id);
        const designed = b.max_personnel !== undefined && b.max_personnel > 0 ? b.max_personnel : MAX_BRIGADE_PERSONNEL;
        const disrupted = (b as { disrupted_turns?: number }).disrupted_turns ?? 0;
        const retreat = (b as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from;
        return {
            id: b.id, hops, loc: b.location_osid, corps: corpsId, corps_stance: stance,
            sector: role?.sector.sector_id ?? null, role: role ? (role.isReserve ? 'reserve' : 'line') : 'none',
            personnel: b.personnel ?? 0, designed, cohesion: b.cohesion ?? null, disrupted_turns: disrupted,
            posture: (b as { posture?: string }).posture ?? null, operation: inOperation.get(b.id) ?? null,
            last_retreat_from: retreat ? `${retreat.osid}@${retreat.turn}` : null,
            ca_gate: {
                stance_defensive: stance === 'defensive',
                not_disrupted: disrupted === 0,
                personnel_ok: (b.personnel ?? 0) >= COUNTER_ATTACK_MIN_PERSONNEL,
                cohesion_ok: (b.cohesion ?? 0) >= COUNTER_ATTACK_MIN_COHESION,
                not_in_operation: !inOperation.has(b.id),
            },
        };
    };

    for (const ev of lost) {
        const lostOsid = ev.settlement_id;
        const dist = bfs(lostOsid, adjacency, IDLE_SEARCH_HOPS);
        const near = own
            .filter(b => (dist.get(b.location_osid!) ?? Infinity) <= MAX_HOPS)
            .map(b => row(b, dist.get(b.location_osid!)!))
            .sort((a, b) => a.hops - b.hops || strictCompare(a.id, b.id));

        const neighbours = new Set(adjacency.get(lostOsid) ?? []);
        const owning = sectors.filter(s => s.sub_segments.some(ss => ss.friendly_osids.includes(lostOsid)));
        const adjacentSectors = owning.length > 0 ? owning
            : sectors.filter(s => s.sub_segments.some(ss => ss.friendly_osids.some(o => neighbours.has(o))));
        const byId = new Map(own.map(b => [b.id, b]));
        const sectorSummary = adjacentSectors.map(s => ({
            sector: s.sector_id, corps: s.corps_id, owns_lost_osid: owning.includes(s),
            unstaffed_front: s.unstaffed_front ?? false,
            line: s.assigned_brigade_ids.map(id => byId.get(id)).filter((b): b is FormationState => !!b)
                .map(b => ({ id: b.id, hops: dist.get(b.location_osid!) ?? null, personnel: b.personnel ?? 0, cohesion: b.cohesion ?? null })),
            reserve: s.reserve_brigade_ids.map(id => byId.get(id)).filter((b): b is FormationState => !!b)
                .map(b => ({ id: b.id, hops: dist.get(b.location_osid!) ?? null, personnel: b.personnel ?? 0, cohesion: b.cohesion ?? null })),
            rear: (s.rear_brigade_ids ?? []).length,
            recent_retreats: (sectorRecentRetreats.get(s.sector_id) ?? []).map(r => `${r.osid}@${r.turn}`),
        }));

        let nearestIdle: ReturnType<typeof row> | null = null;
        for (const b of own) {
            const h = dist.get(b.location_osid!);
            if (h === undefined || inOperation.has(b.id)) continue;
            const role = sectorRoleByBrigade.get(b.id);
            if (role && !role.isReserve) continue; // line brigades hold their own front
            if (nearestIdle === null || h < nearestIdle.hops) nearestIdle = row(b, h);
        }

        emitDefenceRecord({
            turn, faction, lost_osid: lostOsid, lost_turn: ev.turn, to: ev.to, attacker_brigade: ev.attacker_brigade ?? null,
            battle_id: ev.battle_id ?? null,
            retreat_trigger: near.filter(r => r.last_retreat_from === `${lostOsid}@${turn - 1}`).map(r => r.id),
            sectors: sectorSummary,
            near_brigades: near.slice(0, MAX_NEAR_ROWS),
            near_brigades_total: near.length,
            nearest_idle: nearestIdle,
        });
    }
}
