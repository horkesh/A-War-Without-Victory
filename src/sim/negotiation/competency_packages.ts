/**
 * Competency (jurisdiction) matrix for the Dayton negotiation — DIMENSION 3 of the
 * institutional-architecture expansion (build spec
 * docs/plans/2026-06-07-dayton-institutional-expansion-build-spec.md).
 *
 * Replaces the 6 flat institutional toggles with a structured 16-competency
 * allocation, each owned by `state | entity | shared`, with the historical 1995
 * Dayton default (cited to Annex 4) pre-selected. Flipping a competency away from
 * its 1995 default charges the deviating side; the historical default is FREE so
 * the all-default proposal stays byte-identical (no cost, no dysfunction delta).
 *
 * PHASE 1 (this file): data + `getCompetencyCost` returning the BASE (pre-dial)
 * cost. The `entity_autonomy` dial multiplier is PHASE 2 — do NOT apply it here.
 *
 * Determinism: constant data, sorted lookup, integer-rounded cost. No RNG/clock.
 *
 * Annex-4 grounding (ICTY / U.Minnesota HR Library, hrlibrary.umn.edu/icty/dayton/):
 *  - Art III(1)(a-j): the ONLY enumerated STATE-level competencies.
 *  - Art III(3)(a) residual clause: everything else defaults to the two ENTITIES.
 *  - defense is TIME-SHIFTED: entity in 1995, state only after the 2003-06 defence
 *    reform — so its 1995 default label is `entity`.
 */

// ── Owner / weight-class vocabulary ──────────────────────────────────────────

/** Who exercises a competency in the signed settlement. */
export type CompetencyOwner = 'state' | 'entity' | 'shared';

/** Cost weight-class — how much real sovereignty a competency carries. */
export type CompetencyWeightClass =
    | 'sovereign-core'
    | 'coercive'
    | 'fiscal'
    | 'rule-of-law'
    | 'social'
    | 'connective';

/** A single competency definition. */
export interface CompetencyPackage {
    id: string;
    label: string;
    /** Historical 1995 Dayton default owner (cited to Annex 4). FREE to keep. */
    default_owner: CompetencyOwner;
    weight_class: CompetencyWeightClass;
    /** Annex-4 article citation for the 1995 default. */
    citation: string;
}

// ── The 16 competencies (Annex-4 grounded) ───────────────────────────────────

export const COMPETENCY_PACKAGES: readonly CompetencyPackage[] = [
    // sovereign-core
    { id: 'comp_foreign_policy', label: 'Foreign Policy', default_owner: 'state', weight_class: 'sovereign-core', citation: 'Annex 4 Art III(1)(a)' },
    { id: 'comp_foreign_trade', label: 'Foreign Trade Policy', default_owner: 'state', weight_class: 'sovereign-core', citation: 'Annex 4 Art III(1)(b)' },
    { id: 'comp_monetary', label: 'Monetary Policy', default_owner: 'state', weight_class: 'sovereign-core', citation: 'Annex 4 Art III(1)(d) + VII' },
    // defense is TIME-SHIFTED: entity in 1995 (state only post-2005 reform).
    { id: 'comp_defense', label: 'Defense', default_owner: 'entity', weight_class: 'sovereign-core', citation: 'Annex 4 Art III(3)(a) residual (time-shifted: entity 1995)' },

    // coercive
    { id: 'comp_police', label: 'Police', default_owner: 'entity', weight_class: 'coercive', citation: 'Annex 4 Art III(3)(a) residual' },

    // fiscal
    { id: 'comp_customs', label: 'Customs', default_owner: 'state', weight_class: 'fiscal', citation: 'Annex 4 Art III(1)(c)' },
    { id: 'comp_taxation', label: 'Taxation', default_owner: 'entity', weight_class: 'fiscal', citation: 'Annex 4 Art III(3)(a) residual' },
    { id: 'comp_state_finance', label: 'State Finances & International Obligations', default_owner: 'state', weight_class: 'fiscal', citation: 'Annex 4 Art III(1)(e)' },

    // rule-of-law
    { id: 'comp_judiciary', label: 'Judiciary', default_owner: 'entity', weight_class: 'rule-of-law', citation: 'Annex 4 Art III(3)(a) residual' },
    { id: 'comp_intl_criminal_enforcement', label: 'International & Inter-Entity Criminal Enforcement', default_owner: 'shared', weight_class: 'rule-of-law', citation: 'Annex 4 Art III(1)(g)' },
    { id: 'comp_immigration_asylum', label: 'Immigration & Asylum', default_owner: 'state', weight_class: 'rule-of-law', citation: 'Annex 4 Art III(1)(f)' },

    // social
    { id: 'comp_education', label: 'Education', default_owner: 'entity', weight_class: 'social', citation: 'Annex 4 Art III(3)(a) residual' },
    { id: 'comp_health_social', label: 'Health & Social Welfare', default_owner: 'entity', weight_class: 'social', citation: 'Annex 4 Art III(3)(a) residual' },

    // connective
    { id: 'comp_communications', label: 'Common & International Communications', default_owner: 'state', weight_class: 'connective', citation: 'Annex 4 Art III(1)(h)' },
    { id: 'comp_inter_entity_transport', label: 'Inter-Entity Transportation', default_owner: 'shared', weight_class: 'connective', citation: 'Annex 4 Art III(1)(i)' },
    { id: 'comp_air_traffic', label: 'Air Traffic Control', default_owner: 'state', weight_class: 'connective', citation: 'Annex 4 Art III(1)(j)' },
] as const;

// ── Cost band by weight-class (Phase-1 BASE, pre-dial) ───────────────────────
//
// state_cost  → charged to RS    (centralizing toward the state costs RS).
// entity_cost → charged to RBiH  (decentralizing toward the entities costs RBiH).
// shared_cost → both pay ½ each  (a shared/arbitrated competency splits the cost).
// HRHB pays floor(cost*0.5) on whichever side loses (the swing faction).
interface CostBand {
    state: number;
    entity: number;
    shared: number;
}

const COST_BANDS: Readonly<Record<CompetencyWeightClass, CostBand>> = Object.freeze({
    'sovereign-core': { state: 20, entity: 14, shared: 16 },
    coercive: { state: 16, entity: 11, shared: 12 },
    fiscal: { state: 15, entity: 10, shared: 11 },
    'rule-of-law': { state: 12, entity: 9, shared: 9 },
    social: { state: 10, entity: 6, shared: 7 },
    connective: { state: 8, entity: 5, shared: 6 },
});

// ── Lookup ───────────────────────────────────────────────────────────────────

const competencyMap = new Map<string, CompetencyPackage>();
for (const c of COMPETENCY_PACKAGES) competencyMap.set(c.id, c);

/** Get a competency by id, or undefined. */
export function getCompetencyById(id: string): CompetencyPackage | undefined {
    return competencyMap.get(id);
}

/** All competency definitions. */
export function getAllCompetencyPackages(): readonly CompetencyPackage[] {
    return COMPETENCY_PACKAGES;
}

// ── Cost ─────────────────────────────────────────────────────────────────────

/**
 * BASE (pre-dial) capital cost of a competency allocation to a faction.
 *
 * Cost is **0 when `choice === the historical 1995 default owner`** — only a
 * deviation from Dayton charges. The deviation is charged to the side that the
 * NEW owner extracts from:
 *   - choosing `state`  → centralizing → costs **RS** (state_cost band).
 *   - choosing `entity` → decentralizing → costs **RBiH** (entity_cost band).
 *   - choosing `shared` → splits → costs **both ½ each** (shared_cost band).
 * HRHB pays `floor(cost*0.5)` on whichever side loses (the swing faction).
 *
 * Phase 2 multiplies this base by the `entity_autonomy` dial — DO NOT apply the
 * dial here.
 *
 * @returns the integer base cost to `faction`; 0 at the historical default or for
 *          a faction not on the losing side.
 */
export function getCompetencyCost(
    comp: CompetencyPackage,
    choice: CompetencyOwner,
    faction: string,
): number {
    // Historical default is FREE — load-bearing for byte-identity.
    if (choice === comp.default_owner) return 0;

    const band = COST_BANDS[comp.weight_class];

    if (choice === 'state') {
        // Centralizing toward the state extracts from RS.
        if (faction === 'RS') return band.state;
        if (faction === 'HRHB') return Math.floor(band.state * 0.5);
        return 0; // RBiH benefits
    }
    if (choice === 'entity') {
        // Decentralizing toward the entities extracts from RBiH.
        if (faction === 'RBiH') return band.entity;
        if (faction === 'HRHB') return Math.floor(band.entity * 0.5);
        return 0; // RS benefits
    }
    // shared/arbitrated → both entities pay half each (HRHB pays a quarter).
    if (faction === 'RS' || faction === 'RBiH') return Math.floor(band.shared * 0.5);
    if (faction === 'HRHB') return Math.floor(band.shared * 0.25);
    return 0;
}
