import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MD_PATH = path.join(ROOT, 'docs/knowledge/ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md');
const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');
const MUN_REGISTRY_PATH = path.join(ROOT, 'data/source/municipalities_1990_registry_110.json');

console.log(`Reading from: ${MD_PATH}`);

// Load Registry
const registry = JSON.parse(fs.readFileSync(MUN_REGISTRY_PATH, 'utf-8'));
const nameToMunId: Record<string, string> = {};
for (const row of registry.rows) {
    nameToMunId[row.name.toLowerCase()] = row.mun1990_id;
    nameToMunId[row.normalized_name.toLowerCase()] = row.mun1990_id;
    nameToMunId[row.mun1990_id] = row.mun1990_id;
}

// Special mappings
const SPECIAL_MAPPINGS: Record<string, string> = {
    'sarajevo': 'centar_sarajevo',
    'sarajevo–mojmilo': 'novi_grad_sarajevo',
    'sarajevo–stup': 'ilidza',
    'sarajevo–kosevo': 'centar_sarajevo',
    'sarajevo–zuc hill': 'novi_grad_sarajevo',
    'sarajevo–rajlovac': 'novi_grad_sarajevo',
    'sarajevo–bistrik': 'stari_grad_sarajevo',
    'sarajevo–dobrinja': 'novi_grad_sarajevo',
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
    'doboj': 'doboj'
};

const CORPS_MAP: Record<string, string> = {
    '1st': 'arbih_1st_corps',
    '2nd': 'arbih_2nd_corps',
    '3rd': 'arbih_3rd_corps',
    '4th': 'arbih_4th_corps',
    '5th': 'arbih_5th_corps',
    '6th': 'arbih_4th_corps',
    '7th': 'arbih_3rd_corps',
    '28th Ind': 'arbih_2nd_corps',
    '81st Ind': 'arbih_1st_corps',
    'General Staff': 'arbih_1st_corps'
};

function normalizeName(n: string): string {
    // Remove asterisks and trim
    return n.replace(/\*/g, '').trim();
}

function generateId(name: string): string {
    // e.g. "1st Mountain" -> "arbih_1st_mountain"
    // "105th Motorized" -> "arbih_105th_motorized"
    let clean = normalizeName(name)
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    return `arbih_${clean}`;
}

const mdContent = fs.readFileSync(MD_PATH, 'utf-8');
const oobData = JSON.parse(fs.readFileSync(OOB_PATH, 'utf-8'));
const existingIds = new Set(oobData.brigades.map((b: any) => b.id));

const lines = mdContent.split('\n');
let inTable = false;
let newCount = 0;
let newBrigades: any[] = [];

for (const line of lines) {
    // Detect table start
    if (line.includes('| Brigade | Corps | Municipality |')) {
        inTable = true;
        continue;
    }
    // Detect table end or break
    if (line.trim() === '' || line.startsWith('#') || line.startsWith('Note:')) {
        if (inTable && !line.startsWith('|')) inTable = false;
    }
    if (!inTable) continue;
    if (line.includes('---')) continue;
    if (!line.trim().startsWith('|')) continue;

    const cols = line.split('|').map(s => s.trim()).filter(s => s !== '');
    if (cols.length < 4) continue;

    const nameRaw = cols[0];
    const corpsRaw = cols[1];
    const munRaw = cols[2];
    const hqRaw = cols[3];

    const id = generateId(nameRaw);

    if (existingIds.has(id)) {
        continue;
    }

    // Resolvers
    let corpsId = 'arbih_1st_corps';
    for (const k in CORPS_MAP) {
        if (corpsRaw.includes(k)) {
            corpsId = CORPS_MAP[k];
            break;
        }
    }

    let munId = null;
    // Try mapping mun name
    const munLower = munRaw.toLowerCase().replace(/\(.*\)/, '').replace('*', '').trim();
    if (nameToMunId[munLower]) munId = nameToMunId[munLower];
    else if (SPECIAL_MAPPINGS[munLower]) munId = SPECIAL_MAPPINGS[munLower];

    // Try Fallback to HQ if mun failed
    if (!munId) {
        const hqLower = hqRaw.toLowerCase().replace(/\(.*\)/, '').replace('settlement', '').trim();
        if (nameToMunId[hqLower]) munId = nameToMunId[hqLower];
        else if (SPECIAL_MAPPINGS[hqLower]) munId = SPECIAL_MAPPINGS[hqLower];
    }

    // Clean Settlement Name (create human readable string)
    let settlementDisplay = hqRaw.replace(/\(.*\)/, '').replace('settlement', '').trim();
    if (settlementDisplay.includes('–')) {
        const parts = settlementDisplay.split('–');
        settlementDisplay = parts[parts.length - 1].trim();
    }

    const newBrigade = {
        id: id,
        faction: 'RBiH',
        name: normalizeName(nameRaw),
        home_mun: munId,
        home_settlement: settlementDisplay,
        corps: corpsId,
        kind: 'brigade',
        source: 'appendix_h_enrichment'
    };

    newBrigades.push(newBrigade);
    existingIds.add(id);
    newCount++;
}

console.log(`Identifying ${newCount} NEW brigades from Markdown.`);
oobData.brigades.push(...newBrigades);

const outStr = JSON.stringify(oobData, null, 2);
fs.writeFileSync(OOB_PATH, outStr);
console.log('Done.');
