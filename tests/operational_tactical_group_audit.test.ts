import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    auditOperationalTacticalGroupSave,
    auditOperationalTacticalGroups,
    serializeOperationalTacticalGroupAudit,
} from '../tools/diagnostics/audit_operational_tactical_groups.js';

function syntheticState(): unknown {
    return {
        meta: { turn: 20 },
        military: {
            tactical_groups: {
                'tg:z': {
                    id: 'tg:z',
                    corps_id: 'corps:z',
                    op_id: 'op:z',
                    anchor_brigade_id: 'brigade:z',
                    donor_contributions: [],
                    location_osid: 'osid:z',
                    status: 'forming',
                    formed_on_turn: 18,
                    cohesion: 91,
                },
                'tg:a': {
                    id: 'tg:a',
                    corps_id: 'corps:a',
                    op_id: 'op:a',
                    army_hq_op_id: 'ahq:a',
                    anchor_brigade_id: 'brigade:a',
                    donor_contributions: [],
                    location_osid: 'osid:a',
                    status: 'engaged',
                    formed_on_turn: 6,
                    cohesion: 73,
                },
            },
            tg_formations_by_corps: {
                'corps:z': 4,
                'corps:a': 5,
            },
            army_hq_operations: {
                'ahq:z': {
                    id: 'ahq:z',
                    faction_id: 'RS',
                    name: 'Orphan planning operation',
                    anchor_corps_id: 'corps:z',
                    donor_corps_ids: [],
                    tg_id: 'tg:missing',
                    status: 'planning',
                    formed_on_turn: 12,
                    scenario_year: 0,
                },
                'ahq:a': {
                    id: 'ahq:a',
                    faction_id: 'RBiH',
                    name: 'op:a',
                    anchor_corps_id: 'corps:a',
                    donor_corps_ids: ['corps:z'],
                    tg_id: 'tg:a',
                    status: 'executing',
                    formed_on_turn: 5,
                    scenario_year: 0,
                },
            },
            corps_command: {
                'corps:z': {
                    active_operations: [],
                },
                'corps:a': {
                    active_operations: [{
                        name: 'op:a',
                        type: 'general_offensive',
                        phase: 'execution',
                        started_turn: 5,
                        phase_started_turn: 6,
                        participating_brigades: ['brigade:a'],
                        army_hq_op_id: 'ahq:a',
                    }],
                },
            },
            formations: {
                'formation:z': {
                    id: 'formation:z',
                    faction: 'RS',
                    kind: 'og',
                    status: 'active',
                    corps_id: 'corps:z',
                    brigade_history: {
                        tg_participations: [
                            { tg_id: 'tg:z', op_id: 'op:z', role: 'anchor', formed_turn: 18 },
                        ],
                    },
                },
                'formation:inactive': {
                    id: 'formation:inactive',
                    faction: 'RS',
                    kind: 'og',
                    status: 'inactive',
                },
                'formation:a': {
                    id: 'formation:a',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    brigade_history: {
                        tg_participations: [
                            { tg_id: 'tg:a', op_id: 'op:a', role: 'anchor', formed_turn: 6 },
                            { tg_id: 'tg:z', op_id: 'op:z', role: 'donor', formed_turn: 18 },
                        ],
                        archived_tg_participations: [
                            { tg_id: 'tg:old-z', op_id: 'op:old-z', role: 'donor', formed_turn: 1 },
                            { tg_id: 'tg:old-a', op_id: 'op:old-a', role: 'anchor', formed_turn: 2 },
                        ],
                    },
                },
            },
            og_orders: [
                {
                    corps_id: 'corps:z',
                    donors: [
                        { brigade_id: 'brigade:z2', personnel_contribution: 100 },
                        { brigade_id: 'brigade:z1', personnel_contribution: 200 },
                    ],
                    focus_settlements: ['osid:z2', 'osid:z1'],
                    posture: 'attack',
                    max_duration: 4,
                },
                {
                    corps_id: 'corps:a',
                    donors: [{ brigade_id: 'brigade:a1', personnel_contribution: 300 }],
                    focus_settlements: ['osid:a1'],
                    posture: 'defend',
                    max_duration: 2,
                },
            ],
            og_promotions: {
                'promotion:z': {
                    corps_id: 'corps:z',
                    faction: 'RBiH',
                    og_ordinal: 1,
                    division_number: 21,
                    division_display_name: '21. Division',
                    promoted_on_turn: 17,
                },
                'promotion:a': {
                    corps_id: 'corps:a',
                    faction: 'RBiH',
                    og_ordinal: 1,
                    division_number: 21,
                    division_display_name: '  21.   DIVISION  ',
                    promoted_on_turn: 16,
                },
                'promotion:b': {
                    corps_id: 'corps:b',
                    faction: 'RBiH',
                    og_ordinal: 1,
                    division_number: 22,
                    division_display_name: '22. Division',
                    promoted_on_turn: 15,
                },
                'promotion:mapped-mismatch': {
                    corps_id: 'arbih_2nd_corps',
                    faction: 'RBiH',
                    og_ordinal: 1,
                    division_number: 22,
                    division_display_name: '22. Division',
                    promoted_on_turn: 14,
                },
            },
        },
    };
}

describe('operational/tactical group audit', () => {
    it('loads save paths through canonical migration and validation before auditing', () => {
        const report = auditOperationalTacticalGroupSave(path.resolve(
            'tests/fixtures/save_migration/v33_tactical_group_army_hq_scaffold.json',
        ));

        expect(report.turn).toBe(0);
        expect(report.tactical_groups.count).toBe(0);
        expect(report.army_hq_operations.count).toBe(0);
    });

    it('reports every lifecycle category in stable strictCompare order', () => {
        const report = auditOperationalTacticalGroups(syntheticState());

        expect(report).toEqual({
            turn: 20,
            tactical_groups: {
                count: 2,
                formation_count_total: 9,
                formation_counts_by_corps: [
                    { corps_id: 'corps:a', count: 5 },
                    { corps_id: 'corps:z', count: 4 },
                ],
                status_counts: [
                    { status: 'engaged', count: 1 },
                    { status: 'forming', count: 1 },
                ],
                groups: [
                    { id: 'tg:a', status: 'engaged', age_turns: 14, cohesion: 73 },
                    { id: 'tg:z', status: 'forming', age_turns: 2, cohesion: 91 },
                ],
            },
            army_hq_operations: {
                count: 2,
                status_counts: [
                    { status: 'executing', count: 1 },
                    { status: 'planning', count: 1 },
                ],
                operations: [
                    { id: 'ahq:a', status: 'executing', tg_id: 'tg:a' },
                    { id: 'ahq:z', status: 'planning', tg_id: 'tg:missing' },
                ],
                stale_tg_links: [
                    { army_hq_operation_id: 'ahq:z', tg_id: 'tg:missing' },
                ],
                active_without_corps_operation_ids: ['ahq:z'],
            },
            participations: {
                live_count: 3,
                archived_count: 2,
            },
            legacy_operational_groups: {
                active_formation_ids: ['formation:z'],
                queued_orders: [
                    {
                        corps_id: 'corps:a',
                        donor_brigade_ids: ['brigade:a1'],
                        focus_settlement_ids: ['osid:a1'],
                    },
                    {
                        corps_id: 'corps:z',
                        donor_brigade_ids: ['brigade:z1', 'brigade:z2'],
                        focus_settlement_ids: ['osid:z1', 'osid:z2'],
                    },
                ],
            },
            promotion_identity: {
                unmapped_records: [
                    {
                        record_key: 'promotion:a',
                        corps_id: 'corps:a',
                        og_ordinal: 1,
                        division_number: 21,
                        division_display_name: '  21.   DIVISION  ',
                    },
                    {
                        record_key: 'promotion:b',
                        corps_id: 'corps:b',
                        og_ordinal: 1,
                        division_number: 22,
                        division_display_name: '22. Division',
                    },
                    {
                        record_key: 'promotion:z',
                        corps_id: 'corps:z',
                        og_ordinal: 1,
                        division_number: 21,
                        division_display_name: '21. Division',
                    },
                ],
                mapped_mismatches: [
                    {
                        record_key: 'promotion:mapped-mismatch',
                        corps_id: 'arbih_2nd_corps',
                        og_ordinal: 1,
                        division_number: 22,
                        division_display_name: '22. Division',
                        expected_division_number: 21,
                        expected_division_display_name: '21. Division',
                    },
                ],
                duplicate_division_numbers: [
                    {
                        division_number: 21,
                        record_keys: ['promotion:a', 'promotion:z'],
                        count: 2,
                    },
                    {
                        division_number: 22,
                        record_keys: ['promotion:b', 'promotion:mapped-mismatch'],
                        count: 2,
                    },
                ],
                duplicate_display_names: [
                    {
                        normalized_display_name: '21. division',
                        record_keys: ['promotion:a', 'promotion:z'],
                        count: 2,
                    },
                    {
                        normalized_display_name: '22. division',
                        record_keys: ['promotion:b', 'promotion:mapped-mismatch'],
                        count: 2,
                    },
                ],
            },
            same_corps_legacy_tg_overlap_candidates: [
                {
                    corps_id: 'corps:a',
                    active_legacy_og_ids: [],
                    live_tg_ids: ['tg:a'],
                    queued_legacy_order_count: 1,
                },
                {
                    corps_id: 'corps:z',
                    active_legacy_og_ids: ['formation:z'],
                    live_tg_ids: ['tg:z'],
                    queued_legacy_order_count: 1,
                },
            ],
        });
    });

    it('matches a live CorpsOperation by anchor corps and operation name, not Army-HQ id alone', () => {
        const report = auditOperationalTacticalGroups({
            meta: { turn: 20 },
            military: {
                tactical_groups: {},
                army_hq_operations: {
                    'ahq:target': {
                        id: 'ahq:target',
                        anchor_corps_id: 'corps:target',
                        name: 'Exact operation name',
                        status: 'executing',
                    },
                },
                corps_command: {
                    'corps:other': {
                        active_operations: [{
                            name: 'Exact operation name',
                            army_hq_op_id: 'ahq:target',
                        }],
                    },
                    'corps:target': {
                        active_operations: [{
                            name: 'Wrong operation name',
                            army_hq_op_id: 'ahq:target',
                        }],
                    },
                },
                formations: {},
            },
        });

        expect(report.army_hq_operations.active_without_corps_operation_ids).toEqual(['ahq:target']);
    });

    it('serializes byte-identically without wall-clock metadata', () => {
        const state = syntheticState();
        const first = serializeOperationalTacticalGroupAudit(auditOperationalTacticalGroups(state));
        const second = serializeOperationalTacticalGroupAudit(auditOperationalTacticalGroups(state));

        expect(first).toBe(second);
        expect(first).not.toMatch(/timestamp|generated_at|Date\(/i);
        expect(first.endsWith('\n')).toBe(true);
    });
});
