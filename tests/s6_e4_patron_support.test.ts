/**
 * §6 E4 (ruled 2026-11-17, unanimous 6/6 over two rounds): `patron_pressure` → `patron_support`,
 * one support semantics.
 *
 * A positive `patron_support` delta means the patron's material and political backing rises.
 * Pressure toward peace is the per-turn patron override, which already carries atrocity
 * pressure. The 1992-95 condemnation, UN, NATO and atrocity cards had been authored in the
 * pressure convention, so each one RAISED the perpetrator's patron support (a reward for
 * atrocity). Those rows were dropped, options were set so a worse choice costs more, and the
 * loader now enforces:
 * - (a) a positive patron_support for X fails where X has humanitarian_impact, a
 *   war_crimes_delta, a negative international_standing shift, or a Ring-3 family; the
 *   allowlist can never override (a);
 * - (b) every other positive row must be on the data allowlist;
 * - (c) a zero-delta patron_support fails;
 * - (d) the old kind name fails.
 * Save migration v42 converts pending decisions.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
    PATRON_SUPPORT_ALLOWLIST,
    loadEventDefinitions,
    loadEventDefinitionsFromDir,
    validatePatronSupportRules,
} from '../src/sim/events/event_loader.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { KNOWN_EVENT_EFFECT_KIND_SET } from '../src/sim/events/event_vocabulary.js';
import { isRing3SensitiveFamily } from '../src/sim/events/event_families.js';
import { pickBotResponseV1 } from '../src/sim/events/bot_response.js';
import { applyMigrations } from '../src/state/save_migration.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EventDefinition, EventEffect, EventResponseOption } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

const EVENTS_DIR = resolve(__dirname, '..', 'data', 'scenarios', 'events');
const EVENT_FILES = [
    'war_1992.json',
    'war_1992_hrhb_summer.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
    'consequences.json',
] as const;

const tempDirs: string[] = [];
afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function writeCatalog(rows: unknown[]): string {
    const dir = mkdtempSync(join(tmpdir(), 'awwv-s6-e4-'));
    tempDirs.push(dir);
    mkdirSync(dir, { recursive: true });
    for (const file of EVENT_FILES) {
        writeFileSync(join(dir, file), JSON.stringify(file === 'war_1992.json' ? rows : [], null, 2), 'utf8');
    }
    return dir;
}

function row(overrides: Record<string, unknown>): EventDefinition {
    return {
        id: 'e4_probe',
        trigger: { turn_min: 0, phase: 'war' },
        effect: { kind: 'narrative', text: 'Probe.' },
        once: true,
        ...overrides,
    } as unknown as EventDefinition;
}

const support = (faction: string, delta: number) => ({ kind: 'patron_support', faction, delta });

function catalog(): EventDefinition[] {
    return loadEventDefinitions(0);
}

function byId(): Map<string, EventDefinition> {
    return new Map(catalog().map((def) => [def.id, def]));
}

function cardEffects(def: EventDefinition): EventEffect[] {
    return [def.effect, ...(def.effects ?? [])];
}

function optionOf(def: EventDefinition, id: string): EventResponseOption {
    const found = def.response_options?.find((o) => o.id === id);
    if (!found) throw new Error(`${def.id} has no option ${id}`);
    return found;
}

function supportSum(effects: readonly EventEffect[], faction: string): number {
    let sum = 0;
    for (const e of effects) if (e.kind === 'patron_support' && e.faction === faction) sum += e.delta;
    return sum;
}

/** Every positive patron_support in the catalog, keyed as the allowlist keys it. */
function positiveRows(): Map<string, string> {
    const out = new Map<string, string>();
    for (const def of catalog()) {
        for (const e of cardEffects(def)) {
            if (e.kind === 'patron_support' && e.delta > 0) out.set(`${def.id}#card`, e.faction);
        }
        for (const o of def.response_options ?? []) {
            for (const e of o.effects ?? []) {
                if (e.kind === 'patron_support' && e.delta > 0) out.set(`${def.id}#${o.id}`, e.faction);
            }
        }
    }
    return out;
}

describe('§6 E4: loader rules', () => {
    it('(d) the old kind name fails, with a message that names the new kind', () => {
        expect(KNOWN_EVENT_EFFECT_KIND_SET.has('patron_pressure')).toBe(false);
        expect(KNOWN_EVENT_EFFECT_KIND_SET.has('patron_support')).toBe(true);
        const old = { kind: 'patron_pressure', faction: 'RS', delta: -5 };
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({ effects: [old] })])))
            .toThrow(/effects\[0\]\.kind 'patron_pressure' was renamed to 'patron_support'/);
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({
            response_options: [{ id: 'accept', label: 'Accept', effects: [old] }],
        })]))).toThrow(/response_options\[0\]\.effects\[0\]\.kind 'patron_pressure' was renamed/);
    });

    it('(a) a positive patron_support beside the same faction\'s atrocity or condemnation marker fails, card or option', () => {
        const cases: Array<[string, EventDefinition]> = [
            ['humanitarian_impact', row({ effects: [support('RS', 5), { kind: 'humanitarian_impact', faction: 'RS', war_crimes_delta: 1 }] })],
            ['negative international_standing', row({ effects: [support('RS', 5)], dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: -5 }] })],
            ['Ring-3 family', row({ family: 'rs_camp_exposure_response', effects: [support('RS', 5)] })],
            ['option negative international_standing', row({ response_options: [{ id: 'go', label: 'Go', effects: [support('RS', 3)], dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: -8 }] }] })],
            ['option beside a card humanitarian_impact', row({ effects: [{ kind: 'humanitarian_impact', faction: 'HRHB', war_crimes_delta: 2 }], response_options: [{ id: 'go', label: 'Go', effects: [support('HRHB', 10)] }] })],
        ];
        for (const [label, def] of cases) {
            expect(() => validatePatronSupportRules([def], {}), label).toThrow(/rule \(a\)/);
        }
        // A marker for another faction does not trip (a) for this one (it still needs the allowlist).
        const otherFaction = row({ effects: [support('RS', 5)], dimension_shifts: [{ faction: 'HRHB', dimension: 'international_standing', delta: -5 }] });
        expect(() => validatePatronSupportRules([otherFaction], { 'e4_probe#card': { faction: 'RS', reason: 'probe' } })).not.toThrow();
        // A negative support next to a marker is a cost, not a reward: allowed.
        const cost = row({ effects: [support('RS', -10), { kind: 'humanitarian_impact', faction: 'RS', war_crimes_delta: 1 }] });
        expect(() => validatePatronSupportRules([cost], {})).not.toThrow();
    });

    it('(a) the allowlist can never override rule (a)', () => {
        const def = row({ response_options: [{ id: 'deny', label: 'Deny', effects: [support('RS', 10)], dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: -15 }] }] });
        const allow = { 'e4_probe#deny': { faction: 'RS', reason: 'an attempted override' } };
        expect(() => validatePatronSupportRules([def], allow)).toThrow(/rule \(a\).*e4_probe#deny:RS\+10/);
        const ring3 = row({ family: 'hrhb_camp_exposure', effects: [support('HRHB', 15)] });
        expect(() => validatePatronSupportRules([ring3], { 'e4_probe#card': { faction: 'HRHB', reason: 'override' } }))
            .toThrow(/rule \(a\)/);
    });

    it('(b) an unlisted positive fails; a listed one passes; a listing for the wrong faction fails', () => {
        const def = row({ response_options: [{ id: 'accept', label: 'Accept', effects: [support('RS', 20)] }] });
        expect(() => validatePatronSupportRules([def], {})).toThrow(/rule \(b\).*e4_probe#accept:RS\+20/);
        expect(() => validatePatronSupportRules([def], { 'e4_probe#accept': { faction: 'RS', reason: 'Belgrade backed it' } })).not.toThrow();
        expect(() => validatePatronSupportRules([def], { 'e4_probe#accept': { faction: 'RBiH', reason: 'wrong faction' } })).toThrow(/rule \(b\)/);
        // Through the real loader with the real allowlist: an unlisted positive fails catalog load.
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({ effects: [support('RS', 5)] })])))
            .toThrow(/rule \(b\)/);
    });

    it('(c) a zero-delta patron_support fails; a negative one needs no allowlist', () => {
        expect(() => validatePatronSupportRules([row({ effects: [support('RS', 0)] })], {})).toThrow(/rule \(c\)/);
        expect(() => validatePatronSupportRules([row({ response_options: [{ id: 'x', label: 'X', effects: [support('RBiH', 0)] }] })], {}))
            .toThrow(/rule \(c\).*e4_probe#x:RBiH/);
        expect(() => validatePatronSupportRules([row({ effects: [support('RS', -5)] })], {})).not.toThrow();
    });

    it('the shipped catalog loads under all four rules', () => {
        expect(() => catalog()).not.toThrow();
        expect(() => validatePatronSupportRules(catalog())).not.toThrow();
    });
});

describe('§6 E4: the writer', () => {
    it('patron_support adds its delta to support_level (unchanged writer), clamped 0-100', () => {
        const state = {
            meta: { turn: 1 },
            military: { formations: {}, negotiation: { patron_relationships: { RS: { support_level: 60 } } } },
            political: {},
        } as unknown as GameState;
        applyEventEffects(state, [{ kind: 'patron_support', faction: 'RS', delta: -10 } as EventEffect]);
        expect((state.military as any).negotiation.patron_relationships.RS.support_level).toBe(50);
        applyEventEffects(state, [{ kind: 'patron_support', faction: 'RS', delta: 80 } as EventEffect]);
        expect((state.military as any).negotiation.patron_relationships.RS.support_level).toBe(100);
    });

    it('the old kind throws at apply time (no silent skip)', () => {
        const state = { meta: { turn: 1 }, military: { formations: {} }, political: {} } as unknown as GameState;
        expect(() => applyEventEffects(state, [{ kind: 'patron_pressure', faction: 'RS', delta: 5 } as unknown as EventEffect]))
            .toThrow(/Unknown event effect kind: patron_pressure/);
    });
});

describe('§6 E4: the allowlist pin', () => {
    // Round 3 (Q2) dropped abdic federation_offer, hv_hvo arbih_coordination and
    // address_defiance_rs (no recorded patron change), with their entries.
    const EXPECTED: Record<string, string> = {
        'contact_group_plan_1994#accept': 'RBiH',
        'csq_patron_recovery_offer#accept_recovery': 'RS',
        'hrhb_posavina_orasje_posture_1992#counterattack_brod': 'HRHB',
        'rbih_arms_embargo_lift_advocacy_1993#lobby_for_lift_and_strike': 'RBiH',
        'rbih_late_war_offensive_1995#wait_for_diplomacy': 'RBiH',
        'rs_assembly_rejects_voplan_1993#override_assembly': 'RS',
        'rs_autonomy_path_decision_1993#accept_federation_status': 'RS',
        'rs_autonomy_path_decision_1993#accept_minority_rights_only': 'RS',
        'rs_autonomy_path_decision_1993#negotiate_autonomy_within_bih': 'RS',
        'rs_contact_group_response_1994#accept_51_49_plan': 'RS',
        'rs_owen_stoltenberg_response_1993#accept_with_modifications': 'RS',
    };

    it('lists exactly the ruled rows, each with its faction and a reason', () => {
        const actual = Object.fromEntries(Object.entries(PATRON_SUPPORT_ALLOWLIST).map(([k, v]) => [k, v.faction]));
        expect(actual).toEqual(EXPECTED);
        for (const entry of Object.values(PATRON_SUPPORT_ALLOWLIST)) expect(entry.reason.trim().length).toBeGreaterThan(10);
    });

    it('every allowlist entry is a live positive row, and every positive row is listed (no stale entries)', () => {
        const live = Object.fromEntries([...positiveRows().entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
        expect(live).toEqual(EXPECTED);
    });

    it('the six rows dropped by rule (a) carry no patron_support', () => {
        const defs = byId();
        for (const [eventId, optionId] of [
            ['visit_to_front_rs', 'visit_sarajevo_lines'],
            ['visit_to_front_rs', 'visit_drina_front'],
            ['visit_to_front_rs', 'visit_press_rs'],
            ['visit_to_front_hrhb', 'visit_mostar_front'],
            ['visit_to_front_hrhb', 'visit_press_hrhb'],
            ['bihac_5th_corps_offensive_1994', 'seek_negotiation'],
        ] as const) {
            const opt = optionOf(defs.get(eventId)!, optionId);
            expect((opt.effects ?? []).some((e) => e.kind === 'patron_support'), `${eventId}#${optionId}`).toBe(false);
        }
    });

    it('P-B (2026-11-18): the five front-visit pressure-convention rows are dropped; no front-visit option carries patron_support', () => {
        const defs = byId();
        const pb = [
            ['visit_to_front_rbih', 'visit_sarajevo'],
            ['visit_to_front_rbih', 'visit_press_rbih'],
            ['visit_to_front_rbih', 'stay_capital_rbih'],
            ['visit_to_front_rs', 'stay_pale_rs'],
            ['visit_to_front_hrhb', 'stay_mostar_hrhb'],
        ] as const;
        for (const [eventId, optionId] of pb) {
            const opt = optionOf(defs.get(eventId)!, optionId);
            expect((opt.effects ?? []).some((e) => e.kind === 'patron_support'), `${eventId}#${optionId}`).toBe(false);
        }
        for (const eventId of ['visit_to_front_rbih', 'visit_to_front_rs', 'visit_to_front_hrhb']) {
            const def = defs.get(eventId)!;
            expect(cardEffects(def).filter((e) => e.kind === 'patron_support'), eventId).toEqual([]);
            for (const o of def.response_options ?? []) {
                expect((o.effects ?? []).filter((e) => e.kind === 'patron_support'), `${eventId}#${o.id}`).toEqual([]);
            }
        }
        // The pending-decision migration drops them too.
        for (const [eventId, optionId] of pb) {
            const state = JSON.parse(readFileSync(resolve(__dirname, '..', 'data', 'derived', 'startup', 'apr_1992_initial_save.json'), 'utf8'));
            state.schema_version = 41;
            state.military.pending_event_decisions = [{
                event_id: eventId,
                response_options: [{ id: optionId, label: 'x', effects: [{ kind: 'patron_pressure', faction: 'RBiH', delta: -3 }, { kind: 'morale_change', faction: 'RBiH', delta: -2 }] }],
            }];
            applyMigrations(state);
            expect(state.military.pending_event_decisions[0].response_options[0].effects, `${eventId}#${optionId}`)
                .toEqual([{ kind: 'morale_change', faction: 'RBiH', delta: -2 }]);
        }
    });
});

describe('§6 E4: ruled rows', () => {
    it('camp options: deny ≤ obstruct ≤ cooperate ≤ 0 for RS and HRHB; the HRHB options carry no patron_confidence shift', () => {
        const defs = byId();
        for (const [eventId, faction] of [['concentration_camps_revealed_1992', 'RS'], ['hrhb_camp_exposure_response_1993', 'HRHB']] as const) {
            const def = defs.get(eventId)!;
            const [deny, obstruct, cooperate] = (['deny', 'obstruct', 'cooperate'] as const)
                .map((id) => supportSum(optionOf(def, id).effects ?? [], faction));
            expect([deny, obstruct, cooperate], eventId).toEqual([-10, -5, 0]);
            expect(deny).toBeLessThanOrEqual(obstruct);
            expect(obstruct).toBeLessThanOrEqual(cooperate);
            expect(cooperate).toBeLessThanOrEqual(0);
            expect(supportSum(cardEffects(def), faction), `${eventId} card`).toBe(0);
        }
        const hrhb = defs.get('hrhb_camp_exposure_response_1993')!;
        for (const o of hrhb.response_options ?? []) {
            expect((o.dimension_shifts ?? []).filter((s) => s.dimension === 'patron_confidence'), o.id).toEqual([]);
        }
    });

    it('no atrocity or condemnation card gives its perpetrator a positive support', () => {
        for (const def of catalog()) {
            const scopes: Array<{ label: string; effects: EventEffect[]; shifts: Array<{ faction: string; dimension: string; delta: number }> }> = [
                { label: `${def.id}#card`, effects: cardEffects(def), shifts: (def as any).dimension_shifts ?? [] },
            ];
            for (const o of def.response_options ?? []) {
                scopes.push({ label: `${def.id}#${o.id}`, effects: [...(o.effects ?? []), ...cardEffects(def)], shifts: [...(o.dimension_shifts ?? []), ...((def as any).dimension_shifts ?? [])] });
            }
            for (const scope of scopes) {
                for (const e of scope.effects) {
                    if (e.kind !== 'patron_support' || e.delta <= 0) continue;
                    const f = e.faction;
                    const marked = isRing3SensitiveFamily(def.family)
                        || scope.effects.some((x) => x.kind === 'humanitarian_impact' && x.faction === f)
                        || scope.shifts.some((s) => s.faction === f && s.dimension === 'international_standing' && s.delta < 0);
                    expect(marked, `${scope.label}:${f}+${e.delta}`).toBe(false);
                }
            }
        }
    });

    it('the dropped condemnation, UN, NATO, atrocity and Dayton cards carry no card-level patron_support', () => {
        const defs = byId();
        for (const id of [
            'sarajevo_siege_begins_1992', 'concentration_camps_revealed_1992', 'turajlic_assassination_1993', 'us_envoy_appointed_1993',
            'morillon_enters_srebrenica_1993', 'srebrenica_shelling_1993', 'markale_area_shelling_1993', 'markale_massacre_1994',
            'second_markale_massacre_1995', 'tuzla_gate_massacre_1995', 'srebrenica_falls_1995', 'un_hostage_crisis_1995',
            'rapid_reaction_force_1995', 'nato_air_strike_threat_1993', 'nato_ultimatum_sarajevo_1994', 'nato_shoots_down_planes_1994',
            'gorazde_crisis_1994', 'bihac_crisis_1994', 'un_resolution_808_tribunal_1993', 'un_nfz_enforcement_1993',
            'un_resolution_819_srebrenica_1993', 'un_resolution_820_sanctions_1993', 'un_safe_areas_declared_1993', 'icty_established_1993',
            'un_resolution_836_force_1993', 'hvo_detention_camps_1993', 'hrhb_camp_exposure_response_1993', 'stupni_do_massacre_1993',
            'east_mostar_siege_1993', 'battle_of_the_barracks_sarajevo', 'battle_of_the_barracks_tuzla', 'belgrade_embargo_rs_1994',
            'belgrade_signs_dayton_for_rs_1995', 'zagreb_signs_dayton_for_hrhb_1995', 'us_forces_dayton_rbih_1995',
            'csq_prolonged_war_exhaustion_1995', 'bosnian_assembly_rejects_os_1993',
        ]) {
            const def = defs.get(id);
            expect(def, id).toBeDefined();
            expect(cardEffects(def!).filter((e) => e.kind === 'patron_support'), id).toEqual([]);
        }
    });

    it('set values: a worse choice costs more and no option is a net gain', () => {
        const defs = byId();
        const expected: Array<[string, string, string, number]> = [
            ['un_hostage_crisis_1995', 'maintain_hostages', 'RS', -10],
            ['un_hostage_crisis_1995', 'release_gradually', 'RS', 0],
            ['belgrade_embargo_rs_1994', 'defiant', 'RS', -10],
            ['rbih_minority_retention_1992', 'mandatory_purge', 'RBiH', -20],
            ['us_halts_federation_advance_1995', 'push_further', 'RBiH', -15],
            ['rbih_federation_army_integration_1994', 'refuse_integration', 'RBiH', -10],
            ['hrhb_federation_army_integration_1994', 'refuse_integration', 'HRHB', 0],
            ['rbih_nato_ultimatum_compliance_1994', 'rbih_defy_hwez_regime', 'RBiH', -10],
            ['contact_group_plan_1994', 'accept', 'RBiH', 10],
            ['contact_group_plan_1994', 'reject', 'RBiH', -10],
            ['rs_assembly_rejects_voplan_1993', 'override_assembly', 'RS', 5],
            ['rs_assembly_rejects_voplan_1993', 'accept_rejection', 'RS', -10],
            // Interim carriers until E3a2 routes these peace-plan cards into the plan resolution
            // (coordinator ruling 2026-11-17); E3a2 strips them.
            ['rs_owen_stoltenberg_response_1993', 'reject_plan', 'RS', -20],
            ['rs_contact_group_response_1994', 'negotiate_amendments', 'RS', -5],
            // Round 3 (Q3/R4-4): Belgrade's break is carried by CONTACT_GROUP_REJECTION and the
            // RBiH reject by contact_group_plan_1994#reject, so both reject cards carry none.
            ['rs_contact_group_response_1994', 'reject_51_49_plan', 'RS', 0],
            ['rbih_contact_group_response_1994', 'reject_51_49_plan', 'RBiH', 0],
            ['rbih_contact_group_response_1994', 'accept_51_49_plan', 'RBiH', 0],
            ['vance_owen_plan_1993', 'accept', 'RBiH', 0],
            ['owen_stoltenberg_plan_1993', 'accept', 'RBiH', 0],
        ];
        for (const [eventId, optionId, faction, value] of expected) {
            expect(supportSum(optionOf(defs.get(eventId)!, optionId).effects ?? [], faction), `${eventId}#${optionId}`).toBe(value);
        }
    });

    it('the bot keeps the historical default on the camps, hostage and purge rows', () => {
        const defs = byId();
        const rows: Array<[string, string]> = [
            ['concentration_camps_revealed_1992', 'obstruct'],
            ['hrhb_camp_exposure_response_1993', 'deny'],
            ['un_hostage_crisis_1995', 'release_gradually'],
            ['rbih_minority_retention_1992', 'retain_minorities'],
        ];
        for (const [eventId, historical] of rows) {
            const def = defs.get(eventId)!;
            expect(def.bot_response_logic, eventId).toBe('historical');
            expect(def.historical_default_response_id, eventId).toBe(historical);
            for (const aggressiveness of [1, 3, 5]) {
                for (const competence of [1, 3, 5]) {
                    const picked = pickBotResponseV1(def.response_options!, def.bot_response_logic, { aggressiveness, competence }, def.historical_default_response_id);
                    expect(picked.id, `${eventId} a${aggressiveness} c${competence}`).toBe(historical);
                }
            }
        }
    });
});

describe('§6 E4: save migration v42', () => {
    const FIXTURE = resolve(__dirname, 'fixtures', 'save_migration', 'v41_patron_pressure_pending.json');

    it('renames, applies SET and DROP by (event, option), strips the camp shifts', () => {
        const migrated = deserializeState(readFileSync(FIXTURE, 'utf8'));
        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        const decisions = migrated.military.pending_event_decisions!;
        const camps = decisions.find((d) => d.event_id === 'concentration_camps_revealed_1992')!;
        expect(camps.response_options.map((o) => supportSum(o.effects, 'RS'))).toEqual([-10, -5, 0]);
        // Round 3 (Q1, one carrier per patron change): the RS camp options keep patron_support
        // and lose their patron_confidence twins too; other shifts stay.
        expect(camps.response_options.flatMap((o) => o.dimension_shifts ?? []).some((s) => s.dimension === 'patron_confidence')).toBe(false);
        expect(camps.response_options[0].dimension_shifts).toContainEqual({ faction: 'RS', dimension: 'international_standing', delta: -15 });
        const hrhb = decisions.find((d) => d.event_id === 'hrhb_camp_exposure_response_1993')!;
        expect(hrhb.response_options.map((o) => supportSum(o.effects, 'HRHB'))).toEqual([-10, -5, 0]);
        expect(hrhb.response_options.flatMap((o) => o.dimension_shifts ?? []).some((s) => s.dimension === 'patron_confidence')).toBe(false);
        const hostage = decisions.find((d) => d.event_id === 'un_hostage_crisis_1995')!;
        expect(hostage.response_options.map((o) => o.effects)).toEqual([
            [{ kind: 'patron_support', faction: 'RS', delta: -10 }, { kind: 'morale_change', faction: 'RS', delta: 2 }],
            [],
        ]);
        const autonomy = decisions.find((d) => d.event_id === 'rs_autonomy_path_decision_1993')!;
        expect(autonomy.response_options.map((o) => o.effects)).toEqual([
            [{ kind: 'patron_support', faction: 'RS', delta: -5 }],
            [{ kind: 'patron_support', faction: 'RS', delta: 15 }],
        ]);
        expect(serializeState(migrated)).not.toContain('"patron_pressure"');
    });

    it('is idempotent: running v42 again on a migrated state changes nothing', () => {
        const migrated = deserializeState(readFileSync(FIXTURE, 'utf8'));
        const once = serializeState(migrated);
        const again = JSON.parse(once) as GameState;
        again.schema_version = 41;
        expect(applyMigrations(again)).toBe(1);
        expect(serializeState(again)).toBe(once);
    });

    it('a migrated pending decision resolves through the current applier (no unknown kind)', () => {
        const migrated = deserializeState(readFileSync(FIXTURE, 'utf8'));
        for (const decision of migrated.military.pending_event_decisions!) {
            for (const o of decision.response_options) {
                for (const e of o.effects) expect(KNOWN_EVENT_EFFECT_KIND_SET.has(e.kind), `${decision.event_id}#${o.id}:${e.kind}`).toBe(true);
            }
        }
    });

    it('no change on a clean state (the startup snapshot)', () => {
        const startup = readFileSync(resolve(__dirname, '..', 'data', 'derived', 'startup', 'apr_1992_initial_save.json'), 'utf8');
        const clean = deserializeState(startup);
        const asV41 = JSON.parse(startup);
        asV41.schema_version = 41;
        expect(serializeState(deserializeState(JSON.stringify(asV41)))).toBe(serializeState(clean));
    });
});
