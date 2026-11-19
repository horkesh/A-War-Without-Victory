/**
 * `corridor_severed` condition retirement guard (2026-11-18).
 *
 * The condition ran a BFS over settlement edges (`EdgeRecord`) but compared OSID ids, so the
 * walk could never reach an OSID pair: it was vacuously true or false and unusable. No shipped
 * event used it. It is no longer event vocabulary, the evaluator case and the `edges` parameter
 * that existed only for it are gone, and the loader rejects it (also nested in and/or/not).
 *
 * The loader rejection is load-bearing: `evaluateCondition` returns true for an unknown condition
 * type, so a definition that still carried the retired type would otherwise load and then fire
 * unconditionally. This guard fails if the vocabulary, the evaluator or a shipped catalog ever
 * carries the type again.
 *
 * Sibling guard: tests/events_supply_retired.test.ts (supply_below / supply_above).
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import { evaluateCondition, triggerMatches } from '../src/sim/events/event_types.js';
import { KNOWN_EVENT_CONDITION_TYPE_SET } from '../src/sim/events/event_vocabulary.js';

const RETIRED = 'corridor_severed';
const REQUIRED_EVENT_FILES = [
    'war_1992.json',
    'war_1992_hrhb_summer.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
    'consequences.json',
] as const;
const REPO_EVENTS_DIR = resolve(__dirname, '..', 'data', 'scenarios', 'events');
const tempDirs: string[] = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function catalogWithRow(row: Record<string, unknown>): string {
    const dir = mkdtempSync(join(tmpdir(), 'awwv-corridor-severed-'));
    tempDirs.push(dir);
    mkdirSync(dir, { recursive: true });
    for (const file of REQUIRED_EVENT_FILES) {
        writeFileSync(join(dir, file), JSON.stringify(file === 'war_1992.json' ? [row] : []));
    }
    return dir;
}

function rowWithCondition(condition: unknown): Record<string, unknown> {
    return {
        id: 'fixture_event',
        trigger: { turn_min: 0, phase: 'war', condition },
        effect: { kind: 'narrative', text: 'Fixture event fired.' },
        once: true,
    };
}

const RETIRED_CONDITION = { type: RETIRED, from_osid: 'op:a:a_1', to_osid: 'op:a:a_3', faction: 'RBiH' };
const LIVE_CONDITION = { type: 'flag_equals', flag: 'fixture', value: true };

describe('corridor_severed retirement: loader', () => {
    it('rejects the retired condition type at the top level of a trigger', () => {
        const dir = catalogWithRow(rowWithCondition(RETIRED_CONDITION));
        expect(() => loadEventDefinitionsFromDir(0, dir)).toThrow(
            /Invalid event row in war_1992\.json\[0\]: trigger\.condition\.type must be a known event condition type: corridor_severed is retired \(2026-11-18\)/,
        );
    });

    it('states why: the BFS ran over settlement edges, so it could never evaluate an OSID pair', () => {
        const dir = catalogWithRow(rowWithCondition(RETIRED_CONDITION));
        expect(() => loadEventDefinitionsFromDir(0, dir)).toThrow(/settlement edges.*OSID pair/);
    });

    it('rejects it nested inside and', () => {
        const dir = catalogWithRow(rowWithCondition({ type: 'and', conditions: [LIVE_CONDITION, RETIRED_CONDITION] }));
        expect(() => loadEventDefinitionsFromDir(0, dir)).toThrow(
            /trigger\.condition\.conditions\[1\]\.type must be a known event condition type: corridor_severed is retired \(2026-11-18\)/,
        );
    });

    it('rejects it nested inside or', () => {
        const dir = catalogWithRow(rowWithCondition({ type: 'or', conditions: [RETIRED_CONDITION, LIVE_CONDITION] }));
        expect(() => loadEventDefinitionsFromDir(0, dir)).toThrow(
            /trigger\.condition\.conditions\[0\]\.type must be a known event condition type: corridor_severed is retired \(2026-11-18\)/,
        );
    });

    it('rejects it nested inside not (and inside not inside and)', () => {
        const direct = catalogWithRow(rowWithCondition({ type: 'not', condition: RETIRED_CONDITION }));
        expect(() => loadEventDefinitionsFromDir(0, direct)).toThrow(
            /trigger\.condition\.condition\.type must be a known event condition type: corridor_severed is retired \(2026-11-18\)/,
        );
        const deep = catalogWithRow(rowWithCondition({
            type: 'and',
            conditions: [LIVE_CONDITION, { type: 'not', condition: RETIRED_CONDITION }],
        }));
        expect(() => loadEventDefinitionsFromDir(0, deep)).toThrow(
            /trigger\.condition\.conditions\[1\]\.condition\.type must be a known event condition type: corridor_severed is retired \(2026-11-18\)/,
        );
    });

    it('still loads a definition whose conditions are all live types (the rejection is not blanket)', () => {
        const dir = catalogWithRow(rowWithCondition({ type: 'and', conditions: [LIVE_CONDITION, { type: 'not', condition: LIVE_CONDITION }] }));
        const loaded = loadEventDefinitionsFromDir(0, dir);
        expect(loaded.map((definition) => definition.id)).toContain('fixture_event');
    });
});

describe('corridor_severed retirement: shipped catalog, vocabulary and evaluator', () => {
    const catalogFiles = readdirSync(REPO_EVENTS_DIR).filter((file) => file.endsWith('.json')).sort();

    it('scans a non-empty set of catalog files (the scan below is not vacuous)', () => {
        expect(catalogFiles.length).toBeGreaterThan(0);
        for (const file of REQUIRED_EVENT_FILES) expect(catalogFiles).toContain(file);
    });

    it('no shipped catalog under data/scenarios/events uses the retired condition type', () => {
        const offenders = catalogFiles.filter((file) => {
            const text = readFileSync(join(REPO_EVENTS_DIR, file)).toString();
            return text.includes(RETIRED);
        });
        expect(offenders).toEqual([]);
    });

    it('the event vocabulary no longer lists it', () => {
        expect(KNOWN_EVENT_CONDITION_TYPE_SET.has(RETIRED)).toBe(false);
    });

    it('event_types.ts no longer contains the retired name (union member, evaluator case and comment are gone)', () => {
        const source = readFileSync(resolve(__dirname, '..', 'src', 'sim', 'events', 'event_types.ts')).toString();
        expect(source.includes(RETIRED)).toBe(false);
    });

    it('the edges parameter that existed only for it is gone from the evaluator entry points', () => {
        expect(evaluateCondition.length).toBe(2);
        expect(triggerMatches.length).toBe(3);
    });
});
