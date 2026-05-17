import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('repository EOL policy', () => {
    it('has a runnable mixed-EOL guard for tracked source and docs files', () => {
        const result = spawnSync(process.execPath, ['tools/repo/check_eol_policy.cjs', '--stdin'], {
            cwd: process.cwd(),
            encoding: 'utf8',
            input: [
                'i/lf    w/lf    attr/text eol=lf       \tsrc/example.ts',
                'i/lf    w/mixed attr/text eol=lf       \tdata/source/archive.bin',
            ].join('\n'),
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('EOL policy check passed');
        expect(result.stderr).toBe('');
    });
});
