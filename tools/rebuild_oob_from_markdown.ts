import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
    'RBiH': 'docs/knowledge/ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md',
    'RS': 'docs/knowledge/VRS_APPENDIX_G_FULL_UNIT_LIST.md',
    'HRHB': 'docs/knowledge/HVO_FULL_UNIT_LIST.md'
};
const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');
const MUN_REGISTRY_PATH = path.join(ROOT, 'data/source/municipalities_1990_registry_110.json');

// --- Load Registry ---
const registry = JSON.parse(fs.readFileSync(MUN_REGISTRY_PATH, 'utf-8'));
const nameToMunId: Record<string, string> = {};
for (const row of registry.rows) {
    nameToMunId[row.name.toLowerCase()] = row.mun1990_id;
    nameToMunId[row.normalized_name.toLowerCase()] = row.mun1990_id;
    nameToMunId[row.mun1990_id] = row.mun1990_id;
}

// --- Mappings ---
// Shared special mappings for all factions
const SPECIAL_MAPPINGS: Record<string, string> = {
    'sarajevo': 'centar_sarajevo',
    'sarajevo–mojmilo': 'novi_grad_sarajevo',
    'sarajevo–stup': 'ilidza',
    'sarajevo–kosevo': 'centar_sarajevo',
    'sarajevo–zuc hill': 'novi_grad_sarajevo',
    'sarajevo–rajlovac': 'novi_grad_sarajevo',
    'sarajevo–bistrik': 'stari_grad_sarajevo',
    'sarajevo–dobrinja': 'novi_grad_sarajevo',
    'lukavica': 'novo_sarajevo',
    'pale': 'pale',
    'vogosca': 'vogosca',
    'ilidza': 'ilidza',
    'hadzici': 'hadzici',
    'han pijesak': 'han_pijesak',
    'sokolac': 'sokolac',
    'celic': 'lopare',
    'teocak': 'ugljevik',
    'sapna': 'zvornik',
    'gornji rahic': 'brcko',
    'pazaric': 'hadzici',
    'tarcin': 'hadzici',
    'hrasnica': 'ilidza',
    'bilalovac': 'kiseljak',
    'vasin han': 'stari_grad_sarajevo',
    'dreznica': 'mostar',
    'bijelimici': 'konjic',
    'sturlica': 'cazin',
    'rostovo': 'bugojno',
    'donje vukovije': 'kalesija',
    'vitalj': 'kladanj',
    'stupari': 'kladanj',
    'bijelo polje': 'mostar',
    'blagaj': 'mostar',
    'zepce': 'zepce',
    'zavidovici': 'zavidovici',
    'maglaj': 'maglaj',
    'tesanj': 'tesanj',
    'doboj': 'doboj',
    'drvar': 'titov_drvar',
    'knezevo': 'skender_vakuf',
    'srbobran': 'donji_vakuf',
    'bosansko petrovo selo': 'gracanica', // Petrovo was part of Gracanica/Doboj
    'petrovo': 'gracanica'
};

const CORPS_MAP: Record<string, string> = {
    // RBiH
    '1st': 'arbih_1st_corps',
    '2nd': 'arbih_2nd_corps',
    '3rd': 'arbih_3rd_corps',
    '4th': 'arbih_4th_corps',
    '5th': 'arbih_5th_corps',
    '6th': 'arbih_6th_corps',
    '7th': 'arbih_7th_corps',
    '28th Ind': 'arbih_2nd_corps',
    '81st Ind': 'arbih_1st_corps',
    'General Staff': 'arbih_1st_corps',

    // VRS
    '1st Krajina': 'vrs_1st_krajina',
    '2nd Krajina': 'vrs_2nd_krajina',
    'East Bosnian': 'vrs_east_bosnian',
    'Sarajevo-Romanija': 'vrs_sarajevo_romanija',
    'Drina': 'vrs_drina',
    'Herzegovina': 'vrs_herzegovina',
    'Main Staff': 'vrs_main_staff', // Need to check if valid corps ID

    // HVO (OZ)
    'Southeast Herzegovina': 'hvo_herzegovina',
    'Central Bosnia': 'hvo_central_bosnia',
    'Northwest Bosnia': 'hvo_northwest_bosnia',
    'Tomislavgrad': 'hvo_tomislavgrad'
};

// --- Helpers ---

function normalizeName(n: string): string {
    return n.replace(/\*/g, '').trim();
}

function generateId(faction: string, name: string): string {
    // e.g. "1st Mountain" -> "arbih_1st_mountain"
    let prefix = faction.toLowerCase();
    if (prefix === 'rbih') prefix = 'arbih';

    let clean = normalizeName(name)
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

    return `${prefix}_${clean}`;
}

// --- Parsing Logic ---

function parseMarkdown(filePath: string, faction: string): any[] {
    const fullPath = path.join(ROOT, filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    let inTable = false;
    let units: any[] = [];
    const seenIds = new Set<string>();

    for (const line of lines) {
        // Find Table Start
        if (line.includes('| Brigade') || line.includes('| Unit')) { // HVO uses "Brigade / unit"
            inTable = true;
            continue;
        }

        // Handle End of Table
        if (line.trim() === '' || line.startsWith('#') || line.startsWith('Note:')) {
            if (inTable && !line.startsWith('|')) inTable = false;
        }

        if (!inTable) continue;
        if (line.includes('---')) continue;
        if (!line.trim().startsWith('|')) continue;

        const cols = line.split('|').map(s => s.trim()).filter(s => s !== '');
        if (cols.length < 4) continue; // Expect Name | Corps/OZ | Mun | HQ

        const nameRaw = normalizeName(cols[0]);
        const corpsRaw = cols[1];
        const munRaw = cols[2];
        const hqRaw = cols[3];

        // Unique ID
        let id = generateId(faction, nameRaw);

        // Handle duplicates explicitly in source (e.g. 1st Banja Luka Light vs 2nd)
        if (seenIds.has(id)) {
            // Check if name has numbers to distinguish. If literal name is identical, append suffix
            let extra = 2;
            while (seenIds.has(id + '_' + extra)) { extra++; }
            id = id + '_' + extra;
        }
        seenIds.add(id);

        // Resolve Corps
        let subordinateTo = null;
        for (const k in CORPS_MAP) {
            if (corpsRaw.includes(k)) {
                subordinateTo = CORPS_MAP[k];
                break;
            }
        }
        // Fallback for HVO "Under ARBiH"
        if (!subordinateTo && corpsRaw.includes('ARBiH')) {
            if (corpsRaw.includes('2nd')) subordinateTo = 'arbih_2nd_corps';
        }

        // Resolve Location
        let munId = null;
        let homeSettlement = hqRaw.replace(/\(.*\)/, '').replace('settlement', '').trim();
        if (homeSettlement.includes('–')) {
            homeSettlement = homeSettlement.split('–').pop()!.trim();
        }

        const munLower = munRaw.toLowerCase().replace(/\(.*\)/, '').replace(/\*/g, '').trim();
        // Try direct mun match
        if (nameToMunId[munLower]) munId = nameToMunId[munLower];
        else if (SPECIAL_MAPPINGS[munLower]) munId = SPECIAL_MAPPINGS[munLower];

        // Try HQ match if mun failed
        if (!munId) {
            const hqLower = hqRaw.toLowerCase().replace(/\(.*\)/, '').replace('settlement', '').trim();
            if (nameToMunId[hqLower]) munId = nameToMunId[hqLower];
            else if (SPECIAL_MAPPINGS[hqLower]) munId = SPECIAL_MAPPINGS[hqLower];
        }

        units.push({
            id: id,
            faction: faction,
            name: nameRaw,
            home_mun: munId,
            home_settlement: homeSettlement,
            subordinate_to: subordinateTo,
            kind: 'brigade',
            source: 'markdown_rebuild'
        });
    }
    console.log(`Parsed ${units.length} units for ${faction}`);
    return units;
}

// --- Main Execution ---

console.log('--- Rebuilding OOB from Markdown ---');

const allBrigades: any[] = [];

for (const [faction, file] of Object.entries(FILES)) {
    const units = parseMarkdown(file, faction);
    allBrigades.push(...units);
}

const wrapper = {
    awwv_meta: {
        role: "oob_brigades",
        source: "Rebuilt from docs/knowledge Markdown appendices",
        rule: "Strict alignment with Appendix H (RBiH), Appendix G (RS), and HVO Master List.",
        generated_at: new Date().toISOString()
    },
    brigades: allBrigades
};

fs.writeFileSync(OOB_PATH, JSON.stringify(wrapper, null, 2));
console.log(`Rebuilt OOB with ${allBrigades.length} brigades.`);
console.log(`Saved to ${OOB_PATH}`);
