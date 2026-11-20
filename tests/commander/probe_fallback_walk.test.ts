/**
 * F1b: the generic probe fallback walks the ranked survivors.
 *
 * Main took ONE brigade (`survivors[0]`) and stood the corps down when every target in
 * that brigade's sector failed. F1b walks the survivors in the existing order (fitness,
 * then id) to the first brigade whose (sector, location) yields a target that passes the
 * UNCHANGED filters, including the post-selection `probeReachable` check.
 *
 * - rank 0 behaves exactly as on main;
 * - walked brigades (rank >= 1) standing on their own faction's contact cell are skipped;
 * - local occupation keeps precedence (no walk);
 * - each (sector, location) is evaluated once;
 * - the output is identical with `commander_creation` logging on and off.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

import type { CorpsFrontSector, FactionId, FormationId, FormationState, GameState } from '../../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import type { BrigadeEvaluation, CommanderBriefing, ZoneId } from '../../src/sim/combat/commander/commander_state.js';
import type { SpatialContext } from '../../src/sim/spatial_context.js';
import { emitCommanderOutput } from '../../src/sim/combat/commander/emit.js';
import { COMMANDER_CREATION_PREFIX, resetReasonCodeTopicCacheForTests } from '../../src/sim/combat/reason_code_debug.js';

const require = createRequire(import.meta.url);
const FACTION: FactionId = 'RBiH';
const ENEMY: FactionId = 'RS';
const CORPS_ID = 'arbih_1st_corps' as FormationId;
const SECTOR_ID = `sector:${CORPS_ID}:0`;
const REAR = 'op:walk:rear';
const DEPTHS = Array.from({ length: 6 }, (_, index) => `op:walk:depth-${index}`);
const TURN = 150;
/** An undefended, isolated, populated enemy cell next to a strong brigade: a local occupation pair. */
const OCCUPATION_APPROACH = 'op:walk:approach-occ';
const OCCUPATION_TARGET = 'op:walk:target-occ';

/** One friendly approach cell and the one enemy target it faces. */
interface Lane {
    approach: string;
    target: string;
    /** Personnel of the enemy brigade on the target. 4000 → repulsed; 1800 → stalemate. */
    defender: number;
}

const LANES: Record<'a' | 'b' | 'c', Lane> = {
    a: { approach: 'op:walk:approach-a', target: 'op:walk:target-a', defender: 1_800 },
    b: { approach: 'op:walk:approach-b', target: 'op:walk:target-b', defender: 1_800 },
    c: { approach: 'op:walk:approach-c', target: 'op:walk:target-c', defender: 1_800 },
};

interface WalkBrigade {
    id: string;
    lane: keyof typeof LANES;
    fitness?: number;
    /** Records a defender engagement on the brigade's own cell two turns ago. */
    onContactCell?: boolean;
}

interface WalkHarnessOptions {
    brigades: WalkBrigade[];
    defenders?: Partial<Record<keyof typeof LANES, number>>;
    /** Removes the target's friendly neighbours from sharedBoundaryAdjacency only (probeReachable fails). */
    unreachableInSharedBoundary?: Array<keyof typeof LANES>;
    /** Adds a 5000-man brigade with this id next to an undefended isolated enemy cell. */
    occupationBrigade?: string;
    corpsExhaustion?: number;
    topics?: string;
}

function setTopics(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => {
    setTopics(undefined);
    vi.restoreAllMocks();
});

function formation(id: string, faction: FactionId, location: string, personnel: number): FormationState {
    return {
        id: id as FormationId,
        faction,
        corps_id: (faction === FACTION ? CORPS_ID : 'vrs_walk_corps') as FormationId,
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel,
        cohesion: 70,
        morale: 70,
        disrupted_turns: 0,
        entrenchment_turns: 0,
        location_osid: location,
    } as FormationState;
}

function evaluation(id: string, fitness: number): BrigadeEvaluation {
    return {
        brigade_id: id as FormationId,
        fitness_offense: fitness,
        fitness_defense: 0.5,
        fitness_garrison: 0.4,
        equipment_class: undefined,
        equipment_priority: 0,
        tier: 'active_defense',
        is_combat_effective: true,
        is_disrupted: false,
        is_on_loan: false,
        is_home_defense: false,
        morale: 70,
        current_zone: 'zone:walk:0' as ZoneId,
    };
}

function runWalkHarness(options: WalkHarnessOptions) {
    setTopics(options.topics);
    const laneKeys = Object.keys(LANES) as Array<keyof typeof LANES>;
    const attackers = options.brigades.map((spec) => {
        const brigade = formation(spec.id, FACTION, LANES[spec.lane].approach, 1_800);
        if (spec.onContactCell) {
            brigade.brigade_history = {
                engagements: [{
                    battle_id: `${TURN - 2}:${LANES[spec.lane].approach}:vrs_x:${spec.id}`,
                    turn: TURN - 2,
                    osid: LANES[spec.lane].approach,
                    role: 'defender',
                    outcome: 'repulsed',
                    casualties_taken: 10,
                    casualties_inflicted: 10,
                    enemy_faction: ENEMY,
                    territory_flipped: false,
                    was_concentrated: false,
                }],
            } as unknown as FormationState['brigade_history'];
        }
        return brigade;
    });
    if (options.occupationBrigade) {
        attackers.push(formation(options.occupationBrigade, FACTION, OCCUPATION_APPROACH, 5_000));
    }
    const defenders = laneKeys.map((key) => formation(
        `defender-${key}`,
        ENEMY,
        LANES[key].target,
        options.defenders?.[key] ?? LANES[key].defender,
    ));
    const adjacency = new Map<string, string[]>([
        [REAR, laneKeys.map((key) => LANES[key].approach)],
        ...laneKeys.map((key): [string, string[]] => [LANES[key].approach, [REAR, LANES[key].target]]),
        ...laneKeys.map((key): [string, string[]] => [LANES[key].target, [LANES[key].approach, ...DEPTHS]]),
        ...DEPTHS.map((osid): [string, string[]] => [osid, laneKeys.map((key) => LANES[key].target)]),
    ]);
    if (options.occupationBrigade) {
        adjacency.set(REAR, [...adjacency.get(REAR)!, OCCUPATION_APPROACH]);
        adjacency.set(OCCUPATION_APPROACH, [REAR, OCCUPATION_TARGET]);
        adjacency.set(OCCUPATION_TARGET, [OCCUPATION_APPROACH]);
    }
    const friendlyFront = [
        ...laneKeys.map((key) => LANES[key].approach),
        ...(options.occupationBrigade ? [OCCUPATION_APPROACH] : []),
    ];
    const sharedBoundaryAdjacency = new Map(adjacency);
    for (const key of options.unreachableInSharedBoundary ?? []) {
        sharedBoundaryAdjacency.set(LANES[key].target, [...DEPTHS]);
    }
    const sector = {
        sector_id: SECTOR_ID,
        corps_id: CORPS_ID,
        faction: FACTION,
        opposing_factions: [ENEMY],
        edge_ids: ['e1'],
        sub_segments: [{
            sub_segment_id: `subseg:${CORPS_ID}:0`,
            edge_ids: ['e1'],
            friendly_osids: friendlyFront,
            enemy_osids: laneKeys.map((key) => LANES[key].target),
            primary_brigade_ids: attackers.map((brigade) => brigade.id),
            length_edges: 3,
        }],
        length_edges: 3,
        territory_osids: [REAR, ...friendlyFront],
        assigned_brigade_ids: attackers.map((brigade) => brigade.id),
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
    const politicalControllers: Record<string, FactionId> = {
        [REAR]: FACTION,
        ...Object.fromEntries(laneKeys.map((key) => [LANES[key].approach, FACTION])),
        ...Object.fromEntries(laneKeys.map((key) => [LANES[key].target, ENEMY])),
        ...Object.fromEntries(DEPTHS.map((osid) => [osid, ENEMY])),
        ...(options.occupationBrigade ? { [OCCUPATION_APPROACH]: FACTION, [OCCUPATION_TARGET]: ENEMY } : {}),
    };
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: TURN, phase: 'war', seed: 'probe-walk' },
        factions: [{ id: FACTION }, { id: ENEMY }, { id: 'HRHB' }],
        military: {
            formations: Object.fromEntries([...attackers, ...defenders].map((entry) => [entry.id, entry])),
            brigade_movement_state: {},
            corps_front_sectors: { [sector.sector_id]: sector },
            sector_intel: options.occupationBrigade ? {
                [sector.sector_id]: [{
                    enemy_sector_id: 'sector:enemy:0', confidence: 1, last_updated_turn: TURN, sources: ['passive_contact'],
                }],
            } : undefined,
            corps_command: {
                [CORPS_ID]: {
                    command_span: 5,
                    subordinate_count: attackers.length,
                    og_slots: 0,
                    active_ogs: [],
                    active_operations: [],
                    corps_exhaustion: 0,
                    faction_war_exhaustion: 0,
                    stance: 'offensive',
                    consecutive_probes: 0,
                },
            },
        },
        political: { political_controllers: politicalControllers },
        displacement: {},
    } as unknown as GameState;
    const controlledBy = (owner: FactionId): ReadonlySet<string> => new Set(
        Object.entries(politicalControllers).filter(([, value]) => value === owner).map(([osid]) => osid),
    );
    const spatial = {
        adjacency,
        sharedBoundaryAdjacency,
        friendlyOsidsByFaction: new Map<FactionId, ReadonlySet<string>>([
            [FACTION, controlledBy(FACTION)],
            [ENEMY, controlledBy(ENEMY)],
            ['HRHB', controlledBy('HRHB')],
        ]),
        componentsByFaction: new Map(),
        frontEdgesOsid: undefined,
        computedAtTurn: TURN,
        phase: 'pre-combat',
    } as SpatialContext;
    const reverseMap = new Map<string, string[]>([
        [REAR, ['S0']],
        ...laneKeys.flatMap((key, index): Array<[string, string[]]> => [
            [LANES[key].approach, [`S${index * 2 + 1}`]],
            [LANES[key].target, [`S${index * 2 + 2}`]],
        ]),
        ...DEPTHS.map((osid, index): [string, string[]] => [osid, [`S${index + 10}`]]),
        [OCCUPATION_APPROACH, ['S20']],
        [OCCUPATION_TARGET, ['S21']],
    ]);
    const briefing = {
        corps_id: CORPS_ID,
        faction: FACTION,
        turn: TURN,
        spatial,
        sectors: [sector],
        brigades: attackers,
        state_ref: state,
        reverse_map: reverseMap,
        terrain_data: null,
        osid_population_map: options.occupationBrigade ? new Map([[OCCUPATION_TARGET, 1]]) : null,
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: null,
        intel_data: null,
        doctrine_stance: 'balanced',
        corps_stance: 'offensive',
        corps_exhaustion: options.corpsExhaustion ?? 0,
        faction_war_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: { tanks: 0, artillery: 0, infantry_only: true },
        adjacent_corps: [],
        officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.8, competence: 0.6 },
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
        failed_offensive_objectives: {},
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
    } as unknown as CommanderBriefing;
    const evaluations = [
        ...options.brigades.map((spec) => evaluation(spec.id, spec.fitness ?? 0.9)),
        ...(options.occupationBrigade ? [evaluation(options.occupationBrigade, 0.5)] : []),
    ];
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
    const output = emitCommanderOutput(
        briefing,
        [],
        {
            total_brigades: evaluations.length,
            combat_effective: evaluations.length,
            evaluations,
            by_zone: { 'zone:walk:0': evaluations },
            tier_counts: { main_effort: 0, active_defense: evaluations.length, garrison: 0 },
            total_surplus: evaluations.length,
        },
        {
            zones: [],
            garrison_locks: [],
            surplus_pool: evaluations,
            total_garrison_budget: 0,
            can_launch_ops: true,
        },
        {
            plan: null,
            action: 'none',
            reason: 'no plan',
            decision_trace: { turn: TURN, winning_intent_id: null, candidates: [], hard_constraints: [], lessons_applied: [], relationships_applied: [] },
        },
        {
            stance_changes: [],
            reserve_shifts: [],
            intel_picture: { zone_confidence: {}, offensive_signs: {}, concentration_detected: {}, last_updated_turn: TURN },
            activity_entries: [],
            suspend_plan: false,
            reinforcement_requests: [],
        },
        { threatened_zones: [], enemy_concentration_zones: [], recent_losses: [], overall_pressure: 'low' },
    );
    spy.mockRestore();
    const receiptLine = lines.find((line) => line.startsWith(COMMANDER_CREATION_PREFIX));
    const receipt = receiptLine
        ? JSON.parse(receiptLine.slice(COMMANDER_CREATION_PREFIX.length + 1)) as Record<string, any>
        : null;
    const probes = output.operations.filter((operation) => operation.type === 'probe');
    return { output, probes, receipt };
}

function probeSummary(result: ReturnType<typeof runWalkHarness>) {
    return result.probes.map((operation) => ({
        brigades: [...(operation.participating_brigades ?? [])],
        objectives: [...(operation.objectives ?? [])],
    }));
}

describe('F1b probe fallback walk', () => {
    it('walks past a rank-0 brigade whose every target fails to the next survivor with a viable target', () => {
        const result = runWalkHarness({
            brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }],
            defenders: { a: 4_000 },
        });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_bravo'], objectives: [LANES.b.target] }]);
    });

    it('keeps rank 0 exactly as on main when it has a viable target', () => {
        const result = runWalkHarness({
            brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }],
        });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_alpha'], objectives: [LANES.a.target] }]);
    });

    it('walks in the existing order: fitness first, then brigade id', () => {
        const result = runWalkHarness({
            brigades: [
                { id: 'b_alpha', lane: 'a', fitness: 0.95 },
                { id: 'b_bravo', lane: 'b', fitness: 0.5 },
                { id: 'b_charlie', lane: 'c', fitness: 0.9 },
            ],
            defenders: { a: 4_000 },
        });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_charlie'], objectives: [LANES.c.target] }]);
    });

    it('skips a walked brigade that stands on its own contact cell', () => {
        const result = runWalkHarness({
            brigades: [
                { id: 'b_alpha', lane: 'a' },
                { id: 'b_bravo', lane: 'b', onContactCell: true },
                { id: 'b_charlie', lane: 'c' },
            ],
            defenders: { a: 4_000 },
        });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_charlie'], objectives: [LANES.c.target] }]);
    });

    it('never skips rank 0 for standing on a contact cell (main behaviour)', () => {
        const result = runWalkHarness({
            brigades: [{ id: 'b_alpha', lane: 'a', onContactCell: true }, { id: 'b_bravo', lane: 'b' }],
        });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_alpha'], objectives: [LANES.a.target] }]);
    });

    it('falls through a brigade whose objective fails the post-selection probeReachable check', () => {
        const result = runWalkHarness({
            brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }],
            unreachableInSharedBoundary: ['a'],
        });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_bravo'], objectives: [LANES.b.target] }]);
    });

    it('keeps local occupation ahead of the walk', () => {
        const scenario: WalkHarnessOptions = {
            brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }],
            defenders: { a: 4_000 },
            occupationBrigade: 'b_zulu',
        };
        const result = runWalkHarness({ ...scenario, topics: 'commander_creation' });
        const operations = result.output.operations;
        expect(operations).toHaveLength(1);
        expect(operations[0]!.objectives).toEqual([OCCUPATION_TARGET]);
        expect(operations[0]!.participating_brigades).toContain('b_zulu');
        expect(operations[0]!.participating_brigades).not.toContain('b_bravo');
        const detail = result.receipt?.probe_gate_receipt?.target_selection_detail;
        expect(detail?.status).toBe('local_occupation_bypass');
        expect(detail?.walk).toBeUndefined();
        const unlogged = runWalkHarness({ ...scenario, topics: undefined });
        expect(JSON.stringify(unlogged.output.operations)).toBe(JSON.stringify(operations));
    });

    it('walks past rank 0 only while the corps passes the plan readiness check (exhaustion <= 30)', () => {
        const scenario = { brigades: [{ id: 'b_alpha', lane: 'a' as const }, { id: 'b_bravo', lane: 'b' as const }], defenders: { a: 4_000 } };
        expect(probeSummary(runWalkHarness({ ...scenario, corpsExhaustion: 30 })))
            .toEqual([{ brigades: ['b_bravo'], objectives: [LANES.b.target] }]);
        const exhausted = runWalkHarness({ ...scenario, corpsExhaustion: 31, topics: 'commander_creation' });
        expect(exhausted.probes).toEqual([]);
        expect(exhausted.receipt?.probe_gate_receipt?.target_selection_detail?.walk?.map((entry: { outcome: string }) => entry.outcome))
            .toEqual(['all_filtered', 'stopped_corps_exhausted']);
    });

    it('keeps rank 0 exactly as on main for an exhausted corps', () => {
        const result = runWalkHarness({ brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }], corpsExhaustion: 90 });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_alpha'], objectives: [LANES.a.target] }]);
    });

    it('emits nothing when no survivor has a viable target, as on main', () => {
        const result = runWalkHarness({
            brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }],
            defenders: { a: 4_000, b: 4_000 },
        });
        expect(result.probes).toEqual([]);
    });

    it('evaluates each (sector, location) once and records every walked brigade in the receipt', () => {
        const result = runWalkHarness({
            brigades: [
                { id: 'b_alpha', lane: 'a' },
                { id: 'b_alpha_2', lane: 'a' },
                { id: 'b_bravo', lane: 'b', onContactCell: true },
                { id: 'b_charlie', lane: 'c' },
            ],
            defenders: { a: 4_000 },
            topics: 'commander_creation',
        });
        expect(probeSummary(result)).toEqual([{ brigades: ['b_charlie'], objectives: [LANES.c.target] }]);
        const detail = result.receipt?.probe_gate_receipt?.target_selection_detail;
        expect(detail?.selected_brigade_id).toBe('b_charlie');
        expect(detail?.status).toBe('generic_search');
        expect(detail?.walk).toEqual([
            { sorted_rank: 0, brigade_id: 'b_alpha', location_osid: LANES.a.approach, derived_sector_id: SECTOR_ID, outcome: 'all_filtered' },
            { sorted_rank: 1, brigade_id: 'b_alpha_2', location_osid: LANES.a.approach, derived_sector_id: SECTOR_ID, outcome: 'skipped_duplicate_sector_location' },
            { sorted_rank: 2, brigade_id: 'b_bravo', location_osid: LANES.b.approach, derived_sector_id: null, outcome: 'skipped_contact_cell' },
            { sorted_rank: 3, brigade_id: 'b_charlie', location_osid: LANES.c.approach, derived_sector_id: SECTOR_ID, outcome: 'selected' },
        ]);
        const selectedFlags = (detail?.brigade_candidates ?? [])
            .filter((candidate: { selected: boolean }) => candidate.selected)
            .map((candidate: { brigade_id: string }) => candidate.brigade_id);
        expect(selectedFlags).toEqual(['b_charlie']);

        const reader = require('../../tools/diagnostics/commander_target_selection_reader.cjs');
        expect(reader.detailErrors(result.receipt)).toEqual([]);
        const forged = JSON.parse(JSON.stringify(result.receipt));
        forged.probe_gate_receipt.target_selection_detail.walk[3].outcome = 'all_filtered';
        expect(reader.detailErrors(forged).length).toBeGreaterThan(0);
    });

    it('builds the same operations with commander_creation logging on and off', () => {
        const scenarios: WalkHarnessOptions[] = [
            { brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }], defenders: { a: 4_000 } },
            { brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b', onContactCell: true }, { id: 'b_charlie', lane: 'c' }], defenders: { a: 4_000 } },
            { brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }], unreachableInSharedBoundary: ['a'] },
            { brigades: [{ id: 'b_alpha', lane: 'a' }, { id: 'b_bravo', lane: 'b' }], defenders: { a: 4_000, b: 4_000 } },
        ];
        for (const scenario of scenarios) {
            const unlogged = runWalkHarness({ ...scenario, topics: undefined });
            const logged = runWalkHarness({ ...scenario, topics: 'commander_creation' });
            expect(logged.receipt).not.toBeNull();
            expect(JSON.stringify(logged.output.operations)).toBe(JSON.stringify(unlogged.output.operations));
        }
    });
});
