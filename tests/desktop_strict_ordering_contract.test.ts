import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const DESKTOP_ROOT = resolve(process.cwd(), 'src', 'desktop');
const PRODUCTION_EXTENSIONS = new Set(['.ts', '.cjs']);

async function collectProductionFiles(directory: string, files: string[] = []): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            await collectProductionFiles(path, files);
        } else if (entry.isFile() && PRODUCTION_EXTENSIONS.has(extname(entry.name))) {
            files.push(path);
        }
    }

    return files;
}

describe('Engine Invariants 11.3 desktop ordering contract', () => {
    it('uses no locale-dependent comparator in production desktop TS or CJS', async () => {
        const files = await collectProductionFiles(DESKTOP_ROOT);
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

        expect(violations, `locale-dependent desktop ordering:\n${violations.join('\n')}`).toEqual([]);
    });
});
