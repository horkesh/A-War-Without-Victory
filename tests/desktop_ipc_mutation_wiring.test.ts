import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test } from 'vitest';

// R4 Phase 6 Task 6.5 — wiring completeness (source assertion).
//
// electron-main.cjs cannot be imported under vitest (it `require('electron')` and
// process.exit(1)s under node), so the `ipcMain.handle` glue is asserted at the source
// level. The behavioral correctness (serialize-by-default, CA-conservation, no lost
// update, no wedge) is proven headlessly in desktop_ipc_mutation_policy.test.ts and
// desktop_ipc_mutex.test.ts against the real delegates; these checks prove that mechanism
// is actually INSTALLED, once, before any handler registers — the one seam tests can't run.
describe('IPC mutation-serialization wiring (Task 6.5)', () => {
  test('the single-point interception is defined and policy-driven', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');

    assert.match(
      source,
      /require\('\.\/ipc_mutex\.cjs'\)/,
      'electron main must import the serial mutex',
    );
    assert.match(
      source,
      /require\('\.\/ipc_mutation_policy\.cjs'\)/,
      'electron main must import the mutation policy',
    );
    assert.match(
      source,
      /function installIpcMutationSerialization\(\)/,
      'the single-point interception installer must exist',
    );
    // The interception wraps ipcMain.handle through the policy + shared mutex.
    assert.match(
      source,
      /ipcMain\.handle\s*=\s*\(channel, handler\)\s*=>\s*\n?\s*rawHandle\(channel, wrapHandlerWithMutationPolicy\(channel, handler, ipcStateMutex\)\)/,
      'the installer must wrap ipcMain.handle with the mutation policy + shared mutex',
    );
  });

  test('the interception is installed BEFORE any handler registers', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'), 'utf8');

    const installCall = source.indexOf('installIpcMutationSerialization();');
    const probeSafeCall = source.indexOf('registerProbeSafeIpcHandlers();');
    // The first direct handler registered in the whenReady body.
    const firstDirectHandle = source.indexOf("ipcMain.handle('load-scenario-dialog'");

    assert.ok(installCall > 0, 'installIpcMutationSerialization() must be called');
    assert.ok(probeSafeCall > 0, 'registerProbeSafeIpcHandlers() must be called');
    assert.ok(
      installCall < probeSafeCall,
      'install must run before the probe-safe (registerIpcHandler) registrations',
    );
    assert.ok(
      installCall < firstDirectHandle,
      'install must run before the direct ipcMain.handle registrations',
    );
  });
});
