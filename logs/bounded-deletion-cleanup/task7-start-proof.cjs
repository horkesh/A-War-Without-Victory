'use strict';
// Read-only observation of the actual npm start process; no substitute launcher or sim.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const suffix = process.argv[2] || 'evidence';
assert(/^[a-z0-9-]+$/.test(suffix));
const output = path.join(__dirname, `task7-start-${suffix}`);
assert(!fs.existsSync(output), 'Preserve earlier evidence; use a new suffix');
fs.mkdirSync(output, { recursive: true });
const receipt = { checks: [], diagnostics: [] };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
let browser, socket;
async function endpoint(url, timeout = 150000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const response = await fetch(url); if (response.ok) return await response.json(); } catch {}
    await delay(300);
  }
  throw new Error(`Debugger endpoint unavailable: ${url}`);
}
async function mainEvaluate(expression) {
  const targets = await endpoint('http://127.0.0.1:9338/json/list', 10000);
  const target = targets.find(item => item.webSocketDebuggerUrl);
  assert(target, 'Real Electron main debugger required');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Main-process observation timeout')), 10000);
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      clearTimeout(timeout);
      socket.close(); socket = null;
      if (message.error || message.result?.exceptionDetails) reject(new Error(JSON.stringify(message)));
      else resolve(message.result.result.value);
    };
    socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
  });
}
async function findButton(name, timeout = 45000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const context of browser.contexts()) for (const page of context.pages()) for (const frame of page.frames()) {
      const button = frame.getByRole('button', { name, exact: true });
      for (const item of await button.all()) if (await item.isVisible().catch(() => false)) return item;
    }
    await delay(150);
  }
  throw new Error(`Visible button absent: ${name}`);
}
(async () => {
  await endpoint('http://127.0.0.1:9337/json/version');
  browser = await chromium.connectOverCDP('http://127.0.0.1:9337');
  for (const context of browser.contexts()) for (const page of context.pages()) {
    page.on('pageerror', error => receipt.diagnostics.push(String(error)));
  }
  const host = browser.contexts().flatMap(context => context.pages()).find(page => page.url().startsWith('awwv://warroom/'));
  assert(host, 'npm start must reach real Warroom desktop host');
  receipt.hostUrl = host.url();
  receipt.checks.push('npm start reaches desktop Warroom host');
  await (await findButton('Assume responsibility')).click();
  await (await findButton('Field Records')).click();
  await (await findButton('Resume task7-start-fixture')).click();
  let gameFrame;
  const deadline = Date.now() + 60000;
  while (!gameFrame && Date.now() < deadline) {
    for (const frame of host.frames()) {
      if (await frame.locator('[data-testid="toolbar-route-desk"]').isVisible().catch(() => false)) { gameFrame = frame; break; }
    }
    if (!gameFrame) await delay(150);
  }
  assert(gameFrame, 'Copied save must load into real desktop shell');
  receipt.frameUrl = gameFrame.url();
  receipt.checks.push('Actual UI loads isolated copied save');
  await host.screenshot({ path: path.join(output, 'desktop-loaded.png') });
  fs.writeFileSync(path.join(output, 'desktop-body.txt'), await gameFrame.locator('body').innerText());
  receipt.main = await mainEvaluate(`(() => {
    const req = process.mainModule.require.bind(process.mainModule);
    const entries = Object.entries(req('node:module')._cache).filter(([key]) => /[\\\\/]dist[\\\\/]desktop[\\\\/]desktop_sim\\.cjs$/.test(key));
    return { argv: process.argv, appPath: req('electron').app.getAppPath(), userData: req('electron').app.getPath('userData'),
      simModules: entries.map(([filename, module]) => ({ filename, loaded: module.loaded, exports: Object.keys(module.exports).sort() })) };
  })()`);
  assert.equal(receipt.main.simModules.length, 1, 'Exactly one canonical desktop sim bundle must be loaded');
  assert.equal(receipt.main.simModules[0].loaded, true);
  assert.equal(path.resolve(receipt.main.simModules[0].filename), path.join(root, 'dist/desktop/desktop_sim.cjs'));
  assert(receipt.main.simModules[0].exports.includes('advanceTurn'), 'Loaded canonical bundle exports advanceTurn');
  assert.equal(path.resolve(receipt.main.userData), path.join(root, 'dist-packaged/task7-validation-profile'));
  receipt.simSha256 = hash(receipt.main.simModules[0].filename);
  receipt.checks.push('Actual Electron process loads canonical desktop_sim.cjs exporting advanceTurn');
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'task7-user-saves-before.json'), 'utf8').replace(/^\uFEFF/, ''));
  for (const save of before) assert.equal(hash(save.Path).toUpperCase(), save.Hash);
  receipt.checks.push('All repository save bytes unchanged');
  assert.deepEqual(receipt.diagnostics, []);
  receipt.status = 'PASS';
})().catch(error => { receipt.status = 'FAIL'; receipt.error = String(error.stack || error); process.exitCode = 1; })
.finally(async () => {
  if (socket) socket.close();
  // Close the app through its real main-process lifecycle, even after an assertion failure.
  if (browser) {
    try { await mainEvaluate("(setTimeout(() => process.mainModule.require('electron').app.quit(), 100), true)"); receipt.closeRequested = true; }
    catch (error) { receipt.closeError = String(error); process.exitCode = 1; }
    await browser.close().catch(() => {});
  }
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
});
