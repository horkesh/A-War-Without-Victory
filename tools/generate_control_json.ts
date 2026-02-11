
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SCENARIOS_DIR = path.join(DATA_DIR, 'scenarios');
const CONTROL_EXPORT_PATH = path.join(SCENARIOS_DIR, 'initial_control/control_export.json');
const SETTLEMENTS_VIEWER_PATH = path.join(DATA_DIR, 'derived/settlements_a1_viewer.geojson');
const SETTLEMENTS_INDEX_PATH = path.join(DATA_DIR, 'derived/settlements_index.json');
const MUN_NAMES_PATH = path.join(DATA_DIR, 'derived/mun1990_names.json');
const OUTPUT_PATH = path.join(SCENARIOS_DIR, 'jan_93/control.json');

// Ensure output dir exists
if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
}

console.log('Loading data...');
const controlExport = JSON.parse(fs.readFileSync(CONTROL_EXPORT_PATH, 'utf-8'));
const settlementsViewer = JSON.parse(fs.readFileSync(SETTLEMENTS_VIEWER_PATH, 'utf-8'));
const settlementsIndex = JSON.parse(fs.readFileSync(SETTLEMENTS_INDEX_PATH, 'utf-8'));
const munNames = JSON.parse(fs.readFileSync(MUN_NAMES_PATH, 'utf-8'));

console.log('Building lookups...');

// 1. Map source_id -> mun_code
const sourceIdToMunCode: Record<string, string> = {};
for (const settlement of settlementsIndex.settlements) {
    // settlement.sid is "mun_code:source_id"
    // settlement.source_id is "230561" (string or number?)
    // In file snippet: "source_id": "230561" (string)
    sourceIdToMunCode[settlement.source_id] = settlement.mun_code;
}

// 2. Map mun_code -> mun1990_id (slug)
const munCodeToSlug: Record<string, string> = {};
const MunIdMap = munNames.by_municipality_id || {};
for (const [munCode, data] of Object.entries(MunIdMap)) {
    munCodeToSlug[munCode] = (data as any).mun1990_id;
}

// 3. Generate Control
const controlData: Record<string, string> = {};
let count = 0;
let overrideCount = 0;
let baseCount = 0;
let missingMunCount = 0;
let missingControllerCount = 0;

console.log('Processing settlements...');

for (const feature of settlementsViewer.features) {
    const sid = feature.properties.sid; // e.g. "S100013"

    // Check override first
    if (controlExport.controllers_by_sid && controlExport.controllers_by_sid[sid]) {
        controlData[sid] = controlExport.controllers_by_sid[sid];
        overrideCount++;
        count++;
        continue;
    }

    // Resolve base
    // sid is "S" + source_id
    const sourceId = sid.substring(1);
    const munCode = sourceIdToMunCode[sourceId];

    if (!munCode) {
        console.warn(`No mun_code found for SID ${sid} (SourceID ${sourceId})`);
        missingMunCount++;
        continue;
    }

    const munSlug = munCodeToSlug[munCode];
    if (!munSlug) {
        console.warn(`No mun1990_id slug found for MunCode ${munCode} (SID ${sid})`);
        missingMunCount++;
        continue;
    }

    const controller = controlExport.controllers_by_mun1990_id[munSlug];
    if (controller) {
        controlData[sid] = controller;
        baseCount++;
        count++;
    } else {
        // console.warn(`No controller defined for municipality ${munSlug} (SID ${sid})`);
        missingControllerCount++;
    }
}

const output = {
    meta: {
        generated_at: new Date().toISOString(),
        source_export: "control_export.json",
        stats: {
            total_settlements: count,
            overrides: overrideCount,
            inherited: baseCount,
            missing_mapping: missingMunCount,
            missing_controller: missingControllerCount
        }
    },
    by_settlement_id: controlData,
    control_status_by_settlement_id: {}
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`Wrote control.json to ${OUTPUT_PATH}`);
console.log('Stats:', output.meta.stats);
