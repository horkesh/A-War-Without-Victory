import { afterEach, describe, it, expect } from 'vitest';
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';
import { setLocale } from '../src/ui/map/i18n/index.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

afterEach(() => {
    setLocale('en');
});

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

function makeDecisionCatalogEntry(id: string, title: string): EventDefinition {
    return {
        id,
        title,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        response_options: [{ id: 'historical_default', label: 'Historical default', effects: [] }],
    } as unknown as EventDefinition;
}

function buildDecisionEventDef(id: string): EventDefinition {
    return {
        id,
        title: id,
        trigger: { turn_min: 1, phase: 'war' },
        effect: { kind: 'narrative', text: 'noop' },
        family: 'test',
        source_tier: 'synthetic',
        response_options: [{ id: 'accept', label: 'Accept', effects: [] }],
    } as unknown as EventDefinition;
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

    it('does not render bot or foreign decision events as generic Chronicle politics', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 5,
            turnSummaries: [makeTurnSummary(5, {
                events_fired: [{ id: 'hrhb_political_goal', text: 'Croat leadership chooses its political line' }],
            })],
            rawGameState: {
                meta: { player_faction: 'RBiH' },
                military: {
                    event_decision_log: [{
                        event_id: 'hrhb_political_goal',
                        response_id: 'historical_default',
                        decision_source: 'bot_ai_default',
                        faction: 'HRHB',
                        turn: 5,
                    }],
                },
            },
        };
        const catalog = new Map<string, EventDefinition>([
            ['hrhb_political_goal', makeDecisionCatalogEntry('hrhb_political_goal', 'Croat leadership chooses its political line')],
        ]);

        const entries = generateChronicleEntries(state as any, catalog);

        expect(entries.find((entry) => entry.title === 'Croat leadership chooses its political line')).toBeUndefined();
        expect(entries.filter((entry) => entry.type === 'political')).toHaveLength(0);
    });

    it('keeps non-decision turn-summary events visible when a catalog is present', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 5,
            turnSummaries: [makeTurnSummary(5, {
                events_fired: [{ id: 'front_pressure_report', text: 'Front pressure report filed' }],
            })],
            rawGameState: {
                meta: { player_faction: 'RBiH' },
                military: { event_decision_log: [] },
            },
        };
        const catalog = new Map<string, EventDefinition>([
            ['front_pressure_report', {
                id: 'front_pressure_report',
                title: 'Front pressure report filed',
                trigger: { turn_min: 1, phase: 'war' },
                effect: { kind: 'narrative', text: 'noop' },
            } as unknown as EventDefinition],
        ]);

        const entries = generateChronicleEntries(state as any, catalog);

        expect(entries).toContainEqual(expect.objectContaining({
            type: 'political',
            title: 'Front pressure report filed',
        }));
    });

    it('does not render pending unanswered decision fired IDs as generic Chronicle events', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 5,
            turnSummaries: [makeTurnSummary(5, {
                events_fired: [
                    { id: 'rbih_state_identity', text: 'What Is Bosnia?' },
                    { id: 'barracks_seized', text: 'Barracks seized' },
                ],
            })],
            rawGameState: {
                meta: { player_faction: 'RBiH' },
                military: {
                    fired_event_ids: ['rbih_state_identity'],
                    pending_event_decisions: [{
                        event_id: 'rbih_state_identity',
                        faction: 'RBiH',
                        requires_player_response: true,
                    }],
                    event_decision_log: [],
                },
            },
        };
        const catalog = new Map<string, EventDefinition>([
            ['rbih_state_identity', buildDecisionEventDef('rbih_state_identity')],
        ]);

        const entries = generateChronicleEntries(state as any, catalog);

        expect(entries.some(e => e.title === 'What Is Bosnia?')).toBe(false);
        expect(entries.some(e => e.title === 'Barracks seized')).toBe(true);
    });

    it('does not render bot or foreign decision log rows as generic Chronicle events', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 6,
            turnSummaries: [makeTurnSummary(6, {
                events_fired: [
                    { id: 'rs_strategic_goals', text: 'The Assembly Speaks' },
                    { id: 'hrhb_political_goal', text: 'Herceg-Bosna Declares Its Goal' },
                    { id: 'market_shelling', text: 'Market shelling reported' },
                ],
            })],
            rawGameState: {
                meta: { player_faction: 'RBiH' },
                military: {
                    event_decision_log: [
                        {
                            event_id: 'rs_strategic_goals',
                            response_id: 'all_six',
                            faction: 'RS',
                            decision_source: 'bot_ai_default',
                            turn: 6,
                        },
                        {
                            event_id: 'hrhb_political_goal',
                            response_id: 'croat_republic',
                            faction: 'HRHB',
                            decision_source: 'player',
                            turn: 6,
                        },
                    ],
                },
            },
        };
        const catalog = new Map<string, EventDefinition>([
            ['rs_strategic_goals', buildDecisionEventDef('rs_strategic_goals')],
            ['hrhb_political_goal', buildDecisionEventDef('hrhb_political_goal')],
        ]);

        const entries = generateChronicleEntries(state as any, catalog);

        expect(entries.some(e => e.title === 'The Assembly Speaks')).toBe(false);
        expect(entries.some(e => e.title === 'Herceg-Bosna Declares Its Goal')).toBe(false);
        expect(entries.some(e => e.title === 'Market shelling reported')).toBe(true);
    });

    it('renders a decision fired ID from turn summaries when the loaded player filed the matching decision row', () => {
        const state = {
            player_faction: 'RS',
            turn: 7,
            turnSummaries: [makeTurnSummary(7, {
                events_fired: [{ id: 'rs_strategic_goals', text: 'The Assembly Speaks' }],
            })],
            rawGameState: {
                meta: { player_faction: 'RS' },
                military: {
                    event_decision_log: [{
                        event_id: 'rs_strategic_goals',
                        response_id: 'all_six',
                        faction: 'RS',
                        decision_source: 'player',
                        turn: 7,
                    }],
                },
            },
        };
        const catalog = new Map<string, EventDefinition>([
            ['rs_strategic_goals', buildDecisionEventDef('rs_strategic_goals')],
        ]);

        const entries = generateChronicleEntries(state as any, catalog);

        expect(entries).toContainEqual(expect.objectContaining({
            turn: 7,
            type: 'political',
            title: 'The Assembly Speaks',
        }));
    });

    it('keeps legacy no-log turn-summary decision IDs when no ownership substrate exists', () => {
        const state = {
            player_faction: 'RS',
            turn: 7,
            turnSummaries: [makeTurnSummary(7, {
                events_fired: [{ id: 'rs_strategic_goals', text: 'The Assembly Speaks' }],
            })],
            rawGameState: {
                meta: { player_faction: 'RS' },
                military: {
                    fired_event_ids: ['rs_strategic_goals'],
                },
            },
        };
        const catalog = new Map<string, EventDefinition>([
            ['rs_strategic_goals', buildDecisionEventDef('rs_strategic_goals')],
        ]);

        const entries = generateChronicleEntries(state as any, catalog);

        expect(entries.some(e => e.title === 'The Assembly Speaks')).toBe(true);
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

    it('creates humanitarian card for large displacement without raw faction ids', () => {
        const state = {
            turn: 8,
            turnSummaries: [{
                turn: 8,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 1700, displacement_by_ethnicity: { RBiH: 1200, RS: 300, HRHB: 200 },
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const humanitarian = entries.filter(e => e.type === 'humanitarian');
        expect(humanitarian.length).toBeGreaterThan(0);
        expect(humanitarian[0].metadata?.displaced).toBe(1700);
        expect(humanitarian[0].detail).toContain('1700 displaced');
        expect(humanitarian[0].detail).toContain('Bosniaks: 1200');
        expect(humanitarian[0].detail).toContain('Serbs: 300');
        expect(humanitarian[0].detail).toContain('Croats: 200');
        expect(humanitarian[0].detail).not.toMatch(/\b(?:RBiH|RS|HRHB)\b/);
    });

    it('uses player-facing plural labels for displacement ethnicity keys', () => {
        const state = {
            turn: 8,
            turnSummaries: [makeTurnSummary(8, {
                displacement_total: 1750,
                displacement_by_ethnicity: { Bosniak: 1200, Serb: 300, Croat: 200, Other: 50 },
            })],
        };

        const humanitarian = generateChronicleEntries(state as any).find(e => e.type === 'humanitarian');

        expect(humanitarian?.detail).toContain('Bosniaks: 1200');
        expect(humanitarian?.detail).toContain('Serbs: 300');
        expect(humanitarian?.detail).toContain('Croats: 200');
        expect(humanitarian?.detail).toContain('Others: 50');
        expect(humanitarian?.detail).not.toMatch(/\b(?:Bosniak|Serb|Croat|Other):/);
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

    it('does not emit normal Chronicle entries from turn-zero setup summaries', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 0,
            turnSummaries: [makeTurnSummary(0, {
                battles: [{
                    osid: 'op:test:test_1',
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH',
                    outcome: 'breakthrough',
                    attacker_casualties: 20,
                    defender_casualties: 80,
                    territory_flipped: false,
                }],
                displacement_total: 1250,
                displacement_by_ethnicity: { Bosniak: 1000, Serb: 250 },
                territory_net: { RBiH: 3, RS: -3 },
                formation_spawns: [{ formation_id: 'arbih_setup', formation_name: 'Setup Brigade', faction: 'RBiH' }],
                formation_destructions: [{ formation_id: 'rs_setup', formation_name: 'Setup Loss', faction: 'RS' }],
                notable_events: [{ id: 'setup-note', text: 'Setup note' }],
            })],
        };

        const entries = generateChronicleEntries(state as any);

        expect(entries.filter(e => e.turn === 0 && ['combat', 'cost', 'humanitarian', 'military', 'narrative'].includes(e.type))).toEqual([]);
        expect(entries.map(e => `${e.title} ${e.detail}`).join('\n')).not.toContain('Setup Brigade');
        expect(entries.map(e => `${e.title} ${e.detail}`).join('\n')).not.toContain('Setup Loss');
        expect(entries.map(e => `${e.title} ${e.detail}`).join('\n')).not.toContain('Setup note');
        expect(entries.map(e => `${e.title} ${e.detail}`).join('\n')).not.toContain('1250 displaced');
    });

    it('does not emit normal Chronicle entries from explicit setup-control summaries after turn zero', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 1,
            turnSummaries: [makeTurnSummary(1, {
                mechanism: 'setup_control',
                battles: [{
                    osid: 'op:test:test_1',
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH',
                    outcome: 'breakthrough',
                    attacker_casualties: 20,
                    defender_casualties: 80,
                    territory_flipped: false,
                }],
                displacement_total: 1250,
                displacement_by_ethnicity: { Bosniak: 1000, Serb: 250 },
                territory_net: { RBiH: 3, RS: -3 },
                formation_spawns: [{ formation_id: 'arbih_setup', formation_name: 'Setup Brigade', faction: 'RBiH' }],
                formation_destructions: [{ formation_id: 'rs_setup', formation_name: 'Setup Loss', faction: 'RS' }],
                notable_events: [{ id: 'setup-note', text: 'Setup note' }],
            })],
        };

        const entries = generateChronicleEntries(state as any);

        expect(entries.filter(e => e.turn === 1 && ['combat', 'cost', 'humanitarian', 'military', 'narrative'].includes(e.type))).toEqual([]);
        expect(entries.map(e => `${e.title} ${e.detail}`).join('\n')).not.toContain('Setup Brigade');
        expect(entries.map(e => `${e.title} ${e.detail}`).join('\n')).not.toContain('Setup Loss');
        expect(entries.map(e => `${e.title} ${e.detail}`).join('\n')).not.toContain('1250 displaced');
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

    it('does not convert unreported battle casualties into zero-cost Chronicle metadata', () => {
        const state = {
            player_faction: 'RBiH',
            turnSummaries: [{
                turn: 9,
                battles: [{
                    osid: 'op:test:test_1',
                    attacker_faction: 'RBiH',
                    defender_faction: 'RS',
                    outcome: 'stalemate',
                    casualties_reported: false,
                    territory_flipped: false,
                }],
                notable_flips: [], notable_events: [], events_fired: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 2600, displacement_by_ethnicity: {},
                territory_net: { RBiH: 0 }, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };

        const cost = generateChronicleEntries(state as any).find(e => e.type === 'cost');
        expect(cost).toBeTruthy();
        expect(cost?.metadata?.casualties).toBeUndefined();
        expect(cost?.detail).toContain('2600');
        expect(cost?.detail).not.toMatch(/casualt/i);
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
        expect(spotlight?.detail).toContain('1/2 objectives held at close');
        expect(spotlight?.detail).not.toContain('1/2 objectives |');
        expect(spotlight?.metadata?.operationAarId).toBe('op-vitez-relief');
    });

    it('does not promote final-held-only operation objectives as captured Chronicle achievements', () => {
        const state = {
            player_faction: 'RBiH',
            turn: 24,
            turnSummaries: [makeTurnSummary(24)],
            operationHistory: [{
                operation_id: 'op-final-held',
                operation_name: 'Final Held Probe',
                corps_id: 'arbih_3rd_corps',
                faction: 'RBiH',
                started_turn: 20,
                ended_turn: 24,
                outcome: 'partial',
                commander_name: 'Enver Hadzihasanovic',
                commander_rank: 'General',
                objectives_targeted: ['op:vitez:vitez_1', 'op:vitez:vitez_2'],
                objectives_captured: ['op:vitez:vitez_1'],
                objectives_logged_captured: [],
                objectives_held_without_logged_capture: ['op:vitez:vitez_1'],
                total_attacks: 4,
                casualties_suffered: { killed: 20, wounded: 50 },
                casualties_inflicted: { killed: 35, wounded: 90 },
                grade: { stars: 3, verdict: 'costly partial success', factors: {} },
                weekly_log: [],
            }],
        };

        const entries = generateChronicleEntries(state as any);
        const operation = entries.find(e => e.id === 'operation-aar-op-final-held');
        const spotlight = entries.find(e => e.id === 'officer-week-op-final-held');

        expect(operation?.headline).toBe(false);
        expect(spotlight?.headline).toBe(false);
        expect(operation?.detail).toContain('0/2 objectives captured in execution; 1 held at close');
        expect(spotlight?.detail).toContain('0/2 objectives captured in execution; 1 held at close');
        expect(operation?.detail).not.toContain('1/2 objectives held at close');
    });

    it('keeps generated Chronicle scaffolding localized in BCS mode while preserving names', () => {
        setLocale('bcs');
        const state = {
            player_faction: 'RBiH',
            turn: 188,
            gameOver: true,
            historicalComparison: {
                divergence_notes: ['War lasted 18 weeks shorter than the historical 188 weeks'],
                rupture_divergence: ['srebrenica_genocide_1995'],
            },
            turnSummaries: [makeTurnSummary(24, {
                battles: [{
                    osid: 'op:brcko:brcko_2',
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH',
                    outcome: 'partial',
                    attacker_casualties: 35,
                    defender_casualties: 120,
                    territory_flipped: true,
                }],
                displacement_total: 1750,
                displacement_by_ethnicity: { Bosniak: 1200 },
                formation_spawns: [{ formation_id: 'arbih_new', formation_name: '312th Brigade', faction: 'RBiH' }],
                formation_destructions: [{ formation_id: 'arbih_lost', formation_name: '305th Brigade', faction: 'RBiH' }],
                territory_net: { RBiH: -2, RS: 2 },
            })],
            operationHistory: [{
                operation_id: 'op-vitez-relief',
                operation_name: 'Vitez Relief',
                corps_id: 'arbih_3rd_corps',
                faction: 'RBiH',
                ended_turn: 24,
                outcome: 'partial',
                commander_name: 'Enver Hadzihasanovic',
                commander_rank: 'General',
                objectives_targeted: ['a', 'b'],
                objectives_captured: ['a'],
                total_attacks: 4,
                casualties_suffered: { killed: 20, wounded: 50 },
                casualties_inflicted: { killed: 35, wounded: 90 },
                grade: { stars: 3 },
            }],
        };

        const entries = generateChronicleEntries(state as any);
        const text = entries.map((e) => `${e.title} ${e.detail}`).join('\n');

        expect(text).toContain('Bitka za');
        expect(text).toContain('Talas raseljavanja');
        expect(text).toContain('312th Brigade formirana');
        expect(text).toContain('305th Brigade unistena');
        expect(text).toContain('Vitez Relief zakljucena');
        expect(text).toContain('Oficir sedmice: General Enver Hadzihasanovic');
        expect(text).toContain('Historija je vodila vlastitu knjigu');
        expect(text).not.toMatch(/\b(?:Battle of|Displacement wave|formed|destroyed|Officer of the Week|History kept its own ledger|friendly casualties|objectives held at close|attacks|stars)\b/);
    });
});
