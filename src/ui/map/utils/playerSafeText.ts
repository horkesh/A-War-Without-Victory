import { formatCorpsDisplayName, toTitleCase } from './formatters';

const MILITARY_FACTION_LABELS: Record<string, string> = {
    RS: 'VRS',
    RBiH: 'ARBiH',
    HRHB: 'HVO',
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

export function getPlayerSafeOfficerName(
    name: string | null | undefined,
    fallback = 'An officer',
): string {
    return (name ?? '').trim() || fallback;
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
