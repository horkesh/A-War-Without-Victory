// Step 4 render proof: drives the real dev map renderer and renders each records /
// end-state surface at 2293x960 and 1280x720, screenshots it, and measures the
// smallest computed font size of visible text inside the surface.
// Usage: node step4_drive.mjs --url http://127.0.0.1:5199 --out F:/AWWV-coordination/surface_steps/step4
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5199');
const out = opt('--out', 'F:/AWWV-coordination/surface_steps/step4');
const only = opt('--only', null);
fs.mkdirSync(out, { recursive: true });

const SIZES = [{ width: 2293, height: 960 }, { width: 1280, height: 720 }];

function makeFV(faction, score, extra = {}) {
  return {
    faction, pyrrhic_score: score, grade: score > 50 ? 'B' : score > 35 ? 'C' : 'D',
    grade_description: 'Acceptable compromise',
    capital_breakdown: {
      territory_controlled_pct: 30, territory_controlled_km2: 15000,
      military_casualties_inflicted: 20000, military_casualties_taken: 40000,
      operations_launched: 50, operations_successful: 15,
      refugees_created: 500000, refugees_received: 80000,
      civilians_under_protection: 150000, civilian_casualties_caused: 3000,
      peace_plans_accepted: [], peace_plans_rejected: [],
      enclaves_held: ['gorazde'], enclaves_lost: ['srebrenica'],
      war_crimes_events: 2, combat_effective_brigades: 20,
    },
    dimension_grades: [
      ['military_credibility', 'Military Credibility', 48, 'C'],
      ['territorial_legitimacy', 'Territorial Legitimacy', 61, 'B'],
      ['international_standing', 'International Standing', 70, 'B'],
      ['patron_confidence', 'Patron Confidence', 44, 'C'],
      ['internal_cohesion', 'Internal Cohesion', 52, 'C'],
      ['negotiating_leverage', 'Negotiating Leverage', 39, 'D'],
    ].map(([dimension, label, s, grade]) => ({ dimension, label, score: s, grade })),
    outcome_class: 'survival', condemnation_flags: [],
    ...extra,
  };
}

const costLedger = {
  war_duration_weeks: 170, total_military_killed: 46500, total_civilian_killed: 38000,
  entries: [], rupture_consequences: [],
  findings: [{
    id: 'finding_displacement', category: 'record', severity: 'grave', faction: 'RS',
    title: 'Civilian displacement record',
    text: 'The ledger records forced displacement across the Drina valley.',
    sources: ['ICTY'],
  }],
  operation_opportunities: {
    total_decisions: 2, approved: 1, declined: 1, expired: 0, completed: 1, successes: 1, failures: 0, by_faction: {},
    entries: [
      { proposal_id: 'p1', opportunity_id: 'sana_95', display_name: 'Operation Sana', faction: 'RBiH', response: 'approve', response_turn: 175, exit_class: 'partial_success', total_attacks: 7, objectives_targeted: 2, objectives_captured: 1 },
      { proposal_id: 'p2', opportunity_id: 'probe', display_name: 'Ozren probe', faction: 'RBiH', response: 'decline', response_turn: 178, total_attacks: 0, objectives_targeted: 0, objectives_captured: 0 },
    ],
  },
};
const historicalComparison = {
  duration_delta_weeks: -12, territory_divergence: { RS: 9.0, RBiH_HRHB_Federation: -9.0 },
  casualty_ratio: 0.78, displacement_ratio: 0.89, rupture_divergence: [],
  divergence_notes: ['War lasted 12 weeks shorter than the historical 182 weeks', 'RS controlled 9.0% more territory than the Dayton baseline'],
  milestone_comparison: [],
};
const controlBySettlement = Object.fromEntries(Array.from({ length: 712 }, (_, i) => [`op:x:${i}`, i < 300 ? 'RS' : i < 560 ? 'RBiH' : 'HRHB']));

const verdictState = (withVerdict) => ({
  turn: 170, phase: 'war', player_faction: 'RBiH', gameOver: true, gameOutcome: 'timeout_stalemate',
  formations: [], controlBySettlement,
  gameVerdict: withVerdict ? {
    outcome_type: 'termination', outcome_label: 'Ceasefire', turn: 170, date: '1995-08-14', duration_weeks: 170,
    faction_verdicts: {
      RBiH: makeFV('RBiH', 55.0),
      RS: makeFV('RS', 28.4, { outcome_class: 'failure', condemnation_flags: ['civilian_atrocities'] }),
      HRHB: makeFV('HRHB', 42.1, { outcome_class: 'negotiated_escape' }),
    },
  } : undefined,
  costLedger, historicalComparison,
  metadata: { turn: 170, date: '1995-08-14' },
});

const peaceState = {
  turn: 3, phase: 'peace', player_faction: 'RBiH', formations: [], controlBySettlement: {},
  peaceFactions: [
    { id: 'RBiH', capital: 42, declared: false, declaration_pressure: 10 },
    { id: 'RS', capital: 20, declared: true, declaration_pressure: 100 },
    { id: 'HRHB', capital: 30, declared: false, declaration_pressure: 55 },
  ],
  peaceAllianceValue: 0.3,
  peaceReferendum: { held: false, deadline_turn: 5 },
  peaceEvents: [{ type: 'staged_investment', faction: 'RBiH' }, { type: 'alliance_shift', faction: 'HRHB' }],
  metadata: { turn: 3, date: '1991-12-02' },
};

const panelState = {
  turn: 60, phase: 'war', player_faction: 'RBiH', formations: [], controlBySettlement: {},
  metadata: { turn: 60, date: '1993-05-24' },
  factionReserves: { RBiH: { generalSupply: 12, heavyMunitions: 55 } },
  productionFacilities: [
    { id: 'a', name: 'Bugojno Works', type: 'small_arms', municipality: 'bugojno', condition: 0.5, controller: 'RBiH' },
    { id: 'b', name: 'Zenica Steelworks', type: 'heavy_equipment', municipality: 'zenica', condition: 0.8, controller: 'RBiH' },
    { id: 'c', name: 'Vitez Explosives', type: 'ammunition', municipality: 'vitez', condition: 0.3, controller: 'RBiH' },
  ],
  smugglingRoutes: [
    { id: 'r1', name: 'Igman road', faction: 'RBiH', capacity: 35, disrupted: true, active_turns: 2 },
    { id: 'r2', name: 'Tarčin track', faction: 'RBiH', capacity: 62, disrupted: false, active_turns: 6 },
  ],
  embargoStatus: { RBiH: { pipeline: 0.4, smuggling: 0.35 } },
  enclaveResilience: {
    srebrenica: { display_name: 'Srebrenica', resilience: 6.5, isolation_turns: 9, hardening_active: true, supply_state: 'critical', faction: 'RBiH', airdrop_status: 'receiving' },
    zepa: { display_name: 'Žepa', resilience: 11.2, isolation_turns: 7, hardening_active: false, supply_state: 'strained', faction: 'RBiH', airdrop_status: 'receiving' },
    gorazde: { display_name: 'Goražde', resilience: 18.0, isolation_turns: 5, hardening_active: false, supply_state: 'strained', faction: 'RBiH', airdrop_status: 'receiving' },
    bihac: { display_name: 'Bihać', resilience: 24.0, isolation_turns: 2, hardening_active: false, supply_state: 'adequate', faction: 'RBiH', airdrop_status: 'not_isolated_long_enough' },
  },
  nationalDisplacement: {
    civilianCasualtiesByEthnicity: { RBiH: { killed: 21400, fledAbroad: 310000 }, RS: { killed: 4100, fledAbroad: 96000 }, HRHB: { killed: 2200, fledAbroad: 120000 } },
    humanitarianAggregates: {
      RS: { RBiH: { refugeesCreated: 410000, civilianCasualtiesCaused: 15200 }, HRHB: { refugeesCreated: 52000, civilianCasualtiesCaused: 900 } },
      HRHB: { RBiH: { refugeesCreated: 98000, civilianCasualtiesCaused: 1900 } },
      RBiH: { RS: { refugeesCreated: 61000, civilianCasualtiesCaused: 1100 }, HRHB: { refugeesCreated: 27000, civilianCasualtiesCaused: 600 } },
    },
    refugeesByTurn: Array.from({ length: 60 }, (_, i) => ({ turn: i + 1, refugeesCreated: Math.round(20000 * Math.exp(-((i - 8) ** 2) / 60) + 3000 + (i % 7) * 400) })),
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
    await page.keyboard.press('Enter'); // past the splash
    await page.waitForTimeout(1500);
    // Start a real RBiH campaign in the browser build so the surfaces sit over the real game.
    await page.getByRole('button', { name: /new war|novi rat/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Republic of Bosnia/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /take command/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /^begin/i }).click();
    await page.getByRole('button', { name: /^war map$/i }).waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(2500);
    if (process.env.STEP4_DEBUG_SHOT) await page.screenshot({ path: path.join(out, `boot_${size.width}x${size.height}.png`) });
  }

  // Import the app's own module instances (same URL as the app loaded) and expose helpers.
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
      window.__step4 = { store: store.useGameStore, i18n, reactUrl, domUrl };
    });
  }

  async function mountComponent(modulePath, exportName, props) {
    await page.evaluate(async ({ modulePath, exportName, props }) => {
      const { reactUrl, domUrl } = window.__step4;
      const React = (await import(reactUrl)).default;
      const domModule = await import(domUrl);
      const ReactDOM = domModule.createRoot ? domModule : domModule.default;
      const mod = await import(modulePath);
      let host = document.getElementById('step4-host');
      if (host) { window.__step4.root?.unmount(); host.remove(); }
      host = document.createElement('div');
      host.id = 'step4-host';
      // The app mounts these inside its own tree at z-[70] (as Diplomacy). This host is a
      // sibling after #root, so give it its own top layer; the surface keeps its own frame.
      host.style.cssText = 'position:fixed;inset:0;z-index:2147480000;pointer-events:none;';
      document.body.appendChild(host);
      window.__step4.root = ReactDOM.createRoot(host);
      const resolved = props.state === '__store__' ? { ...props, state: window.__step4.store.getState().loadedGameState } : props;
      window.__step4.root.render(React.createElement(mod[exportName], { ...resolved, onClose: () => {} }));
    }, { modulePath, exportName, props });
    await page.waitForTimeout(600);
  }

  async function unmountComponent() {
    await page.evaluate(() => { window.__step4.root?.unmount(); document.getElementById('step4-host')?.remove(); window.__step4.root = null; });
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
        if (!el) continue;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (cs.visibility === 'hidden' || cs.display === 'none' || rect.width === 0 || rect.height === 0) continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        const size = parseFloat(cs.fontSize);
        if (size < min) { min = size; where = `${el.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 40)}"`; }
      }
      // Opaque plane: walk up to the first element with a background colour.
      let frame = root; let bg = '';
      for (let el = root; el; el = el.parentElement) {
        const c = getComputedStyle(el).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { frame = el; bg = c; break; }
      }
      const blur = Array.from(root.querySelectorAll('*')).concat([root]).some((el) => {
        const cs = getComputedStyle(el);
        return (cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none');
      });
      const r = root.getBoundingClientRect();
      return { minFontPx: min, where, frameBackground: bg, frameTag: frame.tagName.toLowerCase(), backdropBlur: blur, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, overflowX: document.documentElement.scrollWidth > window.innerWidth };
    }, selector);
  }

  async function shot(name, size, selector, extra = {}) {
    const file = path.join(out, `${name}_${size.width}x${size.height}.png`);
    await page.screenshot({ path: file });
    const m = await measure(selector);
    const row = { screen: name, size: `${size.width}x${size.height}`, file, ...m, ...extra };
    report.push(row);
    console.log(JSON.stringify(row));
  }

  const setStore = (partial) => page.evaluate((p) => window.__step4.store.setState(p), partial);
  const setLocale = (l) => page.evaluate((l) => window.__step4.i18n.setLocale(l), l);

  for (const size of SIZES) {
    for (const locale of ['en', 'bcs']) {
      const tag = locale === 'en' ? '' : '_bcs';
      await boot(size);
      await installHelpers();
      await setLocale(locale);
      // Keep the real campaign state; the panels get fixture figures merged into it.
      await page.evaluate(() => { window.__step4.real = window.__step4.store.getState().loadedGameState; });
      const mergeReal = (fields) => page.evaluate((f) => {
        const merged = { ...window.__step4.real, ...f };
        window.__step4.store.setState({ loadedGameState: merged });
        return true;
      }, fields);

      if (!only || only === 'codex') {
        await page.evaluate(() => window.__step4.store.setState({ codexOpen: true }));
        await page.waitForTimeout(800);
        // Select the first visible essay so the reading sheet shows.
        const row = page.locator('[data-testid="codex-essay-row"]:not([disabled])').first();
        if (await row.count()) await row.click();
        await page.waitForTimeout(400);
        await shot(`codex${tag}`, size, '[data-testid="codex-panel"] section[role="dialog"]');
        await setStore({ codexOpen: false });
      }

      if (!only || only === 'panels') {
        const { factionReserves, productionFacilities, smugglingRoutes, embargoStatus, enclaveResilience, nationalDisplacement } = panelState;
        await mergeReal({ factionReserves, productionFacilities, smugglingRoutes, embargoStatus, enclaveResilience, nationalDisplacement });
        await mountComponent('/components/EconomyPanel.tsx', 'EconomyPanel', { state: '__store__' });
        await shot(`economy${tag}`, size, '[data-testid="economy-panel"]');
        await mountComponent('/components/EnclaveDashboard.tsx', 'EnclaveDashboard', { state: '__store__', open: true });
        await shot(`enclave${tag}`, size, '[data-testid="enclave-dashboard"]');
        await unmountComponent();
      }

      // The War Map: the ledger's U hotkey and the pre-war card both live on the map screen.
      await page.getByRole('button', { name: /^(war map|ratna karta)$/i }).first().click().catch(() => {});
      await page.waitForTimeout(3000);
      // A fresh campaign shows the first-run tutorial on the map; skip it.
      await page.getByRole('button', { name: /skip tutorial|preskoči/i }).first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);

      if (!only || only === 'panels') {
        const { nationalDisplacement } = panelState;
        await mergeReal({ nationalDisplacement, pendingEventDecisions: [] });
        await page.waitForTimeout(500);
        // The ledger has a real in-game entry point: the U hotkey. Open it through the app.
        await page.keyboard.press('u');
        await page.locator('[data-testid="humanitarian-ledger-panel"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        await shot(`humanitarian_ledger${tag}`, size, '[data-testid="humanitarian-ledger-panel"]', { openedVia: 'U hotkey in the app' });
        const opened = await page.locator('[data-testid="humanitarian-ledger-panel"]').count();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const stillOpen = await page.locator('[data-testid="humanitarian-ledger-panel"]').count();
        report.push({ screen: `humanitarian_ledger${tag}`, size: `${size.width}x${size.height}`, opened: opened > 0, escClosed: opened > 0 && stillOpen === 0 });
        await mergeReal({});
      }

      if (!only || only === 'peace') {
        // The pre-war card docks over the map.
        const { formations: _f, controlBySettlement: _c, ...peaceFields } = peaceState;
        // The real campaign opens with an event decision; the pre-war phase has none.
        await mergeReal({ ...peaceFields, pendingEventDecisions: [] });
        await page.waitForTimeout(800);
        // The first-run tutorial re-mounts on the merged state; hide it for this shot only.
        await page.evaluate(() => document.querySelectorAll('[data-testid="onboarding-overlay"]').forEach((el) => { el.style.display = 'none'; }));
        await page.waitForTimeout(400);
        await shot(`peace_status${tag}`, size, '[data-testid="peace-status-panel"]');
        await mergeReal({});
      }

      if (!only || only === 'verdict') {
        await setStore({ loadedGameState: verdictState(true), wrappedOpen: false });
        await page.waitForTimeout(800);
        await shot(`verdict${tag}`, size, '[data-awwv-endgame-surface="verdict"] [role="dialog"]');
        // Scroll the report column to show the reckoning further down.
        await page.evaluate(() => {
          const col = document.querySelector('[data-awwv-mobile-verdict-flow]');
          if (col) col.scrollTop = col.scrollHeight * 0.55;
        });
        await page.waitForTimeout(300);
        await shot(`verdict_reckoning${tag}`, size, '[data-awwv-endgame-surface="verdict"] [role="dialog"]');
        await setStore({ loadedGameState: verdictState(false) });
        await page.waitForTimeout(600);
        await shot(`game_over_fallback${tag}`, size, '[data-awwv-endgame-surface="fallback"] [role="dialog"]');
        await setStore({ loadedGameState: null });
        await page.waitForTimeout(300);
        await mountComponent('/components/GameOverModal.tsx', 'GameOverModal', {});
        await setStore({ loadedGameState: { ...verdictState(false), gameOver: true } });
        // The fallback VerdictScreen would sit on top; hide it for the GameOverModal shot.
        await page.evaluate(() => document.querySelectorAll('[data-awwv-endgame-surface]').forEach((el) => { el.style.display = 'none'; }));
        await page.waitForTimeout(500);
        await shot(`game_over_modal${tag}`, size, '[role="dialog"][aria-labelledby="game-over-title"]');
        await unmountComponent();
        await setStore({ loadedGameState: null });
      }
      await setLocale('en'); // the locale persists; the next boot drives English menus
    }
  }
  report.push({ pageErrors: errors });
} finally {
  fs.writeFileSync(path.join(out, 'step4_report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
