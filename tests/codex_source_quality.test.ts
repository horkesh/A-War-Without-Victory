import assert from 'node:assert';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'vitest';

const require = createRequire(import.meta.url);
const sourceQuality = require('../tools/diagnostics/codex_source_quality.cjs');

test('ICTY source validation accepts narrow case-number formats and rejects malformed citations', () => {
    assert.strictEqual(sourceQuality.hasValidIctyCaseNumber('ICTY Karadzic Trial Judgment (IT-95-5/18-T)'), true);
    assert.strictEqual(sourceQuality.hasValidIctyCaseNumber('ICTY Tolimir Trial Judgment (IT-05-88/2)'), true);
    assert.strictEqual(sourceQuality.hasValidIctyCaseNumber('ICTY Foca findings, no case number'), false);
    assert.strictEqual(sourceQuality.hasValidIctyCaseNumber('ICTY Judgment (IT95-5-18-T)'), false);
});

test('essay audit reports floor exceptions and citation errors in stable path order', async () => {
    const root = await mkdtemp(join(tmpdir(), 'awwv-codex-sources-'));
    const essaysDir = join(root, 'essays');
    await mkdir(essaysDir);

    try {
        await writeFile(join(essaysDir, 'zeta.json'), JSON.stringify({
            id: 'essay_zeta',
            title: 'Zeta',
            category: 'humanitarian',
            sources: ['ICTY Trial Judgment without case number'],
        }));
        await writeFile(join(essaysDir, 'alpha.json'), JSON.stringify({
            id: 'essay_alpha',
            title: 'Alpha',
            category: 'military',
            sources: ['ICTY Galic Trial Judgment (IT-98-29-T)'],
        }));
        await writeFile(join(essaysDir, 'essay_index.json'), JSON.stringify({ essays: ['ignored'] }));

        const result = await sourceQuality.auditEssaySources({ essaysDir });

        assert.deepStrictEqual(result.summary, {
            essayCount: 2,
            categoryCounts: { humanitarian: 1, military: 1 },
            categorySourceMinimums: { humanitarian: 1, military: 1 },
        });
        assert.deepStrictEqual(result.issues.map((issue: { file: string; code: string }) => [issue.file, issue.code]), [
            ['alpha.json', 'SOURCE_FLOOR_EXCEPTION'],
            ['zeta.json', 'ICTY_CASE_FORMAT'],
            ['zeta.json', 'SOURCE_FLOOR_EXCEPTION'],
        ]);
        assert.strictEqual(result.exitCode, 1);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
