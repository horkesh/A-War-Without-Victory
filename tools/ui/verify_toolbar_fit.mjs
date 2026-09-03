// Geometric overflow verification for the presidential toolbar.
//
// WHY THIS EXISTS, AND WHY IT IS NOT A UNIT TEST
// `tests/ui/toolbar_fit_contract.test.ts` pins the source properties that keep
// the toolbar from colliding (nowrap, shrink-0, the responsive chip compaction).
// Source properties are not geometry: they can all be present and the bar can
// still overlap, which is exactly what happened before 2026-09-03. Proving the
// absence of a collision needs a real layout at a real width, so it needs a
// browser — hence a harness rather than a vitest case.
//
// THE MEASUREMENT THAT MATTERS
// `scrollWidth === clientWidth` is BLIND to start-side overflow on a
// `justify-end` flex container: in LTR, scrollWidth only counts overflow past
// the END edge. The toolbar's right cluster is justify-end, so it spills
// LEFTWARD — under the crest — while every scrollWidth check reports a clean
// fit. That blind check is what let a visible collision ship. Measure boxes:
//   1. does any right-cluster child START left of the cluster's own box?
//   2. does any toolbar item's rect intersect the crest's rect?
//   3. does the left group overflow its track to the right?
//   4. did anything wrap to a second row?
//
// USAGE
//   node tools/ui/verify_toolbar_fit.mjs [--save <path>] [--url <origin>] [--out <dir>]
// Requires a served tactical map (see docs/50_launch/marketing/screenshot_plan.md
// for the capture harness) and a save to load. Exits non-zero on any failure.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ORIGIN = arg('url', 'http://127.0.0.1:3002');
const OUT = arg('out', 'tmp-toolbar-fit');
// Default to a TRACKED save so this runs from a clean checkout. A mid/late-war
// state is required, not an opening one: the alert chips the toolbar has to fit
// only appear once reserves and tensions are live, so week 1 would pass
// vacuously. Override with --save to measure a specific state.
const TRACKED_SAVE =
  'docs/40_reports/playtests/evidence/20260731_session16_rs_104week_player/autosaves/final-autosave.json';
const SAVE = arg('save', TRACKED_SAVE);

// 1400 is the app's own former default window width and is where the collision
// was actually visible; 1280 is the design minimum. Keep both.
const WIDTHS = [1920, 1600, 1440, 1400, 1366, 1280];

if (!fs.existsSync(SAVE)) {
  console.error(`save not found: ${SAVE}\npass one with --save <path>`);
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// A pass only means something if the run actually loaded the worst case. The
// chips that made the bar overflow are state-dependent: RESERVE and REVIEWS
// appear only when there are reserves to commit and reviews outstanding, so a
// save without them fits trivially at every width. Track what was on screen and
// say so in the verdict, or a narrow pass gets quoted as a broad one.
const WORST_CASE_CHIPS = ['REVIEWS', 'RESERVE', 'TENSIONS'];
const chipsSeen = new Set();

const browser = await chromium.launch({ headless: true });
let anyFail = false;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  // the DEV chip is a rig artifact, not product state — it must not count as overflow
  await page.addInitScript(() => {
    setInterval(() => {
      document.querySelectorAll('button').forEach((b) => {
        if ((b.textContent || '').trim() === 'DEV') b.style.visibility = 'hidden';
      });
    }, 300);
  });
  await page.goto(`${ORIGIN}/?dev=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(3000);
  await page.keyboard.press('Enter');
  await delay(1200);
  await page.waitForFunction('typeof window.handleManualSaveLoad === "function"', { timeout: 20000 });
  await page.evaluate(async (t) => { await window.handleManualSaveLoad(JSON.parse(t)); }, fs.readFileSync(SAVE, 'utf8'));
  await delay(2000);
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => (b.textContent || '').toUpperCase().includes('CONTINUE'))?.click();
  });
  await delay(3000);

  // clear any turn-start modals; their backdrop intercepts real clicks
  for (let i = 0; i < 6; i += 1) {
    const cleared = await page.evaluate(() => {
      const bd = document.querySelector('[data-testid="modal-backdrop"]');
      if (!bd) return false;
      const b = Array.from(bd.querySelectorAll('button'))
        .find((x) => /review later|acknowledge|close/i.test(x.textContent || ''));
      if (b) { b.click(); return true; }
      return false;
    });
    if (!cleared) break;
    await delay(600);
  }
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button, [role="button"]'))
      .find((b) => (b.textContent || '').trim() === 'WAR MAP')?.click();
  });
  await delay(2500);

  const m = await page.evaluate(() => {
    const desk = document.querySelector('[data-testid="toolbar-route-desk"]');
    if (!desk) return { error: 'toolbar not mounted' };
    const bar = desk.closest('div.fixed');
    const [leftCol, , rightCol] = Array.from(bar.children);
    const crestEl = document.querySelector('button[data-awwv-counter-occluder="true"]');
    const crest = crestEl ? crestEl.getBoundingClientRect() : null;

    const boxOf = (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right) }; };
    const kids = (col) => Array.from(col.children).filter((c) => c.getBoundingClientRect().width > 0);

    const rightKids = kids(rightCol);
    const leftKids = kids(leftCol);
    const rightBox = boxOf(rightCol);
    const leftBox = boxOf(leftCol);

    return {
      // >0 means the cluster is spilling leftward past its own track
      rightStartOverflow: rightBox.l - Math.min(...rightKids.map((k) => boxOf(k).l)),
      leftEndOverflow: Math.max(...leftKids.map((k) => boxOf(k).r)) - leftBox.r,
      collides: crest
        ? [...rightKids, ...leftKids]
            .filter((k) => { const b = boxOf(k); return b.r > crest.left + 4 && b.l < crest.right - 4; })
            .map((k) => (k.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28))
        : [],
      chips: rightKids.map((k) => (k.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24)).filter(Boolean),
      wrapped: rightKids.some((k) => k.getBoundingClientRect().height > 40),
    };
  });

  const bad = Boolean(m.error) || m.rightStartOverflow > 0 || m.leftEndOverflow > 0 || m.collides.length > 0 || m.wrapped;
  if (bad) anyFail = true;
  for (const chip of m.chips ?? []) {
    for (const kind of WORST_CASE_CHIPS) if (chip.toUpperCase().includes(kind)) chipsSeen.add(kind);
  }
  console.log(
    `${width}px  ${bad ? 'FAIL' : 'ok  '}  ` +
    (m.error
      ? m.error
      : `startOverflow=${m.rightStartOverflow} leftOverflow=${m.leftEndOverflow} ` +
        `wrapped=${m.wrapped} collides=${JSON.stringify(m.collides)} chips=${JSON.stringify(m.chips)}`),
  );
  await page.screenshot({ path: path.join(OUT, `fit_${width}.png`), clip: { x: 0, y: 0, width, height: 120 } });
  await page.close();
}

await browser.close();

const missing = WORST_CASE_CHIPS.filter((c) => !chipsSeen.has(c));
if (anyFail) {
  console.log('RESULT: FAIL');
} else if (missing.length) {
  console.log(
    `RESULT: PASS, PARTIAL COVERAGE — no start-side overflow, crest collision or wrap at any ` +
    `width, but this save never showed ${missing.join('/')}, so the widest chip set was NOT ` +
    `measured. Re-run with a save that has them before treating this as full proof.`,
  );
} else {
  console.log(
    'RESULT: PASS, FULL COVERAGE (no start-side overflow, no crest collision, no wrap at any ' +
    'width, with the complete chip set on screen)',
  );
}
process.exit(anyFail ? 1 : 0);
