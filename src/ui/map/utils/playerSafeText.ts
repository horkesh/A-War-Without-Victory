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
