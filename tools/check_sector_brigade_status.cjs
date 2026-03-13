/**
 * Diagnostic: check all sectors for inactive/destroyed/disbanded brigades.
 *
 * Usage: node tools/check_sector_brigade_status.cjs <run_directory>
 *   e.g. node tools/check_sector_brigade_status.cjs runs/2026-03-12_n620_abc123
 */
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) {
    console.error('Usage: node tools/check_sector_brigade_status.cjs <run_directory>');
    process.exit(1);
}

const savePath = path.join(runDir, 'final_save.json');
if (!fs.existsSync(savePath)) {
    console.error(`File not found: ${savePath}`);
    process.exit(1);
}

const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const formations = save.military?.formations ?? {};
const sectorsByFaction = save.military?.corps_front_sectors ?? {};

let totalViolations = 0;
let totalChecked = 0;

for (const [factionId, sectors] of Object.entries(sectorsByFaction).sort()) {
    if (!Array.isArray(sectors)) continue;
    for (const sec of sectors) {
        const allBids = [
            ...(sec.assigned_brigade_ids || []),
            ...(sec.reserve_brigade_ids || []),
        ].sort();

        for (const bid of allBids) {
            totalChecked++;
            const f = formations[bid];
            if (!f) {
                console.error(`VIOLATION: ${bid} in ${sec.sector_id} — formation not found`);
                totalViolations++;
                continue;
            }
            if (f.status !== 'active') {
                console.error(`VIOLATION: ${bid} in ${sec.sector_id} — status='${f.status}'`);
                totalViolations++;
            }
            if (f.lifecycle_status === 'destroyed' || f.lifecycle_status === 'disbanded') {
                console.error(`VIOLATION: ${bid} in ${sec.sector_id} — lifecycle_status='${f.lifecycle_status}'`);
                totalViolations++;
            }
        }
    }
}

console.log(`\nChecked ${totalChecked} brigade-sector assignments across all factions.`);
if (totalViolations === 0) {
    console.log('PASS: No inactive/dissolved brigades found in any sector.');
} else {
    console.log(`FAIL: ${totalViolations} violation(s) found.`);
    process.exit(1);
}
