import { getActiveLocale, t, type Locale } from '../i18n';

const SHORT_MONTHS_BY_LOCALE: Record<Locale, readonly string[]> = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    bcs: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
};

/**
 * Formats a raw turn number into a human-readable date string (DD MMM YYYY).
 * Baseline: 6 Apr 1992 (international recognition and war-opening turn).
 */
export function turnToDateString(turn: number): string {
    const startDate = new Date('1992-04-06T00:00:00Z');
    startDate.setDate(startDate.getDate() + turn * 7);
    const month = SHORT_MONTHS_BY_LOCALE[getActiveLocale()][startDate.getUTCMonth()];
    return `${startDate.getUTCDate()} ${month} ${startDate.getUTCFullYear()}`;
}

/**
 * Formats the interval completed by a raw turn receipt. Turn N closes the
 * seven days before the turn-N boundary date. Turn zero has no preceding
 * simulated interval, so it safely retains the campaign opening date.
 */
export function turnToCompletedWeekRange(turn: number): string {
    if (!Number.isFinite(turn) || turn <= 0) return turnToDateString(0);

    const start = new Date('1992-04-06T00:00:00Z');
    start.setUTCDate(start.getUTCDate() + (turn - 1) * 7);
    const end = new Date('1992-04-06T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + turn * 7 - 1);
    const months = SHORT_MONTHS_BY_LOCALE[getActiveLocale()];
    const startMonth = months[start.getUTCMonth()];
    const endMonth = months[end.getUTCMonth()];

    if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
        return `${start.getUTCDate()}-${end.getUTCDate()} ${endMonth} ${end.getUTCFullYear()}`;
    }
    if (start.getUTCFullYear() === end.getUTCFullYear()) {
        return `${start.getUTCDate()} ${startMonth}-${end.getUTCDate()} ${endMonth} ${end.getUTCFullYear()}`;
    }
    return `${start.getUTCDate()} ${startMonth} ${start.getUTCFullYear()}-${end.getUTCDate()} ${endMonth} ${end.getUTCFullYear()}`;
}

export function formatCampaignWeekLabel(turn: number | null | undefined): string {
    const safeTurn = Number.isFinite(turn) ? Number(turn) : 0;
    if (safeTurn <= 0) return t('campaign.openingWeekLabel');
    return t('campaign.weekLabel', { turn: safeTurn });
}

/**
 * Humanizes a turn label (e.g., "Turn 32") by replacing the raw counter with the calendar date.
 * A save or state without a label yields an empty string rather than a crash in the toolbar.
 */
export function formatTurnLabel(label: string | null | undefined): string {
    if (typeof label !== 'string' || label.length === 0) return '';
    const match = label.match(/Turn\s+(\d+)/i);
    if (!match) return label;
    const turn = parseInt(match[1], 10);
    const dateStr = turnToDateString(turn);
    return label.replace(match[0], dateStr);
}

/**
 * Converts snake_case_strings to Title Case Strings.
 */
export function toTitleCase(s: string | undefined): string {
    if (!s) return '';
    return s
        .replace(/\s+/g, '_')
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function normalizeCompactCorpsSlug(value: string): string {
    if (value.includes('_')) return value;
    return value.replace(/([a-z])corps$/i, '$1_corps');
}

/**
 * Humanizes an operation type identifier.
 */
export function formatOperationType(type: string | undefined): string {
    if (!type) return 'Unknown Operation';
    return toTitleCase(type);
}

/**
 * Humanizes a posture identifier.
 */
export function formatPosture(posture: string | undefined): string {
    return toTitleCase(posture);
}

/**
 * Humanizes a combat outcome identifier with descriptive phrasing.
 */
export function formatCombatOutcome(outcome: string | undefined): string {
    if (!outcome) return '';
    switch (outcome) {
        case 'skirmish_won': return 'Achieved victory in a skirmish';
        case 'skirmish_lost': return 'Defeated in a skirmish';
        case 'repulsed_assault': return 'Repulsed enemy assault';
        case 'assault_failed': return 'Assault failed';
        case 'breakthrough': return 'Achieved breakthrough';
        case 'routed': return 'Routed from position';
        case 'stalemate': return 'Stalemate';
        default: return toTitleCase(outcome);
    }
}

/**
 * Formats a turn number into ISO date string (YYYY-MM-DD).
 * Baseline: 6 Apr 1992 (international recognition and war-opening turn).
 */
export function turnToISODate(turn: number): string {
    const d = new Date(Date.UTC(1992, 3, 6));
    d.setUTCDate(d.getUTCDate() + turn * 7);
    return d.toISOString().split('T')[0];
}

/**
 * Format a corps formation's display name.
 * Strips faction prefix and converts to title case if name === id.
 */
export function formatCorpsDisplayName(
    name: string | null | undefined,
    id: string | null | undefined,
    fallback = 'This corps',
): string {
    const safeName = (name ?? '').trim();
    const safeId = (id ?? '').trim();

    if (safeName && safeName !== safeId) return safeName;

    if (safeName && safeName === safeId) {
        const stripped = safeName
            .replace(/^(RS|RBiH|HRHB|VRS|ARBIH|HVO|rs|rbih|hrhb|vrs|arbih|hvo)_/i, '')
            .trim();
        if (stripped && stripped !== safeName) return toTitleCase(normalizeCompactCorpsSlug(stripped));
    }

    return fallback;
}

/** Exact reported count, rounded to a whole person/item in the active UI locale. */
export function formatCount(value: number | null | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return t('corpsFront.unreported');
    return Math.round(value).toLocaleString(getActiveLocale() === 'bcs' ? 'bs-BA' : 'en-US');
}

function compactNumber(value: number | null | undefined, personnel: boolean): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return t('corpsFront.unreported');
    const magnitude = Math.abs(value);
    const scale = magnitude >= 1_000_000 ? 1_000_000 : magnitude >= 1_000 ? 1_000 : 1;
    const decimals = scale === 1_000_000 || (personnel && scale === 1_000) ? 1 : 0;
    // Select scale before rounding (999,999 remains thousands); round signed deltas symmetrically.
    const rounded = Number((magnitude / scale).toFixed(decimals));
    const number = rounded.toLocaleString(getActiveLocale() === 'bcs' ? 'bs-BA' : 'en-US', {
        useGrouping: false,
        minimumFractionDigits: personnel && scale > 1 ? 1 : 0,
        maximumFractionDigits: decimals,
    });
    return `${value < 0 && rounded !== 0 ? '-' : ''}${number}${scale === 1_000_000 ? 'M' : scale === 1_000 ? 'k' : ''}`;
}

/** Personnel summaries retain one decimal for thousands and millions, including signed deltas. */
export function formatPersonnel(n: number | null | undefined): string {
    return compactNumber(n, true);
}

/** Summary counts round thousands to integers and millions to one decimal; scale precedes rounding. */
export function fmtK(n: number | null | undefined): string {
    return compactNumber(n, false);
}

/** Format percentage with one decimal. */
export function fmtPct(n: number): string {
    return `${n.toFixed(1)}%`;
}

/** Strip op: prefix and underscores for display. */
export function formatOsidLabel(osid: string): string {
    return osid.replace(/^op:/, '').replace(/_/g, ' ');
}
