import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PRODUCTION_ROOTS = [
    resolve(process.cwd(), 'src', 'map'),
    resolve(process.cwd(), 'src', 'validate'),
];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

async function collectProductionFiles(directory: string, files: string[] = []): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            await collectProductionFiles(path, files);
        } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
            files.push(path);
        }
    }

    return files;
}

describe('Engine Invariants 11.3 map and validator ordering contract', () => {
    it('uses no locale-dependent comparator in production map or validator code', async () => {
        const files: string[] = [];
        for (const root of PRODUCTION_ROOTS) {
            await collectProductionFiles(root, files);
        }
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

        expect(violations, `locale-dependent map/validator ordering:\n${violations.join('\n')}`).toEqual([]);
    });
});
