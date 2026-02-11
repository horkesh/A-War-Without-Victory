
import * as fs from 'fs';
import * as path from 'path';

const ROOT = 'c:/Users/User/OneDrive - United Nations Development Programme/Documents/Personal/Wargame/AWWV';
const OOB_PATH = path.join(ROOT, 'data/source/oob_brigades.json');

// Define the missing units directly
const HISTORICAL_UNITS = [
    // --- ARBiH 1st Corps ---
    { id: 'arbih_1st_mountain', name: '1st Mountain Brigade', faction: 'RBiH', home_settlement: 'Stari Grad Sarajevo', home_mun: 'stari_grad_sarajevo', corps: 'arbih_1st_corps' },
    { id: 'arbih_2nd_mountain', name: '2nd Mountain Brigade', faction: 'RBiH', home_settlement: 'Stari Grad Sarajevo', home_mun: 'stari_grad_sarajevo', corps: 'arbih_1st_corps' },
    { id: 'arbih_10th_mountain', name: '10th Mountain Brigade', faction: 'RBiH', home_settlement: 'Stari Grad Sarajevo', home_mun: 'stari_grad_sarajevo', corps: 'arbih_1st_corps' },
    { id: 'arbih_1st_motorized', name: '1st Motorized Brigade', faction: 'RBiH', home_settlement: 'Sarajevo', home_mun: 'centar_sarajevo', corps: 'arbih_1st_corps' },
    { id: 'arbih_2nd_motorized', name: '2nd Motorized Brigade', faction: 'RBiH', home_settlement: 'Sarajevo', home_mun: 'centar_sarajevo', corps: 'arbih_1st_corps' },
    { id: 'arbih_15th_motorized', name: '15th Motorized Brigade', faction: 'RBiH', home_settlement: 'Sarajevo', home_mun: 'novi_grad_sarajevo', corps: 'arbih_1st_corps' },
    { id: 'arbih_hvo_kralj_tvrtko', name: 'HVO Brigade "Kralj Tvrtko"', faction: 'RBiH', home_settlement: 'Sarajevo', home_mun: 'centar_sarajevo', corps: 'arbih_1st_corps' }, // Aligned with ARBiH 1st

    // --- ARBiH 2nd Corps ---
    { id: 'arbih_1st_tuzla', name: '1st Tuzla Brigade', faction: 'RBiH', home_settlement: 'Tuzla', home_mun: 'tuzla', corps: 'arbih_2nd_corps' },
    { id: 'arbih_2nd_tuzla', name: '2nd Tuzla Brigade', faction: 'RBiH', home_settlement: 'Tuzla', home_mun: 'tuzla', corps: 'arbih_2nd_corps' },
    { id: 'arbih_3rd_tuzla', name: '3rd Tuzla Brigade', faction: 'RBiH', home_settlement: 'Tuzla', home_mun: 'tuzla', corps: 'arbih_2nd_corps' },
    { id: 'arbih_1st_olovo', name: '1st Olovo Brigade', faction: 'RBiH', home_settlement: 'Olovo', home_mun: 'olovo', corps: 'arbih_2nd_corps' },
    { id: 'arbih_116th_mountain', name: '116th Mountain Brigade', faction: 'RBiH', home_settlement: 'Živinice', home_mun: 'zivinice', corps: 'arbih_2nd_corps' },
    { id: 'arbih_285th_light', name: '285th Light Brigade', faction: 'RBiH', home_settlement: 'Žepa', home_mun: 'rogatica', corps: 'arbih_2nd_corps' },
    { id: 'arbih_1st_cerska', name: '1st Cerska Brigade', faction: 'RBiH', home_settlement: 'Cerska', home_mun: 'vlasenica', corps: 'arbih_2nd_corps' },
    { id: 'arbih_1st_kamenica', name: '1st Kamenica Brigade', faction: 'RBiH', home_settlement: 'Kamenica', home_mun: 'zvornik', corps: 'arbih_2nd_corps' },

    // --- HVO Central Bosnia ---
    { id: 'hvo_eugen_kvaternik', name: 'Brigade "Eugen Kvaternik"', faction: 'HRHB', home_settlement: 'Bugojno', home_mun: 'bugojno', corps: 'hvo_central_bosnia' },
    { id: 'hvo_kotromanic', name: 'Brigade "Kotromanić"', faction: 'HRHB', home_settlement: 'Kakanj', home_mun: 'kakanj', corps: 'hvo_central_bosnia' },
    { id: 'hvo_travnik', name: 'Brigade "Travnik"', faction: 'HRHB', home_settlement: 'Travnik', home_mun: 'travnik', corps: 'hvo_central_bosnia' },
    { id: 'hvo_stjepan_tomasevic', name: 'Brigade "Stjepan Tomašević"', faction: 'HRHB', home_settlement: 'Novi Travnik', home_mun: 'novi_travnik', corps: 'hvo_central_bosnia' },
    { id: 'hvo_frankopan', name: 'Brigade "Frankopan"', faction: 'HRHB', home_settlement: 'Guča Gora', home_mun: 'travnik', corps: 'hvo_central_bosnia' },
    { id: 'hvo_zvijezda', name: 'Brigade "Zvijezda"', faction: 'HRHB', home_settlement: 'Vareš', home_mun: 'vares', corps: 'hvo_central_bosnia' },
    { id: 'hvo_bobovac', name: 'Brigade "Bobovac"', faction: 'HRHB', home_settlement: 'Vareš', home_mun: 'vares', corps: 'hvo_central_bosnia' },
    { id: 'hvo_jure_francetic', name: 'Brigade "Jure Francetić"', faction: 'HRHB', home_settlement: 'Zenica', home_mun: 'zenica', corps: 'hvo_central_bosnia' },

    // --- VRS ---
    { id: 'vrs_30th_division', name: '30th Light Infantry Division', faction: 'RS', home_settlement: 'Mrkonjić Grad', home_mun: 'mrkonjic_grad', corps: 'vrs_1st_krajina' },
    { id: 'vrs_31st_mountain_storm', name: '31st Mountain "Storm" Brigade', faction: 'RS', home_settlement: 'Manjača', home_mun: 'banja_luka', corps: 'vrs_1st_krajina' },
    { id: 'vrs_1st_celinac', name: '1st Čelinac Light Brigade', faction: 'RS', home_settlement: 'Čelinac', home_mun: 'celinac', corps: 'vrs_1st_krajina' },
    { id: 'vrs_1st_laktasi', name: '1st Laktaši Light Brigade', faction: 'RS', home_settlement: 'Laktaši', home_mun: 'laktasi', corps: 'vrs_1st_krajina' }, // Usually independent or 1KK
    { id: 'vrs_wolves_of_drina', name: 'Wolves of Drina', faction: 'RS', home_settlement: 'Zvornik', home_mun: 'zvornik', corps: 'vrs_drina' }
];

console.log('--- Enriching OOB with Historical Units ---');
console.log(`Reading ${OOB_PATH}...`);

const oobData = JSON.parse(fs.readFileSync(OOB_PATH, 'utf-8'));
const existingIds = new Set(oobData.brigades.map((b: any) => b.id));
let addedCount = 0;

for (const unit of HISTORICAL_UNITS) {
    if (existingIds.has(unit.id)) {
        console.log(`Skipping existing: ${unit.id}`);
        continue;
    }

    const newBrigade = {
        ...unit,
        kind: 'brigade',
        source: 'historical_enrichment_1992'
    };

    oobData.brigades.push(newBrigade);
    existingIds.add(unit.id);
    addedCount++;
}

if (addedCount > 0) {
    fs.writeFileSync(OOB_PATH, JSON.stringify(oobData, null, 2));
    console.log(`Successfully added ${addedCount} historical units.`);
} else {
    console.log('No new units added.');
}
