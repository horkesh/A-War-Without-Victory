/**
 * Scenario preseeding: derives initial negotiation capital, patron override
 * authority, and patron support from historical baselines via linear interpolation.
 *
 * Used when a scenario starts at a non-zero week (e.g. a late-start scenario)
 * so that negotiation state reflects the historical trajectory up to that point.
 *
 * Deterministic: all computations formula-based, no randomness.
 */

import type { GameState, FactionId } from '../state/game_state.js';
import type { NegotiationCapital } from '../state/negotiation_types.js';
import {
    createEmptyCapital,
    createDefaultPatronRelationship,
    FACTION_PATRONS,
} from '../state/negotiation_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface CapitalAnchor {
    week: number;
    mil_pos: number;
    hum_stand: number;
    intl_cred: number;
    mil_eff: number;
    pol_coh: number;
}

interface BaselinePoint {
    week: number;
    value: number;
}

interface PatronAnchor {
    week: number;
    RS: number;
    RBiH: number;
    HRHB: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Historical Baseline Data
// ═══════════════════════════════════════════════════════════════════════════

const RS_CAPITAL_ANCHORS: readonly CapitalAnchor[] = [
    { week: 0,   mil_pos: 35, hum_stand: 40, intl_cred: 40, mil_eff: 70, pol_coh: 70 },
    { week: 26,  mil_pos: 67, hum_stand: 25, intl_cred: 30, mil_eff: 75, pol_coh: 65 },
    { week: 52,  mil_pos: 70, hum_stand: 15, intl_cred: 25, mil_eff: 65, pol_coh: 60 },
    { week: 104, mil_pos: 70, hum_stand: 10, intl_cred: 20, mil_eff: 55, pol_coh: 50 },
    { week: 170, mil_pos: 70, hum_stand: 5,  intl_cred: 10, mil_eff: 45, pol_coh: 35 },
    { week: 188, mil_pos: 49, hum_stand: 5,  intl_cred: 10, mil_eff: 30, pol_coh: 25 },
];

const RBIH_CAPITAL_ANCHORS: readonly CapitalAnchor[] = [
    { week: 0,   mil_pos: 50, hum_stand: 50, intl_cred: 50, mil_eff: 30, pol_coh: 50 },
    { week: 26,  mil_pos: 18, hum_stand: 60, intl_cred: 60, mil_eff: 35, pol_coh: 45 },
    { week: 52,  mil_pos: 12, hum_stand: 65, intl_cred: 65, mil_eff: 45, pol_coh: 50 },
    { week: 104, mil_pos: 12, hum_stand: 60, intl_cred: 55, mil_eff: 55, pol_coh: 45 },
    { week: 156, mil_pos: 15, hum_stand: 70, intl_cred: 65, mil_eff: 65, pol_coh: 55 },
    { week: 188, mil_pos: 30, hum_stand: 75, intl_cred: 70, mil_eff: 70, pol_coh: 55 },
];

const HRHB_CAPITAL_ANCHORS: readonly CapitalAnchor[] = [
    { week: 0,   mil_pos: 15, hum_stand: 50, intl_cred: 55, mil_eff: 50, pol_coh: 60 },
    { week: 52,  mil_pos: 18, hum_stand: 40, intl_cred: 45, mil_eff: 50, pol_coh: 50 },
    { week: 78,  mil_pos: 18, hum_stand: 30, intl_cred: 35, mil_eff: 45, pol_coh: 40 },
    { week: 104, mil_pos: 15, hum_stand: 25, intl_cred: 30, mil_eff: 40, pol_coh: 35 },
    { week: 130, mil_pos: 2,  hum_stand: 35, intl_cred: 50, mil_eff: 45, pol_coh: 55 },
    { week: 188, mil_pos: 2,  hum_stand: 40, intl_cred: 55, mil_eff: 45, pol_coh: 60 },
];

const CAPITAL_ANCHORS_BY_FACTION: Record<string, readonly CapitalAnchor[]> = {
    RS: RS_CAPITAL_ANCHORS,
    RBiH: RBIH_CAPITAL_ANCHORS,
    HRHB: HRHB_CAPITAL_ANCHORS,
};

const PATRON_OVERRIDE_ANCHORS: readonly PatronAnchor[] = [
    { week: 0,   RS: 12, RBiH: 7,  HRHB: 25 },
    { week: 40,  RS: 18, RBiH: 18, HRHB: 35 },
    { week: 52,  RS: 22, RBiH: 22, HRHB: 40 },
    { week: 78,  RS: 25, RBiH: 25, HRHB: 45 },
    { week: 104, RS: 45, RBiH: 28, HRHB: 65 },
    { week: 130, RS: 55, RBiH: 35, HRHB: 75 },
    { week: 156, RS: 65, RBiH: 45, HRHB: 80 },
    { week: 170, RS: 82, RBiH: 55, HRHB: 85 },
    { week: 188, RS: 92, RBiH: 65, HRHB: 87 },
];

const PATRON_SUPPORT_ANCHORS: readonly PatronAnchor[] = [
    { week: 0,   RS: 80, RBiH: 40, HRHB: 70 },
    { week: 52,  RS: 75, RBiH: 50, HRHB: 65 },
    { week: 104, RS: 50, RBiH: 55, HRHB: 45 },
    { week: 130, RS: 35, RBiH: 55, HRHB: 70 },
    { week: 156, RS: 25, RBiH: 60, HRHB: 75 },
    { week: 188, RS: 15, RBiH: 65, HRHB: 80 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Interpolation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Linear interpolation between baseline anchor points.
 * Clamps to the first/last value when targetWeek is outside the anchor range.
 */
export function interpolateBaseline(
    baselines: ReadonlyArray<BaselinePoint>,
    targetWeek: number,
): number {
    if (baselines.length === 0) return 0;
    if (baselines.length === 1) return baselines[0].value;

    // Clamp below first anchor
    if (targetWeek <= baselines[0].week) return baselines[0].value;
    // Clamp above last anchor
    if (targetWeek >= baselines[baselines.length - 1].week) return baselines[baselines.length - 1].value;

    // Find the two surrounding anchors
    for (let i = 0; i < baselines.length - 1; i++) {
        const lo = baselines[i];
        const hi = baselines[i + 1];
        if (targetWeek >= lo.week && targetWeek <= hi.week) {
            const t = (targetWeek - lo.week) / (hi.week - lo.week);
            return lo.value + t * (hi.value - lo.value);
        }
    }

    // Shouldn't reach here, but return last value as fallback
    return baselines[baselines.length - 1].value;
}

// ═══════════════════════════════════════════════════════════════════════════
// Capital Preseeding
// ═══════════════════════════════════════════════════════════════════════════

/** Extract a single dimension from capital anchors as BaselinePoint[]. */
function extractDimension(
    anchors: readonly CapitalAnchor[],
    dim: keyof Omit<CapitalAnchor, 'week'>,
): BaselinePoint[] {
    return anchors.map(a => ({ week: a.week, value: a[dim] }));
}

/**
 * Preseed negotiation capital for a faction at a given scenario start week.
 * Returns the 5 capital dimensions interpolated from historical baselines.
 */
export function preseedNegotiationCapital(
    factionId: FactionId,
    scenarioStartWeek: number,
): Pick<NegotiationCapital,
    'military_position' | 'humanitarian_standing' | 'international_credibility' |
    'military_effectiveness' | 'political_cohesion'
> {
    const anchors = CAPITAL_ANCHORS_BY_FACTION[factionId];
    if (!anchors) {
        throw new Error(`No capital anchors for faction: ${factionId}`);
    }

    return {
        military_position: interpolateBaseline(extractDimension(anchors, 'mil_pos'), scenarioStartWeek),
        humanitarian_standing: interpolateBaseline(extractDimension(anchors, 'hum_stand'), scenarioStartWeek),
        international_credibility: interpolateBaseline(extractDimension(anchors, 'intl_cred'), scenarioStartWeek),
        military_effectiveness: interpolateBaseline(extractDimension(anchors, 'mil_eff'), scenarioStartWeek),
        political_cohesion: interpolateBaseline(extractDimension(anchors, 'pol_coh'), scenarioStartWeek),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Patron Relationship Preseeding
// ═══════════════════════════════════════════════════════════════════════════

/** Extract a faction's column from patron anchors as BaselinePoint[]. */
function extractPatronColumn(
    anchors: readonly PatronAnchor[],
    factionId: FactionId,
): BaselinePoint[] {
    return anchors.map(a => ({
        week: a.week,
        value: a[factionId as keyof Omit<PatronAnchor, 'week'>] as number,
    }));
}

/**
 * Preseed patron relationship values for a faction at a given scenario start week.
 * Returns override_authority and support_level interpolated from historical baselines.
 */
export function preseedPatronRelationship(
    factionId: FactionId,
    scenarioStartWeek: number,
): { override_authority: number; support_level: number } {
    const overrideBaselines = extractPatronColumn(PATRON_OVERRIDE_ANCHORS, factionId);
    const supportBaselines = extractPatronColumn(PATRON_SUPPORT_ANCHORS, factionId);

    return {
        override_authority: interpolateBaseline(overrideBaselines, scenarioStartWeek),
        support_level: interpolateBaseline(supportBaselines, scenarioStartWeek),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestrator
// ═══════════════════════════════════════════════════════════════════════════

const ALL_FACTIONS: FactionId[] = ['RS', 'RBiH', 'HRHB'];

/**
 * Preseed the full negotiation state on a GameState for all 3 factions.
 * Initializes negotiation state if not present. Only modifies fields
 * that have baseline data (the 5 capital dimensions + patron override/support).
 */
export function preseedScenarioState(
    state: GameState,
    scenarioStartWeek: number,
): void {
    // Initialize negotiation state if not present
    if (!state.military.negotiation) {
        state.military.negotiation = {
            capital: {},
            patron_relationships: {},
            peace_plan_history: [],
        };
    }

    const neg = state.military.negotiation;

    for (const factionId of ALL_FACTIONS) {
        // Capital: create empty if missing, then overwrite the 5 baseline dimensions
        if (!neg.capital[factionId]) {
            neg.capital[factionId] = createEmptyCapital();
        }
        const seeded = preseedNegotiationCapital(factionId, scenarioStartWeek);
        neg.capital[factionId].military_position = seeded.military_position;
        neg.capital[factionId].humanitarian_standing = seeded.humanitarian_standing;
        neg.capital[factionId].international_credibility = seeded.international_credibility;
        neg.capital[factionId].military_effectiveness = seeded.military_effectiveness;
        neg.capital[factionId].political_cohesion = seeded.political_cohesion;

        // Patron relationships: create default if missing, then overwrite baseline fields
        if (!neg.patron_relationships[factionId]) {
            neg.patron_relationships[factionId] = createDefaultPatronRelationship(factionId);
        }
        const patron = preseedPatronRelationship(factionId, scenarioStartWeek);
        neg.patron_relationships[factionId].override_authority = patron.override_authority;
        neg.patron_relationships[factionId].support_level = patron.support_level;
    }
}
