import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

test('desktop sim bundle can be built and required in CommonJS mode', () => {
    const repoRoot = process.cwd();
    const bundleScript = path.join(repoRoot, 'tools', 'desktop_bundle_sim.mjs');

    execFileSync(process.execPath, [bundleScript], {
        cwd: repoRoot,
        stdio: 'pipe',
    });

    const requireBundleScript = "require('./dist/desktop/desktop_sim.cjs')";
    let output = '';
    try {
        execFileSync(process.execPath, ['-e', requireBundleScript], {
            cwd: repoRoot,
            stdio: 'pipe',
        });
    } catch (error) {
        output = `${error}`;
        if (error && typeof error === 'object' && 'stderr' in error) {
            output += `\n${String((error as { stderr?: Buffer }).stderr ?? '')}`;
        }
    }

    assert.strictEqual(output, '', `desktop_sim.cjs should load cleanly, got:\n${output}`);
});
