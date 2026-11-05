// Synthetic child-process fixture for tools/test/run_scenario_read_wiring.ps1 -Mode SelfTest.
//
// It exists ONLY to prove Job Object containment (success, first-failure/no-next-case, and
// child+grandchild timeout termination with no late writes). It never imports the engine, reads no
// scenario data and writes only marker files under the directory it is given.
//
// usage: node scenario_read_wiring_process_fixture.mjs <mode> <markerDir> [arg]
//   success : write success.txt, exit 0
//   fail    : write fail.txt, exit 3
//   marker  : write <arg or marker.txt>, exit 0 (used as the "must not run" next case)
//   tree    : start a grandchild that writes grandchild-started.txt immediately and late.txt after
//             <arg or 6000> ms, write child-started.txt, then wait forever (the helper's deadline and
//             job termination must stop both processes before late.txt can be written)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [mode, markerDir, arg] = process.argv.slice(2);
if (typeof mode !== 'string' || typeof markerDir !== 'string') {
    console.error('usage: scenario_read_wiring_process_fixture.mjs <mode> <markerDir> [arg]');
    process.exit(64);
}
mkdirSync(markerDir, { recursive: true });

if (mode === 'success') {
    writeFileSync(join(markerDir, 'success.txt'), 'ok');
    process.exit(0);
} else if (mode === 'fail') {
    writeFileSync(join(markerDir, 'fail.txt'), 'failed on purpose');
    process.exit(3);
} else if (mode === 'marker') {
    writeFileSync(join(markerDir, arg ?? 'marker.txt'), 'ran');
    process.exit(0);
} else if (mode === 'tree') {
    const delayMs = Number(arg ?? 6000);
    const grandchildSource = [
        "const fs = require('fs');",
        "const path = require('path');",
        `const dir = ${JSON.stringify(markerDir)};`,
        "fs.writeFileSync(path.join(dir, 'grandchild-started.txt'), String(process.pid));",
        `setTimeout(() => { fs.writeFileSync(path.join(dir, 'late.txt'), 'late write'); }, ${delayMs});`,
        'setInterval(() => {}, 1000);',
    ].join('\n');
    const grandchild = spawn(process.execPath, ['-e', grandchildSource], { stdio: 'ignore', windowsHide: true });
    writeFileSync(join(markerDir, 'child-started.txt'), `${process.pid}:${grandchild.pid}`);
    setInterval(() => {}, 1000);
} else {
    console.error(`unknown mode: ${mode}`);
    process.exit(65);
}
