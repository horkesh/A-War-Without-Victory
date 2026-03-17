#!/usr/bin/env node
/**
 * AI Commander QA Diagnostic Summary.
 * Parses diagnostic_report.json from a three-commander run and prints actionable summary.
 * Exit code 1 if bugs found, 0 otherwise.
 *
 * Usage: node tools/claude_plays_vrs/summarize_diagnostics.cjs [path-to-runs-dir]
 */

const fs = require('fs');
const path = require('path');

const runDir = process.argv[2] || path.join(__dirname, '../../runs/three_commanders');
const reportPath = path.join(runDir, 'diagnostic_report.json');

if (!fs.existsSync(reportPath)) {
    console.error(`No diagnostic report found at ${reportPath}`);
    console.error('Run: npm run sim:qa:commanders');
    process.exit(1);
}

const observations = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const bySeverity = { bug: [], calibration: [], design_gap: [], historical_divergence: [] };
for (const o of observations) {
    if (bySeverity[o.severity]) bySeverity[o.severity].push(o);
}

console.log('=== AI Commander QA Diagnostic Summary ===\n');
console.log(`Run directory: ${runDir}`);
console.log(`Total observations: ${observations.length}`);
console.log(`  Bugs:                  ${bySeverity.bug.length}`);
console.log(`  Calibration issues:    ${bySeverity.calibration.length}`);
console.log(`  Design gaps:           ${bySeverity.design_gap.length}`);
console.log(`  Historical divergence: ${bySeverity.historical_divergence.length}`);

function printDeduped(label, icon, obs) {
    if (obs.length === 0) return;
    console.log(`\n${icon} ${label} (${obs.length}):`);
    const seen = new Set();
    for (const o of obs) {
        const key = `${o.faction}:${o.description}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.log(`  [${o.faction} w${o.turn}] ${o.description}`);
        if (o.expected) console.log(`    Expected: ${o.expected}`);
        if (o.actual) console.log(`    Actual:   ${o.actual}`);
    }
}

printDeduped('BUGS (require fix)', '\u{1F534}', bySeverity.bug);
printDeduped('HISTORICAL DIVERGENCE', '\u{1F7E0}', bySeverity.historical_divergence);
printDeduped('DESIGN GAPS', '\u{1F535}', bySeverity.design_gap);
printDeduped('CALIBRATION NOTES', '\u{1F7E1}', bySeverity.calibration);

const exitCode = bySeverity.bug.length > 0 ? 1 : 0;
console.log(`\n${exitCode === 0 ? '\u2705 PASS' : '\u274C FAIL'} \u2014 ${bySeverity.bug.length} bugs, ${bySeverity.calibration.length} calibration, ${bySeverity.design_gap.length} design gaps, ${bySeverity.historical_divergence.length} divergences`);
process.exit(exitCode);
