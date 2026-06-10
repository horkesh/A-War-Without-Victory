#!/usr/bin/env node
/* eslint-env node */
/**
 * Dayton Phase-4 negotiation modal — screenshot capture harness (PR #280).
 *
 * Dev-only. Spins up the tactical-map Vite dev server, mounts the standalone
 * `dayton_shot.html` entry (which renders DaytonNegotiationModal in isolation
 * with the unit test's PENDING packet), and captures the design's notable
 * surfaces to PNG for owner review. Captures nothing committed.
 *
 * Output dir: F:\A-War-Without-Victory\.tmp_dayton_shots
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = process.cwd();
const PORT = Number(process.env.AWWV_DAYTON_SHOT_PORT || 3331);
const BASE = `http://127.0.0.1:${PORT}/dayton_shot.html`;
const OUT_DIR = process.env.AWWV_DAYTON_SHOT_OUT_DIR
  || 'F:\\A-War-Without-Victory\\.tmp_dayton_shots';

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }

function resolveViteBin() {
  const pkgPath = require.resolve('vite/package.json', { paths: [ROOT] });
  const pkg = readJson(pkgPath);
  return path.join(path.dirname(pkgPath), pkg.bin.vite);
}

async function waitForServer(url, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch { /* still starting */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

function startDevServer() {
  const args = [
    resolveViteBin(),
    '--config', path.join(ROOT, 'src', 'ui', 'map', 'vite.config.ts'),
    '--host', '127.0.0.1',
    '--port', String(PORT),
    '--strictPort',
  ];
  let log = '';
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
    windowsHide: true,
  });
  const collect = (c) => { log += c.toString(); if (log.length > 20000) log = log.slice(-20000); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  return {
    child,
    getLog: () => log,
    stop: async () => {
      if (process.platform === 'win32' && child.exitCode === null) {
        spawnSync('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      } else if (child.exitCode === null) {
        child.kill();
      }
      await new Promise((r) => { const t = setTimeout(r, 4000); child.once('exit', () => { clearTimeout(t); r(); }); });
    },
  };
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Clip-screenshot the modal panel element (the visible <Modal> panel).
async function panelClip(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
    const panel = dialog?.querySelector('[class*="max-w-"]') ?? dialog;
    const el = panel ?? document.body;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(r.width, window.innerWidth), height: Math.min(r.height, window.innerHeight) };
  });
}

// Scroll a section (matched by header text) to the top of the panel's scroll area.
async function scrollToText(page, needle) {
  return page.evaluate((text) => {
    const all = Array.from(document.querySelectorAll('div'));
    const hit = all.find((d) => (d.textContent ?? '').trim() === text);
    if (!hit) return false;
    hit.scrollIntoView({ block: 'start' });
    return true;
  }, needle);
}

async function clickText(page, needle) {
  return page.evaluate((text) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const lc = text.toLowerCase();
    const target = btns.find((b) => (b.textContent ?? '').trim().toLowerCase().includes(lc));
    if (!target) return false;
    target.click();
    return true;
  }, needle);
}

async function capture(page, name) {
  const out = path.join(OUT_DIR, name);
  const clip = await panelClip(page);
  await page.screenshot({ path: out, clip });
  return out;
}

// Tight crop to the cap-warning banner, padded upward to include the readouts
// header for context (so the banner reads as the consequence of the floor bar).
async function captureBanner(page, text, name) {
  const out = path.join(OUT_DIR, name);
  const clip = await page.evaluate((needle) => {
    const lc = needle.toLowerCase();
    // Smallest div whose own text starts with the banner phrase.
    const banner = Array.from(document.querySelectorAll('div'))
      .filter((d) => (d.textContent || '').toLowerCase().includes(lc))
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
    if (!banner) return null;
    // Anchor the top at the readouts header for context.
    const hdr = Array.from(document.querySelectorAll('div'))
      .find((d) => (d.textContent || '').trim().toLowerCase().startsWith('live settlement readouts'));
    const top = hdr ? hdr.getBoundingClientRect().top : banner.getBoundingClientRect().top;
    const b = banner.getBoundingClientRect();
    const pad = 8;
    return {
      x: Math.max(0, b.left - pad),
      y: Math.max(0, top - pad),
      width: Math.min(b.width + pad * 2, window.innerWidth),
      height: Math.min((b.bottom - top) + pad * 2, window.innerHeight),
    };
  }, text);
  if (!clip || clip.height < 8) {
    await page.screenshot({ path: out, clip: await panelClip(page) });
    return out;
  }
  await page.screenshot({ path: out, clip });
  return out;
}

// Crop to a modal section identified by its header text (or any of the alt
// header strings). Walks from the header up to its section container (the
// nearest ancestor that is a direct child of the scrollable panel) and clips
// to that box, padded slightly so borders aren't sheared.
async function captureSection(page, header, name, altHeaders = []) {
  const out = path.join(OUT_DIR, name);
  const clip = await page.evaluate((headerArg, alts) => {
    const needles = [headerArg, ...alts].map((s) => s.toLowerCase());
    const headers = Array.from(document.querySelectorAll('div'))
      .filter((d) => {
        const txt = (d.textContent || '').trim().toLowerCase();
        return needles.some((n) => txt.startsWith(n)) && (d.children.length === 0 || txt.length < 60);
      });
    const hdr = headers[0];
    if (!hdr) return null;
    // Walk up to the section block (has a bottom border in this modal).
    let sec = hdr;
    while (sec.parentElement && !/border-b/.test(sec.className || '')) sec = sec.parentElement;
    const r = sec.getBoundingClientRect();
    const pad = 6;
    return {
      x: Math.max(0, r.left - pad),
      y: Math.max(0, r.top - pad),
      width: Math.min(r.width + pad * 2, window.innerWidth),
      height: Math.min(r.height + pad * 2, window.innerHeight),
    };
  }, header, altHeaders);
  if (!clip || clip.height < 8) {
    // Fall back to full panel if the section couldn't be isolated.
    await page.screenshot({ path: out, clip: await panelClip(page) });
    return out;
  }
  await page.screenshot({ path: out, clip });
  return out;
}

async function run() {
  ensureDir(OUT_DIR);
  const server = startDevServer();
  const produced = [];
  try {
    await waitForServer(BASE);
    const puppeteer = require('puppeteer');
    const chromeExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      || ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((c) => fs.existsSync(c));

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromeExecutablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=2'],
    });
    try {
      // ── 800px-band view (panel max-width is 800px) ──────────────────────────
      const page = await browser.newPage();
      const consoleErrors = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
      await page.setViewport({ width: 860, height: 1200, deviceScaleFactor: 2 });
      await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(() => !!document.querySelector('[role="dialog"], [aria-modal="true"]'), { timeout: 30000 });
      await page.waitForFunction(() => (document.body.innerText || '').includes('Dayton'), { timeout: 30000 });
      await delay(600);

      // 01 — territorial packages section incl. Brčko tri-state
      produced.push(await captureSection(page, 'Territorial Packages', '01_packages_brcko.png'));
      // 02 — Live Settlement Readouts panel (autonomy + dysfunction floor bars)
      produced.push(await captureSection(page, 'Live Settlement Readouts', '02_readouts.png'));
      // 03 — OUTCOME CAPPED — HOLLOW VICTORY banner (default state shows it).
      // Crop tightly to the banner element itself, not the whole readouts section.
      produced.push(await captureBanner(page, 'OUTCOME CAPPED', '03_cap_banner.png'));
      // 05 — whole modal panel (800px band) as a reference
      produced.push(await capture(page, '05_full_panel_800.png'));
      await page.close();

      // ── Counter-offer view (?mock=1 → Probe Positions returns bot responses) ─
      const page2 = await browser.newPage();
      page2.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      page2.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
      await page2.setViewport({ width: 860, height: 1200, deviceScaleFactor: 2 });
      await page2.goto(`${BASE}?mock=1`, { waitUntil: 'networkidle2', timeout: 60000 });
      await page2.waitForFunction(() => !!document.querySelector('[role="dialog"], [aria-modal="true"]'), { timeout: 30000 });
      await delay(600);
      // Stage a demand so the counter has something to drop, then probe.
      await clickText(page2, 'Demand (12)');
      await delay(200);
      await clickText(page2, 'Probe Positions');
      // NB: button labels are CSS-uppercased; match case-insensitively on raw text.
      await page2.waitForFunction(
        () => {
          const t = (document.body.innerText || '').toLowerCase();
          return t.includes('republika srpska') && t.includes('adopt counter-offer');
        },
        { timeout: 15000 },
      );
      await delay(400);
      // Crop to the delegation-responses section (the probe button's section).
      produced.push(await captureSection(page2, 'Delegation responses', '04_counteroffer.png',
        ['Probe Positions', 'How the delegations']));
      await page2.close();

      // ── Bonus: wider desktop view of the whole modal ────────────────────────
      const page3 = await browser.newPage();
      await page3.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
      await page3.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
      await page3.waitForFunction(() => !!document.querySelector('[role="dialog"], [aria-modal="true"]'), { timeout: 30000 });
      await delay(600);
      const wide = path.join(OUT_DIR, '06_desktop_1440.png');
      await page3.screenshot({ path: wide });
      produced.push(wide);
      await page3.close();

      fs.writeFileSync(
        path.join(OUT_DIR, 'summary.json'),
        `${JSON.stringify({ ok: true, base: BASE, produced: produced.map((p) => p.replace(/\\/g, '/')), consoleErrors: consoleErrors.slice(-30) }, null, 2)}\n`,
        'utf8',
      );
      console.log('Dayton modal shots captured:');
      for (const p of produced) console.log(`  ${p}`);
      if (consoleErrors.length) console.log(`console errors: ${consoleErrors.length} (see summary.json)`);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error(server.getLog());
    throw err;
  } finally {
    await server.stop();
  }
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
