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
import { computeCombatIncidenceExposureByEntity } from '../src/sim/pressure/pressure_exposure.js';
import {
    applyPhase3CExhaustionCollapseGating,
    resetEnablePhase3C,
    setEnablePhase3C,
} from '../src/sim/pressure/phase3c_exhaustion_collapse_gating.js';
import {
    resetEnablePhase3B,
    setEnablePhase3B,
} from '../src/sim/pressure/phase3b_pressure_exhaustion.js';
import type { GameState } from '../src/state/game_state.js';

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
});

describe('RC D-selection Phase 3C wiring', () => {
    afterEach(() => {
        resetEnablePhase3B();
        resetEnablePhase3C();
    });

    function run(
        state: GameState,
        combatReport?: Pick<AttackResolutionOsidReport, 'battles'>,
        derivedFrontEdges: FrontEdge[] = []
    ): void {
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        applyPhase3CExhaustionCollapseGating(state, derivedFrontEdges, null, combatReport);
    }

    it('adds existing 0.15 strain per target battle without attributing frontage or attacker origin', () => {
        const state = osidState();
        run(state, report([
            battle('b2', SIPOVO),
            battle('b1', SIPOVO),
            battle('b3', DRVAR),
        ]));

        expect(state.political.local_strain?.by_entity).toEqual({
            [DRVAR]: 0.15,
            [SIPOVO]: 0.3,
        });
        expect(state.political.local_strain?.by_entity[ATTACKER_ORIGIN]).toBeUndefined();
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
