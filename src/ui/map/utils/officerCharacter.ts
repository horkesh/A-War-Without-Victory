import type { NamedOfficerView } from '../data/types';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';

// Every player-visible word in this file goes through i18n (`officerChar.*`), so the
// officer card reads the same in EN and BCS. The EN values equal the old literals.
const key = (name: string): MessageKey => `officerChar.${name}` as MessageKey;
const unreported = (): string => t(key('unreported'));

// ═══════════════════════════════════════════════════════════════════════════
// Rating descriptors (1-5 scale)
// ═══════════════════════════════════════════════════════════════════════════

function normalizedRating(value: number | null | undefined, max = 5): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.round(Math.max(1, Math.min(max, value)));
}

function normalizedPipCount(value: number | null | undefined, max = 5): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.round(Math.max(0, Math.min(max, value)));
}

export function getCompetenceLabel(value: number | null | undefined): string {
    const rating = normalizedRating(value);
    return rating == null ? unreported() : t(key(`competence.${rating}`));
}
export function getAggressionLabel(value: number | null | undefined): string {
    const rating = normalizedRating(value);
    return rating == null ? unreported() : t(key(`aggression.${rating}`));
}
export function getDefenseLabel(value: number | null | undefined): string {
    const rating = normalizedRating(value);
    return rating == null ? unreported() : t(key(`defense.${rating}`));
}

// ═══════════════════════════════════════════════════════════════════════════
// Origin labels
// ═══════════════════════════════════════════════════════════════════════════

const ORIGIN_COLOR: Record<string, string> = {
    jna: 'text-blue-400',
    hv: 'text-green-400',
    to: 'text-amber-400',
    militia: 'text-orange-400',
    foreign: 'text-purple-400',
    political: 'text-red-400',
    military: 'text-teal-400',
};

export function getOriginDisplay(origin: string): { label: string; color: string } {
    const color = ORIGIN_COLOR[origin];
    return color
        ? { label: t(key(`origin.${origin}`)), color }
        : { label: origin, color: 'text-text-secondary' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Rank formatting
// ═══════════════════════════════════════════════════════════════════════════

const RANK_DISPLAY_KEY: Record<string, string> = {
    army_commander: 'rank.general',
    corps_commander: 'rank.general',
    deputy: 'rank.deputy',
};

export function formatRank(rank: string): string {
    const rankKey = RANK_DISPLAY_KEY[rank];
    return rankKey ? t(key(rankKey)) : rank;
}

// ═══════════════════════════════════════════════════════════════════════════
// Rank insignia — historically accurate for 1992-1995 Bosnian War
//
// All three factions inherited the JNA (Yugoslav People's Army) rank system.
// VRS kept JNA ranks nearly unchanged, ARBiH introduced "Brigadir",
// HVO adopted Croatian Army (HV) terminology.
//
// Functional OfficerRank → historical rank mapping:
//   army_commander → General-pukovnik (3-star equivalent, highest wartime rank)
//   corps_commander → General-major (2-star equivalent, standard corps command)
//   deputy → Pukovnik/Colonel (1-star equivalent, senior field officer)
// ═══════════════════════════════════════════════════════════════════════════

/** Number of stars for the insignia display. */
export function getRankStarCount(rank: string): number {
    switch (rank) {
        case 'army_commander': return 3;   // General-pukovnik / General-bojnik
        case 'corps_commander': return 2;  // General-major
        case 'deputy': return 1;           // Pukovnik (Colonel)
        default: return 1;
    }
}

/** Whether to show a bar beneath stars (colonels and below). */
export function getRankHasBar(rank: string): boolean {
    return rank === 'deputy';
}

/**
 * Historically accurate rank title by faction.
 * VRS: Serbian/JNA terminology.  ARBiH: mixed JNA + own.  HVO: Croatian (HV) terminology.
 */
export function getRankDisplayName(rank: string, faction: string): string {
    const fid = faction.toUpperCase();
    switch (rank) {
        case 'army_commander':
            if (fid === 'HRHB' || fid === 'HVO') return 'General-bojnik';
            return 'General-pukovnik'; // RS and RBiH
        case 'corps_commander':
            return 'General-major'; // same across all three
        case 'deputy':
            return 'Pukovnik'; // Colonel — same across all three
        default:
            return rank;
    }
}

/** Faction-specific insignia accent color (hex). */
export function getRankInsigniaColor(faction: string): string {
    const fid = faction.toUpperCase();
    if (fid === 'RS' || fid === 'VRS') return '#b03232';
    if (fid === 'RBIH' || fid === 'ARBIH') return '#378c4b';
    if (fid === 'HRHB' || fid === 'HVO') return '#326eaa';
    return '#888888';
}

// ═══════════════════════════════════════════════════════════════════════════
// Character archetype — derived from stat profile
// ═══════════════════════════════════════════════════════════════════════════

export function getArchetype(officer: NamedOfficerView): string {
    return t(key(`archetype.${getArchetypeId(officer)}`));
}

function getArchetypeId(officer: NamedOfficerView): string {
    const c = officer.competence;
    const a = officer.aggressiveness;
    const d = officer.defensive_skill;

    if (![c, a, d].every(Number.isFinite)) return 'unreported';

    // Exceptional all-rounders
    if (c >= 5 && a >= 4 && d >= 4) return 'masterStrategist';
    if (c >= 4 && a >= 4 && d >= 4) return 'completeCommander';

    // Dominant trait archetypes
    if (a >= 5 && c >= 4) return 'assaultCommander';
    if (a >= 5 && c <= 3) return 'recklessAttacker';
    if (d >= 5 && c >= 4) return 'fortressMind';
    if (d >= 5 && a <= 2) return 'entrenchedDefender';

    // Two-trait combos
    if (a >= 4 && d >= 4) return 'versatileFighter';
    if (c >= 4 && a >= 4) return 'aggressiveProfessional';
    if (c >= 4 && d >= 4) return 'methodicalTactician';
    if (c >= 4 && a <= 2) return 'cautiousProfessional';

    // Low-skill archetypes
    if (c <= 2 && a >= 4) return 'politicalFirebrand';
    if (c <= 2 && a <= 2) return 'paperCommander';
    if (c <= 2) return 'placeholderOfficer';

    // Mid-range
    if (a >= 4) return 'aggressiveLeader';
    if (d >= 4) return 'defensiveSpecialist';
    if (c >= 4) return 'competentOfficer';

    return 'lineOfficer';
}

// ═══════════════════════════════════════════════════════════════════════════
// Pip rating (visual ●○ representation)
// ═══════════════════════════════════════════════════════════════════════════

export function getRatingColor(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'text-text-secondary';
    if (value >= 5) return 'text-accent-gold';
    if (value >= 4) return 'text-green-400';
    if (value >= 3) return 'text-text-primary';
    if (value >= 2) return 'text-orange-400';
    return 'text-red-400';
}

export function formatPips(value: number | null | undefined, max = 5): string {
    const filled = normalizedPipCount(value, max);
    if (filled == null) return unreported();
    return '●'.repeat(filled) + '○'.repeat(max - filled) + ` ${filled}/${max}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Combat record summary
// ═══════════════════════════════════════════════════════════════════════════

export function formatCombatRecord(battles: number, victories: number): string {
    if (battles === 0) return t(key('combat.none'));
    const winRate = Math.round((victories / battles) * 100);
    return t(key('combat.record'), { wins: victories, losses: battles - victories, rate: winRate });
}

export function formatTenure(turnsInCommand: number): string {
    if (turnsInCommand === 0) return t(key('tenure.new'));
    return t(key('tenure.weeks'), { weeks: turnsInCommand });
}

// ═══════════════════════════════════════════════════════════════════════════
// Political reliability display
// ═══════════════════════════════════════════════════════════════════════════

export function getReliabilityLabel(value: number | null | undefined): string {
    const rating = normalizedRating(value);
    return rating == null ? unreported() : t(key(`reliability.${rating}`));
}

/** Formatted compliance modifier: e.g. '−0.20', '+0.10', '±0.00' */
export function getComplianceModifierText(politicalReliability: number): string {
    if (!Number.isFinite(politicalReliability)) return unreported();
    const mod = (politicalReliability - 3) * 0.10;
    if (Math.abs(mod) < 0.001) return '±0.00';
    return mod > 0 ? `+${mod.toFixed(2)}` : `−${Math.abs(mod).toFixed(2)}`;
}

/**
 * Format a pre-computed effective compliance modifier as a signed string.
 * e.g., +0.20, -0.25, 0.00
 */
export function getComplianceModifierTextFromValue(modifier: number): string {
    if (!Number.isFinite(modifier)) return unreported();
    const sign = modifier >= 0 ? '+' : '';
    return `${sign}${modifier.toFixed(2)}`;
}

/**
 * Color class for an effective compliance modifier value.
 * Positive → green (officer reliable), negative → red (warlord friction), zero → neutral.
 */
export function getComplianceModifierColor(modifier: number): string {
    if (modifier > 0) return 'text-green-400';
    if (modifier < 0) return 'text-red-400';
    return 'text-text-secondary';
}

/** One-line personality summary from competence x aggressiveness quadrant. */
export function getPersonalitySummary(comp: number, agg: number): string {
    if (!Number.isFinite(comp) || !Number.isFinite(agg)) return t(key('personality.unreported'));
    if (comp >= 4 && agg >= 4) return t(key('personality.fastPrep'));
    if (comp >= 4 && agg <= 2) return t(key('personality.thoroughPrep'));
    if (comp <= 2 && agg >= 4) return t(key('personality.reckless'));
    if (comp <= 2 && agg <= 2) return t(key('personality.hesitant'));
    if (agg >= 4) return t(key('personality.aggressive'));
    if (comp >= 4) return t(key('personality.methodical'));
    return t(key('personality.standard'));
}
