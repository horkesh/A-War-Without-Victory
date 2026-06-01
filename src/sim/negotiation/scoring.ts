/**
 * Endgame verdict owner — JUDGMENT only.
 *
 * Owner split:
 * - TERMINATION: war_termination.ts -> checkWarTermination() -> WarTerminationResult
 * - JUDGMENT: scoring.ts -> computeFullVerdict() -> GameVerdict (this file)
 * - COMPARISON: future downstream consumer, not this file
 *
 * Pyrrhic score is supporting context, not sovereign truth.
 * OutcomeClass + grade are the primary verdict drivers.
 * Condemnation flags can cap or taint any result.
 *
 * Deterministic: no Math.random(), sorted iteration via strictCompare.
 *
 * "The least bad version of a tragedy."
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { NegotiationBreakdown, OutcomeClass } from '../../state/negotiation_types.js';
import type { FactionVerdict, GameVerdict, DimensionGrade } from '../../state/negotiation_types.js';
import { collectCondemnationFlags } from './rupture_consequences.js';
import { DIMENSION_WEIGHTS, computeNegotiatingCapital } from '../events/strategic_dimensions.js';
import type { DimensionStore } from '../events/strategic_dimensions.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

const STRATEGIC_DIMENSIONS = [
    'military_credibility',
    'territorial_legitimacy',
    'international_standing',
    'patron_confidence',
    'internal_cohesion',
    'negotiating_leverage',
] as const;

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
// War-cost floor — the negative-sum keystone (Free War Phase 3, Part A)
// ═══════════════════════════════════════════════════════════════════════════
//
// The verdict grade is, by its anchors, territory-dominated: a faction that
// holds enough ground reads as A+/A no matter how long or bloody the war was.
// That is a conquest scoreboard, and it betrays the negative-sum soul — the
// Bosnian War was a tragedy *nobody won*. This floor makes a long, bloody war
// structurally unable to read as `strategic_success` regardless of territory.
//
// It is POST-TERMINATION reflection: it READS already-accrued, monotonic cost
// values (war exhaustion, cumulative casualties, war duration) and applies a
// grade CAP. It never writes state, never touches accrual, and can only LOWER
// a grade — never raise one. Determinism: pure arithmetic over persisted state.
//
// ── OWNER-TUNABLE GAME-DESIGN KNOBS ─────────────────────────────────────────
// These thresholds are deliberate balance dials. Tune them; do not over-tune.
// `war_cost_index` is a 0..1 scale built from three monotonic sub-scores that
// each saturate at the reference ceiling below, then blended by COST_WEIGHTS.

/** Reference ceilings: the value at which each sub-score saturates to 1.0. */
const COST_REFERENCE = Object.freeze({
    /** War exhaustion at max cost. Post-2026-05-22 rescale, war_exhaustion runs on a 0..10000
     *  scale (100x; saturation cap 10000, combat tempo thresholds 3000/8000) — see
     *  src/sim/combat/exhaustion.ts. 8000 = the "high exhaustion" tempo threshold (formerly 80). */
    exhaustion_full: 8000,
    /** Cumulative faction casualties (killed + wounded + missing/captured) at max cost. */
    casualties_full: 40000,
    /** War duration in weeks/turns at max cost (~3 years of grinding war). */
    duration_full_weeks: 156,
    // ── Atrocity sub-score references (Free War Phase 5, Slice 1) ──────────────
    // The atrocity term saturates at these reference ceilings. They are
    // deliberately LOW so that even a modest cleansing campaign pushes the
    // atrocity sub-score toward 1.0 — the bright line requires atrocity to
    // dominate any territory-driven grade gain, never merely shade it.
    /** War-crimes event count at which the war-crimes component saturates. */
    war_crimes_full: 3,
    /** Refugees created at which the displacement component saturates. */
    refugees_full: 50000,
    /** Civilian casualties caused at which the civilian-harm component saturates. */
    civilian_casualties_full: 5000,
});

/** Blend weights for the three monotonic base sub-scores. Must sum to 1.0. */
const COST_WEIGHTS = Object.freeze({
    exhaustion: 0.4,
    casualties: 0.4,
    duration: 0.2,
});

// ── ATROCITY TERM — the ethics bright line (Free War Phase 5, Slice 1) ────────
//
// OWNER-TUNABLE. The atrocity sub-score (0..1) is built from war-crimes events,
// refugees created, and civilian casualties caused — each saturating at its
// COST_REFERENCE ceiling above, then blended by ATROCITY_WEIGHTS (sum 1.0).
//
// It is added to the base war-cost index (the result is clamped to 1.0), scaled
// by ATROCITY_COST_GAIN. The gain is sized so a meaningful cleansing campaign
// alone can lift the cost index across the 0.78 "hollow" cap — i.e. push an
// otherwise-A+ territory grade down to C. That is the whole point: the extra
// territory cleansing buys is NET-NEGATIVE at the verdict.
//
// CRITICAL — EMERGENT-GATED: the atrocity term applies ONLY when
// state.meta.decision_mode === 'emergent'. The historical 52w baseline contains
// the real Drina cleansing (war_crimes_events > 0); applying the term there
// would raise its cost index, lower its grade, and break the byte-identical
// baseline. Historical/unset mode is therefore left exactly as before.

/** Blend weights for the three atrocity components. Must sum to 1.0. */
const ATROCITY_WEIGHTS = Object.freeze({
    war_crimes: 0.5,
    refugees: 0.3,
    civilian_casualties: 0.2,
});

/**
 * Additive gain applied to the (0..1) atrocity sub-score before it is added to
 * the base cost index. At full saturation (atrocity sub-score 1.0) this adds
 * +0.85 to the index — enough that even a low-cost short war crosses the 0.78
 * hollow cap on cleansing alone, so atrocity DOMINATES territory at the verdict.
 */
const ATROCITY_COST_GAIN = 0.85;

/**
 * Grade ceilings keyed by ascending war_cost_index threshold.
 * Evaluated high-to-low; the first threshold the cost index meets or exceeds
 * sets the BEST achievable grade. A higher-cost war can never read as a clean
 * triumph. `max_grade` is the highest grade still permitted at that cost tier.
 *
 *   cost < 0.45  → no cap (clean, short, cheap wars keep their earned grade)
 *   cost ≥ 0.45  → cannot exceed A   (a real war is never a flawless A+)
 *   cost ≥ 0.60  → cannot exceed B   (costly_victory band — pyrrhic at best)
 *   cost ≥ 0.78  → cannot exceed C   (hollow — won something at ruinous cost)
 */
const COST_GRADE_CAPS: Array<{ min_cost_index: number; max_grade: string }> = [
    { min_cost_index: 0.78, max_grade: 'C' },
    { min_cost_index: 0.60, max_grade: 'B' },
    { min_cost_index: 0.45, max_grade: 'A' },
];

/** Letter grades ranked best→worst; index = severity (0 = best). */
const GRADE_RANK: readonly string[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

function gradeRank(grade: string): number {
    const idx = GRADE_RANK.indexOf(grade);
    return idx === -1 ? GRADE_RANK.length - 1 : idx; // unknown grade treated as worst
}

function clamp01(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value >= 1 ? 1 : value;
}

/**
 * Compute the monotonic atrocity sub-score in [0, 1] for a faction.
 *
 * Reads only already-accrued, monotonic per-faction war-data from the
 * negotiation capital breakdown:
 *   - war_crimes_events         (count of war-crime events)
 *   - refugees_created          (forced displacement caused)
 *   - civilian_casualties_caused
 *
 * Each component saturates at its COST_REFERENCE ceiling, then blends by
 * ATROCITY_WEIGHTS. Higher = more atrocity. Pure & deterministic. This is the
 * raw signal; the emergent gate and additive gain are applied by the caller.
 */
function computeAtrocitySubScore(state: GameState, faction: string): number {
    const cap = state.military?.negotiation?.capital?.[faction];
    if (!cap) return 0;

    const warCrimes = cap.war_crimes_events ?? 0;
    const refugees = cap.refugees_created ?? 0;
    const civilianCasualties = cap.civilian_casualties_caused ?? 0;

    const warCrimesScore = clamp01(warCrimes / COST_REFERENCE.war_crimes_full);
    const refugeesScore = clamp01(refugees / COST_REFERENCE.refugees_full);
    const civilianScore = clamp01(civilianCasualties / COST_REFERENCE.civilian_casualties_full);

    return clamp01(
        warCrimesScore * ATROCITY_WEIGHTS.war_crimes +
        refugeesScore * ATROCITY_WEIGHTS.refugees +
        civilianScore * ATROCITY_WEIGHTS.civilian_casualties,
    );
}

/**
 * Compute the monotonic war-cost index in [0, 1] for a faction.
 *
 * Reads only already-accrued, monotonic state:
 *   - war exhaustion         (state.political.war_exhaustion[faction], §8 monotonic)
 *   - cumulative casualties  (state.military.casualty_ledger[faction], monotonic)
 *   - war duration in weeks  (state.meta.turn, monotonic)
 *
 * Each sub-score saturates at its COST_REFERENCE ceiling, then blends by
 * COST_WEIGHTS. Higher = more catastrophic war. Pure & deterministic.
 *
 * EMERGENT-ONLY atrocity term (Free War Phase 5, Slice 1 — the ethics bright
 * line): when meta.decision_mode === 'emergent', an additive atrocity penalty
 * (war_crimes_events + refugees + civilian casualties, scaled by
 * ATROCITY_COST_GAIN) is folded in so cleansing RAISES the cost index — pushing
 * the grade cap down enough that the territory cleansing buys is net-negative at
 * the verdict. In historical/unset mode the term is OFF, so the index (and thus
 * the 52w baseline grade) is byte-identical to before this slice.
 */
export function computeWarCostIndex(state: GameState, faction: string): number {
    const exhaustion = state.political?.war_exhaustion?.[faction] ?? 0;
    const exhaustionScore = clamp01(exhaustion / COST_REFERENCE.exhaustion_full);

    const ledger = state.military?.casualty_ledger?.[faction];
    const casualties = ledger
        ? (ledger.killed ?? 0) + (ledger.wounded ?? 0) + (ledger.missing_captured ?? 0)
        : 0;
    const casualtyScore = clamp01(casualties / COST_REFERENCE.casualties_full);

    const weeks = state.meta?.turn ?? 0;
    const durationScore = clamp01(weeks / COST_REFERENCE.duration_full_weeks);

    const baseIndex =
        exhaustionScore * COST_WEIGHTS.exhaustion +
        casualtyScore * COST_WEIGHTS.casualties +
        durationScore * COST_WEIGHTS.duration;

    // EMERGENT-GATED: the atrocity term is OFF in historical/unset mode, keeping
    // the historical 52w war_cost_index (and verdict) byte-identical.
    if (state.meta?.decision_mode !== 'emergent') {
        return clamp01(baseIndex);
    }

    const atrocityPenalty = computeAtrocitySubScore(state, faction) * ATROCITY_COST_GAIN;
    return clamp01(baseIndex + atrocityPenalty);
}

/**
 * Cap a faction's earned grade by its war-cost index. Can only LOWER the grade
 * (toward F), never raise it. Returns the input grade unchanged when the cost
 * index is below all cap thresholds.
 */
export function capGradeByCost(grade: string, costIndex: number): string {
    let maxGrade: string | null = null;
    for (const cap of COST_GRADE_CAPS) {
        if (costIndex >= cap.min_cost_index) {
            maxGrade = cap.max_grade;
            break; // COST_GRADE_CAPS is ordered high→low; first hit is the tightest cap
        }
    }
    if (maxGrade === null) return grade;
    // Only lower: keep the worse (higher-rank-index) of earned vs cap.
    return gradeRank(grade) >= gradeRank(maxGrade) ? grade : maxGrade;
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
    test: (cap: NegotiationBreakdown, state: GameState) => boolean;
}

const RBIH_GRADE_ANCHORS: GradeAnchor[] = [
    {
        grade: 'A+',
        description: 'Defended most territory, minimal civilian losses, enclaves held, strong international position',
        test: (cap) =>
            cap.territory_controlled_pct > 33 &&
            cap.enclaves_lost.length === 0 &&
            cap.war_crimes_events === 0,
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
            cap.war_crimes_events <= 2, // proxy for international standing
    },
    {
        grade: 'A',
        description: '49% contiguous territory, entity intact, Belgrade relationship intact',
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.RS?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct >= 49 && cohesion >= 30;
        },
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
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.HRHB?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct > 20 && cohesion >= 50;
        },
    },
    {
        grade: 'A',
        description: 'Federation partner with constitutional protections, Herzegovina intact',
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.HRHB?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct >= 15 && cohesion >= 40;
        },
    },
    {
        grade: 'B',
        description: 'Federation absorbed but Croat interests protected',
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.HRHB?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct >= 12 && cohesion >= 30;
        },
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
// Outcome Classification — maps grade + condemnation flags to OutcomeClass
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify a faction's endgame outcome from grade, breakdown, and condemnation flags.
 * Pure, deterministic. Condemnation flags can force hollow_victory or failure
 * regardless of territorial/military success.
 *
 * Evaluation order matters — checked top to bottom, first match wins.
 */
export function classifyOutcome(
    _faction: string,
    breakdown: NegotiationBreakdown,
    _dimensionStore: DimensionStore | undefined,
    grade: string,
    _pyrrhicScore: number,
    condemnationFlags: string[],
): OutcomeClass {
    // Collapse: faction destroyed or zero territory
    if (breakdown.territory_controlled_pct <= 0 || grade === 'F') return 'collapse';

    // Failure: grade D or genocide condemnation forces failure
    if (grade === 'D' || condemnationFlags.includes('genocide_condemnation')) return 'failure';

    // Hollow victory: any condemnation flags taint the result, even with strong territory
    if (condemnationFlags.length > 0 && breakdown.territory_controlled_pct > 30) return 'hollow_victory';

    // Strategic success: A+ grade, strong position
    if (grade === 'A+') return 'strategic_success';

    // Survival: A grade, maintained position
    if (grade === 'A') return 'survival';

    // Negotiated escape: B grade, acceptable compromise
    if (grade === 'B') return 'negotiated_escape';

    // Pyrrhic success: C grade, won something but at great cost
    if (grade === 'C') return 'pyrrhic_success';

    // Default to failure for anything unmapped
    return 'failure';
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the composite Pyrrhic Score (0-100) for a faction.
 * Uses DIMENSION_WEIGHTS from strategic_dimensions.ts.
 * Falls back to 50 if no dimension store is available.
 */
export function computePyrrhicScore(_breakdown: NegotiationBreakdown, faction: string, dimensionStore?: DimensionStore): number {
    if (!dimensionStore) return 50; // TODO: remove NegotiationBreakdown param once all callers pass dimensionStore
    return clamp(Math.round(computeNegotiatingCapital(dimensionStore, faction) * 10) / 10, 0, 100);
}

/**
 * Compute the letter grade for a faction based on historical anchors.
 * Returns { grade, description } where grade is 'A+', 'A', 'B', 'C', 'D', or 'F'.
 */
export function computeFactionGrade(
    capital: NegotiationBreakdown,
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
 * Uses strategic dimensions when available, falls back to zeros.
 */
export function computeDimensionGrades(_breakdown: NegotiationBreakdown, faction?: string, dimensionStore?: DimensionStore): DimensionGrade[] {
    return STRATEGIC_DIMENSIONS.map((dim) => {
        const score = (faction ? dimensionStore?.[faction]?.[dim]?.effective_value : undefined) ?? 0;
        return {
            dimension: dim,
            label: formatDimensionLabel(dim),
            score,
            grade: gradeDimension(score),
        };
    });
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

    const dimStore = neg?.strategic_dimensions;

    if (!capital) {
        // No negotiation data — return minimal verdict
        const emptyDims = STRATEGIC_DIMENSIONS.map((dim) => ({
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
            capital_breakdown: null,
            dimension_grades: emptyDims,
            outcome_class: 'collapse' as OutcomeClass,
            condemnation_flags: [],
        };
    }

    const pyrrhicScore = computePyrrhicScore(capital, faction, dimStore);
    const earned = computeFactionGrade(capital, faction, state);

    // War-cost floor (Free War Phase 3, Part A): a long, bloody war can never
    // read as a clean triumph. Post-termination reflection — reads accrued cost,
    // caps the grade downward only. Territory alone can no longer buy A+.
    const costIndex = computeWarCostIndex(state, faction);
    const grade = capGradeByCost(earned.grade, costIndex);
    const description = grade === earned.grade
        ? earned.description
        : `${earned.description} — capped by war cost (index ${costIndex.toFixed(2)})`;

    const dimensionGrades = computeDimensionGrades(capital, faction, dimStore);

    // Collect condemnation flags from rupture consequences (Ring 2)
    const condemnationFlags = collectCondemnationFlags(state, faction);
    const outcomeClass = classifyOutcome(faction, capital, dimStore, grade, pyrrhicScore, condemnationFlags);

    return {
        faction,
        pyrrhic_score: pyrrhicScore,
        grade,
        grade_description: description,
        capital_breakdown: capital,
        dimension_grades: dimensionGrades,
        outcome_class: outcomeClass,
        condemnation_flags: condemnationFlags,
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
