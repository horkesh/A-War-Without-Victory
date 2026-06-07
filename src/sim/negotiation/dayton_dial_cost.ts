/**
 * Entity-autonomy DIAL cost logic — DIMENSION 2 master dial (Phase 2 of the Dayton
 * institutional-architecture expansion, build spec
 * docs/plans/2026-06-07-dayton-institutional-expansion-build-spec.md §1.2/§1.3).
 *
 * The dial (`confederation | dayton-historical | federalized | unitary`) is the
 * master frame the player declares at the table. It has TWO cost effects:
 *
 *   (a) a one-time DECLARATION cost — the political price of choosing a frame other
 *       than the historical Dayton settlement. Charged to the faction the frame
 *       extracts from (an entity-ward frame costs RBiH; a state-ward frame costs RS).
 *
 *   (b) a deviation MULTIPLIER `m_dev` applied to EVERY Dim-3 (competency) and Dim-4
 *       (constitutional) sub-choice BASE cost. Choosing a sub-choice that runs
 *       AGAINST the declared frame (cross-grain) is dear; a sub-choice that runs
 *       WITH the frame is discounted. The dayton-historical frame is neutral (×1.0
 *       everywhere, 0 declaration) — so the historical-default proposal is exactly
 *       the Phase-1 BASE cost and the all-default settlement stays byte-identical.
 *
 * `finalCost = base(getCompetencyCost / getConstitutionalCost) × dialMultiplier`.
 *
 * Anti-power-fantasy gate (§1.3): `reachableOptions` / `isOptionReachable` marks the
 * options a faction's earned capital cannot afford under the declared dial. A
 * losing-capital faction literally cannot reach `unitary` + sovereign-core flips —
 * the budget is earned in the war, not entered at the table. Phase 3 (UI) consumes
 * this predicate to lock unaffordable controls.
 *
 * Determinism: constant tables, integer-rounded cost, no RNG/clock, sorted iteration.
 */

import type { EntityAutonomySetting } from '../../state/negotiation_types.js';
import {
    getCompetencyById,
    getCompetencyCost,
    COMPETENCY_PACKAGES,
    type CompetencyOwner,
} from './competency_packages.js';
import {
    getConstitutionalCost,
    getReturnJusticeCost,
    getConstitutionalChoiceById,
    CONSTITUTIONAL_CHOICES,
    RETURN_JUSTICE_CHOICES,
} from './constitutional_packages.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── (a) One-time DECLARATION cost ─────────────────────────────────────────────
//
// Choosing a frame other than the historical Dayton settlement costs the faction
// that the frame extracts sovereignty from. An entity-ward frame (confederation)
// pushes sovereignty DOWN to the entities → it costs RBiH (the central-state side).
// A state-ward frame (federalized / unitary) pulls sovereignty UP to the state →
// it costs RS (the entity side). dayton-historical is the free baseline (0).

/** Who the declaration charges, and how much (the political price of the frame). */
interface DialDeclaration {
    cost: number;
    payer: 'RBiH' | 'RS' | null;
}

const DIAL_DECLARATION: Readonly<Record<EntityAutonomySetting, DialDeclaration>> = Object.freeze({
    // entity-ward frame → costs RBiH (the central-state advocate concedes a weaker state).
    confederation: { cost: 12, payer: 'RBiH' },
    // historical baseline — free.
    'dayton-historical': { cost: 0, payer: null },
    // state-ward frames → cost RS (the entity concedes autonomy to the state).
    federalized: { cost: 14, payer: 'RS' },
    unitary: { cost: 24, payer: 'RS' },
});

/**
 * One-time DECLARATION capital cost of the entity-autonomy dial to a faction.
 * 0 for the historical baseline and for any faction not on the payer side. HRHB
 * pays floor(cost*0.5) as the swing faction (mirrors the competency model). Pure.
 */
export function getDialDeclarationCost(dial: EntityAutonomySetting, faction: string): number {
    const decl = DIAL_DECLARATION[dial] ?? DIAL_DECLARATION['dayton-historical'];
    if (decl.cost <= 0 || decl.payer === null) return 0;
    if (faction === decl.payer) return decl.cost;
    if (faction === 'HRHB') return Math.floor(decl.cost * 0.5);
    return 0;
}

// ── (b) Deviation MULTIPLIER `m_dev` ──────────────────────────────────────────
//
// Cross-grain = the sub-choice runs AGAINST the declared frame (e.g. an entity-ward
// competency flip under a unitary dial, or a state-ward flip under confederation).
// With-grain = the sub-choice runs WITH the frame (discounted). dayton-historical is
// neutral (1.0 everywhere). Magnitudes per the build spec §1.2.

interface DialMultiplierPair {
    /** Multiplier for a choice that runs AGAINST the dial's grain (expensive). */
    cross: number;
    /** Multiplier for a choice that runs WITH the dial's grain (discounted). */
    with: number;
}

const DIAL_MULTIPLIERS: Readonly<Record<EntityAutonomySetting, DialMultiplierPair>> = Object.freeze({
    confederation: { cross: 2.0, with: 0.5 },
    'dayton-historical': { cross: 1.0, with: 1.0 },
    federalized: { cross: 1.6, with: 0.7 },
    unitary: { cross: 2.2, with: 0.6 },
});

/**
 * The grain of the DIAL itself: which way the frame pushes sovereignty.
 *   - confederation / federalized → ENTITY-ward (devolve toward the entities).
 *   - unitary                     → STATE-ward (centralize toward the state).
 *   - dayton-historical           → neutral.
 */
type Grain = 'entity_ward' | 'state_ward' | 'neutral';

function dialGrain(dial: EntityAutonomySetting): Grain {
    if (dial === 'unitary') return 'state_ward';
    if (dial === 'confederation' || dial === 'federalized') return 'entity_ward';
    return 'neutral';
}

/**
 * The grain of a sub-CHOICE: which way the individual selection pushes sovereignty.
 * Used to test cross/with-grain against the dial. A `neutral` choice (default, or a
 * shared/arbitrated allocation) gets the neutral ×1.0 multiplier.
 */
function competencyChoiceGrain(choice: CompetencyOwner): Grain {
    if (choice === 'entity') return 'entity_ward';
    if (choice === 'state') return 'state_ward';
    return 'neutral'; // shared
}

// Constitutional / return-justice options classified by the sovereignty grain they
// express. Entity-ward = protects entity/group blocking power & supervised gridlock;
// state-ward = centralizes / civic-majoritarian. Defaults are neutral (free anyway).
const CONSTITUTIONAL_OPTION_GRAIN: Readonly<Record<string, Grain>> = Object.freeze({
    // arch_presidency
    tripartite_rotating: 'neutral', // historical default
    collective_civic: 'state_ward',
    single_elected: 'state_ward',
    // arch_veto_regime
    vital_interest_entity: 'neutral', // default
    weighted_majority: 'state_ward',
    simple_majority: 'state_ward',
    // arch_constituent_model
    three_peoples: 'neutral', // default
    civic_citizens: 'state_ward',
    // arch_const_court
    international_judges: 'neutral', // default
    domestic_only: 'state_ward', // removing international tutelage centralizes domestic control
    // arch_ohr_authority
    bonn_powers: 'neutral', // default
    monitoring_only: 'state_ward',
    none: 'state_ward',
    // rj_refugee_return
    voluntary_only: 'neutral', // default
    full_right_of_return: 'state_ward', // unwinds the frozen ethnic map (un-partitions)
    frozen_lines: 'entity_ward', // ratifies the partition
    // rj_icty_cooperation
    conditional: 'neutral', // default
    full: 'state_ward',
    non_cooperation: 'entity_ward',
});

function optionGrain(optionId: string): Grain {
    return CONSTITUTIONAL_OPTION_GRAIN[optionId] ?? 'neutral';
}

/**
 * The deviation multiplier `m_dev` for a sub-choice of the given grain under the
 * declared dial. A neutral dial or a neutral choice is always ×1.0. A choice WITH
 * the dial grain is discounted; a choice AGAINST it is expensive. Pure.
 */
function dialMultiplierForGrain(dial: EntityAutonomySetting, choiceGrain: Grain): number {
    const grain = dialGrain(dial);
    if (grain === 'neutral' || choiceGrain === 'neutral') return 1.0;
    const pair = DIAL_MULTIPLIERS[dial] ?? DIAL_MULTIPLIERS['dayton-historical'];
    return choiceGrain === grain ? pair.with : pair.cross;
}

// ── Final (post-dial) costs ───────────────────────────────────────────────────

/**
 * Final (post-dial) capital cost of a competency allocation: the Phase-1 BASE cost
 * × the dial deviation multiplier. 0 at the historical default (base is 0). Pure.
 * Integer-rounded so the all-default path (base 0 × any mult = 0) is byte-identical.
 */
export function finalCompetencyCost(
    compId: string,
    choice: CompetencyOwner,
    faction: string,
    dial: EntityAutonomySetting,
): number {
    const comp = getCompetencyById(compId);
    if (!comp) return 0;
    const base = getCompetencyCost(comp, choice, faction);
    if (base === 0) return 0;
    const mult = dialMultiplierForGrain(dial, competencyChoiceGrain(choice));
    return Math.round(base * mult);
}

/**
 * Final (post-dial) capital cost of a DIMENSION-4 constitutional option: BASE × dial
 * multiplier. 0 at the historical default. Pure & deterministic.
 */
export function finalConstitutionalCost(
    choiceId: string,
    optionId: string,
    faction: string,
    dial: EntityAutonomySetting,
): number {
    const base = getConstitutionalCost(choiceId, optionId, faction);
    if (base === 0) return 0;
    const mult = dialMultiplierForGrain(dial, optionGrain(optionId));
    return Math.round(base * mult);
}

/**
 * Final (post-dial) capital cost of a DIMENSION-5 return/justice option: BASE × dial
 * multiplier. 0 at the historical default. Pure & deterministic.
 */
export function finalReturnJusticeCost(
    choiceId: string,
    optionId: string,
    faction: string,
    dial: EntityAutonomySetting,
): number {
    const base = getReturnJusticeCost(choiceId, optionId, faction);
    if (base === 0) return 0;
    const mult = dialMultiplierForGrain(dial, optionGrain(optionId));
    return Math.round(base * mult);
}

// ── Capital-bounded reachability (the anti-power-fantasy gate, §1.3) ───────────

/** A single reachable/unreachable option for a faction under a declared dial. */
export interface ReachableOption {
    /** Dimension this option belongs to. */
    dimension: 'competency' | 'constitutional' | 'return_justice';
    /** The choice/slot id (e.g. comp_defense, arch_presidency). */
    choice_id: string;
    /** The option/owner id (e.g. state, single_elected). */
    option_id: string;
    /** Final (post-dial) cost of this option to the faction. */
    cost: number;
    /** True when the faction's available capital covers the option's cost. */
    reachable: boolean;
}

/**
 * Whether a faction's available (earned) capital can afford a single option under
 * the declared dial. The historical default (cost 0) is always reachable. A
 * losing-capital faction cannot reach the most sovereign flips — exactly the
 * anti-power-fantasy guardrail. Pure.
 */
export function isOptionReachable(
    dimension: 'competency' | 'constitutional' | 'return_justice',
    choiceId: string,
    optionId: string,
    faction: string,
    capital: number,
    dial: EntityAutonomySetting,
): boolean {
    const cost = optionCostFor(dimension, choiceId, optionId, faction, dial);
    return cost <= Math.max(0, capital);
}

function optionCostFor(
    dimension: 'competency' | 'constitutional' | 'return_justice',
    choiceId: string,
    optionId: string,
    faction: string,
    dial: EntityAutonomySetting,
): number {
    if (dimension === 'competency') {
        return finalCompetencyCost(choiceId, optionId as CompetencyOwner, faction, dial);
    }
    if (dimension === 'constitutional') {
        return finalConstitutionalCost(choiceId, optionId, faction, dial);
    }
    return finalReturnJusticeCost(choiceId, optionId, faction, dial);
}

/**
 * Enumerate every Dim-3/4/5 option for a faction under the declared dial, marking
 * which the faction's earned capital can reach. Deterministic: sorted by dimension,
 * then choice id, then option id. Phase 3 (UI) consumes this to lock unaffordable
 * controls; the resolution layer uses `isOptionReachable` to validate a proposal.
 */
export function reachableOptions(
    faction: string,
    capital: number,
    dial: EntityAutonomySetting,
): ReachableOption[] {
    const out: ReachableOption[] = [];

    // DIMENSION 3 — every competency × every non-default owner.
    const OWNERS: CompetencyOwner[] = ['state', 'entity', 'shared'];
    for (const comp of [...COMPETENCY_PACKAGES].sort((a, b) => strictCompare(a.id, b.id))) {
        for (const owner of OWNERS) {
            if (owner === comp.default_owner) continue;
            const cost = finalCompetencyCost(comp.id, owner, faction, dial);
            out.push({ dimension: 'competency', choice_id: comp.id, option_id: owner, cost, reachable: cost <= Math.max(0, capital) });
        }
    }

    // DIMENSION 4 — every constitutional non-default option.
    for (const choice of [...CONSTITUTIONAL_CHOICES].sort((a, b) => strictCompare(a.id, b.id))) {
        for (const opt of choice.options) {
            if (opt.is_default) continue;
            const cost = finalConstitutionalCost(choice.id, opt.id, faction, dial);
            out.push({ dimension: 'constitutional', choice_id: choice.id, option_id: opt.id, cost, reachable: cost <= Math.max(0, capital) });
        }
    }

    // DIMENSION 5 — every return/justice non-default option.
    for (const choice of [...RETURN_JUSTICE_CHOICES].sort((a, b) => strictCompare(a.id, b.id))) {
        for (const opt of choice.options) {
            if (opt.is_default) continue;
            const cost = finalReturnJusticeCost(choice.id, opt.id, faction, dial);
            out.push({ dimension: 'return_justice', choice_id: choice.id, option_id: opt.id, cost, reachable: cost <= Math.max(0, capital) });
        }
    }

    return out;
}

// ── Lookup re-exports for callers that only need the choice metadata ──────────
export { getConstitutionalChoiceById };
