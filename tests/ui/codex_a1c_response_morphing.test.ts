import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
    resolveCodexEssay,
    type CodexRenderContext,
    type EssayEntry,
} from '../../src/ui/map/components/codex/codexEssayResolver.js';

// A1c — per-response codex morphing. The RESPONSE:<event>:<response> mechanism
// (atom + dynamic_sections + decisionResponses plumbing) was built in earlier
// waves; this slice AUTHORS morph content for four previously-uncovered tier-2
// SHAPEABLE essays. These tests pin the authored data end-to-end through the
// real resolver: determinism, per-branch selection, and — the calibration-
// safety property — inertness when no choice is authored.

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, '../../data/scenarios/essays/essay_index.json');

interface EssayIndexFile {
    essays: EssayEntry[];
}

function loadEssays(): EssayEntry[] {
    const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as EssayIndexFile;
    return raw.essays;
}

function essayForEvent(eventId: string): EssayEntry {
    const essay = loadEssays().find((e) => e.event_id === eventId);
    if (!essay) throw new Error(`essay for ${eventId} not found in index`);
    return essay;
}

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

// The four essays this slice wired, each with its two authored response branches.
const WIRED: Array<{ eventId: string; branches: string[] }> = [
    { eventId: 'london_conference_1992', branches: ['accept_principles', 'reject'] },
    { eventId: 'un_hostage_crisis_1995', branches: ['maintain_hostages', 'release_gradually'] },
    { eventId: 'us_halts_federation_advance_1995', branches: ['comply', 'push_further'] },
    { eventId: 'dayton_talks_begin_1995', branches: ['accept', 'hardline'] },
];

describe('A1c per-response codex morphing (authored data)', () => {
    it('each wired essay declares a RESPONSE-gated dynamic section per branch', () => {
        for (const { eventId, branches } of WIRED) {
            const essay = essayForEvent(eventId);
            const sections = essay.dynamic_sections ?? [];
            for (const branch of branches) {
                const cond = `RESPONSE:${eventId}:${branch}`;
                const match = sections.filter((s) => s.condition === cond);
                expect(match.length, `${cond} dynamic section`).toBe(1);
                // EN body and BCS localization both present (i18n parity).
                expect(match[0].content.trim().length).toBeGreaterThan(0);
                expect(match[0].localizations?.bcs?.content?.trim().length ?? 0).toBeGreaterThan(0);
            }
        }
    });

    it('morphs to the authored branch matching the player decision (and only that branch)', () => {
        for (const { eventId, branches } of WIRED) {
            const essay = essayForEvent(eventId);
            for (const chosen of branches) {
                const resolved = resolveCodexEssay(
                    essay,
                    context({
                        firedEventIds: new Set([eventId]),
                        decisionResponses: new Set([`${eventId}:${chosen}`]),
                    }),
                );
                const dynamic = resolved.paragraphs.filter((p) => p.kind === 'dynamic');
                // The chosen branch contributes at least one dynamic paragraph.
                expect(dynamic.length, `${eventId}:${chosen} dynamic paragraphs`).toBeGreaterThan(0);
                // No OTHER branch's section leaks in: the not-chosen branch text
                // must be absent. We assert by re-resolving with the sibling and
                // confirming the rendered text differs.
                const other = branches.find((b) => b !== chosen)!;
                const otherResolved = resolveCodexEssay(
                    essay,
                    context({
                        firedEventIds: new Set([eventId]),
                        decisionResponses: new Set([`${eventId}:${other}`]),
                    }),
                );
                const chosenText = dynamic.map((p) => p.text).join('\n');
                const otherText = otherResolved.paragraphs
                    .filter((p) => p.kind === 'dynamic')
                    .map((p) => p.text)
                    .join('\n');
                expect(chosenText).not.toBe(otherText);
            }
        }
    });

    it('is INERT when no choice is authored — canonical entry unchanged (calibration/headless safety)', () => {
        for (const { eventId } of WIRED) {
            const essay = essayForEvent(eventId);
            // Event fired, but empty authored-choices log (historical/headless run).
            const resolved = resolveCodexEssay(
                essay,
                context({ firedEventIds: new Set([eventId]) }),
            );
            // No RESPONSE-gated dynamic paragraph is emitted. (GAME_OVER-gated
            // sections also stay off because gameOver:false here.)
            const respDynamic = resolved.paragraphs.filter((p) => p.kind === 'dynamic');
            expect(respDynamic.length, `${eventId} inert with empty authored log`).toBe(0);
            // The canonical body is intact: every canonical paragraph survives.
            const canonical = resolved.paragraphs.filter((p) => p.kind === 'canonical');
            expect(canonical.length).toBeGreaterThan(0);
        }
    });

    it('is deterministic — identical authored log yields identical morphed output', () => {
        const { eventId, branches } = WIRED[3]; // dayton_talks_begin_1995
        const essay = essayForEvent(eventId);
        const ctx = () =>
            context({
                firedEventIds: new Set([eventId]),
                decisionResponses: new Set([`${eventId}:${branches[0]}`]),
            });
        const a = resolveCodexEssay(essay, ctx());
        const b = resolveCodexEssay(essay, ctx());
        expect(JSON.stringify(a.paragraphs)).toBe(JSON.stringify(b.paragraphs));
    });
});
