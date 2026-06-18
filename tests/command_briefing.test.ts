import { describe, it, expect } from 'vitest';
import { assembleCommandBriefing } from '../src/sim/briefing/collect_briefing.js';

function makeState(overrides: Record<string, unknown> = {}): any {
    return {
        meta: { turn: 10, phase: 'war', player_faction: 'RBiH' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: {
            formations: {},
            corps_command: {},
            negotiation: {},
            ...overrides,
        },
        political: {},
    };
}

describe('assembleCommandBriefing', () => {
    it('produces empty briefing for empty state', () => {
        const state = makeState();
        const briefing = assembleCommandBriefing(state, 'RBiH');
        expect(briefing.turn).toBe(10);
        expect(briefing.faction).toBe('RBiH');
        expect(briefing.items.length).toBe(0);
        expect(briefing.headline).toContain('No significant');
    });

    it('flags pending peace plan as critical', () => {
        const state = makeState({
            negotiation: {
                pending_peace_plan: { plan_id: 'vance_owen', turn_offered: 40, bot_responses: {} },
            },
        });
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const critical = briefing.items.filter(i => i.severity === 'critical');
        expect(critical.length).toBeGreaterThan(0);
        expect(critical[0].section).toBe('diplomatic');
        expect(briefing.criticalCount).toBeGreaterThan(0);
    });

    it('assigns routeable targets to command briefing action chips', () => {
        const state = makeState({
            negotiation: {
                pending_peace_plan: { plan_id: 'vance_owen', turn_offered: 40, bot_responses: {} },
            },
            pending_officer_events: [
                { faction: 'RBiH', event_id: 'interp', type: 'order_refused', acknowledged: false },
                { faction: 'RBiH', event_id: 'personnel', type: 'officer_available', acknowledged: false },
            ],
        });
        state.supply_state_by_osid = {
            factions: [{ faction_id: 'RBiH', by_osid: [{ osid: 'op:sa:sarajevo_1', state: 'critical' }] }],
        };

        const briefing = assembleCommandBriefing(state, 'RBiH');
        const actionItems = briefing.items.filter(item => item.actionLabel);

        expect(actionItems.length).toBeGreaterThanOrEqual(4);
        expect(actionItems.every(item => item.target?.kind)).toBe(true);
        expect(briefing.items.find(i => i.id === 'log-supply')?.target).toMatchObject({ kind: 'summary', summaryFocus: 'support' });
        expect(briefing.items.find(i => i.id === 'dip-peace-plan')?.target).toMatchObject({ kind: 'peace_plan', peacePlanId: 'vance_owen' });
        expect(briefing.items.find(i => i.id === 'cmd-order-interpretations')?.target).toMatchObject({ kind: 'officer_events', officerFocus: 'interpretations' });
        expect(briefing.items.find(i => i.id === 'cmd-officer-events')?.target).toMatchObject({ kind: 'officer_events', officerFocus: 'personnel' });
    });

    it('flags low-cohesion corps as warning', () => {
        const state = makeState({
            formations: {
                arbih_1st_corps: { faction: 'RBiH', kind: 'corps_asset', status: 'active', name: '1st Corps' },
                brig_a: { faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'arbih_1st_corps', cohesion: 25 },
                brig_b: { faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'arbih_1st_corps', cohesion: 30 },
            },
        });
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const warnings = briefing.items.filter(i => i.severity === 'warning' && i.id.startsWith('mil-cohesion'));
        expect(warnings.length).toBe(1);
        expect(warnings[0].detail).toContain('28%'); // avg of 25+30
    });

    it('flags pending officer events', () => {
        const state = makeState({
            pending_officer_events: [
                { faction: 'RBiH', event_id: 'e1' },
            ],
        });
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const cmdItems = briefing.items.filter(i => i.section === 'command');
        expect(cmdItems.length).toBe(1);
    });

    it('sorts critical before warning before info', () => {
        const state = makeState({
            negotiation: {
                pending_peace_plan: { plan_id: 'test', turn_offered: 5, bot_responses: {} },
            },
            formations: {
                corps_a: { faction: 'RBiH', kind: 'corps_asset', status: 'active', name: 'Test Corps' },
                brig_a: { faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'corps_a', cohesion: 20 },
            },
        });
        const briefing = assembleCommandBriefing(state, 'RBiH');
        expect(briefing.items.length).toBeGreaterThanOrEqual(2);
        // First item should be critical (peace plan), second warning (cohesion)
        expect(briefing.items[0].severity).toBe('critical');
    });

    it('counts active operations by the owning corps formation faction', () => {
        const state = makeState({
            formations: {
                arbih_1st_corps: { faction: 'RBiH', kind: 'corps_asset', status: 'active', name: '1st Corps' },
                vrs_1st_krajina: { faction: 'RS', kind: 'corps_asset', status: 'active', name: '1st Krajina Corps' },
            },
            corps_command: {
                arbih_1st_corps: {
                    active_operations: [
                        { id: 'op_a', name: 'Operation A' },
                        { id: 'op_b', name: 'Operation B' },
                    ],
                },
                vrs_1st_krajina: {
                    active_operations: [
                        { id: 'op_enemy', name: 'Enemy Operation' },
                    ],
                },
            },
        });
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const activeOps = briefing.items.find(i => i.id === 'mil-active-ops');
        expect(activeOps).toBeDefined();
        expect(activeOps!.title).toContain('2 active operations');
        expect(activeOps!.detail).toContain('2 corps-level operations');
    });

    it('flags disrupted brigades from the canonical formation field', () => {
        const state = makeState({
            formations: {
                brig_a: { faction: 'RBiH', kind: 'brigade', status: 'active', disrupted_turns: 1 },
                brig_b: { faction: 'RBiH', kind: 'brigade', status: 'active', disrupted_turns: 2 },
                brig_c: { faction: 'RBiH', kind: 'brigade', status: 'active', disrupted_turns: 3 },
                brig_enemy: { faction: 'RS', kind: 'brigade', status: 'active', disrupted_turns: 3 },
            },
        });
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const disrupted = briefing.items.find(i => i.id === 'mil-disrupted');
        expect(disrupted).toBeDefined();
        expect(disrupted!.severity).toBe('warning');
        expect(disrupted!.title).toContain('3 brigades disrupted');
    });

    it('flags prolonged enclave isolation from political enclave resilience', () => {
        const state = makeState();
        state.political = {
            enclave_resilience: {
                bihac_pocket: { resilience: 18, isolation_turns: 16, hardening_active: true },
                gorazde: { resilience: 28, isolation_turns: 4, hardening_active: false },
            },
        };
        const briefing = assembleCommandBriefing(state, 'RBiH');
        const enclave = briefing.items.find(i => i.id === 'hum-enclave-bihac_pocket');
        expect(enclave).toBeDefined();
        expect(enclave!.section).toBe('humanitarian');
        expect(enclave!.severity).toBe('critical');
        expect(enclave!.title).toBe('Bihac Pocket under prolonged siege');
        expect(enclave!.title).not.toContain('_');
        expect(enclave!.detail).toContain('Isolated for 16 turns');
    });

    it('summarizes player-faction supply state and corridor risk from canonical supply reports', () => {
        const state = makeState();
        state.supply_state_by_osid = {
            schema: 1,
            turn: 10,
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'op:sa:sarajevo_1', state: 'critical' },
                        { osid: 'op:tu:tuzla_1', state: 'strained' },
                        { osid: 'op:ze:zenica_1', state: 'adequate' },
                    ],
                },
                {
                    faction_id: 'RS',
                    by_osid: [
                        { osid: 'op:pr:prijedor_1', state: 'critical' },
                    ],
                },
            ],
        };
        state.supply_corridors_osid = {
            schema: 1,
            turn: 10,
            corridors: [
                { faction_id: 'RBiH', edge_id: 'a__b', state: 'brittle' },
                { faction_id: 'RBiH', edge_id: 'b__c', state: 'cut' },
                { faction_id: 'RS', edge_id: 'x__y', state: 'cut' },
            ],
        };

        const briefing = assembleCommandBriefing(state, 'RBiH');
        const supply = briefing.items.find(i => i.id === 'log-supply');

        expect(supply).toBeDefined();
        expect(supply!.section).toBe('logistics');
        expect(supply!.severity).toBe('critical');
        expect(supply!.title).toBe('Supply lines critically exposed');
        expect(supply!.detail).toContain('1 critical');
        expect(supply!.detail).toContain('1 strained');
        expect(supply!.detail).toContain('1 cut corridor');
        expect(supply!.detail).toContain('1 brittle corridor');
        expect(supply!.detail).not.toContain('Prijedor');
    });
});
