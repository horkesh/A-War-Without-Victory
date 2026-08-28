/**
 * DIMENSION 6 — autonomy instruments.
 *
 * The `entity_autonomy` dial (Dim 2) declares a FRAME; the 16 competencies (Dim 3)
 * allocate WHO EXERCISES a power. Neither says how much sovereignty an entity holds
 * in its own right — and that, not the competency list, is what Dayton actually
 * argued about. Annex 4 granted the Entities four standing instruments of autonomy
 * that sit outside the competency matrix entirely:
 *
 *   - the right to a SPECIAL PARALLEL RELATIONSHIP with a neighbouring state
 *     (Art III(2)(a)) — the clause that let Republika Srpska bind itself to Belgrade
 *     and the Federation to Zagreb. The single most consequential autonomy lever in
 *     the settlement, and not a "competency" at all;
 *   - the right to enter AGREEMENTS with states and international organisations,
 *     with Parliamentary Assembly consent (Art III(2)(d));
 *   - ENTITY CITIZENSHIP held alongside state citizenship (Art I(7)(b));
 *   - the SUPREMACY of the state constitution over entity constitutions
 *     (Art III(3)(b) + XII(2)) — how much an entity may diverge in its own basic law.
 *
 * Each slot's baseline is the as-signed 1995 text and is FREE, so an untouched
 * proposal costs nothing and the historical settlement stays byte-identical. Moving
 * a slot charges the side that loses by it, and the Dim-2 dial multiplier applies on
 * top via `finalAutonomyCost` — a faction that declared a centralizing frame pays
 * cross-grain rates to then hand an entity a parallel army, and vice versa.
 *
 * These are deliberately EXPENSIVE relative to a single competency flip. A
 * competency is an administrative allocation; these four are what an entity IS.
 *
 * Determinism: constant data, sorted lookup, integer cost. No RNG/clock.
 */

import { strictCompare } from '../../state/validateGameState.js';

type CostByFaction = Readonly<Partial<Record<'RBiH' | 'RS' | 'HRHB', number>>>;

/** One selectable value of an autonomy slot. */
export interface AutonomyOption {
    id: string;
    label: string;
    /** True for the as-signed 1995 baseline, which is free. */
    is_default: boolean;
    /** Base (pre-dial) cost per faction. Empty = free. */
    base_cost: CostByFaction;
}

/** An autonomy slot with mutually-exclusive options. */
export interface AutonomyChoice {
    id: string;
    label: string;
    /** Annex-4 grounding for the default option. */
    citation: string;
    options: readonly AutonomyOption[];
}

export const AUTONOMY_CHOICES: readonly AutonomyChoice[] = [
    {
        id: 'aut_parallel_relations',
        label: 'Special Parallel Relationships',
        citation: 'Annex 4 Art III(2)(a)',
        options: [
            // As signed: entities may hold special parallel relationships with a
            // neighbouring state, consistent with BiH sovereignty.
            { id: 'special_parallel', label: 'Special Parallel Relationships Permitted', is_default: true, base_cost: {} },
            // Severing it strips RS of Belgrade and HRHB of Zagreb — the deepest cut
            // the central state can make, and priced accordingly.
            { id: 'none', label: 'No Parallel Relationships', is_default: false, base_cost: { RS: 30, HRHB: 22 } },
            // Extending it to defence and security is a standing military tie to a
            // neighbouring state — near-confederal, and RBiH pays dearly to allow it.
            { id: 'defence_and_security', label: 'Extended to Defence and Security', is_default: false, base_cost: { RBiH: 34 } },
        ],
    },
    {
        id: 'aut_entity_agreements',
        label: 'Entity Treaty Power',
        citation: 'Annex 4 Art III(2)(d)',
        options: [
            { id: 'assembly_consent', label: 'Agreements Require Assembly Consent', is_default: true, base_cost: {} },
            { id: 'notification_only', label: 'Notification Only', is_default: false, base_cost: { RBiH: 18 } },
            { id: 'state_monopoly', label: 'State Monopoly on Treaties', is_default: false, base_cost: { RS: 20, HRHB: 10 } },
        ],
    },
    {
        id: 'aut_entity_citizenship',
        label: 'Entity Citizenship',
        citation: 'Annex 4 Art I(7)(b)',
        options: [
            { id: 'dual_citizenship', label: 'State and Entity Citizenship', is_default: true, base_cost: {} },
            { id: 'state_only', label: 'State Citizenship Only', is_default: false, base_cost: { RS: 16, HRHB: 8 } },
            // Entity-primary citizenship makes the state a shell for its members —
            // the strongest constitutional statement of entity sovereignty short of
            // leaving, and the central-state side pays the whole price of conceding it.
            { id: 'entity_primary', label: 'Entity Citizenship Primary', is_default: false, base_cost: { RBiH: 28 } },
        ],
    },
    {
        id: 'aut_constitutional_supremacy',
        label: 'Entity Constitutions',
        citation: 'Annex 4 Art III(3)(b) + XII(2)',
        options: [
            { id: 'state_supremacy', label: 'Entity Constitutions Must Conform', is_default: true, base_cost: {} },
            { id: 'entity_carve_outs', label: 'Enumerated Entity Carve-Outs', is_default: false, base_cost: { RBiH: 20 } },
            { id: 'full_conformity_review', label: 'Mandatory Conformity Review', is_default: false, base_cost: { RS: 18, HRHB: 9 } },
        ],
    },
];

const choiceMap = new Map<string, AutonomyChoice>();
for (const c of [...AUTONOMY_CHOICES].sort((a, b) => strictCompare(a.id, b.id))) {
    choiceMap.set(c.id, c);
}

/** Look up an autonomy slot by id. */
export function getAutonomyChoiceById(choiceId: string): AutonomyChoice | undefined {
    return choiceMap.get(choiceId);
}

/**
 * BASE (pre-dial) cost of an autonomy option to a faction. 0 for the default, for
 * an unknown slot/option, and for a faction the option does not charge. The Dim-2
 * multiplier is applied by `finalAutonomyCost` in dayton_dial_cost.ts — never here.
 */
export function getAutonomyCost(choiceId: string, optionId: string, faction: string): number {
    const choice = choiceMap.get(choiceId);
    if (!choice) return 0;
    const option = choice.options.find((o) => o.id === optionId);
    if (!option || option.is_default) return 0;
    return option.base_cost[faction as 'RBiH' | 'RS' | 'HRHB'] ?? 0;
}

/** The default (free, as-signed) option id for a slot. */
export function getAutonomyDefaultOptionId(choiceId: string): string | undefined {
    return choiceMap.get(choiceId)?.options.find((o) => o.is_default)?.id;
}
