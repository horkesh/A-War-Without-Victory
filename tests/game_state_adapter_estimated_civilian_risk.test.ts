import { describe, expect, it } from 'vitest';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

function makeRawState(request: Record<string, unknown>): any {
    return {
        meta: { turn: 1, phase: 'war', player_faction: 'RS' },
        military: {
            formations: {},
            named_officer_data: [],
            named_officers: {},
            brigade_movement_state: {},
        },
        political: { controllers: {} },
        factions: [],
        paramilitary_policy: 'ask',
        pending_paramilitary_requests: [request],
    };
}

describe('GameStateAdapter estimated civilian risk projection', () => {
    it('projects estimated_civilian_risk as an integer civilian count', () => {
        const loaded = parseGameState(makeRawState({
            faction: 'RS',
            target_osid: 'op:bijeljina:bijeljina_2',
            strength: 150,
            estimated_civilian_risk: 100,
        }));

        expect(loaded.paramilitaryPolicy).toBe('ask');
        expect(loaded.pendingParamilitaryRequests).toEqual([
            {
                faction: 'RS',
                target_osid: 'op:bijeljina:bijeljina_2',
                strength: 150,
                estimated_civilian_risk: 100,
            },
        ]);
    });

    it('fails loudly instead of fabricating estimated civilian risk', () => {
        expect(() => parseGameState(makeRawState({
            faction: 'RS',
            target_osid: 'op:bijeljina:bijeljina_2',
            strength: 150,
        }))).toThrow(/estimated_civilian_risk/);
    });
});
