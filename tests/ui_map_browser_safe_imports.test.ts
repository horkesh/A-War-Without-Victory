import assert from 'node:assert';
import path from 'node:path';
import { test } from 'node:test';
import { build } from 'esbuild';

test('browser-safe combat imports bundle without Node builtins', async () => {
    const repoRoot = process.cwd();

    const result = await build({
        stdin: {
            contents: [
                "import 'F:/A-War-Without-Victory/src/sim/combat/combat_math.ts';",
                "import 'F:/A-War-Without-Victory/src/map/terrain_scalars.ts';",
            ].join('\n'),
            sourcefile: path.join(repoRoot, 'tests', 'browser-safe-entry.ts'),
            resolveDir: repoRoot,
        },
        bundle: true,
        platform: 'browser',
        format: 'esm',
        write: false,
        logLevel: 'silent',
    });

    const output = result.outputFiles.map(file => file.text).join('\n');
    assert.ok(!output.includes('node:fs'), 'browser bundle should not reference node:fs');
    assert.ok(!output.includes('node:path'), 'browser bundle should not reference node:path');
    assert.ok(!output.includes(' from "fs"'), 'browser bundle should not reference fs');
    assert.ok(!output.includes(' from "path"'), 'browser bundle should not reference path');
});
