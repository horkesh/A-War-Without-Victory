/**
 * The Washington-framework decisions must not promise supply, and the HRHB card must credit the
 * right faction.
 *
 * Supply is connection, not stock (the reserve economy and the supply_delta / negotiation_capital
 * effect kinds are retired). A choice may name only what it really carries: its `effects` and
 * `dimension_shifts`. Real history in a `narrative` field may mention the Croatian supply route.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const EVENT_IDS = ['hrhb_washington_agreement_1994', 'rbih_washington_agreement_1994'] as const;
const SUPPLY_WORDS = /suppl|snabd|opskrb|zalih/i;

function loadEvent(id: string): { [key: string]: Json } {
    const events = JSON.parse(readFileSync(resolve('data/scenarios/events/war_1994.json')).toString()) as Array<{ [key: string]: Json }>;
    const event = events.find((row) => row.id === id);
    expect(event, id).toBeDefined();
    return event as { [key: string]: Json };
}

/** Every string leaf with its key path. */
function stringLeaves(value: Json, path: string, out: Array<{ path: string; key: string; text: string }>): void {
    if (typeof value === 'string') {
        const key = path.slice(path.lastIndexOf('.') + 1).replace(/\[\d+\]$/, '');
        out.push({ path, key, text: value });
    } else if (Array.isArray(value)) {
        value.forEach((item, index) => stringLeaves(item, `${path}[${index}]`, out));
    } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) stringLeaves(child, `${path}.${key}`, out);
    }
}

describe('Washington-framework decisions: no supply promise', () => {
    for (const id of EVENT_IDS) {
        it(`${id}: only a narrative field may mention supply (as history)`, () => {
            const leaves: Array<{ path: string; key: string; text: string }> = [];
            stringLeaves(loadEvent(id), id, leaves);
            const offenders = leaves
                .filter((leaf) => SUPPLY_WORDS.test(leaf.text) && leaf.key !== 'narrative')
                .map((leaf) => leaf.path);
            expect(offenders).toEqual([]);
        });
    }

    it('carries no retired effect kind in the event or its options', () => {
        for (const id of EVENT_IDS) {
            const kinds = new Set<string>();
            const walk = (value: Json): void => {
                if (Array.isArray(value)) value.forEach(walk);
                else if (value && typeof value === 'object') {
                    if (typeof value.kind === 'string') kinds.add(value.kind);
                    Object.values(value).forEach(walk);
                }
            };
            walk(loadEvent(id));
            expect(kinds.has('supply_delta'), id).toBe(false);
            expect(kinds.has('negotiation_capital'), id).toBe(false);
        }
    });
});

describe('hrhb_washington_agreement_1994: the credibility gain is Mostar\'s', () => {
    it('shifts HRHB international_standing by +10 (accept) and +3 (reluctant)', () => {
        const event = loadEvent('hrhb_washington_agreement_1994');
        const options = event.response_options as Array<{ id: string; dimension_shifts?: Array<{ faction: string; dimension: string; delta: number }> }>;
        const shiftOf = (optionId: string) => options
            .find((option) => option.id === optionId)?.dimension_shifts
            ?.find((shift) => shift.faction === 'HRHB' && shift.dimension === 'international_standing')?.delta;
        expect(shiftOf('accept')).toBe(10);
        expect(shiftOf('reluctant')).toBe(3);
    });

    it('never credits that gain to Sarajevo, in English or Bosnian', () => {
        const event = loadEvent('hrhb_washington_agreement_1994');
        const leaves: Array<{ path: string; key: string; text: string }> = [];
        stringLeaves(event.localizations as Json, 'localizations', leaves);
        // A sentence about the credibility gain that names Sarajevo and not Mostar credits the wrong faction.
        const wrongFaction = leaves
            .filter((leaf) => leaf.text
                .split(/(?<=[.!?])\s+/)
                .some((sentence) => /international credibility|međunarodni kredibilitet/i.test(sentence)
                    && /Sarajev/i.test(sentence)
                    && !/Mostar/i.test(sentence)))
            .map((leaf) => leaf.path);
        expect(wrongFaction).toEqual([]);
    });
});
