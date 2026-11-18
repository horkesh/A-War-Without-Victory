import { describe, expect, it } from 'vitest';

import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { KNOWN_EVENT_CONDITION_TYPE_SET } from '../src/sim/events/event_vocabulary.js';

// Retired 2026-11-17 (§6 panel, Fable consult 6): siege turn counters, passive
// siege bombardment attrition, the siege defender morale drain and the
// `siege_active` event condition are not modelled in 1.0. The persisted
// `military.siege_turn_counters` field was removed in the retired-field sweep
// (see tests/dead_state_fields_retired.test.ts).

const RETIRED_STEPS = [
    'update-siege-counters',
    'apply-siege-bombardment-attrition',
    'apply-siege-morale-drain',
] as const;

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
});
