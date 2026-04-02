import { formatCorpsDisplayName } from './formatters';

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
    return (displayName ?? '').trim() || fallback;
}

export function getPlayerSafeBrigadeName(
    name: string | null | undefined,
    fallback = 'Assigned brigade',
): string {
    return (name ?? '').trim() || fallback;
}
