// Posture model option 2 render proof: drives the real dev map renderer, boots an RBiH
// campaign, injects one corps stance matter and one OG stance matter (plus a hold) into
// the store's loaded state, and renders (a) the Command Surface with the stance matter
// selected and (b) the sector panel with its stance step, at 2293x960 and 1280x720, EN
// and BCS. Screenshots and a JSON report (smallest visible font, overflow) go to --out.
// In the browser there is no desktop bridge, so the answer buttons render disabled with
// the "desktop only" line; the IPC path is covered by tests/ui/stance_matter_surfaces.test.ts.
// Usage: node tools/ui/stance_matter_browser_proof.mjs --url http://127.0.0.1:3002 [--out <dir>]
// --out defaults to $AWWV_COORDINATION_ROOT/surface_steps/stance (see tools/lib/repo_paths.mjs).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { coordinationRoot } from '../lib/repo_paths.mjs';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:3002');
const out = opt('--out', path.join(coordinationRoot(), 'surface_steps', 'stance'));
fs.mkdirSync(out, { recursive: true });
const SIZES = [{ width: 2293, height: 960 }, { width: 1280, height: 720 }];

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  const context = await browser.newContext({ viewport: SIZES[0], reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.addInitScript(() => { try { performance.setResourceTimingBufferSize(20000); window.localStorage.setItem('awwv.locale', 'en'); } catch {} });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  async function boot(size) {
    await page.setViewportSize(size);
    await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /new war|novi rat/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Republic of Bosnia/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /take command/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /^begin/i }).click();
    await page.getByRole('button', { name: /^war map$/i }).waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForTimeout(2500);
  }

  async function installAndInject() {
    return page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map((r) => r.name);
      const find = (part) => urls.find((u) => u.includes(part));
      const store = await import(find('/store/gameStore.ts'));
      const i18n = await import(find('/i18n/index.ts'));
      const reactUrl = urls.find((u) => /\/deps\/react\.js/.test(u));
      const domUrl = urls.find((u) => /\/deps\/react-dom_client\.js/.test(u));
      window.__stance = { store: store.useGameStore, i18n, reactUrl, domUrl };
      const s = store.useGameStore.getState().loadedGameState;
      const sectors = (s.corpsFrontSectors ?? []).filter((x) => x.faction === 'RBiH');
      const sector = sectors.find((x) => x.display_name && x.display_name.startsWith('OG')) ?? sectors[0];
      const corpsId = sector.corps_id;
      const corpsName = sector.corps_name;
      const turn = s.turn ?? 1;
      const common = { turn, deadlineTurn: turn + 1, answer: null, constraint: null, patronCeiling: null, patronShift: 0 };
      const stanceMatters = [
        { ...common, id: `STANCE_${turn}_${corpsId}`, scope: 'corps', corpsId, corpsName, sectorId: null, ogName: null, fromStance: 'balanced', toStance: 'offensive', commanderName: null, reason: 'opportunity', avgCohesion: 61, avgStrength: 0.74, sectorThreat: 0.4, constraintOptions: ['ceiling_balanced', 'ceiling_defensive'], countermandAllowed: true, mainStaffDelayTurns: 0 },
        { ...common, id: `STANCE_${turn}_${corpsId}_og0`, scope: 'og', corpsId, corpsName, sectorId: sector.sector_id, ogName: sector.display_name ?? null, fromStance: 'defend', toStance: 'active_defense', commanderName: null, reason: 'enemy_massing', avgCohesion: null, avgStrength: null, sectorThreat: 0.4, constraintOptions: ['no_active_defense', 'hold_no_counterattacks'], countermandAllowed: true, mainStaffDelayTurns: 0 },
      ];
      store.useGameStore.setState({ loadedGameState: { ...s, stanceMatters } });
      return { corpsId, sectorId: sector.sector_id, ogName: sector.display_name, matterId: stanceMatters[0].id };
    });
  }

  async function mountCommandSurface() {
    await page.evaluate(async () => {
      const { reactUrl, domUrl } = window.__stance;
      const React = (await import(reactUrl)).default;
      const domModule = await import(domUrl);
      const ReactDOM = domModule.createRoot ? domModule : domModule.default;
      const mod = await import('/components/command_surface/CommandSurface.tsx');
      let host = document.getElementById('stance-host');
      if (host) { window.__stance.root?.unmount(); host.remove(); }
      host = document.createElement('div');
      host.id = 'stance-host';
      document.body.appendChild(host);
      window.__stance.root = ReactDOM.createRoot(host);
      window.__stance.root.render(React.createElement(mod.CommandSurface, { onClose: () => {} }));
    });
    await page.waitForTimeout(900);
  }

  async function unmount() {
    await page.evaluate(() => { window.__stance.root?.unmount(); document.getElementById('stance-host')?.remove(); window.__stance.root = null; });
  }

  async function measure(selector) {
    return page.evaluate((selector) => {
      const root = document.querySelector(selector);
      if (!root) return { error: `missing ${selector}` };
      let min = Infinity; let where = '';
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const el = node.parentElement;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (cs.visibility === 'hidden' || cs.display === 'none' || rect.width === 0 || rect.height === 0) continue;
        const size = parseFloat(cs.fontSize);
        if (size < min) { min = size; where = `${el.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 40)}"`; }
      }
      const r = root.getBoundingClientRect();
      return { minFontPx: min, where, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, overflowX: document.documentElement.scrollWidth > window.innerWidth, text: root.innerText.slice(0, 1200) };
    }, selector);
  }

  async function shot(name, size, locale, selector) {
    const file = path.join(out, `${name}_${locale}_${size.width}x${size.height}.png`);
    await page.screenshot({ path: file });
    const row = { screen: name, locale, size: `${size.width}x${size.height}`, file, ...(await measure(selector)) };
    report.push(row);
    console.log(JSON.stringify({ ...row, text: undefined }));
  }

  for (const size of SIZES) {
    // Boot per locale: the war-map step leaves the warroom.
    for (const locale of ['en', 'bcs']) {
      await boot(size);
      const ids = await installAndInject();
      await page.evaluate((l) => window.__stance.i18n.setLocale(l), locale);
      await page.waitForTimeout(400);

      // (a) Command Surface (real warroom route) with the corps stance matter selected.
      await page.getByRole('button', { name: locale === 'en' ? /^command surface$/i : /^komandna ploča$/i }).first().click();
      await page.getByTestId('warroom-decision-room-host').waitFor({ state: 'visible', timeout: 20000 });
      await page.waitForTimeout(800);
      const area = page.getByTestId('warroom-decision-room-host').getByText(locale === 'en' ? 'Command & Personnel' : 'Komanda i personel', { exact: true }).first();
      if (await area.count()) { await area.click(); await page.waitForTimeout(800); }
      const title = locale === 'en' ? /: Balanced to Offensive/ : /: Uravnoteženo u Ofanzivno/;
      const card = page.getByTestId('warroom-decision-room-host').getByText(title).first();
      if (await card.count()) { await card.click(); await page.waitForTimeout(800); }
      const actions = page.getByTestId('stance-matter-actions').first();
      if (await actions.count()) await actions.scrollIntoViewIfNeeded();
      await shot('command_surface_stance_matter', size, locale, '[data-testid="warroom-decision-room-host"]');
      await page.getByTestId('warroom-decision-room-close').click();
      await page.waitForTimeout(600);

      // (b) Sector panel with its stance step, from the war map.
      await page.getByRole('button', { name: locale === 'en' ? /^war map$/i : /^ratna karta$/i }).first().click();
      await page.waitForTimeout(2000);
      await page.evaluate((sectorId) => window.__stance.store.getState().setSelectedCorpsFrontSectorId(sectorId), ids.sectorId);
      await page.waitForTimeout(1200);
      const step = page.getByTestId('sector-stance-step');
      if (await step.count()) await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await shot('sector_stance_step', size, locale, '[data-testid="sector-stance-step"]');
      await page.evaluate(() => window.__stance.store.getState().setSelectedCorpsFrontSectorId(null));
      await page.waitForTimeout(300);
    }
  }
  report.push({ pageErrors: errors });
} finally {
  fs.writeFileSync(path.join(out, 'stance_render_report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
