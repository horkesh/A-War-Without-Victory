/**
 * Phase F Packet 1 — event_causality_chain diagnostic tests.
 *
 * Validates that `buildEventCausalitySnapshot` correctly reads Phase B/D
 * persistent causality state from a save (closed_event_ids + event_causality_log),
 * cross-references with the authored event catalog for family/source_tier
 * enrichment, builds deterministic causality trees from foundationals, and
 * applies --event / --family filters correctly.
 *
 * Determinism: no Math.random, no Date.now, no file I/O — every test passes
 * `rawSave` and a synthetic `catalog` inline so behavior is fully deterministic
 * regardless of disk state.
 */

import { describe, expect, it } from 'vitest';

import {
    buildEventCausalitySnapshot,
    type CatalogEntry,
    type EventCausalitySnapshot,
} from '../tools/diagnostics/event_causality_chain.js';

function buildCatalog(entries: Array<{ id: string; family?: string; source_tier?: string }>): Map<string, CatalogEntry> {
    const map = new Map<string, CatalogEntry>();
    for (const e of entries) {
        map.set(e.id, {
            id: e.id,
            family: e.family ?? null,
            source_tier: e.source_tier ?? null,
        });
    }
    return map;
}

const CATALOG = buildCatalog([
    { id: 'rs_strategic_goals', family: 'rs_strategic_goals', source_tier: 'icty_icj_un' },
    { id: 'rs_assembly_rejects_voplan', family: 'rs_strategic_goals', source_tier: 'icty_icj_un' },
    { id: 'rs_belgrade_pressure_response', family: 'rs_strategic_goals', source_tier: 'icty_icj_un' },
    { id: 'rbih_state_identity', family: 'rbih_state_identity', source_tier: 'icty_icj_un' },
    { id: 'rbih_constitutional_path', family: 'rbih_state_identity', source_tier: 'agreement_text' },
    { id: 'hrhb_political_goal', family: 'hrhb_political_goal', source_tier: 'icty_icj_un' },
]);

function minimalChainSave(): unknown {
    return {
        meta: { turn: 12, scenario_id: 'apr1992_test', seed: 'test-seed' },
        military: {
            fired_event_ids: ['rs_strategic_goals', 'rs_assembly_rejects_voplan'],
            enabled_event_ids: ['rs_assembly_rejects_voplan', 'rs_belgrade_pressure_response'],
            closed_event_ids: [],
            event_decision_log: [
                {
                    event_id: 'rs_strategic_goals',
                    response_id: 'all_six',
                    decision_source: 'bot_political',
                    faction: 'RS',
                    turn: 1,
                },
                {
                    event_id: 'rs_assembly_rejects_voplan',
                    response_id: 'reject',
                    decision_source: 'player',
                    faction: 'RS',
                    turn: 8,
                },
            ],
            event_last_fired_turn: {
                rs_strategic_goals: 1,
                rs_assembly_rejects_voplan: 8,
            },
            event_causality_log: [
                {
                    turn: 1,
                    from_event: 'rs_strategic_goals',
                    to_event: 'rs_assembly_rejects_voplan',
                    to_flag: null,
                    kind: 'enables',
                    source_response_id: 'all_six',
                },
                {
                    turn: 1,
                    from_event: 'rs_strategic_goals',
                    to_event: 'rs_belgrade_pressure_response',
                    to_flag: null,
                    kind: 'enables',
                    source_response_id: 'all_six',
                },
            ],
        },
    };
}

describe('buildEventCausalitySnapshot', () => {
    it('builds without throwing on a minimal mock state and surfaces meta', () => {
        const snapshot = buildEventCausalitySnapshot({
            rawSave: minimalChainSave(),
            catalog: CATALOG,
        });
        expect(snapshot.turn).toBe(12);
        expect(snapshot.scenario_id).toBe('apr1992_test');
        expect(snapshot.seed).toBe('test-seed');
        expect(snapshot.summary.total_fired).toBe(2);
        expect(snapshot.summary.total_closed).toBe(0);
        expect(snapshot.summary.total_causality_entries).toBe(2);
    });

    it('JSON-serializable snapshot shape matches expected fields', () => {
        const snapshot = buildEventCausalitySnapshot({
            rawSave: minimalChainSave(),
            catalog: CATALOG,
        });
        const reparsed = JSON.parse(JSON.stringify(snapshot)) as EventCausalitySnapshot;
        expect(reparsed.fired_events).toHaveLength(2);
        expect(reparsed.causality_log).toHaveLength(2);
        expect(reparsed.chains).toHaveLength(1);
        expect(reparsed.summary).toMatchObject({
            total_fired: 2,
            total_closed: 0,
            total_causality_entries: 2,
        });
        // Enriched cross-reference fields present.
        const foundation = reparsed.fired_events.find((r) => r.event_id === 'rs_strategic_goals');
        expect(foundation).toBeDefined();
        expect(foundation!.family).toBe('rs_strategic_goals');
        expect(foundation!.option_id).toBe('all_six');
        expect(foundation!.faction).toBe('RS');
        expect(foundation!.source_tier).toBe('icty_icj_un');
    });

    it('builds a correct ASCII tree shape for 1 root -> 2 children', () => {
        const snapshot = buildEventCausalitySnapshot({
            rawSave: minimalChainSave(),
            catalog: CATALOG,
        });
        expect(snapshot.chains).toHaveLength(1);
        const chain = snapshot.chains[0];
        expect(chain.root).toBe('rs_strategic_goals');
        expect(chain.depth).toBe(2);
        expect(chain.fanout).toBe(2);
        expect(chain.tree.children).toHaveLength(2);
        // Children are sorted alphabetically.
        expect(chain.tree.children[0].event_id).toBe('rs_assembly_rejects_voplan');
        expect(chain.tree.children[1].event_id).toBe('rs_belgrade_pressure_response');
        // Fired event in chain carries option_id from decision log.
        expect(chain.tree.children[0].fired).toBe(true);
        expect(chain.tree.children[0].option_id).toBe('reject');
        expect(chain.tree.children[1].fired).toBe(false);
        expect(chain.tree.children[1].option_id).toBeNull();
    });

    it('--event filter narrows to ancestors + descendants of requested event', () => {
        const raw = {
            meta: { turn: 20, scenario_id: 'apr1992_test' },
            military: {
                fired_event_ids: ['rs_strategic_goals', 'rbih_state_identity'],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_decision_log: [],
                event_last_fired_turn: { rs_strategic_goals: 1, rbih_state_identity: 1 },
                event_causality_log: [
                    // Chain A: rs_strategic_goals -> rs_assembly_rejects_voplan
                    {
                        turn: 1,
                        from_event: 'rs_strategic_goals',
                        to_event: 'rs_assembly_rejects_voplan',
                        to_flag: null,
                        kind: 'enables',
                    },
                    // Chain B (unrelated): rbih_state_identity -> rbih_constitutional_path
                    {
                        turn: 2,
                        from_event: 'rbih_state_identity',
                        to_event: 'rbih_constitutional_path',
                        to_flag: null,
                        kind: 'enables',
                    },
                ],
            },
        };
        const snapshot = buildEventCausalitySnapshot({
            rawSave: raw,
            catalog: CATALOG,
            event: 'rs_assembly_rejects_voplan',
        });
        // Should retain Chain A only.
        expect(snapshot.causality_log).toHaveLength(1);
        expect(snapshot.causality_log[0].source).toBe('rs_strategic_goals');
        // Fired events filtered to neighborhood: only rs_strategic_goals (the ancestor).
        const firedIds = snapshot.fired_events.map((r) => r.event_id);
        expect(firedIds).toContain('rs_strategic_goals');
        expect(firedIds).not.toContain('rbih_state_identity');
        // Chain root is the foundational ancestor.
        expect(snapshot.chains).toHaveLength(1);
        expect(snapshot.chains[0].root).toBe('rs_strategic_goals');
    });

    it('--family filter narrows to events of the named family', () => {
        const raw = {
            meta: { turn: 20 },
            military: {
                fired_event_ids: ['rs_strategic_goals', 'rbih_state_identity'],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_decision_log: [],
                event_last_fired_turn: {},
                event_causality_log: [
                    {
                        turn: 1,
                        from_event: 'rs_strategic_goals',
                        to_event: 'rs_assembly_rejects_voplan',
                        to_flag: null,
                        kind: 'enables',
                    },
                    {
                        turn: 2,
                        from_event: 'rbih_state_identity',
                        to_event: 'rbih_constitutional_path',
                        to_flag: null,
                        kind: 'enables',
                    },
                ],
            },
        };
        const snapshot = buildEventCausalitySnapshot({
            rawSave: raw,
            catalog: CATALOG,
            family: 'rbih_state_identity',
        });
        expect(snapshot.causality_log).toHaveLength(1);
        expect(snapshot.causality_log[0].source).toBe('rbih_state_identity');
        const firedIds = snapshot.fired_events.map((r) => r.event_id);
        expect(firedIds).toEqual(['rbih_state_identity']);
        expect(snapshot.chains).toHaveLength(1);
        expect(snapshot.chains[0].root).toBe('rbih_state_identity');
    });

    it('summary stats math is correct (fired count, depth, fanout, closed)', () => {
        const raw = {
            meta: { turn: 30 },
            military: {
                fired_event_ids: ['rs_strategic_goals', 'rs_assembly_rejects_voplan', 'rs_belgrade_pressure_response'],
                enabled_event_ids: ['rs_assembly_rejects_voplan', 'rs_belgrade_pressure_response', 'unfired_child'],
                closed_event_ids: ['hrhb_political_goal'],
                event_decision_log: [],
                event_last_fired_turn: {},
                event_causality_log: [
                    {
                        turn: 1,
                        from_event: 'rs_strategic_goals',
                        to_event: 'rs_assembly_rejects_voplan',
                        to_flag: null,
                        kind: 'enables',
                    },
                    {
                        turn: 1,
                        from_event: 'rs_strategic_goals',
                        to_event: 'rs_belgrade_pressure_response',
                        to_flag: null,
                        kind: 'enables',
                    },
                    {
                        turn: 2,
                        from_event: 'rs_assembly_rejects_voplan',
                        to_event: 'unfired_child',
                        to_flag: null,
                        kind: 'enables',
                    },
                    {
                        turn: 3,
                        from_event: 'rs_strategic_goals',
                        to_event: 'hrhb_political_goal',
                        to_flag: null,
                        kind: 'closes',
                        source_response_id: 'all_six',
                    },
                ],
            },
        };
        const snapshot = buildEventCausalitySnapshot({
            rawSave: raw,
            catalog: CATALOG,
        });
        expect(snapshot.summary.total_fired).toBe(3);
        // enabled_event_ids has 3 entries, 2 of which fired -> 1 unfired remaining.
        expect(snapshot.summary.total_enabled_unfired).toBe(1);
        expect(snapshot.summary.total_closed).toBe(1);
        expect(snapshot.summary.total_causality_entries).toBe(4);
        // Depth: rs_strategic_goals -> rs_assembly_rejects_voplan -> unfired_child = depth 3.
        expect(snapshot.summary.max_depth).toBe(3);
        // Fanout: rs_strategic_goals has 3 outgoing edges (2 enables + 1 closes).
        expect(snapshot.summary.max_fanout).toBe(3);
        // Closed row carries closed_by + source_response_id from causality entry.
        expect(snapshot.closed_events).toHaveLength(1);
        expect(snapshot.closed_events[0]).toMatchObject({
            event_id: 'hrhb_political_goal',
            closed_by: 'rs_strategic_goals',
            turn_closed: 3,
            source_response_id: 'all_six',
        });
    });

    it('empty state produces clean output instead of crashing', () => {
        const snapshot = buildEventCausalitySnapshot({
            rawSave: { meta: { turn: 0 }, military: {} },
            catalog: CATALOG,
        });
        expect(snapshot.fired_events).toEqual([]);
        expect(snapshot.closed_events).toEqual([]);
        expect(snapshot.causality_log).toEqual([]);
        expect(snapshot.chains).toEqual([]);
        expect(snapshot.summary).toMatchObject({
            total_fired: 0,
            total_enabled_unfired: 0,
            total_closed: 0,
            total_causality_entries: 0,
            max_depth: 0,
            max_fanout: 0,
        });
    });

    it('output ordering is deterministic — alphabetical foundational roots and sorted causality log', () => {
        const raw = {
            meta: { turn: 10 },
            military: {
                fired_event_ids: ['zebra_event', 'alpha_event'],
                enabled_event_ids: [],
                closed_event_ids: ['gamma_closed', 'beta_closed'],
                event_decision_log: [],
                event_last_fired_turn: {},
                event_causality_log: [
                    // Intentionally authored out of order; tool must canonicalize.
                    {
                        turn: 5,
                        from_event: 'zebra_event',
                        to_event: 'zebra_child',
                        to_flag: null,
                        kind: 'enables',
                    },
                    {
                        turn: 5,
                        from_event: 'alpha_event',
                        to_event: 'alpha_child',
                        to_flag: null,
                        kind: 'enables',
                    },
                    {
                        turn: 3,
                        from_event: 'alpha_event',
                        to_event: 'gamma_closed',
                        to_flag: null,
                        kind: 'closes',
                    },
                    {
                        turn: 3,
                        from_event: 'alpha_event',
                        to_event: 'beta_closed',
                        to_flag: null,
                        kind: 'closes',
                    },
                ],
            },
        };
        const snapshot = buildEventCausalitySnapshot({
            rawSave: raw,
            catalog: CATALOG,
        });
        // Foundationals alphabetical.
        expect(snapshot.chains.map((c) => c.root)).toEqual(['alpha_event', 'zebra_event']);
        // Causality log sorted by (turn, source, target, ...).
        expect(snapshot.causality_log.map((r) => `${r.turn}:${r.source}->${r.target}:${r.relation}`)).toEqual([
            '3:alpha_event->beta_closed:closes',
            '3:alpha_event->gamma_closed:closes',
            '5:alpha_event->alpha_child:enables',
            '5:zebra_event->zebra_child:enables',
        ]);
        // closed_events sorted alphabetically by event_id.
        expect(snapshot.closed_events.map((r) => r.event_id)).toEqual(['beta_closed', 'gamma_closed']);
        // fired_events sorted alphabetically by event_id.
        expect(snapshot.fired_events.map((r) => r.event_id)).toEqual(['alpha_event', 'zebra_event']);
    });

    it('mutex_suppressed and overflowed entries appear in raw causality_log but not in chain trees', () => {
        const raw = {
            meta: { turn: 5 },
            military: {
                fired_event_ids: ['fired_winner'],
                enabled_event_ids: [],
                closed_event_ids: [],
                event_decision_log: [],
                event_last_fired_turn: {},
                event_causality_log: [
                    {
                        turn: 2,
                        from_event: 'suppressed_loser',
                        to_event: null,
                        to_flag: null,
                        kind: 'mutex_suppressed',
                    },
                    {
                        turn: 2,
                        from_event: 'overflowed_event',
                        to_event: null,
                        to_flag: null,
                        kind: 'overflowed',
                    },
                    {
                        turn: 3,
                        from_event: 'fired_winner',
                        to_event: 'enabled_follow',
                        to_flag: null,
                        kind: 'enables',
                    },
                ],
            },
        };
        const snapshot = buildEventCausalitySnapshot({
            rawSave: raw,
            catalog: CATALOG,
        });
        // Causality log contains all three entries.
        expect(snapshot.causality_log).toHaveLength(3);
        // Chain trees only contain the event-to-event 'enables' edge.
        expect(snapshot.chains).toHaveLength(1);
        expect(snapshot.chains[0].root).toBe('fired_winner');
        expect(snapshot.chains[0].tree.children.map((c) => c.event_id)).toEqual(['enabled_follow']);
    });
});
