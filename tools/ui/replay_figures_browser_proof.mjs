// Replay figures render proof (SC6, 2026-11-13): drives the real dev map renderer, boots an
// RBiH campaign, turns the loaded state into an ended war with a verdict, attaches a replay
// manifest, and renders the Verdict screen's replay section at 2293x960 and 1280x720, EN and
// BCS. Two manifests:
//   - "real":   a v2 manifest written by a headless run (pass --manifest), shown at its last
//               frame, so the casualty and displaced-or-killed figures are the engine's own;
//   - "legacy": the same frames as a v1 manifest, whose figures were always 0; both cards
//               must be hidden (no false zero).
// Screenshots and a JSON report (figure text, smallest visible font in the replay section,
// horizontal overflow) go to --out.
// Usage: node tools/ui/replay_figures_browser_proof.mjs --url http://127.0.0.1:3002 \
//          --manifest runs/<run>/replay_save_manifest.json [--out <dir>]
// --out defaults to $AWWV_COORDINATION_ROOT/surface_steps/replay_figures (see tools/lib/repo_paths.mjs).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { coordinationRoot } from '../lib/repo_paths.mjs';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:3002');
const out = opt('--out', path.join(coordinationRoot(), 'surface_steps', 'replay_figures'));
const manifestPath = opt('--manifest', null);
if (!manifestPath) throw new Error('--manifest <replay_save_manifest.json> is required');
const realManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (realManifest.schema_version !== 2) throw new Error(`expected a v2 manifest, got schema_version ${realManifest.schema_version}`);
const legacyManifest = {
  schema_version: 1,
  frame_count: realManifest.frame_count,
  frames: realManifest.frames.map(({ totalDisplacedOrKilled, ...frame }) => ({ ...frame, totalCasualties: 0, totalDisplaced: 0 })),
};
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

  await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map((r) => r.name);
    const find = (part) => urls.find((u) => u.includes(part));
    const store = await import(find('/store/gameStore.ts'));
    const i18n = await import(find('/i18n/index.ts'));
    window.__replayProof = { store: store.useGameStore, i18n, base: store.useGameStore.getState().loadedGameState };
  });

  async function showVerdict(manifest, locale) {
    await page.evaluate(({ manifest, locale }) => {
      const { store, i18n, base } = window.__replayProof;
      i18n.setLocale(locale);
      const fv = (faction, grade, score) => ({
        faction, pyrrhic_score: score, grade, grade_description: '',
        capital_breakdown: {
          territory_controlled_pct: 30, territory_controlled_km2: 15000,
          military_casualties_inflicted: 0, military_casualties_taken: 0,
          operations_launched: 0, operations_successful: 0,
          refugees_created: 0, refugees_received: 0,
          civilians_under_protection: 0, civilian_casualties_caused: 0,
          peace_plans_accepted: [], peace_plans_rejected: [],
          enclaves_held: [], enclaves_lost: [], war_crimes_events: 0, combat_effective_brigades: 0,
        },
        dimension_grades: [], outcome_class: 'survival', condemnation_flags: [],
      });
      const last = manifest.frames[manifest.frames.length - 1];
      store.setState({
        loadedGameState: {
          ...base,
          gameOver: true,
          gameOutcome: 'timeout_stalemate',
          gameVerdict: {
            outcome_type: 'termination', outcome_label: 'Proof', turn: last.turn, date: last.date ?? '',
            duration_weeks: manifest.frame_count,
            faction_verdicts: { RBiH: fv('RBiH', 'B', 55), RS: fv('RS', 'C', 42), HRHB: fv('HRHB', 'B', 50) },
          },
          replaySaveSequence: undefined,
          replaySaveManifest: manifest,
        },
      });
    }, { manifest, locale });
    const section = page.locator('[data-awwv-endgame-section="replay"]');
    await section.waitFor({ state: 'attached', timeout: 20000 });
    await section.scrollIntoViewIfNeeded();
    // Last frame: the war's end in this run.
    await section.locator('[data-awwv-replay-jump="last"]').click();
    await page.waitForTimeout(400);
    await section.scrollIntoViewIfNeeded();
    return section;
  }

  for (const [kind, manifest] of [['real', realManifest], ['legacy', legacyManifest]]) {
    for (const locale of ['en', 'bcs']) {
      for (const size of SIZES) {
        await page.setViewportSize(size);
        const section = await showVerdict(manifest, locale);
        const file = path.join(out, `replay_${kind}_${locale}_${size.width}x${size.height}.png`);
        await page.screenshot({ path: file });
        const metrics = await section.evaluate((el) => {
          let minFontPx = Infinity;
          let where = '';
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent.trim()) continue;
            const parent = node.parentElement;
            const rect = parent.getBoundingClientRect();
            const style = getComputedStyle(parent);
            if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden' || style.display === 'none') continue;
            const px = parseFloat(style.fontSize);
            if (px < minFontPx) { minFontPx = px; where = `${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 40)}"`; }
          }
          const figure = (name) => el.querySelector(`[data-awwv-replay-figure="${name}"]`)?.innerText.replace(/\s+/g, ' ').trim() ?? null;
          return {
            minFontPx, where,
            casualties: figure('casualties'),
            displacedOrKilled: figure('displaced-or-killed'),
            overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth || el.scrollWidth > el.clientWidth,
            text: el.innerText.replace(/\s+/g, ' ').trim(),
          };
        });
        report.push({ manifest: kind, locale, size: `${size.width}x${size.height}`, file, ...metrics });
      }
    }
  }
  report.push({ pageErrors: errors });
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(out, 'replay_figures_report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map(({ text, ...row }) => row), null, 2));
