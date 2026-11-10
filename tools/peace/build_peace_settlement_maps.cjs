#!/usr/bin/env node
/* eslint-env node */
/**
 * Build data/derived/peace/plan_settlement_shares.json from the historian research file
 * data/source/peace_plans/plan_maps_research.json (see
 * docs/40_reports/20261107_PEACE_PLANS_RESEARCH.md for sources and method).
 *
 * Output, per plan id and pre-war municipality id: the share of the municipality's
 * area each party receives under the plan, as percentages summing to 100, over the
 * keys RBiH | RS | HRHB | special. `special` is land under shared or international
 * administration (VOPP Sarajevo province 7 and the unnumbered corridor; Owen-Stoltenberg
 * UN Sarajevo district; Contact Group neutral zone; Dayton Brcko arbitration district).
 *
 * Normalisation rules (each recorded in the output `rules`):
 *  - a single assignment RBiH/RS/HRHB/special gives that key 100;
 *  - split parts map by prefix: "RBiH/..", "RS/..", "HRHB/..", "Federation/RBiH",
 *    "Federation/HRHB", "special/..", "corridor..", "NEUTRAL", "Brcko District";
 *  - an unlabelled Federation share ("FED") goes to the plan's own Federation faction for
 *    that municipality when it has one, else to Dayton's Federation layer for the same
 *    municipality, else RBiH;
 *  - Dayton "Federation/split" (Mostar) divides evenly between RBiH and HRHB.
 *
 * Deterministic: sorted keys, fixed rounding to 0.1. Run:
 *   node tools/peace/build_peace_settlement_maps.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'data/source/peace_plans/plan_maps_research.json');
const OUT = path.join(ROOT, 'data/derived/peace/plan_settlement_shares.json');
const PLANS = ['vance_owen', 'owen_stoltenberg', 'contact_group', 'dayton'];
const FACTIONS = ['RBiH', 'RS', 'HRHB'];

const research = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function federationFactionFor(plan, mun) {
    const own = research[plan][mun]?.assignment;
    if (own === 'RBiH' || own === 'HRHB') return own;
    const day = research.dayton[mun];
    const parts = day?.split_parts ?? {};
    if (day?.assignment === 'RBiH' || day?.assignment === 'HRHB') return day.assignment;
    if ((parts['Federation/HRHB'] ?? 0) > (parts['Federation/RBiH'] ?? 0)) return 'HRHB';
    return 'RBiH';
}

function keyFor(plan, mun, rawKey) {
    const k = String(rawKey);
    if (k === 'RBiH' || k.startsWith('RBiH/') || k === 'Federation/RBiH') return ['RBiH'];
    if (k === 'RS' || k.startsWith('RS/')) return ['RS'];
    if (k === 'HRHB' || k.startsWith('HRHB/') || k === 'Federation/HRHB') return ['HRHB'];
    if (k === 'special' || k.startsWith('special/') || k.startsWith('corridor') || k === 'NEUTRAL' || k === 'Brcko District') return ['special'];
    if (k === 'FED' || k === 'Federation') return [federationFactionFor(plan, mun)];
    if (k === 'Federation/split') return ['RBiH', 'HRHB'];
    throw new Error(`${plan}/${mun}: unmapped share key ${k}`);
}

function sharesFor(plan, mun, entry) {
    const out = { RBiH: 0, RS: 0, HRHB: 0, special: 0 };
    // Measured shares win over the majority label: map_share_pct (O-S, Contact Group) and
    // entity_area_share_pct (Dayton) carry minority parts even when assignment is a single
    // party. For splits, the faction-layered split parts are preferred where present.
    const raw = entry.assignment === 'split'
        ? (plan === 'owen_stoltenberg' ? entry.map_share_pct : null)
            ?? entry.split_parts_pct_of_area ?? entry.split_parts ?? entry.map_share_pct ?? entry.entity_area_share_pct
        : entry.map_share_pct ?? entry.entity_area_share_pct ?? null;
    if (raw) {
        const src = raw;
        for (const [k, v] of Object.entries(src).sort(([a], [b]) => cmp(a, b))) {
            const keys = keyFor(plan, mun, k);
            for (const key of keys) out[key] += Number(v) / keys.length;
        }
    } else if (entry.assignment === 'RBiH' || entry.assignment === 'RS' || entry.assignment === 'HRHB' || entry.assignment === 'special') {
        out[entry.assignment] = 100;
    } else {
        throw new Error(`${plan}/${mun}: unsupported assignment ${entry.assignment}`);
    }
    const total = out.RBiH + out.RS + out.HRHB + out.special;
    if (total <= 0) throw new Error(`${plan}/${mun}: empty shares`);
    const norm = {};
    for (const k of ['RBiH', 'RS', 'HRHB', 'special']) norm[k] = Math.round((out[k] / total) * 1000) / 10;
    return norm;
}

const plans = {};
for (const plan of PLANS) {
    const muns = {};
    for (const mun of Object.keys(research[plan]).sort(cmp)) {
        const entry = research[plan][mun];
        muns[mun] = { ...sharesFor(plan, mun, entry), confidence: entry.confidence ?? 'unknown' };
    }
    plans[plan] = muns;
}

const output = {
    schema_version: 1,
    source: 'data/source/peace_plans/plan_maps_research.json',
    research_report: 'docs/40_reports/20261107_PEACE_PLANS_RESEARCH.md',
    keys: [...FACTIONS, 'special'],
    rules: [
        'single assignment gives that key 100',
        'split parts map by prefix (RBiH/, RS/, HRHB/, Federation/RBiH, Federation/HRHB, special/, corridor, NEUTRAL, Brcko District)',
        'unlabelled FED share -> plan Federation faction for the municipality, else Dayton Federation layer, else RBiH',
        'Dayton Federation/split (Mostar) -> half RBiH, half HRHB',
        'special = shared or international administration; the engine leaves it with its wartime holder',
    ],
    plans,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${PLANS.map((p) => `${p}=${Object.keys(plans[p]).length}`).join(' ')}`);

// ── Per-cell opening assignments (DC plan stage 1) ──────────────────────────────
// data/source/peace_plans/dayton_cell_assignments.json holds the historian's audited
// cell rows for split municipalities, enclaves and corridors. The quota pass in
// peace_settlement.ts fixes these cells before filling the municipality shares, so a
// percentage no longer decides which cell of a split municipality crosses the line.
// Validation: every row names a real map cell in a municipality the plan researched;
// entity RS carries faction RS; entity FED carries RBiH, HRHB or null; entity special
// carries no faction; unresolved rows are dropped (they fall to the quota pass).
// Vance–Owen and Owen–Stoltenberg cell tables are read from each plan's own map
// (tools/peace/plan_map_digitize.cjs, owner 2026-11-09): every simulated settlement is listed,
// so the quota pass no longer places those plans' lines inside municipalities.
const CELL_SOURCES = ['dayton', 'vance_owen', 'owen_stoltenberg', 'contact_group']
    .map((plan) => path.join(ROOT, `data/source/peace_plans/${plan}_cell_assignments.json`));
const CELLS_OUT = path.join(ROOT, 'data/derived/peace/plan_cell_assignments.json');
const AREAS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/derived/operational/osid_areas.json'), 'utf8')).areas;
const CONFIDENCE = ['verified', 'approximate', 'unresolved'];

function buildCellTable() {
    const cellPlans = {};
    const summary = [];
    for (const CELLS_SRC of CELL_SOURCES) {
        if (!fs.existsSync(CELLS_SRC)) continue;
        const src = JSON.parse(fs.readFileSync(CELLS_SRC, 'utf8'));
        const plan = src.plan ?? 'dayton';
        if (!PLANS.includes(plan)) throw new Error(`cells: unknown plan ${plan}`);
        const rows = {};
        const counts = { verified: 0, approximate: 0, unresolved: 0 };
        for (const osid of Object.keys(src.cells ?? {}).sort(cmp)) {
            const row = src.cells[osid];
            if (!(osid in AREAS)) throw new Error(`cells/${osid}: not a map cell`);
            if (!CONFIDENCE.includes(row.confidence)) throw new Error(`cells/${osid}: confidence ${row.confidence}`);
            counts[row.confidence] += 1;
            if (row.confidence === 'unresolved') continue;
            const mun = osid.split(':')[1];
            if (!research[plan]?.[mun]) throw new Error(`cells/${osid}: municipality ${mun} has no ${plan} research entry`);
            let faction = null;
            let special = false;
            if (row.entity === 'RS') {
                if (row.faction && row.faction !== 'RS') throw new Error(`cells/${osid}: RS cell with faction ${row.faction}`);
                faction = 'RS';
            } else if (row.entity === 'FED') {
                if (row.faction && row.faction !== 'RBiH' && row.faction !== 'HRHB') throw new Error(`cells/${osid}: FED cell with faction ${row.faction}`);
                faction = row.faction ?? null;
            } else if (row.entity === 'special') {
                if (row.faction) throw new Error(`cells/${osid}: special cell with faction ${row.faction}`);
                special = true;
            } else {
                throw new Error(`cells/${osid}: entity ${row.entity}`);
            }
            rows[osid] = { faction, special, confidence: row.confidence };
        }
        cellPlans[plan] = rows;
        summary.push(`${plan}: ${Object.keys(rows).length} fixed (${counts.verified} verified, ${counts.approximate} approximate; ${counts.unresolved} unresolved dropped)`);
    }
    const out = {
        schema_version: 1,
        source: CELL_SOURCES.filter((f) => fs.existsSync(f)).map((f) => path.relative(ROOT, f).split(path.sep).join('/')),
        rules: [
            'a listed cell is fixed to its side before the municipality quota pass and charged against that side\'s quota',
            'faction null on a Federation cell -> the wartime Federation holder, else the Federation party with the larger remaining quota',
            'special = shared or international administration; listed as special and left with its wartime holder',
            'unresolved rows are not written; those cells fall to the quota pass',
        ],
        plans: cellPlans,
    };
    fs.writeFileSync(CELLS_OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`wrote ${path.relative(ROOT, CELLS_OUT)}: ${summary.join(' ') || 'no cell source'}`);
}
buildCellTable();
