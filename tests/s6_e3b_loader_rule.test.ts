/**
 * §6 E3b loader rule (ruling 2026-11-17, signed 6/6): a war-crimes row whose trigger, or whose
 * prerequisites (transitively over `requires_events`), read a flag a response option writes
 * (or a `paramilitary_*` condition) must declare `authored_by_choice`; an authored row may not
 * carry a negative international_standing shift. Lane-lead decisions 2026-11-18: Ahmići is
 * `false`; the camps row's -10 sits on a closed, shrink-only allowlist until E3c strips it.
 */
import { describe, expect, it } from 'vitest';
import {
    AUTHORED_NEGATIVE_STANDING_ALLOWLIST,
    choiceWrittenFlags,
    findWarCrimeAuthorshipIssues,
    loadEventDefinitions,
    validateWarCrimeAuthorship,
} from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

const row = (partial: Record<string, unknown>): EventDefinition => ({
    trigger: { turn_min: 1 },
    effect: { kind: 'narrative', text: 'x' },
    ...partial,
}) as unknown as EventDefinition;

/** A decision whose options write the `goals` flag. */
const decision = row({
    id: 'goals_decision',
    response_options: [
        { id: 'hard', label: 'Hard', effects: [], sets_flags: { goals: 'hard' } },
        { id: 'soft', label: 'Soft', effects: [], sets_flags: { goals: 'soft' } },
    ],
});

const crime = (partial: Record<string, unknown>) => row({
    id: 'crime',
    effect: { kind: 'humanitarian_impact', faction: 'RS', war_crimes_delta: 1 },
    ...partial,
});

describe('choice-written flags', () => {
    it('collects every response option sets_flags key, and only those', () => {
        const rows = [decision, row({ id: 'event_level', sets_flags: { not_a_choice: true } })];
        expect([...choiceWrittenFlags(rows)].sort()).toEqual(['goals']);
    });
});

describe('an unclassified choice-dependent war-crimes row fails at load', () => {
    it('a trigger that reads a choice flag', () => {
        const rows = [decision, crime({ trigger: { turn_min: 2, condition: { type: 'flag_equals', flag: 'goals', value: 'hard' } } })];
        expect(() => validateWarCrimeAuthorship(rows)).toThrow(/crime \(reads goals\)/);
    });

    it('a negated read, and a prerequisite two steps up', () => {
        const negated = [decision, crime({ trigger: { condition: { type: 'not', condition: { type: 'flag_equals', flag: 'goals', value: 'soft' } } } })];
        expect(() => validateWarCrimeAuthorship(negated)).toThrow(/crime \(reads goals\)/);
        const chain = [
            decision,
            row({ id: 'gate', trigger: { condition: { type: 'flag_not_set', flag: 'goals' } } }),
            row({ id: 'middle', trigger: { requires_events: ['gate'] } }),
            crime({ trigger: { requires_events: ['middle'] } }),
        ];
        expect(() => validateWarCrimeAuthorship(chain)).toThrow(/crime \(reads goals via middle>gate\)/);
    });

    it('a paramilitary_* condition', () => {
        const rows = [crime({ trigger: { condition: { type: 'paramilitary_deployments_at_most', faction: 'RS', max: 0 } } })];
        expect(() => validateWarCrimeAuthorship(rows)).toThrow(/crime \(reads paramilitary_deployments_at_most\)/);
    });

    it('declaring true or false makes it load; a row reading no choice needs no field', () => {
        const trig = { condition: { type: 'flag_equals', flag: 'goals', value: 'hard' } };
        expect(() => validateWarCrimeAuthorship([decision, crime({ trigger: trig, authored_by_choice: true })])).not.toThrow();
        expect(() => validateWarCrimeAuthorship([decision, crime({ trigger: trig, authored_by_choice: false })])).not.toThrow();
        expect(() => validateWarCrimeAuthorship([decision, crime({ trigger: { condition: { type: 'flag_equals', flag: 'calendar', value: true } } })])).not.toThrow();
    });

    it('authored_by_choice is only for war-crimes rows', () => {
        expect(() => validateWarCrimeAuthorship([row({ id: 'plain', authored_by_choice: false })])).toThrow(/plain/);
    });
});

describe('an option-level war_crimes_delta is authored by default', () => {
    it('needs no classification and is reported as authored', () => {
        const rows = [row({
            id: 'option_crime',
            response_options: [{ id: 'order', label: 'Order', effects: [{ kind: 'humanitarian_impact', faction: 'RBiH', war_crimes_delta: 1 }] }],
        })];
        expect(() => validateWarCrimeAuthorship(rows)).not.toThrow();
        expect(findWarCrimeAuthorshipIssues(rows).authoredOptions).toEqual(['option_crime#order']);
    });

    it('fails with a negative international_standing shift on the same option', () => {
        const rows = [row({
            id: 'option_crime',
            response_options: [{
                id: 'order',
                label: 'Order',
                effects: [{ kind: 'humanitarian_impact', faction: 'RBiH', war_crimes_delta: 1 }],
                dimension_shifts: [{ faction: 'RBiH', dimension: 'international_standing', delta: -5 }],
            }],
        })];
        expect(() => validateWarCrimeAuthorship(rows)).toThrow(/option_crime#order/);
    });
});

describe('an authored row may not carry a negative international_standing shift', () => {
    it('fails at load', () => {
        const rows = [crime({ authored_by_choice: true, dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: -10 }] })];
        expect(() => validateWarCrimeAuthorship(rows)).toThrow(/negative international_standing.*crime/);
    });

    it('a non-authored row keeps its shift, and a positive or other-dimension shift is allowed', () => {
        expect(() => validateWarCrimeAuthorship([crime({ authored_by_choice: false, dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: -15 }] })])).not.toThrow();
        expect(() => validateWarCrimeAuthorship([crime({ authored_by_choice: true, dimension_shifts: [{ faction: 'RS', dimension: 'patron_confidence', delta: -5 }] })])).not.toThrow();
    });
});

describe('the shipped catalog', () => {
    const events = loadEventDefinitions(0);
    const issues = findWarCrimeAuthorshipIssues(events);

    it('loads, and the derived rule flags exactly three rows, each classified', () => {
        expect(issues.unclassified).toEqual([]);
        expect(issues.negativeStanding).toEqual([]);
        expect(issues.choiceDependent).toEqual([
            'ahmici_massacre_1993',
            'csq_accelerated_camps_discovery_1992',
            'un_hostage_crisis_1995',
        ]);
        const byId = new Map(events.map((e) => [e.id, e]));
        expect(byId.get('csq_accelerated_camps_discovery_1992')?.authored_by_choice).toBe(true);
        expect(byId.get('un_hostage_crisis_1995')?.authored_by_choice).toBe(false);
        expect(byId.get('ahmici_massacre_1993')?.authored_by_choice).toBe(false);
        expect(issues.authoredOptions).toEqual([]);
    });

    it('the negative-standing allowlist is closed and may only shrink: its one entry still matches', () => {
        expect([...AUTHORED_NEGATIVE_STANDING_ALLOWLIST]).toEqual(['csq_accelerated_camps_discovery_1992']);
        // E3c strips the camps row's own -10; this test then fails until the entry is removed.
        expect(issues.allowlisted).toEqual([...AUTHORED_NEGATIVE_STANDING_ALLOWLIST]);
    });
});
