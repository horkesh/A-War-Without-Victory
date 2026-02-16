/**
 * Shared utilities for warroom modal and panel components.
 *
 * Consolidates duplicated helpers: month name arrays, turn-to-date conversion,
 * and faction org-pen lookups.
 *
 * No Math.random(), no Date.now(). Pure functions only.
 */

import type { FactionId, OrganizationalPenetration } from '../../../state/game_state.js';

/** Months in title case (January, February, …). */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Months in uppercase (JANUARY, FEBRUARY, …). */
const MONTHS_UPPER = MONTHS.map(m => m.toUpperCase());

/** Game start date: 1 September 1991. */
const GAME_START = { year: 1991, month: 8 /* 0-indexed */, day: 1 };

/**
 * Convert a game turn to a formatted date string: "1 January 1992".
 * Each turn = 1 week from the game start date.
 */
export function turnToDateString(turn: number): string {
  const d = new Date(GAME_START.year, GAME_START.month, GAME_START.day);
  d.setDate(d.getDate() + turn * 7);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Convert a game turn to "MONTH YEAR" format: "SEPTEMBER 1991".
 * Used by monthly publications (one issue per 4 turns).
 */
export function turnToMonthYear(turn: number): string {
  const d = new Date(GAME_START.year, GAME_START.month, GAME_START.day);
  d.setMonth(d.getMonth() + Math.floor(turn / 4));
  return `${MONTHS_UPPER[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Convert a game turn to "Week N, Month Year" format: "Week 1, September 1991".
 */
export function turnToWeekString(turn: number): string {
  const d = new Date(GAME_START.year, GAME_START.month, GAME_START.day);
  d.setDate(d.getDate() + turn * 7);
  const week = Math.floor((d.getDate() - 1) / 7) + 1;
  return `Week ${week}, ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Get the party penetration value for a specific faction from org-pen data.
 */
export function getFactionPartyPen(op: OrganizationalPenetration | undefined, factionId: FactionId): number {
  if (!op) return 0;
  switch (factionId) {
    case 'RS': return op.sds_penetration ?? 0;
    case 'RBiH': return op.sda_penetration ?? 0;
    case 'HRHB': return op.hdz_penetration ?? 0;
    default: return 0;
  }
}

/**
 * Check if a faction has paramilitary presence in a municipality's org-pen.
 */
export function hasFactionParamilitary(op: OrganizationalPenetration | undefined, factionId: FactionId): boolean {
  if (!op) return false;
  switch (factionId) {
    case 'RS': return (op.paramilitary_rs ?? 0) > 0;
    case 'RBiH': return (op.patriotska_liga ?? 0) > 0;
    case 'HRHB': return (op.paramilitary_hrhb ?? 0) > 0;
    default: return false;
  }
}

/**
 * Check if a faction has any organizational investment in a municipality.
 * Includes: party penetration, paramilitary, police loyalty (when controlled), TO control.
 */
export function hasFactionPresence(
  op: OrganizationalPenetration | undefined,
  factionId: FactionId,
  isControlled: boolean
): boolean {
  if (!op) return false;
  const partyPen = getFactionPartyPen(op, factionId);
  const paramilitary = hasFactionParamilitary(op, factionId);
  const policeLoyalty = op.police_loyalty === 'loyal' && isControlled;
  const toControl = factionId === 'RBiH' && op.to_control === 'controlled';
  return partyPen > 0 || paramilitary || policeLoyalty || toControl;
}

/** Stability threshold constants for control status display. */
export const STABILITY_SECURE_MIN = 60;
export const STABILITY_CONTESTED_MIN = 40;

/**
 * Derive a control status label from a stability score.
 */
export function controlStatusLabel(stability: number): string {
  if (stability >= STABILITY_SECURE_MIN) return 'SECURE';
  if (stability >= STABILITY_CONTESTED_MIN) return 'CONTESTED';
  return 'HIGHLY CONTESTED';
}

/** Faction display names. */
export const FACTION_DISPLAY_NAMES: Record<string, string> = {
  RBiH: 'Republic of Bosnia and Herzegovina',
  RS: 'Republika Srpska',
  HRHB: 'Croatian Republic of Herzeg-Bosnia',
};

/**
 * Get the player faction from game state (first faction in array, default RBiH).
 */
export function getPlayerFaction(factions: Array<{ id: string }>): FactionId {
  return (factions[0]?.id as FactionId) || 'RBiH';
}
