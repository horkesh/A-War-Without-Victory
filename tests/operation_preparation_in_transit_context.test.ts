/**
 * LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT
 *
 * Red-first tests for `computeAttackerPower` context override + caller wiring
 * in `estimateForceRatio`.
 *
 * Background: predecessor lane `87062cc4` made readiness/predictor gates count
 * operation participants `in_transit` toward axis-relevant OSIDs. The named
 * remaining blocker: `computeAttackerPower` evaluates supply context via
 * `getSupplyMult(formation, state, mode, supply)` which reads
 * `formation.location_osid` directly. For an in-transit brigade en-route to
 * staging, that location is the intermediate transit OSID — so the brigade's
 * predicted attacker power is computed against unfavorable transit-OSID
 * supply state instead of the destination/staging it is committed to reach.
 *
 * Per Phase 0 expert synthesis (systems-programmer + determinism-auditor +
 * qa-engineer + game-designer):
 *   - Override applies to `getSupplyMult` branch (a) supply-state-by-osid only.
 *   - SKIP home-distance cache override (layer-violation; marginal effect).
 *   - Override OSID = `axis.staging_osid` first, else strictCompare-sorted
 *     first relevance OSID.
 *   - Caller `estimateForceRatio` imports `isCommittedInTransitTo` from
 *     `sector_offensive_launch_helpers.ts` (single source of truth).
 *   - Default-undefined parameter preserves byte-stability for resolver,
 *     predictor, and sector-rating callers.
 *
 * All test fixtures are FACTION-AGNOSTIC. Synthetic OSIDs (`op:test:*`),
 * synthetic brigade IDs (`synth_*`), synthetic faction (`TEST_FACTION`) — no
 * Krivaja/Srebrenica/Drina hardcode is permissible.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type {
    CorpsOperation,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import { computeAttackerPower } from '../src/sim/combat/combat_math.js';
import { estimateForceRatio } from '../src/sim/combat/operation_preparation.js';
import { isCommittedInTransitTo } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

// ─── Synthetic fixture helpers ─────────────────────────────────────────────

interface BrigadeOpts {
    id: string;
    location_osid?: string;
    in_transit_destination?: string;
    status?: 'active' | 'inactive' | 'destroyed';
    personnel?: number;
    cohesion?: number;
    morale?: number;
    posture?: string;
    faction?: string;
    corps_id?: string;
}

const LIGHT_COMP = {
    infantry: 1500,
    tanks: 0,
    artillery: 0,
    aa_systems: 0,
    tank_condition: { operational: 0, repair: 0, damaged: 0 },
    artillery_condition: { operational: 0, repair: 0, damaged: 0 },
} as unknown as FormationState['composition'];

function makeBrigade(opts: BrigadeOpts): FormationState {
    return {
        id: opts.id,
        faction: opts.faction ?? 'TEST_FACTION',
        kind: 'brigade',
        name: `Brigade ${opts.id}`,
        created_turn: 0,
        status: opts.status ?? 'active',
        assignment: null,
        personnel: opts.personnel ?? 1500,
        location_osid: opts.location_osid ?? 'op:test:intermediate_a',
        corps_id: opts.corps_id ?? 'synth_corps',
        equipment_class: 'light_infantry',
        cohesion: opts.cohesion ?? 80,
        morale: opts.morale ?? 70,
        experience: 0.5,
        posture: opts.posture ?? 'defend',
        composition: LIGHT_COMP,
    } as unknown as FormationState;
}

interface StateOpts {
    brigades: BrigadeOpts[];
    /** OSID-keyed supply states: 'adequate' | 'strained' | 'critical'. */
    supplyByOsid?: Record<string, 'adequate' | 'strained' | 'critical'>;
    /** Faction id used as key for the supply report. */
    faction?: string;
}

function makeState(opts: StateOpts): GameState {
    const formations: Record<string, FormationState> = {};
    const movement_state: Record<string, unknown> = {};
    for (const b of opts.brigades) {
        formations[b.id] = makeBrigade(b);
        if (b.in_transit_destination !== undefined) {
            movement_state[b.id] = {
                status: 'in_transit',
                stance: 'column',
                destination_sids: [b.in_transit_destination],
                turns_remaining: 1,
            };
        }
    }
    return {
        meta: { turn: 100, phase: 'war', supply_reserves_enabled: false },
        political: { political_controllers: {} },
        military: {
            formations,
            corps_command: {
                synth_corps: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [],
                },
            },
            corps_front_sectors: {},
            sector_intel: {},
            named_officers: {},
            named_officer_data: [],
            brigade_movement_state: movement_state,
            brigade_movement_orders: {},
        },
        factions: {},
        population: { byMunicipality: {} },
        displacement: {},
    } as unknown as GameState;
}

function makeSupply(faction: string, byOsid: Record<string, 'adequate' | 'strained' | 'critical'>): SupplyStateByOsidReport {
    return {
        factions: [{
            faction_id: faction,
            by_osid: Object.entries(byOsid).map(([osid, state]) => ({ osid, state })),
        }],
    } as unknown as SupplyStateByOsidReport;
}

// ═══════════════════════════════════════════════════════════════════════════
// T1 — context override raises power when intermediate is worse
// ═══════════════════════════════════════════════════════════════════════════

describe('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT T1: override raises power when intermediate is worse', () => {
    it('computeAttackerPower with override = staging returns higher power than without override (intermediate critical, staging adequate)', () => {
        const state = makeState({
            brigades: [{
                id: 'synth_alpha',
                location_osid: 'op:test:intermediate_a',
                in_transit_destination: 'op:test:staging_a',
                posture: 'attack',
            }],
        });
        const supply = makeSupply('TEST_FACTION', {
            'op:test:intermediate_a': 'critical',
            'op:test:staging_a': 'adequate',
        });
        const f = state.military.formations!['synth_alpha']!;

        const powerNoOverride = computeAttackerPower(
            state, f, supply, 'attack', 1.0, 'op:test:objective_a',
        );
        // RED today: parameter does not exist; call shape unchanged returns the same value.
        // GREEN after fix: passing override = staging_a evaluates supply at staging (adequate=1.0)
        // instead of intermediate (critical=0.45 attack), raising power by ~2.22×.
        const powerWithOverride = computeAttackerPower(
            state, f, supply, 'attack', 1.0, 'op:test:objective_a',
            'op:test:staging_a',
        );

        // Pre-fix: identical (override param ignored). Post-fix: override raises power.
        expect(powerWithOverride).toBeGreaterThan(powerNoOverride);
        // Magnitude check: supply mult goes from 0.45 (critical) to 1.0 (adequate),
        // ratio 1.0/0.45 ≈ 2.22. Allow narrow tolerance (other multipliers are equal).
        const ratio = powerWithOverride / powerNoOverride;
        expect(ratio).toBeGreaterThan(2.0);
        expect(ratio).toBeLessThan(2.5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T3 — staged brigade idempotent (regression guard)
// ═══════════════════════════════════════════════════════════════════════════

describe('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT T3: staged brigade idempotent', () => {
    it('with-override === without-override when location_osid === override OSID (already at staging)', () => {
        const state = makeState({
            brigades: [{
                id: 'synth_alpha',
                location_osid: 'op:test:staging_a',
                posture: 'attack',
            }],
        });
        const supply = makeSupply('TEST_FACTION', {
            'op:test:staging_a': 'adequate',
        });
        const f = state.military.formations!['synth_alpha']!;

        const powerNoOverride = computeAttackerPower(
            state, f, supply, 'attack', 1.0, 'op:test:objective_a',
        );
        const powerWithOverride = computeAttackerPower(
            state, f, supply, 'attack', 1.0, 'op:test:objective_a',
            'op:test:staging_a',
        );

        // Already at staging — override has no effect (idempotent).
        expect(powerWithOverride).toBe(powerNoOverride);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T4 — destroyed/inactive brigade still excluded (regression guard)
// ═══════════════════════════════════════════════════════════════════════════

describe('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT T4: destroyed/inactive yields zero power regardless of override', () => {
    it('inactive in-transit brigade with override still returns 0 power (postureMult chain unchanged)', () => {
        const state = makeState({
            brigades: [{
                id: 'synth_alpha',
                location_osid: 'op:test:intermediate_a',
                in_transit_destination: 'op:test:staging_a',
                posture: 'defend', // not attack — postureMult = 0 for attacker mode
                status: 'inactive',
            }],
        });
        const supply = makeSupply('TEST_FACTION', {
            'op:test:intermediate_a': 'critical',
            'op:test:staging_a': 'adequate',
        });
        const f = state.military.formations!['synth_alpha']!;

        // computeAttackerPower returns 0 if postureMult <= 0 (defend posture in attacker mode).
        // Regression: override does not bypass the postureMult <= 0 guard.
        const power = computeAttackerPower(
            state, f, supply, 'defend' /* keep defend */, 1.0, 'op:test:objective_a',
            'op:test:staging_a',
        );
        expect(power).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T5 — determinism
// ═══════════════════════════════════════════════════════════════════════════

describe('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT T5: deterministic across re-runs', () => {
    it('two independent calls with same fixture and override produce byte-identical power', () => {
        const buildSpec = () => makeState({
            brigades: [{
                id: 'synth_alpha',
                location_osid: 'op:test:intermediate_a',
                in_transit_destination: 'op:test:staging_a',
                posture: 'attack',
            }],
        });
        const supply = makeSupply('TEST_FACTION', {
            'op:test:intermediate_a': 'critical',
            'op:test:staging_a': 'adequate',
        });
        const stateA = buildSpec();
        const stateB = buildSpec();

        const a = computeAttackerPower(
            stateA, stateA.military.formations!['synth_alpha']!,
            supply, 'attack', 1.0, 'op:test:objective_a', 'op:test:staging_a',
        );
        const b = computeAttackerPower(
            stateB, stateB.military.formations!['synth_alpha']!,
            supply, 'attack', 1.0, 'op:test:objective_a', 'op:test:staging_a',
        );
        expect(a).toBe(b);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T6 — static-grep guards
// ═══════════════════════════════════════════════════════════════════════════

describe('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT T6: static-grep guards', () => {
    it('combat_math.ts and operation_preparation.ts do not introduce Math.random / Date.now / new Date / performance.now', () => {
        for (const path of ['src/sim/combat/combat_math.ts', 'src/sim/combat/operation_preparation.ts']) {
            const src = readFileSync(path, 'utf8');
            expect(/\bMath\.random\s*\(/.test(src), `${path}: Math.random present`).toBe(false);
            expect(/\bDate\.now\s*\(/.test(src), `${path}: Date.now present`).toBe(false);
            expect(/\bnew\s+Date\s*\(/.test(src), `${path}: new Date( present`).toBe(false);
            expect(/\bperformance\.now\s*\(/.test(src), `${path}: performance.now present`).toBe(false);
        }
    });

    it('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT-tagged code is faction-agnostic', () => {
        const FORBIDDEN = /\b(krivaja|srebrenica|stupcanica|stupčanica|zvornik|bratunac|milici|milić|podrinje|skelani|drina|zepa|žepa|RBiH|HRHB|VRS|ARBiH)\b/i;
        for (const path of ['src/sim/combat/combat_math.ts', 'src/sim/combat/operation_preparation.ts']) {
            const src = readFileSync(path, 'utf8');
            const taggedLines = src.split('\n').filter((line) =>
                line.includes('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT'),
            );
            for (const line of taggedLines) {
                expect(FORBIDDEN.test(line),
                    `${path}: lane-tagged line references faction-specific identifier: "${line.trim()}"`,
                ).toBe(false);
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T7 — caller-side: estimateForceRatio numerator includes context override
// ═══════════════════════════════════════════════════════════════════════════

describe('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT T7: estimateForceRatio applies override for committed-in-transit-to-staging', () => {
    it('numerator power higher when in-transit-to-staging brigade has bad intermediate supply but good staging supply', () => {
        // Construct two parallel fixtures:
        //   A) brigade in_transit toward axis staging (committed). Caller predicate = true.
        //   B) brigade in_transit toward unrelated OSID (boundary). Caller predicate = false.
        // Both have intermediate critical / staging adequate. Post-fix: A returns higher
        // ratio because the override was applied for A's brigade.
        const STAGING = 'op:test:staging_a';
        const TARGET = 'op:test:objective_a';
        const FRIENDLY = 'op:test:friendly_a';
        const ENEMY = 'op:test:enemy_target';
        const UNRELATED = 'op:test:unrelated_z';

        function fixture(destination: string): { state: GameState; op: CorpsOperation } {
            const attackerCorps = 'corps_attacker';
            const defenderCorps = 'corps_defender';
            const attackerSectorId = 'sector_attacker';
            const enemySectorId = 'sector_enemy';

            const attacker = makeBrigade({
                id: 'synth_alpha',
                faction: 'TEST_FACTION',
                location_osid: 'op:test:intermediate_a',
                corps_id: attackerCorps,
                posture: 'attack',
            });
            const defender = makeBrigade({
                id: 'synth_def',
                faction: 'OTHER_FACTION',
                location_osid: ENEMY,
                corps_id: defenderCorps,
                posture: 'defend',
                cohesion: 80,
                morale: 70,
            });

            const formations: Record<string, FormationState> = {
                synth_alpha: attacker,
                synth_def: defender,
            };
            const movement_state: Record<string, unknown> = {
                synth_alpha: {
                    status: 'in_transit',
                    stance: 'column',
                    destination_sids: [destination],
                    turns_remaining: 1,
                },
            };

            const state = {
                meta: { turn: 100, phase: 'war', supply_reserves_enabled: false },
                political: {
                    political_controllers: {
                        [FRIENDLY]: 'TEST_FACTION',
                        [STAGING]: 'TEST_FACTION',
                        [TARGET]: 'OTHER_FACTION',
                        [ENEMY]: 'OTHER_FACTION',
                    },
                },
                military: {
                    formations,
                    brigade_movement_state: movement_state,
                    brigade_movement_orders: {},
                    corps_command: {
                        [attackerCorps]: {
                            command_span: 5, subordinate_count: 1, og_slots: 0, active_ogs: [],
                            corps_exhaustion: 0, stance: 'offensive', active_operations: [],
                        },
                        [defenderCorps]: {
                            command_span: 5, subordinate_count: 1, og_slots: 0, active_ogs: [],
                            corps_exhaustion: 0, stance: 'defensive', active_operations: [],
                        },
                    },
                    corps_front_sectors: {
                        [attackerSectorId]: {
                            sector_id: attackerSectorId, corps_id: attackerCorps,
                            faction: 'TEST_FACTION', opposing_factions: ['OTHER_FACTION'],
                            edge_ids: [],
                            sub_segments: [{
                                id: 'sub_attacker', edge_ids: [],
                                friendly_osids: [STAGING, FRIENDLY],
                                enemy_osids: [TARGET, ENEMY],
                                coverage_length: 1,
                            }],
                            length_edges: 1,
                            territory_osids: [STAGING, FRIENDLY],
                            assigned_brigade_ids: ['synth_alpha'],
                            reserve_brigade_ids: [], density: 1, threat_ratio: 1,
                            defensive_power: 1, sector_stance: 'attack', stance_source: 'bot',
                        },
                        [enemySectorId]: {
                            sector_id: enemySectorId, corps_id: defenderCorps,
                            faction: 'OTHER_FACTION', opposing_factions: ['TEST_FACTION'],
                            edge_ids: [],
                            sub_segments: [{
                                id: 'sub_enemy', edge_ids: [],
                                friendly_osids: [TARGET, ENEMY],
                                enemy_osids: [STAGING, FRIENDLY],
                                coverage_length: 1,
                            }],
                            length_edges: 1,
                            territory_osids: [TARGET, ENEMY],
                            assigned_brigade_ids: ['synth_def'],
                            reserve_brigade_ids: [], density: 1, threat_ratio: 1,
                            defensive_power: 1, sector_stance: 'defend', stance_source: 'bot',
                        },
                    },
                    sector_intel: {
                        [attackerSectorId]: [{
                            enemy_sector_id: enemySectorId, enemy_faction: 'OTHER_FACTION',
                            enemy_corps_id: defenderCorps, front_edge_count: 3,
                            strength_category: 'moderate', posture_observed: 'defensive',
                            offensive_signs: false, confidence: 0.9, turns_in_contact: 5,
                            visible_brigade_ids: [], last_updated_turn: 95,
                        }],
                    },
                    named_officers: {},
                    named_officer_data: [],
                },
                factions: {},
                population: { byMunicipality: {} },
                displacement: {},
            } as unknown as GameState;

            const op = {
                name: 'Op T7',
                type: 'sector_attack',
                phase: 'planning',
                started_turn: 95,
                phase_started_turn: 95,
                participating_brigades: ['synth_alpha'],
                sector_id: attackerSectorId,
                staging_osid: STAGING,
                objectives: [TARGET],
                planning_duration: 3,
                supply_readiness: 1.0,
                momentum: 0,
                failure_count: 0,
                consecutive_failures_on_current: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            } as unknown as CorpsOperation;

            return { state, op };
        }

        const supply = makeSupply('TEST_FACTION', {
            'op:test:intermediate_a': 'critical',
            [STAGING]: 'adequate',
            [FRIENDLY]: 'adequate',
        });

        // A: in-transit-to-staging (committed). Caller should apply override.
        const fxA = fixture(STAGING);
        const ratioA = estimateForceRatio(fxA.state, fxA.op, 5, 0.9, supply);

        // B: in-transit-to-unrelated. Caller should NOT apply override.
        const fxB = fixture(UNRELATED);
        const ratioB = estimateForceRatio(fxB.state, fxB.op, 5, 0.9, supply);

        // Post-fix: A's brigade has supply context overridden to staging (adequate=1.0),
        // B's brigade keeps current location supply context (critical=0.45 attack).
        // A's numerator power is ~2.22× B's → A's ratio is ~2.22× B's.
        expect(ratioA).toBeGreaterThan(ratioB);
        // Pre-fix: ratioA === ratioB (override not applied for either).
        // Magnitude: same as supply mult delta (1.0 / 0.45 ≈ 2.22).
        const factor = ratioA / ratioB;
        expect(factor).toBeGreaterThan(1.5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Predicate sanity check (predecessor lane export)
// ═══════════════════════════════════════════════════════════════════════════

describe('LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT predicate sanity', () => {
    it('isCommittedInTransitTo is exported and returns true for in_transit-to-relevant brigade', () => {
        const state = makeState({
            brigades: [{
                id: 'synth_alpha',
                location_osid: 'op:test:intermediate_a',
                in_transit_destination: 'op:test:staging_a',
            }],
        });
        const relevant = new Set<string>(['op:test:staging_a']);
        expect(isCommittedInTransitTo(state, 'synth_alpha' as never, relevant)).toBe(true);
    });

    it('isCommittedInTransitTo returns false for in_transit-to-unrelated', () => {
        const state = makeState({
            brigades: [{
                id: 'synth_alpha',
                location_osid: 'op:test:intermediate_a',
                in_transit_destination: 'op:test:unrelated_z',
            }],
        });
        const relevant = new Set<string>(['op:test:staging_a']);
        expect(isCommittedInTransitTo(state, 'synth_alpha' as never, relevant)).toBe(false);
    });
});
