import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('engine health gate stranded-formation domain', () => {
    it('excludes live operation participants but retains a genuinely stranded formation', () => {
        const runDir = mkdtempSync(join(tmpdir(), 'engine-health-'));
        try {
            writeFileSync(join(runDir, 'run_summary.json'), JSON.stringify({
                weeks: 188,
                combat_causality: {},
                destroyed_brigades: [],
                historical_fit: {
                    osid_pair_match: { matched_osids: 655 },
                    checkpoints: [],
                },
            }));
            writeFileSync(join(runDir, 'final_save.json'), JSON.stringify({
                meta: { turn: 188 },
                military: {
                    formations: {
                        flat_participant: { id: 'flat_participant', status: 'active', stranded_status: 'holding' },
                        axis_participant: { id: 'axis_participant', status: 'active', stranded_status: 'reconnected' },
                        genuinely_stranded: { id: 'genuinely_stranded', status: 'active', stranded_status: 'holding' },
                    },
                    corps_command: {
                        test_corps: {
                            active_operations: [{
                                participating_brigades: ['flat_participant'],
                                axes: [{ assigned_brigades: ['axis_participant'] }],
                            }],
                        },
                    },
                },
            }));

            const result = spawnSync(process.execPath, [
                resolve('tools/engine_health_gate.cjs'),
                runDir,
                '--horizon',
                '188w',
                '--json',
            ], { cwd: process.cwd(), encoding: 'utf8' });
            const jsonLine = result.stdout
                .split(/\r?\n/)
                .find((line) => line.startsWith('{"horizon"'));

            expect(jsonLine, result.stderr).toBeDefined();
            expect(JSON.parse(jsonLine!).measured.stranded_brigades).toBe(1);
        } finally {
            rmSync(runDir, { recursive: true, force: true });
        }
    });
});
