#!/usr/bin/env node
/**
 * Diagnostic: check that every political_controllers flip in a run has
 * a matching control_event for that week.
 *
 * Usage: node tools/check_control_events.cjs <run_dir>
 *
 * Reads weekly_report.jsonl from the run directory and diffs
 * political_controllers week-over-week, reporting any flips without
 * a corresponding control_event.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) {
    console.error('Usage: node tools/check_control_events.cjs <run_dir>');
    process.exit(1);
}

const reportPath = path.join(runDir, 'weekly_report.jsonl');
if (!fs.existsSync(reportPath)) {
    console.error(`File not found: ${reportPath}`);
    process.exit(1);
}

const lines = fs.readFileSync(reportPath, 'utf-8').split('\n').filter(l => l.trim());
const weeks = lines.map(l => JSON.parse(l));

let totalViolations = 0;
let prevControllers = null;

for (const week of weeks) {
    const turn = week.turn ?? week.week ?? 0;
    const pc = week.political_controllers ?? (week.state && week.state.political && week.state.political.political_controllers) ?? null;
    const controlEvents = week.control_events ?? (week.state && week.state.political && week.state.political.control_events) ?? [];

    if (!pc) {
        // Try to get from territory section
        const territory = week.territory ?? {};
        if (territory.political_controllers) {
            // Use territory section if available
        }
        if (!pc && !territory.political_controllers) {
            prevControllers = null;
            continue;
        }
    }

    const currentControllers = pc || {};

    if (prevControllers !== null) {
        // Find this turn's events by OSID
        const eventOsids = new Set();
        for (const evt of controlEvents) {
            if (evt.turn === turn || evt.week === turn) {
                eventOsids.add(evt.settlement_id || evt.osid);
            }
        }

        // Also check control_change_attribution if available
        const attribution = week.control_change_attribution ?? [];
        for (const attr of attribution) {
            if (attr.osid) eventOsids.add(attr.osid);
            if (attr.settlement_id) eventOsids.add(attr.settlement_id);
        }

        const violations = [];

        // Check flips
        const allOsids = new Set([...Object.keys(currentControllers), ...Object.keys(prevControllers)]);
        for (const osid of [...allOsids].sort()) {
            const prev = prevControllers[osid];
            const curr = currentControllers[osid];
            if (prev !== curr && !eventOsids.has(osid)) {
                violations.push(`  ${osid}: ${prev ?? 'null'} → ${curr ?? 'removed'}`);
            }
        }

        if (violations.length > 0) {
            console.log(`Week ${turn}: ${violations.length} unmatched flip(s):`);
            violations.forEach(v => console.log(v));
            totalViolations += violations.length;
        }
    }

    prevControllers = { ...currentControllers };
}

if (totalViolations === 0) {
    console.log('OK: All political_controllers flips have matching events.');
} else {
    console.log(`\nTotal violations: ${totalViolations}`);
}
