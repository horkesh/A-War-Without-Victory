/**
 * Standalone War Planning Map viewer — from scratch, full GUI.
 * Open via http://localhost:3000/map_viewer_standalone.html
 * Fetches data using window.location.origin so /data/ always hits the same host.
 */

type Position = [number, number] | [number, number, number];
type Ring = Position[];
type PolygonCoords = Ring[];
type MultiPolygonCoords = PolygonCoords[];

type GeoFeature = {
    properties?: { sid?: string; municipality_id?: number };
    geometry: { type: 'Polygon'; coordinates: PolygonCoords } | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
};

const SIDE_COLORS: Record<string, string> = {
    RBiH: 'rgba(27, 94, 32, 0.65)',
    RS: 'rgba(226, 74, 74, 0.65)',
    HRHB: 'rgba(74, 144, 226, 0.65)',
    null: 'rgba(100, 100, 100, 0.4)'
};

/** Solid border color for panel faction bar (no alpha). */
const SIDE_BORDER_COLORS: Record<string, string> = {
    RBiH: 'rgb(27, 94, 32)',
    RS: 'rgb(226, 74, 74)',
    HRHB: 'rgb(74, 144, 226)',
    null: 'rgb(100, 100, 100)'
};

const NATO_SAND = '#F4EBD0';

const ZOOM_FACTORS = [1, 2.5, 5];
const ZOOM_LABELS = ['STRATEGIC', 'OPERATIONAL', 'TACTICAL'];

/** Formation shape for canvas: square = brigade, diamond = corps/operational_group. */
const FORMATION_SHAPES: Record<string, 'square' | 'diamond'> = {
    militia: 'square',
    brigade: 'square',
    territorial_defense: 'square',
    operational_group: 'diamond',
    corps_asset: 'diamond'
};
const FORMATION_DEFAULT_SHAPE: 'square' | 'diamond' = 'square';

/** Key for political_control_data.by_settlement_id (expects S-prefixed). */
function controlKey(sid: string): string {
    return sid.startsWith('S') ? sid : `S${sid}`;
}

/**
 * Build a lookup that works with both key formats:
 * - S-prefixed: "S100013" (used in data/derived/ and some builds)
 * - mun:census: "10014:100013" (used in warroom/public when staged from some pipelines)
 * Viewer GeoJSON has sid "S100013"; we map mun:census to S-prefixed so lookup works.
 */
function buildControlLookup(by_settlement_id: Record<string, string | null>): Record<string, string | null> {
    const out: Record<string, string | null> = { ...by_settlement_id };
    for (const [k, v] of Object.entries(by_settlement_id)) {
        if (k.includes(':')) {
            const census = k.split(':')[1];
            if (census != null) {
                const sKey = census.startsWith('S') ? census : `S${census}`;
                if (out[sKey] === undefined) out[sKey] = v;
            }
        }
    }
    return out;
}

function buildStatusLookup(control_status_by_settlement_id: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = { ...control_status_by_settlement_id };
    for (const [k, v] of Object.entries(control_status_by_settlement_id)) {
        if (k.includes(':')) {
            const census = k.split(':')[1];
            if (census != null) {
                const sKey = census.startsWith('S') ? census : `S${census}`;
                if (out[sKey] === undefined) out[sKey] = v;
            }
        }
    }
    return out;
}

function getBaseUrl(): string {
    if (typeof window === 'undefined' || !window.location?.origin) return '';
    return window.location.origin;
}

/** Centroid of first ring of first polygon (for formation icon placement). */
function polygonCentroid(feature: GeoFeature): [number, number] | null {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const ring = polys[0]?.[0];
    if (!ring || ring.length < 2) return null;
    let sx = 0, sy = 0;
    for (const [x, y] of ring) {
        sx += x;
        sy += y;
    }
    return [sx / ring.length, sy / ring.length];
}

function boundsFromPolygons(polygons: Map<string, GeoFeature>): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const feature of polygons.values()) {
        const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        for (const poly of polys) {
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
    if (!isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
}

function drawPolygonPath(
    ctx: CanvasRenderingContext2D,
    feature: GeoFeature,
    project: (x: number, y: number) => [number, number]
): void {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    ctx.beginPath();
    for (const poly of polys) {
        for (const ring of poly) {
            for (let i = 0; i < ring.length; i++) {
                const [x, y] = ring[i];
                const [sx, sy] = project(x, y);
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
        }
    }
}

function pointInPolygon(x: number, y: number, feature: GeoFeature): boolean {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const poly of polys) {
        const ring = poly[0];
        if (!ring || ring.length < 3) continue;
        let inside = false;
        let j = ring.length - 1;
        for (let i = 0; i < ring.length; i++) {
            const [xi, yi] = ring[i];
            const [xj, yj] = ring[j];
            if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
            j = i;
        }
        if (inside) return true;
    }
    return false;
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

async function loadJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    if (text.trimStart().startsWith('<')) throw new Error(`Got HTML instead of JSON: ${url}`);
    return JSON.parse(text) as T;
}

async function main(): Promise<void> {
    const statusEl = document.getElementById('status') as HTMLElement;
    const canvas = document.getElementById('map-canvas') as HTMLCanvasElement;
    const zoomPill = document.getElementById('zoom-pill') as HTMLElement;
    const turnDisplay = document.getElementById('turn-display') as HTMLElement;
    const panel = document.getElementById('panel') as HTMLElement;
    const panelSections = document.getElementById('panel-sections') as HTMLElement;
    const legendEl = document.getElementById('legend') as HTMLElement;
    const layerPanelEl = document.getElementById('layer-panel') as HTMLElement;
    const mapWrap = document.getElementById('map-wrap') as HTMLElement;
    let tooltipEl: HTMLElement | null = null;

    const base = getBaseUrl();
    if (!base) {
        statusEl.textContent = 'Cannot determine base URL. Open via http://localhost:3000/map_viewer_standalone.html';
        statusEl.classList.add('error');
        return;
    }

    statusEl.textContent = 'Loading map data…';

    let polygons = new Map<string, GeoFeature>();
    let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    let controlData: { by_settlement_id?: Record<string, string | null>; control_status_by_settlement_id?: Record<string, string> } = {};
    let baselineControl: typeof controlData = {};
    let settlementNames: Record<string, { name?: string; mun_code?: string }> = {};
    let mun1990Names: Record<string, { display_name?: string; mun1990_id?: string }> = {};
    let zoomLevel = 0;
    let zoomCenter = { x: 0.5, y: 0.5 };
    let layerControl = true;
    let layerContested = true;
    let layerFormations = true;
    let hatchPattern: CanvasPattern | null = null;
    /** Settlement under cursor (same as tooltip); used for click-to-open panel. */
    let hoveredFeature: GeoFeature | null = null;
    /** Formations from loaded state (id, faction, name, kind, hq_sid). */
    let loadedFormations: Array<{ id: string; faction: string; name: string; kind: string; hq_sid?: string }> = [];
    /** Settlement sid -> [x,y] centroid for formation icon placement. */
    let settlementCentroids = new Map<string, [number, number]>();

    try {
        const [geojson, control, namesRes, munRes] = await Promise.all([
            loadJson<{ features?: GeoFeature[] }>(`${base}/data/derived/settlements_a1_viewer.geojson`),
            loadJson<typeof controlData>(`${base}/data/derived/political_control_data.json`),
            fetch(`${base}/data/derived/settlement_names.json`).then(r => r.ok ? r.json() as Promise<{ by_census_id?: Record<string, { name?: string; mun_code?: string }> }> : {}).catch(() => ({})),
            fetch(`${base}/data/derived/mun1990_names.json`).then(r => r.ok ? r.json() as Promise<{ by_municipality_id?: Record<string, { display_name?: string; mun1990_id?: string }> }> : {}).catch(() => ({}))
        ]);
        baselineControl = {
            by_settlement_id: buildControlLookup(control.by_settlement_id ?? {}),
            control_status_by_settlement_id: buildStatusLookup(control.control_status_by_settlement_id ?? {})
        };
        controlData = { by_settlement_id: { ...(baselineControl.by_settlement_id ?? {}) }, control_status_by_settlement_id: { ...(baselineControl.control_status_by_settlement_id ?? {}) } };
        settlementNames = (namesRes as { by_census_id?: Record<string, { name?: string; mun_code?: string }> }).by_census_id ?? {};
        const munByMid = (munRes as { by_municipality_id?: Record<string, { display_name?: string; mun1990_id?: string }> }).by_municipality_id ?? {};
        mun1990Names = munByMid;
        const features = geojson?.features ?? [];
        for (const f of features) {
            const sid = f.properties?.sid;
            if (sid) {
                polygons.set(sid, f);
                const cen = polygonCentroid(f);
                if (cen) settlementCentroids.set(sid, cen);
            }
        }
        bounds = boundsFromPolygons(polygons);
        if (!bounds || polygons.size === 0) throw new Error('No features in GeoJSON');
        statusEl.textContent = '';
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        statusEl.textContent = `Error: ${msg}`;
        statusEl.classList.add('error');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        statusEl.textContent = 'Canvas not available';
        statusEl.classList.add('error');
        return;
    }

    function getHatchPattern(context: CanvasRenderingContext2D): CanvasPattern | null {
        if (hatchPattern) return hatchPattern;
        const c = document.createElement('canvas');
        c.width = 12;
        c.height = 12;
        const pctx = c.getContext('2d');
        if (!pctx) return null;
        pctx.strokeStyle = '#000';
        pctx.lineWidth = 1;
        pctx.beginPath();
        pctx.moveTo(0, 0);
        pctx.lineTo(12, 12);
        pctx.moveTo(12, 0);
        pctx.lineTo(0, 12);
        pctx.stroke();
        hatchPattern = context.createPattern(c, 'repeat');
        return hatchPattern;
    }

    function getViewBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
        if (!bounds) return null;
        let { minX, minY, maxX, maxY } = bounds;
        const factor = ZOOM_FACTORS[zoomLevel] ?? 1;
        if (factor > 1) {
            const rx = maxX - minX;
            const ry = maxY - minY;
            const cx = minX + rx * zoomCenter.x;
            const cy = minY + ry * zoomCenter.y;
            const halfW = (rx / factor) / 2;
            const halfH = (ry / factor) / 2;
            minX = cx - halfW;
            maxX = cx + halfW;
            minY = cy - halfH;
            maxY = cy + halfH;
        }
        return { minX, minY, maxX, maxY };
    }

    function getProject(): ((x: number, y: number) => [number, number]) | null {
        const view = getViewBox();
        if (!view) return null;
        const w = canvas.width;
        const h = canvas.height;
        const pad = 40;
        const scale = Math.min((w - pad * 2) / (view.maxX - view.minX), (h - pad * 2) / (view.maxY - view.minY));
        const offsetX = (w - (view.maxX - view.minX) * scale) / 2;
        const offsetY = (h - (view.maxY - view.minY) * scale) / 2;
        return (x: number, y: number) => [
            (x - view.minX) * scale + offsetX,
            (y - view.minY) * scale + offsetY
        ];
    }

    function canvasToData(canvasX: number, canvasY: number): [number, number] | null {
        const view = getViewBox();
        if (!view) return null;
        const w = canvas.width;
        const h = canvas.height;
        const pad = 40;
        const scale = Math.min((w - pad * 2) / (view.maxX - view.minX), (h - pad * 2) / (view.maxY - view.minY));
        const offsetX = (w - (view.maxX - view.minX) * scale) / 2;
        const offsetY = (h - (view.maxY - view.minY) * scale) / 2;
        const x = (canvasX - offsetX) / scale + view.minX;
        const y = (canvasY - offsetY) / scale + view.minY;
        return [x, y];
    }

    /** Set zoom level and center from a point in data coords (bounds space). */
    function setZoomCenteredOn(level: number, dataX: number, dataY: number): void {
        if (!bounds) return;
        const rx = bounds.maxX - bounds.minX;
        const ry = bounds.maxY - bounds.minY;
        zoomLevel = Math.max(0, Math.min(ZOOM_FACTORS.length - 1, level));
        zoomCenter.x = rx > 0 ? (dataX - bounds.minX) / rx : 0.5;
        zoomCenter.y = ry > 0 ? (dataY - bounds.minY) / ry : 0.5;
        zoomPill.textContent = ZOOM_LABELS[zoomLevel];
        render();
    }

    function zoomInAt(dataX: number, dataY: number): void {
        if (zoomLevel >= ZOOM_FACTORS.length - 1) return;
        setZoomCenteredOn(zoomLevel + 1, dataX, dataY);
    }
    function zoomOutAt(dataX: number, dataY: number): void {
        if (zoomLevel <= 0) return;
        setZoomCenteredOn(zoomLevel - 1, dataX, dataY);
    }

    function render(): void {
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!bounds || polygons.size === 0) {
            ctx.fillStyle = NATO_SAND;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No map data', w / 2, h / 2);
            return;
        }

        const project = getProject();
        if (!project) return;

        ctx.fillStyle = NATO_SAND;
        ctx.fillRect(0, 0, w, h);

        const controllers = controlData.by_settlement_id ?? {};
        const controlStatus = controlData.control_status_by_settlement_id ?? {};
        const contestedPattern = layerContested ? getHatchPattern(ctx) : null;

        const sidOrder = Array.from(polygons.keys()).sort();
        for (const sid of sidOrder) {
            const feature = polygons.get(sid)!;
            const key = controlKey(sid);
            const controller = controllers[key] ?? controllers[sid] ?? 'null';
            const status = controlStatus[key] ?? controlStatus[sid];
            const color = SIDE_COLORS[controller] ?? SIDE_COLORS['null'];
            const isContested = layerContested && (status === 'CONTESTED' || status === 'HIGHLY_CONTESTED');

            if (!layerControl) {
                ctx.fillStyle = 'rgba(120,120,120,0.3)';
            } else {
                ctx.fillStyle = color;
            }
            drawPolygonPath(ctx, feature, project);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            if (layerControl && isContested && contestedPattern) {
                ctx.save();
                ctx.fillStyle = contestedPattern;
                drawPolygonPath(ctx, feature, project);
                ctx.clip('evenodd');
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
            }
        }

        if (layerFormations && loadedFormations.length > 0 && project) {
            const size = zoomLevel >= 2 ? 10 : 7;
            const formationList = [...loadedFormations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
            for (const f of formationList) {
                const pos = f.hq_sid ? settlementCentroids.get(f.hq_sid) : undefined;
                if (!pos) continue;
                const [sx, sy] = project(pos[0], pos[1]);
                const shape = FORMATION_SHAPES[f.kind] ?? FORMATION_DEFAULT_SHAPE;
                const color = SIDE_BORDER_COLORS[f.faction] ?? SIDE_BORDER_COLORS['null'];
                ctx.fillStyle = color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                const h = size / 2;
                if (shape === 'diamond') {
                    ctx.beginPath();
                    ctx.moveTo(sx, sy - h);
                    ctx.lineTo(sx + h, sy);
                    ctx.lineTo(sx, sy + h);
                    ctx.lineTo(sx - h, sy);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillRect(sx - h, sy - h, size, size);
                    ctx.strokeRect(sx - h, sy - h, size, size);
                }
            }
        }

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(8, h - 28, 120, 22);
        ctx.fillStyle = '#eee';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(ZOOM_LABELS[zoomLevel], 14, h - 11);
    }

    function resize(): void {
        const wrap = canvas.parentElement;
        if (!wrap) return;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(wrap.clientWidth * dpr);
        const h = Math.floor(wrap.clientHeight * dpr);
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${wrap.clientWidth}px`;
        canvas.style.height = `${wrap.clientHeight}px`;
        render();
    }

    function showTooltip(text: string, x: number, y: number): void {
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'map-tooltip';
            tooltipEl.setAttribute('role', 'tooltip');
            Object.assign(tooltipEl.style, {
                position: 'fixed',
                left: '0',
                top: '0',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.85)',
                color: '#eee',
                fontSize: '12px',
                fontFamily: 'Arial',
                pointerEvents: 'none',
                zIndex: '9999',
                borderRadius: '4px',
                maxWidth: '280px',
                display: 'none'
            });
            document.body.appendChild(tooltipEl);
        }
        tooltipEl.textContent = text;
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = `${Math.min(x + 12, window.innerWidth - 290)}px`;
        tooltipEl.style.top = `${y + 12}px`;
    }
    function hideTooltip(): void {
        if (tooltipEl) tooltipEl.style.display = 'none';
    }

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        const pt = canvasToData(cx, cy);
        if (!pt) { hoveredFeature = null; hideTooltip(); return; }
        const [x, y] = pt;
        const sidOrder = Array.from(polygons.keys()).sort();
        hoveredFeature = null;
        for (let i = sidOrder.length - 1; i >= 0; i--) {
            const feature = polygons.get(sidOrder[i])!;
            if (pointInPolygon(x, y, feature)) {
                hoveredFeature = feature;
                const sid = feature.properties?.sid ?? '—';
                const key = controlKey(sid);
                const controller = controlData.by_settlement_id?.[key] ?? controlData.by_settlement_id?.[sid] ?? 'null';
                const censusId = sid.startsWith('S') ? sid.slice(1) : sid;
                const nameEntry = settlementNames[censusId] ?? settlementNames[sid];
                const name = (feature.properties as { name?: string })?.name ?? nameEntry?.name ?? sid;
                const pop = (feature.properties as { pop?: number })?.pop;
                const popStr = pop != null ? pop.toLocaleString() : '—';
                showTooltip(`${name} — ${controller} — pop ${popStr}`, e.clientX, e.clientY);
                return;
            }
        }
        hideTooltip();
    });
    canvas.addEventListener('mouseleave', () => { hoveredFeature = null; hideTooltip(); });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        const pt = canvasToData(cx, cy);
        if (!pt) return;
        const [x, y] = pt;
        if (e.deltaY < 0) zoomInAt(x, y);
        else if (e.deltaY > 0) zoomOutAt(x, y);
    }, { passive: false });

    function sectionHtml(header: string, body: string, collapsed = false): string {
        const id = `sec-${header.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')}`;
        return `<div class="panel-section ${collapsed ? 'collapsed' : ''}" data-section="${id}">
            <div class="panel-section-header" aria-expanded="${!collapsed}">${escapeHtml(header)}</div>
            <div class="panel-section-body">${body}</div>
        </div>`;
    }

    function openSettlementPanel(found: GeoFeature): void {
        const sid = found.properties?.sid ?? '—';
        const key = controlKey(sid);
        const controller = controlData.by_settlement_id?.[key] ?? controlData.by_settlement_id?.[sid] ?? 'null';
        const status = controlData.control_status_by_settlement_id?.[key] ?? controlData.control_status_by_settlement_id?.[sid];
        const censusId = sid.startsWith('S') ? sid.slice(1) : sid;
        const nameEntry = settlementNames[censusId] ?? settlementNames[sid];
        const props = found.properties as { name?: string; pop?: number; nato_class?: string; majority_ethnicity?: string };
        const name = props?.name ?? nameEntry?.name ?? sid;
        const pop = props?.pop;
        const popStr = pop != null ? pop.toLocaleString() : '—';
        const natoClass = props?.nato_class ?? '—';
        const munId = found.properties?.municipality_id;
        const munMid = munId != null ? String(munId) : undefined;
        const munEntry = munMid ? mun1990Names[munMid] : undefined;
        const munName = munEntry?.display_name ?? munMid ?? '—';
        const contested = status === 'CONTESTED' || status === 'HIGHLY_CONTESTED' ? ` (${status})` : '';
        const stateLabel = status ?? 'CONSOLIDATED';

        const settlementBody = [
            `<p><strong>Name</strong> ${escapeHtml(name)}</p>`,
            `<p><strong>SID</strong> ${escapeHtml(sid)}</p>`,
            `<p><strong>Type</strong> ${escapeHtml(natoClass)}</p>`,
            `<p><strong>Population</strong> ${escapeHtml(popStr)}</p>`
        ].join('');
        const munBody = [
            `<p><strong>Name</strong> ${escapeHtml(munName)}</p>`,
            munMid ? `<p><strong>mun1990_id</strong> ${escapeHtml(munMid)}</p>` : '',
            `<p><strong>Controller</strong> ${escapeHtml(controller)}</p>`
        ].join('');
        const controlBody = [
            `<p><strong>Faction</strong> ${escapeHtml(controller)}</p>`,
            `<p><strong>State</strong> ${escapeHtml(stateLabel)}</p>`
        ].join('');
        const hasDemographics = props?.majority_ethnicity != null;
        const demoBody = hasDemographics
            ? `<p><strong>Majority (1991)</strong> ${escapeHtml(props!.majority_ethnicity!)}</p>`
            : '<p class="panel-phase">Settlement-level / municipality-derived (when available)</p>';
        const militaryBody = '<p class="panel-phase">Assigned brigade, corps, exhaustion %, supply (Phase II)</p>';
        const stabilityBody = '<p class="panel-phase">Stability score, control strain (Phase I+)</p>';

        panelSections.innerHTML = [
            sectionHtml('SETTLEMENT', settlementBody),
            sectionHtml('MUNICIPALITY', munBody),
            sectionHtml('CONTROL', controlBody),
            sectionHtml('DEMOGRAPHICS', demoBody),
            sectionHtml('MILITARY (Phase II)', militaryBody, true),
            sectionHtml('STABILITY (Phase I+)', stabilityBody, true)
        ].join('');

        panel.style.borderLeftColor = SIDE_BORDER_COLORS[controller] ?? SIDE_BORDER_COLORS['null'];
        panel.classList.add('open');

        panelSections.querySelectorAll('.panel-section-header').forEach((el) => {
            el.addEventListener('click', () => {
                const section = (el as HTMLElement).closest('.panel-section');
                if (section) section.classList.toggle('collapsed');
                el.setAttribute('aria-expanded', section?.classList.contains('collapsed') ? 'false' : 'true');
            });
        });
    }

    function onMapClick(): void {
        if (hoveredFeature) {
            openSettlementPanel(hoveredFeature);
        } else {
            panel.classList.remove('open');
        }
    }
    // Use capture on container so we see the click when target is canvas (or map-wrap if canvas doesn’t get it)
    mapWrap.addEventListener('click', (e: MouseEvent) => {
        const t = e.target as Node;
        if (t === canvas || t === mapWrap) onMapClick();
    }, true);

    document.getElementById('close-panel')?.addEventListener('click', () => panel.classList.remove('open'));

    function zoomInButton(): void {
        if (!bounds) return;
        const cx = bounds.minX + (bounds.maxX - bounds.minX) * zoomCenter.x;
        const cy = bounds.minY + (bounds.maxY - bounds.minY) * zoomCenter.y;
        zoomInAt(cx, cy);
    }
    function zoomOutButton(): void {
        if (!bounds) return;
        const cx = bounds.minX + (bounds.maxX - bounds.minX) * zoomCenter.x;
        const cy = bounds.minY + (bounds.maxY - bounds.minY) * zoomCenter.y;
        zoomOutAt(cx, cy);
    }

    document.getElementById('zoom-in')?.addEventListener('click', zoomInButton);
    document.getElementById('zoom-out')?.addEventListener('click', zoomOutButton);
    document.getElementById('zoom-in-map')?.addEventListener('click', zoomInButton);
    document.getElementById('zoom-out-map')?.addEventListener('click', zoomOutButton);

    document.getElementById('layer-control')?.addEventListener('change', (e) => {
        layerControl = (e.target as HTMLInputElement).checked;
        render();
    });
    document.getElementById('layer-contested')?.addEventListener('change', (e) => {
        layerContested = (e.target as HTMLInputElement).checked;
        render();
    });
    document.getElementById('layer-formations')?.addEventListener('change', (e) => {
        layerFormations = (e.target as HTMLInputElement).checked;
        render();
    });

    const controlDatasetEl = document.getElementById('control-dataset') as HTMLSelectElement;
    controlDatasetEl?.addEventListener('change', async () => {
        const value = controlDatasetEl.value;
        if (value === 'sep1992') {
            try {
                const sep = await loadJson<typeof controlData>(`${getBaseUrl()}/data/derived/political_control_data_sep1992.json`);
                controlData = {
                    by_settlement_id: buildControlLookup(sep.by_settlement_id ?? {}),
                    control_status_by_settlement_id: buildStatusLookup(sep.control_status_by_settlement_id ?? {})
                };
                if (turnDisplay) turnDisplay.textContent = 'September 1992';
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                statusEl.textContent = `Failed to load Sep 1992 control: ${msg}`;
                statusEl.classList.add('error');
                return;
            }
        } else {
            controlData = { by_settlement_id: { ...(baselineControl.by_settlement_id ?? {}) }, control_status_by_settlement_id: { ...(baselineControl.control_status_by_settlement_id ?? {}) } };
            if (turnDisplay) turnDisplay.textContent = 'Turn 0 — Sep 1991';
        }
        statusEl.textContent = '';
        statusEl.classList.remove('error');
        render();
    });

    document.getElementById('layer-panel-toggle')?.addEventListener('click', () => {
        layerPanelEl.classList.toggle('collapsed');
    });
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'l' || e.key === 'L') {
            if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName ?? '')) {
                layerPanelEl.classList.toggle('collapsed');
                e.preventDefault();
            }
        }
        if (e.key === 'Escape') {
            if (panel.classList.contains('open')) {
                panel.classList.remove('open');
                e.preventDefault();
            } else if (zoomLevel > 0) {
                if (bounds) {
                    const cx = bounds.minX + (bounds.maxX - bounds.minX) * zoomCenter.x;
                    const cy = bounds.minY + (bounds.maxY - bounds.minY) * zoomCenter.y;
                    zoomOutAt(cx, cy);
                }
                e.preventDefault();
            }
        }
        if (e.key === 'Backspace') {
            if (zoomLevel > 0 && bounds) {
                const cx = bounds.minX + (bounds.maxX - bounds.minX) * zoomCenter.x;
                const cy = bounds.minY + (bounds.maxY - bounds.minY) * zoomCenter.y;
                zoomOutAt(cx, cy);
                e.preventDefault();
            }
        }
        if (e.key === '1' || e.key === '2' || e.key === '3') {
            const level = e.key === '1' ? 0 : e.key === '2' ? 1 : 2;
            if (bounds) {
                const cx = bounds.minX + (bounds.maxX - bounds.minX) * zoomCenter.x;
                const cy = bounds.minY + (bounds.maxY - bounds.minY) * zoomCenter.y;
                setZoomCenteredOn(level, cx, cy);
            }
            e.preventDefault();
        }
        if (e.key === '+' || e.key === '=') {
            zoomInButton();
            e.preventDefault();
        }
        if (e.key === '-') {
            zoomOutButton();
            e.preventDefault();
        }
    });
    document.getElementById('legend-toggle')?.addEventListener('click', () => legendEl.classList.toggle('hidden'));

    const loadStateBtn = document.getElementById('load-state');
    const loadStateInput = document.getElementById('load-state-input') as HTMLInputElement;
    if (loadStateBtn && loadStateInput) {
        loadStateBtn.addEventListener('click', () => loadStateInput.click());
        loadStateInput.addEventListener('change', () => {
            const file = loadStateInput.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const text = reader.result as string;
                    const state = JSON.parse(text) as Record<string, unknown>;
                    const pc = state.political_controllers as Record<string, string | null> | undefined;
                    if (pc && typeof pc === 'object') {
                        controlData = {
                            by_settlement_id: buildControlLookup(pc),
                            control_status_by_settlement_id: {}
                        };
                        const contested = state.contested_control as Record<string, boolean> | undefined;
                        if (contested && typeof contested === 'object') {
                            for (const [sid, isContested] of Object.entries(contested)) {
                                if (isContested) controlData.control_status_by_settlement_id![controlKey(sid)] = 'CONTESTED';
                            }
                        }
                    }
                    const meta = state.meta as { turn?: number; phase?: string } | undefined;
                    if (turnDisplay && meta && typeof meta === 'object') {
                        const turn = typeof meta.turn === 'number' ? meta.turn : 0;
                        const phase = typeof meta.phase === 'string' ? meta.phase : '';
                        turnDisplay.textContent = phase ? `Turn ${turn} — ${phase}` : `Turn ${turn}`;
                    }
                    const rawFormations = state.formations as Record<string, Record<string, unknown>> | undefined;
                    loadedFormations = [];
                    if (rawFormations && typeof rawFormations === 'object') {
                        for (const id of Object.keys(rawFormations).sort()) {
                            const f = rawFormations[id];
                            if (!f || typeof f !== 'object') continue;
                            const faction = typeof f.faction === 'string' ? f.faction : '';
                            const name = typeof f.name === 'string' ? f.name : id;
                            const kind = typeof f.kind === 'string' ? f.kind : 'brigade';
                            const hq_sid = typeof f.hq_sid === 'string' && f.hq_sid ? f.hq_sid : undefined;
                            loadedFormations.push({ id, faction, name, kind, hq_sid });
                        }
                    }
                    statusEl.textContent = '';
                    statusEl.classList.remove('error');
                    render();
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    statusEl.textContent = `Invalid state file: ${msg}`;
                    statusEl.classList.add('error');
                }
                loadStateInput.value = '';
            };
            reader.readAsText(file, 'utf-8');
        });
    }

    turnDisplay.textContent = 'Turn 0 — Sep 1991';

    window.addEventListener('resize', resize);
    resize();
}

main().catch((e) => {
    const statusEl = document.getElementById('status') as HTMLElement;
    statusEl.textContent = `Error: ${e instanceof Error ? e.message : String(e)}`;
    statusEl.classList.add('error');
});
