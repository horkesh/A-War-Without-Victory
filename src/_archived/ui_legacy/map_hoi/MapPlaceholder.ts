/**
 * Minimal 2D placeholder: draws operational settlement outlines from GeoJSON.
 * Used until HoIMapRenderer (Phase 4) replaces the map area.
 */

function getBaseUrl(): string {
  if (typeof window === 'undefined' || !window.location?.origin) return '';
  return window.location.origin;
}

type Position = [number, number];
type Ring = Position[];
type PolygonCoords = Ring[];

interface GeoJSONFeature {
  type: 'Feature';
  geometry?: { type: 'Polygon'; coordinates: PolygonCoords } | { type: 'MultiPolygon'; coordinates: PolygonCoords[] };
  properties?: Record<string, unknown>;
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/** Scale and translate from geographic [lng, lat] to canvas. */
function project(
  lng: number,
  lat: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  w: number,
  h: number,
  padding: number
): { x: number; y: number } {
  const pw = w - 2 * padding;
  const ph = h - 2 * padding;
  const x = padding + ((lng - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * pw;
  const y = h - padding - ((lat - bounds.minY) / (bounds.maxY - bounds.minY || 1)) * ph;
  return { x, y };
}

function computeBounds(features: GeoJSONFeature[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    const ringsIter = g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
    for (const ring of ringsIter) {
      for (const [lng, lat] of ring) {
        if (lng < minX) minX = lng;
        if (lat < minY) minY = lat;
        if (lng > maxX) maxX = lng;
        if (lat > maxY) maxY = lat;
      }
    }
  }
  return { minX, minY, maxX: maxX > minX ? maxX : minX + 1, maxY: maxY > minY ? maxY : minY + 1 };
}

export function initMapPlaceholder(container: HTMLElement): void {
  const placeholder = container.querySelector('.hoi-map-placeholder') as HTMLElement | null;
  if (placeholder) placeholder.textContent = 'Loading map…';

  const canvas = document.createElement('canvas');
  canvas.className = 'hoi-map-placeholder-canvas';
  canvas.setAttribute('aria-label', 'Map view');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const url = `${getBaseUrl()}/data/derived/operational/operational_settlements.geojson`;
  let lastData: GeoJSONFC | undefined;

  const ro = new ResizeObserver(() => {
    if (lastData) draw(canvas, lastData);
  });
  ro.observe(container);

  fetch(url)
    .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then((data: GeoJSONFC) => {
      if (placeholder) placeholder.style.display = 'none';
      lastData = data;
      draw(canvas, data);
    })
    .catch(() => {
      if (placeholder) {
        placeholder.textContent = 'Map (data unavailable)';
        placeholder.style.display = 'flex';
      }
      lastData = undefined;
      draw(canvas, undefined, 'Map (data unavailable)');
    });
}

function draw(canvas: HTMLCanvasElement, data?: GeoJSONFC, noDataMessage?: string): void {
  const dpr = window.devicePixelRatio ?? 1;
  let w = canvas.clientWidth;
  let h = canvas.clientHeight;
  if (w <= 0 || h <= 0) {
    const rect = canvas.getBoundingClientRect();
    w = rect.width || 400;
    h = rect.height || 300;
  }
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#252220';
  ctx.fillRect(0, 0, w, h);

  if (!data?.features?.length) {
    ctx.fillStyle = '#9a9080';
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(noDataMessage ?? 'Loading map…', w / 2, h / 2);
    return;
  }

  const bounds = computeBounds(data.features);
  const padding = 20;

  ctx.strokeStyle = 'rgba(180, 160, 130, 0.25)';
  ctx.lineWidth = 0.5;
  ctx.fillStyle = 'rgba(28, 26, 23, 0.5)';

  for (const f of data.features) {
    const g = f.geometry;
    if (!g) continue;
    const rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.flatMap((p) => [p[0]]);
    for (const ring of rings) {
      if (ring.length < 2) continue;
      const p0 = project(ring[0][0], ring[0][1], bounds, w, h, padding);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < ring.length; i++) {
        const p = project(ring[i][0], ring[i][1], bounds, w, h, padding);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}
