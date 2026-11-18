import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { resolveTsxCli } from '../tools/test/vitest_shared_config.mjs';

describe('presidential cadence CLI source-save provenance', () => {
  it('rejects a turn-0 save advertised as end turn 1 without writing output', () => {
    const evidenceDir = join(tmpdir(), `awwv-presidential-cadence-${process.pid}`);
    mkdirSync(evidenceDir, { recursive: true });
    const outputPath = join(evidenceDir, 'forged-report.json');
    const result = spawnSync(process.execPath, [
      resolveTsxCli(process.cwd()),
      resolve('tools/diagnostics/presidential_cadence_report.ts'),
      '--save',
      // Minimal turn-0 save: the CLI parses the save and checks meta.turn first.
      resolve('tests/fixtures/diagnostics/turn0_save_stub.json'),
      // Any real scenario file serves here: this asserts the CLI REFUSES a save whose turn
      // does not match --end-turn, a check that runs before scenario content matters.
      // Was apr1992_definitive_104w.json until that fork was retired 2026-09-08.
      '--scenario',
      resolve('data/scenarios/apr1992_definitive_188w.json'),
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
