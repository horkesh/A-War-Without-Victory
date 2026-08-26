import { describe, expect, it } from 'vitest';

import { loadEventDefinitions } from '../src/sim/events/event_loader.js';

describe('Srebrenica-Cerska linkup control causality', () => {
    it('does not use an authored control-change event for the two January captures', () => {
        const event = loadEventDefinitions(0).find(
            (candidate) => candidate.id === 'srebrenica_cerska_linkup_1992',
        );

        expect(event).toBeUndefined();
    });
});
