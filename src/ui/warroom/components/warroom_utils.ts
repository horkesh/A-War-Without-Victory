/**
 * Shared utilities for warroom modal and panel components.
 *
 * Consolidates duplicated helpers: month name arrays, turn-to-date conversion,
 * and faction org-pen lookups.
 *
 * No Math.random(), no Date.now(). Pure functions only.
 */

import type { FactionId, GameState, OrganizationalPenetration } from '../../../state/game_state.js';
import { factionAccentTriple } from '../../shared/factionPalette.js';
import { requirePlayerFaction } from '../../map/data/playerFactionMatch.js';

/** Months in title case (January, February, …). */
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Months in uppercase (JANUARY, FEBRUARY, …). */
const MONTHS_UPPER = MONTHS.map(m => m.toUpperCase());

/** Default game start date: 1 September 1991 (Phase 0). */
const DEFAULT_START = { year: 1991, month: 8 /* 0-indexed */, day: 1 };

/**
 * Active scenario start date. Updated when a new GameState is loaded
 * via setScenarioStartDate(). Falls back to DEFAULT_START.
 */
let _activeStart = { ...DEFAULT_START };

/** Update the scenario start date from GameState.meta.scenario_start_date. */
export function setScenarioStartDate(d: { year: number; month: number; day: number } | undefined): void {
    _activeStart = d ? { year: d.year, month: d.month, day: d.day } : { ...DEFAULT_START };
}

/**
 * Convert a game turn to the absolute "ticker turn" that matches the
 * scripted PHASE0_TICKER_EVENTS array (which is keyed to Sep-1991 epoch).
 * For a Sep 1991 scenario this returns `turn` unchanged; for an Apr 1992
 * scenario it shifts by the number of weeks between the two epoch dates.
 */
export function toTickerTurn(turn: number): number {
    if (_activeStart.year === DEFAULT_START.year &&
        _activeStart.month === DEFAULT_START.month &&
        _activeStart.day === DEFAULT_START.day) {
        return turn;
    }
    const epoch = new Date(DEFAULT_START.year, DEFAULT_START.month, DEFAULT_START.day);
    const scenarioStart = new Date(_activeStart.year, _activeStart.month, _activeStart.day);
    const diffMs = scenarioStart.getTime() - epoch.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    return turn + diffWeeks;
}

/**
 * Convert a game turn to a formatted date string: "1 January 1992".
 * Each turn = 1 week from the active scenario start date.
 */
export function turnToDateString(turn: number): string {
    const d = new Date(_activeStart.year, _activeStart.month, _activeStart.day);
    d.setDate(d.getDate() + turn * 7);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Convert a game turn to "MONTH YEAR" format: "SEPTEMBER 1991".
 * Used by monthly publications (one issue per 4 turns).
 */
export function turnToMonthYear(turn: number): string {
    const d = new Date(_activeStart.year, _activeStart.month, _activeStart.day);
    d.setMonth(d.getMonth() + Math.floor(turn / 4));
    return `${MONTHS_UPPER[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Convert a game turn to "Week N, Month Year" format: "Week 1, September 1991".
 */
export function turnToWeekString(turn: number): string {
    const d = new Date(_activeStart.year, _activeStart.month, _activeStart.day);
    d.setDate(d.getDate() + turn * 7);
    const week = Math.floor((d.getDate() - 1) / 7) + 1;
    return `Week ${week}, ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Return the calendar month (1-12) and year for a given turn.
 * Used by the WallCalendar renderer.
 */
export function turnToCalendarMonthYear(turn: number): { month: number; year: number } {
    const d = new Date(_activeStart.year, _activeStart.month, _activeStart.day);
    d.setDate(d.getDate() + turn * 7);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
}

/**
 * Return a short date label for the toolbar: "Apr 1992".
 * Uses the abbreviated month name.
 */
export function turnToShortLabel(turn: number): string {
    const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date(_activeStart.year, _activeStart.month, _activeStart.day);
    d.setDate(d.getDate() + turn * 7);
    return `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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

/** Exhaustion level label from numeric value. */
export function exhaustionLabel(level: number): string {
    if (level >= 0.75) return 'CRITICAL';
    if (level >= 0.50) return 'HIGH';
    if (level >= 0.25) return 'MODERATE';
    return 'LOW';
}

/** Unicode trend arrow from direction string. */
export function trendArrow(trend: 'up' | 'flat' | 'down'): string {
    switch (trend) {
        case 'up': return '\u2191';    // ↑
        case 'down': return '\u2193';  // ↓
        default: return '\u2192';      // →
    }
}

/** Strength category label for personnel count (aligned with brigade AoR cap thresholds). */
export function strengthCategoryLabel(personnel: number): string {
    if (personnel < 400) return 'WEAK';
    if (personnel < 800) return 'MODERATE';
    if (personnel < 1200) return 'STRONG';
    return 'FORTRESS';
}

/**
 * Faction accent colors for the Warroom shell — derived from the
 * canonical `FACTION_GLOW_RGB` palette (single source of truth across all
 * UI shells; see `src/ui/shared/factionPalette.ts`).
 *
 * DO NOT declare separate literal RGB values here. Adding a new faction
 * requires extending `FACTION_GLOW_RGB` in `buildForceQualityOverlay.ts`;
 * this map is then automatically derived.
 */
export const FACTION_COLORS: Record<string, { primary: string; dim: string; bg: string }> = {
    RBiH: factionAccentTriple('RBiH'),
    RS: factionAccentTriple('RS'),
    HRHB: factionAccentTriple('HRHB'),
};

/** Get the CSS class suffix for a faction: 'rbih', 'rs', 'hrhb'. */
export function factionCssClass(factionId: FactionId): string {
    return factionId.toLowerCase();
}

/**
 * Get the player faction from game state.
 * Reads the required loaded-state meta.player_faction contract.
 */
export function getPlayerFaction(gameState: GameState): FactionId {
    return requirePlayerFaction(gameState.meta?.player_faction, 'warroom player faction');
}
