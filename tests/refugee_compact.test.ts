/**
 * A2b (B5, 2026-11-17): the HRHB refugee compact, derived from event_decision_log
 * (src/sim/early_war/refugee_compact.ts). Panel: game designer + historian, integrated ruling
 * approved by the orchestrator.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ensureRbihHrhbState, updateAllianceValue } from '../src/sim/early_war/alliance_update.js';
import {
    getPatronDragStanceMultiplier,
    getRefugeeCompactPhase,
    getRefugeeCompactPressureMultiplier,
    getRefugeeCompactRecruitmentMultiplier,
    getRefugeeCompactStatus,
    REFUGEE_COMPACT_DECISION_TABLE,
    REFUGEE_COMPACT_FLIP_SUSPENSION_TURNS,
    REFUGEE_COMPACT_GRANT_TURNS,
    REFUGEE_COMPACT_MULTIPLIER,
    REFUGEE_COMPACT_RECRUITMENT_PRICE,
} from '../src/sim/early_war/refugee_compact.js';
import { getActiveRecruitmentMultiplier } from '../src/sim/events/active_modifiers.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';

type D = [turn: number, eventId: string, responseId: string, faction?: string, source?: string];
const UNITED: D = [5, 'hrhb_political_goal', 'united_front'];
const PERSISTS: D = [8, 'hrhb_1992_graz_cooperation_collapse', 'formal_alliance_persists'];

function state(
    decisions: D[],
    extra: { suspendedUntil?: number; mods?: unknown[]; washingtonTurn?: number } = {},
): GameState {
    const rhs: Record<string, unknown> = {};
    if (extra.suspendedUntil != null) rhs.refugee_compact_suspended_until = extra.suspendedUntil;
    if (extra.washingtonTurn != null) {
        rhs.washington_signed = true;
        rhs.washington_turn = extra.washingtonTurn;
    }
    return {
        meta: { turn: 0 },
        political: { rbih_hrhb_state: rhs },
        military: {
            recruitment_modifiers: extra.mods ?? [],
            event_decision_log: decisions.map(([turn, event_id, response_id, faction, source]) => ({
                event_id, response_id, decision_source: source ?? 'player', faction: faction ?? 'HRHB', turn,
            })),
        },
    } as unknown as GameState;
}

describe('A2b refugee compact', () => {
    it('no granting choice: every multiplier is exactly 1.0 (bots, history)', () => {
        const s = state([[5, 'hrhb_political_goal', 'croat_republic'], [10, 'hrhb_1992_graz_cooperation_collapse', 'local_friction_emerges']]);
        for (const t of [0, 50, 100]) {
            expect(getRefugeeCompactPressureMultiplier(s, t)).toBe(1.0);
            expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', t)).toBe(1.0);
            expect(getPatronDragStanceMultiplier(s, t)).toBe(1.0);
        }
    });

    it('a renewal answer never opens a compact (the overture renewal is the historical default)', () => {
        const s = state([[89, 'hrhb_federation_overture_1993', 'extend_federation_overture']]);
        expect(getRefugeeCompactStatus(s, 90).active_entries).toBe(0);
        expect(getRefugeeCompactPressureMultiplier(s, 90)).toBe(1.0);
    });

    it('grants: 0.6 per entry, recruitment 0.9 per entry, drag 0.5 per ACTIVE entry; expiry after 56 turns', () => {
        const s = state([UNITED, PERSISTS]);
        expect(getRefugeeCompactPressureMultiplier(s, 20)).toBeCloseTo(REFUGEE_COMPACT_MULTIPLIER ** 2, 12);
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', 20)).toBeCloseTo(REFUGEE_COMPACT_RECRUITMENT_PRICE ** 2, 12);
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'RBiH', 20)).toBe(1.0);
        expect(getPatronDragStanceMultiplier(s, 20)).toBe(0.25);
        // First grant expires at 5 + 56, the second at 8 + 56: the drag damping follows the active entries.
        expect(getRefugeeCompactStatus(s, 5 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(1);
        expect(getPatronDragStanceMultiplier(s, 5 + REFUGEE_COMPACT_GRANT_TURNS)).toBe(0.5);
        expect(getRefugeeCompactStatus(s, 8 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(0);
        // No stance outlives the payment: with the entries gone every multiplier is exactly 1.0
        // (the stance is still counted for the record).
        expect(getPatronDragStanceMultiplier(s, 8 + REFUGEE_COMPACT_GRANT_TURNS)).toBe(1.0);
        expect(getPatronDragStanceMultiplier(s, 150)).toBe(1.0);
        expect(getRefugeeCompactStatus(s, 150).granting_choices).toBe(2);
    });

    it('renewal extends the active entries; the paying path stays active to Washington', () => {
        const s = state([UNITED, PERSISTS, [53, 'hrhb_central_bosnia_defense_1993', 'federate_early'], [89, 'hrhb_federation_overture_1993', 'extend_federation_overture']]);
        expect(getRefugeeCompactStatus(s, 92).active_entries).toBe(2);
        expect(getRefugeeCompactStatus(s, 102).active_entries).toBe(2);
        expect(getRefugeeCompactStatus(s, 119).active_entries).toBe(0);
    });

    it('a lapse answer ends the compact for good; later renewals find nothing', () => {
        const s = state([UNITED, PERSISTS, [47, 'zagreb_restrains_boban_vopp', 'resist_patron'], [53, 'hrhb_central_bosnia_defense_1993', 'federate_early']]);
        const st = getRefugeeCompactStatus(s, 60);
        expect(st.active_entries).toBe(0);
        expect(st.lapsed).toBe(true);
        expect(getRefugeeCompactPressureMultiplier(s, 60)).toBe(1.0);
        // The price and the drag damping end with the compact.
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', 60)).toBe(1.0);
        expect(getPatronDragStanceMultiplier(s, 60)).toBe(1.0);
    });

    it('a flip suspension lifts the damping but the price is still paid', () => {
        const s = state([UNITED], { suspendedUntil: 30 });
        expect(getRefugeeCompactPressureMultiplier(s, 25)).toBe(1.0);
        expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', 25)).toBe(REFUGEE_COMPACT_RECRUITMENT_PRICE);
        expect(getRefugeeCompactPressureMultiplier(s, 30)).toBe(REFUGEE_COMPACT_MULTIPLIER);
    });

    it('only HRHB decisions count', () => {
        const s = state([[5, 'hrhb_political_goal', 'united_front', 'RBiH']]);
        expect(getRefugeeCompactStatus(s, 10).active_entries).toBe(0);
    });

    it('recruitment reader: the compact price multiplies the event modifiers; unchanged without one', () => {
        const mods = [{ faction: 'HRHB', pool_multiplier: 0.95, expires_turn: 99 }];
        expect(getActiveRecruitmentMultiplier(state([], { mods }), 'HRHB', 20)).toBe(0.95);
        expect(getActiveRecruitmentMultiplier(state([UNITED], { mods }), 'HRHB', 20)).toBeCloseTo(0.95 * 0.9, 12);
        expect(getActiveRecruitmentMultiplier(state([UNITED]), 'HRHB', 20)).toBe(0.9);
        expect(getActiveRecruitmentMultiplier(state([]), 'HRHB', 20)).toBe(1.0);
    });
});

describe('A2b grant reaches the H6 renewal window (the 52 to 56 defect, 2026-11-17)', () => {
    // The political goal is answered ahead of firing, so a paying President's first grant is logged at
    // t0. H6 `federate_early` is answered in t52-55. At 52 turns the t0 entry expired on the renewal turn
    // itself and the paying President still went to war (probe A).
    const H6_FIRST_TURN = 52;
    const H6_LAST_TURN = 55;

    it('a t0 grant is still active on every H6 window turn', () => {
        const s = state([[0, 'hrhb_political_goal', 'united_front']]);
        for (let t = H6_FIRST_TURN; t <= H6_LAST_TURN; t += 1) {
            expect(getRefugeeCompactStatus(s, t).active_entries).toBe(1);
        }
        expect(REFUGEE_COMPACT_GRANT_TURNS).toBeGreaterThan(H6_LAST_TURN);
    });

    it('federate_early in the window carries the compact through the t87-89 overture to Washington', () => {
        const s = state([
            [0, 'hrhb_political_goal', 'united_front'],
            [H6_LAST_TURN, 'hrhb_central_bosnia_defense_1993', 'federate_early'],
        ]);
        // The H6 renewal runs 40 turns from its answer (t55 + 40 = t95): active through the overture.
        expect(getRefugeeCompactStatus(s, 89).active_entries).toBe(1);
        expect(getRefugeeCompactStatus(s, H6_LAST_TURN + 39).active_entries).toBe(1);
        expect(getRefugeeCompactStatus(s, H6_LAST_TURN + 40).active_entries).toBe(0);
    });
});

describe('A2b event ids exist in the shipped event data', () => {
    // A content sweep that renames or retires one of these would silently kill the paying path.
    const eventsDir = resolve(__dirname, '../data/scenarios/events');
    const responsesByEvent = new Map<string, Set<string>>();
    for (const file of readdirSync(eventsDir).filter((f) => f.endsWith('.json')).sort()) {
        const parsed = JSON.parse(readFileSync(resolve(eventsDir, file), 'utf8')) as unknown;
        const events = Array.isArray(parsed) ? parsed : ((parsed as { events?: unknown[] }).events ?? []);
        for (const e of events as Array<{ id?: string; response_options?: Array<{ id: string }> }>) {
            if (!e?.id) continue;
            const set = responsesByEvent.get(e.id) ?? new Set<string>();
            for (const r of e.response_options ?? []) set.add(r.id);
            responsesByEvent.set(e.id, set);
        }
    }

    for (const [table, entries] of Object.entries({
        grants: REFUGEE_COMPACT_DECISION_TABLE.grants,
        renewals: Object.fromEntries(Object.entries(REFUGEE_COMPACT_DECISION_TABLE.renewals).map(([k, v]) => [k, v.responses])),
        lapses: REFUGEE_COMPACT_DECISION_TABLE.lapses,
    })) {
        it(`every ${table} (event, response) pair resolves`, () => {
            const rows = Object.entries(entries as Record<string, readonly string[]>);
            expect(rows.length).toBeGreaterThan(0);
            for (const [eventId, responses] of rows) {
                const known = responsesByEvent.get(eventId);
                expect(known, `event ${eventId} is missing from data/scenarios/events`).toBeDefined();
                for (const r of responses) expect(known!.has(r), `${eventId} has no response ${r}`).toBe(true);
            }
        });
    }
});

describe('A2b wiring in alliance_update', () => {
    function allianceState(decisions: D[], opts: { flips?: number } = {}): GameState {
        const s = {
            schema_version: 1,
            meta: { turn: 10, seed: 'a2b-wiring', phase: 'war', referendum_held: true, war_start_turn: 1 },
            factions: [
                { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null },
                { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1 },
                {
                    id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2,
                    patron_state: { material_support_level: 0.5, diplomatic_isolation: 0.2, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 5 },
                },
            ],
            military: {
                formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
                event_decision_log: decisions.map(([turn, event_id, response_id, faction]) => ({
                    event_id, response_id, decision_source: 'player', faction: faction ?? 'HRHB', turn,
                })),
            },
            political: { political_controllers: {}, municipalities: {}, settlements: {}, war_alliance_rbih_hrhb: 0.6 },
            displacement: {
                displacement_state: {
                    travnik: { mun_id: 'travnik', original_population: 100000, displaced_out: 0, displaced_in: 10000, lost_population: 0, last_updated_turn: 10 },
                },
            },
        } as unknown as GameState;
        ensureRbihHrhbState(s);
        if (opts.flips) s.political.rbih_hrhb_state!.bilateral_flips_this_turn = opts.flips;
        return s;
    }

    it('an active compact lowers refugee pressure and patron drag in the drift report', () => {
        const plain = updateAllianceValue(allianceState([]));
        const paid = updateAllianceValue(allianceState([UNITED, PERSISTS]));
        expect(plain.drivers.refugee_pressure).toBeGreaterThan(0);
        expect(paid.drivers.refugee_pressure).toBeCloseTo(plain.drivers.refugee_pressure * REFUGEE_COMPACT_MULTIPLIER ** 2, 12);
        expect(paid.drivers.patron_drag).toBeCloseTo(plain.drivers.patron_drag * 0.25, 12);
    });

    it('with no granting choice the drift report equals the plain one, exactly', () => {
        const plain = updateAllianceValue(allianceState([]));
        const bystander = updateAllianceValue(allianceState([[5, 'hrhb_political_goal', 'croat_republic']]));
        expect(bystander.drivers).toEqual(plain.drivers);
        expect(bystander.new_value).toBe(plain.new_value);
    });

    it('a bilateral flip while a compact is active writes the suspension; a run without one never does', () => {
        const withCompact = allianceState([UNITED], { flips: 1 });
        updateAllianceValue(withCompact);
        expect(withCompact.political.rbih_hrhb_state?.refugee_compact_suspended_until).toBe(10 + REFUGEE_COMPACT_FLIP_SUSPENSION_TURNS);

        const without = allianceState([], { flips: 1 });
        updateAllianceValue(without);
        expect('refugee_compact_suspended_until' in (without.political.rbih_hrhb_state ?? {})).toBe(false);
    });
});

describe('A2b follow-ups: player-only answers and the end at the Washington signing', () => {
    it('a bot answer never opens, renews or lapses a compact', () => {
        for (const source of ['bot_political', 'bot_v1', 'bot_ai_default']) {
            const grant = state([[5, 'hrhb_political_goal', 'united_front', 'HRHB', source]]);
            expect(getRefugeeCompactStatus(grant, 20).active_entries).toBe(0);
            expect(getPatronDragStanceMultiplier(grant, 20)).toBe(1.0);
            expect(getRefugeeCompactRecruitmentMultiplier(grant, 'HRHB', 20)).toBe(1.0);
        }
        // The President's grant, then a bot lapse and a bot renewal: neither changes anything.
        const s = state([
            UNITED,
            [30, 'zagreb_restrains_boban_vopp', 'resist_patron', 'HRHB', 'bot_political'],
            [53, 'hrhb_central_bosnia_defense_1993', 'federate_early', 'HRHB', 'bot_v1'],
        ]);
        expect(getRefugeeCompactStatus(s, 40)).toEqual({ active_entries: 1, granting_choices: 1, lapsed: false, latest_expiry: 5 + REFUGEE_COMPACT_GRANT_TURNS });
        expect(getRefugeeCompactStatus(s, 5 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(0);
        // The same renewal by the President does extend it.
        const own = state([UNITED, [53, 'hrhb_central_bosnia_defense_1993', 'federate_early']]);
        expect(getRefugeeCompactStatus(own, 5 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(1);
    });

    it('the compact ends at the Washington signing: no damping, no price, no drag damping', () => {
        const answers: D[] = [UNITED, PERSISTS, [53, 'hrhb_central_bosnia_defense_1993', 'federate_early'], [89, 'hrhb_federation_overture_1993', 'extend_federation_overture']];
        const open = state(answers);
        expect(getRefugeeCompactStatus(open, 110).active_entries).toBe(2);
        const signed = state(answers, { washingtonTurn: 102 });
        expect(getRefugeeCompactStatus(signed, 101).active_entries).toBe(2);
        expect(getRefugeeCompactStatus(signed, 102).active_entries).toBe(0);
        expect(getRefugeeCompactRecruitmentMultiplier(signed, 'HRHB', 110)).toBe(1.0);
        expect(getRefugeeCompactPressureMultiplier(signed, 110)).toBe(1.0);
        expect(getPatronDragStanceMultiplier(open, 110)).toBe(0.25);
        expect(getPatronDragStanceMultiplier(signed, 110)).toBe(1.0);
    });
});

describe('A2b PR-B: VOPP acknowledge is neutral, resist ends the compact; the expiry is exposed', () => {
    const VOPP = 'zagreb_restrains_boban_vopp';

    it('acknowledging Zagreb (the historical answer) neither renews nor ends the compact', () => {
        const base = state([UNITED, PERSISTS]);
        const acknowledged = state([UNITED, PERSISTS, [46, VOPP, 'acknowledge_pressure']]);
        expect(getRefugeeCompactStatus(acknowledged, 50)).toEqual(getRefugeeCompactStatus(base, 50));
        expect(getRefugeeCompactStatus(acknowledged, 50).lapsed).toBe(false);
        // It does not extend either: the first entry still runs out at 5 + 56.
        expect(getRefugeeCompactStatus(acknowledged, 5 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(1);
        expect(getRefugeeCompactStatus(acknowledged, 8 + REFUGEE_COMPACT_GRANT_TURNS).active_entries).toBe(0);
    });

    it('resisting Zagreb (pressing the provincial map against its restraint) ends the compact for good', () => {
        const s = state([UNITED, PERSISTS, [46, VOPP, 'resist_patron'], [53, 'hrhb_central_bosnia_defense_1993', 'federate_early']]);
        expect(getRefugeeCompactStatus(s, 46)).toMatchObject({ active_entries: 0, lapsed: true, latest_expiry: null });
        expect(getRefugeeCompactStatus(s, 60)).toMatchObject({ active_entries: 0, lapsed: true });
        // Zagreb's pull returns with the lapse: the drag damping is gone too.
        expect(getPatronDragStanceMultiplier(s, 60)).toBe(1.0);
    });

    it('latest_expiry is the last active entry, follows renewals, and is null when nothing is in force', () => {
        const paying = state([UNITED, PERSISTS, [53, 'hrhb_central_bosnia_defense_1993', 'federate_early'], [89, 'hrhb_federation_overture_1993', 'extend_federation_overture']]);
        expect(getRefugeeCompactStatus(paying, 20).latest_expiry).toBe(8 + REFUGEE_COMPACT_GRANT_TURNS);
        expect(getRefugeeCompactStatus(paying, 60).latest_expiry).toBe(53 + 40);
        expect(getRefugeeCompactStatus(paying, 100).latest_expiry).toBe(89 + 30);
        expect(getRefugeeCompactStatus(paying, 89 + 30).latest_expiry).toBeNull();
        expect(getRefugeeCompactStatus(state([]), 20).latest_expiry).toBeNull();
        // The Washington signing ends it.
        expect(getRefugeeCompactStatus(state([UNITED], { washingtonTurn: 40 }), 41).latest_expiry).toBeNull();
    });
});

describe('A2b PR-B2: the compact phase the records-panel line reads', () => {
    const VOPP = 'zagreb_restrains_boban_vopp';
    const paying: D[] = [UNITED, PERSISTS, [53, 'hrhb_central_bosnia_defense_1993', 'federate_early'], [89, 'hrhb_federation_overture_1993', 'extend_federation_overture']];

    it('none: no granting choice was ever made by the President', () => {
        expect(getRefugeeCompactPhase(state([]), 50)).toEqual({ phase: 'none', until: null, ended_turn: null });
        expect(getRefugeeCompactPhase(state([[5, 'hrhb_political_goal', 'united_front', 'HRHB', 'bot_political']]), 50).phase).toBe('none');
    });

    it('active: in force until the latest expiry', () => {
        expect(getRefugeeCompactPhase(state([UNITED, PERSISTS]), 20)).toEqual({ phase: 'active', until: 8 + REFUGEE_COMPACT_GRANT_TURNS, ended_turn: null });
        expect(getRefugeeCompactPhase(state(paying), 100)).toEqual({ phase: 'active', until: 89 + 30, ended_turn: null });
    });

    it('suspended: the displacement damping is lifted after a flip, the compact is still in force', () => {
        expect(getRefugeeCompactPhase(state([UNITED], { suspendedUntil: 30 }), 25)).toEqual({ phase: 'suspended', until: 5 + REFUGEE_COMPACT_GRANT_TURNS, ended_turn: null });
        expect(getRefugeeCompactPhase(state([UNITED], { suspendedUntil: 30 }), 30).phase).toBe('active');
    });

    it("lapsed: ended by the President's own answer, on that turn", () => {
        const s = state([UNITED, PERSISTS, [46, VOPP, 'resist_patron']]);
        expect(getRefugeeCompactPhase(s, 45).phase).toBe('active');
        expect(getRefugeeCompactPhase(s, 46)).toEqual({ phase: 'lapsed', until: null, ended_turn: 46 });
        expect(getRefugeeCompactPhase(s, 130).phase).toBe('lapsed');
    });

    it('ran out: no answer renewed it; the date is the last expiry', () => {
        const s = state([UNITED, PERSISTS]);
        expect(getRefugeeCompactPhase(s, 8 + REFUGEE_COMPACT_GRANT_TURNS - 1).phase).toBe('active');
        expect(getRefugeeCompactPhase(s, 8 + REFUGEE_COMPACT_GRANT_TURNS)).toEqual({ phase: 'ran_out', until: null, ended_turn: 8 + REFUGEE_COMPACT_GRANT_TURNS });
    });

    it('signed: ended by the Washington signing while it was in force', () => {
        const s = state(paying, { washingtonTurn: 102 });
        expect(getRefugeeCompactPhase(s, 101).phase).toBe('active');
        expect(getRefugeeCompactPhase(s, 102)).toEqual({ phase: 'signed', until: null, ended_turn: 102 });
        expect(getRefugeeCompactPhase(s, 150).phase).toBe('signed');
    });

    it('a compact that had already ended before the signing keeps its own ending', () => {
        expect(getRefugeeCompactPhase(state([UNITED, PERSISTS, [46, VOPP, 'resist_patron']], { washingtonTurn: 102 }), 110).phase).toBe('lapsed');
        expect(getRefugeeCompactPhase(state([UNITED, PERSISTS], { washingtonTurn: 102 }), 110).phase).toBe('ran_out');
    });

    it('agrees with the multipliers: the price exists exactly in the active and suspended phases', () => {
        const s = state([UNITED, PERSISTS]);
        for (const t of [0, 20, 61, 64, 100]) {
            const { phase } = getRefugeeCompactPhase(s, t);
            const inForce = phase === 'active' || phase === 'suspended';
            expect(getRefugeeCompactRecruitmentMultiplier(s, 'HRHB', t) < 1).toBe(inForce);
        }
    });
});

describe('A2b determinism: a save taken mid-compact equals a continuous run', () => {
    const fixture = readFileSync(resolve(__dirname, 'fixtures/negotiation/b371_apr1992_initial_save.json'), 'utf8');
    const FIRST = 10;
    const LAST = 40;
    const FLIP_TURN = 25;

    function fresh(): GameState {
        const s = deserializeState(fixture);
        s.political.war_alliance_rbih_hrhb = 0.6;
        s.military.event_decision_log = [UNITED, PERSISTS].map(([turn, event_id, response_id]) => ({
            event_id, response_id, decision_source: 'player' as const, faction: 'HRHB' as const, turn,
        }));
        ensureRbihHrhbState(s);
        return s;
    }

    function step(s: GameState, turn: number): string {
        s.meta.turn = turn;
        s.political.rbih_hrhb_state!.bilateral_flips_this_turn = turn === FLIP_TURN ? 1 : 0;
        const report = updateAllianceValue(s);
        return JSON.stringify([report.new_value, report.drivers]);
    }

    it('serialize and deserialize between turns, through a flip and its suspension, changes nothing', () => {
        const continuous = fresh();
        const continuousReports: string[] = [];
        for (let t = FIRST; t <= LAST; t += 1) continuousReports.push(step(continuous, t));

        let split = fresh();
        const splitReports: string[] = [];
        for (let t = FIRST; t <= LAST; t += 1) {
            splitReports.push(step(split, t));
            // Save and reload before the flip, on the flip turn, and inside the suspension window.
            if (t === FLIP_TURN - 1 || t === FLIP_TURN || t === FLIP_TURN + 4) split = deserializeState(serializeState(split));
        }

        expect(splitReports).toEqual(continuousReports);
        expect(serializeState(split)).toBe(serializeState(continuous));
        expect(continuous.political.rbih_hrhb_state?.refugee_compact_suspended_until).toBe(FLIP_TURN + REFUGEE_COMPACT_FLIP_SUSPENSION_TURNS);
        expect(split.political.rbih_hrhb_state?.refugee_compact_suspended_until).toBe(FLIP_TURN + REFUGEE_COMPACT_FLIP_SUSPENSION_TURNS);
    });
});

describe('A2b save compatibility: refugee_compact_suspended_until', () => {
    const fixture = readFileSync(resolve(__dirname, 'fixtures/negotiation/b371_apr1992_initial_save.json'), 'utf8');

    it('is absent from a save that never had a compact', () => {
        const s = deserializeState(fixture);
        expect(serializeState(s)).not.toContain('refugee_compact_suspended_until');
    });

    it('round-trips when present', () => {
        const s = deserializeState(fixture);
        const rhs = (s.political.rbih_hrhb_state ??= {} as never) as { refugee_compact_suspended_until?: number };
        rhs.refugee_compact_suspended_until = 61;
        const back = deserializeState(serializeState(s));
        expect(back.political.rbih_hrhb_state?.refugee_compact_suspended_until).toBe(61);
    });
});
