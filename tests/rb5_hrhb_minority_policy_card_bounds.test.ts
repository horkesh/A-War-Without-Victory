// RB5 ruling item 6 (B1 disclosure): the halt card states static estimates (people, share, killed,
// abroad, municipalities, war-crime record, standing delta) measured on the headless run of main
// 09b4d7f53 (both modes identical: 23,746 people in 11 municipalities, 695 killed, 6,325 abroad, one
// war crime). This bounds test recomputes what can be recomputed from the scope table, the 1991
// census and the engine constants, and fails if the card's numbers leave those bounds.
import fs from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
    BILATERAL_KILL_FRACTION,
    MINORITY_POLICY_CARD_ID_BY_FACTION,
    POLICY_EXPULSION_SCOPE,
} from '../src/state/displacement_takeover.js';
import { computeInternationalStandingBase } from '../src/sim/events/strategic_dimensions.js';

const CARD_ID = MINORITY_POLICY_CARD_ID_BY_FACTION.HRHB!;
const catalog = JSON.parse(fs.readFileSync('data/scenarios/events/war_1993.json', 'utf8')) as Array<Record<string, any>>;
const card = catalog.find((row) => row.id === CARD_ID)!;
const census = JSON.parse(fs.readFileSync('data/derived/municipality_population_1991.json', 'utf8')).by_municipality_id as Record<
    string,
    { mun1990_id: string; breakdown: { bosniak: number } }
>;

/** The card's static estimates (measured headless run, rounded as stated on the card). */
const STATED = { people: 24_000, sharePct: 18, killed: 700, abroad: 6_300, municipalities: 11, warCrimes: 1, standingDrop: 10 };
const MEASURED = { people: 23_746, killed: 695, abroad: 6_325 };

function num(n: number): string {
    return n.toLocaleString('en-US');
}

describe('RB5: the halt card discloses B1 numbers inside recomputed bounds', () => {
    const scope = POLICY_EXPULSION_SCOPE.HRHB!;
    const scopeMuns = Object.keys(scope);
    const bosniaksInScope = scopeMuns.reduce(
        (sum, mun) => sum + Object.values(census).filter((r) => r.mun1990_id === mun).reduce((s, r) => s + r.breakdown.bosniak, 0),
        0,
    );
    const ceiling = scopeMuns.reduce(
        (sum, mun) => sum + scope[mun].fraction * Object.values(census).filter((r) => r.mun1990_id === mun).reduce((s, r) => s + r.breakdown.bosniak, 0),
        0,
    );

    test('the card exists, fires on the bilateral war start, once, and defaults to no halt', () => {
        expect(card).toBeDefined();
        expect(card.trigger.condition).toEqual({ type: 'rbih_hrhb_war_started', value: true });
        expect(card.once).toBe(true);
        expect(card.requires_player_response).toBe(true);
        expect(card.responding_faction).toBe('HRHB');
        expect(card.historical_default_response_id).toBe('no_halt');
        expect(card.response_options.map((o: { id: string }) => o.id)).toEqual(['no_halt', 'order_halt']);
    });

    test('people: within the scope ceiling and within 2% of the measured run', () => {
        expect(STATED.people).toBeLessThanOrEqual(ceiling);
        expect(Math.abs(STATED.people - MEASURED.people) / MEASURED.people).toBeLessThan(0.02);
        expect(card.narrative).toContain(`about ${num(STATED.people)} people`);
        expect(card.response_options[0].description).toContain(`About ${num(STATED.people)} people`);
    });

    test('share of the scope municipalities\' pre-war Bosniaks matches the stated percentage', () => {
        expect(Math.round((100 * MEASURED.people) / bosniaksInScope)).toBe(STATED.sharePct);
        expect(card.narrative).toContain(`${STATED.sharePct}%`);
    });

    test('killed: the engine kill fraction of the wave, as stated; abroad below the wave', () => {
        expect(Math.abs(MEASURED.killed / MEASURED.people - BILATERAL_KILL_FRACTION)).toBeLessThan(0.005);
        expect(Math.abs(STATED.killed - MEASURED.killed) / MEASURED.killed).toBeLessThan(0.05);
        expect(Math.abs(STATED.abroad - MEASURED.abroad) / MEASURED.abroad).toBeLessThan(0.05);
        expect(STATED.abroad).toBeLessThan(STATED.people);
        expect(card.narrative).toContain(`About ${num(STATED.killed)}`);
        expect(card.narrative).toContain(`about ${num(STATED.abroad)}`);
    });

    test('municipalities: the scope table size', () => {
        expect(scopeMuns.length).toBe(STATED.municipalities);
        expect(card.narrative).toContain(`${STATED.municipalities} municipalities`);
    });

    test('one war crime moves the international standing base by the stated points', () => {
        const at = (warCrimes: number) => computeInternationalStandingBase(
            { military: { negotiation: { capital: { HRHB: { war_crimes_events: warCrimes } } } } },
            'HRHB',
        );
        expect(at(0) - at(STATED.warCrimes)).toBe(STATED.standingDrop);
        expect(card.narrative).toContain(`by about ${STATED.standingDrop} points`);
    });

    test('the halt costs patron confidence only (no op-launch dimension like internal_cohesion), and is the sole writer of the halt flag', () => {
        const halt = card.response_options.find((o: { id: string }) => o.id === 'order_halt');
        expect(halt.dimension_shifts).toEqual([{ faction: 'HRHB', dimension: 'patron_confidence', delta: -10 }]);
        expect(halt.sets_flags).toEqual({ hrhb_minority_policy_halted: true });
        expect(halt.effects ?? []).toEqual([]);
        const noHalt = card.response_options.find((o: { id: string }) => o.id === 'no_halt');
        expect(noHalt.sets_flags).toBeUndefined();
        expect(noHalt.dimension_shifts ?? []).toEqual([]);
        expect(noHalt.effects ?? []).toEqual([]);
        const writers: string[] = [];
        for (const file of fs.readdirSync('data/scenarios/events').filter((f) => f.endsWith('.json')).sort()) {
            const rows = JSON.parse(fs.readFileSync(`data/scenarios/events/${file}`, 'utf8')) as Array<Record<string, any>>;
            for (const row of rows) {
                if (row.sets_flags && 'hrhb_minority_policy_halted' in row.sets_flags) writers.push(`${row.id}`);
                for (const option of row.response_options ?? []) {
                    if (option.sets_flags && 'hrhb_minority_policy_halted' in option.sets_flags) writers.push(`${row.id}#${option.id}`);
                }
            }
        }
        expect(writers).toEqual([`${CARD_ID}#order_halt`]);
    });

    test('answer-ahead is off for the card (answerable only when it fires)', async () => {
        const { ANSWER_AHEAD_EVENT_IDS } = await import('../src/sim/events/answer_ahead_of_firing.js');
        expect(ANSWER_AHEAD_EVENT_IDS).not.toContain(CARD_ID);
    });
});
