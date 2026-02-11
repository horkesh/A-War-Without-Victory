/**
 * Adapter for loading and extracting data from a saved GameState (final_save.json).
 * Converts the rich GameState structure into the flat LoadedGameState view
 * needed by the map application.
 */

import type { LoadedGameState, FormationView, MilitiaPoolView } from '../types.js';
import { buildControlLookup, buildStatusLookup } from './ControlLookup.js';

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
      });
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

  // Also check for control_status in municipalities
  const munis = state.municipalities as Record<string, Record<string, unknown>> | undefined;
  if (munis) {
    for (const [, mun] of Object.entries(munis)) {
      const cs = mun.control_status as string | undefined;
      if (cs && cs !== 'SECURE') {
        // Municipality-level status can inform settlement-level if not already set
      }
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
  };
}
