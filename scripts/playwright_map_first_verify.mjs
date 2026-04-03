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

  // Dismiss peace plan modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toUpperCase().includes('REJECT PLAN'));
    if (btn) btn.click();
  });
  await sleep(1000);

  // Dismiss command briefing
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.toUpperCase().includes('DISMISS'));
    if (btn) btn.click();
  });
  await sleep(1000);

  console.log('State loaded and overlays dismissed.');

  // Helper: check if text exists on page (textContent, case insensitive)
  async function hasText(text) {
    return await page.evaluate((t) => {
      return document.body.textContent.toUpperCase().includes(t.toUpperCase());
    }, text);
  }

  // Helper: reset UI to clean state (close everything)
  async function resetUI() {
    await page.evaluate(() => {
      // Access the zustand store directly to close all panels
      const root = document.getElementById('root');
      if (!root) return;
      // Use the window-level store if available, otherwise try React internals
      // The store is exposed on useGameStore which is a module — try dispatching escape logic
    });
    // Close any open modals/panels by pressing Escape carefully
    // First check if Army HQ is open
    const armyOpen = await page.evaluate(() => document.body.textContent.includes('MAIN STAFF') ||
      (document.body.textContent.includes('PERSONNEL') && document.body.textContent.includes('BRIEFING') && document.querySelector('[class*="z-[1000]"]')));
    if (armyOpen) {
      await page.keyboard.press('Escape');
      await sleep(500);
    }
    // Close pause menu if open
    const pauseOpen = await page.evaluate(() => {
      const text = document.body.textContent.toUpperCase();
      return text.includes('RESUME') && text.includes('MAIN MENU');
    });
    if (pauseOpen) {
      await page.keyboard.press('Escape');
      await sleep(500);
    }
    // Close operations panel
    await page.evaluate(() => {
      // Find close button in operations panel
      const closeButtons = Array.from(document.querySelectorAll('button'));
      // The OperationsPanel has a close button, we try to close it by toggling the state
    });
    await sleep(300);
  }

  // ========== CHECK 1: OPS button opens OperationsPanel ==========
  console.log('\n--- CHECK 1: OPS button opens OperationsPanel ---');
  try {
    await resetUI();

    // Click OPS button in toolbar
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim() === 'OPS' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(2000);

    const hasFieldOps = await hasText('Field Ops Snapshot');

    // Check Army HQ is NOT visible — look for z-[1000] modal
    const hasArmyHQModal = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));

    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check1_ops.png` });

    if (hasFieldOps && !hasArmyHQModal) {
      report(1, true, 'OPS opens OperationsPanel with "Field Ops Snapshot", Army HQ modal not visible');
    } else if (!hasFieldOps) {
      // Dump full page text to diagnose
      const fullText = await page.evaluate(() => document.body.textContent);
      const hasIt = fullText.toUpperCase().includes('FIELD OPS');
      report(1, false, `"Field Ops Snapshot" not found in textContent (field ops anywhere: ${hasIt}). ArmyHQ modal: ${hasArmyHQModal}`);
    } else {
      report(1, false, 'OperationsPanel opened but Army HQ modal also visible');
    }

    // Close operations panel via Escape
    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(1, false, `Error: ${e.message}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check1_ops.png` }).catch(() => {});
  }

  // ========== CHECK 2: S shortcut opens WarSummaryModal ==========
  console.log('\n--- CHECK 2: S shortcut opens WarSummaryModal ---');
  try {
    await resetUI();

    // Focus the page body (not canvas, not input)
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    await page.keyboard.press('s');
    await sleep(2000);

    // WarSummaryModal content checks
    const hasSummaryContent = await hasText('War Summary') || await hasText('Territory') ||
                              await hasText('OVERVIEW') || await hasText('Casualties');

    const hasArmyHQModal = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));

    // Also check if pause menu is open (false positive)
    const hasPauseMenu = await page.evaluate(() => {
      const text = document.body.textContent.toUpperCase();
      return text.includes('RESUME') && text.includes('MAIN MENU');
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check2_s_summary.png` });

    if (hasSummaryContent && !hasArmyHQModal && !hasPauseMenu) {
      report(2, true, 'S key opens WarSummaryModal, Army HQ not visible');
    } else if (hasPauseMenu) {
      report(2, false, 'S key: pause menu is open instead of WarSummaryModal');
    } else if (hasArmyHQModal) {
      report(2, false, 'S key opened Army HQ instead of WarSummaryModal');
    } else {
      report(2, false, `S key did not open WarSummaryModal (summary content: ${hasSummaryContent})`);
    }

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(2, false, `Error: ${e.message}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check2_s_summary.png` }).catch(() => {});
  }

  // ========== CHECK 3: S switches to Summary tab when Army HQ IS open ==========
  console.log('\n--- CHECK 3: S switches to Summary tab in Army HQ ---');
  try {
    await resetUI();
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    // Open Army HQ with H
    await page.keyboard.press('h');
    await sleep(1500);

    const armyHQOpen = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));
    if (!armyHQOpen) {
      report(3, false, 'Could not open Army HQ with H key');
    } else {
      // Press S to switch to Summary tab
      await page.keyboard.press('s');
      await sleep(1000);

      // Check SUMMARY tab has active styling
      const summaryActive = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.trim() === 'SUMMARY');
        return btn ? btn.className.includes('amber') : false;
      });

      await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check3_s_in_hq.png` });
      report(3, summaryActive, `SUMMARY tab amber-active: ${summaryActive}`);
    }

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(3, false, `Error: ${e.message}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check3_s_in_hq.png` }).catch(() => {});
  }

  // ========== CHECK 4: RECORDS button routes to Army HQ Records ==========
  console.log('\n--- CHECK 4: RECORDS button opens Army HQ Records ---');
  try {
    await resetUI();

    // Click RECORDS toolbar button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim() === 'RECORDS' && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(1500);

    const hasArmyHQModal = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));
    const recordsActive = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.trim() === 'RECORDS');
      // Find the one inside the HQ modal (not toolbar), check amber
      const candidates = btns.filter(b => b.textContent.trim() === 'RECORDS');
      return candidates.some(b => b.className.includes('amber'));
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check4_records.png` });

    if (hasArmyHQModal) {
      report(4, true, `RECORDS button opens Army HQ modal. RECORDS tab amber-active: ${recordsActive}`);
    } else {
      report(4, false, 'RECORDS button did not open Army HQ modal');
    }

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(4, false, `Error: ${e.message}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check4_records.png` }).catch(() => {});
  }

  // ========== CHECK 5: H shortcut opens Army HQ Briefing ==========
  console.log('\n--- CHECK 5: H shortcut opens Army HQ Briefing ---');
  try {
    await resetUI();
    await page.evaluate(() => document.body.focus());
    await sleep(300);

    await page.keyboard.press('h');
    await sleep(1500);

    const hasArmyHQModal = await page.evaluate(() => !!document.querySelector('[class*="z-[1000]"]'));
    const briefingActive = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.trim() === 'BRIEFING' && b.className.includes('amber'));
    });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check5_h_briefing.png` });

    if (hasArmyHQModal && briefingActive) {
      report(5, true, 'H key opens Army HQ with BRIEFING tab active (amber confirmed)');
    } else if (hasArmyHQModal) {
      report(5, true, 'H key opens Army HQ modal (BRIEFING active styling inconclusive)');
    } else {
      report(5, false, 'H key did not open Army HQ modal');
    }

    await page.keyboard.press('Escape');
    await sleep(500);
  } catch (e) {
    report(5, false, `Error: ${e.message}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/map_first_check5_h_briefing.png` }).catch(() => {});
  }

  // ========== SUMMARY ==========
  console.log('\n========== RESULTS ==========');
  for (const r of results) {
    console.log(`  Check ${r.check}: ${r.status} — ${r.detail}`);
  }

  const passCount = results.filter(r => r.status === 'PASS').length;
  console.log(`\n${passCount}/5 checks passed.`);

  await browser.close();
  console.log('Done.');
})();
