import { describe, it, expect } from 'vitest';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';

function makeTurnSummary(turn: number, overrides: Record<string, any> = {}) {
    return {
        turn,
        battles: [],
        notable_flips: [],
        events_fired: [],
        notable_events: [],
        decoration_awards: [],
        arc_transitions: [],
        formation_spawns: [],
        formation_destructions: [],
        displacement_total: 0,
        displacement_by_ethnicity: {},
        territory_net: {},
        supply_deltas: {},
        heavy_munitions_deltas: {},
        movements: [],
        supply_transitions: [],
        ...overrides,
    };
}

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

    it('creates a cost card for severe player-scoped campaign cost', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 14,
            turnSummaries: [{
                turn: 14,
                battles: [{
                    osid: 'op:test:test_1',
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH',
                    outcome: 'breakthrough',
                    attacker_casualties: 35,
                    defender_casualties: 120,
                    territory_flipped: true,
                }],
                notable_flips: [], notable_events: [],
                events_fired: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [],
                formation_destructions: [{ formation_id: 'arbih_lost', formation_name: 'Lost Brigade', faction: 'RBiH' }],
                displacement_total: 1250, displacement_by_ethnicity: {},
                territory_net: { RBiH: -2, RS: 2 }, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };

        const entries = generateChronicleEntries(state as any);
        const cost = entries.find(e => e.type === 'cost');

        expect(cost).toBeDefined();
        expect(cost?.headline).toBe(true);
        expect(cost?.title).toBe('Critical campaign cost');
        expect(cost?.detail).toContain('120 friendly casualties');
        expect(cost?.detail).toContain('35 opposing casualties');
        expect(cost?.detail).toContain('1250 displaced');
        expect(cost?.detail).toContain('1 own formation destroyed');
        expect(cost?.detail).toContain('-2 net settlements');
        expect(cost?.metadata).toMatchObject({
            casualties: 120,
            displaced: 1250,
            costSeverity: 'critical',
            netFriendlyTerritory: -2,
            ownFormationsDestroyed: 1,
        });
    });

    it('does not create cost cards for quiet minor turns', () => {
        const state = {
            player_faction: 'RBiH',
            turnSummaries: [{
                turn: 9,
                battles: [{
                    osid: 'op:test:test_1',
                    attacker_faction: 'RBiH',
                    defender_faction: 'RS',
                    outcome: 'stalemate',
                    attacker_casualties: 8,
                    defender_casualties: 9,
                    territory_flipped: false,
                }],
                notable_flips: [], notable_events: [], events_fired: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 25, displacement_by_ethnicity: {},
                territory_net: { RBiH: 0 }, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };

        expect(generateChronicleEntries(state as any).some(e => e.type === 'cost')).toBe(false);
    });

    it('creates military card for formation spawn', () => {
        const state = {
            turn: 6,
            turnSummaries: [{
                turn: 6,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [],
                decoration_awards: [], arc_transitions: [],
                formation_spawns: [{ formation_id: 'rs_1st_krajina_1', formation_name: '1st Krajina Brigade', faction: 'RS' }],
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
                formation_destructions: [{ formation_id: 'rbih_lost_bde', formation_name: '305th Brigade', faction: 'RBiH' }],
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

    it('appends endgame comparison entries from historicalComparison', () => {
        const state = {
            turn: 188,
            gameOver: true,
            historicalComparison: {
                divergence_notes: [
                    'War lasted 18 weeks shorter than the historical 188 weeks',
                    'Federation controlled 54.0% territory vs historical 51%',
                ],
                rupture_divergence: ['srebrenica_genocide_1995'],
            },
            turnSummaries: [makeTurnSummary(188)],
        };
        const entries = generateChronicleEntries(state as any);
        const comparisonEntries = entries.filter((e) => e.turn === 188 && e.type === 'narrative');

        expect(comparisonEntries.some((e) => e.headline && e.title === 'History kept its own ledger')).toBe(true);
        expect(comparisonEntries.some((e) => e.detail === 'War lasted 18 weeks shorter than the historical 188 weeks')).toBe(true);
        expect(comparisonEntries.some((e) => e.ghost)).toBe(false);
    });

    it('creates a ghost chronicle entry when the historical Srebrenica rupture never occurs', () => {
        const state = {
            turn: 188,
            gameOver: true,
            historicalComparison: {
                divergence_notes: ['Srebrenica enclave survived'],
                rupture_divergence: [],
            },
            turnSummaries: [makeTurnSummary(188)],
        };
        const entries = generateChronicleEntries(state as any);
        const ghostEntry = entries.find((e) => e.ghost);

        expect(ghostEntry).toBeDefined();
        expect(ghostEntry?.title).toBe('Historical rupture absent');
        expect(ghostEntry?.detail).toContain('Srebrenica enclave survived in your war');
    });

    it('creates a personnel spotlight for a named commander who completes an operation', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 24,
            turnSummaries: [makeTurnSummary(24)],
            operationHistory: [{
                operation_id: 'op-vitez-relief',
                operation_name: 'Vitez Relief',
                corps_id: 'arbih_3rd_corps',
                faction: 'RBiH',
                started_turn: 20,
                ended_turn: 24,
                outcome: 'partial',
                commander_name: 'Enver Hadzihasanovic',
                commander_rank: 'General',
                objectives_targeted: ['op:vitez:vitez_1', 'op:vitez:vitez_2'],
                objectives_captured: ['op:vitez:vitez_1'],
                total_attacks: 4,
                casualties_suffered: { killed: 20, wounded: 50 },
                casualties_inflicted: { killed: 35, wounded: 90 },
                equipment_lost: { tanks: 0, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 0 },
                equipment_captured: { tanks: 0, artillery: 0 },
                grade: { stars: 3, verdict: 'costly partial success', factors: {} },
                duration_turns: 4,
                weekly_log: [],
            }],
        };

        const entries = generateChronicleEntries(state as any);
        const spotlight = entries.find(e => (e.type as string) === 'personnel');

        expect(spotlight).toBeDefined();
        expect(spotlight?.headline).toBe(true);
        expect(spotlight?.title).toBe('Officer of the Week: General Enver Hadzihasanovic');
        expect(spotlight?.detail).toContain('Vitez Relief');
        expect(spotlight?.detail).toContain('1/2 objectives');
        expect(spotlight?.metadata?.operationAarId).toBe('op-vitez-relief');
    });
});
