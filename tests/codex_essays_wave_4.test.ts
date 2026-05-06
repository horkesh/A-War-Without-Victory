/**
 * LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — content-only essay verification.
 *
 * Wave 4 authors 13 NEW canonical-schema essay JSON files under
 * `data/scenarios/essays/`. This test is filesystem + JSON-parse only; no
 * builder import, no GameState construction, no randomness, no timestamps.
 * The content-lane contract is:
 *
 *   - Files exist at the canonical path with the expected event_id filenames.
 *   - Each file parses as valid JSON conforming to the canonical essay schema:
 *     `{ id, event_id, title, year, category, sources, generated, content }`
 *     mirroring the reference shape `data/scenarios/essays/abdic_apwb_declared_1993.json`.
 *   - Each file's `id` matches `essay_<event_id>` and `event_id` matches the
 *     filename stem (deterministic naming contract).
 *   - Each file's `content` body meets a length floor (≥2000 chars) consistent
 *     with the reference Codex essay corpus tone (~5 paragraphs of authoritative
 *     narrative).
 *   - Each file cites at least one ICTY case identifier or Balkan Battlegrounds
 *     reference (canon-grounding contract).
 *   - Sensitive-history banned-token check: no §6 / atrocity-as-tactic / observer-
 *     flag scaffold tokens in the content body. Atrocities documented as
 *     historical record only, never framed as game-mechanic levers.
 *   - Faction-symmetric framing where applicable: when a scheduled-municipality
 *     atrocity essay names one faction's victims, it must not omit comparable
 *     framing of civilian POV.
 *   - Lane manifest determinism: 13 unique event_ids, no duplicates.
 *
 * Wave 4 entries (13 NEW essays):
 *   - gorazde_pocket_consolidation_1992       (engine-referenced in war_1992.json)
 *   - milosevic_isolation_warning_aug92       (engine-referenced in war_1992.json)
 *   - zvornik_takeover_1992                    (ICTY Karadžić scheduled muni)
 *   - visegrad_1992                            (ICTY Lukić & Lukić, Vasiljević)
 *   - foca_1992                                (ICTY Kunarac, Krnojelac)
 *   - prijedor_takeover_1992                   (ICTY Stakić, Brđanin)
 *   - omarska_camp_1992                        (ICTY Tadić, Kvočka)
 *   - keraterm_camp_1992                       (ICTY Sikirica, Tadić)
 *   - trnopolje_camp_1992                      (ICTY Tadić, Stakić)
 *   - vase_miskina_breadline_1992              (ICTY Galić)
 *   - sarajevo_jna_column_dobrovoljacka_1992   (Burg & Shoup; disputed event)
 *   - cutileiro_plan_lisbon_1992               (Burg & Shoup; political)
 *   - kupres_battle_1992                       (BB1 chapter; military)
 *
 * Determinism: this test reads files synchronously, parses JSON, and asserts on
 * static content. No Math.random, Date.now, or timestamp dependence.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Test helpers ─────────────────────────────────────────────────────────

const REPO_ROOT = resolve(__dirname, '..');
const ESSAY_DIR = resolve(REPO_ROOT, 'data/scenarios/essays');
const MIN_CONTENT_CHARS = 2000; // ~5 paragraphs of authoritative narrative

interface CanonicalEssay {
    id: string;
    event_id: string;
    title: string;
    year: number;
    category: string;
    sources: string[];
    generated: boolean;
    content: string;
}

interface WaveEntry {
    /** filename stem; equals event_id */
    event_id: string;
    /** at least one of these citation tokens must appear in `sources` or `content` */
    citation_anchors: string[];
}

const WAVE_4_ENTRIES: WaveEntry[] = [
    {
        event_id: 'gorazde_pocket_consolidation_1992',
        citation_anchors: ['IT-95-5/18-T', 'IT-98-29-T', 'Balkan Battlegrounds', 'Karadzic', 'Galic'],
    },
    {
        event_id: 'milosevic_isolation_warning_aug92',
        citation_anchors: ['IT-95-5/18-T', 'IT-02-54-T', 'Burg', 'Karadzic', 'Milosevic'],
    },
    {
        event_id: 'zvornik_takeover_1992',
        citation_anchors: ['IT-95-5/18-T', 'IT-08-91-T', 'IT-05-88/2-T', 'Karadzic', 'Stanisic', 'Tolimir'],
    },
    {
        event_id: 'visegrad_1992',
        citation_anchors: ['IT-98-32/1-T', 'IT-98-32-T', 'IT-95-5/18-T', 'Lukic', 'Vasiljevic'],
    },
    {
        event_id: 'foca_1992',
        citation_anchors: ['IT-96-23-T', 'IT-97-25-T', 'IT-95-5/18-T', 'Kunarac', 'Krnojelac'],
    },
    {
        event_id: 'prijedor_takeover_1992',
        citation_anchors: ['IT-97-24-T', 'IT-94-1-T', 'IT-99-36-T', 'IT-95-5/18-T', 'Stakic', 'Tadic', 'Brdjanin'],
    },
    {
        event_id: 'omarska_camp_1992',
        citation_anchors: ['IT-94-1-T', 'IT-97-24-T', 'IT-98-30/1-T', 'IT-95-5/18-T', 'Tadic', 'Kvocka'],
    },
    {
        event_id: 'keraterm_camp_1992',
        citation_anchors: ['IT-95-8-S', 'IT-94-1-T', 'IT-97-24-T', 'IT-95-5/18-T', 'Sikirica', 'Tadic'],
    },
    {
        event_id: 'trnopolje_camp_1992',
        citation_anchors: ['IT-94-1-T', 'IT-97-24-T', 'IT-98-30/1-T', 'IT-95-5/18-T', 'Tadic', 'Stakic'],
    },
    {
        event_id: 'vase_miskina_breadline_1992',
        citation_anchors: ['IT-98-29-T', 'IT-95-5/18-T', 'IT-98-29/1-T', 'Galic', 'Burg'],
    },
    {
        event_id: 'sarajevo_jna_column_dobrovoljacka_1992',
        citation_anchors: ['Burg', 'IT-95-5/18-T', 'IT-98-29-T', 'Balkan Battlegrounds', 'Karadzic'],
    },
    {
        event_id: 'cutileiro_plan_lisbon_1992',
        citation_anchors: ['Burg', 'IT-95-5/18-T', 'European Community', 'Balkan Battlegrounds', 'Karadzic'],
    },
    {
        event_id: 'kupres_battle_1992',
        citation_anchors: ['Balkan Battlegrounds', 'IT-95-5/18-T', 'Burg', 'Karadzic'],
    },
];

function essayPath(event_id: string): string {
    return resolve(ESSAY_DIR, `${event_id}.json`);
}

function readEssay(event_id: string): CanonicalEssay {
    const path = essayPath(event_id);
    const raw = readFileSync(path, 'utf8');
    return JSON.parse(raw) as CanonicalEssay;
}

// Sources list joined with content body; citation anchors may live in either
// (sources field is the conventional home, but bracketed citations sometimes
// appear inline in the body across the existing corpus).
function citationCorpus(essay: CanonicalEssay): string {
    return [...essay.sources, essay.content].join('\n');
}

// Strip diacritics so anchor lookups (e.g. "Galic") match content text
// containing accented forms (e.g. "Galić"). Diacritic-insensitive comparison
// is the canonical convention across the Codex corpus.
function stripDiacritics(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─── W1: file presence ─────────────────────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W1: file presence', () => {
    it('all 13 Wave-4 essay JSON files exist at the canonical path', () => {
        for (const entry of WAVE_4_ENTRIES) {
            const path = essayPath(entry.event_id);
            expect(existsSync(path), `expected ${path} to exist`).toBe(true);
        }
    });
});

// ─── W2: canonical schema validation ──────────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W2: canonical schema', () => {
    it.each(WAVE_4_ENTRIES.map((e) => [e.event_id]))(
        '%s parses as valid JSON with all canonical fields',
        (event_id: string) => {
            const essay = readEssay(event_id);
            expect(typeof essay.id).toBe('string');
            expect(typeof essay.event_id).toBe('string');
            expect(typeof essay.title).toBe('string');
            expect(typeof essay.year).toBe('number');
            expect(typeof essay.category).toBe('string');
            expect(Array.isArray(essay.sources)).toBe(true);
            expect(typeof essay.generated).toBe('boolean');
            expect(typeof essay.content).toBe('string');
            // Wave 4 is the 1992-event corpus expansion; year must be 1992.
            expect(essay.year).toBe(1992);
            // Per predecessor convention, Codex essays are flagged generated.
            expect(essay.generated).toBe(true);
            // Sources must carry at least one citation string.
            expect(essay.sources.length).toBeGreaterThanOrEqual(1);
            // Title must be non-trivial.
            expect(essay.title.length).toBeGreaterThan(8);
            // Category must be one of the Codex-recognised tags.
            expect(['political', 'military', 'diplomatic', 'social', 'economic']).toContain(essay.category);
        },
    );
});

// ─── W3: event_id format / id-stem identity ───────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W3: id format', () => {
    it.each(WAVE_4_ENTRIES.map((e) => [e.event_id]))(
        '%s id matches "essay_<event_id>" and event_id matches filename',
        (event_id: string) => {
            const essay = readEssay(event_id);
            expect(essay.event_id).toBe(event_id);
            expect(essay.id).toBe(`essay_${event_id}`);
            // event_id must use snake_case ASCII tokens only.
            expect(/^[a-z0-9_]+$/.test(essay.event_id)).toBe(true);
        },
    );
});

// ─── W4: minimum content length floor (~2000 chars / ~5 paragraphs) ──────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W4: content length floor', () => {
    it.each(WAVE_4_ENTRIES.map((e) => [e.event_id]))(
        '%s content body meets the canonical length floor (~2000 chars)',
        (event_id: string) => {
            const essay = readEssay(event_id);
            expect(essay.content.length).toBeGreaterThanOrEqual(MIN_CONTENT_CHARS);
            // Multiple paragraphs (\n-separated).
            const paragraphs = essay.content.split('\n').filter((p) => p.trim().length > 0);
            expect(paragraphs.length).toBeGreaterThanOrEqual(3);
        },
    );
});

// ─── W5: ICTY / BB citation token match ──────────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W5: citation anchor', () => {
    it.each(WAVE_4_ENTRIES.map((e) => [e.event_id, e.citation_anchors]))(
        '%s carries at least one canonical citation anchor (ICTY case / BB / Burg)',
        (event_id: string, anchors: string[]) => {
            const essay = readEssay(event_id);
            const corpus = stripDiacritics(citationCorpus(essay));
            const matched = anchors.some((token) => corpus.includes(token));
            expect(matched, `none of [${anchors.join(', ')}] found in ${event_id}.json`).toBe(true);
        },
    );
});

// ─── W6: sensitive-history banned-token check ────────────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W6: sensitive-history compliance', () => {
    it.each(WAVE_4_ENTRIES.map((e) => [e.event_id]))(
        '%s does not surface §6 / mechanic-lever / atrocity-as-tactic tokens',
        (event_id: string) => {
            const essay = readEssay(event_id);
            const body = essay.content;
            // §6 sign-off chain consumer tokens (substrate-only; must not leak into prose).
            expect(body).not.toContain('rupture_flip');
            expect(body).not.toContain('enclave_resilience');
            expect(body).not.toContain('rupture_consequences');
            expect(body).not.toContain('genocide_non_occurrence');
            expect(body).not.toContain('score_inversion');
            // Mechanic-lever framing tokens (atrocity-as-tactic must NEVER appear).
            expect(body).not.toContain('atrocity multiplier');
            expect(body).not.toContain('genocide bonus');
            expect(body).not.toContain('cleansing bonus');
            // First-person and direct dialog discipline (essays are authoritative, not in-character).
            expect(body).not.toContain(' I said');
            expect(body).not.toContain(' I told');
        },
    );
});

// ─── W7: faction-symmetric framing for civilian-impact essays ────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W7: faction-symmetric framing', () => {
    // Essays whose subject involves civilian impact should reference the
    // civilian POV (population, civilians, residents, inhabitants, displacement)
    // rather than framing the event purely as a military success metric.
    const CIVILIAN_IMPACT_ESSAYS = [
        'zvornik_takeover_1992',
        'visegrad_1992',
        'foca_1992',
        'prijedor_takeover_1992',
        'omarska_camp_1992',
        'keraterm_camp_1992',
        'trnopolje_camp_1992',
        'vase_miskina_breadline_1992',
    ];
    const CIVILIAN_TOKENS = [
        'civilian',
        'civilians',
        'population',
        'residents',
        'inhabitants',
        'detainees',
        'displaced',
    ];

    it.each(CIVILIAN_IMPACT_ESSAYS.map((id) => [id]))(
        '%s frames civilian POV (population/civilians/detainees) explicitly',
        (event_id: string) => {
            const essay = readEssay(event_id);
            const lc = essay.content.toLowerCase();
            const matched = CIVILIAN_TOKENS.some((token) => lc.includes(token));
            expect(
                matched,
                `${event_id}.json must reference civilian-POV tokens (one of [${CIVILIAN_TOKENS.join(', ')}])`,
            ).toBe(true);
        },
    );
});

// ─── W8: lane manifest determinism (no duplicate ids) ────────────────────

describe('LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-4 — W8: lane manifest determinism', () => {
    it('Wave-4 manifest has 13 unique event_ids and no duplicates', () => {
        const ids = WAVE_4_ENTRIES.map((e) => e.event_id);
        const unique = new Set(ids);
        expect(unique.size).toBe(13);
        expect(ids.length).toBe(13);
    });

    it('Wave-4 essay file ids are all distinct on disk (no shadow duplicates)', () => {
        const idsOnDisk = WAVE_4_ENTRIES.map((entry) => readEssay(entry.event_id).id);
        const unique = new Set(idsOnDisk);
        expect(unique.size).toBe(13);
    });
});
