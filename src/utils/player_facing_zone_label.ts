/**
 * Player-facing formatter for commander ZoneId strings.
 *
 * Canonical zone ids follow `zone:<corps_id>:<anchor_osid>`.
 * The player should see the anchor location, not the internal routing id.
 */
export function formatPlayerFacingZoneLabel(zoneId: string): string {
    const trimmed = zoneId.trim();
    if (!trimmed) return '';

    const parts = trimmed.split(':');
    const anchor = parts[0] === 'zone' && parts.length >= 3
        ? parts.slice(2).join(':')
        : trimmed;

    return anchor
        .split(/[_:]+/)
        .filter(Boolean)
        .map((segment) => {
            if (/^\d+$/.test(segment)) return segment;
            return segment.charAt(0).toUpperCase() + segment.slice(1);
        })
        .join(' ');
}
