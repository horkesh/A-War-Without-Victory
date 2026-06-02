import { normalizeFactionId } from '../../../state/identity.js';
import { formatCorpsDisplayName, toTitleCase } from './formatters';

const MILITARY_FACTION_LABELS: Record<string, string> = {
    RS: 'VRS',
    RBiH: 'ARBiH',
    HRHB: 'HVO',
};

const POLITICAL_FACTION_LABELS: Record<string, string> = {
    RS: 'Republika Srpska',
    RBiH: 'Republic of Bosnia and Herzegovina',
    HRHB: 'Croatian Republic of Herzeg-Bosnia',
};

function humanizeIdentifierLabel(value: string | null | undefined): string {
    const safeValue = (value ?? '').trim();
    if (!safeValue) return '';

    const normalized = safeValue.startsWith('op:')
        ? safeValue.split(':').filter(Boolean).pop() ?? safeValue
        : safeValue;

    if (!/[_:-]/.test(normalized)) return normalized;
    return toTitleCase(normalized.replace(/[:\-]/g, '_'));
}

export function getPlayerSafeDisplayLabel(
    value: string | null | undefined,
    fallback = 'Untitled item',
): string {
    const safeValue = (value ?? '').trim();
    if (!safeValue) return fallback;
    return humanizeIdentifierLabel(safeValue) || fallback;
}

export function getPlayerSafeOfficerName(
    name: string | null | undefined,
    fallback = 'An officer',
): string {
    return (name ?? '').trim() || fallback;
}

export function getPlayerSafePoliticalFactionName(
    factionId: string | null | undefined,
    fallback = 'Unknown faction',
): string {
    if (!factionId) return fallback;
    const label = POLITICAL_FACTION_LABELS[normalizeFactionId(factionId)];
    return label || fallback;
}

export function getPlayerSafeMilitaryFactionName(
    factionId: string | null | undefined,
    fallback = 'Unknown force',
): string {
    if (!factionId) return fallback;
    const label = MILITARY_FACTION_LABELS[normalizeFactionId(factionId)];
    return label || fallback;
}

export function getPlayerSafeCorpsName(
    name: string | null | undefined,
    id: string | null | undefined,
    fallback = 'This corps',
): string {
    return formatCorpsDisplayName(name, id, fallback);
}

export function getPlayerSafeDecisionTitle(eventTitle: string | null | undefined): string {
    return (eventTitle ?? '').trim() || 'Pending decision';
}

// Faction prefixes that begin a corps id (engine + display aliases).
const CORPS_FACTION_PREFIXES = ['arbih', 'rbih', 'vrs', 'rs', 'hrhb', 'hvo'];

/**
 * Split a slug remainder into corps-id runs (each begins with a faction
 * prefix) and any leftover non-corps tokens, then resolve each corps run to a
 * player-safe label (e.g. `arbih_1st_corps` → `1st Corps`, `vrs_drina` →
 * `Drina`). De-duplicates identical corps. Returns the resolved corps labels
 * (in order) plus the leftover tokens.
 */
function extractCorpsRuns(tokens: string[]): { corps: string[]; leftover: string[] } {
    const corps: string[] = [];
    const leftover: string[] = [];
    let i = 0;
    while (i < tokens.length) {
        if (CORPS_FACTION_PREFIXES.includes(tokens[i].toLowerCase())) {
            // Consume this faction prefix plus following tokens up to (but not
            // including) the next faction prefix.
            let j = i + 1;
            while (j < tokens.length && !CORPS_FACTION_PREFIXES.includes(tokens[j].toLowerCase())) {
                j++;
            }
            const run = tokens.slice(i, j).join('_');
            // name===id so getPlayerSafeCorpsName's prefix-strip path fires.
            const resolved = getPlayerSafeCorpsName(run, run, '');
            const label = resolved || toTitleCase(run);
            if (!corps.includes(label)) corps.push(label);
            i = j;
        } else {
            leftover.push(tokens[i]);
            i++;
        }
    }
    return { corps, leftover };
}

/**
 * Convert an engine operation name into a player-safe display string.
 *
 * Authored catalog names ("Operation Sana", "Operation Mistral 2",
 * "Emergency Defense") pass through. Slug/id names produced by the engine
 * (`probe_arbih_1st_corps_t12`, `cmd_<corps>_t<turn>`, `sync_<corps>_<corps>`,
 * `Emergency Defense (arbih_1st_corps)`, `HQ: …`) are humanized: any embedded
 * corps id is resolved via getPlayerSafeCorpsName, `_t<turn>` / trailing turn
 * suffixes are dropped, and `<corps>_<corps>` duplication is collapsed.
 *
 * `opOrCorpsId` is accepted for call-site convenience (the op's corps_id); the
 * embedded corps is resolved directly from the name, so it is advisory only.
 *
 * Conservative: if the name already looks human (a space + capital, no `_`),
 * it is returned unchanged.
 */
export function getPlayerSafeOperationName(
    name: string | null | undefined,
    opOrCorpsId?: string | null,
    fallback = 'Active operation',
): string {
    const safeName = (name ?? '').trim();
    if (!safeName) return fallback;

    // Already human-looking: has a space + an uppercase letter, no underscore.
    if (!safeName.includes('_') && /\s/.test(safeName) && /[A-Z]/.test(safeName)) {
        return safeName;
    }

    // "Emergency Defense (arbih_1st_corps)" and similar "<Label> (<corps>)".
    const parenMatch = safeName.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (parenMatch) {
        const label = parenMatch[1].trim();
        const inner = parenMatch[2].trim();
        const { corps, leftover } = extractCorpsRuns(inner.split('_').filter(Boolean));
        if (corps.length > 0 && leftover.length === 0) {
            return `${label} — ${corps.join(' & ')}`;
        }
        // Non-corps parenthetical (e.g. faction) — humanize the inner token.
        const innerHuman = humanizeIdentifierLabel(inner);
        return innerHuman ? `${label} — ${innerHuman}` : label;
    }

    // "HQ: <authored>" / "Probe: <authored>" — keep prefix, trust the rest.
    const prefixMatch = safeName.match(/^([A-Za-z]+):\s*(.+)$/);
    if (prefixMatch) {
        const prefix = prefixMatch[1].trim();
        const rest = getPlayerSafeOperationName(prefixMatch[2], opOrCorpsId, prefixMatch[2].trim());
        return `${prefix}: ${rest}`;
    }

    // Pure slug forms: probe_<corps>_t12, cmd_<corps>_t12, sync_<a>_<b>, etc.
    if (safeName.includes('_')) {
        // Drop trailing turn suffix: _t12 / _t<turn> / trailing _<digits>.
        const working = safeName.replace(/_t\d+$/i, '').replace(/_\d+$/, '');

        // Leading verb token (probe / cmd / sync / hq …).
        const tokens = working.split('_').filter(Boolean);
        const VERB_LABELS: Record<string, string> = {
            probe: 'Probe',
            cmd: 'Command',
            sync: 'Coordinated operation',
            hq: 'HQ',
            og: 'Operational group',
        };
        let verbLabel: string | null = null;
        if (tokens.length > 0 && VERB_LABELS[tokens[0].toLowerCase()] !== undefined) {
            verbLabel = VERB_LABELS[tokens[0].toLowerCase()];
            tokens.shift();
        }

        const { corps, leftover } = extractCorpsRuns(tokens);

        const parts: string[] = [];
        if (verbLabel) parts.push(verbLabel);
        if (leftover.length > 0) {
            const remLabel = toTitleCase(leftover.join('_'));
            if (remLabel) parts.push(remLabel);
        }

        const head = parts.join(' ').trim();
        if (corps.length > 0) {
            const corpsJoined = corps.join(' & ');
            return head ? `${head} — ${corpsJoined}` : corpsJoined;
        }
        if (head) return head;

        // Fallback: humanize the whole working slug.
        const humanized = humanizeIdentifierLabel(working);
        return humanized || fallback;
    }

    return safeName;
}

export function getPlayerSafeEnclaveName(
    displayName: string | null | undefined,
    fallback = 'Friendly enclave',
): string {
    const safeName = (displayName ?? '').trim();
    if (!safeName) return fallback;

    const humanized = humanizeIdentifierLabel(safeName);
    return humanized || fallback;
}

export function getPlayerSafeBrigadeName(
    name: string | null | undefined,
    fallback = 'Assigned brigade',
): string {
    return (name ?? '').trim() || fallback;
}

export function getPlayerSafeSettlementName(
    settlementId: string | null | undefined,
    fallback = 'Selected settlement',
): string {
    const humanized = humanizeIdentifierLabel(settlementId);
    return humanized || fallback;
}

export function getPlayerSafeMunicipalityName(
    municipalityId: string | null | undefined,
    fallback = 'Target municipality',
): string {
    const humanized = humanizeIdentifierLabel(municipalityId);
    return humanized || fallback;
}

export function getPlayerSafeCorridorLabel(
    routeFaction: string | null | undefined,
    fallback = 'controlled corridor',
): string {
    const safeFaction = (routeFaction ?? '').trim();
    if (!safeFaction) return fallback;

    const label = MILITARY_FACTION_LABELS[safeFaction];
    return label ? `${label}-controlled corridor` : fallback;
}
