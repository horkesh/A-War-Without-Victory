#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const { pathToFileURL } = require('node:url');

const CONFIG_SHA256 = 'cc1b7d9da81655be7c2ed053ab796cb4865135fda5e5e0ce093e0668aadf8bbd';
const ENTRY_SHA256 = 'f7036cfb6a48e789b63843e93a03e7b37507b04994985d5dbcea1e4e8d07b872';
const HEAD = '33f99fc5aac9a620a7bb0000cf233d86f270ce24';
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const strictCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const row = (file) => { const bytes = fs.readFileSync(file); return { bytes: bytes.length, sha256: sha256(bytes) }; };
function assertRow(file, expected, label) {
    const actual = row(file);
    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) throw new Error(`${label} freeze mismatch`);
}
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
const entry = path.join(packet, 'request_op_fork_t25.cjs');
if (sha256(fs.readFileSync(configPath)) !== CONFIG_SHA256) throw new Error('reviewed CONFIG hash mismatch');
if (sha256(fs.readFileSync(entry)) !== ENTRY_SHA256) throw new Error('reviewed entry hash mismatch');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const root = path.resolve(config.root);
const attempt = path.resolve(root, config.run.attempt);
const loader = path.resolve(root, 'node_modules/tsx/dist/loader.mjs');
if (process.cwd().toLowerCase() !== root.toLowerCase()) throw new Error('literal authorized C worktree required');
if (process.version !== config.node.version || path.normalize(process.execPath).toLowerCase() !== path.normalize(config.node.path).toLowerCase()) throw new Error('frozen Node runtime required');
assertRow(process.execPath, config.node, 'Node runtime');
if (path.normalize(config.loader.path).toLowerCase() !== path.normalize(loader).toLowerCase()) throw new Error('loader must be literal authorized-root loader');
assertRow(loader, config.loader, 'tsx loader');
if (cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() !== HEAD || config.head !== HEAD) throw new Error('HEAD mismatch');
const sourceStatus = cp.execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'src', 'data'], { cwd: root, encoding: 'utf8' }).trimEnd();
if (sourceStatus !== config.expectedSourceStatus) throw new Error(`src/data freeze mismatch:${sourceStatus}`);
for (const binding of config.bindings) assertRow(path.resolve(root, binding.path), binding, binding.path);
for (const item of [config.input.turn25, config.input.turn26, config.input.retainedNativeTurn39, config.score.reference, config.score.n91, config.score.n92]) assertRow(path.resolve(root, item.path), item, item.path);
for (const expected of config.runtimePackages) {
    const actual = packageAggregate(path.resolve(root, expected.path));
    if (actual.files !== expected.files || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) throw new Error(`runtime package freeze mismatch:${expected.name}`);
}
const entryText = fs.readFileSync(entry, 'utf8');
for (const forbidden of ['requestforce_launch', 'planDirectiveOperation(', 'dist/desktop/desktop_sim.cjs']) {
    if (entryText.includes(forbidden)) throw new Error(`forbidden diagnostic path:${forbidden}`);
}
if (fs.existsSync(attempt)) throw new Error(`attempt already exists; retain it and stop:${attempt}`);
if (!fs.statSync(path.dirname(attempt), { throwIfNoEntry: false })?.isDirectory()) throw new Error('attempt parent missing');

const artifacts = [
    'RUNTIME_PROVENANCE.json',
    'fidelity-start-turn-025.json',
    'fidelity-produced-turn-026.json',
    'fidelity-report-turn-026.json',
    'FIDELITY.json',
    'fork-start-turn-025.json',
    'BRANCH_ISOLATION.json',
    'staged-state-turn-025.json',
    'QUERY_AND_STAGE.json',
    'RESULT.json',
];
for (let beforeTurn = 25; beforeTurn <= 38; beforeTurn += 1) artifacts.push(`action-turn-${String(beforeTurn).padStart(3, '0')}.json`);
for (let turn = 26; turn <= 39; turn += 1) {
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
argv.push('--', config.node.path, '--import', pathToFileURL(loader).href, path.relative(root, entry).replaceAll('\\', '/'), path.relative(root, configPath).replaceAll('\\', '/'), '{evidenceDir}', config.run.mode);
const result = cp.spawnSync(process.execPath, argv, { cwd: root, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
