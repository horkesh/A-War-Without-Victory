import { describe, it, expect } from 'vitest';
import { buildCostLedger, COST_LEDGER_SOURCES, SREBRENICA_FINDING_TEXT } from '../src/sim/endgame/cost_ledger.js';
import { compareToHistorical } from '../src/sim/endgame/endgame_comparison.js';
import type { CostLedger } from '../src/sim/endgame/cost_ledger.js';
import {
    createEmptyCapital,
    createDefaultPatronRelationship,
} from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown, HistoricalBaseline, NegotiationState, RuptureConsequence } from '../src/state/negotiation_types.js';
import type { CasualtyLedger } from '../src/state/casualty_ledger.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeBreakdown(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return { ...createEmptyCapital(), ...overrides };
}

function makeNegotiationState(
    factionBreakdowns: Record<string, Partial<NegotiationBreakdown>> = {},
    ruptures: RuptureConsequence[] = [],
): NegotiationState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, ReturnType<typeof createDefaultPatronRelationship>> = {};
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        capital[fid] = makeBreakdown(factionBreakdowns[fid] ?? {});
        patron_relationships[fid] = createDefaultPatronRelationship(fid);
    }
    return {
        capital,
        patron_relationships,
        peace_plan_history: [],
        strategic_dimensions: initializeStrategicDimensions(),
        rupture_consequences: ruptures,
    };
}

function makeState(overrides: {
    turn?: number;
    casualtyLedger?: CasualtyLedger;
    factionBreakdowns?: Record<string, Partial<NegotiationBreakdown>>;
    ruptures?: RuptureConsequence[];
    civilianCasualties?: Record<string, { killed: number; fled_abroad: number }>;
    opportunityResolutions?: unknown[];
    opportunities?: unknown[];
    operationHistory?: unknown[];
} = {}): GameState {
    const {
        turn = 40,
        casualtyLedger,
        factionBreakdowns = {},
        ruptures = [],
        civilianCasualties = {},
        opportunityResolutions = [],
        opportunities = [],
        operationHistory = [],
    } = overrides;

    const cl = casualtyLedger ?? initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);

    return {
        meta: { turn, phase: 'war', seed: 1, date: '1993-01-15' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: makeNegotiationState(factionBreakdowns, ruptures),
            casualty_ledger: cl,
            operation_opportunity_resolutions: opportunityResolutions,
            operation_opportunities: opportunities,
        },
        operation_history: operationHistory,
        political: {
            political_controllers: {},
        },
        displacement: {
            civilian_casualties: civilianCasualties,
        },
    } as unknown as GameState;
}

function makeBaseline(overrides: Partial<HistoricalBaseline> = {}): HistoricalBaseline {
    // Mirrors data/reference/historical_baseline.json after the R8 ending truth pass:
    // Dayton initialled week 189 (settlement), ceasefire in force week 183 (no settlement),
    // RDC 2007 military 57,523 + civilian 39,684 = 97,207.
    return {
        war_duration_weeks: 189,
        fighting_end_week: 183,
        territory_final: { RS: 49, RBiH_HRHB_Federation: 51 },
        total_killed: 97207,
        military_killed_total: 57523,
        military_killed: { RBiH: 30906, RS: 20775, HRHB: 5919 },
        civilian_killed: 39684,
        total_displaced: 2200000,
        srebrenica_killed: 8372,
        milestones: [
            {
                id: 'srebrenica_genocide_1995',
                label: 'Srebrenica Genocide',
                historical_week: 170,
                kind: 'rupture',
                event_id: 'srebrenica_genocide_1995',
                source_notes: 'ICTY Krstic judgment',
            },
            {
                id: 'ceasefire_1995',
                label: 'Country-wide ceasefire in force',
                historical_week: 183,
                kind: 'war_end',
                ending: 'no_settlement',
                source_notes: 'Ceasefire in force 12 Oct 1995',
            },
            {
                id: 'dayton_accords',
                label: 'Dayton Agreement initialled',
                historical_week: 189,
                kind: 'war_end',
                ending: 'settlement',
                source_notes: 'Dayton Agreement initialled 21 Nov 1995',
            },
        ],
        source_notes: 'RDC 2007',
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// buildCostLedger
// ═══════════════════════════════════════════════════════════════════════════

describe('buildCostLedger', () => {
    it('produces one entry per canonical faction', () => {
        const state = makeState();
        const ledger = buildCostLedger(state);
        expect(ledger.entries).toHaveLength(3);
        const factions = ledger.entries.map(e => e.faction);
        expect(factions).toContain('RBiH');
        expect(factions).toContain('RS');
        expect(factions).toContain('HRHB');
    });

    it('reads military_killed from casualty_ledger', () => {
        const cl = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
        cl.RBiH!.killed = 5000;
        cl.RS!.killed = 3000;
        cl.HRHB!.killed = 1000;

        const state = makeState({ casualtyLedger: cl });
        const ledger = buildCostLedger(state);

        const rbih = ledger.entries.find(e => e.faction === 'RBiH')!;
        const rs = ledger.entries.find(e => e.faction === 'RS')!;
        const hrhb = ledger.entries.find(e => e.faction === 'HRHB')!;

        expect(rbih.military_killed).toBe(5000);
        expect(rs.military_killed).toBe(3000);
        expect(hrhb.military_killed).toBe(1000);
        expect(ledger.total_military_killed).toBe(9000);
    });

    it('reads territory from negotiation capital', () => {
        const state = makeState({
            factionBreakdowns: {
                RS: { territory_controlled_pct: 49.2 },
                RBiH: { territory_controlled_pct: 30.1 },
                HRHB: { territory_controlled_pct: 15.5 },
            },
        });
        const ledger = buildCostLedger(state);

        const rs = ledger.entries.find(e => e.faction === 'RS')!;
        const rbih = ledger.entries.find(e => e.faction === 'RBiH')!;
        const hrhb = ledger.entries.find(e => e.faction === 'HRHB')!;

        expect(rs.territory_controlled_pct).toBe(49.2);
        expect(rbih.territory_controlled_pct).toBe(30.1);
        expect(hrhb.territory_controlled_pct).toBe(15.5);
    });

    it('includes rupture_consequences from upstream', () => {
        const ruptures: RuptureConsequence[] = [
            {
                id: 'srebrenica_genocide_1995',
                recorded_turn: 160,
                perpetrator_faction: 'RS',
                description: 'Fall of the Srebrenica safe area and subsequent genocide of Bosniak men and boys',
                condemnation_flag: 'genocide_condemnation',
            },
        ];
        const state = makeState({ ruptures });
        const ledger = buildCostLedger(state);

        expect(ledger.rupture_consequences).toHaveLength(1);
        expect(ledger.rupture_consequences[0].id).toBe('srebrenica_genocide_1995');
        expect(ledger.rupture_consequences[0].perpetrator_faction).toBe('RS');
        expect(ledger.rupture_consequences[0].recorded_turn).toBe(160);
    });

    it('is deterministic — same input produces same output', () => {
        const cl = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
        cl.RBiH!.killed = 2500;
        cl.RS!.killed = 1800;
        const ruptures: RuptureConsequence[] = [
            {
                id: 'srebrenica_genocide_1995',
                recorded_turn: 160,
                perpetrator_faction: 'RS',
                description: 'Fall of Srebrenica',
                condemnation_flag: 'genocide_condemnation',
            },
        ];
        const state = makeState({
            turn: 52,
            casualtyLedger: cl,
            factionBreakdowns: {
                RS: { territory_controlled_pct: 49 },
                RBiH: { territory_controlled_pct: 30 },
                HRHB: { territory_controlled_pct: 15 },
            },
            ruptures,
        });

        const ledger1 = buildCostLedger(state);
        const ledger2 = buildCostLedger(state);

        expect(JSON.stringify(ledger1)).toBe(JSON.stringify(ledger2));
    });

    it('builds prosecutorial findings with ICTY/ICJ sources and integer counts', () => {
        const cl = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
        cl.RBiH!.killed = 31000;
        cl.RS!.killed = 12000;
        cl.HRHB!.killed = 3500;
        const ruptures: RuptureConsequence[] = [
            {
                id: 'srebrenica_genocide_1995',
                recorded_turn: 160,
                perpetrator_faction: 'RS',
                description: 'Fall of the Srebrenica safe area',
                condemnation_flag: 'genocide_condemnation',
            },
        ];
        const state = makeState({
            casualtyLedger: cl,
            factionBreakdowns: {
                RBiH: { refugees_created: 1200000, civilian_casualties_caused: 2000, war_crimes_events: 5 },
                RS: { refugees_created: 600000, civilian_casualties_caused: 35000, war_crimes_events: 35 },
                HRHB: { refugees_created: 150000, civilian_casualties_caused: 1000, war_crimes_events: 3 },
            },
            civilianCasualties: {
                RBiH: { killed: 2000, fled_abroad: 0 },
                RS: { killed: 35000, fled_abroad: 0 },
                HRHB: { killed: 1000, fled_abroad: 0 },
            },
            ruptures,
        });

        const ledger = buildCostLedger(state);

        // War-crimes cards follow the fixed side order (RBiH, RS, HRHB), never ranked by count.
        expect(ledger.findings.map((f) => f.id)).toEqual([
            'human_cost_record',
            'civilian_displacement_record',
            'rupture_srebrenica_genocide_1995',
            'war_crimes_record_RBiH',
            'war_crimes_record_RS',
            'war_crimes_record_HRHB',
        ]);
        const rupture = ledger.findings.find((f) => f.id === 'rupture_srebrenica_genocide_1995')!;
        expect(rupture.title).toBe('Srebrenica genocide');
        expect(rupture.text).toBe(SREBRENICA_FINDING_TEXT);
        expect(rupture.text).toContain('genocide');
        expect(rupture.text).toContain('8,000');
        expect(rupture.text).toContain('8,372');
        expect(rupture.sources).toEqual([COST_LEDGER_SOURCES.srebrenica]);
        expect(rupture.sources.join(' ')).toContain('ICTY');
        expect(rupture.sources.join(' ')).toContain('ICJ, Bosnia and Herzegovina v. Serbia and Montenegro (2007)');
        // Findings that count the campaign's own record carry no source (no court counted game events).
        for (const finding of ledger.findings.filter((f) => f.id !== rupture.id)) {
            expect(finding.sources).toEqual([]);
        }
        expect(ledger.findings.find((f) => f.id === 'human_cost_record')!.text).toBe(
            'This campaign recorded 46,500 military dead and 38,000 civilian dead on all sides.',
        );
        expect(ledger.findings.find((f) => f.id === 'war_crimes_record_RS')!.text).toBe(
            'This campaign recorded 35 war-crime events by Bosnian Serb forces.',
        );
        for (const finding of ledger.findings) {
            expect(finding.text).not.toMatch(/\byou\b/i);
            expect(finding.text).not.toMatch(/less costly|more costly|achievement|badge/i);
        }
    });

    it('summarizes opportunity decisions and linked AAR outcomes', () => {
        const state = makeState({
            opportunityResolutions: [
                {
                    proposal_id: 'OPP_175_sana_95',
                    opportunity_id: 'sana_95',
                    response: 'approve',
                    response_turn: 175,
                    executed_op_name: 'Operation Sana',
                    executed_op_aar_id: 'aar_sana_95',
                    exit_class: 'partial_success',
                },
                {
                    proposal_id: 'OPP_178_failed_probe',
                    opportunity_id: 'failed_probe',
                    response: 'decline',
                    response_turn: 178,
                },
            ],
            opportunities: [
                {
                    proposal_id: 'OPP_175_sana_95',
                    opportunity_id: 'sana_95',
                    approver_faction: 'RBiH',
                    eligibility_turn: 175,
                    expires_turn: 199,
                    status: 'approved',
                    last_axis_evaluation: [],
                },
                {
                    proposal_id: 'OPP_178_failed_probe',
                    opportunity_id: 'failed_probe',
                    approver_faction: 'RS',
                    eligibility_turn: 178,
                    expires_turn: 202,
                    status: 'declined',
                    last_axis_evaluation: [],
                },
            ],
            operationHistory: [
                {
                    operation_id: 'aar_sana_95',
                    operation_name: 'Operation Sana',
                    corps_id: 'arbih_5th_corps',
                    faction: 'RBiH',
                    type: 'offensive',
                    started_turn: 175,
                    ended_turn: 187,
                    outcome: 'partial',
                    objectives_targeted: ['op:sanski_most:sanski_most_2', 'op:kljuc:kljuc_2'],
                    objectives_captured: ['op:sanski_most:sanski_most_2'],
                    duration_turns: 12,
                    total_attacks: 7,
                    casualties_suffered: { killed: 80, wounded: 220 },
                    casualties_inflicted: { killed: 140, wounded: 300 },
                    equipment_lost: { tanks: 0, artillery: 1 },
                    equipment_destroyed: { tanks: 1, artillery: 2 },
                    equipment_captured: { tanks: 0, artillery: 1 },
                    participating_brigades: ['arbih_501st_slavna_mountain'],
                    initial_strength: 4200,
                    final_strength: 3900,
                    grade: {
                        stars: 3,
                        verdict: 'Partial Success',
                        factors: {
                            objective_completion: 50,
                            exchange_ratio: 60,
                            tempo: 70,
                            preservation: 92,
                        },
                    },
                    weekly_log: [],
                },
            ],
        });

        const ledger = buildCostLedger(state);
        const opportunities = ledger.operation_opportunities!;

        expect(opportunities.total_decisions).toBe(2);
        expect(opportunities.approved).toBe(1);
        expect(opportunities.declined).toBe(1);
        expect(opportunities.completed).toBe(1);
        expect(opportunities.successes).toBe(1);
        expect(opportunities.by_faction.RBiH.successes).toBe(1);
        expect(opportunities.by_faction.RS.declined).toBe(1);
        expect(opportunities.entries[0]).toMatchObject({
            proposal_id: 'OPP_175_sana_95',
            opportunity_id: 'sana_95',
            faction: 'RBiH',
            response: 'approve',
            exit_class: 'partial_success',
            aar_outcome: 'partial',
            total_attacks: 7,
            objectives_targeted: 2,
            objectives_captured: 1,
            grade_stars: 3,
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// compareToHistorical
// ═══════════════════════════════════════════════════════════════════════════

describe('compareToHistorical', () => {
    it('computes correct duration delta against the Dayton initialling for a settled campaign', () => {
        const state = makeState({ turn: 200 });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline);

        // Default ending is 'settlement': reference week 189 (Dayton initialled).
        expect(result.duration_delta_weeks).toBe(200 - 189);
        expect(result.historical_reference_week).toBe(189);
        expect(result.historical_reference_basis).toBe('settlement');
        // No "War lasted N weeks longer/shorter" note any more (§4 panel 2026-11-14).
        expect(result.divergence_notes.some(n => n.startsWith('War lasted'))).toBe(false);
    });

    it('computes correct negative duration delta against the ceasefire for a campaign without a settlement', () => {
        const state = makeState({ turn: 100 });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline, 'no_settlement');

        // 'no_settlement': reference week 183 (ceasefire in force, fighting_end_week).
        expect(result.duration_delta_weeks).toBe(100 - 183);
        expect(result.historical_reference_week).toBe(183);
        expect(result.historical_reference_basis).toBe('no_settlement');
        expect(result.divergence_notes.some(n => /weeks (shorter|longer)/.test(n))).toBe(false);
    });

    it('computes correct territory divergence', () => {
        const state = makeState({
            factionBreakdowns: {
                RS: { territory_controlled_pct: 55 },
                RBiH: { territory_controlled_pct: 28 },
                HRHB: { territory_controlled_pct: 12 },
            },
        });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline);

        // RS: 55 - 49 = 6
        expect(result.territory_divergence.RS).toBe(6);
        // Federation: (28 + 12) - 51 = -11
        expect(result.territory_divergence.RBiH_HRHB_Federation).toBe(-11);
    });

    it('generates divergence note for Srebrenica rupture', () => {
        const ruptures: RuptureConsequence[] = [
            {
                id: 'srebrenica_genocide_1995',
                recorded_turn: 160,
                perpetrator_faction: 'RS',
                description: 'Fall of Srebrenica',
                condemnation_flag: 'genocide_condemnation',
            },
        ];
        const state = makeState({ ruptures });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline);

        expect(result.rupture_divergence).toContain('srebrenica_genocide_1995');
        expect(result.divergence_notes.some(n => n.includes('Srebrenica genocide occurred'))).toBe(true);
    });

    it('emits only the war-end milestone row matching the ending, never a rupture timing row', () => {
        const ruptures: RuptureConsequence[] = [
            {
                id: 'srebrenica_genocide_1995',
                recorded_turn: 160,
                perpetrator_faction: 'RS',
                description: 'Fall of Srebrenica',
                condemnation_flag: 'genocide_condemnation',
            },
        ];
        const state = makeState({ turn: 188, ruptures });
        const ledger = buildCostLedger(state);

        const settled = compareToHistorical(ledger, makeBaseline());
        expect(settled.milestone_comparison?.map(row => row.id)).toEqual(['dayton_accords']);
        expect(settled.milestone_comparison?.[0]).toMatchObject({
            id: 'dayton_accords',
            historical_week: 189,
            player_week: 188,
            delta_weeks: -1,
            status: 'early',
        });

        const unsettled = compareToHistorical(ledger, makeBaseline(), 'no_settlement');
        expect(unsettled.milestone_comparison?.map(row => row.id)).toEqual(['ceasefire_1995']);
        expect(unsettled.milestone_comparison?.[0]).toMatchObject({
            id: 'ceasefire_1995',
            historical_week: 183,
            player_week: 188,
            delta_weeks: 5,
            status: 'late',
        });
    });

    it('never emits a rupture milestone row, whether or not the run recorded the rupture', () => {
        const state = makeState({ turn: 189 });
        const ledger = buildCostLedger(state);
        const result = compareToHistorical(ledger, makeBaseline());

        expect(result.milestone_comparison?.find(row => row.id === 'srebrenica_genocide_1995')).toBeUndefined();
        expect(result.milestone_comparison?.map(row => row.id)).toEqual(['dayton_accords']);

        const withRupture = compareToHistorical(buildCostLedger(makeState({
            turn: 189,
            ruptures: [{
                id: 'srebrenica_genocide_1995',
                recorded_turn: 165,
                perpetrator_faction: 'RS',
                description: 'Fall of Srebrenica',
                condemnation_flag: 'genocide_condemnation',
            }],
        })), makeBaseline());
        expect(withRupture.milestone_comparison?.map(row => row.id)).toEqual(['dayton_accords']);
        // The rupture stays recorded in the divergence list and note, just not as a timing row.
        expect(withRupture.rupture_divergence).toContain('srebrenica_genocide_1995');
    });

    it('generates the Srebrenica survived note only for a war that reached the rupture window (week 160)', () => {
        const baseline = makeBaseline();

        const longWar = compareToHistorical(buildCostLedger(makeState({ turn: 160 })), baseline);
        expect(longWar.rupture_divergence).toHaveLength(0);
        expect(longWar.divergence_notes).toContain('Srebrenica enclave survived');

        const shortWar = compareToHistorical(buildCostLedger(makeState({ turn: 159 })), baseline);
        expect(shortWar.rupture_divergence).toHaveLength(0);
        expect(shortWar.divergence_notes.some(n => n.includes('Srebrenica enclave survived'))).toBe(false);
    });

    it('states military and civilian killed as counts against the matching historical figures', () => {
        const cl = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
        cl.RBiH!.killed = 20000;
        cl.RS!.killed = 9000;
        cl.HRHB!.killed = 1523;
        const state = makeState({
            turn: 189,
            casualtyLedger: cl,
            civilianCasualties: {
                RBiH: { killed: 12000, fled_abroad: 0 },
                RS: { killed: 3000, fled_abroad: 0 },
                HRHB: { killed: 842, fled_abroad: 0 },
            },
        });
        const ledger = buildCostLedger(state);
        const result = compareToHistorical(ledger, makeBaseline());

        expect(result.duration_delta_weeks).toBe(0);
        expect(result.divergence_notes.some(n => n.startsWith('War lasted'))).toBe(false);
        // Military against military (57,523), civilian against civilian (39,684), RDC 2007.
        expect(result.historical_military_killed).toBe(57523);
        expect(result.historical_civilian_killed).toBe(39684);
        expect(result.casualty_ratio).toBeCloseTo(ledger.total_military_killed / 57523, 10);
        expect(result.civilian_ratio).toBeCloseTo(ledger.total_civilian_killed / 39684, 10);
        expect(result.divergence_notes).toContain(
            `Military killed: ${ledger.total_military_killed.toLocaleString('en-US')} in this campaign; 57,523 in the historical war`,
        );
        expect(result.divergence_notes).toContain(
            `Civilians killed: ${ledger.total_civilian_killed.toLocaleString('en-US')} in this campaign; 39,684 in the historical war`,
        );
        // No percentage-of-history phrasing (Sensitive History Design Gate §4).
        expect(result.divergence_notes.some(n => /% of historical/.test(n))).toBe(false);
    });

    it('comparison inputs are explicit and serializable (JSON round-trip)', () => {
        const cl = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
        cl.RBiH!.killed = 4000;
        const state = makeState({
            turn: 52,
            casualtyLedger: cl,
            factionBreakdowns: {
                RS: { territory_controlled_pct: 50 },
                RBiH: { territory_controlled_pct: 30 },
                HRHB: { territory_controlled_pct: 15 },
            },
        });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();

        // Round-trip both inputs through JSON
        const ledgerRT: CostLedger = JSON.parse(JSON.stringify(ledger));
        const baselineRT: HistoricalBaseline = JSON.parse(JSON.stringify(baseline));

        const result1 = compareToHistorical(ledger, baseline);
        const result2 = compareToHistorical(ledgerRT, baselineRT);

        expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });
});
