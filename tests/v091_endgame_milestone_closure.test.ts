import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CostLedger } from '../src/sim/endgame/cost_ledger.js';
import { compareToHistorical } from '../src/sim/endgame/endgame_comparison.js';
import type { HistoricalBaseline } from '../src/state/negotiation_types.js';
import {
    resolveCodexEssay,
    type CodexRenderContext,
    type EssayEntry,
} from '../src/ui/map/components/codex/codexEssayResolver.js';

const REPO_ROOT = resolve(__dirname, '..');

function readText(...parts: string[]): string {
    return readFileSync(resolve(REPO_ROOT, ...parts), 'utf8');
}

function readJson<T>(...parts: string[]): T {
    return JSON.parse(readText(...parts)) as T;
}

function baseline(): HistoricalBaseline {
    return readJson<HistoricalBaseline>('data', 'reference', 'historical_baseline.json');
}

function ledger(): CostLedger {
    return {
        war_duration_weeks: 188,
        entries: [
            {
                faction: 'HRHB',
                territory_controlled_pct: 18,
                military_killed: 3000,
                military_wounded: 9000,
                civilian_casualties_caused: 1000,
                refugees_created: 220000,
                enclaves_held: [],
                enclaves_lost: [],
                war_crimes_events: 2,
                outcome_class: 'survival',
                condemnation_flags: [],
            },
            {
                faction: 'RBiH',
                territory_controlled_pct: 30,
                military_killed: 27000,
                military_wounded: 51000,
                civilian_casualties_caused: 2000,
                refugees_created: 780000,
                enclaves_held: [],
                enclaves_lost: [],
                war_crimes_events: 3,
                outcome_class: 'survival',
                condemnation_flags: [],
            },
            {
                faction: 'RS',
                territory_controlled_pct: 52,
                military_killed: 16000,
                military_wounded: 32000,
                civilian_casualties_caused: 30000,
                refugees_created: 950000,
                enclaves_held: [],
                enclaves_lost: [],
                war_crimes_events: 30,
                outcome_class: 'failure',
                condemnation_flags: ['genocide_condemnation'],
            },
        ],
        rupture_consequences: [
            {
                id: 'srebrenica_genocide_1995',
                recorded_turn: 170,
                perpetrator_faction: 'RS',
                description: 'Srebrenica rupture record',
            },
        ],
        total_military_killed: 46000,
        total_civilian_killed: 33000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records a grave human cost.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
        ],
        annotations: [],
    } as CostLedger;
}

describe('v0.9.1 Dynamic Essay + Endgame Comparison milestone closure', () => {
    it('keeps one authoritative historical baseline artifact with all comparison categories', () => {
        const historical = baseline();

        // Two like-for-like endpoints (R8 ending truth pass): Dayton initialled 21 Nov 1995
        // (week 189) for a settled campaign; ceasefire in force 12 Oct 1995 (week 183) otherwise.
        expect(historical.war_duration_weeks).toBe(189);
        expect(historical.fighting_end_week).toBe(183);
        expect(historical.territory_final).toEqual({
            RS: 49,
            RBiH_HRHB_Federation: 51,
        });
        // No ceasefire-line share is carried until one is sourced (SHDG §6).
        expect(historical.territory_ceasefire).toBeUndefined();
        // RDC 2007: 97,207 killed or missing = 57,523 soldiers + 39,684 civilians.
        expect(historical.total_killed).toBe(97207);
        expect(historical.military_killed_total).toBe(57523);
        expect(historical.civilian_killed).toBe(39684);
        expect(historical.military_killed_total! + historical.civilian_killed).toBe(historical.total_killed);
        // By army of service: a different RDC table that does not sum to the military total.
        expect(historical.military_killed).toEqual({ RBiH: 30906, RS: 20775, HRHB: 5919 });
        expect(historical.total_displaced).toBeGreaterThan(2000000);
        expect(historical.source_notes).toContain('RDC');
        expect(historical.source_notes).toContain('Dayton');

        const milestones = historical.milestones ?? [];
        expect(milestones.map((row) => row.id)).toEqual([
            'srebrenica_genocide_1995',
            'ceasefire_1995',
            'dayton_accords',
        ]);
        expect(milestones.map((row) => [row.id, row.historical_week, row.kind, row.ending])).toEqual([
            ['srebrenica_genocide_1995', 170, 'rupture', undefined],
            ['ceasefire_1995', 183, 'war_end', 'no_settlement'],
            ['dayton_accords', 189, 'war_end', 'settlement'],
        ]);
        for (const row of milestones) {
            expect(row.label.length).toBeGreaterThan(0);
            expect(row.historical_week).toBeGreaterThan(0);
            expect(row.source_notes.length).toBeGreaterThan(0);
            if (row.kind === 'rupture') expect(row.event_id).toBe(row.id);
        }
    });

    it('emits duration, territory, casualty, displacement, rupture, and milestone comparison truth from explicit inputs', () => {
        // Default ending 'settlement': compared with the Dayton initialling (week 189).
        const comparison = compareToHistorical(ledger(), baseline());

        expect(comparison.duration_delta_weeks).toBe(188 - 189);
        expect(comparison.historical_reference_week).toBe(189);
        expect(comparison.territory_divergence.RS).toBe(3);
        expect(comparison.territory_divergence.RBiH_HRHB_Federation).toBe(-3);
        expect(comparison.casualty_ratio).toBeCloseTo(46000 / 57523, 10);
        expect(comparison.civilian_ratio).toBeCloseTo(33000 / 39684, 10);
        expect(comparison.displacement_ratio).toBeGreaterThan(0);
        expect(comparison.rupture_divergence).toEqual(['srebrenica_genocide_1995']);
        expect(comparison.divergence_notes).toEqual(expect.arrayContaining([
            'Military killed: 46,000 in this campaign; 57,523 in the historical war',
            'Civilians killed: 33,000 in this campaign; 39,684 in the historical war',
            'Srebrenica genocide occurred',
        ]));
        expect(comparison.divergence_notes.some((note) => note.startsWith('War lasted'))).toBe(false);
        // Rupture rows are never timing rows; only the matching war-end milestone is compared.
        expect(comparison.milestone_comparison?.map((row) => row.id)).toEqual(['dayton_accords']);

        // A campaign ended without a settlement is compared with the ceasefire (week 183).
        const unsettled = compareToHistorical(ledger(), baseline(), 'no_settlement');
        expect(unsettled.duration_delta_weeks).toBe(188 - 183);
        expect(unsettled.historical_reference_week).toBe(183);
        expect(unsettled.territory_divergence).toEqual(comparison.territory_divergence);
        expect(unsettled.milestone_comparison?.map((row) => row.id)).toEqual(['ceasefire_1995']);
    });

    it('renders dynamic sections without mutating canonical historical essay text', () => {
        const essay: EssayEntry = {
            id: 'immutable_test',
            event_id: 'immutable_event',
            title: 'Immutable Test',
            year: 1995,
            category: 'political',
            content: 'Canonical paragraph one.\n\nCanonical paragraph two.',
            dynamic_sections: [{
                id: 'v091_dynamic_insert',
                insert_after_paragraph: 0,
                condition: 'GAME_OVER AND COMPARISON_NOTES',
                variant: 'divergence',
                content: '{comparison_notes}',
            }],
        };
        const before = JSON.stringify(essay);
        const context: CodexRenderContext = {
            firedEventIds: new Set(['immutable_event']),
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 6,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: ['Military killed: 46,000 in this campaign; 57,523 in the historical war'],
            },
        };

        const resolved = resolveCodexEssay(essay, context);

        expect(JSON.stringify(essay)).toBe(before);
        // The producer's note renders through the localized comparison line (verdict.compare.militaryDead).
        expect(resolved.paragraphs.map((paragraph) => paragraph.text)).toEqual([
            'Canonical paragraph one.',
            'Military dead on all sides: 46,000 in this campaign. Historical war: 57,523 soldiers killed or missing (Research and Documentation Center, Sarajevo, 2007).',
            'Canonical paragraph two.',
        ]);
    });

    it('guards the authored dynamic Codex breadth as a milestone-level package', () => {
        const index = readJson<{ essays: Array<{ dynamic_sections?: Array<{ id: string; condition?: string; content?: string }> }> }>(
            'data',
            'scenarios',
            'essays',
            'essay_index.json',
        );
        const v091Sections = index.essays
            .flatMap((essay) => essay.dynamic_sections ?? [])
            .filter((section) => section.id.startsWith('v091_'));

        expect(v091Sections.length).toBeGreaterThanOrEqual(60);
        expect(v091Sections.every((section) => typeof section.condition === 'string' && section.condition.length > 0)).toBe(true);
        expect(v091Sections.every((section) => typeof section.content === 'string' && section.content.length > 0)).toBe(true);
        expect(v091Sections.some((section) => section.condition?.includes('FINDING_CATEGORY:'))).toBe(true);
        expect(v091Sections.some((section) => section.condition?.includes('ANNOTATION:'))).toBe(true);
        expect(v091Sections.some((section) => section.condition?.includes('MILESTONE:'))).toBe(true);
    });

    it('records v0.9.1 as closed in the plan and master roadmap', () => {
        const plan = readText('docs', 'plans', '2026-04-06-v091-dynamic-essay-endgame-comparison-plan.md');
        const roadmap = readText('docs', 'plans', 'MASTER_ROADMAP.md');

        expect(plan).toContain('**Status:** CLOSED-FOR-AGENT-SCOPE');
        expect(plan).toContain('canonical historical text remains immutable substrate');
        expect(plan).toContain('All five execution phases are agent-closed');
        expect(roadmap).toContain('| 12 | Dynamic Codex | R4 |');
        expect(roadmap).toContain('Prior roadmap history remains in Git before this consolidation');
    });
});
