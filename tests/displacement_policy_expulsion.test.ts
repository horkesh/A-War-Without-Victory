// RF-5B: policy-driven bilateral displacement (RBiH-HRHB war).
// A bot-controlled faction with a historical expulsion policy (HRHB) seeds, once, after the
// open bilateral war begins, one bounded wave for the other community in OSIDs it holds
// inside its POLICY_EXPULSION_SCOPE municipalities. A human-controlled faction never expels
// (wave A after the standard delay, wave B POLICY_WAVE_B_DELAY_TURNS later). Control never
// changes; the waves are booked to the holder and recorded as one authorized war crime.
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from 'vitest';

import type { SettlementRecord } from '../src/map/settlements.js';
import {
    BOT_MINORITY_EXPULSION_POLICY,
    POLICY_EXPULSION_SCOPE,
    POLICY_WAVE_B_DELAY_TURNS,
    minorityPolicyAppliedFlag,
    minorityPolicyWarCrimeFlag,
    seedDisplacementTimerOnFlip,
    processDisplacementTakeover
} from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

const pop1991: MunicipalityPopulation1991Map = {
    vitez: { total: 1000, bosniak: 410, serb: 50, croat: 450, other: 90 },
    mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 },
    travnik: { total: 1000, bosniak: 450, serb: 110, croat: 370, other: 70 },
    zenica: { total: 1000, bosniak: 780, serb: 140, croat: 40, other: 40 }
};

function osidRecord(osid: string, total: number, bosniaks: number, croats: number): SettlementRecord {
    return {
        sid: osid,
        source_id: osid,
        mun_code: osid.split(':')[1],
        mun: osid.split(':')[1],
        properties: {
            population_total: total,
            population_bosniaks: bosniaks,
            population_croats: croats,
            population_serbs: 0,
            population_others: 0
        }
    } as unknown as SettlementRecord;
}

const osidSettlements = new Map<string, SettlementRecord>([
    ['op:vitez:vitez', osidRecord('op:vitez:vitez', 1000, 400, 600)],
    ['op:mostar:zapad', osidRecord('op:mostar:zapad', 2000, 600, 1400)],
    ['op:mostar:istok', osidRecord('op:mostar:istok', 2000, 1600, 400)],
    ['op:travnik:nova_bila', osidRecord('op:travnik:nova_bila', 1000, 300, 700)],
    ['op:zenica:centar', osidRecord('op:zenica:centar', 1000, 900, 100)]
]);

function warState(turn: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'rf5b-policy', phase: 'war', war_start_turn: 0, rbih_hrhb_war_earliest_turn: 20 },
        factions: [],
        military: {
            formations: {},
            militia_pools: {},
            event_flags: {},
            war_front_edges_osid: [],
            negotiation: {
                capital: {
                    HRHB: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RBiH: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RS: { war_crimes_events: 0, war_crimes_events_emergent: 0 }
                }
            }
        } as any,
        political: {
            war_alliance_rbih_hrhb: 0.05,
            rbih_hrhb_state: { war_started_turn: 49 },
            political_controllers: {
                'op:vitez:vitez': 'HRHB',
                'op:mostar:zapad': 'HRHB',
                'op:mostar:istok': 'RBiH',
                'op:travnik:nova_bila': 'HRHB',
                'op:zenica:centar': 'RBiH'
            }
        } as any,
        displacement: {} as any
    };
}

function run(state: GameState) {
    return processDisplacementTakeover(state, new Map(), { battles: [] }, pop1991, osidSettlements);
}

function policyTimers(state: GameState) {
    return Object.fromEntries(
        Object.entries(state.displacement.hostile_takeover_timers ?? {})
            .filter(([, t]) => t.cause === 'policy_expulsion')
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
}

function hrhbEvents(state: GameState) {
    return (state.displacement.displacement_event_log ?? []).filter((e) => e.caused_by === 'HRHB');
}

test('scope table: HRHB only, no RBiH entry, fractions in (0, 1], waves A/B', () => {
    expect(POLICY_EXPULSION_SCOPE.RBiH).toBeUndefined();
    const hrhb = POLICY_EXPULSION_SCOPE.HRHB ?? {};
    expect(Object.keys(hrhb).length).toBeGreaterThan(0);
    for (const entry of Object.values(hrhb)) {
        expect(entry.fraction).toBeGreaterThan(0);
        expect(entry.fraction).toBeLessThanOrEqual(1);
        expect(['A', 'B']).toContain(entry.wave);
    }
    // Municipalities the HVO lost or where the record is Croat flight stay out of scope.
    for (const mun of ['kakanj', 'travnik', 'bugojno', 'fojnica', 'konjic', 'novi_travnik', 'orasje', 'livno']) {
        expect(hrhb[mun]).toBeUndefined();
    }
});

test('a human-controlled HRHB never expels: no policy timers, policy never applied', () => {
    const state = warState(50);
    state.meta.player_faction = 'HRHB';
    for (let t = 50; t <= 70; t++) {
        state.meta.turn = t;
        run(state);
    }
    expect(hrhbEvents(state)).toEqual([]);
    expect(policyTimers(state)).toEqual({});
    expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBeUndefined();
});

test('nothing is seeded before the open bilateral war begins (mobilization alone is not enough)', () => {
    const state = warState(45);
    (state.political as any).rbih_hrhb_state = { war_started_turn: null };
    run(state);
    expect(policyTimers(state)).toEqual({});
    expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBeUndefined();
});

test('a human-controlled RBiH changes nothing; RBiH-held OSIDs are never seeded (no RBiH policy)', () => {
    expect(BOT_MINORITY_EXPULSION_POLICY.RBiH).toBeUndefined();
    const state = warState(50);
    state.meta.player_faction = 'RBiH';
    run(state);
    expect(Object.keys(policyTimers(state))).toEqual(['op:mostar:zapad|RBiH', 'op:vitez:vitez|RBiH']);
});

test('bot HRHB seeds held OSIDs in scope only; wave B starts later; control untouched', () => {
    const state = warState(50);
    run(state);
    const timers = policyTimers(state);
    // Travnik (HRHB-held but out of scope) and RBiH-held OSIDs are never seeded.
    expect(Object.keys(timers)).toEqual(['op:mostar:zapad|RBiH', 'op:vitez:vitez|RBiH']);
    expect(timers['op:vitez:vitez|RBiH']).toMatchObject({ from_faction: 'RBiH', to_faction: 'HRHB', started_turn: 50 });
    expect(timers['op:mostar:zapad|RBiH']).toMatchObject({ started_turn: 50 + POLICY_WAVE_B_DELAY_TURNS });
    expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBe(50);
    expect(state.political.political_controllers!['op:mostar:zapad']).toBe('HRHB');
    expect(state.political.political_controllers!['op:vitez:vitez']).toBe('HRHB');
});

test('the policy is applied once: a later turn does not re-seed', () => {
    const state = warState(50);
    run(state);
    state.displacement.hostile_takeover_timers = {};
    state.meta.turn = 51;
    run(state);
    expect(policyTimers(state)).toEqual({});
});

test('no seeding while the pair is allied', () => {
    const state = warState(50);
    state.political.war_alliance_rbih_hrhb = 0.8;
    run(state);
    expect(policyTimers(state)).toEqual({});
    expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBeUndefined();
});

test('two bounded waves, booked to the holder, one war crime, no sustained drain', () => {
    const state = warState(50);
    run(state); // seed at t50
    for (let t = 51; t <= 53; t++) {
        state.meta.turn = t;
        run(state);
    }
    expect(hrhbEvents(state)).toEqual([]);

    state.meta.turn = 54; // wave A matures after 4 turns
    run(state);
    const vitezFraction = POLICY_EXPULSION_SCOPE.HRHB!.vitez.fraction;
    expect(hrhbEvents(state)).toHaveLength(1);
    expect(hrhbEvents(state)[0]).toMatchObject({
        origin_osid: 'op:vitez:vitez',
        ethnicity: 'RBiH',
        displaced: Math.floor(1000 * 0.4 * vitezFraction)
    });
    expect(state.military.negotiation!.capital.HRHB.war_crimes_events_emergent).toBe(1);
    expect(state.military.negotiation!.capital.HRHB.war_crimes_events).toBe(1);
    expect(state.military.negotiation!.capital.RBiH.war_crimes_events_emergent).toBe(0);

    const waveB = 50 + POLICY_WAVE_B_DELAY_TURNS + 4;
    for (let t = 55; t < waveB; t++) {
        state.meta.turn = t;
        run(state);
    }
    expect(hrhbEvents(state)).toHaveLength(1); // no sustained drain from wave A

    state.meta.turn = waveB;
    run(state);
    const mostarFraction = POLICY_EXPULSION_SCOPE.HRHB!.mostar.fraction;
    const events = hrhbEvents(state);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
        origin_osid: 'op:mostar:zapad',
        displaced: Math.floor(2000 * 0.3 * mostarFraction)
    });
    // The war crime is recorded once per faction, not once per wave.
    expect(state.military.negotiation!.capital.HRHB.war_crimes_events_emergent).toBe(1);

    for (let t = waveB + 1; t <= waveB + 6; t++) {
        state.meta.turn = t;
        run(state);
    }
    expect(hrhbEvents(state)).toHaveLength(2);
});

test('recapture by the expelled side clears the policy timer before it fires', () => {
    const state = warState(50);
    run(state);
    state.political.political_controllers!['op:vitez:vitez'] = 'RBiH';
    state.political.political_controllers!['op:mostar:zapad'] = 'RBiH';
    state.meta.turn = 54;
    run(state);
    expect(policyTimers(state)).toEqual({});
    expect(state.military.negotiation!.capital.HRHB.war_crimes_events_emergent).toBe(0);
});

test('a policy wave against RBiH-aligned people counts declared Bosniaks only, not 1991 "others"', () => {
    const state = warState(50);
    const withOthers = new Map(osidSettlements);
    withOthers.set('op:vitez:vitez', {
        ...osidSettlements.get('op:vitez:vitez')!,
        properties: {
            population_total: 1000,
            population_bosniaks: 300,
            population_croats: 500,
            population_serbs: 0,
            population_others: 200
        }
    } as unknown as SettlementRecord);
    for (let t = 50; t <= 54; t++) {
        state.meta.turn = t;
        processDisplacementTakeover(state, new Map(), { battles: [] }, pop1991, withOthers);
    }
    const vitezFraction = POLICY_EXPULSION_SCOPE.HRHB!.vitez.fraction;
    expect(hrhbEvents(state)[0]).toMatchObject({
        origin_osid: 'op:vitez:vitez',
        displaced: Math.floor(1000 * 0.3 * vitezFraction)
    });
});

test('a third side taking a seeded OSID drops the policy timer: nothing booked to HRHB, the captor seeds its own timer', () => {
    const state = warState(50);
    run(state);
    expect(Object.keys(policyTimers(state))).toContain('op:vitez:vitez|RBiH');
    // RS takes Vitez before wave A.
    state.political.political_controllers!['op:vitez:vitez'] = 'RS';
    seedDisplacementTimerOnFlip(state, 'op:vitez:vitez', 'HRHB', 'RS');
    const timer = state.displacement.hostile_takeover_timers['op:vitez:vitez|RBiH'];
    expect(timer).toMatchObject({ to_faction: 'RS', started_turn: 50 });
    expect(timer.cause).toBeUndefined();
    for (let t = 51; t <= 54; t++) {
        state.meta.turn = t;
        run(state);
    }
    expect(hrhbEvents(state)).toEqual([]);
    expect(state.military.negotiation!.capital.HRHB.war_crimes_events_emergent).toBe(0);
});

test('a policy timer whose holder lost the OSID without a seeding flip is deleted, not fired', () => {
    const state = warState(50);
    run(state);
    state.political.political_controllers!['op:vitez:vitez'] = 'RS';
    state.meta.turn = 54;
    run(state);
    expect(policyTimers(state)['op:vitez:vitez|RBiH']).toBeUndefined();
    expect(hrhbEvents(state)).toEqual([]);
});

test('alliance restored before the wave clears policy timers; the policy is not re-applied', () => {
    const state = warState(50);
    run(state);
    state.political.war_alliance_rbih_hrhb = 0.8;
    state.meta.turn = 54;
    run(state);
    expect(policyTimers(state)).toEqual({});
    state.political.war_alliance_rbih_hrhb = 0.05;
    state.meta.turn = 55;
    run(state);
    expect(policyTimers(state)).toEqual({});
});

test('a policy wave gives the expelling side no manpower: only the expelled community pool shrinks', () => {
    const state = warState(50);
    state.military.militia_pools = {
        'vitez:RBiH': { mun_id: 'vitez', faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 0 },
        'vitez:HRHB': { mun_id: 'vitez', faction: 'HRHB', available: 1000, committed: 0, exhausted: 0, updated_turn: 0 }
    } as any;
    for (let t = 50; t <= 54; t++) {
        state.meta.turn = t;
        run(state);
    }
    expect(hrhbEvents(state)).toHaveLength(1);
    const hrhbPools = Object.values(state.military.militia_pools).filter((p: any) => p.faction === 'HRHB');
    expect(hrhbPools.reduce((s: number, p: any) => s + p.available + p.committed, 0)).toBe(1000);
    expect((state.military.militia_pools as any)['vitez:RBiH'].available).toBeLessThan(1000);
});

test('war crime is not flagged as recorded when the faction has no capital to record it on', () => {
    const state = warState(50);
    delete (state.military.negotiation!.capital as any).HRHB;
    for (let t = 50; t <= 54; t++) {
        state.meta.turn = t;
        run(state);
    }
    expect(hrhbEvents(state)).toHaveLength(1);
    expect(state.military.event_flags[minorityPolicyWarCrimeFlag('HRHB')]).toBeUndefined();
});

test('deterministic: two identical runs produce identical displacement state and logs', () => {
    const simulate = () => {
        const state = warState(50);
            for (let t = 50; t <= 70; t++) {
            state.meta.turn = t;
            run(state);
        }
        return JSON.stringify({ d: state.displacement, f: state.military.event_flags, c: state.military.negotiation });
    };
    expect(simulate()).toBe(simulate());
});

test('validator: cause accepts policy_expulsion only', () => {
    const base = warState(50);
    const errorsFor = (cause: unknown) => {
        const s = structuredClone(base) as any;
        s.displacement.hostile_takeover_timers = {
            'op:vitez:vitez|RBiH': { mun_id: 'vitez', from_faction: 'RBiH', to_faction: 'HRHB', started_turn: 50, ...(cause === undefined ? {} : { cause }) }
        };
        const r = validateGameStateShape(s);
        return (r.ok ? [] : r.errors).filter((e: string) => e.includes('hostile_takeover_timers'));
    };
    expect(errorsFor(undefined)).toEqual([]);
    expect(errorsFor('policy_expulsion')).toEqual([]);
    expect(errorsFor('scripted')).toHaveLength(1);
});

test('single writer: only src/state/war_crimes_record.ts assigns war_crimes_events_emergent', () => {
    const root = path.resolve(__dirname, '..', 'src');
    const writers: string[] = [];
    const walk = (dir: string) => {
        for (const name of fs.readdirSync(dir)) {
            const full = path.join(dir, name);
            if (fs.statSync(full).isDirectory()) walk(full);
            else if (/\.tsx?$/.test(name) && /war_crimes_events_emergent\s*=[^=]/.test(fs.readFileSync(full, 'utf8'))) {
                writers.push(path.relative(root, full).split(path.sep).join('/'));
            }
        }
    };
    walk(root);
    expect(writers).toEqual(['state/war_crimes_record.ts']);
});
