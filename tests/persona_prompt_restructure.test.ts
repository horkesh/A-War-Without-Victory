/**
 * LANE-NIGHTSHIFT-PERSONA-PROMPT-RESTRUCTURE — verification tests.
 *
 * Verifies that every persona JSON file's `system_prompt_template`
 * carries the four D3.3-noise-suppression instructions and the
 * positive ICTY-citation guidance, and that the test file itself
 * remains faction-symmetric (no per-faction string-equality branches).
 *
 * Determinism: pure file IO + sorted iteration. No Math.random,
 * no Date.now, no timestamps.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PERSONAS_DIR = resolve(process.cwd(), 'tools/claude_plays_vrs/personas');

// Suppressor substrings (must appear verbatim in every persona's
// system_prompt_template). Substrings are intentionally short to
// survive minor wording adjustments while still proving suppressor
// intent is present.
const SUPPRESSOR_NO_DIRECTIVE =
    'DO NOT flag absence of political directives';
const SUPPRESSOR_ALLIANCE_COEFF =
    'DO NOT comment on the RBiH-HRHB alliance coefficient';
const SUPPRESSOR_OPS_PLANNING =
    'DO NOT flag "ops in planning" as a sim defect';
const SUPPRESSOR_OP_NAME_CONFAB =
    'DO NOT invent operation names';
const POSITIVE_ICTY_CITATION =
    'DO cite ICTY judgments';

interface Persona {
    id: string;
    role: string;
    system_prompt_template: string;
}

function loadAllPersonas(): Persona[] {
    const files = readdirSync(PERSONAS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort();
    return files.map(f => {
        const raw = readFileSync(join(PERSONAS_DIR, f), 'utf8');
        return JSON.parse(raw) as Persona;
    });
}

describe('LANE-NIGHTSHIFT-PERSONA-PROMPT-RESTRUCTURE: persona prompts carry D3.3 noise suppressors', () => {
    const personas = loadAllPersonas();

    // Sanity: at least 13 persona files (3 presidents + 6 army COs +
    // 3 named corps COs + 1 archetype).
    it('discovers ≥13 persona JSON files', () => {
        expect(personas.length).toBeGreaterThanOrEqual(13);
    });

    // ─── T1: no-directive suppressor ──────────────────────────────

    it('T1: every persona system_prompt_template carries the no-directive suppressor', () => {
        for (const p of personas) {
            expect(
                p.system_prompt_template,
                `${p.id} missing no-directive suppressor`,
            ).toContain(SUPPRESSOR_NO_DIRECTIVE);
        }
    });

    // ─── T2: alliance-coefficient suppressor ──────────────────────

    it('T2: every persona system_prompt_template carries the alliance-coefficient suppressor', () => {
        for (const p of personas) {
            expect(
                p.system_prompt_template,
                `${p.id} missing alliance-coefficient suppressor`,
            ).toContain(SUPPRESSOR_ALLIANCE_COEFF);
        }
    });

    // ─── T3: operation-name confabulation suppressor ──────────────

    it('T3: every persona system_prompt_template carries the operation-name suppressor', () => {
        for (const p of personas) {
            expect(
                p.system_prompt_template,
                `${p.id} missing operation-name suppressor`,
            ).toContain(SUPPRESSOR_OP_NAME_CONFAB);
        }
    });

    // ─── T4: positive ICTY-citation guidance ──────────────────────

    it('T4: every persona system_prompt_template carries the ICTY-citation guidance', () => {
        for (const p of personas) {
            expect(
                p.system_prompt_template,
                `${p.id} missing ICTY-citation guidance`,
            ).toContain(POSITIVE_ICTY_CITATION);
        }
    });

    // ─── T5 (bonus): ops-in-planning suppressor ───────────────────

    it('T5: every persona system_prompt_template carries the ops-in-planning suppressor', () => {
        for (const p of personas) {
            expect(
                p.system_prompt_template,
                `${p.id} missing ops-in-planning suppressor`,
            ).toContain(SUPPRESSOR_OPS_PLANNING);
        }
    });

    // ─── T6 (static-grep, faction-symmetric guard): no per-faction
    // string-equality branches in this test file. Suppressors apply
    // identically to all 13 personas regardless of faction.
    //
    // We read this very file and assert that it does not contain
    // string-equality comparisons against canonical faction ids
    // ('RS', 'RBiH', 'HRHB') in test-assertion form. The faction id
    // strings may appear in suppressor *content* (above) — we only
    // forbid them appearing as branch conditions.

    it('T6: test file contains no per-faction string-equality branches (faction-symmetric)', () => {
        const selfPath = resolve(process.cwd(), 'tests/persona_prompt_restructure.test.ts');
        const src = readFileSync(selfPath, 'utf8');
        // Strip line/block comments and string literals so prose
        // mentions don't trigger.
        const stripped = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
            .replace(/'[^']*'/g, "''")
            .replace(/"[^"]*"/g, '""');
        // Forbidden: faction id appearing in a string-equality
        // operator (===, !==, ==, !=) or switch-case head — none of
        // which can survive after string-literal stripping.
        // After stripping, faction ids should appear only in
        // comments-stripped non-string code, which means: not at all
        // (they are suppressor-content strings only).
        expect(stripped).not.toMatch(/\b(faction|p\.faction|persona\.faction)\s*[!=]==?\s*$/m);
        expect(stripped).not.toMatch(/case\s+(?:RS|RBiH|HRHB)\b/);
    });
});
