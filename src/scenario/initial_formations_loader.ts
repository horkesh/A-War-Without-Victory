/**
 * Load initial formations from a scenario asset (Option A / Phase 2).
 * Schema: array of records with required id, faction, name; optional kind, assignment, status, created_turn.
 * Returns FormationState[] in deterministic order (by id). No derived or runtime-only fields.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
  FormationState,
  FormationId,
  FactionId,
  FormationKind,
  FormationAssignment,
  BrigadePosture
} from '../state/game_state.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];
const CANONICAL_KINDS: FormationKind[] = ['militia', 'territorial_defense', 'brigade', 'operational_group', 'corps_asset'];
const CANONICAL_POSTURES: BrigadePosture[] = ['defend', 'probe', 'attack', 'elastic_defense', 'consolidation'];

export interface InitialFormationRecord {
  id: string;
  faction: string;
  name: string;
  kind?: string;
  assignment?: { kind: 'region' | 'edge'; region_id?: string; edge_id?: string } | null;
  status?: 'active' | 'inactive';
  created_turn?: number;
  tags?: string[];
  personnel?: number;
  hq_sid?: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function parseAssignment(raw: unknown): FormationAssignment | null {
  if (raw == null) return null;
  if (!isRecord(raw) || typeof raw.kind !== 'string') return null;
  if (raw.kind === 'region' && typeof raw.region_id === 'string') {
    return { kind: 'region', region_id: raw.region_id };
  }
  if (raw.kind === 'edge' && typeof raw.edge_id === 'string') {
    return { kind: 'edge', edge_id: raw.edge_id };
  }
  return null;
}

/**
 * Load and validate initial formations from JSON file.
 * File format: { "formations": [ { "id", "faction", "name", ... } ] } or [ { "id", "faction", "name", ... } ].
 * Returns formations in stable order (sorted by id). Throws on invalid or duplicate id.
 */
export async function loadInitialFormations(path: string): Promise<FormationState[]> {
  const absPath = resolve(path);
  const content = await readFile(absPath, 'utf8');
  const parsed = JSON.parse(content) as unknown;
  let rows: unknown[];
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (isRecord(parsed) && Array.isArray(parsed.formations)) {
    rows = parsed.formations;
  } else {
    throw new Error(
      `Invalid initial formations file: expected array or { formations: array }, got ${typeof parsed}`
    );
  }

  const seenIds = new Set<string>();
  const result: FormationState[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.faction !== 'string' || typeof raw.name !== 'string') {
      throw new Error(
        `Invalid initial formation at index ${i}: required id (string), faction (string), name (string)`
      );
    }
    const id = raw.id.trim() as FormationId;
    if (id === '') throw new Error(`Invalid initial formation at index ${i}: id must be non-empty`);
    if (seenIds.has(id)) throw new Error(`Duplicate formation id in initial formations: ${id}`);
    seenIds.add(id);

    const faction = raw.faction.trim() as FactionId;
    if (!CANONICAL_FACTIONS.includes(faction)) {
      throw new Error(
        `Invalid initial formation ${id}: faction must be RBiH, RS, or HRHB, got ${raw.faction}`
      );
    }

    const name = typeof raw.name === 'string' ? raw.name.trim() : String(raw.name);
    const status = raw.status === 'inactive' ? 'inactive' : 'active';
    const created_turn = typeof raw.created_turn === 'number' && Number.isInteger(raw.created_turn)
      ? raw.created_turn
      : 0;
    let kind: FormationKind | undefined;
    if (typeof raw.kind === 'string' && CANONICAL_KINDS.includes(raw.kind as FormationKind)) {
      kind = raw.kind as FormationKind;
    }
    const assignment = parseAssignment(raw.assignment);
    const tags = Array.isArray(raw.tags) ? (raw.tags as string[]).filter((t): t is string => typeof t === 'string') : undefined;
    const personnel = typeof raw.personnel === 'number' && Number.isFinite(raw.personnel) ? raw.personnel : undefined;
    const hq_sid = typeof raw.hq_sid === 'string' && raw.hq_sid.trim() ? raw.hq_sid.trim() : undefined;
    const posture: BrigadePosture | undefined = typeof raw.posture === 'string' && CANONICAL_POSTURES.includes(raw.posture as BrigadePosture)
      ? raw.posture as BrigadePosture : undefined;
    const corps_id = typeof raw.corps_id === 'string' && raw.corps_id.trim() ? raw.corps_id.trim() : undefined;

    result.push({
      id,
      faction,
      name,
      created_turn,
      status,
      assignment,
      ...(kind !== undefined && { kind }),
      ...(tags !== undefined && tags.length > 0 && { tags }),
      ...(personnel !== undefined && { personnel }),
      ...(hq_sid !== undefined && { hq_sid }),
      ...(posture !== undefined && { posture }),
      ...(corps_id !== undefined && { corps_id })
    });
  }

  result.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return result;
}
