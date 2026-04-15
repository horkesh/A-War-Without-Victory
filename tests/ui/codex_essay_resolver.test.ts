import { describe, it, expect } from 'vitest';
import {
    evaluateEssayCondition,
    resolveCodexEssay,
    type CodexRenderContext,
    type EssayEntry,
} from '../../src/ui/map/components/codex/codexEssayResolver.js';

function context(overrides: Partial<CodexRenderContext> = {}): CodexRenderContext {
    return {
        firedEventIds: new Set<string>(),
        eventFlags: {},
        historicalComparison: undefined,
        gameOver: false,
        ...overrides,
    };
}

function essay(overrides: Partial<EssayEntry> = {}): EssayEntry {
    return {
        id: 'essay_test',
        event_id: 'test_event',
        title: 'Test Essay',
        year: 1995,
        category: 'political',
        content: 'Paragraph one.\n\nParagraph two.',
        ...overrides,
    };
}

describe('codexEssayResolver', () => {
    it('keeps regular essays locked until their event fires', () => {
        const resolved = resolveCodexEssay(essay(), context());
        expect(resolved.isUnlocked).toBe(false);
        expect(resolved.isGhost).toBe(false);
        expect(resolved.paragraphs).toEqual([]);
    });

    it('unlocks canonical essay content when the source event fired', () => {
        const resolved = resolveCodexEssay(
            essay(),
            context({ firedEventIds: new Set(['test_event']) }),
        );
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(false);
        expect(resolved.paragraphs.map((paragraph) => paragraph.text)).toEqual([
            'Paragraph one.',
            'Paragraph two.',
        ]);
    });

    it('surfaces a ghost essay when the historical rupture is absent at game over', () => {
        const resolved = resolveCodexEssay(
            essay({
                ghost_when: 'GAME_OVER AND NOT RUPTURE:srebrenica_genocide_1995',
                ghost_summary: 'History took a path your war never reached.',
            }),
            context({
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: -6,
                    territory_divergence: {},
                    casualty_ratio: 0.8,
                    displacement_ratio: 0.7,
                    rupture_divergence: [],
                    divergence_notes: ['Srebrenica enclave survived'],
                },
            }),
        );
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(true);
        expect(resolved.paragraphs[0]).toMatchObject({
            kind: 'ghost',
            text: 'History took a path your war never reached.',
        });
    });

    it('does not ghost the essay when the rupture occurred', () => {
        const resolved = resolveCodexEssay(
            essay({
                ghost_when: 'GAME_OVER AND NOT RUPTURE:srebrenica_genocide_1995',
            }),
            context({
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 0,
                    territory_divergence: {},
                    casualty_ratio: 1,
                    displacement_ratio: 1,
                    rupture_divergence: ['srebrenica_genocide_1995'],
                    divergence_notes: ['Srebrenica genocide occurred'],
                },
            }),
        );
        expect(resolved.isUnlocked).toBe(false);
        expect(resolved.isGhost).toBe(false);
    });

    it('appends comparison notes through a dynamic divergence section', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [
                    {
                        id: 'comparison',
                        insert_after_paragraph: -1,
                        condition: 'GAME_OVER AND COMPARISON_NOTES',
                        variant: 'divergence',
                        content: '{comparison_notes}',
                    },
                ],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 4,
                    territory_divergence: {},
                    casualty_ratio: 1.1,
                    displacement_ratio: 1.2,
                    rupture_divergence: [],
                    divergence_notes: [
                        'War lasted 4 weeks longer than the historical 188 weeks',
                        'Srebrenica enclave survived',
                    ],
                },
            }),
        );

        expect(resolved.paragraphs.slice(-2)).toEqual([
            {
                kind: 'dynamic',
                variant: 'divergence',
                text: 'War lasted 4 weeks longer than the historical 188 weeks',
            },
            {
                kind: 'dynamic',
                variant: 'divergence',
                text: 'Srebrenica enclave survived',
            },
        ]);
    });

    it('evaluates event flags and parentheses deterministically', () => {
        const result = evaluateEssayCondition(
            'GAME_OVER AND (FLAG:dayton_framework OR FLAG:ceasefire)',
            context({
                gameOver: true,
                eventFlags: { ceasefire: false, dayton_framework: true },
            }),
        );
        expect(result).toBe(true);
    });
});
