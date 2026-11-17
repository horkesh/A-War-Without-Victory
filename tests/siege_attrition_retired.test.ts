import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { KNOWN_EVENT_CONDITION_TYPE_SET } from '../src/sim/events/event_vocabulary.js';

// Retired 2026-11-17 (§6 panel, Fable consult 6): siege turn counters, passive
// siege bombardment attrition, the siege defender morale drain and the
// `siege_active` event condition are not modelled in 1.0. The persisted
// `military.siege_turn_counters` field stays optional so old saves still load.

const RETIRED_STEPS = [
    'update-siege-counters',
    'apply-siege-bombardment-attrition',
    'apply-siege-morale-drain',
] as const;

const COUNTERS = {
    'RBiH:op:centar_sarajevo:radava': 30,
    'RS:op:gorazde:gorazde_1': 0,
};

describe('siege counters / bombardment attrition / siege morale drain retired', () => {
    it('the three siege pipeline steps are absent from the war phase list', () => {
        const names = warPhases.map((p) => p.name);
        for (const step of RETIRED_STEPS) {
            expect(names).not.toContain(step);
        }
    });

    it('siege_active is no longer a known event condition type', () => {
        expect(KNOWN_EVENT_CONDITION_TYPE_SET.has('siege_active')).toBe(false);
    });

    it('a current-version save carrying military.siege_turn_counters still loads', () => {
        const raw = JSON.parse(readFileSync(
            resolve(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
            'utf8',
        ));
        raw.military.siege_turn_counters = { ...COUNTERS };

        const loaded = deserializeState(JSON.stringify(raw));
        expect(loaded.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(loaded.military.siege_turn_counters).toEqual(COUNTERS);

        const serialized = serializeState(loaded);
        expect(serializeState(deserializeState(serialized))).toBe(serialized);
    });

    it('a legacy save carrying military.siege_turn_counters migrates and loads', () => {
        const raw = JSON.parse(readFileSync(
            resolve(process.cwd(), 'tests', 'fixtures', 'save_migration', 'v38_directive_chain_retired.json'),
            'utf8',
        ));
        raw.military.siege_turn_counters = { ...COUNTERS };

        const loaded = deserializeState(JSON.stringify(raw));
        expect(loaded.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(loaded.military.siege_turn_counters).toEqual(COUNTERS);
    });
});
