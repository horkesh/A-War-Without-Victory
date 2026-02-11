/**
 * Phase E3/F6/G3: Political control visualization (dev-only).
 * Geometry: contract-first via /data/derived/data_index.json then dataset (same as substrate_viewer).
 * Control: /api/political_control (by_settlement_id key = municipality_id:sid when both present, else sid).
 */
(function () {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('tooltip');
  const legendDiv = document.getElementById('legend');
  const errorBox = document.getElementById('error-box');
  const colorByControllerCheck = document.getElementById('color-by-controller');
  const showNullOnlyCheck = document.getElementById('show-null-only');
  const highlightUnknownOnlyCheck = document.getElementById('highlight-unknown-only');
  const filterMun1990Select = document.getElementById('filter-mun1990');
  const resetViewBtn = document.getElementById('reset-view');

  const CONTROLLER_COLORS = {
    RBiH: '#2e7d32',
    RS: '#c62828',
    HRHB: '#1565c0',
    null: '#6d6d6d'
  };

  function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }

  function showFatalError(msg) {
    errorBox.innerHTML = '<h2>Load Error</h2><p>' + String(msg).replace(/</g, '&lt;') + '</p>';
    errorBox.style.display = 'block';
  }

  async function sha256Hex(buffer) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  let geojson = null;
  let controlData = null;
  let viewX = 0, viewY = 0, viewScale = 1;
  let globalBounds = null;
  let hoveredFeature = null;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0, dragStartViewX = 0, dragStartViewY = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (geojson) render();
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function worldToScreen(x, y) {
    return { x: x * viewScale + viewX, y: y * viewScale + viewY };
  }
  function screenToWorld(x, y) {
    return { x: (x - viewX) / viewScale, y: (y - viewY) / viewScale };
  }

  function computeFeatureBounds(feature) {
    const geom = feature.geometry;
    let coords = [];
    if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
      coords = geom.coordinates[0];
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates || []) {
        if (poly && poly[0]) coords.push(...poly[0]);
      }
    }
    if (coords.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of coords) {
      if (c && c.length >= 2) {
        minX = Math.min(minX, c[0]);
        minY = Math.min(minY, c[1]);
        maxX = Math.max(maxX, c[0]);
        maxY = Math.max(maxY, c[1]);
      }
    }
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  }

  function fitToBounds(bounds) {
    if (!bounds) return;
    const padding = 20;
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;
    if (w <= 0 || h <= 0) return;
    const scaleX = (canvas.width - padding * 2) / w;
    const scaleY = (canvas.height - padding * 2) / h;
    viewScale = Math.min(scaleX, scaleY);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    viewX = canvas.width / 2 - cx * viewScale;
    viewY = canvas.height / 2 - cy * viewScale;
    render();
  }

  function renderPolygon(coords, fillColor, strokeColor) {
    if (!coords || coords.length < 2) return;
    ctx.beginPath();
    const first = worldToScreen(coords[0][0], coords[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < coords.length; i++) {
      const pt = worldToScreen(coords[i][0], coords[i][1]);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /** Control lookup key: graph uses mun_code:source_id; substrate has sid + municipality_id. */
  function getControlKey(feature) {
    const sid = feature.properties?.sid;
    const munId = feature.properties?.municipality_id;
    if (munId && sid) return String(munId) + ':' + String(sid);
    return sid != null ? String(sid) : '';
  }

  function getController(sid) {
    if (!controlData || !controlData.by_settlement_id) return undefined;
    return controlData.by_settlement_id[sid];
  }

  function getMun1990(sid) {
    if (!controlData || !controlData.mun1990_by_sid) return '';
    return controlData.mun1990_by_sid[sid] ?? '';
  }

  function passesFilter(feature) {
    const key = getControlKey(feature);
    if (!key) return false;
    const c = getController(key);
    const mun1990 = getMun1990(key);
    const filterVal = filterMun1990Select ? filterMun1990Select.value : '';
    if (filterVal) {
      if (mun1990 !== filterVal) return false;
    }
    if (showNullOnlyCheck.checked) {
      return c === null;
    }
    return true;
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!geojson || !geojson.features) return;

    const features = [...geojson.features].sort((a, b) => {
      const sa = a.properties?.sid || '';
      const sb = b.properties?.sid || '';
      return String(sa).localeCompare(String(sb));
    });

    const highlightUnknown = highlightUnknownOnlyCheck && highlightUnknownOnlyCheck.checked;

    for (const feature of features) {
      if (!passesFilter(feature)) continue;

      const key = getControlKey(feature);
      const controller = getController(key);
      const isUnknown = controller === null;
      let fillColor = 'rgba(100,100,100,0.2)';
      if (colorByControllerCheck.checked && controlData) {
        const key = controller === null ? 'null' : (controller || 'null');
        const hex = CONTROLLER_COLORS[key];
        if (hex) {
          const opacity = highlightUnknown ? (isUnknown ? 0.4 : 0.08) : 0.4;
          fillColor = hexToRgba(hex, opacity);
        }
      } else if (highlightUnknown && isUnknown) {
        fillColor = hexToRgba(CONTROLLER_COLORS.null, 0.4);
      } else if (highlightUnknown && !isUnknown) {
        fillColor = 'rgba(100,100,100,0.06)';
      }

      const geom = feature.geometry;
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        renderPolygon(geom.coordinates[0], fillColor, 'rgba(0,0,0,0.3)');
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates || []) {
          if (poly && poly[0]) renderPolygon(poly[0], fillColor, 'rgba(0,0,0,0.3)');
        }
      }
    }

    if (hoveredFeature && passesFilter(hoveredFeature)) {
      const geom = hoveredFeature.geometry;
      ctx.strokeStyle = 'rgba(255,255,0,0.9)';
      ctx.lineWidth = 2;
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        renderPolygon(geom.coordinates[0], null, 'rgba(255,255,0,0.9)');
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates || []) {
          if (poly && poly[0]) renderPolygon(poly[0], null, 'rgba(255,255,0,0.9)');
        }
      }
    }
  }

  function findFeatureAt(x, y) {
    if (!geojson) return null;
    const world = screenToWorld(x, y);
    const features = [...geojson.features].reverse();
    for (const feature of features) {
      const b = computeFeatureBounds(feature);
      if (b && world.x >= b.minX && world.x <= b.maxX && world.y >= b.minY && world.y <= b.maxY) {
        return feature;
      }
    }
    return null;
  }

  function updateTooltip(feature, x, y) {
    if (!feature) {
      tooltip.style.display = 'none';
      return;
    }
    const key = getControlKey(feature);
    const sidDisplay = feature.properties?.sid || key || '(missing)';
    const controller = getController(key);
    const mun1990 = controlData && controlData.mun1990_by_sid && controlData.mun1990_by_sid[key];
    let html = `<div><strong>settlement_id:</strong> ${sidDisplay}</div>`;
    html += `<div><strong>political_controller:</strong> ${controller === null ? 'null' : controller}</div>`;
    if (mun1990) html += `<div><strong>mun1990_id:</strong> ${mun1990}</div>`;
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = (y + 10) + 'px';
  }

  function updateLegend() {
    if (!controlData || !controlData.meta) return;
    const m = controlData.meta;
    let html = '<div style="font-weight:bold;margin-bottom:6px;">Legend:</div>';
    html += `<div class="legend-item"><span>Total</span><span>${m.total_settlements}</span></div>`;
    for (const k of ['RBiH', 'RS', 'HRHB']) {
      const cnt = m.counts[k] ?? 0;
      const hex = CONTROLLER_COLORS[k];
      html += `<div class="legend-item"><span><span class="legend-color" style="background:${hex}"></span>${k}</span><span>${cnt}</span></div>`;
    }
    const nullCnt = m.counts['null'] ?? 0;
    html += `<div class="legend-item"><span><span class="legend-color" style="background:${CONTROLLER_COLORS.null}"></span>Unknown (null control)</span><span>${nullCnt}</span></div>`;
    legendDiv.innerHTML = html;
  }

  function populateMun1990Filter() {
    if (!filterMun1990Select || !controlData) return;
    const unknownByMun1990 = {};
    const bySid = controlData.by_settlement_id;
    const mun1990BySid = controlData.mun1990_by_sid || {};
    if (bySid) {
      for (const [sid, c] of Object.entries(bySid)) {
        if (c === null) {
          const mun = mun1990BySid[sid] ?? '';
          unknownByMun1990[mun] = (unknownByMun1990[mun] ?? 0) + 1;
        }
      }
    }
    const options = ['<option value="">(all)</option>'];
    const muns = Object.keys(unknownByMun1990).filter(Boolean).sort((a, b) => a.localeCompare(b));
    for (const mun of muns) {
      options.push(`<option value="${mun}">${mun}</option>`);
    }
    filterMun1990Select.innerHTML = options.join('');
  }

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartViewX = viewX;
    dragStartViewY = viewY;
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      viewX = dragStartViewX + (e.clientX - dragStartX);
      viewY = dragStartViewY + (e.clientY - dragStartY);
      render();
    } else {
      const f = findFeatureAt(e.clientX, e.clientY);
      if (f !== hoveredFeature) {
        hoveredFeature = f;
        render();
      }
      updateTooltip(f, e.clientX, e.clientY);
    }
  });
  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
  });
  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
    hoveredFeature = null;
    tooltip.style.display = 'none';
    render();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY);
    viewScale *= e.deltaY > 0 ? 0.9 : 1.1;
    viewScale = Math.max(0.1, Math.min(100, viewScale));
    const nw = screenToWorld(e.clientX, e.clientY);
    viewX += (world.x - nw.x) * viewScale;
    viewY += (world.y - nw.y) * viewScale;
    render();
  });

  colorByControllerCheck.addEventListener('change', render);
  showNullOnlyCheck.addEventListener('change', render);
  if (highlightUnknownOnlyCheck) highlightUnknownOnlyCheck.addEventListener('change', render);
  if (filterMun1990Select) filterMun1990Select.addEventListener('change', render);
  resetViewBtn.addEventListener('click', () => {
    if (globalBounds) fitToBounds(globalBounds);
  });

  async function loadData() {
    try {
      const indexRes = await fetch('/data/derived/data_index.json');
      if (!indexRes.ok) {
        showFatalError('Failed to load canonical index: ' + indexRes.statusText + '. Serve from repo root (e.g. npx http-server -p 8080 or dev runner).');
        return;
      }
      const index = await indexRes.json();
      if (index.schema_version == null) { showFatalError('Missing required field: schema_version'); return; }
      if (index.coordinate_space == null) { showFatalError('Missing required field: coordinate_space'); return; }
      if (!Array.isArray(index.canonical_bbox) || index.canonical_bbox.length !== 4) {
        showFatalError('Missing or invalid required field: canonical_bbox');
        return;
      }
      const ds = index.datasets && index.datasets.settlements;
      if (!ds) { showFatalError('Missing required field: datasets.settlements'); return; }
      if (ds.path == null) { showFatalError('Missing required field: datasets.settlements.path'); return; }
      if (ds.checksum_sha256 == null) { showFatalError('Missing required field: datasets.settlements.checksum_sha256'); return; }

      const datasetUrl = '/data/derived/' + ds.path;
      const geoRes = await fetch(datasetUrl);
      if (!geoRes.ok) {
        showFatalError('Failed to load dataset: ' + geoRes.statusText);
        return;
      }
      const arrayBuffer = await geoRes.arrayBuffer();
      const computedSha = await sha256Hex(arrayBuffer);
      if (computedSha !== ds.checksum_sha256) {
        showFatalError('Checksum mismatch: dataset does not match index. Expected ' + ds.checksum_sha256.slice(0, 16) + '..., got ' + computedSha.slice(0, 16) + '...');
        return;
      }
      const text = new TextDecoder().decode(arrayBuffer);
      geojson = JSON.parse(text);

      globalBounds = {
        minX: index.canonical_bbox[0],
        minY: index.canonical_bbox[1],
        maxX: index.canonical_bbox[2],
        maxY: index.canonical_bbox[3]
      };

      let ctrlRes = await fetch('/api/political_control');
      if (!ctrlRes.ok) {
        ctrlRes = await fetch('./political_control_data.json');
        if (!ctrlRes.ok) {
          showFatalError('Political control data not available. Run dev runner (npm run dev:runner) or generate data: npm run map:viewer:political-control-data');
          return;
        }
      }
      controlData = await ctrlRes.json();

      updateLegend();
      populateMun1990Filter();
      if (globalBounds) fitToBounds(globalBounds);
      else render();
    } catch (err) {
      showFatalError(err instanceof Error ? err.message : String(err));
    }
  }

  loadData();
})();
