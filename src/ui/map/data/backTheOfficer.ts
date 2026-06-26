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
import { FORCE_LAUNCH_COST, PROACTIVE_FORCE_LAUNCH_COST, AUTHOR_OP_COST } from '../utils/commandAuthority.js';
import {
  validateOpAtInjection,
  type ValidatableOpDef,
  type OpInjectionCheck,
} from '../../../sim/combat/operation_validation.js';
import { getMaxOperationSlots } from '../../../sim/combat/corps_operation_helpers.js';
import type { GameState } from '../../../state/game_state.js';

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

const UNSPECIFIED_OPERATION_LABEL = 'Unspecified operation';

function humanizeInternalOperationName(value: string): string {
  return value
    .replace(/^APPROVE_OP:/i, '')
    .replace(/[:_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function isOpaqueOperationIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (/^APPROVE_OP:/i.test(trimmed)) return true;
  if (/^plan[_:-]/i.test(trimmed)) return true;
  if (/^op[_:-]/i.test(trimmed)) return true;
  if (/^[a-z0-9]+(?:[_:][a-z0-9]+)+$/i.test(trimmed)) return true;
  return false;
}

function playerSafeOperationNameCandidate(value: unknown): string | null {
  const raw = str(value)?.trim();
  if (!raw) return null;
  if (/^operation[_:-]/i.test(raw)) return humanizeInternalOperationName(raw);
  if (isOpaqueOperationIdentifier(raw)) return null;
  return raw;
}

function playerSafeOperationName(...values: unknown[]): string {
  for (const value of values) {
    const candidate = playerSafeOperationNameCandidate(value);
    if (candidate) return candidate;
  }
  return UNSPECIFIED_OPERATION_LABEL;
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
      const opName = playerSafeOperationName(op.name);

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

// --- Op-proposal decision-card projection (Phase 2 slice 1 "Back the Officer") ---

/** Minimal pending-proposal shape the card builder reads (subset of PendingProposalReview). */
export interface OpProposalReviewRow {
  id: string;
  faction?: string;
  domain?: string;
  description?: string;
  proposed_action?: string;
}

/**
 * A decision card for one pending 'ops' proposal (APPROVE_OP:<corps>:<plan>),
 * joined to the matching active operation so the player decides in the
 * NAMED-OFFICER voice — who proposes, the force ratio he estimates, what is
 * being pulled (donors / cohesion), his go/no-go call, and the override cost.
 *
 * Pure + defensive: every join is best-effort. When the op or officer cannot be
 * resolved the card still renders (officer = null, ratio = null, donors = []).
 */
export interface OpProposalCardView {
  /** Proposal id (the IPC accept/reject/force-launch key). */
  proposal_id: string;
  /** Anchor corps id parsed from the proposed_action. */
  corps_id: string;
  /** Player-facing corps name (falls back to the corps id). */
  corps_name: string;
  /** Plan id parsed from the proposed_action. */
  plan_id: string;
  /** Resolved active operation id (null when no active op matches the corps). */
  op_id: string | null;
  /** Operation display name (falls back to the plan id). */
  op_name: string;
  /** Named officer proposing the operation (null when unresolved). */
  commander: TgCommanderView | null;
  /** Commander's estimated force ratio (null when the op carries no estimate). */
  force_ratio_estimate: number | null;
  /** Commander's go/no-go recommendation (null when the op carries none). */
  commander_assessment: 'launch' | 'postpone' | 'abort' | null;
  /** Donor corps lineage for the op's TG (sorted; empty when none / unresolved). */
  donors: TgDonorLineageView[];
  /** Total personnel pulled from donor corps into this op's TG. */
  total_personnel_lent: number;
  /**
   * True when the commander recommends NOT launching (postpone | abort) — the
   * only states where presidential Override (force-launch) is offered.
   */
  override_available: boolean;
  /** Command-authority cost of force-launching (Level 3 Direct Intervention). */
  override_ca_cost: number;
  /** One-line officer-voice framing of the proposal + its cost. */
  framing: string;
}

/** Parse `APPROVE_OP:<corps>:<plan>` → { corpsId, planId }; null when malformed. */
function parseApproveOpAction(action: string | undefined): { corpsId: string; planId: string } | null {
  if (typeof action !== 'string') return null;
  const parts = action.split(':');
  if (parts[0] !== 'APPROVE_OP' || !parts[1] || !parts[2]) return null;
  return { corpsId: parts[1], planId: parts.slice(2).join(':') };
}

/** Find an active operation on a corps by plan id. Stale proposal ids stay unresolved. */
function findOpForPlan(cc: RawRecord | null, planId: string): RawRecord | null {
  if (!cc) return null;
  const activeOps: unknown[] = Array.isArray(cc.active_operations)
    ? cc.active_operations
    : asRecord(cc.active_operation)
      ? [cc.active_operation]
      : [];
  const ops = activeOps.map(asRecord).filter((o): o is RawRecord => o != null);
  if (ops.length === 0) return null;
  const byPlan = ops.find((o) => str(o.plan_id) === planId || str(o.id) === planId);
  return byPlan ?? null;
}

function assessmentOrNull(value: unknown): 'launch' | 'postpone' | 'abort' | null {
  return value === 'launch' || value === 'postpone' || value === 'abort' ? value : null;
}

/** Read a finite number from a free-form record value, else null. */
function finiteNumOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Build a decision card for every pending 'ops' proposal owned by the player.
 *
 * Joins each `APPROVE_OP:<corps>:<plan>` proposal to the matching active op for
 * the named officer, force ratio, donor pull, and go/no-go call. Sorted by
 * proposal id. Returns [] when there are no ops proposals.
 */
export function buildOpProposalCards(
  rawState: unknown,
  roster: BackTheOfficerRosterRow[] | undefined,
  proposals: OpProposalReviewRow[] | undefined,
): OpProposalCardView[] {
  if (!Array.isArray(proposals) || proposals.length === 0) return [];
  const state = asRecord(rawState);
  const military = asRecord(state?.military);

  const rosterById = new Map<string, BackTheOfficerRosterRow>();
  for (const row of roster ?? []) {
    if (row && typeof row.id === 'string') rosterById.set(row.id, row);
  }

  const corpsNameById = new Map<string, string>();
  const formations = asRecord(military?.formations);
  if (formations) {
    for (const key of Object.keys(formations)) {
      const name = str(asRecord(formations[key])?.name);
      if (name) corpsNameById.set(key, name);
    }
  }

  const corpsCommand = asRecord(military?.corps_command);

  // Reuse the TG donor projection so the "what's pulled / cohesion" line matches
  // the rest of the Back-the-Officer surfaces. Keyed by op_id.
  const tgViews = buildBackTheOfficerViews(rawState, roster);
  const tgByOpId = new Map<string, BackTheOfficerView>();
  for (const v of tgViews) tgByOpId.set(v.op_id, v);

  const cards: OpProposalCardView[] = [];
  for (const proposal of proposals) {
    if (!proposal || proposal.domain !== 'ops') continue;
    const parsed = parseApproveOpAction(proposal.proposed_action);
    if (!parsed) continue;
    const { corpsId, planId } = parsed;

    const cc = asRecord(corpsCommand?.[corpsId]);
    const op = findOpForPlan(cc, planId);

    const opId = str(op?.id) ?? null;
    const opName = playerSafeOperationName(op?.name, op?.objective_description);
    const commanderId = str(op?.tg_commander_officer_id) ?? str(op?.commander_officer_id);
    const commander = resolveCommander(commanderId, rosterById);
    const forceRatio = finiteNumOrNull(op?.force_ratio_estimate);
    const assessment = assessmentOrNull(op?.commander_assessment);

    const tg = opId ? tgByOpId.get(opId) : undefined;
    const donors = tg?.donors ?? [];
    const totalPersonnelLent = tg?.total_personnel_lent ?? 0;

    const overrideAvailable = assessment === 'postpone' || assessment === 'abort';

    cards.push({
      proposal_id: proposal.id,
      corps_id: corpsId,
      corps_name: corpsName(corpsId, corpsNameById),
      plan_id: planId,
      op_id: opId,
      op_name: opName,
      commander,
      force_ratio_estimate: forceRatio,
      commander_assessment: assessment,
      donors,
      total_personnel_lent: totalPersonnelLent,
      override_available: overrideAvailable,
      override_ca_cost: FORCE_LAUNCH_COST,
      framing: buildOpProposalFraming(opName, commander, forceRatio, assessment, donors, totalPersonnelLent),
    });
  }

  cards.sort((a, b) => strictCompare(a.proposal_id, b.proposal_id));
  return cards;
}

/** One-line officer-voice framing for an op proposal decision card. */
export function buildOpProposalFraming(
  opName: string,
  commander: TgCommanderView | null,
  forceRatio: number | null,
  assessment: 'launch' | 'postpone' | 'abort' | null,
  donors: TgDonorLineageView[],
  totalPersonnelLent: number,
): string {
  const who = commander
    ? `${commander.rank ? `${humanizeRank(commander.rank)} ` : ''}${commander.name}`
    : 'Your field commander';
  const ratioClause = forceRatio != null ? ` at an estimated ${forceRatio.toFixed(1)}:1` : '';
  const recommendation =
    assessment === 'launch'
      ? 'recommends you authorize the assault'
      : assessment === 'postpone'
        ? 'recommends you hold — the moment is not ripe'
        : assessment === 'abort'
          ? 'recommends against it'
          : 'awaits your decision on';
  const lead = `${who} ${recommendation} ${opName}${ratioClause}.`;

  if (donors.length === 0) return lead;
  const pulling = totalPersonnelLent > 0
    ? ` It pulls ${totalPersonnelLent.toLocaleString('en-US')} men from ${joinList(donors.map((d) => d.corps_name))} — cohesion bled.`
    : ` It pulls battalions from ${joinList(donors.map((d) => d.corps_name))} — cohesion bled.`;
  return `${lead}${pulling}`;
}

// --- Proactive force-launch projection ("override without proposal") ---
//
// At autonomy level 1 the corps commander may hold a plan at 'ready' WITHOUT
// surfacing it as an APPROVE_OP proposal (he prepared it but did not recommend
// launching this turn). This projection lists those held-ready plans so the
// president can PROACTIVELY force the launch (paying PROACTIVE_FORCE_LAUNCH_COST
// command authority) — distinct from overriding a surfaced no-go.
//
// A plan is "forceable" iff:
//   1. corps.commander_state.current_plan.status === 'ready', AND
//   2. NO pending proposal carries APPROVE_OP:<corpsId>:<plan_id> for it.
// Pure / defensive / deterministic (sorted by corps id then plan id).

/** One corps plan the officer holds at 'ready' with no surfaced proposal. */
export interface ForceableReadyPlanView {
  /** Anchor corps id that owns the held plan. */
  corps_id: string;
  /** Player-facing corps name (falls back to the corps id). */
  corps_name: string;
  /** The held plan's id (the IPC force-launch key, with corps_id). */
  plan_id: string;
  /** Operation display name (plan objective_description, falls back to plan id). */
  op_name: string;
  /** The corps commander leading it (null when unresolved). */
  commander: TgCommanderView | null;
  /**
   * The officer's own readiness note for this held plan, if any (last_plan_reason
   * on the commander_state). Player-safe; null when absent.
   */
  commander_assessment: string | null;
  /** Command-authority cost of proactively forcing this plan. */
  force_ca_cost: number;
}

/** Minimal pending-proposal shape this projection reads. */
export interface ForceableReadyProposalRow {
  proposed_action?: string;
}

/**
 * Build the list of corps plans currently held at 'ready' with NO surfaced
 * proposal — the candidates for a proactive presidential force-launch.
 *
 * Reads raw GameState (military.corps_command[*].commander_state.current_plan)
 * and the pending proposals so a plan that already has an APPROVE_OP proposal is
 * excluded (that one goes through the existing commit / override path instead).
 * Returns [] when no corps holds a ready plan. Sorted by corps id then plan id.
 */
export function buildForceableReadyPlans(
  rawState: unknown,
  roster: BackTheOfficerRosterRow[] | undefined,
  proposals: ForceableReadyProposalRow[] | undefined,
): ForceableReadyPlanView[] {
  const state = asRecord(rawState);
  const military = asRecord(state?.military);
  if (!military) return [];

  const corpsCommand = asRecord(military.corps_command);
  if (!corpsCommand) return [];

  // Player-ownership: only surface plans for the player faction's own corps.
  // Corps→faction is the corps formation's faction (corps_command key is a
  // FormationId in military.formations). When player_faction is unknown (null),
  // keep all (defensive — mirrors getPendingProposalReviewsForPlayer).
  const meta = asRecord(state?.meta);
  const playerFaction = str(meta?.player_faction) ?? null;

  const rosterById = new Map<string, BackTheOfficerRosterRow>();
  for (const row of roster ?? []) {
    if (row && typeof row.id === 'string') rosterById.set(row.id, row);
  }

  const corpsNameById = new Map<string, string>();
  const corpsFactionById = new Map<string, string>();
  const formations = asRecord(military.formations);
  if (formations) {
    for (const key of Object.keys(formations)) {
      const f = asRecord(formations[key]);
      const name = str(f?.name);
      if (name) corpsNameById.set(key, name);
      const faction = str(f?.faction);
      if (faction) corpsFactionById.set(key, faction);
    }
  }

  // Resolve the active corps commander per corps from named_officers
  // (status active + assigned to the corps). Sorted pick for determinism.
  const namedOfficers = asRecord(military.named_officers);
  const commanderIdByCorps = new Map<string, string>();
  if (namedOfficers) {
    for (const oid of Object.keys(namedOfficers).sort(strictCompare)) {
      const os = asRecord(namedOfficers[oid]);
      if (!os) continue;
      if (str(os.status) !== 'active') continue;
      const corpsId = str(os.assigned_corps_id);
      if (corpsId && !commanderIdByCorps.has(corpsId)) commanderIdByCorps.set(corpsId, oid);
    }
  }

  // Index the plan ids that already carry a surfaced proposal so we exclude them.
  const proposedPlanKeys = new Set<string>();
  for (const p of proposals ?? []) {
    const action = str(p?.proposed_action);
    if (!action) continue;
    const parts = action.split(':');
    if (parts[0] !== 'APPROVE_OP' || !parts[1] || !parts[2]) continue;
    proposedPlanKeys.add(`${parts[1]}:${parts.slice(2).join(':')}`);
  }

  const views: ForceableReadyPlanView[] = [];
  for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
    const cc = asRecord(corpsCommand[corpsId]);
    if (!cc) continue;
    // Skip corps that don't belong to the player faction.
    const corpsFaction = corpsFactionById.get(corpsId) ?? null;
    if (playerFaction && corpsFaction !== playerFaction) continue;
    const cmdState = asRecord(cc.commander_state);
    const plan = asRecord(cmdState?.current_plan);
    if (!plan) continue;
    if (str(plan.status) !== 'ready') continue;
    const planId = str(plan.plan_id);
    if (!planId) continue;
    // Skip plans the officer already surfaced as a proposal (existing path owns those).
    if (proposedPlanKeys.has(`${corpsId}:${planId}`)) continue;

    const commander = resolveCommander(commanderIdByCorps.get(corpsId), rosterById);
    views.push({
      corps_id: corpsId,
      corps_name: corpsName(corpsId, corpsNameById),
      plan_id: planId,
      op_name: playerSafeOperationName(plan.objective_description),
      commander,
      commander_assessment: str(cmdState?.last_plan_reason) ?? null,
      force_ca_cost: PROACTIVE_FORCE_LAUNCH_COST,
    });
  }

  views.sort((a, b) => strictCompare(a.corps_id, b.corps_id) || strictCompare(a.plan_id, b.plan_id));
  return views;
}

// --- Author-new-op eligibility projection (Free War Phase 4, #67, Slice 1) ---
//
// Surfaces ELIGIBILITY/validation feedback + the command-authority cost for a
// player-AUTHORED corps operation, BEFORE any staging or engine execution
// (Slices 2-4). It is a read-only wrapper over the canonical injection validator
// `validateOpAtInjection` (the same gate that runs when a pre-planned/triggered
// op is injected), so the authoring UI shows the EXACT findings the op would hit
// if executed: all_objectives_owned / axis_empty / staging_adjacency /
// objective_overlap / etc.
//
// Pure / defensive / deterministic: no mutation, no Math.random/Date.now. The
// validator itself sorts iteration via strictCompare.

/** One validation finding for an authored op, ready for UI display. */
export interface AuthorableOpWarningView {
  /** Canonical injection-check code (e.g. 'all_objectives_owned'). */
  code: OpInjectionCheck;
  /** Player-facing message (validator detail, with axis context when present). */
  message: string;
  /** Whether this finding blocks (error) or merely warns. */
  severity: 'error' | 'warning';
}

/** Eligibility + cost projection for an authored corps operation. */
export interface AuthorableOpEligibilityView {
  /**
   * True when the authored op carries NO blocking (error-severity) findings AND
   * the corps has a free operation slot. Operation-slot exhaustion is SILENT at
   * injection (nothing rejects an over-capacity op), so "no available slot" is
   * surfaced here as a BLOCKING condition the same as a validation error.
   */
  ok: boolean;
  /** All findings (errors + warnings), sorted by code then message. */
  warnings: AuthorableOpWarningView[];
  /** Command-authority cost of authoring this op (AUTHOR_OP_COST). */
  ca_cost: number;
  /**
   * True when the player can currently afford the authoring cost
   * (military.command_authority.current >= ca_cost). When command_authority is
   * absent (pre-Phase-2 saves / flag-off), affordability defaults to true so the
   * read-model never falsely blocks; the IPC handler (Slice 2) is the real gate.
   */
  affordable: boolean;
  /**
   * True when the corps has a free operation slot for a new op
   * (active_operations.length < getMaxOperationSlots(active brigade count)).
   * Engine slot exhaustion is silent, so the authoring UI must show this up
   * front. Defaults to true when corps/command context is unavailable (the
   * read-model never falsely blocks; the IPC handler is the real gate).
   */
  has_available_slot: boolean;
  /** Operation slots currently in use by the corps (active_operations.length). */
  slots_used: number;
  /** Maximum concurrent operation slots for the corps (floor(active brigades/12), min 1). */
  slots_max: number;
}

/** Minimal state shape this projection reads (command authority only). */
type AuthorableOpStateView = Pick<GameState, 'military'> & {
  military?: { command_authority?: { current?: number } };
};

/** Minimal corps-command shape this projection reads for slot accounting. */
type AuthorableOpCmd = { active_operations?: ReadonlyArray<unknown> };

/**
 * Build the eligibility + cost projection for a candidate authored operation.
 *
 * Wraps `validateOpAtInjection` and joins the player's current command authority
 * (affordability) + the corps's free operation-slot accounting (slot exhaustion
 * is silent in-engine, so it is surfaced here as a blocking condition). PURE —
 * never mutates `state`, `def`, or `cmd`.
 *
 * @param state Current GameState (the raw handle on loadedGameState.rawGameState).
 * @param def   The candidate authored operation definition.
 * @param adjacency Optional OSID adjacency map — enables staging/chain checks.
 * @param cmd   Optional CorpsCommandState for cross-op objective-overlap checks
 *              AND operation-slot accounting (active_operations.length).
 * @param corpsId Optional anchor corps id — enables active-brigade-count-based
 *               slot-max computation (counts formations whose corps_id matches).
 */
export function buildAuthorableOpEligibility(
  state: GameState,
  def: ValidatableOpDef,
  adjacency?: Parameters<typeof validateOpAtInjection>[2],
  cmd?: Parameters<typeof validateOpAtInjection>[3],
  corpsId?: string,
): AuthorableOpEligibilityView {
  const rawWarnings = validateOpAtInjection(def, state, adjacency, cmd);
  const warnings: AuthorableOpWarningView[] = rawWarnings
    .map((w) => ({
      code: w.check,
      message: w.axis_id ? `[${w.axis_id}] ${w.detail}` : w.detail,
      severity: w.severity,
    }))
    .sort((a, b) => strictCompare(a.code, b.code) || strictCompare(a.message, b.message));

  const ca_cost = AUTHOR_OP_COST;
  const current = readCommandAuthorityCurrent(state as AuthorableOpStateView);
  const affordable = current === null ? true : current >= ca_cost;

  const { has_available_slot, slots_used, slots_max } = computeSlotAvailability(
    countActiveCorpsBrigades(state, corpsId),
    cmd as AuthorableOpCmd | undefined,
  );

  // Slot exhaustion blocks the same as a validation error (engine is silent).
  const ok = has_available_slot && !warnings.some((w) => w.severity === 'error');

  return { ok, warnings, ca_cost, affordable, has_available_slot, slots_used, slots_max };
}

/** Read military.command_authority.current defensively; null when absent. */
function readCommandAuthorityCurrent(state: AuthorableOpStateView): number | null {
  const current = state.military?.command_authority?.current;
  return typeof current === 'number' && Number.isFinite(current) ? current : null;
}

/**
 * Count active brigades belonging to a corps (kind brigade, status active),
 * for operation-slot-max accounting. Reads the typed GameState formations map
 * directly (cast-free). Returns 0 when corpsId is absent.
 */
function countActiveCorpsBrigades(state: GameState, corpsId: string | undefined): number {
  if (!corpsId) return 0;
  const formations = state.military?.formations;
  if (!formations) return 0;
  let count = 0;
  for (const fid of Object.keys(formations).sort(strictCompare)) {
    const f = formations[fid];
    if (!f) continue;
    if (f.corps_id !== corpsId) continue;
    if ((f.kind ?? 'brigade') !== 'brigade') continue;
    if (f.status !== 'active') continue;
    count++;
  }
  return count;
}

/**
 * Compute operation-slot availability. slots_max = floor(active brigade count
 * / 12), min 1 (getMaxOperationSlots). slots_used counts active_operations that
 * are NOT in the recovery phase — recovery ops do not occupy a slot. This
 * mirrors the commander emission slot-cap filter `op.phase !== 'recovery'` in
 * src/sim/combat/commander/emit.ts (buildOperations). Defaults to "available"
 * (slots_used 0, max 1) when corps/command context is unavailable so the
 * read-model never falsely blocks.
 */
function computeSlotAvailability(
  activeBrigadeCount: number,
  cmd: AuthorableOpCmd | undefined,
): { has_available_slot: boolean; slots_used: number; slots_max: number } {
  const activeOps = cmd?.active_operations;
  // Recovery-phase ops do not occupy an active slot (mirrors emit.ts).
  const slots_used = Array.isArray(activeOps)
    ? activeOps.filter((op) => asRecord(op)?.phase !== 'recovery').length
    : 0;
  // When no corps context (0 brigades), fall back to the engine minimum of 1
  // slot so a lone authored op is not falsely blocked.
  const slots_max = activeBrigadeCount > 0 ? getMaxOperationSlots(activeBrigadeCount) : 1;
  const has_available_slot = slots_used < slots_max;
  return { has_available_slot, slots_used, slots_max };
}
