/**
 * RF-emergency-defense (2026-11-15): the emergency defensive operation is retired. Do not revive it.
 *
 * WHY (operations-expert and corps-army-commander, both ruling "retire"):
 * - On main's 188-week run it never fired. 166 corps-turns were defensive at threat >= 2.0, but
 *   none had two brigades at 70% of the 3,000 cap with cohesion 50.
 * - Woken, its operation had no axes, objectives or staging point. No tactical group formed, it
 *   made no attacks and wrote no control. It froze the corps' four strongest brigades for about
 *   seven turns, which cut them off from sector reassignment, the march back to the front and the
 *   reserve hold. It gave x1.05 defence in planning, then x0.9 defence and x0.6 attack in recovery,
 *   added +15 corps exhaustion, blocked the commander loop (major_operation_already_active) and
 *   survived the October 1995 ceasefire. A threatened corps was worse defended with it than without.
 * - Its targets were `nCtrl !== faction`, so HVO Northwest Bosnia (70 of the 166 candidate turns)
 *   would have listed ALLIED ARBiH ground: the corridor-breach flaw (#672) again.
 * - A real emergency defence (committing reserves, a local counterattack) is a post-1.0 design item.
 *
 * Kept for saves: `CorpsOperation.is_emergency` and the `classifyOpDonorPolicy` branch.
 */

import { describe, expect, it, vi } from 'vitest';
import * as botCorpsAi from '../../src/sim/combat/bot_corps_ai.js';
import * as botCorpsOperations from '../../src/sim/combat/bot_corps_operations.js';
import * as corpsOperationHelpers from '../../src/sim/combat/corps_operation_helpers.js';
import * as botConstants from '../../src/sim/combat/bot_constants.js';
import { evaluateOperationProgress } from '../../src/sim/combat/sector_offensive.js';
import type { CorpsOperation, GameState } from '../../src/state/game_state.js';

const CORPS = 'vrs_legacy_corps';

describe('RF-emergency-defense: the emergency defensive operation is retired', () => {
    it('its creator, factory and threshold are gone', () => {
        expect('generateEmergencyDefensiveOperations' in botCorpsAi).toBe(false);
        expect('generateEmergencyDefensiveOperations' in botCorpsOperations).toBe(false);
        expect('buildEmergencyDefenseOperation' in corpsOperationHelpers).toBe(false);
        expect('EMERGENCY_THREAT_THRESHOLD' in botConstants).toBe(false);
    });

    it('a legacy save carrying an emergency strategic_defense op still advances and is removed', () => {
        const legacy: CorpsOperation = {
            name: `Emergency Defense (${CORPS})`, type: 'strategic_defense', phase: 'planning',
            started_turn: 10, phase_started_turn: 10, participating_brigades: ['b1', 'b2'],
            target_settlements: ['op:t:front'], supply_readiness: 1, momentum: 0, failure_count: 0,
            consecutive_failures_on_current: 0, is_emergency: true,
        } as CorpsOperation;
        const state = {
            meta: { turn: 10, phase: 'war', seed: 'legacy-emergency' },
            factions: [{ id: 'RS' }],
            political: { political_controllers: { 'op:t:home': 'RS', 'op:t:front': 'RBiH' }, control_events: [] },
            military: {
                formations: {
                    [CORPS]: { id: CORPS, name: CORPS, faction: 'RS', kind: 'corps', status: 'active', created_turn: 0, assignment: null, personnel: 0 },
                    b1: { id: 'b1', name: 'b1', faction: 'RS', kind: 'brigade', status: 'active', created_turn: 0, assignment: null, corps_id: CORPS, location_osid: 'op:t:home', personnel: 2400, cohesion: 70 },
                    b2: { id: 'b2', name: 'b2', faction: 'RS', kind: 'brigade', status: 'active', created_turn: 0, assignment: null, corps_id: CORPS, location_osid: 'op:t:home', personnel: 2400, cohesion: 70 },
                },
                corps_command: {
                    [CORPS]: { command_span: 3, subordinate_count: 2, og_slots: 0, active_ogs: [], active_operations: [legacy], corps_exhaustion: 0, stance: 'defensive' },
                },
            },
        } as unknown as GameState;

        const phases: string[] = [];
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        try {
            for (let turn = 10; turn <= 30; turn++) {
                state.meta.turn = turn;
                evaluateOperationProgress(state, 'RS');
                const op = state.military.corps_command![CORPS]!.active_operations.find(o => o.is_emergency);
                phases.push(op ? op.phase : 'removed');
                if (!op) break;
            }
        } finally {
            spy.mockRestore();
        }
        // It walks its normal lifecycle (planning -> execution -> recovery) and then leaves.
        expect(phases).toContain('execution');
        expect(phases.at(-1)).toBe('removed');
    });
});
