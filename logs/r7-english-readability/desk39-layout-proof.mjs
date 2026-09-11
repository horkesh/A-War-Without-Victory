import fs from 'node:fs';
import { chromium } from 'playwright';

const outArg = process.argv.indexOf('--out');
if (outArg < 0 || !process.argv[outArg + 1]) throw new Error('usage: --out <exclusive-directory>');
const out = process.argv[outArg + 1];
if (fs.existsSync(out)) throw new Error(`refusing to reuse evidence directory: ${out}`);
fs.mkdirSync(out, { recursive: false });

const viewports = [[1920, 1080], [1366, 768], [3440, 1440]];
const factions = ['rbih', 'rs', 'hrhb'];
const browser = await chromium.launch({ headless: true });
const results = [];

const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const nearlyEqual = (a, b) => Math.abs(a - b) <= 0.75;

function parseRgba(value) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`unparsed colour: ${value}`);
  const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
}

function composite(foreground, background) {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const channel = (value) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

try {
  for (const [width, height] of viewports) {
    for (const faction of factions) {
      const id = `${faction}-${width}x${height}`;
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await page.goto('http://127.0.0.1:3247/?dev=1', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => typeof window.handleManualSaveLoad === 'function');
        const save = JSON.parse(fs.readFileSync(`tmp_gui_observation/pitch_saves/${faction}_w68.json`, 'utf8'));
        await page.evaluate(async (payload) => window.handleManualSaveLoad(payload), save);
        await page.getByRole('button', { name: /^continue$/i }).click();
        await page.waitForTimeout(1500);
        const later = page.getByRole('button', { name: /^review later$/i });
        if (await later.isVisible()) await later.click();
        await page.getByRole('button', { name: /^desk$/i }).click();
        await page.getByTestId('president-desk-shell').waitFor({ state: 'visible' });
        await page.waitForFunction(() => {
          const image = document.querySelector('[data-testid="warroom-scene-plate"] img');
          return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
        });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1700);

        const initial = await page.evaluate(() => {
          const label = document.querySelector('[data-testid="warroom-date-board-label"]');
          const shell = document.querySelector('[data-testid="president-desk-shell"]');
          const scroll = document.querySelector('[data-testid="president-desk-scroll-region"]');
          const scene = document.querySelector('[data-testid="warroom-scene-plate"]');
          const image = scene?.querySelector('img');
          const header = document.querySelector('[data-testid="desk-authority-header"]');
          if (!(label instanceof HTMLElement) || !(shell instanceof HTMLElement) || !(scroll instanceof HTMLElement)
            || !(scene instanceof HTMLElement) || !(image instanceof HTMLImageElement) || !(header instanceof HTMLElement)) {
            throw new Error('required Desk/date geometry nodes missing');
          }
          const box = (element) => {
            const r = element.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          };
          const range = document.createRange();
          range.selectNodeContents(label);
          const glyphRects = [...range.getClientRects()].map((r) => ({
            left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
          }));
          const glyphBounds = glyphRects.reduce((acc, r) => ({
            left: Math.min(acc.left, r.left), top: Math.min(acc.top, r.top),
            right: Math.max(acc.right, r.right), bottom: Math.max(acc.bottom, r.bottom),
          }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
          glyphBounds.width = glyphBounds.right - glyphBounds.left;
          glyphBounds.height = glyphBounds.bottom - glyphBounds.top;
          const labelBox = box(label);
          const dateBoard = document.querySelector('[data-testid="warroom-date-board"]');
          const namedOccluders = [
            ['desk-shell', shell],
            ['authority-header', header],
            ['decision-packet', scroll.children[1]],
            ['situation-card', scroll.children[2]],
            ['close-control', shell.querySelector('[data-testid="desk-close-overlay"]')],
          ].filter((entry) => entry[1] instanceof Element).map(([name, element]) => ({ name, rect: box(element) }));
          const textMetrics = [];
          const collectText = (root, group) => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const node = walker.currentNode;
              if (!node.textContent?.trim() || !(node.parentElement instanceof HTMLElement)) continue;
              const nodeRange = document.createRange();
              nodeRange.selectNodeContents(node);
              const rects = [...nodeRange.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
              const parentRect = node.parentElement.getBoundingClientRect();
              const rootRect = root.getBoundingClientRect();
              const style = getComputedStyle(node.parentElement);
              textMetrics.push({
                group,
                text: node.textContent.trim(),
                fontSize: parseFloat(style.fontSize),
                contained: rects.every((r) => r.left >= parentRect.left - 1 && r.right <= parentRect.right + 1),
                rootContained: rects.every((r) => r.left >= rootRect.left - 1 && r.right <= rootRect.right + 1
                  && r.top >= rootRect.top - 1 && r.bottom <= rootRect.bottom + 1),
                drawn: rects.length > 0,
              });
            }
          };
          collectText(header, 'header');
          for (const button of shell.querySelectorAll('button')) {
            const r = button.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight) collectText(button, 'control');
          }
          const style = getComputedStyle(label);
          return {
            dateText: label.textContent,
            label: labelBox,
            glyphRects,
            glyphBounds,
            glyphContained: glyphRects.length === 1
              && glyphRects.every((r) => r.left >= labelBox.left - 1 && r.right <= labelBox.right + 1
                && r.top >= labelBox.top - 1 && r.bottom <= labelBox.bottom + 1),
            glyphInViewport: glyphBounds.left >= 0 && glyphBounds.right <= innerWidth
              && glyphBounds.top >= 0 && glyphBounds.bottom <= innerHeight,
            dateBoard: dateBoard instanceof HTMLElement ? box(dateBoard) : null,
            ancestorClips: (() => {
              const clips = [];
              let ancestor = label.parentElement;
              while (ancestor && ancestor !== document.body) {
                const ancestorStyle = getComputedStyle(ancestor);
                const ancestorBox = box(ancestor);
                const clipsOverflow = ['hidden', 'clip'].includes(ancestorStyle.overflow)
                  || ['hidden', 'clip'].includes(ancestorStyle.overflowX)
                  || ['hidden', 'clip'].includes(ancestorStyle.overflowY);
                const clipsPath = ancestorStyle.clipPath !== 'none';
                if ((clipsOverflow || clipsPath)
                  && (labelBox.left < ancestorBox.left || labelBox.right > ancestorBox.right
                    || labelBox.top < ancestorBox.top || labelBox.bottom > ancestorBox.bottom)) {
                  clips.push({ tag: ancestor.tagName, testid: ancestor.dataset.testid ?? null, clipsOverflow, clipsPath, rect: ancestorBox });
                }
                ancestor = ancestor.parentElement;
              }
              return clips;
            })(),
            shell: box(shell),
            scroll: box(scroll),
            scene: box(scene),
            sceneImage: { src: image.currentSrc || image.src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight },
            namedOccluders,
            textMetrics,
            labelColors: { color: style.color, background: style.backgroundColor },
            transform: style.transform,
            maskImage: getComputedStyle(scroll).maskImage,
            scrollHeight: scroll.scrollHeight,
            clientHeight: scroll.clientHeight,
          };
        });

        const fg = parseRgba(initial.labelColors.color);
        const bg = parseRgba(initial.labelColors.background);
        const contrastRatios = [
          { underlay: 'black', color: { r: 0, g: 0, b: 0, a: 1 } },
          { underlay: 'white', color: { r: 255, g: 255, b: 255, a: 1 } },
        ].map(({ underlay, color }) => {
          const effectiveBg = composite(bg, color);
          const effectiveFg = composite(fg, effectiveBg);
          return { underlay, ratio: contrast(effectiveFg, effectiveBg) };
        });
        const minContrast = Math.min(...contrastRatios.map((entry) => entry.ratio));
        const initialIntersections = initial.namedOccluders
          .filter((entry) => intersects(initial.glyphBounds, entry.rect)).map((entry) => entry.name);
        const labelIntersections = initial.namedOccluders
          .filter((entry) => intersects(initial.label, entry.rect)).map((entry) => entry.name);

        await page.screenshot({ path: `${out}/${id}.png` });

        const maxScroll = await page.evaluate(() => {
          const label = document.querySelector('[data-testid="warroom-date-board-label"]');
          const shell = document.querySelector('[data-testid="president-desk-shell"]');
          const scroll = document.querySelector('[data-testid="president-desk-scroll-region"]');
          if (!(label instanceof HTMLElement) || !(shell instanceof HTMLElement) || !(scroll instanceof HTMLElement)) {
            throw new Error('max-scroll nodes missing');
          }
          scroll.scrollTop = scroll.scrollHeight;
          const box = (element) => {
            const r = element.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          };
          const dateRange = document.createRange();
          dateRange.selectNodeContents(label);
          const rects = [...dateRange.getClientRects()];
          const date = rects.reduce((acc, r) => ({
            left: Math.min(acc.left, r.left), top: Math.min(acc.top, r.top),
            right: Math.max(acc.right, r.right), bottom: Math.max(acc.bottom, r.bottom),
          }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
          const walker = document.createTreeWalker(scroll, NodeFilter.SHOW_TEXT);
          let last = null;
          while (walker.nextNode()) if (walker.currentNode.textContent?.trim()) last = walker.currentNode;
          if (!last) throw new Error('no Desk text found at maximum scroll');
          const lastRange = document.createRange();
          lastRange.selectNodeContents(last);
          const lastRect = [...lastRange.getClientRects()].at(-1);
          const scrollBox = box(scroll);
          return {
            scrollTop: scroll.scrollTop,
            scrollHeight: scroll.scrollHeight,
            clientHeight: scroll.clientHeight,
            date,
            label: box(label),
            shell: box(shell),
            dateIntersectsShell: date.left < box(shell).right && date.right > box(shell).left
              && date.top < box(shell).bottom && date.bottom > box(shell).top,
            labelIntersectsShell: box(label).left < box(shell).right && box(label).right > box(shell).left
              && box(label).top < box(shell).bottom && box(label).bottom > box(shell).top,
            reachedMaximum: Math.abs(scroll.scrollTop - Math.max(0, scroll.scrollHeight - scroll.clientHeight)) <= 1,
            lastText: last.textContent.trim(),
            lastTextBottom: lastRect?.bottom ?? null,
            fadeStart: scrollBox.bottom - 24,
            fadeClear: !!lastRect && lastRect.bottom <= scrollBox.bottom - 24,
          };
        });
        await page.screenshot({ path: `${out}/${id}-max-scroll.png` });

        const badText = initial.textMetrics.filter((entry) => !entry.drawn || !entry.contained || !entry.rootContained || entry.fontSize < 12);
        const checks = {
          fullSingleLineDate: /^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(initial.dateText ?? '')
            && initial.glyphContained && initial.glyphInViewport,
          visuallyUnclipped: initial.ancestorClips.length === 0,
          initialCardClear: initialIntersections.length === 0 && labelIntersections.length === 0,
          maxScrollCardClear: !maxScroll.dateIntersectsShell && !maxScroll.labelIntersectsShell,
          dateContrast: minContrast >= 4.5,
          readableHeaderAndControls: badText.length === 0,
          fadeClear: maxScroll.reachedMaximum && maxScroll.fadeClear,
          sceneLoaded: initial.sceneImage.naturalWidth > 0 && initial.sceneImage.naturalHeight > 0,
          maskPresent: initial.maskImage !== 'none',
        };
        const passed = Object.values(checks).every(Boolean);
        const result = { id, status: passed ? 'passed' : 'failed', checks, initialIntersections, labelIntersections, badText, contrastRatios, minContrast, initial, maxScroll };
        results.push(result);
        fs.writeFileSync(`${out}/${id}.json`, JSON.stringify(result, null, 2) + '\n');
        console.log(`${id}: ${passed ? 'PASS' : 'FAIL'} contrast=${minContrast.toFixed(2)} initial=${initialIntersections.join(',') || 'clear'} maxScroll=${maxScroll.dateIntersectsShell ? 'blocked' : 'clear'} fade=${maxScroll.fadeClear ? 'clear' : 'blocked'}`);
      } catch (error) {
        const result = { id, status: 'error', error: String(error), stack: error?.stack };
        results.push(result);
        fs.writeFileSync(`${out}/${id}-error.json`, JSON.stringify(result, null, 2) + '\n');
        await page.screenshot({ path: `${out}/${id}-error.png` });
        console.error(`${id}: ERROR ${String(error)}`);
      } finally {
        await page.close();
      }
    }
  }

  const layoutInvariantErrors = [];
  for (const [width, height] of viewports) {
    const cases = results.filter((entry) => entry.id.endsWith(`${width}x${height}`) && entry.initial);
    if (cases.length !== 3) {
      layoutInvariantErrors.push(`${width}x${height}: expected 3 measured cases, got ${cases.length}`);
      continue;
    }
    const reference = cases[0].initial;
    for (const current of cases.slice(1)) {
      for (const key of ['left', 'top', 'right', 'bottom', 'width', 'height']) {
        if (!nearlyEqual(reference.shell[key], current.initial.shell[key])) layoutInvariantErrors.push(`${width}x${height}: shell ${key} drift`);
        if (!nearlyEqual(reference.scene[key], current.initial.scene[key])) layoutInvariantErrors.push(`${width}x${height}: scene ${key} drift`);
      }
    }
  }
  for (const faction of factions) {
    const cases = results.filter((entry) => entry.id.startsWith(`${faction}-`) && entry.initial);
    if (cases.length !== 3) continue;
    const reference = cases[0].initial.sceneImage;
    for (const current of cases.slice(1)) {
      const image = current.initial.sceneImage;
      if (reference.src !== image.src || reference.naturalWidth !== image.naturalWidth || reference.naturalHeight !== image.naturalHeight) {
        layoutInvariantErrors.push(`${faction}: artwork identity drift across viewports`);
      }
    }
  }
  const allCasesPassed = results.length === 9 && results.every((entry) => entry.status === 'passed');
  const summary = { status: allCasesPassed && layoutInvariantErrors.length === 0 ? 'passed' : 'failed', allCasesPassed, layoutInvariantErrors, results };
  fs.writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
  if (summary.status !== 'passed') process.exitCode = 1;
} finally {
  await browser.close();
}
