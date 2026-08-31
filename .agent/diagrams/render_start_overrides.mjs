import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

const [scenarioPath, geoPath, outPath] = process.argv.slice(2);
if (!scenarioPath || !geoPath || !outPath) {
  throw new Error('usage: node render_start_overrides.mjs <scenario.json> <operational.geojson> <out.png>');
}

const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));
const geo = JSON.parse(readFileSync(geoPath, 'utf8'));
const overrides = scenario.osid_control_overrides ?? {};
const overrideIds = new Set(Object.keys(overrides));
const colors = { RBiH: '#4a7c54', RS: '#b03636', HRHB: '#486ebe' };
const bright = { RBiH: '#8ee5a3', RS: '#ff7777', HRHB: '#8fb6ff' };

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
function visit(coords, depth) {
  if (depth === 0) {
    const [x, y] = coords;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    return;
  }
  for (const child of coords) visit(child, depth - 1);
}
for (const feature of geo.features) {
  visit(feature.geometry.coordinates, feature.geometry.type === 'Polygon' ? 2 : 3);
}
const pad = 0.02;
const spanX = maxX - minX, spanY = maxY - minY;
minX -= spanX * pad; maxX += spanX * pad; minY -= spanY * pad; maxY += spanY * pad;

const MAP_W = 1600, SIDE_W = 600, W = MAP_W + SIDE_W, H = 1500;
const scale = Math.min(MAP_W / (maxX - minX), H / (maxY - minY));
const offX = (MAP_W - (maxX - minX) * scale) / 2;
const offY = (H - (maxY - minY) * scale) / 2;
const project = ([x, y]) => [(x - minX) * scale + offX, H - ((y - minY) * scale + offY)];

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, W, H);
ctx.fillStyle = '#111821'; ctx.fillRect(MAP_W, 0, SIDE_W, H);

function polygons(feature) {
  return feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
}
function trace(poly) {
  ctx.beginPath();
  for (const ring of poly) {
    ring.forEach((pt, i) => {
      const [x, y] = project(pt);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
}
function centroid(feature) {
  let ring = null;
  for (const poly of polygons(feature)) if (!ring || poly[0].length > ring.length) ring = poly[0];
  let x = 0, y = 0;
  for (const pt of ring) { x += pt[0]; y += pt[1]; }
  return project([x / ring.length, y / ring.length]);
}

for (const feature of geo.features) {
  const selected = overrideIds.has(feature.properties.osid);
  const faction = overrides[feature.properties.osid];
  ctx.fillStyle = selected ? colors[faction] : '#252c34';
  ctx.strokeStyle = selected ? bright[faction] : 'rgba(255,255,255,.16)';
  ctx.lineWidth = selected ? 2.2 : 0.55;
  for (const poly of polygons(feature)) { trace(poly); ctx.fill(); ctx.stroke(); }
}

const selectedFeatures = geo.features
  .filter((f) => overrideIds.has(f.properties.osid))
  .sort((a, b) => a.properties.osid.localeCompare(b.properties.osid));
for (const [index, feature] of selectedFeatures.entries()) {
  const [x, y] = centroid(feature);
  const faction = overrides[feature.properties.osid];
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = bright[faction]; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#071018'; ctx.stroke();
  ctx.fillStyle = '#071018'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(String(index + 1), x, y + 4);
}

ctx.textAlign = 'left';
ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif';
ctx.fillText('April 1992 start-control overrides', 22, 36);
ctx.fillStyle = '#aab4c0'; ctx.font = '15px sans-serif';
ctx.fillText(`${selectedFeatures.length} explicit OSIDs · all other operational cells dimmed`, 22, 62);

ctx.fillStyle = '#fff'; ctx.font = 'bold 23px sans-serif';
ctx.fillText('Explicit scenario overrides', MAP_W + 28, 42);
let y = 79;
for (const faction of ['RBiH', 'RS', 'HRHB']) {
  const rows = selectedFeatures
    .map((feature, index) => ({ feature, index }))
    .filter(({ feature }) => overrides[feature.properties.osid] === faction);
  if (!rows.length) continue;
  ctx.fillStyle = colors[faction]; ctx.fillRect(MAP_W + 28, y - 16, 22, 22);
  ctx.fillStyle = '#f3f5f7'; ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`${faction} · ${rows.length}`, MAP_W + 61, y + 1);
  y += 29;
  for (const { feature, index } of rows) {
    const osid = feature.properties.osid;
    const name = String(feature.properties.settlement_name ?? osid).replace(/\s*\(\+\d+\)\s*$/, '');
    const mun = osid.split(':')[1].replaceAll('_', ' ');
    ctx.fillStyle = bright[faction]; ctx.font = 'bold 14px sans-serif';
    ctx.fillText(String(index + 1).padStart(2, '0'), MAP_W + 28, y);
    ctx.fillStyle = '#edf1f5'; ctx.font = '14px sans-serif';
    ctx.fillText(`${mun} — ${name}`, MAP_W + 61, y);
    y += 24;
  }
  y += 13;
}

ctx.fillStyle = '#8893a0'; ctx.font = '13px sans-serif';
ctx.fillText('Source: data/scenarios/apr1992_definitive_188w.json', MAP_W + 28, H - 54);
ctx.fillText('Foča former overrides are absent; their control is now earned in simulation.', MAP_W + 28, H - 31);

writeFileSync(outPath, canvas.toBuffer('image/png'));
console.log(`${outPath} overrides=${selectedFeatures.length}/${overrideIds.size}`);
