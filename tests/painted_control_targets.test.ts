import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createServer } = require('../tools/paint_control_targets.cjs');
const { canonicalizeControlMap, listPaintedTargets } = require('../tools/painted_control_targets.cjs');

describe('painted control target tooling', () => {
  it('canonicalizes control maps in stable OSID order and drops unsupported factions', () => {
    const out = canonicalizeControlMap({
      'op:test:z': 'RS',
      'op:test:a': 'RBiH',
      'op:test:m': 'UN',
      'op:test:h': 'HRHB',
    });

    expect(Object.keys(out)).toEqual(['op:test:a', 'op:test:h', 'op:test:z']);
    expect(out).toEqual({
      'op:test:a': 'RBiH',
      'op:test:h': 'HRHB',
      'op:test:z': 'RS',
    });
  });

  it('lists the late-war target slots the painter is meant to author', () => {
    const ids = listPaintedTargets().map((target: { id: string }) => target.id);
    expect(ids).toContain('jan1993');
    expect(ids).toContain('apr1994');
    expect(ids).toContain('apr1995');
    expect(ids).toContain('oct1995');
  });

  it('compare_painted_vs_sim accepts an explicit painted file path', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'awwv-painted-target-'));
    const runDir = path.join(tmp, 'run');
    fs.mkdirSync(runDir);
    const paintedPath = path.join(tmp, 'painted.json');
    fs.writeFileSync(
      paintedPath,
      JSON.stringify({
        meta: { label: 'Test target' },
        by_settlement_id: {
          'op:test:a': 'RS',
          'op:test:b': 'RBiH',
        },
      }),
    );
    fs.writeFileSync(
      path.join(runDir, 'final_save.json'),
      JSON.stringify({
        political: {
          political_controllers: {
            'op:test:a': 'RS',
            'op:test:b': 'HRHB',
          },
        },
      }),
    );

    const output = execFileSync(
      process.execPath,
      ['tools/compare_painted_vs_sim.cjs', runDir, '--painted', paintedPath],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(output).toContain('Painted target: painted (Test target)');
    expect(output).toContain('Match:    1 / 2');
    expect(output).toContain('Mismatch: 1 / 2');
  });

  it('serves target metadata and a seedable missing target over HTTP', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('server did not bind to a TCP port');
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const config = await (await fetch(`${base}/api/config`)).json();
      expect(config.targets.map((target: { id: string }) => target.id)).toContain('oct1995');

      const seeded = await (await fetch(`${base}/api/target/apr1994?seed=jan1993`)).json();
      expect(seeded.id).toBe('apr1994');
      expect(Object.keys(seeded.by_settlement_id).length).toBeGreaterThan(700);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
