// Verify the mismatch-marker anchors in a generated calibration viewer.
// The claim under test: every marker point lies INSIDE a ring of the scored cell
// it names. A point that drifts onto a neighbour would assert something false
// about that neighbour, which is the whole reason the anchor is not a bbox centre.
const fs = require('fs');

const html = fs.readFileSync(process.argv[2], 'utf8');

function grab(name) {
  const at = html.indexOf(`const ${name}=`);
  if (at < 0) throw new Error(`${name} not found`);
  const start = html.indexOf('=', at) + 1;
  // payload() emits JSON; scan to the matching close then JSON.parse.
  const open = html[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === open) depth += 1;
    else if (ch === close) { depth -= 1; if (depth === 0) return JSON.parse(html.slice(start, i + 1)); }
  }
  throw new Error(`${name} unterminated`);
}

const CELLS = grab('CELLS');
const MARKERS = grab('MARKERS');
const SCORES = grab('SCORES');

// "M x,y L x,y ... Z" repeated -> array of rings
function ringsOf(d) {
  const rings = [];
  for (const chunk of d.split('Z')) {
    if (!chunk.trim()) continue;
    const pts = [];
    for (const m of chunk.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) pts.push([Number(m[1]), Number(m[2])]);
    if (pts.length >= 3) rings.push(pts);
  }
  return rings;
}
function inRing([px, py], r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// scored osid -> every ring drawn for it (parent plus merged children)
const ringsByScored = new Map();
for (const c of CELLS) {
  if (!ringsByScored.has(c.s)) ringsByScored.set(c.s, []);
  ringsByScored.get(c.s).push(...ringsOf(c.d));
}

let checked = 0, outside = 0, missing = 0;
const failures = [];
const mismatchOsids = new Set();
for (const s of SCORES) if (s.reached) for (const m of s.mismatches) mismatchOsids.add(m.osid);

for (const osid of [...mismatchOsids].sort()) {
  const pt = MARKERS[osid];
  if (!pt) { missing += 1; failures.push(`NO MARKER  ${osid}`); continue; }
  const rings = ringsByScored.get(osid) || [];
  checked += 1;
  if (!rings.some((r) => inRing(pt, r))) { outside += 1; failures.push(`OUTSIDE    ${osid} at ${pt}`); }
}

// Every scored cell should have an anchor, not just the currently-mismatched ones.
const allScored = new Set(CELLS.map((c) => c.s));
let scoredWithout = 0;
for (const s of allScored) if (!MARKERS[s]) scoredWithout += 1;

console.log(`scored cells            ${allScored.size}`);
console.log(`markers emitted         ${Object.keys(MARKERS).length}`);
console.log(`scored without a marker ${scoredWithout}`);
console.log(`mismatch osids (all cp) ${mismatchOsids.size}`);
console.log(`anchors checked         ${checked}`);
console.log(`anchors OUTSIDE cell    ${outside}`);
console.log(`markers MISSING         ${missing}`);
for (const f of failures.slice(0, 20)) console.log('  ' + f);
process.exit(outside === 0 && missing === 0 && scoredWithout === 0 ? 0 : 1);
