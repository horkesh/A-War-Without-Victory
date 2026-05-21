import type { DimensionId } from './event_types.js';
import { clamp } from '../../utils/math.js';
import { CANONICAL_FACTIONS } from '../../state/game_state.js';

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

export function applyDimensionShift(store: DimensionStore, faction: string, dimension: string, delta: number): void {
    if (!store[faction]?.[dimension]) return;
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

    // international_standing: compliance - war crimes - civilian casualties
    const warCrimes = cap?.war_crimes_events ?? 0;
    const civCas = cap?.civilian_casualties_caused ?? 0;
    const plansAccepted = cap?.peace_plans_accepted?.length ?? 0;
    const plansRejected = cap?.peace_plans_rejected?.length ?? 0;
    updateBaseValue(store, faction, 'international_standing', clamp(50 - (warCrimes * 10) - (civCas / 5000) + (plansAccepted * 10) - (plansRejected * 15), 0, 100));

    // patron_confidence: patron support level
    const patronSupport = patron?.support_level ?? 50;
    updateBaseValue(store, faction, 'patron_confidence', clamp(patronSupport, 0, 100));

    // internal_cohesion: alliance + avg cohesion - exhaustion
    const alliance = state.political?.war_alliance_rbih_hrhb ?? 1;
    const allianceVal = (faction === 'RBiH' || faction === 'HRHB') ? alliance * 40 : 20;
    const fmns = Object.values(state.military?.formations ?? {});
    const factionBrigades = fmns.filter((f: any) => f.faction === faction && f.kind === 'brigade' && f.status === 'active');
    const avgCohesion = factionBrigades.length > 0
        ? factionBrigades.reduce((s: number, b: any) => s + (b.cohesion ?? 50), 0) / factionBrigades.length
        : 50;
    const exhaustion = state.political?.war_exhaustion?.[faction] ?? 0;
    updateBaseValue(store, faction, 'internal_cohesion', clamp(allianceVal + (avgCohesion / 2) - (exhaustion / 3), 0, 100));

    // negotiating_leverage: derived meta-dimension (average of 3 key dimensions)
    const milEff = store[faction].military_credibility.effective_value;
    const terrEff = store[faction].territorial_legitimacy.effective_value;
    const patEff = store[faction].patron_confidence.effective_value;
    updateBaseValue(store, faction, 'negotiating_leverage', clamp((milEff + terrEff + patEff) / 3, 0, 100));
}
