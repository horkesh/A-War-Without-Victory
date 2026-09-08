'use strict';
// Validation-only continuation of Task 3's isolated packaged smoke. No production bridge replacement.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { _electron: electron } = require('playwright');
const root = path.resolve(__dirname, '../..');
const mode = process.argv[2];
assert(['operations', 'recovery'].includes(mode));
const suffix = process.argv[3] || '1';
assert(/^[a-z0-9-]+$/.test(suffix));
const output = path.join(__dirname, `task6-${mode}-${suffix}`);
const profile = path.join(root, 'dist-packaged', 'task6-validation-evidence', `${mode}-${suffix}`);
const exe = path.join(root, 'dist-packaged/win-unpacked/A War Without Victory.exe');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
for (const directory of [output, profile]) {
  assert(!fs.existsSync(directory), `Fresh directory required: ${directory}`);
  fs.mkdirSync(directory, { recursive: true });
}
const fixtureFile = path.join(root, 'logs/bc06/fixture-rs-1.json');
const raw = fs.readFileSync(fixtureFile);
const state = JSON.parse(raw);
const reviewId = 'TASK6_ROUTE_REVIEW';
state.meta.pending_proposal_reviews = [{
  id: reviewId, turn: state.meta.turn, faction: 'RS', domain: 'ops',
  description: 'Operation Cerska-Kamenica',
  proposed_action: 'HISTORICAL_OP:triggered:vrs_drina:Operation Cerska-Kamenica',
  current_value: 'pending_review', proposed_value: 'approve',
}];
const fixture = JSON.stringify(state);
const saves = path.join(profile, 'saves');
fs.mkdirSync(saves);
fs.writeFileSync(path.join(saves, 'task6-route-fixture.json'), fixture);
fs.writeFileSync(path.join(output, 'fixture.json'), fixture);
const receipt = {
  mode, exe, profile, fixtureSource: fixtureFile, fixtureSourceHash: hash(raw),
  fixtureHash: hash(fixture), exeHash: hash(fs.readFileSync(exe)),
  appAsarHash: hash(fs.readFileSync(path.join(path.dirname(exe), 'resources/app.asar'))),
  limits: ['Isolated synthetic pending historical proposal; validates routes, not campaign timing or outcomes.'],
  checks: [], diagnostics: [],
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let app;
const pages = () => app.windows().filter(page => !page.url().startsWith('devtools:'));
async function find(selector, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    for (const page of pages()) for (const frame of page.frames()) {
      const locator = typeof selector === 'string' ? frame.locator(selector) : frame.getByRole('button', selector);
      for (const item of await locator.all()) if (await item.isVisible().catch(() => false)) return { page, frame, locator: item };
    }
    await pause(150);
  }
  throw new Error(`Visible target absent: ${JSON.stringify(selector)}`);
}
async function click(selector) {
  const found = await find(selector);
  assert(await found.locator.isEnabled());
  await found.locator.click();
  return found;
}
async function snapshot(id) {
  const frames = [];
  for (const [i, page] of pages().entries()) {
    await page.screenshot({ path: path.join(output, `${id}-${i}.png`) });
    for (const frame of page.frames()) frames.push({ url: frame.url(), body: await frame.locator('body').innerText().catch(() => '') });
  }
  fs.writeFileSync(path.join(output, `${id}.json`), JSON.stringify(frames, null, 2));
}
(async () => {
  app = await electron.launch({ executablePath: exe, args: [`--user-data-dir=${profile}`], cwd: root, timeout: 90000 });
  const observe = page => {
    page.on('pageerror', error => receipt.diagnostics.push({ kind: 'pageerror', message: String(error) }));
    page.on('console', message => { if (message.type() === 'error') receipt.diagnostics.push({ kind: 'console', message: message.text() }); });
    page.on('requestfailed', request => receipt.diagnostics.push({ kind: 'requestfailed', url: request.url(), message: request.failure()?.errorText }));
  };
  pages().forEach(observe);
  app.on('window', observe);
  app.process().stdout?.on('data', chunk => fs.appendFileSync(path.join(output, 'main.stdout.log'), chunk));
  app.process().stderr?.on('data', chunk => fs.appendFileSync(path.join(output, 'main.stderr.log'), chunk));
  if (mode === 'operations') {
    await click({ name: 'Assume responsibility', exact: true });
    await click({ name: 'Field Records', exact: true });
    await click({ name: 'Resume task6-route-fixture', exact: true });
    await find('[data-testid="toolbar-route-desk"]', 60000);
    // Use the existing player-facing command surface and dossier entrypoints.
    await click('[data-testid="toolbar-route-desk"]');
    await click('[data-testid="warroom-toolbar-command-surface"]');
    await click('[data-testid="command-card-cat_war_direction"]');
    const card = await find(`[data-testid="decision-room-priority-card-command:review-proposal:${reviewId}"]`);
    await card.locator.getByRole('button', { name: 'Dossier', exact: true }).click();
    const dossierSelector = `[data-testid="decision-room-active-dossier"][data-card-id="command:review-proposal:${reviewId}"]`;
    const dossier = await find(dossierSelector);
    assert((await dossier.locator.innerText()).includes('Cerska-Kamenica'));
    await snapshot('01-proposal-dossier');
    receipt.checks.push('Visible operation proposal opens exact dossier');
    await click('[data-testid="decision-room-dossier-show-on-map"]');
    const field = await find('[data-testid="field-operation-plan-context"]');
    const objectives = await field.locator.locator('[data-testid="field-operation-objective"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-osid')));
    assert.deepEqual(objectives, ['op:srebrenica:osmace_2', 'op:srebrenica:radovcici', 'op:srebrenica:sulice_2', 'op:vlasenica:cerska_2']);
    await field.frame.waitForFunction(() => {
      const map = document.querySelector('[data-testid="tactical-map"]');
      return map?.getAttribute('data-map-ready') === 'true' && map.getAttribute('data-field-operation-focus-status') === 'applied'
        && map.getAttribute('data-field-operation-all-focus-in-viewport') === 'true';
    }, undefined, { timeout: 45000 });
    receipt.objectives = objectives;
    await snapshot('02-field-inspection');
    await field.locator.locator('[data-testid="field-operation-objective"]').first().click();
    await field.frame.waitForFunction(osid => document.querySelector('[data-testid="tactical-map"]')?.getAttribute('data-field-operation-selected-osid') === osid, objectives[0]);
    receipt.checks.push('Exact four objectives visible on live map; objective selection works');
    await click('[data-testid="field-operation-return-to-dossier"]');
    await find(dossierSelector);
    await snapshot('03-returned-dossier');
    receipt.checks.push('Visible return restores exact proposal dossier');
    assert.equal(hash(fs.readFileSync(path.join(saves, 'task6-route-fixture.json'))), receipt.fixtureHash);
  } else {
    // Induce a real failed embedded-document load without replacing application handlers.
    await find({ name: 'Assume responsibility', exact: true }, 60000);
    const host = pages().find(page => page.url().startsWith('awwv://warroom/'));
    assert(host, 'Packaged Warroom host required');
    const iframeUrl = await host.locator('#tactical-map-iframe').getAttribute('src');
    assert(iframeUrl && /^http:\/\/127\.0\.0\.1:/.test(iframeUrl));
    receipt.blockedDocument = iframeUrl;
    await app.evaluate(({ session }, url) => {
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://127.0.0.1/*'] }, (details, callback) => {
        callback({ cancel: details.url === url });
      });
    }, iframeUrl);
    await host.reload();
    await find('#mm-new-campaign', 20000);
    await host.waitForSelector('.war-planning-map-overlay canvas', { state: 'attached', timeout: 30000 });
    const menu = await host.locator('#main-menu').evaluate(node => ({ inert: node.inert, ariaHidden: node.getAttribute('aria-hidden') }));
    assert.deepEqual(menu, { inert: false, ariaHidden: 'false' });
    await snapshot('01-recovery-menu');
    await click('#mm-new-campaign');
    await find('#sp-back');
    await snapshot('02-recovery-side-picker');
    await click('#sp-back');
    await find('#mm-new-campaign');
    receipt.checks.push('Failed React document activates usable legacy recovery menu, lazy WarPlanningMap and side-picker/back');
    await app.evaluate(({ session }) => session.defaultSession.webRequest.onBeforeRequest(null));
    await host.locator('#tactical-map-iframe').evaluate(node => { node.src = node.src; });
    await find({ name: 'Assume responsibility', exact: true }, 60000);
    await host.waitForFunction(() => document.querySelector('#main-menu')?.inert === true);
    await snapshot('03-react-reclaimed');
    receipt.checks.push('Late successful React load reclaims opening ownership and disables legacy recovery');
  }
  receipt.expectedDiagnostics = receipt.diagnostics.filter(item => mode === 'recovery' && item.url === receipt.blockedDocument && item.kind === 'requestfailed');
  const unexpected = receipt.diagnostics.filter(item => !receipt.expectedDiagnostics.includes(item));
  assert.deepEqual(unexpected, [], `Unexpected runtime diagnostics: ${JSON.stringify(unexpected)}`);
  receipt.status = 'PASS';
})().catch(async error => {
  receipt.status = 'FAIL'; receipt.error = String(error.stack || error);
  if (app) await snapshot('failure').catch(() => {});
  process.exitCode = 1;
}).finally(async () => {
  if (app) await app.close();
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, error: receipt.error, output }, null, 2));
});
