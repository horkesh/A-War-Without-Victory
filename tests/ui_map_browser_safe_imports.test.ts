import path from 'node:path';
import { build } from 'esbuild';
import { expect, it } from 'vitest';

it('browser-safe combat imports bundle without Node builtins', async () => {
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
    expect(output.includes('node:fs'), 'browser bundle should not reference node:fs').toBe(false);
    expect(output.includes('node:path'), 'browser bundle should not reference node:path').toBe(false);
    expect(output.includes(' from "fs"'), 'browser bundle should not reference fs').toBe(false);
    expect(output.includes(' from "path"'), 'browser bundle should not reference path').toBe(false);
});
