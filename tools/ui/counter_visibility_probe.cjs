// Real-app counter visibility audit (Electron via Playwright `_electron`).
// Usage: node tools/ui/counter_visibility_probe.cjs <repoDir> <outDir> [faction=RBiH] [sizes=2293x960]
// Pass one size per run for a true default view: later sizes reuse the open map, resized.
// Needs the Vite dev map on 127.0.0.1:3002 from <repoDir> (the dev-only
// window.__awwvCounterAuditSources hook in MapContainer) plus the built desktop sim
// and warroom bundles. Starts a historical campaign through the menus, opens the War Map,
// and for each window size measures the default view, an operational zoom and the
// whole-country view:
//   expected  = counters whose settlement point lies on the visible map, outside every
//               [data-awwv-counter-occluder] panel;
//   drawn     = counters in the deck icon layer; represented = drawn, or counted in a
//               drawn stack's badge;
//   defects   = drawn counter whose body misses its settlement point, drawn counter
//               touching a panel, badge with no visible counter body under it, stack top
//               covered by a later-drawn counter, visible DOM badge without a drawn stack.
// Exits non-zero when any defect is found or a visible counter is not represented.
const path = require('node:path');
const fs = require('node:fs');
const [repo, outDir, faction = 'RBiH', sizesArg = '2293x960'] = process.argv.slice(2);
// A worktree without its own node_modules resolves packages through the nearest ancestor that has them.
const resolvePackage = (pkg) => {
  for (let dir = path.resolve(repo); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', pkg);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (path.dirname(dir) === dir) return path.join(repo, 'node_modules', pkg);
  }
};
const { _electron: electron } = require(resolvePackage('playwright'));
const { PNG } = require(resolvePackage('pngjs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(outDir, { recursive: true });
const log = (...a) => { const line = a.join(' '); console.log(line); fs.appendFileSync(path.join(outDir, 'probe.log'), line + '\n'); };

function audit() {
  const sources = window.__awwvCounterAuditSources;
  const map = sources?.map();
  const fc = sources?.formations();
  const overlay = sources?.deckOverlay?.();
  const layers = overlay?._props?.layers ?? overlay?.props?.layers ?? [];
  if (!map || !fc) return { error: 'audit sources unavailable' };
  const canvas = map.getCanvas();
  const mapRect = canvas.getBoundingClientRect();
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const occluders = Array.from(document.querySelectorAll('[data-awwv-counter-occluder="true"]')).flatMap((el) => {
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return [];
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return [];
    return [{ left: r.left - mapRect.left, top: r.top - mapRect.top, right: r.right - mapRect.left, bottom: r.bottom - mapRect.top }];
  });
  const underPanel = (p) => occluders.some((o) => p.x >= o.left && p.x <= o.right && p.y >= o.top && p.y <= o.bottom);
  const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const iconLayer = layers.find((l) => l && l.id === 'deck-formations-icons');
  const badgeLayer = layers.find((l) => l && (l.id === 'deck-formations-stack-circle' || l.id === 'deck-formations-stack-badges'));
  const iconData = iconLayer?.props?.data ?? [];
  const sizeProp = iconLayer?.props?.getSize;
  const firstCounter = iconData.find((f) => f?.properties?.counter_role !== 'stack-badge');
  const iconSize = Number(typeof sizeProp === 'function' ? (firstCounter ? sizeProp(firstCounter) : 0) : (sizeProp ?? 0));
  const offsetOf = (layer, f) => {
    const fn = layer?.props?.getPixelOffset;
    return typeof fn === 'function' ? fn(f) : (Array.isArray(fn) ? fn : [0, 0]);
  };
  const isBadge = (f) => f?.properties?.counter_role === 'stack-badge';
  const bodies = [];
  for (let i = 0; i < iconData.length; i++) {
    const f = iconData[i];
    if (isBadge(f)) continue;
    const p = map.project(f.geometry.coordinates);
    const o = offsetOf(iconLayer, f);
    const cx = p.x + o[0];
    const cy = p.y + o[1];
    // The sprite is 2:1; the printed body is inset ~7.5% of the height.
    const inset = iconSize * 0.075;
    bodies.push({
      order: i, f, id: f.properties.id, osid: f.properties.location_osid, anchor: p,
      rect: { left: cx - iconSize + inset, right: cx + iconSize - inset, top: cy - iconSize / 2 + inset, bottom: cy + iconSize / 2 - inset },
    });
  }
  const drawnIds = new Set(bodies.map((b) => b.id));
  const drawnOsids = new Set(bodies.map((b) => b.osid));
  // Stacks merged into a neighbour's badge are represented by that badge.
  for (const row of iconData) {
    if (isBadge(row)) for (const osid of row.properties.merged_osids ?? []) drawnOsids.add(osid);
  }
  const visibleAnchor = (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H && !underPanel(p);
  const tally = { own: { expected: 0, drawn: 0, represented: 0 }, enemy: { expected: 0, drawn: 0, represented: 0 } };
  const missing = [];
  for (const f of fc.features) {
    const side = f.properties.is_enemy_contact ? 'enemy' : 'own';
    const p = map.project(f.geometry.coordinates);
    if (!visibleAnchor(p)) continue;
    tally[side].expected += 1;
    if (drawnIds.has(f.properties.id)) tally[side].drawn += 1;
    if (drawnIds.has(f.properties.id) || drawnOsids.has(f.properties.location_osid)) {
      tally[side].represented += 1;
      continue;
    }
    // A settlement closer to a panel or the canvas edge than one counter height cannot
    // carry a counter clear of the panel while still covering the point: by rule it is
    // hidden whole (never a sliver). Reported separately, not as a failure.
    const edgeGap = Math.min(p.x, W - p.x, p.y, H - p.y, ...occluders.map((o) => Math.max(o.left - p.x, p.x - o.right, o.top - p.y, p.y - o.bottom)));
    if (edgeGap < iconSize) {
      tally[side].panelEdge = (tally[side].panelEdge ?? 0) + 1;
      continue;
    }
    missing.push(`${f.properties.id}@${f.properties.location_osid} (${Math.round(p.x)},${Math.round(p.y)}) gap ${Math.round(edgeGap)}px`);
  }
  const defects = [];
  for (const b of bodies) {
    const a = b.anchor;
    if (!(a.x >= b.rect.left && a.x <= b.rect.right && a.y >= b.rect.top && a.y <= b.rect.bottom)) {
      defects.push(`off-settlement ${b.id}: anchor (${Math.round(a.x)},${Math.round(a.y)}) body ${Math.round(b.rect.left)}..${Math.round(b.rect.right)} x ${Math.round(b.rect.top)}..${Math.round(b.rect.bottom)}`);
    }
    if (occluders.some((o) => overlapArea(b.rect, o) > 0)) defects.push(`under-panel ${b.id}`);
    // Any UI at all (marked as an occluder or not) painted over the counter body.
    const container = map.getContainer();
    for (const [sx, sy] of [[0.5, 0.5], [0.15, 0.3], [0.85, 0.3], [0.15, 0.7], [0.85, 0.7]]) {
      const px = mapRect.left + b.rect.left + (b.rect.right - b.rect.left) * sx;
      const py = mapRect.top + b.rect.top + (b.rect.bottom - b.rect.top) * sy;
      const topEl = document.elementFromPoint(px, py);
      if (topEl && !container.contains(topEl)) {
        defects.push(`under-ui ${b.id}: ${topEl.closest('[data-testid]')?.getAttribute('data-testid') ?? topEl.className?.toString().slice(0, 40) ?? topEl.tagName}`);
        break;
      }
    }
    if (b.rect.left < 0 || b.rect.top < 0 || b.rect.right > W || b.rect.bottom > H) defects.push(`clipped-by-edge ${b.id}`);
  }
  // Stack tops: the counter carrying the badge must stay mostly visible.
  const topsByOsid = new Map();
  // The stack top is the last counter painted at its settlement (the old pipeline painted
  // in feature order, so for it this is whichever member happened to come last).
  for (const b of bodies) topsByOsid.set(b.osid, b);
  for (const b of topsByOsid.values()) {
    const area = (b.rect.right - b.rect.left) * (b.rect.bottom - b.rect.top);
    let covered = 0;
    for (const other of bodies) if (other.order > b.order) covered += overlapArea(b.rect, other.rect);
    if (covered > area * 0.5) defects.push(`stack-top-buried ${b.id}@${b.osid}: ${Math.round(100 * covered / area)}% covered by later counters`);
  }
  // Badges: deck badge entries (separate layer, or badge rows inside the icon layer).
  const badgeRows = [
    ...(badgeLayer?.props?.data ?? []).map((f) => ({ f, layer: badgeLayer })),
    ...iconData.filter(isBadge).map((f) => ({ f, layer: iconLayer })),
  ];
  for (const { f, layer } of badgeRows) {
    const p = map.project(f.geometry.coordinates);
    const o = offsetOf(layer, f);
    const bx = p.x + o[0];
    const by = p.y + o[1];
    const top = topsByOsid.get(f.properties.location_osid);
    const near = top && bx >= top.rect.left - 14 && bx <= top.rect.right + 14 && by >= top.rect.top - 14 && by <= top.rect.bottom + 14;
    if (!near) defects.push(`orphan-deck-badge ${f.properties.location_osid} at (${Math.round(bx)},${Math.round(by)})`);
    if (underPanel({ x: bx, y: by })) defects.push(`badge-under-panel ${f.properties.location_osid}`);
    const order = iconData.indexOf(f);
    if (order >= 0) {
      const radius = (typeof layer.props.getSize === 'function' ? layer.props.getSize(f) : 16) / 2;
      const badgeRect = { left: bx - radius, right: bx + radius, top: by - radius, bottom: by + radius };
      let covered = 0;
      for (const other of bodies) if (other.order > order) covered += overlapArea(badgeRect, other.rect);
      if (covered > (2 * radius) ** 2 * 0.3) defects.push(`badge-covered ${f.properties.location_osid}: ${Math.round(100 * covered / (2 * radius) ** 2)}%`);
    }
  }
  const domBadges = Array.from(document.querySelectorAll('[data-awwv-formation-stack-count]'));
  let domVisibleBadges = 0;
  for (const span of domBadges) {
    const st = getComputedStyle(span);
    const button = span.closest('button');
    const visible = st.display !== 'none' && st.visibility !== 'hidden' && Number(st.opacity) > 0
      && Number(getComputedStyle(button).opacity) > 0;
    if (!visible) continue;
    domVisibleBadges += 1;
    const osid = button?.dataset.awwvFormationStackOsid;
    const r = span.getBoundingClientRect();
    const bx = r.left + r.width / 2 - mapRect.left;
    const by = r.top + r.height / 2 - mapRect.top;
    const top = topsByOsid.get(osid);
    const near = top && bx >= top.rect.left - 14 && bx <= top.rect.right + 14 && by >= top.rect.top - 14 && by <= top.rect.bottom + 14;
    if (!near) defects.push(`orphan-dom-badge ${osid} at (${Math.round(bx)},${Math.round(by)})`);
  }
  const manager = iconLayer?.state?.iconManager;
  const mapping = manager?._mapping ?? {};
  const atlas = {
    mapped: Object.keys(mapping).length,
    pending: Object.keys(manager?._pendingCount !== undefined ? {} : {}).length,
    pendingCount: manager?._pendingCount ?? null,
    texture: manager?._texture ? `${manager._texture.width}x${manager._texture.height}` : null,
    canvas: manager?._canvas ? `${manager._canvas.width}x${manager._canvas.height}` : null,
    unmappedRows: iconData.filter((f) => {
      const icon = iconLayer.props.getIcon(f);
      return !mapping[typeof icon === 'string' ? icon : (icon?.id ?? icon?.url)];
    }).length,
  };
  // Page-space points that must change when counters are switched off: each stack top's
  // body centre and each badge centre (checked against real screenshots by the caller).
  const paintTargets = [];
  for (const b of topsByOsid.values()) {
    paintTargets.push({ kind: 'counter', id: b.id, x: mapRect.left + (b.rect.left + b.rect.right) / 2, y: mapRect.top + (b.rect.top + b.rect.bottom) / 2, halfW: (b.rect.right - b.rect.left) * 0.3, halfH: (b.rect.bottom - b.rect.top) * 0.25 });
  }
  for (const { f, layer } of badgeRows) {
    const p = map.project(f.geometry.coordinates);
    const o = offsetOf(layer, f);
    paintTargets.push({ kind: 'badge', id: f.properties.location_osid, x: mapRect.left + p.x + o[0], y: mapRect.top + p.y + o[1], halfW: 3, halfH: 3 });
  }
  return {
    paintTargets,
    atlas,
    size: `${W}x${H}`, zoom: Number(map.getZoom().toFixed(2)), iconSize: Number(iconSize.toFixed(1)),
    tally, drawnCounters: bodies.length, deckBadges: badgeRows.length, domVisibleBadges,
    occluders: occluders.length, missing: missing.slice(0, 40), missingCount: missing.length, defects,
  };
}

async function findMapFrame(page) {
  for (let i = 0; i < 240; i++) {
    for (const f of page.frames()) {
      const ok = await f.evaluate(() => Boolean(window.__awwvCounterAuditSources?.map?.())).catch(() => false);
      if (ok) return f;
    }
    await sleep(250);
  }
  throw new Error('map frame with __awwvCounterAuditSources not found (is the dev map on 3002 from this repo?)');
}

async function settle(frame) {
  await frame.evaluate(() => new Promise((resolve) => {
    const map = window.__awwvCounterAuditSources.map();
    const done = () => setTimeout(resolve, 900);
    if (map.isMoving()) map.once('moveend', done); else done();
  }));
  await sleep(500);
}

(async () => {
  const userDataDir = path.join(outDir, 'user-data');
  const app = await electron.launch({
    cwd: repo,
    args: ['.', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    timeout: 120000,
  });
  let failed = false;
  try {
    let page = null;
    let surface = null;
    for (let i = 0; i < 480 && !surface; i++) {
      for (const w of app.windows()) {
        for (const f of w.frames()) {
          const splash = await f.getByTestId('opening-splash-art').isVisible().catch(() => false);
          const newWar = await f.getByRole('button', { name: /^New War$/i }).first().isVisible().catch(() => false);
          if (splash || newWar) { surface = f; page = w; break; }
        }
        if (surface) break;
      }
      if (!surface) await sleep(250);
    }
    if (!surface) {
      for (const [index, w] of app.windows().entries()) await w.screenshot({ path: path.join(outDir, `no-surface-${index}.png`) }).catch(() => {});
      throw new Error(`no campaign opening surface (${app.windows().length} windows; screenshots saved)`);
    }
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') log(`   console.${message.type()}: ${message.text().slice(0, 300)}`);
    });
    log('frame url:', surface.url());
    if (await surface.getByTestId('opening-splash-art').isVisible().catch(() => false)) {
      await surface.locator('[aria-labelledby="opening-splash-title"] button').first().click({ timeout: 30000 });
    }
    await surface.getByRole('button', { name: /^New War$/i }).first().click({ timeout: 60000 });
    await surface.getByTestId(`main-menu-faction-${faction}`).click({ timeout: 30000 });
    await surface.getByRole('button', { name: /^Take command$/i }).first().click({ timeout: 30000 });
    await surface.getByRole('radio', { name: /^Let history run as it did$/i }).first().click({ timeout: 30000 });
    const begin = surface.getByRole('button', { name: /^Begin$/i }).first();
    await begin.click({ timeout: 30000 });
    await begin.waitFor({ state: 'hidden', timeout: 120000 });
    log(`campaign started (${faction})`);
    await sleep(6000);
    const results = [];
    let frame = null;
    for (const size of sizesArg.split(',')) {
      const [w, h] = size.split('x').map(Number);
      await app.evaluate(({ BrowserWindow }, dims) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win.isMaximized()) win.unmaximize();
        if (win.isFullScreen()) win.setFullScreen(false);
        win.setContentSize(dims.w, dims.h);
      }, { w, h });
      await sleep(2500);
      // Open the War Map at this size so the default camera is this window's own.
      if (!frame) {
        await surface.getByTestId('warroom-toolbar-war-map').click({ timeout: 30000 });
        frame = await findMapFrame(page);
        await sleep(6000);
      }
      const inner = await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`);
      log(`\n== window ${size} (renderer ${inner})`);
      // Default view: the camera the map opens with for this window.
      await frame.evaluate(() => {
        const map = window.__awwvCounterAuditSources.map();
        map.resize();
      });
      await settle(frame);
      const views = [
        ['default', null],
        ['operational z8.6', { zoom: 8.6 }],
        ['close z10.5', { zoom: 10.5 }],
        ['whole-country', { zoom: 'min' }],
      ];
      const defaultCamera = await frame.evaluate(() => {
        const map = window.__awwvCounterAuditSources.map();
        return { center: map.getCenter().toArray(), zoom: map.getZoom() };
      });
      for (const [name, cam] of views) {
        if (cam) {
          await frame.evaluate((c) => {
            const map = window.__awwvCounterAuditSources.map();
            const zoom = c.cam.zoom === 'min' ? map.getMinZoom() : c.cam.zoom;
            map.jumpTo({ center: c.center, zoom });
          }, { cam, center: defaultCamera.center });
          await settle(frame);
        }
        const r = await frame.evaluate(audit);
        r.view = name;
        r.window = size;
        results.push(r);
        log(`[${name}] ${r.size} z${r.zoom} h${r.iconSize}: own ${r.tally?.own.expected} visible: ${r.tally?.own.drawn} drawn, ${r.tally?.own.represented} represented, ${r.tally?.own.panelEdge ?? 0} hidden at a panel edge; enemy ${r.tally?.enemy.expected} visible: ${r.tally?.enemy.drawn} drawn, ${r.tally?.enemy.represented} represented, ${r.tally?.enemy.panelEdge ?? 0} at a panel edge; badges deck=${r.deckBadges} domVisible=${r.domVisibleBadges}; defects=${r.defects?.length}`);
        log(`   atlas: ${JSON.stringify(r.atlas)}`);
        for (const d of (r.defects ?? []).slice(0, 25)) log('   defect:', d);
        for (const m of (r.missing ?? []).slice(0, 10)) log('   missing:', m);
        if (r.error || (r.defects?.length ?? 0) > 0 || (r.missingCount ?? 0) > 0) failed = true;
        const shot = `${size}-${name.replace(/[^a-z0-9]+/gi, '_')}.png`;
        const onShot = await page.screenshot({ path: path.join(outDir, shot) });
        // Paint check: every stack top and badge the layout says is drawn must actually
        // change the screen when counters are switched off (catches blank sprites).
        await frame.evaluate(async () => (await import('/store/gameStore.ts')).useGameStore.getState().setFormationsVisible(false));
        await sleep(900);
        const offShot = await page.screenshot();
        await frame.evaluate(async () => (await import('/store/gameStore.ts')).useGameStore.getState().setFormationsVisible(true));
        await settle(frame);
        const on = PNG.sync.read(onShot);
        const off = PNG.sync.read(offShot);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const scale = on.width / innerWidth;
        const unpainted = [];
        for (const t of r.paintTargets ?? []) {
          let diff = 0;
          let n = 0;
          for (let dy = -t.halfH; dy <= t.halfH; dy += Math.max(1, t.halfH / 3)) {
            for (let dx = -t.halfW; dx <= t.halfW; dx += Math.max(1, t.halfW / 4)) {
              const px = Math.round((t.x + dx) * scale);
              const py = Math.round((t.y + dy) * scale);
              if (px < 0 || py < 0 || px >= on.width || py >= on.height) continue;
              const i = (py * on.width + px) * 4;
              diff += Math.abs(on.data[i] - off.data[i]) + Math.abs(on.data[i + 1] - off.data[i + 1]) + Math.abs(on.data[i + 2] - off.data[i + 2]);
              n += 1;
            }
          }
          if (n > 0 && diff / n < 24) unpainted.push(`${t.kind} ${t.id}`);
        }
        log(`   paint check: ${(r.paintTargets ?? []).length - unpainted.length}/${(r.paintTargets ?? []).length} stack tops and badges visibly painted`);
        for (const u of unpainted.slice(0, 15)) log('   defect: not-painted', u);
        if (unpainted.length > 0) failed = true;
        r.unpainted = unpainted;
        delete r.paintTargets;
      }
      await frame.evaluate((c) => {
        window.__awwvCounterAuditSources.map().jumpTo({ center: c.center, zoom: c.zoom });
      }, defaultCamera);
      await settle(frame);
    }
    fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  } catch (error) {
    failed = true;
    log('ERROR', String(error?.stack ?? error));
  } finally {
    await app.close().catch(() => {});
  }
  log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(failed ? 1 : 0);
})();
