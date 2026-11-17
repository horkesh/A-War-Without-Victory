// A2b PR-B2 render proof: the HRHB refugee compact line in Army HQ Records.
// Drives the real dev map renderer: boots a real campaign, injects each compact phase into the store as
// the HRHB President's state (the line is derived from the same decision log and Washington state the
// engine multipliers read), mounts the real RecordsContent, screenshots the archive-summary block in EN
// and BCS, and measures the smallest computed font of the line.
// Usage: node tools/ui/refugee_compact_line_browser_proof.mjs --url http://127.0.0.1:5199 [--out <dir>] [--sizes 1280x720]
// --out defaults to docs/40_reports/evidence/20261117_a2b_compact_line.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5199');
const out = opt('--out', path.join('docs', '40_reports', 'evidence', '20261117_a2b_compact_line'));
const SIZES = opt('--sizes', '1280x720').split(',').map((s) => {
  const [width, height] = s.split('x').map(Number);
  return { width, height };
});
fs.mkdirSync(out, { recursive: true });

const row = (turn, event_id, response_id) => ({ event_id, response_id, decision_source: 'player', faction: 'HRHB', turn });
const UNITED = row(0, 'hrhb_political_goal', 'united_front');
const PERSISTS = row(5, 'hrhb_1992_graz_cooperation_collapse', 'formal_alliance_persists');
const H6 = row(52, 'hrhb_central_bosnia_defense_1993', 'federate_early');
const OVERTURE = row(87, 'hrhb_federation_overture_1993', 'extend_federation_overture');
const VOPP_RESIST = row(46, 'zagreb_restrains_boban_vopp', 'resist_patron');

const PHASES = [
  { name: 'active', turn: 20, log: [UNITED, PERSISTS], bilateral: {} },
  { name: 'suspended', turn: 25, log: [UNITED], bilateral: { refugee_compact_suspended_until: 30 } },
  { name: 'lapsed', turn: 60, log: [UNITED, PERSISTS, VOPP_RESIST], bilateral: {} },
  { name: 'ran_out', turn: 70, log: [UNITED, PERSISTS], bilateral: {} },
  { name: 'signed', turn: 110, log: [UNITED, PERSISTS, H6, OVERTURE], bilateral: { washington_signed: true, washington_turn: 102 } },
];

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  const context = await browser.newContext({ viewport: SIZES[0], reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message).slice(0, 600)));

  async function boot(size) {
    await page.setViewportSize(size);
    await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter'); // past the splash
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /new war|novi rat/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Republic of Bosnia/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /take command/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /^begin/i }).click();
    await page.getByRole('button', { name: /^war map$/i }).waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);
  }

  async function installHelpers() {
    await page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map((r) => r.name);
      const find = (part) => urls.find((u) => u.includes(part));
      const storeUrl = find('/store/gameStore.ts');
      const i18nUrl = find('/i18n/index.ts');
      if (!storeUrl || !i18nUrl) throw new Error('module urls missing');
      const store = await import(storeUrl);
      const i18n = await import(i18nUrl);
      const reactUrl = urls.find((u) => /\/deps\/react\.js/.test(u));
      const domUrl = urls.find((u) => /\/deps\/react-dom_client\.js/.test(u));
      window.__proof = { store: store.useGameStore, i18n, reactUrl, domUrl, real: store.useGameStore.getState().loadedGameState };
    });
  }

  async function mountRecords() {
    await page.evaluate(async () => {
      const { reactUrl, domUrl } = window.__proof;
      const React = (await import(reactUrl)).default;
      const domModule = await import(domUrl);
      const ReactDOM = domModule.createRoot ? domModule : domModule.default;
      const mod = await import('/components/army_hq/RecordsContent.tsx');
      window.__proof.root?.unmount();
      document.getElementById('proof-host')?.remove();
      const host = document.createElement('div');
      host.id = 'proof-host';
      host.style.cssText = 'position:fixed;left:24px;top:24px;width:900px;z-index:2147480000;background:#0e1318;padding:16px;pointer-events:none;';
      document.body.appendChild(host);
      window.__proof.root = ReactDOM.createRoot(host);
      window.__proof.root.render(React.createElement(mod.RecordsContent, {}));
    });
    await page.waitForTimeout(700);
  }

  async function setPhase(phase) {
    await page.evaluate((p) => {
      const real = window.__proof.real;
      const raw = real.rawGameState ?? { meta: {}, military: {}, political: {} };
      const merged = {
        ...real,
        player_faction: 'HRHB',
        turn: p.turn,
        rawGameState: {
          ...raw,
          meta: { ...raw.meta, turn: p.turn, player_faction: 'HRHB' },
          military: { ...raw.military, event_decision_log: p.log },
          political: { ...raw.political, rbih_hrhb_state: p.bilateral },
        },
      };
      window.__proof.store.setState({ loadedGameState: merged });
    }, phase);
  }

  const measure = (selector) => page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return { error: `missing ${selector}` };
    let min = Infinity;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim() || !node.parentElement) continue;
      min = Math.min(min, parseFloat(getComputedStyle(node.parentElement).fontSize));
    }
    const r = root.getBoundingClientRect();
    return {
      minFontPx: min,
      text: root.textContent.trim(),
      compactPhase: root.getAttribute('data-compact-phase'),
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      overflowX: root.scrollWidth > root.clientWidth + 1,
    };
  }, selector);

  for (const size of SIZES) {
    for (const locale of ['en', 'bcs']) {
      await boot(size);
      await installHelpers();
      await page.evaluate((l) => window.__proof.i18n.setLocale(l), locale);
      for (const phase of PHASES) {
        await setPhase(phase);
        await mountRecords();
        const m = await measure('[data-testid="records-refugee-compact"]');
        const file = path.join(out, `compact_${phase.name}_${locale}_${size.width}x${size.height}.png`);
        await page.locator('[data-testid="records-archive-summary"]').screenshot({ path: file });
        const entry = { phase: phase.name, locale, size: `${size.width}x${size.height}`, file, ...m };
        report.push(entry);
        console.log(JSON.stringify(entry));
      }
      // Faction gate: another faction's President sees no line.
      await page.evaluate(() => {
        const real = window.__proof.real;
        window.__proof.store.setState({ loadedGameState: { ...real, player_faction: 'RBiH' } });
      });
      await mountRecords();
      const none = await measure('[data-testid="records-refugee-compact"]');
      report.push({ phase: 'not_hrhb', locale, size: `${size.width}x${size.height}`, lineRendered: !none.error });
      console.log(JSON.stringify({ phase: 'not_hrhb', locale, lineRendered: !none.error }));
    }
  }
  fs.writeFileSync(path.join(out, 'compact_line_report.json'), `${JSON.stringify({ errors, report }, null, 2)}\n`);
  console.log(`page errors: ${errors.length}`);
} finally {
  await browser.close();
}
