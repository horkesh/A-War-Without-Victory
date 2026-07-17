import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const STATE_ROOT = resolve(process.cwd(), 'src', 'state');
const EXCLUDED_PATHS = new Set([resolve(STATE_ROOT, 'deterministic_random.ts')]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

async function collectProductionFiles(directory: string, files: string[] = []): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            await collectProductionFiles(path, files);
        } else if (
            entry.isFile()
            && SOURCE_EXTENSIONS.has(extname(entry.name))
            && !EXCLUDED_PATHS.has(path)
        ) {
            files.push(path);
        }
    }

    return files;
}

describe('Engine Invariants 11.3 state ordering contract', () => {
    it('uses no locale-dependent comparator in production state code', async () => {
        const files = await collectProductionFiles(STATE_ROOT);
        files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

        const violations: string[] = [];
        for (const file of files) {
            const lines = (await readFile(file, 'utf8')).split(/\r?\n/);
            lines.forEach((line, index) => {
                if (/\.localeCompare\s*\(/.test(line)) {
                    violations.push(`${relative(process.cwd(), file)}:${index + 1}`);
                }
            });
        }

        expect(violations, `locale-dependent state ordering:\n${violations.join('\n')}`).toEqual([]);
    });
});
