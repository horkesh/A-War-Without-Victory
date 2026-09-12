/**
 * Capture the warroom whiteboard date after the marker-hand change.
 *
 * Adapted from logs/r7-english-readability/capture-desk-matrix.mjs, with one deliberate
 * difference: that rig clicks through to the Desk, which is exactly what OCCLUDES the board.
 * This one stays in the room.
 *
 * Two shots per plate: the whole scene for context, and a padded crop of the board itself,
 * captured at deviceScaleFactor 3 so the strokes are actually inspectable.
 *
 *   node logs/warroom-marker-date/capture-board.mjs [port]
 */

import { chromium } from 'playwright';
import fs from 'node:fs';

const port = process.argv[2] ?? '3247';
const out = 'logs/warroom-marker-date/shots';
fs.mkdirSync(out, { recursive: true });

/**
 * What to capture, and why these and not the design's full 3x5x3 matrix.
 *
 * §8 asks for 45 shots. Most would be redundant: the ink and sheet are derived from two measured
 * numbers per plate, so a shot mainly proves what those numbers already say. These are the ones
 * carrying risk the numbers CANNOT settle.
 *
 * `turn` overrides the save's own turn. The scene year is derived from the turn, so this is how a
 * 1994 or 1995 room is reached from a 1993 save. TERRITORY IS STILL THE SAVE'S — these shots prove
 * ink-against-board contrast, not history, and must not be read as a historical state.
 */
const PLATES = [
  // The three plates the owner reviewed and accepted.
  { faction: 'rbih', save: 'rbih_w68.json' },
  { faction: 'rs', save: 'rs_w68.json' },
  { faction: 'hrhb', save: 'hrhb_w68.json' },

  // THE TWO DARK PLATES. §4.4 predicts ink cannot reach the 35-point target here: HRHB 1994 board
  // L*31.0 (gap 31) and HRHB 1995 L*24.5 (gap 24.5), the darkest in the game. Whether that is
  // acceptable or an art request is the owner's call and needs a picture.
  { faction: 'hrhb', save: 'hrhb_w68.json', turn: 117, label: 'hrhb-1994' },
  { faction: 'hrhb', save: 'hrhb_w68.json', turn: 170, label: 'hrhb-1995' },

  // THE DESIGN MINIMUM. §3 says the board is entirely behind the Desk column at 1280x720 and no
  // placement rule recovers it — which is the whole argument for accepting occlusion and pinning
  // the date in the panel. One shot proves that claim; it does not need repeating per plate.
  { faction: 'rbih', save: 'rbih_w68.json', viewport: { width: 1280, height: 720 }, label: 'rbih-1280x720' },
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const plate of PLATES) {
    const { faction, save: saveFile, turn, viewport, label } = plate;
    const view = viewport ?? { width: 1920, height: 1080 };
    const id = label ?? `${faction}-${view.width}x${view.height}`;
    const page = await browser.newPage({
      viewport: view,
      // 3x on the full-HD shots; 2x at the design minimum, which is already a small frame.
      deviceScaleFactor: view.width >= 1920 ? 3 : 2,
    });
    try {
      await page.goto(`http://127.0.0.1:${port}/?dev=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => typeof window.handleManualSaveLoad === 'function');
      const saveJson = JSON.parse(fs.readFileSync(`tmp_gui_observation/pitch_saves/${saveFile}`, 'utf8'));
      if (typeof turn === 'number') {
        // The scene year is derived from the turn, so moving the turn moves the room. Territory is
        // untouched and stays the save's own — see the PLATES comment.
        saveJson.meta = { ...saveJson.meta, turn };
        if ('turn' in saveJson) saveJson.turn = turn;
      }
      await page.evaluate(async (save) => window.handleManualSaveLoad(save), saveJson);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await page.waitForTimeout(1500);

      const later = page.getByRole('button', { name: /^review later$/i });
      if (await later.isVisible()) await later.click();
      await page.waitForTimeout(800);

      // The route into the room. `?dev=1` lands on the tactical map; the DESK button is what
      // switches appScreen to 'warroom' — and it opens the Desk panel on the way in. Closing that
      // panel is what leaves the room itself visible, which is the whole subject here. (It is
      // also the live proof of design §3: the panel covers the board, and the close button is why
      // accepting that occlusion is reasonable.)
      await page.getByRole('button', { name: /^desk$/i }).click();
      await page.getByTestId('president-desk-shell').waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(600);

      // Capture the Desk first — the pinned date lives here, and it is what discharges R7's
      // "always visible" requirement now that the board is allowed to be covered.
      await page.screenshot({ path: `${out}/${id}-desk.png` });
      const pinnedDate = await page.getByTestId('desk-pinned-date').textContent().catch(() => null);

      const close = page.getByTestId('desk-close-overlay');
      if (await close.isVisible().catch(() => false)) {
        await close.click();
        await page.waitForTimeout(800);
      }

      const board = page.getByTestId('warroom-date-board');
      await board.waitFor({ state: 'attached', timeout: 15000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);

      // Did Caveat actually load, or is this the fallback? A screenshot cannot tell you that,
      // and a silently-substituted font is the exact failure that started this whole item.
      const fontCheck = await page.evaluate(() => ({
        caveatLoaded: document.fonts.check('700 20px Caveat'),
        faces: [...document.fonts].filter((f) => f.family === 'Caveat').map((f) => ({
          family: f.family, weight: f.weight, status: f.status, range: f.unicodeRange?.slice(0, 40),
        })),
      }));

      const info = await board.evaluate((el) => {
        const line = el.querySelector('[data-testid="warroom-date-board-label"]');
        const ghost = el.querySelector('[data-testid="warroom-date-board-ghost"]');
        const cs = line ? getComputedStyle(line) : null;
        return {
          boardLstar: el.getAttribute('data-board-lstar'),
          inkReachesTarget: el.getAttribute('data-ink-reaches-target'),
          text: line?.textContent ?? null,
          ghostText: ghost?.textContent ?? null,
          fontFamily: cs?.fontFamily ?? null,
          fontSize: cs?.fontSize ?? null,
          color: cs?.color ?? null,
          transform: cs?.transform ?? null,
          box: el.getBoundingClientRect().toJSON(),
          lineBox: line?.getBoundingClientRect().toJSON() ?? null,
        };
      });

      // The corkboard map: same treatment, same hard checks. Design §5.
      const mapEl = page.getByTestId('warroom-wall-map');
      const mapInfo = await mapEl.evaluate((el) => {
        const paper = el.querySelector('[data-testid="warroom-wall-map-paper"]');
        const svg = el.querySelector('[data-testid="warroom-wall-map-svg"]');
        const pins = [...el.querySelectorAll('[data-testid="warroom-wall-map-pin"]')];
        const pcs = paper ? getComputedStyle(paper) : null;
        return {
          corkLstar: el.getAttribute('data-cork-lstar'),
          sheetLstar: el.getAttribute('data-sheet-lstar'),
          viewBox: svg?.getAttribute('viewBox') ?? null,
          paperBackground: pcs?.background?.slice(0, 90) ?? null,
          paperBoxShadow: pcs?.boxShadow ?? null,
          paperBorder: pcs?.border ?? null,
          pinCount: pins.length,
          boardBox: el.getBoundingClientRect().toJSON(),
          paperBox: paper?.getBoundingClientRect().toJSON() ?? null,
        };
      }).catch(() => null);

      await page.screenshot({ path: `${out}/${id}-scene.png` });

      if (mapInfo?.boardBox) {
        const mb = mapInfo.boardBox;
        const mpad = Math.max(mb.width, mb.height) * 0.12;
        await page.screenshot({
          path: `${out}/${id}-map.png`,
          clip: {
            x: Math.max(0, mb.x - mpad),
            y: Math.max(0, mb.y - mpad),
            width: Math.min(view.width - Math.max(0, mb.x - mpad), mb.width + mpad * 2),
            height: Math.min(view.height - Math.max(0, mb.y - mpad), mb.height + mpad * 2),
          },
        });
      }

      // Padded crop of the board. Clip is in CSS pixels; deviceScaleFactor does the upscaling.
      const b = info.box;
      const padX = b.width * 0.35;
      const padY = b.height * 0.6;
      await page.screenshot({
        path: `${out}/${id}-board.png`,
        clip: {
          x: Math.max(0, b.x - padX),
          y: Math.max(0, b.y - padY),
          width: Math.min(view.width - Math.max(0, b.x - padX), b.width + padX * 2),
          height: Math.min(view.height - Math.max(0, b.y - padY), b.height + padY * 2),
        },
      });

      // HARD CHECKS, because a screenshot proves nothing on its own and every string assertion
      // in the suite passed while the date was rendering at font-size: 0px — present in the DOM,
      // correct in every attribute, and completely invisible. Source-string tests cannot see
      // layout. This rig is the only place that can, so it fails rather than reports.
      const problems = [];
      const px = Number.parseFloat(info.fontSize ?? '0');
      if (!(px > 8)) problems.push(`font-size is ${info.fontSize} — the writing is not visible`);
      if (!info.lineBox || info.lineBox.width < 10) {
        problems.push(`line box is ${JSON.stringify(info.lineBox)} — nothing was laid out`);
      }
      if (!fontCheck.caveatLoaded) problems.push('Caveat did not load — this is the fallback face');
      if (info.lineBox && info.box) {
        const overflowRight = info.lineBox.right - (info.box.x + info.box.width);
        if (overflowRight > 2) problems.push(`writing overruns the board by ${overflowRight.toFixed(1)}px`);
        if (info.lineBox.x < info.box.x - 2) problems.push('writing starts left of the board');
      }
      // Map checks. The sheet's whole point is that it sits IN the room's light and INSIDE the
      // board, so those are the two things worth failing on.
      if (!mapInfo) {
        problems.push('the corkboard map did not render at all');
      } else {
        if (mapInfo.pinCount !== 4) problems.push(`expected 4 pins, found ${mapInfo.pinCount}`);
        if (!mapInfo.viewBox || mapInfo.viewBox === '0 0 100 100') {
          problems.push(`viewBox is ${mapInfo.viewBox} — the square box is the seam defect`);
        }
        // NON-ZERO width only. `0px solid rgb(229,231,235)` is Tailwind's preflight default and is
        // not a border; matching any "<n>px" flagged all three plates for a border that is not
        // drawn. A checker's false positives cost more than its misses.
        if (/(?:^|\s)(?!0(?:px|\b))\d+(?:\.\d+)?px/.test(mapInfo.paperBorder ?? '')) {
          problems.push(`sheet has a border (${mapInfo.paperBorder}) — the art already has a frame`);
        }
        const sheetL = Number.parseFloat(mapInfo.sheetLstar ?? 'NaN');
        const corkL = Number.parseFloat(mapInfo.corkLstar ?? 'NaN');
        const roomL = Number.parseFloat(info.boardLstar ?? 'NaN');

        // The sheet must be lighter than the board it is pinned to, or it stops being a sheet.
        if (!(sheetL > corkL)) problems.push(`sheet L*${sheetL} is not above cork L*${corkL}`);

        // "Glowing" is measured against the ROOM, not the cork. This check used to compare with
        // cork and fired on RBiH 1993 — cork L*28.1 under a sheet at L*76.8 — which is a 48-point
        // gap and entirely correct: that room is brightly lit and simply has dark cork. The check
        // had the same false premise the sheet colour did, that cork reports the light.
        if (Number.isFinite(roomL) && sheetL - roomL > 34) {
          problems.push(`sheet is ${(sheetL - roomL).toFixed(1)} L* above the room light — reads as a light source`);
        }
        if (mapInfo.paperBox && mapInfo.boardBox) {
          const p = mapInfo.paperBox; const b = mapInfo.boardBox;
          const marginL = p.x - b.x;
          const marginR = (b.x + b.width) - (p.x + p.width);
          if (marginL < 2 || marginR < 2) {
            problems.push(`sheet has no cork margin (left ${marginL.toFixed(1)}px, right ${marginR.toFixed(1)}px)`);
          }
        }
      }

      if (problems.length > 0) {
        console.error(`${id}: ${problems.length} PROBLEM(S)`);
        for (const p of problems) console.error(`  - ${p}`);
        process.exitCode = 1;
      }

      results.push({ id, status: problems.length ? "captured-with-problems" : "captured", problems, pinnedDate, map: mapInfo, ...fontCheck, ...info });
      console.log(`${id}: captured  "${info.text}"  ghost="${info.ghostText}"  `
        + `font=${info.fontFamily}  size=${info.fontSize}  ink=${info.color}  `
        + `boardL*=${info.boardLstar}  caveatLoaded=${fontCheck.caveatLoaded}`);
    } catch (error) {
      results.push({ id, status: 'failed', error: String(error) });
      await page.screenshot({ path: `${out}/${id}-failure.png` }).catch(() => {});
      fs.writeFileSync(`${out}/${id}-failure.txt`, await page.locator('body').innerText().catch(() => String(error)));
      console.error(id, String(error));
      process.exitCode = 1;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/capture.json`, `${JSON.stringify(results, null, 2)}\n`);
}
