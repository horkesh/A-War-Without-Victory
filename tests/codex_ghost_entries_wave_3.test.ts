/**
 * LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — content-only ghost-entry verification.
 *
 * Wave 3 authors 6 NEW counterfactual essay markdown files under
 * `data/codex/ghost_entries/`. This test is filesystem-only (static reads of
 * the markdown payloads); no builder import, no GameState construction, no
 * randomness. The content-lane contract is:
 *
 *   - Files exist at the canonical path.
 *   - Each file opens with a `# Title` heading.
 *   - Each file carries the Ring 2 narrative-observation marker line that the
 *     Wave 1/2 entries established as the canonical structural shape.
 *   - Each file references its observer-flag concept by name in the body
 *     (these flags are wired in substrate by other lanes; this lane only
 *     references them in narrative prose, never declares new ones).
 *   - Each file meets a minimum length floor consistent with Wave 1/2
 *     (~150-300 words). The floor is enforced as a character count to keep
 *     the test free of locale-dependent tokenisation.
 *   - Each file cites at least one historical anchor (BB I/II chapter or
 *     ICTY case identifier) — the canon-grounding contract.
 *
 * Wave 3 entries (6 NEW):
 *   - ceasefire_streak_held
 *   - mediator_trust_sustained
 *   - rear_pocket_sustained
 *   - civilian_displacement_contained
 *   - equipment_quality_recovered
 *   - negotiation_capital_recovered
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Test helpers ─────────────────────────────────────────────────────────

const REPO_ROOT = resolve(__dirname, '..');
const GHOST_DIR = resolve(REPO_ROOT, 'data/codex/ghost_entries');
const RING_2_MARKER = 'Ring 2 — narrative observation';
const MIN_BODY_CHARS = 800; // ~150 words floor; Wave 1/2 essays sit ~1200-1800 chars

interface WaveEntry {
    /** filename without extension */
    id: string;
    /** observer-flag-name fragment that must appear in the body (concept reference) */
    observer_concept: string;
    /** at least one of these historical-anchor tokens must appear in the body */
    historical_anchors: string[];
}

const WAVE_3_ENTRIES: WaveEntry[] = [
    {
        id: 'ceasefire_streak_held',
        observer_concept: 'ceasefire',
        historical_anchors: ['Galić', 'Dragomir Milošević', 'Balkan Battlegrounds', 'Dayton'],
    },
    {
        id: 'mediator_trust_sustained',
        observer_concept: 'mediator',
        historical_anchors: ['Vance', 'Owen', 'Holbrooke', 'Contact Group', 'Balkan Battlegrounds'],
    },
    {
        id: 'rear_pocket_sustained',
        observer_concept: 'rear',
        historical_anchors: ['Tadić', 'Stakić', 'Prlić', 'IT-94-1-T', 'IT-97-24-T', 'Balkan Battlegrounds'],
    },
    {
        id: 'civilian_displacement_contained',
        observer_concept: 'displacement',
        historical_anchors: ['UNHCR', 'Krajišnik', 'IT-00-39-T', 'Balkan Battlegrounds', 'Annex 7'],
    },
    {
        id: 'equipment_quality_recovered',
        observer_concept: 'equipment',
        historical_anchors: ['Perišić', 'IT-04-81-T', 'Personnel Centre', 'Washington Agreement', 'Balkan Battlegrounds'],
    },
    {
        id: 'negotiation_capital_recovered',
        observer_concept: 'negotiation',
        historical_anchors: ['Karadžić', 'Prlić', 'IT-95-5/18-T', 'IT-04-74-T', 'Balkan Battlegrounds', 'Holbrooke'],
    },
];

function readEntry(id: string): string {
    const path = resolve(GHOST_DIR, `${id}.md`);
    return readFileSync(path, 'utf8');
}

function entryPath(id: string): string {
    return resolve(GHOST_DIR, `${id}.md`);
}

// ─── W1: file presence ─────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W1: file presence', () => {
    it('all 6 Wave-3 ghost entries exist on disk', () => {
        for (const entry of WAVE_3_ENTRIES) {
            const path = entryPath(entry.id);
            expect(existsSync(path), `expected ${path} to exist`).toBe(true);
        }
    });
});

// ─── W2: title heading ─────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W2: title heading', () => {
    it.each(WAVE_3_ENTRIES.map((e) => [e.id]))(
        '%s opens with a level-1 markdown heading',
        (id: string) => {
            const body = readEntry(id);
            expect(body.startsWith('# ')).toBe(true);
            const firstLine = body.split('\n', 1)[0];
            expect(firstLine.length).toBeGreaterThan(5);
        },
    );
});

// ─── W3: Ring 2 marker (frontmatter shape) ────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W3: Ring 2 marker', () => {
    it.each(WAVE_3_ENTRIES.map((e) => [e.id]))(
        '%s carries the canonical Ring 2 narrative-observation marker',
        (id: string) => {
            const body = readEntry(id);
            expect(body).toContain(RING_2_MARKER);
            expect(body).toContain('Ghost entry.');
        },
    );
});

// ─── W4: observer-concept reference ───────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W4: observer-concept reference', () => {
    it.each(WAVE_3_ENTRIES.map((e) => [e.id, e.observer_concept]))(
        '%s body references the observer concept (%s)',
        (id: string, concept: string) => {
            const body = readEntry(id).toLowerCase();
            expect(body).toContain(concept.toLowerCase());
        },
    );
});

// ─── W5: minimum body length floor ────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W5: length floor', () => {
    it.each(WAVE_3_ENTRIES.map((e) => [e.id]))(
        '%s body meets the canonical length floor (~150 words)',
        (id: string) => {
            const body = readEntry(id);
            expect(body.length).toBeGreaterThanOrEqual(MIN_BODY_CHARS);
        },
    );
});

// ─── W6: historical-anchor citation ───────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W6: historical anchor', () => {
    it.each(WAVE_3_ENTRIES.map((e) => [e.id, e.historical_anchors]))(
        '%s body cites at least one canonical historical anchor',
        (id: string, anchors: string[]) => {
            const body = readEntry(id);
            const matched = anchors.some((token) => body.includes(token));
            expect(matched, `none of [${anchors.join(', ')}] found in ${id}.md`).toBe(true);
        },
    );
});

// ─── W7: AUDIT-ONLY framing (no §6 / rupture / enclave-resilience leak) ──

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W7: sensitive-history compliance', () => {
    it.each(WAVE_3_ENTRIES.map((e) => [e.id]))(
        '%s does not surface §6 / rupture / enclave-resilience tokens',
        (id: string) => {
            const body = readEntry(id);
            // Ring 3 / §6 refused-surface tokens that must NOT appear in Ring 2 prose.
            expect(body).not.toContain('rupture_flip');
            expect(body).not.toContain('enclave_resilience');
            expect(body).not.toContain('rupture_consequences');
            expect(body).not.toContain('genocide_non_occurrence');
            expect(body).not.toContain('score_inversion');
        },
    );
});

// ─── W8: catalogue determinism (no duplicate ids in lane manifest) ───────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3 — W8: lane manifest determinism', () => {
    it('Wave-3 manifest has 6 unique ids and no duplicates', () => {
        const ids = WAVE_3_ENTRIES.map((e) => e.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(6);
        expect(ids.length).toBe(6);
    });
});
