#!/usr/bin/env node
/**
 * Operation opportunity health audit.
 *
 * Read-only diagnostic for the proposal -> decision -> AAR observability loop.
 *
 * Usage:
 *   node tools/diagnostics/opportunity_health_audit.cjs <run_dir> [<run_dir> ...]
 *
 * Per run dir, reads:
 *   - run_summary.json (optional)
 *   - final_save.json  (required)
 *   - operation_aars.json (optional fallback when final_save lacks operation_history)
 *
 * Emits markdown on stdout. Writes nothing.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath, fallback) {
    return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function approvedResponse(response) {
    return response === 'approve'
        || response === 'redirect'
        || response === 'under_resource';
}

function successExit(row) {
    return row.exit_class === 'decisive_success'
        || row.exit_class === 'partial_success'
        || row.aar_outcome === 'success'
        || row.aar_outcome === 'partial';
}

function completedRow(row) {
    return Boolean(row.executed_op_aar_id && row.aar_exists)
        || row.exit_class === 't3_authorized_no_offensive';
}

function displayName(resolution, aar) {
    if (resolution.executed_op_name) return resolution.executed_op_name;
    if (aar && aar.operation_name) return aar.operation_name;
    return String(resolution.opportunity_id || 'unknown').replace(/_/g, ' ');
}

function collectRun(runDir) {
    const absRunDir = path.resolve(runDir);
    const finalSavePath = path.join(absRunDir, 'final_save.json');
    const summaryPath = path.join(absRunDir, 'run_summary.json');
    const aarPath = path.join(absRunDir, 'operation_aars.json');
    if (!fs.existsSync(finalSavePath)) {
        throw new Error(`Missing final_save.json in ${absRunDir}`);
    }

    const state = readJson(finalSavePath);
    const summary = readJsonIfExists(summaryPath, {});
    const operationHistory = asArray(state.operation_history).length > 0
        ? asArray(state.operation_history)
        : asArray(readJsonIfExists(aarPath, []));
    const proposals = asArray(state.military && state.military.operation_opportunities);
    const resolutions = asArray(state.military && state.military.operation_opportunity_resolutions);

    const proposalsById = new Map();
    for (const proposal of proposals) {
        if (!proposal || !proposal.proposal_id) continue;
        proposalsById.set(proposal.proposal_id, proposal);
    }

    const aarById = new Map();
    for (const aar of operationHistory) {
        if (!aar || !aar.operation_id) continue;
        aarById.set(aar.operation_id, aar);
    }

    const proposalIdCounts = new Map();
    for (const resolution of resolutions) {
        const id = resolution && resolution.proposal_id ? String(resolution.proposal_id) : 'missing';
        proposalIdCounts.set(id, (proposalIdCounts.get(id) || 0) + 1);
    }

    const rows = resolutions
        .map((resolution) => {
            const proposal = proposalsById.get(resolution.proposal_id);
            const aar = resolution.executed_op_aar_id
                ? aarById.get(resolution.executed_op_aar_id)
                : undefined;
            const faction = (proposal && proposal.approver_faction)
                || (aar && aar.faction)
                || 'unknown';
            return {
                proposal_id: String(resolution.proposal_id || 'missing'),
                opportunity_id: String(resolution.opportunity_id || 'unknown'),
                display_name: displayName(resolution, aar),
                faction: String(faction),
                response: String(resolution.response || 'unknown'),
                response_turn: Number.isFinite(+resolution.response_turn) ? +resolution.response_turn : -1,
                executed_op_name: resolution.executed_op_name || '',
                executed_op_aar_id: resolution.executed_op_aar_id || '',
                exit_class: resolution.exit_class || '',
                aar_exists: Boolean(aar),
                aar_outcome: aar && aar.outcome ? String(aar.outcome) : '',
                total_attacks: aar && Number.isFinite(+aar.total_attacks) ? +aar.total_attacks : 0,
                objectives_targeted: asArray(aar && aar.objectives_targeted).length,
                objectives_captured: asArray(aar && aar.objectives_captured).length,
                grade_stars: aar && aar.grade && Number.isFinite(+aar.grade.stars) ? +aar.grade.stars : null,
                duplicate_resolution: (proposalIdCounts.get(String(resolution.proposal_id || 'missing')) || 0) > 1,
            };
        })
        .sort((a, b) => {
            if (a.response_turn !== b.response_turn) return a.response_turn - b.response_turn;
            const oppDelta = strictCompare(a.opportunity_id, b.opportunity_id);
            if (oppDelta !== 0) return oppDelta;
            return strictCompare(a.proposal_id, b.proposal_id);
        });

    const counts = {
        decisions: rows.length,
        approved: rows.filter(row => approvedResponse(row.response)).length,
        declined: rows.filter(row => row.response === 'decline').length,
        expired: rows.filter(row => row.response === 'expire').length,
        completed: rows.filter(completedRow).length,
        successes: rows.filter(successExit).length,
        t3: rows.filter(row => row.exit_class === 't3_authorized_no_offensive').length,
        unlinkedApproved: rows.filter(row =>
            approvedResponse(row.response)
            && !row.executed_op_aar_id
            && row.exit_class !== 't3_authorized_no_offensive').length,
        brokenAarLinks: rows.filter(row => row.executed_op_aar_id && !row.aar_exists).length,
        duplicateResolutions: rows.filter(row => row.duplicate_resolution).length,
    };

    return {
        runDir: absRunDir,
        summary,
        rows,
        counts,
    };
}

function printMetric(label, value) {
    console.log(`| ${label} | ${value} |`);
}

function printRun(run) {
    const name = path.basename(run.runDir);
    const hash = run.summary.final_state_hash || 'n/a';
    const weeks = run.summary.weeks || run.summary.turns || run.summary.turn || 'n/a';

    console.log(`## Run: ${name}`);
    console.log('');
    console.log(`- weeks: ${weeks}`);
    console.log(`- final_state_hash: \`${hash}\``);
    console.log('');
    console.log('### Summary');
    console.log('');
    console.log('| Metric | Count |');
    console.log('|---|---:|');
    printMetric('Total decisions', run.counts.decisions);
    printMetric('Approved / redirected / under-resourced', run.counts.approved);
    printMetric('Declined', run.counts.declined);
    printMetric('Expired', run.counts.expired);
    printMetric('Completed', run.counts.completed);
    printMetric('Successes', run.counts.successes);
    printMetric('T3 defensive sentinels', run.counts.t3);
    printMetric('Unlinked approved offensive resolutions', run.counts.unlinkedApproved);
    printMetric('Broken AAR links', run.counts.brokenAarLinks);
    printMetric('Duplicate proposal resolution rows', run.counts.duplicateResolutions);
    console.log('');

    console.log('### Resolution Rows');
    console.log('');
    console.log('| Turn | Faction | Proposal | Opportunity | Response | Exit | AAR | Outcome | Attacks | Objectives | Grade |');
    console.log('|---:|---|---|---|---|---|---|---|---:|---:|---:|');
    for (const row of run.rows) {
        const aar = row.executed_op_aar_id
            ? (row.aar_exists ? row.executed_op_aar_id : `${row.executed_op_aar_id} (missing)`)
            : 'none';
        const objectiveText = `${row.objectives_captured}/${row.objectives_targeted}`;
        const grade = row.grade_stars === null ? 'n/a' : `${row.grade_stars}`;
        console.log(`| ${row.response_turn} | ${row.faction} | ${row.proposal_id} | ${row.display_name} | ${row.response} | ${row.exit_class || 'pending'} | ${aar} | ${row.aar_outcome || 'n/a'} | ${row.total_attacks} | ${objectiveText} | ${grade} |`);
    }
    console.log('');

    const problemRows = run.rows.filter(row =>
        (approvedResponse(row.response)
            && !row.executed_op_aar_id
            && row.exit_class !== 't3_authorized_no_offensive')
        || (row.executed_op_aar_id && !row.aar_exists)
        || row.duplicate_resolution);
    if (problemRows.length > 0) {
        console.log('### Follow-Up Rows');
        console.log('');
        for (const row of problemRows) {
            const reasons = [];
            if (approvedResponse(row.response)
                && !row.executed_op_aar_id
                && row.exit_class !== 't3_authorized_no_offensive') {
                reasons.push('approved without AAR link');
            }
            if (row.executed_op_aar_id && !row.aar_exists) reasons.push('AAR id missing from history');
            if (row.duplicate_resolution) reasons.push('duplicate proposal resolution');
            console.log(`- ${row.proposal_id} (${row.display_name}): ${reasons.join(', ')}`);
        }
        console.log('');
    }
}

function main() {
    const runDirs = process.argv.slice(2);
    if (runDirs.length === 0) {
        console.error('Usage: node tools/diagnostics/opportunity_health_audit.cjs <run_dir> [<run_dir> ...]');
        process.exit(2);
    }

    console.log('# Operation Opportunity Health Audit');
    console.log('');
    for (const runDir of runDirs) {
        printRun(collectRun(runDir));
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    collectRun,
};
