import type { NamedOfficerView } from '../data/types';

// ═══════════════════════════════════════════════════════════════════════════
// Rating descriptors (1-5 scale)
// ═══════════════════════════════════════════════════════════════════════════

const COMPETENCE_LABELS: Record<number, string> = {
    1: 'Inept',
    2: 'Mediocre',
    3: 'Capable',
    4: 'Skilled',
    5: 'Exceptional',
};

const AGGRESSION_LABELS: Record<number, string> = {
    1: 'Passive',
    2: 'Cautious',
    3: 'Balanced',
    4: 'Bold',
    5: 'Relentless',
};

const DEFENSE_LABELS: Record<number, string> = {
    1: 'Exposed',
    2: 'Porous',
    3: 'Steady',
    4: 'Resilient',
    5: 'Ironclad',
};

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
    return rating == null ? 'Unreported' : COMPETENCE_LABELS[rating] ?? 'Unreported';
}
export function getAggressionLabel(value: number | null | undefined): string {
    const rating = normalizedRating(value);
    return rating == null ? 'Unreported' : AGGRESSION_LABELS[rating] ?? 'Unreported';
}
export function getDefenseLabel(value: number | null | undefined): string {
    const rating = normalizedRating(value);
    return rating == null ? 'Unreported' : DEFENSE_LABELS[rating] ?? 'Unreported';
}

// ═══════════════════════════════════════════════════════════════════════════
// Origin labels
// ═══════════════════════════════════════════════════════════════════════════

const ORIGIN_DISPLAY: Record<string, { label: string; color: string }> = {
    jna:       { label: 'JNA',       color: 'text-blue-400' },
    hv:        { label: 'HV',        color: 'text-green-400' },
    to:        { label: 'TO',        color: 'text-amber-400' },
    militia:   { label: 'Militia',   color: 'text-orange-400' },
    foreign:   { label: 'Foreign',   color: 'text-purple-400' },
    political: { label: 'Political', color: 'text-red-400' },
    military:  { label: 'Military',  color: 'text-teal-400' },
};

export function getOriginDisplay(origin: string): { label: string; color: string } {
    return ORIGIN_DISPLAY[origin] ?? { label: origin, color: 'text-text-secondary' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Rank formatting
// ═══════════════════════════════════════════════════════════════════════════

const RANK_DISPLAY: Record<string, string> = {
    army_commander: 'Gen.',
    corps_commander: 'Gen.',
    deputy: 'Dep.',
};

export function formatRank(rank: string): string {
    return RANK_DISPLAY[rank] ?? rank;
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
    const c = officer.competence;
    const a = officer.aggressiveness;
    const d = officer.defensive_skill;

    if (![c, a, d].every(Number.isFinite)) return 'Profile Unreported';

    // Exceptional all-rounders
    if (c >= 5 && a >= 4 && d >= 4) return 'Master Strategist';
    if (c >= 4 && a >= 4 && d >= 4) return 'Complete Commander';

    // Dominant trait archetypes
    if (a >= 5 && c >= 4) return 'Assault Commander';
    if (a >= 5 && c <= 3) return 'Reckless Attacker';
    if (d >= 5 && c >= 4) return 'Fortress Mind';
    if (d >= 5 && a <= 2) return 'Entrenched Defender';

    // Two-trait combos
    if (a >= 4 && d >= 4) return 'Versatile Fighter';
    if (c >= 4 && a >= 4) return 'Aggressive Professional';
    if (c >= 4 && d >= 4) return 'Methodical Tactician';
    if (c >= 4 && a <= 2) return 'Cautious Professional';

    // Low-skill archetypes
    if (c <= 2 && a >= 4) return 'Political Firebrand';
    if (c <= 2 && a <= 2) return 'Paper Commander';
    if (c <= 2) return 'Placeholder Officer';

    // Mid-range
    if (a >= 4) return 'Aggressive Leader';
    if (d >= 4) return 'Defensive Specialist';
    if (c >= 4) return 'Competent Officer';

    return 'Line Officer';
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
    if (filled == null) return 'Unreported';
    return '●'.repeat(filled) + '○'.repeat(max - filled) + ` ${filled}/${max}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Combat record summary
// ═══════════════════════════════════════════════════════════════════════════

export function formatCombatRecord(battles: number, victories: number): string {
    if (battles === 0) return 'No combat record';
    const winRate = Math.round((victories / battles) * 100);
    return `${victories}W/${battles - victories}L (${winRate}%)`;
}

export function formatTenure(turnsInCommand: number): string {
    if (turnsInCommand === 0) return 'Newly assigned';
    if (turnsInCommand <= 4) return `${turnsInCommand}w in command`;
    const months = Math.round(turnsInCommand / 4.33);
    return `${months}mo in command`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Political reliability display
// ═══════════════════════════════════════════════════════════════════════════

const RELIABILITY_LABELS: Record<number, string> = {
    1: 'Defiant',
    2: 'Unreliable',
    3: 'Neutral',
    4: 'Loyal',
    5: 'Steadfast',
};

export function getReliabilityLabel(value: number | null | undefined): string {
    const rating = normalizedRating(value);
    return rating == null ? 'Unreported' : RELIABILITY_LABELS[rating] ?? 'Unreported';
}

/** Formatted compliance modifier: e.g. '−0.20', '+0.10', '±0.00' */
export function getComplianceModifierText(politicalReliability: number): string {
    if (!Number.isFinite(politicalReliability)) return 'Unreported';
    const mod = (politicalReliability - 3) * 0.10;
    if (Math.abs(mod) < 0.001) return '±0.00';
    return mod > 0 ? `+${mod.toFixed(2)}` : `−${Math.abs(mod).toFixed(2)}`;
}

/**
 * Format a pre-computed effective compliance modifier as a signed string.
 * e.g., +0.20, -0.25, 0.00
 */
export function getComplianceModifierTextFromValue(modifier: number): string {
    if (!Number.isFinite(modifier)) return 'Unreported';
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
    if (!Number.isFinite(comp) || !Number.isFinite(agg)) return 'Profile unreported';
    if (comp >= 4 && agg >= 4) return 'Fast prep, accepts risk';
    if (comp >= 4 && agg <= 2) return 'Thorough prep, demands intel';
    if (comp <= 2 && agg >= 4) return 'Reckless, attacks blind';
    if (comp <= 2 && agg <= 2) return 'Hesitant, may never launch';
    if (agg >= 4) return 'Aggressive, short preparation';
    if (comp >= 4) return 'Methodical, balanced preparation';
    return 'Standard preparation cycle';
}
