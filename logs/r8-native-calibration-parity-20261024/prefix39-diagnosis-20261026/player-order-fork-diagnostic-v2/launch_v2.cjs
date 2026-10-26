#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { pathToFileURL } = require('node:url');

const CONFIG_SHA256 = '1e12eb521fba3668ea00a0e5c2cef4fbf7f4f9884f82692a0c7cb702d5262937';
const ENTRY_SHA256 = '40c0ea17eb65277e2ac706c7425aed099ac4e3a66805bb42fcd7f80a9db2571a';
const HEAD = '33f99fc5aac9a620a7bb0000cf233d86f270ce24';
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const strictCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const row = (file) => {
    const bytes = fs.readFileSync(file);
    return { bytes: bytes.length, sha256: sha256(bytes) };
};
const assertRow = (file, expected, label) => {
    const actual = row(file);
    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) throw new Error(`${label} freeze mismatch`);
};
function packageAggregate(root) {
    const rows = [];
    const collect = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => strictCompare(a.name, b.name))) {
            const file = path.join(current, entry.name);
            if (entry.isDirectory()) collect(file);
            else if (entry.isFile()) {
                const bytes = fs.readFileSync(file);
                rows.push({ path: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
            } else throw new Error(`unsupported runtime entry:${file}`);
        }
    };
    collect(root);
    const payload = rows.map((item) => `${item.path}\0${item.bytes}\0${item.sha256}\n`).join('');
    return { files: rows.length, bytes: rows.reduce((sum, item) => sum + item.bytes, 0), sha256: sha256(Buffer.from(payload)) };
}

const packet = __dirname;
const configPath = path.join(packet, 'CONFIG.json');
const entry = path.join(packet, 'diagnostic_entry_v2.cjs');
if (sha256(fs.readFileSync(configPath)) !== CONFIG_SHA256) throw new Error('reviewed CONFIG hash mismatch');
if (sha256(fs.readFileSync(entry)) !== ENTRY_SHA256) throw new Error('reviewed entry hash mismatch');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const root = path.resolve(config.root);
const attempt = path.resolve(root, config.run.attempt);
if (process.cwd().toLowerCase() !== root.toLowerCase()) throw new Error('literal authorized C worktree required');
if (process.version !== config.node.version || path.normalize(process.execPath).toLowerCase() !== path.normalize(config.node.path).toLowerCase()) throw new Error('frozen Node runtime required');
assertRow(process.execPath, config.node, 'Node runtime');
if (cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() !== HEAD || config.head !== HEAD) throw new Error('HEAD mismatch');
const sourceStatus = cp.execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'src', 'data'], { cwd: root, encoding: 'utf8' }).trim();
if (sourceStatus !== '') throw new Error(`src/data freeze mismatch:${sourceStatus}`);
for (const binding of config.bindings) assertRow(path.resolve(root, binding.path), binding, binding.path);
for (const item of [config.input.turn16, config.input.turn17, config.input.retainedNativeTurn39, config.score.reference, config.score.n91, config.score.n92, config.score.rejectedV1WrongCohort, config.baseV1.config, config.baseV1.helpers]) {
    assertRow(path.resolve(root, item.path), item, item.path);
}
assertRow(path.resolve(config.loader.path), config.loader, 'tsx loader');
for (const expected of config.runtimePackages) {
    const actual = packageAggregate(path.resolve(root, expected.path));
    if (actual.files !== expected.files || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) throw new Error(`runtime package freeze mismatch:${expected.name}`);
}
if (fs.existsSync(attempt)) throw new Error(`attempt already exists; retain it and stop:${attempt}`);
if (!fs.statSync(path.dirname(attempt), { throwIfNoEntry: false })?.isDirectory()) throw new Error('attempt parent missing');

if (!fs.statSync(path.resolve(root, config.run.fidelityAttempt, 'receipt.json'), { throwIfNoEntry: false })?.isFile()) throw new Error('successful preserved fidelity-only attempt required before fork launch');
const artifacts = ['RUNTIME_PROVENANCE.json', 'QUERY_AND_STAGE.json', 'RESULT.json'];
for (let turn = 17; turn <= 39; turn += 1) {
    const tag = String(turn).padStart(3, '0');
    artifacts.push(`state-turn-${tag}.json`, `report-turn-${tag}.json`, `receipt-turn-${tag}.json`);
}
const argv = [
    path.join(root, 'tools/diagnostics/run_preserved_preflight.cjs'),
    '--attempt-dir', config.run.attempt,
    '--entry-script', path.relative(root, entry).replaceAll('\\', '/'),
    '--timeout-ms', String(config.run.wrapperCapMs),
];
for (const artifact of artifacts) argv.push('--allow-artifact', artifact);
argv.push('--', config.node.path, '--import', pathToFileURL(config.loader.path).href, path.relative(root, entry).replaceAll('\\', '/'), path.relative(root, configPath).replaceAll('\\', '/'), '{evidenceDir}', 'fork-after-fidelity');
const result = cp.spawnSync(process.execPath, argv, { cwd: root, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
