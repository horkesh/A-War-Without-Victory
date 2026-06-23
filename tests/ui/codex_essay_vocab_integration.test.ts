/**
 * v0.9.1 Dynamic Codex — integration pin for the three `dynamic_sections`
 * entries authored on top of the new vocabulary (comparison atoms +
 * interpolation tokens). This protects against silent regression: future
 * essay-index edits that accidentally drop a dynamic_sections array or
 * change an id will fail here, not at runtime in a Codex panel.
 *
 * Draft sources: docs/40_reports/20260422_V091_ESSAY_VOCAB_DRAFTS.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    resolveCodexEssay,
    type CodexRenderContext,
    type EssayEntry,
} from '../../src/ui/map/components/codex/codexEssayResolver.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';

interface EssayIndex {
    essays: EssayEntry[];
}

const INDEX_PATH = resolve(process.cwd(), 'data/scenarios/essays/essay_index.json');
const INDEX: EssayIndex = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));

function findEssay(id: string): EssayEntry {
    const e = INDEX.essays.find(x => x.id === id);
    if (!e) throw new Error(`essay_index.json missing essay id: ${id}`);
    return e;
}

describe('v0.9.1 vocab — Dayton territorial divergence', () => {
    const essay = findEssay('essay_dayton_signed_1995');
    const section = (essay.dynamic_sections ?? []).find(s => s.id === 'v091_territory_dayton_map_divergence');

    it('is present with the expected condition and variant', () => {
        expect(section).toBeDefined();
        expect(section?.variant).toBe('divergence');
        expect(section?.insert_after_paragraph).toBe(3);
        expect(section?.condition).toBe('GAME_OVER AND (TERRITORY_ABOVE:RS:5 OR TERRITORY_BELOW:RS:-5)');
    });

    it('fires when RS territory is >5 points above historical and renders delta tokens', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['dayton_signed_1995']),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: { RS: 7.3, RBiH_HRHB_Federation: -7.3 },
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
            },
        };
        const resolved = resolveCodexEssay(essay, ctx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        const hit = dyn.find(p => p.text.includes('+7.3') && p.text.includes('-7.3'));
        expect(hit, 'expected divergence paragraph with both signed deltas rendered').toBeDefined();
    });

    it('does NOT fire when RS territory is within ±5 points of historical', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['dayton_signed_1995']),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: { RS: 2, RBiH_HRHB_Federation: -2 },
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
            },
        };
        const resolved = resolveCodexEssay(essay, ctx);
        const hit = resolved.paragraphs.find(p => p.kind === 'dynamic' && (p.text ?? '').includes('Inter-Entity Boundary Line'));
        expect(hit).toBeUndefined();
    });
});

describe('v0.9.1 vocab — Sarajevo prolonged-costly siege note', () => {
    const essay = findEssay('essay_sarajevo_siege_begins_1992');
    const section = (essay.dynamic_sections ?? []).find(s => s.id === 'v091_sarajevo_prolonged_costly_note');

    it('is present with the expected condition and variant', () => {
        expect(section).toBeDefined();
        expect(section?.variant).toBe('note');
        expect(section?.insert_after_paragraph).toBe(5);
        expect(section?.condition).toBe('GAME_OVER AND DURATION_LONGER AND CASUALTY_ABOVE:1.2');
    });

    it('fires only when both duration and casualty gates cross', () => {
        const fireCtx: CodexRenderContext = {
            firedEventIds: new Set(['sarajevo_siege_begins_1992']),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 12,
                territory_divergence: {},
                casualty_ratio: 1.35,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
            },
        };
        const resolved = resolveCodexEssay(essay, fireCtx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'note');
        const hit = dyn.find(p => p.text.includes('12') && p.text.includes('135 percent'));
        expect(hit, 'expected note paragraph rendering duration_delta_abs=12 + casualty_ratio_pct=135').toBeDefined();

        // Only casualty crossed, not duration
        const missDuration: CodexRenderContext = { ...fireCtx, historicalComparison: { ...fireCtx.historicalComparison!, duration_delta_weeks: 0 } };
        const r2 = resolveCodexEssay(essay, missDuration);
        expect(r2.paragraphs.some(p => p.kind === 'dynamic' && (p.text ?? '').includes('did not end when it ended historically'))).toBe(false);

        // Only duration crossed, not casualty
        const missCasualty: CodexRenderContext = { ...fireCtx, historicalComparison: { ...fireCtx.historicalComparison!, casualty_ratio: 1.0 } };
        const r3 = resolveCodexEssay(essay, missCasualty);
        expect(r3.paragraphs.some(p => p.kind === 'dynamic' && (p.text ?? '').includes('did not end when it ended historically'))).toBe(false);
    });
});

describe('v0.9.1 vocab — Bihac 5th Corps fell ghost epilogue', () => {
    const essay = findEssay('essay_bihac_5th_corps_offensive_1994');
    const section = (essay.dynamic_sections ?? []).find(s => s.id === 'v091_bihac_fell_ghost_epilogue');

    it('is present with the ghost variant and trailing insertion', () => {
        expect(section).toBeDefined();
        expect(section?.variant).toBe('ghost');
        expect(section?.insert_after_paragraph).toBe(-1);
        expect(section?.condition).toBe('GAME_OVER AND FLAG:bihac_pocket_fell AND DISPLACEMENT_ABOVE:1.1');
    });

    it('fires when the Chain 4 pocket-fell flag is set and displacement exceeds 110% of historical', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['bihac_5th_corps_offensive_1994', 'csq_bihac_pocket_collapses_1994']),
            eventFlags: { bihac_pocket_fell: true },
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1.45,
                rupture_divergence: [],
                divergence_notes: [],
            },
        };
        const resolved = resolveCodexEssay(essay, ctx);
        const ghostDyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'ghost');
        const hit = ghostDyn.find(p => p.text.includes('145 percent') && p.text.includes('Sanski Most'));
        expect(hit, 'expected ghost epilogue paragraph rendering displacement_ratio_pct=145').toBeDefined();
    });

    it('does NOT fire on the historical path (flag absent, displacement in band)', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['bihac_5th_corps_offensive_1994']),
            eventFlags: {},
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1.0,
                rupture_divergence: [],
                divergence_notes: [],
            },
        };
        const resolved = resolveCodexEssay(essay, ctx);
        const ghostEpilogue = resolved.paragraphs.find(p => p.kind === 'dynamic' && (p.text ?? '').includes("Dudaković"));
        expect(ghostEpilogue).toBeUndefined();
    });
});

describe('v0.9.1 vocab - authored findings breadth wave', () => {
    const ahmiciEssay = findEssay('essay_ahmici_massacre_1993');
    const stormEssay = findEssay('essay_operation_storm_1995');
    const ahmiciWarCrimesSection = (ahmiciEssay.dynamic_sections ?? []).find(s => s.id === 'v091_ahmici_war_crimes_findings');
    const stormDisplacementSection = (stormEssay.dynamic_sections ?? []).find(s => s.id === 'v091_operation_storm_displacement_findings');

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 42000,
        total_civilian_killed: 36000,
        findings: [
            {
                id: 'war_crimes_record_HRHB',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'HRHB',
                title: 'HRHB war-crimes record',
                text: 'HRHB capital records contain 6 war-crime events.',
                sources: ['Sensitive History Design Gate Section 4'],
            },
            {
                id: 'displacement_record_HRHB',
                category: 'displacement',
                severity: 'grave',
                faction: 'HRHB',
                title: 'HRHB displacement record',
                text: 'The ledger records a major west-Bosnia displacement wave.',
                sources: ['AWWV displacement ledger'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('adds Ahmici war-crimes findings gated by HRHB grave findings', () => {
        expect(ahmiciWarCrimesSection).toBeDefined();
        expect(ahmiciWarCrimesSection?.variant).toBe('divergence');
        expect(ahmiciWarCrimesSection?.condition).toBe('GAME_OVER AND FINDING_CATEGORY:war_crimes AND FINDING_FACTION:HRHB');
    });

    it('renders HRHB war-crimes findings inside the Ahmici essay', () => {
        const resolved = resolveCodexEssay(ahmiciEssay, {
            firedEventIds: new Set(['ahmici_massacre_1993']),
            gameOver: true,
            costLedger,
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('HRHB war-crimes record [HVO]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('Sensitive History Design Gate'))).toBe(true);
    });

    it('adds Operation Storm displacement findings gated by displacement findings', () => {
        expect(stormDisplacementSection).toBeDefined();
        expect(stormDisplacementSection?.variant).toBe('divergence');
        expect(stormDisplacementSection?.condition).toBe('GAME_OVER AND FINDING_CATEGORY:displacement');
    });

    it('renders displacement findings inside the Operation Storm essay', () => {
        const resolved = resolveCodexEssay(stormEssay, {
            firedEventIds: new Set(['operation_storm_1995']),
            gameOver: true,
            costLedger,
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('HRHB displacement record [HVO]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('AWWV displacement ledger'))).toBe(true);
    });
});

describe('v0.9.1 vocab - late-war findings breadth wave', () => {
    const zepaEssay = findEssay('essay_zepa_falls_1995');
    const federationEssay = findEssay('essay_federation_ground_offensive_1995');
    const zepaCostSection = (zepaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_zepa_event_cost_finding');
    const federationHumanCostSection = (federationEssay.dynamic_sections ?? []).find(s => s.id === 'v091_federation_offensive_human_cost_findings');

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 52000,
        total_civilian_killed: 41000,
        findings: [
            {
                id: 'zepa_falls_1995',
                category: 'human_cost',
                severity: 'grave',
                faction: 'RS',
                title: 'Zepa safe area collapse',
                text: 'The ledger records the fall of Zepa and forced removal of civilians.',
                sources: ['ICTY Tolimir IT-05-88/2-T'],
            },
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 52,000 military killed and 41,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('adds a Zepa event-cost finding section without treating Zepa as a rupture', () => {
        expect(zepaCostSection).toBeDefined();
        expect(zepaCostSection?.variant).toBe('divergence');
        expect(zepaCostSection?.condition).toBe('GAME_OVER AND FINDING:zepa_falls_1995');
        expect(zepaCostSection?.content).toContain('{cost_findings}');
        expect(zepaCostSection?.localizations?.bcs?.content).toContain('{cost_findings}');
        expect(JSON.stringify(zepaEssay.dynamic_sections ?? [])).not.toContain('rupture_zepa_falls_1995');
        expect(JSON.stringify(zepaEssay.dynamic_sections ?? [])).not.toContain('{cost_rupture_findings}');
    });

    it('renders Zepa event-cost findings inside the Zepa essay', () => {
        const resolved = resolveCodexEssay(zepaEssay, {
            firedEventIds: new Set(['zepa_falls_1995']),
            gameOver: true,
            costLedger,
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Zepa safe area collapse [VRS]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('ICTY Tolimir'))).toBe(true);
    });

    it('adds a Federation offensive human-cost findings section', () => {
        expect(federationHumanCostSection).toBeDefined();
        expect(federationHumanCostSection?.variant).toBe('divergence');
        expect(federationHumanCostSection?.condition).toBe('GAME_OVER AND FINDING_CATEGORY:human_cost');
    });

    it('renders human-cost findings inside the Federation offensive essay', () => {
        const resolved = resolveCodexEssay(federationEssay, {
            firedEventIds: new Set(['federation_ground_offensive_1995']),
            gameOver: true,
            costLedger,
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Human cost record: The ledger records 52,000'))).toBe(true);
        expect(dyn.some(p => p.text.includes('RDC Sarajevo'))).toBe(true);
    });
});

describe('v0.9.1 vocab - humanitarian/diplomatic findings breadth wave', () => {
    const drinaEssay = findEssay('essay_drina_valley_ethnic_cleansing_1992');
    const campsEssay = findEssay('essay_concentration_camps_revealed_1992');
    const hvoCampsEssay = findEssay('essay_hvo_detention_camps_1993');
    const markaleEssay = findEssay('essay_markale_area_shelling_1993');
    const daytonTalksEssay = findEssay('essay_dayton_talks_begin_1995');
    const grabovicaEssay = findEssay('essay_grabovica_uzdol_massacres_1993');

    const sections = {
        drina: (drinaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_drina_rs_war_crimes_findings'),
        camps: (campsEssay.dynamic_sections ?? []).find(s => s.id === 'v091_camps_displacement_findings'),
        hvoCamps: (hvoCampsEssay.dynamic_sections ?? []).find(s => s.id === 'v091_hvo_camps_hrhb_war_crimes_findings'),
        markale: (markaleEssay.dynamic_sections ?? []).find(s => s.id === 'v091_sarajevo_shelling_human_cost_findings'),
        daytonTalks: (daytonTalksEssay.dynamic_sections ?? []).find(s => s.id === 'v091_dayton_talks_milestone_timing_note'),
        grabovica: (grabovicaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_grabovica_uzdol_rbih_war_crimes_findings'),
    };

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 56000,
        total_civilian_killed: 45000,
        findings: [
            {
                id: 'war_crimes_record_RS',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'RS',
                title: 'RS war-crimes record',
                text: 'RS capital records contain 15 war-crime events.',
                sources: ['ICTY Karadzic Trial Judgment'],
            },
            {
                id: 'civilian_displacement_record',
                category: 'displacement',
                severity: 'grave',
                title: 'Civilian displacement record',
                text: 'The ledger records 2,400,000 displaced civilians.',
                sources: ['UNHCR displacement statistics'],
            },
            {
                id: 'war_crimes_record_HRHB',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'HRHB',
                title: 'HRHB war-crimes record',
                text: 'HRHB capital records contain 7 war-crime events.',
                sources: ['ICTY Prlic Trial Judgment'],
            },
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 56,000 military killed and 45,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
            {
                id: 'war_crimes_record_RBiH',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'RBiH',
                title: 'RBiH war-crimes record',
                text: 'RBiH capital records contain 4 war-crime events.',
                sources: ['ICTY Halilovic Trial Judgment'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('adds the expected authored sections and conditions', () => {
        expect(sections.drina?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_RS');
        expect(sections.camps?.condition).toBe('GAME_OVER AND FINDING:civilian_displacement_record AND DISPLACEMENT_ABOVE:1.1');
        expect(sections.hvoCamps?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_HRHB');
        expect(sections.markale?.condition).toBe('GAME_OVER AND FINDING:human_cost_record AND CASUALTY_ABOVE:1.1');
        expect(sections.daytonTalks?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');
        expect(sections.grabovica?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_RBiH');
    });

    it('renders findings into the matching humanitarian essays', () => {
        const baseComparison: NonNullable<CodexRenderContext['historicalComparison']> = {
            duration_delta_weeks: 0,
            territory_divergence: {},
            casualty_ratio: 1.25,
            displacement_ratio: 1.2,
            rupture_divergence: [],
            divergence_notes: [],
        };

        const rendered = [
            resolveCodexEssay(drinaEssay, { firedEventIds: new Set(['drina_valley_ethnic_cleansing_1992']), gameOver: true, costLedger }),
            resolveCodexEssay(campsEssay, { firedEventIds: new Set(['concentration_camps_revealed_1992']), gameOver: true, historicalComparison: baseComparison, costLedger }),
            resolveCodexEssay(hvoCampsEssay, { firedEventIds: new Set(['hvo_detention_camps_1993']), gameOver: true, costLedger }),
            resolveCodexEssay(markaleEssay, { firedEventIds: new Set(['markale_area_shelling_1993']), gameOver: true, historicalComparison: baseComparison, costLedger }),
            resolveCodexEssay(grabovicaEssay, { firedEventIds: new Set(['grabovica_uzdol_massacres_1993']), gameOver: true, costLedger }),
        ].flatMap(r => r.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text));

        expect(rendered.some(text => text.includes('RS war-crimes record [VRS]'))).toBe(true);
        expect(rendered.some(text => text.includes('Civilian displacement record: The ledger records 2,400,000'))).toBe(true);
        expect(rendered.some(text => text.includes('HRHB war-crimes record [HVO]'))).toBe(true);
        expect(rendered.some(text => text.includes('Human cost record: The ledger records 56,000'))).toBe(true);
        expect(rendered.some(text => text.includes('RBiH war-crimes record [ARBiH]'))).toBe(true);
    });

    it('renders Dayton talks milestone timing from the existing milestone row contract', () => {
        const resolved = resolveCodexEssay(daytonTalksEssay, {
            firedEventIds: new Set(['dayton_talks_begin_1995']),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
                milestone_comparison: [{
                    id: 'dayton_accords',
                    label: 'Dayton Accords',
                    historical_week: 189,
                    player_week: 181,
                    delta_weeks: -8,
                    status: 'early',
                    summary: 'Dayton Accords arrived 8 weeks earlier than the historical baseline.',
                }],
            },
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Dayton Accords arrived 8 weeks earlier'))).toBe(true);
        expect(dyn.some(p => p.text.includes('8 weeks earlier'))).toBe(true);
        expect(dyn.map(p => p.text).join('\n')).not.toMatch(/\bW\d+\b|historical W|player W|status (late|absent|early)/);
    });
});

describe('v0.9.1 vocab - late-war humanitarian memory breadth wave', () => {
    const tuzlaEssay = findEssay('essay_tuzla_gate_massacre_1995');
    const secondMarkaleEssay = findEssay('essay_second_markale_massacre_1995');
    const stupniDoEssay = findEssay('essay_stupni_do_massacre_1993');

    const sections = {
        tuzla: (tuzlaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_tuzla_gate_human_cost_findings'),
        secondMarkale: (secondMarkaleEssay.dynamic_sections ?? []).find(s => s.id === 'v091_second_markale_human_cost_findings'),
        stupniDo: (stupniDoEssay.dynamic_sections ?? []).find(s => s.id === 'v091_stupni_do_hrhb_war_crimes_findings'),
    };

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 56000,
        total_civilian_killed: 45000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 56,000 military killed and 45,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
            {
                id: 'war_crimes_record_HRHB',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'HRHB',
                title: 'HRHB war-crimes record',
                text: 'HRHB capital records contain 7 war-crime events.',
                sources: ['ICTY Prlic Trial Judgment'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    const costlyComparison: NonNullable<CodexRenderContext['historicalComparison']> = {
        duration_delta_weeks: 0,
        territory_divergence: {},
        casualty_ratio: 1.25,
        displacement_ratio: 1,
        rupture_divergence: [],
        divergence_notes: [],
    };

    it('adds the expected authored sections and conditions', () => {
        expect(sections.tuzla?.condition).toBe('GAME_OVER AND FINDING:human_cost_record AND CASUALTY_ABOVE:1.1');
        expect(sections.secondMarkale?.condition).toBe('GAME_OVER AND FINDING:human_cost_record AND CASUALTY_ABOVE:1.1');
        expect(sections.stupniDo?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_HRHB');
    });

    it('renders late-war human-cost findings into massacre essays', () => {
        const rendered = [
            resolveCodexEssay(tuzlaEssay, { firedEventIds: new Set(['tuzla_gate_massacre_1995']), gameOver: true, historicalComparison: costlyComparison, costLedger }),
            resolveCodexEssay(secondMarkaleEssay, { firedEventIds: new Set(['second_markale_massacre_1995']), gameOver: true, historicalComparison: costlyComparison, costLedger }),
        ].flatMap(r => r.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text));

        expect(rendered.filter(text => text.includes('Human cost record: The ledger records 56,000')).length).toBe(2);
        expect(rendered.some(text => text.includes('RDC Sarajevo'))).toBe(true);
    });

    it('renders HRHB war-crimes findings into the Stupni Do essay', () => {
        const resolved = resolveCodexEssay(stupniDoEssay, {
            firedEventIds: new Set(['stupni_do_massacre_1993']),
            gameOver: true,
            costLedger,
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('HRHB war-crimes record [HVO]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('ICTY Prlic'))).toBe(true);
    });
});

describe('v0.9.1 vocab - founding constraint findings breadth wave', () => {
    const rsGoalsEssay = findEssay('essay_rs_strategic_goals');
    const hrhbGoalEssay = findEssay('essay_hrhb_political_goal');
    const embargoEssay = findEssay('essay_arms_embargo_impact_1992');
    const corridorEssay = findEssay('essay_operation_corridor_1992');

    const sections = {
        rsGoals: (rsGoalsEssay.dynamic_sections ?? []).find(s => s.id === 'v091_rs_goals_war_crimes_findings'),
        hrhbGoal: (hrhbGoalEssay.dynamic_sections ?? []).find(s => s.id === 'v091_hrhb_project_war_crimes_findings'),
        embargo: (embargoEssay.dynamic_sections ?? []).find(s => s.id === 'v091_arms_embargo_human_cost_findings'),
        corridor: (corridorEssay.dynamic_sections ?? []).find(s => s.id === 'v091_operation_corridor_rs_war_crimes_findings'),
    };

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 56000,
        total_civilian_killed: 45000,
        findings: [
            {
                id: 'war_crimes_record_RS',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'RS',
                title: 'RS war-crimes record',
                text: 'RS capital records contain 15 war-crime events.',
                sources: ['ICTY Karadzic Trial Judgment'],
            },
            {
                id: 'war_crimes_record_HRHB',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'HRHB',
                title: 'HRHB war-crimes record',
                text: 'HRHB capital records contain 7 war-crime events.',
                sources: ['ICTY Prlic Trial Judgment'],
            },
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 56,000 military killed and 45,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('adds founding-constraint sections gated by real Cost Ledger findings', () => {
        expect(sections.rsGoals?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_RS');
        expect(sections.hrhbGoal?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_HRHB');
        expect(sections.embargo?.condition).toBe('GAME_OVER AND FINDING:human_cost_record');
        expect(sections.corridor?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_RS');
    });

    it('renders faction-scoped findings into founding and corridor essays', () => {
        const rendered = [
            resolveCodexEssay(rsGoalsEssay, { firedEventIds: new Set(['rs_strategic_goals']), gameOver: true, costLedger }),
            resolveCodexEssay(hrhbGoalEssay, { firedEventIds: new Set(['hrhb_political_goal']), gameOver: true, costLedger }),
            resolveCodexEssay(corridorEssay, { firedEventIds: new Set(['operation_corridor_1992']), gameOver: true, costLedger }),
        ].flatMap(r => r.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text));

        expect(rendered.filter(text => text.includes('RS war-crimes record [VRS]')).length).toBe(2);
        expect(rendered.filter(text => text.includes('HRHB war-crimes record [HVO]')).length).toBe(1);
        expect(rendered.some(text => text.includes('HRHB war-crimes record [HVO]') && text.includes('RS capital records'))).toBe(false);
    });

    it('renders human-cost findings into the arms embargo essay', () => {
        const resolved = resolveCodexEssay(embargoEssay, {
            firedEventIds: new Set(['arms_embargo_impact_1992']),
            gameOver: true,
            costLedger,
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Human cost record: The ledger records 56,000'))).toBe(true);
        expect(dyn.some(p => p.text.includes('RDC Sarajevo'))).toBe(true);
    });
});

describe('v0.9.1 vocab — Cost Ledger findings in Codex essays', () => {
    const srebrenicaEssay = findEssay('essay_srebrenica_falls_1995');
    const daytonEssay = findEssay('essay_dayton_signed_1995');
    const vanceOwenEssay = findEssay('essay_vance_owen_plan_1993');
    const srebrenicaSection = (srebrenicaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_cost_ledger_srebrenica_finding');
    const daytonSection = (daytonEssay.dynamic_sections ?? []).find(s => s.id === 'v091_cost_ledger_findings_docket');
    const earlyPeaceSection = (vanceOwenEssay.dynamic_sections ?? []).find(s => s.id === 'v091_vance_owen_early_peace_ledger_finding');

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 46500,
        total_civilian_killed: 38000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 46,500 military killed and 38,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
            {
                id: 'rupture_srebrenica_genocide_1995',
                category: 'rupture',
                severity: 'rupture',
                faction: 'RS',
                title: 'Srebrenica genocide',
                text: 'The ledger records the Srebrenica genocide after Fall of Srebrenica.',
                sources: ['ICTY Krstic IT-98-33-T', 'ICJ Bosnia v. Serbia (2007)'],
            },
            {
                id: 'war_crimes_record_RS',
                category: 'war_crimes',
                severity: 'grave',
                faction: 'RS',
                title: 'RS war-crimes record',
                text: 'RS capital records contain 14 war-crime events.',
                sources: ['Sensitive History Design Gate §4'],
            },
            {
                id: 'early_peace_implementation_record',
                category: 'duration',
                severity: 'record',
                title: 'Early negotiated settlement',
                text: `The ledger records acceptance of Vance-Owen Peace Plan on ${turnToDateString(50)}.`,
                sources: ['Victory Conditions and Pyrrhic Scoring section 1'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('adds a Srebrenica finding section gated by the rupture finding id', () => {
        expect(srebrenicaSection).toBeDefined();
        expect(srebrenicaSection?.variant).toBe('divergence');
        expect(srebrenicaSection?.condition).toBe('GAME_OVER AND FINDING:rupture_srebrenica_genocide_1995');
        expect(srebrenicaSection?.content).toContain('{cost_rupture_findings}');
        expect(srebrenicaSection?.localizations?.bcs?.content).toContain('{cost_rupture_findings}');
    });

    it('renders the Srebrenica finding text and sources inside the historical essay', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['srebrenica_falls_1995']),
            gameOver: true,
            costLedger,
        };
        const resolved = resolveCodexEssay(srebrenicaEssay, ctx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Srebrenica genocide [VRS]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('ICJ Bosnia v. Serbia'))).toBe(true);
    });

    it('adds a Dayton findings docket gated by any grave finding', () => {
        expect(daytonSection).toBeDefined();
        expect(daytonSection?.variant).toBe('divergence');
        expect(daytonSection?.condition).toBe('GAME_OVER AND FINDING_SEVERITY:grave');
        expect(daytonSection?.content).toContain('{cost_findings}');
        expect(daytonSection?.localizations?.bcs?.content).toContain('{cost_findings}');
        expect(JSON.stringify(daytonSection)).not.toContain('{cost_rupture_findings}');
    });

    it('adds a Vance-Owen early-peace finding section gated by the duration finding', () => {
        expect(earlyPeaceSection).toBeDefined();
        expect(earlyPeaceSection?.variant).toBe('divergence');
        expect(earlyPeaceSection?.condition).toBe('GAME_OVER AND FINDING:early_peace_implementation_record');
    });

    it('renders a deterministic source-labeled findings docket in Dayton', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['dayton_signed_1995']),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
            },
            costLedger,
        };
        const resolved = resolveCodexEssay(daytonEssay, ctx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Human cost record: The ledger records 46,500'))).toBe(true);
        expect(dyn.some(p => p.text.includes('Sources: ICJ Bosnia v. Serbia'))).toBe(true);
    });

    it('renders the early-peace Cost Ledger duration finding in Vance-Owen', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['vance_owen_plan_1993']),
            gameOver: true,
            costLedger,
        };
        const resolved = resolveCodexEssay(vanceOwenEssay, ctx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        const text = dyn.map(p => p.text).join('\n');
        expect(text).toContain(`Early negotiated settlement: The ledger records acceptance of Vance-Owen Peace Plan on ${turnToDateString(50)}.`);
        expect(text).not.toContain('peace plan vance_owen');
        expect(text).not.toContain('week 50');
    });
});

describe('v0.9.1 vocab — milestone comparison in Codex essays', () => {
    const srebrenicaEssay = findEssay('essay_srebrenica_falls_1995');
    const daytonEssay = findEssay('essay_dayton_signed_1995');
    const srebrenicaSection = (srebrenicaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_milestone_srebrenica_absent');
    const daytonSection = (daytonEssay.dynamic_sections ?? []).find(s => s.id === 'v091_milestone_timing_docket');

    it('adds a Srebrenica absent-milestone section gated by milestone status', () => {
        expect(srebrenicaSection).toBeDefined();
        expect(srebrenicaSection?.variant).toBe('ghost');
        expect(srebrenicaSection?.condition).toBe('GAME_OVER AND MILESTONE:srebrenica_genocide_1995:absent');
    });

    it('renders the Srebrenica absent milestone summary in the ghost essay', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set<string>(),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
                milestone_comparison: [{
                    id: 'srebrenica_genocide_1995',
                    label: 'Srebrenica Genocide',
                    historical_week: 171,
                    player_week: null,
                    delta_weeks: null,
                    status: 'absent',
                    summary: 'Srebrenica Genocide did not occur in this run.',
                }],
            },
        };
        const resolved = resolveCodexEssay(srebrenicaEssay, ctx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'ghost');
        expect(dyn.some(p => p.text.includes('Srebrenica Genocide did not occur in this run.'))).toBe(true);
    });

    it('adds a Dayton milestone timing docket gated by the Dayton milestone', () => {
        expect(daytonSection).toBeDefined();
        expect(daytonSection?.variant).toBe('divergence');
        expect(daytonSection?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');
    });

    it('renders milestone comparison text inside the Dayton essay', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['dayton_signed_1995']),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 6,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
                milestone_comparison: [
                    {
                        id: 'srebrenica_genocide_1995',
                        label: 'Srebrenica Genocide',
                        historical_week: 171,
                        player_week: null,
                        delta_weeks: null,
                        status: 'absent',
                        summary: 'Srebrenica Genocide did not occur in this run.',
                    },
                    {
                        id: 'dayton_accords',
                        label: 'Dayton Accords',
                        historical_week: 182,
                        player_week: 188,
                        delta_weeks: 6,
                        status: 'late',
                        summary: 'Dayton Accords occurred at player week 188 against historical week 182.',
                    },
                ],
            },
        };
        const resolved = resolveCodexEssay(daytonEssay, ctx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        const text = dyn.map(p => p.text).join('\n');
        expect(text).toContain('Dayton Accords: historical 2 Oct 1995; player 13 Nov 1995; timing 6 weeks later; status Late.');
        expect(text).toContain('Srebrenica Genocide: historical 17 Jul 1995; player not recorded; status Absent.');
        expect(text).not.toMatch(/\bW\d+\b/);
        expect(text).not.toMatch(/historical W|player W|status (late|absent|early)/);
    });
});

describe('v0.9.1 vocab - diplomatic and siege continuity breadth wave', () => {
    const jnaEssay = findEssay('essay_jna_withdrawal_1992');
    const owenStoltenbergEssay = findEssay('essay_owen_stoltenberg_plan_1993');
    const bosnianAssemblyEssay = findEssay('essay_bosnian_assembly_rejects_os_1993');
    const contactGroupEssay = findEssay('essay_contact_group_plan_1994');
    const bihacCrisisEssay = findEssay('essay_bihac_crisis_1994');
    const cohaBeginsEssay = findEssay('essay_coha_ceasefire_begins_1995');
    const cohaExpiresEssay = findEssay('essay_coha_expires_1995');

    const sections = {
        jna: (jnaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_jna_vrs_continuity_rs_war_crimes_findings'),
        owenStoltenberg: (owenStoltenbergEssay.dynamic_sections ?? []).find(s => s.id === 'v091_owen_stoltenberg_early_peace_record'),
        bosnianAssembly: (bosnianAssemblyEssay.dynamic_sections ?? []).find(s => s.id === 'v091_bosnian_assembly_early_peace_record'),
        contactGroup: (contactGroupEssay.dynamic_sections ?? []).find(s => s.id === 'v091_contact_group_dayton_timing_note'),
        bihacCrisis: (bihacCrisisEssay.dynamic_sections ?? []).find(s => s.id === 'v091_bihac_crisis_displacement_findings'),
        cohaBegins: (cohaBeginsEssay.dynamic_sections ?? []).find(s => s.id === 'v091_coha_begins_extended_human_cost_note'),
        cohaExpires: (cohaExpiresEssay.dynamic_sections ?? []).find(s => s.id === 'v091_coha_expires_srebrenica_absent_note'),
    };

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 46000,
        total_civilian_killed: 38000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 46,000 military killed and 38,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
            {
                id: 'civilian_displacement_record',
                category: 'displacement',
                severity: 'grave',
                title: 'Civilian displacement record',
                text: 'The ledger records 2,200,000 civilians displaced or killed.',
                sources: ['UNHCR (1996) and ICTY findings'],
            },
            {
                id: 'war_crimes_record_RS',
                category: 'war_crimes',
                severity: 'record',
                faction: 'RS',
                title: 'RS war-crimes record',
                text: 'RS capital records contain 14 war-crime events.',
                sources: ['Sensitive History Design Gate section 4'],
            },
            {
                id: 'early_peace_implementation_record',
                category: 'duration',
                severity: 'record',
                title: 'Early negotiated settlement',
                text: `The ledger records acceptance of Owen-Stoltenberg Plan on ${turnToDateString(72)}.`,
                sources: ['Victory Conditions and Pyrrhic Scoring section 1'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    const comparison: NonNullable<CodexRenderContext['historicalComparison']> = {
        duration_delta_weeks: 8,
        territory_divergence: {},
        casualty_ratio: 1.25,
        displacement_ratio: 1.3,
        rupture_divergence: [],
        divergence_notes: [],
        milestone_comparison: [
            {
                id: 'srebrenica_genocide_1995',
                label: 'Srebrenica Genocide',
                historical_week: 171,
                player_week: null,
                delta_weeks: null,
                status: 'absent',
                summary: 'Srebrenica Genocide did not occur in this run.',
            },
            {
                id: 'dayton_accords',
                label: 'Dayton Accords',
                historical_week: 182,
                player_week: 190,
                delta_weeks: 8,
                status: 'late',
                summary: 'Dayton Accords occurred at player week 190 against historical week 182.',
            },
        ],
    };

    it('adds seven authored dynamic sections with deterministic gates', () => {
        expect(sections.jna?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_RS');
        expect(sections.owenStoltenberg?.condition).toBe('GAME_OVER AND FINDING:early_peace_implementation_record');
        expect(sections.bosnianAssembly?.condition).toBe('GAME_OVER AND DURATION_SHORTER AND FINDING:early_peace_implementation_record');
        expect(sections.contactGroup?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');
        expect(sections.bihacCrisis?.condition).toBe('GAME_OVER AND FINDING:civilian_displacement_record AND DISPLACEMENT_ABOVE:1.1');
        expect(sections.cohaBegins?.condition).toBe('GAME_OVER AND DURATION_LONGER AND FINDING:human_cost_record');
        expect(sections.cohaExpires?.condition).toBe('GAME_OVER AND MILESTONE:srebrenica_genocide_1995:absent');

        expect(sections.jna?.variant).toBe('divergence');
        expect(sections.owenStoltenberg?.variant).toBe('note');
        expect(sections.bosnianAssembly?.variant).toBe('note');
        expect(sections.contactGroup?.variant).toBe('note');
        expect(sections.bihacCrisis?.variant).toBe('divergence');
        expect(sections.cohaBegins?.variant).toBe('note');
        expect(sections.cohaExpires?.variant).toBe('ghost');
    });

    it('renders the new sections through existing Cost Ledger and milestone tokens', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set([
                'jna_withdrawal_1992',
                'owen_stoltenberg_plan_1993',
                'bosnian_assembly_rejects_os_1993',
                'contact_group_plan_1994',
                'bihac_crisis_1994',
                'coha_ceasefire_begins_1995',
                'coha_expires_1995',
            ]),
            gameOver: true,
            costLedger,
            historicalComparison: {
                ...comparison,
                duration_delta_weeks: -116,
            },
        };

        expect(resolveCodexEssay(jnaEssay, ctx).paragraphs.some(p => p.text.includes('RS war-crimes record [VRS]'))).toBe(true);
        expect(resolveCodexEssay(owenStoltenbergEssay, ctx).paragraphs.some(p => p.text.includes('Early negotiated settlement'))).toBe(true);
        expect(resolveCodexEssay(bosnianAssemblyEssay, ctx).paragraphs.some(p => p.text.includes('116 weeks shorter'))).toBe(true);
        expect(resolveCodexEssay(contactGroupEssay, ctx).paragraphs.some(p => p.text.includes('Dayton Accords occurred at player date 27 Nov 1995'))).toBe(true);
        expect(resolveCodexEssay(bihacCrisisEssay, ctx).paragraphs.some(p => p.text.includes('Civilian displacement record'))).toBe(true);

        const longerCtx = {
            ...ctx,
            historicalComparison: comparison,
        };
        expect(resolveCodexEssay(cohaBeginsEssay, longerCtx).paragraphs.some(p => p.text.includes('Human cost record'))).toBe(true);
        expect(resolveCodexEssay(cohaExpiresEssay, longerCtx).paragraphs.some(p => p.variant === 'ghost' && p.text.includes('Srebrenica Genocide did not occur in this run'))).toBe(true);
    });
});

describe('v0.9.1 vocab - late intervention and final offensive breadth wave', () => {
    const natoEssay = findEssay('essay_nato_deliberate_force_1995');
    const hostageEssay = findEssay('essay_un_hostage_crisis_1995');
    const gorazdeEssay = findEssay('essay_gorazde_crisis_1994');
    const mistralEssay = findEssay('essay_operation_mistral_2_1995');
    const sanaEssay = findEssay('essay_operation_sana_1995');
    const summerEssay = findEssay('essay_operation_summer_95');
    const haltEssay = findEssay('essay_us_halts_federation_advance_1995');
    const washingtonEssay = findEssay('essay_washington_agreement_1994');

    const sections = {
        nato: (natoEssay.dynamic_sections ?? []).find(s => s.id === 'v091_deliberate_force_dayton_timing_note'),
        hostage: (hostageEssay.dynamic_sections ?? []).find(s => s.id === 'v091_un_hostage_rs_war_crimes_findings'),
        gorazde: (gorazdeEssay.dynamic_sections ?? []).find(s => s.id === 'v091_gorazde_crisis_displacement_findings'),
        mistral: (mistralEssay.dynamic_sections ?? []).find(s => s.id === 'v091_mistral_human_cost_findings'),
        sana: (sanaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_sana_displacement_findings'),
        summer: (summerEssay.dynamic_sections ?? []).find(s => s.id === 'v091_summer95_hrhb_war_crimes_findings'),
        halt: (haltEssay.dynamic_sections ?? []).find(s => s.id === 'v091_us_halts_dayton_timing_note'),
        washington: (washingtonEssay.dynamic_sections ?? []).find(s => s.id === 'v091_washington_to_dayton_timing_note'),
    };

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 46000,
        total_civilian_killed: 38000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 46,000 military killed and 38,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
            {
                id: 'civilian_displacement_record',
                category: 'displacement',
                severity: 'grave',
                title: 'Civilian displacement record',
                text: 'The ledger records 2,200,000 civilians displaced or killed.',
                sources: ['UNHCR (1996) and ICTY findings'],
            },
            {
                id: 'war_crimes_record_RS',
                category: 'war_crimes',
                severity: 'record',
                faction: 'RS',
                title: 'RS war-crimes record',
                text: 'RS capital records contain 14 war-crime events.',
                sources: ['Sensitive History Design Gate section 4'],
            },
            {
                id: 'war_crimes_record_HRHB',
                category: 'war_crimes',
                severity: 'record',
                faction: 'HRHB',
                title: 'HRHB war-crimes record',
                text: 'HRHB capital records contain 4 war-crime events.',
                sources: ['Sensitive History Design Gate section 4'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    const comparison: NonNullable<CodexRenderContext['historicalComparison']> = {
        duration_delta_weeks: 7,
        territory_divergence: {},
        casualty_ratio: 1.25,
        displacement_ratio: 1.3,
        rupture_divergence: [],
        divergence_notes: [],
        milestone_comparison: [{
            id: 'dayton_accords',
            label: 'Dayton Accords',
            historical_week: 182,
            player_week: 189,
            delta_weeks: 7,
            status: 'late',
            summary: 'Dayton Accords occurred at player week 189 against historical week 182.',
        }],
    };

    it('adds eight authored dynamic sections with deterministic gates', () => {
        expect(sections.nato?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');
        expect(sections.hostage?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_RS');
        expect(sections.gorazde?.condition).toBe('GAME_OVER AND FINDING:civilian_displacement_record AND DISPLACEMENT_ABOVE:1.1');
        expect(sections.mistral?.condition).toBe('GAME_OVER AND FINDING:human_cost_record AND CASUALTY_ABOVE:1.1');
        expect(sections.sana?.condition).toBe('GAME_OVER AND FINDING:civilian_displacement_record AND DISPLACEMENT_ABOVE:1.1');
        expect(sections.summer?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_HRHB');
        expect(sections.halt?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');
        expect(sections.washington?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');

        expect(sections.nato?.variant).toBe('note');
        expect(sections.hostage?.variant).toBe('divergence');
        expect(sections.gorazde?.variant).toBe('divergence');
        expect(sections.mistral?.variant).toBe('divergence');
        expect(sections.sana?.variant).toBe('divergence');
        expect(sections.summer?.variant).toBe('divergence');
        expect(sections.halt?.variant).toBe('note');
        expect(sections.washington?.variant).toBe('note');
    });

    it('renders the new late-war sections through existing tokens only', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set([
                'nato_deliberate_force_1995',
                'un_hostage_crisis_1995',
                'gorazde_crisis_1994',
                'operation_mistral_2_1995',
                'operation_sana_1995',
                'operation_summer_95',
                'us_halts_federation_advance_1995',
                'hrhb_washington_agreement_1994',
            ]),
            gameOver: true,
            costLedger,
            historicalComparison: comparison,
        };

        expect(resolveCodexEssay(natoEssay, ctx).paragraphs.some(p => p.text.includes('Dayton Accords occurred at player date 20 Nov 1995'))).toBe(true);
        expect(resolveCodexEssay(hostageEssay, ctx).paragraphs.some(p => p.text.includes('RS war-crimes record [VRS]'))).toBe(true);
        expect(resolveCodexEssay(gorazdeEssay, ctx).paragraphs.some(p => p.text.includes('Civilian displacement record'))).toBe(true);
        expect(resolveCodexEssay(mistralEssay, ctx).paragraphs.some(p => p.text.includes('Human cost record'))).toBe(true);
        expect(resolveCodexEssay(sanaEssay, ctx).paragraphs.some(p => p.text.includes('Civilian displacement record'))).toBe(true);
        expect(resolveCodexEssay(summerEssay, ctx).paragraphs.some(p => p.text.includes('HRHB war-crimes record [HVO]'))).toBe(true);
        expect(resolveCodexEssay(haltEssay, ctx).paragraphs.some(p => p.text.includes('Timing against historical baseline: 7 weeks later'))).toBe(true);
        expect(resolveCodexEssay(washingtonEssay, ctx).paragraphs.some(p => p.text.includes('Dayton Accords occurred at player date 20 Nov 1995'))).toBe(true);
    });
});

describe('v0.9.1 vocab - UN mandate and sanctions breadth wave', () => {
    const londonEssay = findEssay('essay_london_conference_1992');
    const tribunalEssay = findEssay('essay_un_resolution_808_tribunal_1993');
    const srebrenicaSafeAreaEssay = findEssay('essay_un_resolution_819_srebrenica_1993');
    const forceAuthorityEssay = findEssay('essay_un_resolution_836_force_1993');
    const noFlyEssay = findEssay('essay_un_nfz_enforcement_1993');
    const sharpGuardEssay = findEssay('essay_operation_sharp_guard_1993');
    const strikeThreatEssay = findEssay('essay_nato_air_strike_threat_1993');
    const sanctionsEssay = findEssay('essay_un_resolution_820_sanctions_1993');

    const sections = {
        london: (londonEssay.dynamic_sections ?? []).find(s => s.id === 'v091_london_conference_human_cost_findings'),
        tribunal: (tribunalEssay.dynamic_sections ?? []).find(s => s.id === 'v091_resolution_808_cost_findings_docket'),
        srebrenicaSafeArea: (srebrenicaSafeAreaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_resolution_819_srebrenica_absent_note'),
        forceAuthority: (forceAuthorityEssay.dynamic_sections ?? []).find(s => s.id === 'v091_resolution_836_displacement_findings'),
        noFly: (noFlyEssay.dynamic_sections ?? []).find(s => s.id === 'v091_no_fly_dayton_timing_note'),
        sharpGuard: (sharpGuardEssay.dynamic_sections ?? []).find(s => s.id === 'v091_sharp_guard_human_cost_findings'),
        strikeThreat: (strikeThreatEssay.dynamic_sections ?? []).find(s => s.id === 'v091_air_strike_threat_dayton_timing_note'),
        sanctions: (sanctionsEssay.dynamic_sections ?? []).find(s => s.id === 'v091_resolution_820_rs_war_crimes_findings'),
    };

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 46000,
        total_civilian_killed: 38000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 46,000 military killed and 38,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
            {
                id: 'civilian_displacement_record',
                category: 'displacement',
                severity: 'grave',
                title: 'Civilian displacement record',
                text: 'The ledger records 2,200,000 civilians displaced or killed.',
                sources: ['UNHCR (1996) and ICTY findings'],
            },
            {
                id: 'war_crimes_record_RS',
                category: 'war_crimes',
                severity: 'record',
                faction: 'RS',
                title: 'RS war-crimes record',
                text: 'RS capital records contain 14 war-crime events.',
                sources: ['Sensitive History Design Gate section 4'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    const comparison: NonNullable<CodexRenderContext['historicalComparison']> = {
        duration_delta_weeks: 5,
        territory_divergence: {},
        casualty_ratio: 1.2,
        displacement_ratio: 1.25,
        rupture_divergence: [],
        divergence_notes: [],
        milestone_comparison: [
            {
                id: 'srebrenica_genocide_1995',
                label: 'Srebrenica Genocide',
                historical_week: 171,
                player_week: null,
                delta_weeks: null,
                status: 'absent',
                summary: 'Srebrenica Genocide did not occur in this run.',
            },
            {
                id: 'dayton_accords',
                label: 'Dayton Accords',
                historical_week: 182,
                player_week: 187,
                delta_weeks: 5,
                status: 'late',
                summary: 'Dayton Accords occurred at player week 187 against historical week 182.',
            },
        ],
    };

    it('adds eight UN mandate / sanctions dynamic sections with deterministic gates', () => {
        expect(sections.london?.condition).toBe('GAME_OVER AND FINDING:human_cost_record');
        expect(sections.tribunal?.condition).toBe('GAME_OVER AND FINDING_CATEGORY:war_crimes');
        expect(sections.srebrenicaSafeArea?.condition).toBe('GAME_OVER AND MILESTONE:srebrenica_genocide_1995:absent');
        expect(sections.forceAuthority?.condition).toBe('GAME_OVER AND FINDING:civilian_displacement_record AND DISPLACEMENT_ABOVE:1.1');
        expect(sections.noFly?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');
        expect(sections.sharpGuard?.condition).toBe('GAME_OVER AND FINDING:human_cost_record');
        expect(sections.strikeThreat?.condition).toBe('GAME_OVER AND MILESTONE:dayton_accords');
        expect(sections.sanctions?.condition).toBe('GAME_OVER AND FINDING:war_crimes_record_RS');

        expect(sections.london?.variant).toBe('note');
        expect(sections.tribunal?.variant).toBe('divergence');
        expect(sections.srebrenicaSafeArea?.variant).toBe('ghost');
        expect(sections.forceAuthority?.variant).toBe('divergence');
        expect(sections.noFly?.variant).toBe('note');
        expect(sections.sharpGuard?.variant).toBe('note');
        expect(sections.strikeThreat?.variant).toBe('note');
        expect(sections.sanctions?.variant).toBe('divergence');
    });

    it('renders the UN mandate / sanctions sections from existing endgame packets', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set([
                'london_conference_1992',
                'un_resolution_808_tribunal_1993',
                'un_resolution_819_srebrenica_1993',
                'un_resolution_836_force_1993',
                'un_nfz_enforcement_1993',
                'operation_sharp_guard_1993',
                'nato_air_strike_threat_1993',
                'un_resolution_820_sanctions_1993',
            ]),
            gameOver: true,
            costLedger,
            historicalComparison: comparison,
        };

        expect(resolveCodexEssay(londonEssay, ctx).paragraphs.some(p => p.text.includes('Human cost record'))).toBe(true);
        expect(resolveCodexEssay(tribunalEssay, ctx).paragraphs.some(p => p.text.includes('RS war-crimes record [VRS]'))).toBe(true);
        expect(resolveCodexEssay(srebrenicaSafeAreaEssay, ctx).paragraphs.some(p => p.variant === 'ghost' && p.text.includes('Srebrenica Genocide did not occur in this run'))).toBe(true);
        expect(resolveCodexEssay(forceAuthorityEssay, ctx).paragraphs.some(p => p.text.includes('Civilian displacement record'))).toBe(true);
        expect(resolveCodexEssay(noFlyEssay, ctx).paragraphs.some(p => p.text.includes('Dayton Accords occurred at player date 6 Nov 1995'))).toBe(true);
        expect(resolveCodexEssay(sharpGuardEssay, ctx).paragraphs.some(p => p.text.includes('Human cost record'))).toBe(true);
        expect(resolveCodexEssay(strikeThreatEssay, ctx).paragraphs.some(p => p.text.includes('Dayton Accords occurred at player date 6 Nov 1995'))).toBe(true);
        expect(resolveCodexEssay(sanctionsEssay, ctx).paragraphs.some(p => p.text.includes('RS war-crimes record [VRS]'))).toBe(true);
    });
});

describe('v0.9.1 vocab - consequence reader annotation follow-through', () => {
    const campsEssay = findEssay('essay_concentration_camps_revealed_1992');
    const tribunalEssay = findEssay('essay_un_resolution_808_tribunal_1993');
    const safeAreasEssay = findEssay('essay_un_safe_areas_declared_1993');
    const strikeThreatEssay = findEssay('essay_nato_air_strike_threat_1993');
    const bihacEssay = findEssay('essay_bihac_crisis_1994');

    const sections = {
        camps: (campsEssay.dynamic_sections ?? []).find(s => s.id === 'v091_annotation_accelerated_camps_discovery'),
        tribunal: (tribunalEssay.dynamic_sections ?? []).find(s => s.id === 'v091_annotation_early_war_crimes_tribunal'),
        safeAreas: (safeAreasEssay.dynamic_sections ?? []).find(s => s.id === 'v091_annotation_accelerated_safe_areas'),
        strikeThreat: (strikeThreatEssay.dynamic_sections ?? []).find(s => s.id === 'v091_annotation_early_nato_threshold'),
        bihacCollapse: (bihacEssay.dynamic_sections ?? []).find(s => s.id === 'v091_annotation_bihac_pocket_collapse'),
        bihacRefugees: (bihacEssay.dynamic_sections ?? []).find(s => s.id === 'v091_annotation_bihac_refugee_crisis'),
    };

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 0,
        total_civilian_killed: 0,
        findings: [],
        annotations: [
            {
                event_id: 'accelerated_camps_discovery_1992',
                tag: 'accelerated_camps_discovery_1992',
                text: 'Detention-camp documentation reaches Western capitals weeks earlier than in the historical record.',
                turn: 8,
                faction: 'RS',
            },
            {
                event_id: 'early_war_crimes_tribunal_1993',
                tag: 'early_war_crimes_tribunal_1993',
                text: 'ICTY mandate expanded; Belgrade distances itself from the VRS earlier than in history.',
                turn: 36,
                faction: 'RS',
            },
            {
                event_id: 'accelerated_safe_areas_1993',
                tag: 'accelerated_safe_areas_1993',
                text: 'UN Safe Areas arrive with a defence mandate; RS operations against Bihac, Srebrenica, Gorazde, and Zepa are constrained.',
                turn: 42,
                faction: 'RBiH',
            },
            {
                event_id: 'early_nato_threshold_1994',
                tag: 'early_nato_threshold_1994',
                text: 'NATO intervention threshold lowered; VRS operational freedom constrained.',
                turn: 90,
                faction: 'RS',
            },
            {
                event_id: 'bihac_pocket_collapse_1994',
                tag: 'bihac_pocket_collapse_1994',
                text: 'The Bihac pocket collapses; 5th Corps is destroyed or captured.',
                turn: 130,
                faction: 'RBiH',
            },
            {
                event_id: 'bihac_refugee_crisis_1994',
                tag: 'bihac_refugee_crisis_1994',
                text: 'A massive refugee wave floods RBiH-held central Bosnia.',
                turn: 132,
                faction: 'RBiH',
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('adds six annotation-gated Codex sections for existing consequence facts', () => {
        expect(sections.camps?.condition).toBe('GAME_OVER AND ANNOTATION:accelerated_camps_discovery_1992');
        expect(sections.tribunal?.condition).toBe('GAME_OVER AND ANNOTATION:early_war_crimes_tribunal_1993');
        expect(sections.safeAreas?.condition).toBe('GAME_OVER AND ANNOTATION:accelerated_safe_areas_1993');
        expect(sections.strikeThreat?.condition).toBe('GAME_OVER AND ANNOTATION:early_nato_threshold_1994');
        expect(sections.bihacCollapse?.condition).toBe('GAME_OVER AND ANNOTATION:bihac_pocket_collapse_1994');
        expect(sections.bihacRefugees?.condition).toBe('GAME_OVER AND ANNOTATION:bihac_refugee_crisis_1994');

        expect(sections.camps?.variant).toBe('divergence');
        expect(sections.tribunal?.variant).toBe('divergence');
        expect(sections.safeAreas?.variant).toBe('divergence');
        expect(sections.strikeThreat?.variant).toBe('note');
        expect(sections.bihacCollapse?.variant).toBe('ghost');
        expect(sections.bihacRefugees?.variant).toBe('divergence');
    });

    it('renders annotation text through the new Cost Ledger annotation tokens', () => {
        const baseCtx = {
            gameOver: true,
            costLedger,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
            },
        };

        const rendered = [
            ...resolveCodexEssay(campsEssay, { ...baseCtx, firedEventIds: new Set(['concentration_camps_revealed_1992']) }).paragraphs,
            ...resolveCodexEssay(tribunalEssay, { ...baseCtx, firedEventIds: new Set(['un_resolution_808_tribunal_1993']) }).paragraphs,
            ...resolveCodexEssay(safeAreasEssay, { ...baseCtx, firedEventIds: new Set(['un_safe_areas_declared_1993']) }).paragraphs,
            ...resolveCodexEssay(strikeThreatEssay, { ...baseCtx, firedEventIds: new Set(['nato_air_strike_threat_1993']) }).paragraphs,
            ...resolveCodexEssay(bihacEssay, { ...baseCtx, firedEventIds: new Set(['bihac_crisis_1994']) }).paragraphs,
        ].map(p => p.text).join('\n');

        expect(rendered).toContain('Accelerated Camps Discovery 1992 [VRS, 1 Jun 1992]');
        expect(rendered).toContain('Early War Crimes Tribunal 1993 [VRS, 14 Dec 1992]');
        expect(rendered).toContain('Accelerated Safe Areas 1993 [ARBiH, 25 Jan 1993]');
        expect(rendered).toContain('Early NATO Threshold 1994 [VRS, 27 Dec 1993]');
        expect(rendered).toContain('Bihac Pocket Collapse 1994 [ARBiH, 3 Oct 1994]');
        expect(rendered).toContain('Bihac Refugee Crisis 1994 [ARBiH, 17 Oct 1994]');
        expect(rendered).not.toMatch(/\bW\d+\b/);
    });
});
