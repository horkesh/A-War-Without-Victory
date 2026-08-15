/**
 * RC D-selection — combat-incidence exposure contract.
 *
 * Owner-approved measurement-first semantics (2026-08-15): one exposure unit
 * per resolved battle at the defender-side target_osid; zero for quiet/missing
 * reports; no casualty, outcome, attacker-count, or frontage weighting.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AttackResolutionOsidReport } from '../src/sim/combat/attack_resolution_types.js';
import type { FrontEdge } from '../src/map/front_edges.js';
import {
    advanceCombatIncidenceExposureWindow,
    computeCombatIncidenceExposureByEntity,
} from '../src/sim/pressure/pressure_exposure.js';
import {
    applyPhase3CExhaustionCollapseGating,
    resetEnablePhase3C,
    setEnablePhase3C,
} from '../src/sim/pressure/phase3c_exhaustion_collapse_gating.js';
import {
    resetEnablePhase3B,
    setEnablePhase3B,
} from '../src/sim/pressure/phase3b_pressure_exhaustion.js';
import type { CollapseCombatIncidenceWindowState, GameState } from '../src/state/game_state.js';
import type { SupplyReachabilityOsidReport } from '../src/state/supply_reachability_osid.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

type Battle = AttackResolutionOsidReport['battles'][number];

function battle(battleId: string, targetOsid: string): Battle {
    return {
        battle_id: battleId,
        attacker_brigade: `attacker:${battleId}`,
        attacker_faction: 'RS',
        defender_faction: 'RBiH',
        target_osid: targetOsid,
        outcome: 'repulsed',
        power_ratio: 1,
        attacker_won: false,
        defender_brigade: `defender:${battleId}`,
        snap_events: [],
        attacker_casualties: 0,
        defender_casualties: 0,
    } as Battle;
}

function report(battles: Battle[]): Pick<AttackResolutionOsidReport, 'battles'> {
    return { battles };
}

const SIPOVO = 'op:sipovo:sipovo_2';
const DRVAR = 'op:titov_drvar:drvar_2';
const ATTACKER_ORIGIN = 'op:mrkonjic_grad:bara_2';

function osidState(): GameState {
    return {
        meta: { turn: 170, phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_pressure: {},
            war_front_edges_osid: [
                {
                    edge_id: `${ATTACKER_ORIGIN}__${SIPOVO}`,
                    a: ATTACKER_ORIGIN,
                    b: SIPOVO,
                    side_a: 'RS',
                    side_b: 'RBiH',
                },
            ],
        },
        political: {
            political_controllers: {
                [ATTACKER_ORIGIN]: 'RS',
                [SIPOVO]: 'RBiH',
                [DRVAR]: 'RS',
            },
            war_exhaustion: { RBiH: 0, RS: 0, HRHB: 0 },
        },
    } as unknown as GameState;
}

describe('RC D-selection combat-incidence exposure', () => {
    it('returns no exposure for a missing or quiet combat report', () => {
        expect([...computeCombatIncidenceExposureByEntity(undefined)]).toEqual([]);
        expect([...computeCombatIncidenceExposureByEntity(report([]))]).toEqual([]);
    });

    it('attributes exactly one unit per resolved battle to target_osid only', () => {
        const exposure = computeCombatIncidenceExposureByEntity(report([
            battle('b2', 'op:sipovo:sipovo_2'),
            battle('b1', 'op:sipovo:sipovo_2'),
            battle('b3', 'op:titov_drvar:drvar_2'),
        ]));

        expect([...exposure]).toEqual([
            ['op:sipovo:sipovo_2', 2],
            ['op:titov_drvar:drvar_2', 1],
        ]);
        expect(exposure.has('attacker:b1')).toBe(false);
    });

    it('is invariant to battle input order and ignores blank targets', () => {
        const rows = [
            battle('b3', 'op:titov_drvar:drvar_2'),
            battle('b1', 'op:sipovo:sipovo_2'),
            battle('b2', 'op:sipovo:sipovo_2'),
            battle('blank', ''),
            battle('whitespace', '   '),
        ];

        const forward = [...computeCombatIncidenceExposureByEntity(report(rows))];
        const permuted = [...computeCombatIncidenceExposureByEntity(report([
            rows[4], rows[3], rows[2], rows[0], rows[1],
        ]))];

        expect(permuted).toEqual(forward);
        expect(forward).toEqual([
            ['op:sipovo:sipovo_2', 2],
            ['op:titov_drvar:drvar_2', 1],
        ]);
    });

    it('credits different targets symmetrically within two turns and prunes older rows', () => {
        const first = advanceCombatIncidenceExposureWindow(undefined, 10, report([
            battle('b1', 'op:sipovo:brdjani'),
        ]));
        expect([...first.exposure_by_entity]).toEqual([['op:sipovo:brdjani', 1]]);

        const paired = advanceCombatIncidenceExposureWindow(first.window, 12, report([
            battle('b2', SIPOVO),
        ]));
        expect([...paired.exposure_by_entity]).toEqual([
            ['op:sipovo:brdjani', 0.5],
            [SIPOVO, 1.5],
        ]);

        const expired = advanceCombatIncidenceExposureWindow(paired.window, 15, report([
            battle('b3', 'op:sipovo:volari_2'),
        ]));
        expect([...expired.exposure_by_entity]).toEqual([['op:sipovo:volari_2', 1]]);
        expect(expired.window.rows.map((row) => row.turn)).toEqual([15]);
    });

    it('does not peer-credit repeated battles at one target or unattacked municipality members', () => {
        const first = advanceCombatIncidenceExposureWindow(undefined, 20, report([
            battle('b1', SIPOVO),
        ]));
        const repeated = advanceCombatIncidenceExposureWindow(first.window, 21, report([
            battle('b2', SIPOVO),
        ]));

        expect([...repeated.exposure_by_entity]).toEqual([[SIPOVO, 1]]);
        expect(repeated.exposure_by_entity.has('op:sipovo:unattacked')).toBe(false);
    });

    it('does not multiply peer support by the number of direct rows at the receiving target', () => {
        const result = advanceCombatIncidenceExposureWindow(undefined, 25, report([
            battle('a1', SIPOVO),
            battle('a2', SIPOVO),
            battle('b1', 'op:sipovo:volari_2'),
            battle('b2', 'op:sipovo:volari_2'),
            battle('b3', 'op:sipovo:volari_2'),
        ]));

        expect([...result.exposure_by_entity]).toEqual([
            [SIPOVO, 3.5],
            ['op:sipovo:volari_2', 4],
        ]);
    });

    it('is permutation-invariant and rejects malformed queued and current rows', () => {
        const prior: CollapseCombatIncidenceWindowState = {
            rows: [
                { turn: 29, battle_id: 'old-b', target_osid: 'op:sipovo:volari_2' },
                { turn: 40, battle_id: 'future', target_osid: 'op:sipovo:future' },
                { turn: 29, battle_id: 'blank', target_osid: '   ' },
            ],
        };
        const rows = [
            battle('b2', SIPOVO),
            battle('bad', 'not-an-osid'),
            battle('b1', 'op:sipovo:brdjani'),
        ];

        const forward = advanceCombatIncidenceExposureWindow(prior, 30, report(rows));
        const permuted = advanceCombatIncidenceExposureWindow(
            { rows: [...prior.rows].reverse() },
            30,
            report([rows[2], rows[1], rows[0]])
        );

        expect([...permuted.exposure_by_entity]).toEqual([...forward.exposure_by_entity]);
        expect(permuted.window).toEqual(forward.window);
        expect([...forward.exposure_by_entity]).toEqual([
            ['op:sipovo:brdjani', 2],
            [SIPOVO, 2],
            ['op:sipovo:volari_2', 1],
        ]);
    });

    it('replays the registered campaign timing as Sipovo 3 versus Drvar 2', () => {
        const schedule = new Map<number, Battle[]>([
            [177, [battle('s1', 'op:sipovo:brdjani')]],
            [178, [battle('s2', 'op:sipovo:gornji_mujdzici_2')]],
            [179, [battle('s3', SIPOVO), battle('d1', 'op:titov_drvar:prekaja_2')]],
            [180, [battle('s4', 'op:sipovo:volari_2')]],
            [181, [battle('s5', 'op:sipovo:pribeljci_2'), battle('d2', DRVAR)]],
            [182, [battle('d3', 'op:titov_drvar:sipovljani_2')]],
        ]);
        let window: CollapseCombatIncidenceWindowState | undefined;
        const totals = new Map<string, number>();

        for (const [turn, rows] of schedule) {
            const next = advanceCombatIncidenceExposureWindow(window, turn, report(rows));
            window = next.window;
            for (const [target, exposure] of next.exposure_by_entity) {
                totals.set(target, (totals.get(target) ?? 0) + exposure);
            }
        }

        expect(totals.get(SIPOVO)).toBe(3);
        expect(totals.get(DRVAR)).toBe(2);
    });
});

describe('RC D-selection Phase 3C wiring', () => {
    afterEach(() => {
        resetEnablePhase3B();
        resetEnablePhase3C();
    });

    function run(
        state: GameState,
        combatReport?: Pick<AttackResolutionOsidReport, 'battles'>,
        derivedFrontEdges: FrontEdge[] = [],
        supplyReach: SupplyReachabilityOsidReport | null = null,
    ): void {
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        applyPhase3CExhaustionCollapseGating(state, derivedFrontEdges, supplyReach, combatReport);
    }

    function degradedHrhbSupply(): SupplyReachabilityOsidReport {
        return {
            schema: 1,
            turn: 170,
            factions: [{
                faction_id: 'HRHB',
                sources: [],
                controlled: Array.from({ length: 20 }, (_, i) => i === 0 ? SIPOVO : `op:x:h${i}`),
                reachable_osids: [],
                isolated_osids: [SIPOVO, 'op:x:h1', 'op:x:h2'],
                edges_used: [],
            }],
        };
    }

    it('adds 4.0 strain per target battle without attributing frontage or attacker origin', () => {
        const state = osidState();
        run(state, report([
            battle('b2', SIPOVO),
            battle('b1', SIPOVO),
            battle('b3', DRVAR),
        ]));

        expect(state.political.local_strain?.by_entity).toEqual({
            [DRVAR]: 4,
            [SIPOVO]: 8,
        });
        expect(state.political.local_strain?.by_entity[ATTACKER_ORIGIN]).toBeUndefined();
    });

    it('recovers tracked quiet strain and evaluates Tier-1 persistence every turn', () => {
        const state = osidState();
        state.political.political_controllers![SIPOVO] = 'HRHB';
        state.political.war_exhaustion.HRHB = 8000;
        state.political.local_strain = { by_entity: { [SIPOVO]: 60 } };
        const supplyReach = degradedHrhbSupply();

        for (let turn = 170; turn < 177; turn++) {
            state.meta.turn = turn;
            run(state, report([]), [], supplyReach);
        }

        expect(state.political.local_strain.by_entity[SIPOVO]).toBe(56.5);
        expect(state.political.collapse_eligibility_tier1?.[SIPOVO].persistence.spatial).toBe(4);
        expect(state.political.collapse_eligibility_tier1?.[SIPOVO].domains.spatial).toBe(true);
    });

    it('resets quiet Tier-1 persistence when recovery reaches the threshold', () => {
        const state = osidState();
        state.political.political_controllers![SIPOVO] = 'HRHB';
        state.political.war_exhaustion.HRHB = 8000;
        state.political.local_strain = { by_entity: { [SIPOVO]: 42 } };
        state.political.collapse_eligibility = {
            HRHB: {
                eligible_authority: false,
                eligible_cohesion: false,
                eligible_spatial: true,
                persistence_authority: 0,
                persistence_cohesion: 0,
                persistence_spatial: 4,
                suppressed: false,
                immune: false,
                last_updated_turn: 169,
            },
        };
        const supplyReach = degradedHrhbSupply();

        for (let turn = 170; turn < 174; turn++) {
            state.meta.turn = turn;
            run(state, report([]), [], supplyReach);
        }

        expect(state.political.local_strain.by_entity[SIPOVO]).toBe(40);
        expect(state.political.collapse_eligibility_tier1?.[SIPOVO].persistence.spatial).toBe(0);
        expect(state.political.collapse_eligibility_tier1?.[SIPOVO].domains.spatial).toBe(false);
    });

    it('uses zero exposure for missing and quiet reports instead of falling back to OSID frontage', () => {
        const missing = osidState();
        run(missing);
        expect(missing.political.local_strain).toBeUndefined();

        const quiet = osidState();
        run(quiet, report([]));
        expect(quiet.political.local_strain).toBeUndefined();

        const quietWithoutLiveFront = osidState();
        quietWithoutLiveFront.military.war_front_edges_osid = [];
        quietWithoutLiveFront.military.front_pressure = {
            [`${ATTACKER_ORIGIN}__${SIPOVO}`]: {
                edge_id: `${ATTACKER_ORIGIN}__${SIPOVO}`,
                value: 1,
                max_abs: 1,
                last_updated_turn: 170,
            },
        };
        run(quietWithoutLiveFront, report([]), [{
            edge_id: `${ATTACKER_ORIGIN}__${SIPOVO}`,
            a: ATTACKER_ORIGIN,
            b: SIPOVO,
            side_a: 'RS',
            side_b: 'RBiH',
        }]);
        expect(quietWithoutLiveFront.political.local_strain).toBeUndefined();
    });

    it('produces identical local strain and Tier-1 output for permuted battle rows', () => {
        const rows = [battle('b2', SIPOVO), battle('b1', SIPOVO), battle('b3', DRVAR)];
        const first = osidState();
        const second = osidState();

        run(first, report(rows));
        resetEnablePhase3B();
        resetEnablePhase3C();
        run(second, report([rows[2], rows[0], rows[1]]));

        expect(JSON.stringify(first.political.local_strain)).toBe(JSON.stringify(second.political.local_strain));
        expect(JSON.stringify(first.political.collapse_eligibility_tier1))
            .toBe(JSON.stringify(second.political.collapse_eligibility_tier1));
    });

    it('retroactively applies two-turn municipality support and persists only the active queue', () => {
        const state = osidState();
        state.political.political_controllers = {
            ...state.political.political_controllers,
            'op:sipovo:brdjani': 'RS',
        };

        state.meta.turn = 177;
        run(state, report([battle('s1', 'op:sipovo:brdjani')]));
        state.meta.turn = 179;
        run(state, report([battle('s2', SIPOVO)]));

        expect(state.political.local_strain?.by_entity).toEqual({
            'op:sipovo:brdjani': 5.5,
            [SIPOVO]: 6,
        });
        expect(state.political.collapse_combat_incidence_window?.rows).toEqual([
            { turn: 177, battle_id: 's1', target_osid: 'op:sipovo:brdjani' },
            { turn: 179, battle_id: 's2', target_osid: SIPOVO },
        ]);

        state.meta.turn = 182;
        run(state, report([]));
        expect(state.political.collapse_combat_incidence_window).toBeUndefined();
    });

    it('round-trips the active window byte-identically and leaves absent state absent', () => {
        const state = osidState();
        state.meta.turn = 177;
        run(state, report([battle('s1', SIPOVO)]));

        const serialized = serializeGameState(state);
        const hydrated = JSON.parse(serialized) as GameState;
        expect(hydrated.political.collapse_combat_incidence_window?.rows).toEqual([
            { turn: 177, battle_id: 's1', target_osid: SIPOVO },
        ]);
        expect(serializeGameState(hydrated)).toBe(serialized);

        const absent = osidState();
        expect(JSON.parse(serializeGameState(absent)).political)
            .not.toHaveProperty('collapse_combat_incidence_window');
    });

    it('passes the already-resolved OSID battle report through the canonical War step', () => {
        const source = readFileSync(join(process.cwd(), 'src/sim/turn_phases/war_phases.ts'), 'utf8');
        const phase3cStep = source.slice(
            source.indexOf("name: 'phase3c-exhaustion-collapse-gating'"),
            source.indexOf("name: 'phase3d-collapse-resolution'")
        );

        expect(phase3cStep).toContain('context.report.attack_resolution_osid');
        expect(source.indexOf("name: 'war-resolve-attack-orders'"))
            .toBeLessThan(source.indexOf("name: 'phase3c-exhaustion-collapse-gating'"));
    });
});
