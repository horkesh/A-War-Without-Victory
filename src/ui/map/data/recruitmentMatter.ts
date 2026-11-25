/**
 * Recruitment on the President's Desk (owner, 2026-11-12: "When a brigade is eligible
 * for recruitment, that should be put front and center to the president, not wait until
 * he visits recruitment tab.").
 *
 * Pure presentation. Eligibility itself is the engine's (`evaluateRecruitmentEligibility`
 * through the `get-recruitment-catalog` IPC); this module only remembers what the
 * president has already been told and turns the difference into one matter:
 *   a short notice of what the staff raised since last week and which brigades are newly
 *   ready, at every autonomy level. The staff raise the player's brigades at every level,
 *   Full Control included (player-override model, Engine Invariants §14.10a, #865); the
 *   president's levers are the per-brigade hold in Recruitment and raising one sooner there.
 *   (Until lane C s11, Full Control had a "decision" matter with "Not now", which framed
 *   recruitment as waiting on the president; #865 made that untrue.)
 *
 * "Newly" is derived by comparing the catalog at the previous snapshot turn with the
 * current one. The watch lives in the UI store only (never in GameState or a save), so
 * a loaded save starts a fresh watch and announces everything currently raisable once.
 * All lists are ordered with `strictCompare` on brigade id.
 */

import { strictCompare } from '../../../state/validateGameState';
import type { RecruitmentCatalogBrigade } from '../desktop/types';

export interface RecruitmentCatalogSnapshot {
  faction: string;
  turn: number;
  autonomyLevel: number;
  brigades: readonly RecruitmentCatalogBrigade[];
}

export interface RecruitmentWatchBrigade {
  id: string;
  name: string;
  homeMun: string;
  manpowerCost: number;
  capitalCost: number;
  equipmentClass: string;
}

export interface RecruitmentWatch {
  faction: string;
  turn: number;
  autonomyLevel: number;
  /** Every brigade of the faction that can be raised now. */
  eligible: RecruitmentWatchBrigade[];
  /** Ids of the faction's brigades already in the field. */
  raisedIds: string[];
  /** Raisable brigades the president holds: the staff will not raise them (any autonomy level). */
  heldIds: string[];
  /** Became raisable at this snapshot (the whole list on a fresh watch). */
  newlyEligibleIds: string[];
  /** Raised between the previous snapshot turn and this one (the staff's work). */
  newlyRaised: RecruitmentWatchBrigade[];
  /** Turn whose notice the president marked as read. */
  noticeDismissedTurn: number | null;
}

export type RecruitmentMatterMode = 'notice';

export interface RecruitmentMatter {
  id: string;
  mode: RecruitmentMatterMode;
  autonomyLevel: number;
  turn: number;
  /** Brigades newly ready for the staff (not held). */
  ready: RecruitmentWatchBrigade[];
  /** What the staff raised since last week. */
  raised: RecruitmentWatchBrigade[];
  /** Raisable brigades the president holds. */
  held: RecruitmentWatchBrigade[];
  /** The brigade Recruitment opens on (first ready one), or null when none is raisable. */
  focusBrigadeId: string | null;
}

export const RECRUITMENT_MATTER_ID_PREFIX = 'recruitment:';
export const RECRUITMENT_NOTICE_MATTER_ID = 'recruitment:notice';

export function isRecruitmentMatterId(id: string): boolean {
  return id.startsWith(RECRUITMENT_MATTER_ID_PREFIX);
}

function toWatchBrigade(brigade: RecruitmentCatalogBrigade): RecruitmentWatchBrigade {
  return {
    id: brigade.id,
    name: brigade.name,
    homeMun: brigade.home_mun,
    manpowerCost: brigade.manpower_cost,
    capitalCost: brigade.capital_cost,
    equipmentClass: brigade.default_equipment_class,
  };
}

function byId(a: { id: string }, b: { id: string }): number {
  return strictCompare(a.id, b.id);
}

function sortedUnique(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort(strictCompare);
}

function isRaised(brigade: RecruitmentCatalogBrigade): boolean {
  return (brigade.reason_codes ?? []).includes('already_recruited');
}

/**
 * Fold a fresh catalog snapshot into the watch. A different faction, an earlier turn
 * (a load) or no previous watch starts over: everything raisable is new once.
 */
export function advanceRecruitmentWatch(
  previous: RecruitmentWatch | null,
  snapshot: RecruitmentCatalogSnapshot,
): RecruitmentWatch {
  const own = snapshot.brigades.filter((brigade) => brigade.faction === snapshot.faction);
  const eligible = own.filter((brigade) => brigade.eligible !== false).map(toWatchBrigade).sort(byId);
  const eligibleIds = eligible.map((brigade) => brigade.id);
  const eligibleSet = new Set(eligibleIds);
  const raisedIds = sortedUnique(own.filter(isRaised).map((brigade) => brigade.id));
  const heldIds = sortedUnique(own.filter((brigade) => brigade.held === true && eligibleSet.has(brigade.id)).map((brigade) => brigade.id));

  const fresh = previous === null
    || previous.faction !== snapshot.faction
    || snapshot.turn < previous.turn;
  if (fresh) {
    return {
      faction: snapshot.faction,
      turn: snapshot.turn,
      autonomyLevel: snapshot.autonomyLevel,
      eligible,
      raisedIds,
      heldIds,
      newlyEligibleIds: eligibleIds,
      newlyRaised: [],
      noticeDismissedTurn: null,
    };
  }

  const known = new Set(previous.eligible.map((brigade) => brigade.id));
  const appeared = eligibleIds.filter((id) => !known.has(id));

  if (snapshot.turn === previous.turn) {
    // A refresh inside the same week (the president raised a brigade, or reopened the
    // list): keep this week's notice, absorb any change, never re-announce.
    return {
      ...previous,
      autonomyLevel: snapshot.autonomyLevel,
      eligible,
      raisedIds,
      heldIds,
      newlyEligibleIds: sortedUnique([...previous.newlyEligibleIds, ...appeared]),
    };
  }

  const previouslyRaised = new Set(previous.raisedIds);
  const newlyRaised = own
    .filter((brigade) => isRaised(brigade) && !previouslyRaised.has(brigade.id))
    .map(toWatchBrigade)
    .sort(byId);
  return {
    faction: snapshot.faction,
    turn: snapshot.turn,
    autonomyLevel: snapshot.autonomyLevel,
    eligible,
    raisedIds,
    heldIds,
    newlyEligibleIds: appeared,
    newlyRaised,
    noticeDismissedTurn: null,
  };
}

/** "Noted" on the notice: hide it for the rest of this week. */
export function setAsideRecruitmentMatter(watch: RecruitmentWatch): RecruitmentWatch {
  return { ...watch, noticeDismissedTurn: watch.turn };
}

export interface RecruitmentMatterContext {
  playerFaction: string | null | undefined;
  turn: number | null | undefined;
}

/**
 * The single recruitment matter for this week, or null. A watch from another faction or
 * another week (a snapshot still in flight) shows nothing rather than stale brigades.
 */
export function deriveRecruitmentMatter(
  watch: RecruitmentWatch | null,
  context: RecruitmentMatterContext,
): RecruitmentMatter | null {
  if (!watch || !context.playerFaction || watch.faction !== context.playerFaction) return null;
  if (context.turn == null || watch.turn !== context.turn) return null;
  const eligibleById = new Map(watch.eligible.map((brigade) => [brigade.id, brigade]));

  if (watch.noticeDismissedTurn === watch.turn) return null;
  const heldSet = new Set(watch.heldIds);
  // A held brigade is not "ready for the staff": the president told them not to raise it.
  const ready = watch.newlyEligibleIds
    .filter((id) => !heldSet.has(id))
    .map((id) => eligibleById.get(id))
    .filter((brigade): brigade is RecruitmentWatchBrigade => brigade !== undefined);
  const raised = [...watch.newlyRaised];
  if (ready.length === 0 && raised.length === 0) return null;
  const held = watch.heldIds
    .map((id) => eligibleById.get(id))
    .filter((brigade): brigade is RecruitmentWatchBrigade => brigade !== undefined);
  return {
    id: RECRUITMENT_NOTICE_MATTER_ID,
    mode: 'notice',
    autonomyLevel: watch.autonomyLevel,
    turn: watch.turn,
    ready,
    raised,
    held,
    focusBrigadeId: ready[0]?.id ?? null,
  };
}

/** Municipality ids are snake_case ("han_pijesak"); a last-resort readable form. */
export function humanizeMunicipalityId(municipalityId: string): string {
  return municipalityId
    .split('_')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
