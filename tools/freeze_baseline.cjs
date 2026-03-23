#!/usr/bin/env node
/**
 * Freeze calibration baseline from the most recent 40w run.
 * Reads run_summary.json + weekly_report.jsonl from the latest run dir.
 * Saves key metrics to data/calibration/baseline_40w.json.
 *
 * Usage: node tools/freeze_baseline.cjs [run_dir]
 *   If no run_dir given, finds the latest n* dir in runs/.
 */
const fs = require('fs');
const path = require('path');

const runsRoot = path.resolve(__dirname, '..', 'runs');
const outPath = path.resolve(__dirname, '..', 'data', 'calibration', 'baseline_40w.json');

// Find run dir
let runDir = process.argv[2];
if (!runDir) {
    const dirs = fs.readdirSync(runsRoot)
        .filter(d => d.startsWith('apr1992_definitive_40w'))
        .sort();
    if (dirs.length === 0) {
        console.error('No 40w run found in runs/. Run npm run sim:scenario:run:40w first.');
        process.exit(1);
    }
    runDir = path.join(runsRoot, dirs[dirs.length - 1]);
} else if (!path.isAbsolute(runDir)) {
    runDir = path.resolve(process.cwd(), runDir);
}

console.log('Reading from:', runDir);

// Read run summary
const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'run_summary.json'), 'utf8'));

// Read weekly report for event timing
const weeklyLines = fs.readFileSync(path.join(runDir, 'weekly_report.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

// Extract territory from vs_historical
const vsHist = summary.vs_historical?.counts_by_controller ?? [];
const territory = {};
for (const entry of vsHist) {
    territory[entry.controller] = {
        count: entry.final_count,
        reference: entry.reference_count,
        delta: entry.delta,
    };
}

// Extract event fire order from weekly reports (turn = line index)
const eventsFired = [];
for (let i = 0; i < weeklyLines.length; i++) {
    const events = weeklyLines[i].events_fired ?? [];
    for (const evt of events) {
        eventsFired.push({ turn: i, id: evt.id || evt, text: evt.text || '' });
    }
}

// Compute area-weighted match from final_save vs painted reference
let areaWeightedPct = null;
try {
    const finalSave = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
    const paintedPath = path.resolve(__dirname, '..', 'data', 'source', 'calibration', 'painted_control_jan1993.json');
    const painted = JSON.parse(fs.readFileSync(paintedPath, 'utf8'));
    const areasPath = path.resolve(__dirname, '..', 'data', 'derived', 'operational', 'osid_areas.json');
    const areasData = JSON.parse(fs.readFileSync(areasPath, 'utf8'));
    const areas = areasData.areas || areasData;

    const simControl = finalSave.political?.political_controllers || finalSave.political_controllers || {};
    const paintedControl = painted.by_settlement_id || painted;

    let matchArea = 0;
    let totalArea = 0;
    for (const [osid, paintedFaction] of Object.entries(paintedControl)) {
        const area = areas[osid] ?? 0;
        totalArea += area;
        if (simControl[osid] === paintedFaction) {
            matchArea += area;
        }
    }
    if (totalArea > 0) {
        areaWeightedPct = Math.round((matchArea / totalArea) * 1000) / 10;
    }
} catch (e) {
    console.warn('Could not compute area-weighted match:', e.message);
}

// Fallback: try control_delta if direct computation failed
if (areaWeightedPct === null) {
    try {
        const controlDelta = JSON.parse(fs.readFileSync(path.join(runDir, 'control_delta.json'), 'utf8'));
        areaWeightedPct = controlDelta.area_weighted_match_pct ?? null;
    } catch { /* optional */ }
}

if (areaWeightedPct === null) {
    console.error('ERROR: Could not compute area-weighted percentage. Provide run with final_save.json.');
    process.exit(1);
}

const baseline = {
    frozen_at: new Date().toISOString(),
    run_dir: path.basename(runDir),
    run_id: summary.run_id,
    final_state_hash: summary.final_state_hash,
    weeks: summary.weeks,
    area_weighted_pct: areaWeightedPct,
    territory,
    events_fired: eventsFired,
    total_osids: summary.vs_historical?.final_total ?? 712,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2));
console.log('Baseline frozen to:', outPath);
console.log('Area-weighted:', baseline.area_weighted_pct + '%');
console.log('Events fired:', eventsFired.length);
console.log('Territory RS:', territory.RS?.count, 'RBiH:', territory.RBiH?.count, 'HRHB:', territory.HRHB?.count);
