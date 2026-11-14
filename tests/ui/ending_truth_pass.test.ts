/**
 * R8 council fix 1 — "Make the ending tell one true story" (Verdict and Dayton signing).
 *
 * Pins: one headline logic that holds the grade, the Dayton cap and the Srebrenica record
 * without condemning the victim faction; the cap shown; every casualty and territory figure
 * with its basis; like-for-like historical comparison (RDC 2007, Dayton initialled / ceasefire);
 * one paramilitary card; public sources only; decisions ranked without sensitive history; each
 * side's own peace-dysfunction reading. §4 sensitive-copy panel 2026-11-14.
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/state/game_state.js';
import type {
    DaytonResult,
    FactionVerdict,
    GameVerdict,
    HistoricalBaseline,
    OutcomeClass,
    VerdictGradeTrace,
} from '../../src/state/negotiation_types.js';
import type { CostLedger, CostLedgerFinding } from '../../src/sim/endgame/cost_ledger.js';
import { buildCostLedger, SREBRENICA_FINDING_TEXT, COST_LEDGER_SOURCES } from '../../src/sim/endgame/cost_ledger.js';
import { compareToHistorical, historicalReferenceWeek } from '../../src/sim/endgame/endgame_comparison.js';
import { computePeaceDysfunctionBreakdown, capOutcomeByPeaceDysfunction } from '../../src/sim/negotiation/peace_dysfunction.js';
import historicalBaselineJson from '../../data/reference/historical_baseline.json';
import { buildVerdictScene } from '../../src/ui/map/data/verdictScene.js';
import { buildFactionFigureRows, countFrontLineHoldings } from '../../src/ui/map/data/verdictFigures.js';
import { buildHistoricalComparisonLines } from '../../src/ui/map/data/verdictComparison.js';
import { buildDisplayFindings } from '../../src/ui/map/data/verdictFindings.js';
import {
    buildDecisionReckoning,
    bundledEventCatalog,
    isSensitiveDecisionEvent,
} from '../../src/ui/map/data/verdictDecisions.js';
import { buildVerdictShareSummary } from '../../src/ui/map/data/verdictShareSummary.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';

const BASELINE = historicalBaselineJson as unknown as HistoricalBaseline;

function capital(territory = 33) {
    return {
        territory_controlled_pct: territory,
        territory_controlled_km2: 17000,
        civilians_under_protection: 900000,
        refugees_created: 120000,
        refugees_received: 300000,
        military_casualties_inflicted: 70000,
        military_casualties_taken: 260000,
        civilian_casualties_caused: 3000,
        enclaves_held: [],
        enclaves_lost: [],
        peace_plans_accepted: [],
        peace_plans_rejected: [],
        operations_launched: 20,
        operations_successful: 8,
        war_crimes_events: 0,
        combat_effective_brigades: 40,
    };
}

function trace(overrides: Partial<VerdictGradeTrace> = {}): VerdictGradeTrace {
    return {
        territory_basis: 'settled',
        territory_graded_pct: 33.3,
        earned_grade: 'A',
        earned_description: 'Republic survives',
        cost_step: 'human_cost_shift',
        cost_capped_grade: 'A',
        condemnation_capped_grade: 'A',
        settlement_capped_grade: 'A',
        base_outcome_class: 'survival',
        peace_dysfunction_index: 67,
        settlement_peace_dysfunction_index: 81,
        peace_dysfunction_band: 'hard',
        outcome_class: 'hollow_victory',
        ...overrides,
    };
}

function fv(faction: string, outcome: OutcomeClass, overrides: Partial<FactionVerdict> = {}): FactionVerdict {
    return {
        faction,
        pyrrhic_score: 75.3,
        grade: 'A',
        grade_description: 'Republic survives',
        capital_breakdown: capital(),
        dimension_grades: [],
        outcome_class: outcome,
        condemnation_flags: [],
        ...overrides,
    };
}

/** The R8 dry run's shape: RBiH grade A, signed historical Dayton, Srebrenica recorded (RS). */
function r8Verdict(): GameVerdict {
    return {
        outcome_type: 'dayton',
        outcome_label: 'Dayton Agreement',
        turn: 188,
        date: '13 Nov 1995',
        duration_weeks: 188,
        faction_verdicts: {
            RBiH: fv('RBiH', 'hollow_victory', { grade_trace: trace() }),
            RS: fv('RS', 'failure', {
                grade: 'D',
                condemnation_flags: ['genocide_condemnation'],
                grade_trace: trace({ earned_grade: 'B', condemnation_capped_grade: 'D', settlement_capped_grade: 'D', base_outcome_class: 'failure', outcome_class: 'failure', peace_dysfunction_band: 'none' }),
            }),
            HRHB: fv('HRHB', 'hollow_victory', { grade_trace: trace() }),
        },
        peace_dysfunction_index: 81,
    };
}

function ledger(overrides: Partial<CostLedger> = {}): CostLedger {
    return {
        war_duration_weeks: 188,
        entries: [
            { faction: 'HRHB', military_killed: 5000, military_wounded: 9000, civilian_casualties_caused: 100, refugees_created: 40000, territory_controlled_pct: 19.9, enclaves_held: [], enclaves_lost: [], war_crimes_events: 2, outcome_class: 'hollow_victory', condemnation_flags: [] },
            { faction: 'RBiH', military_killed: 20000, military_wounded: 40000, civilian_casualties_caused: 900, refugees_created: 30000, territory_controlled_pct: 31.9, enclaves_held: [], enclaves_lost: ['srebrenica'], war_crimes_events: 0, outcome_class: 'hollow_victory', condemnation_flags: [] },
            { faction: 'RS', military_killed: 18244, military_wounded: 36000, civilian_casualties_caused: 30000, refugees_created: 200000, territory_controlled_pct: 47.5, enclaves_held: [], enclaves_lost: [], war_crimes_events: 26, outcome_class: 'failure', condemnation_flags: ['genocide_condemnation'] },
        ],
        rupture_consequences: [{ id: 'srebrenica_genocide_1995', recorded_turn: 171, perpetrator_faction: 'RS', description: 'Fall of the Srebrenica safe area' }],
        total_military_killed: 43244,
        total_civilian_killed: 39724,
        findings: [],
        ...overrides,
    };
}

describe('headline logic (B1, B3): one story that holds grade, cap and the Srebrenica record', () => {
    it('RBiH grade A with a settlement cap and RS genocide: hollow peace, cap visible, never condemned', () => {
        const scene = buildVerdictScene({ verdict: r8Verdict(), costLedger: ledger(), focusFaction: 'RBiH' });
        expect(scene.headline).toBe('The Republic of Bosnia and Herzegovina ended the war in a hollow peace');
        expect(scene.headline.toLowerCase()).not.toContain('condemn');
        // "counting only its own condemnation" scopes the index; nothing condemns the side.
        expect(scene.subheadline).not.toMatch(/condemned|under condemnation|condemnation caps|permanent condemnation/i);
        expect(scene.subheadline).toContain('counting only its own condemnation');
        expect(scene.tone).not.toBe('catastrophic');
        expect(scene.focusGrade).toBe('A');
        expect(scene.focusOutcomeLabel).toBe('Hollow Victory');
        expect(scene.cap?.source).toBe('settlement');
        expect(scene.cap?.chip).toBe('Outcome capped: Survival → Hollow Victory (signed settlement)');
        expect(scene.subheadline).toContain('graded A');
        expect(scene.subheadline).toContain('67 of 100');
        expect(scene.stain?.relation).toBe('victims_state');
        expect(scene.stain?.text).toContain('committed by Bosnian Serb forces against Bosniaks');
        // The record line stands alone, never run on after the cap sentence.
        expect(scene.subheadline).not.toContain('Srebrenica');
    });

    it('the perpetrator side alone carries condemnation wording and the catastrophic tone', () => {
        const scene = buildVerdictScene({ verdict: r8Verdict(), costLedger: ledger(), focusFaction: 'RS' });
        expect(scene.tone).toBe('catastrophic');
        expect(scene.headline).toBe('Republika Srpska ended the war in failure: its forces committed the Srebrenica genocide');
        expect(scene.stain?.relation).toBe('perpetrator');
        expect(scene.stain?.text).toContain('permanent condemnation');
    });

    it('a third side is neither condemned nor framed as the victims', () => {
        const scene = buildVerdictScene({ verdict: r8Verdict(), costLedger: ledger(), focusFaction: 'HRHB' });
        expect(scene.stain?.relation).toBe('other');
        expect(scene.tone).not.toBe('catastrophic');
        expect(scene.headline.toLowerCase()).not.toContain('condemn');
    });

    it('the headline always names the same class the Outcome tile shows', () => {
        const classes: OutcomeClass[] = ['strategic_success', 'survival', 'negotiated_escape', 'pyrrhic_success', 'hollow_victory', 'failure', 'collapse'];
        for (const outcome of classes) {
            const verdict = r8Verdict();
            verdict.faction_verdicts.RBiH = fv('RBiH', outcome, { grade_trace: undefined });
            const scene = buildVerdictScene({ verdict, costLedger: ledger({ rupture_consequences: [] }), focusFaction: 'RBiH' });
            expect(scene.focusOutcomeClass).toBe(outcome);
            expect(scene.headline.startsWith('The Republic of Bosnia and Herzegovina')).toBe(true);
            expect(scene.headline.toLowerCase()).not.toContain('condemn');
        }
    });

    it('the soft band prints the 45 rule, never the 60 rule', () => {
        const verdict = r8Verdict();
        verdict.faction_verdicts.RBiH = fv('RBiH', 'survival', {
            grade: 'A+',
            grade_trace: trace({ earned_grade: 'A+', cost_capped_grade: 'A+', condemnation_capped_grade: 'A+', settlement_capped_grade: 'A+', base_outcome_class: 'strategic_success', outcome_class: 'survival', peace_dysfunction_index: 52, peace_dysfunction_band: 'soft' }),
        });
        const scene = buildVerdictScene({ verdict, costLedger: ledger(), focusFaction: 'RBiH' });
        expect(scene.subheadline).toContain('from 45');
        expect(scene.subheadline).not.toContain('60 or more');
    });

    it('a save frozen before the grade trace still shows a settlement cap', () => {
        const verdict = r8Verdict();
        verdict.faction_verdicts.RBiH = fv('RBiH', 'hollow_victory');
        const scene = buildVerdictScene({ verdict, costLedger: ledger(), focusFaction: 'RBiH' });
        expect(scene.cap?.source).toBe('settlement');
        expect(scene.cap?.index).toBe(81);
    });

    it('the share summary keeps the record line on its own line', () => {
        const text = buildVerdictShareSummary({ verdict: r8Verdict(), costLedger: ledger(), focusFaction: 'RBiH' });
        const lines = text.split('\n');
        expect(lines.some(line => line.startsWith('The Srebrenica genocide, committed by Bosnian Serb forces'))).toBe(true);
        expect(lines.some(line => line.includes('graded A') && line.includes('Srebrenica'))).toBe(false);
    });
});

describe('figures carry a basis (B6, B7)', () => {
    it('counts settlements on operational-settlement ids only, never census aliases', () => {
        const holdings = countFrontLineHoldings({ 'op:a:x': 'RBiH', 'op:a:y': 'RS', 'op:b:z': 'RS', Sa: 'RBiH', Sb: 'RS' });
        expect(holdings.RBiH).toEqual({ held: 1, total: 3 });
        expect(holdings.RS).toEqual({ held: 2, total: 3 });
    });

    it('every territory, casualty and displacement row has a basis', () => {
        const rows = buildFactionFigureRows({ verdict: fv('RBiH', 'survival'), frontLine: { held: 292, total: 712 }, settled: true, brigadeCount: 100, personnel: 170000 });
        const labelled = rows.filter(row => ['territory', 'casualty', 'displacement'].includes(row.kind));
        expect(labelled.length).toBeGreaterThanOrEqual(7);
        for (const row of labelled) expect(row.basis.trim().length).toBeGreaterThan(10);
        expect(rows.find(row => row.id === 'settlements_held')?.value).toBe('292 of 712 (41.0%)');
        expect(rows.find(row => row.id === 'territory_graded')?.basis).toContain('signed settlement');
    });
});

describe('historical comparison, like for like (B8, H1-H3)', () => {
    it('the baseline file adds up and names the two endpoints', () => {
        expect((BASELINE.military_killed_total ?? 0) + BASELINE.civilian_killed).toBe(BASELINE.total_killed);
        expect(historicalReferenceWeek(BASELINE, 'settlement')).toBe(189);
        expect(historicalReferenceWeek(BASELINE, 'no_settlement')).toBe(183);
    });

    it('divides military dead by military dead, adds a civilian ratio and writes integers', () => {
        const result = compareToHistorical(ledger(), BASELINE, 'settlement');
        expect(result.casualty_ratio).toBeCloseTo(43244 / 57523, 6);
        expect(result.civilian_ratio).toBeCloseTo(39724 / 39684, 6);
        expect(result.historical_reference_week).toBe(189);
        expect(result.divergence_notes.some(note => /%/.test(note) && /casualt|killed|dead/i.test(note))).toBe(false);
        expect(result.divergence_notes.some(note => /weeks (longer|shorter)/.test(note))).toBe(false);
        expect(result.divergence_notes).toContain('Military killed: 43,244 in this campaign; 57,523 in the historical war');
        expect((result.milestone_comparison ?? []).some(row => row.id === 'srebrenica_genocide_1995')).toBe(false);
        expect((result.milestone_comparison ?? []).map(row => row.id)).toEqual(['dayton_accords']);
    });

    it('a campaign without a settlement is compared with the ceasefire', () => {
        const result = compareToHistorical(ledger(), BASELINE, 'no_settlement');
        expect(result.historical_reference_week).toBe(183);
        expect((result.milestone_comparison ?? []).map(row => row.id)).toEqual(['ceasefire_1995']);
    });

    it('Verdict lines: real initialling date, RDC figures, siege caveat, settled shares', () => {
        const lines = buildHistoricalComparisonLines({
            verdict: r8Verdict(),
            costLedger: ledger(),
            comparison: compareToHistorical(ledger(), BASELINE, 'settlement'),
            settledShares: { RBiH: 33.3, RS: 46.8, HRHB: 19.9 },
        });
        const text = (id: string) => lines.find(line => line.id === id)?.text ?? '';
        expect(text('end_of_war')).toContain('21 November 1995');
        expect(text('military_dead')).toContain('43,244');
        expect(text('military_dead')).toContain('57,523');
        expect(text('civilian_dead')).toContain('39,684');
        expect(text('civilian_dead')).toContain('siege of Sarajevo');
        expect(text('territory')).toContain('53.2%');
        expect(text('territory')).toContain('46.8%');
        expect(text('srebrenica')).toContain('Bosnian Serb forces');
    });

    it('never says the enclave survived a war that ended before the rupture window', () => {
        const short = ledger({ war_duration_weeks: 120, rupture_consequences: [] });
        const lines = buildHistoricalComparisonLines({ verdict: r8Verdict(), costLedger: short, comparison: { ...compareToHistorical(short, BASELINE, 'settlement'), divergence_notes: ['Srebrenica enclave survived'] } });
        expect(lines.some(line => line.id === 'srebrenica')).toBe(false);
    });
});

describe('findings (B5, C1, C3)', () => {
    function stateWithAnnotations(): GameState {
        return {
            meta: { turn: 188 },
            military: {
                casualty_ledger: {},
                negotiation: { capital: {}, rupture_consequences: [{ id: 'srebrenica_genocide_1995', recorded_turn: 171, perpetrator_faction: 'RS', description: 'Fall of the Srebrenica safe area', condemnation_flag: 'genocide_condemnation' }] },
                cost_ledger_annotations: [8, 10, 26].map((count, i) => ({
                    event_id: 'cost_war_crimes_findings_RS',
                    tag: 'paramilitary_war_crimes_severe',
                    text: `deployment_count=${count}`,
                    turn: 100 + i,
                    faction: 'RS',
                })),
            },
            displacement: {},
            political: { political_controllers: {} },
        } as unknown as GameState;
    }

    it('prints one paramilitary card per side, with the latest count, and public sources only', () => {
        const built = buildCostLedger(stateWithAnnotations());
        const paramilitary = built.findings.filter(f => f.id === 'paramilitary_war_crimes_findings_RS');
        expect(paramilitary).toHaveLength(1);
        expect(paramilitary[0]!.text).toContain('26 paramilitary deployments authorized by RS command');
        for (const finding of built.findings) {
            for (const source of finding.sources) expect(source).not.toMatch(/design gate|pyrrhic scoring/i);
        }
        const srebrenica = built.findings.find(f => f.id === 'rupture_srebrenica_genocide_1995');
        expect(srebrenica?.text).toBe(SREBRENICA_FINDING_TEXT);
        expect(srebrenica?.sources).toEqual([COST_LEDGER_SOURCES.srebrenica]);
    });

    it('the engine Srebrenica text equals the panel-signed English', () => {
        expect(enMessages['warCost.finding.srebrenica.text']).toBe(SREBRENICA_FINDING_TEXT);
    });

    it('an older save with repeated paramilitary cards and internal sources displays one card, publicly sourced', () => {
        const old: CostLedgerFinding[] = [8, 26].map(count => ({
            id: 'paramilitary_war_crimes_findings_RS',
            category: 'war_crimes',
            severity: 'grave',
            faction: 'RS',
            title: 'RS paramilitary war-crimes findings',
            text: `RS records contain ${count} paramilitary deployments in the severe severity band.`,
            sources: ['Sensitive History Design Gate §4'],
        }));
        const display = buildDisplayFindings(ledger({ findings: old }));
        expect(display).toHaveLength(1);
        expect(display[0]!.text).toContain('26');
        expect(display[0]!.sources).toEqual([]);
    });
});

describe('decisions block (fix 1): stated effect only, never sensitive history', () => {
    const catalog = bundledEventCatalog();

    it('excludes the events the red-team seat named, and every event that books harm', () => {
        // Every id must still exist, so a rename fails here instead of passing silently.
        for (const id of ['dayton_talks_begin_1995', 'rbih_late_war_offensive_1995', 'rbih_nato_ultimatum_compliance_1994', 'nato_ultimatum_sarajevo_1994', 'visit_to_front_rs', 'visit_to_front_rbih', 'visit_to_front_hrhb', 'strategic_posture_review_rs', 'srebrenica_demilitarization_1993', 'drina_cleansing_decision_1992']) {
            const definition = catalog.get(id);
            expect(definition, id).toBeDefined();
            expect(isSensitiveDecisionEvent(definition!), id).toBe(true);
        }
        for (const definition of catalog.values()) {
            const row = definition as EventDefinition & { effect?: { kind?: string; war_crimes_delta?: number }; effects?: Array<{ kind?: string; war_crimes_delta?: number }> };
            const effects = [...(row.effects ?? []), ...(row.effect ? [row.effect] : []), ...(definition.response_options ?? []).flatMap(o => o.effects ?? [])] as Array<{ kind?: string; war_crimes_delta?: number }>;
            const harm = effects.some(e => e?.kind === 'humanitarian_impact' || typeof e?.war_crimes_delta === 'number');
            if (harm && (definition.response_options ?? []).length > 1) expect(isSensitiveDecisionEvent(definition), definition.id).toBe(true);
        }
    });

    it('measures leave-one-out on the final store, honouring the clamp, and groups repeats', () => {
        const definition = {
            id: 'test_choice',
            title: 'A test choice',
            category: 'diplomatic',
            response_options: [
                { id: 'a', label: 'Option A', effects: [], dimension_shifts: [{ faction: 'RBiH', dimension: 'international_standing', delta: 10 }] },
                { id: 'b', label: 'Option B', effects: [], dimension_shifts: [{ faction: 'RBiH', dimension: 'internal_cohesion', delta: -10 }] },
            ],
        } as unknown as EventDefinition;
        const store = {
            military_credibility: { base_value: 50, event_modifier: 0, effective_value: 50 },
            territorial_legitimacy: { base_value: 50, event_modifier: 0, effective_value: 50 },
            international_standing: { base_value: 95, event_modifier: 10, effective_value: 100 },
            patron_confidence: { base_value: 50, event_modifier: 0, effective_value: 50 },
            internal_cohesion: { base_value: 50, event_modifier: -20, effective_value: 30 },
            negotiating_leverage: { base_value: 50, event_modifier: 0, effective_value: 50 },
        };
        const receipts = [
            { event_id: 'test_choice', response_id: 'a', decision_source: 'player', faction: 'RBiH', turn: 5 },
            { event_id: 'test_choice', response_id: 'b', decision_source: 'player', faction: 'RBiH', turn: 9 },
            { event_id: 'test_choice', response_id: 'b', decision_source: 'player', faction: 'RBiH', turn: 12 },
            { event_id: 'test_choice', response_id: 'a', decision_source: 'bot_v1', faction: 'RS', turn: 5 },
        ];
        const reckoning = buildDecisionReckoning(receipts, 'RBiH', store, new Map([['test_choice', definition]]), 'en');
        // +10 standing on a value clamped at 100 from 105: removing it leaves 95 → 0.25 × 5 = 1.25.
        expect(reckoning.best).toHaveLength(1);
        expect(reckoning.best[0]!.points).toBe(1.3);
        // Two picks of −10 cohesion: removing both raises cohesion 30 → 50 → 0.15 × 20 = 3.
        expect(reckoning.worst[0]!.count).toBe(2);
        expect(reckoning.worst[0]!.points).toBe(-3);
        expect(reckoning.decisions).toBe(3);
    });
});

describe('each side\'s own peace-dysfunction reading (ruling C, §4 panel)', () => {
    function daytonState(): GameState {
        const dayton: DaytonResult = {
            territorial_packages_accepted: [],
            territorial_packages_rejected: [],
            institutional_choices: { military: 'decentralized', economy: 'decentralized', police: 'decentralized', judiciary: 'decentralized', presidency: 'decentralized', education: 'decentralized' },
            final_territory_split: { RBiH: 33.3, RS: 46.8, HRHB: 19.9 },
            patron_overrides_applied: [],
        };
        return {
            meta: { turn: 188, decision_mode: 'historical', outcome: 'dayton', game_over: true },
            military: {
                negotiation: {
                    capital: { RBiH: { refugees_created: 0 }, RS: { refugees_created: 0 }, HRHB: { refugees_created: 0 } },
                    dayton_result: dayton,
                    rupture_consequences: [{ id: 'srebrenica_genocide_1995', recorded_turn: 171, perpetrator_faction: 'RS', description: 'x', condemnation_flag: 'genocide_condemnation' }],
                },
            },
            political: {},
            displacement: {},
        } as unknown as GameState;
    }

    it('is computed in historical mode, and another side\'s genocide never enters the victims\' reading', () => {
        const state = daytonState();
        const settlementWide = computePeaceDysfunctionBreakdown(state)!;
        const rbih = computePeaceDysfunctionBreakdown(state, 'RBiH')!;
        const rs = computePeaceDysfunctionBreakdown(state, 'RS')!;
        expect(settlementWide).not.toBeNull();
        expect(rbih.condemnation_component).toBe(0);
        expect(rs.condemnation_component).toBe(100);
        expect(rbih.index).toBeLessThan(settlementWide.index);
        expect(rbih.flags).not.toContain('ratified_cleansing');
        expect(settlementWide.flags).toContain('ratified_cleansing');
    });

    it('a victim side can be capped at hollow victory but never failed by the ≥80 band', () => {
        const state = daytonState();
        const rbih = computePeaceDysfunctionBreakdown(state, 'RBiH')!;
        const capped = capOutcomeByPeaceDysfunction('survival', 90, rbih.flags);
        expect(capped).toBe('hollow_victory');
    });
});

describe('copy parity and retired strings', () => {
    it('every new ending key has a BCS twin, and the footer tagline is gone', () => {
        const keys = Object.keys(enMessages).filter(key => /^(verdict\.(side|headline|sub|stain|cap|compare|forces|figure|basis|breakdown|decisions)\.|warCost\.finding\.|dayton\.signing\.historicalRecord)/.test(key));
        expect(keys.length).toBeGreaterThan(60);
        for (const key of keys) expect(bcsMessages[key as keyof typeof bcsMessages], key).toBeTruthy();
        expect('verdict.footer.tagline' in enMessages).toBe(false);
        expect('verdict.footer.tagline' in bcsMessages).toBe(false);
    });

    it('the signing line dates the campaign week only; the record line carries the real dates', () => {
        expect(enMessages['dayton.signing.date']).toBe('The parties initialled the agreement in the week of {date}.');
        expect(enMessages['dayton.signing.date']).not.toContain('Wright-Patterson');
        expect(enMessages['dayton.signing.historicalRecord']).toContain('21 November 1995');
        expect(enMessages['dayton.signing.historicalRecord']).toContain('14 December 1995');
    });
});
