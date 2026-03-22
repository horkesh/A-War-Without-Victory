import { describe, it, expect } from 'vitest';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';

describe('generateChronicleEntries', () => {
    it('returns empty array for null state', () => {
        expect(generateChronicleEntries(null as any)).toEqual([]);
    });

    it('returns empty array for state without turnSummaries', () => {
        expect(generateChronicleEntries({} as any)).toEqual([]);
    });

    it('creates combat card for battle with territory flip', () => {
        const state = {
            turn: 10,
            turnSummaries: [{
                turn: 10,
                battles: [{ osid: 'op:brcko:brcko_2', attacker_faction: 'RS', defender_faction: 'RBiH',
                    outcome: 'decisive_victory', attacker_casualties: 50, defender_casualties: 200, territory_flipped: true }],
                notable_flips: [], events_fired: [], notable_events: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: { RS: 1, RBiH: -1 }, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
            firedEvents: [],
        };
        const entries = generateChronicleEntries(state as any);
        const combat = entries.filter(e => e.type === 'combat');
        expect(combat.length).toBeGreaterThan(0);
        expect(combat[0].turn).toBe(10);
        expect(combat[0].title).toContain('Battle of');
        expect(combat[0].headline).toBe(true);
        expect(combat[0].metadata?.casualties).toBe(250);
    });

    it('creates political card for fired event', () => {
        const state = {
            turn: 5,
            turnSummaries: [{
                turn: 5,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [{ id: 'rs_strategic_goals', text: 'The Assembly Speaks' }],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const political = entries.filter(e => e.type === 'political');
        expect(political.length).toBeGreaterThan(0);
        expect(political[0].headline).toBe(true);
        expect(political[0].title).toBe('The Assembly Speaks');
    });

    it('filters minor battles (no territory flip, low casualties)', () => {
        const state = {
            turn: 10,
            turnSummaries: [{
                turn: 10,
                battles: [{ osid: 'op:test:test_1', attacker_faction: 'RS', defender_faction: 'RBiH',
                    outcome: 'stalemate', attacker_casualties: 10, defender_casualties: 10, territory_flipped: false }],
                notable_flips: [], events_fired: [], notable_events: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const combat = entries.filter(e => e.type === 'combat');
        expect(combat.length).toBe(0);
    });

    it('creates humanitarian card for large displacement', () => {
        const state = {
            turn: 8,
            turnSummaries: [{
                turn: 8,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 1500, displacement_by_ethnicity: { RBiH: 1200, RS: 300 },
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const humanitarian = entries.filter(e => e.type === 'humanitarian');
        expect(humanitarian.length).toBeGreaterThan(0);
        expect(humanitarian[0].metadata?.displaced).toBe(1500);
        expect(humanitarian[0].detail).toContain('1500 displaced');
    });

    it('creates military card for formation spawn', () => {
        const state = {
            turn: 6,
            turnSummaries: [{
                turn: 6,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [],
                decoration_awards: [], arc_transitions: [],
                formation_spawns: [{ id: 'rs_1st_krajina_1', name: '1st Krajina Brigade', faction: 'RS' }],
                formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const military = entries.filter(e => e.type === 'military');
        expect(military.length).toBeGreaterThan(0);
        expect(military[0].title).toBe('1st Krajina Brigade formed');
    });

    it('creates diplomatic card for graz-related event', () => {
        const state = {
            turn: 4,
            turnSummaries: [{
                turn: 4,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [{ id: 'graz_accords', text: 'Graz Agreement Signed' }],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const diplomatic = entries.filter(e => e.type === 'diplomatic');
        expect(diplomatic.length).toBe(1);
        expect(diplomatic[0].title).toBe('Graz Agreement Signed');
    });

    it('creates narrative card for notable events', () => {
        const state = {
            turn: 12,
            turnSummaries: [{
                turn: 12,
                battles: [], notable_flips: [],
                notable_events: [{ id: 'siege_tightens', text: 'The siege tightens around Sarajevo' }],
                events_fired: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const narrative = entries.filter(e => e.type === 'narrative');
        expect(narrative.length).toBe(1);
        expect(narrative[0].title).toBe('The siege tightens around Sarajevo');
    });

    it('sorts entries by turn ascending', () => {
        const state = {
            turnSummaries: [
                {
                    turn: 10,
                    battles: [], notable_flips: [], notable_events: [],
                    events_fired: [{ id: 'late_event', text: 'Late' }],
                    formation_spawns: [], formation_destructions: [],
                    displacement_total: 0, displacement_by_ethnicity: {},
                },
                {
                    turn: 3,
                    battles: [], notable_flips: [], notable_events: [],
                    events_fired: [{ id: 'early_event', text: 'Early' }],
                    formation_spawns: [], formation_destructions: [],
                    displacement_total: 0, displacement_by_ethnicity: {},
                },
            ],
        };
        const entries = generateChronicleEntries(state as any);
        expect(entries.length).toBe(2);
        expect(entries[0].turn).toBe(3);
        expect(entries[1].turn).toBe(10);
    });

    it('creates military card for formation destruction', () => {
        const state = {
            turn: 20,
            turnSummaries: [{
                turn: 20,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [],
                decoration_awards: [], arc_transitions: [],
                formation_spawns: [],
                formation_destructions: [{ id: 'rbih_lost_bde', name: '305th Brigade', faction: 'RBiH' }],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const military = entries.filter(e => e.type === 'military');
        expect(military.length).toBe(1);
        expect(military[0].title).toBe('305th Brigade destroyed');
        expect(military[0].headline).toBe(true);
    });
});
