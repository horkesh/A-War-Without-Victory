import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('desktop sim bundle smoke', () => {
  it('can be built and required in CommonJS mode', () => {
    const repoRoot = process.cwd();
    const bundleScript = path.join(repoRoot, 'tools', 'desktop_bundle_sim.mjs');

    const build = spawnSync(process.execPath, [bundleScript], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const buildOutput = `${build.stdout ?? ''}${build.stderr ?? ''}`;

    expect(build.status, buildOutput).toBe(0);
    expect(buildOutput).not.toContain('[WARNING]');
    expect(buildOutput).not.toContain('empty-import-meta');

    const requireBundleScript = "const sim = require('./dist/desktop/desktop_sim.cjs'); if (typeof sim.resolveEventDecision !== 'function') throw new Error('resolveEventDecision export missing');";
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

    expect(output, `desktop_sim.cjs should load cleanly, got:\n${output}`).toBe('');
  });
});
