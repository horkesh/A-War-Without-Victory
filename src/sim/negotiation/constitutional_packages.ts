/**
 * Constitutional architecture (DIMENSION 4) + return/justice (DIMENSION 5) for the
 * Dayton negotiation — institutional-architecture expansion
 * (docs/plans/2026-06-07-dayton-institutional-expansion-build-spec.md).
 *
 * DIMENSION 4 — five constitutional sub-choices grounded in Annex 4 (Presidency,
 * vital-interest veto regime, constituent-peoples model, Constitutional Court
 * composition, OHR authority). The 1995 default (the gridlock-by-design, supervised
 * Dayton settlement) is FREE; deviating charges the side that loses.
 *
 * DIMENSION 5 — return & justice (Annex 7 refugee return + ICTY cooperation). HARD
 * CANON RULE: return/justice choices mitigate dysfunction TONE only; they NEVER
 * erase a locked Ring-2 condemnation flag (genocide/atrocity). The dysfunction
 * index enforces this as a FLOOR (peace_dysfunction.ts), mirroring the existing
 * condemnation cap.
 *
 * PHASE 1 (this file): data + `getConstitutionalCost` / `getReturnJusticeCost`
 * returning the BASE (pre-dial) cost. The `entity_autonomy` dial multiplier is
 * PHASE 2 — do NOT apply it here.
 *
 * Determinism: constant data, sorted lookup, integer cost. No RNG/clock.
 */

// ── A faction → cost map, the payer ledger for a non-default option ───────────
type CostByFaction = Readonly<Partial<Record<'RBiH' | 'RS' | 'HRHB', number>>>;

/** A constitutional sub-choice option (one selectable value). */
export interface ConstitutionalOption {
    id: string;
    label: string;
    /**
     * True for the free in-game BASELINE option an untouched proposal resolves to —
     * the AS-IMPLEMENTED 1995 outcome. For the Annex-4 constitutional slots this
     * baseline IS the treaty text. For refugee return (Dim 5) it is NOT: Annex 7
     * Art. I guaranteed the FULL right of return; voluntary-only is the as-implemented
     * reality, so `full_right_of_return` is the treaty guarantee while `voluntary_only`
     * (the baseline here) is the outcome on the ground. See the `rj_refugee_return`
     * options below.
     */
    is_default: boolean;
    /** Base (pre-dial) cost per faction for choosing this option. Empty = free. */
    base_cost: CostByFaction;
}

/** A constitutional sub-choice (a slot with mutually-exclusive options). */
export interface ConstitutionalChoice {
    id: string;
    label: string;
    /** Annex-4 grounding for the default option. */
    citation: string;
    options: readonly ConstitutionalOption[];
}

// ── DIMENSION 4 — constitutional architecture ────────────────────────────────

export const CONSTITUTIONAL_CHOICES: readonly ConstitutionalChoice[] = [
    {
        id: 'arch_presidency',
        label: 'Presidency',
        citation: 'Annex 4 Art V (tripartite rotating)',
        options: [
            { id: 'tripartite_rotating', label: 'Tripartite Rotating', is_default: true, base_cost: {} },
            { id: 'single_elected', label: 'Single Elected President', is_default: false, base_cost: { RS: 18 } },
            { id: 'collective_civic', label: 'Collective Civic Presidency', is_default: false, base_cost: { RS: 20, HRHB: 8 } },
        ],
    },
    {
        id: 'arch_veto_regime',
        label: 'Veto Regime',
        citation: 'Annex 4 Art IV(3)(e) vital-interest + entity voting',
        options: [
            { id: 'vital_interest_entity', label: 'Vital-Interest + Entity Voting', is_default: true, base_cost: {} },
            { id: 'weighted_majority', label: 'Weighted Majority', is_default: false, base_cost: { RS: 16 } },
            { id: 'simple_majority', label: 'Simple Majority', is_default: false, base_cost: { RS: 22 } },
        ],
    },
    {
        id: 'arch_constituent_model',
        label: 'Constituent Model',
        citation: 'Annex 4 Preamble — three constituent peoples (Sejdić–Finci fault line)',
        options: [
            { id: 'three_peoples', label: 'Three Constituent Peoples', is_default: true, base_cost: {} },
            { id: 'civic_citizens', label: 'Civic Citizens', is_default: false, base_cost: { RS: 18, HRHB: 10 } },
        ],
    },
    {
        id: 'arch_const_court',
        label: 'Constitutional Court',
        citation: 'Annex 4 Art VI(1) — 3 international judges',
        options: [
            { id: 'international_judges', label: 'International Judges', is_default: true, base_cost: {} },
            { id: 'domestic_only', label: 'Domestic Judges Only', is_default: false, base_cost: { RBiH: 9 } },
        ],
    },
    {
        id: 'arch_ohr_authority',
        label: 'OHR Authority',
        citation: 'Annex 10 — High Representative (Bonn Powers, 1997)',
        options: [
            { id: 'bonn_powers', label: 'Bonn Powers', is_default: true, base_cost: {} },
            { id: 'monitoring_only', label: 'Monitoring Only', is_default: false, base_cost: { RS: 10 } },
            { id: 'none', label: 'No OHR', is_default: false, base_cost: { RS: 16 } },
        ],
    },
] as const;

// ── DIMENSION 5 — return & justice (Annex 7 + ICTY) ──────────────────────────

export const RETURN_JUSTICE_CHOICES: readonly ConstitutionalChoice[] = [
    {
        // Annex 7 Art. I(1) GUARANTEED the full right of return: "All refugees and
        // displaced persons have the right freely to return to their homes of origin"
        // + property restitution/compensation. `full_right_of_return` is therefore the
        // TREATY option, not a deviation; `voluntary_only` is the AS-IMPLEMENTED 1995
        // reality (returns happened only voluntarily, the ethnic map stayed largely
        // frozen) and is the free in-game baseline — NOT the Annex-7 default.
        // (Verified against OHR primary text, Dayton Annex 7, Art. I(1).)
        id: 'rj_refugee_return',
        label: 'Refugee Return',
        citation: 'Annex 7 Art. I(1) guaranteed full right of return; baseline = as-implemented voluntary return',
        options: [
            { id: 'full_right_of_return', label: 'Full Right of Return (Annex 7 guarantee)', is_default: false, base_cost: { RS: 12, HRHB: 6 } },
            { id: 'voluntary_only', label: 'Voluntary Return Only (as implemented)', is_default: true, base_cost: {} },
            { id: 'frozen_lines', label: 'Frozen Lines', is_default: false, base_cost: { RBiH: 8 } },
        ],
    },
    {
        id: 'rj_icty_cooperation',
        label: 'ICTY Cooperation',
        citation: 'Annex 4 Art II(8) — cooperation with the ICTY',
        options: [
            { id: 'full', label: 'Full Cooperation', is_default: false, base_cost: { RS: 14 } },
            { id: 'conditional', label: 'Conditional Cooperation', is_default: true, base_cost: {} },
            // non_cooperation is FREE in capital, but the dysfunction index FLOORS the
            // condemnation component (peace_dysfunction.ts) — it can never lift a
            // locked rupture. Choosing it does not buy down the verdict.
            { id: 'non_cooperation', label: 'Non-Cooperation', is_default: false, base_cost: {} },
        ],
    },
] as const;

// ── Lookup + defaults ────────────────────────────────────────────────────────

const choiceMap = new Map<string, ConstitutionalChoice>();
for (const c of [...CONSTITUTIONAL_CHOICES, ...RETURN_JUSTICE_CHOICES]) choiceMap.set(c.id, c);

/** Get a constitutional or return/justice choice by id, or undefined. */
export function getConstitutionalChoiceById(id: string): ConstitutionalChoice | undefined {
    return choiceMap.get(id);
}

/** All DIMENSION-4 constitutional choices. */
export function getAllConstitutionalChoices(): readonly ConstitutionalChoice[] {
    return CONSTITUTIONAL_CHOICES;
}

/** All DIMENSION-5 return/justice choices. */
export function getAllReturnJusticeChoices(): readonly ConstitutionalChoice[] {
    return RETURN_JUSTICE_CHOICES;
}

/** The historical 1995 default option id for a choice, or undefined. */
export function getDefaultOptionId(choiceId: string): string | undefined {
    const choice = choiceMap.get(choiceId);
    return choice?.options.find(o => o.is_default)?.id;
}

// ── Cost (Phase-1 BASE, pre-dial) ────────────────────────────────────────────

/**
 * BASE (pre-dial) capital cost of a constitutional OR return/justice option to a
 * faction. **0 at the historical default** (only deviation charges) and 0 for any
 * faction not on the option's payer ledger. Phase 2 multiplies by the
 * `entity_autonomy` dial — do NOT apply it here.
 */
function optionCost(choice: ConstitutionalChoice, optionId: string, faction: string): number {
    const option = choice.options.find(o => o.id === optionId);
    if (!option) return 0;
    if (option.is_default) return 0; // historical default is free
    return (option.base_cost as Record<string, number>)[faction] ?? 0;
}

/** BASE (pre-dial) cost of a DIMENSION-4 constitutional choice to a faction. */
export function getConstitutionalCost(choiceId: string, optionId: string, faction: string): number {
    const choice = choiceMap.get(choiceId);
    if (!choice) return 0;
    return optionCost(choice, optionId, faction);
}

/** BASE (pre-dial) cost of a DIMENSION-5 return/justice choice to a faction. */
export function getReturnJusticeCost(choiceId: string, optionId: string, faction: string): number {
    const choice = choiceMap.get(choiceId);
    if (!choice) return 0;
    return optionCost(choice, optionId, faction);
}
