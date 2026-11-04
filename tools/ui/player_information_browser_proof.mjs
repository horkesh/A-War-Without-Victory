// Bounded presentation proof against the real development app; never advances a turn.
// Usage: node tools/ui/player_information_browser_proof.mjs [--url origin] [--out directory]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const origin = option('--url', 'http://127.0.0.1:3297');
const out = option('--out', 'logs/player-information-polish-20261104/browser');
const onlyWidth = Number(option('--width', '0'));
const requestedSurfaces = option('--surfaces', 'formation,settlement,hq,aftermath').split(',');
const surfaces = new Set(requestedSurfaces);
assert(requestedSurfaces.length > 0 && requestedSurfaces.every(surface => ['formation', 'settlement', 'hq', 'aftermath'].includes(surface)), 'Unknown or empty surface selection');
const viewports = [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }].filter(viewport => !onlyWidth || viewport.width === onlyWidth);
assert(viewports.length > 0, 'Supported widths: 1366 or 1920');
const savePath = 'docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/final-autosave.json';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const initialHash = hash(savePath);
const fixture = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const result = { kind: 'real-app-route-with-synthetic-player-owned-display-stress', origin, savePath, initialHash, requestedSurfaces, advances: 0, cases: [], failures: [] };
const sourcePaths = ['utils/formatters.ts', 'utils/reportedMetrics.ts', 'i18n/messages.en.ts', 'i18n/messages.bcs.ts', 'components/BrigadeRow.tsx', 'components/FormationDetail.tsx', 'components/SettlementDetailContent.tsx', 'components/TurnAftermathModal.tsx', 'components/army_hq/ArmyHQCorpsCard.tsx', 'components/army_hq/WarSummaryContent.tsx'].map(file => `src/ui/map/${file}`);
result.sourceHashes = Object.fromEntries(sourcePaths.map(file => [file, hash(file)]));
fs.mkdirSync(out, { recursive: true });

// Import the exact already-loaded Vite module identity, including its HMR timestamp.
async function storeAction(page, operation, payload) {
  return page.evaluate(async ({ operation, payload }) => {
    const moduleUrl = performance.getEntriesByType('resource').map(entry => entry.name).find(name => name.includes('/store/gameStore.ts'));
    if (!moduleUrl) throw new Error('Production game store module was not loaded');
    const { useGameStore } = await import(moduleUrl);
    const state = useGameStore.getState();
    if (operation === 'fixture') {
      const own = state.loadedGameState.formations.filter(f => f.faction === 'RS' && f.kind === 'brigade' && f.corps_id && f.location_osid);
      const first = own[0];
      const sameCorps = own.filter(f => f.corps_id === first.corps_id);
      if (sameCorps.length < 3) throw new Error('Fixture must contain three own brigades in one corps');
      const ids = sameCorps.slice(0, 3).map(f => f.id);
      const longName = 'Presentation proof — exceptionally long formation name with several descriptive words';
      const formations = state.loadedGameState.formations.map(f => f.id === ids[0]
        ? { ...f, name: longName, personnel: 1_234_567, fatigue: undefined, cohesion: undefined, entrenchment_turns: 1, disrupted_turns: 1 }
        : f.id === ids[1] ? { ...f, personnel: undefined }
          : f.id === ids[2] ? { ...f, personnel: 0 } : f);
      useGameStore.setState({ loadedGameState: { ...state.loadedGameState, formations } });
      return { ids, corpsId: first.corps_id, location: first.location_osid, longName, turn: state.loadedGameState.turn };
    }
    if (operation === 'corps') state.setSelectedCorpsId(payload);
    if (operation === 'settlement') state.setSelectedOsid(payload);
    if (operation === 'formation') state.setSelectedFormationId(payload);
    if (operation === 'aftermath') {
      state.setArmyHQOpen(false);
      // This is a pure producer, so it can be loaded explicitly when the HQ lazy route was skipped.
      const modelUrl = performance.getEntriesByType('resource').map(entry => entry.name).find(name => name.includes('/data/turnAftermath.ts')) ?? '/data/turnAftermath.ts';
      const { buildTurnAftermathView } = await import(modelUrl);
      const view = buildTurnAftermathView({ nextState: state.loadedGameState });
      if (!view) throw new Error('Fixture did not produce an aftermath view');
      view.combat.friendlyCasualties = 1_234_567;
      view.combat.opposingCasualties = 0;
      view.humanitarian.displacedThisTurn = undefined;
      state.setTurnAftermath(view);
      state.setTurnAftermathOpen(true);
    }
    if (operation === 'identity') {
      if (!state.lastLoadedStateFingerprint) throw new Error('Imported save identity is missing');
      const sha = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
      return { turn: state.loadedGameState.turn, importedSave: await sha(state.lastLoadedStateFingerprint), projection: await sha(JSON.stringify(state.loadedGameState)) };
    }
  }, { operation, payload });
}

async function geometry(locator) {
  await locator.waitFor({ state: 'visible', timeout: 15_000 });
  return locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, fontSize: getComputedStyle(element).fontSize };
  });
}
async function settle(locator) {
  await locator.evaluate(async element => {
    await document.fonts.ready;
    await Promise.all(element.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
}
function contained(box, width, label) {
  assert(box.width > 0 && box.height > 0 && parseFloat(box.fontSize) > 0, `${label}: zero-size content`);
  assert(box.left >= -1 && box.right <= width + 1, `${label}: outside viewport`);
  assert(box.scrollWidth <= box.clientWidth + 2, `${label}: horizontal overflow ${box.scrollWidth}/${box.clientWidth}`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(8_000);
    await page.addInitScript(() => performance.setResourceTimingBufferSize(4000));
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const record = { viewport, surfaces: [], pageErrors };
    result.cases.push(record);
    try {
      await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 45_000 });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => typeof window.handleManualSaveLoad === 'function');
      await page.evaluate(async state => window.handleManualSaveLoad(state), fixture);
      await page.getByRole('button', { name: /^continue/i }).click();
      await page.getByTestId('toolbar-route-war-map').waitFor({ state: 'visible' });
      const stress = await storeAction(page, 'fixture');
      const initialIdentity = await storeAction(page, 'identity');
      record.fixture = stress;

      if (surfaces.has('formation')) {
      await storeAction(page, 'corps', stress.corpsId);
      const corps = page.getByTestId('corps-detail-panel');
      await corps.waitFor({ state: 'visible' });
      await corps.getByRole('tab', { name: /order of battle/i }).click();
      const row = corps.locator(`button[data-formation-id="${stress.ids[0]}"]`);
      await row.scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');
      await row.focus();
      const descriptionId = await row.getAttribute('aria-describedby');
      assert(descriptionId, 'Brigade row has no accessible description');
      const description = page.locator(`[id="${descriptionId}"]`);
      const descBox = await geometry(description);
      assert(descBox.width > 10 && descBox.height > 5, 'Brigade explanation remains screen-reader-only during keyboard focus');
      const rowBox = await geometry(row);
      contained(rowBox, viewport.width, 'Brigade row');
      const nameBox = await geometry(row.getByTestId('brigade-row-name'));
      assert(nameBox.width >= rowBox.width * 0.7, 'Formation name is squeezed by metric siblings');
      assert(nameBox.height < 80, 'Formation name wraps into excessive short lines');
      assert((await row.innerText()).includes('1.2M'), 'Million-scale personnel not compact');
      assert((await row.innerText()).includes('No staff report'), 'Missing metrics not reported truthfully');
      const focus = await row.evaluate(e => ({ visible: e.matches(':focus-visible'), outlineWidth: getComputedStyle(e).outlineWidth }));
      assert(focus.visible && parseFloat(focus.outlineWidth) >= 2, 'Brigade row lacks visible keyboard focus');
      await page.screenshot({ path: path.join(out, `${viewport.width}-brigade-keyboard.png`) });
      await page.keyboard.press('Enter');
      const formation = page.getByTestId('formation-detail-panel');
      await formation.waitFor({ state: 'visible' });
      assert.equal(await formation.getAttribute('data-formation-id'), stress.ids[0], 'Keyboard selection opened a different formation');
      assert((await formation.innerText()).includes('1,234,567'), 'Formation exact personnel not grouped');
      const formationBox = await geometry(formation);
      contained(formationBox, viewport.width, 'Formation detail');
      const effectiveness = page.getByTestId('formation-detail-effectiveness');
      if (await effectiveness.count()) {
        await effectiveness.scrollIntoViewIfNeeded();
        await effectiveness.focus();
        assert(await effectiveness.getAttribute('aria-label'), 'Effectiveness has no accessible explanation');
      }
      await page.screenshot({ path: path.join(out, `${viewport.width}-formation.png`) });
      record.surfaces.push({ name: 'corps order of battle / keyboard formation selection', rowBox, nameBox, descBox, focus, formationBox });
      }
      if (surfaces.has('settlement')) {
      await storeAction(page, 'settlement', stress.location);
      const settlementRow = page.getByRole('button').filter({ hasText: stress.longName }).first();
      await settlementRow.scrollIntoViewIfNeeded();
      const settlementBox = await geometry(settlementRow);
      contained(settlementBox, viewport.width, 'Settlement formation row');
      await settlementRow.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.getByTestId('formation-detail-panel').getAttribute('data-formation-id'), stress.ids[0]);
      await page.screenshot({ path: path.join(out, `${viewport.width}-settlement-selection.png`) });
      record.surfaces.push({ name: 'settlement inspection / exact keyboard selection', settlementBox });
      }

      if (surfaces.has('hq')) {
      await page.getByTestId('toolbar-route-army-hq').click();
      const hq = page.getByTestId('army-hq-modal');
      await hq.waitFor({ state: 'visible' });
      const card = hq.getByTestId('army-hq-corps-card').first();
      await card.scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');
      await card.focus();
      assert(await card.getAttribute('aria-label'), 'HQ card lacks accessible explanation');
      const hqDescription = card.getByTestId('army-hq-corps-focus-description');
      const hqDescriptionBox = await geometry(hqDescription);
      assert(hqDescriptionBox.height > 5 && hqDescriptionBox.width > 10, 'HQ keyboard explanation remains visually hidden');
      const cardBox = await geometry(card);
      contained(cardBox, viewport.width, 'HQ corps card');
      await page.screenshot({ path: path.join(out, `${viewport.width}-hq.png`) });
      await hq.getByRole('tab', { name: 'SUMMARY', exact: true }).click();
      const cost = hq.getByTestId('war-summary-campaign-cost');
      await cost.scrollIntoViewIfNeeded();
      const costBox = await geometry(cost);
      contained(costBox, viewport.width, 'HQ campaign summary');
      await page.screenshot({ path: path.join(out, `${viewport.width}-summary.png`) });
      record.surfaces.push({ name: 'Army HQ corps card / canonical campaign summary', cardBox, hqDescriptionBox, costBox });
      }

      if (surfaces.has('aftermath')) {
      await storeAction(page, 'aftermath');
      const aftermath = page.locator('[role="dialog"][aria-labelledby="turn-aftermath-title"]');
      await aftermath.waitFor({ state: 'visible' });
      await settle(aftermath);
      const aftermathText = await aftermath.innerText();
      assert(aftermathText.includes('1,234,567'), 'Aftermath exact count not grouped');
      assert(aftermathText.includes('No staff report'), 'Aftermath missing count confused with zero');
      const aftermathBox = await geometry(aftermath);
      contained(aftermathBox, viewport.width, 'Aftermath');
      const close = page.getByTestId('turn-aftermath-close');
      await close.focus();
      await page.keyboard.press('Enter');
      await aftermath.waitFor({ state: 'hidden' });
      await storeAction(page, 'aftermath');
      await settle(aftermath);
      await page.screenshot({ path: path.join(out, `${viewport.width}-aftermath.png`) });
      record.surfaces.push({ name: 'aftermath large/missing/zero counts and keyboard dismissal', aftermathBox });
      }
      const finalIdentity = await storeAction(page, 'identity');
      assert.deepEqual(finalIdentity, initialIdentity, 'Presentation interactions mutated imported-save identity/projected state or advanced turn');
      record.preservation = finalIdentity;
      assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join('; ')}`);
      record.passed = true;
    } catch (error) {
      record.passed = false;
      record.failure = String(error.stack ?? error);
      result.failures.push({ viewport, error: record.failure });
      await page.screenshot({ path: path.join(out, `${viewport.width}-failure.png`) }).catch(() => {});
      throw error; // stop expensive work at the first unexpected failure
    } finally {
      await page.close();
    }
  }
} catch (error) {
  process.exitCode = 1;
  console.error(error.message);
} finally {
  result.finalHash = hash(savePath);
  result.fixturePreserved = result.finalHash === initialHash;
  result.passed = result.failures.length === 0 && result.cases.length === viewports.length && result.fixturePreserved;
  if (!result.passed) process.exitCode = 1;
  fs.writeFileSync(path.join(out, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify({ passed: result.passed, cases: result.cases.length, failures: result.failures.length, fixturePreserved: result.fixturePreserved, evidence: path.join(out, 'result.json') }));
}
