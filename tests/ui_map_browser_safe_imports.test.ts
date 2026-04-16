import path from 'node:path';
import { build } from 'esbuild';
import { expect, it } from 'vitest';

it('browser-safe combat imports bundle without Node builtins', async () => {
    const repoRoot = process.cwd();

    const result = await build({
        stdin: {
            contents: [
                `import '${path.resolve(repoRoot, 'src/sim/combat/combat_math.ts').replace(/\\/g, '/')}';`,
                `import '${path.resolve(repoRoot, 'src/map/terrain_scalars.ts').replace(/\\/g, '/')}';`,
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
