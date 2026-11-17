import type { DimensionId } from './event_types.js';
import { clamp } from '../../utils/math.js';
import { CANONICAL_FACTIONS } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { PeacePlanResponse } from '../../state/negotiation_types.js';
import { getPeacePlanById } from '../negotiation/peace_plan_data.js';
import type { ParamilitarySeverityBand } from '../combat/paramilitary_sweep.js';

export const DIMENSION_IDS: DimensionId[] = [
    'military_credibility',
    'territorial_legitimacy',
    'international_standing',
    'patron_confidence',
    'internal_cohesion',
    'negotiating_leverage',
];

export interface DimensionStore {
    [faction: string]: {
        [dimension: string]: {
            base_value: number;
            event_modifier: number;
            effective_value: number;
        };
    };
}

export function initializeStrategicDimensions(): DimensionStore {
    const store: DimensionStore = {};
    for (const faction of CANONICAL_FACTIONS) {
        store[faction] = {};
        for (const dim of DIMENSION_IDS) {
            store[faction][dim] = { base_value: 50, event_modifier: 0, effective_value: 50 };
        }
    }
    return store;
}

const DIMENSION_ID_SET: ReadonlySet<string> = new Set<string>(DIMENSION_IDS);

/**
 * The one accumulator rule (§6 E3a1 D1; Systems Manual §7.10.3). Every writer of a
 * dimension's `event_modifier` goes through this function. The accumulator is NOT
 * clamped: a side at −110 that takes −30 more sits at −140, so a later +30 does not
 * erase it. Only `effective_value = clamp(base_value + event_modifier, 0, 100)` is clamped.
 *
 * §6 E2: an unknown dimension id THROWS (it used to be a silent dead write).
 * A missing store or faction entry (state not yet initialised) stays a quiet no-op.
 */
export function applyDimensionShift(store: DimensionStore, faction: string, dimension: string, delta: number): void {
    if (!DIMENSION_ID_SET.has(dimension)) {
        throw new Error(`Unknown strategic dimension id in dimension shift: ${dimension}`);
    }
    if (!store?.[faction]?.[dimension]) return;
    const dim = store[faction][dimension];
    dim.event_modifier += delta;
    dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
}

export function getDimensionEffective(store: DimensionStore, faction: string, dimension: string): number {
    return store[faction]?.[dimension]?.effective_value ?? 50;
}

export function updateBaseValue(store: DimensionStore, faction: string, dimension: string, newBase: number): void {
    if (!store[faction]?.[dimension]) return;
    const dim = store[faction][dimension];
    dim.base_value = clamp(newBase, 0, 100);
    dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
}

// ---------------------------------------------------------------------------
// Faction-specific dimension weights for Dayton composite score
// ---------------------------------------------------------------------------

export const DIMENSION_WEIGHTS: Record<string, Record<string, number>> = {
    RS:   { military_credibility: 0.25, territorial_legitimacy: 0.25, international_standing: 0.10, patron_confidence: 0.15, internal_cohesion: 0.10, negotiating_leverage: 0.15 },
    RBiH: { military_credibility: 0.15, territorial_legitimacy: 0.15, international_standing: 0.25, patron_confidence: 0.15, internal_cohesion: 0.15, negotiating_leverage: 0.15 },
    HRHB: { military_credibility: 0.15, territorial_legitimacy: 0.20, international_standing: 0.15, patron_confidence: 0.25, internal_cohesion: 0.15, negotiating_leverage: 0.10 },
};

export function computeNegotiatingCapital(store: DimensionStore, faction: string): number {
    const weights = DIMENSION_WEIGHTS[faction];
    if (!weights || !store[faction]) return 50;
    let total = 0;
    for (const [dim, weight] of Object.entries(weights)) {
        total += (store[faction][dim]?.effective_value ?? 50) * weight;
    }
    return clamp(total, 0, 100);
}

/**
 * The one owner of every dimension `base_value` (§6 E3a1 D2). Runs once per faction per
 * turn at the `compute-dimension-bases` pipeline step. No other function writes a
 * `base_value`; `computeNegotiationBreakdown` only rebuilds the raw capital record.
 */
export function computeDimensionBaseValues(store: DimensionStore, state: any, faction: string): void {
    if (!store[faction]) return;
    const cap = state.military?.negotiation?.capital?.[faction];
    const patron = state.military?.negotiation?.patron_relationships?.[faction];

    // military_credibility: ops success rate + casualty exchange ratio
    const opsLaunched = cap?.operations_launched ?? 0;
    const opsSuccessful = cap?.operations_successful ?? 0;
    const opsRate = opsLaunched > 0 ? opsSuccessful / opsLaunched : 0.5;
    const casInflicted = cap?.military_casualties_inflicted ?? 0;
    const casTaken = cap?.military_casualties_taken ?? 1;
    const casRatio = casTaken > 0 ? casInflicted / casTaken : 1;
    updateBaseValue(store, faction, 'military_credibility', clamp(opsRate * 50 + Math.min(casRatio, 3) * (25 / 3), 0, 100));

    // territorial_legitimacy: area-weighted territory %
    const terrPct = cap?.territory_controlled_pct ?? 0;
    updateBaseValue(store, faction, 'territorial_legitimacy', clamp(terrPct * 1.2, 0, 100));

    // international_standing: the single base writer (§6 E3a1 D2) — see computeInternationalStandingBase.
    updateBaseValue(store, faction, 'international_standing', computeInternationalStandingBase(state, faction));

    // patron_confidence: patron support level
    const patronSupport = patron?.support_level ?? 50;
    updateBaseValue(store, faction, 'patron_confidence', clamp(patronSupport, 0, 100));

    // internal_cohesion: alliance + avg cohesion - exhaustion
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 1;
    const allianceVal = (faction === 'RBiH' || faction === 'HRHB') ? alliance * 40 : 20;
    const formations = state.military?.formations ?? {};
    const fmns = Object.keys(formations).sort(strictCompare).map((id: string) => formations[id]);
    const factionBrigades = fmns.filter((f: any) => f.faction === faction && f.kind === 'brigade' && f.status === 'active');
    const avgCohesion = factionBrigades.length > 0
        ? factionBrigades.reduce((s: number, b: any) => s + (b.cohesion ?? 50), 0) / factionBrigades.length
        : 50;
    const exhaustion = state.political?.war_exhaustion?.[faction] ?? 0;
    // war_exhaustion is unbounded monotonic (Engine Invariants §8); the 2026-05-22 100× rescale
    // (commit 59511672) moved its saturation ceiling 100→10000, so the divisor was rescaled in lockstep
    // (was /3 in the 0-100 era) to keep the exhaustion term proportional to the formula's positive bound.
    updateBaseValue(store, faction, 'internal_cohesion', clamp(allianceVal + (avgCohesion / 2) - (exhaustion / 300), 0, 100));

    // negotiating_leverage: derived meta-dimension (average of 3 key dimensions)
    const milEff = store[faction].military_credibility.effective_value;
    const terrEff = store[faction].territorial_legitimacy.effective_value;
    const patEff = store[faction].patron_confidence.effective_value;
    updateBaseValue(store, faction, 'negotiating_leverage', clamp((milEff + terrEff + patEff) / 3, 0, 100));
}

// ---------------------------------------------------------------------------
// international_standing base inputs (§6 E3a1 D2; Systems Manual §7.10.3)
// ---------------------------------------------------------------------------

const PARAMILITARY_MINOR_PENALTY_PER_DEPLOYMENT = 2;
const PARAMILITARY_MID_PENALTY_PER_DEPLOYMENT = 4;
const PARAMILITARY_SEVERE_PENALTY_PER_DEPLOYMENT = 5;
const PARAMILITARY_SEVERE_STANDING_CLIFF = 10;

/** Standing penalty of a paramilitary war-crimes finding: 2/4/5 per deployment by band, +10 cliff at severe. */
export function computeParamilitaryInternationalStandingPenalty(
    band: ParamilitarySeverityBand,
    deploymentCount: number
): number {
    const count = Math.max(0, Math.trunc(deploymentCount));
    if (count === 0) return 0;
    if (band === 'severe') return (count * PARAMILITARY_SEVERE_PENALTY_PER_DEPLOYMENT) + PARAMILITARY_SEVERE_STANDING_CLIFF;
    if (band === 'mid') return count * PARAMILITARY_MID_PENALTY_PER_DEPLOYMENT;
    return count * PARAMILITARY_MINOR_PENALTY_PER_DEPLOYMENT;
}

/** The faction's latest paramilitary war-crimes finding (cost-ledger annotation), or null. */
export function getLatestParamilitaryFinding(
    state: any,
    faction: string
): { band: ParamilitarySeverityBand; deploymentCount: number } | null {
    const annotations: Array<{ faction?: string; event_id?: string; turn: number; tag: string; text?: string }> =
        state?.military?.cost_ledger_annotations ?? [];
    const entries = annotations
        .filter((entry) => entry.faction === faction && entry.event_id === `cost_war_crimes_findings_${faction}`)
        .sort((a, b) => {
            if (a.turn !== b.turn) return b.turn - a.turn;
            return strictCompare(b.tag, a.tag);
        });
    const latest = entries[0];
    if (!latest) return null;
    const band = parseParamilitaryBand(latest.tag);
    if (!band) return null;
    return { band, deploymentCount: parseDeploymentCount(latest.text) };
}

function parseParamilitaryBand(tag: string): ParamilitarySeverityBand | null {
    if (tag === 'paramilitary_war_crimes_minor') return 'minor';
    if (tag === 'paramilitary_war_crimes_mid') return 'mid';
    if (tag === 'paramilitary_war_crimes_severe') return 'severe';
    return null;
}

function parseDeploymentCount(text?: string): number {
    const match = text?.match(/\bdeployment_count=(\d+)\b/);
    return match ? Number.parseInt(match[1]!, 10) : 0;
}

/**
 * Plans a faction accepted and rejected, derived from `peace_plan_history` (the single
 * source, §6 E3a1 D3). `computeNegotiationBreakdown` rebuilds `capital.peace_plans_*`
 * from this; the standing base reads it directly so it never depends on when that rebuild ran.
 * Resolved rows only (§6 E3a2): an answer counts once its plan is decided, never before.
 */
export function derivePeacePlanResponseLists(
    history: readonly PeacePlanResponse[],
    faction: string
): { accepted: string[]; rejected: string[] } {
    const accepted: string[] = [];
    const rejected: string[] = [];
    for (const plan of history) {
        if (!plan.resolved) continue;
        const response = plan.responses[faction];
        if (response === 'accepted') accepted.push(plan.plan_id);
        else if (response === 'rejected') rejected.push(plan.plan_id);
    }
    return { accepted, rejected };
}

/** §6 E3a2 ruling item 5: the base credit for each accepted plan (flat, every plan and side). */
export const PEACE_PLAN_ACCEPT_STANDING = 10;

/**
 * The graded standing term of the plans a faction rejected: Σ the plan's own
 * `credibility_change_on_reject[faction]` (§6 E3a2 ruling item 5; it replaced the flat −15).
 * A plan without a value for the faction contributes 0.
 */
export function rejectedPlansStandingTerm(rejectedPlanIds: readonly string[], faction: string): number {
    let term = 0;
    for (const planId of rejectedPlanIds) {
        term += getPeacePlanById(planId)?.credibility_change_on_reject?.[faction] ?? 0;
    }
    return term;
}

/**
 * international_standing base =
 *   clamp(50 − war_crimes_events × 10 − paramilitary_finding_penalty − civilian_casualties / 5000
 *         + plans_accepted × 10 + Σ credibility_change_on_reject over the rejected plans, 0, 100).
 * The finding penalty ADDS to the war-crimes term; it never replaces it (§6 E3a1 D2), so a
 * sweep that brings a finding can never raise the base.
 *
 * §6 E3a2 ruling item 5: the plan terms are the only carrier of a plan answer's standing
 * (no card shift, no event_modifier write at resolution) and sit INSIDE the base clamp, so a
 * side whose base is already at 0 absorbs a refusal. Recorded rule: E3c moves the plan terms
 * into its single outer layer, alongside the authored-incident term.
 */
export function computeInternationalStandingBase(state: any, faction: string): number {
    const cap = state?.military?.negotiation?.capital?.[faction];
    const warCrimes = cap?.war_crimes_events ?? 0;
    const finding = getLatestParamilitaryFinding(state, faction);
    const findingPenalty = finding
        ? computeParamilitaryInternationalStandingPenalty(finding.band, finding.deploymentCount)
        : 0;
    const civCas = cap?.civilian_casualties_caused ?? 0;
    const plans = derivePeacePlanResponseLists(state?.military?.negotiation?.peace_plan_history ?? [], faction);
    return clamp(
        50 - (warCrimes * 10) - findingPenalty - (civCas / 5000)
            + (plans.accepted.length * PEACE_PLAN_ACCEPT_STANDING)
            + rejectedPlansStandingTerm(plans.rejected, faction),
        0,
        100
    );
}
