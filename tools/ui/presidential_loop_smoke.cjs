#!/usr/bin/env node
/* eslint-env node */

const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const ROOT = process.cwd();
const DEFAULT_URL = 'http://127.0.0.1:3002';
const DEFAULT_OUT_DIR = path.join(
  ROOT,
  'docs',
  '40_reports',
  'implemented',
  'visual_validation',
  '20260518_presidential_loop',
);
const DEFAULT_SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');

const url = process.env.AWWV_LOOP_SMOKE_URL || process.argv[2] || DEFAULT_URL;
const outDir = process.env.AWWV_LOOP_SMOKE_OUT_DIR || DEFAULT_OUT_DIR;
const savePath = process.env.AWWV_LOOP_SMOKE_SAVE || DEFAULT_SAVE_PATH;

const LOOP_STEPS = [
  { id: 'brief', label: 'Brief', action: 'open-hq', expectText: 'Strategic Priorities' },
  { id: 'inspect', label: 'Inspect', action: 'click-text', text: 'War Summary', expectText: 'War Summary' },
  { id: 'decide', label: 'Decide', action: 'open-hq', expectText: 'Strategic Priorities' },
  { id: 'execute', label: 'Execute', action: 'observe', expectText: 'Review Before Advance' },
  { id: 'report', label: 'Report', action: 'click-text', text: 'RECORDS', expectText: 'RECORDS' },
  { id: 'cost', label: 'Cost', action: 'click-text', text: 'AFTERMATH', expectText: 'Turn' },
  { id: 'judge', label: 'Judge', action: 'close-hq-click-text', text: 'CHRONICLE', expectText: 'Chronicle' },
  { id: 'next', label: 'Next', action: 'open-hq', expectText: 'Strategic Priorities' },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function visibleText(page) {
  return page.evaluate(() => document.body?.innerText ?? '');
}

async function clickByText(page, text) {
  const clicked = await page.evaluate((needle) => {
    const normalizedNeedle = needle.toLowerCase();
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], a')).reverse();
    const target = candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const label = [
        el.textContent,
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
      ].filter(Boolean).join(' ').toLowerCase();
      return label.includes(normalizedNeedle);
    });
    if (!target) return false;
    target.click();
    return true;
  }, text);
  if (!clicked) {
    throw new Error(`No visible clickable control matched "${text}"`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickIfText(page, text) {
  return page.evaluate((needle) => {
    const normalizedNeedle = needle.toLowerCase();
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], a')).reverse();
    const target = candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const label = [
        el.textContent,
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
      ].filter(Boolean).join(' ').toLowerCase();
      return label.includes(normalizedNeedle);
    });
    if (!target) return false;
    target.click();
    return true;
  }, text);
}

async function openArmyHq(page) {
  const clicked = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], a')).reverse();
    const target = candidates.find((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const label = [
        el.textContent,
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
      ].filter(Boolean).join(' ').toLowerCase();
      return label.includes('visit army hq')
        || /\barmy\b.*\bhq\b.*\[h\]/.test(label)
        || label.includes('open army hq presidential attention queue');
    });
    if (!target) return false;
    target.click();
    return true;
  });
  if (!clicked) {
    throw new Error('No visible Army HQ control found');
  }
  await delay(250);
  await clickIfText(page, 'BRIEFING');
}

async function dismissKnownBlockingOverlays(page) {
  for (const label of ['Review Later', 'Cancel', 'Continue']) {
    const clicked = await clickIfText(page, label);
    if (clicked) {
      await delay(300);
    }
  }
}

async function waitForVisibleText(page, text) {
  await page.waitForFunction(
    (needle) => (document.body?.innerText ?? '').toLowerCase().includes(needle.toLowerCase()),
    { timeout: 15000 },
    text,
  );
}

async function captureStep(page, step, index) {
  await dismissKnownBlockingOverlays(page);
  if (step.action === 'open-hq') {
    await openArmyHq(page);
  } else if (step.action === 'click-text') {
    await clickByText(page, step.text);
  } else if (step.action === 'close-hq-click-text') {
    await clickIfText(page, 'Close Army Headquarters');
    await delay(250);
    await clickByText(page, step.text);
  } else if (step.action === 'observe') {
    // Existing surface is already in view; capture without mutating state.
  }
  if (step.id === 'brief' || step.id === 'decide' || step.id === 'next') {
    await dismissKnownBlockingOverlays(page);
  }

  await waitForVisibleText(page, step.expectText);
  await delay(250);

  const screenshot = path.join(outDir, `${String(index + 1).padStart(2, '0')}_${step.id}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  const probe = await page.evaluate(() => {
    const visibleDialogs = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    const emptyRail = Array.from(document.querySelectorAll('aside, [aria-label*="rail" i]'))
      .some((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (el.textContent ?? '').trim().length === 0;
      });
    const visibleButtons = Array.from(document.querySelectorAll('button'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !el.disabled;
      }).length;
    return {
      visibleDialogCount: visibleDialogs.length,
      emptyRail,
      visibleButtons,
    };
  });

  const text = await visibleText(page);
  const passed = text.toLowerCase().includes(step.expectText.toLowerCase())
    && !probe.emptyRail
    && probe.visibleButtons > 0
    && probe.visibleDialogCount <= 2;

  const result = {
    id: step.id,
    label: step.label,
    expectedText: step.expectText,
    passed,
    screenshot: path.relative(ROOT, screenshot).replace(/\\/g, '/'),
    probe,
  };

  if (step.id === 'execute') {
    await clickIfText(page, 'Cancel');
    await delay(250);
  }
  if (step.id === 'inspect') {
    await clickIfText(page, 'Cancel');
    await delay(250);
    await clickIfText(page, 'Close');
    await delay(250);
  }

  return result;
}

async function seedSave(page) {
  const saveJson = fs.readFileSync(savePath, 'utf8');
  await page.waitForFunction('typeof window.handleManualSaveLoad === "function"', { timeout: 15000 });
  await page.evaluate(async (jsonText) => {
    const save = JSON.parse(jsonText);
    save.meta = { ...(save.meta ?? {}), player_faction: save.meta?.player_faction ?? 'RBiH' };
    await window.handleManualSaveLoad(save);
  }, saveJson);
  await page.waitForFunction(() => (document.body?.innerText ?? '').includes('ADVANCE'), { timeout: 20000 });
  await dismissKnownBlockingOverlays(page);
}

async function main() {
  ensureDir(outDir);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--ignore-gpu-blocklist',
      '--use-gl=swiftshader',
    ],
  });

  const summary = {
    url,
    savePath: path.relative(ROOT, savePath).replace(/\\/g, '/'),
    outDir: path.relative(ROOT, outDir).replace(/\\/g, '/'),
    steps: [],
    passed: false,
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    });
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await seedSave(page);

    for (let index = 0; index < LOOP_STEPS.length; index += 1) {
      const step = LOOP_STEPS[index];
      try {
        summary.steps.push(await captureStep(page, step, index));
      } catch (error) {
        const screenshot = path.join(outDir, `${String(index + 1).padStart(2, '0')}_${step.id}_failed.png`);
        await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
        summary.steps.push({
          id: step.id,
          label: step.label,
          expectedText: step.expectText,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          screenshot: path.relative(ROOT, screenshot).replace(/\\/g, '/'),
        });
      }
    }

    summary.passed = summary.steps.every((step) => step.passed);
  } finally {
    await browser.close();
    writeJson(path.join(outDir, 'summary.json'), summary);
  }

  if (!summary.passed) {
    console.error(`Presidential loop smoke failed. See ${path.join(outDir, 'summary.json')}`);
    process.exit(1);
  }
  console.log(`Presidential loop smoke passed. Summary: ${path.join(outDir, 'summary.json')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
