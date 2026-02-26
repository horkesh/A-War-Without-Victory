/**
 * Verify HoI map WebGL loads: open map_hoi.html and check that the 3D canvas
 * appears (placeholder hidden) within 30s. Run after starting dev:map (port 3002).
 * Usage: npx tsx tools/verify_hoi_map_loads.ts
 */
import { launch } from 'puppeteer';

const MAP_URL = process.env.MAP_URL ?? 'http://localhost:3002/map_hoi.html';
const TIMEOUT_MS = 60000;
const POLL_MS = 500;

async function main(): Promise<void> {
  const browser = await launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--ignore-gpu-blocklist',
      '--enable-unsafe-webgpu',
      '--use-gl=swiftshader',
    ],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('init() complete!')) errors.push('SUCCESS');
      if (text.includes('[HoIMapRenderer]') || text.includes('map_hoi')) errors.push(`log: ${text}`);
      if (text.includes('init failed') || text.includes('Error') || text.includes('500')) {
        errors.push(`console: ${text}`);
      }
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        errors.push(`HTTP ${res.status()}: ${res.url()}`);
      }
    });
    page.on('pageerror', (err) => {
      errors.push(`pageerror: ${err.message}`);
    });
    await page.goto(MAP_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    const start = Date.now();
    let success = false;
    while (Date.now() - start < TIMEOUT_MS) {
      const hasWebGLCanvas = await page.evaluate(() => {
        const wrap = document.getElementById('hoi-map-wrap');
        if (!wrap) return false;
        const placeholder = wrap.querySelector('.hoi-map-placeholder') as HTMLElement | null;
        const canvas = wrap.querySelector('canvas');
        const placeholderCanvas = wrap.querySelector('.hoi-map-placeholder-canvas');
        const placeholderHidden = placeholder?.style.display === 'none';
        const placeholderCanvasGone = !placeholderCanvas;
        const hasMainCanvas = canvas && canvas !== placeholderCanvas;
        return Boolean(placeholderHidden && placeholderCanvasGone && hasMainCanvas);
      });
      if (hasWebGLCanvas) {
        success = true;
        break;
      }
      if (errors.some((e) => e.includes('SUCCESS'))) {
        success = true;
        break;
      }
      const errorVisible = await page.evaluate(() => {
        const placeholder = document.querySelector('.hoi-map-placeholder') as HTMLElement | null;
        return placeholder?.textContent?.includes('3D map unavailable') ?? false;
      });
      if (errorVisible) {
        const msg = await page.evaluate(() => {
          const p = document.querySelector('.hoi-map-placeholder');
          return p?.textContent ?? 'unknown';
        });
        console.error('Map showed error:', msg);
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    if (success) {
      console.log('OK: HoI 3D map loaded within', Math.round((Date.now() - start) / 1000), 's');
      process.exit(0);
    }
    const domState = await page.evaluate(() => {
      const wrap = document.getElementById('hoi-map-wrap');
      if (!wrap) return { error: 'no wrap' };
      const placeholder = wrap.querySelector('.hoi-map-placeholder') as HTMLElement | null;
      const canvases = wrap.querySelectorAll('canvas');
      return {
        placeholderDisplay: placeholder?.style.display ?? 'n/a',
        placeholderText: placeholder?.textContent?.slice(0, 80) ?? 'n/a',
        canvasCount: canvases.length,
        hasPlaceholderCanvas: !!wrap.querySelector('.hoi-map-placeholder-canvas'),
      };
    });
    console.error('Timeout: 3D map did not appear within', TIMEOUT_MS / 1000, 's');
    console.error('DOM state:', JSON.stringify(domState, null, 2));
    console.error('Collected errors count:', errors.length);
    if (errors.length) {
      console.error('Errors/messages (first 30):');
      errors.slice(0, 30).forEach((e) => console.error(' ', e));
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
