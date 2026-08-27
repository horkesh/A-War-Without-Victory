/**
 * Diary coverage check — makes "is it documented?" a machine question.
 *
 * WHY THIS EXISTS
 * On 2026-08-27 the answer to "are all your findings documented?" was NO. Three real
 * findings existed only in commit messages and TODO.md, and the report had drifted so
 * far behind that it needed an addendum. Both times the belief that something was
 * written down was sincere and wrong.
 *
 * A convention ("remember to update the diary") fails the same way. This is the check:
 * every OPEN finding in the dedup index must be acknowledged in the current diary, by
 * fingerprint, or this reports it as UNDOCUMENTED.
 *
 * The diary carries a coverage block near the end:
 *
 *   <!-- diary-coverage
 *   a1b2c3d4e5f6  Territory bar counts allied ground as "hostile-held"
 *   ...
 *   -->
 *
 * Titles are there for humans; only the fingerprints are read.
 *
 * Usage:
 *   diary_check.ts                  report coverage
 *   diary_check.ts --update         add missing fingerprints to the coverage block
 *   diary_check.ts --strict         exit 1 when anything is undocumented (for gating)
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_BASE_DIR } from '../ai_play/president_playthrough.js';
import { readLedger } from './findings.js';
import type { LedgerEntry } from './types.js';

const INDEX = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');
const DIARY_DIR = join(REPO_BASE_DIR, 'docs/40_reports/playtests');
const OPEN_MARK = '<!-- diary-coverage';
const CLOSE_MARK = '-->';

/** The newest `*_ui_playtest_diary.md`. Sorting by name works: they are date-prefixed. */
export function currentDiaryPath(): string | null {
    if (!existsSync(DIARY_DIR)) return null;
    const diaries = readdirSync(DIARY_DIR)
        .filter((f) => /^\d{8}_.*diary\.md$/.test(f))
        .sort();
    return diaries.length ? join(DIARY_DIR, diaries[diaries.length - 1]) : null;
}

function coveredFingerprints(diary: string): Set<string> {
    const start = diary.indexOf(OPEN_MARK);
    if (start === -1) return new Set();
    const end = diary.indexOf(CLOSE_MARK, start);
    const block = diary.slice(start + OPEN_MARK.length, end === -1 ? undefined : end);
    return new Set([...block.matchAll(/\b([0-9a-f]{12})\b/g)].map((m) => m[1]));
}

export interface Coverage {
    diaryPath: string | null;
    documented: LedgerEntry[];
    undocumented: LedgerEntry[];
}

export function checkCoverage(): Coverage {
    const diaryPath = currentDiaryPath();
    const open = readLedger(INDEX).filter((e) => (e.status ?? 'open') === 'open');
    if (!diaryPath) return { diaryPath: null, documented: [], undocumented: open };

    const covered = coveredFingerprints(readFileSync(diaryPath, 'utf8'));
    return {
        diaryPath,
        documented: open.filter((e) => covered.has(e.fingerprint)),
        undocumented: open.filter((e) => !covered.has(e.fingerprint)),
    };
}

function applyUpdate(diaryPath: string, missing: LedgerEntry[]): void {
    let diary = readFileSync(diaryPath, 'utf8');
    const lines = missing
        .map((e) => `${e.fingerprint}  [${e.severity}] ${e.title.replace(/\s+/g, ' ').slice(0, 96)}`)
        .sort();

    if (diary.includes(OPEN_MARK)) {
        const start = diary.indexOf(OPEN_MARK);
        const end = diary.indexOf(CLOSE_MARK, start);
        const existing = diary.slice(start + OPEN_MARK.length, end).trim();
        const merged = [...existing.split('\n').map((l) => l.trim()).filter(Boolean), ...lines].sort();
        diary = diary.slice(0, start) + `${OPEN_MARK}\n${merged.join('\n')}\n${CLOSE_MARK}` + diary.slice(end + CLOSE_MARK.length);
    } else {
        diary += `\n\n<!--\nCoverage block. Every OPEN finding must appear here, or diary_check reports it\nUNDOCUMENTED. Fingerprints are what is read; titles are for humans.\n-->\n${OPEN_MARK}\n${lines.join('\n')}\n${CLOSE_MARK}\n`;
    }
    writeFileSync(diaryPath, diary, 'utf8');
}

// ── CLI ──────────────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].includes('diary_check')) {
    const { diaryPath, documented, undocumented } = checkCoverage();

    if (!diaryPath) {
        console.error('No diary found in docs/40_reports/playtests/ (expected YYYYMMDD_*diary.md).');
        console.error('Findings have nowhere to be documented. Create one before running playtests.');
        process.exit(1);
    }

    console.log(`diary: ${diaryPath.replace(REPO_BASE_DIR, '.')}`);
    console.log(`  documented:   ${documented.length}`);
    console.log(`  UNDOCUMENTED: ${undocumented.length}`);

    if (undocumented.length > 0) {
        console.log('');
        for (const e of undocumented.slice(0, 20)) {
            console.log(`    ${e.fingerprint}  [${e.severity}] ${e.title.slice(0, 84)}`);
        }
        if (undocumented.length > 20) console.log(`    … and ${undocumented.length - 20} more`);
        console.log('');
        console.log('  These findings exist in the dedup index and NOT in the diary.');
        console.log('  Write them up, then acknowledge with: diary_check.ts --update');
    }

    if (process.argv.includes('--update') && undocumented.length > 0) {
        applyUpdate(diaryPath, undocumented);
        console.log(`  coverage block updated with ${undocumented.length} fingerprint(s).`);
        console.log('  NOTE: this records that you have SEEN them. It does not write the prose.');
    }

    if (process.argv.includes('--strict') && undocumented.length > 0) process.exit(1);
}
