import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const npmCommand = process.platform === 'win32'
    ? ['cmd.exe', '/c', 'npm.cmd']
    : ['npm'];

describe('political-control audit CLIs', () => {
    it('reports Phase D0 validation failures without crashing on the derived index shape', () => {
        const result = spawnSync(npmCommand[0], [...npmCommand.slice(1), 'run', 'phaseD0:political_control_inputs_audit'], {
            cwd: process.cwd(),
            encoding: 'utf8',
        });

        expect(result.stderr ?? '').not.toContain('TypeError');
        expect(result.stdout ?? '').toContain('Phase D0 political control inputs audit');
        expect(result.status).toBe(1);
    });

    it('runs the null-control diagnosis against the current derived index', () => {
        const result = spawnSync(npmCommand[0], [...npmCommand.slice(1), 'run', 'phaseE4:null_political_control_diagnosis'], {
            cwd: process.cwd(),
            encoding: 'utf8',
        });

        expect(result.stderr ?? '').not.toContain('TypeError');
        expect(result.status).toBe(0);
    });
});
