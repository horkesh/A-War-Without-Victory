// BCS and UI leftovers render proof (2026-11-13/14): drives the real dev map renderer through a real
// RBiH campaign, in EN and BCS, at 2293x960 and 1280x720, and screenshots the surfaces this lane
// changed: the Army HQ Briefing (officer card, Presidential Attention tile), the 1992 event decision
// ("Šta je Bosna?"), and the Verdict screen of an early peace (footer button, headline, subheadline).
// It writes a JSON report with the visible strings and the smallest font found on each surface.
// Usage: node tools/ui/bcs_ui_leftovers_browser_proof.mjs --url http://127.0.0.1:5393 --out <dir>
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { coordinationRoot } from '../lib/repo_paths.mjs';

const args = process.argv.slice(2);
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f);
const origin = opt('--url', 'http://127.0.0.1:5393');
const out = opt('--out', path.join(coordinationRoot(), 'surface_steps', 'bcs_ui_leftovers'));
fs.mkdirSync(out, { recursive: true });
const SIZES = [{ width: 2293, height: 960 }, { width: 1280, height: 720 }];
const LOCALES = (opt('--locales', 'en,bcs')).split(',');
const FACTION = { en: /Republic of Bosnia/, bcs: /Republika Bosna/ };

const report = { runs: [], errors: [] };
const browser = await chromium.launch({ headless: true });

async function minFont(page, selector) {
  return page.evaluate((sel) => {
    const root = sel ? document.querySelector(sel) : document.body;
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
      if (px < min) { min = px; where = `${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 40)}"`; }
    }
    return { found: true, minFontPx: min, where, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  }, selector);
}

for (const locale of LOCALES) {
  const run = { locale, shots: [], texts: {}, fonts: {} };
  const context = await browser.newContext({ viewport: SIZES[0], reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.addInitScript((loc) => {
    try { performance.setResourceTimingBufferSize(20000); window.localStorage.setItem('awwv.locale', loc); } catch { /* best effort */ }
  }, locale);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => report.errors.push(`${locale}: ${String(e.stack ?? e.message).slice(0, 400)}`));
  const shot = async (name, size) => {
    const file = path.join(out, `${name}_${locale}_${size.width}x${size.height}.png`);
    await page.screenshot({ path: file });
    run.shots.push(file);
  };
  const shotBoth = async (name, afterResize) => {
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await page.waitForTimeout(700);
      if (afterResize) await afterResize(size);
      await shot(name, size);
    }
  };

  await page.goto(`${origin}/?dev=1`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /new war|novi rat/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: FACTION[locale] }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /take command|preuzmi komandu/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^(begin|počni|započni)/i }).click();
  await page.getByTestId('warroom-toolbar-command-surface').waitFor({ state: 'visible', timeout: 120000 });
  await page.waitForTimeout(3000);
  const accept = async () => {
    for (let i = 0; i < 4; i += 1) {
      const button = page.getByRole('button', { name: /^(prihvati|accept)$/i }).first();
      if (!(await button.isVisible().catch(() => false))) return;
      await button.click();
      await page.waitForTimeout(800);
    }
  };
  await accept();

  // 1. Army HQ Briefing: officer card and the Presidential Attention tile.
  const armyHq = page.locator('[data-testid="warroom-toolbar-staff"], [data-testid="toolbar-route-army-hq"]').first();
  if (await armyHq.isVisible().catch(() => false)) {
    await armyHq.click();
    await page.waitForTimeout(2500);
    const briefing = page.getByText(locale === 'bcs' ? /^Brifing$/i : /^Briefing$/i).first();
    if (await briefing.isVisible().catch(() => false)) { await briefing.click(); await page.waitForTimeout(1800); }
    await shotBoth('army_hq_briefing');
    run.texts.armyHqBriefing = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim()).filter(Boolean);
    run.fonts.armyHqBriefing = await minFont(page, '[role="dialog"]');
    // The pending 1992 decision in Presidential Attention carries its BCS title.
    const decisionCard = page.getByText(locale === 'bcs' ? /Šta je Bosna\?/ : /What Is Bosnia\?/).first();
    if (await decisionCard.isVisible().catch(() => false) || await decisionCard.count()) {
      await decisionCard.scrollIntoViewIfNeeded().catch(() => undefined);
      await page.waitForTimeout(500);
      await shotBoth('army_hq_attention_decision');
      run.texts.attentionDecision = [await decisionCard.innerText().catch(() => '')];
    } else {
      run.texts.attentionDecision = ['decision card not found'];
    }
    // Personnel tab: officer roster with command style and known-for lines.
    const personnel = page.locator('button', { hasText: /Ljudstvo|Personnel/ }).first();
    if (await personnel.isVisible().catch(() => false)) {
      await personnel.click(); await page.waitForTimeout(1800);
      await shotBoth('army_hq_personnel');
      run.texts.armyHqPersonnel = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim()).filter(Boolean);
      run.fonts.armyHqPersonnel = await minFont(page, '[role="dialog"]');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  } else {
    run.texts.armyHqBriefing = ['Army HQ entry not visible'];
  }

  // 2. The 1992 event decision, when the first advance raises it.
  await page.setViewportSize(SIZES[0]);
  const advance = page.locator('[data-testid="warroom-toolbar-advance"], [data-testid="advance-turn-button"]').first();
  if (await advance.isVisible().catch(() => false)) {
    await advance.click();
    const title = page.getByText(locale === 'bcs' ? /Šta je Bosna\?/ : /What Is Bosnia\?/).first();
    try {
      await title.waitFor({ state: 'visible', timeout: 90000 });
      await shotBoth('event_decision_bosnia');
      run.texts.eventDecision = (await page.evaluate(() => document.body.innerText)).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 40);
      run.fonts.eventDecision = await minFont(page, null);
    } catch {
      await shot('after_advance', SIZES[0]);
      run.texts.eventDecision = ['event decision did not appear on the first advance'];
    }
  }

  // 3. Verdict of an early peace: footer button, headline, subheadline.
  await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map((r) => r.name);
    const find = (part) => urls.find((u) => u.includes(part));
    const store = await import(find('/store/gameStore.ts'));
    window.__leftoversProof = { store: store.useGameStore, base: store.useGameStore.getState().loadedGameState };
  });
  await page.evaluate(() => {
    const { store, base } = window.__leftoversProof;
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
    store.setState({
      loadedGameState: {
        ...base,
        gameOver: true,
        gameOutcome: 'ceasefire',
        gameVerdict: {
          outcome_type: 'peace_plan', outcome_label: 'Proof', turn: base.turn ?? 0, date: '',
          duration_weeks: base.turn ?? 0,
          faction_verdicts: { RBiH: fv('RBiH', 'B', 55), RS: fv('RS', 'C', 42), HRHB: fv('HRHB', 'B', 50) },
        },
      },
    });
  });
  await page.locator('[data-awwv-endgame-surface="verdict"]').waitFor({ state: 'attached', timeout: 30000 });
  await shotBoth('verdict_early_peace');
  run.texts.verdict = (await page.evaluate(() => document.querySelector('[data-awwv-endgame-surface="verdict"]')?.innerText ?? '')).split('\n').map((l) => l.trim()).filter(Boolean);
  run.fonts.verdict = await minFont(page, '[data-awwv-endgame-surface="verdict"]');
  report.runs.push(run);
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ shots: report.runs.map((r) => r.shots.length), errors: report.errors }, null, 2));
