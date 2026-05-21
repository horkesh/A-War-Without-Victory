#!/usr/bin/env node
/**
 * Painted-target anomaly repaint tool.
 *
 * Applies the four repaints decided in
 * `docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md` Q1.4:
 *
 *   - op:gorazde:gorazde_2  RS  -> RBiH  in apr1994 / apr1995 / oct1995
 *     (Goražde core was RBiH continuously; ICTY Karadžić TJ §3823+, BB1 p.187,448)
 *
 *   - op:rogatica:zepa_2    RBiH -> RS   in oct1995 only
 *     (Žepa fell 25 Jul 1995; ICTY Krstić TJ + Karadžić TJ §5662+)
 *
 * The repaints update `by_settlement_id[osid]` AND `meta.counts` per file.
 * Deterministic, idempotent: re-running with already-correct values is a no-op.
 *
 * Usage:
 *   node tools/diagnostics/painted_target_anomaly_fix.cjs            # apply
 *   node tools/diagnostics/painted_target_anomaly_fix.cjs --dry-run  # report only
 *
 * Exit codes:
 *   0  success (applied or already-correct)
 *   1  validation failure (unexpected current value -- refuse to clobber)
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PAINTED_DIR = path.join(REPO_ROOT, 'data', 'source', 'calibration');

const REPAINTS = [
    { file: 'painted_control_apr1994.json', osid: 'op:gorazde:gorazde_2', expected_old: 'RS',   new: 'RBiH', reason: 'Goražde core RBiH (apr94)' },
    { file: 'painted_control_apr1995.json', osid: 'op:gorazde:gorazde_2', expected_old: 'RS',   new: 'RBiH', reason: 'Goražde core RBiH (apr95)' },
    { file: 'painted_control_oct1995.json', osid: 'op:gorazde:gorazde_2', expected_old: 'RS',   new: 'RBiH', reason: 'Goražde core RBiH (oct95)' },
    { file: 'painted_control_oct1995.json', osid: 'op:rogatica:zepa_2',   expected_old: 'RBiH', new: 'RS',   reason: 'Žepa fell 25 Jul 1995' },
];

function loadJson(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { raw, data: JSON.parse(raw) };
}

function writeJson(filePath, data) {
    // Match the existing painted-file formatting: 2-space indent + trailing newline.
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function recountControllers(byId) {
    const counts = { RS: 0, RBiH: 0, HRHB: 0 };
    for (const osid of Object.keys(byId)) {
        const c = byId[osid];
        if (counts[c] !== undefined) counts[c] += 1;
    }
    return counts;
}

function main() {
    const dryRun = process.argv.includes('--dry-run');
    const log = [];
    let changed = 0;
    let alreadyCorrect = 0;
    let failed = 0;

    // Group repaints by file so each JSON is read+written once.
    const byFile = new Map();
    for (const r of REPAINTS) {
        if (!byFile.has(r.file)) byFile.set(r.file, []);
        byFile.get(r.file).push(r);
    }

    for (const [fileName, ops] of byFile) {
        const fp = path.join(PAINTED_DIR, fileName);
        if (!fs.existsSync(fp)) {
            console.error(`MISSING FILE: ${fp}`);
            failed += ops.length;
            continue;
        }

        const { data } = loadJson(fp);
        const byId = data.by_settlement_id;
        let fileChanged = false;

        for (const op of ops) {
            const current = byId[op.osid];
            if (current === undefined) {
                log.push(`  FAIL ${op.osid} in ${fileName}: OSID not present`);
                failed += 1;
                continue;
            }
            if (current === op.new) {
                log.push(`  SKIP ${op.osid} in ${fileName}: already ${op.new} (${op.reason})`);
                alreadyCorrect += 1;
                continue;
            }
            if (current !== op.expected_old) {
                log.push(`  FAIL ${op.osid} in ${fileName}: expected old=${op.expected_old}, found=${current}; refusing to clobber`);
                failed += 1;
                continue;
            }
            log.push(`  CHANGE ${op.osid} in ${fileName}: ${current} -> ${op.new} (${op.reason})`);
            if (!dryRun) byId[op.osid] = op.new;
            fileChanged = true;
            changed += 1;
        }

        if (fileChanged) {
            // Rebuild counts deterministically from the current map.
            const newCounts = recountControllers(byId);
            if (data.meta && data.meta.counts) {
                const oldCounts = data.meta.counts;
                log.push(`  COUNTS ${fileName}: RS ${oldCounts.RS}->${newCounts.RS}, RBiH ${oldCounts.RBiH}->${newCounts.RBiH}, HRHB ${oldCounts.HRHB}->${newCounts.HRHB}`);
                if (!dryRun) data.meta.counts = newCounts;
            }
            if (!dryRun) writeJson(fp, data);
        }
    }

    console.log(`painted_target_anomaly_fix${dryRun ? ' (DRY RUN)' : ''}:`);
    for (const line of log) console.log(line);
    console.log('');
    console.log(`Summary: ${changed} changed, ${alreadyCorrect} already-correct, ${failed} failed`);

    if (failed > 0) process.exit(1);
}

main();
