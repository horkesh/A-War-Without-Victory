#!/usr/bin/env node
'use strict';

const fs = require('fs');

const FACTIONS = ['HRHB', 'RBiH', 'RS'];

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findKeyPaths(value, targetKey, prefix = '$', out = []) {
    if (!value || typeof value !== 'object') return out;
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i += 1) findKeyPaths(value[i], targetKey, `${prefix}[${i}]`, out);
        return out;
    }
    for (const key of Object.keys(value).sort(strictCompare)) {
        const childPath = `${prefix}.${key}`;
        if (key === targetKey) out.push({ path: childPath, value: value[key] });
        findKeyPaths(value[key], targetKey, childPath, out);
    }
    return out;
}

function status(active, latentEvidence, activeEvidence) {
    return {
        endgame_status: active ? 'ACTIVE' : 'LATENT',
        evidence_value: active ? activeEvidence : latentEvidence,
    };
}

function checkPatronPressureNaN(save) {
    const hits = findKeyPaths(save, 'patron_pressure');
    const nonFinite = hits.filter((hit) => {
        if (typeof hit.value === 'number') return !Number.isFinite(hit.value);
        if (hit.value && typeof hit.value === 'object') {
            return Object.values(hit.value).some((v) => typeof v === 'number' && !Number.isFinite(v));
        }
        return false;
    });
    return {
        id: 'P0_1',
        description: 'NATO patron_pressure NaN propagation through getYearForTurn',
        evidence_field: hits.length === 0 ? '$..patron_pressure' : nonFinite.map((h) => h.path).join(', '),
        ...status(
            nonFinite.length > 0,
            hits.length === 0 ? 'patron_pressure absent from serialized state' : `${hits.length} patron_pressure path(s), all finite/non-numeric`,
            nonFinite.map((h) => `${h.path}=${String(h.value)}`).join('; ')
        ),
    };
}

function checkCorpsCommand(save) {
    const formations = save.military && save.military.formations ? save.military.formations : {};
    const command = save.military && save.military.corps_command ? save.military.corps_command : {};
    const corpsIds = Object.keys(formations)
        .filter((id) => {
            const f = formations[id];
            return f && (f.kind === 'corps' || Object.prototype.hasOwnProperty.call(command, id));
        })
        .sort(strictCompare);
    const missing = corpsIds.filter((id) => command[id] == null);
    return {
        id: 'P0_2',
        description: 'Multi-brigade attacks lose pressure when corps_command is undefined',
        evidence_field: '$.military.corps_command',
        ...status(
            missing.length > 0 || corpsIds.length === 0,
            `${Object.keys(command).length} corps_command rows for ${corpsIds.length} corps formations`,
            corpsIds.length === 0 ? 'no corps formations found' : `missing corps_command: ${missing.join(', ')}`
        ),
    };
}

function checkPoliticalDefined(save) {
    const defined = save.political != null && typeof save.political === 'object';
    return {
        id: 'P0_3',
        description: 'Settlement flips discarded when state.political is undefined',
        evidence_field: '$.political',
        ...status(
            !defined,
            `defined with ${Object.keys(save.political || {}).length} top-level keys`,
            'state.political missing or non-object'
        ),
    };
}

function checkFormationFactionCast(save) {
    const formations = save.military && save.military.formations ? save.military.formations : {};
    const missing = Object.keys(formations)
        .sort(strictCompare)
        .filter((id) => !formations[id] || formations[id].faction == null);
    return {
        id: 'P0_4',
        description: 'Casualty-faction cast from formation.faction',
        evidence_field: '$.military.formations[*].faction',
        ...status(
            missing.length > 0,
            `${Object.keys(formations).length} formations have non-null faction`,
            `missing faction formations: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ` ... +${missing.length - 20}` : ''}`
        ),
    };
}

function buildReport(finalSavePath) {
    const save = readJson(finalSavePath);
    const rows = [
        checkPatronPressureNaN(save),
        checkCorpsCommand(save),
        checkPoliticalDefined(save),
        checkFormationFactionCast(save),
    ];
    return {
        final_save: finalSavePath,
        turn: save.meta && save.meta.turn,
        rows,
        active_count: rows.filter((r) => r.endgame_status === 'ACTIVE').length,
    };
}

function buildMarkdown(report) {
    const lines = [];
    lines.push('# Four-P0 Endgame Latency Recheck');
    lines.push('');
    lines.push(`Final save: \`${report.final_save}\``);
    lines.push(`Turn: ${report.turn}`);
    lines.push(`Active count: ${report.active_count}`);
    lines.push('');
    lines.push('| P0 | description | endgame_status | evidence_field | evidence_value |');
    lines.push('|---|---|---|---|---|');
    for (const row of report.rows) {
        lines.push(`| ${row.id} | ${row.description} | ${row.endgame_status} | \`${row.evidence_field}\` | ${String(row.evidence_value).replace(/\|/g, '\\|')} |`);
    }
    return lines.join('\n');
}

function main() {
    const args = process.argv.slice(2);
    const finalSavePath = args.find((arg) => !arg.startsWith('--'));
    if (!finalSavePath) {
        process.stderr.write('Usage: p0_latent_recheck.cjs <final_save.json> [--json]\n');
        process.exit(1);
    }
    const report = buildReport(finalSavePath);
    if (args.includes('--json')) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
        process.stdout.write(`${buildMarkdown(report)}\n`);
    }
    if (report.active_count > 0) process.exitCode = 2;
}

if (require.main === module) main();

module.exports = {
    buildReport,
    buildMarkdown,
    findKeyPaths,
};
