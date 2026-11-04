// Real-route reporting/navigation proof. Synthetic display fixtures; never advances or responds.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const arg = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const origin = arg('--url', 'http://127.0.0.1:3297');
const out = arg('--out', 'logs/command-overview-usability-20261104/browser');
const selectedFaction = arg('--faction', null);
const selectedWidth = Number(arg('--width', 0));
const skippedCase = arg('--skip-case', '');
const onlyDialogs = args.includes('--only-dialogs');
const captureOnly = args.includes('--capture-only');
const factions = ['RBiH', 'RS', 'HRHB'].filter(faction => !selectedFaction || selectedFaction === faction);
const viewports = [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }].filter(viewport => !selectedWidth || selectedWidth === viewport.width);
assert(factions.length && viewports.length, 'Unknown faction or viewport');
const fixturePath = 'docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/final-autosave.json';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const beforeHash = hash(fixturePath);
const results = { scope: 'Real browser routes with synthetic own-faction display fixtures; no native/campaign acceptance', mode: captureOnly ? 'report-capture-only' : onlyDialogs ? 'dialogs-only' : 'reporting-and-dialogs', skippedCase, beforeHash, cases: [], failures: [], advances: 0 };
const sourcePaths = ['src/ui/shared/Modal.tsx', 'src/ui/shared/equipmentSummary.ts', 'src/ui/map/data/GameStateAdapter.ts', 'src/ui/map/data/types.ts', 'src/ui/map/components/WarSummaryModal.tsx', 'src/ui/map/components/army_hq/ArmyHQModal.tsx', 'src/ui/map/components/army_hq/WarSummaryContent.tsx', 'src/ui/map/components/army_hq/EquipmentSummary.tsx', 'src/ui/map/i18n/messages.en.ts', 'src/ui/map/i18n/messages.bcs.ts', 'src/ui/warroom/data/war_data_extractor.ts'];
const sourceHash = file => crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
results.sourceHashes = Object.fromEntries(sourcePaths.map(file => [file, sourceHash(file)]));
fs.mkdirSync(out, { recursive: true });

function fixture(faction, requiredDecision = false) {
  const state = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  state.meta.player_faction = faction;
  state.meta.tutorial_state = { dismissed: true, completed_steps: [] };
  state.military.pending_event_notifications = [];
  state.military.pending_event_decisions = [];
  const formations = Object.values(state.military.formations);
  const own = formations.filter(formation => formation.faction === faction && formation.kind === 'brigade' && formation.status === 'active');
  assert(own.length >= 2, 'Fixture needs two active own brigades');
  for (const formation of own) {
    formation.composition = { infantry: 0, tanks: 0, artillery: 0, aa_systems: 0 };
    formation.equipment_state = { operational_heavy: 0, degraded_heavy: 0, non_operational_heavy: 0, total_heavy: 0 };
    if (faction === 'HRHB') { delete formation.composition; delete formation.equipment_state; }
  }
  if (faction === 'RBiH') {
    own[0].composition = { infantry: 0, tanks: 10, artillery: 20, aa_systems: 3 };
    own[0].equipment_state = { operational_heavy: 6, degraded_heavy: 4, non_operational_heavy: 0, total_heavy: 10 };
    own[1].composition = { infantry: 0, tanks: 5, aa_systems: 0 };
    delete own[1].equipment_state;
  }
  // These values must never enter the explicit player's brigade-only report.
  const enemy = formations.find(formation => formation.faction !== faction && formation.kind === 'brigade');
  assert(enemy, 'Enemy exclusion fixture is missing');
  enemy.composition = { infantry: 0, tanks: 987654, artillery: 987654, aa_systems: 987654 };
  const command = formations.find(formation => formation.faction === faction && formation.kind === 'army_hq');
  assert(command, 'Command double-count fixture is missing');
  command.composition = { infantry: 0, tanks: 876543, artillery: 876543, aa_systems: 876543 };
  if (requiredDecision) {
    state.military.pending_event_decisions = [{
      event_id: 'ui_keyboard_required_proof', event_title: 'Required keyboard review', faction,
      turn_fired: state.meta.turn, requires_player_response: true,
      narrative: 'This synthetic dossier tests scrolling and keyboard access without resolving a decision. '.repeat(100),
      response_options: [{ id: 'hold', label: 'Retain the recorded policy', effects: [] }, { id: 'review', label: 'Request a staff review', effects: [] }],
    }];
  }
  return state;
}

async function store(page, operation) {
  return page.evaluate(async operation => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(name => name.includes('/store/gameStore.ts'));
    if (!url) throw new Error('Loaded production store identity missing');
    const { useGameStore } = await import(url);
    const state = useGameStore.getState();
    if (operation === 'identity') {
      assertBrowser(state.lastLoadedStateFingerprint && state.loadedGameState, 'Loaded state identity missing');
      const digest = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(byte => byte.toString(16).padStart(2, '0')).join('');
      return { turn: state.loadedGameState.turn, save: await digest(state.lastLoadedStateFingerprint), projection: await digest(JSON.stringify(state.loadedGameState)) };
    }
    return { faction: state.loadedGameState?.player_faction, summary: state.loadedGameState?.equipmentSummary };
    function assertBrowser(condition, message) { if (!condition) throw new Error(message); }
  }, operation);
}
async function settle(locator) {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate(async element => {
    await document.fonts.ready;
    await Promise.all(element.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
}
async function bounds(locator, viewport) {
  await locator.scrollIntoViewIfNeeded();
  await settle(locator);
  const box = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, unoccluded: hit != null && element.contains(hit) };
  });
  assert(box.width > 0 && box.height > 0 && box.left >= -1 && box.right <= viewport.width + 1, 'Report not visibly contained');
  assert(box.top >= 0 && box.bottom <= viewport.height && box.unoccluded, 'Report is scrolled outside the viewport or occluded');
  assert(box.scrollWidth <= box.clientWidth + 2, 'Report text overflows');
  return box;
}
async function assertReport(report, faction, viewport) {
  const text = await report.innerText();
  assert(!/987[,.]?654|876[,.]?543/.test(text), 'Opponent or command equipment leaked into report');
  for (const [key, value] of Object.entries(faction === 'RBiH' ? { tanks: '15', artillery: '20', aa_systems: '3' } : { tanks: '0', artillery: '0', aa_systems: '0' })) {
    const item = report.getByTestId(`equipment-holdings-${key}`);
    if (faction === 'HRHB') assert((await item.innerText()).includes('No staff report'), 'Missing holdings became zero');
    else assert((await item.locator('dd').first().innerText()).includes(value), `Wrong ${key} holdings`);
  }
  const poolText = await report.getByTestId('equipment-operational-pool').innerText();
  if (faction === 'RBiH') {
    assert(poolText.includes('60%'), 'Abstract operational pool percentage wrong');
    assert(/partial/i.test(await report.getByTestId('equipment-holdings-artillery').innerText()), 'Partial artillery not labelled');
  }
  if (faction === 'HRHB') assert(poolText.includes('No staff report'), 'Missing pool became known');
  return { text, bounds: await bounds(report, viewport) };
}
async function focusTrap(page, dialog) {
  const candidates = dialog.locator('button:visible:not([disabled]), a[href]:visible, input:visible:not([disabled]), select:visible:not([disabled]), [tabindex="0"]:visible');
  assert(await candidates.count(), 'Dialog contains no focusable controls');
  await candidates.last().focus();
  await page.keyboard.press('Tab');
  assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Forward Tab escaped dialog');
  await candidates.first().focus();
  await page.keyboard.press('Shift+Tab');
  assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Reverse Tab escaped dialog');
}

// Reject fixture assumptions before opening a browser or starting the matrix.
for (const faction of factions) fixture(faction);
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) for (const faction of factions) {
    if (skippedCase === `${viewport.width}:${faction}`) continue;
    const page = await browser.newPage({ viewport });
    await page.addInitScript(() => performance.setResourceTimingBufferSize(4000));
    page.setDefaultTimeout(8000);
    const record = { faction, viewport, errors: [], checks: [] }; results.cases.push(record);
    page.on('pageerror', error => record.errors.push(error.message));
    try {
      await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => typeof window.handleManualSaveLoad === 'function');
      await page.evaluate(async state => window.handleManualSaveLoad(state), fixture(faction));
      await page.getByRole('button', { name: /^continue/i }).click();
      const trigger = page.getByTestId('toolbar-route-army-hq');
      await trigger.waitFor({ state: 'visible' });
      const identity = await store(page, 'identity');
      const projected = await store(page, 'summary');
      assert.equal(projected.faction, faction);
      assert(projected.summary, 'Equipment projection absent');
      await trigger.focus(); await page.keyboard.press('Enter');
      const hq = page.getByTestId('army-hq-modal'); await settle(hq);
      if (!onlyDialogs) record.checks.push({ name: 'briefing equipment', ...await assertReport(hq.getByTestId('equipment-report').first(), faction, viewport) });
      if (!captureOnly) await focusTrap(page, hq);
      await hq.getByRole('tab', { name: 'SUMMARY', exact: true }).click();
      if (!onlyDialogs) record.checks.push({ name: 'canonical summary equipment', ...await assertReport(hq.getByTestId('equipment-report').first(), faction, viewport) });
      await page.screenshot({ path: path.join(out, `${viewport.width}-${faction}-equipment.png`) });
      const close = hq.getByRole('button', { name: /close army/i });
      await close.focus(); await page.keyboard.press('Enter');
      await hq.waitFor({ state: 'hidden' });
      assert(await trigger.evaluate(element => document.activeElement === element), 'HQ did not restore opener focus');
      record.checks.push({ name: captureOnly ? 'Named close / opener focus (trap evidence reused)' : 'HQ keyboard trap / named close / opener focus', passed: true });

      if (captureOnly) {
        assert.deepEqual(await store(page, 'identity'), identity, 'Report capture mutated campaign');
        record.preservation = identity;
        assert.equal(record.errors.length, 0);
        record.passed = true;
        continue;
      }

      if (faction === 'RBiH') {
        await trigger.evaluate(element => element.blur());
        await page.keyboard.press('s');
        const summary = page.locator('[role="dialog"][aria-labelledby="war-summary-title"]'); await settle(summary);
        await focusTrap(page, summary);
        const summaryClose = summary.getByRole('button', { name: /close.*summary/i });
        await summaryClose.focus(); await page.keyboard.press('Enter');
        await summary.waitFor({ state: 'hidden' });
        record.checks.push({ name: 'War Summary named close / modal focus trap', passed: true });
      }
      if (faction === 'RBiH' && viewport.width === 1920 && !onlyDialogs) {
        await page.getByTestId('toolbar-route-desk').click();
        const deskClose = page.getByTestId('desk-close-overlay');
        if (await deskClose.isVisible()) await deskClose.click();
        await page.getByTestId('warroom-toolbar-faction').click();
        const factionOverlay = page.getByTestId('warroom-overlay-faction');
        await settle(factionOverlay);
        await factionOverlay.getByTestId('warroom-overlay-faction-drill-in').focus();
        await page.keyboard.press('Enter');
        await settle(hq);
        assert.equal(await hq.getByRole('tab', { name: 'SUMMARY', exact: true }).getAttribute('aria-selected'), 'true');
        record.checks.push({ name: 'Warroom faction overview keyboard drill-in to canonical summary', ...await assertReport(hq.getByTestId('equipment-report').first(), faction, viewport) });
        await page.screenshot({ path: path.join(out, `${viewport.width}-${faction}-warroom-handoff.png`) });
        await hq.getByRole('button', { name: /close army/i }).click();
        await hq.waitFor({ state: 'hidden' });
      }
      assert.deepEqual(await store(page, 'identity'), identity, 'Reporting/navigation mutated state or advanced turn');
      record.preservation = identity;

      if (faction === 'RBiH' && viewport.width === 1366) {
        await trigger.focus(); await page.keyboard.press('Enter');
        await hq.waitFor({ state: 'visible' });
        await hq.getByRole('tab', { name: 'PERSONNEL', exact: true }).click();
        await hq.getByTestId('personnel-open-recruitment').click();
        const recruitment = page.locator('[role="dialog"][aria-labelledby="recruitment-title"]');
        await settle(recruitment); await focusTrap(page, recruitment);
        const recruitmentClose = page.getByTestId('recruitment-close');
        await recruitmentClose.focus();
        const closeBox = await recruitmentClose.boundingBox();
        assert(closeBox && closeBox.y >= 0 && closeBox.y + closeBox.height <= viewport.height, 'Recruitment footer cannot be reached');
        await page.screenshot({ path: path.join(out, `${viewport.width}-${faction}-recruitment.png`) });
        await page.keyboard.press('Enter');
        await recruitment.waitFor({ state: 'hidden' });
        assert.deepEqual(await store(page, 'identity'), identity, 'Recruitment inspection mutated campaign');
        record.checks.push({ name: 'Recruitment focus / reachable footer / no apply', passed: true });

        await page.evaluate(async state => window.handleManualSaveLoad(state), fixture(faction, true));
        const required = page.locator('[role="dialog"][aria-labelledby="event-decision-title"]');
        await settle(required);
        const requiredIdentity = await store(page, 'identity');
        await page.keyboard.press('Escape');
        await page.mouse.click(2, 2);
        assert(await required.isVisible(), 'Required decision was dismissed without response');
        await focusTrap(page, required);
        const response = required.getByRole('button', { name: /Request a staff review/i });
        await response.focus();
        const responseBox = await response.boundingBox();
        assert(responseBox && responseBox.y >= 0 && responseBox.y + responseBox.height <= viewport.height, 'Required response is unreachable after long narrative');
        await page.screenshot({ path: path.join(out, `${viewport.width}-${faction}-required-decision.png`) });
        assert.deepEqual(await store(page, 'identity'), requiredIdentity, 'Required decision was accidentally resolved or advanced');
        record.checks.push({ name: 'Required decision no ESC/backdrop dismissal / long-content response focus / no response applied', passed: true, preservation: requiredIdentity });
      }
      assert.equal(record.errors.length, 0, 'Unexpected page errors');
      record.passed = true;
    } catch (error) {
      record.passed = false; record.failure = String(error.stack ?? error);
      results.failures.push({ faction, viewport, error: record.failure });
      await page.screenshot({ path: path.join(out, `${viewport.width}-${faction}-failure.png`) }).catch(() => {});
      throw error;
    } finally { await page.close(); }
  }
} catch (error) { process.exitCode = 1; console.error(error.message); }
finally {
  results.afterHash = hash(fixturePath);
  results.fixturePreserved = beforeHash === results.afterHash;
  results.sourcesPreserved = sourcePaths.every(file => results.sourceHashes[file] === sourceHash(file));
  const expectedCases = viewports.flatMap(viewport => factions.map(faction => `${viewport.width}:${faction}`)).filter(key => key !== skippedCase).length;
  results.passed = !results.failures.length && results.cases.length === expectedCases && results.fixturePreserved && results.sourcesPreserved;
  if (!results.passed) process.exitCode = 1;
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(results, null, 2) + '\n');
  await browser.close();
  console.log(JSON.stringify({ passed: results.passed, cases: results.cases.length, failures: results.failures.length, fixturePreserved: results.fixturePreserved, out }));
}
