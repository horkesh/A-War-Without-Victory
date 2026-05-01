/**
 * Phase 3 RED-first tests for `estimateForceRatio` defender-modifier integration.
 * LANE-2026-05-02: estimateForceRatio defender-modifier integration MEGA-LANE.
 *
 * Pre-fix behavior: predictor sums personnel only — defender entrenchment, equipment,
 * forest, urban, supply, morale are IGNORED. ARBiH light-infantry attacking entrenched
 * VRS gets a 7+ "fantasy ratio" → cautious commanders launch into 1:6 repulses.
 *
 * Post-fix behavior: predictor calls combat-math helpers (computeAttackerPower /
 * rankDefendersByPower) so defender modifiers are honored — same modifiers as
 * combat resolution. Honest ratios: < 1.5 for unfavorable terrain matchups,
 * preserved >= 3.0 for clear-superiority cases, preserved 0.85–1.15 for parity.
 *
 * Test families (per /qa-engineer Phase 1 synthesis):
 *   Family 1 RED  (2 tests): Grmeč shape + Sana shape — fantasy-ratio bug.
 *   Family 2 GREEN (1 test): clear superiority preserved post-fix.
 *   Family 3 GREEN (1 test): neutral parity preserved post-fix.
 *   Family 4 ablation (6 tests): toggle ONE defender modifier at a time.
 *   Family 5 determinism (2 tests): identical-input identical-output, sort-invariant.
 */

import { describe, it, expect } from 'vitest';
import type {
    CorpsOperation,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import { estimateForceRatio } from '../src/sim/combat/operation_preparation.js';
import { setUrbanOsidSet, setForestOsidSet } from '../src/sim/combat/combat_math.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

// ─── Synthetic-state builder ────────────────────────────────────────────────
// Minimal GameState shape sufficient for estimateForceRatio. Mirrors
// probe_preparation.test.ts pattern.

function makeMinimalState(): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        political: { political_controllers: {} },
        military: {
            formations: {},
            corps_command: {},
            corps_front_sectors: {},
            sector_intel: {},
            named_officers: {},
            named_officer_data: [],
        },
        factions: {},
        population: { byMunicipality: {} },
        displacement: {},
    } as unknown as GameState;
}

interface FormationOpts {
    id: string;
    faction?: string;
    personnel?: number;
    location_osid?: string;
    corps_id?: string;
    posture?: string;
    cohesion?: number;
    morale?: number;
    experience?: number;
    entrenchment_turns?: number;
    composition?: FormationState['composition'];
    equipment_decay?: number;
    kind?: FormationState['kind'];
}

function makeBrigade(opts: FormationOpts): FormationState {
    return {
        id: opts.id,
        faction: opts.faction ?? 'RBiH',
        kind: opts.kind ?? 'brigade',
        name: `Brigade ${opts.id}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: opts.personnel ?? 1500,
        location_osid: opts.location_osid ?? 'op:test:friendly_osid',
        corps_id: opts.corps_id ?? 'corps_test',
        equipment_class: 'light_infantry',
        cohesion: opts.cohesion ?? 80,
        morale: opts.morale ?? 70,
        experience: opts.experience ?? 0.5,
        posture: opts.posture ?? 'defend',
        entrenchment_turns: opts.entrenchment_turns,
        composition: opts.composition,
        equipment_decay: opts.equipment_decay,
    } as unknown as FormationState;
}

/** Light-infantry composition: minimal heavy weapons. */
const LIGHT_INFANTRY_COMP: FormationState['composition'] = {
    infantry: 1500,
    tanks: 0,
    artillery: 0,
    aa_systems: 0,
    tank_condition: { operational: 0, repair: 0, damaged: 0 },
    artillery_condition: { operational: 0, repair: 0, damaged: 0 },
} as unknown as FormationState['composition'];

/** Equipped composition: tanks + artillery, full operational. */
const EQUIPPED_COMP: FormationState['composition'] = {
    infantry: 900,
    tanks: 12,
    artillery: 18,
    aa_systems: 4,
    tank_condition: { operational: 1.0, repair: 0, damaged: 0 },
    artillery_condition: { operational: 1.0, repair: 0, damaged: 0 },
} as unknown as FormationState['composition'];

interface FixtureOpts {
    /** Attacker brigades. */
    attackers: FormationState[];
    /** Defender brigades, all in enemy_sector. */
    defenders: FormationState[];
    /** OSID controlled by attacker (start). */
    friendlyOsid?: string;
    /** OSID controlled by defender (target). */
    targetOsid?: string;
    /** Confidence in sector intel. */
    intelConfidence?: number;
    /** Defender corps stance. */
    defenderCorpsStance?: 'offensive' | 'defensive' | 'screening' | 'rest';
    /** Attacker corps stance. */
    attackerCorpsStance?: 'offensive' | 'defensive' | 'screening' | 'rest';
}

function makeFixture(opts: FixtureOpts): { state: GameState; op: CorpsOperation } {
    const friendlyOsid = opts.friendlyOsid ?? 'op:test:friendly_osid';
    const targetOsid = opts.targetOsid ?? 'op:test:enemy_target';
    const attackerSectorId = 'sector_attacker';
    const enemySectorId = 'sector_enemy';
    const attackerCorps = 'corps_attacker';
    const defenderCorps = 'corps_defender';

    const state = makeMinimalState();

    const attackerFaction = opts.attackers[0]?.faction ?? 'RBiH';
    const defenderFaction = opts.defenders[0]?.faction ?? 'RS';

    // Re-target attackers to the friendly OSID and corps
    const attackerFormations: FormationState[] = opts.attackers.map(a => ({
        ...a,
        location_osid: a.location_osid ?? friendlyOsid,
        corps_id: a.corps_id ?? attackerCorps,
        faction: a.faction ?? attackerFaction,
    } as FormationState));
    // Re-target defenders to target OSID and defender corps
    const defenderFormations: FormationState[] = opts.defenders.map(d => ({
        ...d,
        location_osid: d.location_osid ?? targetOsid,
        corps_id: d.corps_id ?? defenderCorps,
        faction: d.faction ?? defenderFaction,
    } as FormationState));

    state.military.formations = {} as Record<string, FormationState>;
    for (const f of attackerFormations) state.military.formations![f.id] = f;
    for (const f of defenderFormations) state.military.formations![f.id] = f;

    state.political.political_controllers = {
        [friendlyOsid]: attackerFaction,
        [targetOsid]: defenderFaction,
    };

    state.military.corps_command = {
        [attackerCorps]: {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: opts.attackerCorpsStance ?? 'offensive',
            active_operations: [],
        },
        [defenderCorps]: {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: opts.defenderCorpsStance ?? 'defensive',
            active_operations: [],
        },
    } as unknown as GameState['military']['corps_command'];

    state.military.corps_front_sectors = {
        [attackerSectorId]: {
            sector_id: attackerSectorId,
            corps_id: attackerCorps,
            faction: attackerFaction,
            opposing_factions: [defenderFaction],
            edge_ids: [],
            sub_segments: [],
            length_edges: 1,
            territory_osids: [friendlyOsid],
            assigned_brigade_ids: attackerFormations.map(a => a.id),
            reserve_brigade_ids: [],
            density: 1,
            threat_ratio: 1,
            defensive_power: 1,
            sector_stance: 'attack',
            stance_source: 'bot',
        },
        [enemySectorId]: {
            sector_id: enemySectorId,
            corps_id: defenderCorps,
            faction: defenderFaction,
            opposing_factions: [attackerFaction],
            edge_ids: [],
            sub_segments: [{
                id: 'sub_enemy',
                edge_ids: [],
                friendly_osids: [targetOsid],
                enemy_osids: [friendlyOsid],
                coverage_length: 1,
            }],
            length_edges: 1,
            territory_osids: [targetOsid],
            assigned_brigade_ids: defenderFormations.map(d => d.id),
            reserve_brigade_ids: [],
            density: 1,
            threat_ratio: 1,
            defensive_power: 1,
            sector_stance: 'defend',
            stance_source: 'bot',
        },
    } as unknown as GameState['military']['corps_front_sectors'];

    state.military.sector_intel = {
        [attackerSectorId]: [{
            enemy_sector_id: enemySectorId,
            enemy_faction: defenderFaction,
            enemy_corps_id: defenderCorps,
            front_edge_count: 3,
            strength_category: 'moderate',
            posture_observed: 'defensive',
            offensive_signs: false,
            confidence: opts.intelConfidence ?? 0.9,
            turns_in_contact: 5,
            visible_brigade_ids: [],
            last_updated_turn: 8,
        }],
    } as unknown as GameState['military']['sector_intel'];

    const op: CorpsOperation = {
        name: 'Op Force Ratio Test',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 5,
        phase_started_turn: 5,
        participating_brigades: attackerFormations.map(a => a.id),
        sector_id: attackerSectorId,
        objectives: [targetOsid],
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

// ═══════════════════════════════════════════════════════════════════════════
// Family 1 RED — fantasy-ratio bug (Grmeč + Sana shapes)
// ═══════════════════════════════════════════════════════════════════════════

describe('Family 1 RED — fantasy-ratio bug', () => {
    it('Grmeč shape — ARBiH light-inf vs entrenched VRS on highland forest yields ratio < 1.5 (post-fix)', () => {
        // Pre-fix behavior: 9000 atk personnel / 1500 def personnel = 6.0+ raw → 7+ with bias
        // Post-fix behavior: defender 18-turn entrenchment + forest highland + equipment
        //   should drag ratio below 1.5 honest go/no-go threshold.
        setForestOsidSet(new Set<string>(['op:test:enemy_target']));
        setUrbanOsidSet(new Set<string>());
        const fixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'arbih_a1', faction: 'RBiH', personnel: 1500, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_a2', faction: 'RBiH', personnel: 1500, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_a3', faction: 'RBiH', personnel: 1500, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_a4', faction: 'RBiH', personnel: 1500, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_a5', faction: 'RBiH', personnel: 1500, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_a6', faction: 'RBiH', personnel: 1500, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
            ],
            defenders: [
                makeBrigade({
                    id: 'vrs_def1', faction: 'RS', personnel: 1500,
                    composition: EQUIPPED_COMP, posture: 'dig_in',
                    entrenchment_turns: 18, experience: 0.7, morale: 80, cohesion: 85,
                }),
            ],
            intelConfidence: 0.9,
        });

        const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
        // Post-fix: forest + entrenchment + equipped defender → honest ratio < 1.5
        // Pre-fix: 9000/1500 ≈ 6.0+ raw, > 5.0 with bias.
        expect(ratio).toBeLessThan(1.5);
    });

    it('Sana shape — ARBiH light-inf vs urban + equipped VRS yields ratio < 1.5 (post-fix)', () => {
        // 8000 atk personnel / 2200 def personnel pre-fix = 3.6+ raw
        // Post-fix: urban 2.0× + equipped → ratio under 1.5
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>(['op:test:enemy_target']));
        const fixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'arbih_b1', faction: 'RBiH', personnel: 2000, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_b2', faction: 'RBiH', personnel: 2000, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_b3', faction: 'RBiH', personnel: 2000, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
                makeBrigade({ id: 'arbih_b4', faction: 'RBiH', personnel: 2000, composition: LIGHT_INFANTRY_COMP, posture: 'attack' }),
            ],
            defenders: [
                makeBrigade({
                    id: 'vrs_def_urban', faction: 'RS', personnel: 2200,
                    composition: EQUIPPED_COMP, posture: 'defend',
                    entrenchment_turns: 6, experience: 0.6, morale: 75, cohesion: 80,
                }),
            ],
            intelConfidence: 0.9,
        });

        const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
        expect(ratio).toBeLessThan(1.5);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Family 2 GREEN — clear superiority preserved
// ═══════════════════════════════════════════════════════════════════════════

describe('Family 2 GREEN — clear superiority preserved', () => {
    it('VRS Corridor 92 shape — equipped attacker with overwhelming personnel yields ratio >= 3.0', () => {
        // Pre-fix: 12000/1500 = 8.0
        // Post-fix: defender bare (no entrenchment, no urban, no forest, light militia) →
        //   ratio should remain in 5.0–10.0 range per /war-or-game GREEN bound.
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());
        const fixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'vrs_a1', faction: 'RS', personnel: 3000, composition: EQUIPPED_COMP, posture: 'attack', morale: 80, cohesion: 85, experience: 0.6 }),
                makeBrigade({ id: 'vrs_a2', faction: 'RS', personnel: 3000, composition: EQUIPPED_COMP, posture: 'attack', morale: 80, cohesion: 85, experience: 0.6 }),
                makeBrigade({ id: 'vrs_a3', faction: 'RS', personnel: 3000, composition: EQUIPPED_COMP, posture: 'attack', morale: 80, cohesion: 85, experience: 0.6 }),
                makeBrigade({ id: 'vrs_a4', faction: 'RS', personnel: 3000, composition: EQUIPPED_COMP, posture: 'attack', morale: 80, cohesion: 85, experience: 0.6 }),
            ],
            defenders: [
                makeBrigade({
                    id: 'arbih_def_thin', faction: 'RBiH', personnel: 1200,
                    composition: LIGHT_INFANTRY_COMP, posture: 'defend',
                    entrenchment_turns: 0, experience: 0.2, morale: 40, cohesion: 50,
                }),
            ],
            intelConfidence: 0.9,
        });

        const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
        // Per /war-or-game: VRS Corridor 92 should be 5.0–10.0 honest.
        // Stop-gate: ratio must stay >= 2.5 to preserve "still recognizes superiority."
        expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Family 3 GREEN — neutral parity preserved
// ═══════════════════════════════════════════════════════════════════════════

describe('Family 3 GREEN — neutral parity preserved', () => {
    it('balanced forces on neutral terrain yield ratio in 0.85–1.15', () => {
        // Symmetric brigades, both equipped, no terrain modifiers, no entrenchment.
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());
        const fixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_n1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_n2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_n1', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5, entrenchment_turns: 0 }),
                makeBrigade({ id: 'def_n2', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5, entrenchment_turns: 0 }),
            ],
            intelConfidence: 0.9,
        });

        const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
        // Symmetric forces: ratio ≈ 1.0. Allow 0.85–1.15 band for posture asymmetry +
        // stacking discount of secondary defender (STACKING_DEFENDER_SUPPORT).
        expect(ratio).toBeGreaterThanOrEqual(0.85);
        expect(ratio).toBeLessThanOrEqual(1.15);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Family 4 ablation — toggle ONE defender modifier per test (monotonic direction)
// ═══════════════════════════════════════════════════════════════════════════

/** Build a baseline (no defender modifiers) for ablation pairing. */
function buildAblationBaseline(): { ratio: number; cleanup: () => void } {
    setForestOsidSet(new Set<string>());
    setUrbanOsidSet(new Set<string>());
    const fixture = makeFixture({
        attackers: [
            makeBrigade({ id: 'atk_ab1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            makeBrigade({ id: 'atk_ab2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
        ],
        defenders: [
            makeBrigade({
                id: 'def_baseline', faction: 'RS', personnel: 2000,
                composition: EQUIPPED_COMP, posture: 'defend',
                morale: 70, cohesion: 75, experience: 0.5,
                entrenchment_turns: 0,
            }),
        ],
        intelConfidence: 0.9,
    });
    const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
    return { ratio, cleanup: () => { setForestOsidSet(new Set()); setUrbanOsidSet(new Set()); } };
}

describe('Family 4 ablation — defender modifier monotonicity', () => {
    it('entrenchment toggle: defender with 18 entrenchment_turns → ratio LOWER than no-entrenchment baseline', () => {
        const baseline = buildAblationBaseline();
        const fixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_ent1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_ent2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({
                    id: 'def_entrenched', faction: 'RS', personnel: 2000,
                    composition: EQUIPPED_COMP, posture: 'dig_in',
                    morale: 70, cohesion: 75, experience: 0.5,
                    entrenchment_turns: 18,
                }),
            ],
            intelConfidence: 0.9,
        });
        const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
        // Monotonic: more defender entrenchment → lower attacker ratio.
        expect(ratio).toBeLessThan(baseline.ratio);
        baseline.cleanup();
    });

    it('equipment toggle: defender with EQUIPPED_COMP yields LOWER ratio than light-inf-only defender', () => {
        // Baseline: defender = LIGHT_INFANTRY_COMP, no other mods
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());
        const baseFixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_eq1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_eq2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_light', faction: 'RS', personnel: 2000, composition: LIGHT_INFANTRY_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });
        const baseRatio = estimateForceRatio(baseFixture.state, baseFixture.op, 5, 0.9);

        const equipFixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_eq3', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_eq4', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_equipped', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });
        const equipRatio = estimateForceRatio(equipFixture.state, equipFixture.op, 5, 0.9);
        expect(equipRatio).toBeLessThan(baseRatio);
    });

    it('forest toggle: defender on forest OSID yields LOWER ratio than non-forest baseline', () => {
        const baseline = buildAblationBaseline();
        setForestOsidSet(new Set<string>(['op:test:enemy_target']));
        setUrbanOsidSet(new Set<string>());
        const fixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_fo1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_fo2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_forest', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });
        const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
        expect(ratio).toBeLessThan(baseline.ratio);
        baseline.cleanup();
    });

    it('urban toggle: defender on urban OSID yields LOWER ratio than non-urban baseline', () => {
        const baseline = buildAblationBaseline();
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>(['op:test:enemy_target']));
        const fixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_ur1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_ur2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_urban', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });
        const ratio = estimateForceRatio(fixture.state, fixture.op, 5, 0.9);
        expect(ratio).toBeLessThan(baseline.ratio);
        baseline.cleanup();
    });

    it('supply toggle: attacker in critical-supply OSID yields LOWER ratio than baseline', () => {
        // Baseline: no supply state, attackers default to 0.4 attack/0.5 defend mult
        // With explicit "adequate" supply state for attackers, atk supply mult = 1.0 (vs 0.4 default).
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());
        const supplyAdequate: SupplyStateByOsidReport = {
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'op:test:friendly_osid', state: 'adequate' },
                    ],
                },
                {
                    faction_id: 'RS',
                    by_osid: [
                        { osid: 'op:test:enemy_target', state: 'adequate' },
                    ],
                },
            ],
        } as unknown as SupplyStateByOsidReport;
        const supplyAtkCritical: SupplyStateByOsidReport = {
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'op:test:friendly_osid', state: 'critical' },
                    ],
                },
                {
                    faction_id: 'RS',
                    by_osid: [
                        { osid: 'op:test:enemy_target', state: 'adequate' },
                    ],
                },
            ],
        } as unknown as SupplyStateByOsidReport;

        const baseFixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_sup1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_sup2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_sup1', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });

        // Cast to access the post-Phase-4 expanded signature; ts-expect-error guards
        // the legacy 4-arg call still working pre-Phase-4 implementation.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const baseRatio = (estimateForceRatio as any)(baseFixture.state, baseFixture.op, 5, 0.9, supplyAdequate);

        const critFixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_sup3', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_sup4', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_sup2', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const critRatio = (estimateForceRatio as any)(critFixture.state, critFixture.op, 5, 0.9, supplyAtkCritical);

        // Critical attacker supply → lower attack power → lower ratio.
        expect(critRatio).toBeLessThan(baseRatio);
    });

    it('morale toggle: defender at 80 morale yields LOWER ratio than defender at 30 morale', () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());
        const lowMoraleFixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_mo1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_mo2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_lowmo', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 30, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });
        const lowMoraleRatio = estimateForceRatio(lowMoraleFixture.state, lowMoraleFixture.op, 5, 0.9);

        const highMoraleFixture = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_mo3', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_mo4', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_highmo', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 80, cohesion: 75, experience: 0.5 }),
            ],
            intelConfidence: 0.9,
        });
        const highMoraleRatio = estimateForceRatio(highMoraleFixture.state, highMoraleFixture.op, 5, 0.9);

        // High-morale defender provides MORE defensive power (graduated curve) → lower attacker ratio.
        expect(highMoraleRatio).toBeLessThan(lowMoraleRatio);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Family 5 determinism — repeatability + sort invariance
// ═══════════════════════════════════════════════════════════════════════════

describe('Family 5 determinism', () => {
    it('repeatability — identical inputs produce identical outputs', () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());
        const f1 = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_d1', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_d2', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_d1', faction: 'RS', personnel: 2000, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5, entrenchment_turns: 4 }),
            ],
            intelConfidence: 0.9,
        });
        const r1 = estimateForceRatio(f1.state, f1.op, 5, 0.9);
        const r2 = estimateForceRatio(f1.state, f1.op, 5, 0.9);
        const r3 = estimateForceRatio(f1.state, f1.op, 5, 0.9);
        expect(r1).toBe(r2);
        expect(r2).toBe(r3);
    });

    it('sort invariance — brigade insertion order does not change ratio', () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        // Two identical fixtures, brigades inserted in opposite order.
        const fA = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_zz', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_aa', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_zz', faction: 'RS', personnel: 1500, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5, entrenchment_turns: 4 }),
                makeBrigade({ id: 'def_aa', faction: 'RS', personnel: 1500, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5, entrenchment_turns: 4 }),
            ],
            intelConfidence: 0.9,
        });
        const rA = estimateForceRatio(fA.state, fA.op, 5, 0.9);

        const fB = makeFixture({
            attackers: [
                makeBrigade({ id: 'atk_aa', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
                makeBrigade({ id: 'atk_zz', faction: 'RBiH', personnel: 2000, composition: EQUIPPED_COMP, posture: 'attack', morale: 70, cohesion: 75, experience: 0.5 }),
            ],
            defenders: [
                makeBrigade({ id: 'def_aa', faction: 'RS', personnel: 1500, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5, entrenchment_turns: 4 }),
                makeBrigade({ id: 'def_zz', faction: 'RS', personnel: 1500, composition: EQUIPPED_COMP, posture: 'defend', morale: 70, cohesion: 75, experience: 0.5, entrenchment_turns: 4 }),
            ],
            intelConfidence: 0.9,
        });
        const rB = estimateForceRatio(fB.state, fB.op, 5, 0.9);

        expect(rA).toBe(rB);
    });
});
