/**
 * Phase E/F foreclosure-causality acceptance test.
 *
 * Pins the exact `(from_event, to_event, kind='closes')` causality triples
 * produced when each of the three faction-root historical-default options
 * fires through the real production catalog and the Phase B runtime writer
 * (`applyResponseRuntimeCausality`).
 *
 * Background: before this packet the catalog authored 124 `opens_events`
 * future-consequence entries but ZERO `closes_events` — the foreclosure half of
 * the causal substrate (packet §3.3 / §3.4 "authorship of the tragedy") was
 * unused. This packet adds `closes_events_runtime` to the three foundational
 * historical-default options:
 *
 *   rs_strategic_goals#all_six      -> closes csq_drina_partisan_resistance_1992
 *   rbih_state_identity#civic       -> closes csq_bosniak_unity_1993,
 *                                              csq_minority_defections_1992,
 *                                              csq_pragmatic_coalition_1993
 *   hrhb_political_goal#croat_republic -> closes csq_federation_early_1994,
 *                                              csq_joint_operations_agreement_1992,
 *                                              csq_zagreb_displeasure_1993
 *
 * Byte-identity rationale (40w/52w anchors unchanged): every foreclosure target
 * is a `csq_*` consequence row gated on a COUNTERFACTUAL faction-identity flag
 * value (e.g. rs_strategic_goals=selective, rbih_state_identity=bosniak_national,
 * hrhb_political_goal=united_front). On the documented historical path the
 * foundational sets the historical flag, so the target's trigger condition is
 * already false and it never fires. Foreclosure therefore changes only the
 * audit fields (closed_event_ids + event_causality_log) — never which events
 * fire — and the baseline `final_save.json` hash is re-floored accordingly.
 *
 * Determinism: no Math.random, no Date.now, no scenario run. Drives the real
 * runtime writer against the real catalog rows.
 */

import { describe, it, expect } from 'vitest';

import { applyResponseRuntimeCausality } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition, EventCondition } from '../src/sim/events/event_types.js';
import type { GameState, CausalityLogEntry } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeMinimalState(turn = 1): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        factions: { RBiH: {} as unknown, RS: {} as unknown, HRHB: {} as unknown },
        meta: { turn, seed: 'phase-ef-foreclosure', phase: 'war' } as unknown,
        military: {
            formations: {},
            fired_event_ids: [],
        } as unknown,
        political: {} as unknown,
        displacement: {} as unknown,
        economic: {} as unknown,
    } as unknown as GameState;
}

/** Authored foreclosure contract — keep in lockstep with war_1992.json. */
const FORECLOSURE_CONTRACT: Array<{
    from_event: string;
    option_id: string;
    closes: string[];
    /** The counterfactual flag value the historical default does NOT set —
     *  documents the byte-identity safety of each foreclosure target. */
    counterfactual_flag_values: string[];
    branch_flag: string;
}> = [
    {
        from_event: 'rs_strategic_goals',
        option_id: 'all_six',
        closes: ['csq_drina_partisan_resistance_1992'],
        counterfactual_flag_values: ['selective'],
        branch_flag: 'rs_strategic_goals',
    },
    {
        from_event: 'rbih_state_identity',
        option_id: 'civic',
        closes: ['csq_bosniak_unity_1993', 'csq_minority_defections_1992', 'csq_pragmatic_coalition_1993'],
        counterfactual_flag_values: ['bosniak_national', 'pragmatic'],
        branch_flag: 'rbih_state_identity',
    },
    {
        from_event: 'hrhb_political_goal',
        option_id: 'croat_republic',
        closes: ['csq_federation_early_1994', 'csq_joint_operations_agreement_1992', 'csq_zagreb_displeasure_1993'],
        counterfactual_flag_values: ['united_front'],
        branch_flag: 'hrhb_political_goal',
    },
];

function loadCatalog(): EventDefinition[] {
    return loadEventDefinitions(0);
}

function byId(catalog: EventDefinition[]): Map<string, EventDefinition> {
    return new Map(catalog.map((e) => [e.id, e]));
}

/** Collect every flag_equals (flag,value) predicate in a condition tree. */
function flagEqualsPairs(cond: EventCondition | undefined, acc: Array<[string, string]>): void {
    if (!cond) return;
    if (cond.type === 'flag_equals') {
        acc.push([cond.flag, String(cond.value)]);
        return;
    }
    if (cond.type === 'and' || cond.type === 'or') {
        for (const c of cond.conditions) flagEqualsPairs(c, acc);
        return;
    }
    if (cond.type === 'not') {
        flagEqualsPairs(cond.condition, acc);
    }
}

describe('Phase E/F foreclosure causality (real catalog)', () => {
    it('each foundational historical-default option authors the expected closes_events_runtime', () => {
        const map = byId(loadCatalog());
        for (const c of FORECLOSURE_CONTRACT) {
            const evt = map.get(c.from_event);
            expect(evt, `${c.from_event} must exist`).toBeDefined();
            // Foundational uses historical bots → the closes-bearing option is the historical default.
            expect(evt!.historical_default_response_id, `${c.from_event} historical default`).toBe(c.option_id);
            const opt = evt!.response_options?.find((o) => o.id === c.option_id);
            expect(opt, `${c.from_event}#${c.option_id} option`).toBeDefined();
            const closes = [...(opt!.closes_events_runtime ?? [])].sort();
            expect(closes).toEqual([...c.closes].sort());
        }
    });

    it('drives applyResponseRuntimeCausality and pins the exact (from, to, closes) triples', () => {
        const map = byId(loadCatalog());
        const state = makeMinimalState(1);

        for (const c of FORECLOSURE_CONTRACT) {
            const opt = map.get(c.from_event)!.response_options!.find((o) => o.id === c.option_id)!;
            applyResponseRuntimeCausality(
                state,
                c.from_event,
                c.option_id,
                { enables_events_runtime: opt.enables_events_runtime, closes_events_runtime: opt.closes_events_runtime },
                1,
            );
        }

        const log: CausalityLogEntry[] = state.military.event_causality_log ?? [];

        // Pin the exact set of foreclosure triples (from_event, to_event, 'closes').
        const closesTriples = log
            .filter((e) => e.kind === 'closes')
            .map((e) => `${e.from_event}->${e.to_event}`)
            .sort();
        expect(closesTriples).toEqual([
            'hrhb_political_goal->csq_federation_early_1994',
            'hrhb_political_goal->csq_joint_operations_agreement_1992',
            'hrhb_political_goal->csq_zagreb_displeasure_1993',
            'rbih_state_identity->csq_bosniak_unity_1993',
            'rbih_state_identity->csq_minority_defections_1992',
            'rbih_state_identity->csq_pragmatic_coalition_1993',
            'rs_strategic_goals->csq_drina_partisan_resistance_1992',
        ]);

        // Each closes entry carries the historical-default option as source_response_id
        // and a null to_flag (event-target, not flag-target).
        for (const e of log.filter((x) => x.kind === 'closes')) {
            expect(e.to_flag).toBeNull();
            const contract = FORECLOSURE_CONTRACT.find((x) => x.from_event === e.from_event)!;
            expect(e.source_response_id).toBe(contract.option_id);
        }

        // closed_event_ids is the sorted, deduped union of all foreclosure targets.
        const expectedClosed = FORECLOSURE_CONTRACT.flatMap((c) => c.closes).sort();
        expect(state.military.closed_event_ids).toEqual(expectedClosed);
    });

    it('byte-identity safety: every foreclosure target is gated on a counterfactual flag value the historical default never sets', () => {
        const catalog = loadCatalog();
        const map = byId(catalog);
        for (const c of FORECLOSURE_CONTRACT) {
            // The historical-default option sets the historical flag value.
            const opt = map.get(c.from_event)!.response_options!.find((o) => o.id === c.option_id)!;
            const historicalValue = String((opt.sets_flags ?? {})[c.branch_flag]);
            expect(historicalValue, `${c.from_event}#${c.option_id} must set ${c.branch_flag}`).not.toBe('undefined');

            for (const targetId of c.closes) {
                const target = map.get(targetId);
                expect(target, `foreclosure target ${targetId} must exist in catalog`).toBeDefined();
                const pairs: Array<[string, string]> = [];
                flagEqualsPairs(target!.trigger.condition, pairs);
                const branchPairs = pairs.filter(([f]) => f === c.branch_flag);
                expect(branchPairs.length, `${targetId} must be gated on ${c.branch_flag}`).toBeGreaterThan(0);
                // None of the branch-flag gates may equal the historical value
                // (otherwise foreclosing it would change the historical path).
                for (const [, v] of branchPairs) {
                    expect(v, `${targetId} gate value ${v} must be counterfactual (not historical ${historicalValue})`).not.toBe(historicalValue);
                    expect(c.counterfactual_flag_values).toContain(v);
                }
            }
        }
    });

    it('foreclosure of an already-fired target is a state no-op but still records the causal entry', () => {
        const map = byId(loadCatalog());
        const c = FORECLOSURE_CONTRACT[0]; // rs_strategic_goals#all_six
        const state = makeMinimalState(1);
        // Pretend the target already fired (e.g. a counterfactual run reached it).
        state.military.fired_event_ids = [...c.closes];

        const opt = map.get(c.from_event)!.response_options!.find((o) => o.id === c.option_id)!;
        applyResponseRuntimeCausality(
            state,
            c.from_event,
            c.option_id,
            { closes_events_runtime: opt.closes_events_runtime },
            1,
        );

        // No write to closed_event_ids (closing an already-fired event is redundant).
        expect(state.military.closed_event_ids ?? []).toEqual([]);
        // But the causal entry is still recorded (authoring intent in the audit trail).
        const log = state.military.event_causality_log ?? [];
        expect(log.filter((e) => e.kind === 'closes').length).toBe(c.closes.length);
    });
});
