/**
 * Dayton institutional-expansion Phase 3 — pure helper unit tests for
 * DaytonInstitutionalDimensions (the 5-dimension negotiation surface).
 *
 * Two load-bearing guarantees are pinned here:
 *  (1) `computeInstitutionalCost` is 0 for the all-historical default selection for
 *      EVERY faction — the byte-identity contract (an untouched settlement spends 0,
 *      40w stays byte-identical). For a deviation, it is PINNED to the engine: it
 *      must equal the exact sum of the authoritative Phase-1/2 cost functions
 *      (finalCompetencyCost / finalConstitutionalCost / finalReturnJusticeCost /
 *      getDialDeclarationCost), so the UI helper cannot silently drift from canon.
 *  (2) `buildInstitutionalProposalFields` emits NO new keys at the default selection
 *      (byte-identity of the proposal shape), and attaches each dimension field only
 *      when it is set non-default.
 */
import { describe, it, expect } from 'vitest';
import {
    computeInstitutionalCost,
    buildInstitutionalProposalFields,
    defaultInstitutionalSelections,
    type InstitutionalSelections,
} from '../../src/ui/map/components/DaytonInstitutionalDimensions';
import {
    finalCompetencyCost,
    finalConstitutionalCost,
    finalReturnJusticeCost,
    getDialDeclarationCost,
} from '../../src/sim/negotiation/dayton_dial_cost';
import { COMPETENCY_PACKAGES } from '../../src/sim/negotiation/competency_packages';
import {
    CONSTITUTIONAL_CHOICES,
    RETURN_JUSTICE_CHOICES,
} from '../../src/sim/negotiation/constitutional_packages';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

/**
 * Re-derive the total cost from the raw engine functions (the spec the helper must
 * match), independently of the helper's own loop, so the test is a real cross-check.
 */
function engineSum(sel: InstitutionalSelections, faction: string): number {
    let total = getDialDeclarationCost(sel.dial, faction);
    for (const comp of COMPETENCY_PACKAGES) {
        const owner = sel.competency[comp.id] ?? comp.default_owner;
        total += finalCompetencyCost(comp.id, owner, faction, sel.dial);
    }
    for (const choice of CONSTITUTIONAL_CHOICES) {
        const opt = sel.constitutional[choice.id] ?? choice.options.find((o) => o.is_default)!.id;
        total += finalConstitutionalCost(choice.id, opt, faction, sel.dial);
    }
    for (const choice of RETURN_JUSTICE_CHOICES) {
        const opt = sel.returnJustice[choice.id] ?? choice.options.find((o) => o.is_default)!.id;
        total += finalReturnJusticeCost(choice.id, opt, faction, sel.dial);
    }
    return total;
}

describe('computeInstitutionalCost — byte-identity + engine pinning', () => {
    it('returns 0 for the all-historical default for every faction', () => {
        const def = defaultInstitutionalSelections();
        for (const faction of FACTIONS) {
            expect(computeInstitutionalCost(def, faction)).toBe(0);
        }
    });

    it('returns 0 when faction is null/undefined (no payer)', () => {
        const def = defaultInstitutionalSelections();
        expect(computeInstitutionalCost(def, null)).toBe(0);
        expect(computeInstitutionalCost(def, undefined)).toBe(0);
    });

    it('equals the sum of the authoritative engine cost functions for a deviation', () => {
        // dial=unitary (state-ward declaration) + a state-ward competency flip + a
        // state-ward constitutional flip — exercises declaration + Dim-3 + Dim-4 and
        // the post-dial multiplier on each.
        const sel: InstitutionalSelections = {
            dial: 'unitary',
            competency: { comp_defense: 'state' },
            constitutional: { arch_presidency: 'single_elected' },
            returnJustice: {},
        };
        for (const faction of FACTIONS) {
            expect(computeInstitutionalCost(sel, faction)).toBe(engineSum(sel, faction));
        }
    });

    it('matches the engine across an entity-ward (confederation) deviation incl. Dim-5', () => {
        const sel: InstitutionalSelections = {
            dial: 'confederation',
            competency: { comp_police: 'entity', comp_education: 'shared' },
            constitutional: { arch_const_court: 'domestic_only' },
            returnJustice: { rj_refugee_return: 'frozen_lines' },
        };
        for (const faction of FACTIONS) {
            expect(computeInstitutionalCost(sel, faction)).toBe(engineSum(sel, faction));
        }
    });

    it('the post-dial cost actually differs from the neutral (dayton-historical) cost', () => {
        // Sanity: the dial multiplier is live, not a no-op. A state-ward flip is
        // discounted under unitary vs. the neutral historical frame.
        const flip: Pick<InstitutionalSelections, 'competency' | 'constitutional' | 'returnJustice'> = {
            competency: { comp_defense: 'state' },
            constitutional: {},
            returnJustice: {},
        };
        const neutral = computeInstitutionalCost({ dial: 'dayton-historical', ...flip }, 'RS');
        const unitary = computeInstitutionalCost({ dial: 'unitary', ...flip }, 'RS');
        // declaration adds cost under unitary, but the with-grain discount on the flip
        // means the two are NOT equal — proving the multiplier is wired through.
        expect(unitary).not.toBe(neutral);
    });
});

describe('buildInstitutionalProposalFields — byte-identity proposal shape', () => {
    it('returns {} (no new keys) for the all-historical default', () => {
        expect(buildInstitutionalProposalFields(defaultInstitutionalSelections())).toEqual({});
    });

    it('attaches entity_autonomy only when the dial is non-default', () => {
        expect(
            buildInstitutionalProposalFields({ ...defaultInstitutionalSelections(), dial: 'unitary' }),
        ).toEqual({ entity_autonomy: 'unitary' });
        // dayton-historical (the default) must NOT emit the key.
        expect(
            buildInstitutionalProposalFields({ ...defaultInstitutionalSelections(), dial: 'dayton-historical' }),
        ).toEqual({});
    });

    it('attaches each dimension field only when set non-default', () => {
        const sel: InstitutionalSelections = {
            dial: 'federalized',
            competency: { comp_defense: 'state' },
            constitutional: { arch_presidency: 'single_elected' },
            returnJustice: { rj_icty_cooperation: 'full' },
        };
        expect(buildInstitutionalProposalFields(sel)).toEqual({
            entity_autonomy: 'federalized',
            competency_allocation: { comp_defense: 'state' },
            constitutional_choices: { arch_presidency: 'single_elected' },
            return_justice: { rj_icty_cooperation: 'full' },
        });
    });

    it('omits the empty maps (a dial-only deviation carries no Dim-3/4/5 keys)', () => {
        const out = buildInstitutionalProposalFields({
            ...defaultInstitutionalSelections(),
            dial: 'confederation',
        });
        expect(out).toEqual({ entity_autonomy: 'confederation' });
        expect(out).not.toHaveProperty('competency_allocation');
        expect(out).not.toHaveProperty('constitutional_choices');
        expect(out).not.toHaveProperty('return_justice');
    });
});
