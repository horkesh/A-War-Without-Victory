#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const ROOT = 'C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory';
const NODE = 'C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe';
const TEST = 'tests/combat_fatigue_owner.test.ts';
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const normalized = (value) => path.normalize(path.resolve(value)).toLowerCase();
function assert(value, message) { if (!value) throw new Error(message); }

async function main() {
    const evidenceDir = process.argv[2];
    assert(evidenceDir && fs.statSync(evidenceDir, { throwIfNoEntry: false })?.isDirectory(), 'wrapper evidence directory required');
    assert(normalized(process.cwd()) === normalized(ROOT), 'literal authorized C worktree required');
    assert(process.version === 'v22.23.2' && normalized(process.execPath) === normalized(NODE), 'frozen Node runtime required');
    assert(sha256(NODE) === '0d0f5e39f9f3d9587bc19f73eab3c2c9c4903fd02d6dbf9c853dd81b3d95fad4', 'Node hash mismatch');
    assert(cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() === '33f99fc5aac9a620a7bb0000cf233d86f270ce24', 'HEAD mismatch');
    assert(cp.execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'src', 'data'], { cwd: ROOT, encoding: 'utf8' }).trimEnd() === ' M src/sim/turn_phases/war_phases.ts', 'src/data freeze mismatch');
    const frozen = [
        [TEST, '3042d0b140ecae6270be076eed402fa03282933d8d1e3f73f8b3558a1c1ff07f'],
        ['tools/test/discover_test_files.mjs', 'c8259a1e4fadbe3ef97eaa9e97c64992d57b62a19d67193eab54cedff967f9bb'],
        ['src/sim/combat/attack_resolution_osid.ts', '5b0d61371b7d0d828ed2b06ffd5d11354629ded288632f26cbfe9d22c1ce2f16'],
        ['src/sim/combat/attack_resource_aftermath.ts', '55cfee4c0184cef025734afdf5a0b764152f4cabcd41f4473b5e084a3938bd56'],
        ['node_modules/vitest/vitest.mjs', '39db22f579acf5639bbb17a261408debbde03f4692c0c439e77e7f13aeba74d6'],
        ['node_modules/tsx/dist/loader.mjs', '0b1c5b86192772fe9257710e739959cee5947c11ae1f93b61abfaa9b80c6def1'],
    ];
    for (const [relative, expected] of frozen) assert(sha256(path.resolve(ROOT, relative)) === expected, `freeze mismatch:${relative}`);
    const discovery = await import(path.resolve(ROOT, 'tools/test/discover_test_files.mjs'));
    const discovered = discovery.toRepoRelative(ROOT, discovery.discoverTests(ROOT).vitestFiles);
    assert(discovered.includes(TEST), 'maintained RED test is not in actual Vitest discovery');
    const result = cp.spawnSync(NODE, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=verbose'], {
        cwd: ROOT,
        stdio: 'inherit',
        windowsHide: true,
    });
    if (result.error) throw result.error;
    process.exit(result.status ?? 1);
}

void main().catch((error) => {
    process.stderr.write(`${String(error?.stack ?? error)}\n`);
    process.exit(2);
});
