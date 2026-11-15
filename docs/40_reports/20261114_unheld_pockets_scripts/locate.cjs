// Fit lon/lat -> screenshot pixel (affine, least squares) from labelled towns, then list OSIDs near pocket pixels.
const fs = require('fs');
const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const pos = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
const find = (mun) => g.nodes.filter((n) => n.id.split(':')[1] === mun).map((n) => n.id);
// label pixel positions read from the owner's screenshot 2
const labels = [
  ['op:bihac:bihac_2', 176, 350], ['op:banja_luka:banja_luka_2', 1217, 390], ['op:cazin:cazin_2', 281, 158],
  ['op:sanski_most:sanski_most_2', 776, 342], ['op:velika_kladusa:velika_kladusa_2', 212, 17],
];
// prijedor & gradiska seats
const pri = find('prijedor').find((x) => /prijedor_\d|prijedor$/.test(x)); if (pri) labels.push([pri, 863, 158]);
const gra = find('bosanska_gradiska').find((x) => /gradiska/.test(x)); if (gra) labels.push([gra, 1166, 68]);
console.log('labels used', labels.map((l) => l[0]).join(' '));
// solve px = a*lon + b*lat + c ; py = d*lon + e*lat + f
function solve(rows, col) {
  // normal equations 3x3
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0];
  for (const [id, x, y] of rows) { const p = pos[id]; const v = [p.lon, p.lat, 1]; const t = col === 0 ? x : y; for (let i = 0; i < 3; i++) { B[i] += v[i] * t; for (let j = 0; j < 3; j++) A[i][j] += v[i] * v[j]; } }
  // gaussian
  for (let i = 0; i < 3; i++) { let m = i; for (let k = i + 1; k < 3; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k; [A[i], A[m]] = [A[m], A[i]]; [B[i], B[m]] = [B[m], B[i]]; for (let k = 0; k < 3; k++) if (k !== i) { const f = A[k][i] / A[i][i]; for (let j = i; j < 3; j++) A[k][j] -= f * A[i][j]; B[k] -= f * B[i]; } }
  return B.map((b, i) => b / A[i][i]);
}
const cx = solve(labels, 0), cy = solve(labels, 1);
const px = (id) => { const p = pos[id]; return [cx[0] * p.lon + cx[1] * p.lat + cx[2], cy[0] * p.lon + cy[1] * p.lat + cy[2]]; };
for (const [id, x, y] of labels) { const [a, b] = px(id); console.log('resid', id, Math.round(a - x), Math.round(b - y)); }
const targets = { grey_upper: [1205, 640], grey_lower: [1280, 740], green_lower: [1160, 805], green_cazin_east: [480, 245], green_bihac_south: [150, 330] };
for (const [name, [tx, ty]] of Object.entries(targets)) {
  const near = g.nodes.map((n) => { const [a, b] = px(n.id); return [n.id, Math.hypot(a - tx, b - ty)]; }).sort((a, b) => a[1] - b[1]).slice(0, 6);
  console.log(name, near.map(([id, d]) => id.replace('op:', '') + '(' + Math.round(d) + ')').join(' '));
}
