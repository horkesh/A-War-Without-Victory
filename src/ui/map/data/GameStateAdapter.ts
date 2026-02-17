/**
 * Adapter for loading and extracting data from a saved GameState (final_save.json).
 * Converts the rich GameState structure into the flat LoadedGameState view
 * needed by the map application.
 */

import type { LoadedGameState, FormationView, MilitiaPoolView, RecruitmentView, AttackOrderView, MovementOrderView } from '../types.js';
import { buildControlLookup, buildStatusLookup } from './ControlLookup.js';

function pointsByFaction(rec: Record<string, { points?: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const fid of Object.keys(rec).sort()) {
    const v = rec[fid];
    out[fid] = typeof v?.points === 'number' && Number.isFinite(v.points) ? v.points : 0;
  }
  return out;
}

/**
 * Parse a final_save.json file content into a LoadedGameState.
 * Validates required fields and extracts formations, militia pools, and control data.
 */
export function parseGameState(json: unknown): LoadedGameState {
  const state = json as Record<string, unknown>;

  // Validate required fields
  const meta = state.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta.turn !== 'number') {
    throw new Error('Invalid game state: missing meta.turn');
  }

  const turn = meta.turn as number;
  const phase = (meta.phase as string) ?? 'unknown';
  const label = `Turn ${turn} (${phase})`;

  // Build reverse index: formation id -> sorted list of settlement IDs in its AoR
  const brigadeAorByFormationId: Record<string, string[]> = {};
  const rawBrigadeAor = state.brigade_aor as Record<string, string | null> | undefined;
  if (rawBrigadeAor) {
    const sidKeys = Object.keys(rawBrigadeAor).sort();
    for (const sid of sidKeys) {
      const formationId = rawBrigadeAor[sid];
      if (formationId) {
        const list = brigadeAorByFormationId[formationId] ?? [];
        list.push(sid);
        brigadeAorByFormationId[formationId] = list;
      }
    }
    // Sort each list for determinism
    for (const fid of Object.keys(brigadeAorByFormationId)) {
      brigadeAorByFormationId[fid].sort();
    }
  }

  // Extract formations
  const formations: FormationView[] = [];
  const rawFormations = state.formations as Record<string, Record<string, unknown>> | undefined;
  if (rawFormations) {
    const sortedIds = Object.keys(rawFormations).sort();
    for (const id of sortedIds) {
      const f = rawFormations[id];
      const tags = (f.tags as string[]) ?? [];

      // Extract municipality from tags (pattern 'mun:xxx')
      let municipalityId: string | undefined;
      for (const tag of tags) {
        if (tag.startsWith('mun:')) {
          municipalityId = tag.slice(4);
          break;
        }
      }

      const ops = f.ops as Record<string, unknown> | undefined;

      const hq_sid = typeof f.hq_sid === 'string' && f.hq_sid ? f.hq_sid : undefined;
      const aorSettlementIds = brigadeAorByFormationId[id];
      const personnel = typeof f.personnel === 'number' ? f.personnel : undefined;
      const posture = typeof f.posture === 'string' && f.posture ? f.posture : undefined;
      const corps_id = typeof f.corps_id === 'string' && f.corps_id ? f.corps_id : undefined;

      formations.push({
        id: id,
        faction: (f.faction as string) ?? '',
        name: (f.name as string) ?? id,
        kind: (f.kind as string) ?? 'brigade',
        readiness: (f.readiness as string) ?? 'active',
        cohesion: (f.cohesion as number) ?? 100,
        fatigue: (ops?.fatigue as number) ?? 0,
        status: (f.status as string) ?? 'active',
        createdTurn: (f.created_turn as number) ?? 0,
        tags,
        municipalityId,
        hq_sid,
        aorSettlementIds,
        personnel,
        posture,
        corps_id,
      });
    }
  }

  // Enrich corps formations with corps_command data and subordinate lists
  const rawCorpsCommand = state.corps_command as Record<string, Record<string, unknown>> | undefined;
  if (rawCorpsCommand) {
    for (const fv of formations) {
      if (fv.kind === 'corps' || fv.kind === 'corps_asset') {
        const cc = rawCorpsCommand[fv.id];
        if (cc) {
          fv.corpsStance = (cc.stance as string) ?? undefined;
          fv.corpsExhaustion = typeof cc.corps_exhaustion === 'number' ? cc.corps_exhaustion : undefined;
          fv.corpsOgSlots = typeof cc.og_slots === 'number' ? cc.og_slots : undefined;
          fv.corpsCommandSpan = typeof cc.command_span === 'number' ? cc.command_span : undefined;
          const rawActiveOgs = cc.active_ogs;
          if (Array.isArray(rawActiveOgs)) {
            fv.corpsActiveOgIds = [...(rawActiveOgs as string[])].sort();
          }
        }
        // Collect subordinates: all formations whose corps_id points to this corps
        fv.subordinateIds = formations
          .filter((sub) => sub.corps_id === fv.id && sub.id !== fv.id)
          .map((sub) => sub.id)
          .sort();
      }
    }
  }

  // Enrich army_hq formations: subordinates are same-faction corps (not other army_hqs)
  for (const fv of formations) {
    if (fv.kind === 'army_hq') {
      fv.subordinateIds = formations
        .filter((sub) => (sub.kind === 'corps' || sub.kind === 'corps_asset') && sub.faction === fv.faction && sub.id !== fv.id)
        .map((sub) => sub.id)
        .sort();
    }
  }

  // Extract militia pools
  const militiaPools: MilitiaPoolView[] = [];
  const rawPools = state.militia_pools as Record<string, Record<string, unknown>> | undefined;
  if (rawPools) {
    const sortedKeys = Object.keys(rawPools).sort();
    for (const key of sortedKeys) {
      const p = rawPools[key];
      militiaPools.push({
        munId: (p.mun_id as string) ?? key,
        faction: (p.faction as string) ?? '',
        available: (p.available as number) ?? 0,
        committed: (p.committed as number) ?? 0,
        exhausted: (p.exhausted as number) ?? 0,
        fatigue: (p.fatigue as number) ?? 0,
      });
    }
  }

  // Extract political control
  let controlBySettlement: Record<string, string | null> = {};
  let statusBySettlement: Record<string, string> = {};

  const pc = state.political_controllers as Record<string, string | null> | undefined;
  if (pc) {
    controlBySettlement = buildControlLookup(pc);
  }

  const cc = state.contested_control as Record<string, boolean> | undefined;
  if (cc) {
    for (const [sid, contested] of Object.entries(cc)) {
      if (contested) statusBySettlement[sid] = 'CONTESTED';
    }
    statusBySettlement = buildStatusLookup(statusBySettlement);
  }

  // Extract pending attack orders (Record<FormationId, SettlementId | null>).
  const attackOrders: AttackOrderView[] = [];
  const rawAttackOrders = state.brigade_attack_orders as Record<string, string | null> | undefined;
  if (rawAttackOrders && typeof rawAttackOrders === 'object' && !Array.isArray(rawAttackOrders)) {
    for (const [brigadeId, targetSid] of Object.entries(rawAttackOrders).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) {
      if (targetSid) attackOrders.push({ brigadeId, targetSettlementId: targetSid });
    }
  }

  // Extract pending municipality movement orders (Record<FormationId, MunicipalityId[] | null>).
  const movementOrders: MovementOrderView[] = [];
  const rawMunOrders = state.brigade_mun_orders as Record<string, string[] | null> | undefined;
  if (rawMunOrders && typeof rawMunOrders === 'object' && !Array.isArray(rawMunOrders)) {
    for (const [brigadeId, munIds] of Object.entries(rawMunOrders).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) {
      if (Array.isArray(munIds)) {
        for (const targetMunicipalityId of munIds) {
          if (targetMunicipalityId) movementOrders.push({ brigadeId, targetMunicipalityId });
        }
      }
    }
  }

  // Extract recent control events for panel/event ticker.
  const recentControlEvents = (((state.control_events as unknown[]) ?? [])
    .map((entry) => {
      const rec = entry as Record<string, unknown>;
      const turnRaw = Number(rec.turn ?? NaN);
      const settlementId = String(rec.settlement_id ?? '');
      const mechanism = String(rec.mechanism ?? 'unknown');
      if (!Number.isFinite(turnRaw) || !settlementId) return null;
      const fromRaw = rec.from;
      const toRaw = rec.to;
      const munRaw = rec.mun_id;
      return {
        turn: turnRaw,
        settlementId,
        from: fromRaw == null ? null : String(fromRaw),
        to: toRaw == null ? null : String(toRaw),
        mechanism,
        municipalityId: munRaw == null ? null : String(munRaw)
      };
    })
    .filter((v): v is {
      turn: number;
      settlementId: string;
      from: string | null;
      to: string | null;
      mechanism: string;
      municipalityId: string | null;
    } => v !== null))
    .sort((a, b) => {
      if (a.turn !== b.turn) return a.turn - b.turn;
      if (a.settlementId < b.settlementId) return -1;
      if (a.settlementId > b.settlementId) return 1;
      if (a.mechanism < b.mechanism) return -1;
      if (a.mechanism > b.mechanism) return 1;
      return 0;
    });

  // Extract recruitment state (capital and equipment by faction, deterministic key order).
  let recruitment: RecruitmentView | undefined;
  const rawRecruitment = state.recruitment_state as Record<string, unknown> | undefined;
  if (rawRecruitment) {
    const capitalByFaction = pointsByFaction(
      (rawRecruitment.recruitment_capital as Record<string, { points?: number }> | undefined) ?? {}
    );
    const equipmentByFaction = pointsByFaction(
      (rawRecruitment.equipment_pools as Record<string, { points?: number }> | undefined) ?? {}
    );
    const recruitedBrigadeIds = Array.isArray(rawRecruitment.recruited_brigade_ids)
      ? [...(rawRecruitment.recruited_brigade_ids as string[])].sort()
      : [];
    if (Object.keys(capitalByFaction).length > 0) {
      recruitment = {
        capitalByFaction,
        equipmentByFaction: Object.keys(equipmentByFaction).length > 0 ? equipmentByFaction : undefined,
        recruitedBrigadeIds,
      };
    }
  }

  const rbih_hrhb_war_earliest_turn =
    typeof meta?.rbih_hrhb_war_earliest_turn === 'number' ? meta.rbih_hrhb_war_earliest_turn : undefined;
  const phase_i_alliance_rbih_hrhb =
    typeof state.phase_i_alliance_rbih_hrhb === 'number' ? state.phase_i_alliance_rbih_hrhb : undefined;

  const displacementByMun: LoadedGameState['displacementByMun'] = {};
  const rawDisplacement = state.displacement_state as Record<string, Record<string, unknown>> | undefined;
  if (rawDisplacement && typeof rawDisplacement === 'object' && !Array.isArray(rawDisplacement)) {
    for (const [munId, row] of Object.entries(rawDisplacement).sort((a, b) => a[0].localeCompare(b[0]))) {
      const originalPopulation =
        typeof row.original_population === 'number' && Number.isFinite(row.original_population)
          ? row.original_population
          : 0;
      const displacedOut =
        typeof row.displaced_out === 'number' && Number.isFinite(row.displaced_out)
          ? row.displaced_out
          : 0;
      const displacedIn =
        typeof row.displaced_in === 'number' && Number.isFinite(row.displaced_in)
          ? row.displaced_in
          : 0;
      const lostPopulation =
        typeof row.lost_population === 'number' && Number.isFinite(row.lost_population)
          ? row.lost_population
          : 0;
      const currentPopulation = Math.max(0, originalPopulation - displacedOut - lostPopulation + displacedIn);
      displacementByMun[munId] = {
        originalPopulation,
        displacedOut,
        displacedIn,
        lostPopulation,
        currentPopulation
      };
    }
  }

  return {
    label,
    turn,
    phase,
    formations,
    militiaPools,
    controlBySettlement,
    statusBySettlement,
    brigadeAorByFormationId,
    attackOrders,
    movementOrders,
    recentControlEvents,
    recruitment,
    player_faction: (meta.player_faction as string | null | undefined) ?? undefined,
    rbih_hrhb_war_earliest_turn: rbih_hrhb_war_earliest_turn ?? null,
    phase_i_alliance_rbih_hrhb: phase_i_alliance_rbih_hrhb ?? null,
    displacementByMun: Object.keys(displacementByMun).length > 0 ? displacementByMun : undefined,
  };
}
