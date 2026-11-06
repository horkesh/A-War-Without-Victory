// Generates the A War Without Victory mark system: convergence pins, display + small cuts, tiles, favicon, lockups.
// Run from the game repo with NODE_PATH=<repo>/node_modules. Output dir is argv[2].
process.env.FONTCONFIG_FILE = __dirname + '/fonts.conf';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const INK = '#1f241f';      // paper surfaces
const LIGHT = '#e7e3d8';    // dark surfaces
const TILE_DARK = '#141817';
const TILE_PAPER = '#ddd5c0';

// ---- pin glyphs (origin at top centre of head; needle tip at y=45) ----
// display cut: fine needle
const PIN_DISPLAY = '<path d="M-11 3a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v7h-5l-2 9h-8l-2-9h-5z"/><path d="M-1.1 19h2.2v22.5L0 45l-1.1-3.5z"/>';
// small cut: heavier head, wider collar, thick needle, for 48 px and under
const PIN_SMALL = '<path d="M-13 3.5a3.5 3.5 0 0 1 3.5-3.5h19a3.5 3.5 0 0 1 3.5 3.5v7.5h-5.5l-2.5 9h-10l-2.5-9h-5.5z"/><path d="M-3.4 20h6.8v19L0 45l-3.4-6z"/>';

const ANGLE = 26;       // side pins lean in by this much
const TIP = [50, 80];   // the one hole, in the 100-unit box

function at(rot) { return `translate(${TIP[0]} ${TIP[1]}) rotate(${rot}) translate(0 -45)`; }
// The centre pin sits in front. A mask cuts a gap around it out of the side pins, so the three heads
// stay separate on any background; no surface colour is needed.
function markInner(cut, ink) {
  const g = cut === 'small' ? PIN_SMALL : PIN_DISPLAY;
  const gap = cut === 'small' ? 6 : 5;
  return `<mask id="gap"><rect width="100" height="100" style="fill:#fff"/><g transform="${at(0)}" style="fill:#000;stroke:#000;stroke-width:${gap};stroke-linejoin:round">${g}</g></mask>` +
    `<g class="ink" fill="${ink}"><g mask="url(#gap)"><g transform="${at(-ANGLE)}">${g}</g><g transform="${at(ANGLE)}">${g}</g></g><g transform="${at(0)}">${g}</g></g>`;
}
function markSVG(cut, ink, extraStyle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${extraStyle || ''}${markInner(cut, ink)}</svg>\n`;
}
function tileSVG(cut, ink, bg, size, radius) {
  const r = radius == null ? 0 : radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><rect width="100" height="100" rx="${r}" fill="${bg}"/><svg x="8" y="8" width="84" height="84" viewBox="0 0 100 100">${markInner(cut, ink)}</svg></svg>\n`;
}

// ---- marks ----
fs.writeFileSync(path.join(OUT, 'awwv-mark.svg'), markSVG('display', INK));
fs.writeFileSync(path.join(OUT, 'awwv-mark-light.svg'), markSVG('display', LIGHT));
fs.writeFileSync(path.join(OUT, 'awwv-mark-small.svg'), markSVG('small', INK));
fs.writeFileSync(path.join(OUT, 'awwv-mark-small-light.svg'), markSVG('small', LIGHT));
// favicon: small cut, follows the browser theme, no background
fs.writeFileSync(path.join(OUT, 'favicon.svg'),
  markSVG('small', INK, `<style>.ink{fill:${INK}}@media (prefers-color-scheme:dark){.ink{fill:${LIGHT}}}</style>`).replace(' fill="' + INK + '"', ''));
// app icon: dark tile, display cut
fs.writeFileSync(path.join(OUT, 'awwv-app-icon.svg'), tileSVG('display', LIGHT, TILE_DARK, 512, 0));

// ---- raster tiles ----
async function png(svg, size, file) {
  await sharp(Buffer.from(svg), { density: 72 }).resize(size, size).png().toFile(path.join(OUT, file));
}

(async () => {
  const sizes = [16, 32, 48, 64, 128, 256, 512];
  for (const s of sizes) {
    const cut = s <= 48 ? 'small' : 'display';
    await png(tileSVG(cut, LIGHT, TILE_DARK, 512, 0), s, `awwv-app-icon-${s}.png`);
  }
  await png(markSVG('small', INK, 'none'), 64, 'favicon-32-preview.png');

  // ---- lockups ----
  const TITLE = 'A WAR WITHOUT VICTORY';
  const SUB = 'BOSNIA-HERZEGOVINA · 1992-1995';
  const T_SIZE = 44, T_TRACK = 1.6, S_SIZE = 12.5, S_TRACK = 2.3;

  const ttf = fs.readFileSync('F:/A-War-Without-Victory/assets/ui/fonts/IBMPlexSans_Condensed-SemiBold.ttf').toString('base64');
  const mono = fs.readFileSync('F:/A-War-Without-Victory/assets/ui/fonts/IBMPlexMono-SemiBold-Latin1.woff2').toString('base64');
  const fontStyle = `<style>@font-face{font-family:"IBM Plex Sans Condensed";font-weight:600;src:url(data:font/ttf;base64,${ttf}) format("truetype")}@font-face{font-family:"IBM Plex Mono";font-weight:600;src:url(data:font/woff2;base64,${mono}) format("woff2")}</style>`;

  // Measure the two lines in Chromium with the embedded fonts, so the lockup viewBox is exact.
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 3 });
  await page.setContent(`<!doctype html><html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200">${fontStyle}` +
    `<text id="t" x="0" y="100" font-family="IBM Plex Sans Condensed" font-weight="600" font-size="${T_SIZE}" letter-spacing="${T_TRACK}">${TITLE}</text>` +
    `<text id="s" x="0" y="160" font-family="IBM Plex Mono" font-weight="600" font-size="${S_SIZE}" letter-spacing="${S_TRACK}">${SUB}</text></svg></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const [tW, sW] = await page.evaluate(() => [document.getElementById('t').getBBox().width, document.getElementById('s').getBBox().width]);
  console.log('title width', tW.toFixed(1), 'sub width', sW.toFixed(1));

  function horizontal(ink, embed) {
    const markSize = 110, gap = 26;
    const x = markSize + gap;
    const W = Math.ceil(x + Math.max(tW, sW) + 4), H = markSize;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${embed ? fontStyle : ''}` +
      `<svg x="0" y="0" width="${markSize}" height="${markSize}" viewBox="0 0 100 100">${markInner('display', ink)}</svg>` +
      `<text x="${x}" y="64" font-family="IBM Plex Sans Condensed" font-weight="600" font-size="${T_SIZE}" letter-spacing="${T_TRACK}" fill="${ink}">${TITLE}</text>` +
      `<text x="${x + 1}" y="86" font-family="IBM Plex Mono" font-weight="600" font-size="${S_SIZE}" letter-spacing="${S_TRACK}" fill="${ink}" opacity="0.72">${SUB}</text></svg>\n`;
  }
  function stacked(ink, embed) {
    const W = 420, H = 300;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${embed ? fontStyle : ''}` +
      `<svg x="${(W - 150) / 2}" y="0" width="150" height="150" viewBox="0 0 100 100">${markInner('display', ink)}</svg>` +
      `<text x="${W / 2}" y="206" text-anchor="middle" font-family="IBM Plex Sans Condensed" font-weight="600" font-size="${T_SIZE}" letter-spacing="${T_TRACK}" fill="${ink}">A WAR</text>` +
      `<text x="${W / 2}" y="252" text-anchor="middle" font-family="IBM Plex Sans Condensed" font-weight="600" font-size="${T_SIZE}" letter-spacing="${T_TRACK}" fill="${ink}">WITHOUT VICTORY</text>` +
      `<text x="${W / 2}" y="280" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="${S_SIZE}" letter-spacing="${S_TRACK}" fill="${ink}" opacity="0.72">${SUB}</text></svg>\n`;
  }
  fs.writeFileSync(path.join(OUT, 'awwv-lockup-horizontal.svg'), horizontal(INK, true));
  fs.writeFileSync(path.join(OUT, 'awwv-lockup-horizontal-light.svg'), horizontal(LIGHT, true));
  fs.writeFileSync(path.join(OUT, 'awwv-lockup-stacked.svg'), stacked(INK, true));
  fs.writeFileSync(path.join(OUT, 'awwv-lockup-stacked-light.svg'), stacked(LIGHT, true));

  // Raster lockups through Chromium: the SVG with embedded fonts on a padded surface, screenshot at 3x.
  async function pngOf(svg, bg, file) {
    await page.setContent(`<!doctype html><html><body style="margin:0;background:${bg}"><div id="w" style="display:inline-block;padding:40px;background:${bg}">${svg}</div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#w').screenshot({ path: path.join(OUT, file) });
  }
  await pngOf(horizontal(INK, true), '#e8e1cf', 'awwv-lockup-horizontal-paper@3x.png');
  await pngOf(horizontal(LIGHT, true), '#0d100f', 'awwv-lockup-horizontal-dark@3x.png');
  await pngOf(stacked(INK, true), '#e8e1cf', 'awwv-lockup-stacked-paper@3x.png');
  await pngOf(stacked(LIGHT, true), '#0d100f', 'awwv-lockup-stacked-dark@3x.png');
  await browser.close();
  console.log('done', fs.readdirSync(OUT).length, 'files');
})().catch(e => { console.error(e); process.exit(1); });
