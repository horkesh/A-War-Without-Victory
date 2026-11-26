/**
 * #865 r4693814626 — the availability departure (`available_until_turn`, officer_system.ts step 1)
 * is a staff calendar rotation, not a physical loss. It never removes a presidential appointee from
 * the corps he was appointed to, at any autonomy level (Engine Invariants §15.1, G1: an explicit
 * player act outranks the staff). A physical loss (a scheduled 'killed' tenure) still applies, and
 * an officer who is not an appointee still departs on his date. Port of the lane C s11 probe
 * (coordination evidence/lanec_s11_20261125/lanec11_probes/appointee_probe.test.ts).
 *
 * Deterministic: synthetic state, no RNG, no wall clock.
 */
import { describe, expect, it } from 'vitest';
import type { FactionId, FormationState, GameState } from '../../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../src/state/officer_types.js';
import { processOfficerSuccession } from '../../src/sim/combat/officer_system.js';
import { EMPTY_CORPS_CO_ROSTER, validateCorpsCoRoster } from '../../src/sim/combat/corps_co_roster.js';

function officer(id: string, extra: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id, name: id, faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 3,
        political_reliability: 3, available_from_turn: 0, origin: 'jna', casualty_vulnerability: 0.1, can_improve: false,
        improvement_rate: 0, pool_tier: 'tier_a', ...extra,
    } as NamedOfficer;
}

function os(id: string, extra: Partial<NamedOfficerState> = {}): NamedOfficerState {
    return {
        officer_id: id, status: 'reserve', assigned_corps_id: null, turns_in_command: 0, battles: 0, victories: 0,
        effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false, ...extra,
    };
}

function corpsFormation(id: string, faction: FactionId = 'RBiH'): FormationState {
    return { id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'corps_asset', personnel: 0 } as FormationState;
}

function state(turn: number, meta: Record<string, unknown>, appointed: boolean): GameState {
    const s = {
        meta: { turn, phase: 'war', scenario_id: 'test', ...meta },
        factions: [],
        military: {
            formations: { c3: corpsFormation('c3') },
            corps_command: { c3: { active_operations: [] } },
            named_officer_data: [officer('app', { home_corps_id: 'c3', available_until_turn: 50 })],
            named_officers: { app: os('app', { status: 'active', assigned_corps_id: 'c3', turns_in_command: 5 }) },
        },
        political: { settlements: {}, political_controllers: {} },
    } as unknown as GameState;
    if (appointed) {
        (s.military.corps_command as any).c3.co_replacement_record = [{ relieved_officer_id: 'x', replacement_officer_id: 'app', turn: 10 }];
    }
    return s;
}

describe('#865 r4693814626: the availability departure never removes a presidential appointee', () => {
    for (const autonomy of [0, 1, 2, 3]) {
        it(`an appointee keeps his corps past available_until_turn (autonomy ${autonomy})`, () => {
            const s = state(50, { player_faction: 'RBiH', autonomy_level: autonomy }, true);
            const report = processOfficerSuccession(s, new Set(), EMPTY_CORPS_CO_ROSTER);
            expect(s.military.named_officers!.app.status).toBe('active');
            expect(s.military.named_officers!.app.assigned_corps_id).toBe('c3');
            expect(report.departures).not.toContain('app');
        });
    }

    it('an officer who is not an appointee still departs on his date (headless and live)', () => {
        for (const meta of [{}, { player_faction: 'RBiH', autonomy_level: 1 }]) {
            const s = state(50, meta, false);
            const report = processOfficerSuccession(s, new Set(), EMPTY_CORPS_CO_ROSTER);
            expect(s.military.named_officers!.app.status).toBe('retired');
            expect(s.military.named_officers!.app.assigned_corps_id).toBeNull();
            expect(report.departures).toContain('app');
        }
    });

    it('a physical loss (a scheduled killed tenure) still applies to an appointee', () => {
        const roster = validateCorpsCoRoster({
            schema_version: 1,
            rosters: { c3: { faction: 'RBiH', schedule: [{ officer_id: 'app', tenure_start: 0, tenure_end: 50, historical_fate: 'killed', source: 'test' }] } },
        } as any);
        const s = state(50, { player_faction: 'RBiH', autonomy_level: 0 }, true);
        const report = processOfficerSuccession(s, new Set(), roster);
        expect(s.military.named_officers!.app.status).toBe('killed');
        expect(report.casualties).toContain('app');
    });
});
