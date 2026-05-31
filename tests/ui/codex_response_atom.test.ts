import { describe, it, expect } from 'vitest';
import {
    evaluateEssayCondition,
    resolveCodexEssay,
    type CodexRenderContext,
    type EssayEntry,
} from '../../src/ui/map/components/codex/codexEssayResolver.js';

// Phase 3 Thread 1: RESPONSE:<event_id>:<response_id> condition atom. Unlocks /
// annotates codex essays based on what the player (or bot) chose, projected from
// state.military.event_decision_log into LoadedGameState.decisionResponses.

function context(overrides: Partial<CodexRenderContext> = {}): CodexRenderContext {
    return {
        firedEventIds: new Set<string>(),
        eventFlags: {},
        decisionResponses: new Set<string>(),
        historicalComparison: undefined,
        costLedger: undefined,
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

describe('codex RESPONSE: atom', () => {
    it('matches only when the decision is present in decisionResponses', () => {
        const ctx = context({
            decisionResponses: new Set(['rs_strategic_goals:all_six']),
        });
        expect(evaluateEssayCondition('RESPONSE:rs_strategic_goals:all_six', ctx)).toBe(true);
        expect(evaluateEssayCondition('RESPONSE:rs_strategic_goals:reject', ctx)).toBe(false);
        expect(evaluateEssayCondition('RESPONSE:other_event:foo', ctx)).toBe(false);
    });

    it('is false when decisionResponses is absent', () => {
        const ctx = context({ decisionResponses: undefined });
        expect(evaluateEssayCondition('RESPONSE:rs_strategic_goals:all_six', ctx)).toBe(false);
    });

    it('unlocks a ghost essay gated on a RESPONSE: condition', () => {
        // Ghost path is the condition-driven unlock channel (the source event has not
        // fired, but a player decision surfaces the counterfactual essay).
        const gated = essay({
            ghost_when: 'NOT EVENT:test_event AND RESPONSE:rs_strategic_goals:all_six',
            ghost_summary: 'Your endorsement reshaped what this entry records.',
        });
        // Decision absent -> stays locked.
        expect(resolveCodexEssay(gated, context()).isUnlocked).toBe(false);
        // Decision present (and event not fired) -> ghost-unlocks.
        const resolved = resolveCodexEssay(
            gated,
            context({ decisionResponses: new Set(['rs_strategic_goals:all_six']) }),
        );
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(true);
        expect(resolved.paragraphs[0].text).toBe('Your endorsement reshaped what this entry records.');
    });

    it('annotates via a dynamic section gated on RESPONSE:', () => {
        const annotated = essay({
            dynamic_sections: [
                {
                    id: 'all_six_note',
                    condition: 'RESPONSE:rs_strategic_goals:all_six',
                    insert_after_paragraph: 0,
                    variant: 'note',
                    content: 'You endorsed all six strategic objectives.',
                },
            ],
        });
        // Essay unlocked (event fired) but decision absent -> no annotation.
        const noDecision = resolveCodexEssay(
            annotated,
            context({ firedEventIds: new Set(['test_event']) }),
        );
        expect(noDecision.paragraphs.some((p) => p.kind === 'dynamic')).toBe(false);

        const withDecision = resolveCodexEssay(
            annotated,
            context({
                firedEventIds: new Set(['test_event']),
                decisionResponses: new Set(['rs_strategic_goals:all_six']),
            }),
        );
        const dynamic = withDecision.paragraphs.filter((p) => p.kind === 'dynamic');
        expect(dynamic).toHaveLength(1);
        expect(dynamic[0].text).toBe('You endorsed all six strategic objectives.');
        expect(dynamic[0].variant).toBe('note');
    });

    it('composes with AND / OR / NOT', () => {
        const chose = context({
            firedEventIds: new Set(['test_event']),
            decisionResponses: new Set(['rs_strategic_goals:all_six']),
        });
        const didNotChoose = context({ firedEventIds: new Set(['test_event']) });

        // AND
        expect(evaluateEssayCondition('EVENT:test_event AND RESPONSE:rs_strategic_goals:all_six', chose)).toBe(true);
        expect(evaluateEssayCondition('EVENT:test_event AND RESPONSE:rs_strategic_goals:all_six', didNotChoose)).toBe(false);

        // OR
        expect(evaluateEssayCondition('RESPONSE:absent:x OR RESPONSE:rs_strategic_goals:all_six', chose)).toBe(true);
        expect(evaluateEssayCondition('RESPONSE:absent:x OR RESPONSE:still_absent:y', chose)).toBe(false);

        // NOT
        expect(evaluateEssayCondition('NOT RESPONSE:rs_strategic_goals:all_six', chose)).toBe(false);
        expect(evaluateEssayCondition('NOT RESPONSE:rs_strategic_goals:all_six', didNotChoose)).toBe(true);
    });
});
