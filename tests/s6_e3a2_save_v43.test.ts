/**
 * §6 E3a2 ruling item 11: save migration v43 (static event#option lists, run after v42).
 *
 * - Pending decisions for routed cards: `plan_answer` is added, the card's own
 *   international_standing shift and the stripped patron effects go (the four E4 interim
 *   carriers that v42 SETs included), the moved contact-group +10 is added; idempotent.
 * - A v42 save past a plan week already holds a resolved row: a late card for that plan then
 *   writes nothing and costs nothing.
 * - A v42 pending_peace_plan is kept (the fallback pointer); the plan record is not rewritten.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { applyMigrations } from '../src/state/save_migration.js';
import {
    S6_E3A2_ADD_SUPPORT,
    S6_E3A2_PLAN_ANSWERS,
    S6_E3A2_STRIP_PATRON,
    S6_E3A2_STRIP_STANDING,
} from '../src/state/save_migration.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition, EventResponseOption } from '../src/sim/events/event_types.js';
import { collectRoutedPeacePlanCards } from '../src/sim/negotiation/plan_answer.js';
import { evaluatePeacePlans } from '../src/sim/negotiation/peace_plans.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import { computeDimensionBaseValues, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

const FIXTURE = resolve(__dirname, 'fixtures', 'save_migration', 'v42_plan_chain_pending.json');

let cached: EventDefinition[] | null = null;
function catalog(): EventDefinition[] {
    cached ??= loadEventDefinitions(0);
    return cached;
}
function catalogOption(key: string): EventResponseOption | undefined {
    const [eventId, optionId] = key.split('#') as [string, string];
    return catalog().find((row) => row.id === eventId)?.response_options?.find((option) => option.id === optionId);
}
function migrated(): GameState {
    return deserializeState(readFileSync(FIXTURE, 'utf8'));
}
function optionsOf(state: GameState, eventId: string): EventResponseOption[] {
    return state.military.pending_event_decisions!.find((decision) => decision.event_id === eventId)!.response_options;
}
const standing = (option: EventResponseOption) => (option.dimension_shifts ?? []).filter((s) => s.dimension === 'international_standing');
const confidence = (option: EventResponseOption) => (option.dimension_shifts ?? []).filter((s) => s.dimension === 'patron_confidence').map((s) => s.delta);
const support = (option: EventResponseOption) => option.effects.filter((e) => e.kind === 'patron_support').map((e) => (e as { delta: number }).delta);

describe('§6 E3a2 v43: the static lists equal the catalog', () => {
    it('every routed catalog option is listed with its plan_answer; the presentation card\'s former options write nothing', () => {
        const routed = collectRoutedPeacePlanCards(catalog());
        const fromCatalog: Record<string, unknown> = {};
        for (const def of routed.values()) {
            for (const option of def.response_options ?? []) fromCatalog[`${def.id}#${option.id}`] = option.plan_answer;
        }
        const listed = Object.fromEntries(Object.entries(S6_E3A2_PLAN_ANSWERS).filter(([key]) => !key.startsWith('contact_group_plan_1994#')));
        expect(listed).toEqual(fromCatalog);
        expect(S6_E3A2_PLAN_ANSWERS['contact_group_plan_1994#accept']).toBeNull();
        expect(S6_E3A2_PLAN_ANSWERS['contact_group_plan_1994#reject']).toBeNull();
        expect(catalog().find((row) => row.id === 'contact_group_plan_1994')!.response_options ?? []).toEqual([]);
    });

    it('the strip lists match the catalog: no standing shift, no patron effect left; the moved +10 is there', () => {
        for (const key of S6_E3A2_STRIP_STANDING) {
            expect(Object.prototype.hasOwnProperty.call(S6_E3A2_PLAN_ANSWERS, key), key).toBe(true);
            expect(standing(catalogOption(key)!), key).toEqual([]);
        }
        for (const key of S6_E3A2_STRIP_PATRON) {
            expect(Object.prototype.hasOwnProperty.call(S6_E3A2_PLAN_ANSWERS, key), key).toBe(true);
            const option = catalogOption(key);
            if (!option) {
                expect(key.startsWith('contact_group_plan_1994#'), key).toBe(true);
                continue;
            }
            expect(support(option), key).toEqual([]);
            expect(confidence(option), key).toEqual([]);
        }
        for (const [key, add] of Object.entries(S6_E3A2_ADD_SUPPORT)) {
            expect(catalogOption(key)!.effects).toContainEqual({ kind: 'patron_support', faction: add.faction, delta: add.delta });
        }
        // The four E4 interim carriers (v42 SET) are all stripped by v43.
        for (const key of [
            'contact_group_plan_1994#reject',
            'rs_assembly_rejects_voplan_1993#accept_rejection',
            'rs_contact_group_response_1994#negotiate_amendments',
            'rs_owen_stoltenberg_response_1993#reject_plan',
        ]) expect(S6_E3A2_STRIP_PATRON.has(key), key).toBe(true);
    });
});

describe('§6 E3a2 v43: migrating the v42 fixture', () => {
    it('reaches the current schema', () => {
        expect(CURRENT_SCHEMA_VERSION).toBe(43);
        expect(migrated().schema_version).toBe(43);
    });

    it('rs_assembly: the IS shift and the interim −10 go, plan_answer is added, refs follow; the A row keeps its +5', () => {
        const [rejection, override] = optionsOf(migrated(), 'rs_assembly_rejects_voplan_1993');
        expect(rejection!.plan_answer).toEqual({ plan_id: 'vance_owen', response: 'rejected' });
        expect(rejection!.effects).toEqual([{ kind: 'morale_change', faction: 'RS', delta: 5 }]);
        expect(rejection!.dimension_shifts).toEqual([{ faction: 'RS', dimension: 'internal_cohesion', delta: 10 }]);
        expect(rejection!.future_consequences![0]!.material_effect_refs).toEqual(['morale_change.RS']);
        expect(override!.plan_answer).toEqual({ plan_id: 'vance_owen', response: 'accepted' });
        expect(support(override!)).toEqual([5]);
        expect(standing(override!)).toEqual([]);
    });

    it('HRHB Vance-Owen: refusal rows lose their patron_confidence; the accept keeps +10; the reciprocity row is conditional', () => {
        const options = optionsOf(migrated(), 'hrhb_vance_owen_acceptance_1993');
        const byId = new Map(options.map((option) => [option.id, option]));
        expect(confidence(byId.get('accept_vance_owen_plan')!)).toEqual([10]);
        expect(standing(byId.get('accept_vance_owen_plan')!)).toEqual([]);
        expect(confidence(byId.get('accept_with_modifications')!)).toEqual([]);
        expect(confidence(byId.get('condition_on_arbih_reciprocity')!)).toEqual([]);
        expect(byId.get('condition_on_arbih_reciprocity')!.plan_answer?.accepted_if).toEqual({
            type: 'peace_plan_response', plan_id: 'vance_owen', faction: 'RBiH', response: 'accepted',
        });
        expect(confidence(byId.get('reject_plan')!)).toEqual([]);
        expect(standing(byId.get('reject_plan')!)).toEqual([]);
    });

    it('Contact Group: the presentation card\'s pending options write nothing and cost nothing; the +10 rides on Sarajevo\'s accept', () => {
        const state = migrated();
        for (const option of optionsOf(state, 'contact_group_plan_1994')) {
            expect(option.plan_answer, option.id).toBeNull();
            expect(support(option), option.id).toEqual([]);
        }
        const [accept, reject, reservations] = optionsOf(state, 'rbih_contact_group_response_1994');
        expect(support(accept!)).toEqual([10]);
        for (const option of [accept!, reject!, reservations!]) expect(standing(option), option.id).toEqual([]);
        expect(reservations!.plan_answer).toEqual({ plan_id: 'contact_group', response: 'rejected' });
    });

    it('RS Owen-Stoltenberg: the amendments +5 and the interim −20 go', () => {
        const [accept, amend, reject] = optionsOf(migrated(), 'rs_owen_stoltenberg_response_1993');
        expect(confidence(accept!)).toEqual([10]);
        expect(standing(accept!)).toEqual([]);
        expect(support(amend!)).toEqual([]);
        expect(support(reject!)).toEqual([]);
        expect(standing(reject!)).toEqual([]);
    });

    it('keeps the plan record and the pending pointer as they were', () => {
        const raw = JSON.parse(readFileSync(FIXTURE, 'utf8'));
        const state = migrated();
        expect(state.military.negotiation!.peace_plan_history).toEqual(raw.military.negotiation.peace_plan_history);
        expect(state.military.negotiation!.pending_peace_plan).toBeUndefined();
        const withPointer = structuredClone(raw);
        withPointer.military.negotiation.peace_plan_history = [];
        withPointer.military.negotiation.pending_peace_plan = { plan_id: 'vance_owen', turn_offered: 40, bot_responses: { RBiH: 'accepted', HRHB: 'accepted' } };
        expect(deserializeState(JSON.stringify(withPointer)).military.negotiation!.pending_peace_plan).toEqual(withPointer.military.negotiation.pending_peace_plan);
    });

    it('is idempotent: running v43 again on a migrated state changes nothing', () => {
        const once = serializeState(migrated());
        const again = JSON.parse(once) as GameState;
        again.schema_version = 42;
        expect(applyMigrations(again)).toBe(1);
        expect(serializeState(again)).toBe(once);
    });

    it('no change on a clean state (the startup snapshot)', () => {
        const startup = readFileSync(resolve(__dirname, '..', 'data', 'derived', 'startup', 'apr_1992_initial_save.json'), 'utf8');
        const clean = deserializeState(startup);
        const asV42 = JSON.parse(startup);
        asV42.schema_version = 42;
        expect(serializeState(deserializeState(JSON.stringify(asV42)))).toBe(serializeState(clean));
    });
});

describe('§6 E3a2 v43: a late card for a plan the v42 save already resolved', () => {
    it('writes nothing and costs nothing (the answer is ignored)', () => {
        const state = migrated();
        state.meta.phase = 'war';
        const neg = state.military.negotiation!;
        neg.strategic_dimensions = initializeStrategicDimensions();
        // The late RS card is answered against the resolved row (player path, then the resolver).
        evaluatePeacePlans(state, catalog()); // initialises the negotiation containers
        const before = structuredClone(neg);
        resolveEventDecision(state, 'rs_assembly_rejects_voplan_1993', 'override_assembly');
        evaluatePeacePlans(state, catalog());
        expect(neg.peace_plan_history).toEqual(before.peace_plan_history);
        // No plan cost: support only moved by the A row's own +5, no −5, no relationship event.
        expect(neg.patron_relationships.RS!.relationship_events).toEqual(before.patron_relationships.RS!.relationship_events);
        expect(neg.patron_relationships.RS!.support_level).toBe(before.patron_relationships.RS!.support_level + 5);
        // No standing write from the card (its IS shift was stripped) and none from the plan.
        expect(neg.strategic_dimensions!.RS!.international_standing!.event_modifier).toBe(0);
        computeDimensionBaseValues(neg.strategic_dimensions!, state, 'RS');
        // The base counts the resolved v42 row once: RS rejected Vance-Owen (graded −20).
        expect(neg.strategic_dimensions!.RS!.international_standing!.base_value).toBe(30);
    });
});
