import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(resolve(repoRoot, rel), 'utf8');

/**
 * The production bundle once shipped a cyclic chunk graph: manualChunks split
 * src/ui/map/components/army_hq/ across four chunks by filename, cutting through a
 * strongly-connected set of app modules. The chunks then imported each other in a
 * cycle, ES module init order broke, and the bundle threw
 * "Cannot access 'ir' before initialization" before React mounted — so the packaged
 * desktop app fell back to its legacy recovery menu.
 *
 * Nothing caught it: the dev server does not chunk-split, and `vite build` exiting 0
 * only means the bundle was written, not that it runs. These are the cheap static
 * guards; tools/ui/check_chunk_cycles.cjs is the real one and runs on the build output.
 */
describe('tactical map chunking contract', () => {
  it('never manually chunks app source, only vendor and static data', () => {
    const config = read('src/ui/map/vite.config.ts');
    const fn = config.slice(
      config.indexOf('function tacticalMapManualChunks'),
      config.indexOf('export default defineConfig'),
    );
    expect(fn.length).toBeGreaterThan(0);

    // Strip comments so the rationale prose cannot satisfy or trip these checks.
    const code = fn.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Every `return '<name>'` must be reached from a node_modules or /data/ branch.
    const returns = [...code.matchAll(/return\s+[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]);
    expect(returns.length).toBeGreaterThan(0);
    for (const chunk of returns) {
      expect(
        chunk.startsWith('vendor-')
          || chunk.startsWith('event-catalog-')
          || ['codex-essay-index', 'oob-brigades', 'oob-brigade-designations', 'operational-osid-areas'].includes(chunk),
        `manual chunk "${chunk}" is not a vendor or static-data chunk`,
      ).toBe(true);
    }

    // No rule may key off an app-source path.
    expect(code).not.toMatch(/\/src\/ui\/map\/components\//);
    expect(code).not.toMatch(/\/src\/ui\/map\/map\//);
    expect(code).not.toMatch(/\/src\/sim\//);
    // The specific split that broke production must not come back.
    expect(code).not.toContain('feature-army-hq');
  });

  it('keeps the chunk-cycle check on the packaging path', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['qa:chunk-cycles']).toContain('tools/ui/check_chunk_cycles.cjs');
    // desktop:package:dir depends on desktop:release:check, so gating there gates packaging.
    expect(pkg.scripts['desktop:release:check']).toContain('qa:chunk-cycles');
    expect(pkg.scripts['desktop:package:dir']).toContain('desktop:release:check');
  });

  it('ships every src/desktop module the packaged main process requires', () => {
    const pkg = JSON.parse(read('package.json')) as { build: { files: string[] } };
    const listed = pkg.build.files.filter((f) => f.startsWith('src/desktop/'));
    expect(listed.length).toBeGreaterThan(0);

    // Walk the require closure of the listed entries; nothing reachable may be absent.
    const seen = new Set<string>();
    const missing: string[] = [];
    const walk = (rel: string) => {
      if (seen.has(rel)) return;
      seen.add(rel);
      let source: string;
      try { source = read(rel); } catch { return; }
      for (const m of source.matchAll(/require\((['"])(\.\/[^'"]+?)\1\)/g)) {
        let dep = m[2].replace(/^\.\//, '');
        if (!/\.[cm]?js$/.test(dep)) dep += '.cjs';
        const depRel = `src/desktop/${dep}`;
        try { read(depRel); } catch { continue; } // not a real file; ignore
        if (!listed.includes(depRel) && !missing.includes(depRel)) missing.push(depRel);
        walk(depRel);
      }
    };
    for (const entry of listed) walk(entry);

    expect(missing, `required by the packaged main process but absent from build.files: ${missing.join(', ')}`).toEqual([]);
  });
});
