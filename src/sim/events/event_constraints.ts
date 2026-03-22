/**
 * Event constraint bus — checks event-imposed restrictions on military operations.
 * Read by bot AI before launching operations or selecting targets.
 *
 * Constraints are stored on state.military.event_constraints and written by
 * event effects (v0.6.2+). For v0.6.0-alpha, bot_corps_directives reads
 * the constraint fields directly.
 */

export interface EventConstraints {
    operation_blocks?: Array<{ faction: string; expires_turn: number; reason: string }>;
    doctrine_overrides?: Array<{ faction: string; forced_stance: string; expires_turn: number; reason: string }>;
    scope_restrictions?: Array<{
        faction: string;
        allowed_municipalities?: string[];
        blocked_municipalities?: string[];
        expires_turn?: number;
        reason: string;
    }>;
}

/** Check if a faction is blocked from launching new operations. */
export function isOperationBlocked(
    constraints: EventConstraints | undefined,
    faction: string,
    currentTurn: number
): boolean {
    if (!constraints?.operation_blocks) return false;
    return constraints.operation_blocks.some(
        b => b.faction === faction && b.expires_turn > currentTurn
    );
}

/** Get the active doctrine override for a faction, if any. */
export function getActiveDoctrineOverride(
    constraints: EventConstraints | undefined,
    faction: string,
    currentTurn: number
): string | null {
    if (!constraints?.doctrine_overrides) return null;
    const active = constraints.doctrine_overrides.find(
        d => d.faction === faction && d.expires_turn > currentTurn
    );
    return active?.forced_stance ?? null;
}

/** Filter target OSIDs by scope restrictions. */
export function filterByScope(
    constraints: EventConstraints | undefined,
    faction: string,
    targetOsids: string[],
    currentTurn?: number
): string[] {
    if (!constraints?.scope_restrictions) return targetOsids;

    const activeRestrictions = constraints.scope_restrictions.filter(
        r => r.faction === faction && (r.expires_turn == null || r.expires_turn > (currentTurn ?? 0))
    );

    if (activeRestrictions.length === 0) return targetOsids;

    let filtered = targetOsids;

    for (const restriction of activeRestrictions) {
        if (restriction.allowed_municipalities) {
            filtered = filtered.filter(osid => {
                const mun = osid.split(':')[1];
                return restriction.allowed_municipalities!.includes(mun);
            });
        }
        if (restriction.blocked_municipalities) {
            filtered = filtered.filter(osid => {
                const mun = osid.split(':')[1];
                return !restriction.blocked_municipalities!.includes(mun);
            });
        }
    }

    return filtered;
}
