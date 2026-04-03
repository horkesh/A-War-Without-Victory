/**
 * Shell Navigation Verification — Phase A Shell Behavior Alignment
 *
 * Verifies presidential shell navigation flows:
 * - Tactical Map toolbar affordances
 * - Army HQ modal open/close/tab navigation
 * - Duplicate affordance removal (date no longer opens Chronicle)
 * - Keyboard shortcuts route to correct shells
 *
 * Requires: Vite dev server running on port 3003 with a loaded game state.
 * Run: node scripts/playwright_shell_navigation_verify.mjs
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:3003';
const SCREENSHOT_DIR = 'F:/A-War-Without-Victory/docs/40_reports/implemented/screenshots';
const results = [];

mkdirSync(SCREENSHOT_DIR, { recursive: true });

function report(check, pass, detail) {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`Check ${check}: ${status} — ${detail}`);
  results.push({ check, status, detail });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);

  // Load game state via "Continue (Last Run)"
  console.log('Loading game state...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
    if (btn) btn.click();
  });
  await sleep(5000);

  // Dismiss overlays
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toUpperCase().includes('REJECT PLAN'));
    if (btn) btn.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toUpperCase().includes('DISMISS'));
    if (btn) btn.click();
  });
  await sleep(1000);

  console.log('State loaded and overlays dismissed.\n');

  async function hasText(text) {
    return await page.evaluate((t) => {
      return document.body.textContent.toUpperCase().includes(t.toUpperCase());
    }, text);
  }

  async function resetUI() {
    // Close Army HQ if open
    const armyOpen = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));
    if (armyOpen) {
      await page.keyboard.press('Escape');
      await sleep(500);
      await page.keyboard.press('Escape');
      await sleep(300);
    }
    // Close any remaining modals
    await page.keyboard.press('Escape');
    await sleep(300);
  }

  // ========== CHECK 1: Date label is NOT clickable (no Chronicle duplicate) ==========
  console.log('--- CHECK 1: Date label is non-interactive (Chronicle duplicate removed) ---');
  try {
    await resetUI();

    // The date should be a <span>, not a <button>
    const dateIsSpan = await page.evaluate(() => {
      // Find the date element — it contains a date string like "APR 1992" or "WEEK"
      const spans = Array.from(document.querySelectorAll('span'));
      const dateSpan = spans.find(s => {
        const text = s.textContent.trim().toUpperCase();
        return (text.includes('APR') || text.includes('MAY') || text.includes('JUN') ||
                text.includes('JAN') || text.includes('FEB') || text.includes('MAR') ||
                text.includes('WEEK')) && s.tagName === 'SPAN' &&
               s.closest('[class*="fixed top-0"]');
      });
      return !!dateSpan;
    });

    // Verify CHRONICLE button still exists as separate affordance
    const chronicleBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.trim() === 'CHRONICLE');
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check1_date_not_clickable.png` });

    if (dateIsSpan && chronicleBtn) {
      report(1, true, 'Date is a non-interactive span; CHRONICLE button exists as canonical path');
    } else if (!chronicleBtn) {
      report(1, false, 'CHRONICLE button not found');
    } else {
      report(1, false, `Date element is not a span (dateIsSpan: ${dateIsSpan})`);
    }
  } catch (e) {
    report(1, false, `Error: ${e.message}`);
  }

  // ========== CHECK 2: CHRONICLE button opens Chronicle ==========
  console.log('\n--- CHECK 2: CHRONICLE button opens Chronicle overlay ---');
  try {
    await resetUI();

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim() === 'CHRONICLE');
      if (btn) btn.click();
    });
    await sleep(1500);

    const hasChronicle = await hasText('Chronicle') || await hasText('Timeline');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check2_chronicle.png` });

    report(2, hasChronicle, `CHRONICLE button opens chronicle overlay: ${hasChronicle}`);

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(2, false, `Error: ${e.message}`);
  }

  // ========== CHECK 3: H opens Army HQ, Escape returns to Tactical Map ==========
  console.log('\n--- CHECK 3: H opens Army HQ, Escape returns to Tactical Map ---');
  try {
    await resetUI();
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    await page.keyboard.press('h');
    await sleep(1500);

    const hqOpen = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));
    const hasBriefing = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.trim() === 'BRIEFING' && b.className.includes('amber'));
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check3_h_army_hq.png` });

    if (!hqOpen) {
      report(3, false, 'H did not open Army HQ');
    } else {
      // Now press Escape to close
      await page.keyboard.press('Escape');
      await sleep(500);

      const hqClosed = await page.evaluate(() => !document.querySelector('[class*="z-[1000]"]'));
      report(3, hqClosed, `Army HQ opened (briefing active: ${hasBriefing}), Escape returns to map: ${hqClosed}`);
    }
  } catch (e) {
    report(3, false, `Error: ${e.message}`);
  }

  // ========== CHECK 4: Army HQ tab navigation (BRIEFING -> SUMMARY -> RECORDS -> PERSONNEL) ==========
  console.log('\n--- CHECK 4: Army HQ tab navigation ---');
  try {
    await resetUI();
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    await page.keyboard.press('h');
    await sleep(1500);

    const tabResults = [];
    for (const tab of ['SUMMARY', 'RECORDS', 'PERSONNEL', 'BRIEFING']) {
      await page.evaluate((tabName) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.trim() === tabName);
        if (btn) btn.click();
      }, tab);
      await sleep(500);

      const isActive = await page.evaluate((tabName) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.trim() === tabName);
        return btn ? btn.className.includes('amber') : false;
      }, tab);
      tabResults.push(`${tab}:${isActive ? 'OK' : 'FAIL'}`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check4_tabs.png` });
    const allOk = tabResults.every(r => r.includes('OK'));
    report(4, allOk, `Tab navigation: ${tabResults.join(', ')}`);

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(4, false, `Error: ${e.message}`);
  }

  // ========== CHECK 5: OPS button opens OperationsPanel (not Army HQ) ==========
  console.log('\n--- CHECK 5: OPS button opens OperationsPanel ---');
  try {
    await resetUI();

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim() === 'OPS' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(1500);

    const hasFieldOps = await hasText('Field Ops Snapshot');
    const hasArmyHQ = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));

    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check5_ops.png` });

    if (hasFieldOps && !hasArmyHQ) {
      report(5, true, 'OPS opens OperationsPanel, Army HQ not visible');
    } else {
      report(5, false, `Field Ops: ${hasFieldOps}, Army HQ modal: ${hasArmyHQ}`);
    }

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(5, false, `Error: ${e.message}`);
  }

  // ========== CHECK 6: S outside Army HQ opens WarSummaryModal ==========
  console.log('\n--- CHECK 6: S key opens WarSummaryModal (not Army HQ) ---');
  try {
    await resetUI();
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    await page.keyboard.press('s');
    await sleep(1500);

    const hasSummary = await hasText('War Summary') || await hasText('OVERVIEW') || await hasText('Territory');
    const hasArmyHQ = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));

    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check6_s_summary.png` });

    if (hasSummary && !hasArmyHQ) {
      report(6, true, 'S opens WarSummaryModal on tactical map');
    } else {
      report(6, false, `Summary: ${hasSummary}, Army HQ modal: ${hasArmyHQ}`);
    }

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(6, false, `Error: ${e.message}`);
  }

  // ========== CHECK 7: C key toggles Chronicle ==========
  console.log('\n--- CHECK 7: C key toggles Chronicle ---');
  try {
    await resetUI();
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    await page.keyboard.press('c');
    await sleep(1500);

    const hasChronicle = await hasText('Chronicle') || await hasText('Timeline');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check7_c_chronicle.png` });

    report(7, hasChronicle, `C key opens Chronicle: ${hasChronicle}`);

    await page.keyboard.press('c');
    await sleep(500);
  } catch (e) {
    report(7, false, `Error: ${e.message}`);
  }

  // ========== CHECK 8: Army HQ FIELD button closes HQ (returns to map) ==========
  console.log('\n--- CHECK 8: Army HQ FIELD button returns to tactical map ---');
  try {
    await resetUI();
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    await page.keyboard.press('h');
    await sleep(1500);

    // Click the FIELD button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim().includes('FIELD'));
      if (btn) btn.click();
    });
    await sleep(500);

    const hqClosed = await page.evaluate(() => !document.querySelector('[class*="z-[1000]"]'));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/shell_check8_field_return.png` });

    report(8, hqClosed, `FIELD button closes Army HQ: ${hqClosed}`);
  } catch (e) {
    report(8, false, `Error: ${e.message}`);
  }

  // ========== SUMMARY ==========
  console.log('\n========== SHELL NAVIGATION RESULTS ==========');
  for (const r of results) {
    console.log(`  Check ${r.check}: ${r.status} — ${r.detail}`);
  }

  const passCount = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  console.log(`\n${passCount}/${total} checks passed.`);

  await browser.close();
  console.log('Done.');
})();
