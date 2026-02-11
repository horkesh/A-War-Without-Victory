/**
 * Phase H3: Build unified multi-layer map viewer
 * 
 * Generates contract-first HTML viewer that loads datasets via data_index.json,
 * validates contracts, and renders multiple togglable layers.
 * 
 * Usage:
 *   npm run map:viewer:map:build
 *   or: tsx scripts/map/build_map_viewer.ts
 * 
 * Outputs:
 *   - data/derived/map_viewer/index.html
 *   - data/derived/map_viewer/viewer.js
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Mistake guard

async function main(): Promise<void> {
  const outputDir = resolve('data/derived/map_viewer');
  const htmlPath = resolve(outputDir, 'index.html');
  const viewerJsPath = resolve(outputDir, 'viewer.js');
  
  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });
  
  // Generate HTML (Phase H3.2: add settlement info panel)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AWWV Map Viewer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; overflow: hidden; height: 100vh; }
    #canvas-container { position: relative; width: 100vw; height: 100vh; }
    #canvas { display: block; cursor: grab; background: #f5f5f5; }
    #canvas.dragging { cursor: grabbing; }
    #controls {
      position: absolute; top: 10px; left: 10px;
      background: white; padding: 12px; border: 1px solid #ccc;
      border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10; max-width: 320px; max-height: 90vh; overflow-y: auto; font-size: 12px;
    }
    #settlement-panel {
      position: absolute; top: 10px; right: 10px;
      background: white; padding: 16px; border: 1px solid #ccc;
      border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 10; width: 320px; max-height: 90vh; overflow-y: auto; font-size: 12px;
      display: none;
    }
    #settlement-panel.visible { display: block; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    .panel-title { font-weight: bold; font-size: 14px; }
    .panel-close { cursor: pointer; font-size: 18px; color: #666; }
    .panel-close:hover { color: #000; }
    .panel-row { margin-bottom: 8px; }
    .panel-label { font-weight: 500; color: #666; font-size: 11px; }
    .panel-value { margin-top: 2px; font-size: 12px; }
    .panel-value.missing { color: #dc3545; font-style: italic; }
    .panel-value.unknown { color: #999; }
    .panel-button { margin-top: 12px; padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; width: 100%; }
    .panel-button:hover { background: #0056b3; }
    .control-group { margin-bottom: 12px; }
    .control-group:last-child { margin-bottom: 0; }
    label { display: block; margin-bottom: 4px; font-weight: 500; }
    input[type="checkbox"], input[type="text"] { margin-right: 6px; }
    input[type="text"] { width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
    button { padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; width: 100%; }
    button:hover { background: #0056b3; }
    .legend { margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd; }
    .legend-item { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
    .legend-color { display: inline-block; width: 16px; height: 16px; margin-right: 6px; border: 1px solid #333; vertical-align: middle; }
    .tooltip {
      position: absolute; background: rgba(0, 0, 0, 0.85); color: white;
      padding: 8px; border-radius: 4px; font-size: 11px; pointer-events: none;
      z-index: 1000; max-width: 250px; display: none;
    }
    .tooltip-line { margin-bottom: 2px; }
    .tooltip-line:last-child { margin-bottom: 0; }
    .error-box {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 24px; border: 2px solid #dc3545;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000; max-width: 500px; font-size: 14px;
    }
    .error-box h2 { color: #dc3545; margin-bottom: 12px; font-size: 18px; }
    .error-box p { margin-bottom: 8px; line-height: 1.5; }
    .error-box code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .debug-overlay {
      position: absolute; bottom: 10px; left: 10px;
      background: rgba(0, 0, 0, 0.7); color: white; padding: 8px;
      border-radius: 4px; font-family: monospace; font-size: 10px;
      display: none; z-index: 10;
    }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="canvas"></canvas>
    <div id="tooltip" class="tooltip"></div>
    <div id="controls">
      <div class="control-group">
        <label><strong>Layers:</strong></label>
        <label><input type="checkbox" id="layer-settlements" checked> Settlements (base)</label>
        <label><input type="checkbox" id="layer-mun1990"> Municipality 1990 boundaries</label>
        <label><input type="checkbox" id="layer-political-control"> Political control</label>
        <label><input type="checkbox" id="layer-ethnicity"> Ethnicity majority</label>
      </div>
      <div class="control-group">
        <label><strong>Filters:</strong></label>
        <label><input type="checkbox" id="filter-unknown-control"> Unknown control only</label>
        <label><input type="checkbox" id="highlight-missing-control"> Highlight missing control</label>
        <label><input type="checkbox" id="highlight-normalized-control"> Highlight municipality-normalized control</label>
        <label>SID substring:</label>
        <input type="text" id="filter-sid" placeholder="(empty for all)">
      </div>
      <div class="control-group">
        <label>Go to SID or name:</label>
        <div style="display:flex;gap:6px;">
          <input type="text" id="goto-sid" placeholder="e.g. S170666 or Sarajevo" style="flex:1;">
          <button id="goto-btn">Go</button>
        </div>
      </div>
      <div class="control-group">
        <button id="reset-view">Reset View</button>
      </div>
      <div class="legend" id="legend"></div>
    </div>
    <div id="settlement-panel">
      <div class="panel-header">
        <span class="panel-title">Settlement Info</span>
        <span class="panel-close" id="panel-close">&times;</span>
      </div>
      <div id="panel-content"></div>
    </div>
    <div id="debug-overlay" class="debug-overlay"></div>
    <div id="error-box" class="error-box" style="display: none;"></div>
  </div>
  <script src="./viewer.js"></script>
</body>
</html>`;
  
  writeFileSync(htmlPath, html, 'utf8');
  process.stdout.write(`Wrote HTML to ${htmlPath}\n`);
  
  // Generate viewer.js (Phase H3.2: fixed zoom + settlement panel)
  const viewerJs = `/**
 * AWWV Unified Multi-Layer Map Viewer (Phase H3.2)
 * 
 * Contract-first loading: validates data_index.json, loads datasets, verifies checksums.
 * Renders multiple togglable layers: settlements, mun1990_boundaries, political_control, ethnicity_majority.
 * Phase H3.2: Fixed cursor-anchored zoom + settlement info panel.
 */

(function() {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('tooltip');
  const errorBox = document.getElementById('error-box');
  const legendDiv = document.getElementById('legend');
  const settlementPanel = document.getElementById('settlement-panel');
  const panelContent = document.getElementById('panel-content');
  const panelClose = document.getElementById('panel-close');
  const debugOverlay = document.getElementById('debug-overlay');
  
  // Layer toggles
  const layerSettlementsCheck = document.getElementById('layer-settlements');
  const layerMun1990Check = document.getElementById('layer-mun1990');
  const layerPoliticalControlCheck = document.getElementById('layer-political-control');
  const layerEthnicityCheck = document.getElementById('layer-ethnicity');
  
  // Filters
  const filterUnknownControlCheck = document.getElementById('filter-unknown-control');
  const highlightMissingControlCheck = document.getElementById('highlight-missing-control');
  const highlightNormalizedControlCheck = document.getElementById('highlight-normalized-control');
  const filterSidInput = document.getElementById('filter-sid');
  const gotoSidInput = document.getElementById('goto-sid');
  const gotoBtn = document.getElementById('goto-btn');
  const resetViewBtn = document.getElementById('reset-view');
  
  let dataIndex = null;
  let settlementsGeoJSON = null;
  let mun1990BoundariesGeoJSON = null;
  let politicalControlData = null;
  let ethnicityData = null;
  let settlementNamesData = null;
  let mun1990NamesData = null;
  let geometrySource = 'settlements';
  let geometryGzip = false;
  
  let viewX = 0, viewY = 0, viewScale = 1, globalBounds = null;
  let isDragging = false, dragStartX = 0, dragStartY = 0, dragStartViewX = 0, dragStartViewY = 0;
  let hoveredFeature = null;
  let selectedFeature = null;
  let debugStats = { control_missing_keys: 0, ethnicity_missing_keys: 0, control_overridden_by_municipality: 0 };
  let settlementsWithMissingControl = new Set();
  let settlementsWithNormalizedControl = new Set();
  
  // Check for debug camera mode
  const urlParams = new URLSearchParams(window.location.search);
  const debugCamera = urlParams.get('debug') === 'camera';
  if (debugCamera && debugOverlay) debugOverlay.style.display = 'block';
  
  const ETHNICITY_COLORS = {
    bosniak: '#2e7d32', serb: '#c62828', croat: '#1565c0',
    other: '#6d6d6d', unknown: '#bdbdbd'
  };
  
  const FACTION_COLORS = {
    RBiH: '#2e7d32', RS: '#c62828', HRHB: '#1565c0', null: '#bdbdbd'
  };
  
  /**
   * Normalize SID: strip "S" prefix if present
   * Political control data keys are "mun:sid" where sid has NO prefix
   * Substrate features have sid WITH "S" prefix
   */
  function normalizeSid(sid) {
    if (!sid) return '';
    const str = String(sid);
    return str.startsWith('S') ? str.slice(1) : str;
  }
  
  function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return \`rgba(\${r}, \${g}, \${b}, \${opacity})\`;
  }
  
  function showFatalError(msg) {
    errorBox.innerHTML = '<h2>Fatal Error</h2><p>' + String(msg).replace(/</g, '&lt;') + '</p>';
    errorBox.style.display = 'block';
  }
  
  async function sha256Hex(buffer) {
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
  }
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  function worldToScreen(x, y) {
    return { x: x * viewScale + viewX, y: y * viewScale + viewY };
  }
  
  function screenToWorld(x, y) {
    return { x: (x - viewX) / viewScale, y: (y - viewY) / viewScale };
  }
  
  function fitToBounds(bounds) {
    if (!bounds) return;
    const padding = 20;
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    if (width === 0 || height === 0) return;
    const scaleX = (canvas.width - padding * 2) / width;
    const scaleY = (canvas.height - padding * 2) / height;
    viewScale = Math.min(scaleX, scaleY);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    viewX = canvas.width / 2 - centerX * viewScale;
    viewY = canvas.height / 2 - centerY * viewScale;
    render();
  }
  
  function renderPolygon(coords, fillColor, strokeColor, strokeWidth) {
    if (coords.length < 2) return;
    ctx.beginPath();
    const first = worldToScreen(coords[0][0], coords[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < coords.length; i++) {
      const pt = worldToScreen(coords[i][0], coords[i][1]);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth || 1; ctx.stroke(); }
  }
  
  function renderLine(coords, strokeColor, lineWidth) {
    if (coords.length < 2) return;
    ctx.beginPath();
    const first = worldToScreen(coords[0][0], coords[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < coords.length; i++) {
      const pt = worldToScreen(coords[i][0], coords[i][1]);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  
  function getSettlementKey(feature) {
    const munId = feature.properties?.municipality_id || '';
    const sid = normalizeSid(feature.properties?.sid || '');
    return \`\${munId}:\${sid}\`;
  }
  /** WGS84 political_control uses sid (S-prefixed); legacy uses mun:sid. Try both. */
  function getPoliticalControlKey(feature) {
    const sid = feature.properties?.sid;
    if (sid && politicalControlData?.by_settlement_id?.[sid] !== undefined) return sid;
    return getSettlementKey(feature);
  }
  
  function passesFilters(feature) {
    const sidFilter = filterSidInput.value.trim();
    if (sidFilter) {
      const sid = feature.properties?.sid;
      if (!sid || !String(sid).includes(sidFilter)) return false;
    }
    if (filterUnknownControlCheck.checked) {
      const key = getPoliticalControlKey(feature);
      const controller = politicalControlData?.by_settlement_id?.[key];
      if (controller !== 'null' && controller !== null && controller !== undefined) return false;
    }
    return true;
  }
  
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    debugStats = { control_missing_keys: 0, ethnicity_missing_keys: 0, control_overridden_by_municipality: 0 };
    settlementsWithMissingControl.clear();
    settlementsWithNormalizedControl.clear();
    
    // Render settlements (base layer)
    if (layerSettlementsCheck.checked && settlementsGeoJSON) {
      const features = [...settlementsGeoJSON.features].sort((a, b) => {
        const sidA = a.properties?.sid || '';
        const sidB = b.properties?.sid || '';
        return String(sidA).localeCompare(String(sidB));
      });
      for (const feature of features) {
        if (!passesFilters(feature)) continue;
        const geom = feature.geometry;
        let fillColor = null;
        let needsHighlight = false;
        let needsNormalizedHighlight = false;
        
        // Check if this settlement was municipality-normalized
        const sid = feature.properties?.sid;
        const mun1990Id = politicalControlData?.mun1990_by_sid?.[sid];
        const isNormalized = mun1990Id && (mun1990Id === 'tuzla' || mun1990Id === 'vares');
        if (isNormalized) {
          settlementsWithNormalizedControl.add(sid);
          debugStats.control_overridden_by_municipality++;
          needsNormalizedHighlight = true;
        }
        
        // Overlay precedence: political_control > ethnicity (if both ON, political wins)
        if (layerPoliticalControlCheck.checked && politicalControlData) {
          const key = getPoliticalControlKey(feature);
          const controller = politicalControlData.by_settlement_id?.[key];
          if (controller !== undefined) {
            const colorHex = FACTION_COLORS[controller] || FACTION_COLORS.null;
            fillColor = hexToRgba(colorHex, 0.4);
          } else {
            debugStats.control_missing_keys++;
            settlementsWithMissingControl.add(feature.properties?.sid);
            needsHighlight = true;
          }
        } else if (layerEthnicityCheck.checked && ethnicityData) {
          const entry = ethnicityData.by_settlement_id?.[sid];
          if (entry) {
            const majority = entry.majority || 'unknown';
            const colorHex = ETHNICITY_COLORS[majority];
            fillColor = hexToRgba(colorHex, 0.3);
          } else {
            debugStats.ethnicity_missing_keys++;
          }
        }
        
        // Determine stroke style (priority: normalized highlight > missing highlight > base)
        let strokeStyle = 'rgba(0, 0, 0, 0.5)';
        let strokeWidth = 1;
        let strokeDashArray = null;
        
        if (highlightNormalizedControlCheck.checked && needsNormalizedHighlight) {
          strokeStyle = '#2e7d32'; // Green for normalized
          strokeWidth = 2;
          // Dashed stroke for normalized
          ctx.setLineDash([5, 3]);
        } else if (highlightMissingControlCheck.checked && needsHighlight) {
          strokeStyle = '#ff0000'; // Red for missing
          strokeWidth = 2;
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([]);
        }
        
        if (geom.type === 'Polygon') {
          const coords = geom.coordinates;
          if (coords && coords[0]) renderPolygon(coords[0], fillColor, strokeStyle, strokeWidth);
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) {
            if (poly && poly[0]) renderPolygon(poly[0], fillColor, strokeStyle, strokeWidth);
          }
        }
        
        // Reset line dash after rendering
        ctx.setLineDash([]);
      }
    }
    
    // Render municipality 1990 boundaries
    if (layerMun1990Check.checked && mun1990BoundariesGeoJSON) {
      for (const feature of mun1990BoundariesGeoJSON.features) {
        const geom = feature.geometry;
        if (geom.type === 'MultiLineString') {
          for (const line of geom.coordinates) {
            if (line) renderLine(line, '#333333', 2);
          }
        } else if (geom.type === 'LineString') {
          renderLine(geom.coordinates, '#333333', 2);
        }
      }
    }
    
    // Selected feature highlight
    if (selectedFeature) {
      const geom = selectedFeature.geometry;
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        renderPolygon(geom.coordinates[0], null, '#0066ff', 3);
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          if (poly && poly[0]) renderPolygon(poly[0], null, '#0066ff', 3);
        }
      }
    }
    
    // Hover highlight (only if not selected)
    if (hoveredFeature && hoveredFeature !== selectedFeature) {
      const geom = hoveredFeature.geometry;
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        renderPolygon(geom.coordinates[0], null, 'rgba(255, 0, 0, 0.6)', 2);
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          if (poly && poly[0]) renderPolygon(poly[0], null, 'rgba(255, 0, 0, 0.6)', 2);
        }
      }
    }
    
    // Update debug overlay if enabled
    if (debugCamera && debugOverlay) {
      const mousePos = { x: 0, y: 0 }; // Would need to track actual mouse pos
      debugOverlay.innerHTML = \`scale: \${viewScale.toFixed(4)}<br>offsetX: \${viewX.toFixed(2)}<br>offsetY: \${viewY.toFixed(2)}\`;
    }
  }
  
  function updateLegend() {
    let html = '<div style="font-weight: bold; margin-bottom: 6px;">Legend:</div>';
    html += \`<div style="font-size: 10px; color: #666; margin-bottom: 6px;">geometry_source: \${geometrySource}<br>geometry_gzip: \${geometryGzip}</div>\`;
    
    if (layerPoliticalControlCheck.checked && politicalControlData) {
      html += '<div style="margin-top: 8px;">Political Control:</div>';
      const factions = ['RBiH', 'RS', 'HRHB', 'null'];
      for (const f of factions) {
        const count = politicalControlData.meta?.counts?.[f] || 0;
        const colorHex = FACTION_COLORS[f];
        html += \`<div class="legend-item">
          <span><span class="legend-color" style="background: \${colorHex}"></span>\${f === 'null' ? 'Unknown' : f}</span>
          <span>\${count}</span>
        </div>\`;
      }
      if (debugStats.control_missing_keys > 0) {
        html += \`<div style="color: #dc3545; margin-top: 4px; font-size: 10px;">control_missing_keys: \${debugStats.control_missing_keys}</div>\`;
      }
      if (debugStats.control_overridden_by_municipality > 0) {
        html += \`<div style="color: #2e7d32; margin-top: 4px; font-size: 10px;">control_overridden_by_municipality: \${debugStats.control_overridden_by_municipality}</div>\`;
      }
    } else if (layerEthnicityCheck.checked && ethnicityData) {
      html += '<div style="margin-top: 8px;">Ethnicity Majority:</div>';
      const groups = ['bosniak', 'serb', 'croat', 'other', 'unknown'];
      for (const g of groups) {
        const count = ethnicityData.meta?.counts?.[g] || 0;
        const colorHex = ETHNICITY_COLORS[g];
        const label = g.charAt(0).toUpperCase() + g.slice(1);
        html += \`<div class="legend-item">
          <span><span class="legend-color" style="background: \${colorHex}"></span>\${label}</span>
          <span>\${count}</span>
        </div>\`;
      }
      if (debugStats.ethnicity_missing_keys > 0) {
        html += \`<div style="color: #dc3545; margin-top: 4px; font-size: 10px;">ethnicity_missing_keys: \${debugStats.ethnicity_missing_keys}</div>\`;
      }
    }
    
    legendDiv.innerHTML = html;
  }
  
  function updateSettlementPanel(feature) {
    if (!feature) {
      settlementPanel.classList.remove('visible');
      selectedFeature = null;
      render();
      return;
    }
    
    selectedFeature = feature;
    const sid = feature.properties?.sid || '';
    
    // Phase H3.6: Settlement name ONLY from settlement_names.json (no fallback to substrate)
    let settlementName = null;
    let nameSource = 'unknown';
    let nameMissingInDataset = false;
    const sidForNames = sid && sid.includes(':') ? 'S' + sid.split(':').pop() : (sid && !/^S\d+/.test(sid) ? 'S' + sid.replace(/\D/g, '') : sid);
    if (settlementNamesData && settlementNamesData.by_settlement_id) {
      const entry = settlementNamesData.by_settlement_id[sid] || settlementNamesData.by_settlement_id[sidForNames];
      if (entry) {
        settlementName = entry && typeof entry === 'object' && entry.name != null ? entry.name : (typeof entry === 'string' ? entry : null);
        if (settlementName != null) nameSource = 'settlement_names.json';
      }
    }
    if (settlementName == null) {
      nameMissingInDataset = true;
      settlementName = null;
    }
    const displayName = settlementName != null && settlementName !== '' ? settlementName : 'Unknown settlement';
    
    const munIdRaw = feature.properties?.municipality_id;
    const munId = munIdRaw != null ? String(munIdRaw) : null;
    
    // Lookup mun1990_id for this settlement
    const mun1990Id = politicalControlData?.mun1990_by_sid?.[sid] || feature.properties?.mun1990_id || null;
    
    // Lookup political control
    const controlKey = getPoliticalControlKey(feature);
    const controller = politicalControlData?.by_settlement_id?.[controlKey];
    const controlFound = controller !== undefined;
    const controlDisplay = controlFound ? (controller === 'null' ? 'Unknown' : controller) : null;
    
    // Check if control was municipality-normalized (Phase H3.3)
    const isNormalized = mun1990Id && (mun1990Id === 'tuzla' || mun1990Id === 'vares');
    
    // Lookup ethnicity
    const ethnicityEntry = ethnicityData?.by_settlement_id?.[sid];
    const ethnicityFound = !!ethnicityEntry;
    const majorityDisplay = ethnicityFound ? (ethnicityEntry.majority || 'Unknown') : null;
    
    // Phase H3.4: name_warning only when display name matches municipality (case-insensitive) and a municipality field exists
    const nameSourceWarning = displayName && mun1990Id && displayName.toLowerCase() === mun1990Id.toLowerCase();
    
    let html = '';
    
    // Settlement ID (always shown)
    html += \`<div class="panel-row">
      <div class="panel-label">Settlement ID:</div>
      <div class="panel-value">\${sid || '(missing)'}</div>
    </div>\`;
    
    // Settlement name (Phase H3.6: only from settlement_names.json)
    html += \`<div class="panel-row">
      <div class="panel-label">Settlement:</div>
      <div class="panel-value\${!settlementName && nameMissingInDataset ? ' missing' : ''}">\${displayName}</div>\`;
    if (nameMissingInDataset) {
      html += \`<div class="panel-value" style="font-size: 10px; color: #dc3545; margin-top: 2px;">name_missing_in_dataset: true</div>\`;
    }
    html += \`<div class="panel-value" style="font-size: 10px; color: #666; margin-top: 2px;">name_source: \${nameSource}</div>\`;
    if (nameSourceWarning) {
      html += \`<div class="panel-value" style="color: #f57c00; font-size: 10px; margin-top: 2px;">⚠ name_warning: settlement name matches municipality (1990) label</div>\`;
    }
    html += \`</div>\`;
    
    // Municipality (Phase H3.7 + H3.9: from mun1990_names.json - display_name + municipality_id)
    // Phase H3.9: Check for municipality_id override from political_control_data first
    const overriddenMunId = politicalControlData?.municipality_id_by_sid?.[sid];
    const effectiveMunId = overriddenMunId || munId;
    const munIdWasOverridden = !!overriddenMunId && overriddenMunId !== munId;
    
    let munDisplayName = null;
    let munNameMissing = false;
    if (mun1990NamesData) {
      const byMun = mun1990NamesData.by_municipality_id;
      const bySlug = mun1990NamesData.by_mun1990_id;
      // Use effectiveMunId (which may be overridden) for lookup
      if (effectiveMunId && byMun && byMun[effectiveMunId]) {
        munDisplayName = byMun[effectiveMunId].display_name;
      } else if (mun1990Id && bySlug && bySlug[mun1990Id]) {
        munDisplayName = bySlug[mun1990Id].display_name;
      } else if (effectiveMunId || mun1990Id) {
        munNameMissing = true;
      }
    } else if (effectiveMunId || mun1990Id) {
      munNameMissing = true;
    }
    const munDisplay = munDisplayName ? munDisplayName + ' (' + (effectiveMunId || mun1990Id) + ')' : (munNameMissing ? '(unknown municipality name) (municipality_id=' + (effectiveMunId || mun1990Id || '?') + ')' : (effectiveMunId || '(missing)'));
    html += \`<div class="panel-row">
      <div class="panel-label">Municipality (1990):</div>
      <div class="panel-value\${munNameMissing ? ' missing' : ''}">\${munDisplay}</div>\`;
    if (munIdWasOverridden) {
      html += \`<div class="panel-value" style="font-size: 10px; color: #2e7d32; margin-top: 2px;">✓ municipality remapped: \${munId} → \${effectiveMunId}</div>\`;
    }
    if (mun1990Id && mun1990Id !== effectiveMunId) {
      html += \`<div class="panel-value" style="font-size: 10px; color: #666;">mun1990_id: \${mun1990Id}</div>\`;
    }
    html += \`</div>
    </div>\`;
    
    // Ethnic majority
    html += \`<div class="panel-row">
      <div class="panel-label">Ethnic majority:</div>
      <div class="panel-value\${!ethnicityFound ? ' missing' : (majorityDisplay === 'Unknown' ? ' unknown' : '')}">\${ethnicityFound ? majorityDisplay : 'Missing in dataset'}</div>
    </div>\`;
    
    // Political control (Phase H3.3: show normalization indicator; Phase H3.10: ungraphed indicator)
    const isUngraphed = politicalControlData?.ungraphed_settlement_ids && Array.isArray(politicalControlData.ungraphed_settlement_ids) && politicalControlData.ungraphed_settlement_ids.indexOf(controlKey) >= 0;
    html += \`<div class="panel-row">
      <div class="panel-label">Political control:</div>
      <div class="panel-value\${!controlFound ? ' missing' : (controlDisplay === 'Unknown' ? ' unknown' : '')}">\${controlFound ? controlDisplay : 'Missing in dataset'}\`;
    if (isNormalized) {
      html += \` <span style="font-size: 10px; color: #2e7d32;">✓ mun-normalized</span>\`;
    }
    if (isUngraphed) {
      html += \` <span style="font-size: 10px; color: #666;">(ungraphed: true)</span>\`;
    }
    html += \`</div>
    </div>\`;
    
    // Lookup diagnostics
    html += \`<div class="panel-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
      <div class="panel-label">Lookup Diagnostics:</div>
      <div class="panel-value" style="font-size: 10px;">
        Control key: <code style="background: #f5f5f5; padding: 2px 4px;">\${controlKey}</code><br>
        Control match: \${controlFound ? '✓' : '✗'}<br>
        Ethnicity match: \${ethnicityFound ? '✓' : '✗'}\`;
    if (isNormalized) {
      html += \`<br>Municipality-normalized: ✓ (\${mun1990Id})\`;
    }
    if (isUngraphed) {
      html += \`<br>ungraphed: true\`;
    }
    html += \`
      </div>
    </div>\`;
    
    // Copy debug button
    const debugLine = \`SID=\${sid} mun=\${munId || 'null'} control=\${controlDisplay || 'missing'} majority=\${majorityDisplay || 'missing'} name=\${displayName} name_source=\${nameSource} mun1990=\${mun1990Id || 'null'} normalized=\${isNormalized} ungraphed=\${isUngraphed}\`;
    html += \`<button class="panel-button" id="copy-debug" data-debug="\${debugLine.replace(/"/g, '&quot;')}">Copy Debug Info</button>\`;
    
    panelContent.innerHTML = html;
    settlementPanel.classList.add('visible');
    
    // Attach copy handler
    const copyBtn = document.getElementById('copy-debug');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = copyBtn.getAttribute('data-debug');
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy Debug Info'; }, 1500);
        }).catch(() => {
          alert('Failed to copy. Manual copy: ' + text);
        });
      });
    }
    
    render();
  }
  
  function pointInRing(wx, wy, ring) {
    let inside = false;
    const n = ring.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (((yi > wy) !== (yj > wy)) && (wx < (xj - xi) * (wy - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function pointInPolygonCoords(wx, wy, coords) {
    if (!coords || !coords[0]) return false;
    const exterior = coords[0];
    if (!pointInRing(wx, wy, exterior)) return false;
    for (let h = 1; h < coords.length; h++) {
      if (pointInRing(wx, wy, coords[h])) return false;
    }
    return true;
  }
  function findFeatureAt(x, y) {
    if (!settlementsGeoJSON) return null;
    const world = screenToWorld(x, y);
    const wx = world.x, wy = world.y;
    for (const feature of [...settlementsGeoJSON.features].reverse()) {
      const geom = feature.geometry;
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        if (pointInPolygonCoords(wx, wy, geom.coordinates)) return feature;
      } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
        for (const poly of geom.coordinates) {
          if (poly && poly[0] && pointInPolygonCoords(wx, wy, poly)) return feature;
        }
      }
    }
    return null;
  }
  
  function updateTooltip(feature, x, y) {
    if (!feature) { tooltip.style.display = 'none'; return; }
    const sid = feature.properties?.sid || '(missing sid)';
    let html = \`<div class="tooltip-line"><strong>SID:</strong> \${sid}</div>\`;
    if (politicalControlData) {
      const key = getSettlementKey(feature);
      const controller = politicalControlData.by_settlement_id?.[key] || 'unknown';
      html += \`<div class="tooltip-line"><strong>Control:</strong> \${controller === 'null' ? 'Unknown' : controller}</div>\`;
    }
    if (ethnicityData) {
      const entry = ethnicityData.by_settlement_id?.[sid];
      if (entry) {
        html += \`<div class="tooltip-line"><strong>Majority:</strong> \${entry.majority}</div>\`;
      }
    }
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = (y + 10) + 'px';
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
      const feature = findFeatureAt(e.clientX, e.clientY);
      if (feature !== hoveredFeature) {
        hoveredFeature = feature;
        render();
        updateTooltip(feature, e.clientX, e.clientY);
      } else if (feature) {
        updateTooltip(feature, e.clientX, e.clientY);
      }
    }
  });
  
  canvas.addEventListener('mouseup', (e) => {
    const wasDragging = isDragging;
    isDragging = false;
    canvas.classList.remove('dragging');
    
    // Click detection: if not dragging, treat as click
    if (!wasDragging || (Math.abs(e.clientX - dragStartX) < 3 && Math.abs(e.clientY - dragStartY) < 3)) {
      const feature = findFeatureAt(e.clientX, e.clientY);
      updateSettlementPanel(feature);
    }
  });
  
  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.classList.remove('dragging');
    hoveredFeature = null;
    tooltip.style.display = 'none';
    render();
  });
  
  // Phase H3.2: Fixed cursor-anchored zoom (no drift)
  // Invariant: world point under cursor stays under cursor after zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    // Get world coordinates under cursor BEFORE zoom
    const worldBefore = screenToWorld(e.clientX, e.clientY);
    
    // Update scale
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = viewScale * zoomFactor;
    viewScale = Math.max(0.1, Math.min(100, newScale));
    
    // Recompute offsets so worldBefore maps back to cursor position
    // screenToWorld: { x: (screenX - viewX) / viewScale, y: (screenY - viewY) / viewScale }
    // Invert: screenX = worldX * viewScale + viewX
    // We want: e.clientX = worldBefore.x * viewScale + viewX
    // Therefore: viewX = e.clientX - worldBefore.x * viewScale
    viewX = e.clientX - worldBefore.x * viewScale;
    viewY = e.clientY - worldBefore.y * viewScale;
    
    render();
  });
  
  layerSettlementsCheck.addEventListener('change', () => { render(); updateLegend(); });
  layerMun1990Check.addEventListener('change', render);
  layerPoliticalControlCheck.addEventListener('change', () => { render(); updateLegend(); });
  layerEthnicityCheck.addEventListener('change', () => { render(); updateLegend(); });
  filterUnknownControlCheck.addEventListener('change', render);
  highlightMissingControlCheck.addEventListener('change', render);
  highlightNormalizedControlCheck.addEventListener('change', render);
  filterSidInput.addEventListener('input', render);
  function getFeatureBounds(feature) {
    const geom = feature.geometry;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const visit = (pt) => {
      if (pt && pt.length >= 2) {
        minX = Math.min(minX, pt[0]); minY = Math.min(minY, pt[1]);
        maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1]);
      }
    };
    if (geom.type === 'Polygon' && geom.coordinates) {
      geom.coordinates.forEach(ring => ring.forEach(visit));
    } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
      geom.coordinates.forEach(poly => poly.forEach(ring => ring.forEach(visit)));
    }
    return (minX !== Infinity) ? { minX, minY, maxX, maxY } : null;
  }
  function findFeatureBySidOrName(q) {
    if (!settlementsGeoJSON || !q) return null;
    const qq = String(q).trim().toLowerCase();
    if (!qq) return null;
    const sidMatch = qq.startsWith('s') ? qq : ('s' + qq);
    for (const f of settlementsGeoJSON.features) {
      const sid = String(f.properties?.sid || '').toLowerCase();
      const name = String(f.properties?.name || '').toLowerCase();
      if (sid === sidMatch || sid.includes(qq) || sid.includes(sidMatch) || name.includes(qq)) return f;
    }
    return null;
  }
  if (gotoBtn && gotoSidInput) {
    gotoBtn.addEventListener('click', () => {
      const q = gotoSidInput.value.trim();
      const f = findFeatureBySidOrName(q);
      if (f) {
        const b = getFeatureBounds(f);
        if (b) {
          const pad = 30;
          fitToBounds({ minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad });
        }
        updateSettlementPanel(f);
      }
    });
  }
  resetViewBtn.addEventListener('click', () => { if (globalBounds) fitToBounds(globalBounds); });
  panelClose.addEventListener('click', () => { updateSettlementPanel(null); });
  
  async function loadData() {
    if (window.location.protocol === 'file:') {
      showFatalError('Browsers block fetch() from file:// protocol. Run: npx http-server -p 8080 from repo root, then open http://localhost:8080/data/derived/map_viewer/index.html');
      return;
    }
    try {
      // Load and validate data_index.json
      const canonResp = await fetch('/data/derived/data_index.json');
      if (!canonResp.ok) {
        showFatalError('Failed to load data_index.json: ' + canonResp.statusText);
        return;
      }
      dataIndex = await canonResp.json();
      
      if (dataIndex.schema_version == null || dataIndex.coordinate_space == null || 
          !Array.isArray(dataIndex.canonical_bbox) || dataIndex.canonical_bbox.length !== 4) {
        showFatalError('Invalid data_index.json: missing required fields');
        return;
      }
      
      globalBounds = {
        minX: dataIndex.canonical_bbox[0],
        minY: dataIndex.canonical_bbox[1],
        maxX: dataIndex.canonical_bbox[2],
        maxY: dataIndex.canonical_bbox[3]
      };
      
      // Load settlements dataset: prefer viewer geometry when available (Phase H3.7)
      const baseLayer = dataIndex.layers?.base_settlements;
      const preferredNames = baseLayer?.preferred_datasets || ['settlements'];
      let settlementsDs = null;
      for (const name of preferredNames) {
        const d = dataIndex.datasets?.[name];
        if (d && d.available && d.path) {
          settlementsDs = d;
          geometrySource = name;
          break;
        }
      }
      if (!settlementsDs) {
        settlementsDs = dataIndex.datasets?.settlements;
        if (settlementsDs) geometrySource = 'settlements';
      }
      if (!settlementsDs || !settlementsDs.path) {
        showFatalError('Missing settlements dataset in data_index');
        return;
      }
      const useGzip = settlementsDs.path_gz && typeof DecompressionStream !== 'undefined';
      geometryGzip = useGzip;
      const geomPath = useGzip ? settlementsDs.path_gz : settlementsDs.path;
      const geomResp = await fetch('/data/derived/' + geomPath);
      if (!geomResp.ok) {
        showFatalError('Failed to load geometry dataset: ' + geomResp.statusText);
        return;
      }
      let geomBytes = await geomResp.arrayBuffer();
      if (useGzip) {
        const ds = new DecompressionStream('gzip');
        const decompressed = await new Response(new Blob([geomBytes]).stream().pipeThrough(ds)).arrayBuffer();
        geomBytes = decompressed;
      }
      if (settlementsDs.checksum_sha256) {
        const computedHash = await sha256Hex(geomBytes);
        if (computedHash !== settlementsDs.checksum_sha256) {
          showFatalError('Geometry checksum mismatch: expected ' + settlementsDs.checksum_sha256 + ', got ' + computedHash);
          return;
        }
      }
      settlementsGeoJSON = JSON.parse(new TextDecoder().decode(geomBytes));
      
      // Load optional datasets (no checksum verification for simplicity in Phase H3)
      const mun1990Ds = dataIndex.datasets?.municipalities_1990_boundaries;
      if (mun1990Ds && mun1990Ds.available) {
        try {
          const resp = await fetch('/data/derived/' + mun1990Ds.path);
          if (resp.ok) mun1990BoundariesGeoJSON = await resp.json();
        } catch {}
      }
      
      const politicalDs = dataIndex.datasets?.political_control;
      if (politicalDs && politicalDs.available) {
        try {
          const resp = await fetch('/data/derived/' + politicalDs.path);
          if (resp.ok) politicalControlData = await resp.json();
        } catch {}
      }
      
      const ethnicityDs = dataIndex.datasets?.settlement_ethnicity;
      if (ethnicityDs && ethnicityDs.available) {
        try {
          const resp = await fetch('/data/derived/' + ethnicityDs.path);
          if (resp.ok) ethnicityData = await resp.json();
        } catch {}
      }
      
      const settlementNamesDs = dataIndex.datasets?.settlement_names;
      if (settlementNamesDs && settlementNamesDs.available) {
        try {
          const resp = await fetch('/data/derived/' + settlementNamesDs.path);
          if (resp.ok) settlementNamesData = await resp.json();
        } catch {}
      }
      const mun1990NamesDs = dataIndex.datasets?.mun1990_names;
      if (mun1990NamesDs && mun1990NamesDs.available) {
        try {
          const resp = await fetch('/data/derived/' + mun1990NamesDs.path);
          if (resp.ok) mun1990NamesData = await resp.json();
        } catch {}
      }
      
      fitToBounds(globalBounds);
      updateLegend();
    } catch (err) {
      console.error('Error loading data:', err);
      showFatalError('Failed to load data: ' + (err instanceof Error ? err.message : String(err)));
    }
  }
  
  loadData();
})();`;
  
  writeFileSync(viewerJsPath, viewerJs, 'utf8');
  process.stdout.write(`Wrote viewer.js to ${viewerJsPath}\n`);
  
  process.stdout.write('\nSUMMARY:\n');
  process.stdout.write('  Generated unified multi-layer map viewer\n');
  process.stdout.write('  HTML: data/derived/map_viewer/index.html\n');
  process.stdout.write('  JS: data/derived/map_viewer/viewer.js\n');
  process.stdout.write('  Contract-first loading with fatal error handling\n');
  process.stdout.write('  Layers: settlements, mun1990_boundaries, political_control, ethnicity_majority\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exitCode = 1;
});
