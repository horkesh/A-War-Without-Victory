// Ending truth pass render proof (R8 council fix 1): drives the real dev map renderer, injects real
// ended-war states through the real GameStateAdapter and store, and screenshots the Dayton signing
// beat and the Verdict in EN and BCS, at desktop, scaled and narrow widths. Every state is real engine
// output: the post-sign state exported from the packaged app after a played Dayton signing, and the
// R8 headless turn-188 state ended by the engine's own applyWarTermination (stalemate and RS collapse).
// It writes a JSON report with the visible text, the smallest font and any horizontal overflow per shot.
// Usage: node tools/ui/ending_truth_browser_proof.mjs --url http://127.0.0.1:5393 --out <dir> \
//          --real <post-sign-state.json> --stalemate <ending-stalemate.json> --collapse <ending-collapse-rs.json>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const origin = opt('--url', 'http://127.0.0.1:5393');
const out = opt('--out', null);
const only = opt('--only', null);
const files = { real: opt('--real', null), stalemate: opt('--stalemate', null), collapse: opt('--collapse', null) };
if (!out || !files.real) throw new Error('--out and --real are required');
fs.mkdirSync(out, { recursive: true });
const raws = Object.fromEntries(Object.entries(files).filter(([, p]) => p).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));

// focus: rail index (0 RBiH, 1 RS, 2 HRHB); beat: also capture the signing beat first.
const CASES = [
  { id: 'real-en-1280x720', state: 'real', locale: 'en', width: 1280, height: 720, dsf: 1, focus: [0, 1, 2], beat: true },
  { id: 'real-bcs-1280x720', state: 'real', locale: 'bcs', width: 1280, height: 720, dsf: 1, focus: [0], beat: true },
  { id: 'real-en-1920x1080', state: 'real', locale: 'en', width: 1920, height: 1080, dsf: 1, focus: [0], beat: true },
  { id: 'real-bcs-1920x1080', state: 'real', locale: 'bcs', width: 1920, height: 1080, dsf: 1, focus: [0], beat: true },
  { id: 'real-en-768x1024', state: 'real', locale: 'en', width: 768, height: 1024, dsf: 1, focus: [0, 1], beat: true },
  { id: 'real-en-375x812', state: 'real', locale: 'en', width: 375, height: 812, dsf: 1, focus: [0, 1], beat: true },
  { id: 'real-bcs-375x812', state: 'real', locale: 'bcs', width: 375, height: 812, dsf: 1, focus: [0], beat: true },
  { id: 'stalemate-en-1280x720', state: 'stalemate', locale: 'en', width: 1280, height: 720, dsf: 1, focus: [1, 0, 2], beat: false },
  { id: 'stalemate-en-1920x1080', state: 'stalemate', locale: 'en', width: 1920, height: 1080, dsf: 1, focus: [1], beat: false },
  { id: 'collapse-en-1280x720', state: 'collapse', locale: 'en', width: 1280, height: 720, dsf: 1, focus: [1, 0], beat: false },
].filter((c) => raws[c.state] && (!only || c.id.startsWith(only)));

const report = { cases: [], errors: [] };
const browser = await chromium.launch({ headless: true });

async function surfaceFacts(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return { found: false };
    let min = Infinity; let where = '';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const parent = node.parentElement;
      const rect = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden' || style.display === 'none') continue;
      const px = parseFloat(style.fontSize);
      if (px < min) { min = px; where = `${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 48)}"`; }
    }
    return {
      found: true,
      text: root.innerText,
      minFontPx: Math.round(min * 10) / 10,
      minFontWhere: where,
      pageOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  }, selector);
}

for (const c of CASES) {
  const entry = { id: c.id, state: c.state, locale: c.locale, viewport: `${c.width}x${c.height}@${c.dsf}`, shots: [], facts: {} };
  const context = await browser.newContext({ viewport: { width: c.width, height: c.height }, deviceScaleFactor: c.dsf, reducedMotion: 'reduce' });
  await context.addInitScript((loc) => {
    try { performance.setResourceTimingBufferSize(20000); window.localStorage.setItem('awwv.locale', loc); } catch { /* best effort */ }
  }, c.locale);
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => report.errors.push(`${c.id}: ${String(e.stack ?? e.message).slice(0, 300)}`));
  const shot = async (name) => {
    const file = path.join(out, `${c.id}_${name}.png`);
    await page.screenshot({ path: file });
    entry.shots.push(path.basename(file));
  };
  try {
    await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(800);
    await page.evaluate(async (raw) => {
      const urls = performance.getEntriesByType('resource').map((r) => r.name);
      const find = (part) => urls.find((u) => u.includes(part));
      const adapter = await import(find('/data/GameStateAdapter.ts'));
      const store = await import(find('/store/gameStore.ts'));
      store.useGameStore.setState({ loadedGameState: adapter.parseGameState(JSON.parse(raw)) });
    }, raws[c.state]);
    if (c.beat) {
      const beat = page.locator('[data-testid="dayton-signing-beat"]');
      await beat.waitFor({ state: 'visible', timeout: 120000 }).catch(() => undefined);
      await page.waitForTimeout(1800);
      if (await beat.isVisible().catch(() => false)) {
        await shot('signing-beat');
        entry.facts.signingBeat = {
          ...(await surfaceFacts(page, '[data-testid="dayton-signing-beat"]')),
          continueInViewport: await page.evaluate(() => {
            const el = document.querySelector('[data-testid="dayton-signing-continue"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), fullyInside: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight };
          }),
          plateTextSizes: await page.evaluate(() => Array.from(document.querySelectorAll('.dayton-signing-line, .dayton-signing-signature span')).map((n) => ({ text: n.textContent.trim().slice(0, 40), px: Math.round(parseFloat(getComputedStyle(n).fontSize) * 10) / 10 }))),
        };
        await page.locator('[data-testid="dayton-signing-continue"]').click();
        await page.waitForTimeout(1500);
      } else {
        entry.facts.signingBeat = { found: false };
      }
    }
    await page.locator('[data-awwv-endgame-surface="verdict"]').waitFor({ state: 'visible', timeout: 120000 });
    await page.waitForTimeout(1200);
    entry.facts.verdictByFocus = [];
    for (const index of c.focus) {
      const rail = page.locator('[data-awwv-verdict-faction-rail] button').nth(index);
      await rail.click();
      await page.waitForTimeout(1000);
      await page.evaluate(() => document.querySelectorAll('[data-awwv-endgame-surface="verdict"] *').forEach((n) => { if (n instanceof HTMLElement && n.scrollTop > 0) n.scrollTop = 0; }));
      await shot(`verdict-focus${index}`);
      const facts = await surfaceFacts(page, '[data-awwv-endgame-surface="verdict"]');
      entry.facts.verdictByFocus.push({ focus: index, ...facts });
      if (c.width < 800 && index === c.focus[0]) {
        // Narrow builds: the report is one long scroll; capture it a screen at a time.
        for (let step = 1; step <= 4; step += 1) {
          const moved = await page.evaluate(() => {
            const root = document.querySelector('[data-awwv-endgame-surface="verdict"]');
            const panes = Array.from(root.querySelectorAll('*')).filter((n) => n instanceof HTMLElement && ['auto', 'scroll'].includes(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 40);
            panes.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
            const pane = panes[0];
            if (!pane) return false;
            const before = pane.scrollTop;
            pane.scrollTop = before + Math.round(pane.clientHeight * 0.85);
            return pane.scrollTop > before;
          });
          if (!moved) break;
          await page.waitForTimeout(500);
          await shot(`verdict-focus${index}-scroll${step}`);
        }
      }
    }
  } catch (error) {
    entry.error = String(error?.message ?? error).slice(0, 400);
    report.errors.push(`${c.id}: ${entry.error}`);
    await shot('error').catch(() => undefined);
  }
  report.cases.push(entry);
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ cases: report.cases.map((c) => ({ id: c.id, shots: c.shots.length, error: c.error ?? null })), errors: report.errors }, null, 2));
