import { describe, expect, it } from 'vitest';

import { warPhases } from '../src/sim/turn_phases/war_phases.js';

describe('war-phase paramilitary canon contract', () => {
    it('detects only rear-pocket deployments in the production turn pipeline', () => {
        const phaseNames = warPhases.map((phase) => phase.name);

        expect(phaseNames).toContain('paramilitary-detect');
        expect(phaseNames).not.toContain('offensive-paramilitary-detect');
        expect(phaseNames).toContain('paramilitary-advance');
    });

    it('does not pass control to a passive post-fade consolidation phase', () => {
        const phaseNames = warPhases.map((phase) => phase.name);

        expect(phaseNames).toContain('paramilitary-advance');
        expect(phaseNames).not.toContain('rear-pocket-consolidation');
    });
});
