// Phase 3B "Back the Officer" read-model projection (ADR-0005 / ADR-0006).
//
// Pure, defensive read-model that surfaces the HUMAN STAKES of a Tactical Group
// on EXISTING decision/operation/AAR surfaces — never a donor-management screen.
// It resolves, from data already in GameState:
//   - the standing TG/OG identity (named TG + its named tactical commander),
//   - the donor lineage ("battalions from X, Y corps", cohesion bled),
//   - and the aftermath story (how the TG fared per donor) from tg_participations.
//
// Everything is OPTIONAL and rendered defensively: flag-off / pre-Phase-3A saves
// carry none of these fields, so every projection collapses to null/empty.
// No state mutation; deterministic (sorted iteration via strictCompare).

import { getPlayerSafeOfficerName } from '../utils/playerSafeText.js';

type RawRecord = Record<string, unknown>;

export type TgParticipationRole = 'anchor' | 'donor';

/** One donor contribution to a TG, attributed to its source corps. */
export interface TgDonorLineageView {
  /** Donor brigade's source corps id. */
  corps_id: string;
  /** Player-facing corps name (falls back to the corps id). */
  corps_name: string;
  /** Brigade ids lent from this corps (sorted). */
  brigade_ids: string[];
  /** Total personnel lent from this corps (sum of personnel_lent, 0 when unknown). */
  personnel_lent: number;
}

/** The named officer leading a TG's anchor assault. */
export interface TgCommanderView {
  officer_id: string;
  name: string;
  rank?: string;
  /** True when the officer roster reports this officer killed/captured. */
  lost: boolean;
  status?: string;
}

/**
 * The standing TG identity + who is backing it, for a single operation.
 * Surfaced on the operation/decision/AAR surfaces — INTENT altitude only.
 */
export interface BackTheOfficerView {
  /** CorpsOperation.id this TG carries out. */
  op_id: string;
  /** Operation display name. */
  op_name: string;
  /** Anchor corps that owns the TG. */
  anchor_corps_id: string;
  anchor_corps_name: string;
  /** Standing TG/OG identity label (e.g. "TG Drina"); null when unnamed. */
  tg_name: string | null;
  /** Active TG id (set at formation). */
  tg_id: string | null;
  /** Named officer leading the anchor assault; null when none assigned. */
  commander: TgCommanderView | null;
  /** Donor corps lineage, sorted by corps id. */
  donors: TgDonorLineageView[];
  /** Total personnel bled from donor corps into this TG. */
  total_personnel_lent: number;
  /**
   * One-line "back the officer" framing: who he is, what he is pulling, the cost.
   * Always populated (defensive fallbacks) so the decision surface can render it.
   */
  framing: string;
}

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function asRecord(value: unknown): RawRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Officer lookup row (subset of NamedOfficerView the projection needs). */
export interface BackTheOfficerRosterRow {
  id: string;
  name: string;
  rank?: string;
  status?: string;
}

const LOST_STATUSES = new Set(['killed', 'captured']);

function resolveCommander(
  officerId: string | undefined,
  rosterById: Map<string, BackTheOfficerRosterRow>,
): TgCommanderView | null {
  if (!officerId) return null;
  const row = rosterById.get(officerId);
  const status = row?.status;
  return {
    officer_id: officerId,
    // Roster names are already player-safe; otherwise sanitize defensively.
    name: row?.name ?? getPlayerSafeOfficerName(null),
    rank: row?.rank,
    lost: status ? LOST_STATUSES.has(status) : false,
    status,
  };
}

function corpsName(corpsId: string, corpsNameById: Map<string, string>): string {
  return corpsNameById.get(corpsId) ?? corpsId;
}

function buildDonorLineageFromParticipations(
  participations: RawRecord[],
  tgId: string,
  corpsNameById: Map<string, string>,
  brigadeId: string,
): Map<string, TgDonorLineageView> {
  // Accumulate per-corps donor lineage. Keyed by source corps id.
  const byCorps = new Map<string, TgDonorLineageView>();
  for (const p of participations) {
    if (str(p.tg_id) !== tgId) continue;
    if (str(p.role) !== 'donor') continue;
    const corpsId = str(p.donor_corps_id) ?? '';
    if (!corpsId) continue;
    const existing = byCorps.get(corpsId) ?? {
      corps_id: corpsId,
      corps_name: corpsName(corpsId, corpsNameById),
      brigade_ids: [],
      personnel_lent: 0,
    };
    if (!existing.brigade_ids.includes(brigadeId)) existing.brigade_ids.push(brigadeId);
    existing.personnel_lent += num(p.personnel_lent);
    byCorps.set(corpsId, existing);
  }
  return byCorps;
}

/**
 * Build the "back the officer" projection for every active TG-carrying operation.
 *
 * Reads the raw GameState (military.corps_command active operations + per-brigade
 * brigade_history.tg_participations) and the player-facing officer roster. Returns
 * an empty array when no operation carries a TG identity (flag-off / pre-3A).
 */
export function buildBackTheOfficerViews(
  rawState: unknown,
  roster: BackTheOfficerRosterRow[] | undefined,
): BackTheOfficerView[] {
  const state = asRecord(rawState);
  const military = asRecord(state?.military);
  if (!military) return [];

  const rosterById = new Map<string, BackTheOfficerRosterRow>();
  for (const row of roster ?? []) {
    if (row && typeof row.id === 'string') rosterById.set(row.id, row);
  }

  // corps_name lookup from formations.
  const corpsNameById = new Map<string, string>();
  const formations = asRecord(military.formations);
  if (formations) {
    for (const key of Object.keys(formations)) {
      const f = asRecord(formations[key]);
      const name = str(f?.name);
      if (name) corpsNameById.set(key, name);
    }
  }

  // army_hq op donor lineage (faction-scope ops) keyed by op id, as a fallback
  // when per-brigade participations are sparse.
  const armyHqDonorByOp = new Map<string, string[]>();
  const armyHqOps = asRecord(military.army_hq_operations);
  if (armyHqOps) {
    for (const key of Object.keys(armyHqOps)) {
      const op = asRecord(armyHqOps[key]);
      const donors = Array.isArray(op?.donor_corps_ids)
        ? (op!.donor_corps_ids as unknown[]).filter((d): d is string => typeof d === 'string')
        : [];
      const tgId = str(op?.tg_id);
      if (tgId) armyHqDonorByOp.set(tgId, [...donors].sort(strictCompare));
    }
  }

  // Index per-brigade donor participations by tg_id once.
  const brigadeHistories: Array<{ brigadeId: string; participations: RawRecord[] }> = [];
  if (formations) {
    for (const brigadeId of Object.keys(formations).sort(strictCompare)) {
      const f = asRecord(formations[brigadeId]);
      const history = asRecord(f?.brigade_history);
      const live = Array.isArray(history?.tg_participations) ? (history!.tg_participations as RawRecord[]) : [];
      const archived = Array.isArray(history?.archived_tg_participations)
        ? (history!.archived_tg_participations as RawRecord[])
        : [];
      const all = [...live, ...archived].filter((p): p is RawRecord => asRecord(p) != null);
      if (all.length > 0) brigadeHistories.push({ brigadeId, participations: all });
    }
  }

  const corpsCommand = asRecord(military.corps_command);
  if (!corpsCommand) return [];

  const views: BackTheOfficerView[] = [];
  for (const anchorCorpsId of Object.keys(corpsCommand).sort(strictCompare)) {
    const cc = asRecord(corpsCommand[anchorCorpsId]);
    if (!cc) continue;
    const activeOps = Array.isArray(cc.active_operations)
      ? (cc.active_operations as unknown[])
      : asRecord(cc.active_operation)
        ? [cc.active_operation]
        : [];
    for (const rawOp of activeOps) {
      const op = asRecord(rawOp);
      if (!op) continue;
      const tgId = str(op.tg_id);
      const commanderId = str(op.tg_commander_officer_id);
      const tgName = str(op.tg_display_name) ?? str(op.tg_name) ?? null;
      // A TG-carrying op needs at least a tg_id or a named commander to be worth surfacing.
      if (!tgId && !commanderId) continue;

      const opId = str(op.id) ?? str(op.name) ?? `${anchorCorpsId}:op`;
      const opName = str(op.name) ?? opId;

      // Donor lineage from per-brigade participations (preferred — carries personnel + brigade ids).
      const byCorps = new Map<string, TgDonorLineageView>();
      if (tgId) {
        for (const { brigadeId, participations } of brigadeHistories) {
          const partial = buildDonorLineageFromParticipations(participations, tgId, corpsNameById, brigadeId);
          for (const [corpsId, lineage] of partial) {
            const existing = byCorps.get(corpsId);
            if (!existing) {
              byCorps.set(corpsId, lineage);
              continue;
            }
            for (const b of lineage.brigade_ids) if (!existing.brigade_ids.includes(b)) existing.brigade_ids.push(b);
            existing.personnel_lent += lineage.personnel_lent;
          }
        }
      }
      // Fallback: army HQ donor_corps_ids (no personnel detail) when participations sparse.
      if (byCorps.size === 0 && tgId && armyHqDonorByOp.has(tgId)) {
        for (const corpsId of armyHqDonorByOp.get(tgId)!) {
          if (corpsId === anchorCorpsId) continue;
          byCorps.set(corpsId, {
            corps_id: corpsId,
            corps_name: corpsName(corpsId, corpsNameById),
            brigade_ids: [],
            personnel_lent: 0,
          });
        }
      }

      const donors = [...byCorps.values()]
        .map((d) => ({ ...d, brigade_ids: [...d.brigade_ids].sort(strictCompare) }))
        .sort((a, b) => strictCompare(a.corps_id, b.corps_id));
      const totalPersonnelLent = donors.reduce((sum, d) => sum + d.personnel_lent, 0);
      const commander = resolveCommander(commanderId, rosterById);

      views.push({
        op_id: opId,
        op_name: opName,
        anchor_corps_id: anchorCorpsId,
        anchor_corps_name: corpsName(anchorCorpsId, corpsNameById),
        tg_name: tgName,
        tg_id: tgId ?? null,
        commander,
        donors,
        total_personnel_lent: totalPersonnelLent,
        framing: buildFraming(tgName, opName, commander, donors, totalPersonnelLent),
      });
    }
  }

  views.sort((a, b) => strictCompare(a.op_id, b.op_id));
  return views;
}

/**
 * One-line "back the officer" framing for a decision surface.
 * Keeps the player at INTENT altitude: who he is, what he is pulling, the cost.
 */
export function buildFraming(
  tgName: string | null,
  opName: string,
  commander: TgCommanderView | null,
  donors: TgDonorLineageView[],
  totalPersonnelLent: number,
): string {
  const identity = tgName ?? opName;
  const who = commander
    ? `${commander.rank ? `${humanizeRank(commander.rank)} ` : ''}${commander.name}`
    : 'the field commander';
  const lead = `Back ${who} and his ${identity}.`;

  if (donors.length === 0) {
    return `${lead} He fights with his own corps' brigades.`;
  }

  const donorNames = donors.map((d) => d.corps_name);
  const pulling = `He is pulling battalions from ${joinList(donorNames)}`;
  const cost = totalPersonnelLent > 0
    ? ` — ${totalPersonnelLent.toLocaleString('en-US')} men lent, cohesion bled from those corps.`
    : ' — cohesion bled from those corps.';
  return `${lead} ${pulling}${cost}`;
}

function humanizeRank(rank: string): string {
  return rank
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// --- Aftermath / Chronicle story projection ---

/** A donor's casualties within a TG, for the AAR aftermath story. */
export interface TgAftermathDonorView {
  corps_id: string;
  corps_name: string;
  brigade_ids: string[];
  personnel_lent: number;
  personnel_returned: number;
  casualties: number;
}

/** How a TG fared, for AAR / Chronicle. Reads as a story, not a stat line. */
export interface TgAftermathView {
  tg_id: string;
  tg_name: string | null;
  op_id: string;
  commander: TgCommanderView | null;
  /** True when the anchor officer was killed/captured (TG dissolution by anchor death). */
  anchor_lost: boolean;
  donors: TgAftermathDonorView[];
  total_casualties: number;
  /** One-line narrative of the TG's fate. */
  story: string;
}

/**
 * Build aftermath stories for dissolved/completed TGs from per-brigade
 * tg_participations (incl. archived). Only includes records that carry
 * dissolution telemetry (casualties / personnel_returned) so the AAR reads
 * as a story rather than a half-formed stat line; absent fields default to 0.
 */
export function buildTgAftermathViews(
  rawState: unknown,
  roster: BackTheOfficerRosterRow[] | undefined,
  options: { tgId?: string } = {},
): TgAftermathView[] {
  const state = asRecord(rawState);
  const military = asRecord(state?.military);
  if (!military) return [];

  const rosterById = new Map<string, BackTheOfficerRosterRow>();
  for (const row of roster ?? []) {
    if (row && typeof row.id === 'string') rosterById.set(row.id, row);
  }

  const corpsNameById = new Map<string, string>();
  const formations = asRecord(military.formations);
  if (!formations) return [];
  for (const key of Object.keys(formations)) {
    const f = asRecord(formations[key]);
    const name = str(f?.name);
    if (name) corpsNameById.set(key, name);
  }

  // op_id + commander lookup per tg_id, from active operations (best-effort).
  const opByTg = new Map<string, { op_id: string; commander_id?: string }>();
  const corpsCommand = asRecord(military.corps_command);
  if (corpsCommand) {
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
      const cc = asRecord(corpsCommand[corpsId]);
      const activeOps = Array.isArray(cc?.active_operations)
        ? (cc!.active_operations as unknown[])
        : asRecord(cc?.active_operation)
          ? [cc!.active_operation]
          : [];
      for (const rawOp of activeOps) {
        const op = asRecord(rawOp);
        const tgId = str(op?.tg_id);
        if (!tgId) continue;
        opByTg.set(tgId, { op_id: str(op?.id) ?? str(op?.name) ?? tgId, commander_id: str(op?.tg_commander_officer_id) });
      }
    }
  }

  // Aggregate participations per tg_id.
  interface TgAgg {
    tg_id: string;
    tg_name: string | null;
    op_id: string;
    commander_id?: string;
    donors: Map<string, TgAftermathDonorView>;
  }
  const byTg = new Map<string, TgAgg>();

  for (const brigadeId of Object.keys(formations).sort(strictCompare)) {
    const f = asRecord(formations[brigadeId]);
    const history = asRecord(f?.brigade_history);
    const live = Array.isArray(history?.tg_participations) ? (history!.tg_participations as RawRecord[]) : [];
    const archived = Array.isArray(history?.archived_tg_participations)
      ? (history!.archived_tg_participations as RawRecord[])
      : [];
    for (const p of [...live, ...archived]) {
      const rec = asRecord(p);
      if (!rec) continue;
      const tgId = str(rec.tg_id);
      if (!tgId) continue;
      if (options.tgId && tgId !== options.tgId) continue;
      const role = str(rec.role);
      const agg = byTg.get(tgId) ?? {
        tg_id: tgId,
        tg_name: str(rec.tg_display_name) ?? str(rec.tg_name) ?? null,
        op_id: opByTg.get(tgId)?.op_id ?? str(rec.op_id) ?? tgId,
        commander_id: opByTg.get(tgId)?.commander_id,
        donors: new Map<string, TgAftermathDonorView>(),
      };
      if (role === 'donor') {
        const corpsId = str(rec.donor_corps_id) ?? '';
        if (corpsId) {
          const donor = agg.donors.get(corpsId) ?? {
            corps_id: corpsId,
            corps_name: corpsName(corpsId, corpsNameById),
            brigade_ids: [],
            personnel_lent: 0,
            personnel_returned: 0,
            casualties: 0,
          };
          if (!donor.brigade_ids.includes(brigadeId)) donor.brigade_ids.push(brigadeId);
          donor.personnel_lent += num(rec.personnel_lent);
          donor.personnel_returned += num(rec.personnel_returned);
          // casualties: explicit field if present, else lent-returned (>=0).
          const explicit = num(rec.casualties);
          donor.casualties += explicit > 0
            ? explicit
            : Math.max(0, num(rec.personnel_lent) - num(rec.personnel_returned));
          agg.donors.set(corpsId, donor);
        }
      }
      byTg.set(tgId, agg);
    }
  }

  const views: TgAftermathView[] = [];
  for (const tgId of [...byTg.keys()].sort(strictCompare)) {
    const agg = byTg.get(tgId)!;
    const commander = resolveCommander(agg.commander_id, rosterById);
    const donors = [...agg.donors.values()]
      .map((d) => ({ ...d, brigade_ids: [...d.brigade_ids].sort(strictCompare) }))
      .sort((a, b) => strictCompare(a.corps_id, b.corps_id));
    const totalCasualties = donors.reduce((sum, d) => sum + d.casualties, 0);
    const anchorLost = commander?.lost ?? false;
    views.push({
      tg_id: tgId,
      tg_name: agg.tg_name,
      op_id: agg.op_id,
      commander,
      anchor_lost: anchorLost,
      donors,
      total_casualties: totalCasualties,
      story: buildAftermathStory(agg.tg_name, commander, donors, totalCasualties, anchorLost),
    });
  }
  return views;
}

export function buildAftermathStory(
  tgName: string | null,
  commander: TgCommanderView | null,
  donors: TgAftermathDonorView[],
  totalCasualties: number,
  anchorLost: boolean,
): string {
  const identity = tgName ?? 'the tactical group';
  const who = commander
    ? `${commander.rank ? `${humanizeRank(commander.rank)} ` : ''}${commander.name}`
    : 'its commander';

  if (anchorLost) {
    const fate = commander?.status === 'captured' ? 'captured' : 'killed';
    return `${identity} dissolved when ${who} was ${fate}. ${casualtyClause(donors, totalCasualties)}`;
  }
  if (donors.length === 0) {
    return `${identity}, led by ${who}, fought with its anchor corps alone.`;
  }
  return `${identity}, led by ${who}, was held together by ${casualtyClause(donors, totalCasualties)}`;
}

function casualtyClause(donors: TgAftermathDonorView[], totalCasualties: number): string {
  if (donors.length === 0) {
    return totalCasualties > 0
      ? `${totalCasualties.toLocaleString('en-US')} casualties.`
      : 'its own brigades.';
  }
  const parts = donors.map((d) =>
    d.casualties > 0
      ? `${d.corps_name} (${d.casualties.toLocaleString('en-US')} lost)`
      : d.corps_name,
  );
  const prefix = `battalions from ${joinList(parts)}`;
  return totalCasualties > 0
    ? `${prefix} — ${totalCasualties.toLocaleString('en-US')} men spent in all.`
    : `${prefix}.`;
}
