/**
 * G1 (Engine Invariants §15.1): the acting-commander branch of officer succession (step 5) is a
 * staff pool rotation, not a physical loss. It never removes a presidential appointee.
 *
 * REPLACE-CO seats its replacement with `acting_commander = true` (relieveOfficer). Before this
 * guard, the first turn another reserve corps officer of the corps was free, step 5 retired the
 * President's appointee and seated the pool pick, the same turn. The probe runs the real war-phase
 * steps (`apply-co-replacements`, then `officer-succession`), not a direct call.
 *
 * A non-appointee acting holder still gives way to the pool pick (headless behaviour unchanged).
 *
 * Deterministic: synthetic state, no RNG, no wall clock.
 */
import { describe, expect, it } from 'vitest';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';

const REPLACE_STEP = warPhases.find((p) => p.name === 'apply-co-replacements')!;
const SUCCESSION_STEP = warPhases.find((p) => p.name === 'officer-succession')!;
const CORPS = 'rbih_probe_corps';

function officerData(id: string, extra: Record<string, unknown> = {}) {
    return {
        id, name: id, faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 3,
        political_reliability: 3, available_from_turn: 0, origin: 'jna', casualty_vulnerability: 0, can_improve: false,
        improvement_rate: 0, pool_tier: 'tier_b', home_corps_id: CORPS, ...extra,
    };
}

function officerState(id: string, extra: Record<string, unknown> = {}) {
    return {
        officer_id: id, status: 'reserve', assigned_corps_id: null, turns_in_command: 0, battles: 0, victories: 0,
        effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false, ...extra,
    };
}

/** RBiH player at autonomy 0: a current CO, the appointee-to-be (tier_a), and a second free reserve CO. */
function makeState(meta: Record<string, unknown>): any {
    return {
        meta: { turn: 20, phase: 'war', scenario_id: 'test', ...meta },
        factions: [],
        military: {
            formations: {
                [CORPS]: { id: CORPS, faction: 'RBiH', name: CORPS, created_turn: 0, status: 'active', assignment: null, kind: 'corps_asset', personnel: 0 },
            },
            corps_command: { [CORPS]: { active_operations: [] } },
            named_officer_data: [
                officerData('co_current', { competence: 2 }),
                officerData('co_appointee', { pool_tier: 'tier_a', competence: 4 }),
                officerData('co_second', { pool_tier: 'tier_b', competence: 3 }),
            ],
            named_officers: {
                co_current: officerState('co_current', { status: 'active', assigned_corps_id: CORPS, turns_in_command: 10 }),
                co_appointee: officerState('co_appointee'),
                co_second: officerState('co_second'),
            },
        },
        political: { settlements: {}, political_controllers: {} },
    };
}

async function runTurnSteps(state: any): Promise<void> {
    REPLACE_STEP.run({ state } as any);
    await SUCCESSION_STEP.run({ state, report: {} } as any);
}

describe('G1: the acting-commander branch never removes a presidential appointee', () => {
    for (const autonomy of [0, 1, 2, 3]) {
        it(`REPLACE-CO appointee keeps the seat through officer-succession with a second reserve CO free (RBiH, a${autonomy})`, async () => {
            const state = makeState({ player_faction: 'RBiH', autonomy_level: autonomy });
            state.military.corps_command[CORPS].pending_co_replacement = { replacement_officer_id: 'co_appointee', turn: 20, ca_cost: 25 };

            await runTurnSteps(state);
            const officers = state.military.named_officers;
            expect(state.military.corps_command[CORPS].co_replacement_record?.[0]?.replacement_officer_id).toBe('co_appointee');
            expect(officers.co_appointee.status).toBe('active');
            expect(officers.co_appointee.assigned_corps_id).toBe(CORPS);
            expect(officers.co_appointee.acting_commander).toBe(true); // the acting combat modifier is kept
            expect(officers.co_second.status).toBe('reserve');

            // And on later turns, while the second officer stays free.
            for (const turn of [21, 24, 30]) {
                state.meta.turn = turn;
                await SUCCESSION_STEP.run({ state, report: {} } as any);
                expect(officers.co_appointee.status).toBe('active');
                expect(officers.co_appointee.assigned_corps_id).toBe(CORPS);
                expect(officers.co_second.status).toBe('reserve');
            }
        });
    }

    it('a generic stopgap seated by REPLACE-CO on an empty reserve still gives way to a named officer', async () => {
        const state = makeState({ player_faction: 'RBiH', autonomy_level: 0 });
        const officers = state.military.named_officers;
        officers.co_appointee.status = 'retired';
        officers.co_second.status = 'retired';
        state.military.corps_command[CORPS].pending_co_replacement = { replacement_officer_id: 'co_appointee', turn: 20, ca_cost: 25 };
        REPLACE_STEP.run({ state } as any);
        const genericId = state.military.corps_command[CORPS].co_replacement_record?.[0]?.replacement_officer_id;
        expect(genericId).toMatch(/^generic_relief_/);
        expect(officers[genericId]).toMatchObject({ status: 'active', assigned_corps_id: CORPS, acting_commander: true });

        officers.co_second.status = 'reserve';
        state.meta.turn = 21;
        await SUCCESSION_STEP.run({ state, report: {} } as any);
        expect(officers[genericId].assigned_corps_id).toBeNull();
        expect(officers.co_second).toMatchObject({ status: 'active', assigned_corps_id: CORPS });
    });

    it('a non-appointee acting holder still gives way to the pool pick (headless and live)', async () => {
        for (const meta of [{}, { player_faction: 'RBiH', autonomy_level: 0 }]) {
            const state = makeState(meta);
            const officers = state.military.named_officers;
            // Acting holder seated by a staff path (no REPLACE-CO record, no decision history).
            officers.co_current.status = 'retired';
            officers.co_current.assigned_corps_id = null;
            Object.assign(officers.co_appointee, { status: 'active', assigned_corps_id: CORPS, acting_commander: true });

            await runTurnSteps(state);
            expect(officers.co_appointee.status).toBe('retired');
            expect(officers.co_appointee.assigned_corps_id).toBeNull();
            expect(officers.co_second.status).toBe('active');
            expect(officers.co_second.assigned_corps_id).toBe(CORPS);
        }
    });
});
