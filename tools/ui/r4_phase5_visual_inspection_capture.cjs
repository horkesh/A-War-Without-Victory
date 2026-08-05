/*
 * r4_phase5_visual_inspection_capture.cjs
 *
 * Disposable capture harness for R4 Phase 5 ("Integrated proof and closeout").
 * Loads a retained near-endgame save into the packaged/dev Electron app and
 * screenshots six named surfaces at two resolutions (1920x1080 and 3440x1440):
 *   Decision Room, evidence map, Records, Chronicle, Codex, endgame/verdict.
 *
 * Launch + resume-save mechanics mirror tools/ui/paradox_local_qa.cjs.
 * Navigation selectors mirror tools/ui/first_hour_browser_gate.cjs.
 *
 * NOT a permanent tool. Read-only w.r.t. runs/ and existing tools/ui/*.cjs.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { _electron: electron } = require('playwright');

const repo = path.resolve(__dirname, '..', '..');

// --- Resume save target ---------------------------------------------------
// Prescribed 104w save (runs/r4_phase2_runtime_20260801/...) no longer exists;
// allow override via --resume-save=, else fall back to the retained turn-188
// definitive save (further toward endgame than 104w).
const resumeArg = process.argv.find((a) => a.startsWith('--resume-save='))?.slice('--resume-save='.length);
const DEFAULT_SAVE = 'runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json';
const resumeSavePath = path.resolve(repo, resumeArg || DEFAULT_SAVE);

const packagedArg = process.argv.find((a) => a.startsWith('--packaged-executable='))?.slice('--packaged-executable='.length);
const packagedExecutablePath = packagedArg ? path.resolve(repo, packagedArg) : null;

const outDir = path.resolve(
  'C:/Users/User/AppData/Local/Temp/claude/F--A-War-Without-Victory/55153a48-ce89-4ed8-857f-f9cc47dbaac6/scratchpad/visual_inspection',
);
const userDataDir = path.join(outDir, 'user-data');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });

const VIEWPORTS = [
  { w: 1920, h: 1080 },
  { w: 3440, h: 1440 },
];

// Optional surface filter: --only=endgame,codex (default = all six).
const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const ONLY = onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter(Boolean) : [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[capture]', ...a);

const results = []; // { surface, width, height, ok, file, reason }

// --- Surface reachability (evaluated inside the embedded frame) ------------
async function frameEval(frame, fn, arg) {
  return frame.evaluate(fn, arg);
}

// Click a testid inside the frame if present + enabled. Returns true if clicked.
async function clickTestId(frame, testId) {
  return frameEval(frame, (id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!(el instanceof HTMLElement)) return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    el.click();
    return true;
  }, testId);
}

async function firstClickableTestId(frame, testIds) {
  for (const id of testIds) {
    // eslint-disable-next-line no-await-in-loop
    if (await clickTestId(frame, id)) return id;
  }
  return null;
}

async function testIdVisible(frame, testId) {
  return frameEval(frame, (id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!(el instanceof HTMLElement)) return false;
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }, testId);
}

// Best-effort drain of intro splashes / transient modals so toolbar unlocks.
async function drainTransientSurfaces(page, frame) {
  const clickTexts = [/ACKNOWLEDGE/i, /^BEGIN$/i, /WAR BEGINS/i, /Continue/i, /Dismiss/i, /Close/i];
  for (let i = 0; i < 12; i += 1) {
    let acted = false;
    // Frame-level text buttons
    // eslint-disable-next-line no-await-in-loop
    acted = await frameEval(frame, (patternsSrc) => {
      const patterns = patternsSrc.map((p) => new RegExp(p.source, p.flags));
      const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
      for (const b of btns) {
        if (!(b instanceof HTMLElement)) continue;
        const rect = b.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const txt = (b.textContent || '').replace(/\s+/g, ' ').trim();
        if (patterns.some((p) => p.test(txt))) { b.click(); return true; }
      }
      return false;
    }, clickTexts.map((p) => ({ source: p.source, flags: p.flags })));
    if (!acted) {
      // Try common close testids
      // eslint-disable-next-line no-await-in-loop
      acted = await firstClickableTestId(frame, [
        'command-card-strip-close', 'warroom-decision-room-close', 'codex-close', 'chronicle-close',
      ]) !== null;
    }
    if (!acted) break;
    // eslint-disable-next-line no-await-in-loop
    await sleep(400);
  }
  // NOTE: deliberately NO page.keyboard.press('Escape') here. On the tactical/game
  // screen, Escape-with-nothing-selected TOGGLES the pause menu
  // (src/ui/map/hooks/useKeyboardShortcuts.ts) — pressing it blindly was opening the
  // "PAUSED" overlay over subsequent screenshots. Panels are closed via testids above.
  await dismissPause(frame);
  await sleep(200);
}

// Dismiss the "PAUSED / ESC RESUME" menu if it is showing (PauseMenu.tsx exposes
// data-testid="pause-menu-backdrop"; clicking it / the RESUME button = onResume).
async function dismissPause(frame) {
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const wasOpen = await frameEval(frame, () => {
      const backdrop = document.querySelector('[data-testid="pause-menu-backdrop"]');
      if (!(backdrop instanceof HTMLElement)) return false;
      const r = backdrop.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const resume = Array.from(document.querySelectorAll('button'))
        .find((b) => /^\s*RESUME\s*$/i.test((b.textContent || '')));
      (resume instanceof HTMLElement ? resume : backdrop).click();
      return true;
    }).catch(() => false);
    if (!wasOpen) return;
    // eslint-disable-next-line no-await-in-loop
    await sleep(300);
  }
}

async function shot(page, frame, surface, vp) {
  // Belt-and-suspenders: ensure the pause overlay is not covering the surface.
  await dismissPause(frame);
  const file = path.join(outDir, `${surface}_${vp.w}x${vp.h}.png`);
  await page.screenshot({ path: file }).catch(async (e) => {
    throw e;
  });
  return file;
}

function record(surface, vp, ok, file, reason) {
  results.push({ surface, width: vp.w, height: vp.h, ok, file: ok ? file : null, reason: reason || null });
  log(`${ok ? 'OK ' : 'SKIP'} ${surface} ${vp.w}x${vp.h}${reason ? ` — ${reason}` : ''}`);
}

// --- Per-surface capture routines -----------------------------------------
async function captureDecisionRoom(page, frame, vp) {
  // Reset to a clean base first.
  await drainTransientSurfaces(page, frame);
  // The Command Surface (Decision Room entry) lives on the warroom wall-map screen
  // (warroom-toolbar-*). If we're on the tactical/game screen (toolbar-route-*),
  // click the Desk route first — openWarroomDeskFromField() switches appScreen back
  // to 'warroom', re-exposing warroom-toolbar-command-surface.
  if (!(await testIdVisible(frame, 'warroom-toolbar-command-surface'))) {
    await firstClickableTestId(frame, ['toolbar-route-desk', 'warroom-toolbar-president-desk']);
    await sleep(1300);
    // Close the desk overlay if it opened so the toolbar command-surface is clickable.
    await firstClickableTestId(frame, ['desk-close-overlay']);
    await sleep(400);
  }
  const opened = await firstClickableTestId(frame, ['warroom-toolbar-command-surface']);
  if (!opened) { record('decision_room', vp, false, null, 'command-surface entry not reachable from this state'); return; }
  await sleep(700);
  const stripUp = await testIdVisible(frame, 'command-card-strip');
  if (stripUp) {
    // Try to open a full decision room host by clicking the first command card.
    const cardClicked = await frameEval(frame, () => {
      const cards = Array.from(document.querySelectorAll('[data-testid^="command-card-"]'))
        .filter((el) => el instanceof HTMLElement
          && !String(el.getAttribute('data-testid')).includes('fallback')
          && !String(el.getAttribute('data-testid')).includes('strip'));
      if (cards.length === 0) return false;
      cards[0].click();
      return true;
    });
    if (cardClicked) await sleep(900);
  }
  const roomUp = (await testIdVisible(frame, 'warroom-decision-room-host'))
    || (await testIdVisible(frame, 'presidential-decision-room'));
  const file = await shot(page, frame, 'decision_room', vp);
  record('decision_room', vp, true, file,
    roomUp ? undefined : (stripUp ? 'captured command-card-strip (no full decision-room host opened)' : 'command surface state captured'));
}

async function captureSimpleRoute(page, frame, vp, surface, toolbarIds, confirmTestIds) {
  await drainTransientSurfaces(page, frame);
  const clicked = await firstClickableTestId(frame, toolbarIds);
  if (!clicked) { record(surface, vp, false, null, `toolbar route not clickable/present: ${toolbarIds.join(',')}`); return; }
  await sleep(900);
  let confirmed = true;
  let note;
  if (confirmTestIds && confirmTestIds.length) {
    confirmed = false;
    for (const id of confirmTestIds) {
      // eslint-disable-next-line no-await-in-loop
      if (await testIdVisible(frame, id)) { confirmed = true; break; }
    }
    if (!confirmed) note = `panel testid(s) not visible after click (${confirmTestIds.join(',')}); captured current view`;
  }
  const file = await shot(page, frame, surface, vp);
  record(surface, vp, true, file, note);
}

async function captureEvidenceMap(page, frame, vp) {
  // Evidence map = the tactical map base view; close any overlay then War Map route.
  await drainTransientSurfaces(page, frame);
  await firstClickableTestId(frame, ['toolbar-route-war-map', 'warroom-toolbar-war-map']);
  await sleep(900);
  const file = await shot(page, frame, 'evidence_map', vp);
  record('evidence_map', vp, true, file);
}

async function captureEndgame(page, frame, vp) {
  const state = await frameEval(frame, () => {
    const ids = ['faction-report-score', 'faction-report-dayton', 'faction-report-dimensions'];
    const anyVerdict = ids.some((id) => document.querySelector(`[data-testid="${id}"]`));
    const bodyText = (document.body.innerText || '');
    const daytonText = /Dayton Peace Accords|General Framework Agreement for Peace/i.test(bodyText);
    const verdictText = /Final Verdict|War Without Victory —|Hollow Victory|Game Over/i.test(bodyText)
      && /verdict/i.test(bodyText);
    return { anyVerdict, daytonText, verdictText };
  });
  if (state.anyVerdict || state.daytonText || state.verdictText) {
    const file = await shot(page, frame, 'endgame', vp);
    const kind = state.anyVerdict ? 'verdict screen' : (state.daytonText ? 'Dayton negotiation modal' : 'endgame view');
    record('endgame', vp, true, file, kind);
    return;
  }
  record('endgame', vp, false, null,
    'save is mid-game (meta.game_over=false, no pendingDayton); VerdictScreen renders only when gameOver===true — not reachable without advancing turns');
}

async function main() {
  log('resume save:', resumeSavePath, 'exists:', fs.existsSync(resumeSavePath));
  if (!fs.existsSync(resumeSavePath)) throw new Error(`Resume save not found: ${resumeSavePath}`);

  const app = await electron.launch({
    cwd: repo,
    ...(packagedExecutablePath ? { executablePath: packagedExecutablePath } : {}),
    args: packagedExecutablePath
      ? [`--user-data-dir=${userDataDir}`]
      : ['.', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    timeout: 120000,
  });

  // Surface main-process logs (the shell logs load failures there).
  const proc = app.process();
  proc.stdout?.on('data', (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => log('[main]', l.slice(0, 400))));
  proc.stderr?.on('data', (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => log('[main:err]', l.slice(0, 400))));

  try {
    // Wait for game window.
    const page = await (async () => {
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        for (const p of app.windows()) {
          const url = p.url();
          if (!url.startsWith('devtools://') && (url.includes('warroom') || url.includes('index.html'))) {
            await p.waitForLoadState('domcontentloaded').catch(() => {});
            return p;
          }
        }
        await sleep(500);
      }
      throw new Error('Timed out waiting for Electron game window');
    })();
    log('game window url:', page.url());

    // Mock the open dialog and click Load Save.
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => {
        // eslint-disable-next-line no-console
        console.log('[MOCK] showOpenDialog ->', filePath);
        return { canceled: false, filePaths: [filePath] };
      };
      dialog.showOpenDialogSync = () => {
        // eslint-disable-next-line no-console
        console.log('[MOCK] showOpenDialogSync ->', filePath);
        return [filePath];
      };
    }, resumeSavePath);
    const loadBtn = page.getByRole('button', { name: /Load Save/i }).first();
    await loadBtn.waitFor({ state: 'visible', timeout: 30000 });
    await loadBtn.click({ timeout: 10000 });
    log('clicked Load Save');

    // Loading the save (dialog -> sim deserialize/migrate) is async. On success the
    // desktop shell (warroom.ts) calls showScreen('none') to enter the game; the
    // #mm-continue button also enables once gameState is set. Poll: if we're still
    // on the launcher, click Continue once enabled; stop once the launcher is gone.
    const enterDeadline = Date.now() + 45000;
    let entered = false;
    while (Date.now() < enterDeadline) {
      // eslint-disable-next-line no-await-in-loop
      const st = await page.evaluate(() => {
        const mm = document.getElementById('main-menu');
        const launcherVisible = mm && !mm.classList.contains('mm-hidden');
        const cont = document.getElementById('mm-continue');
        return {
          launcherVisible: Boolean(launcherVisible),
          continueEnabled: Boolean(cont && !cont.disabled),
          body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
        };
      }).catch(() => ({ launcherVisible: false, continueEnabled: false, body: '' }));
      if (!st.launcherVisible) { entered = true; break; }
      if (st.continueEnabled) {
        // eslint-disable-next-line no-await-in-loop
        await page.evaluate(() => document.getElementById('mm-continue')?.click());
        log('clicked #mm-continue');
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
    }
    log('entered game screen:', entered);

    // Wait for embedded tactical frame to exist AND become visibly sized (the shell
    // creates a 0x0 warroom iframe on the launcher; it grows once the game is entered).
    const frame = await (async () => {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        const f = page.frames().find((c) => c.url().includes('/index.html') && c.url().includes('embedded=1'));
        if (f) {
          await f.waitForLoadState('domcontentloaded').catch(() => {});
          // eslint-disable-next-line no-await-in-loop
          const dims = await f.evaluate(() => [window.innerWidth, window.innerHeight]).catch(() => [0, 0]);
          if (dims[0] > 100 && dims[1] > 100) return f;
        }
        await sleep(500);
      }
      const observed = page.frames().map((c) => c.url()).filter(Boolean);
      await page.screenshot({ path: path.join(outDir, '_debug_no_frame.png') }).catch(() => {});
      throw new Error(`Timed out waiting for visibly-sized embedded frame; observed ${JSON.stringify(observed)}`);
    })();
    log('embedded frame url:', frame.url());
    await sleep(2000);
    await drainTransientSurfaces(page, frame);

    if (process.argv.includes('--dump')) {
      const dump = await frame.evaluate(() => {
        const isVis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
        return {
          testIds: Array.from(document.querySelectorAll('[data-testid]')).map((e) => e.getAttribute('data-testid')).filter((v, i, a) => a.indexOf(v) === i),
          visibleButtons: Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVis).map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 60),
        };
      }).catch((e) => ({ error: String(e) }));
      log('FRAME DUMP testIds:', JSON.stringify(dump.testIds));
      log('FRAME DUMP buttons:', JSON.stringify(dump.visibleButtons));
    }

    for (const vp of VIEWPORTS) {
      const before = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await sleep(800);
      const afterPage = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
      const afterFrame = await frame.evaluate(() => [window.innerWidth, window.innerHeight]).catch(() => ['?', '?']);
      log(`viewport ${vp.w}x${vp.h}: page innerWidth before=${before[0]}x${before[1]} after=${afterPage[0]}x${afterPage[1]} frame=${afterFrame[0]}x${afterFrame[1]}`);
      // Product observation probe: did the resize alone open the PAUSED overlay?
      const pauseAfterResize = await testIdVisible(frame, 'pause-menu-backdrop');
      log(`pause-menu visible immediately after setViewportSize(${vp.w}x${vp.h})? ${pauseAfterResize}`);

      const want = (s) => ONLY.length === 0 || ONLY.includes(s);
      // Decision Room first (it lives on the warroom wall-map screen, which is the
      // entry screen); evidence map + panels afterward (they switch to the tactical
      // screen via war-map). captureDecisionRoom self-heals the screen for iter 2+.
      // eslint-disable-next-line no-await-in-loop
      if (want('decision_room')) await captureDecisionRoom(page, frame, vp);
      // eslint-disable-next-line no-await-in-loop
      if (want('evidence_map')) await captureEvidenceMap(page, frame, vp);
      // eslint-disable-next-line no-await-in-loop
      if (want('records')) await captureSimpleRoute(page, frame, vp, 'records', ['toolbar-route-records', 'warroom-toolbar-records'], []);
      // eslint-disable-next-line no-await-in-loop
      if (want('chronicle')) await captureSimpleRoute(page, frame, vp, 'chronicle', ['toolbar-route-chronicle', 'warroom-toolbar-chronicle'], ['chronicle-overlay']);
      // eslint-disable-next-line no-await-in-loop
      if (want('codex')) await captureSimpleRoute(page, frame, vp, 'codex', ['toolbar-route-codex', 'warroom-toolbar-codex'], ['codex-panel']);
      // eslint-disable-next-line no-await-in-loop
      if (want('endgame')) await captureEndgame(page, frame, vp);
    }
  } finally {
    fs.writeFileSync(path.join(outDir, 'capture_manifest.json'), JSON.stringify(results, null, 2));
    await app.close().catch(() => {});
  }

  log('=== SUMMARY ===');
  for (const r of results) log(JSON.stringify(r));
  const ok = results.filter((r) => r.ok).length;
  log(`captured ${ok}/${results.length}`);
}

main().catch((err) => {
  console.error('[capture] FATAL', err && err.stack ? err.stack : err);
  fs.writeFileSync(path.join(outDir, 'capture_manifest.json'), JSON.stringify(results, null, 2));
  process.exit(1);
});
