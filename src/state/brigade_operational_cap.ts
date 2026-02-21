import {
    BRIGADE_OPERATIONAL_AOR_HARD_CAP,
    MAX_BRIGADE_PERSONNEL,
    MIN_BRIGADE_SPAWN,
    isLargeUrbanSettlementMun
} from './formation_constants.js';

export interface OperationalCapFormationLike {
    personnel?: number;
    readiness?: string;
    posture?: string;
    status?: string;
    kind?: string;
    tags?: string[];
}

export function getFormationHomeMunFromTags(tags?: string[]): string | undefined {
    const list = tags ?? [];
    for (const tag of list) {
        if (tag.startsWith('mun:')) {
            const mun = tag.slice(4).trim();
            if (mun) return mun;
        }
    }
    return undefined;
}

/**
 * Compute dynamic operational frontage cap for a brigade-like formation.
 * Deterministic and side-effect-free so both simulation and UI can use the same rule.
 */
export function computeBrigadeOperationalCoverageCapFromFormation(
    formation: OperationalCapFormationLike
): number {
    if ((formation.kind ?? 'brigade') !== 'brigade') return 0;
    if (formation.status != null && formation.status !== 'active') return 0;

    const personnel = Math.max(
        MIN_BRIGADE_SPAWN,
        Math.min(MAX_BRIGADE_PERSONNEL, formation.personnel ?? MIN_BRIGADE_SPAWN)
    );
    const personnelSpan = Math.max(1, MAX_BRIGADE_PERSONNEL - MIN_BRIGADE_SPAWN);
    const personnelFactor = (personnel - MIN_BRIGADE_SPAWN) / personnelSpan;
    const minBaseCap = 12;
    const baseCap = minBaseCap + personnelFactor * (BRIGADE_OPERATIONAL_AOR_HARD_CAP - minBaseCap);

    const readinessMult: Record<string, number> = {
        active: 1.0,
        overextended: 0.8,
        degraded: 0.6,
        forming: 0.5
    };
    const postureMult: Record<string, number> = {
        defend: 0.95,
        probe: 0.8,
        attack: 0.7,
        elastic_defense: 0.85
    };
    const readinessKey = formation.readiness ?? 'active';
    const postureKey = formation.posture ?? 'defend';
    const effective =
        baseCap *
        (readinessMult[readinessKey] ?? 1.0) *
        (postureMult[postureKey] ?? 1.0);

    let cap = Math.max(1, Math.min(BRIGADE_OPERATIONAL_AOR_HARD_CAP, Math.round(effective)));

    const homeMun = getFormationHomeMunFromTags(formation.tags);
    if (homeMun && isLargeUrbanSettlementMun(homeMun)) {
        if (postureKey === 'defend' || postureKey === 'elastic_defense') {
            cap = 1;
        } else {
            cap = Math.min(cap, 2);
        }
    }

    return cap;
}

