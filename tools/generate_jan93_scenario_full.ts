
import * as fs from 'fs';
import * as path from 'path';

const ROOT = 'c:/Users/User/OneDrive - United Nations Development Programme/Documents/Personal/Wargame/AWWV';
const SETTLEMENTS_PATH = path.join(ROOT, 'data/derived/settlements_a1_viewer.geojson');
const CONTROL_PATH = path.join(ROOT, 'data/scenarios/jan_93/control.json');
const INITIAL_FORMATIONS_PATH = path.join(ROOT, 'data/scenarios/initial_formations/initial_formations_jan1993.json');
const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');
const OUT_PATH = path.join(ROOT, 'data/scenarios/jan1993_start.json');

console.log('Generating full Jan 93 scenario...');

// Load Data
const settlements = JSON.parse(fs.readFileSync(SETTLEMENTS_PATH, 'utf-8')).features;
const control = JSON.parse(fs.readFileSync(CONTROL_PATH, 'utf-8')).political_controllers || JSON.parse(fs.readFileSync(CONTROL_PATH, 'utf-8')).by_settlement_id;
const initialFormations = JSON.parse(fs.readFileSync(INITIAL_FORMATIONS_PATH, 'utf-8')).formations;
const oobMaster = JSON.parse(fs.readFileSync(OOB_PATH, 'utf-8')).brigades;

// Name to SID Map
const nameToSid = new Map<string, string>();
for (const f of settlements) {
    if (f.properties.name) nameToSid.set(f.properties.name.toLowerCase(), f.properties.sid);
}

// Map Initial Formations
const formationsObj: Record<string, any> = {};
const initialIds = new Set<string>();

// 1. Add existing curated formations
initialFormations.forEach((f: any) => {
    initialIds.add(f.id);
    const master = oobMaster.find((m: any) => m.id === f.id);

    // Enrich location
    let hq_sid = f.hq_sid;
    let municipalityId = f.municipalityId;
    let homeSettlement = master ? master.home_settlement : null;

    if (!hq_sid && homeSettlement) {
        if (homeSettlement.startsWith('S')) {
            hq_sid = homeSettlement;
        } else {
            const sid = nameToSid.get(homeSettlement.toLowerCase());
            if (sid) hq_sid = sid;
        }
    }

    if (!municipalityId && master) {
        municipalityId = master.home_mun;
    }

    formationsObj[f.id] = {
        ...f,
        hq_sid: hq_sid,
        municipalityId: municipalityId,
        tags: (f.tags || []).concat(municipalityId ? ['mun:' + municipalityId] : [])
    };
});

// 2. Add missing RBiH brigades from OOB Master
let addedCount = 0;
oobMaster.forEach((m: any) => {
    if (m.faction === 'RBiH' && !initialIds.has(m.id)) {
        // Resolve location
        let hq_sid = null;
        if (m.home_settlement) {
            const sid = nameToSid.get(m.home_settlement.toLowerCase());
            if (sid) hq_sid = sid;
        }

        // Add to scenario
        let name = m.name;
        if (m.name_1992) {
            name = m.name_1992;
        }

        formationsObj[m.id] = {
            id: m.id,
            faction: m.faction,
            name: name,
            kind: 'brigade',
            readiness: 'active', // Assume active if missing data
            cohesion: 100,
            status: 'active',
            created_turn: 0,
            hq_sid: hq_sid,
            municipalityId: m.home_mun,
            tags: m.home_mun ? ['mun:' + m.home_mun] : []
        };
        addedCount++;
    }
});

console.log(`Added ${addedCount} MISSING RBiH brigades from Master OOB.`);

// Output
const output = {
    meta: {
        turn: 70,
        date: '1993-01-01',
        phase: 'January 1993',
        description: 'Start of 1993 Scenario (Enriched)'
    },
    formations: formationsObj,
    political_controllers: control,
    militia_pools: {},
    contested_control: {}
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log('Generated jan1993_start.json with ' + Object.keys(formationsObj).length + ' formations.');
