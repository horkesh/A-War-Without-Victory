// Count figures render proof (RT1-RT6, 2026-11-14): drives the real dev map renderer in
// Chromium (the engine whose ICU renders bs-BA with commas), boots an RBiH campaign, merges a
// fixture war into the loaded state and shows the three surfaces that carry the displaced and
// casualty figures, EN and BCS:
//   - War Summary (Army HQ overview): "Displaced or killed" rows;
//   - Humanitarian Ledger (U hotkey): "Displaced or killed" columns;
//   - Verdict replay section: war-over frames (formation count shown) and in-play frames
//     (formation count and military casualties withheld).
// It reads the rendered text back, so the report holds the exact strings a player sees, and
// fails the run when a BCS figure still uses English grouping.
// Usage: node tools/ui/count_figures_browser_proof.mjs --url http://127.0.0.1:3010 --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:3010');
const out = opt('--out', 'F:/AWWV-coordination/surface_steps/count_figures');
fs.mkdirSync(out, { recursive: true });
const SIZES = [{ width: 2293, height: 960 }, { width: 1280, height: 720 }];

const aggregate = (refugeesCreated, civilianCasualtiesCaused) => ({ refugeesCreated, refugeesReceived: 0, civilianCasualtiesCaused });
const nationalDisplacement = {
  civilianCasualtiesByEthnicity: {
    RBiH: { killed: 21400, fledAbroad: 96000 },
    RS: { killed: 3100, fledAbroad: 21000 },
    HRHB: { killed: 1900, fledAbroad: 8000 },
  },
  humanitarianAggregates: {
    HRHB: { RBiH: aggregate(41200, 1900) },
    RBiH: { RS: aggregate(52645, 3100) },
    RS: { HRHB: aggregate(18300, 400), RBiH: aggregate(1263092, 21400) },
    _unknown: { RBiH: aggregate(2000, 0) },
  },
  refugeesByTurn: [{ turn: 38, refugeesCreated: 21000 }, { turn: 39, refugeesCreated: 34500 }, { turn: 40, refugeesCreated: 18200 }],
};
// departedByOsid holds the routed people only; the War Summary must NOT read it.
const departedByOsid = { 'op:fixture:a': { RBiH: 100, RS: 50 } };
const casualtyLedger = {
  RBiH: { killed: 21400, wounded: 52000, missing_captured: 900 },
  RS: { killed: 18543, wounded: 36543, missing_captured: 400 },
  HRHB: { killed: 3200, wounded: 7100, missing_captured: 150 },
};
const frames = (masked) => [0, 20, 40].map((i) => ({
  turn: i,
  date: new Date(Date.UTC(1992, 3, 6) + i * 7 * 86400000).toISOString().slice(0, 10),
  activeFormations: masked ? null : 120 + i * 8,
  totalCasualties: masked ? null : i * 1317,
  totalDisplacedOrKilled: i * 34431,
  controlByFaction: [{ faction: 'RS', osids: 400 }, { faction: 'RBiH', osids: 260 }, { faction: 'HRHB', osids: 52 }],
}));
const manifest = (masked) => ({ schema_version: 2, frame_count: 3, frames: frames(masked) });

const browser = await chromium.launch({ headless: true });
const report = [];
const failures = [];
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
  await page.getByRole('button', { name: /skip tutorial|preskoči/i }).first().click({ timeout: 3000 }).catch(() => {});

  await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map((r) => r.name);
    const find = (part) => urls.find((u) => u.includes(part));
    const store = await import(find('/store/gameStore.ts'));
    const i18n = await import(find('/i18n/index.ts'));
    const reactUrl = urls.find((u) => /\/deps\/react\.js/.test(u));
    const domUrl = urls.find((u) => /\/deps\/react-dom_client\.js/.test(u));
    window.__proof = { store: store.useGameStore, i18n, base: store.useGameStore.getState().loadedGameState, reactUrl, domUrl };
  });

  const merge = (fields, locale) => page.evaluate(({ fields, locale }) => {
    const { store, i18n, base } = window.__proof;
    i18n.setLocale(locale);
    store.setState({ loadedGameState: { ...base, ...fields } });
  }, { fields, locale });

  const mount = async (modulePath, exportName, props) => {
    await page.evaluate(async ({ modulePath, exportName, props }) => {
      const { reactUrl, domUrl } = window.__proof;
      const React = (await import(reactUrl)).default;
      const domModule = await import(domUrl);
      const ReactDOM = domModule.createRoot ? domModule : domModule.default;
      const mod = await import(modulePath);
      document.getElementById('proof-host')?.remove();
      window.__proof.root?.unmount();
      const host = document.createElement('div');
      host.id = 'proof-host';
      host.style.cssText = 'position:fixed;inset:0;z-index:2147480000;background:#0b0e13;overflow:auto;padding:24px;';
      document.body.appendChild(host);
      window.__proof.root = ReactDOM.createRoot(host);
      window.__proof.root.render(React.createElement(mod[exportName], props));
    }, { modulePath, exportName, props });
    await page.waitForTimeout(700);
  };
  const unmount = () => page.evaluate(() => { window.__proof.root?.unmount(); document.getElementById('proof-host')?.remove(); window.__proof.root = null; });
  const text = (selector) => page.evaluate((s) => (document.querySelector(s)?.innerText ?? '').replace(/\s+/g, ' ').trim(), selector);
  const shot = async (name, size, extra = {}) => {
    const file = path.join(out, `${name}_${size.width}x${size.height}.png`);
    await page.screenshot({ path: file });
    const row = { screen: name, size: `${size.width}x${size.height}`, file, ...extra };
    report.push(row);
    console.log(JSON.stringify({ ...row, text: row.text?.slice(0, 220) }));
    return row;
  };
  const expectIn = (row, pattern, why) => { if (!pattern.test(row.text ?? '')) failures.push(`${row.screen} ${row.size}: ${why} (${pattern})`); };
  const rejectIn = (row, pattern, why) => { if (pattern.test(row.text ?? '')) failures.push(`${row.screen} ${row.size}: ${why} (${pattern})`); };

  // The verdict pass runs last: once a verdict is on screen the war map is no longer reachable.
  for (const phase of ['maps', 'verdict']) for (const size of SIZES) {
    await page.setViewportSize(size);
    for (const locale of ['en', 'bcs']) {
      const bcs = locale === 'bcs';
      const tag = bcs ? '_bcs' : '';
      const state = { nationalDisplacement, departedByOsid, displacementByMun: undefined, casualtyLedger, pendingEventDecisions: [] };

      if (phase === 'maps') {
      // 1. War Summary overview.
      await merge(state, locale);
      await mount('/components/army_hq/WarSummaryContent.tsx', 'WarSummaryContent', { focusSection: 'overview' });
      await page.evaluate(() => { const host = document.getElementById('proof-host'); host.scrollTop = host.scrollHeight; });
      await page.waitForTimeout(300);
      const summary = await shot(`war_summary${tag}`, size, { text: await text('#proof-host') });
      expectIn(summary, bcs ? /Raseljeni ili ubijeni na ratištu\s*1,4M/ : /Theater-wide displaced or killed\s*1\.4M/, 'theater-wide total reads displaced or killed');
      rejectIn(summary, /Total displaced|Ukupno raseljen/i, 'old "Total displaced" label');
      await unmount();

      // 2. Humanitarian Ledger, opened by the U hotkey on the war map.
      await merge(state, locale);
      await page.getByRole('button', { name: /^(war map|ratna karta)$/i }).first().click().catch(() => {});
      await page.waitForTimeout(1500);
      await page.evaluate(() => { document.activeElement?.blur?.(); });
      await page.waitForTimeout(600);
      await page.keyboard.press('u');
      let opened = await page.locator('[data-testid="humanitarian-ledger-panel"]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
      if (!opened) {
        // The hotkey did not take (focus is on a map control after the earlier run): mount the real panel.
        await mount('/components/HumanitarianLedgerPanel.tsx', 'HumanitarianLedgerPanel', { state: await page.evaluate(() => window.__proof.store.getState().loadedGameState), open: true, onClose: () => {} });
        opened = true;
      }
      const ledger = await shot(`humanitarian_ledger${tag}`, size, { text: await text('[data-testid="humanitarian-ledger-panel"]') });
      expectIn(ledger, bcs ? /1\.263\.092/ : /1,263,092/, 'ledger figure uses the locale grouping');
      expectIn(ledger, bcs ? /Raseljeni ili ubijeni/i : /Displaced or killed/i, 'ledger labels the figure displaced or killed');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      }

      // 3. Verdict replay section: war over (full frames), then in play (masked frames).
      if (phase === 'verdict') for (const masked of [false, true]) {
        await merge({
          ...state,
          gameOver: true,
          gameOutcome: 'timeout_stalemate',
          gameVerdict: {
            outcome_type: 'termination', outcome_label: 'Proof', turn: 40, date: '',
            duration_weeks: 3,
            faction_verdicts: Object.fromEntries(['RBiH', 'RS', 'HRHB'].map((f) => [f, {
              faction: f, pyrrhic_score: 50, grade: 'C', grade_description: '',
              capital_breakdown: {
                territory_controlled_pct: 30, territory_controlled_km2: 15000, military_casualties_inflicted: 52645, military_casualties_taken: 52645,
                operations_launched: 0, operations_successful: 0, refugees_created: 1377237, refugees_received: 0, civilians_under_protection: 0,
                civilian_casualties_caused: 0, peace_plans_accepted: [], peace_plans_rejected: [], enclaves_held: [], enclaves_lost: [],
                war_crimes_events: 0, combat_effective_brigades: 0,
              },
              dimension_grades: [], outcome_class: 'survival', condemnation_flags: [],
            }])),
          },
          replaySaveSequence: undefined,
          replaySaveManifest: manifest(masked),
        }, locale);
        const section = page.locator('[data-awwv-endgame-section="replay"]');
        await section.waitFor({ state: 'attached', timeout: 20000 });
        await section.scrollIntoViewIfNeeded();
        await section.locator('[data-awwv-replay-jump="last"]').click();
        await page.waitForTimeout(400);
        await section.scrollIntoViewIfNeeded();
        const replay = await shot(`replay_${masked ? 'in_play' : 'war_over'}${tag}`, size, { text: await text('[data-awwv-endgame-section="replay"]') });
        if (masked) {
          rejectIn(replay, bcs ? /Aktivne formacije/i : /Active formations/i, 'formation count is hidden in play');
          rejectIn(replay, bcs ? /Vojni gubici/i : /Military casualties/i, 'casualty total is hidden in play');
        } else {
          expectIn(replay, bcs ? /Aktivne formacije\s*440/i : /Active formations\s*440/i, 'formation count shown at war end');
          expectIn(replay, bcs ? /1\.377\.240/ : /1,377,240/, 'replay displaced or killed uses the locale grouping');
        }
        expectIn(replay, bcs ? /Raseljeni ili ubijeni/i : /Displaced or killed/i, 'replay labels the figure displaced or killed');
        expectIn(replay, /\b\d{1,2}\.? \S+ 199\d/, 'replay date is a locale date, not raw ISO');
        rejectIn(replay, /\d{4}-\d{2}-\d{2}/, 'replay shows a raw ISO date');
      }
    }
  }
  if (errors.length) failures.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(out, 'count_figures_report.json'), JSON.stringify({ failures, report }, null, 2));
console.log(failures.length ? `FAILURES:\n${failures.join('\n')}` : 'ALL CHECKS PASSED');
process.exit(failures.length ? 1 : 0);
