/**
 * §6 E4 rounds 3-4 (ruled unanimously 2026-11-17): one carrier per patron change.
 *
 * - Q1: a scope (card, or option) with patron_support for X carries no patron_confidence
 *   shift for X (loader rule); the bot scorers count the support delta as the shift it replaces.
 * - Spill (costs only): every support_level writer goes through one helper; the part of a cost
 *   that the floor removes lands on patron_confidence's event_modifier; a gain at 100 is not banked.
 * - Q2: the rows authored in the pressure convention, decided row by row.
 * - Q3: Belgrade's break has one carrier (CONTACT_GROUP_REJECTION), which, like
 *   belgrade_embargo_rs_1994, needs the RS rejection on the plan record; the sanctions decay
 *   is retired; the contact-group reject cards carry nothing.
 * - Save migration v42 extended (disjoint DROP/SET, faction-keyed shift-drop list, refs).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
    loadEventDefinitions,
    loadEventDefinitionsFromDir,
    validateOnePatronCarrier,
} from '../src/sim/events/event_loader.js';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { evaluateCondition } from '../src/sim/events/event_types.js';
import type { EventCondition, EventDefinition, EventEffect, EventResponseOption } from '../src/sim/events/event_types.js';
import { pickBotResponseV1 } from '../src/sim/events/bot_response.js';
import { scorePoliticalOption } from '../src/sim/political/political_event_decision.js';
import { getPoliticalPersonality, type PoliticalAssessment } from '../src/sim/political/political_personality.js';
import { computeDimensionBaseValues, initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { applyPatronSupportDelta, updatePatronPressure } from '../src/sim/negotiation/patron_pressure.js';
import { CONTACT_GROUP_REJECTION, NATO_BOMBING, applyPatronEvent, evaluatePatronEvents } from '../src/sim/negotiation/patron_events.js';
import { evaluatePeacePlans, resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { createDefaultPatronRelationship, createEmptyCapital } from '../src/state/negotiation_types.js';
import type { NegotiationState, PeacePlanResponse } from '../src/state/negotiation_types.js';
import { listBlockingPlayerDecisions } from '../src/state/player_decision_manifest.js';
import {
    S6_E4_PATRON_CONFIDENCE_SHIFT_DROP,
    S6_E4_PATRON_SUPPORT_DROP,
    S6_E4_PATRON_SUPPORT_SET,
} from '../src/state/save_migration.js';
import { deserializeState } from '../src/state/serialize.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

const EVENT_FILES = [
    'war_1992.json',
    'war_1992_hrhb_summer.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
    'consequences.json',
] as const;
const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

const tempDirs: string[] = [];
afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function writeCatalog(rows: unknown[]): string {
    const dir = mkdtempSync(join(tmpdir(), 'awwv-s6-e4-r3-'));
    tempDirs.push(dir);
    mkdirSync(dir, { recursive: true });
    for (const file of EVENT_FILES) {
        writeFileSync(join(dir, file), JSON.stringify(file === 'war_1992.json' ? rows : [], null, 2), 'utf8');
    }
    return dir;
}

function row(overrides: Record<string, unknown>): EventDefinition {
    return {
        id: 'e4_r3_probe',
        trigger: { turn_min: 0, phase: 'war' },
        effect: { kind: 'narrative', text: 'Probe.' },
        once: true,
        ...overrides,
    } as unknown as EventDefinition;
}

const support = (faction: string, delta: number) => ({ kind: 'patron_support', faction, delta });
const confidence = (faction: string, delta: number) => ({ faction, dimension: 'patron_confidence', delta });

let cachedCatalog: Map<string, EventDefinition> | null = null;
function byId(): Map<string, EventDefinition> {
    cachedCatalog ??= new Map(loadEventDefinitions(0).map((def) => [def.id, def]));
    return cachedCatalog;
}

function optionOf(eventId: string, optionId: string): EventResponseOption {
    const def = byId().get(eventId);
    if (!def) throw new Error(`no event ${eventId}`);
    const found = def.response_options?.find((o) => o.id === optionId);
    if (!found) throw new Error(`${eventId} has no option ${optionId}`);
    return found;
}

function supportSum(effects: readonly EventEffect[] | undefined, faction: string): number {
    let sum = 0;
    for (const e of effects ?? []) if (e.kind === 'patron_support' && e.faction === faction) sum += e.delta;
    return sum;
}

function confidenceShifts(option: { dimension_shifts?: Array<{ faction: string; dimension: string; delta: number }> }, faction: string): number[] {
    return (option.dimension_shifts ?? []).filter((s) => s.dimension === 'patron_confidence' && s.faction === faction).map((s) => s.delta);
}

function makeNegotiation(): NegotiationState {
    const capital: NegotiationState['capital'] = {};
    const patron_relationships: NegotiationState['patron_relationships'] = {};
    for (const faction of FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }
    return { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() };
}

function makeState(opts: { turn?: number; player_faction?: FactionId; flags?: Record<string, unknown> } = {}): GameState {
    return {
        meta: {
            turn: opts.turn ?? 0,
            phase: 'war',
            seed: 1,
            date: '1994-07-18',
            war_start_turn: 0,
            ...(opts.player_faction ? { player_faction: opts.player_faction } : {}),
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: {}, negotiation: makeNegotiation(), event_flags: { ...(opts.flags ?? {}) } },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

/** §6 E3a2: the three contact-group response cards as routed rows (historical default first). */
function CG_RESPONSE_CARDS(): EventDefinition[] {
    const card = (id: string, faction: FactionId, defaultId: string, defaultAnswer: 'accepted' | 'rejected'): EventDefinition => ({
        id,
        trigger: { turn_min: 118, turn_max: 120, phase: 'war' },
        effect: { kind: 'narrative', text: id },
        once: true,
        responding_faction: faction,
        historical_default_response_id: defaultId,
        response_options: [
            { id: defaultId, label: defaultId, effects: [], plan_answer: { plan_id: 'contact_group', response: defaultAnswer } },
        ],
    } as EventDefinition);
    return [
        card('rbih_contact_group_response_1994', 'RBiH', 'accept_51_49_plan', 'accepted'),
        card('rs_contact_group_response_1994', 'RS', 'reject_51_49_plan', 'rejected'),
        card('hrhb_contact_group_response_1994', 'HRHB', 'accept_51_49_plan', 'accepted'),
    ];
}

function cgRecord(rs: 'accepted' | 'rejected', resolved = true): PeacePlanResponse {
    return {
        plan_id: 'contact_group',
        turn_offered: 118,
        responses: { RBiH: 'accepted', RS: rs, HRHB: 'accepted' },
        resolved,
    };
}

describe('§6 E4 round 3, Q1: one carrier per patron change (loader rule)', () => {
    it('a scope with patron_support for X and a patron_confidence shift for X fails, card or option', () => {
        const card = row({ effects: [support('RS', -10)], dimension_shifts: [confidence('RS', -10)] });
        expect(() => validateOnePatronCarrier([card])).toThrow(/One carrier per patron change.*e4_r3_probe#card:RS/);
        const option = row({ response_options: [{ id: 'go', label: 'Go', effects: [support('HRHB', -6)], dimension_shifts: [confidence('HRHB', 5)] }] });
        expect(() => validateOnePatronCarrier([option])).toThrow(/e4_r3_probe#go:HRHB/);
        // Through the real loader: a double carrier fails catalog load.
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([card]))).toThrow(/One carrier per patron change/);
    });

    it('another faction\'s shift, a shift without support, or support in another scope is not a double carrier', () => {
        expect(() => validateOnePatronCarrier([row({ effects: [support('RS', -10)], dimension_shifts: [confidence('HRHB', -10)] })])).not.toThrow();
        expect(() => validateOnePatronCarrier([row({ dimension_shifts: [confidence('RS', -10)] })])).not.toThrow();
        expect(() => validateOnePatronCarrier([row({
            effects: [support('RS', -10)],
            response_options: [{ id: 'go', label: 'Go', effects: [], dimension_shifts: [confidence('RS', 5)] }],
        })])).not.toThrow();
    });

    it('the shipped catalog has no double carrier (all 30 ruled scopes cleared)', () => {
        const defs = [...byId().values()];
        expect(() => validateOnePatronCarrier(defs)).not.toThrow();
        // The Q1 rows keep their support and lose only the twin.
        for (const [eventId, optionId, faction, value] of [
            ['concentration_camps_revealed_1992', 'deny', 'RS', -10],
            ['concentration_camps_revealed_1992', 'obstruct', 'RS', -5],
            // §6 E3a2 stripped the interim −10 (a refusal's patron cost is the plan's −5).
            ['rs_assembly_rejects_voplan_1993', 'accept_rejection', 'RS', 0],
            ['rs_contact_group_response_1994', 'accept_51_49_plan', 'RS', 20],
            ['belgrade_embargo_rs_1994', 'defiant', 'RS', -10],
            ['un_hostage_crisis_1995', 'maintain_hostages', 'RS', -10],
            ['hrhb_zagreb_supply_channel_1992', 'assert_autonomy', 'HRHB', -18],
        ] as const) {
            const option = optionOf(eventId, optionId);
            expect(supportSum(option.effects, faction), `${eventId}#${optionId}`).toBe(value);
            expect(confidenceShifts(option, faction), `${eventId}#${optionId}`).toEqual([]);
        }
        const disavowal = byId().get('csq_patron_disavowal_partial')!;
        expect(supportSum([disavowal.effect, ...(disavowal.effects ?? [])].filter(Boolean), 'RS')).toBe(-20);
        expect(confidenceShifts(disavowal as unknown as { dimension_shifts?: Array<{ faction: string; dimension: string; delta: number }> }, 'RS')).toEqual([]);
    });
});

describe('§6 E4 round 3, Q2: rows authored in the pressure convention', () => {
    it('applies the ruling row by row', () => {
        const expected: Array<[string, string, FactionId, number, number[]]> = [
            // [event, option, faction, support, patron_confidence shifts]
            ['strategic_posture_review_rs', 'negotiate_strength', 'RS', 0, [8]],
            ['strategic_posture_review_rs', 'accept_partition_framework', 'RS', 0, [15]],
            ['strategic_posture_review_rbih', 'seek_negotiation', 'RBiH', 0, []],
            ['strategic_posture_review_hrhb', 'sue_for_peace_hrhb', 'HRHB', -10, []],
            ['rs_assembly_rejects_voplan_1993', 'override_assembly', 'RS', 5, []],
            ['abdic_apwb_declared_1993', 'federation_offer', 'RBiH', 0, [-3]],
            ['hv_hvo_cooperation_1995', 'arbih_coordination', 'HRHB', 0, [-10]],
            ['address_to_nation_rs', 'address_reassure_patron_rs', 'RS', 0, []],
            ['address_to_nation_rs', 'address_defiance_rs', 'RS', 0, []],
            ['address_to_nation_hrhb', 'address_conciliation_hrhb', 'HRHB', 0, []],
        ];
        for (const [eventId, optionId, faction, value, shifts] of expected) {
            const option = optionOf(eventId, optionId);
            expect(supportSum(option.effects, faction), `${eventId}#${optionId} support`).toBe(value);
            expect(confidenceShifts(option, faction), `${eventId}#${optionId} confidence`).toEqual(shifts);
        }
    });

    it('the override_assembly explanation no longer cites a patron_confidence floor; the +5 ref stays', () => {
        const consequence = optionOf('rs_assembly_rejects_voplan_1993', 'override_assembly').future_consequences![0]!;
        expect(consequence.explanation).not.toMatch(/patron_confidence/);
        expect(consequence.explanation).toContain("a small rise in Belgrade's backing");
        expect(consequence.material_effect_refs).toContain('patron_support.RS');
    });
});

describe('§6 E4 round 3: bot scorers count patron_support as the shift it replaces', () => {
    const assessment = {
        situation_score: 50,
        dimension_score: 50,
        blended_score: 50,
        territory_trend: 'stable',
        military_strength: 0.5,
        patron_pressure: 0,
    } as unknown as PoliticalAssessment;
    const base = { aggression_affinity: 0, risk_level: 0.5 };

    it('political scorer: the responding faction\'s support delta scores at its patron_confidence weight', () => {
        for (const faction of FACTIONS) {
            const personality = getPoliticalPersonality(faction);
            const asSupport: EventResponseOption = { id: 'a', label: 'A', ...base, effects: [support(faction, -10) as EventEffect] };
            const asShift: EventResponseOption = { id: 'b', label: 'B', ...base, effects: [], dimension_shifts: [{ faction, dimension: 'patron_confidence', delta: -10 }] };
            const neither: EventResponseOption = { id: 'c', label: 'C', ...base, effects: [] };
            const weight = personality.dimension_weights['patron_confidence'] ?? 0;
            expect(weight, faction).toBeGreaterThan(0);
            expect(scorePoliticalOption(asSupport, faction, assessment, personality))
                .toBeCloseTo(scorePoliticalOption(asShift, faction, assessment, personality), 12);
            expect(scorePoliticalOption(asSupport, faction, assessment, personality)
                - scorePoliticalOption(neither, faction, assessment, personality)).toBeCloseTo(-10 * weight, 12);
        }
        // Another faction's support is not the responding faction's dimension.
        const rs = getPoliticalPersonality('RS');
        const other: EventResponseOption = { id: 'a', label: 'A', ...base, effects: [support('HRHB', -10) as EventEffect] };
        const neither: EventResponseOption = { id: 'c', label: 'C', ...base, effects: [] };
        expect(scorePoliticalOption(other, 'RS', assessment, rs)).toBe(scorePoliticalOption(neither, 'RS', assessment, rs));
    });

    it('capital-based scorer: a support delta weighs as that faction\'s patron_confidence shift (not a 0.05 tiebreaker)', () => {
        // RS: patron_confidence 0.15, international_standing 0.10.
        // support +10 → 10 × 0.15 (dimension) + 10 × 0.05 (tiebreaker) = 2.0 > standing +15 → 1.5.
        // Before round 3 the support counted only as a tiebreaker (0.5) and lost.
        const standing: EventResponseOption = { id: 'standing', label: 'S', effects: [], dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: 15 }] };
        const backing: EventResponseOption = { id: 'backing', label: 'B', effects: [support('RS', 10) as EventEffect] };
        expect(pickBotResponseV1([standing, backing], 'capital_based', { aggressiveness: 3, competence: 3 }).id).toBe('backing');
        // A support cost weighs like the confidence shift it replaced.
        const cost: EventResponseOption = { id: 'cost', label: 'C', effects: [support('RS', -10) as EventEffect], dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: 15 }] };
        const plain: EventResponseOption = { id: 'plain', label: 'P', effects: [], dimension_shifts: [{ faction: 'RS', dimension: 'international_standing', delta: 2 }] };
        // cost: 15 × 0.10 − 10 × 0.15 − 10 × 0.05 = −0.5 < plain: 0.2
        expect(pickBotResponseV1([cost, plain], 'capital_based', { aggressiveness: 3, competence: 3 }).id).toBe('plain');
    });
});

describe('§6 E4 round 3: the spill (costs only) through the one support writer', () => {
    function supportPlusModifier(state: GameState, faction: FactionId): number {
        const neg = state.military.negotiation!;
        return neg.patron_relationships[faction]!.support_level + neg.strategic_dimensions![faction]!.patron_confidence!.event_modifier;
    }

    it('RS support 3 plus a −10 cost: support 0, and support + modifier falls by the full 10', () => {
        const state = makeState({ turn: 60 });
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.support_level = 3;
        const before = supportPlusModifier(state, 'RS');
        computeDimensionBaseValues(neg.strategic_dimensions!, state, 'RS');
        const pcBefore = neg.strategic_dimensions!.RS!.patron_confidence!;
        const effectiveInputBefore = pcBefore.base_value + pcBefore.event_modifier;

        applyEventEffects(state, [support('RS', -10) as EventEffect]);

        expect(neg.patron_relationships.RS!.support_level).toBe(0);
        expect(neg.strategic_dimensions!.RS!.patron_confidence!.event_modifier).toBe(-7);
        expect(supportPlusModifier(state, 'RS')).toBe(before - 10);
        // After the next base recompute (base = support_level), base + modifier is down the full 10.
        computeDimensionBaseValues(neg.strategic_dimensions!, state, 'RS');
        const pcAfter = neg.strategic_dimensions!.RS!.patron_confidence!;
        expect(pcAfter.base_value + pcAfter.event_modifier).toBe(effectiveInputBefore - 10);
    });

    it('a gain landing at 100 clamps, is not banked, and leaves the modifier unchanged', () => {
        const state = makeState({ turn: 60 });
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.support_level = 95;
        applyEventEffects(state, [support('RS', 10) as EventEffect]);
        expect(neg.patron_relationships.RS!.support_level).toBe(100);
        expect(neg.strategic_dimensions!.RS!.patron_confidence!.event_modifier).toBe(0);
        // A cost that stays above the floor spills nothing either.
        applyEventEffects(state, [support('RS', -30) as EventEffect]);
        expect(neg.patron_relationships.RS!.support_level).toBe(70);
        expect(neg.strategic_dimensions!.RS!.patron_confidence!.event_modifier).toBe(0);
    });

    it('the helper returns the spilled amount and is a no-op without a relationship', () => {
        const neg = makeNegotiation();
        neg.patron_relationships.HRHB!.support_level = 4;
        expect(applyPatronSupportDelta(neg, 'HRHB', -10)).toBe(-6);
        expect(neg.strategic_dimensions!.HRHB!.patron_confidence!.event_modifier).toBe(-6);
        expect(applyPatronSupportDelta(neg, 'HRHB', 5)).toBe(0);
        expect(applyPatronSupportDelta(undefined, 'RS', -10)).toBe(0);
    });

    it('the patron events spill through the same writer (the Contact Group break −15 at support 5)', () => {
        const state = makeState({ turn: CONTACT_GROUP_REJECTION.trigger_week });
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.support_level = 5;
        applyPatronEvent(state, CONTACT_GROUP_REJECTION);
        expect(neg.patron_relationships.RS!.relationship_events).toContain('contact_group_rejection');
        expect(neg.patron_relationships.RS!.support_level).toBe(0);
        expect(neg.strategic_dimensions!.RS!.patron_confidence!.event_modifier).toBe(-10);
    });

    it('§6 E4 round 5: NATO bombing carries no support change (one carrier for Deliberate Force)', () => {
        expect(NATO_BOMBING.effects.some((effect) => effect.support_delta !== undefined)).toBe(false);
        const state = makeState({ turn: NATO_BOMBING.trigger_week });
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.support_level = 5;
        evaluatePatronEvents(state);
        expect(neg.patron_relationships.RS!.relationship_events).toContain('nato_bombing');
        expect(neg.patron_relationships.RS!.support_level).toBe(5);
        expect(neg.strategic_dimensions!.RS!.patron_confidence!.event_modifier).toBe(0);
    });

    it('the peace-plan rejection cost spills through the same writer (−5 at support 2)', () => {
        const state = makeState({ turn: 120 });
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.support_level = 2;
        evaluatePeacePlans(state); // headless, no answering card: the close-week fallback resolves (RS historically rejects)
        expect(neg.peace_plan_history.find((h) => h.plan_id === 'contact_group')?.responses.RS).toBe('rejected');
        expect(neg.patron_relationships.RS!.support_level).toBe(0);
        expect(neg.strategic_dimensions!.RS!.patron_confidence!.event_modifier).toBe(-3);
    });
});

describe('§6 E4 round 3, Q3: Belgrade\'s break has one carrier', () => {
    it('the sanctions decay is retired: sanctions never move support_level', () => {
        const state = makeState({ turn: 130 });
        const neg = state.military.negotiation!;
        neg.patron_relationships.RS!.sanctions_active = true;
        neg.patron_relationships.RS!.support_level = 35;
        for (let turn = 130; turn < 188; turn++) {
            state.meta.turn = turn;
            updatePatronPressure(state);
        }
        expect(neg.patron_relationships.RS!.support_level).toBe(35);
        expect(neg.patron_relationships.RS!.sanctions_active).toBe(true);
    });

    it('hands-off: the plan resolves at week 118 before the patron step, so the break fires at 118', () => {
        const state = makeState({ turn: 118 });
        const neg = state.military.negotiation!;
        const supportBefore = neg.patron_relationships.RS!.support_level;
        // §6 E3a2: the three response cards answer at 118 (bot path) and the resolver reads the log.
        const cards = CG_RESPONSE_CARDS();
        for (const card of cards) {
            (state.military.event_decision_log ??= []).push({
                event_id: card.id,
                response_id: card.historical_default_response_id!,
                decision_source: 'bot_ai_default',
                faction: card.responding_faction!,
                turn: 118,
            });
        }
        evaluatePeacePlans(state, cards);
        expect(neg.peace_plan_history.map((row) => [row.plan_id, row.resolved_turn])).toEqual([['contact_group', 118]]);
        updatePatronPressure(state);
        evaluatePatronEvents(state);
        expect(neg.patron_relationships.RS!.relationship_events).toEqual(['rejected_contact_group', 'contact_group_rejection']);
        expect(neg.patron_relationships.RS!.sanctions_active).toBe(true);
        // −5 (plan rejection, the general rule) and −15 (Belgrade's break), once each.
        expect(neg.patron_relationships.RS!.support_level).toBe(supportBefore - 20);
    });

    it('an accept fixture never fires CONTACT_GROUP_REJECTION nor belgrade_embargo_rs_1994; a reject fixture fires both', () => {
        const embargo = byId().get('belgrade_embargo_rs_1994')!;
        const condition = embargo.trigger.condition as EventCondition;
        expect(JSON.stringify(condition)).toContain('"type":"peace_plan_response"');

        const accepted = makeState({ turn: CONTACT_GROUP_REJECTION.trigger_week, flags: { rs_strategic_goals: 'all_six' } });
        accepted.military.negotiation!.peace_plan_history.push(cgRecord('accepted'));
        for (let week = 118; week <= 140; week++) {
            accepted.meta.turn = week;
            evaluatePatronEvents(accepted);
            expect(evaluateCondition(condition, accepted), `embargo condition at ${week}`).toBe(false);
        }
        expect(accepted.military.negotiation!.patron_relationships.RS!.relationship_events).not.toContain('contact_group_rejection');
        expect(accepted.military.negotiation!.patron_relationships.RS!.sanctions_active).toBe(false);

        const rejected = makeState({ turn: CONTACT_GROUP_REJECTION.trigger_week, flags: { rs_strategic_goals: 'all_six' } });
        rejected.military.negotiation!.peace_plan_history.push(cgRecord('rejected'));
        evaluatePatronEvents(rejected);
        expect(rejected.military.negotiation!.patron_relationships.RS!.relationship_events).toContain('contact_group_rejection');
        expect(evaluateCondition(condition, rejected)).toBe(true);
        // The platform condition still applies: no Six Goals flag, no embargo card.
        const noPlatform = makeState({ turn: 121 });
        noPlatform.military.negotiation!.peace_plan_history.push(cgRecord('rejected'));
        expect(evaluateCondition(condition, noPlatform)).toBe(false);
    });

    it('a pending CG fallback cannot persist past its turn: it blocks the advance (modal gate); the break waits for the answer', () => {
        // §6 E3a2: the pointer exists only as the close-week fallback (RS's card never answered).
        // Player-override model (§14.10a, 2026-11-25): a live silent seat is now answered at the
        // close week, so the pointer is built here as an older save carries it (the authored-player
        // headless lens still opens it), then the campaign is live again for the gate and break.
        const state = makeState({ turn: 120, player_faction: 'RS' });
        const neg = state.military.negotiation!;
        state.meta.headless_scenario_auto_control = true;
        evaluatePeacePlans(state);
        delete state.meta.headless_scenario_auto_control;
        expect(neg.pending_peace_plan?.plan_id).toBe('contact_group');
        const blocking = listBlockingPlayerDecisions(state as never, 'RS');
        expect(blocking.map((item) => [item.familyId, item.id, item.gatePolicy])).toContainEqual(['peace_plan', 'contact_group', 'modal_required']);
        // Same turn: the plan is unanswered, so the break does not fire on the card or the pending plan.
        evaluatePatronEvents(state);
        expect(neg.patron_relationships.RS!.relationship_events).not.toContain('contact_group_rejection');

        // The player accepts: the gate clears and the break never fires. (HRHB's answer is set to
        // a rejection so the probe does not end the war on an all-accept.)
        const accept = structuredClone(state);
        accept.military.negotiation!.pending_peace_plan!.bot_responses.HRHB = 'rejected';
        resolvePeacePlan(accept, 'contact_group', 'accepted');
        expect(accept.military.negotiation!.peace_plan_history.at(-1)?.responses.RS).toBe('accepted');
        expect(listBlockingPlayerDecisions(accept as never, 'RS').some((item) => item.familyId === 'peace_plan')).toBe(false);
        for (let week = 121; week <= 140; week++) {
            accept.meta.turn = week;
            evaluatePatronEvents(accept);
        }
        expect(accept.military.negotiation!.patron_relationships.RS!.relationship_events).not.toContain('contact_group_rejection');

        // The player rejects: the break fires at the next week.
        const reject = structuredClone(state);
        resolvePeacePlan(reject, 'contact_group', 'rejected');
        reject.meta.turn = 121;
        evaluatePatronEvents(reject);
        expect(reject.military.negotiation!.patron_relationships.RS!.relationship_events).toContain('contact_group_rejection');
    });

    it('the reject cards carry neither support nor confidence; the RBiH accept carries the +10 (§6 E3a2: the −10 interim went)', () => {
        const rs = optionOf('rs_contact_group_response_1994', 'reject_51_49_plan');
        expect(supportSum(rs.effects, 'RS')).toBe(0);
        expect(confidenceShifts(rs, 'RS')).toEqual([]);
        const rbih = optionOf('rbih_contact_group_response_1994', 'reject_51_49_plan');
        expect(supportSum(rbih.effects, 'RBiH')).toBe(0);
        expect(confidenceShifts(rbih, 'RBiH')).toEqual([]);
        // contact_group_plan_1994 is a no-choice presentation card; its +10 moved, same size.
        expect(byId().get('contact_group_plan_1994')!.response_options ?? []).toEqual([]);
        expect(supportSum(optionOf('rbih_contact_group_response_1994', 'accept_51_49_plan').effects, 'RBiH')).toBe(10);
    });
});

describe('§6 E4 round 3: the peace_plan_response condition kind', () => {
    const cond = (overrides: Record<string, unknown> = {}) => ({
        type: 'peace_plan_response', plan_id: 'contact_group', faction: 'RS', response: 'rejected', ...overrides,
    });

    it('reads resolved plan-record entries only', () => {
        const state = makeState({ turn: 121 });
        const c = cond() as EventCondition;
        expect(evaluateCondition(c, state)).toBe(false);
        state.military.negotiation!.peace_plan_history.push(cgRecord('rejected', false));
        expect(evaluateCondition(c, state)).toBe(false);
        state.military.negotiation!.peace_plan_history = [cgRecord('rejected')];
        expect(evaluateCondition(c, state)).toBe(true);
        expect(evaluateCondition(cond({ response: 'accepted' }) as EventCondition, state)).toBe(false);
        expect(evaluateCondition(cond({ faction: 'RBiH', response: 'accepted' }) as EventCondition, state)).toBe(true);
        expect(evaluateCondition(cond({ plan_id: 'vance_owen' }) as EventCondition, state)).toBe(false);
        (state.military as { negotiation?: unknown }).negotiation = undefined;
        expect(evaluateCondition(c, state)).toBe(false);
    });

    it('the loader validates plan_id, faction and response', () => {
        const withCondition = (condition: unknown) => row({ trigger: { turn_min: 0, phase: 'war', condition } });
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([withCondition(cond())]))).not.toThrow();
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([withCondition(cond({ plan_id: 'no_such_plan' }))])))
            .toThrow(/plan_id must be a known peace plan id/);
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([withCondition(cond({ faction: 'JNA' }))])))
            .toThrow(/faction must be one of RBiH, RS, HRHB/);
        expect(() => loadEventDefinitionsFromDir(0, writeCatalog([withCondition(cond({ response: 'pending' }))])))
            .toThrow(/response must be 'accepted' or 'rejected'/);
    });
});

describe('§6 E4 round 3: save migration v42 lists', () => {
    it('the DROP and SET lists are disjoint', () => {
        const overlap = Object.keys(S6_E4_PATRON_SUPPORT_SET).filter((key) => S6_E4_PATRON_SUPPORT_DROP.has(key));
        expect(overlap).toEqual([]);
    });

    it('the lists match the catalog: DROP options carry no support, SET options carry the set value, shift-drop options carry no twin', () => {
        // §6 E3a2 (v43) moved these on after v42: the four interim carriers are stripped, the
        // contact-group +10 moved from contact_group_plan_1994#accept (now no options) to
        // rbih_contact_group_response_1994#accept_51_49_plan (a v42 DROP key). v42 keeps its lists.
        const MOVED_BY_E3A2 = new Set([
            'contact_group_plan_1994#accept',
            'contact_group_plan_1994#reject',
            'rbih_contact_group_response_1994#accept_51_49_plan',
            'rs_assembly_rejects_voplan_1993#accept_rejection',
            'rs_contact_group_response_1994#negotiate_amendments',
            'rs_owen_stoltenberg_response_1993#reject_plan',
        ]);
        for (const key of S6_E4_PATRON_SUPPORT_DROP) {
            if (MOVED_BY_E3A2.has(key)) continue;
            const [eventId, optionId] = key.split('#') as [string, string];
            const option = optionOf(eventId, optionId);
            expect((option.effects ?? []).some((e) => e.kind === 'patron_support'), key).toBe(false);
        }
        for (const [key, value] of Object.entries(S6_E4_PATRON_SUPPORT_SET)) {
            if (MOVED_BY_E3A2.has(key)) continue;
            const [eventId, optionId] = key.split('#') as [string, string];
            const option = optionOf(eventId, optionId);
            const total = (option.effects ?? []).filter((e) => e.kind === 'patron_support').reduce((s, e) => s + (e as { delta: number }).delta, 0);
            expect(total, key).toBe(value);
        }
        for (const [key, faction] of Object.entries(S6_E4_PATRON_CONFIDENCE_SHIFT_DROP)) {
            const [eventId, optionId] = key.split('#') as [string, string];
            expect(confidenceShifts(optionOf(eventId, optionId), faction), key).toEqual([]);
        }
    });

    it('the shift-drop list is faction-keyed and covers every option-scope twin the ruling removed', () => {
        expect(S6_E4_PATRON_CONFIDENCE_SHIFT_DROP).toEqual({
            'belgrade_embargo_rs_1994#defiant': 'RS',
            'concentration_camps_revealed_1992#deny': 'RS',
            'concentration_camps_revealed_1992#obstruct': 'RS',
            'csq_patron_recovery_offer#accept_recovery': 'RS',
            'csq_separate_peace_overture#press_bilateral': 'RBiH',
            'hrhb_camp_exposure_response_1993#cooperate': 'HRHB',
            'hrhb_camp_exposure_response_1993#deny': 'HRHB',
            'hrhb_herceg_bosna_consolidation_1992#minimal_entity': 'HRHB',
            'hrhb_posavina_orasje_posture_1992#counterattack_brod': 'HRHB',
            'hrhb_zagreb_supply_channel_1992#assert_autonomy': 'HRHB',
            'hrhb_zagreb_supply_channel_1992#diversify_supply': 'HRHB',
            'rbih_contact_group_response_1994#reject_51_49_plan': 'RBiH',
            'rbih_federation_army_integration_1994#refuse_integration': 'RBiH',
            'rs_assembly_rejects_voplan_1993#accept_rejection': 'RS',
            'rs_assembly_rejects_voplan_1993#override_assembly': 'RS',
            'rs_contact_group_response_1994#accept_51_49_plan': 'RS',
            'rs_contact_group_response_1994#negotiate_amendments': 'RS',
            'rs_contact_group_response_1994#reject_51_49_plan': 'RS',
            'strategic_posture_review_hrhb#sue_for_peace_hrhb': 'HRHB',
            'un_hostage_crisis_1995#maintain_hostages': 'RS',
        });
    });

    it('migrates the v41 fixture: CG reject and Q2 drops, faction-keyed shift strips, refs follow the effects', () => {
        const fixture = resolve(__dirname, 'fixtures', 'save_migration', 'v41_patron_pressure_pending.json');
        const migrated = deserializeState(readFileSync(fixture, 'utf8'));
        const byEvent = new Map(migrated.military.pending_event_decisions!.map((d) => [d.event_id, d.response_options]));
        const cg = byEvent.get('rs_contact_group_response_1994')!;
        const [accept, reject, amend] = cg;
        expect(accept!.effects).toEqual([{ kind: 'patron_support', faction: 'RS', delta: 20 }]);
        expect(confidenceShifts(accept!, 'RS')).toEqual([]);
        // §6 E3a2 (v43, after v42): the routed card's own standing shift is stripped and plan_answer added.
        expect((accept!.dimension_shifts ?? []).some((s) => s.dimension === 'international_standing')).toBe(false);
        expect(accept!.plan_answer).toEqual({ plan_id: 'contact_group', response: 'accepted' });
        expect(reject!.effects).toEqual([{ kind: 'morale_change', faction: 'RS', delta: 3 }]);
        expect(confidenceShifts(reject!, 'RS')).toEqual([]);
        expect(reject!.dimension_shifts).toEqual([{ faction: 'RS', dimension: 'internal_cohesion', delta: 5 }]);
        expect(reject!.future_consequences![0]!.material_effect_refs).toEqual(['morale_change.RS']);
        // §6 E3a2 (v43): the interim −5 that v42 sets is stripped (the plan's −5 is the one carrier).
        expect(amend!.effects).toEqual([]);
        expect(confidenceShifts(amend!, 'RS')).toEqual([]);
        const posture = byEvent.get('strategic_posture_review_rs')![0]!;
        expect(posture.effects).toEqual([]);
        expect(confidenceShifts(posture, 'RS')).toEqual([8]);
        expect(posture.future_consequences![0]!.material_effect_refs).toEqual([]);
    });
});
