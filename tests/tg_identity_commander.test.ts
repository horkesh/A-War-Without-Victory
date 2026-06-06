/**
 * Tactical Group identity + named TG commander tests (ADR-0006 Phase 3A).
 *
 * Covers:
 *   1. Faction-asymmetric naming generator (pure): VRS geographic, ARBiH numbered,
 *      HVO operational zone. Deterministic — repeated calls stable.
 *   2. selectTacticalCommander / assignTacticalCommander: picks the tactical_commander
 *      rank pool, sets op.tg_commander_officer_id, flips officer to active.
 *   3. (flag-on) formTgsAtReadyTransition assigns a tactical_commander + populates the
 *      anchor sector's display_name when a TG forms.
 *   4. (flag-on) getThreeTierOfficerMod applies the tactical_commander mod to the ANCHOR
 *      only — a donor in the same op keeps the corps/op mod (anchor != donor).
 */

import { describe, expect, it, vi } from 'vitest';
import type {
    CorpsFrontSector,
    CorpsOperation,
    FormationState,
    GameState,
    MilitaryState,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import {
    generateTacticalGroupName,
    humanizeToken,
} from '../src/sim/combat/tactical_group_naming.js';
import {
    selectTacticalCommander,
    assignTacticalCommander,
    releaseTacticalCommander,
} from '../src/sim/combat/officer_system.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. Faction-asymmetric naming generator (pure)
// ═══════════════════════════════════════════════════════════════════════════

describe('generateTacticalGroupName — faction-asymmetric naming', () => {
    it('VRS uses geographic OG/TG names (TG <Place> first, <Place> OG after)', () => {
        expect(generateTacticalGroupName({ faction: 'RS', corps_id: 'vrs_drina', anchor_osid: 'drina_2', ordinal: 1 }))
            .toBe('TG Drina');
        expect(generateTacticalGroupName({ faction: 'RS', corps_id: 'vrs_1st_krajina', anchor_osid: 'majevica', ordinal: 2 }))
            .toBe('Majevica OG');
    });

    it('ARBiH uses numbered operativna grupa scoped to the place', () => {
        expect(generateTacticalGroupName({ faction: 'RBiH', corps_id: 'arbih_2nd_corps', anchor_osid: 'tuzla', ordinal: 1 }))
            .toBe('1. OG (Tuzla)');
        expect(generateTacticalGroupName({ faction: 'RBiH', corps_id: 'arbih_3rd_corps', anchor_osid: 'zavidovici_1', ordinal: 3 }))
            .toBe('3. OG (Zavidovici)');
    });

    it('HVO uses operational zones (OZ <Place>)', () => {
        expect(generateTacticalGroupName({ faction: 'HRHB', corps_id: 'hvo_main_staff', anchor_osid: 'mostar', ordinal: 1 }))
            .toBe('OZ Mostar');
    });

    it('is deterministic — repeated calls are byte-stable', () => {
        const p = { faction: 'RS' as const, corps_id: 'vrs_drina', anchor_osid: 'foca_2', ordinal: 1 };
        expect(generateTacticalGroupName(p)).toBe(generateTacticalGroupName(p));
    });

    it('humanizeToken drops trailing micro-OSID numeric suffix and title-cases', () => {
        expect(humanizeToken('foca_2')).toBe('Foca');
        expect(humanizeToken('bosanski_novi')).toBe('Bosanski Novi');
        expect(humanizeToken('sarajevo')).toBe('Sarajevo');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════════════

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'arbih_3rd_corps',
        location_osid: 'op:m:s0',
        personnel: 2000,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function tacticalOfficer(id: string, overrides: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id, name: id, faction: 'RBiH', rank: 'tactical_commander',
        competence: 4, aggressiveness: 4, defensive_skill: 3, political_reliability: 3,
        home_corps_id: 'arbih_3rd_corps',
        available_from_turn: 0, origin: 'military', casualty_vulnerability: 0.1,
        can_improve: true, improvement_rate: 0.05, pool_tier: 'tier_a',
        ...overrides,
    };
}

function officerState(id: string, overrides: Partial<NamedOfficerState> = {}): NamedOfficerState {
    return {
        officer_id: id, status: 'reserve', assigned_corps_id: null,
        turns_in_command: 0, battles: 0, victories: 0,
        effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false,
        ...overrides,
    };
}

function stateWith(opts: {
    brigades: FormationState[];
    officerData?: NamedOfficer[];
    officers?: Record<string, NamedOfficerState>;
    sectors?: Record<string, CorpsFrontSector>;
    turn?: number;
}): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of opts.brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: opts.turn ?? 5, seed: 'tg-identity', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: {},
            corps_front_sectors: opts.sectors,
            named_officer_data: opts.officerData,
            named_officers: opts.officers,
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

function baseOp(overrides: Partial<CorpsOperation>): CorpsOperation {
    return {
        name: 'op_identity_test',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 0,
        phase_started_turn: 0,
        participating_brigades: ['anchor'],
        staging_osid: 'op:m:s0',
        ...overrides,
    } as CorpsOperation;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. selectTacticalCommander / assignTacticalCommander
// ═══════════════════════════════════════════════════════════════════════════

describe('selectTacticalCommander / assignTacticalCommander', () => {
    it('selects a reserve tactical_commander, preferring home-corps match + competence', () => {
        const state = stateWith({
            brigades: [brigade('anchor')],
            officerData: [
                tacticalOfficer('tc_home_hi', { home_corps_id: 'arbih_3rd_corps', competence: 5 }),
                tacticalOfficer('tc_home_lo', { home_corps_id: 'arbih_3rd_corps', competence: 3 }),
                tacticalOfficer('tc_other', { home_corps_id: 'arbih_1st_corps', competence: 5 }),
            ],
            officers: {
                tc_home_hi: officerState('tc_home_hi'),
                tc_home_lo: officerState('tc_home_lo'),
                tc_other: officerState('tc_other'),
            },
        });
        expect(selectTacticalCommander(state, 'arbih_3rd_corps', 'RBiH')).toBe('tc_home_hi');
    });

    it('ignores corps_commander rank officers (only tactical_commander pool)', () => {
        const state = stateWith({
            brigades: [brigade('anchor')],
            officerData: [tacticalOfficer('tc', { rank: 'corps_commander' })],
            officers: { tc: officerState('tc') },
        });
        expect(selectTacticalCommander(state, 'arbih_3rd_corps', 'RBiH')).toBeNull();
    });

    it('assignTacticalCommander sets tg_commander_officer_id and flips officer active', () => {
        const state = stateWith({
            brigades: [brigade('anchor')],
            officerData: [tacticalOfficer('tc')],
            officers: { tc: officerState('tc') },
        });
        const op = baseOp({});
        assignTacticalCommander(state, op, 'arbih_3rd_corps', 'RBiH');
        expect(op.tg_commander_officer_id).toBe('tc');
        expect(state.military.named_officers!.tc.status).toBe('active');
        expect(state.military.named_officers!.tc.assigned_operation).toBe('op_identity_test');
    });

    it('releaseTacticalCommander returns the officer to reserve', () => {
        const state = stateWith({
            brigades: [brigade('anchor')],
            officerData: [tacticalOfficer('tc')],
            officers: { tc: officerState('tc') },
        });
        const op = baseOp({});
        assignTacticalCommander(state, op, 'arbih_3rd_corps', 'RBiH');
        releaseTacticalCommander(state, op);
        expect(state.military.named_officers!.tc.status).toBe('reserve');
        expect(state.military.named_officers!.tc.assigned_operation).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Flag-on TG identity wiring (formTgsAtReadyTransition)
// ═══════════════════════════════════════════════════════════════════════════

async function withFormationFlagOn() {
    vi.resetModules();
    vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
        const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
            '../src/sim/combat/tactical_group_config.js',
        );
        return { ...actual, ENABLE_TG_FORMATION: true };
    });
    return import('../src/sim/combat/operation_preparation.js');
}

describe('formTgsAtReadyTransition — TG identity (flag-on)', () => {
    it('assigns a tactical_commander and populates the anchor sector display_name', async () => {
        const { formTgsAtReadyTransition } = await withFormationFlagOn();
        const sectors: Record<string, CorpsFrontSector> = {
            'sector:arbih_3rd_corps': {
                sector_id: 'sector:arbih_3rd_corps',
                corps_id: 'arbih_3rd_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [], sub_segments: [], length_edges: 0, territory_osids: [],
                assigned_brigade_ids: [], reserve_brigade_ids: [],
                density: 0, threat_ratio: 0, defensive_power: 0,
                sector_stance: 'defend', stance_source: 'bot',
            },
        };
        const state = stateWith({
            brigades: [
                brigade('anchor', { location_osid: 'zavidovici_1' }),
                brigade('d1', { location_osid: 'zavidovici_1' }),
            ],
            officerData: [tacticalOfficer('tc')],
            officers: { tc: officerState('tc') },
            sectors,
        });
        const op = baseOp({ type: 'sector_attack', participating_brigades: ['anchor'], staging_osid: 'zavidovici_1' });
        formTgsAtReadyTransition(state, op, 5);

        // TG formed
        expect(Object.keys(state.military!.tactical_groups!)).toHaveLength(1);
        // tactical_commander assigned to the op
        expect(op.tg_commander_officer_id).toBe('tc');
        // ARBiH numbered OG name on the sector
        expect(state.military!.corps_front_sectors!['sector:arbih_3rd_corps'].display_name)
            .toBe('1. OG (Zavidovici)');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Flag-on anchor combat mod (getThreeTierOfficerMod)
// ═══════════════════════════════════════════════════════════════════════════

async function withCombatFlagOn() {
    vi.resetModules();
    vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
        const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
            '../src/sim/combat/tactical_group_config.js',
        );
        return { ...actual, ENABLE_TG_FORMATION: true };
    });
    return import('../src/sim/combat/combat_math.js');
}

describe('getThreeTierOfficerMod — tactical_commander anchor mod (flag-on)', () => {
    it('applies the tactical_commander mod to the ANCHOR, not to a donor', async () => {
        const { getThreeTierOfficerMod } = await withCombatFlagOn();

        const op: CorpsOperation = baseOp({
            name: 'op_anchor_mod',
            type: 'sector_attack',
            phase: 'execution',
            tg_commander_officer_id: 'tc',
            participating_brigades: ['anchor', 'donor'],
        });

        const state = stateWith({
            brigades: [
                brigade('anchor', { location_osid: 'op:m:s0' }),
                brigade('donor', { location_osid: 'op:m:s0' }),
            ],
            officerData: [tacticalOfficer('tc', { competence: 5, aggressiveness: 5 })],
            officers: { tc: officerState('tc', { status: 'active', assigned_operation: 'op_anchor_mod' }) },
        });
        // Wire the op into corps_command so findBrigadeOperation resolves it.
        state.military.corps_command = {
            arbih_3rd_corps: { active_operations: [op] } as any,
        } as any;
        // The TG records the anchor (only the anchor gets the tactical_commander mod).
        state.military.tactical_groups = {
            'tg:arbih_3rd_corps:op_anchor_mod:anchor': {
                id: 'tg:arbih_3rd_corps:op_anchor_mod:anchor',
                corps_id: 'arbih_3rd_corps',
                op_id: 'op_anchor_mod',
                anchor_brigade_id: 'anchor',
                donor_contributions: [],
                location_osid: 'op:m:s0',
                status: 'engaged',
                formed_on_turn: 1,
                cohesion: 100,
            },
        };

        const anchorMod = getThreeTierOfficerMod(state.military.formations!.anchor, state, 'attack');
        const donorMod = getThreeTierOfficerMod(state.military.formations!.donor, state, 'attack');

        // Anchor gets the high-competence tactical_commander mod; donor (not the TG anchor)
        // does NOT — so the two mods differ.
        expect(anchorMod).not.toBe(donorMod);
        expect(anchorMod).toBeGreaterThan(0);
    });
});
