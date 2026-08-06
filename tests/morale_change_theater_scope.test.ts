import { describe, expect, it } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import type { GameState } from '../src/state/game_state.js';

// R6 Task 0.3 — theater-scoped morale_change (owner decision 2026-08-06, direction B).
// A regional operation's morale hit must fall only on the corps in that theater, not the
// whole faction — so the western fall-1995 offensives (Sana/Mistral-2) don't crater the
// eastern VRS (Drina/East-Bosnian) that historically held through Dayton. Absent
// affected_corps → legacy faction-wide behavior.

function stateWithBrigades(): GameState {
    const mk = (id: string, corps: string, morale: number) => ({
        id, faction: 'RS', name: id, status: 'active', kind: 'brigade',
        corps_id: corps, morale, personnel: 2000, cohesion: 60,
    });
    return {
        military: {
            formations: {
                west1: mk('west1', 'vrs_1st_krajina', 45),
                west2: mk('west2', 'vrs_2nd_krajina', 45),
                east1: mk('east1', 'vrs_drina', 45),
                east2: mk('east2', 'vrs_east_bosnian', 45),
            },
        },
    } as unknown as GameState;
}

describe('theater-scoped morale_change (Task 0.3, direction B)', () => {
    it('affected_corps restricts the delta to the named corps (eastern VRS spared)', () => {
        const state = stateWithBrigades();
        applyEventEffects(state, [
            { kind: 'morale_change', faction: 'RS', delta: -8, affected_corps: ['vrs_1st_krajina', 'vrs_2nd_krajina'] } as any,
        ]);
        const f = state.military.formations as any;
        expect(f.west1.morale).toBe(37); // 45 - 8 (in theater)
        expect(f.west2.morale).toBe(37); // 45 - 8 (in theater)
        expect(f.east1.morale).toBe(45); // spared — held through Dayton
        expect(f.east2.morale).toBe(45); // spared
    });

    it('no affected_corps → legacy faction-wide behavior (byte-identical path)', () => {
        const state = stateWithBrigades();
        applyEventEffects(state, [
            { kind: 'morale_change', faction: 'RS', delta: -8 } as any,
        ]);
        const f = state.military.formations as any;
        expect(f.west1.morale).toBe(37);
        expect(f.east1.morale).toBe(37); // faction-wide when unscoped
        expect(f.east2.morale).toBe(37);
    });

    it('empty affected_corps is treated as unscoped (defensive)', () => {
        const state = stateWithBrigades();
        applyEventEffects(state, [
            { kind: 'morale_change', faction: 'RS', delta: -8, affected_corps: [] } as any,
        ]);
        expect((state.military.formations as any).east1.morale).toBe(37);
    });
});
