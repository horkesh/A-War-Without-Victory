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

        expect(historical.war_duration_weeks).toBe(182);
        expect(historical.territory_final).toEqual({
            RS: 49,
            RBiH_HRHB_Federation: 51,
        });
        expect(historical.total_killed).toBeGreaterThan(90000);
        expect(historical.total_displaced).toBeGreaterThan(2000000);
        expect(historical.civilian_killed).toBeGreaterThan(30000);
        expect(Object.keys(historical.military_killed).sort()).toEqual(['HRHB', 'RBiH', 'RS']);
        expect(historical.source_notes).toContain('RDC');
        expect(historical.source_notes).toContain('Dayton');

        const milestones = historical.milestones ?? [];
        expect(milestones.map((row) => row.id)).toEqual([
            'srebrenica_genocide_1995',
            'dayton_accords',
        ]);
        for (const row of milestones) {
            expect(row.label.length).toBeGreaterThan(0);
            expect(row.historical_week).toBeGreaterThan(0);
            expect(row.source_notes.length).toBeGreaterThan(0);
            if (row.kind === 'rupture') expect(row.event_id).toBe(row.id);
        }
    });

    it('emits duration, territory, casualty, displacement, rupture, and milestone comparison truth from explicit inputs', () => {
        const comparison = compareToHistorical(ledger(), baseline());

        expect(comparison.duration_delta_weeks).toBe(6);
        expect(comparison.territory_divergence.RS).toBe(3);
        expect(comparison.territory_divergence.RBiH_HRHB_Federation).toBe(-3);
        expect(comparison.casualty_ratio).toBeGreaterThan(0);
        expect(comparison.displacement_ratio).toBeGreaterThan(0);
        expect(comparison.rupture_divergence).toEqual(['srebrenica_genocide_1995']);
        expect(comparison.divergence_notes.length).toBeGreaterThanOrEqual(4);
        expect(comparison.milestone_comparison?.map((row) => row.id)).toEqual([
            'srebrenica_genocide_1995',
            'dayton_accords',
        ]);
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
                divergence_notes: ['War lasted 6 weeks longer than the historical 182 weeks'],
            },
        };

        const resolved = resolveCodexEssay(essay, context);

        expect(JSON.stringify(essay)).toBe(before);
        expect(resolved.paragraphs.map((paragraph) => paragraph.text)).toEqual([
            'Canonical paragraph one.',
            'War lasted 6 weeks longer than the historical 182 weeks',
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
