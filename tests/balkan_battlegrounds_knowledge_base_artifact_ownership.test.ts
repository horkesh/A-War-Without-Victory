import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const KB_ROOT = 'data/derived/knowledge_base/balkan_battlegrounds/';

function findOwnershipRow(ownershipDoc: string, artifact: string): string | undefined {
    return ownershipDoc.split(/\r?\n/).find((line) => line.startsWith(`| \`${artifact}\``));
}

async function gitLsFiles(repoRoot: string, pathspec: string): Promise<string[]> {
    const { stdout } = await execFileAsync('git', ['ls-files', '--', pathspec], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    return stdout.trim().split(/\r?\n/).filter(Boolean).sort();
}

test('Balkan Battlegrounds knowledge-base artifacts are committed retained research evidence', async () => {
    const repoRoot = process.cwd();
    const [ownershipDoc, factsRaw, mapCatalogRaw] = await Promise.all([
        readFile(join(repoRoot, 'docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md'), 'utf8'),
        readFile(join(repoRoot, 'data', 'derived', 'knowledge_base', 'balkan_battlegrounds', 'facts_proposed.json'), 'utf8'),
        readFile(join(repoRoot, 'data', 'derived', 'knowledge_base', 'balkan_battlegrounds', 'map_catalog.json'), 'utf8'),
    ]);

    const ownershipRow = findOwnershipRow(ownershipDoc, KB_ROOT);
    assert.ok(ownershipRow, 'ownership matrix should include the Balkan Battlegrounds knowledge-base row');
    assert.ok(
        ownershipRow.includes('tests/balkan_battlegrounds_knowledge_base_artifact_ownership.test.ts'),
        'ownership row should name this static ownership guard',
    );
    assert.ok(
        ownershipRow.includes('Committed retained research evidence'),
        'ownership row should classify the tree as retained research evidence',
    );
    assert.ok(
        ownershipRow.includes('historian/research approval'),
        'ownership row should require historian/research approval before refresh or deletion',
    );
    assert.ok(
        ownershipRow.includes('Not transient while committed'),
        'ownership row should distinguish retained research evidence from transient run output',
    );

    const allFiles = await gitLsFiles(repoRoot, `${KB_ROOT}*`);
    const pageFiles = allFiles.filter((file) => file.startsWith(`${KB_ROOT}pages/`));
    const mapFiles = allFiles.filter((file) => file.startsWith(`${KB_ROOT}maps/`));
    const extractionFiles = allFiles.filter((file) => file.startsWith(`${KB_ROOT}extractions/`));

    assert.strictEqual(allFiles.length, 423, 'tracked Balkan Battlegrounds evidence file count should stay fixed');
    assert.strictEqual(pageFiles.length, 406, 'tracked page extraction count should stay fixed');
    assert.strictEqual(mapFiles.length, 11, 'tracked map image count should stay fixed');
    assert.strictEqual(extractionFiles.length, 4, 'tracked synthesized extraction count should stay fixed');

    assert.ok(allFiles.includes(`${KB_ROOT}facts_proposed.json`), 'facts proposal catalog should remain tracked');
    assert.ok(allFiles.includes(`${KB_ROOT}map_catalog.json`), 'map catalog should remain tracked');
    assert.ok(
        extractionFiles.includes(`${KB_ROOT}extractions/EARLY_WAR_TERRITORIAL_PROGRESSION_APR_JAN1993.md`),
        'early-war territorial progression extraction should remain tracked',
    );
    assert.ok(
        extractionFiles.includes(`${KB_ROOT}extractions/ARBIH_HVO_HOSTILITIES_TIMING.md`),
        'ARBiH-HVO hostilities timing extraction should remain tracked',
    );

    const facts = JSON.parse(factsRaw) as unknown[];
    assert.ok(Array.isArray(facts), 'facts_proposed.json should remain an array');
    assert.strictEqual(facts.length, 18, 'facts proposal count should stay fixed');

    const mapCatalog = JSON.parse(mapCatalogRaw) as unknown[];
    assert.ok(Array.isArray(mapCatalog), 'map_catalog.json should remain an array');
    assert.strictEqual(mapCatalog.length, 2, 'catalogued map-row count should stay fixed');
    for (const entry of mapCatalog) {
        assert.ok(entry !== null && typeof entry === 'object', 'map catalog entries should remain objects');
        const imagePath = (entry as { image_path?: unknown }).image_path;
        if (typeof imagePath !== 'string') {
            assert.fail('map catalog entries should retain image_path strings');
        }
        const imageName = imagePath.split(/[/\\]/).at(-1);
        assert.ok(
            mapFiles.some((file) => file.endsWith(`/${imageName}`)),
            `catalogued map image should remain tracked: ${imageName}`,
        );
    }
});
