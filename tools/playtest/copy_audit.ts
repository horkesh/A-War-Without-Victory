/**
 * Static copy audit — the half of content correctness that needs no running app.
 *
 * WHY THIS EXISTS
 * The runtime probes only detect BROKEN rendering: empty surfaces, dead controls,
 * clipped text, error banners. On 2026-08-27 the owner found eight defects by reading
 * one screenshot, and every one was **wrong content rendered correctly** — a category
 * the harness could not see at all. Three of those eight are findable by scanning source
 * alone, in under a second, with no Electron launch.
 *
 * Checks:
 *   1. RETIRED VOCABULARY — a renamed term still appearing in player-visible display
 *      text. Keys and {placeholders} are excluded: they are identifiers, not copy.
 *   2. DIVERGENT DUPLICATE COPY — the same sentence maintained in two places (an i18n
 *      table and a hardcoded fallback) where a rename updated one and missed the other,
 *      so the player sees different words depending on which code path renders.
 *
 * Run: node node_modules/tsx/dist/cli.mjs tools/playtest/copy_audit.ts [--json]
 * Exit code is 0 unless --strict is passed; this is a reporting tool by default.
 */

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_BASE_DIR } from '../ai_play/president_playthrough.js';
import { FindingsRecorder } from './findings.js';
import type { Finding } from './types.js';

const LEDGER = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');

/**
 * Terms retired by a rename, and what replaced them.
 *
 * Add an entry the day a rename lands — that is the whole point. `sector -> OG` was
 * renamed across 104 display strings and missed 5, and nothing noticed for weeks.
 */
interface RetiredTerm {
    /** Word as it appears in retired copy. Matched case-insensitively, whole word. */
    retired: string;
    /** What it became, for the message only. */
    replacement: string;
    /** Display strings that are legitimately allowed to keep the retired word. */
    allow?: RegExp[];
}

const RETIRED_TERMS: RetiredTerm[] = [
    {
        retired: 'sector',
        replacement: 'OG / Operational Group',
        // None yet. If the Sector Attack op type is deliberately keeping its name, add
        // its keys here WITH a reason rather than deleting the check.
        allow: [],
    },
];

/** Files whose string literals are player-visible copy. */
const COPY_SOURCES = [
    'src/ui/map/i18n/messages.en.ts',
    'src/ui/shared/operational_sitrep_views.ts',
];

interface CopyString {
    file: string;
    line: number;
    key: string | null;
    value: string;
}

/** Extract `'key': 'value'` pairs and bare string literals with their line numbers. */
function extractStrings(file: string): CopyString[] {
    const abs = join(REPO_BASE_DIR, file);
    const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
    const out: CopyString[] = [];
    const keyed = new RegExp("^\\s*'([^']+)':\\s*'([^']*)'");
    const bare = new RegExp("'([^']{12,})'", 'g');

    lines.forEach((text, i) => {
        const k = keyed.exec(text);
        if (k) {
            out.push({ file, line: i + 1, key: k[1], value: k[2] });
            return;
        }
        // Hardcoded fallbacks: `return 'Some sentence.';`
        let m: RegExpExecArray | null;
        bare.lastIndex = 0;
        while ((m = bare.exec(text))) {
            if (/^[a-z][A-Za-z0-9_.]*$/.test(m[1])) continue; // an identifier, not a sentence
            if (!/\s/.test(m[1])) continue; // single token — not a sentence
            out.push({ file, line: i + 1, key: null, value: m[1] });
        }
    });
    return out;
}

/** Strip interpolation placeholders — `{sector}` is a variable name, not player copy. */
function displayText(value: string): string {
    return value.replace(/\{[^}]*\}/g, ' ');
}

// ── Check 1: retired vocabulary in display text ──────────────────────────────

function checkRetiredVocabulary(all: CopyString[]): Finding[] {
    const out: Finding[] = [];
    for (const term of RETIRED_TERMS) {
        const word = new RegExp(`\\b${term.retired}s?\\b`, 'i');
        const hits = all.filter(
            (s) => word.test(displayText(s.value)) && !(term.allow ?? []).some((re) => re.test(s.key ?? '')),
        );
        if (hits.length === 0) continue;

        // One finding per file, listing its hits — a finding per string would bury the ledger.
        for (const file of [...new Set(hits.map((h) => h.file))].sort()) {
            const inFile = hits.filter((h) => h.file === file);
            out.push({
                kind: 'bug',
                severity: 'medium',
                probe: 'copy-retired-vocabulary',
                title: `Retired term "${term.retired}" still in player-visible copy in ${relative('src', file)}`,
                detail:
                    `${inFile.length} display string(s) in ${file} still say "${term.retired}" after the `
                    + `rename to ${term.replacement}. Placeholders like {${term.retired}} are excluded — these `
                    + `are words the player reads. A player who sees both vocabularies for one concept has to `
                    + `work out that they are the same thing.`,
                surface: `copy:${relative('src/ui', file).replace(/\\/g, '/')}`,
                turn: 0,
                faction: 'RBiH',
                evidence: {
                    count: inFile.length,
                    strings: inFile.slice(0, 12).map((h) => `${h.line}: ${h.key ?? '(hardcoded)'} => ${h.value.slice(0, 70)}`),
                },
            });
        }
    }
    return out;
}

// ── Check 2: divergent duplicate copy ────────────────────────────────────────

/** Normalise a sentence so a renamed pair collapses onto one shape. */
function normaliseForPairing(value: string): string {
    let v = displayText(value).toLowerCase();
    for (const term of RETIRED_TERMS) {
        v = v.replace(new RegExp(`\\b${term.retired}s?\\b`, 'gi'), '<term>');
        for (const alt of term.replacement.split('/').map((x) => x.trim().toLowerCase())) {
            if (alt) v = v.replace(new RegExp(`\\b${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'gi'), '<term>');
        }
    }
    return v.replace(/\s+/g, ' ').trim();
}

function checkDivergentDuplicates(all: CopyString[]): Finding[] {
    const byShape = new Map<string, CopyString[]>();
    for (const s of all) {
        if (displayText(s.value).trim().split(/\s+/).length < 4) continue; // too short to pair meaningfully
        const shape = normaliseForPairing(s.value);
        if (!byShape.has(shape)) byShape.set(shape, []);
        byShape.get(shape)!.push(s);
    }

    const out: Finding[] = [];
    for (const [shape, group] of [...byShape.entries()].sort()) {
        const distinct = [...new Set(group.map((g) => displayText(g.value).replace(/\s+/g, ' ').trim()))];
        if (distinct.length < 2) continue; // identical duplicates are fine
        if (new Set(group.map((g) => g.file)).size < 2) continue; // same file — likely deliberate variants

        out.push({
            kind: 'bug',
            severity: 'high',
            probe: 'copy-divergent-duplicate',
            title: `The same sentence is maintained in two files and they disagree: "${distinct[0].slice(0, 60)}"`,
            detail:
                `Two sources render what is structurally the same sentence with different wording, so which `
                + `words the player sees depends on which code path runs. This is the signature of a rename `
                + `that updated one copy and missed the other.\n\nVariants:\n`
                + distinct.map((d) => `  - "${d}"`).join('\n'),
            surface: 'copy:duplicate_sources',
            turn: 0,
            faction: 'RBiH',
            evidence: {
                shape,
                locations: group.map((g) => `${g.file}:${g.line} ${g.key ?? '(hardcoded)'}`),
                variants: distinct,
            },
        });
    }
    return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const all = COPY_SOURCES.flatMap(extractStrings);
const findings = [...checkRetiredVocabulary(all), ...checkDivergentDuplicates(all)];

if (process.argv.includes('--json')) {
    console.log(JSON.stringify(findings, null, 2));
} else {
    console.log(`copy audit: scanned ${all.length} strings across ${COPY_SOURCES.length} files`);
    console.log(`  ${findings.length} finding(s)\n`);
    for (const f of findings) {
        console.log(`  [${f.severity}] ${f.title}`);
        const ev = f.evidence as Record<string, unknown> | undefined;
        for (const s of ((ev?.strings ?? ev?.variants ?? []) as string[]).slice(0, 6)) console.log(`      ${s}`);
        console.log();
    }
}

if (process.argv.includes('--record')) {
    const runId = `copy-audit-${new Date().toISOString().slice(0, 10)}`;
    const recorder = new FindingsRecorder(runId, join(REPO_BASE_DIR, 'tmp-playtest', runId, 'findings.jsonl'));
    for (const f of findings) recorder.record(f);
    const { added, repeated } = recorder.mergeIntoLedger(LEDGER);
    console.log(`ledger: ${added.length} NEW, ${repeated.length} already known`);
}

if (process.argv.includes('--strict') && findings.length > 0) process.exit(1);
