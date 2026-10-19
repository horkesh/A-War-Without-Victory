import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const CLI = resolve('tools/diagnostics/run_preserved_preflight.cjs');

function sha256(bytes: Buffer | string): string {
    return createHash('sha256').update(bytes).digest('hex');
}

function fixtureRoot(name: string): string {
    return mkdtempSync(join(tmpdir(), `awwv-636-${name}-`));
}

function runCli(args: string[]) {
    return spawnSync(process.execPath, [CLI, ...args], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 15_000,
        windowsHide: true,
    });
}

function baseArgs(attemptDir: string, entryScript: string, executable = process.execPath): string[] {
    return [
        '--attempt-dir', attemptDir,
        '--entry-script', entryScript,
        '--timeout-ms', '2000',
        '--allow-artifact', 'child-result.json',
        '--', executable, entryScript, '--evidence-dir', '{evidenceDir}',
    ];
}

describe('preserved preflight evidence CLI', () => {
    it('keeps a failed attempt byte-identical after a corrected fresh attempt', () => {
        const root = fixtureRoot('correction');
        const entry = join(root, 'preflight.cjs');
        const failedAttempt = join(root, 'attempt-failed');
        const correctedAttempt = join(root, 'attempt-corrected');
        const failedSource = [
            "const fs=require('node:fs');",
            "const path=require('node:path');",
            "const dir=process.argv[process.argv.indexOf('--evidence-dir')+1];",
            "fs.writeFileSync(path.join(dir,'child-result.json'),JSON.stringify({ok:false})+'\\n',{flag:'wx'});",
            "process.stdout.write('failed-out\\n');",
            "process.stderr.write('failed-err\\n');",
            'process.exit(7);',
            '',
        ].join('\r\n');
        writeFileSync(entry, failedSource, 'utf8');

        const failed = runCli(baseArgs(failedAttempt, entry));
        expect(failed.status).toBe(7);
        const failedReceipt = JSON.parse(readFileSync(join(failedAttempt, 'receipt.json'), 'utf8'));
        expect(failedReceipt.schema).toBe('awwv.preserved-preflight.receipt.v1');
        expect(failedReceipt.child_exit).toBe(7);
        expect(failedReceipt.wrapper_exit).toBe(7);
        expect(readFileSync(join(failedAttempt, 'stdout.log'), 'utf8')).toBe('failed-out\n');
        expect(readFileSync(join(failedAttempt, 'stderr.log'), 'utf8')).toBe('failed-err\n');
        expect(JSON.parse(readFileSync(join(failedAttempt, 'child-result.json'), 'utf8'))).toEqual({ ok: false });
        const retained = ['entry-script.snapshot', 'start.json', 'stdout.log', 'stderr.log', 'child-result.json', 'receipt.json'];
        const before = Object.fromEntries(retained.map((name) => [name, readFileSync(join(failedAttempt, name))]));

        writeFileSync(entry, failedSource.replace('{ok:false}', '{ok:true}').replace('failed-out', 'corrected-out').replace('failed-err', 'corrected-err').replace('process.exit(7);', 'process.exit(0);'), 'utf8');
        const corrected = runCli(baseArgs(correctedAttempt, entry));
        expect(corrected.status).toBe(0);
        expect(JSON.parse(readFileSync(join(correctedAttempt, 'child-result.json'), 'utf8'))).toEqual({ ok: true });
        for (const name of retained) expect(readFileSync(join(failedAttempt, name))).toEqual(before[name]);

        const start = JSON.parse(readFileSync(join(failedAttempt, 'start.json'), 'utf8'));
        expect(start.entry_script.raw_sha256).toBe(sha256(Buffer.from(failedSource)));
        expect(start.entry_script.normalized_text_sha256).toBe(sha256(failedSource.replace(/\r\n/g, '\n').replace(/\r/g, '\n')));
        expect(start.entry_script.raw_sha256).not.toBe(start.entry_script.normalized_text_sha256);
        expect(readFileSync(join(failedAttempt, 'entry-script.snapshot'), 'utf8')).toBe(failedSource);
    });

    it('refuses an occupied attempt directory before running the child', () => {
        const root = fixtureRoot('reuse');
        const entry = join(root, 'marker.cjs');
        const marker = join(root, 'child-runs.txt');
        const attempt = join(root, 'attempt');
        writeFileSync(entry, `const fs=require('node:fs'),path=require('node:path');const dir=process.argv.at(-1);fs.appendFileSync(${JSON.stringify(marker)},'x');fs.writeFileSync(path.join(dir,'child-result.json'),'{}\\n',{flag:'wx'});\n`);
        expect(runCli(baseArgs(attempt, entry)).status).toBe(0);
        const originalReceipt = readFileSync(join(attempt, 'receipt.json'));
        const reused = runCli(baseArgs(attempt, entry));
        expect(reused.status).toBe(3);
        expect(readFileSync(marker, 'utf8')).toBe('x');
        expect(readFileSync(join(attempt, 'receipt.json'))).toEqual(originalReceipt);
    });

    it('retains numerical status and detects entry-script mutation', () => {
        const root = fixtureRoot('mutation');
        const entry = join(root, 'mutating.cjs');
        const attempt = join(root, 'attempt');
        writeFileSync(entry, "const fs=require('node:fs'),path=require('node:path');const dir=process.argv.at(-1);fs.writeFileSync(path.join(dir,'child-result.json'),'{}\\n',{flag:'wx'});fs.appendFileSync(__filename,'// changed\\n');\n");
        const result = runCli(baseArgs(attempt, entry));
        expect(result.status).toBe(126);
        const receipt = JSON.parse(readFileSync(join(attempt, 'receipt.json'), 'utf8'));
        expect(receipt.child_exit).toBe(0);
        expect(receipt.wrapper_exit).toBe(126);
        expect(receipt.entry_script_post.matches_start_raw_sha256).toBe(false);
    });

    it('retains a terminal receipt with numerical status after timeout', () => {
        const root = fixtureRoot('timeout');
        const entry = join(root, 'slow.cjs');
        const attempt = join(root, 'attempt');
        writeFileSync(entry, "const fs=require('node:fs'),path=require('node:path');const dir=process.argv.at(-1);fs.writeFileSync(path.join(dir,'child-result.json'),'{}\\n',{flag:'wx'});setInterval(()=>{},1000);\n");
        const args = baseArgs(attempt, entry);
        args[args.indexOf('--timeout-ms') + 1] = '100';
        const result = runCli(args);
        expect(result.status).toBe(124);
        const receipt = JSON.parse(readFileSync(join(attempt, 'receipt.json'), 'utf8'));
        expect(receipt.timed_out).toBe(true);
        expect(receipt.child_exit).toBe(124);
        expect(receipt.wrapper_exit).toBe(124);
    });

    it('retains a terminal receipt with numerical status after spawn error', () => {
        const root = fixtureRoot('spawn');
        const entry = join(root, 'unused.cjs');
        const attempt = join(root, 'attempt');
        writeFileSync(entry, 'process.exit(0);\n');
        const result = runCli(baseArgs(attempt, entry, join(root, 'missing-executable.exe')));
        expect(result.status).toBe(125);
        const receipt = JSON.parse(readFileSync(join(attempt, 'receipt.json'), 'utf8'));
        expect(receipt.spawn_error).toBeTruthy();
        expect(receipt.child_exit).toBe(125);
        expect(receipt.wrapper_exit).toBe(125);
        expect(typeof receipt.artifact_contract.pass).toBe('boolean');
        expect(receipt.artifact_contract.pass).toBe(true);
    });
});
