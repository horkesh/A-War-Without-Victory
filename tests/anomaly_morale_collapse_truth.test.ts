import { describe, expect, it } from 'vitest';

import { checkMoraleCollapseCluster } from '../src/scenario/anomaly_checks_extended.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(formations: Record<string, unknown>): GameState {
    return {
        meta: { turn: 40, phase: 'war' },
        factions: [],
        political: { control_events: [] },
        military: { formations },
    } as unknown as GameState;
}

function brigade(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
        id: 'brigade',
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        corps_id: 'vrs_sarajevo_romanija',
        morale: 70,
        cohesion: 70,
        personnel: 2000,
        ...overrides,
    };
}

describe('morale collapse anomaly truth', () => {
    it('does not report organized low-morale brigades as a collapse cluster', () => {
        const reports = checkMoraleCollapseCluster(makeState({
            a: brigade({ id: 'a', morale: 3, cohesion: 70, personnel: 2000 }),
            b: brigade({ id: 'b', morale: 8, cohesion: 65, personnel: 1800 }),
            c: brigade({ id: 'c', morale: 12, cohesion: 72, personnel: 2100 }),
        }));

        expect(reports).toEqual([]);
    });

    it('reports a collapse cluster when low morale also has low cohesion or depleted personnel', () => {
        const reports = checkMoraleCollapseCluster(makeState({
            a: brigade({ id: 'a', morale: 3, cohesion: 22, personnel: 2000 }),
            b: brigade({ id: 'b', morale: 8, cohesion: 65, personnel: 420 }),
            c: brigade({ id: 'c', morale: 12, cohesion: 30, personnel: 2100 }),
        }));

        expect(reports).toHaveLength(1);
        expect(reports[0]!.type).toBe('morale_collapse_cluster');
        expect(reports[0]!.entities).toEqual(['vrs_sarajevo_romanija', 'a', 'b', 'c']);
    });
});
