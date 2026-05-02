#!/usr/bin/env node
/**
 * Sensitive-history enclave status diagnostic.
 *
 * Read-only verifier for the Srebrenica/Zepa late-war P0 handoff. It answers:
 *   - Who controls the canonical Srebrenica and Zepa enclave OSIDs?
 *   - Did the historical rupture consequence fire anywhere in saved state?
 *   - What happened to Krivaja-95 / Stupcanica-95 / Cerska-Kamenica AARs?
 *   - Are key Drina brigades present, depleted, inactive, or misplaced?
 *
 * Usage:
 *   node tools/diagnostics/sensitive_history_status.cjs [--json] <run_dir> [<run_dir> ...]
 *
 * Determinism:
 *   - no writes
 *   - no timestamps
 *   - all object/set traversals are strictCompare-sorted
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SREBRENICA_OSIDS = [
    'op:srebrenica:bostahovine_2',
    'op:srebrenica:brezovice_2',
    'op:srebrenica:donji_potocari_2',
    'op:srebrenica:ljeskovik_2',
    'op:srebrenica:luka_2',
    'op:srebrenica:mala_daljegosta_2',
    'op:srebrenica:milacevici',
    'op:srebrenica:radovcici',
    'op:srebrenica:srebrenica_2',
    'op:srebrenica:suceska',
    'op:srebrenica:sulice_2',
].sort(strictCompare);

const ZEPA_OSIDS = ['op:rogatica:zepa_2'];

const WATCH_EVENTS = [
    'srebrenica_falls_1995',
    'zepa_falls_1995',
    'srebrenica_genocide_1995',
].sort(strictCompare);

const WATCH_OPS = [
    'Operation Cerska-Kamenica',
    'Operation Krivaja-95',
    'Operation Stupčanica-95',
].sort(strictCompare);

const WATCH_BRIGADES = [
    'rs_1st_birac',
    'rs_5th_podrinje',
    'rs_skelani_battalion',
    'rs_visegrad_brigade',
].sort(strictCompare);

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath, fallback) {
    return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function numeric(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function countBy(values) {
    const out = new Map();
    for (const value of values) {
        const key = String(value ?? 'missing');
        out.set(key, (out.get(key) || 0) + 1);
    }
    return Array.from(out.keys()).sort(strictCompare).map(key => `${key}:${out.get(key)}`).join(', ');
}

function getControllers(state) {
    return (state.political && state.political.political_controllers)
        || state.political_controllers
        || {};
}

function summarizeEnclave(name, osids, controllers, capitalOsid) {
    const rows = osids.slice().sort(strictCompare).map(osid => ({
        osid,
        controller: String(controllers[osid] || 'missing'),
    }));
    const rsHeld = rows.filter(row => row.controller === 'RS').length;
    const rbihHeld = rows.filter(row => row.controller === 'RBiH').length;
    const missing = rows.filter(row => row.controller === 'missing').length;
    return {
        enclave: name,
        osids: rows,
        total: rows.length,
        rs_held: rsHeld,
        rbih_held: rbihHeld,
        missing,
        controller_summary: countBy(rows.map(row => row.controller)),
        capital_osid: capitalOsid,
        capital_controller: String(controllers[capitalOsid] || 'missing'),
        all_rs: rows.length > 0 && rsHeld === rows.length,
    };
}

function collectMatchingValues(root, keyName, needle) {
    const matches = [];
    const seen = new Set();

    function visit(value, pathParts) {
        if (value === null || value === undefined) return;
        if (typeof value !== 'object') return;
        if (seen.has(value)) return;
        seen.add(value);

        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i += 1) {
                const item = value[i];
                if (typeof item === 'string' && item === needle) {
                    matches.push(`${pathParts.join('.')}.${i}`);
                }
                visit(item, pathParts.concat(String(i)));
            }
            return;
        }

        for (const key of Object.keys(value).sort(strictCompare)) {
            const child = value[key];
            if (key === keyName) {
                const serialized = JSON.stringify(child);
                if (serialized && serialized.includes(needle)) {
                    matches.push(pathParts.concat(key).join('.'));
                }
            }
            if (typeof child === 'string' && child === needle) {
                matches.push(pathParts.concat(key).join('.'));
            }
            visit(child, pathParts.concat(key));
        }
    }

    visit(root, ['state']);
    return Array.from(new Set(matches)).sort(strictCompare);
}

function eventStatus(state) {
    const counts = (state.military && state.military.event_fire_counts) || {};
    const lastTurns = (state.military && state.military.event_last_fired_turn) || {};
    const firedIds = new Set(asArray(state.military && state.military.fired_event_ids).map(String));

    return WATCH_EVENTS.map(eventId => {
        const rupturePaths = eventId === 'srebrenica_genocide_1995'
            ? collectMatchingValues(state, 'rupture_consequences', eventId)
            : [];
        return {
            event_id: eventId,
            fired: firedIds.has(eventId) || numeric(counts[eventId], 0) > 0 || rupturePaths.length > 0,
            count: numeric(counts[eventId], 0),
            last_turn: lastTurns[eventId] === undefined ? null : numeric(lastTurns[eventId], null),
            rupture_paths: rupturePaths,
        };
    });
}

function aarSource(runDir, state) {
    const fileRows = readJsonIfExists(path.join(runDir, 'operation_aars.json'), null);
    if (Array.isArray(fileRows)) return fileRows;
    return asArray(state.operation_history);
}

function summarizeOperationAars(runDir, state) {
    const aars = aarSource(runDir, state);
    return WATCH_OPS.map(name => {
        const matches = aars
            .filter(aar => String(aar.operation_name || '') === name)
            .sort((a, b) => {
                const ta = numeric(a.started_turn, 0);
                const tb = numeric(b.started_turn, 0);
                if (ta !== tb) return ta - tb;
                return strictCompare(a.operation_id, b.operation_id);
            });
        const aar = matches[matches.length - 1];
        if (!aar) {
            return {
                operation_name: name,
                present: false,
                operation_id: '',
                started_turn: null,
                outcome: 'missing',
                recovery_reason: '',
                total_attacks: 0,
                captured: 0,
                targeted: 0,
                force_ratio_estimate: null,
                axes: [],
            };
        }
        const axes = asArray(aar.axis_summaries).map(axis => ({
            axis_id: String(axis.axis_id || ''),
            staging_osid: String(axis.staging_osid || ''),
            total_attacks: numeric(axis.total_attacks, 0),
            captured: asArray(axis.objectives_captured).length,
            targeted: asArray(axis.objectives_targeted).length,
            unreachable_at_launch: axis.unreachable_at_launch === true,
            brigades: asArray(axis.brigades).map(String).sort(strictCompare),
        })).sort((a, b) => strictCompare(a.axis_id, b.axis_id));
        return {
            operation_name: name,
            present: true,
            operation_id: String(aar.operation_id || ''),
            started_turn: aar.started_turn === undefined ? null : numeric(aar.started_turn, null),
            outcome: String(aar.outcome || ''),
            recovery_reason: String(aar.recovery_reason || ''),
            total_attacks: numeric(aar.total_attacks, 0),
            captured: asArray(aar.objectives_captured).length,
            targeted: asArray(aar.objectives_targeted).length,
            force_ratio_estimate: aar.force_ratio_estimate === undefined ? null : numeric(aar.force_ratio_estimate, null),
            axes,
        };
    });
}

function collectWatchedBrigadeIds(opRows) {
    const ids = new Set(WATCH_BRIGADES);
    for (const op of opRows) {
        for (const axis of asArray(op.axes)) {
            for (const brigadeId of asArray(axis.brigades)) ids.add(String(brigadeId));
        }
    }
    return Array.from(ids).sort(strictCompare);
}

function summarizeBrigades(state, opRows) {
    const formations = (state.military && state.military.formations) || {};
    return collectWatchedBrigadeIds(opRows).map(id => {
        const f = formations[id];
        if (!f) {
            return { id, present: false, status: 'missing', personnel: 0, cohesion: null, morale: null, location_osid: '', corps_id: '' };
        }
        return {
            id,
            present: true,
            status: String(f.status || (numeric(f.personnel, 0) > 0 ? 'active?' : 'inactive?')),
            personnel: numeric(f.personnel, 0),
            cohesion: f.cohesion === undefined ? null : numeric(f.cohesion, null),
            morale: f.morale === undefined ? null : numeric(f.morale, null),
            location_osid: String(f.location_osid || ''),
            corps_id: String(f.corps_id || ''),
        };
    });
}

function verdict(enclaves, events) {
    const sreb = enclaves.find(e => e.enclave === 'srebrenica');
    const zepa = enclaves.find(e => e.enclave === 'zepa');
    const rupture = events.find(e => e.event_id === 'srebrenica_genocide_1995');
    if (sreb && zepa && sreb.all_rs && zepa.all_rs && rupture && rupture.fired) return 'RESOLVED';
    if (sreb && zepa && !sreb.all_rs && !zepa.all_rs && rupture && !rupture.fired) return 'OPEN_P0';
    return 'PARTIAL';
}

function buildSensitiveHistoryStatus(runDir) {
    const state = readJson(path.join(runDir, 'final_save.json'));
    const summary = readJsonIfExists(path.join(runDir, 'run_summary.json'), {});
    const controllers = getControllers(state);
    const enclaves = [
        summarizeEnclave('srebrenica', SREBRENICA_OSIDS, controllers, 'op:srebrenica:srebrenica_2'),
        summarizeEnclave('zepa', ZEPA_OSIDS, controllers, 'op:rogatica:zepa_2'),
    ];
    const events = eventStatus(state);
    const operations = summarizeOperationAars(runDir, state);
    const brigades = summarizeBrigades(state, operations);
    return {
        run_dir: runDir,
        turn: numeric(state.meta && state.meta.turn, numeric(summary.weeks, 0)),
        final_state_hash: String(summary.final_state_hash || state.meta?.final_state_hash || ''),
        verdict: verdict(enclaves, events),
        enclaves,
        events,
        operations,
        brigades,
    };
}

function formatNumber(value) {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
    return String(value);
}

function formatMarkdown(results) {
    const out = ['# Sensitive-History Enclave Status', ''];
    for (const result of results) {
        out.push(`## ${path.basename(result.run_dir)}`);
        out.push('');
        out.push(`- Verdict: **${result.verdict}**`);
        out.push(`- Turn: ${result.turn}`);
        if (result.final_state_hash) out.push(`- Hash: \`${result.final_state_hash}\``);
        out.push('');

        out.push('### Enclave Controllers');
        out.push('');
        out.push('| Enclave | RS held | RBiH held | Missing | Capital controller | All RS? | Summary |');
        out.push('|---|---:|---:|---:|---|---|---|');
        for (const e of result.enclaves) {
            out.push(`| ${e.enclave} | ${e.rs_held}/${e.total} | ${e.rbih_held}/${e.total} | ${e.missing} | ${e.capital_controller} | ${e.all_rs ? 'yes' : 'no'} | ${e.controller_summary} |`);
        }
        out.push('');

        out.push('### Events And Rupture');
        out.push('');
        out.push('| Event | Fired? | Count | Last turn | Rupture path(s) |');
        out.push('|---|---|---:|---:|---|');
        for (const e of result.events) {
            out.push(`| ${e.event_id} | ${e.fired ? 'yes' : 'no'} | ${e.count} | ${e.last_turn ?? '-'} | ${e.rupture_paths.length > 0 ? e.rupture_paths.join(', ') : '-'} |`);
        }
        out.push('');

        out.push('### Watched Operations');
        out.push('');
        out.push('| Operation | Turn | Outcome | Recovery | Attacks | Captures | Ratio | Axes |');
        out.push('|---|---:|---|---|---:|---:|---:|---|');
        for (const op of result.operations) {
            const axes = op.axes.map(axis => `${axis.axis_id}:${axis.captured}/${axis.targeted}@${axis.staging_osid || '-'}${axis.unreachable_at_launch ? ':unreachable' : ''}`).join('; ') || '-';
            out.push(`| ${op.operation_name} | ${op.started_turn ?? '-'} | ${op.outcome} | ${op.recovery_reason || '-'} | ${op.total_attacks} | ${op.captured}/${op.targeted} | ${formatNumber(op.force_ratio_estimate)} | ${axes} |`);
        }
        out.push('');

        out.push('### Watched Brigades');
        out.push('');
        out.push('| Brigade | Status | Personnel | Cohesion | Morale | Corps | Location |');
        out.push('|---|---|---:|---:|---:|---|---|');
        for (const b of result.brigades) {
            out.push(`| ${b.id} | ${b.status} | ${b.personnel} | ${formatNumber(b.cohesion)} | ${formatNumber(b.morale)} | ${b.corps_id || '-'} | ${b.location_osid || '-'} |`);
        }
        out.push('');
    }
    return `${out.join('\n')}\n`;
}

function parseArgs(argv) {
    const json = argv.includes('--json');
    const dirs = argv.filter(arg => arg !== '--json');
    if (dirs.length === 0) {
        throw new Error('Usage: node tools/diagnostics/sensitive_history_status.cjs [--json] <run_dir> [<run_dir> ...]');
    }
    return { json, dirs };
}

function main() {
    const { json, dirs } = parseArgs(process.argv.slice(2));
    const results = dirs.map(buildSensitiveHistoryStatus);
    if (json) {
        process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    } else {
        process.stdout.write(formatMarkdown(results));
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    SREBRENICA_OSIDS,
    ZEPA_OSIDS,
    buildSensitiveHistoryStatus,
    formatMarkdown,
    summarizeEnclave,
};
