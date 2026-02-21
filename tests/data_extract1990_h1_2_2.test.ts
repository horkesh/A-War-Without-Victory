/**
 * Phase H1.2.2: data:extract1990 generator — output exists, parseable, non-empty, key-sorted.
 * Skips when canonical DOCX input is not present (same pattern as prereq-dependent tests).
 */

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';




const ROOT = process.cwd();
const DEFAULT_INPUT = join(ROOT, 'data/source/1990 to 1995 municipalities_BiH.xlsx');
const OUTPUT_PATH = join(ROOT, 'data/source/municipality_political_controllers.json');

function runExtract1990(): Promise<{ code: number }> {
    return new Promise((resolve) => {
        const proc = spawn('npm', ['run', 'data:extract1990'], {
            cwd: ROOT,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        proc.on('close', (code) => resolve({ code: code ?? 1 }));
    });
}

test('data:extract1990 produces valid mapping when Excel present', async () => {
    if (!existsSync(DEFAULT_INPUT)) {
        return;
    }

    const result = await runExtract1990();
    assert.strictEqual(result.code, 0, 'npm run data:extract1990 should exit 0 when Excel present');

    assert(existsSync(OUTPUT_PATH), 'output file should exist');
    const raw = await readFile(OUTPUT_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    assert(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed));
    const obj = parsed as Record<string, unknown>;
    assert(typeof obj.version === 'string');
    assert(obj.mappings !== null && typeof obj.mappings === 'object');
    const mappings = obj.mappings as Record<string, unknown>;
    const keys = Object.keys(mappings);
    assert(keys.length >= 1, 'mapping should be non-empty');

    const sorted = [...keys].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(keys, sorted, 'keys should be lexicographically sorted');
});
