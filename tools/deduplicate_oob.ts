import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');

// MAPPING: SOURCE (Early War) -> TARGET (Late War)
// Validated against data/source/oob_brigades.json content
const MERGE_MAP: Record<string, string> = {
    // 2nd Corps (Tuzla)
    'arbih_1st_tuzla': 'arbih_250th_liberation', // Found via grep
    'arbih_3rd_tuzla': 'arbih_252nd_slavna_mountain', // Found via grep
    // 'arbih_2nd_tuzla': 'arbih_251st_light', // Not found in grep. Keeping 2nd Tuzla as unique for now.

    // 1st Corps (Sarajevo)
    // 1st Motorized -> 101st Mountain? 
    // In OOB we have "101st Mountain" (arbih_101st_mountain).
    // History: 1st Mot Bde formed 1992. Renamed 101st Mot in 1993. Later 101st Mtn (1994?).
    // So 1st Mot -> 101st Mountain (as the placeholder for that unit lineage)
    'arbih_1st_motorized': 'arbih_101st_mountain',

    // 2nd Motorized -> 102nd Motorized
    'arbih_2nd_motorized': 'arbih_102nd_motorized',

    // 15th Motorized -> 105th Motorized
    'arbih_15th_motorized': 'arbih_105th_motorized',

    // 1st Mountain? 
    // Is there a 105th Mountain? No. 
    // 1st Mountain (Caco) was disbanded. It does NOT map to a late war unit in this list. 
    // So we keep 1st Mountain.
};

console.log('--- Deduplicating OOB (Round 2) ---');

const oobData = JSON.parse(fs.readFileSync(OOB_PATH, 'utf-8'));
let brigades = oobData.brigades;
const originalCount = brigades.length;

// Map for quick lookup
const brigadeMap = new Map<string, any>();
for (const b of brigades) {
    brigadeMap.set(b.id, b);
}

const toRemove = new Set<string>();

for (const [sourceId, targetId] of Object.entries(MERGE_MAP)) {
    const source = brigadeMap.get(sourceId);
    const target = brigadeMap.get(targetId);

    if (source && target) {
        console.log(`Merging ${sourceId} -> ${targetId}`);
        // Transfer historical name
        target.name_1992 = source.name;
        // Transfer location if missing
        if (!target.home_settlement && source.home_settlement) target.home_settlement = source.home_settlement;
        if (!target.home_mun && source.home_mun) target.home_mun = source.home_mun;

        // Mark source for removal
        toRemove.add(sourceId);
    } else {
        if (!source) console.warn(`Source ${sourceId} not found.`);
        if (!target) console.warn(`Target ${targetId} not found.`);
    }
}

// Filter
oobData.brigades = brigades.filter((b: any) => !toRemove.has(b.id));

fs.writeFileSync(OOB_PATH, JSON.stringify(oobData, null, 2));
console.log(`Deduplication complete. Removed ${toRemove.size} duplicates.`);
console.log(`Final Count: ${oobData.brigades.length}`);
