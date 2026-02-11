
import * as fs from 'fs';
import * as path from 'path';

const ROOT = 'c:/Users/User/OneDrive - United Nations Development Programme/Documents/Personal/Wargame/AWWV';
const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');
const MAP_DATA_PATH = path.join(ROOT, 'data/derived/settlements_a1_viewer.geojson');

console.log('--- Fixing OOB Settlement Locations ---');

// 1. Load Valid Settlements (Name -> SID)
const mapData = JSON.parse(fs.readFileSync(MAP_DATA_PATH, 'utf-8'));
const nameToSid = new Map<string, string>();
// const nameToMun = new Map<string, string>(); // removed unused

for (const f of mapData.features) {
    if (f.properties.name) {
        nameToSid.set(f.properties.name.toLowerCase(), f.properties.sid); // Normalized lookup
        nameToSid.set(f.properties.name, f.properties.sid);

        // if (f.properties.municipality) {
        //      nameToMun.set(f.properties.name.toLowerCase(), f.properties.municipality);
        // }
    }
}

// 2. Define Fix Map (Bad Name -> Good Name OR Object with mun override)
const FIX_MAP: Record<string, { name: string, mun?: string }> = {
    // Sarajevo Neighborhoods
    'Sarajevo': { name: 'Sarajevo Dio - Centar Sajarevo', mun: 'centar_sarajevo' }, // Default "Sarajevo" to Centar
    'Centar Sarajevo': { name: 'Sarajevo Dio - Centar Sajarevo', mun: 'centar_sarajevo' },
    'Stari Grad Sarajevo': { name: 'Sarajevo Dio - Stari Grad Sarajevo', mun: 'stari_grad_sarajevo' },
    'Novi Grad Sarajevo': { name: 'Sarajevo Dio - Novi Grad Sarajevo', mun: 'novi_grad_sarajevo' },
    'Novo Sarajevo': { name: 'Sarajevo Dio - Novo Sarajevo', mun: 'novo_sarajevo' },
    'Ilidza': { name: 'Sarajevo Dio - Ilidža', mun: 'ilidza' },
    'Ilidža': { name: 'Sarajevo Dio - Ilidža', mun: 'ilidza' }, // Fix diacritic match

    'Mojmilo': { name: 'Sarajevo Dio - Novi Grad Sarajevo', mun: 'novi_grad_sarajevo' },
    'Stup': { name: 'Sarajevo Dio - Ilidža', mun: 'ilidza' },
    'Kosevo': { name: 'Sarajevo Dio - Centar Sajarevo', mun: 'centar_sarajevo' },
    'Zuc Hill': { name: 'Sarajevo Dio - Novi Grad Sarajevo', mun: 'novi_grad_sarajevo' },
    'Rajlovac': { name: 'Sarajevo Dio - Novi Grad Sarajevo', mun: 'novi_grad_sarajevo' },
    'Bistrik': { name: 'Sarajevo Dio - Stari Grad Sarajevo', mun: 'stari_grad_sarajevo' },
    'Vasin Han': { name: 'Sarajevo Dio - Stari Grad Sarajevo', mun: 'stari_grad_sarajevo' },

    // Other Towns
    'Pazaric': { name: 'Pazarić', mun: 'hadzici' }, // Diacritic fix
    'Kalesija': { name: 'Kalesija Grad', mun: 'kalesija' }, // From settlement_names search

    'Srbobran': { name: 'Donji Vakuf', mun: 'donji_vakuf' },
    'Petrovac': { name: 'Bosanski Petrovac', mun: 'bosanski_petrovac' },

    'Gornji Rahic': { name: 'Gornji Rahić', mun: 'brcko' },
    'Celic': { name: 'Čelić', mun: 'lopare' },
    'Dreznica': { name: 'Donja Drežnica', mun: 'mostar' },
    'Bijelimici': { name: 'Odzaci', mun: 'konjic' }, // Fixed: Map to Odzaci (central village) as Bjelimici is region
    'Buzim': { name: 'Bužim', mun: 'bosanska_krupa' },
    'Sturlica': { name: 'Šturlić', mun: 'cazin' },
    'Rostovo': { name: 'Bugojno', mun: 'bugojno' }, // Fixed: Map to nearby town
    'Gornji Vakuf': { name: 'Gornji Vakuf-Uskoplje', mun: 'gornji_vakuf' }, // Fixed: Valid map name
    'Vitalj': { name: 'Kladanj', mun: 'kladanj' }, // Fixed: Map to nearby town
    'Donje Vukovije': { name: 'Vukovije Donje', mun: 'kalesija' },
    'Bosanska Gradiška': { name: 'Gradiska', mun: 'bosanska_gradiska' }, // Fixed
    'Gradiška': { name: 'Gradiska', mun: 'bosanska_gradiska' }, // Fixed
    'Smoluca': { name: 'Smoluca Donja', mun: 'lukavac' }, // Fixed

    'Novigrad': { name: 'Novi Grad', mun: 'bosanski_novi' },
    'Bosanski Novi': { name: 'Novi Grad', mun: 'bosanski_novi' }, // Fixed: Municipality -> Settlement

    'Bosansko Petrovo Selo': { name: 'Petrovo Selo', mun: 'gracanica' },
    'Ripac': { name: 'Ripač', mun: 'bihac' },
    'Manjača': { name: 'Stričići', mun: 'banja_luka' },
    'Mount Zep': { name: 'Han Pijesak', mun: 'han_pijesak' },
    'Posavina': { name: 'Orašje', mun: 'orasje' },
    'Tomislavgrad—Posušje battalion, Kupres battalion': { name: 'Tomislavgrad', mun: 'duvno' },
    'Novi Travnik area': { name: 'Novi Travnik', mun: 'novi_travnik' },
};

// 3. Fix Logic
const oobData = JSON.parse(fs.readFileSync(OOB_PATH, 'utf-8'));
let changes = 0;

for (const b of oobData.brigades) {
    if (!b.home_settlement) continue;

    const original = b.home_settlement.trim();

    // Check direct fix
    if (FIX_MAP[original]) {
        const fix = FIX_MAP[original];
        if (b.home_settlement !== fix.name) {
            console.log(`Fixing "${original}" -> "${fix.name}"`);
            b.home_settlement = fix.name;
            if (fix.mun) b.home_mun = fix.mun;
            changes++;
        }
    }
}

fs.writeFileSync(OOB_PATH, JSON.stringify(oobData, null, 2));
console.log(`Applied ${changes} location fixes.`);
