import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'vitest';

const execFileAsync = promisify(execFile);

const OWNERSHIP_DOC = join('docs', '20_engineering', 'GENERATED_ARTIFACT_OWNERSHIP.md');
const META_CONTRACT_TEST = 'tests/generated_artifact_ownership_matrix_contract.test.ts';

type MatrixRow = {
    artifact: string;
    cells: string[];
    lineNumber: number;
};

function splitMarkdownTableRow(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
        return [];
    }

    return trimmed
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim());
}

function parseMatrixRows(markdown: string): MatrixRow[] {
    const lines = markdown.split(/\r?\n/);
    const matrixHeadingIndex = lines.findIndex((line) => line.trim() === '## Matrix');
    assert.notStrictEqual(matrixHeadingIndex, -1, 'ownership document should contain a Matrix section');

    const rows: MatrixRow[] = [];
    for (let index = matrixHeadingIndex + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.startsWith('## ')) {
            break;
        }
        if (!line.trim().startsWith('|')) {
            continue;
        }
        const cells = splitMarkdownTableRow(line);
        if (cells.length === 0 || cells.every((cell) => /^-+$/.test(cell))) {
            continue;
        }
        if (cells[0] === 'Artifact (repo-relative POSIX)') {
            continue;
        }

        rows.push({
            artifact: cells[0].replace(/^`|`$/g, ''),
            cells,
            lineNumber: index + 1,
        });
    }

    return rows;
}

function assertPosixRepoRelativePattern(artifact: string, lineNumber: number): void {
    assert.ok(artifact.length > 0, `line ${lineNumber}: artifact key should not be empty`);
    assert.ok(!artifact.includes('\\'), `line ${lineNumber}: artifact key should not use Windows separators`);
    assert.ok(!/^[A-Za-z]:/.test(artifact), `line ${lineNumber}: artifact key should not be a Windows path`);
    assert.ok(!artifact.startsWith('/'), `line ${lineNumber}: artifact key should be repo-relative`);
    assert.ok(!artifact.includes('//'), `line ${lineNumber}: artifact key should not contain empty path segments`);
}

function citedTests(cells: string[]): string[] {
    return cells
        .join(' ')
        .match(/tests\/[A-Za-z0-9_./-]+\.test\.ts/g) ?? [];
}

test('generated artifact ownership matrix is a complete static contract', async () => {
    const repoRoot = process.cwd();
    const ownershipDoc = await readFile(join(repoRoot, OWNERSHIP_DOC), 'utf8');
    const rows = parseMatrixRows(ownershipDoc);

    assert.ok(rows.length > 0, 'ownership matrix should contain artifact rows');

    const artifactKeys = new Set<string>();
    const matrixCitedTests = new Set<string>();
    const transientCatchAllRows: MatrixRow[] = [];

    for (const row of rows) {
        assert.strictEqual(row.cells.length, 5, `line ${row.lineNumber}: matrix rows must have exactly 5 columns`);
        assert.ok(!artifactKeys.has(row.artifact), `duplicate artifact key in ownership matrix: ${row.artifact}`);
        artifactKeys.add(row.artifact);
        assertPosixRepoRelativePattern(row.artifact, row.lineNumber);

        for (const testPath of citedTests(row.cells)) {
            matrixCitedTests.add(testPath);
        }

        if (row.artifact.includes('*') || row.artifact.includes('...')) {
            const rowText = row.cells.join(' ');
            if (rowText.includes('Default transient') || rowText.includes('Always transient')) {
                transientCatchAllRows.push(row);
            }
        }
    }

    for (const testPath of matrixCitedTests) {
        const { stdout } = await execFileAsync('git', ['ls-files', '--', testPath], {
            cwd: repoRoot,
            encoding: 'utf8',
        });
        assert.strictEqual(stdout.trim(), testPath, `matrix cites missing test file: ${testPath}`);
    }

    const { stdout: ownershipTestStdout } = await execFileAsync('git', ['ls-files', '--', 'tests/*artifact_ownership.test.ts'], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    const ownershipTests = ownershipTestStdout.trim().split(/\r?\n/).filter(Boolean);
    for (const ownershipTest of ownershipTests) {
        if (ownershipTest === META_CONTRACT_TEST) {
            continue;
        }
        assert.ok(
            matrixCitedTests.has(ownershipTest),
            `artifact ownership test is not referenced by any matrix row: ${ownershipTest}`,
        );
    }

    assert.ok(transientCatchAllRows.length > 0, 'ownership matrix should contain transient catch-all rows');
    for (const row of transientCatchAllRows) {
        const rowText = row.cells.join(' ');
        assert.ok(rowText.includes('Default transient'), `line ${row.lineNumber}: transient catch-all row should say Default transient`);
        assert.ok(rowText.includes('Do not commit'), `line ${row.lineNumber}: transient catch-all row should say Do not commit`);
    }
});
