import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('presidential cadence CLI source-save provenance', () => {
  it('rejects a turn-0 save advertised as end turn 1 without writing output', () => {
    const evidenceDir = join(tmpdir(), `awwv-presidential-cadence-${process.pid}`);
    mkdirSync(evidenceDir, { recursive: true });
    const outputPath = join(evidenceDir, 'forged-report.json');
    const result = spawnSync(process.execPath, [
      resolve('node_modules/tsx/dist/cli.mjs'),
      resolve('tools/diagnostics/presidential_cadence_report.ts'),
      '--save',
      resolve('docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/initial-autosave.json'),
      '--scenario',
      resolve('data/scenarios/apr1992_definitive_104w.json'),
      '--run-id',
      'invented-reviewer-proof',
      '--holds',
      resolve('tests/fixtures/diagnostics/rs_104week_cadence_receipts.json'),
      '--end-turn',
      '1',
      '--out',
      outputPath,
    ], { cwd: resolve('.'), encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Source save turn 0 does not equal --end-turn 1/);
    expect(existsSync(outputPath)).toBe(false);
  });
});
