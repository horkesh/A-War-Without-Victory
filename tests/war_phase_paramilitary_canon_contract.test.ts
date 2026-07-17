import { describe, expect, it } from 'vitest';

import { warPhases } from '../src/sim/turn_phases/war_phases.js';

describe('war-phase paramilitary canon contract', () => {
    it('detects only rear-pocket deployments in the production turn pipeline', () => {
        const phaseNames = warPhases.map((phase) => phase.name);

        expect(phaseNames).toContain('paramilitary-detect');
        expect(phaseNames).not.toContain('offensive-paramilitary-detect');
        expect(phaseNames).toContain('paramilitary-advance');
    });

    it('hands post-fade undefended pockets to regular consolidation', () => {
        const phaseNames = warPhases.map((phase) => phase.name);
        const paramilitaryAdvance = phaseNames.indexOf('paramilitary-advance');
        const rearPocketConsolidation = phaseNames.indexOf('rear-pocket-consolidation');

        expect(paramilitaryAdvance).toBeGreaterThanOrEqual(0);
        expect(rearPocketConsolidation).toBe(paramilitaryAdvance + 1);
    });
});
