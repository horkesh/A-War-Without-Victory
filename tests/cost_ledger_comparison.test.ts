import { describe, it, expect } from 'vitest';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
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
    return {
        war_duration_weeks: 182,
        territory_final: { RS: 49, RBiH_HRHB_Federation: 51 },
        total_killed: 97207,
        military_killed: { RBiH: 31270, RS: 21173, HRHB: 7788 },
        civilian_killed: 38476,
        total_displaced: 2200000,
        srebrenica_killed: 8372,
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

        expect(ledger.findings.map((f) => f.id)).toEqual([
            'human_cost_record',
            'civilian_displacement_record',
            'rupture_srebrenica_genocide_1995',
            'war_crimes_record_RS',
            'war_crimes_record_RBiH',
            'war_crimes_record_HRHB',
        ]);
        const rupture = ledger.findings.find((f) => f.id === 'rupture_srebrenica_genocide_1995')!;
        expect(rupture.text).toContain('Srebrenica genocide');
        expect(rupture.text).toContain('8,000');
        expect(rupture.sources.join(' ')).toContain('ICTY');
        expect(rupture.sources.join(' ')).toContain('ICJ Bosnia v. Serbia');
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
    it('computes correct duration delta', () => {
        const state = makeState({ turn: 200 });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline);

        expect(result.duration_delta_weeks).toBe(200 - 182);
        expect(result.divergence_notes.some(n => n.includes('18 weeks longer'))).toBe(true);
    });

    it('computes correct negative duration delta', () => {
        const state = makeState({ turn: 100 });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline);

        expect(result.duration_delta_weeks).toBe(100 - 182);
        expect(result.divergence_notes.some(n => n.includes('82 weeks shorter'))).toBe(true);
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

    it('generates Srebrenica survived note when no rupture', () => {
        const state = makeState();
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline);

        expect(result.rupture_divergence).toHaveLength(0);
        expect(result.divergence_notes.some(n => n.includes('Srebrenica enclave survived'))).toBe(true);
    });

    it('generates divergence note for duration', () => {
        const state = makeState({ turn: 182 });
        const ledger = buildCostLedger(state);
        const baseline = makeBaseline();
        const result = compareToHistorical(ledger, baseline);

        expect(result.duration_delta_weeks).toBe(0);
        expect(result.divergence_notes.some(n => n.includes('exactly the historical'))).toBe(true);
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
