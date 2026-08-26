/** Build a self-contained, mobile-friendly HTML viewer around a rendered map PNG. */
import { readFileSync, writeFileSync } from 'node:fs';

const [pngPath, outPath, title, score, footer] = process.argv.slice(2);
if (!pngPath || !outPath || !title || !score) {
  console.error('usage: node tools/build_calibration_map_html.mjs <map.png> <out.html> <title> <score> [footer]');
  process.exit(2);
}

const png = readFileSync(pngPath).toString('base64');
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const safeTitle = escapeHtml(title);
const safeScore = escapeHtml(score);
const safeFooter = escapeHtml(footer ?? 'Amber cells mismatch painted truth; outline and center dot show the required faction.');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${safeTitle}</title><style>
:root{--ink:#29261f;--dim:#70695d;--line:rgba(54,45,31,.16);--amber:#c98e26;--green:#4a7c54;--red:#b03636;--blue:#486ebe}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;overflow-wrap:break-word}body{color:var(--ink);font-family:Georgia,'Times New Roman',serif;background:radial-gradient(circle at 15% 0,#fffaf0 0,transparent 36%),linear-gradient(145deg,#e7dcc7,#f5eee2 68%,#ded2be)}
main{width:min(1240px,100%);margin:auto;padding:clamp(10px,2.5vw,28px)}header{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:14px}header>*{min-width:0}
.kicker,.score,.note,.foot{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}h1{font-size:clamp(30px,5vw,58px);line-height:.98;letter-spacing:-.035em;margin:8px 0 0}.score{font-size:13px;line-height:1.4;padding:10px 12px;border:1px solid var(--line);background:rgba(255,255,255,.44);white-space:nowrap}
.map{position:relative;overflow:hidden;background:#0a0e14;box-shadow:0 20px 58px rgba(42,34,22,.22);touch-action:none}.map img{display:block;width:100%;height:auto;transform-origin:center;will-change:transform;user-select:none;-webkit-user-drag:none}.controls{position:absolute;right:10px;top:10px;display:flex;gap:6px;z-index:2}.controls button{width:44px;height:44px;border:1px solid rgba(255,255,255,.25);background:rgba(8,12,17,.88);color:#fff;font:500 18px ui-monospace,monospace;border-radius:5px}
.note{font-size:12px;line-height:1.55;color:var(--dim);margin:14px 0}.legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.key{padding:10px 12px;background:rgba(255,255,255,.38);border-top:3px solid var(--c);font:500 12px ui-monospace,monospace}.foot{font-size:10px;line-height:1.5;color:var(--dim);border-top:1px solid var(--line);margin-top:14px;padding-top:12px}
@media(max-width:640px){main{padding:10px}header{display:block}.score{display:inline-block;margin-top:10px;white-space:normal}.map{margin-inline:-10px}.legend{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-color-scheme:dark){:root{--ink:#eee5d6;--dim:#aaa092;--line:rgba(255,255,255,.12)}body{background:radial-gradient(circle at 15% 0,#30291e 0,transparent 36%),linear-gradient(145deg,#17140f,#211d17 68%,#15120e)}.score,.key{background:rgba(255,255,255,.045)}}
</style></head><body><main>
<header><div><div class="kicker">January calibration · 188-week master</div><h1>${safeTitle}</h1></div><div class="score">${safeScore}</div></header>
<section class="map" id="map" aria-label="Interactive January 1993 control map"><img id="image" src="data:image/png;base64,${png}" alt="Full north-up January 1993 operational control map with amber mismatches and expected-faction marks."><div class="controls"><button id="minus" aria-label="Zoom out">−</button><button id="reset" aria-label="Reset view">↺</button><button id="plus" aria-label="Zoom in">+</button></div></section>
<p class="note">North is up. Amber fill marks a wrong OSID. Its outline and center dot show the painted controller: green RBiH, red RS, blue HRHB. Pinch or use the controls to zoom; drag to pan.</p>
<section class="legend"><div class="key" style="--c:var(--green)">RBiH · green</div><div class="key" style="--c:var(--red)">RS · red</div><div class="key" style="--c:var(--blue)">HRHB · blue</div><div class="key" style="--c:var(--amber)">Mismatch · amber</div></section><p class="foot">${safeFooter}</p>
</main><script>
const image=document.getElementById('image'),map=document.getElementById('map');let z=1,x=0,y=0,drag=false,sx=0,sy=0,dist=0;
function draw(){image.style.transform='translate('+x+'px,'+y+'px) scale('+z+')'}function zoom(d){z=Math.max(1,Math.min(5,z+d));if(z===1)x=y=0;draw()}
plus.onclick=()=>zoom(.35);minus.onclick=()=>zoom(-.35);reset.onclick=()=>{z=1;x=y=0;draw()};map.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom(e.deltaY<0?.25:-.25)}},{passive:false});
map.addEventListener('pointerdown',e=>{if(z<=1)return;drag=true;sx=e.clientX-x;sy=e.clientY-y;map.setPointerCapture(e.pointerId)});map.addEventListener('pointermove',e=>{if(!drag)return;x=e.clientX-sx;y=e.clientY-sy;draw()});map.addEventListener('pointerup',()=>drag=false);map.addEventListener('pointercancel',()=>drag=false);
map.addEventListener('touchstart',e=>{if(e.touches.length===2)dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});map.addEventListener('touchmove',e=>{if(e.touches.length!==2||!dist)return;const n=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom((n-dist)/180);dist=n},{passive:true});
</script></body></html>`;

writeFileSync(outPath, html);
console.log(outPath);
