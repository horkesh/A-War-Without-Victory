const CANONICAL_PLAYER_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

export type CanonicalPlayerFaction = typeof CANONICAL_PLAYER_FACTIONS[number];

export function isCanonicalPlayerFaction(value: unknown): value is CanonicalPlayerFaction {
    return typeof value === 'string' && CANONICAL_PLAYER_FACTIONS.includes(value as CanonicalPlayerFaction);
}

export function playerFactionMatch(
    itemFaction: string | null | undefined,
    playerFaction: string | null | undefined,
): boolean {
    return isCanonicalPlayerFaction(playerFaction) && itemFaction === playerFaction;
}

export function requirePlayerFaction(playerFaction: string | null | undefined, context: string): CanonicalPlayerFaction {
    if (isCanonicalPlayerFaction(playerFaction)) return playerFaction;
    throw new Error(`${context} requires meta.player_faction to be one of: RBiH, RS, HRHB`);
}
