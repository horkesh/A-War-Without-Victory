#!/usr/bin/env node
/**
 * Read a peace plan's own map, settlement by settlement (owner, 2026-11-09: the plans did not
 * follow municipal lines; Vance–Owen's province borders and Owen–Stoltenberg's freehand line
 * cut through municipalities, so a municipal percentage filled from the front put the line in
 * the wrong place).
 *
 *   node tools/peace/plan_map_digitize.cjs <plan> <image> [--qa <dir>]
 *
 * 1. Projects the operational settlements as everywhere else (x = lon × cos 44°, y = −lat).
 * 2. Fits an affine transform from that frame onto the image by maximising the overlap
 *    (intersection over union) between the image's plan-coloured land and our country
 *    silhouette: bounding-box start, then deterministic coordinate descent.
 * 3. Samples a grid of points inside every settlement, classifies each pixel to the nearest
 *    plan colour (lines, labels and rivers fall outside every colour and are ignored), and
 *    assigns the settlement to the area majority. Confidence: verified ≥ 90 % of classified
 *    samples, approximate otherwise; unresolved when nothing was classified.
 * 4. Applies the plan's documented overrides (e.g. the Vance–Owen March 1993 revision).
 * Writes data/source/peace_plans/<plan>_cell_assignments.json; the reference image is not
 * committed (its SHA-256 and URL are recorded). Deterministic: sorted iteration, fixed grids.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const K = Math.cos(44 * Math.PI / 180);

/** Plan colour keys, faction mapping and documented overrides. */
const PLANS = {
    vance_owen: {
        url: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Vance-Owen_Peace_Plan.png',
        title: 'Vance–Owen Peace Plan provinces as presented in January 1993 (Wikimedia Commons, after UN DPI map 4129)',
        palette: [
            { name: 'green (Muslim-led provinces 1, 5, 9)', rgb: [8, 120, 56], entity: 'FED', faction: 'RBiH' },
            { name: 'red (Serb-led provinces 2, 4, 6)', rgb: [152, 8, 24], entity: 'RS', faction: 'RS' },
            { name: 'navy (Croat-led provinces 3, 8, 10)', rgb: [56, 72, 104], entity: 'FED', faction: 'HRHB' },
            { name: 'gold (province 7, Sarajevo)', rgb: [168, 136, 56], entity: 'special', faction: null },
        ],
        maxDistance: 60,
        // The January 1993 map as presented (UN DPI 4129), which is when the game offers the plan
        // (war_1993.json, vance_owen_plan_1993, turn 39). The signed map of 25 March 1993
        // (S/25479) differs in Prijedor, Bosanski Novi, Brčko and Sarajevo province 7 (Visoko,
        // Breza and Vareš added); not applied here, so the plan stays one dated version.
        overrides: null,
    },
    owen_stoltenberg: {
        url: 'https://upload.wikimedia.org/wikipedia/commons/5/57/BiH_by_OvenStoltemberg.jpg',
        title: 'Owen–Stoltenberg map proposal, Geneva 1993 (Wikimedia Commons scan)',
        palette: [
            { name: 'blue (Serb republic)', rgb: [152, 207, 242], entity: 'RS', faction: 'RS' },
            { name: 'green (Muslim republic)', rgb: [145, 184, 78], entity: 'FED', faction: 'RBiH' },
            { name: 'orange (Croat republic)', rgb: [228, 135, 70], entity: 'FED', faction: 'HRHB' },
            { name: 'pink (Sarajevo UN and Mostar EU administration)', rgb: [193, 114, 161], entity: 'special', faction: null },
        ],
        maxDistance: 55,
        // The legend's colour swatches (bottom right) are not land.
        ignore: [[0.75, 0.82, 1, 1]],
        // Reading errors corrected by the historian seat (2026-11-09 review, plan-maps/COMPARISON.md).
        overrides: {
            cells: {
                // The scan's small pink Mostar circle is lost to the reading; the city was the EU district.
                'op:mostar:mostar_istok_2': { side: 'special', evidence: 'S/26337 para 6: Mostar under EU administration' },
                'op:mostar:mostar_zapad_2': { side: 'special', evidence: 'S/26337 para 6: Mostar under EU administration' },
                // The Muslim boundary takes Brčko's western outskirts to the Sava along the Brka.
                'op:brcko:brka_2': { side: 'RBiH', evidence: 'S/26260 para 33: western outskirts of Brčko to the Muslim republic, along the Brka to the Sava' },
                'op:brcko:bukvik_gornji_2': { side: 'RBiH', evidence: 'S/26260 para 33: western outskirts of Brčko to the Muslim republic' },
                'op:brcko:donji_rahic': { side: 'RBiH', evidence: 'S/26260 para 33: western outskirts of Brčko to the Muslim republic' },
                // A 50 % tie on the scan's fold; the S/26337 App. I map gives the town to the Muslim republic.
                'op:gradacac:gradacac_2': { side: 'RBiH', evidence: 'S/26337 App. I (research: Gradačac 75 % Muslim republic); scan tie on the fold' },
            },
        },
    },
};

const SIDES = {
    RBiH: { entity: 'FED', faction: 'RBiH' },
    HRHB: { entity: 'FED', faction: 'HRHB' },
    RS: { entity: 'RS', faction: 'RS' },
    special: { entity: 'special', faction: null },
};

/** QA check points (town centres, WGS84). */
const TOWNS = [
    ['Bihac', 44.815, 15.869], ['Banja Luka', 44.772, 17.191], ['Prijedor', 44.980, 16.713], ['Doboj', 44.733, 18.087],
    ['Brcko', 44.872, 18.810], ['Bijeljina', 44.757, 19.214], ['Tuzla', 44.538, 18.676], ['Zvornik', 44.386, 19.102],
    ['Zenica', 44.203, 17.907], ['Travnik', 44.226, 17.666], ['Jajce', 44.342, 17.270], ['Livno', 43.827, 17.008],
    ['Sarajevo', 43.856, 18.413], ['Gorazde', 43.667, 18.976], ['Mostar', 43.343, 17.808], ['Foca', 43.506, 18.778],
    ['Trebinje', 42.711, 18.344], ['Tesanj', 44.612, 17.986],
];

function parseArgs() {
    const [plan, image, ...rest] = process.argv.slice(2);
    if (!PLANS[plan] || !image) {
        console.error('usage: plan_map_digitize.cjs <vance_owen|owen_stoltenberg> <image> [--qa <dir>]');
        process.exit(2);
    }
    const qaIndex = rest.indexOf('--qa');
    return { plan, image, qa: qaIndex >= 0 ? rest[qaIndex + 1] : null };
}

/** Settlements as projected rings. */
function loadSettlements() {
    const fc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/derived/operational/operational_settlements.geojson'), 'utf8'));
    const cells = [];
    for (const f of fc.features) {
        const id = f.properties && f.properties.osid;
        const g = f.geometry;
        if (typeof id !== 'string' || !g) continue;
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
        const rings = [];
        for (const p of polys) for (const r of p) if (r.length > 2) rings.push(r.map(([lon, lat]) => [lon * K, -lat]));
        if (rings.length) cells.push({ id, rings });
    }
    cells.sort((a, b) => cmp(a.id, b.id));
    return cells;
}

function bbox(points) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of points) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return { x0, y0, x1, y1 };
}

/** Even-odd point in rings. */
function inside(rings, x, y) {
    let c = false;
    for (const r of rings) {
        for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
            const [xi, yi] = r[i], [xj, yj] = r[j];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
        }
    }
    return c;
}

function classify(palette, maxDistance, r, g, b) {
    let best = -1, bestD = Infinity;
    for (let k = 0; k < palette.length; k++) {
        const [pr, pg, pb] = palette[k].rgb;
        const d = Math.hypot(r - pr, g - pg, b - pb);
        if (d < bestD) { bestD = d; best = k; }
    }
    return bestD <= maxDistance ? best : -1;
}

async function main() {
    const { plan, image, qa } = parseArgs();
    const cfg = PLANS[plan];
    const imageBytes = fs.readFileSync(image);
    const sha256 = crypto.createHash('sha256').update(imageBytes).digest('hex');
    const { data, info } = await sharp(imageBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    const cls = new Int8Array(W * H);
    for (let i = 0, p = 0; i < W * H; i++, p += 3) cls[i] = classify(cfg.palette, cfg.maxDistance, data[p], data[p + 1], data[p + 2]);
    for (const [fx0, fy0, fx1, fy1] of cfg.ignore || []) {
        for (let v = Math.floor(fy0 * H); v < Math.min(H, Math.ceil(fy1 * H)); v++) {
            for (let u = Math.floor(fx0 * W); u < Math.min(W, Math.ceil(fx1 * W)); u++) cls[v * W + u] = -1;
        }
    }

    // Our silhouette, rasterised in the projected frame.
    const cells = loadSettlements();
    const all = cells.flatMap(c => c.rings.flat());
    const land = bbox(all);
    const RW = 1400;
    const scale = RW / (land.x1 - land.x0);
    const RH = Math.ceil((land.y1 - land.y0) * scale);
    const d = cells.flatMap(c => c.rings.map(r => 'M' + r.map(([x, y]) => `${((x - land.x0) * scale).toFixed(2)} ${((y - land.y0) * scale).toFixed(2)}`).join('L') + 'Z')).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RW}" height="${RH}"><path d="${d}" fill="#000" stroke="#000" stroke-width="1"/></svg>`;
    const sil = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const landMask = new Uint8Array(RW * RH);
    let landPixels = 0;
    for (let i = 0; i < RW * RH; i++) if (sil.data[i * 4 + 3] > 127) { landMask[i] = 1; landPixels++; }

    // Image land: every plan-coloured pixel (stride 2 for the fit).
    const maskPts = [];
    for (let v = 0; v < H; v += 2) for (let u = 0; u < W; u += 2) if (cls[v * W + u] >= 0) maskPts.push(u, v);
    const maskCount = maskPts.length / 2;
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (let i = 0; i < maskPts.length; i += 2) { const u = maskPts[i], v = maskPts[i + 1]; if (u < u0) u0 = u; if (v < v0) v0 = v; if (u > u1) u1 = u; if (v > v1) v1 = v; }

    // Affine projected → image about the country's centre (so shear and rotation do not drag
    // the translation): u = a (x − xc) + b (y − yc) + c ; v = dd (x − xc) + e (y − yc) + f.
    const xc = (land.x0 + land.x1) / 2, yc = (land.y0 + land.y1) / 2;
    const a0 = (u1 - u0) / (land.x1 - land.x0), e0 = (v1 - v0) / (land.y1 - land.y0);
    let p = [a0, 0, (u0 + u1) / 2, 0, e0, (v0 + v1) / 2];
    function iou(q) {
        const [a, b, c, dd, e, f] = q;
        const det = a * e - b * dd;
        if (Math.abs(det) < 1e-9) return 0;
        let inter = 0;
        for (let i = 0; i < maskPts.length; i += 2) {
            const u = maskPts[i] - c, v = maskPts[i + 1] - f;
            const x = (e * u - b * v) / det + xc, y = (-dd * u + a * v) / det + yc;
            const rx = Math.floor((x - land.x0) * scale), ry = Math.floor((y - land.y0) * scale);
            if (rx >= 0 && ry >= 0 && rx < RW && ry < RH && landMask[ry * RW + rx]) inter++;
        }
        const ours = landPixels / (scale * scale) * Math.abs(det) / 4; // in stride-2 sample units
        return inter / (maskCount + ours - inter);
    }
    let best = iou(p);
    const start = best;
    // Coordinate descent with pattern moves: each parameter keeps stepping while it improves;
    // steps halve only after a full sweep finds nothing. Starts wide (8 % scale, 40 px).
    let steps = [a0 * 0.08, e0 * 0.08, 40, a0 * 0.08, e0 * 0.08, 40];
    let evals = 0;
    while (steps[2] >= 0.05 && evals < 20000) {
        let improved = false;
        for (let k = 0; k < 6; k++) {
            for (const dir of [1, -1]) {
                for (;;) {
                    const q = p.slice(); q[k] += dir * steps[k];
                    const s = iou(q); evals++;
                    if (s > best + 1e-7) { best = s; p = q; improved = true; } else break;
                }
            }
        }
        if (!improved) steps = steps.map(s => s / 2);
    }
    console.log(`fit: IoU ${start.toFixed(4)} -> ${best.toFixed(4)} in ${evals} evaluations`);
    const [a, b, c, dd, e, f] = p;
    const toImage = (x, y) => [a * (x - xc) + b * (y - yc) + c, dd * (x - xc) + e * (y - yc) + f];

    // Sample every simulated settlement (osid_areas: the 712 the engine plays, not the 744 drawn).
    const areas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/derived/operational/osid_areas.json'), 'utf8')).areas;
    const result = {};
    for (const cell of cells) {
        if (!(cell.id in areas)) continue;
        const bb = bbox(cell.rings.flat());
        let pts = [];
        for (let spacing = 0.01; spacing >= 0.0012 && pts.length < 12; spacing /= 2) {
            pts = [];
            for (let y = bb.y0 + spacing / 2; y < bb.y1; y += spacing) for (let x = bb.x0 + spacing / 2; x < bb.x1; x += spacing) if (inside(cell.rings, x, y)) pts.push([x, y]);
        }
        const votes = new Array(cfg.palette.length).fill(0);
        let classified = 0;
        for (const [x, y] of pts) {
            const [u, v] = toImage(x, y);
            const ui = Math.round(u), vi = Math.round(v);
            if (ui < 0 || vi < 0 || ui >= W || vi >= H) continue;
            const k = cls[vi * W + ui];
            if (k >= 0) { votes[k]++; classified++; }
        }
        const mun = cell.id.split(':')[1];
        const cellOverride = cfg.overrides && cfg.overrides.cells && cfg.overrides.cells[cell.id];
        const override = cellOverride ? cellOverride.side : cfg.overrides && cfg.overrides.municipalities && cfg.overrides.municipalities[mun];
        let k = votes.indexOf(Math.max(...votes));
        const share = classified ? votes[k] / classified : 0;
        let confidence = classified === 0 ? 'unresolved' : share >= 0.9 ? 'verified' : 'approximate';
        let rule = classified ? `PLAN-MAP ${(share * 100).toFixed(1)}% ${cfg.palette[k].name} (${classified}/${pts.length} samples classified)` : `PLAN-MAP no classified samples (${pts.length})`;
        let evidence = `${cfg.title}; ${cfg.url}; sha256 ${sha256}`;
        if (override) {
            const side = SIDES[override];
            k = cfg.palette.findIndex(entry => entry.entity === side.entity && entry.faction === side.faction);
            confidence = 'verified';
            rule = `OVERRIDE ${override}; map read ${rule}`;
            evidence = `${cellOverride ? cellOverride.evidence : cfg.overrides.evidence}; ${evidence}`;
        }
        const entry = cfg.palette[k];
        result[cell.id] = {
            entity: confidence === 'unresolved' ? null : entry.entity,
            faction: confidence === 'unresolved' ? null : entry.faction,
            confidence,
            rule,
            evidence,
        };
    }

    // A settlement the map never shows in colour (under a town marker, a label or the capital
    // symbol) takes the side of its neighbours, weighted by shared border, and reads approximate.
    const graph = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/derived/operational/operational_contact_graph.json'), 'utf8'));
    const neighbours = new Map();
    for (const edge of graph.edges) {
        if (!(edge.min_dist === 0 || edge.shared_segments > 0)) continue;
        const w = Math.max(1, edge.shared_segments || 0);
        for (const [x, y] of [[edge.a, edge.b], [edge.b, edge.a]]) {
            if (!neighbours.has(x)) neighbours.set(x, []);
            neighbours.get(x).push([y, w]);
        }
    }
    for (let pass = 0; pass < 8; pass++) {
        let changed = false;
        for (const id of Object.keys(result).sort(cmp)) {
            if (result[id].confidence !== 'unresolved') continue;
            const tally = new Map();
            for (const [n, w] of (neighbours.get(id) || []).slice().sort((x, y) => cmp(x[0], y[0]))) {
                const row = result[n];
                if (!row || row.confidence === 'unresolved' || row.rule.startsWith('NEIGHBOURS')) continue;
                const key = `${row.entity}|${row.faction}`;
                tally.set(key, (tally.get(key) || 0) + w);
            }
            if (!tally.size) continue;
            const [key, weight] = [...tally.entries()].sort((x, y) => (y[1] - x[1]) || cmp(x[0], y[0]))[0];
            const total = [...tally.values()].reduce((s, v) => s + v, 0);
            const [entity, faction] = key.split('|');
            result[id] = {
                entity,
                faction: faction === 'null' ? null : faction,
                confidence: 'approximate',
                rule: `NEIGHBOURS ${(weight / total * 100).toFixed(0)}% of shared border; ${result[id].rule}`,
                evidence: result[id].evidence,
            };
            changed = true;
        }
        if (!changed) break;
    }
    const counts = { verified: 0, approximate: 0, unresolved: 0 };
    for (const id of Object.keys(result)) counts[result[id].confidence]++;

    const out = {
        schema: 'awwv.peace_plan_cell_assignments.v1',
        plan,
        note: 'Read from the plan\'s own map by tools/peace/plan_map_digitize.cjs: affine fit of our settlement frame onto the image, then the area majority of plan colours inside each settlement. The reference image is not committed; its URL and SHA-256 are recorded.',
        generated: {
            tool: 'tools/peace/plan_map_digitize.cjs',
            image: { url: cfg.url, sha256, width: W, height: H },
            fit: { affine: p.map(v => Number(v.toFixed(6))), centre: [Number(xc.toFixed(6)), Number(yc.toFixed(6))], iou: Number(best.toFixed(4)) },
            counts,
        },
        cells: result,
    };
    const outFile = path.join(ROOT, 'data/source/peace_plans', `${plan}_cell_assignments.json`);
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');
    console.log(`${plan}: fit IoU ${best.toFixed(4)}; ${counts.verified} verified, ${counts.approximate} approximate, ${counts.unresolved} unresolved -> ${path.relative(ROOT, outFile)}`);

    if (qa) {
        fs.mkdirSync(qa, { recursive: true });
        // 1. Our settlement outlines drawn onto the source image (registration check).
        const outline = cells.flatMap(cc => cc.rings.map(r => 'M' + r.map(([x, y]) => toImage(x, y).map(n => n.toFixed(1)).join(' ')).join('L') + 'Z')).join('');
        // Town check points at their true coordinates: compare with the towns printed on the map.
        const crosses = TOWNS.map(([name, lat, lon]) => {
            const [u, v] = toImage(lon * K, -lat);
            return `<path d="M${u - 7} ${v}H${u + 7}M${u} ${v - 7}V${v + 7}" stroke="#ff0000" stroke-width="2"/><text x="${u + 8}" y="${v - 6}" font-size="13" fill="#ff0000" font-family="sans-serif">${name}</text>`;
        }).join('');
        const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><path d="${outline}" fill="none" stroke="#ff00ff" stroke-width="0.7"/>${crosses}</svg>`;
        await sharp(imageBytes).removeAlpha().composite([{ input: Buffer.from(overlay) }]).png().toFile(path.join(qa, `${plan}-registration.png`));
        // 2. The digitized assignment, drawn in the same colours over the same frame.
        const paths = cells.map(cc => {
            const row = result[cc.id];
            const entry = !row || row.confidence === 'unresolved' ? null : cfg.palette.find(x => x.entity === row.entity && x.faction === row.faction);
            // Grey: drawn but not simulated; magenta: unresolved.
            const fill = entry ? `rgb(${entry.rgb.join(',')})` : row ? '#ff00ff' : '#bbbbbb';
            const dd2 = cc.rings.map(r => 'M' + r.map(([x, y]) => toImage(x, y).map(n => n.toFixed(1)).join(' ')).join('L') + 'Z').join('');
            return `<path d="${dd2}" fill="${fill}" stroke="#222" stroke-width="0.3"/>`;
        }).join('');
        await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#f8f8f8"/>${paths}</svg>`)).png().toFile(path.join(qa, `${plan}-digitized.png`));
    }
}

main().catch(error => { console.error(error); process.exit(1); });
