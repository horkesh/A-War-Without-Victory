// Surface step 5 (shell clean-up) render proof: drives the real dev map renderer, starts a
// real RBiH campaign, and screenshots the President's Desk with the War Footing entry, the
// Economy surface opened from it, the toolbar, and the Command Surface beside the Presidential
// Inbox, at 2293x960 and 1280x720 in English and BCS. It measures the toolbar's smallest
// computed font size and whether the Inbox overlaps the Command Surface detail column.
// Usage: node tools/ui/step5_shell_browser_proof.mjs --url http://127.0.0.1:5299 --out F:/AWWV-coordination/surface_steps/step5
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5299');
const out = opt('--out', 'F:/AWWV-coordination/surface_steps/step5');
const explore = args.includes('--explore');
fs.mkdirSync(out, { recursive: true });

const SIZES = opt('--sizes', '2293x960,1280x720').split(',').map((s) => {
  const [width, height] = s.split('x').map(Number);
  return { width, height };
});
const LOCALES = opt('--locales', 'en,bcs').split(',');

const browser = await chromium.launch({ headless: true });
const report = [];
const errors = [];
try {
  for (const locale of LOCALES) {
    for (const size of SIZES) {
      const context = await browser.newContext({ viewport: size, reducedMotion: 'reduce', deviceScaleFactor: 1 });
      await context.addInitScript((loc) => {
        try { window.localStorage.setItem('awwv.locale', loc); } catch { /* best effort */ }
      }, locale);
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', (e) => errors.push(`${locale} ${size.width}x${size.height}: ${String(e.stack ?? e.message).slice(0, 600)}`));
      const tag = `${locale}_${size.width}x${size.height}`;
      const shot = async (name, clip) => {
        const file = path.join(out, `${name}_${tag}.png`);
        await page.screenshot({ path: file, ...(clip ? { clip } : {}) });
        return file;
      };

      await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: /new war|novi rat/i }).click();
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: /Republic of Bosnia|Republika Bosna/ }).first().click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: /take command|preuzmi komandu/i }).click();
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: /^(begin|počni|započni)/i }).click();
      try {
        // A new campaign opens in the War Room with the opening brief in the Inbox dossier.
        await page.getByTestId('warroom-toolbar-command-surface').waitFor({ state: 'visible', timeout: 90000 });
      } catch (error) {
        await shot('boot_failed');
        throw error;
      }
      await page.waitForTimeout(3000);

      if (explore) {
        await shot('explore_after_begin');
        const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button,[data-testid]'))
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => `${el.tagName.toLowerCase()} ${el.getAttribute('data-testid') ?? ''} "${(el.textContent ?? '').trim().slice(0, 40)}"`));
        fs.writeFileSync(path.join(out, `explore_${tag}.txt`), buttons.join('\n'));
        await context.close();
        continue;
      }

      const entry = { locale, size: `${size.width}x${size.height}` };
      entry.warroomShot = await shot('warroom_inbox');

      // S8: the Command Surface beside any visible Presidential Inbox.
      const overlap = async () => page.evaluate(() => {
        const visible = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
        };
        const detail = Array.from(document.querySelectorAll('[data-testid="warroom-decision-room-host"] [aria-label]'))
          .find((el) => el.tagName.toLowerCase() === 'aside' || el.getAttribute('role') === 'complementary')
          ?? document.querySelector('[data-testid="warroom-decision-room-host"]');
        const inboxes = Array.from(document.querySelectorAll('[data-testid="presidential-inbox"]')).filter(visible);
        const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
        const d = detail ? detail.getBoundingClientRect() : null;
        const hits = inboxes.map((inbox) => {
          const r = inbox.getBoundingClientRect();
          const intersects = d ? !(r.right <= d.left || r.left >= d.right || r.bottom <= d.top || r.top >= d.bottom) : false;
          // Which one paints on top at the inbox centre?
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return { rect: rect(inbox), intersectsDetail: intersects, inboxOnTop: Boolean(top && inbox.contains(top)) };
        });
        return { detail: detail ? rect(detail) : null, inboxes: hits };
      });
      await page.getByTestId('warroom-toolbar-command-surface').click();
      await page.getByTestId('warroom-decision-room-host').waitFor({ state: 'visible' });
      await page.waitForTimeout(1200);
      entry.commandSurface = await overlap();
      entry.commandSurfaceShot = await shot('command_surface');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);

      // Desk with the War Footing entry, from the War Room nav.
      await page.getByTestId('warroom-toolbar-president-desk').click();
      await page.getByTestId('president-desk-shell').waitFor({ state: 'visible' });
      await page.waitForTimeout(800);
      const economyButton = page.getByTestId('desk-action-economy');
      await economyButton.scrollIntoViewIfNeeded();
      entry.economyEntry = {
        visible: await economyButton.isVisible(),
        label: (await economyButton.textContent())?.trim(),
        fontPx: await economyButton.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      };
      entry.deskShot = await shot('desk_economy_entry');
      await economyButton.click();
      await page.getByTestId('economy-panel').waitFor({ state: 'visible' });
      await page.waitForTimeout(800);
      entry.economyShot = await shot('economy_over_desk');
      entry.economyTitle = (await page.locator('#economy-panel-title').textContent())?.trim();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      entry.afterEscape = {
        economyClosed: !(await page.getByTestId('economy-panel').isVisible().catch(() => false)),
        deskStillOpen: await page.getByTestId('president-desk-shell').isVisible().catch(() => false),
      };
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);

      // The map toolbar (DESK / MAP route buttons) on the War Map.
      await page.getByTestId('warroom-toolbar-war-map').click();
      await page.getByTestId('toolbar-route-desk').waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(2500);
      entry.toolbar = await page.evaluate(() => {
        const route = document.querySelector('[data-testid="toolbar-route-desk"]');
        const bar = route?.closest('header, nav, div.fixed');
        if (!bar) return { error: 'toolbar missing' };
        let min = Infinity; let where = '';
        const walker = document.createTreeWalker(bar, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim()) continue;
          const el = node.parentElement;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0) continue;
          const px = parseFloat(cs.fontSize);
          if (px < min) { min = px; where = `"${node.textContent.trim().slice(0, 30)}"`; }
        }
        const routeSize = parseFloat(getComputedStyle(route).fontSize);
        return { minFontPx: min, where, deskRouteFontPx: routeSize };
      });
      entry.toolbarShot = await shot('toolbar', { x: 0, y: 0, width: size.width, height: 56 });
      entry.mapShot = await shot('war_map');

      // S8 from the map: the Inbox is open on the map rail; the toolbar's review action
      // opens the Command Surface in the War Room.
      entry.mapInboxOpen = await page.getByTestId('presidential-inbox').first().isVisible().catch(() => false);
      await page.getByTestId('toolbar-route-desk').click();
      await page.getByTestId('president-desk-shell').waitFor({ state: 'visible' });
      await page.waitForTimeout(1000);
      entry.deskFromMapShot = await shot('desk_from_map');
      await page.getByTestId('warroom-toolbar-command-surface').click();
      await page.getByTestId('warroom-decision-room-host').waitFor({ state: 'visible' });
      await page.waitForTimeout(1200);
      entry.commandSurfaceFromMap = await overlap();
      entry.commandSurfaceFromMapShot = await shot('command_surface_from_map');

      report.push(entry);
      fs.writeFileSync(path.join(out, 'step5_report.json'), JSON.stringify({ report, errors }, null, 2));
      await context.close();
    }
  }
} finally {
  fs.writeFileSync(path.join(out, 'step5_report.json'), JSON.stringify({ report, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ report, errors }, null, 2));
