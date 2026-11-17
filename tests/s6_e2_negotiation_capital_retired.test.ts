/**
 * §6 E2 (ruled 2026-11-17, unanimous across four seats, two rounds): the
 * `negotiation_capital` event effect kind is retired.
 *
 * Every one of its 51 catalog effects was a silent no-op: the writer only touched raw
 * NegotiationBreakdown counters, and none of the dimension names the data used is a key
 * there. Each effect is now either a live `dimension_shifts` entry or dropped, with one
 * carrier per effect, and nothing fails silently any more:
 * - the loader rejects the kind;
 * - applyEventEffects throws on an unknown kind;
 * - applyDimensionShift throws on an unknown dimension id;
 * - save migration v41 strips the kind from pending decisions.
 * The Srebrenica international-standing cost is charged once per path (card or patron event).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadEventDefinitions, loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { applyDefinitionDimensionShifts } from '../src/sim/events/evaluate_events.js';
import {
    DIMENSION_IDS,
    applyDimensionShift,
    initializeStrategicDimensions,
} from '../src/sim/events/strategic_dimensions.js';
import { KNOWN_EVENT_EFFECT_KIND_SET } from '../src/sim/events/event_vocabulary.js';
import { evaluatePatronEvents, SREBRENICA_AFTERMATH } from '../src/sim/negotiation/patron_events.js';
import { createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EventDefinition, EventEffect } from '../src/sim/events/event_types.js';
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
    const dir = mkdtempSync(join(tmpdir(), 'awwv-s6-e2-'));
    tempDirs.push(dir);
    mkdirSync(dir, { recursive: true });
    for (const file of EVENT_FILES) {
        writeFileSync(join(dir, file), JSON.stringify(file === 'war_1992.json' ? rows : [], null, 2), 'utf8');
    }
    return dir;
}

function row(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
        id: 'e2_probe',
        trigger: { turn_min: 0, phase: 'war' },
        effect: { kind: 'narrative', text: 'Probe.' },
        once: true,
        ...overrides,
    };
}

const RETIRED = { kind: 'negotiation_capital', faction: 'HRHB', dimension: 'international_credibility', delta: -25 };

function rawRows(): Array<{ file: string; row: any }> {
    const out: Array<{ file: string; row: any }> = [];
    for (const file of EVENT_FILES) {
        for (const r of JSON.parse(readFileSync(join(EVENTS_DIR, file), 'utf8')) as any[]) out.push({ file, row: r });
    }
    return out;
}

function catalogById(): Map<string, EventDefinition> {
    return new Map(loadEventDefinitions(0).map((def) => [def.id, def]));
}

function option(def: EventDefinition, id: string) {
    const found = def.response_options?.find((o) => o.id === id);
    if (!found) throw new Error(`${def.id} has no option ${id}`);
    return found;
}

describe('§6 E2: the loader rejects the retired kind and unknown dimensions', () => {
    it('1. throws on a row (event-level or option-level) carrying a negotiation_capital effect', () => {
        expect(KNOWN_EVENT_EFFECT_KIND_SET.has('negotiation_capital')).toBe(false);
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({ effects: [RETIRED] })])))
            .toThrow(/effects\[0\]\.kind must be a known event effect kind: negotiation_capital/);
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({ effect: RETIRED })])))
            .toThrow(/effect\.kind must be a known event effect kind: negotiation_capital/);
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({
            response_options: [{ id: 'accept', label: 'Accept', effects: [RETIRED] }],
        })]))).toThrow(/response_options\[0\]\.effects\[0\]\.kind must be a known event effect kind: negotiation_capital/);
    });

    it('2. throws on a dimension_shifts dimension `international_credibility` (the old name)', () => {
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({
            dimension_shifts: [{ faction: 'HRHB', dimension: 'international_credibility', delta: -25 }],
        })]))).toThrow(/Unknown DimensionId in dimension_shifts/);
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([row({
            response_options: [{
                id: 'accept', label: 'Accept', effects: [],
                dimension_shifts: [{ faction: 'RBiH', dimension: 'international_credibility', delta: 10 }],
            }],
        })]))).toThrow(/Unknown DimensionId in dimension_shifts/);
    });
});

describe('§6 E2: the engine fails loudly instead of skipping', () => {
    it('3. applyEventEffects throws on an unknown effect kind', () => {
        const state = { meta: { turn: 1 }, military: { formations: {} }, political: {} } as unknown as GameState;
        expect(() => applyEventEffects(state, [RETIRED as unknown as EventEffect]))
            .toThrow(/Unknown event effect kind: negotiation_capital/);
        expect(() => applyEventEffects(state, [{ kind: 'not_a_kind' } as unknown as EventEffect]))
            .toThrow(/Unknown event effect kind: not_a_kind/);
    });

    it('4. applyDimensionShift throws on an unknown dimension id; a missing faction entry stays a quiet no-op', () => {
        const store = initializeStrategicDimensions();
        expect(() => applyDimensionShift(store, 'HRHB', 'international_credibility', -25))
            .toThrow(/Unknown strategic dimension id in dimension shift: international_credibility/);
        expect(store.HRHB.international_standing.event_modifier).toBe(0);
        // Not yet initialised: quiet, unchanged.
        expect(() => applyDimensionShift({}, 'HRHB', 'international_standing', -25)).not.toThrow();
        // Known id applies.
        applyDimensionShift(store, 'HRHB', 'international_standing', -25);
        expect(store.HRHB.international_standing.event_modifier).toBe(-25);
        expect(store.HRHB.international_standing.effective_value).toBe(25);
    });
});

describe('§6 E2: save migration v41', () => {
    const STARTUP = readFileSync(resolve(__dirname, '..', 'data', 'derived', 'startup', 'apr_1992_initial_save.json'), 'utf8');

    function v39SaveWithPendingDecision(withRetiredEffect: boolean): string {
        const save = JSON.parse(STARTUP);
        save.schema_version = 39;
        const acceptEffects: unknown[] = [{ kind: 'patron_pressure', faction: 'RBiH', delta: -5 }];
        if (withRetiredEffect) {
            acceptEffects.unshift({ kind: 'negotiation_capital', faction: 'RBiH', dimension: 'international_credibility', delta: 10 });
        }
        const rejectOption: Record<string, unknown> = {
            id: 'reject', label: 'Reject',
            effects: [{ kind: 'morale_change', faction: 'RBiH', delta: 3 }],
        };
        if (withRetiredEffect) {
            rejectOption.effect = { kind: 'negotiation_capital', faction: 'RBiH', dimension: 'international_credibility', delta: -10 };
        }
        save.military.pending_event_decisions = [{
            event_id: 'vance_owen_plan_1993',
            event_title: 'Vance-Owen Plan',
            turn_fired: 40,
            faction: 'RBiH',
            requires_player_response: true,
            historical_default_response_id: 'accept',
            response_options: [
                { id: 'accept', label: 'Accept', effects: acceptEffects, sets_flags: { vance_owen_accepted: true } },
                rejectOption,
            ],
        }];
        return JSON.stringify(save);
    }

    it('5. a v39 save with a pending option holding the effect loads; the effect is gone; nothing else changes; idempotent', () => {
        const loaded = deserializeState(v39SaveWithPendingDecision(true));
        expect(loaded.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        const decision = loaded.military.pending_event_decisions![0];
        expect(decision.response_options[0].effects).toEqual([{ kind: 'patron_pressure', faction: 'RBiH', delta: -5 }]);
        expect('effect' in decision.response_options[1]).toBe(false);
        expect(decision.response_options[1].effects).toEqual([{ kind: 'morale_change', faction: 'RBiH', delta: 3 }]);
        expect(JSON.stringify(loaded)).not.toContain('negotiation_capital');

        // Everything else unchanged: identical to the same save authored without the effect.
        const control = deserializeState(v39SaveWithPendingDecision(false));
        expect(serializeState(loaded)).toBe(serializeState(control));

        // Running the migration chain again (serialize re-runs every migration from v0) is identical.
        const once = serializeState(loaded);
        expect(serializeState(deserializeState(once))).toBe(once);
    });

    it('5b. no change on a clean state (the startup snapshot)', () => {
        const clean = deserializeState(STARTUP);
        const migratedFrom39 = JSON.parse(STARTUP);
        migratedFrom39.schema_version = 39;
        expect(serializeState(deserializeState(JSON.stringify(migratedFrom39)))).toBe(serializeState(clean));
    });
});

describe('§6 E2: catalog sweep', () => {
    it('6. every dimension_shifts dimension is a DIMENSION_ID; no negotiation_capital remains anywhere in the catalog', () => {
        const known = new Set<string>(DIMENSION_IDS);
        for (const def of loadEventDefinitions(0)) {
            const shifts = [
                ...(def.dimension_shifts ?? []),
                ...(def.response_options ?? []).flatMap((o) => o.dimension_shifts ?? []),
            ];
            for (const shift of shifts) expect(known.has(shift.dimension), `${def.id}: ${shift.dimension}`).toBe(true);
        }
        const offenders: string[] = [];
        const visit = (value: unknown, path: string): void => {
            if (Array.isArray(value)) { value.forEach((v, i) => visit(v, `${path}[${i}]`)); return; }
            if (value && typeof value === 'object') {
                const obj = value as Record<string, unknown>;
                if (obj.kind === 'negotiation_capital') offenders.push(`${path}.kind`);
                for (const [k, v] of Object.entries(obj)) visit(v, `${path}.${k}`);
                return;
            }
            if (typeof value === 'string' && /^negotiation_capital\./.test(value)) offenders.push(`${path} = ${value}`);
            if (typeof value === 'string' && /^(international_credibility)$/.test(value)) offenders.push(`${path} = ${value}`);
        };
        for (const { file, row: r } of rawRows()) visit(r, `${file}:${r.id}`);
        expect(offenders).toEqual([]);
    });
});

describe('§6 E2: ruled rows (pins)', () => {
    const defs = catalogById();
    const shiftsOf = (id: string) => defs.get(id)!.dimension_shifts ?? [];

    it('7. atrocity cards carry their international_standing cost as a live shift', () => {
        expect(shiftsOf('ahmici_massacre_1993')).toContainEqual({ faction: 'HRHB', dimension: 'international_standing', delta: -25 });
        expect(shiftsOf('srebrenica_falls_1995')).toContainEqual({ faction: 'RS', dimension: 'international_standing', delta: -30 });
        expect(shiftsOf('zepa_falls_1995')).toContainEqual({ faction: 'RS', dimension: 'international_standing', delta: -10 });
        // Swapped on the historian's ruling: the 1995 shelling (UN attribution beyond reasonable
        // doubt; it triggered Deliberate Force) is not smaller than the 1994 one.
        expect(shiftsOf('markale_massacre_1994')).toContainEqual({ faction: 'RS', dimension: 'international_standing', delta: -15 });
        expect(shiftsOf('second_markale_massacre_1995')).toContainEqual({ faction: 'RS', dimension: 'international_standing', delta: -20 });
        expect(shiftsOf('mostar_bridge_destroyed_1993')).toContainEqual({ faction: 'HRHB', dimension: 'international_standing', delta: -10 });
    });

    it('7. hrhb_washington options credit HRHB, not RBiH', () => {
        const def = defs.get('hrhb_washington_agreement_1994')!;
        expect(option(def, 'accept').dimension_shifts).toEqual([{ faction: 'HRHB', dimension: 'international_standing', delta: 10 }]);
        expect(option(def, 'reluctant').dimension_shifts).toEqual([{ faction: 'HRHB', dimension: 'international_standing', delta: 3 }]);
        for (const o of def.response_options ?? []) {
            expect((o.dimension_shifts ?? []).some((s) => s.faction === 'RBiH'), o.id).toBe(false);
        }
    });

    it('7. no peace-plan option carries an international_standing shift (the base already counts plans)', () => {
        for (const id of ['vance_owen_plan_1993', 'owen_stoltenberg_plan_1993', 'contact_group_plan_1994']) {
            const def = defs.get(id)!;
            expect((def.dimension_shifts ?? []).some((s) => s.dimension === 'international_standing'), id).toBe(false);
            for (const o of def.response_options ?? []) {
                expect((o.dimension_shifts ?? []).some((s) => s.dimension === 'international_standing'), `${id}:${o.id}`).toBe(false);
            }
        }
    });

    it('political split and mediator rows carry live leverage shifts; the HRHB split keeps its own −3 only', () => {
        expect(shiftsOf('csq_political_split_temporary_RBiH')).toContainEqual({ faction: 'RBiH', dimension: 'negotiating_leverage', delta: -3 });
        expect(shiftsOf('csq_political_split_temporary_RS')).toContainEqual({ faction: 'RS', dimension: 'negotiating_leverage', delta: -3 });
        expect(shiftsOf('csq_political_split_temporary').filter((s) => s.dimension === 'negotiating_leverage'))
            .toEqual([{ faction: 'HRHB', dimension: 'negotiating_leverage', delta: -3 }]);
        for (const faction of ['RBiH', 'HRHB', 'RS'] as const) {
            const shifts = shiftsOf(`csq_mediator_engagement_streak_${faction}`);
            expect(shifts).toContainEqual({ faction, dimension: 'negotiating_leverage', delta: 4 });
            expect(shifts).toContainEqual({ faction, dimension: 'international_standing', delta: 2 });
        }
    });

    it('Stari Most copy: no UNESCO anachronism, cites the Prlić Appeal Judgement, never calls it a crime', () => {
        const def = defs.get('mostar_bridge_destroyed_1993')!;
        expect(def.narrative).not.toMatch(/UNESCO/);
        expect(def.narrative).toContain('The deliberate destruction of this monument becomes a global symbol of the war\'s cultural devastation.');
        expect(def.historical_source).toMatch(/IT-04-74-A/);
        expect(def.historical_source).toMatch(/29 November 2017/);
        expect(def.historical_source).toMatch(/Pocar dissenting/);
        const copy = [def.title ?? '', def.narrative ?? '', ...(def.effects ?? []).map((e) => (e.kind === 'narrative' ? e.text : ''))].join('\n');
        expect(copy).not.toMatch(/crime|criminal/i);
    });
});

describe('§6 E2: Srebrenica international standing, one carrier per path', () => {
    function patronState(opts: { cardFired: boolean; rsHoldsTown: boolean }): GameState {
        return {
            meta: { turn: 170, war_start_turn: 0 },
            military: {
                formations: {},
                event_last_fired_turn: opts.cardFired ? { srebrenica_falls_1995: 162 } : {},
                negotiation: {
                    capital: {},
                    patron_relationships: {
                        RBiH: createDefaultPatronRelationship('RBiH'),
                        RS: createDefaultPatronRelationship('RS'),
                        HRHB: createDefaultPatronRelationship('HRHB'),
                    },
                    peace_plan_history: [],
                    strategic_dimensions: initializeStrategicDimensions(),
                },
            },
            political: {
                political_controllers: { 'op:srebrenica:srebrenica_2': opts.rsHoldsTown ? 'RS' : 'RBiH' },
            },
        } as unknown as GameState;
    }
    const rsStanding = (state: GameState) => (state.military.negotiation as any).strategic_dimensions.RS.international_standing;
    const fired = (state: GameState) => (state.military.negotiation as any).patron_relationships.RS.relationship_events.includes('srebrenica_aftermath');

    it('the patron effect declares the card that carries the cost; override deltas unchanged', () => {
        const rs = SREBRENICA_AFTERMATH.effects.find((e) => e.faction === 'RS')!;
        expect(rs.humanitarian_delta).toBe(-30);
        expect(rs.humanitarian_delta_unless_event_fired).toBe('srebrenica_falls_1995');
        expect(SREBRENICA_AFTERMATH.effects.map((e) => [e.faction, e.override_delta])).toEqual([['RS', 20], ['RBiH', 20], ['HRHB', 20]]);
    });

    it('(1) card fired, then the patron event: RS standing is charged −30 once in total', () => {
        const state = patronState({ cardFired: true, rsHoldsTown: true });
        const card = catalogById().get('srebrenica_falls_1995')!;
        applyDefinitionDimensionShifts(state, card.dimension_shifts);
        expect(rsStanding(state).event_modifier).toBe(-30);
        evaluatePatronEvents(state);
        expect(fired(state)).toBe(true);
        expect(rsStanding(state).event_modifier).toBe(-30);
    });

    it('(2) RS holds the town and the card never fired: the patron event charges −30', () => {
        const state = patronState({ cardFired: false, rsHoldsTown: true });
        evaluatePatronEvents(state);
        expect(fired(state)).toBe(true);
        expect(rsStanding(state).event_modifier).toBe(-30);
    });

    it('(3) neither: no fire, no charge', () => {
        const state = patronState({ cardFired: false, rsHoldsTown: false });
        evaluatePatronEvents(state);
        expect(fired(state)).toBe(false);
        expect(rsStanding(state).event_modifier).toBe(0);
    });
});
