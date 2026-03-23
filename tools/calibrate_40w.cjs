#!/usr/bin/env node
/**
 * Calibration regression check.
 * 1. Runs 40w scenario
 * 2. Compares against frozen baseline
 * 3. Prints PASS/FAIL report
 *
 * Usage: npm run calibrate:40w
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const baselinePath = path.resolve(__dirname, '..', 'data', 'calibration', 'baseline_40w.json');
if (!fs.existsSync(baselinePath)) {
    console.error('No baseline found. Run: node tools/freeze_baseline.cjs');
    process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

// Run scenario
console.log('Running 40w scenario...');
const output = execSync('npm run sim:scenario:run:40w 2>&1', {
    encoding: 'utf8',
    cwd: path.resolve(__dirname, '..'),
    timeout: 120000,
});

// Parse run dir from output
const outDirMatch = output.match(/outDir:\s*(.+)/);
if (!outDirMatch) {
    console.error('Could not parse run directory from output');
    process.exit(1);
}
const runDir = path.resolve(__dirname, '..', outDirMatch[1].trim());

// Read results
const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'run_summary.json'), 'utf8'));
const vsHist = summary.vs_historical?.counts_by_controller ?? [];

// Compare territory
const TERRITORY_TOLERANCE_PP = 2; // percentage points
const results = [];
let allPass = true;

for (const entry of vsHist) {
    const faction = entry.controller;
    const baselineEntry = baseline.territory[faction];
    if (!baselineEntry) continue;
    const delta = Math.abs(entry.final_count - baselineEntry.count);
    const totalOsids = baseline.total_osids || 712;
    const deltaPP = (delta / totalOsids) * 100;
    const pass = deltaPP <= TERRITORY_TOLERANCE_PP;
    if (!pass) allPass = false;
    results.push({
        check: `${faction} territory`,
        baseline: baselineEntry.count,
        current: entry.final_count,
        delta,
        deltaPP: deltaPP.toFixed(1) + 'pp',
        status: pass ? 'PASS' : 'FAIL',
    });
}

// Compare event count
const weeklyLines = fs.readFileSync(path.join(runDir, 'weekly_report.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map(line => JSON.parse(line));
let currentEventCount = 0;
for (const week of weeklyLines) {
    currentEventCount += (week.events_fired ?? []).length;
}
const eventCountPass = currentEventCount === baseline.events_fired.length;
if (!eventCountPass) allPass = false;
results.push({
    check: 'Event count',
    baseline: baseline.events_fired.length,
    current: currentEventCount,
    delta: Math.abs(currentEventCount - baseline.events_fired.length),
    status: eventCountPass ? 'PASS' : 'FAIL',
});

// Compare state hash (determinism)
const hashPass = summary.final_state_hash === baseline.final_state_hash;
if (!hashPass) allPass = false;
results.push({
    check: 'Determinism (state hash)',
    baseline: baseline.final_state_hash,
    current: summary.final_state_hash,
    status: hashPass ? 'PASS' : 'FAIL',
});

// Print report
console.log('\n' + '='.repeat(60));
console.log('CALIBRATION REGRESSION REPORT');
console.log('='.repeat(60));
console.log(`Baseline: ${baseline.run_dir} (${baseline.frozen_at})`);
console.log(`Current:  ${path.basename(runDir)}`);
console.log(`Area-weighted baseline: ${baseline.area_weighted_pct}%`);
console.log('-'.repeat(60));

for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} ${r.check}: ${r.status} (baseline=${r.baseline}, current=${r.current}${r.deltaPP ? ', Δ=' + r.deltaPP : ''})`);
}

console.log('-'.repeat(60));
console.log(allPass ? '  ✓ ALL CHECKS PASSED' : '  ✗ REGRESSION DETECTED');
console.log('='.repeat(60));

process.exit(allPass ? 0 : 1);
