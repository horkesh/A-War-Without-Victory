import { getActiveLocale, t, type Locale, type MessageKey } from '../i18n';
import { enMessages } from '../i18n/messages.en';

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
 */
export function formatTurnLabel(label: string): string {
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
 * BCS display names for the corps-level commands in `data/source/oob_corps.json`
 * (S9, sensitive-copy lane 2026-11-13; historical forms ruled on by the Pyrrhic
 * panel). The English value of each key equals the data `name`, which stays the
 * English display and the saved value: the data and the save format are
 * untouched, and only the BCS render changes. Nominative forms only.
 */
const CORPS_NAME_KEYS: Readonly<Record<string, MessageKey>> = {
    arbih_general_staff: 'corps.name.arbih_general_staff',
    arbih_1st_corps: 'corps.name.arbih_1st_corps',
    arbih_2nd_corps: 'corps.name.arbih_2nd_corps',
    arbih_3rd_corps: 'corps.name.arbih_3rd_corps',
    arbih_4th_corps: 'corps.name.arbih_4th_corps',
    arbih_5th_corps: 'corps.name.arbih_5th_corps',
    vrs_main_staff: 'corps.name.vrs_main_staff',
    jna_herzegovina_command: 'corps.name.jna_herzegovina_command',
    vrs_1st_krajina: 'corps.name.vrs_1st_krajina',
    vrs_2nd_krajina: 'corps.name.vrs_2nd_krajina',
    vrs_drina: 'corps.name.vrs_drina',
    vrs_east_bosnian: 'corps.name.vrs_east_bosnian',
    vrs_herzegovina: 'corps.name.vrs_herzegovina',
    vrs_sarajevo_romanija: 'corps.name.vrs_sarajevo_romanija',
    hvo_main_staff: 'corps.name.hvo_main_staff',
    hvo_southeast_herzegovina: 'corps.name.hvo_southeast_herzegovina',
    hvo_central_bosnia: 'corps.name.hvo_central_bosnia',
    hvo_northwest_bosnia: 'corps.name.hvo_northwest_bosnia',
    hvo_tomislavgrad: 'corps.name.hvo_tomislavgrad',
};

let corpsIdByEnglishName: Map<string, string> | null = null;

/** Corps id for a known corps, from its id or (when only the name is at hand) its English data name. */
function knownCorpsId(name: string, id: string): string | null {
    if (id && CORPS_NAME_KEYS[id]) return id;
    if (name && CORPS_NAME_KEYS[name]) return name;
    if (!name) return null;
    corpsIdByEnglishName ??= new Map(
        Object.entries(CORPS_NAME_KEYS).map(([corpsId, key]) => [enMessages[key], corpsId] as const),
    );
    return corpsIdByEnglishName.get(name) ?? null;
}

/** BCS name for a known corps-level command, or null (English, or not a known corps). */
export function localizedCorpsName(name: string | null | undefined, id: string | null | undefined): string | null {
    if (getActiveLocale() !== 'bcs') return null;
    const corpsId = knownCorpsId((name ?? '').trim(), (id ?? '').trim());
    return corpsId ? t(CORPS_NAME_KEYS[corpsId]) : null;
}

/**
 * Format a corps formation's display name.
 * Strips faction prefix and converts to title case if name === id.
 * In BCS, a known corps-level command shows its historical BCS name.
 */
export function formatCorpsDisplayName(
    name: string | null | undefined,
    id: string | null | undefined,
    fallback = 'This corps',
): string {
    const localized = localizedCorpsName(name, id);
    if (localized) return localized;

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
