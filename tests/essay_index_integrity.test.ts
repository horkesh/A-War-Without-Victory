/**
 * essay_index_integrity — durable structural guard for the Codex essay corpus.
 *
 * The Codex runtime (`src/ui/map/components/CodexPanel.tsx`) imports
 * `data/scenarios/essays/essay_index.json` directly and resolves each essay
 * via `resolveCodexEssay`, which joins to fired events on `essay.event_id`
 * (NOT on `essay.id`). The on-disk per-essay `*.json` files in the same
 * directory are the authoring/generation deposit; they are NOT loaded at
 * runtime. This test pins the structural invariants that keep the index and
 * the on-disk corpus coherent so the long-standing `essay_`-prefix convention
 * cannot silently drift and so the index→disk join cannot silently break.
 *
 * Invariants asserted (all deterministic; filesystem + JSON parse only; no
 * Math.random / Date.now / timestamp dependence):
 *
 *   1. Every index row resolves to an on-disk file. The runtime treats the
 *      index as the source of truth, but the index `content` is copied from
 *      the on-disk file, so an index row with no backing file is a corpus
 *      integrity error.
 *   2. Every index row `id` follows the canonical `essay_<event_id>` naming
 *      convention, with exactly ONE documented exception
 *      (`essay_washington_agreement_1994`, whose `event_id` was deliberately
 *      repointed to the HRHB event `hrhb_washington_agreement_1994` — see
 *      PROJECT_LEDGER). This catches future prefix drift while permitting the
 *      one intentional divergence.
 *   3. Every index row `id` carries the `essay_` prefix (the React-key
 *      convention the panel relies on for stable list keys).
 *   4. The set of on-disk essay files NOT referenced by any index `event_id`
 *      is exactly the known Wave-4 1992 content deposit. Those files are
 *      content-complete on disk but are intentionally NOT indexed yet because
 *      indexing them requires BCS localization prose (see
 *      `tests/ui/codex_essay_localization.test.ts`), which is gated content
 *      work. This assertion makes the divergence explicit and countable so a
 *      future indexing pass is a deliberate, reviewed change rather than an
 *      accident — and so NEW unindexed files are caught immediately.
 *
 * See `docs/40_reports/20260529_PROVENANCE_GAP_INVESTIGATION.md`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');
const ESSAY_DIR = resolve(REPO_ROOT, 'data/scenarios/essays');
const INDEX_PATH = resolve(ESSAY_DIR, 'essay_index.json');

interface IndexEssay {
    id: string;
    event_id: string;
    title: string;
    year: number;
    category: string;
}

interface DiskEssay extends IndexEssay {
    filename: string;
}

/**
 * Documented exceptions to the `id === essay_<event_id>` rule. The Washington
 * Agreement essay keeps its legacy `id = essay_washington_agreement_1994`
 * while its canonical backing file and `event_id` are HRHB-scoped
 * (`hrhb_washington_agreement_1994`), so the essay unlocks off the HRHB
 * acceptance event. Recorded here so the convention check stays strict for
 * every other row.
 */
const ID_EVENT_ID_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
    ['essay_washington_agreement_1994', 'hrhb_washington_agreement_1994'],
]);

/**
 * On-disk essay files whose filename stem is NOT referenced by any index
 * `event_id`. Thirteen are the Wave-4 1992 content deposit: content-complete
 * and ICTY/BB-cited on disk but not indexed because indexing them requires
 * authoring BCS localization prose (gated content work owned by the
 * localization / sensitive-history lane). Keeping this list explicit means
 * any NEW unindexed file fails this test immediately.
 */
const KNOWN_UNINDEXED_DEPOSIT: readonly string[] = [
    'cutileiro_plan_lisbon_1992',
    'foca_1992',
    'gorazde_pocket_consolidation_1992',
    'keraterm_camp_1992',
    'kupres_battle_1992',
    'milosevic_isolation_warning_aug92',
    'omarska_camp_1992',
    'prijedor_takeover_1992',
    'sarajevo_jna_column_dobrovoljacka_1992',
    'trnopolje_camp_1992',
    'vase_miskina_breadline_1992',
    'visegrad_1992',
    'zvornik_takeover_1992',
];

function loadIndex(): IndexEssay[] {
    const raw = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as { essays: IndexEssay[] };
    return raw.essays;
}

function diskEssayStems(): string[] {
    return readdirSync(ESSAY_DIR)
        .filter((f) => f.endsWith('.json') && f !== 'essay_index.json')
        .map((f) => f.replace(/\.json$/, ''))
        .sort();
}

function loadDiskEssays(): DiskEssay[] {
    return readdirSync(ESSAY_DIR)
        .filter((f) => f.endsWith('.json') && f !== 'essay_index.json')
        .sort()
        .map((filename) => {
            const parsed = JSON.parse(readFileSync(resolve(ESSAY_DIR, filename), 'utf8')) as IndexEssay;
            return { ...parsed, filename };
        });
}

describe('essay_index_integrity', () => {
    it('every index row resolves to an on-disk essay file (index → disk)', () => {
        const index = loadIndex();
        expect(index.length).toBeGreaterThan(0);
        const missing = index
            .filter((row) => !existsSync(resolve(ESSAY_DIR, `${row.event_id}.json`)))
            .map((row) => row.event_id);
        expect(missing, `index rows with no on-disk file: ${missing.join(', ')}`).toEqual([]);
    });

    it('every index row id carries the essay_ prefix', () => {
        const index = loadIndex();
        const offenders = index.filter((row) => !row.id.startsWith('essay_')).map((row) => row.id);
        expect(offenders, `index ids missing essay_ prefix: ${offenders.join(', ')}`).toEqual([]);
    });

    it('every index row id matches essay_<event_id> except documented exceptions', () => {
        const index = loadIndex();
        const drift = index.filter((row) => {
            if (ID_EVENT_ID_EXCEPTIONS.has(row.id)) {
                return ID_EVENT_ID_EXCEPTIONS.get(row.id) !== row.event_id;
            }
            return row.id !== `essay_${row.event_id}`;
        });
        const detail = drift.map((row) => `${row.id} / ${row.event_id}`).join(', ');
        expect(drift, `id↔event_id prefix drift: ${detail}`).toEqual([]);
    });

    it('on-disk files not referenced by the index are exactly the known content deposit (disk → index)', () => {
        const index = loadIndex();
        const indexEventIds = new Set(index.map((row) => row.event_id));
        const unindexed = diskEssayStems().filter((stem) => !indexEventIds.has(stem));
        expect(unindexed).toEqual([...KNOWN_UNINDEXED_DEPOSIT].sort());
    });

    it('on-disk essay ids and event ids are unique across authoring files', () => {
        const essays = loadDiskEssays();
        const duplicateIds = essays
            .map((essay) => essay.id)
            .filter((id, index, ids) => ids.indexOf(id) !== index)
            .sort();
        const duplicateEventIds = essays
            .map((essay) => essay.event_id)
            .filter((eventId, index, eventIds) => eventIds.indexOf(eventId) !== index)
            .sort();

        expect(duplicateIds).toEqual([]);
        expect(duplicateEventIds).toEqual([]);
    });

    it('every known-deposit file is content-complete on disk (so indexing is a metadata-only future move)', () => {
        for (const stem of KNOWN_UNINDEXED_DEPOSIT) {
            const path = resolve(ESSAY_DIR, `${stem}.json`);
            expect(existsSync(path), `expected ${stem}.json to exist`).toBe(true);
            const essay = JSON.parse(readFileSync(path, 'utf8')) as {
                id: string;
                event_id: string;
                content?: string;
                sources?: string[];
            };
            // `id` always follows the filename stem for this Wave-4 deposit.
            expect(essay.id).toBe(`essay_${stem}`);
            expect(typeof essay.content).toBe('string');
            expect((essay.content ?? '').length).toBeGreaterThanOrEqual(2000);
            expect(Array.isArray(essay.sources) && essay.sources.length).toBeGreaterThanOrEqual(1);
        }
    });
});
