import assert from 'node:assert';
import { test } from 'node:test';
import {
    deriveOrganizationalPenetrationFromFormula,
    ORG_PEN_FORMULA_CONSTANTS,
    type OrganizationalPenetrationFormulaInputs
} from '../src/state/organizational_penetration_formula.js';

function makeInputs(
    overrides: Partial<OrganizationalPenetrationFormulaInputs> = {}
): OrganizationalPenetrationFormulaInputs {
    return {
        controller: 'RBiH',
        aligned_population_share_by_faction: { RBiH: 0.5, RS: 0.25, HRHB: 0.25 },
        planned_war_start_brigade_by_faction: { RBiH: true, RS: false, HRHB: false },
        ...overrides
    };
}

test('formula is deterministic for identical inputs', () => {
    const inputs = makeInputs();
    const a = deriveOrganizationalPenetrationFromFormula(inputs);
    const b = deriveOrganizationalPenetrationFromFormula(inputs);
    assert.deepStrictEqual(a, b);
});

test('A+B+C boosts party penetration for matching faction', () => {
    const allSignals = deriveOrganizationalPenetrationFromFormula(
        makeInputs({
            controller: 'RS',
            aligned_population_share_by_faction: { RBiH: 0.2, RS: 0.7, HRHB: 0.1 },
            planned_war_start_brigade_by_faction: { RBiH: false, RS: true, HRHB: false }
        })
    );
    const noSignals = deriveOrganizationalPenetrationFromFormula(
        makeInputs({
            controller: 'RBiH',
            aligned_population_share_by_faction: { RBiH: 0.2, RS: 0.2, HRHB: 0.2 },
            planned_war_start_brigade_by_faction: { RBiH: false, RS: false, HRHB: false }
        })
    );

    assert.ok((allSignals.sds_penetration ?? 0) > (noSignals.sds_penetration ?? 0));
    assert.strictEqual(
        allSignals.sds_penetration,
        ORG_PEN_FORMULA_CONSTANTS.party.base +
        ORG_PEN_FORMULA_CONSTANTS.party.mayor_bonus +
        ORG_PEN_FORMULA_CONSTANTS.party.population_bonus +
        ORG_PEN_FORMULA_CONSTANTS.party.brigade_bonus
    );
});

test('B+C drives paramilitary variance by faction', () => {
    const withSignals = deriveOrganizationalPenetrationFromFormula(
        makeInputs({
            controller: 'HRHB',
            aligned_population_share_by_faction: { RBiH: 0.2, RS: 0.2, HRHB: 0.6 },
            planned_war_start_brigade_by_faction: { RBiH: false, RS: false, HRHB: true }
        })
    );
    const withoutSignals = deriveOrganizationalPenetrationFromFormula(
        makeInputs({
            controller: 'HRHB',
            aligned_population_share_by_faction: { RBiH: 0.2, RS: 0.2, HRHB: 0.2 },
            planned_war_start_brigade_by_faction: { RBiH: false, RS: false, HRHB: false }
        })
    );

    assert.ok((withSignals.paramilitary_hrhb ?? 0) > (withoutSignals.paramilitary_hrhb ?? 0));
    assert.ok((withSignals.paramilitary_hrhb ?? 0) <= ORG_PEN_FORMULA_CONSTANTS.paramilitary.max);
});

test('police loyalty and TO control derive from controller-side B+C', () => {
    const strongController = deriveOrganizationalPenetrationFromFormula(
        makeInputs({
            controller: 'RBiH',
            aligned_population_share_by_faction: { RBiH: 0.8, RS: 0.1, HRHB: 0.1 },
            planned_war_start_brigade_by_faction: { RBiH: true, RS: false, HRHB: false }
        })
    );
    const weakController = deriveOrganizationalPenetrationFromFormula(
        makeInputs({
            controller: 'RBiH',
            aligned_population_share_by_faction: { RBiH: 0.1, RS: 0.45, HRHB: 0.45 },
            planned_war_start_brigade_by_faction: { RBiH: false, RS: false, HRHB: false }
        })
    );

    assert.strictEqual(strongController.police_loyalty, 'loyal');
    assert.strictEqual(strongController.to_control, 'controlled');
    assert.strictEqual(weakController.police_loyalty, 'hostile');
    assert.strictEqual(weakController.to_control, 'lost');
});
