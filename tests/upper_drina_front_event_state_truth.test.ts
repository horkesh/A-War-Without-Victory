import { describe, expect, it } from 'vitest';

import { loadEventDefinitions } from '../src/sim/events/event_loader.js';

describe('Upper Drina control causality', () => {
    it('does not use an authored consolidation event for January control', () => {
        const event = loadEventDefinitions(0).find(
            (candidate) => candidate.id === 'upper_drina_front_consolidation_1992',
        );
        expect(event).toBeUndefined();
    });
});
