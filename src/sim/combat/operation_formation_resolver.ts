import type { FormationId, FormationState } from '../../state/game_state.js';

export type OperationFormationResolution =
    | 'exact'
    | 'oob_alias'
    | 'missing'
    | 'ambiguous_oob_alias';

export interface ResolvedOperationFormation {
    authored_formation_id: FormationId;
    formation_id: FormationId | null;
    formation: FormationState | null;
    resolution: OperationFormationResolution;
    alias_matches: FormationId[];
}

function compareFormationId(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Resolve a catalog-authored formation reference against the live registry.
 *
 * Recruitment may preserve an OOB identity in `oob:<authored id>` while using
 * a synthetic live dictionary key. Exact keys always win. A unique OOB alias
 * is safe to use; multiple aliases are rejected instead of selecting one by
 * iteration order.
 */
export function resolveOperationFormation(
    formations: Record<string, FormationState>,
    authoredFormationId: FormationId,
): ResolvedOperationFormation {
    const exact = formations[authoredFormationId];
    if (exact) {
        return {
            authored_formation_id: authoredFormationId,
            formation_id: authoredFormationId,
            formation: exact,
            resolution: 'exact',
            alias_matches: [],
        };
    }

    const aliasMatches = Object.keys(formations)
        .filter((formationId) => formations[formationId]?.tags?.includes(`oob:${authoredFormationId}`))
        .sort(compareFormationId) as FormationId[];
    if (aliasMatches.length === 1) {
        const formationId = aliasMatches[0]!;
        return {
            authored_formation_id: authoredFormationId,
            formation_id: formationId,
            formation: formations[formationId]!,
            resolution: 'oob_alias',
            alias_matches: aliasMatches,
        };
    }

    return {
        authored_formation_id: authoredFormationId,
        formation_id: null,
        formation: null,
        resolution: aliasMatches.length > 1 ? 'ambiguous_oob_alias' : 'missing',
        alias_matches: aliasMatches,
    };
}
