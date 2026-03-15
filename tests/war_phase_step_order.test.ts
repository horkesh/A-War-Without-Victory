import { describe, it, expect } from 'vitest';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';

describe('war-phase step ordering', () => {
    const stepNames = warPhases.map(p => p.name);

    /** Assert step A comes before step B in the pipeline. */
    function assertBefore(a: string, b: string) {
        const idxA = stepNames.indexOf(a);
        const idxB = stepNames.indexOf(b);
        expect(idxA, `${a} not found in steps`).toBeGreaterThanOrEqual(0);
        expect(idxB, `${b} not found in steps`).toBeGreaterThanOrEqual(0);
        expect(idxA, `${a} (idx ${idxA}) must come before ${b} (idx ${idxB})`).toBeLessThan(idxB);
    }

    it('critical ordering invariants hold', () => {
        // Sectors must be partitioned before corps directives are generated
        assertBefore('partition-corps-front-sectors', 'generate-bot-corps-orders');

        // Corps directives must exist before brigade AI evaluates them
        assertBefore('generate-bot-corps-orders', 'generate-bot-brigade-orders');

        // Brigade orders must be generated before attacks are resolved
        assertBefore('generate-bot-brigade-orders', 'resolve-attack-orders');

        // Column movement must be processed before general brigade movement
        assertBefore('osid-column-movement', 'apply-brigade-movement');

        // Attacks must resolve before displacement from conquered territory
        assertBefore('resolve-attack-orders', 'displace-enemy-territory');

        // Attack results must feed back into sector offensive tracking
        assertBefore('resolve-attack-orders', 'update-sector-offensive-results');

        // Operation casualties must be attributed after attacks resolve
        assertBefore('resolve-attack-orders', 'attribute-operation-casualties');
    });

    it('has no duplicate step names', () => {
        const seen = new Set<string>();
        for (const name of stepNames) {
            expect(seen.has(name), `duplicate step name: ${name}`).toBe(false);
            seen.add(name);
        }
    });

    it('step count is stable', () => {
        // Current count: 124 steps. Update this if steps are intentionally added/removed.
        // +1 from check-victory-conditions (war termination, 2026-03-15).
        // +1 from compute-negotiation-capital (negotiation system, 2026-03-15).
        // +1 from evaluate-peace-plans (peace plan events, 2026-03-15).
        // +1 from update-patron-pressure (patron pressure system, 2026-03-15).
        expect(stepNames.length).toBe(124);
    });
});
