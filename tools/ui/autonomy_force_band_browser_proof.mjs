// PR #878 render proof: the Autonomy panel operation-proposal card shows the player-safe
// force band (not "0.5:1"). Boots a real RBiH campaign in the dev map build, then (after boot,
// so the app still believes it is in a browser) installs a minimal window.awwv bridge that serves
// getAutonomyState with an op proposal whose force_ratio_estimate is 0.5 (UNFAVORABLE, the longest
// label) and a long commander name, and opens Army HQ > Personnel > Autonomy through the real UI.
// The card, band, truncation and tooltip are the real AutonomyPanel; only the IPC payload is a fixture.
// Usage: node tools/ui/autonomy_force_band_browser_proof.mjs --url http://127.0.0.1:5287 --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5287');
const out = opt('--out', 'C:/Pyrrhic/AWWV-worktrees/_logs/lane-b/s23/ui_proof_878');
fs.mkdirSync(out, { recursive: true });
const SIZES = [{ width: 1280, height: 720 }, { width: 2293, height: 960 }];
const LONG = 'Brigadier General Sefer Halilović-Hadžiosmanović';

const browser = await chromium.launch({ headless: true });
const report = [];
try {
  const context = await browser.newContext({ viewport: SIZES[0], reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 300)));

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
    for (let i = 0; i < 5; i += 1) {
      const ack = page.getByRole('button', { name: /^acknowledge$|^potvrdi$/i }).first();
      if (!(await ack.isVisible().catch(() => false))) break;
      await ack.click().catch(() => page.keyboard.press('Enter'));
      await page.waitForTimeout(900);
    }
  }

  async function installBridge() {
    await page.evaluate(({ long }) => {
      const mk = (id, ratio, name, corps) => ([
        { id, turn: 1, faction: 'RBiH', domain: 'ops', description: 'Operation approval', proposed_action: `APPROVE_OP:arbih_${corps}_corps:plan_${id}` },
        { proposal_id: id, corps_id: `arbih_${corps}_corps`, corps_name: `${corps} Corps`, plan_id: `plan_${id}`, op_id: null, op_name: 'Operation',
          commander: { officer_id: `off_${id}`, name, display: name }, force_ratio_estimate: ratio, commander_assessment: 'launch', override_available: false, override_ca_cost: 0 },
      ]);
      const all = [
        mk('P_UNFAV', 0.5, long, '1st'),
        mk('P_CLEAR', 2.5, 'Col. Ramiz Delalić', '2nd'),
        mk('P_FAV', 1.3, 'Col. Mehmed Alagić', '3rd'),
        mk('P_CONT', 1.0, 'Col. Atif Dudaković', '5th'),
      ];
      window.awwv = {
        getAutonomyState: async () => ({ autonomy_level: 1, pending_proposal_reviews: all.map((x) => x[0]), op_proposal_cards: all.map((x) => x[1]) }),
        setAutonomyLevel: async () => ({ ok: true }),
      };
    }, { long: LONG });
  }

  async function openAutonomy() {
    await page.locator('[data-testid="warroom-toolbar-staff"], [data-testid="toolbar-route-army-hq"]').first().click();
    await page.waitForTimeout(2500);
    await page.locator('[data-testid="army-hq-tab-personnel"]').click();
    await page.waitForTimeout(1200);
    await page.locator('[data-testid="personnel-open-autonomy"]').click();
    await page.waitForTimeout(1800);
  }

  async function measure() {
    return page.evaluate(() => {
      const bands = ['UNFAVORABLE', 'CLEAR EDGE', 'FAVORABLE', 'CONTESTED'];
      const rows = [];
      for (const span of document.querySelectorAll('span[title]')) {
        const label = span.textContent.trim();
        if (!bands.includes(label)) continue;
        const row = span.parentElement;
        const nameEl = row.firstElementChild;
        const cs = getComputedStyle(span); const ns = getComputedStyle(nameEl);
        const r = (e) => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), right: +b.right.toFixed(1) }; };
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
        rows.push({
          band: label, title: span.getAttribute('title'), bandClass: span.className,
          bandWhiteSpace: cs.whiteSpace, bandFlexShrink: cs.flexShrink, bandBox: r(span),
          bandOneLine: span.getBoundingClientRect().height <= lh * 1.2,
          name: nameEl.textContent.trim(), nameClass: nameEl.className, nameTag: nameEl.tagName,
          nameOverflow: ns.overflow, nameTextOverflow: ns.textOverflow, nameWhiteSpace: ns.whiteSpace,
          nameBox: r(nameEl), nameTruncated: nameEl.scrollWidth > nameEl.clientWidth + 1,
          noOverlap: nameEl.getBoundingClientRect().right <= span.getBoundingClientRect().left + 0.5,
          rowWidth: +row.getBoundingClientRect().width.toFixed(1), rowScrollOverflow: row.scrollWidth > row.clientWidth + 1,
        });
      }
      const hasRaw = /\d(\.\d)?\s*:\s*1\b/.test(document.body.innerText);
      return { rows, rawRatioTextPresent: hasRaw };
    });
  }

  for (const size of SIZES) {
    for (const locale of ['en', 'bcs']) {
      await boot(size);
      await page.evaluate(async (l) => {
        const urls = performance.getEntriesByType('resource').map((r) => r.name);
        const i18n = await import(urls.find((u) => u.includes('/i18n/index.ts')));
        i18n.setLocale(l);
      }, locale);
      await installBridge();
      await openAutonomy();
      await page.locator('span[title="defender advantage"]').first().scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const el = document.querySelector('span[title="defender advantage"]');
        el?.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(400);
      const m = await measure();
      const file = path.join(out, `autonomy_band_${locale}_${size.width}x${size.height}.png`);
      await page.screenshot({ path: file });
      const first = page.locator('span[title="defender advantage"]').first();
      let clip = null;
      if (await first.count()) {
        const card = first.locator('xpath=ancestor::div[contains(@class,"rounded") and contains(@class,"border")][1]');
        clip = path.join(out, `autonomy_card_${locale}_${size.width}x${size.height}.png`);
        await card.screenshot({ path: clip }).catch(() => { clip = null; });
      }
      const row = { locale, size: `${size.width}x${size.height}`, file, cardClip: clip, ...m };
      report.push(row);
      // Locale persists in storage; clear it so the next boot starts in English.
      await page.evaluate(() => { try { localStorage.clear(); } catch { /* ignore */ } }).catch(() => {});
      console.log(JSON.stringify({ ...row, rows: row.rows.map((x) => ({ band: x.band, title: x.title, oneLine: x.bandOneLine, truncated: x.nameTruncated, noOverlap: x.noOverlap })) }));
    }
  }
  report.push({ pageErrors: errors });
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
