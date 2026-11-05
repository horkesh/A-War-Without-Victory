#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

function argument(argv, name) {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
}

function main() {
    const argv = process.argv.slice(2);
    const [stdoutFile, baselineDirectory, outputDirectory] = argv;
    const statefulReader = argument(argv, '--stateful-reader');
    if (!stdoutFile || !baselineDirectory || !outputDirectory || !statefulReader) {
        process.stderr.write('usage: commander_target_selection_postrun.cjs STDOUT BASELINE OUT --stateful-reader FILE\n');
        process.exit(3);
    }
    fs.mkdirSync(outputDirectory, { recursive: false });
    const statefulOutput = path.join(outputDirectory, 'stateful-reader');
    const commanderOutput = path.join(outputDirectory, 'commander-reader.json');
    const node = process.execPath;
    const common = { cwd: process.cwd(), encoding: 'utf8', windowsHide: true };
    const stateful = childProcess.spawnSync(node, [statefulReader, stdoutFile, baselineDirectory, statefulOutput], common);
    const commander = childProcess.spawnSync(node, [path.join(__dirname, 'commander_target_selection_reader.cjs'), stdoutFile, commanderOutput], common);
    const failures = [];
    if (stateful.status !== 0) failures.push(`stateful reader exit ${stateful.status}`);
    if (commander.status !== 0) failures.push(`commander reader exit ${commander.status}`);
    const result = {
        schema: 'awwv.commander-target-selection-postrun.v1',
        pass: failures.length === 0,
        inputs: { stdout: stdoutFile, baseline: baselineDirectory, stateful_reader: statefulReader },
        readers: {
            stateful: { exit: stateful.status, stdout: stateful.stdout, stderr: stateful.stderr },
            commander: { exit: commander.status, stdout: commander.stdout, stderr: commander.stderr },
        },
        failures,
    };
    fs.writeFileSync(path.join(outputDirectory, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ pass: result.pass, stateful: stateful.status, commander: commander.status, failures })}\n`);
    process.exit(result.pass ? 0 : 2);
}

if (require.main === module) main();
module.exports = { main };
