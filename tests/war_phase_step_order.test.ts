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

        // Warlord friction and officer maturity run after officer succession
        assertBefore('officer-succession', 'check-warlord-friction');
        assertBefore('officer-succession', 'update-faction-officer-maturity');
    });

    it('has no duplicate step names', () => {
        const seen = new Set<string>();
        for (const name of stepNames) {
            expect(seen.has(name), `duplicate step name: ${name}`).toBe(false);
            seen.add(name);
        }
    });

    it('step count is stable', () => {
        // Current count: 125 steps. Update this if steps are intentionally added/removed.
        // +1 from check-victory-conditions (war termination, 2026-03-15).
        // +1 from compute-negotiation-capital (negotiation system, 2026-03-15).
        // +1 from evaluate-peace-plans (peace plan events, 2026-03-15).
        // +1 from update-patron-pressure (patron pressure system, 2026-03-15).
        // +1 from hv-integration (Washington Agreement + HV brigades, 2026-03-15).
        // +1 from assign-brigades-to-subsegments (v0.3.3 AoR sub-segment assignment, 2026-03-16).
        // +1 from update-smuggling-routes (v0.4.3 economy & war production, 2026-03-16).
        // +1 from check-warlord-friction (v0.4.4 officer experience & weight of command, 2026-03-16).
        // +1 from update-faction-officer-maturity (v0.4.4 officer experience & weight of command, 2026-03-16).
        // +2 from ai-army-decisions + ai-corps-decisions (v0.4.5 AI command layer, 2026-03-16).
        // +1 from check-heroic-stand (v0.4.4 officer experience integration, 2026-03-16).
        // +1 from distribute-brigades-to-front (brigade front distribution, 2026-03-17).
        // +1 from evaluate-army-hq-gathering (v0.4.7 army HQ gathering, 2026-03-17).
        // +1 from return-displaced-brigades (periodic home return march, 2026-03-17).
        // +1 from ai-war-dispatches (war dispatches from outside perspectives, 2026-03-18).
        // +1 from ai-corps-dialogue (officers who talk back — cosmetic flavor, 2026-03-18).
        // +1 from rederive-osid-front-segments (refresh front edges after all control mutations, 2026-03-19).
        // +1 from activate-corps (war-phase corps activation for late-starting corps like hvo_central_bosnia)
        // +1 from recompute-sector-combat-ratings (refresh after bot corps rearranges/renumbers sectors)
        // +1 from assemble-command-briefing (sim-side briefing collector)
        // +1 from update-event-readiness (v0.6.0 pressure system readiness tick before evaluate-events)
        // +1 from compute-dimension-bases (strategic dimension base values after events)
        // +1 from offensive-paramilitary-detect (v0.6.5 Drina valley offensive sweep)
        // +1 from recall-drifted-brigades (prevent brigade drift far from home)
        // +1 from reroute-pool-surplus (transfer manpower from exhausted to deficit municipalities)
        // +1 from pool-war-weariness-decay (desertion/draft evasion/emigration drain on pool.available)
        expect(stepNames.length).toBe(148);
    });
});
