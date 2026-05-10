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

describe('v0.9.1 vocab — Cost Ledger findings in Codex essays', () => {
    const srebrenicaEssay = findEssay('essay_srebrenica_falls_1995');
    const daytonEssay = findEssay('essay_dayton_signed_1995');
    const srebrenicaSection = (srebrenicaEssay.dynamic_sections ?? []).find(s => s.id === 'v091_cost_ledger_srebrenica_finding');
    const daytonSection = (daytonEssay.dynamic_sections ?? []).find(s => s.id === 'v091_cost_ledger_findings_docket');

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
