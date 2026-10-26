#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const ROOT = 'C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory';
const NODE = 'C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe';
const TEST = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-owner-diagnosis-20261026-v1/combat_fatigue_owner.red.test.ts';
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const normalized = (value) => path.normalize(path.resolve(value)).toLowerCase();
function assert(value, message) { if (!value) throw new Error(message); }

const evidenceDir = process.argv[2];
const mode = process.argv[3];
assert(evidenceDir && fs.statSync(evidenceDir, { throwIfNoEntry: false })?.isDirectory(), 'wrapper evidence directory required');
assert(mode === 'precheck-only' || mode === 'red', 'explicit mode required');
assert(normalized(process.cwd()) === normalized(ROOT), 'literal authorized C worktree required');
assert(process.version === 'v22.23.2' && normalized(process.execPath) === normalized(NODE), 'frozen Node runtime required');
assert(sha256(NODE) === '0d0f5e39f9f3d9587bc19f73eab3c2c9c4903fd02d6dbf9c853dd81b3d95fad4', 'Node hash mismatch');
assert(cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim() === '33f99fc5aac9a620a7bb0000cf233d86f270ce24', 'HEAD mismatch');
assert(cp.execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'src', 'data'], { cwd: ROOT, encoding: 'utf8' }).trimEnd() === ' M src/sim/turn_phases/war_phases.ts', 'src/data freeze mismatch');
const frozen = [
    [TEST, '5078ba027029675d714bb69ddfb79c8bc3cba828d29cf12e9a29c0abed586d3e'],
    ['src/sim/combat/attack_resolution_osid.ts', '5b0d61371b7d0d828ed2b06ffd5d11354629ded288632f26cbfe9d22c1ce2f16'],
    ['src/sim/combat/attack_resource_aftermath.ts', '55cfee4c0184cef025734afdf5a0b764152f4cabcd41f4473b5e084a3938bd56'],
    ['docs/10_canon/Systems_Manual_v0_9_0.md', '727fa778f0030b02d2a15de2dbc3049282dbc3d3ee2fbb00e4f7b51dd2aace18'],
    ['docs/10_canon/context.md', 'c19e26eb0f1f91812f250437559f24bbbfdcc9865aa0b37afd835464f0afee9f'],
    ['node_modules/vitest/vitest.mjs', '39db22f579acf5639bbb17a261408debbde03f4692c0c439e77e7f13aeba74d6'],
];
for (const [relative, expected] of frozen) assert(sha256(path.resolve(ROOT, relative)) === expected, `freeze mismatch:${relative}`);
if (mode === 'precheck-only') {
    const esbuild = require(path.resolve(ROOT, 'node_modules/esbuild'));
    esbuild.transformSync(fs.readFileSync(path.resolve(ROOT, TEST), 'utf8'), { loader: 'ts', format: 'esm' });
    process.stdout.write(`${JSON.stringify({ pass: true, mode, cwd: normalized(process.cwd()), root: normalized(ROOT), fixtureReadable: true, syntax: true })}\n`);
    process.exit(0);
}
const result = cp.spawnSync(NODE, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=verbose'], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
