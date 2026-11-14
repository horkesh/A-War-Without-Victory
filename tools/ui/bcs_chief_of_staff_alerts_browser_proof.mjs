// BC4 render proof (2026-11-14): the Chief of Staff command-strain and cohesion-alert sentences,
// rendered in the real app in BCS and EN, then Army HQ > Briefing is opened and every sentence the
// Chief of Staff and the corps cards show about cohesion and command strain is recorded.
// Pass --save <headless 40w final_save.json>: it is loaded as the RBiH player through the app's
// manual-load entry (RBiH corps exist only from week 24), the 1st Corps brigades are set to
// cohesion 20 in the save, and command strain of each source is put on the five RBiH corps.
// Usage: node tools/ui/bcs_chief_of_staff_alerts_browser_proof.mjs --url http://127.0.0.1:5393 --save <final_save.json> --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { coordinationRoot } from '../lib/repo_paths.mjs';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5393');
const out = opt('--out', path.join(coordinationRoot(), 'surface_steps', 'bcs_ui_leftovers', 'bc4'));
const savePath = opt('--save', null);
fs.mkdirSync(out, { recursive: true });
const SIZES = [{ width: 2293, height: 960 }, { width: 1280, height: 720 }];
const SENTENCE = /kohezij|cohesion|komandn\w+ odnos|command relationship|pod pritiskom|under strain|iscrpljenost|exhaustion|Status komandnog autoriteta|Command authority status|Zabrinut sam|I am concerned|UPOZORENJE KOMANDA|COMMAND (STRAINED|COMPROMISED)|\{|undefined/i;

const report = { runs: [], errors: [] };
const browser = await chromium.launch({ headless: true });
for (const locale of ['bcs', 'en']) {
  const context = await browser.newContext({ viewport: SIZES[0], reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.addInitScript((loc) => { try { window.localStorage.setItem('awwv.locale', loc); } catch { /* best effort */ } }, locale);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => report.errors.push(`${locale}: ${String(e.message).slice(0, 300)}`));
  const run = { locale, shots: [], briefing: [], hits: [], notes: [] };
  // Boot a real campaign, then use the toolbar's own LATEST control (dev toolbar) to load the
  // late-war save through the app's replace-campaign path.
  await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /new war|novi rat/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: locale === 'bcs' ? /Republika Bosna/ : /Republic of Bosnia/ }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /take command|preuzmi komandu/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^(begin|počni|započni)/i }).click();
  await page.getByTestId('warroom-toolbar-command-surface').waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForTimeout(3000);
  // RBiH corps only exist from week 24, so load a headless 40-week final save as the RBiH player
  // through the app's own manual-load entry (App.tsx `window.handleManualSaveLoad`).
  if (savePath) {
    const saveJson = JSON.parse(fs.readFileSync(savePath, 'utf8'));
    saveJson.meta = { ...(saveJson.meta ?? {}), player_faction: 'RBiH' };
    // A worn-down 1st Corps: the sim briefing collector raises its cohesion alert below an average of 40.
    let lowered = 0;
    const rawFormations = saveJson.military?.formations ?? saveJson.formations ?? {};
    for (const f of Object.values(rawFormations)) {
      if (f && f.kind === 'brigade' && f.corps_id === 'arbih_1st_corps') { f.cohesion = 20; lowered += 1; }
    }
    run.notes.push(`1st Corps brigades set to cohesion 20 in the save: ${lowered}`);
    const loadResult = await page.evaluate(async (json) => {
      try { await window.handleManualSaveLoad(json); return 'loaded'; } catch (error) { return `error: ${String(error).slice(0, 200)}`; }
    }, saveJson);
    run.notes.push(`save ${path.basename(path.dirname(savePath))}: ${loadResult}`);
    await page.waitForTimeout(12000);
  }
  for (let i = 0; i < 4; i += 1) {
    const accept = page.getByRole('button', { name: /^(prihvati|accept)$/i }).first();
    if (!(await accept.isVisible().catch(() => false))) break;
    await accept.click();
    await page.waitForTimeout(800);
  }
  // Put the campaign in the state that raises the alerts, through the app's own store: the first
  // corps carries a low average brigade cohesion (the sim briefing collector reads raw formation
  // cohesion) and the RBiH corps carry command strain of each source. The sentences themselves
  // are produced by the real Army HQ Chief of Staff briefing component.
  const mutate = await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map((r) => r.name);
    const find = (part) => urls.find((u) => u.includes(part));
    const mod = await import(find('/store/gameStore.ts'));
    const store = mod.useGameStore;
    const base = store.getState().loadedGameState;
    const raw = base.rawGameState;
    const rawFormations = raw?.formations ?? {};
    let lowered = 0;
    for (const f of Object.values(rawFormations)) {
      if (f && f.kind === 'brigade' && f.corps_id === 'arbih_1st_corps') { f.cohesion = 20; lowered += 1; }
    }
    const sources = ['presidential_intervention', 'commander_friction', 'exhaustion', 'mixed'];
    const corps = base.formations.filter((f) => f.faction === 'RBiH' && /^arbih_[1-5](st|nd|rd|th)_corps$/.test(f.id));
    const formations = base.formations.map((f) => {
      if (f.faction === 'RBiH' && f.kind === 'brigade' && f.corpsId === 'arbih_1st_corps') return { ...f, cohesion: 20 };
      const idx = corps.findIndex((c) => c.id === f.id);
      if (idx >= 0) return { ...f, commandStrainLabel: idx % 2 === 0 ? 'strained' : 'compromised', commandStrainSource: sources[idx % sources.length] };
      return f;
    });
    store.setState({ loadedGameState: { ...base, formations } });
    return { rawBrigadesLowered: lowered, corps: corps.map((c) => c.id), hasRaw: Boolean(raw) };
  });
  run.notes.push('mutation ' + JSON.stringify(mutate));
  await page.waitForTimeout(1500);
  const bodyText = await page.evaluate(() => document.body.innerText);
  run.notes.push(`screen: ${bodyText.split('\n').filter(Boolean).slice(0, 8).join(' | ')}`);
  const armyHq = page.locator('[data-testid="warroom-toolbar-staff"], [data-testid="toolbar-route-army-hq"]').first();
  if (await armyHq.isVisible().catch(() => false)) {
    await armyHq.click();
    await page.waitForTimeout(3000);
    const briefing = page.getByText(locale === 'bcs' ? /^Brifing$/i : /^Briefing$/i).first();
    if (await briefing.isVisible().catch(() => false)) { await briefing.click(); await page.waitForTimeout(2500); }
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await page.waitForTimeout(800);
      const file = path.join(out, `chief_of_staff_${locale}_${size.width}x${size.height}.png`);
      await page.screenshot({ path: file });
      run.shots.push(file);
    }
    const lines = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim()).filter(Boolean);
    run.briefing = lines;
    run.hits = [...new Set(lines.filter((l) => SENTENCE.test(l)))];
    run.minFont = await page.evaluate(() => {
      const root = document.querySelector('[role="dialog"]') ?? document.body;
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
        if (px < min) { min = px; where = `${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 40)}"`; }
      }
      return { minFontPx: min, where };
    });
  } else {
    run.notes.push('Army HQ entry not visible');
    const file = path.join(out, `chief_of_staff_${locale}_no_army_hq.png`);
    await page.screenshot({ path: file });
    run.shots.push(file);
  }
  report.runs.push(run);
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'chief_of_staff_report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.runs.map((r) => ({ locale: r.locale, shots: r.shots.length, hits: r.hits, notes: r.notes, minFont: r.minFont })), null, 2));
console.log(JSON.stringify(report.errors));
