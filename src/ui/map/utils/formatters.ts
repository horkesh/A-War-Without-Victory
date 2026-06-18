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

export function formatCampaignWeekLabel(turn: number | null | undefined): string {
    const safeTurn = Number.isFinite(turn) ? Number(turn) : 0;
    if (safeTurn <= 0) return t('campaign.openingWeekLabel');
    return t('campaign.weekLabel', { turn: safeTurn });
}

/**
 * Humanizes a turn label (e.g., "T32" or "Turn 32") by prepending the calendar date.
 */
export function formatTurnLabel(label: string): string {
    const match = label.match(/Turn\s+(\d+)/i);
    if (!match) return label;
    const turn = parseInt(match[1], 10);
    const dateStr = turnToDateString(turn);
    return label.replace(match[0], `${dateStr} \u00B7 ${formatCampaignWeekLabel(turn)}`);
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

/** Compact personnel display: 2400 → "2.4k", 800 → "800". */
export function formatPersonnel(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** Compact number: 2400 → "2k", 800 → "800". Integer rounding (for summaries). */
export function fmtK(n: number): string {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
}

/** Format percentage with one decimal. */
export function fmtPct(n: number): string {
    return `${n.toFixed(1)}%`;
}

/** Strip op: prefix and underscores for display. */
export function formatOsidLabel(osid: string): string {
    return osid.replace(/^op:/, '').replace(/_/g, ' ');
}
