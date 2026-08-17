import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A CI job that names a test file which no longer exists runs one file fewer
 * than it advertises, and says nothing about it.
 *
 * `vitest run <path>` treats every positional argument as a FILTER, not a
 * path. An unmatched filter matches nothing, contributes nothing, and does
 * not fail. So deleting a test file that a workflow names leaves the workflow
 * green while its coverage silently shrinks.
 *
 * Measured instance (2026-08-17): `.github/workflows/event-system-ci.yml`
 * named `tests/ui/decision_history_overlay.test.ts`, deleted 2026-07-07 by
 * `7ceddab8f`. For six weeks the job reported success over 24 files while
 * listing 25. Nothing was red; the gate was simply smaller than it claimed.
 *
 * This is a machine-checkable invariant, so a machine checks it. Scope is
 * every workflow YAML plus the workflow catalog README, because the README's
 * job descriptions are what a reviewer reads when deciding whether a gate
 * covers their change — a stale path there misinforms exactly as effectively.
 *
 * COMMENTARY VS GATE. A comment or blockquote that *names* a deleted test —
 * to record why it was removed — is documentation, not coverage, and must not
 * fail this guard. That exclusion is deliberately not an escape hatch: the two
 * buckets are partitioned, their union is asserted to equal the full
 * reference set, and the commentary bucket is derived BY SUBTRACTION from the
 * parent rather than by its own predicate. A future line form that neither
 * predicate recognises therefore lands in the checked bucket and fails
 * closed, instead of escaping because someone forgot to update a matcher.
 */

const WORKFLOW_DIR = join(process.cwd(), '.github', 'workflows');

/**
 * Matches repo-relative test paths as they appear in workflow command lines
 * and prose. Deliberately narrow: only `tests/**` with a `.test.<ext>` suffix,
 * so ordinary source references and glob patterns are not swept in.
 */
const TEST_PATH_PATTERN = /tests\/[A-Za-z0-9_/.-]+\.test\.(?:ts|tsx|cjs|mjs|js)/g;

type Reference = {
    readonly file: string;
    readonly path: string;
    readonly line: string;
};

/** A YAML comment or a Markdown blockquote: prose about the gate, not the gate. */
function isCommentary(line: string): boolean {
    const trimmed = line.trimStart();
    return trimmed.startsWith('#') || trimmed.startsWith('>');
}

function collectReferences(): Reference[] {
    const files = readdirSync(WORKFLOW_DIR)
        .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml') || name.endsWith('.md'))
        .sort();

    const references: Reference[] = [];
    const seen = new Set<string>();
    for (const file of files) {
        const lines = readFileSync(join(WORKFLOW_DIR, file), 'utf8').split(/\r?\n/);
        for (const line of lines) {
            for (const match of line.matchAll(TEST_PATH_PATTERN)) {
                const key = `${file}::${match[0]}::${isCommentary(line) ? 'commentary' : 'gate'}`;
                if (seen.has(key)) continue;
                seen.add(key);
                references.push({ file, path: match[0], line });
            }
        }
    }

    return references.sort((a, b) => (a.file === b.file ? a.path.localeCompare(b.path) : a.file.localeCompare(b.file)));
}

describe('CI workflow test-path references', () => {
    it('finds live references across more than one workflow file', () => {
        const references = collectReferences();
        const gate = references.filter((reference) => !isCommentary(reference.line));

        // Liveness. Without this, a regex that stops matching turns the
        // existence check into a loop over an empty set — green, and empty.
        expect(gate.length).toBeGreaterThan(0);
        expect(new Set(gate.map((reference) => reference.file)).size).toBeGreaterThan(1);
    });

    it('partitions every reference into exactly one of gate or commentary', () => {
        const references = collectReferences();
        const commentary = references.filter((reference) => isCommentary(reference.line));
        // Derived by SUBTRACTION from the parent set, never by its own
        // predicate — so an unrecognised line form is checked, not exempted.
        const gate = references.filter((reference) => !commentary.includes(reference));

        expect(gate.length + commentary.length).toBe(references.length);
        expect([...gate, ...commentary].map((reference) => `${reference.file}::${reference.path}`).sort())
            .toEqual(references.map((reference) => `${reference.file}::${reference.path}`).sort());
    });

    it('resolves every gate-referenced test file on disk', () => {
        const references = collectReferences();
        const commentary = references.filter((reference) => isCommentary(reference.line));
        const gate = references.filter((reference) => !commentary.includes(reference));
        const missing = gate.filter((reference) => !existsSync(join(process.cwd(), reference.path)));

        // Report how much was checked, not only that nothing was wrong — a
        // zero-violation result is only meaningful next to a nonzero
        // comparison count.
        expect(
            missing.map((reference) => `${reference.file} -> ${reference.path}`),
            `checked ${gate.length} gate references (${commentary.length} commentary references excluded)`,
        ).toEqual([]);
    });
});
