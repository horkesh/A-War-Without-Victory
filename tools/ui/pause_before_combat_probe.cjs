// Real-app probe for PAUSE BEFORE COMBAT (Electron via Playwright `_electron`).
// Usage: node tools/ui/pause_before_combat_probe.cjs <repoDir> <outDir> <mode> [maxTurns]
//   mode: <path>-<action>
//     path:   click  — warroom toolbar ADVANCE (warroom-toolbar-advance)
//             desk   — President's desk advance control -> AdvanceTurnModal -> confirm
//             map    — War Map, then the map toolbar "ADVANCE WEEK"
//             bridge — window.awwv.advanceTurn through the embedded bridge (no UI click)
//     action: answer (pick the first response in the paused card) | continue ("Continue turn")
// Starts an RS historical campaign through the menus; the turn-2 decision
// rs_paramilitary_policy_1992 triggers the pause. Instrumentation records every game-state /
// pause-status event seen by the shell window and by the embedded React frame. Screenshots
// land in <outDir>. Exits non-zero when the paused card is not visible and clickable, or the
// turn does not complete with the expected decision state. Requires the built desktop sim and
// warroom bundles (or a Vite dev server on 3002-3005 for the map).
const path = require('node:path');
const fs = require('node:fs');
const [repo, outDir, mode = 'click-answer', maxTurnsArg] = process.argv.slice(2);
// A worktree without its own node_modules resolves packages through the nearest ancestor that has them.
const resolvePackage = (pkg) => {
  for (let dir = path.resolve(repo); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', pkg);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (path.dirname(dir) === dir) return path.join(repo, 'node_modules', pkg);
  }
};
const { _electron: electron } = require(resolvePackage('playwright'));
const maxTurns = Number(maxTurnsArg ?? '6');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });
const log = (...a) => { const line = a.join(' '); console.log(line); fs.appendFileSync(path.join(outDir, 'probe.log'), line + '\n'); };
const failures = [];
const expect = (cond, msg) => { log(`  ${cond ? 'PASS' : 'FAIL'}: ${msg}`); if (!cond) failures.push(msg); };

const instrument = () => {
  window.__probe = { events: [] };
  const summarize = (json) => {
    try {
      const s = JSON.parse(json);
      const pend = (s?.pendingEventDecisions ?? s?.military?.pending_event_decisions ?? []).map((d) => d.event_id);
      return { turn: s?.meta?.turn ?? s?.turn ?? null, pending: pend };
    } catch { return { parseError: true }; }
  };
  window.awwv.subscribeGameStateUpdated((json) => window.__probe.events.push({ k: 'state', ...summarize(json) }));
  window.awwv.subscribeTurnPausedForDecisions?.((st) => window.__probe.events.push({ k: 'pause', st }));
};

async function domSnapshot(frame) {
  return frame.evaluate(() => {
    const txt = document.body.innerText || '';
    const card = document.querySelector('[data-testid="event-decision-turn-paused"]');
    const r = card?.getBoundingClientRect();
    const cont = document.querySelector('[data-testid="event-decision-continue-turn"]');
    const cr = cont?.getBoundingClientRect();
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
      .map((el) => `${el.getAttribute('aria-labelledby') ?? el.getAttribute('data-testid') ?? 'dialog'}:${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    let topAtContinue = null;
    if (cr && cr.width > 0) {
      const el = document.elementFromPoint(cr.x + cr.width / 2, cr.y + cr.height / 2);
      topAtContinue = el ? (el.closest('[data-testid="event-decision-continue-turn"]') ? 'continue-button' : (el.getAttribute('data-testid') ?? el.tagName)) : null;
    }
    return {
      pausedText: /paused before combat/i.test(txt),
      card: r ? `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.x)},${Math.round(r.y)}` : null,
      continueBtn: cr ? `${Math.round(cr.width)}x${Math.round(cr.height)}` : null,
      topAtContinue,
      dialogs,
    };
  });
}

(async () => {
  const userDataDir = path.join(outDir, 'user-data');
  const app = await electron.launch({
    cwd: repo,
    args: ['.', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    timeout: 120000,
  });
  try {
    let page = null;
    let surface = null;
    for (let i = 0; i < 480 && !surface; i++) {
      for (const w of app.windows()) {
        for (const f of w.frames()) {
          const splash = await f.getByTestId('opening-splash-art').isVisible().catch(() => false);
          const newWar = await f.getByRole('button', { name: /^New War$/i }).first().isVisible().catch(() => false);
          if (splash || newWar) { surface = f; page = w; break; }
        }
        if (surface) break;
      }
      if (!surface) await sleep(250);
    }
    if (!surface) throw new Error('no campaign opening surface');
    log('frame url:', surface.url());
    if (await surface.getByTestId('opening-splash-art').isVisible().catch(() => false)) {
      await surface.locator('[aria-labelledby="opening-splash-title"] button').first().click({ timeout: 30000 });
    }
    await surface.getByRole('button', { name: /^New War$/i }).first().click({ timeout: 60000 });
    await surface.getByTestId('main-menu-faction-RS').click({ timeout: 30000 });
    await surface.getByRole('button', { name: /^Take command$/i }).first().click({ timeout: 30000 });
    await surface.getByRole('radio', { name: /^Let history run as it did$/i }).first().click({ timeout: 30000 });
    const begin = surface.getByRole('button', { name: /^Begin$/i }).first();
    await begin.click({ timeout: 30000 });
    await begin.waitFor({ state: 'hidden', timeout: 120000 });
    const frame = surface;
    log(`campaign started through the menus (mode=${mode})`);
    await sleep(8000);
    await frame.evaluate(instrument);
    await page.mainFrame().evaluate(instrument).catch((e) => log('shell instrument failed', String(e)));
    await page.screenshot({ path: path.join(outDir, '00-start.png') });

    const useBridge = mode.startsWith('bridge');
    const onMap = mode.startsWith('map-');
    const onDesk = mode.startsWith('desk-');
    const answerVisibleDecision = async (why) => {
      const resp = frame.getByTestId('event-decision-response').first();
      if (!(await resp.isVisible().catch(() => false))) return false;
      log(`  answering visible decision (${why})`);
      await resp.click({ timeout: 15000 });
      await sleep(3000);
      return true;
    };
    const advanceButton = () => (onMap
      ? frame.locator('[data-tutorial-step="advance-turn-button"]').first()
      : frame.getByTestId('warroom-toolbar-advance'));
    if (onMap) {
      await frame.getByTestId('warroom-toolbar-war-map').click({ timeout: 15000 });
      await sleep(6000);
      await page.screenshot({ path: path.join(outDir, '01-map.png') });
    }
    for (let t = 0; t < maxTurns; t++) {
      if (useBridge) {
        const pending = await frame.evaluate(async () => {
          const st = JSON.parse(await window.awwv.getCurrentGameState());
          return (st?.pendingEventDecisions ?? st?.military?.pending_event_decisions ?? []).map((d) => ({ id: d.event_id, def: d.historical_default_response_id ?? d.response_options?.[0]?.id }));
        });
        for (const d of pending) {
          const r = await frame.evaluate(({ id, def }) => window.awwv.respondToEventDecision(id, def), d);
          log(`  between-turn answer ${d.id} -> ${d.def}: ${JSON.stringify(r)}`);
        }
        if (pending.length) await sleep(2500);
      } else {
        await answerVisibleDecision('between turns');
      }
      const turnBefore = await frame.evaluate(async () => JSON.parse(await window.awwv.getCurrentGameState())?.meta?.turn ?? null);
      log(`advance #${t + 1} from turn ${turnBefore}`);
      await frame.evaluate(() => { window.__probe.events.length = 0; });
      await page.mainFrame().evaluate(() => { if (window.__probe) window.__probe.events.length = 0; }).catch(() => {});

      let advanceDone = null;
      if (useBridge) {
        advanceDone = frame.evaluate(() => window.awwv.advanceTurn({})).then((r) => ({ done: true, r }));
      } else {
        // The real click path. ADVANCE may first surface a required decision (answer it and
        // press ADVANCE again) or the AdvanceTurnModal confirmation (confirm it).
        for (let attempt = 0; attempt < 3; attempt++) {
          if (onDesk) {
            // President's desk: its advance control routes through the AdvanceTurnModal.
            await frame.getByTestId('warroom-toolbar-president-desk').click({ timeout: 20000 });
            await sleep(2500);
            await page.screenshot({ path: path.join(outDir, `0${t}-desk.png`) });
            await frame.locator('[data-testid="desk-action-advance-clearance"], [data-testid="desk-action-review-priorities"], [data-testid="desk-action-open-required-signature"]').first().click({ timeout: 20000 });
          } else {
            await advanceButton().click({ timeout: 20000 });
          }
          log('  clicked ADVANCE');
          await sleep(2000);
          const confirm = frame.getByRole('button', { name: /^(Advance while holding present policy|Advance with recorded decisions|Advance Week)$/i }).first();
          if (await confirm.isVisible().catch(() => false)) {
            await page.screenshot({ path: path.join(outDir, `0${t}-advance-modal.png`) });
            log('  AdvanceTurnModal open; confirming');
            await confirm.click({ timeout: 15000 });
            break;
          }
          const evs = await frame.evaluate(() => window.__probe.events.length);
          if (evs > 0) break;
          const turnNow = await frame.evaluate(async () => JSON.parse(await window.awwv.getCurrentGameState())?.meta?.turn ?? null);
          if (turnNow !== turnBefore) break;
          if (await answerVisibleDecision('surfaced by ADVANCE')) continue;
          break;
        }
      }


      // Wait for the pause status (or the turn to finish).
      let paused = null;
      for (let i = 0; i < 600 && !paused; i++) {
        await sleep(500);
        const ev = await frame.evaluate(() => window.__probe.events.slice());
        paused = ev.find((e) => e.k === 'pause' && e.st?.status === 'paused') ?? null;
        const ended = ev.some((e) => e.k === 'pause' && e.st === null);
        if (!paused && ended) break;
      }
      if (!paused) {
        if (advanceDone) await advanceDone;
        log('  no pause this turn; frame events:', JSON.stringify(await frame.evaluate(() => window.__probe.events)).slice(0, 600));
        await sleep(4000);
        // Close a turn report / aftermath if one opened.
        await frame.keyboard?.press?.('Escape').catch(() => {});
        continue;
      }
      log('  PAUSED:', JSON.stringify(paused.st));
      await sleep(2500);
      log('  frame events at pause:', JSON.stringify(await frame.evaluate(() => window.__probe.events)).slice(0, 800));
      log('  shell events at pause:', JSON.stringify(await page.mainFrame().evaluate(() => window.__probe?.events ?? null)).slice(0, 800));
      const dom = await domSnapshot(frame);
      log('  embedded DOM:', JSON.stringify(dom));
      await page.screenshot({ path: path.join(outDir, `10-paused-card-${mode}.png`) });
      expect(dom.pausedText && dom.card !== null, 'paused note is rendered in the decision card');
      expect(dom.topAtContinue === 'continue-button', 'Continue turn button is the topmost element at its own centre');

      const turnNo = paused.st.turn;
      if (mode.endsWith('answer')) {
        // Pick the historical default response button inside the decision dialog.
        const def = await frame.evaluate(async (id) => {
          const st = JSON.parse(await window.awwv.getCurrentGameState());
          const d = (st?.pendingEventDecisions ?? st?.military?.pending_event_decisions ?? []).find((x) => x.event_id === id);
          return d ? { id: d.historical_default_response_id ?? d.response_options?.[0]?.id, labels: d.response_options.map((o) => o.label) } : null;
        }, paused.st.eventIds[0]);
        log('  decision options:', JSON.stringify(def));
        const opts = frame.locator('[data-testid="event-decision-response"]');
        const n = await opts.count();
        log('  response option buttons by testid:', String(n));
        let clicked = false;
        if (def?.labels?.length) {
          const btn = frame.getByRole('button', { name: new RegExp(`Choose response: ${def.labels[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }).first();
          if (await btn.count()) { await btn.click({ timeout: 15000 }); clicked = true; }
        }
        if (!clicked && n > 0) { await opts.first().click(); clicked = true; }
        expect(clicked, 'clicked a response option in the paused card');
        // Some modals confirm the choice; click a confirm button if one appears.
        await sleep(800);
        const confirmBtn = frame.getByRole('button', { name: /^(Confirm|Issue|Sign|Respond)/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) { log('  clicking confirm'); await confirmBtn.click().catch(() => {}); }
      } else {
        await frame.getByTestId('event-decision-continue-turn').click({ timeout: 15000 });
      }

      // Wait for the turn to complete (pause status null) and the turn number to move.
      let finished = false;
      for (let i = 0; i < 600 && !finished; i++) {
        await sleep(500);
        const ev = await frame.evaluate(() => window.__probe.events.slice());
        finished = ev.some((e) => e.k === 'pause' && e.st === null);
      }
      if (advanceDone) log('  bridge advance result:', JSON.stringify((await advanceDone).r).slice(0, 120));
      expect(finished, 'turn finished after the player acted');
      await sleep(5000);
      const after = await frame.evaluate(async () => {
        const st = JSON.parse(await window.awwv.getCurrentGameState());
        return { turn: st?.meta?.turn ?? st?.turn, pending: (st?.pendingEventDecisions ?? st?.military?.pending_event_decisions ?? []).map((d) => d.event_id) };
      });
      log('  state after:', JSON.stringify(after));
      expect(after.turn === turnNo, `canonical state reached turn ${turnNo}`);
      if (mode.endsWith('answer')) expect(!after.pending.includes(paused.st.eventIds[0]), 'answered decision is no longer pending');
      else expect(after.pending.includes(paused.st.eventIds[0]), 'continued decision stays pending');
      const domAfter = await domSnapshot(frame);
      log('  embedded DOM after:', JSON.stringify(domAfter));
      expect(!domAfter.pausedText, 'paused note gone after the turn');
      await page.screenshot({ path: path.join(outDir, `20-after-${mode}.png`) });
      break;
    }
  } finally {
    await app.close().catch(() => {});
  }
  log(failures.length ? `RESULT: FAIL (${failures.length})` : 'RESULT: PASS');
  if (failures.length) process.exitCode = 1;
})().catch((e) => { log('PROBE ERROR', e.stack || String(e)); process.exitCode = 2; });
