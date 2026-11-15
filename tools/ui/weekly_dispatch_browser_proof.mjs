// Command loop L2 render proof (2026-11-14): boots a real RBiH campaign in the dev map
// build, then opens the app's own TurnAftermathModal (mounted by App) on a quiet week
// and a busy week, at 1280x720 and the wide desk size, in EN and BCS. Records whether
// the dispatch fits without scrolling and the smallest rendered font.
// The browser build cannot advance a turn (advance-turn is an Electron IPC), so the
// week views are fixtures set through the store; the Electron harness run covers Advance.
// Usage: node tools/ui/weekly_dispatch_browser_proof.mjs --url http://127.0.0.1:5199 --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5199');
const out = opt('--out', 'C:/Pyrrhic/AWWV-worktrees/_logs/cl-l2-dispatch-20261114');
fs.mkdirSync(out, { recursive: true });

const SIZES = [{ width: 1280, height: 720 }, { width: 2293, height: 960 }];

const baseCost = {
  friendlyMilitaryCasualties: 0, theaterMilitaryCasualties: 0, displacedThisTurn: 0,
  ownFormationsDestroyed: 0, ownSupplySpent: 0, ownHeavyMunitionsSpent: 0, severity: 'low', reasons: [],
};
const baseActions = {
  actionableCount: 0, blockingCount: 0, opportunityCount: 0, reserveCount: 0,
  officerCount: 0, eventDecisionCount: 0, peaceCount: 0, topItems: [],
};

const quietView = {
  turn: 20, dateLabel: '19 Aug 1992', playerFaction: 'RBiH', headline: 'Quiet', narrativeLine: 'Quiet', tone: 'quiet',
  territory: { friendlyNet: 0, gains: 0, losses: 0, breakdownComplete: true, notable: [] },
  combat: { battleCount: 0, friendlyBattleCount: 0, friendlyCasualties: 0, opposingCasualties: 0, territoryFlipsFromBattles: 0 },
  humanitarian: { displacedThisTurn: 0 },
  formations: { spawned: 1, destroyed: 0, ownSpawned: 1, ownDestroyed: 0 },
  supply: { ownSupplyDelta: 3, ownHeavyMunitionsDelta: -1 },
  cost: baseCost,
  signals: [],
  commandRecord: { directives: [], rows: [] },
  judgment: { headline: 'Quiet', detail: 'Quiet', memoryTone: 'quiet', primarySurface: 'records', secondarySurface: 'codex' },
  nextActions: baseActions,
};

// A heavy week with every line present and long place names, the worst case for fit.
const busyView = {
  ...quietView,
  turn: 41, dateLabel: '13 Jan 1993', tone: 'gain',
  territory: {
    friendlyNet: 3, gains: 5, losses: 2, breakdownComplete: true,
    notable: [
      { osid: 'op:travnik:turbe', label: 'Turbe (Travnik)', direction: 'gain', significance: 'corridor', from: 'RS', to: 'RBiH' },
      { osid: 'op:gradacac:vucilovac', label: 'Vučilovac (Gradačac)', direction: 'gain', significance: 'strategic', from: 'RS', to: 'RBiH' },
      { osid: 'op:olovo:solun', label: 'Solun (Olovo)', direction: 'loss', significance: 'generic', from: 'RBiH', to: 'RS' },
      { osid: 'op:maglaj:kosova', label: 'Kosova (Maglaj)', direction: 'gain', significance: 'urban', from: 'RS', to: 'RBiH' },
    ],
  },
  combat: { battleCount: 23, friendlyBattleCount: 11, friendlyCasualties: 412, opposingCasualties: 655, territoryFlipsFromBattles: 7 },
  humanitarian: { displacedThisTurn: 4800, hotspotLabel: 'Srebrenica' },
  formations: { spawned: 2, destroyed: 1, ownSpawned: 0, ownDestroyed: 1 },
  supply: { ownSupplyDelta: -14, ownHeavyMunitionsDelta: -6 },
  cost: { ...baseCost, friendlyMilitaryCasualties: 412, theaterMilitaryCasualties: 2100, displacedThisTurn: 4800, ownFormationsDestroyed: 1, ownSupplySpent: 14, ownHeavyMunitionsSpent: 6, severity: 'critical' },
  commandRecord: {
    directives: [],
    rows: [
      { id: 'c1', corpsName: '2nd Corps', officerName: 'Sead Delić', assignedRole: 'Primary', interpretation: 'as_issued', interpretationDetail: '', action: '', actionDetail: '' },
      { id: 'c2', corpsName: '3rd Corps', officerName: 'Enver Hadžihasanović', assignedRole: 'Contain', interpretation: 'reinterpreted', interpretationDetail: '', action: '', actionDetail: '' },
    ],
  },
  nextActions: {
    ...baseActions, actionableCount: 4, blockingCount: 1,
    topItems: [{ id: 'item:1', type: 'event_decision', severity: 'blocking', title: 'Convoy to Srebrenica', detail: 'UNHCR route request', action: { kind: 'inbox' }, actionLabel: 'Decide' }],
  },
};

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
    await page.keyboard.press('Enter');
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
    // Past the "War has started" intro, then onto the War Map, where the bottom strip lives.
    for (let i = 0; i < 5; i += 1) {
      const ack = page.getByRole('button', { name: /^acknowledge$|^potvrdi$/i }).first();
      if (!(await ack.isVisible().catch(() => false))) break;
      await ack.click().catch(() => page.keyboard.press('Enter'));
      await page.waitForTimeout(900);
    }
    await page.getByRole('button', { name: /^war map$/i }).first().click().catch(() => {});
    await page.waitForTimeout(2500);
    await page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map((r) => r.name);
      const storeUrl = urls.find((u) => u.includes('/store/gameStore.ts'));
      const i18nUrl = urls.find((u) => u.includes('/i18n/index.ts'));
      const dataUrl = urls.find((u) => u.includes('/data/turnAftermath.ts'));
      if (!storeUrl || !i18nUrl || !dataUrl) throw new Error('module urls missing');
      window.__l2 = { store: (await import(storeUrl)).useGameStore, i18n: await import(i18nUrl), data: await import(dataUrl) };
    });
  }

  async function openWeek(view) {
    await page.evaluate((view) => {
      const { store, data } = window.__l2;
      store.setState({ pendingEventDecisions: [], turnAftermath: view, turnAftermathDigest: data.buildTurnAftermathDigest(view), turnAftermathOpen: true });
    }, view);
    await page.waitForSelector('[data-testid="turn-aftermath-dispatch"]', { timeout: 10000 });
    await page.waitForTimeout(500);
  }

  async function measure() {
    return page.evaluate(() => {
      const body = document.querySelector('[data-testid="turn-aftermath-dispatch"]');
      const panel = body?.closest('[role="dialog"]');
      if (!body || !panel) return { error: 'dispatch missing' };
      let min = Infinity; let where = '';
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const el = node.parentElement;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0) continue;
        const size = parseFloat(cs.fontSize);
        if (size < min) { min = size; where = node.textContent.trim().slice(0, 40); }
      }
      const rect = panel.getBoundingClientRect();
      return {
        headline: document.querySelector('[data-testid="turn-aftermath-dispatch-headline"]')?.textContent,
        quiet: body.getAttribute('data-dispatch-quiet') === 'true',
        lines: Array.from(body.querySelectorAll('li')).map((li) => li.getAttribute('data-testid')),
        bodyScrolls: body.scrollHeight > body.clientHeight + 1,
        panelInsideViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
        panelRect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
        minFontPx: min, minFontWhere: where,
        monospaceInDispatch: Array.from(body.querySelectorAll('*')).some((el) => /mono/i.test(getComputedStyle(el).fontFamily) && el.textContent.trim()),
      };
    });
  }

  for (const size of SIZES) {
    for (const locale of ['en', 'bcs']) {
      await boot(size);
      await page.evaluate((l) => window.__l2.i18n.setLocale(l), locale);
      for (const [name, view] of [['quiet', quietView], ['busy', busyView]]) {
        await openWeek(view);
        const file = path.join(out, `dispatch_${name}_${locale}_${size.width}x${size.height}.png`);
        await page.screenshot({ path: file });
        const m = await measure();
        report.push({ week: name, locale, size: `${size.width}x${size.height}`, file, ...m });
        console.log(JSON.stringify(report[report.length - 1]));
        await page.evaluate(() => window.__l2.store.setState({ turnAftermathOpen: false }));
        await page.waitForTimeout(300);
      }
      // The strip line after closing, and the full record one click away (busy week).
      if (locale === 'en') {
        const strip = await page.locator('[data-testid="status-strip-dispatch-reopen"]').isVisible().catch(() => false);
        await page.getByRole('button', { name: "Reopen this week's dispatch" }).click().catch(() => {});
        await page.waitForSelector('[data-testid="turn-aftermath-dispatch"]', { timeout: 10000 });
        await page.getByTestId('turn-aftermath-full-record').click();
        await page.getByText('Command Desk').waitFor({ timeout: 10000 });
        const file = path.join(out, `record_busy_${locale}_${size.width}x${size.height}.png`);
        await page.screenshot({ path: file });
        report.push({ week: 'busy-record', locale, size: `${size.width}x${size.height}`, file, stripReopenVisibleBeforeReopen: strip });
        console.log(JSON.stringify(report[report.length - 1]));
      }
      await page.evaluate(() => window.__l2.i18n.setLocale('en'));
    }
  }
  report.push({ pageErrors: errors });
} finally {
  fs.writeFileSync(path.join(out, 'dispatch_browser_report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
