#!/usr/bin/env node
/**
 * Force Quality Trajectory Audit — Read-only metrics extractor.
 *
 * Read-only with respect to source/config. Writes nothing back.
 * Stable iteration order: Object.keys(...).sort(); brigades sorted by id; ops sorted by started_turn,id.
 *
 * Usage:
 *   node tools/diagnostics/force_quality_audit_metrics.cjs <run_dir> [<run_dir> ...]
 *
 * Per run dir, reads:
 *   - run_summary.json     (final_state_hash, weeks)
 *   - final_save.json      (state.military.formations, .faction_officer_maturity, factions[].capability_profile)
 *   - operation_aars.json  (per-op faction, corps, attempts, captures, brigades, axes, outcome)
 *
 * Emits a markdown report on stdout with sections for each requested metric.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FACTIONS = ['RBiH', 'RS', 'HRHB']; // canonical iteration order

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function readJson(p) {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
}

function safeMean(xs) {
    if (!xs.length) return null;
    let s = 0;
    for (const x of xs) s += x;
    return s / xs.length;
}

function pctile(sortedXs, q) {
    if (!sortedXs.length) return null;
    if (sortedXs.length === 1) return sortedXs[0];
    const idx = q * (sortedXs.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sortedXs[lo];
    const frac = idx - lo;
    return sortedXs[lo] * (1 - frac) + sortedXs[hi] * frac;
}

function fmtNum(x, digits = 3) {
    if (x === null || x === undefined) return 'n/a';
    if (typeof x !== 'number') return String(x);
    if (!Number.isFinite(x)) return 'n/a';
    return x.toFixed(digits);
}

function fmtInt(x) {
    if (x === null || x === undefined) return 'n/a';
    return String(Math.round(x));
}

// --- 1. Officer quality distribution ---------------------------------------

function collectOfficerQuality(state) {
    const formations = (state.military && state.military.formations) || {};
    const ids = Object.keys(formations).sort();
    const byFaction = {};
    const byCorps = {};
    for (const id of ids) {
        const f = formations[id];
        if (!f) continue;
        if (f.kind && f.kind !== 'brigade') continue; // brigades only
        if (typeof f.officer_quality !== 'number') continue;
        const fac = f.faction || 'unknown';
        if (!byFaction[fac]) byFaction[fac] = [];
        byFaction[fac].push(f.officer_quality);
        const corpsKey = `${fac}/${f.corps_id || 'unattached'}`;
        if (!byCorps[corpsKey]) byCorps[corpsKey] = [];
        byCorps[corpsKey].push(f.officer_quality);
    }
    const summarize = (xs) => {
        if (!xs.length) return null;
        const sorted = xs.slice().sort((a, b) => a - b);
        return {
            n: xs.length,
            mean: safeMean(xs),
            median: pctile(sorted, 0.5),
            p25: pctile(sorted, 0.25),
            p75: pctile(sorted, 0.75),
            min: sorted[0],
            max: sorted[sorted.length - 1]
        };
    };
    const factionSummary = {};
    for (const fac of FACTIONS) factionSummary[fac] = summarize(byFaction[fac] || []);
    const corpsSummary = {};
    for (const k of Object.keys(byCorps).sort()) corpsSummary[k] = summarize(byCorps[k]);
    return { factionSummary, corpsSummary };
}

// --- 2. Named-officer maturity ---------------------------------------------

function collectFactionMaturity(state) {
    return (state.military && state.military.faction_officer_maturity) || {};
}

function collectCapabilityProfiles(state) {
    const out = {};
    const facs = (state.factions || []).slice().sort((a, b) => strictCompare(a.id || '', b.id || ''));
    for (const f of facs) {
        if (!f || !f.capability_profile) continue;
        out[f.id] = f.capability_profile;
    }
    return out;
}

// Officer-level data: search formations for `commanders` or `officers` arrays if present
function collectNamedOfficerCompetence(state) {
    const formations = (state.military && state.military.formations) || {};
    const byFaction = {};
    const ids = Object.keys(formations).sort();
    for (const id of ids) {
        const f = formations[id];
        if (!f) continue;
        const fac = f.faction || 'unknown';
        // The officer system stores commanders on corps formations; check both common shapes
        const candidates = [];
        if (f.commander && typeof f.commander === 'object') candidates.push(f.commander);
        if (Array.isArray(f.officers)) for (const o of f.officers) candidates.push(o);
        if (Array.isArray(f.commanders)) for (const o of f.commanders) candidates.push(o);
        for (const o of candidates) {
            if (!o) continue;
            const c = (typeof o.competence === 'number') ? o.competence
                : (typeof o.skill === 'number') ? o.skill
                : (typeof o.quality === 'number') ? o.quality
                : null;
            if (c === null) continue;
            if (!byFaction[fac]) byFaction[fac] = [];
            byFaction[fac].push(c);
        }
    }
    const out = {};
    for (const fac of FACTIONS) {
        const xs = (byFaction[fac] || []).slice().sort((a, b) => a - b);
        if (!xs.length) { out[fac] = null; continue; }
        out[fac] = { n: xs.length, mean: safeMean(xs), median: pctile(xs, 0.5), min: xs[0], max: xs[xs.length - 1] };
    }
    return out;
}

// --- 3. Equipment totals/condition -----------------------------------------

function collectEquipment(state) {
    const formations = (state.military && state.military.formations) || {};
    const ids = Object.keys(formations).sort();
    const facTotals = {};
    const corpsTotals = {};
    const facCondition = {}; // {fac: {tank_op,tank_deg,tank_non,art_op,art_deg,art_non}}
    for (const fac of FACTIONS) {
        facTotals[fac] = { infantry: 0, tanks: 0, artillery: 0, aa_systems: 0, brigades: 0 };
        facCondition[fac] = {
            tank_op: 0, tank_deg: 0, tank_non: 0,
            art_op: 0, art_deg: 0, art_non: 0
        };
    }
    for (const id of ids) {
        const f = formations[id];
        if (!f) continue;
        if (f.kind && f.kind !== 'brigade') continue;
        const fac = f.faction || 'unknown';
        const comp = f.composition || {};
        if (!facTotals[fac]) facTotals[fac] = { infantry: 0, tanks: 0, artillery: 0, aa_systems: 0, brigades: 0 };
        facTotals[fac].brigades += 1;
        facTotals[fac].infantry += +comp.infantry || 0;
        facTotals[fac].tanks += +comp.tanks || 0;
        facTotals[fac].artillery += +comp.artillery || 0;
        facTotals[fac].aa_systems += +comp.aa_systems || 0;
        const corpsKey = `${fac}/${f.corps_id || 'unattached'}`;
        if (!corpsTotals[corpsKey]) corpsTotals[corpsKey] = { infantry: 0, tanks: 0, artillery: 0, aa_systems: 0, brigades: 0 };
        corpsTotals[corpsKey].brigades += 1;
        corpsTotals[corpsKey].infantry += +comp.infantry || 0;
        corpsTotals[corpsKey].tanks += +comp.tanks || 0;
        corpsTotals[corpsKey].artillery += +comp.artillery || 0;
        corpsTotals[corpsKey].aa_systems += +comp.aa_systems || 0;
        // Conditions are *fractions* per brigade. Weight by count to get tank/artillery operational count.
        if (comp.tank_condition && comp.tanks) {
            facCondition[fac].tank_op += (+comp.tank_condition.operational || 0) * comp.tanks;
            facCondition[fac].tank_deg += (+comp.tank_condition.degraded || 0) * comp.tanks;
            facCondition[fac].tank_non += (+comp.tank_condition.non_operational || 0) * comp.tanks;
        }
        if (comp.artillery_condition && comp.artillery) {
            facCondition[fac].art_op += (+comp.artillery_condition.operational || 0) * comp.artillery;
            facCondition[fac].art_deg += (+comp.artillery_condition.degraded || 0) * comp.artillery;
            facCondition[fac].art_non += (+comp.artillery_condition.non_operational || 0) * comp.artillery;
        }
    }
    const orderedCorps = {};
    for (const k of Object.keys(corpsTotals).sort()) orderedCorps[k] = corpsTotals[k];
    return { facTotals, corpsTotals: orderedCorps, facCondition };
}

// --- 4-7. Operation metrics from operation_aars.json -----------------------

function bucketLabel(turn) {
    if (turn < 40) return '0-40w';
    if (turn < 104) return '40-104w';
    if (turn < 156) return '104-156w';
    if (turn < 188) return '156-188w';
    return '188w+';
}

function collectOperationMetrics(opsArr) {
    if (!Array.isArray(opsArr)) opsArr = [];
    // Sort deterministically
    const ops = opsArr.slice().sort((a, b) => {
        const ta = a.started_turn ?? 0; const tb = b.started_turn ?? 0;
        if (ta !== tb) return ta - tb;
        return strictCompare(a.operation_id || '', b.operation_id || '');
    });

    const buckets = ['0-40w', '40-104w', '104-156w', '156-188w', '188w+'];
    const initBucket = () => {
        const o = {};
        for (const fac of FACTIONS) o[fac] = {
            ops: 0,
            attempts: 0,
            captures: 0,
            captures_logged: 0,
            success: 0,
            movement_only: 0, // attempts==0 ops
            staging_failures: 0, // outcome includes 'staging' or 'abandon'/'preparation_failed'
            multi_brigade_3plus: 0,
            multi_brigade_5plus: 0,
            multi_axis_2plus: 0,
            largest_brigade_count: 0,
            largest_axes: 0
        };
        return o;
    };
    const byBucket = {};
    for (const b of buckets) byBucket[b] = initBucket();

    for (const op of ops) {
        const fac = op.faction || 'unknown';
        if (!FACTIONS.includes(fac)) continue;
        const startedTurn = op.started_turn ?? 0;
        const bk = bucketLabel(startedTurn);
        const slot = byBucket[bk][fac];
        slot.ops += 1;
        const attempts = +op.total_attacks || 0;
        slot.attempts += attempts;
        const caps = (op.objectives_captured || []).length;
        const capsLogged = (op.objectives_logged_captured || []).length;
        slot.captures += caps;
        slot.captures_logged += capsLogged;
        if (op.outcome === 'success') slot.success += 1;
        if (attempts === 0) slot.movement_only += 1;
        const outc = String(op.outcome || '').toLowerCase();
        if (outc === 'preparation_failed' || outc === 'aborted' || outc === 'staging_failure' ||
            outc.includes('staging') || outc.includes('abandon')) {
            slot.staging_failures += 1;
        }
        const bcount = (op.participating_brigades || []).length;
        if (bcount >= 3) slot.multi_brigade_3plus += 1;
        if (bcount >= 5) slot.multi_brigade_5plus += 1;
        if (bcount > slot.largest_brigade_count) slot.largest_brigade_count = bcount;
        const axes = (op.axis_summaries || []).length;
        if (axes >= 2) slot.multi_axis_2plus += 1;
        if (axes > slot.largest_axes) slot.largest_axes = axes;
    }
    return byBucket;
}

// --- Markdown rendering ----------------------------------------------------

function renderRun(runDir, summary) {
    const out = [];
    const runId = path.basename(runDir);
    out.push(`### Run: ${runId}`);
    out.push(`- weeks: ${summary.weeks}`);
    out.push(`- final_state_hash: \`${summary.hash}\``);
    out.push('');

    // 1. Officer quality
    out.push('#### 1. Officer quality (brigade-level)');
    out.push('');
    out.push('| Faction | n | mean | median | p25 | p75 | min | max |');
    out.push('|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const fac of FACTIONS) {
        const s = summary.officer.factionSummary[fac];
        if (!s) { out.push(`| ${fac} | 0 | n/a | n/a | n/a | n/a | n/a | n/a |`); continue; }
        out.push(`| ${fac} | ${s.n} | ${fmtNum(s.mean)} | ${fmtNum(s.median)} | ${fmtNum(s.p25)} | ${fmtNum(s.p75)} | ${fmtNum(s.min)} | ${fmtNum(s.max)} |`);
    }
    out.push('');
    out.push('Per-corps officer quality (top 3 by brigade count per faction):');
    out.push('');
    out.push('| Corps | n | mean | median | p25 | p75 |');
    out.push('|---|---:|---:|---:|---:|---:|');
    // Group corps entries by faction prefix, take top-3 by n per faction
    const allCorps = Object.entries(summary.officer.corpsSummary)
        .filter(([k, v]) => v !== null);
    const byFac = {};
    for (const [k, v] of allCorps) {
        const fac = k.split('/')[0];
        if (!byFac[fac]) byFac[fac] = [];
        byFac[fac].push([k, v]);
    }
    for (const fac of FACTIONS) {
        const arr = (byFac[fac] || []).slice().sort((a, b) => {
            if (b[1].n !== a[1].n) return b[1].n - a[1].n;
            return strictCompare(a[0], b[0]);
        }).slice(0, 3);
        for (const [k, v] of arr) {
            out.push(`| ${k} | ${v.n} | ${fmtNum(v.mean)} | ${fmtNum(v.median)} | ${fmtNum(v.p25)} | ${fmtNum(v.p75)} |`);
        }
    }
    out.push('');

    // 2. Faction officer maturity & capability profile
    out.push('#### 2. Faction officer maturity & capability profile');
    out.push('');
    out.push('| Faction | faction_officer_maturity | named-officer mean (if persisted) |');
    out.push('|---|---:|---:|');
    for (const fac of FACTIONS) {
        const m = summary.maturity[fac];
        const named = summary.namedOfficer[fac];
        const namedMean = named ? `${fmtNum(named.mean)} (n=${named.n})` : 'n/a';
        out.push(`| ${fac} | ${m === undefined ? 'n/a' : fmtNum(m)} | ${namedMean} |`);
    }
    out.push('');
    out.push('Capability profile snapshot (year, training, organizational maturity, key doctrine):');
    out.push('');
    out.push('| Faction | year | training | org_mat | equipment | doctrine_summary |');
    out.push('|---|---:|---:|---:|---:|---|');
    for (const fac of FACTIONS) {
        const cp = summary.capability[fac];
        if (!cp) { out.push(`| ${fac} | n/a | n/a | n/a | n/a | n/a |`); continue; }
        const eq = cp.equipment_access ?? cp.equipment_operational ?? null;
        const docKeys = Object.keys(cp.doctrine_effectiveness || {}).sort();
        const docStr = docKeys.map(k => `${k}=${fmtNum(cp.doctrine_effectiveness[k])}`).join(', ');
        out.push(`| ${fac} | ${cp.year ?? 'n/a'} | ${fmtNum(cp.training_quality)} | ${fmtNum(cp.organizational_maturity)} | ${eq === null ? 'n/a' : fmtNum(eq)} | ${docStr} |`);
    }
    out.push('');

    // 3. Equipment totals/condition
    out.push('#### 3. Equipment totals & condition (faction)');
    out.push('');
    out.push('| Faction | brigades | infantry | tanks | artillery | AAA |');
    out.push('|---|---:|---:|---:|---:|---:|');
    for (const fac of FACTIONS) {
        const t = summary.equipment.facTotals[fac] || {};
        out.push(`| ${fac} | ${t.brigades || 0} | ${fmtInt(t.infantry)} | ${fmtInt(t.tanks)} | ${fmtInt(t.artillery)} | ${fmtInt(t.aa_systems)} |`);
    }
    out.push('');
    out.push('Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):');
    out.push('');
    out.push('| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |');
    out.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const fac of FACTIONS) {
        const c = summary.equipment.facCondition[fac] || {};
        out.push(`| ${fac} | ${fmtInt(c.tank_op)} | ${fmtInt(c.tank_deg)} | ${fmtInt(c.tank_non)} | ${fmtInt(c.art_op)} | ${fmtInt(c.art_deg)} | ${fmtInt(c.art_non)} |`);
    }
    out.push('');
    out.push('Per-corps equipment (top 3 by brigade count per faction):');
    out.push('');
    out.push('| Corps | brigades | infantry | tanks | artillery |');
    out.push('|---|---:|---:|---:|---:|');
    const corpsAll = Object.entries(summary.equipment.corpsTotals);
    const ebyFac = {};
    for (const [k, v] of corpsAll) {
        const fac = k.split('/')[0];
        if (!ebyFac[fac]) ebyFac[fac] = [];
        ebyFac[fac].push([k, v]);
    }
    for (const fac of FACTIONS) {
        const arr = (ebyFac[fac] || []).slice().sort((a, b) => {
            if (b[1].brigades !== a[1].brigades) return b[1].brigades - a[1].brigades;
            return strictCompare(a[0], b[0]);
        }).slice(0, 3);
        for (const [k, v] of arr) {
            out.push(`| ${k} | ${v.brigades} | ${fmtInt(v.infantry)} | ${fmtInt(v.tanks)} | ${fmtInt(v.artillery)} |`);
        }
    }
    out.push('');

    // 4-7. Operation metrics
    out.push('#### 4-7. Operations by faction × date window');
    out.push('');
    out.push('| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |');
    out.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const bk of ['0-40w', '40-104w', '104-156w', '156-188w', '188w+']) {
        for (const fac of FACTIONS) {
            const s = summary.ops[bk][fac];
            // skip empty rows beyond run window
            if (s.ops === 0 && summary.weeks <= bucketStartTurn(bk)) continue;
            out.push(`| ${bk} | ${fac} | ${s.ops} | ${s.attempts} | ${s.captures} | ${s.captures_logged} | ${s.success} | ${s.movement_only} | ${s.staging_failures} | ${s.multi_brigade_3plus} | ${s.multi_brigade_5plus} | ${s.multi_axis_2plus} | ${s.largest_brigade_count} | ${s.largest_axes} |`);
        }
    }
    out.push('');

    return out.join('\n');
}

function bucketStartTurn(bk) {
    if (bk === '0-40w') return 0;
    if (bk === '40-104w') return 40;
    if (bk === '104-156w') return 104;
    if (bk === '156-188w') return 156;
    if (bk === '188w+') return 188;
    return 0;
}

// --- Main ------------------------------------------------------------------

function processRun(runDir) {
    const summaryPath = path.join(runDir, 'run_summary.json');
    const savePath = path.join(runDir, 'final_save.json');
    const aarsPath = path.join(runDir, 'operation_aars.json');
    const summaryJson = readJson(summaryPath);
    const state = readJson(savePath);
    let aars;
    try { aars = readJson(aarsPath); } catch (_) { aars = []; }
    const result = {
        weeks: summaryJson.weeks,
        hash: summaryJson.final_state_hash,
        officer: collectOfficerQuality(state),
        maturity: collectFactionMaturity(state),
        capability: collectCapabilityProfiles(state),
        namedOfficer: collectNamedOfficerCompetence(state),
        equipment: collectEquipment(state),
        ops: collectOperationMetrics(aars)
    };
    return result;
}

function main() {
    const argv = process.argv.slice(2);
    if (!argv.length) {
        process.stderr.write('Usage: node force_quality_audit_metrics.cjs <run_dir> [<run_dir> ...]\n');
        process.exit(2);
    }
    const lines = [];
    lines.push('# Force-Quality Audit Metrics (read-only extraction)');
    lines.push('');
    for (const runDir of argv) {
        try {
            const summary = processRun(runDir);
            lines.push(renderRun(runDir, summary));
        } catch (e) {
            lines.push(`### Run: ${path.basename(runDir)}`);
            lines.push(`Error: ${e.message}`);
            lines.push('');
        }
    }
    process.stdout.write(lines.join('\n') + '\n');
}

main();
