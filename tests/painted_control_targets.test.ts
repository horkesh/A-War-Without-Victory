import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createServer } = require('../tools/paint_control_targets.cjs');
const { canonicalizeControlMap, listPaintedTargets, loadPaintedTarget } = require('../tools/painted_control_targets.cjs');

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
    expect(ids.slice(0, 4)).toEqual(['jan1993', 'apr1994', 'apr1995', 'oct1995']);
  });

  it('keeps built-in painted targets on the same OSID universe', () => {
    const baselineKeys = Object.keys(loadPaintedTarget('jan1993').control);
    for (const id of ['apr1994', 'apr1995', 'oct1995']) {
      const target = loadPaintedTarget(id);
      expect(Object.keys(target.control), id).toEqual(baselineKeys);
      expect(target.summary.total_osids, id).toBe(baselineKeys.length);
    }
  });

  // ─── Repaint regression assertions (2026-05-21) ────────────────────────
  // Source: docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md Q1.4
  // Tool: tools/diagnostics/painted_target_anomaly_fix.cjs
  //
  // Two anomalies repainted:
  //   - op:gorazde:gorazde_2 -> RBiH at apr1994 / apr1995 / oct1995
  //     (ICTY Karadžić TJ §3823+; BB1 p.187,448 — Goražde core held RBiH continuously)
  //   - op:rogatica:zepa_2  -> RS  at oct1995 only
  //     (ICTY Krstić TJ + Karadžić TJ §5662+ — Žepa fell 25 Jul 1995)
  //
  // The repaint is idempotent; these assertions guard against accidental reversion.

  it('repaint regression: op:gorazde:gorazde_2 = RBiH at apr1994', () => {
    expect(loadPaintedTarget('apr1994').control['op:gorazde:gorazde_2']).toBe('RBiH');
  });

  it('repaint regression: op:gorazde:gorazde_2 = RBiH at apr1995', () => {
    expect(loadPaintedTarget('apr1995').control['op:gorazde:gorazde_2']).toBe('RBiH');
  });

  it('repaint regression: op:gorazde:gorazde_2 = RBiH at oct1995', () => {
    expect(loadPaintedTarget('oct1995').control['op:gorazde:gorazde_2']).toBe('RBiH');
  });

  it('repaint regression: op:rogatica:zepa_2 = RS at oct1995', () => {
    expect(loadPaintedTarget('oct1995').control['op:rogatica:zepa_2']).toBe('RS');
  });

  it('repaint regression: jan1993 anchors unchanged (Goražde + Žepa pre-repaint epochs)', () => {
    const jan = loadPaintedTarget('jan1993').control;
    expect(jan['op:gorazde:gorazde_2'], 'gorazde_2 in jan1993').toBe('RBiH');
    expect(jan['op:rogatica:zepa_2'], 'zepa_2 in jan1993').toBe('RBiH');
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

      const seeded = await (await fetch(`${base}/api/target/test_missing_target?seed=jan1993`)).json();
      expect(seeded.id).toBe('test_missing_target');
      expect(seeded.label).toBe('test_missing_target');
      expect(seeded.missing).toBe(true);
      expect(Object.keys(seeded.by_settlement_id).length).toBeGreaterThan(700);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
