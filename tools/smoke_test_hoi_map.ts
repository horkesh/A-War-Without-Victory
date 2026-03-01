/**
 * Smoke test for HoI map: WebGL canvas, sidebar, formation markers, click → selection.
 * Usage: MAP_URL=http://localhost:3002/map_hoi.html npx tsx tools/smoke_test_hoi_map.ts
 * Start dev server first: npm run dev:map (port 3002).
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
      '--use-gl=swiftshader',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.goto(MAP_URL, { waitUntil: 'networkidle0', timeout: 20000 });

    const start = Date.now();
    let webGlReady = false;
    while (Date.now() - start < TIMEOUT_MS) {
      const ok = await page.evaluate(() => {
        const wrap = document.getElementById('hoi-map-wrap');
        if (!wrap) return false;
        const placeholder = wrap.querySelector('.hoi-map-placeholder') as HTMLElement | null;
        const canvas = wrap.querySelector('canvas');
        if (placeholder?.style.display === 'none' && canvas) return true;
        return false;
      });
      if (ok) {
        webGlReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    if (!webGlReady) {
      console.error('FAIL: WebGL canvas did not appear');
      process.exit(1);
    }

    const sidebarExists = await page.evaluate(() => {
      const sidebar = document.querySelector('.hoi-sidebar');
      return !!sidebar && sidebar.children.length > 0;
    });
    if (!sidebarExists) {
      console.error('FAIL: Sidebar (.hoi-sidebar) missing or empty');
      process.exit(1);
    }

    const markers = await page.evaluate(() => {
      const list = document.querySelectorAll('.hoi-formation-marker');
      return Array.from(list).slice(0, 5).map((el) => (el as HTMLElement).getBoundingClientRect());
    });
    if (markers.length === 0) {
      console.log('WARN: No .hoi-formation-marker found (load a save with formations)');
    } else {
      const first = markers[0];
      const cx = first!.left + first!.width / 2;
      const cy = first!.top + first!.height / 2;
      await page.mouse.click(cx, cy);
      await new Promise((r) => setTimeout(r, 300));
      const hasSelected = await page.evaluate(() => {
        return !!document.querySelector('.hoi-formation-marker.selected');
      });
      if (!hasSelected) {
        console.error('FAIL: Click on formation marker did not add .selected');
        process.exit(1);
      }
    }

    console.log('OK: HoI map smoke test passed');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
