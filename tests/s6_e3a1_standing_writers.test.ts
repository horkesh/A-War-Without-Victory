/**
 * §6 E3a1 engine hygiene (ruling 2026-11-17): one accumulator rule, one base owner,
 * one source for the peace-plan lists.
 *
 * D1: every event_modifier writer goes through applyDimensionShift, with no ±100 clamp.
 * D2: computeDimensionBaseValues is the single writer of international_standing base_value;
 *     the paramilitary-finding penalty ADDS to war_crimes_events × 10, never replaces it.
 * D3: resolvePeacePlan no longer pushes capital.peace_plans_accepted/rejected; the lists are
 *     rebuilt from peace_plan_history.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type { NegotiationState } from '../src/state/negotiation_types.js';
import { createDefaultPatronRelationship, createEmptyCapital } from '../src/state/negotiation_types.js';
import {
    computeDimensionBaseValues,
    computeInternationalStandingBase,
    derivePeacePlanResponseLists,
    initializeStrategicDimensions,
} from '../src/sim/events/strategic_dimensions.js';
import { computeNegotiationBreakdown } from '../src/sim/negotiation/compute_capital.js';
import { applyPatronEvent, SREBRENICA_AFTERMATH } from '../src/sim/negotiation/patron_events.js';
import { resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';

const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

function makeNegotiation(): NegotiationState {
    const capital: NegotiationState['capital'] = {};
    const patron_relationships: NegotiationState['patron_relationships'] = {};
    for (const faction of FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }
    return { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() };
}

function makeState(neg: NegotiationState, extra: { annotations?: unknown[]; turn?: number } = {}): GameState {
    return {
        meta: { turn: extra.turn ?? 50, phase: 'war', seed: 1, date: '1993-03-01', war_start_turn: 0, player_faction: 'RBiH' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: neg,
            ...(extra.annotations ? { cost_ledger_annotations: extra.annotations } : {}),
        },
        political: { political_controllers: {}, war_alliance_rbih_hrhb: 1 },
        displacement: {},
    } as unknown as GameState;
}

function midFinding(faction: FactionId, deployments: number, turn = 20) {
    return {
        event_id: `cost_war_crimes_findings_${faction}`,
        tag: 'paramilitary_war_crimes_mid',
        text: `deployment_count=${deployments}`,
        turn,
        faction,
    };
}

describe('§6 E3a1 D2: the paramilitary finding adds to the war-crimes term', () => {
    // The measured main case: RBiH, 5 war crimes, mid finding at 5 deployments (penalty 20),
    // civCas 3150 (−0.63), two plans accepted (+20), one rejected (−15). Main replaced the
    // −50 war-crimes term with −20 and landed at 34.37: the sweeps had raised the base.
    function measuredCaseNegotiation(warCrimes: number): NegotiationState {
        const neg = makeNegotiation();
        neg.capital.RBiH.war_crimes_events = warCrimes;
        neg.capital.RBiH.civilian_casualties_caused = 3150;
        neg.peace_plan_history = [
            { plan_id: 'vance_owen', turn_offered: 39, responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }, resolved: true },
            { plan_id: 'owen_stoltenberg', turn_offered: 70, responses: { RBiH: 'rejected', RS: 'accepted', HRHB: 'accepted' }, resolved: true },
            { plan_id: 'contact_group', turn_offered: 118, responses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' }, resolved: true },
        ];
        return neg;
    }

    it.each([0, 1, 2, 5])('a sweep with a finding never raises the standing base (war crimes = %i)', (warCrimes) => {
        const without = makeState(measuredCaseNegotiation(warCrimes));
        const withFinding = makeState(measuredCaseNegotiation(warCrimes), { annotations: [midFinding('RBiH', 5)] });
        const storeWithout = without.military.negotiation!.strategic_dimensions!;
        const storeWith = withFinding.military.negotiation!.strategic_dimensions!;
        computeDimensionBaseValues(storeWithout, without, 'RBiH');
        computeDimensionBaseValues(storeWith, withFinding, 'RBiH');

        const baseWithout = storeWithout.RBiH.international_standing.base_value;
        const baseWith = storeWith.RBiH.international_standing.base_value;
        expect(baseWith).toBeLessThanOrEqual(baseWithout);
        // Exact additive form: the finding subtracts its 20 points on top of war crimes × 10.
        const expectedWithout = Math.max(0, Math.min(100, 50 - warCrimes * 10 - 0.63 + 20 - 15));
        expect(baseWithout).toBeCloseTo(expectedWithout, 10);
        expect(baseWith).toBeCloseTo(Math.max(0, expectedWithout - 20), 10);
    });

    it('the measured RBiH case no longer lands at 34.37', () => {
        const state = makeState(measuredCaseNegotiation(5), { annotations: [midFinding('RBiH', 5)] });
        // 50 − 50 − 20 − 0.63 + 20 − 15 = −15.63 → clamped to 0 (main: 34.37).
        expect(computeInternationalStandingBase(state, 'RBiH')).toBe(0);
    });
});

describe('§6 E3a1 D1: one accumulator rule, no clamp on event_modifier', () => {
    it('RS at event_modifier −110 receiving a −30 patron humanitarian delta ends at −140', () => {
        const neg = makeNegotiation();
        neg.strategic_dimensions!.RS.international_standing = { base_value: 20, event_modifier: -110, effective_value: 0 };
        const state = makeState(neg, { turn: SREBRENICA_AFTERMATH.trigger_week });

        applyPatronEvent(state, SREBRENICA_AFTERMATH);

        expect(neg.strategic_dimensions!.RS.international_standing.event_modifier).toBe(-140);
        expect(neg.strategic_dimensions!.RS.international_standing.effective_value).toBe(0);
    });

    it('a peace-plan rejection at event_modifier +176 subtracts exactly its delta (no −76 jump)', () => {
        const neg = makeNegotiation();
        neg.strategic_dimensions!.RBiH.international_standing = { base_value: 40, event_modifier: 176, effective_value: 100 };
        neg.pending_peace_plan = { plan_id: 'contact_group', turn_offered: 118, bot_responses: { RS: 'rejected', HRHB: 'accepted' } };
        const state = makeState(neg, { turn: 118 });
        const delta = getPeacePlanById('contact_group')!.credibility_change_on_reject!.RBiH!;
        expect(delta).toBeLessThan(0);

        resolvePeacePlan(state, 'contact_group', 'rejected');

        expect(neg.strategic_dimensions!.RBiH.international_standing.event_modifier).toBe(176 + delta);
        expect(neg.strategic_dimensions!.RBiH.international_standing.effective_value).toBe(100);
    });
});

describe('§6 E3a1 D2: one writer of international_standing base_value', () => {
    function listSourceFiles(dir: string, out: string[] = []): string[] {
        for (const name of readdirSync(dir).sort()) {
            const full = join(dir, name);
            if (statSync(full).isDirectory()) listSourceFiles(full, out);
            else if (/\.(ts|tsx|cjs|mjs|js)$/.test(name)) out.push(full);
        }
        return out;
    }

    it('only computeDimensionBaseValues writes a base_value for international_standing (static scan of src/)', () => {
        const directBaseWrites: string[] = [];
        const standingBaseCalls: string[] = [];
        for (const file of listSourceFiles('src')) {
            const rel = relative('.', file).replace(/\\/g, '/');
            const lines = readFileSync(file, 'utf8').split(/\r?\n/);
            lines.forEach((line, i) => {
                if (/\bbase_value\s*(?:[+\-*/]?=)(?!=)/.test(line)) directBaseWrites.push(`${rel}:${i + 1}`);
                if (/updateBaseValue\([^)]*['"]international_standing['"]/.test(line)) standingBaseCalls.push(`${rel}:${i + 1}`);
            });
        }
        // The only direct base_value assignment is inside updateBaseValue itself.
        expect(directBaseWrites).toHaveLength(1);
        expect(directBaseWrites[0]).toMatch(/^src\/sim\/events\/strategic_dimensions\.ts:/);
        // ...and the only updateBaseValue call for international_standing is in computeDimensionBaseValues.
        expect(standingBaseCalls).toHaveLength(1);
        expect(standingBaseCalls[0]).toMatch(/^src\/sim\/events\/strategic_dimensions\.ts:/);
        const source = readFileSync('src/sim/events/strategic_dimensions.ts', 'utf8');
        const fnStart = source.indexOf('export function computeDimensionBaseValues(');
        const fnEnd = source.indexOf('\n}\n', fnStart);
        expect(source.slice(fnStart, fnEnd)).toContain("updateBaseValue(store, faction, 'international_standing'");
    });

    it('computeNegotiationBreakdown no longer writes the standing base (structural)', () => {
        const neg = makeNegotiation();
        neg.capital.RS.war_crimes_events = 7;
        neg.strategic_dimensions!.RS.international_standing = { base_value: 33, event_modifier: -4, effective_value: 29 };
        const state = makeState(neg, { annotations: [midFinding('RS', 5)] });

        computeNegotiationBreakdown(state);

        expect(neg.strategic_dimensions!.RS.international_standing).toEqual({ base_value: 33, event_modifier: -4, effective_value: 29 });
    });
});

describe('§6 E3a1 D3: peace_plan_history is the single source of the plan lists', () => {
    it('resolvePeacePlan pushes nothing; the rebuild equals the history-derived lists', () => {
        const neg = makeNegotiation();
        neg.pending_peace_plan = { plan_id: 'vance_owen', turn_offered: 39, bot_responses: { RS: 'rejected', HRHB: 'accepted' } };
        const state = makeState(neg, { turn: 39 });

        resolvePeacePlan(state, 'vance_owen', 'accepted');

        // No pushes at resolution.
        for (const faction of FACTIONS) {
            expect(neg.capital[faction].peace_plans_accepted).toEqual([]);
            expect(neg.capital[faction].peace_plans_rejected).toEqual([]);
        }

        computeNegotiationBreakdown(state);

        for (const faction of FACTIONS) {
            const derived = derivePeacePlanResponseLists(neg.peace_plan_history, faction);
            expect(neg.capital[faction].peace_plans_accepted).toEqual(derived.accepted);
            expect(neg.capital[faction].peace_plans_rejected).toEqual(derived.rejected);
        }
        expect(neg.capital.RBiH.peace_plans_accepted).toEqual(['vance_owen']);
        expect(neg.capital.HRHB.peace_plans_accepted).toEqual(['vance_owen']);
        expect(neg.capital.RS.peace_plans_rejected).toEqual(['vance_owen']);
    });

    it('the standing base counts a just-resolved plan before any rebuild runs', () => {
        const neg = makeNegotiation();
        neg.pending_peace_plan = { plan_id: 'vance_owen', turn_offered: 39, bot_responses: { RS: 'rejected', HRHB: 'accepted' } };
        const state = makeState(neg, { turn: 39 });

        resolvePeacePlan(state, 'vance_owen', 'accepted');
        computeDimensionBaseValues(neg.strategic_dimensions!, state, 'RBiH');
        computeDimensionBaseValues(neg.strategic_dimensions!, state, 'RS');

        expect(neg.strategic_dimensions!.RBiH.international_standing.base_value).toBe(60);
        expect(neg.strategic_dimensions!.RS.international_standing.base_value).toBe(35);
    });
});
