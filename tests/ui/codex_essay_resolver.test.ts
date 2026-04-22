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

// ─── v0.9.1: comparison-derived condition atoms ──────────────────────────

describe('codexEssayResolver — comparison condition atoms', () => {
    function withComparison(overrides: Partial<NonNullable<CodexRenderContext['historicalComparison']>>): CodexRenderContext {
        return context({
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
                ...overrides,
            },
        });
    }

    it('DURATION_LONGER matches positive delta, misses zero and negative', () => {
        expect(evaluateEssayCondition('DURATION_LONGER', withComparison({ duration_delta_weeks: 4 }))).toBe(true);
        expect(evaluateEssayCondition('DURATION_LONGER', withComparison({ duration_delta_weeks: 0 }))).toBe(false);
        expect(evaluateEssayCondition('DURATION_LONGER', withComparison({ duration_delta_weeks: -4 }))).toBe(false);
    });

    it('DURATION_SHORTER matches negative delta only', () => {
        expect(evaluateEssayCondition('DURATION_SHORTER', withComparison({ duration_delta_weeks: -6 }))).toBe(true);
        expect(evaluateEssayCondition('DURATION_SHORTER', withComparison({ duration_delta_weeks: 0 }))).toBe(false);
    });

    it('CASUALTY_ABOVE / CASUALTY_BELOW read casualty_ratio', () => {
        const high = withComparison({ casualty_ratio: 1.3 });
        expect(evaluateEssayCondition('CASUALTY_ABOVE:1.2', high)).toBe(true);
        expect(evaluateEssayCondition('CASUALTY_BELOW:1.2', high)).toBe(false);

        const low = withComparison({ casualty_ratio: 0.5 });
        expect(evaluateEssayCondition('CASUALTY_ABOVE:1.2', low)).toBe(false);
        expect(evaluateEssayCondition('CASUALTY_BELOW:1.2', low)).toBe(true);
    });

    it('DISPLACEMENT_ABOVE / DISPLACEMENT_BELOW read displacement_ratio', () => {
        const high = withComparison({ displacement_ratio: 1.5 });
        expect(evaluateEssayCondition('DISPLACEMENT_ABOVE:1.0', high)).toBe(true);
        expect(evaluateEssayCondition('DISPLACEMENT_BELOW:1.0', high)).toBe(false);
    });

    it('TERRITORY_ABOVE reads territory_divergence map (player_pct - historical_pct)', () => {
        const ctx = withComparison({ territory_divergence: { RS: 5, RBiH_HRHB_Federation: -5 } });
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS:3', ctx)).toBe(true);
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS:8', ctx)).toBe(false);
        expect(evaluateEssayCondition('TERRITORY_BELOW:RBiH_HRHB_Federation:-3', ctx)).toBe(true);
    });

    it('comparison atoms return false when historicalComparison is absent', () => {
        const ctx = context();
        expect(evaluateEssayCondition('DURATION_LONGER', ctx)).toBe(false);
        expect(evaluateEssayCondition('CASUALTY_ABOVE:0.5', ctx)).toBe(false);
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS:0', ctx)).toBe(false);
    });

    it('malformed thresholds do not match', () => {
        const ctx = withComparison({ casualty_ratio: 1.5 });
        expect(evaluateEssayCondition('CASUALTY_ABOVE:notanumber', ctx)).toBe(false);
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS', ctx)).toBe(false); // missing threshold
    });

    it('new atoms compose with AND / OR / NOT', () => {
        const ctx = withComparison({
            duration_delta_weeks: 10,
            casualty_ratio: 0.8,
            rupture_divergence: [],
        });
        expect(evaluateEssayCondition(
            'GAME_OVER AND DURATION_LONGER AND NOT RUPTURE:srebrenica_genocide_1995',
            ctx,
        )).toBe(true);
    });
});

// ─── v0.9.1: template interpolation tokens ───────────────────────────────

describe('codexEssayResolver — template interpolation tokens', () => {
    function resolveWith(content: string, comparison: Partial<NonNullable<CodexRenderContext['historicalComparison']>>): string[] {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [
                    {
                        id: 'dyn',
                        insert_after_paragraph: -1,
                        condition: 'GAME_OVER',
                        variant: 'divergence',
                        content,
                    },
                ],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 0,
                    territory_divergence: {},
                    casualty_ratio: 1,
                    displacement_ratio: 1,
                    rupture_divergence: [],
                    divergence_notes: [],
                    ...comparison,
                },
            }),
        );
        return resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
    }

    it('{duration_delta_weeks} renders signed integer', () => {
        expect(resolveWith('Ran {duration_delta_weeks} weeks.', { duration_delta_weeks: 4 }))
            .toEqual(['Ran +4 weeks.']);
        expect(resolveWith('Ran {duration_delta_weeks} weeks.', { duration_delta_weeks: -6 }))
            .toEqual(['Ran -6 weeks.']);
    });

    it('{duration_delta_abs} renders unsigned absolute value', () => {
        expect(resolveWith('{duration_delta_abs} week gap.', { duration_delta_weeks: -6 }))
            .toEqual(['6 week gap.']);
    });

    it('{casualty_ratio_pct} and {displacement_ratio_pct} render rounded percentages', () => {
        expect(resolveWith('{casualty_ratio_pct}% / {displacement_ratio_pct}%.', {
            casualty_ratio: 1.1,
            displacement_ratio: 0.73,
        })).toEqual(['110% / 73%.']);
    });

    it('{rupture_list} joins the rupture_divergence array', () => {
        expect(resolveWith('Ruptures: {rupture_list}.', {
            rupture_divergence: ['srebrenica_genocide_1995', 'xxx_other'],
        })).toEqual(['Ruptures: srebrenica_genocide_1995, xxx_other.']);
    });

    it('{territory_RS_delta} renders signed one-decimal percentage', () => {
        expect(resolveWith('RS delta {territory_RS_delta}.', {
            territory_divergence: { RS: 3.45 },
        })).toEqual(['RS delta +3.5.']);
    });

    it('{territory_RBiH_HRHB_Federation_delta} handles multi-segment keys', () => {
        expect(resolveWith('Fed delta {territory_RBiH_HRHB_Federation_delta}.', {
            territory_divergence: { RBiH_HRHB_Federation: -5.21 },
        })).toEqual(['Fed delta -5.2.']);
    });

    it('signed() leaves zero unsigned but signs non-zero values', () => {
        // duration delta 0 → "0" (no leading "+"), matching conventional English.
        expect(resolveWith('Ran {duration_delta_weeks} weeks.', { duration_delta_weeks: 0 }))
            .toEqual(['Ran 0 weeks.']);
    });

    it('absent historicalComparison renders every token as empty string', () => {
        // No historicalComparison at all — token expands to empty.
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [{
                    id: 'dyn',
                    insert_after_paragraph: -1,
                    condition: 'GAME_OVER',
                    variant: 'divergence',
                    content: '[{duration_delta_weeks}][{casualty_ratio_pct}][{territory_RS_delta}][{rupture_list}]',
                }],
            }),
            context({ firedEventIds: new Set(['test_event']), gameOver: true, historicalComparison: undefined }),
        );
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
        expect(dyn).toEqual(['[][][][]']);
    });

    it('missing territory key renders as empty string', () => {
        // Comparison exists but the requested faction key isn't in territory_divergence.
        expect(resolveWith('Missing {territory_ZZZ_delta}.', {})).toEqual(['Missing .']);
    });

    it('unknown tokens pass through literally for review visibility', () => {
        expect(resolveWith('Keep {totally_unknown_token} visible.', {}))
            .toEqual(['Keep {totally_unknown_token} visible.']);
    });

    it('{comparison_notes} still works (backwards compatible)', () => {
        expect(resolveWith('{comparison_notes}', {
            divergence_notes: ['Note A', 'Note B'],
        })).toEqual(['Note A', 'Note B']);
    });
});
