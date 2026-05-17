#!/usr/bin/env node
/**
 * Opportunity campaign proof matrix.
 *
 * Read-only diagnostic that fuses the opportunity proposal log, ineligibility
 * diagnostics, resolution rows, operation AAR delivery, and per-axis
 * reachability into a single campaign-level proof surface.
 *
 * Usage:
 *   node tools/diagnostics/opportunity_campaign_proof.cjs [--json] <run_dir> [<run_dir> ...]
 *
 * Inputs per run dir:
 *   - final_save.json      (required)
 *   - run_summary.json     (optional)
 *   - operation_aars.json  (optional fallback via operation_delivery_audit)
 *
 * Determinism:
 *   - no writes
 *   - no timestamps
 *   - sorted iteration for all derived rows
 */

'use strict';

const fs = require('fs');
const path = require('path');

const health = require('./opportunity_health_audit.cjs');
const delivery = require('./operation_delivery_audit.cjs');

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

function numeric(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function approvedResponse(response) {
    return response === 'approve'
        || response === 'redirect'
        || response === 'under_resource';
}

function predicateTag(predicate) {
    switch (predicate) {
        case 'op_delivered_intent': return 'DELIV';
        case 'target_already_friendly': return 'PRE-FRIENDLY';
        case 'contacted_but_underdelivered': return 'UNDERDELIV';
        case 'no_contact_pathing': return 'NO-CONTACT-PATH';
        case 'no_launch_readiness': return 'NO-LAUNCH-READINESS';
        case 'defender_power_too_high': return 'DEFENDER-POWER-HIGH';
        case 'no_contact_other': return 'NO-CONTACT-OTHER';
        case 'partial_delivery': return 'PARTIAL';
        case 'contacted_no_capture': return 'STALEMATE';
        case 'no_contact_op_level': return 'NO-CONTACT-OP';
        case 'active': return 'ACTIVE';
        default: return String(predicate || 'UNKNOWN').toUpperCase();
    }
}

function increment(map, key) {
    const k = String(key || 'unknown');
    map.set(k, (map.get(k) || 0) + 1);
}

function formatCountMap(map) {
    const keys = Array.from(map.keys()).sort(strictCompare);
    if (keys.length === 0) return 'n/a';
    return keys.map(k => `${k} x${map.get(k)}`).join('; ');
}

function summarizeDiagnostics(rows) {
    const sorted = asArray(rows)
        .slice()
        .sort((a, b) => {
            const ta = numeric(a && a.turn, 0);
            const tb = numeric(b && b.turn, 0);
            if (ta !== tb) return ta - tb;
            return strictCompare(JSON.stringify(a), JSON.stringify(b));
        });
    const turns = sorted.map(row => numeric(row && row.turn, 0));
    const required = new Map();
    const optional = new Map();
    for (const row of sorted) {
        for (const item of asArray(row && row.failed_required_axes)) {
            increment(required, item && item.axis);
        }
        for (const item of asArray(row && row.failed_optional_axes)) {
            increment(optional, item && item.axis);
        }
    }
    const minTurn = turns.length > 0 ? Math.min(...turns) : null;
    const maxTurn = turns.length > 0 ? Math.max(...turns) : null;
    return {
        count: sorted.length,
        turn_window: minTurn === null ? '-' : (minTurn === maxTurn ? `${minTurn}` : `${minTurn}-${maxTurn}`),
        required_blockers: formatCountMap(required),
        optional_blockers: formatCountMap(optional),
    };
}

function axisPredicateSummary(opRows) {
    const counts = new Map();
    for (const op of opRows) {
        for (const axis of asArray(op.axes)) {
            increment(counts, predicateTag(axis.predicate));
        }
    }
    const keys = Array.from(counts.keys()).sort(strictCompare);
    if (keys.length === 0) return '-';
    return keys.map(k => `${k}:${counts.get(k)}`).join(', ');
}

function uniq(values) {
    const seen = new Set();
    for (const v of values) {
        if (v === undefined || v === null || v === '') continue;
        seen.add(String(v));
    }
    return Array.from(seen).sort(strictCompare);
}

function joinOrDash(values) {
    const out = uniq(values);
    return out.length > 0 ? out.join(', ') : '-';
}

function firstKnownTurn({ proposals, resolutions, diagnostics, opRows }) {
    const values = [];
    for (const p of proposals) values.push(numeric(p.eligibility_turn, NaN));
    for (const r of resolutions) values.push(numeric(r.response_turn, NaN));
    for (const d of diagnostics) values.push(numeric(d.turn, NaN));
    for (const op of opRows) values.push(numeric(op.started_turn, NaN));
    const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
    return finite.length > 0 ? finite[0] : null;
}

function classifyOpportunity({ proposals, resolutions, diagnostics, opRows }) {
    if (opRows.length > 0) return 'surfaced_executed';
    if (resolutions.some(r => r.exit_class === 't3_authorized_no_offensive')) return 't3_authorized';
    if (resolutions.some(r => approvedResponse(r.response))) return 'approved_unlinked';
    if (resolutions.length > 0) return 'resolved_no_execution';
    if (proposals.length > 0) return `surfaced_${String(proposals[0].status || 'pending')}`;
    if (diagnostics.length > 0) return 'blocked_in_window';
    return 'not_observed';
}

function buildOpportunityRows(runDir, state, deliveryRun) {
    const proposals = asArray(state.military && state.military.operation_opportunities);
    const resolutions = asArray(state.military && state.military.operation_opportunity_resolutions);
    const diagnostics = asArray(state.military && state.military.operation_opportunity_diagnostics);
    const opRows = asArray(deliveryRun.opRows).filter(row => row.opportunity_id);

    const ids = new Set();
    for (const p of proposals) if (p.opportunity_id) ids.add(String(p.opportunity_id));
    for (const r of resolutions) if (r.opportunity_id) ids.add(String(r.opportunity_id));
    for (const d of diagnostics) if (d.opportunity_id) ids.add(String(d.opportunity_id));
    for (const o of opRows) if (o.opportunity_id) ids.add(String(o.opportunity_id));

    const rows = [];
    for (const id of Array.from(ids).sort(strictCompare)) {
        const pRows = proposals
            .filter(p => String(p.opportunity_id || '') === id)
            .sort((a, b) => {
                const ta = numeric(a.eligibility_turn, 0);
                const tb = numeric(b.eligibility_turn, 0);
                if (ta !== tb) return ta - tb;
                return strictCompare(a.proposal_id, b.proposal_id);
            });
        const rRows = resolutions
            .filter(r => String(r.opportunity_id || '') === id)
            .sort((a, b) => {
                const ta = numeric(a.response_turn, 0);
                const tb = numeric(b.response_turn, 0);
                if (ta !== tb) return ta - tb;
                return strictCompare(a.proposal_id, b.proposal_id);
            });
        const dRows = diagnostics
            .filter(d => String(d.opportunity_id || '') === id)
            .sort((a, b) => {
                const ta = numeric(a.turn, 0);
                const tb = numeric(b.turn, 0);
                if (ta !== tb) return ta - tb;
                return strictCompare(JSON.stringify(a), JSON.stringify(b));
            });
        const oRows = opRows
            .filter(o => String(o.opportunity_id || '') === id)
            .sort((a, b) => {
                const ta = numeric(a.started_turn, 0);
                const tb = numeric(b.started_turn, 0);
                if (ta !== tb) return ta - tb;
                return strictCompare(a.operation_id, b.operation_id);
            });

        const diag = summarizeDiagnostics(dRows);
        const attacks = oRows.reduce((sum, row) => sum + numeric(row.total_attacks, 0), 0);
        const captured = oRows.reduce((sum, row) => sum + numeric(row.objectives_captured, 0), 0);
        const targeted = oRows.reduce((sum, row) => sum + numeric(row.objectives_targeted, 0), 0);
        const firstTurn = firstKnownTurn({ proposals: pRows, resolutions: rRows, diagnostics: dRows, opRows: oRows });
        const blockerParts = [];
        if (diag.required_blockers !== 'n/a') blockerParts.push(diag.required_blockers);
        if (diag.optional_blockers !== 'n/a') blockerParts.push(diag.optional_blockers);
        const aarBlockers = uniq(oRows.map(o => o.blocker));
        if (aarBlockers.length > 0) blockerParts.push(`aar:${aarBlockers.join(',')}`);

        rows.push({
            opportunity_id: id,
            state: classifyOpportunity({ proposals: pRows, resolutions: rRows, diagnostics: dRows, opRows: oRows }),
            first_turn: firstTurn === null ? '-' : `${firstTurn}`,
            diagnostic_window: diag.turn_window,
            proposal_ids: uniq(pRows.map(p => p.proposal_id)),
            responses: uniq(rRows.map(r => r.response)),
            exit_classes: uniq(rRows.map(r => r.exit_class)),
            aar_outcomes: uniq(oRows.map(o => o.outcome)),
            attacks,
            captured,
            targeted,
            axis_predicates: axisPredicateSummary(oRows),
            blockers: blockerParts.length > 0 ? blockerParts.join('; ') : 'n/a',
            op_names: uniq(oRows.map(o => o.operation_name)),
        });
    }
    void runDir;
    return rows.sort((a, b) => {
        const ta = a.first_turn === '-' ? 999999 : numeric(a.first_turn, 999999);
        const tb = b.first_turn === '-' ? 999999 : numeric(b.first_turn, 999999);
        if (ta !== tb) return ta - tb;
        return strictCompare(a.opportunity_id, b.opportunity_id);
    });
}

function collectReachabilityWarnings(deliveryRun) {
    const rows = [];
    for (const op of asArray(deliveryRun.opRows)) {
        if (!op.opportunity_id) continue;
        for (const axis of asArray(op.axes)) {
            if (axis.unreachable_at_launch === true || axis.predicate === 'no_contact_pathing') {
                rows.push({
                    operation_name: op.operation_name,
                    opportunity_id: op.opportunity_id,
                    axis_id: axis.axis_id,
                    unreachable_at_launch: axis.unreachable_at_launch === true,
                    predicate: predicateTag(axis.predicate),
                    approach_neighbors: asArray(axis.friendly_approach_neighbors).slice().sort(strictCompare),
                    first_objective: axis.first_objective || '',
                    staging_osid: axis.staging_osid || '',
                });
            }
        }
    }
    return rows.sort((a, b) => {
        const op = strictCompare(a.operation_name, b.operation_name);
        if (op !== 0) return op;
        return strictCompare(a.axis_id, b.axis_id);
    });
}

function buildCampaignProof(runDir) {
    const absRunDir = path.resolve(runDir);
    const finalSavePath = path.join(absRunDir, 'final_save.json');
    const summaryPath = path.join(absRunDir, 'run_summary.json');
    if (!fs.existsSync(finalSavePath)) {
        throw new Error(`Missing final_save.json in ${absRunDir}`);
    }
    const state = readJson(finalSavePath);
    const summary = readJsonIfExists(summaryPath, {});
    const healthRun = health.collectRun(absRunDir);
    const deliveryRun = delivery.buildOpRows({ runDir: absRunDir, includeActive: false });
    const opportunityRows = buildOpportunityRows(absRunDir, state, deliveryRun);
    const reachabilityWarnings = collectReachabilityWarnings(deliveryRun);

    return {
        runDir: absRunDir,
        summary,
        counts: {
            opportunities_observed: opportunityRows.length,
            surfaced_executed: opportunityRows.filter(r => r.state === 'surfaced_executed').length,
            blocked_in_window: opportunityRows.filter(r => r.state === 'blocked_in_window').length,
            reachability_warnings: reachabilityWarnings.length,
            health_decisions: healthRun.counts.decisions,
            health_broken_aar_links: healthRun.counts.brokenAarLinks,
            health_unlinked_approved: healthRun.counts.unlinkedApproved,
        },
        opportunityRows,
        reachabilityWarnings,
    };
}

function printMarkdown(runs) {
    const lines = [];
    lines.push('# Opportunity Campaign Proof Matrix');
    lines.push('');
    lines.push('Fuses opportunity proposals, in-window ineligibility diagnostics, resolution rows, AAR delivery, and per-axis reachability.');
    lines.push('');

    for (const run of runs) {
        const name = path.basename(run.runDir);
        const hash = run.summary.final_state_hash || 'n/a';
        const weeks = run.summary.weeks || run.summary.turns || run.summary.turn || 'n/a';
        lines.push(`## Run: ${name}`);
        lines.push('');
        lines.push(`- weeks: ${weeks}`);
        lines.push(`- final_state_hash: \`${hash}\``);
        lines.push('');
        lines.push('### Summary');
        lines.push('');
        lines.push('| Metric | Count |');
        lines.push('|---|---:|');
        lines.push(`| Opportunities observed | ${run.counts.opportunities_observed} |`);
        lines.push(`| Surfaced + executed | ${run.counts.surfaced_executed} |`);
        lines.push(`| Blocked in-window | ${run.counts.blocked_in_window} |`);
        lines.push(`| Reachability warnings | ${run.counts.reachability_warnings} |`);
        lines.push(`| Broken AAR links | ${run.counts.health_broken_aar_links} |`);
        lines.push(`| Unlinked approved | ${run.counts.health_unlinked_approved} |`);
        lines.push('');

        lines.push('### Opportunity Matrix');
        lines.push('');
        lines.push('| Opportunity | State | Turn/Window | Decision | Exit | AAR outcome | Attacks | Captured | Axis proof | Blockers |');
        lines.push('|---|---|---|---|---|---|---:|---|---|---|');
        for (const row of run.opportunityRows) {
            const turnOrWindow = row.state === 'blocked_in_window'
                ? row.diagnostic_window
                : row.first_turn;
            lines.push(`| ${row.opportunity_id} | ${row.state} | ${turnOrWindow} | ${joinOrDash(row.responses)} | ${joinOrDash(row.exit_classes)} | ${joinOrDash(row.aar_outcomes)} | ${row.attacks} | ${row.captured}/${row.targeted} | ${row.axis_predicates} | ${row.blockers} |`);
        }
        lines.push('');

        lines.push('### Reachability Warnings');
        lines.push('');
        if (run.reachabilityWarnings.length === 0) {
            lines.push('(none)');
        } else {
            lines.push('| Operation | Axis | Unreach@Launch | Predicate | Approach Neighbors |');
            lines.push('|---|---|---|---|---|');
            for (const row of run.reachabilityWarnings) {
                const neighbors = row.approach_neighbors.length > 0 ? row.approach_neighbors.join(', ') : '(none)';
                lines.push(`| ${row.operation_name} | ${row.axis_id} | ${row.unreachable_at_launch ? 'true' : 'false'} | ${row.predicate} | ${neighbors} |`);
            }
        }
        lines.push('');
    }

    process.stdout.write(lines.join('\n') + '\n');
}

function printJson(runs) {
    process.stdout.write(JSON.stringify(runs, null, 2) + '\n');
}

function main() {
    const args = process.argv.slice(2);
    const flags = { json: false };
    const runDirs = [];
    for (const arg of args) {
        if (arg === '--json') flags.json = true;
        else if (arg.startsWith('--')) {
            console.error(`Unknown flag: ${arg}`);
            process.exit(2);
        } else {
            runDirs.push(arg);
        }
    }
    if (runDirs.length === 0) {
        console.error('Usage: node tools/diagnostics/opportunity_campaign_proof.cjs [--json] <run_dir> [<run_dir> ...]');
        process.exit(2);
    }
    const runs = runDirs.map(buildCampaignProof);
    if (flags.json) printJson(runs);
    else printMarkdown(runs);
}

if (require.main === module) {
    main();
}

module.exports = {
    buildCampaignProof,
    summarizeDiagnostics,
};
