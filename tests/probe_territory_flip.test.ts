/**
 * Tests for Fix B: Probes must not flip political control.
 *
 * Probe operations are first-class in lifecycle (planning, execution, recovery,
 * cooldown suppression) but the territory flip gate must not treat them
 * identically to full offensives. A probe that wins tactically should NOT
 * change political_controllers — it inflicts casualties and generates battle
 * records, but doesn't capture territory.
 */
import { describe, it, expect } from 'vitest';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import { generateArmyReserveRequests } from '../src/sim/combat/army_reserve_system.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type {
    FactionId,
    FormationState,
    GameState,
    CorpsFrontSector,
    CorpsFrontSubSegment,
    CorpsOperation,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

// ─── Minimal state helpers ──────────────────────────────────────────────────

function makeFormation(
    id: string,
    faction: FactionId,
    kind: 'brigade' | 'corps',
    locationOsid: string,
    overrides: Partial<FormationState> = {}
): FormationState {
    return {
        id, name: id, faction, kind, status: 'active',
        personnel: 5000, cohesion: 80, morale: 80, experience: 0.5,
        location_osid: locationOsid,
        posture: 'attack',
        composition: {
            infantry: 2000,
            tanks: 20,
            artillery: 15,
            aa_systems: 3,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
        ...overrides,
    } as FormationState;
}

function makeSubSegment(
    id: string,
    enemyOsids: string[],
    friendlyOsids: string[],
    edgeIds: string[]
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: edgeIds,
        enemy_osids: enemyOsids,
        friendly_osids: friendlyOsids,
        primary_brigade_ids: [],
        length_edges: edgeIds.length,
    };
}

function makeSector(
    id: string,
    corpsId: string,
    faction: FactionId,
    brigadeIds: string[],
    subSegments: CorpsFrontSubSegment[],
    lengthEdges: number
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corpsId as any,
        faction,
        opposing_factions: [],
        edge_ids: subSegments.flatMap(s => s.edge_ids),
        sub_segments: subSegments,
        length_edges: lengthEdges,
        territory_osids: subSegments.flatMap(s => s.friendly_osids),
        assigned_brigade_ids: brigadeIds as any[],
        reserve_brigade_ids: [],
        density: brigadeIds.length / Math.max(1, lengthEdges),
        threat_ratio: 1.0,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

/**
 * Build a scenario where a strong RS attacker attacks a weak RBiH defender.
 * The attacker is part of a corps with an active operation of the given type.
 * The power asymmetry (5000 vs 300) ensures a decisive_victory/victory outcome.
 */
function makeScenario(opType: CorpsOperation['type']) {
    const rsBrig = makeFormation('brig_rs_1', 'RS', 'brigade', 'op:rs:staging', {
        personnel: 5000, cohesion: 80, experience: 0.7, posture: 'attack' as any,
        corps_id: 'vrs_1st',
        composition: {
            infantry: 2000,
            tanks: 20,
            artillery: 15,
            aa_systems: 3,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
    });
    const rbihBrig = makeFormation('brig_rbih_1', 'RBiH', 'brigade', 'op:rbih:target', {
        personnel: 300, cohesion: 30, morale: 30, experience: 0.1,
        composition: {
            infantry: 200,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
    });
    const rsCorps = makeFormation('vrs_1st', 'RS', 'corps', 'op:rs:hq');

    const operation: CorpsOperation = {
        name: `test_op_${opType}`,
        type: opType,
        // 2026-08-26: the resolver no longer tests `type === 'probe'` — it reads the operation's
        // DECLARED intent to hold (`occupies_on_victory`, default TRUE). `buildProbeOperation`
        // sets it false in production; this fixture builds its operation literally, so it must
        // declare the same thing. Mirroring the factory here is the point: if the factory ever
        // stops declaring it, `defaults to holding — a probe built without the declaration FLIPS`
        // below is the test that catches it.
        occupies_on_victory: opType !== 'probe',
        phase: 'execution',
        started_turn: 3,
        phase_started_turn: 3,
        participating_brigades: ['brig_rs_1'],
        objectives: ['op:rbih:target'],
        objective_capture_count: 0,
        attack_attempt_count: 0,
        sector_id: 'sector:vrs_1st:0',
        axes: [{
            axis_id: `test_op_${opType}_ax0`,
            name: 'Main',
            assigned_brigades: ['brig_rs_1'],
            objectives: ['op:rbih:target'],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }],
    } as unknown as CorpsOperation;

    const sector = makeSector(
        'sector:vrs_1st:0', 'vrs_1st', 'RS', ['brig_rs_1'],
        [makeSubSegment('sub:vrs_1st:0:0',
            ['op:rbih:target'],
            ['op:rs:staging'],
            ['e1']
        )],
        1
    );

    const state: GameState = {
        meta: {
            turn: 5, phase: 'war', seed: 'probe-flip-test',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        } as unknown as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
        ] as GameState['factions'],
        formations: {
            vrs_1st: rsCorps,
            brig_rs_1: rsBrig,
            brig_rbih_1: rbihBrig,
        },
        political: {
            political_controllers: {
                'op:rs:staging': 'RS',
                'op:rs:hq': 'RS',
                'op:rbih:target': 'RBiH',
                'op:rbih:rear': 'RBiH',
            },
            control_events: [],
        } as any,
        military: {
            formations: {
                vrs_1st: rsCorps,
                brig_rs_1: rsBrig,
                brig_rbih_1: rbihBrig,
            },
            corps_command: {
                vrs_1st: {
                    command_span: 3,
                    subordinate_count: 1,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [operation],
                },
            },
            corps_front_sectors: {
                'sector:vrs_1st:0': sector,
            },
            brigade_attack_orders: { brig_rs_1: 'op:rbih:target' } as any,
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        } as any,
        displacement: {} as any,
    } as unknown as GameState;

    const edges: EdgeRecord[] = [
        { edge_id: 'e1', a: 'op:rs:staging', b: 'op:rbih:target' } as EdgeRecord,
        { edge_id: 'e2', a: 'op:rbih:target', b: 'op:rbih:rear' } as EdgeRecord,
    ];

    return { state, edges, operation };
}

function makeUndefendedProbeScenario() {
    const { state, edges } = makeScenario('probe');
    delete (state.military.formations as any).brig_rbih_1;
    return { state, edges };
}

type MixedOccupationMode = 'mixed' | 'all_true' | 'all_default';

function makeMixedOccupationScenario(
    mode: MixedOccupationMode,
    operationlessId = 'aaa_default_attacker',
    reverseOrderInsertion = false,
) {
    const { state, edges, operation } = makeScenario('sector_attack');
    const original = state.military.formations!['brig_rs_1']!;
    delete state.military.formations!['brig_rs_1'];

    const attackers = [
        makeFormation(operationlessId, 'RS', 'brigade', 'op:rs:staging', {
            ...original,
            id: operationlessId,
            name: operationlessId,
            corps_id: mode === 'all_true' ? 'vrs_1st' : undefined,
        }),
        makeFormation('mid_declared_attacker', 'RS', 'brigade', 'op:rs:staging', {
            ...original,
            id: 'mid_declared_attacker',
            name: 'mid_declared_attacker',
            corps_id: 'vrs_1st',
        }),
        makeFormation('zzz_declared_attacker', 'RS', 'brigade', 'op:rs:staging', {
            ...original,
            id: 'zzz_declared_attacker',
            name: 'zzz_declared_attacker',
            corps_id: 'vrs_1st',
        }),
    ];
    for (const attacker of attackers) {
        state.military.formations![attacker.id] = attacker;
    }

    operation.participating_brigades = mode === 'all_true'
        ? attackers.map(attacker => attacker.id)
        : attackers.slice(1).map(attacker => attacker.id);
    operation.axes![0]!.assigned_brigades = [...operation.participating_brigades];
    if (mode === 'mixed') operation.occupies_on_victory = false;
    if (mode === 'all_true') operation.occupies_on_victory = true;
    if (mode === 'all_default') delete operation.occupies_on_victory;

    const orderedAttackers = reverseOrderInsertion ? [...attackers].reverse() : attackers;
    state.military.brigade_attack_orders = Object.fromEntries(
        orderedAttackers.map(attacker => [attacker.id, 'op:rbih:target']),
    ) as GameState['military']['brigade_attack_orders'];

    return { state, edges, operation };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('occupation declaration (2026-08-26)', () => {
    it('commits an on-loan contributor before bot order generation and combat', () => {
        const { state, edges, operation } = makeScenario('probe');
        const operationless = state.military.formations!['brig_rs_1']!;
        const loaned = makeFormation('loaned_attacker', 'RS', 'brigade', 'op:rs:staging', {
            ...operationless,
            id: 'loaned_attacker',
            name: 'loaned_attacker',
            elite_loan_state: {
                on_loan: true,
                loaned_to_corps: 'vrs_1st',
            } as FormationState['elite_loan_state'],
        });
        const line = makeFormation('probe_line', 'RS', 'brigade', 'op:rs:hq', {
            corps_id: 'vrs_1st',
        });
        state.military.formations!.loaned_attacker = loaned;
        state.military.formations!.probe_line = line;
        operation.participating_brigades = ['probe_line'];
        operation.axes![0]!.assigned_brigades = ['probe_line'];
        generateArmyReserveRequests(state, new Map());
        const adjacency = new Map([
            ['op:rs:staging', ['op:rbih:target']],
            ['op:rbih:target', ['op:rs:staging', 'op:rbih:rear']],
            ['op:rbih:rear', ['op:rbih:target']],
        ]);
        generateAllBotOrdersOsid(state, ['RS'], {
            edges,
            reverseMap: {} as never,
            adjacency,
        });
        expect(state.military.brigade_attack_orders?.loaned_attacker).toBe('op:rbih:target');

        const report = resolveAttackOrdersOsid(state, edges, adjacency);

        expect(operation.participating_brigades).toContain('loaned_attacker');
        expect(operation.axes![0]!.assigned_brigades).toContain('loaned_attacker');
        expect(state.military.brigade_attack_orders?.loaned_attacker).toBeUndefined();
        expect(report.orders_seen_by_brigade?.loaned_attacker).toBe('op:rbih:target');
        expect(report.battles[0]?.attacker_brigades).toContain('loaned_attacker');
        expect(report.battles[0]?.attacker_won).toBe(true);
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RBiH');
        expect(report.flips_applied).toBe(0);
        expect(state.political.control_events).toHaveLength(0);
    });

    it('requires every validated mixed-battle contributor to permit occupation', () => {
        const { state, edges, operation } = makeMixedOccupationScenario('mixed');

        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());

        expect(report.battles[0]?.attacker_brigades?.length).toBeGreaterThan(1);
        expect(report.battles[0]?.attacker_won).toBe(true);
        expect(report.casualty_attacker + report.casualty_defender).toBeGreaterThan(0);
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RBiH');
        expect(report.flips_applied).toBe(0);
        expect(state.political.control_events).toHaveLength(0);
        expect(operation.territory_gained_this_turn ?? 0).toBe(0);
        expect(operation.total_territory_gained ?? 0).toBe(0);
    });

    it('is invariant to contributor ID renaming and attack-order insertion order', () => {
        const run = (operationlessId: string, reverseOrderInsertion: boolean) => {
            const { state, edges } = makeMixedOccupationScenario(
                'mixed',
                operationlessId,
                reverseOrderInsertion,
            );
            const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());
            expect(report.battles[0]?.attacker_brigades?.length).toBeGreaterThan(1);
            return {
                control: state.political.political_controllers!['op:rbih:target'],
                flips: report.flips_applied,
            };
        };

        expect(run('aaa_default_attacker', false)).toEqual({ control: 'RBiH', flips: 0 });
        expect(run('zzz_default_attacker', true)).toEqual({ control: 'RBiH', flips: 0 });
    });

    it('permits occupation when every validated contributor explicitly permits it', () => {
        const { state, edges } = makeMixedOccupationScenario('all_true');

        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());

        expect(report.battles[0]?.attacker_brigades?.length).toBeGreaterThan(1);
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RS');
        expect(report.flips_applied).toBe(1);
    });

    it('defaults undeclared and operationless contributors to permitting occupation', () => {
        const { state, edges } = makeMixedOccupationScenario('all_default');

        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());

        expect(report.battles[0]?.attacker_brigades?.length).toBeGreaterThan(1);
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RS');
        expect(report.flips_applied).toBe(1);
    });

    it('does not let a nonadjacent contributor veto occupation', () => {
        const { state, edges } = makeMixedOccupationScenario('all_default');
        const invalid = makeFormation('invalid_veto_attacker', 'RS', 'brigade', 'op:rs:remote', {
            corps_id: 'vrs_1st',
        });
        state.military.formations![invalid.id] = invalid;
        state.military.brigade_attack_orders![invalid.id] = 'op:rbih:target';
        const corpsCommand = state.military.corps_command!['vrs_1st']!;
        const defaultOperation = corpsCommand.active_operations[0]!;
        corpsCommand.active_operations.push({
            ...defaultOperation,
            name: 'invalid_nonoccupying_operation',
            occupies_on_victory: false,
            participating_brigades: [invalid.id],
            axes: [{
                ...defaultOperation.axes![0]!,
                axis_id: 'invalid_nonoccupying_axis',
                assigned_brigades: [invalid.id],
            }],
        });

        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());

        expect(report.battles[0]?.attacker_brigades?.length).toBeGreaterThan(1);
        expect(report.battles[0]?.attacker_brigades).not.toContain(invalid.id);
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RS');
        expect(report.flips_applied).toBe(1);
    });

    it('★ defaults to holding — a probe built WITHOUT the declaration FLIPS, by design', () => {
        // Each contributor's predicate is `matchedOp?.occupies_on_victory ?? true`. Default-true is deliberate and
        // is the conservative choice: an attack that has not declared it does not intend to hold
        // is an ordinary attack, and defaulting FALSE would silently delete a large share of
        // combat captures and breach the anchors.
        //
        // THE COST OF THAT CHOICE IS THIS TEST. Any future code that builds a probe operation
        // WITHOUT going through `buildProbeOperation` will take ground. Verified at the time of
        // writing that no production path does: the only non-factory `type: 'probe'` sites are
        // `army_hq_overrides.ts` (a directive object that nothing converts into a CorpsOperation —
        // it is read only as a boolean) and a disconnected UI planner. If that ever changes, the
        // new site must declare `occupies_on_victory: false` — and this test documents why.
        const { state, edges } = makeScenario('probe');
        const op = state.military.corps_command!['vrs_1st']!.active_operations[0]!;
        delete (op as { occupies_on_victory?: boolean }).occupies_on_victory;

        resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());
        expect(state.political.political_controllers!['op:rbih:target'],
            'an undeclared operation holds what it takes — if this flips to RS the default has been '
            + 'inverted, and a quarter of combat captures are about to disappear').toBe('RS');
    });

    it('★ the declaration, not the type, is what withholds the ground', () => {
        // A sector_attack that DECLARES it does not hold must behave exactly like a probe. This is
        // the assertion that makes `occupies_on_victory` a real property rather than `op.type`
        // wearing a new name: it can vary WITHIN a type. Nothing sets this in production today —
        // the field exists so a spoiling attack, raid or demonstration can.
        const { state, edges } = makeScenario('sector_attack');
        const op = state.military.corps_command!['vrs_1st']!.active_operations[0]!;
        (op as { occupies_on_victory?: boolean }).occupies_on_victory = false;

        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());
        expect(report.battles[0]?.attacker_won, 'the attack must still WIN — we are withholding the '
            + 'ground, not the victory').toBe(true);
        expect(state.political.political_controllers!['op:rbih:target'],
            'a declared non-occupying sector_attack must not take ground').toBe('RBiH');
    });
});

describe('probe territory flip gate', () => {
    it('canon determinism: decisive probes do not capture while normal attacks can', () => {
        const run = (type: 'probe' | 'sector_attack') => {
            const { state, edges } = makeScenario(type);
            const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());
            return {
                control: state.political.political_controllers!['op:rbih:target'],
                flips: report.flips_applied,
                outcome: report.battles[0]?.outcome,
            };
        };

        const probe = run('probe');
        const attack = run('sector_attack');

        expect(run('probe')).toEqual(probe);
        expect(run('sector_attack')).toEqual(attack);
        expect(probe.control).toBe('RBiH');
        expect(probe.flips).toBe(0);
        expect(attack.control).toBe('RS');
        expect(attack.flips).toBe(1);
    });

    it('a probe that wins tactically does NOT flip political_controllers', () => {
        const { state, edges } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        // Should have resolved a battle
        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        // The overwhelming force (5000 vs 300) should produce a clear win
        expect(['decisive_victory', 'victory', 'costly_victory']).toContain(battle.outcome);

        // KEY ASSERTION: political control must NOT have changed
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RBiH');

        // No flips recorded in the report
        expect(report.flips_applied).toBe(0);
    });

    it('a sector_attack that wins tactically DOES flip political_controllers', () => {
        const { state, edges } = makeScenario('sector_attack');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        // The overwhelming force should produce a clear win
        expect(['decisive_victory', 'victory', 'costly_victory']).toContain(battle.outcome);

        // KEY ASSERTION: political control MUST have changed to RS
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RS');

        // Flip recorded
        expect(report.flips_applied).toBe(1);
    });

    it('a general_offensive that wins tactically DOES flip political_controllers', () => {
        const { state, edges } = makeScenario('general_offensive');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        expect(['decisive_victory', 'victory', 'costly_victory']).toContain(battle.outcome);

        // KEY ASSERTION: political control MUST have changed to RS
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RS');
        expect(report.flips_applied).toBe(1);
    });

    it('a probe battle still records casualties (battle happened, just no territorial consequence)', () => {
        const { state, edges } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        // Casualties should be non-zero — a real battle occurred
        const totalCasualties = report.casualty_attacker + report.casualty_defender;
        expect(totalCasualties).toBeGreaterThan(0);

        // Defender took casualties (300 personnel vs 5000 attacker — should take real losses)
        expect(report.casualty_defender).toBeGreaterThan(0);
    });

    it('probe does not record a control_event', () => {
        const { state, edges } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        resolveAttackOrdersOsid(state, edges, reverseMap);

        // No control events should be emitted for probes
        const controlEvents = (state.political as any).control_events ?? [];
        const targetEvents = controlEvents.filter(
            (e: any) => e.settlement_id === 'op:rbih:target'
        );
        expect(targetEvents.length).toBe(0);
    });

    it('probe does not increment operation territory_gained counters', () => {
        const { state, edges, operation } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        resolveAttackOrdersOsid(state, edges, reverseMap);

        // Territory gained counters should remain at 0
        expect(operation.territory_gained_this_turn ?? 0).toBe(0);
        expect(operation.total_territory_gained ?? 0).toBe(0);

        // But battles_this_turn SHOULD increment (the battle happened)
        expect(operation.battles_this_turn ?? 0).toBeGreaterThan(0);
        expect(operation.axes?.[0]?.objective_battles_this_turn ?? 0).toBeGreaterThan(0);
    });

    it('a probe that wins against an undefended enemy tile does NOT flip political_controllers', () => {
        // Probes are recon-by-force, not territorial seizure. Even an
        // undefended hex must not be captured by a probe — capture requires
        // a sector_attack or other offensive op type.
        const { state, edges } = makeUndefendedProbeScenario();
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        expect(report.battles.length).toBe(1);
        expect(['decisive_victory', 'victory', 'costly_victory']).toContain(report.battles[0]!.outcome);

        expect(state.political.political_controllers!['op:rbih:target']).toBe('RBiH');
        expect(report.flips_applied).toBe(0);
    });

    it('a probe whose current_objective is captured by a separate mechanism does NOT take capture credit', () => {
        // n1582 surfaced 2 such artifacts: a brigade-independent attack flipped
        // an OSID that was also a probe's current_objective. The probe's
        // operation_diagnostics counter then incremented objective_capture_count
        // even though the probe itself never captured. Per n1580 the engine-level
        // flip is blocked; this test covers the diagnostic counter path in
        // updateSectorOffensiveResults so it stays consistent with that rule.
        const { state, operation } = makeScenario('probe');

        // Simulate: by the time updateSectorOffensiveResults runs, the probe's
        // current_objective has already flipped to the operation's faction (RS)
        // via a separate mechanism (different op, friction, abandonment, etc.).
        state.political.political_controllers!['op:rbih:target'] = 'RS';

        const beforeCapCount = operation.objective_capture_count ?? 0;
        const beforeAxisCapCount = (operation.axes?.[0]?.objective_capture_count ?? 0);

        updateSectorOffensiveResults(state, null);

        // Probe must NOT have taken capture credit on either the legacy or
        // multi-axis counter, even though the OSID is friendly-controlled.
        expect(operation.objective_capture_count ?? 0).toBe(beforeCapCount);
        expect(operation.axes?.[0]?.objective_capture_count ?? 0).toBe(beforeAxisCapCount);

        // Probe SHOULD still advance current_objective_index so it recognizes
        // the target is no longer enemy and doesn't re-attack.
        expect(operation.axes?.[0]?.current_objective_index ?? 0).toBeGreaterThan(0);
    });
});
