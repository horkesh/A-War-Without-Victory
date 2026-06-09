#!/usr/bin/env node
/**
 * B1 casualty-realism measurement helper (task #69, throwaway tool — NOT committed
 * to src). Reads a scenario run dir and prints:
 *   - military casualty ledger totals (killed / wounded / missing-captured per faction
 *     + war total), the killed:wounded ratio, and missing/captured total;
 *   - the control_delta.json sha256 (OSID-orthogonality fingerprint) + per-faction
 *     net_control_counts_after (the OSID control map).
 *
 * Usage: node tools/b1_casualty_measure.cjs <runDir> [<runDirB to diff control>]
 */
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

function sha256(p) {
    return createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
}

function measure(runDir) {
    const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
    const cl = save.military.casualty_ledger;
    let tk = 0, tw = 0, tm = 0;
    const rows = [];
    for (const f of Object.keys(cl).sort()) {
        const x = cl[f];
        rows.push({ f, killed: x.killed, wounded: x.wounded, missing: x.missing_captured });
        tk += x.killed; tw += x.wounded; tm += x.missing_captured;
    }
    const cdPath = path.join(runDir, 'control_delta.json');
    const cd = JSON.parse(fs.readFileSync(cdPath, 'utf8'));
    return {
        runDir, rows, tk, tw, tm,
        ratio: tk > 0 ? (tw / tk) : 0,
        controlHash: sha256(cdPath),
        countsAfter: cd.net_control_counts_after,
        totalFlips: cd.total_flips,
    };
}

function print(m) {
    console.log(`\n=== ${path.basename(m.runDir)} ===`);
    for (const r of m.rows) {
        console.log(`  ${r.f.padEnd(5)} killed ${String(r.killed).padStart(7)}  wounded ${String(r.wounded).padStart(7)}  missing ${String(r.missing).padStart(7)}`);
    }
    console.log(`  TOTAL killed ${m.tk}  wounded ${m.tw}  missing ${m.tm}`);
    console.log(`  killed:wounded = 1:${m.ratio.toFixed(2)}   missing/captured = ${m.tm}`);
    console.log(`  control_delta sha256(16) = ${m.controlHash}   total_flips = ${m.totalFlips}`);
    console.log(`  net_control_counts_after = ${JSON.stringify(m.countsAfter)}`);
}

const [a, b] = process.argv.slice(2);
const ma = measure(a);
print(ma);
if (b) {
    const mb = measure(b);
    print(mb);
    console.log(`\n=== ORTHOGONALITY ===`);
    console.log(`  control_delta identical: ${ma.controlHash === mb.controlHash ? 'YES (OSID-orthogonal)' : 'NO (OSID MOVED)'}`);
    console.log(`  counts identical: ${JSON.stringify(ma.countsAfter) === JSON.stringify(mb.countsAfter) ? 'YES' : 'NO'}`);
}
