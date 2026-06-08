import { describe, it, expect } from 'vitest';
import {
    CodexTier,
    deriveDefaultTier,
    effectiveTier,
    resolveCodexEssay,
    resolveCodexEssayIndex,
    type CodexRenderContext,
    type EssayEntry,
} from '../../src/ui/map/components/codex/codexEssayResolver.js';
import essayIndex from '../../data/scenarios/essays/essay_index.json';

function context(overrides: Partial<CodexRenderContext> = {}): CodexRenderContext {
    return {
        firedEventIds: new Set<string>(),
        eventFlags: {},
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

// ─── A1a: tier derivation + effective tier ───────────────────────────────

describe('codex tier system (A1a)', () => {
    it('derives FIXED for a plain essay (no ghost_when, no dynamic_sections)', () => {
        expect(deriveDefaultTier(essay())).toBe(CodexTier.FIXED);
    });

    it('derives CONDITIONAL when ghost_when is present', () => {
        expect(deriveDefaultTier(essay({ ghost_when: 'GAME_OVER' }))).toBe(CodexTier.CONDITIONAL);
    });

    it('derives SHAPEABLE when dynamic_sections is non-empty', () => {
        expect(deriveDefaultTier(essay({
            dynamic_sections: [{ id: 'd', content: 'x', condition: 'ALWAYS' }],
        }))).toBe(CodexTier.SHAPEABLE);
    });

    it('CONDITIONAL takes precedence over SHAPEABLE when both signals present', () => {
        expect(deriveDefaultTier(essay({
            ghost_when: 'GAME_OVER',
            dynamic_sections: [{ id: 'd', content: 'x', condition: 'ALWAYS' }],
        }))).toBe(CodexTier.CONDITIONAL);
    });

    it('effectiveTier honors a declared valid tier over the derived default', () => {
        // Plain essay would derive FIXED; declared AHISTORICAL must win (owner-tunable data).
        expect(effectiveTier(essay({ tier: CodexTier.AHISTORICAL }))).toBe(CodexTier.AHISTORICAL);
    });

    it('effectiveTier falls back to derived default when tier is absent or out of range', () => {
        expect(effectiveTier(essay({ ghost_when: 'GAME_OVER' }))).toBe(CodexTier.CONDITIONAL);
        expect(effectiveTier(essay({ tier: 99 }))).toBe(CodexTier.FIXED); // invalid → derived
        expect(effectiveTier(essay({ tier: -1 }))).toBe(CodexTier.FIXED);
        expect(effectiveTier(essay({ tier: 1.5 }))).toBe(CodexTier.FIXED); // non-integer
    });

    it('resolveCodexEssay surfaces the effective tier on the result', () => {
        const resolved = resolveCodexEssay(
            essay({ tier: CodexTier.SHAPEABLE }),
            context({ firedEventIds: new Set(['test_event']) }),
        );
        expect(resolved.tier).toBe(CodexTier.SHAPEABLE);
    });
});

// ─── A1b: event-dependency-graph unlock ──────────────────────────────────

describe('codex dependency-graph unlock (A1b)', () => {
    it('requires_events keeps an event-fired essay locked until upstream events fire', () => {
        const e = essay({ requires_events: ['upstream_a', 'upstream_b'] });

        // Base event fired but upstream not yet → still locked, with hint.
        const locked = resolveCodexEssay(e, context({ firedEventIds: new Set(['test_event']) }));
        expect(locked.isUnlocked).toBe(false);
        expect(locked.lockReason).toEqual({ kind: 'event', detail: 'upstream_a' }); // strictCompare-min

        // One upstream fired, one missing → still locked, hint points to the remaining one.
        const partial = resolveCodexEssay(e, context({ firedEventIds: new Set(['test_event', 'upstream_a']) }));
        expect(partial.isUnlocked).toBe(false);
        expect(partial.lockReason).toEqual({ kind: 'event', detail: 'upstream_b' });

        // All upstream fired → unlocks.
        const unlocked = resolveCodexEssay(
            e,
            context({ firedEventIds: new Set(['test_event', 'upstream_a', 'upstream_b']) }),
        );
        expect(unlocked.isUnlocked).toBe(true);
        expect(unlocked.lockReason).toBeNull();
    });

    it('the graph gate can never force-open an essay whose base unlock has not fired', () => {
        // requires_events fully satisfied, but the essay's own event has NOT fired.
        const e = essay({ requires_events: ['upstream_a'] });
        const resolved = resolveCodexEssay(e, context({ firedEventIds: new Set(['upstream_a']) }));
        expect(resolved.isUnlocked).toBe(false);
        expect(resolved.lockReason).toEqual({ kind: 'event_fire' });
    });

    it('unlock_turn_min gates on currentTurn (and is satisfied when turn is unknown)', () => {
        const e = essay({ unlock_turn_min: 50 });
        const before = resolveCodexEssay(e, context({ firedEventIds: new Set(['test_event']), currentTurn: 30 }));
        expect(before.isUnlocked).toBe(false);
        expect(before.lockReason).toEqual({ kind: 'turn', turn: 50 });

        const after = resolveCodexEssay(e, context({ firedEventIds: new Set(['test_event']), currentTurn: 60 }));
        expect(after.isUnlocked).toBe(true);

        // No currentTurn handle → floor treated as satisfied (no over-hiding).
        const noTurn = resolveCodexEssay(e, context({ firedEventIds: new Set(['test_event']) }));
        expect(noTurn.isUnlocked).toBe(true);
    });

    it('gate precedence is event → essay → turn (first unmet wins)', () => {
        const e = essay({ requires_events: ['ev'], unlock_turn_min: 50 });
        // Both event AND turn unmet → event reported first.
        const r = resolveCodexEssay(e, context({ firedEventIds: new Set(['test_event']), currentTurn: 10 }));
        expect(r.lockReason).toEqual({ kind: 'event', detail: 'ev' });
    });

    it('transitive requires_essays unlocks a chain A → B → C deterministically', () => {
        const a = essay({ id: 'essay_a', event_id: 'ev_a' });
        const b = essay({ id: 'essay_b', event_id: 'ev_b', requires_essays: ['essay_a'] });
        const c = essay({ id: 'essay_c', event_id: 'ev_c', requires_essays: ['essay_b'] });

        // All three base events fired, but the essay graph chains them.
        const ctx = context({ firedEventIds: new Set(['ev_a', 'ev_b', 'ev_c']) });
        const resolved = resolveCodexEssayIndex([c, b, a], ctx); // intentionally unsorted input
        expect(resolved.get('essay_a')!.isUnlocked).toBe(true);
        expect(resolved.get('essay_b')!.isUnlocked).toBe(true);
        expect(resolved.get('essay_c')!.isUnlocked).toBe(true);
    });

    it('a broken chain leaves downstream essays locked (B locked → C stays locked)', () => {
        const a = essay({ id: 'essay_a', event_id: 'ev_a' });
        const b = essay({ id: 'essay_b', event_id: 'ev_b', requires_essays: ['essay_a'] });
        const c = essay({ id: 'essay_c', event_id: 'ev_c', requires_essays: ['essay_b'] });

        // ev_a NOT fired → A locked → B locked → C locked.
        const ctx = context({ firedEventIds: new Set(['ev_b', 'ev_c']) });
        const resolved = resolveCodexEssayIndex([a, b, c], ctx);
        expect(resolved.get('essay_a')!.isUnlocked).toBe(false);
        expect(resolved.get('essay_b')!.isUnlocked).toBe(false);
        expect(resolved.get('essay_b')!.lockReason).toEqual({ kind: 'essay', detail: 'essay_a' });
        expect(resolved.get('essay_c')!.isUnlocked).toBe(false);
        expect(resolved.get('essay_c')!.lockReason).toEqual({ kind: 'essay', detail: 'essay_b' });
    });

    it('a requires_essays cycle terminates and leaves both nodes locked (no infinite loop)', () => {
        const a = essay({ id: 'essay_a', event_id: 'ev_a', requires_essays: ['essay_b'] });
        const b = essay({ id: 'essay_b', event_id: 'ev_b', requires_essays: ['essay_a'] });
        const ctx = context({ firedEventIds: new Set(['ev_a', 'ev_b']) });
        const resolved = resolveCodexEssayIndex([a, b], ctx);
        // Mutual dependency never satisfies → both stay locked (deterministic, no throw/hang).
        expect(resolved.get('essay_a')!.isUnlocked).toBe(false);
        expect(resolved.get('essay_b')!.isUnlocked).toBe(false);
    });

    it('a self-referential requires_essays edge is ignored (does not deadlock its own node)', () => {
        const a = essay({ id: 'essay_a', event_id: 'ev_a', requires_essays: ['essay_a'] });
        const resolved = resolveCodexEssayIndex([a], context({ firedEventIds: new Set(['ev_a']) }));
        expect(resolved.get('essay_a')!.isUnlocked).toBe(true);
    });

    it('resolveCodexEssayIndex is order-independent (same output for any input order)', () => {
        const a = essay({ id: 'essay_a', event_id: 'ev_a' });
        const b = essay({ id: 'essay_b', event_id: 'ev_b', requires_essays: ['essay_a'] });
        const ctx = context({ firedEventIds: new Set(['ev_a', 'ev_b']) });
        const r1 = resolveCodexEssayIndex([a, b], ctx);
        const r2 = resolveCodexEssayIndex([b, a], ctx);
        expect(r1.get('essay_b')!.isUnlocked).toBe(r2.get('essay_b')!.isUnlocked);
        expect(r1.get('essay_b')!.isUnlocked).toBe(true);
    });
});

// ─── No-regression: existing event-fire / ghost unlock still works ────────

describe('codex tier/graph layering does NOT regress existing unlock (A1a/A1b)', () => {
    it('plain event-fire unlock is unchanged when no graph fields are present', () => {
        const locked = resolveCodexEssay(essay(), context());
        expect(locked.isUnlocked).toBe(false);
        expect(locked.lockReason).toEqual({ kind: 'event_fire' });

        const unlocked = resolveCodexEssay(essay(), context({ firedEventIds: new Set(['test_event']) }));
        expect(unlocked.isUnlocked).toBe(true);
        expect(unlocked.paragraphs.map((p) => p.text)).toEqual(['Paragraph one.', 'Paragraph two.']);
    });

    it('ghost_when unlock is unchanged and reports CONDITIONAL tier', () => {
        const e = essay({
            ghost_when: 'GAME_OVER AND NOT RUPTURE:srebrenica_genocide_1995',
            ghost_summary: 'History took a path your war never reached.',
        });
        const resolved = resolveCodexEssay(e, context({
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: -6,
                territory_divergence: {},
                casualty_ratio: 0.8,
                displacement_ratio: 0.7,
                rupture_divergence: [],
                divergence_notes: ['x'],
            },
        }));
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(true);
        expect(resolved.tier).toBe(CodexTier.CONDITIONAL);
    });

    it('resolveCodexEssayIndex matches per-essay resolveCodexEssay for non-graph essays', () => {
        const e = essay();
        const ctx = context({ firedEventIds: new Set(['test_event']) });
        const indexResolved = resolveCodexEssayIndex([e], ctx).get('essay_test')!;
        const single = resolveCodexEssay(e, ctx);
        expect(indexResolved.isUnlocked).toBe(single.isUnlocked);
        expect(indexResolved.paragraphs).toEqual(single.paragraphs);
    });
});

// ─── Shipped data integrity: every essay carries a valid tier ─────────────

describe('essay_index.json tier data (A1a — owner-tunable)', () => {
    const shipped = (essayIndex as { essays: EssayEntry[] }).essays;

    it('assigns a valid 0..3 tier to every shipped essay', () => {
        const bad = shipped.filter((e) => {
            const t = e.tier;
            return typeof t !== 'number' || !Number.isInteger(t) || t < 0 || t > 3;
        });
        expect(bad.map((e) => e.id)).toEqual([]);
    });

    it('shipped tiers agree with the default derivation (seeded, not hand-edited yet)', () => {
        // The shipped data was seeded by deriveDefaultTier. This pins that seeding
        // so a future owner re-tune is a deliberate, visible diff against the rule.
        const mismatches = shipped.filter((e) => e.tier !== deriveDefaultTier(e));
        expect(mismatches.map((e) => e.id)).toEqual([]);
    });

    it('any requires_essays edge points at an essay id that exists in the index', () => {
        const ids = new Set(shipped.map((e) => e.id));
        const dangling: string[] = [];
        for (const e of shipped) {
            for (const dep of e.requires_essays ?? []) {
                if (!ids.has(dep)) dangling.push(`${e.id} -> ${dep}`);
            }
        }
        expect(dangling).toEqual([]);
    });
});
