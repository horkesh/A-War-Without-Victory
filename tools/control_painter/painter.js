
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const fileGeo = document.getElementById('file-geo');
const fileControl = document.getElementById('file-control');
const btnExport = document.getElementById('btn-export');
const btnReset = document.getElementById('btn-reset-view');
const paletteContainer = document.getElementById('palette');
const geoStatus = document.getElementById('geo-status');
const fileModernBorders = document.getElementById('file-modern-borders');
const chkShowModernBorders = document.getElementById('chk-show-modern-borders');

// Global State
let geoData = null; // The loaded GeoJSON settlements
let modernBorderData = null; // The loaded GeoJSON modern borders
let modernBorderLines = []; // Pre-processed lines
let lookupData = null; // The loaded SID->MunID mapping
let controlData = {
    controllers_by_mun1990_id: {},
    controllers_by_sid: {}
};
let currentFaction = 'RBiH';
let isDragging = false;
let isSpaceDown = false;
let dragStart = { x: 0, y: 0 };
let viewOffset = { x: 0, y: 0 };
let scale = 1;
let polygons = []; // Pre-processed polygons for rendering { path, sid, munId }

// Colors
const FACTION_COLORS = {
    'RBiH': '#2e7d32',
    'RS': '#c62828',
    'HRHB': '#1565c0',
    'null': '#424242'
};

// --- Initialization ---

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load Lookup if available (from lookup.js)
    if (typeof SETTLEMENT_LOOKUP !== 'undefined') {
        lookupData = SETTLEMENT_LOOKUP;
        console.log("Lookup data loaded.", Object.keys(lookupData.sid_map).length, "settlements.");
    } else {
        console.warn("SETTLEMENT_LOOKUP not found. Settlement-to-Municipality features disabled.");
    }

    // Event Listeners
    fileGeo.addEventListener('change', handleGeoFile);
    fileControl.addEventListener('change', handleControlFile);
    fileModernBorders.addEventListener('change', handleModernBorderFile);
    chkShowModernBorders.addEventListener('change', render);
    btnExport.addEventListener('click', exportData);
    btnReset.addEventListener('click', resetView);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('contextmenu', e => e.preventDefault()); // Prevent menu for Right-Click Pan

    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && !isSpaceDown) {
            isSpaceDown = true;
            canvas.style.cursor = 'grab';
        }
    });
    window.addEventListener('keyup', e => {
        if (e.code === 'Space') {
            isSpaceDown = false;
            canvas.style.cursor = isDragging ? 'grabbing' : 'default';
            canvas.style.cursor = 'grab';
        }
    });

    setupPalette();

    // Render loop
    requestAnimationFrame(render);
}

function resizeCanvas() {
    canvas.width = document.getElementById('main').clientWidth;
    canvas.height = document.getElementById('main').clientHeight;
    render();
}

function setupPalette() {
    document.querySelectorAll('.palette-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFaction = btn.dataset.faction;
        });
    });
}

// --- Data Loading ---

async function autoLoad() {
    try {
        console.log("Attempting auto-load...");

        // 1. Load Settlements (Base Map)
        const r1 = await fetch('../../data/derived/settlements_a1_viewer.geojson');
        if (r1.ok) {
            geoData = await r1.json();
            processGeometry();
            console.log("Loaded settlements_a1_viewer.geojson");
        } else {
            console.warn("Could not auto-load settlements (status " + r1.status + ")");
        }

        // 2. Load Modern Borders (Post-1995)
        // const r2 = await fetch('../../data/source/geo/adm3.geojson'); // OLD source (WGS84)
        const r2 = await fetch('../../data/derived/adm3_a1_viewer.geojson'); // NEW derived (A1)
        if (r2.ok) {
            const text = await r2.text(); // Handle potential encoding checking
            modernBorderData = JSON.parse(text);
            processModernBorders();
            console.log("Loaded adm3_a1_viewer.geojson");
        } else {
            console.warn("Could not auto-load modern borders (status " + r2.status + ")");
        }

        // We do NOT auto-load 1990 borders as requested, or at least we don't show them.

        render(); // Render once
        fitBounds(); // Fit once

        // Update UI
        if (geoData) {
            document.getElementById('status').innerText = "Auto-loaded data. Ready.";
        }

    } catch (err) {
        console.warn("Auto-load failed (likely due to file:// protocol restriction). Please use manual upload.", err);
        document.getElementById('status').innerText = "Auto-load failed. Please use manual upload.";
    }
}

// Call autoLoad on window load
window.addEventListener('load', autoLoad);

async function handleGeoFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    geoStatus.textContent = "Loading...";

    const text = await file.text();
    try {
        geoData = JSON.parse(text);
        processGeometry();
        geoStatus.textContent = `Loaded ${geoData.features.length} features.`;
        fitBounds();
    } catch (err) {
        console.error(err);
        geoStatus.textContent = "Error parsing GeoJSON";
    }
}

async function handleModernBorderFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
        modernBorderData = JSON.parse(text);
        processModernBorders();
        render();
    } catch (err) {
        console.error(err);
        alert("Error parsing Modern Border GeoJSON");
    }
}

async function handleControlFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
        const json = JSON.parse(text);
        // Support both formats: raw map or nested
        if (json.controllers_by_mun1990_id || json.controllers_by_sid) {
            controlData = {
                controllers_by_mun1990_id: json.controllers_by_mun1990_id || {},
                controllers_by_sid: json.controllers_by_sid || {}
            };
        } else {
            // Assume pure municipality map if flat
            controlData = {
                controllers_by_mun1990_id: json,
                controllers_by_sid: {}
            };
        }
        render();
    } catch (err) {
        alert("Invalid JSON");
    }
}

function processGeometry() {
    polygons = [];
    if (!geoData) return;

    for (const feature of geoData.features) {
        const sid = feature.properties.sid;
        const name = feature.properties.name || sid;
        const munId = lookupData ? lookupData.sid_map[sid] : null;

        // Support Polygon and MultiPolygon
        const geoms = feature.geometry.type === 'MultiPolygon'
            ? feature.geometry.coordinates
            : [feature.geometry.coordinates];

        for (const polyCoords of geoms) {
            // polyCoords is array of rings. First is outer.
            const outerRing = polyCoords[0];
            if (!outerRing) continue;

            polygons.push({
                points: outerRing, // Array of [x, y]
                sid: sid,
                name: name,
                munId: munId,
                bbox: calculateBBox(outerRing)
            });
        }
    }
}

function processModernBorders() {
    modernBorderLines = [];
    if (!modernBorderData) return;

    for (const feature of modernBorderData.features) {
        if (feature.geometry.type === 'MultiLineString') {
            for (const line of feature.geometry.coordinates) {
                modernBorderLines.push(line);
            }
        } else if (feature.geometry.type === 'LineString') {
            modernBorderLines.push(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'Polygon') {
            // ADM3 might be polygons
            for (const ring of feature.geometry.coordinates) {
                modernBorderLines.push(ring);
            }
        } else if (feature.geometry.type === 'MultiPolygon') {
            for (const poly of feature.geometry.coordinates) {
                for (const ring of poly) {
                    modernBorderLines.push(ring);
                }
            }
        }
    }
}

function calculateBBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
    }
    return { minX, minY, maxX, maxY };
}

function fitBounds() {
    if (polygons.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of polygons) {
        if (p.bbox.minX < minX) minX = p.bbox.minX;
        if (p.bbox.maxX > maxX) maxX = p.bbox.maxX;
        if (p.bbox.minY < minY) minY = p.bbox.minY;
        if (p.bbox.maxY > maxY) maxY = p.bbox.maxY;
    }

    const mapW = maxX - minX;
    const mapH = maxY - minY;
    const scaleX = canvas.width / mapW;
    const scaleY = canvas.height / mapH;

    scale = Math.min(scaleX, scaleY) * 0.9;

    // Center
    viewOffset.x = (canvas.width - mapW * scale) / 2 - minX * scale;
    viewOffset.y = (canvas.height - mapH * scale) / 2 - minY * scale;
}

// --- Interaction ---

function onMouseDown(e) {
    if (e.button === 2 || e.button === 1 || e.shiftKey || isSpaceDown) { // Right/Middle click or shift or Space for Drag
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
    } else {
        // Paint
        handlePaint(e.clientX, e.clientY, e.ctrlKey);
    }
}

function onMouseMove(e) {
    if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        viewOffset.x += dx;
        viewOffset.y += dy;
        dragStart = { x: e.clientX, y: e.clientY };
        render();
    } else {
        // Hover logic
        handleHover(e.clientX, e.clientY);
    }
}

function onMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'grab';
}

function onWheel(e) {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);

    // Zoom towards mouse
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    viewOffset.x = mouseX - (mouseX - viewOffset.x) * zoom;
    viewOffset.y = mouseY - (mouseY - viewOffset.y) * zoom;
    scale *= zoom;

    render();
}

function screenToWorld(x, y) {
    return {
        x: (x - viewOffset.x) / scale,
        y: (y - viewOffset.y) / scale
    };
}

function findPolyAt(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const mx = sx - rect.left;
    const my = sy - rect.top;
    const w = screenToWorld(mx, my);

    // Simple point-in-poly or even bbox check first
    for (const poly of polygons) {
        if (w.x < poly.bbox.minX || w.x > poly.bbox.maxX || w.y < poly.bbox.minY || w.y > poly.bbox.maxY) {
            continue;
        }

        if (pointInPolygon(w.x, w.y, poly.points)) {
            return poly;
        }
    }
    return null;
}

function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0], yi = points[i][1];
        const xj = points[j][0], yj = points[j][1];

        const intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function handlePaint(x, y, isCtrl) {
    const poly = findPolyAt(x, y);
    if (!poly) return;

    const faction = currentFaction;
    const paintMode = document.querySelector('input[name="paintmode"]:checked').value;
    const isMunMode = paintMode === 'municipality' || isCtrl;

    if (isMunMode && poly.munId) {
        // Flood fill Municipality: Set default and clear overrides
        controlData.controllers_by_mun1990_id[poly.munId] = (faction === 'null' ? null : faction);

        if (lookupData) {
            // Find all SIDs for this MunID and clear overrides
            for (const [sid, mid] of Object.entries(lookupData.sid_map)) {
                if (mid === poly.munId) {
                    delete controlData.controllers_by_sid[sid];
                }
            }
        }
    } else {
        // Paint single settlement
        if (faction === 'null') {
            delete controlData.controllers_by_sid[poly.sid];
        } else {
            controlData.controllers_by_sid[poly.sid] = faction;
        }
    }

    render();
}

function handleHover(x, y) {
    const poly = findPolyAt(x, y);
    if (poly) {
        const munName = lookupData && lookupData.mun_names[poly.munId] ? lookupData.mun_names[poly.munId] : (poly.munId || 'Unknown');
        const current = getController(poly.sid, poly.munId);
        tooltip.style.display = 'block';
        tooltip.style.left = (x + 15) + 'px';
        tooltip.style.top = (y + 15) + 'px';
        tooltip.innerHTML = `
      <strong>${poly.name}</strong> (${poly.sid})<br>
      Mun: ${munName}<br>
      Control: <span style='color:${FACTION_COLORS[current] || '#fff'}'>${current || 'None'}</span>
    `;
    } else {
        tooltip.style.display = 'none';
    }
}

// --- Rendering ---

function getController(sid, munId) {
    if (controlData.controllers_by_sid[sid]) {
        return controlData.controllers_by_sid[sid];
    }
    if (munId && controlData.controllers_by_mun1990_id[munId]) {
        return controlData.controllers_by_mun1990_id[munId];
    }
    return null;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!geoData) return;

    ctx.save();

    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(scale, scale);

    ctx.lineWidth = 1 / scale;

    for (const poly of polygons) {
        const controller = getController(poly.sid, poly.munId);
        const color = FACTION_COLORS[controller] || FACTION_COLORS['null'];

        ctx.fillStyle = color;
        ctx.strokeStyle = '#222'; // Boundary line

        ctx.beginPath();
        const pts = poly.points;
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // Render Modern Borders (Blue)
    if (chkShowModernBorders.checked && modernBorderLines.length > 0) {
        ctx.strokeStyle = '#2196f3'; // Blue 500
        ctx.lineWidth = 2 / scale;
        // ctx.setLineDash([5 / scale, 5 / scale]); // Dashed
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (const line of modernBorderLines) {
            ctx.moveTo(line[0][0], line[0][1]);
            for (let i = 1; i < line.length; i++) {
                ctx.lineTo(line[i][0], line[i][1]);
            }
        }
        ctx.stroke();
        // ctx.setLineDash([]); // Reset
    }

    ctx.restore();
}

// --- Export ---

function exportData() {
    const dataStr = JSON.stringify(controlData, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "control_export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function resetView() {
    fitBounds();
    render();
}

// Start
init();
