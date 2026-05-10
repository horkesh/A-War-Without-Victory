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
        expect(dyn.some(p => p.text.includes('HRHB war-crimes record [HRHB]'))).toBe(true);
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
        expect(dyn.some(p => p.text.includes('HRHB displacement record [HRHB]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('AWWV displacement ledger'))).toBe(true);
    });
});

describe('v0.9.1 vocab - late-war findings breadth wave', () => {
    const zepaEssay = findEssay('essay_zepa_falls_1995');
    const federationEssay = findEssay('essay_federation_ground_offensive_1995');
    const zepaRuptureSection = (zepaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_zepa_rupture_finding');
    const federationHumanCostSection = (federationEssay.dynamic_sections ?? []).find(s => s.id === 'v091_federation_offensive_human_cost_findings');

    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 52000,
        total_civilian_killed: 41000,
        findings: [
            {
                id: 'rupture_zepa_falls_1995',
                category: 'rupture',
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

    it('adds a Zepa rupture finding section gated by the Zepa rupture id', () => {
        expect(zepaRuptureSection).toBeDefined();
        expect(zepaRuptureSection?.variant).toBe('divergence');
        expect(zepaRuptureSection?.condition).toBe('GAME_OVER AND FINDING:rupture_zepa_falls_1995');
    });

    it('renders Zepa rupture findings inside the Zepa essay', () => {
        const resolved = resolveCodexEssay(zepaEssay, {
            firedEventIds: new Set(['zepa_falls_1995']),
            gameOver: true,
            costLedger,
        });

        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Zepa safe area collapse [RS]'))).toBe(true);
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

        expect(rendered.some(text => text.includes('RS war-crimes record [RS]'))).toBe(true);
        expect(rendered.some(text => text.includes('Civilian displacement record: The ledger records 2,400,000'))).toBe(true);
        expect(rendered.some(text => text.includes('HRHB war-crimes record [HRHB]'))).toBe(true);
        expect(rendered.some(text => text.includes('Human cost record: The ledger records 56,000'))).toBe(true);
        expect(rendered.some(text => text.includes('RBiH war-crimes record [RBiH]'))).toBe(true);
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
        expect(dyn.some(p => p.text.includes('-8'))).toBe(true);
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
        expect(dyn.some(p => p.text.includes('HRHB war-crimes record [HRHB]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('ICTY Prlic'))).toBe(true);
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
                text: 'The ledger records acceptance of peace plan vance_owen at week 50.',
                sources: ['Victory Conditions and Pyrrhic Scoring section 1'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('adds a Srebrenica finding section gated by the rupture finding id', () => {
        expect(srebrenicaSection).toBeDefined();
        expect(srebrenicaSection?.variant).toBe('divergence');
        expect(srebrenicaSection?.condition).toBe('GAME_OVER AND FINDING:rupture_srebrenica_genocide_1995');
    });

    it('renders the Srebrenica finding text and sources inside the historical essay', () => {
        const ctx: CodexRenderContext = {
            firedEventIds: new Set(['srebrenica_falls_1995']),
            gameOver: true,
            costLedger,
        };
        const resolved = resolveCodexEssay(srebrenicaEssay, ctx);
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic' && p.variant === 'divergence');
        expect(dyn.some(p => p.text.includes('Srebrenica genocide [RS]'))).toBe(true);
        expect(dyn.some(p => p.text.includes('ICJ Bosnia v. Serbia'))).toBe(true);
    });

    it('adds a Dayton findings docket gated by any grave finding', () => {
        expect(daytonSection).toBeDefined();
        expect(daytonSection?.variant).toBe('divergence');
        expect(daytonSection?.condition).toBe('GAME_OVER AND FINDING_SEVERITY:grave');
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
        expect(dyn.some(p => p.text.includes('Early negotiated settlement: The ledger records acceptance of peace plan vance_owen at week 50.'))).toBe(true);
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
        expect(dyn.some(p => p.text.includes('Dayton Accords: historical W182; player W188; delta +6w; status late.'))).toBe(true);
        expect(dyn.some(p => p.text.includes('Srebrenica Genocide: historical W171; player not recorded; status absent.'))).toBe(true);
    });
});
