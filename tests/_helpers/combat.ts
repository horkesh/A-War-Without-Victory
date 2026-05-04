/**
 * Shared test helpers for combat / attack_* test scaffolding.
 *
 * Consolidates byte-identical `makeComposition` and `makeFormation` factories
 * previously inlined in 5+ attack_*.test.ts files:
 *   - attack_equipment_effects.test.ts
 *   - attack_resource_aftermath.test.ts
 *   - attack_casualty_distribution.test.ts
 *   - attack_post_battle_effects.test.ts
 *   - attack_morale_absorption.test.ts
 *
 * Faction-agnostic: defaults to RS, but accepts any FactionId via overrides.
 * Deterministic: no Math.random(), no Date.now(), no timestamps.
 */

import type {
    BrigadeComposition,
    FactionId,
    FormationState,
} from '../../src/state/game_state.js';

/**
 * Default brigade composition: 800 infantry, 20 tanks, 10 artillery, 5 AA;
 * tank/artillery condition 80% operational / 10% degraded / 10% non-op.
 *
 * Pass partial overrides to customise individual fields.
 */
export function makeAttackComposition(
    overrides: Partial<BrigadeComposition> = {},
): BrigadeComposition {
    return {
        infantry: 800,
        tanks: 20,
        artillery: 10,
        aa_systems: 5,
        tank_condition: { operational: 0.8, degraded: 0.1, non_operational: 0.1 },
        artillery_condition: { operational: 0.8, degraded: 0.1, non_operational: 0.1 },
        ...overrides,
    };
}

/**
 * Default brigade FormationState used as attacker/defender in attack_* tests.
 * Personnel 1000, morale/cohesion 60, experience 0.3, faction RS by default.
 *
 * Composition defaults to `makeAttackComposition()`. Pass `composition` in
 * overrides to use a custom one.
 */
export function makeAttackFormation(
    overrides: Partial<FormationState> = {},
): FormationState {
    return {
        id: 'test_brigade',
        faction: 'RS' as FactionId,
        name: 'Test Brigade',
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        morale: 60,
        cohesion: 60,
        experience: 0.3,
        tags: [],
        composition: makeAttackComposition(),
        ...overrides,
    } as FormationState;
}
