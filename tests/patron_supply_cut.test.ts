import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import {
    PATRON_SUPPLY_CUT_FLOOR,
    getActiveEquipmentQualityMultiplier,
    getActivePatronSupplyCutProduct,
    getEffectivePatronSupplyCutMultiplier,
    isPatronSupplyCutFloorBinding,
} from '../src/sim/events/active_modifiers.js';
import { loadEventDefinitionsFromDir, validatePatronSupplyCut } from '../src/sim/events/event_loader.js';
import { pickBotResponseV1 } from '../src/sim/events/bot_response.js';
import { scorePoliticalOption } from '../src/sim/political/political_event_decision.js';
import { getPoliticalPersonality } from '../src/sim/political/political_personality.js';
import { applyMigrations, PATRON_SUPPLY_CUT_PENDING } from '../src/state/save_migration.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import type { EventDefinition, EventEffect, EventResponseOption } from '../src/sim/events/event_types.js';

/**
 * Patron-defiance panel (2026-11-17; Systems Manual §7.10.3): a defiance answer carries one
 * live material cost, the `patron_supply_cut` effect: combat power for N weeks through the
 * existing equipment-quality reader, floored per patron, with one receipt per answer.
 */

function makeState(turn = 10, supportLevel = 60): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'patron-supply-cut' },
        factions: [],
        military: {
            negotiation: {
                patron_relationships: {
                    RS: { support_level: supportLevel },
                    HRHB: { support_level: supportLevel },
                },
            },
        },
        political: {},
        displacement: {},
    } as unknown as GameState;
}

function cut(faction: 'RS' | 'HRHB', multiplier: number, duration: number, tag: string): EventEffect {
    return { kind: 'patron_supply_cut', faction, multiplier, duration_turns: duration, tag };
}

describe('patron_supply_cut: the writer', () => {
    it('writes one sourced combat-power entry and one tagged receipt', () => {
        const state = makeState(54, 60);
        applyEventEffects(state, [cut('RS', 0.95, 13, 'milosevic_vopp_pressure#resist_patron')]);
        expect(state.military.equipment_quality_modifiers).toEqual([
            { faction: 'RS', multiplier: 0.95, expires_turn: 67, source: 'patron_supply_cut' },
        ]);
        expect(state.military.patron_defiance_supply_cuts).toEqual([{
            faction: 'RS',
            turn: 54,
            cut_fraction: 1 - 0.95,
            support_after: 0.6,
            tag: 'milosevic_vopp_pressure#resist_patron',
            expires_turn: 67,
            combined_multiplier: 0.95,
        }]);
    });

    it('records support after the answer\'s own patron_support cost (that kind applies first)', () => {
        const state = makeState(20, 70);
        applyEventEffects(state, [
            cut('HRHB', 0.9, 26, 'hrhb_zagreb_supply_channel_1992#assert_autonomy'),
            { kind: 'patron_support', faction: 'HRHB', delta: -18 },
        ]);
        expect(state.military.patron_defiance_supply_cuts?.[0]?.support_after).toBeCloseTo(0.52, 10);
    });

    it('marks the receipt when the patron floor already binds, and reports the floored combined cut', () => {
        const state = makeState(10);
        applyEventEffects(state, [cut('HRHB', 0.85, 52, 'hrhb_political_goal#united_front')]);
        state.meta.turn = 11;
        applyEventEffects(state, [cut('HRHB', 0.9, 26, 'hrhb_1992_graz_cooperation_collapse#formal_alliance_persists')]);
        // 0.85 x 0.9 = 0.765: above the HRHB floor 0.75.
        expect(state.military.patron_defiance_supply_cuts?.[1]?.floor_binding).toBeUndefined();
        state.meta.turn = 20;
        applyEventEffects(state, [cut('HRHB', 0.9, 26, 'hrhb_zagreb_supply_channel_1992#assert_autonomy')]);
        const receipt = state.military.patron_defiance_supply_cuts?.[2];
        expect(receipt?.floor_binding).toBe(true);
        expect(receipt?.combined_multiplier).toBe(PATRON_SUPPLY_CUT_FLOOR.HRHB);
    });

    it('rejects a malformed cut without writing anything but the anomaly log', () => {
        const state = makeState();
        applyEventEffects(state, [cut('RS', 1.2, 13, 'x#y')]);
        expect(state.military.equipment_quality_modifiers).toBeUndefined();
        expect(state.military.patron_defiance_supply_cuts).toBeUndefined();
        expect(state.military.event_effect_anomalies?.[0]?.effect_kind).toBe('patron_supply_cut');
    });
});

describe('patron_supply_cut: the combat reader and its floor', () => {
    it('without a patron entry the reader is the plain product (bit-identical to before)', () => {
        const state = makeState(10);
        state.military.equipment_quality_modifiers = [
            { faction: 'RS', multiplier: 1.04, expires_turn: 40 },
            { faction: 'RS', multiplier: 0.94, expires_turn: 40 },
        ];
        expect(getActiveEquipmentQualityMultiplier(state, 'RS', 10)).toBe(1.0 * 1.04 * 0.94);
        expect(getEffectivePatronSupplyCutMultiplier(state, 'RS', 10)).toBe(1.0);
        expect(isPatronSupplyCutFloorBinding(state, 'RS', 10)).toBe(false);
    });

    it('floors RS patron cuts at 0.85 and HRHB at 0.75; other entries multiply outside the floor', () => {
        const state = makeState(10);
        state.military.equipment_quality_modifiers = [
            { faction: 'RS', multiplier: 0.9, expires_turn: 40, source: 'patron_supply_cut' },
            { faction: 'RS', multiplier: 0.9, expires_turn: 30, source: 'patron_supply_cut' },
            { faction: 'RS', multiplier: 1.04, expires_turn: 40 },
            { faction: 'HRHB', multiplier: 0.85, expires_turn: 40, source: 'patron_supply_cut' },
            { faction: 'HRHB', multiplier: 0.9, expires_turn: 40, source: 'patron_supply_cut' },
            { faction: 'HRHB', multiplier: 0.9, expires_turn: 40, source: 'patron_supply_cut' },
        ];
        expect(getActivePatronSupplyCutProduct(state, 'RS', 10)).toBeCloseTo(0.81, 12);
        expect(getActiveEquipmentQualityMultiplier(state, 'RS', 10)).toBeCloseTo(1.04 * 0.85, 12);
        expect(getActiveEquipmentQualityMultiplier(state, 'HRHB', 10)).toBeCloseTo(0.75, 12);
        expect(isPatronSupplyCutFloorBinding(state, 'RS', 10)).toBe(true);
        // Clamp on read: once the shorter RS cut ends, the longer one is charged in full again.
        expect(getActiveEquipmentQualityMultiplier(state, 'RS', 30)).toBeCloseTo(1.04 * 0.9, 12);
        expect(isPatronSupplyCutFloorBinding(state, 'RS', 30)).toBe(false);
        // Expired entirely.
        expect(getActiveEquipmentQualityMultiplier(state, 'RS', 40)).toBe(1.0);
    });
});

describe('patron_supply_cut: loader rules', () => {
    function row(option: Partial<EventResponseOption> & { id: string }, extra: Partial<EventDefinition> = {}): EventDefinition {
        return {
            id: 'test_card',
            response_options: [
                { id: 'comply', label: 'Comply', effects: [] },
                { label: 'Defy', effects: [], ...option },
            ],
            historical_default_response_id: 'comply',
            ...extra,
        } as unknown as EventDefinition;
    }
    const defiance = { dimension_shifts: [{ faction: 'RS', dimension: 'patron_confidence', delta: -10 }] };

    it('accepts a well-formed cut on a defiance answer', () => {
        expect(() => validatePatronSupplyCut([row({
            id: 'defy', ...defiance, effects: [cut('RS', 0.95, 13, 'test_card#defy')],
        } as never)])).not.toThrow();
    });

    it.each([
        ['RBiH has no coercive patron', { id: 'defy', ...defiance, effects: [{ ...cut('RS', 0.95, 13, 'test_card#defy'), faction: 'RBiH' }] }, /faction must be RS or HRHB/],
        ['multiplier must be below 1', { id: 'defy', ...defiance, effects: [cut('RS', 1, 13, 'test_card#defy')] }, /multiplier/],
        ['duration must be an integer >= 1', { id: 'defy', ...defiance, effects: [cut('RS', 0.95, 0, 'test_card#defy')] }, /duration_turns/],
        ['tag must name the answer', { id: 'defy', ...defiance, effects: [cut('RS', 0.95, 13, 'other#defy')] }, /tag must be/],
        ['the cut must follow a defiance', { id: 'defy', effects: [cut('RS', 0.95, 13, 'test_card#defy')] }, /no negative patron move/],
        ['one material carrier per option', {
            id: 'defy', ...defiance,
            effects: [cut('RS', 0.95, 13, 'test_card#defy'), { kind: 'recruitment_modifier', faction: 'RS', pool_multiplier: 0.9, duration_turns: 52 }],
        }, /more than one material carrier/],
    ])('rejects: %s', (_label, option, message) => {
        expect(() => validatePatronSupplyCut([row(option as never)])).toThrow(message);
    });

    it('rejects a cut on the historical default and on a card', () => {
        expect(() => validatePatronSupplyCut([row({ id: 'comply', ...defiance, effects: [cut('RS', 0.95, 13, 'test_card#comply')] } as never)]))
            .toThrow(/historical default/);
        const card = { id: 'test_card', effects: [cut('RS', 0.95, 13, 'test_card#card')], response_options: [] } as unknown as EventDefinition;
        expect(() => validatePatronSupplyCut([card])).toThrow(/belongs on a response option/);
    });

    it('a patron_support cost also counts as the defiance', () => {
        expect(() => validatePatronSupplyCut([row({
            id: 'defy',
            effects: [{ kind: 'patron_support', faction: 'HRHB', delta: -6 }, cut('HRHB', 0.97, 13, 'test_card#defy')],
        } as never)])).not.toThrow();
    });
});

describe('patron_supply_cut: the ruled catalog rows (pin)', () => {
    const RULED: Record<string, [faction: 'RS' | 'HRHB', multiplier: number, weeks: number]> = {
        'belgrade_embargo_rs_1994#defiant': ['RS', 0.93, 26],
        'hrhb_1992_graz_cooperation_collapse#formal_alliance_persists': ['HRHB', 0.9, 26],
        'hrhb_political_goal#united_front': ['HRHB', 0.85, 52],
        'hrhb_zagreb_supply_channel_1992#assert_autonomy': ['HRHB', 0.9, 26],
        'hrhb_zagreb_supply_channel_1992#diversify_supply': ['HRHB', 0.97, 13],
        'milosevic_drina_warning#resist_patron': ['RS', 0.95, 13],
        'milosevic_isolation_warning_aug92#resist_patron': ['RS', 0.97, 13],
        'milosevic_owen_stoltenberg_distancing#resist_patron': ['RS', 0.97, 13],
        'milosevic_vopp_pressure#resist_patron': ['RS', 0.95, 13],
        'rs_belgrade_pressure_response_1993#defy_belgrade_directive': ['RS', 0.95, 13],
        'rs_belgrade_pressure_response_1993#partial_compliance': ['RS', 0.98, 13],
        'zagreb_orders_hrhb_ceasefire#resist_patron': ['HRHB', 0.85, 52],
        'zagreb_restrains_boban_vopp#resist_patron': ['HRHB', 0.95, 13],
    };
    const defs = loadEventDefinitionsFromDir(0, resolve(__dirname, '..', 'data', 'scenarios', 'events'));

    it('carries exactly the ruled cuts, and the save migration list mirrors them', () => {
        const found: Record<string, [string, number, number]> = {};
        for (const def of defs) {
            for (const option of def.response_options ?? []) {
                for (const effect of option.effects ?? []) {
                    if (effect.kind !== 'patron_supply_cut') continue;
                    found[effect.tag] = [effect.faction, effect.multiplier, effect.duration_turns];
                }
            }
        }
        expect(found).toEqual(RULED);
        const migrationList = Object.fromEntries(Object.entries(PATRON_SUPPLY_CUT_PENDING)
            .map(([key, spec]) => [key, [spec.faction, spec.multiplier, spec.duration_turns]]));
        expect(migrationList).toEqual(RULED);
    });

    it('the Zagreb break costs more than any single Belgrade answer (historian: asymmetric leverage)', () => {
        const rs = Object.values(RULED).filter(([f]) => f === 'RS').map(([, m]) => m);
        expect(Math.min(...rs)).toBeGreaterThan(RULED['zagreb_orders_hrhb_ceasefire#resist_patron'][1]);
    });

    it('belgrade_embargo defiant swapped its recruitment cost for the combat cut (one carrier)', () => {
        const option = defs.find((d) => d.id === 'belgrade_embargo_rs_1994')!.response_options!.find((o) => o.id === 'defiant')!;
        expect(option.effects.some((e) => e.kind === 'recruitment_modifier')).toBe(false);
    });
});

describe('patron_supply_cut: hands-off answers cannot change', () => {
    const defs = loadEventDefinitionsFromDir(0, resolve(__dirname, '..', 'data', 'scenarios', 'events'));
    const strip = (option: EventResponseOption): EventResponseOption => ({
        ...option,
        effects: (option.effects ?? []).filter((e) => e.kind !== 'patron_supply_cut'),
    });

    it('neither bot scorer reads the cut: every scored option scores the same with and without it', () => {
        const assessment = { blended_score: 50, situation_score: 50, patron_pressure: 30, territory_trend: 'stable' } as never;
        for (const def of defs) {
            for (const option of def.response_options ?? []) {
                const withCut = option.effects?.find((e) => e.kind === 'patron_supply_cut');
                if (!withCut || withCut.kind !== 'patron_supply_cut') continue;
                const personality = getPoliticalPersonality(withCut.faction);
                expect(scorePoliticalOption(option, withCut.faction, assessment, personality))
                    .toBe(scorePoliticalOption(strip(option), withCut.faction, assessment, personality));
                const options = def.response_options!;
                const commander = { aggressiveness: 3, competence: 3 };
                expect(pickBotResponseV1(options, def.bot_response_logic, commander, def.historical_default_response_id).id)
                    .toBe(pickBotResponseV1(options.map(strip), def.bot_response_logic, commander, def.historical_default_response_id).id);
            }
        }
    });
});

describe('patron_supply_cut: save migration v43', () => {
    const FIXTURE = resolve(__dirname, 'fixtures', 'save_migration', 'v41_patron_pressure_pending.json');

    function v42Save(): string {
        const raw = JSON.parse(readFileSync(FIXTURE, 'utf8'));
        raw.schema_version = 42;
        raw.military.pending_event_decisions = [
            {
                event_id: 'zagreb_orders_hrhb_ceasefire', event_title: 'Zagreb Orders HVO Ceasefire With ARBiH', turn_fired: 95,
                faction: 'HRHB', requires_player_response: true, historical_default_response_id: 'acknowledge_pressure',
                response_options: [
                    { id: 'acknowledge_pressure', label: 'Acknowledge the message', effects: [], dimension_shifts: [{ faction: 'HRHB', dimension: 'patron_confidence', delta: 8 }] },
                    { id: 'resist_patron', label: 'Maintain our position', dimension_shifts: [{ faction: 'HRHB', dimension: 'patron_confidence', delta: -25 }] },
                ],
            },
            {
                event_id: 'hrhb_political_goal', event_title: 'Herceg-Bosna', turn_fired: 3,
                faction: 'HRHB', requires_player_response: true, historical_default_response_id: 'croat_republic',
                response_options: [
                    { id: 'croat_republic', label: 'Croat republic', effects: [] },
                    {
                        id: 'united_front', label: 'United front with ARBiH',
                        effects: [
                            { kind: 'alliance_change', delta: 0.15 },
                            { kind: 'equipment_quality_modifier', faction: 'HRHB', multiplier: 0.85, duration_turns: 52 },
                        ],
                        future_consequences: [{ id: 'f', label: 'f', timing: 'future', certainty: 'conditional', material_effect_refs: ['alliance_change', 'equipment_quality_modifier.HRHB'] }],
                    },
                ],
            },
            {
                event_id: 'belgrade_embargo_rs_1994', event_title: 'Belgrade Breaks with Pale', turn_fired: 121,
                faction: 'RS', requires_player_response: true, historical_default_response_id: 'negotiate',
                response_options: [
                    { id: 'negotiate', label: 'Seek accommodation', effects: [] },
                    {
                        id: 'defiant', label: 'Defy Belgrade',
                        effects: [
                            { kind: 'patron_support', faction: 'RS', delta: -10 },
                            { kind: 'recruitment_modifier', faction: 'RS', pool_multiplier: 0.9, duration_turns: 52 },
                        ],
                    },
                ],
            },
        ];
        raw.military.patron_defiance_supply_cuts = [
            { faction: 'HRHB', turn: 4, cut_fraction: 0.18, support_after: 0.52 },
            { faction: 'HRHB', turn: 5, cut_fraction: 0.48, support_after: 0.33 },
        ];
        return JSON.stringify(raw);
    }

    it('gives pending defiance answers their cut, rewrites the old carriers, drops pre-panel receipts', () => {
        const migrated = deserializeState(v42Save());
        expect(migrated.schema_version).toBe(43);
        const byId = (id: string) => migrated.military.pending_event_decisions!.find((d) => d.event_id === id)!;
        const ceasefire = byId('zagreb_orders_hrhb_ceasefire');
        expect(ceasefire.response_options[0]!.effects).toEqual([]);
        expect(ceasefire.response_options[1]!.effects).toEqual([cut('HRHB', 0.85, 52, 'zagreb_orders_hrhb_ceasefire#resist_patron')]);
        const united = byId('hrhb_political_goal').response_options[1]!;
        expect(united.effects).toEqual([{ kind: 'alliance_change', delta: 0.15 }, cut('HRHB', 0.85, 52, 'hrhb_political_goal#united_front')]);
        expect(united.future_consequences?.[0]?.material_effect_refs).toEqual(['alliance_change', 'patron_supply_cut.HRHB']);
        const defiant = byId('belgrade_embargo_rs_1994').response_options[1]!;
        expect(defiant.effects).toEqual([{ kind: 'patron_support', faction: 'RS', delta: -10 }, cut('RS', 0.93, 26, 'belgrade_embargo_rs_1994#defiant')]);
        expect(migrated.military.patron_defiance_supply_cuts).toBeUndefined();
    });

    it('keeps tagged receipts and is idempotent', () => {
        const raw = JSON.parse(v42Save());
        raw.military.patron_defiance_supply_cuts.push({
            faction: 'HRHB', turn: 46, cut_fraction: 0.05, support_after: 0.7,
            tag: 'zagreb_restrains_boban_vopp#resist_patron', expires_turn: 59, combined_multiplier: 0.95,
        });
        const migrated = deserializeState(JSON.stringify(raw));
        expect(migrated.military.patron_defiance_supply_cuts).toHaveLength(1);
        const once = serializeState(migrated);
        const again = JSON.parse(once) as GameState;
        again.schema_version = 42;
        expect(applyMigrations(again)).toBe(1);
        expect(serializeState(again)).toBe(once);
    });

    it('no change on a clean state (the startup snapshot)', () => {
        const startup = readFileSync(resolve(__dirname, '..', 'data', 'derived', 'startup', 'apr_1992_initial_save.json'), 'utf8');
        const clean = deserializeState(startup);
        const before = serializeState(clean);
        const again = JSON.parse(before) as GameState;
        again.schema_version = 42;
        applyMigrations(again);
        expect(serializeState(again)).toBe(before);
    });
});
