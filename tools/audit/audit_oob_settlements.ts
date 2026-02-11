import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');
const MAP_DATA_PATH = path.join(ROOT, 'data/derived/settlements_a1_viewer.geojson');

console.log('--- Auditing OOB Settlement Locations ---');

// 1. Load Valid Settlements
const mapData = JSON.parse(fs.readFileSync(MAP_DATA_PATH, 'utf-8'));
const validSettlements = new Set<string>();
const validSettlementsLower = new Map<string, string>(); // lower -> original

for (const f of mapData.features) {
    if (f.properties.name) {
        validSettlements.add(f.properties.name);
        validSettlementsLower.set(f.properties.name.toLowerCase(), f.properties.name);
    }
}

console.log(`Loaded ${validSettlements.size} valid settlements from Map Data.`);

// 2. Audit OOB
const oobData = JSON.parse(fs.readFileSync(OOB_PATH, 'utf-8'));
const brigades = oobData.brigades;

const unknownSettlements = new Map<string, number>();
const caseMismatches = new Map<string, string>(); // OOB -> Map

for (const b of brigades) {
    if (!b.home_settlement) continue;

    const loc = b.home_settlement.trim();
    if (validSettlements.has(loc)) continue;

    // Check case
    const lower = loc.toLowerCase();
    if (validSettlementsLower.has(lower)) {
        caseMismatches.set(loc, validSettlementsLower.get(lower)!);
    } else {
        // Unknown
        const count = unknownSettlements.get(loc) || 0;
        unknownSettlements.set(loc, count + 1);
    }
}

// 3. Report
console.log('\n--- Case Mismatches (Fixable) ---');
for (const [bad, good] of caseMismatches) {
    console.log(`"${bad}" -> "${good}"`);
}

console.log('\n--- Unknown Settlements (Need Mapping) ---');
const sortedUnknown = Array.from(unknownSettlements.entries()).sort((a, b) => b[1] - a[1]);
for (const [name, count] of sortedUnknown) {
    console.log(`${count}x "${name}"`);
}

// Write to list for processing
if (sortedUnknown.length > 0) {
    const outPath = path.join(ROOT, 'data/audit_unknown_settlements.json');
    fs.writeFileSync(outPath, JSON.stringify(sortedUnknown, null, 2));
    console.log(`\nWritten list to ${outPath}`);
}
