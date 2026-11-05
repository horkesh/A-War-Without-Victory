#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const packet = __dirname;
const configPath = path.join(packet, 'CONFIG.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const root = path.resolve(config.root);
const wrapper = path.join(root, 'tools', 'diagnostics', 'run_preserved_preflight.cjs');
const entry = path.join(packet, 'diagnostic_entry.cjs');
const attempt = path.resolve(root, config.run.attempt);

if (process.cwd().toLowerCase() !== root.toLowerCase()) throw new Error('literal authorized C worktree required');
if (fs.existsSync(attempt)) throw new Error(`attempt already exists; no retry or deletion: ${attempt}`);

const artifacts = [
    'baseline-report-turn-017.json',
    'baseline-produced-turn-017.json',
    'BASELINE_FIDELITY.json',
    'QUERY_AND_STAGE.json',
    'RESULT.json',
];
for (let turn = 17; turn <= 39; turn += 1) {
    const tag = String(turn).padStart(3, '0');
    artifacts.push(`state-turn-${tag}.json`, `report-turn-${tag}.json`, `receipt-turn-${tag}.json`);
}

const argv = [
    wrapper,
    '--attempt-dir', config.run.attempt,
    '--entry-script', path.relative(root, entry).replaceAll('\\', '/'),
    '--timeout-ms', String(config.run.wrapperCapMs),
];
for (const artifact of artifacts) argv.push('--allow-artifact', artifact);
argv.push('--', config.node.path, path.relative(root, entry).replaceAll('\\', '/'), path.relative(root, configPath).replaceAll('\\', '/'), '{evidenceDir}');

const child = cp.spawnSync(config.node.path, argv, { cwd: root, stdio: 'inherit', windowsHide: true });
if (child.error) throw child.error;
process.exit(child.status ?? 1);
