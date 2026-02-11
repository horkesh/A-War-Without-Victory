import type { GameState } from '../src/state/game_state.js';

type GeoFeature = {
  properties?: { sid?: string; municipality_id?: number };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any };
};

type SettlementNameRecord = { name?: string; mun_code?: string };
type SettlementNamesData = { by_census_id?: Record<string, SettlementNameRecord> };
type MunicipalityNameRecord = { display_name?: string; mun1990_id?: string };
type MunicipalityNamesData = { by_municipality_id?: Record<string, MunicipalityNameRecord> };
type MunicipalityControllersData = { mappings?: Record<string, string | null> };
type EdgeRecord = { a: string; b: string };
type MunicipalityControlStatusRow = { mun1990_id: string; control_status: string };
type MunicipalityControlStatusData = { rows?: MunicipalityControlStatusRow[] };

const canvas = document.getElementById('map') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const saveInput = document.getElementById('save-input') as HTMLInputElement;
const phasePill = document.getElementById('phase-pill') as HTMLSpanElement;
const turnPill = document.getElementById('turn-pill') as HTMLSpanElement;
const controlSummary = document.getElementById('control-summary') as HTMLDivElement;
const exhaustionSummary = document.getElementById('exhaustion-summary') as HTMLDivElement;
const negotiationSummary = document.getElementById('negotiation-summary') as HTMLDivElement;
const ivpSummary = document.getElementById('ivp-summary') as HTMLDivElement;
const hoverInfo = document.getElementById('hover-info') as HTMLDivElement;

const SIDE_COLORS: Record<string, string> = {
  RBiH: 'rgb(70, 120, 80)',
  RS: 'rgb(180, 50, 50)',
  HRHB: 'rgb(60, 100, 140)',
  null: 'rgb(68, 68, 68)',
};

const state: {
  gameState: GameState | null;
  polygons: Map<string, GeoFeature>;
  edges: EdgeRecord[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  settlementNames: Map<string, string>;
  settlementMunCodes: Map<string, string>;
  centroidsByRawSid: Map<string, [number, number]>;
  municipalityNames: Map<string, string>;
  municipalityMun1990: Map<string, string>;
  municipalityControlStatus: Map<string, string>;
  municipalityControllers: Map<string, string | null>;
  zoom: number;
  panX: number;
  panY: number;
  fitScale: number;
} = {
  gameState: null,
  polygons: new Map(),
  edges: [],
  bounds: null,
  settlementNames: new Map(),
  settlementMunCodes: new Map(),
  centroidsByRawSid: new Map(),
  municipalityNames: new Map(),
  municipalityMun1990: new Map(),
  municipalityControlStatus: new Map(),
  municipalityControllers: new Map(),
  zoom: 1,
  panX: 0,
  panY: 0,
  fitScale: 1
};

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  updateFitScale();
  render();
}
window.addEventListener('resize', resizeCanvas);

function getBaseScale(): number {
  if (!state.bounds) return 1;
  const { minX, minY, maxX, maxY } = state.bounds;
  const width = maxX - minX;
  const height = maxY - minY;
  return Math.min(canvas.width / width, canvas.height / height) * 0.95;
}

function updateFitScale() {
  state.fitScale = getBaseScale();
}

function computeBounds(polygons: Map<string, GeoFeature>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const feature of polygons.values()) {
    const coords = feature.geometry.coordinates;
    const rings = feature.geometry.type === 'Polygon' ? [coords] : coords;
    for (const poly of rings) {
      for (const ring of poly) {
        for (const [x, y] of ring) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function project(x: number, y: number) {
  if (!state.bounds) return [0, 0];
  const { minX, minY, maxX, maxY } = state.bounds;
  const scale = state.fitScale * state.zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const screenX = (x - centerX) * scale + canvas.width / 2 + state.panX;
  const screenY = (y - centerY) * scale + canvas.height / 2 + state.panY;
  return [screenX, screenY];
}

function screenToWorld(screenX: number, screenY: number) {
  if (!state.bounds) return { x: 0, y: 0 };
  const { minX, minY, maxX, maxY } = state.bounds;
  const scale = state.fitScale * state.zoom;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const worldX = (screenX - canvas.width / 2 - state.panX) / scale + centerX;
  const worldY = (screenY - canvas.height / 2 - state.panY) / scale + centerY;
  return { x: worldX, y: worldY };
}

async function loadPolygons() {
  const response = await fetch('/data/derived/settlements_viewer_v1.geojson');
  const geojson = response.ok
    ? await response.json()
    : await (await fetch('/tools/map_viewer_simple/data/derived/settlements_polygons.geojson')).json();
  const map = new Map<string, GeoFeature>();
  const centroids = new Map<string, [number, number]>();
  for (const feature of geojson.features as GeoFeature[]) {
    const sid = feature.properties?.sid;
    if (sid && typeof sid === 'string') {
      map.set(sid, feature);
      const rawSid = sid.startsWith('S') ? sid.slice(1) : sid;
      const centroid = computeFeatureCentroid(feature);
      if (rawSid && centroid) {
        centroids.set(rawSid, centroid);
      }
    }
  }
  state.polygons = map;
  state.centroidsByRawSid = centroids;
  state.bounds = computeBounds(map);
  updateFitScale();
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  resizeCanvas();
}

async function loadNameMaps() {
  const [settlementData, municipalityData, controllerData] = await Promise.all([
    fetch('/data/derived/settlement_names.json').then((r) => r.json() as Promise<SettlementNamesData>),
    fetch('/data/derived/mun1990_names.json').then((r) => r.json() as Promise<MunicipalityNamesData>),
    fetch('/data/source/municipality_political_controllers.json').then((r) => r.json() as Promise<MunicipalityControllersData>)
  ]);

  const settlementNames = new Map<string, string>();
  const settlementMunCodes = new Map<string, string>();
  const settlementEntries = settlementData.by_census_id ?? {};
  for (const [sid, record] of Object.entries(settlementEntries)) {
    if (record?.name) settlementNames.set(sid, record.name);
    if (record?.mun_code) settlementMunCodes.set(sid, record.mun_code);
  }
  state.settlementNames = settlementNames;
  state.settlementMunCodes = settlementMunCodes;

  const municipalityNames = new Map<string, string>();
  const municipalityMun1990 = new Map<string, string>();
  const municipalityEntries = municipalityData.by_municipality_id ?? {};
  for (const [id, record] of Object.entries(municipalityEntries)) {
    if (record?.display_name) municipalityNames.set(id, record.display_name);
    if (record?.mun1990_id) municipalityMun1990.set(id, record.mun1990_id);
  }
  state.municipalityNames = municipalityNames;
  state.municipalityMun1990 = municipalityMun1990;

  const municipalityControllers = new Map<string, string | null>();
  const controllerEntries = controllerData.mappings ?? {};
  for (const [munCode, controller] of Object.entries(controllerEntries)) {
    municipalityControllers.set(munCode, controller ?? null);
  }
  state.municipalityControllers = municipalityControllers;
}

async function loadMunicipalityControlStatus(): Promise<void> {
  try {
    const response = await fetch('/data/source/municipalities_initial_control_status.json');
    if (!response.ok) return;
    const data = (await response.json()) as MunicipalityControlStatusData;
    const map = new Map<string, string>();
    for (const row of data.rows ?? []) {
      if (row?.mun1990_id && row?.control_status) {
        map.set(row.mun1990_id, row.control_status);
      }
    }
    state.municipalityControlStatus = map;
  } catch {
    state.municipalityControlStatus = new Map();
  }
}

async function loadEdges(): Promise<void> {
  const response = await fetch('/data/derived/settlement_edges.json');
  const json = response.ok
    ? await response.json()
    : await (await fetch('/tools/map_viewer_simple/data/derived/settlement_edges.json')).json();
  const edges = Array.isArray(json.edges) ? json.edges : Array.isArray(json) ? json : [];
  state.edges = edges.filter((e: any) => typeof e?.a === 'string' && typeof e?.b === 'string');
}

function getAuthorityState(controlStatus: string | null): 'consolidated' | 'contested' {
  if (controlStatus === 'CONTESTED' || controlStatus === 'HIGHLY_CONTESTED') return 'contested';
  return 'consolidated';
}

const contestedHatchPatterns = new Map<string, CanvasPattern>();

function getContestedHatchPattern(color: string): CanvasPattern | null {
  const cached = contestedHatchPatterns.get(color);
  if (cached) return cached;
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 12;
  patternCanvas.height = 12;
  const pctx = patternCanvas.getContext('2d');
  if (!pctx) return null;
  pctx.strokeStyle = '#000';
  pctx.lineWidth = 1;
  pctx.beginPath();
  pctx.moveTo(0, 0);
  pctx.lineTo(12, 12);
  pctx.moveTo(12, 0);
  pctx.lineTo(0, 12);
  pctx.stroke();
  const pattern = ctx.createPattern(patternCanvas, 'repeat');
  if (pattern) contestedHatchPatterns.set(color, pattern);
  return pattern ?? null;
}

function drawFeature(
  feature: GeoFeature,
  controller: string | null,
  authorityState: 'consolidated' | 'contested'
) {
  const coords = feature.geometry.coordinates;
  const polys = feature.geometry.type === 'Polygon' ? [coords] : coords;
  let fillStyle: string | CanvasPattern = SIDE_COLORS[controller ?? 'null'] ?? SIDE_COLORS.null;
  let opacity = 0.85;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
  ctx.lineWidth = 0;
  for (const poly of polys) {
    ctx.beginPath();
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i += 1) {
        const [x, y] = ring[i];
        const [sx, sy] = project(x, y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
    }
    ctx.closePath();
    ctx.fill();
    // No borders for settlement polygons
  }
  ctx.restore();

  if (authorityState === 'contested') {
    const baseColor = SIDE_COLORS[controller ?? 'null'] ?? SIDE_COLORS.null;
    const pattern = getContestedHatchPattern(baseColor);
    if (!pattern) return;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = pattern;
    ctx.beginPath();
    for (const poly of polys) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length; i += 1) {
          const [x, y] = ring[i];
          const [sx, sy] = project(x, y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
      }
    }
    ctx.closePath();
    ctx.clip('evenodd');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.bounds) return;
  const controllers = state.gameState?.political_controllers ?? {};
  for (const [sid, feature] of state.polygons.entries()) {
    const controlKey = resolveControlKey(feature);
    const directController = (controlKey && controllers[controlKey]) ?? controllers[sid] ?? null;
    const controller = directController ?? getMunicipalityFallback(feature);
    const status = getControlStatus(feature);
    const authorityState = getAuthorityState(status);
    drawFeature(feature, controller, authorityState);
  }
  renderFrontlines();
}

function resolveControlKey(feature: GeoFeature): string | null {
  const sid = feature.properties?.sid;
  const municipalityId = feature.properties?.municipality_id;
  if (typeof sid !== 'string' || typeof municipalityId !== 'number') return null;
  const rawSid = sid.startsWith('S') ? sid.slice(1) : sid;
  const munCode = state.settlementMunCodes.get(rawSid);
  if (munCode) return `${munCode}:${rawSid}`;
  return `${municipalityId}:${rawSid}`;
}

function getMunicipalityFallback(feature: GeoFeature): string | null {
  const sid = feature.properties?.sid;
  if (typeof sid !== 'string') return null;
  const rawSid = sid.startsWith('S') ? sid.slice(1) : sid;
  const munCode = state.settlementMunCodes.get(rawSid);
  if (!munCode) return null;
  const controller = state.municipalityControllers.get(munCode);
  return controller ?? null;
}

function getContestedStatus(feature: GeoFeature): boolean | null {
  const contested = state.gameState?.contested_control ?? {};
  const controlKey = resolveControlKey(feature);
  if (controlKey && typeof contested[controlKey] === 'boolean') {
    return contested[controlKey];
  }
  const sid = feature.properties?.sid;
  if (typeof sid === 'string' && typeof contested[sid] === 'boolean') {
    return contested[sid];
  }
  return null;
}

function getControlStatus(feature: GeoFeature): string | null {
  const municipalityId = feature.properties?.municipality_id;
  if (municipalityId === undefined) return null;
  const mun1990Id = state.municipalityMun1990.get(String(municipalityId));
  if (!mun1990Id) return null;
  const entry = state.gameState?.municipalities?.[mun1990Id];
  return entry?.control_status ?? state.municipalityControlStatus.get(mun1990Id) ?? null;
}

function computeFeatureCentroid(feature: GeoFeature): [number, number] | null {
  const coords = feature.geometry.coordinates;
  const rings = feature.geometry.type === 'Polygon' ? [coords] : coords;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of rings) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function getControllerForSid(sid: string): string | null {
  const controllers = state.gameState?.political_controllers ?? {};
  const value = controllers[sid];
  return value ?? null;
}

function getCentroidForSimSid(simSid: string): [number, number] | null {
  const parts = simSid.split(':');
  if (parts.length < 2) return null;
  const rawSid = parts[1];
  return state.centroidsByRawSid.get(rawSid) ?? null;
}

function renderFrontlines() {
  if (!state.gameState || state.edges.length === 0) return;
  ctx.save();
  ctx.strokeStyle = 'rgb(30, 30, 30)';
  ctx.lineWidth = 3;
  ctx.setLineDash([15, 10]);
  for (const edge of state.edges) {
    const aController = getControllerForSid(edge.a);
    const bController = getControllerForSid(edge.b);
    if (!aController || !bController) continue;
    if (aController === bController) continue;
    const aCentroid = getCentroidForSimSid(edge.a);
    const bCentroid = getCentroidForSimSid(edge.b);
    if (!aCentroid || !bCentroid) continue;
    const [ax, ay] = project(aCentroid[0], aCentroid[1]);
    const [bx, by] = project(bCentroid[0], bCentroid[1]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();
  ctx.setLineDash([]);
}

function updateHoverInfo(feature: GeoFeature | null, controller: string | null) {
  if (!feature) {
    hoverInfo.textContent = 'Hover a settlement to see details.';
    return;
  }
  const sid = feature.properties?.sid ?? '--';
  const municipalityId = feature.properties?.municipality_id;
  const rawSid = typeof sid === 'string' && sid.startsWith('S') ? sid.slice(1) : sid;
  const settlementName =
    typeof rawSid === 'string' ? state.settlementNames.get(rawSid) ?? 'Unknown settlement' : 'Unknown settlement';
  const municipalityName =
    municipalityId !== undefined ? state.municipalityNames.get(String(municipalityId)) ?? 'Unknown municipality' : 'Unknown municipality';
  const controlKey = feature ? resolveControlKey(feature) : null;
  const directController = controlKey ? (state.gameState?.political_controllers ?? {})[controlKey] ?? null : null;
  const fallbackController = getMunicipalityFallback(feature);
  const controlLabel = directController ?? fallbackController ?? 'null';
  const sourceLabel = directController
    ? 'state'
    : fallbackController
      ? 'municipal fallback'
      : 'missing';
  const contested = getContestedStatus(feature);
  const contestedLabel = contested === null ? 'unknown' : contested ? 'yes' : 'no';
  const controlStatus = feature ? getControlStatus(feature) : null;
  const controlStatusLabel = controlStatus ?? 'unknown';
  hoverInfo.textContent = `${settlementName} (${sid}) | Municipality: ${municipalityName} | Control: ${controlLabel} (${sourceLabel}) | Control status: ${controlStatusLabel} | Contested: ${contestedLabel}`;
}

function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(x: number, y: number, coords: number[][][]): boolean {
  for (const ring of coords) {
    if (pointInRing(x, y, ring)) return true;
  }
  return false;
}

function findFeatureAt(x: number, y: number): GeoFeature | null {
  for (const feature of state.polygons.values()) {
    if (feature.geometry.type === 'Polygon') {
      if (pointInPolygon(x, y, feature.geometry.coordinates)) return feature;
    } else if (feature.geometry.type === 'MultiPolygon') {
      for (const poly of feature.geometry.coordinates) {
        if (pointInPolygon(x, y, poly)) return feature;
      }
    }
  }
  return null;
}

function updateSummary() {
  if (!state.gameState) return;
  const controllers = state.gameState.political_controllers ?? {};
  const counts: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
  for (const value of Object.values(controllers)) {
    const key = value ?? 'null';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const contestedMap = state.gameState.contested_control ?? {};
  const contestedCount = Object.values(contestedMap).filter((v) => v === true).length;
  const statusCounts: Record<string, number> = { SECURE: 0, CONTESTED: 0, HIGHLY_CONTESTED: 0 };
  for (const entry of Object.values(state.gameState.municipalities ?? {})) {
    const status = entry?.control_status;
    if (status && statusCounts[status] !== undefined) statusCounts[status] += 1;
  }
  controlSummary.textContent =
    `RBiH ${counts.RBiH} | RS ${counts.RS} | HRHB ${counts.HRHB} | Uncontrolled ${counts.null} | Contested ${contestedCount} | Status S ${statusCounts.SECURE} C ${statusCounts.CONTESTED} H ${statusCounts.HIGHLY_CONTESTED}`;

  const exhaustionLines = state.gameState.factions.map(
    (f) => `${f.id}: ${f.profile.exhaustion.toFixed(1)}`
  );
  exhaustionSummary.textContent = exhaustionLines.join(' | ');

  const negotiationLines = state.gameState.factions.map(
    (f) => `${f.id}: ${f.negotiation?.pressure ?? 0}`
  );
  negotiationSummary.textContent = negotiationLines.join(' | ');

  const ivp = state.gameState.international_visibility_pressure;
  if (ivp) {
    ivpSummary.textContent = `Sarajevo ${ivp.sarajevo_siege_visibility.toFixed(2)} | Enclaves ${ivp.enclave_humanitarian_pressure.toFixed(2)} | Momentum ${ivp.negotiation_momentum.toFixed(2)}`;
  } else {
    ivpSummary.textContent = '--';
  }
}

async function loadSave(file: File) {
  const text = await file.text();
  const json = JSON.parse(text) as GameState;
  state.gameState = json;
  phasePill.textContent = `phase: ${json.meta.phase ?? 'unknown'}`;
  turnPill.textContent = `turn: ${json.meta.turn}`;
  updateSummary();
  render();
}

saveInput.addEventListener('change', async (event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  await loadSave(target.files[0]);
});

let lastHoverSid: string | null = null;
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const world = screenToWorld(screenX, screenY);
  const feature = findFeatureAt(world.x, world.y);
  const sid = feature?.properties?.sid ?? null;
  if (sid === lastHoverSid) return;
  lastHoverSid = sid;
  const controllers = state.gameState?.political_controllers ?? {};
  const controlKey = feature ? resolveControlKey(feature) : null;
  const controller = controlKey ? controllers[controlKey] ?? null : null;
  updateHoverInfo(feature, controller);
});

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX = 0;
let panStartY = 0;

canvas.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  isDragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  panStartX = state.panX;
  panStartY = state.panY;
});

canvas.addEventListener('mousemove', (event) => {
  if (!isDragging) return;
  const dx = event.clientX - dragStartX;
  const dy = event.clientY - dragStartY;
  state.panX = panStartX + dx;
  state.panY = panStartY + dy;
  render();
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (!state.bounds) return;
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const worldBefore = screenToWorld(screenX, screenY);

  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const nextZoom = state.zoom * zoomFactor;
  const minZoom = 0.2;
  const maxZoom = 20;
  state.zoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));

  const { minX, minY, maxX, maxY } = state.bounds;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const scale = state.fitScale * state.zoom;
  state.panX = screenX - (worldBefore.x - centerX) * scale - canvas.width / 2;
  state.panY = screenY - (worldBefore.y - centerY) * scale - canvas.height / 2;
  render();
});

canvas.addEventListener('dblclick', () => {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  render();
});

Promise.all([loadPolygons(), loadNameMaps(), loadMunicipalityControlStatus(), loadEdges()])
  .then(() => render())
  .catch((err) => {
    controlSummary.textContent = `Failed to load viewer data: ${err}`;
  });
