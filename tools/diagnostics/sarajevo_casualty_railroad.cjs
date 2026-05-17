#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const CITY_MUNICIPALITIES = {
    Sarajevo: [
        'centar_sarajevo',
        'ilidza',
        'novi_grad_sarajevo',
        'novo_sarajevo',
        'stari_grad_sarajevo',
        'vogosca',
    ],
    Mostar: ['mostar'],
    BanjaLuka: ['banja_luka'],
};

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadOperationalSettlements() {
    const geojsonPath = path.join(__dirname, '..', '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
    const geojson = readJson(geojsonPath);
    const byOsid = new Map();
    for (const feature of geojson.features || []) {
        const p = feature.properties || {};
        if (!p.osid) continue;
        byOsid.set(p.osid, {
            osid: p.osid,
            municipality: p.mun1990_id || osidMunicipality(p.osid),
            municipality_name: p.mun1990_name || p.mun1990_id || osidMunicipality(p.osid),
        });
    }
    return byOsid;
}

function osidMunicipality(osid) {
    const parts = String(osid || '').split(':');
    return parts.length >= 3 ? parts[1] : 'unknown';
}

function cityForMunicipality(municipality) {
    for (const city of Object.keys(CITY_MUNICIPALITIES).sort(strictCompare)) {
        if (CITY_MUNICIPALITIES[city].includes(municipality)) return city;
    }
    return null;
}

function collectRows(save, osidMeta) {
    const rowsByOsid = new Map();
    for (const city of Object.keys(CITY_MUNICIPALITIES).sort(strictCompare)) {
        for (const municipality of CITY_MUNICIPALITIES[city].slice().sort(strictCompare)) {
            for (const meta of Array.from(osidMeta.values()).sort((a, b) => strictCompare(a.osid, b.osid))) {
                if (meta.municipality !== municipality) continue;
                rowsByOsid.set(meta.osid, {
                    osid: meta.osid,
                    city,
                    municipality,
                    attacker_casualties: 0,
                    defender_casualties: 0,
                    n_battles: 0,
                });
            }
        }
    }

    const summaries = Array.isArray(save.turn_summaries) ? save.turn_summaries : [];
    for (const summary of summaries) {
        const battles = Array.isArray(summary.battles) ? summary.battles.slice() : [];
        battles.sort((a, b) => {
            const c = Number(a.turn ?? summary.turn ?? 0) - Number(b.turn ?? summary.turn ?? 0);
            if (c !== 0) return c;
            const ao = strictCompare(a.osid || '', b.osid || '');
            if (ao !== 0) return ao;
            const aa = strictCompare(a.primary_attacker_id || '', b.primary_attacker_id || '');
            if (aa !== 0) return aa;
            return strictCompare(a.primary_defender_id || '', b.primary_defender_id || '');
        });
        for (const battle of battles) {
            const osid = battle.osid || battle.target_osid || battle.location_osid;
            const row = rowsByOsid.get(osid);
            if (!row) continue;
            row.attacker_casualties += finiteNonNegative(battle.attacker_casualties);
            row.defender_casualties += finiteNonNegative(battle.defender_casualties);
            row.n_battles += 1;
        }
    }

    return Array.from(rowsByOsid.values()).sort((a, b) => {
        const cm = strictCompare(a.municipality, b.municipality);
        if (cm !== 0) return cm;
        return strictCompare(a.osid, b.osid);
    });
}

function finiteNonNegative(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function ratio(attacker, defender) {
    if (defender === 0) return attacker > 0 ? Infinity : 0;
    return attacker / defender;
}

function summarizeByCity(rows) {
    const summaries = {};
    for (const city of Object.keys(CITY_MUNICIPALITIES).sort(strictCompare)) {
        summaries[city] = {
            city,
            attacker_casualties: 0,
            defender_casualties: 0,
            n_battles: 0,
            osids_with_battles: 0,
            ratio: 0,
        };
    }
    for (const row of rows) {
        const s = summaries[row.city];
        s.attacker_casualties += row.attacker_casualties;
        s.defender_casualties += row.defender_casualties;
        s.n_battles += row.n_battles;
        if (row.n_battles > 0) s.osids_with_battles += 1;
    }
    for (const city of Object.keys(summaries).sort(strictCompare)) {
        summaries[city].ratio = ratio(summaries[city].attacker_casualties, summaries[city].defender_casualties);
    }
    return Object.values(summaries).sort((a, b) => strictCompare(a.city, b.city));
}

function verdict(cityRows) {
    const sarajevo = cityRows.find((r) => r.city === 'Sarajevo');
    const others = cityRows.filter((r) => r.city !== 'Sarajevo' && r.n_battles > 0);
    if (!sarajevo || others.length === 0) return 'INCONCLUSIVE';
    if (sarajevo.n_battles === 0) return 'INCONCLUSIVE_NO_BATTLES';
    for (const other of others) {
        const high = sarajevo.ratio > other.ratio * 2;
        const low = other.ratio > sarajevo.ratio * 2;
        const delta = Math.abs(sarajevo.ratio - other.ratio) / Math.max(other.ratio, 0.000001);
        if (high || low || delta > 0.2) return 'SIGNAL_SARAJEVO_OUTLIER';
    }
    return 'PASS_NO_RAILROAD_SIGNAL';
}

function fmtRatio(value) {
    if (value === Infinity) return 'inf';
    return value.toFixed(3);
}

function buildMarkdown(report) {
    const lines = [];
    lines.push(`# Sarajevo Casualty Railroad Probe`);
    lines.push('');
    lines.push(`Final save: \`${report.final_save}\``);
    lines.push(`Turn: ${report.turn}`);
    lines.push(`Decision: **${report.verdict}**`);
    lines.push('');
    lines.push('## City Summary');
    lines.push('');
    lines.push('| city | attacker_casualties | defender_casualties | ratio_att_def | n_battles | osids_with_battles |');
    lines.push('|---|---:|---:|---:|---:|---:|');
    for (const row of report.city_summary) {
        lines.push(`| ${row.city} | ${row.attacker_casualties} | ${row.defender_casualties} | ${fmtRatio(row.ratio)} | ${row.n_battles} | ${row.osids_with_battles} |`);
    }
    lines.push('');
    lines.push('## OSID Table');
    lines.push('');
    lines.push('| osid | municipality | attacker_casualties | defender_casualties | ratio_att_def | n_battles |');
    lines.push('|---|---|---:|---:|---:|---:|');
    for (const row of report.rows) {
        lines.push(`| ${row.osid} | ${row.municipality} | ${row.attacker_casualties} | ${row.defender_casualties} | ${fmtRatio(ratio(row.attacker_casualties, row.defender_casualties))} | ${row.n_battles} |`);
    }
    return lines.join('\n');
}

function buildReport(finalSavePath) {
    const save = readJson(finalSavePath);
    const osidMeta = loadOperationalSettlements();
    const rows = collectRows(save, osidMeta);
    const citySummary = summarizeByCity(rows);
    return {
        final_save: finalSavePath,
        turn: save.meta && save.meta.turn,
        verdict: verdict(citySummary),
        city_summary: citySummary,
        rows,
    };
}

function main() {
    const args = process.argv.slice(2);
    const finalSavePath = args.find((arg) => !arg.startsWith('--'));
    if (!finalSavePath) {
        process.stderr.write('Usage: sarajevo_casualty_railroad.cjs <final_save.json> [--json]\n');
        process.exit(1);
    }
    const report = buildReport(finalSavePath);
    if (args.includes('--json')) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
        process.stdout.write(`${buildMarkdown(report)}\n`);
    }
    if (report.verdict === 'SIGNAL_SARAJEVO_OUTLIER') process.exitCode = 2;
}

if (require.main === module) main();

module.exports = {
    buildReport,
    buildMarkdown,
    collectRows,
    summarizeByCity,
    CITY_MUNICIPALITIES,
};
