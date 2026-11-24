// Recruitment hold render proof (lane C, S6 A1): mounts the real RecruitmentModal in the dev
// map build (the browser build has no desktop bridge, so the catalog is a fixture passed as props,
// the same way weekly_dispatch_browser_proof.mjs sets store fixtures) at a NARROW viewport, in EN
// and BCS at autonomy 1, plus autonomy 0 where no hold control may appear.
// Asserts: hold button and marker are not `white-space: nowrap`, nothing overflows horizontally,
// and the marker/button stay inside their row. Prints PASS/FAIL lines and writes proof.txt.
// Usage: node tools/ui/recruitment_hold_browser_proof.mjs --url http://127.0.0.1:5199 --out <dir> [--size 900x700]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5199');
const out = opt('--out', 'C:/Pyrrhic/AWWV-coordination/evidence/lane-c-s6-recruitment-hold');
const [width, height] = opt('--size', '900x700').split('x').map(Number);
fs.mkdirSync(out, { recursive: true });

const brigade = (id, name, extra) => ({
  id, name, faction: 'RBiH', eligible: true, reason_codes: [], available_from: 0,
  capital_cost: 4, manpower_cost: 900, default_equipment_class: 'light_infantry', ...extra,
});
const CATALOG = [
  brigade('b_raise', '1st Bihać Light Infantry Brigade', {}),
  brigade('b_held', '17th Krajina Motorised Brigade (a deliberately long name)', { held: true }),
  brigade('b_later', '4th Korpus Mountain Brigade', { eligible: false, reason_codes: ['not_yet_available'], available_from: 61 }),
];

const lines = [];
const log = (ok, msg) => { const l = `${ok ? 'PASS' : 'FAIL'}: ${msg}`; lines.push(l); console.log(l); };

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.addInitScript(() => { try { performance.setResourceTimingBufferSize(20000); } catch { /* best effort */ } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message).slice(0, 400)));

  await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map((r) => r.name);
    const find = (re) => urls.find((u) => re.test(u));
    const i18nUrl = find(/\/i18n\/index\.ts/);
    const reactUrl = find(/deps\/react\.js/);
    const domUrl = find(/deps\/react-dom_client\.js/);
    if (!i18nUrl || !reactUrl || !domUrl) throw new Error(`module urls missing: ${i18nUrl} ${reactUrl} ${domUrl}`);
    const base = new URL(i18nUrl).origin;
    const mod = await import(`${base}/components/RecruitmentModal.tsx`);
    window.__rh = {
      i18n: await import(i18nUrl), React: await import(reactUrl), dom: await import(domUrl), Modal: mod.RecruitmentModal, root: null,
    };
  });

  async function show(catalog, autonomyLevel, locale) {
    await page.evaluate(({ catalog, autonomyLevel, locale }) => {
      const { i18n, Modal } = window.__rh; const React = window.__rh.React.default ?? window.__rh.React; const dom = window.__rh.dom.default ?? window.__rh.dom;
      if (window.__rh.root) { window.__rh.root.unmount(); window.__rh.root = null; }
      i18n.setLocale(locale);
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = dom.createRoot(host);
      window.__rh.root = root;
      root.render(React.createElement(Modal, {
        isOpen: true, loading: false, applying: false, playerFaction: 'RBiH', brigades: catalog, autonomyLevel,
        onToggleHold: () => {}, onClose: () => {}, onRefresh: () => {}, onApply: () => {},
      }));
    }, { catalog, autonomyLevel, locale });
    await page.waitForSelector('#recruitment-title');
    await page.waitForTimeout(600);
  }

  const measure = () => page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid^="recruitment-hold-"]'));
    const dialog = document.querySelector('#recruitment-title')?.closest('[class*="max-w-2xl"]') ?? null;
    const scroller = dialog?.querySelector('.overflow-y-auto');
    const items = [];
    for (const row of rows) {
      const li = row.closest('li');
      const lr = li.getBoundingClientRect();
      for (const el of Array.from(row.children)) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        items.push({
          row: row.getAttribute('data-testid'), tag: el.tagName, text: el.textContent.trim(), whiteSpace: cs.whiteSpace,
          overflowX: el.scrollWidth - el.clientWidth, insideRow: r.left >= lr.left - 1 && r.right <= lr.right + 1,
          lines: Math.round(r.height / parseFloat(cs.lineHeight || '16')),
        });
      }
    }
    return {
      rows: rows.length, items,
      dialogOverflowX: dialog ? dialog.scrollWidth - dialog.clientWidth : null,
      scrollerOverflowX: scroller ? scroller.scrollWidth - scroller.clientWidth : null,
      dialogInViewport: dialog ? (() => { const r = dialog.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })() : false,
    };
  });

  for (const locale of ['en', 'bcs']) {
    await show(CATALOG, 1, locale);
    const file = path.join(out, `hold_autonomy1_${locale}_${width}x${height}.png`);
    await page.screenshot({ path: file });
    const m = await measure();
    const buttons = m.items.filter((i) => i.tag === 'BUTTON');
    const markers = m.items.filter((i) => i.tag === 'SPAN');
    log(m.rows === 3, `[${locale}] hold controls on 3 rows: raisable, held, not-yet-available (got ${m.rows})`);
    log(buttons.length === 3 && buttons.every((b) => b.text.length > 0), `[${locale}] ${buttons.length} hold buttons: ${buttons.map((b) => JSON.stringify(b.text)).join(', ')}`);
    log(markers.length === 1, `[${locale}] exactly one held marker: ${markers.map((x) => JSON.stringify(x.text)).join(', ')}`);
    log(buttons.some((b) => b.text === (locale === 'en' ? 'Release hold' : 'Ukloni zadržavanje')) && buttons.some((b) => b.text === (locale === 'en' ? 'Hold' : 'Zadrži')), `[${locale}] both Hold and Release labels present`);
    log([...buttons, ...markers].every((x) => x.whiteSpace !== 'nowrap'), `[${locale}] button+marker white-space not nowrap (${[...new Set([...buttons, ...markers].map((x) => x.whiteSpace))].join(',')})`);
    log([...buttons, ...markers].every((x) => x.overflowX <= 1), `[${locale}] button+marker scrollWidth <= clientWidth+1 (max overflow ${Math.max(...[...buttons, ...markers].map((x) => x.overflowX))})`);
    log([...buttons, ...markers].every((x) => x.insideRow), `[${locale}] button+marker stay inside their row`);
    log(m.dialogOverflowX <= 1 && m.scrollerOverflowX <= 1 && m.dialogInViewport, `[${locale}] no horizontal overflow in dialog (dialog ${m.dialogOverflowX}, body ${m.scrollerOverflowX}) and dialog inside ${width}px viewport`);
    console.log(`  marker lines: ${markers.map((x) => x.lines).join(',')}; screenshot ${file}`);
  }

  await show(CATALOG, 0, 'en');
  {
    const file = path.join(out, `hold_autonomy0_en_${width}x${height}.png`);
    await page.screenshot({ path: file });
    const m = await measure();
    const holdWords = await page.evaluate(() => /Release hold|Held: your staff/.test(document.querySelector('[role="dialog"]')?.innerText ?? ''));
    log(m.rows === 0 && !holdWords, `[autonomy 0] no hold control or marker (rows ${m.rows}, hold text present: ${holdWords}); screenshot ${file}`);
  }
  log(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} finally {
  const hdr = `viewport: ${width}x${height}\nurl: ${origin}\n`;
  fs.writeFileSync(path.join(out, 'proof.txt'), `${hdr}${lines.join('\n')}\n`);
  await browser.close();
}
if (lines.some((l) => l.startsWith('FAIL'))) process.exitCode = 1;
