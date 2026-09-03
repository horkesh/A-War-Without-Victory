/** Build a self-contained, mobile-friendly HTML viewer around a rendered map PNG. */
import { readFileSync, writeFileSync } from 'node:fs';

const [pngPath, outPath, title, score, footer, geoPath, savePath, paintedPath] = process.argv.slice(2);
if (!pngPath || !outPath || !title || !score) {
  console.error('usage: node tools/build_calibration_map_html.mjs <map.png> <out.html> <title> <score> [footer] [operational.geojson save.json painted.json]');
  process.exit(2);
}

const optionalInteractivePaths = [geoPath, savePath, paintedPath];
if (optionalInteractivePaths.some(Boolean) && !optionalInteractivePaths.every(Boolean)) {
  console.error('interactive mode requires operational.geojson, save.json, and painted.json together');
  process.exit(2);
}

const png = readFileSync(pngPath).toString('base64');
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const safeTitle = escapeHtml(title);
const safeScore = escapeHtml(score);
const safeFooter = escapeHtml(footer ?? 'Amber cells mismatch painted truth; outline and center dot show the required faction.');

function buildInteractiveLayer() {
  if (!geoPath) return { paths: '', details: '[]', enabled: false };

  const geo = JSON.parse(readFileSync(geoPath, 'utf8'));
  const save = JSON.parse(readFileSync(savePath, 'utf8'));
  const painted = JSON.parse(readFileSync(paintedPath, 'utf8'));
  const controllers = save?.political?.political_controllers ?? {};
  const paintedControllers = painted?.by_settlement_id ?? {};
  const changes = new Map((painted?.meta?.changelog ?? []).map((entry) => [entry.osid, entry]));
  // orphan -> merge parent, written by tools/merge_micro_osids.cjs
  let mergeMap = {};
  try {
    mergeMap = JSON.parse(readFileSync(new URL('../data/derived/operational/micro_osid_merge_map.json', import.meta.url), 'utf8'));
  } catch {
    mergeMap = {}; // viewer still builds; merged children then report as unscored
  }
  const features = [...(geo?.features ?? [])]
    .filter((feature) => typeof feature?.properties?.osid === 'string')
    .sort((a, b) => a.properties.osid < b.properties.osid ? -1 : a.properties.osid > b.properties.osid ? 1 : 0);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function visitCoords(coords, depth) {
    if (depth === 0) {
      const [x, y] = coords;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return;
    }
    for (const child of coords) visitCoords(child, depth - 1);
  }
  const depthFor = (type) => type === 'Polygon' ? 2 : type === 'MultiPolygon' ? 3 : 1;
  for (const feature of features) visitCoords(feature.geometry.coordinates, depthFor(feature.geometry.type));
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    throw new Error(`No finite interactive geometry in ${geoPath}`);
  }

  const width = 1600, height = 1500, pad = 0.02;
  const spanX = maxX - minX, spanY = maxY - minY;
  minX -= spanX * pad; maxX += spanX * pad; minY -= spanY * pad; maxY += spanY * pad;
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
  const offX = (width - (maxX - minX) * scale) / 2;
  const offY = (height - (maxY - minY) * scale) / 2;
  const fmt = (value) => Number(value.toFixed(2)).toString();
  const project = ([x, y]) => [fmt((x - minX) * scale + offX), fmt(height - ((y - minY) * scale + offY))];
  const ringPath = (ring) => ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? 'M' : 'L'}${x},${y}`;
  }).join('') + 'Z';
  const geometryPath = (geometry) => {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return polygons.flatMap((polygon) => polygon.map(ringPath)).join('');
  };

  const details = features.map((feature) => {
    const osid = feature.properties.osid;
    // A merge child is scored under its parent: read every calibration field
    // through the parent's osid, and say so in the tooltip.
    const mergedInto = mergeMap[osid] ?? null;
    const scoredOsid = mergedInto ?? osid;
    const change = changes.get(scoredOsid);
    return {
      osid,
      settlement: feature.properties.settlement_name ?? '',
      municipality: feature.properties.mun1990_name ?? feature.properties.mun1990_id ?? '',
      mergedInto,
      simulated: controllers[scoredOsid] ?? null,
      painted: paintedControllers[scoredOsid] ?? null,
      compared: paintedControllers[scoredOsid] !== undefined,
      mismatch: paintedControllers[scoredOsid] !== undefined && controllers[scoredOsid] !== paintedControllers[scoredOsid],
      changed: Boolean(change),
      changedFrom: change?.from ?? null,
      changedTo: change?.to ?? null,
    };
  });
  const paths = features.map((feature, index) => {
    const d = details[index];
    const place = [d.settlement, d.municipality].filter(Boolean).join(', ');
    const label = escapeHtml(`${d.osid}${place ? ` — ${place}` : ''}`);
    return `<path class="hit-region" data-index="${index}" tabindex="0" role="button" aria-label="${label}" d="${geometryPath(feature.geometry)}"/>`;
  }).join('');
  return { paths, details: JSON.stringify(details).replaceAll('<', '\\u003c'), enabled: true };
}

const interactive = buildInteractiveLayer();

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${safeTitle}</title><style>
:root{--ink:#29261f;--dim:#70695d;--line:rgba(54,45,31,.16);--amber:#c98e26;--green:#4a7c54;--red:#b03636;--blue:#486ebe}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;overflow-wrap:break-word}body{color:var(--ink);font-family:Georgia,'Times New Roman',serif;background:radial-gradient(circle at 15% 0,#fffaf0 0,transparent 36%),linear-gradient(145deg,#e7dcc7,#f5eee2 68%,#ded2be)}
main{width:min(1240px,100%);margin:auto;padding:clamp(10px,2.5vw,28px)}header{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:14px}header>*{min-width:0}
.kicker,.score,.note,.foot{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}h1{font-size:clamp(30px,5vw,58px);line-height:.98;letter-spacing:-.035em;margin:8px 0 0}.score{font-size:13px;line-height:1.4;padding:10px 12px;border:1px solid var(--line);background:rgba(255,255,255,.44);white-space:nowrap}
.map{position:relative;overflow:hidden;background:#0a0e14;box-shadow:0 20px 58px rgba(42,34,22,.22);touch-action:none}.viewport{position:relative;width:100%;transform-origin:center;will-change:transform}.viewport img{display:block;width:100%;height:auto;user-select:none;-webkit-user-drag:none}.hit-layer{position:absolute;inset:0;width:100%;height:100%;z-index:1}.hit-region{fill:transparent;stroke:transparent;stroke-width:2;pointer-events:all;cursor:help}.hit-region:hover,.hit-region:focus{fill:rgba(255,255,255,.16);stroke:rgba(255,255,255,.95);outline:none}.controls{position:absolute;right:10px;top:10px;display:flex;gap:6px;z-index:4}.controls button{width:44px;height:44px;border:1px solid rgba(255,255,255,.25);background:rgba(8,12,17,.88);color:#fff;font:500 18px ui-monospace,monospace;border-radius:5px}.tooltip{position:absolute;display:none;z-index:3;min-width:240px;max-width:min(340px,calc(100% - 20px));padding:11px 12px;border:1px solid rgba(255,255,255,.22);border-radius:6px;background:rgba(8,12,17,.94);box-shadow:0 10px 30px rgba(0,0,0,.35);color:#fff;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;pointer-events:none}.tooltip[data-open="true"]{display:block}.tooltip strong{display:block;font-size:13px;margin-bottom:3px}.tooltip .place{color:#cbd5e1;margin-bottom:7px}.tooltip dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0}.tooltip dt{color:#94a3b8}.tooltip dd{margin:0}.tooltip .wrong{color:#fbbf24}.tooltip .muted{color:#94a3b8}.tooltip .merged{display:none;margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.14);color:#cbd5e1}.tooltip .merged[data-shown="true"]{display:block}.tooltip .changed{color:#a7f3d0}
.note{font-size:12px;line-height:1.55;color:var(--dim);margin:14px 0}.legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.key{padding:10px 12px;background:rgba(255,255,255,.38);border-top:3px solid var(--c);font:500 12px ui-monospace,monospace}.foot{font-size:10px;line-height:1.5;color:var(--dim);border-top:1px solid var(--line);margin-top:14px;padding-top:12px}
@media(max-width:640px){main{padding:10px}header{display:block}.score{display:inline-block;margin-top:10px;white-space:normal}.map{margin-inline:-10px}.legend{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-color-scheme:dark){:root{--ink:#eee5d6;--dim:#aaa092;--line:rgba(255,255,255,.12)}body{background:radial-gradient(circle at 15% 0,#30291e 0,transparent 36%),linear-gradient(145deg,#17140f,#211d17 68%,#15120e)}.score,.key{background:rgba(255,255,255,.045)}}
</style></head><body><main>
<header><div><div class="kicker">January calibration · 188-week master</div><h1>${safeTitle}</h1></div><div class="score">${safeScore}</div></header>
<section class="map" id="map" aria-label="Interactive January 1993 control map"><div class="viewport" id="viewport"><img id="image" src="data:image/png;base64,${png}" alt="Full north-up January 1993 operational control map with amber mismatches and expected-faction marks.">${interactive.enabled ? `<svg class="hit-layer" id="hit-layer" viewBox="0 0 1600 1500" preserveAspectRatio="xMidYMid meet" aria-label="OSID hover regions">${interactive.paths}</svg>` : ''}</div><div class="tooltip" id="map-tooltip" role="status" aria-live="polite"><strong id="tip-osid"></strong><div class="place" id="tip-place"></div><dl><dt>Simulated control</dt><dd id="tip-sim"></dd><dt>Painted control</dt><dd id="tip-painted"></dd><dt>Calibration</dt><dd id="tip-match"></dd><dt>Reference changed</dt><dd id="tip-changed"></dd></dl><div class="merged" id="tip-merged"></div></div><div class="controls"><button id="minus" aria-label="Zoom out">−</button><button id="reset" aria-label="Reset view">↺</button><button id="plus" aria-label="Zoom in">+</button></div></section>
<p class="note">North is up. ${interactive.enabled ? 'Hover or tap any OSID for its name and control details. ' : ''}Amber fill marks a wrong OSID; its outline and center dot show the painted controller. Pinch or use the controls to zoom; drag to pan.</p>
<section class="legend"><div class="key" style="--c:var(--green)">RBiH · green</div><div class="key" style="--c:var(--red)">RS · red</div><div class="key" style="--c:var(--blue)">HRHB · blue</div><div class="key" style="--c:var(--amber)">Mismatch · amber</div></section><p class="foot">${safeFooter}</p>
</main><script>
const image=document.getElementById('image'),viewport=document.getElementById('viewport'),map=document.getElementById('map');let z=1,x=0,y=0,drag=false,sx=0,sy=0,dist=0;
function draw(){viewport.style.transform='translate('+x+'px,'+y+'px) scale('+z+')'}function zoom(d){z=Math.max(1,Math.min(5,z+d));if(z===1)x=y=0;draw()}
plus.onclick=()=>zoom(.35);minus.onclick=()=>zoom(-.35);reset.onclick=()=>{z=1;x=y=0;draw()};map.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom(e.deltaY<0?.25:-.25)}},{passive:false});
map.addEventListener('pointerdown',e=>{if(z<=1)return;drag=true;sx=e.clientX-x;sy=e.clientY-y;map.setPointerCapture(e.pointerId)});map.addEventListener('pointermove',e=>{if(!drag)return;x=e.clientX-sx;y=e.clientY-sy;draw()});map.addEventListener('pointerup',()=>drag=false);map.addEventListener('pointercancel',()=>drag=false);
map.addEventListener('touchstart',e=>{if(e.touches.length===2)dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});map.addEventListener('touchmove',e=>{if(e.touches.length!==2||!dist)return;const n=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom((n-dist)/180);dist=n},{passive:true});
const osids=${interactive.details};const hitLayer=document.getElementById('hit-layer'),tooltip=document.getElementById('map-tooltip');
function setText(id,value){document.getElementById(id).textContent=value??'—'}
function showTooltip(clientX,clientY,path){const detail=osids[Number(path.dataset.index)];if(!detail)return;setText('tip-osid',detail.osid);setText('tip-place',[detail.settlement,detail.municipality].filter(Boolean).join(' · '));setText('tip-sim',detail.simulated);setText('tip-painted',detail.compared?detail.painted:'No painted reference');const match=document.getElementById('tip-match');match.textContent=detail.compared?(detail.mismatch?'Mismatch':'Correct'):'Not compared';match.className=detail.compared?(detail.mismatch?'wrong':''):'muted';const merged=document.getElementById('tip-merged');if(detail.mergedInto){merged.textContent='Sub-1 km² cell merged into '+detail.mergedInto+' — the control above is that cell’s.';merged.dataset.shown='true'}else{merged.textContent='';merged.dataset.shown='false'}const changed=document.getElementById('tip-changed');changed.textContent=detail.changed?detail.changedFrom+' → '+detail.changedTo:'No';changed.className=detail.changed?'changed':'';tooltip.dataset.open='true';const rect=map.getBoundingClientRect(),gap=14;let left=clientX-rect.left+gap,top=clientY-rect.top+gap;tooltip.style.left=left+'px';tooltip.style.top=top+'px';const box=tooltip.getBoundingClientRect();if(box.right>rect.right-8)left=Math.max(8,clientX-rect.left-box.width-gap);if(box.bottom>rect.bottom-8)top=Math.max(8,clientY-rect.top-box.height-gap);tooltip.style.left=left+'px';tooltip.style.top=top+'px'}
function showFromEvent(event,path){showTooltip(event.clientX,event.clientY,path)}
function showFromFocus(path){const b=path.getBoundingClientRect();showTooltip(b.left+b.width/2,b.top+b.height/2,path)}
const canHover=window.matchMedia&&window.matchMedia('(hover: hover)').matches;let sticky=false,tapX=0,tapY=0;const TAP_SLOP=8;
function hideTooltip(){sticky=false;tooltip.dataset.open='false'}
if(hitLayer){
hitLayer.addEventListener('pointermove',event=>{
 if(sticky){if(Math.hypot(event.clientX-tapX,event.clientY-tapY)>TAP_SLOP)hideTooltip();return}
 if(drag)return;const path=event.target.closest?.('.hit-region');if(path&&(canHover||event.pointerType==='mouse'))showFromEvent(event,path)});
hitLayer.addEventListener('pointerdown',event=>{const path=event.target.closest?.('.hit-region');if(!path)return;tapX=event.clientX;tapY=event.clientY;sticky=!canHover||event.pointerType==='touch'||event.pointerType==='pen';showFromEvent(event,path)});
hitLayer.addEventListener('pointerleave',()=>{if(!drag&&!sticky)hideTooltip()});
map.addEventListener('pointermove',event=>{if(sticky&&Math.hypot(event.clientX-tapX,event.clientY-tapY)>TAP_SLOP)hideTooltip()});
map.addEventListener('pointerdown',event=>{if(sticky&&!event.target.closest?.('.hit-region'))hideTooltip()});
window.addEventListener('keydown',event=>{if(event.key==='Escape')hideTooltip()});
hitLayer.addEventListener('focusin',event=>{const path=event.target.closest?.('.hit-region');if(path)showFromFocus(path)});
hitLayer.addEventListener('focusout',event=>{const path=event.target.closest?.('.hit-region');if(path&&!sticky)hideTooltip()})}
</script></body></html>`;

writeFileSync(outPath, html);
console.log(outPath);
