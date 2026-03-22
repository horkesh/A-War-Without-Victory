/**
 * Verdict & Scoring Engine — Phase 5 of the Endgame System.
 *
 * Computes per-faction Pyrrhic Scores (0-100), letter grades (A+ through F),
 * and full game verdicts from negotiation capital + game state.
 *
 * Deterministic: no Math.random(), sorted iteration via strictCompare.
 *
 * "The least bad version of a tragedy."
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { NegotiationCapital, DaytonResult } from '../../state/negotiation_types.js';
import { CAPITAL_WEIGHTS } from '../../state/negotiation_types.js';
import type { FactionVerdict, GameVerdict, DimensionGrade } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

const CAPITAL_DIMENSIONS = [
    'military_position',
    'humanitarian_standing',
    'international_credibility',
    'military_effectiveness',
    'political_cohesion',
] as const;

type CapitalDimension = typeof CAPITAL_DIMENSIONS[number];

// ═══════════════════════════════════════════════════════════════════════════
// Dimension Grading — per-dimension letter grades based on raw 0-100 score
// ═══════════════════════════════════════════════════════════════════════════

const DIMENSION_GRADE_THRESHOLDS: Array<{ min: number; grade: string }> = [
    { min: 90, grade: 'A+' },
    { min: 75, grade: 'A' },
    { min: 60, grade: 'B' },
    { min: 40, grade: 'C' },
    { min: 20, grade: 'D' },
    { min: 0,  grade: 'F' },
];

function gradeDimension(score: number): string {
    for (const t of DIMENSION_GRADE_THRESHOLDS) {
        if (score >= t.min) return t.grade;
    }
    return 'F';
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction Grade Anchors — historical outcome-based grading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Grade anchor: describes the conditions for each letter grade per faction.
 * Evaluated in order — first match wins.
 */
interface GradeAnchor {
    grade: string;
    description: string;
    test: (cap: NegotiationCapital, state: GameState) => boolean;
}

const RBIH_GRADE_ANCHORS: GradeAnchor[] = [
    {
        grade: 'A+',
        description: 'Defended most territory, minimal civilian losses, enclaves held, strong international position',
        test: (cap) =>
            cap.territory_controlled_pct > 33 &&
            cap.enclaves_lost.length === 0 &&
            cap.humanitarian_standing >= 50,
    },
    {
        grade: 'A',
        description: 'Roughly historical outcome — 30-33% territory, Sarajevo held, enclaves mostly defended',
        test: (cap) =>
            cap.territory_controlled_pct >= 30 &&
            cap.enclaves_lost.length <= 1 &&
            !cap.enclaves_lost.includes('sarajevo'),
    },
    {
        grade: 'B',
        description: 'Lost some key positions but maintained core territory, moderate civilian losses',
        test: (cap) =>
            cap.territory_controlled_pct >= 25 &&
            !cap.enclaves_lost.includes('sarajevo'),
    },
    {
        grade: 'C',
        description: 'Lost significant territory, high civilian casualties, enclaves fallen early',
        test: (cap) =>
            cap.territory_controlled_pct >= 18 &&
            cap.enclaves_lost.length <= 3,
    },
    {
        grade: 'D',
        description: 'Catastrophic losses, most cities fallen, massive displacement',
        test: (cap) => cap.territory_controlled_pct >= 10,
    },
    {
        grade: 'F',
        description: 'Faction effectively destroyed',
        test: () => true, // fallback
    },
];

const RS_GRADE_ANCHORS: GradeAnchor[] = [
    {
        grade: 'A+',
        description: 'Held >55% territory, maintained international standing, avoided catastrophic isolation',
        test: (cap) =>
            cap.territory_controlled_pct > 55 &&
            cap.international_credibility >= 40,
    },
    {
        grade: 'A',
        description: '49% contiguous territory, entity intact, Belgrade relationship intact',
        test: (cap) =>
            cap.territory_controlled_pct >= 49 &&
            cap.political_cohesion >= 40,
    },
    {
        grade: 'B',
        description: '45-49% territory, some international concessions',
        test: (cap) =>
            cap.territory_controlled_pct >= 45,
    },
    {
        grade: 'C',
        description: '<45% territory, international isolation',
        test: (cap) =>
            cap.territory_controlled_pct >= 40,
    },
    {
        grade: 'D',
        description: '<40% territory, military collapse, patron abandonment',
        test: (cap) => cap.territory_controlled_pct >= 30,
    },
    {
        grade: 'F',
        description: 'Entity dissolved or catastrophic military collapse',
        test: () => true,
    },
];

const HRHB_GRADE_ANCHORS: GradeAnchor[] = [
    {
        grade: 'A+',
        description: 'Strong territorial position with high political cohesion, Herzegovina secured',
        test: (cap) =>
            cap.territory_controlled_pct > 20 &&
            cap.political_cohesion >= 60,
    },
    {
        grade: 'A',
        description: 'Federation partner with constitutional protections, Herzegovina intact',
        test: (cap) =>
            cap.territory_controlled_pct >= 15 &&
            cap.political_cohesion >= 45,
    },
    {
        grade: 'B',
        description: 'Federation absorbed but Croat interests protected',
        test: (cap) =>
            cap.territory_controlled_pct >= 12 &&
            cap.political_cohesion >= 30,
    },
    {
        grade: 'C',
        description: 'Marginalized within Federation, lost central Bosnia',
        test: (cap) =>
            cap.territory_controlled_pct >= 8,
    },
    {
        grade: 'D',
        description: 'No constitutional protections, Croatian support withdrawn',
        test: (cap) => cap.territory_controlled_pct >= 4,
    },
    {
        grade: 'F',
        description: 'Faction irrelevant at negotiations',
        test: () => true,
    },
];

const FACTION_GRADE_ANCHORS: Record<string, GradeAnchor[]> = {
    RBiH: RBIH_GRADE_ANCHORS,
    RS: RS_GRADE_ANCHORS,
    HRHB: HRHB_GRADE_ANCHORS,
};

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the composite Pyrrhic Score (0-100) for a faction.
 * Weighted sum of the 5 capital dimensions using faction-specific weights.
 */
export function computePyrrhicScore(capital: NegotiationCapital, faction: string): number {
    const weights = CAPITAL_WEIGHTS[faction];
    if (!weights) return 0;

    let score = 0;
    for (const dim of CAPITAL_DIMENSIONS) {
        const w = weights[dim] ?? 0;
        const v = capital[dim] ?? 0;
        score += w * v;
    }

    return clamp(Math.round(score * 10) / 10, 0, 100);
}

/**
 * Compute the letter grade for a faction based on historical anchors.
 * Returns { grade, description } where grade is 'A+', 'A', 'B', 'C', 'D', or 'F'.
 */
export function computeFactionGrade(
    capital: NegotiationCapital,
    faction: string,
    state: GameState,
): { grade: string; description: string } {
    const anchors = FACTION_GRADE_ANCHORS[faction];
    if (!anchors) return { grade: 'F', description: 'Unknown faction' };

    for (const anchor of anchors) {
        if (anchor.test(capital, state)) {
            return { grade: anchor.grade, description: anchor.description };
        }
    }

    return { grade: 'F', description: 'Faction effectively destroyed' };
}

/**
 * Compute per-dimension letter grades for a faction.
 */
export function computeDimensionGrades(capital: NegotiationCapital): DimensionGrade[] {
    return CAPITAL_DIMENSIONS.map((dim) => ({
        dimension: dim,
        label: formatDimensionLabel(dim),
        score: capital[dim] ?? 0,
        grade: gradeDimension(capital[dim] ?? 0),
    }));
}

/**
 * Compute a single faction's full verdict.
 */
export function computeFactionVerdict(
    state: GameState,
    faction: string,
): FactionVerdict {
    const neg = state.military?.negotiation;
    const capital = neg?.capital[faction];

    if (!capital) {
        // No negotiation data — return minimal verdict
        const emptyDims = CAPITAL_DIMENSIONS.map((dim) => ({
            dimension: dim,
            label: formatDimensionLabel(dim),
            score: 0,
            grade: 'F' as string,
        }));
        return {
            faction,
            pyrrhic_score: 0,
            grade: 'F',
            grade_description: 'No negotiation data available',
            capital_breakdown: null as unknown as NegotiationCapital,
            dimension_grades: emptyDims,
        };
    }

    const pyrrhicScore = computePyrrhicScore(capital, faction);
    const { grade, description } = computeFactionGrade(capital, faction, state);
    const dimensionGrades = computeDimensionGrades(capital);

    return {
        faction,
        pyrrhic_score: pyrrhicScore,
        grade,
        grade_description: description,
        capital_breakdown: capital,
        dimension_grades: dimensionGrades,
    };
}

/**
 * Compute the complete game verdict for all factions.
 */
export function computeFullVerdict(state: GameState): GameVerdict {
    const meta = state.meta;
    const turn = meta.turn ?? 0;
    const date = typeof meta.date === 'string' ? meta.date : `Week ${turn}`;
    const neg = state.military?.negotiation;

    // Determine outcome type
    const outcome = meta.outcome;
    let outcomeType: 'dayton' | 'peace_plan' | 'termination' = 'termination';
    let outcomeLabel = 'War Ended';

    if (neg?.dayton_result) {
        outcomeType = 'dayton';
        outcomeLabel = 'Dayton Agreement';
    } else if (outcome?.startsWith('ceasefire') || outcome?.startsWith('peace_plan')) {
        outcomeType = 'peace_plan';
        outcomeLabel = 'Peace Agreement';
    } else if (outcome?.startsWith('victory_')) {
        outcomeLabel = outcome.replace('victory_', '') + ' Prevails';
    } else if (outcome === 'timeout_stalemate') {
        outcomeLabel = 'Exhaustion Stalemate';
    } else if (outcome === 'faction_collapse') {
        outcomeLabel = 'Faction Collapse';
    } else if (outcome) {
        outcomeLabel = outcome.replace(/_/g, ' ');
    }

    // Build per-faction verdicts
    const factionVerdicts: Record<string, FactionVerdict> = {};
    for (const faction of CANONICAL_FACTIONS) {
        factionVerdicts[faction] = computeFactionVerdict(state, faction);
    }

    return {
        outcome_type: outcomeType,
        outcome_label: outcomeLabel,
        turn,
        date,
        duration_weeks: turn,
        faction_verdicts: factionVerdicts,
        dayton_result: neg?.dayton_result,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function formatDimensionLabel(dim: string): string {
    return dim
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
