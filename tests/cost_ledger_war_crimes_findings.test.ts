import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import { createDefaultPatronRelationship, createEmptyCapital } from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

type Annotation = { event_id: string; tag: string; text: string; turn: number; faction: string };

const DEFAULT_ANNOTATIONS: Annotation[] = [{
    event_id: 'cost_war_crimes_findings_RS',
    tag: 'paramilitary_war_crimes_severe',
    text: 'deployment_count=10',
    turn: 12,
    faction: 'RS',
}];

function makeState(annotations: Annotation[] = DEFAULT_ANNOTATIONS): GameState {
    return {
        meta: { turn: 12, phase: 'war', seed: 1, date: '1992-06-24' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: {
                capital: {
                    RBiH: createEmptyCapital(),
                    RS: { ...createEmptyCapital(), war_crimes_events: 10 },
                    HRHB: createEmptyCapital(),
                },
                patron_relationships: {
                    RBiH: createDefaultPatronRelationship('RBiH'),
                    RS: createDefaultPatronRelationship('RS'),
                    HRHB: createDefaultPatronRelationship('HRHB'),
                },
                peace_plan_history: [],
                strategic_dimensions: initializeStrategicDimensions(),
            },
            cost_ledger_annotations: annotations,
        },
        political: { political_controllers: {} },
        displacement: { civilian_casualties: {} },
    } as unknown as GameState;
}

describe('cost ledger paramilitary war-crimes findings', () => {
    it('promotes structured paramilitary severity annotations into prosecutorial findings', () => {
        const ledger = buildCostLedger(makeState());

        const finding = ledger.findings.find((entry) => entry.id === 'paramilitary_war_crimes_findings_RS');
        expect(finding).toMatchObject({
            category: 'war_crimes',
            severity: 'grave',
            faction: 'RS',
            title: 'Paramilitary deployments: RS command',
            sources: [],
        });
        // Plain campaign-record text naming the authorizing command; the band sets severity only.
        expect(finding!.text).toBe(
            'This campaign recorded 10 paramilitary deployments authorized by RS command. '
            + 'Each is recorded as a war-crimes finding.',
        );
        expect(finding!.text).not.toMatch(/\byou\b|efficiency|bonus|trade/i);
    });

    it('records one finding per side carrying the latest running deployment count', () => {
        const ledger = buildCostLedger(makeState([
            { event_id: 'cost_war_crimes_findings_RS', tag: 'paramilitary_war_crimes_minor', text: 'deployment_count=3', turn: 8, faction: 'RS' },
            { event_id: 'cost_war_crimes_findings_RS', tag: 'paramilitary_war_crimes_severe', text: 'deployment_count=10', turn: 12, faction: 'RS' },
        ]));

        const paramilitary = ledger.findings.filter((entry) => entry.id.startsWith('paramilitary_war_crimes_findings_'));
        expect(paramilitary.map((entry) => entry.id)).toEqual(['paramilitary_war_crimes_findings_RS']);
        expect(paramilitary[0]!.severity).toBe('grave');
        expect(paramilitary[0]!.text).toContain('10 paramilitary deployments authorized by RS command');
    });
});
