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

function valueAtPathForFaction(save, faction) {
    const politicalPressure = save.political && save.political.patron_pressure;
    if (politicalPressure && Object.prototype.hasOwnProperty.call(politicalPressure, faction)) {
        return { path: `$.political.patron_pressure.${faction}`, value: politicalPressure[faction] };
    }
    const rootPressure = save.patron_pressure;
    if (rootPressure && Object.prototype.hasOwnProperty.call(rootPressure, faction)) {
        return { path: `$.patron_pressure.${faction}`, value: rootPressure[faction] };
    }
    return { path: '$.political.patron_pressure', value: undefined };
}

function bucket(value) {
    if (value === undefined) return 'absent';
    const n = Number(value);
    if (Number.isFinite(n) && n === 0) return 'zero';
    return 'present';
}

function patronSystemEvidence(save) {
    const relationships = save.military && save.military.negotiation && save.military.negotiation.patron_relationships
        ? save.military.negotiation.patron_relationships
        : {};
    const rows = FACTIONS.slice().sort(strictCompare).map((faction) => {
        const rel = relationships[faction] || {};
        return {
            faction,
            override_authority: typeof rel.override_authority === 'number' ? rel.override_authority : null,
            support_level: typeof rel.support_level === 'number' ? rel.support_level : null,
            sanctions_active: rel.sanctions_active === true,
        };
    });
    return {
        path: '$.military.negotiation.patron_relationships[*].override_authority',
        any_non_zero: rows.some((r) => Number.isFinite(r.override_authority) && r.override_authority !== 0),
        rows,
    };
}

function buildReport(finalSavePath) {
    const save = readJson(finalSavePath);
    const rows = FACTIONS.slice().sort(strictCompare).map((faction) => {
        const found = valueAtPathForFaction(save, faction);
        return {
            faction,
            bucket: bucket(found.value),
            value: found.value === undefined ? 'n/a' : found.value,
            evidence_path: found.path,
        };
    });
    const exactKeyHits = findKeyPaths(save, 'patron_pressure');
    const system = patronSystemEvidence(save);
    const conclusion = exactKeyHits.length > 0
        ? 'patron_pressure field persisted in final save'
        : system.any_non_zero
            ? 'patron pressure engine appears to run via persisted patron_relationships.override_authority, but no patron_pressure field is serialized'
            : 'no persisted patron_pressure field and no non-zero patron_relationships.override_authority evidence';
    return {
        final_save: finalSavePath,
        turn: save.meta && save.meta.turn,
        rows,
        exact_key_hits: exactKeyHits.map((h) => h.path).sort(strictCompare),
        system,
        conclusion,
    };
}

function buildMarkdown(report) {
    const lines = [];
    lines.push('# Patron Pressure Field-Presence Probe');
    lines.push('');
    lines.push(`Final save: \`${report.final_save}\``);
    lines.push(`Turn: ${report.turn}`);
    lines.push(`Conclusion: **${report.conclusion}**`);
    lines.push('');
    lines.push('## Field Buckets');
    lines.push('');
    lines.push('| faction | bucket | value | evidence_path |');
    lines.push('|---|---|---|---|');
    for (const row of report.rows) {
        lines.push(`| ${row.faction} | ${row.bucket} | ${row.value} | \`${row.evidence_path}\` |`);
    }
    lines.push('');
    lines.push('## System Evidence');
    lines.push('');
    lines.push(`Exact \`patron_pressure\` key paths: ${report.exact_key_hits.length === 0 ? 'none' : report.exact_key_hits.map((p) => `\`${p}\``).join(', ')}`);
    lines.push('');
    lines.push('| faction | override_authority | support_level | sanctions_active |');
    lines.push('|---|---:|---:|---|');
    for (const row of report.system.rows) {
        lines.push(`| ${row.faction} | ${row.override_authority === null ? 'n/a' : row.override_authority} | ${row.support_level === null ? 'n/a' : row.support_level} | ${row.sanctions_active} |`);
    }
    return lines.join('\n');
}

function main() {
    const args = process.argv.slice(2);
    const finalSavePath = args.find((arg) => !arg.startsWith('--'));
    if (!finalSavePath) {
        process.stderr.write('Usage: patron_pressure_probe.cjs <final_save.json> [--json]\n');
        process.exit(1);
    }
    const report = buildReport(finalSavePath);
    if (args.includes('--json')) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
        process.stdout.write(`${buildMarkdown(report)}\n`);
    }
}

if (require.main === module) main();

module.exports = {
    buildReport,
    buildMarkdown,
    findKeyPaths,
    patronSystemEvidence,
};
