/**
 * Commander attribution hardening (orchestrator PR 1, 2026-11-17).
 * - A retired (or otherwise departed) officer never returns to the reserve pool when an operation he
 *   held is released, and retirement clears his operation.
 * - A deferred operation releases its commanders, so a player's officer pool at campaign start
 *   matches a headless run (no commander left holding a dropped operation).
 */
import { describe, expect, it } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { releaseOperationCommander, releaseTacticalCommander } from '../src/sim/combat/officer_system.js';
import type { GameState } from '../src/state/game_state.js';

function leakedCommanders(state: GameState): string[] {
    const live = new Set<string>();
    for (const cmd of Object.values(state.military.corps_command ?? {})) {
        for (const op of cmd?.active_operations ?? []) live.add(op.name);
    }
    return Object.entries(state.military.named_officers ?? {})
        .filter(([, o]) => o.assigned_operation && !live.has(o.assigned_operation))
        .map(([id]) => id)
        .sort();
}

describe('commander attribution hardening', () => {
    it('releasing an operation never returns a retired officer to reserve', () => {
        const state = {
            military: {
                named_officers: {
                    a: { status: 'retired', assigned_operation: 'Op A', assigned_corps_id: null },
                    b: { status: 'active', assigned_operation: 'Op B', assigned_corps_id: null },
                },
            },
        } as unknown as GameState;
        releaseOperationCommander(state, { commander_officer_id: 'a' } as any);
        releaseOperationCommander(state, { commander_officer_id: 'b' } as any);
        releaseTacticalCommander(state, { tg_commander_officer_id: 'a' } as any);
        expect(state.military.named_officers!.a!.status).toBe('retired');
        expect(state.military.named_officers!.a!.assigned_operation).toBeUndefined();
        expect(state.military.named_officers!.b!.status).toBe('reserve');
        expect(state.military.named_officers!.b!.assigned_operation).toBeUndefined();
    });

    it.each(['RS', 'RBiH', 'HRHB'] as const)('a %s campaign start leaves no commander holding a dropped operation', async (faction) => {
        const { state } = await startNewCampaign(process.cwd(), faction, 'apr_1992', 'historical');
        expect(leakedCommanders(state)).toEqual([]);
    });
});
