import fs from 'fs';
import path from 'path';

const OOB_PATH = 'data/source/oob_brigades.json';
const SCENARIO_FORMATIONS_PATH = 'data/scenarios/initial_formations/initial_formations_jan1993.json';
const SCENARIO_START_PATH = 'data/scenarios/jan1993_start.json';

// Mappings derived from docs/knowledge/VRS_ORDER_OF_BATTLE_MASTER.md and HVO/ARBiH equivalents
const HISTORICAL_LOCATIONS = {
    // VRS - Drina Corps
    "vrs_1st_bratunac": "Bratunac",
    "vrs_1st_zvornik": "Zvornik",
    "vrs_zvornik_infantry": "Zvornik",
    "vrs_1st_vlasenica": "Vlasenica",
    "vrs_milici": "Milići",
    "vrs_sekovici": "Šekovići",
    "vrs_birac": "Šekovići",
    "vrs_visegrad": "Višegrad",
    "vrs_rogatica": "Rogatica",
    "vrs_1st_romanija": "Han Pijesak",

    // VRS - Sarajevo-Romanija
    "vrs_1st_sarajevo_mechanized": "Lukavica",
    "vrs_2nd_sarajevo": "Krupac",
    "vrs_3rd_sarajevo": "Vogošća",
    "vrs_vogosca": "Vogošća",
    "vrs_4th_sarajevo": "Pale",
    "vrs_ilidza": "Ilidža",
    "vrs_ilijas": "Ilijaš",
    "vrs_rajlovac": "Rajlovac",
    "vrs_kosevo": "Mrkovići",

    // VRS - Herzegovina
    "vrs_trebinje": "Trebinje",
    "vrs_nevesinje": "Nevesinje",
    "vrs_gacko": "Gacko",
    "vrs_bileca": "Bileća",
    "vrs_foca": "Foča",
    "vrs_cajnice": "Čajniče",
    "vrs_kalinovik_herzegovina": "Kalinovik",

    // VRS - 1st Krajina
    "vrs_16th_krajina_motorized": "Banja Luka",
    "vrs_1st_banja_luka": "Banja Luka",
    "vrs_2nd_banja_luka": "Banja Luka",
    "vrs_3rd_banja_luka": "Banja Luka",
    "vrs_4th_banja_luka": "Banja Luka",
    "vrs_43rd_prijedor": "Prijedor",
    "vrs_5th_kozara": "Omarska",
    "vrs_6th_sana": "Sanski Most",
    "vrs_6th_sanska": "Sanski Most",
    "vrs_11th_dubica": "Bosanska Dubica",
    "vrs_1st_gradiska": "Bosanska Gradiška",
    "vrs_1st_novigrad": "Bosanski Novi",
    "vrs_1st_prnjavor": "Prnjavor",
    "vrs_1st_kotor_varos": "Kotor Varoš",
    "vrs_1st_teslic": "Teslić",
    "vrs_1st_doboj": "Doboj",
    "vrs_2nd_ozren": "Tumare",
    "vrs_3rd_ozren": "Gornja Paklenica",
    "vrs_4th_ozren": "Vozuća",

    // VRS - 2nd Krajina
    "vrs_1st_drvar": "Titov Drvar",
    "vrs_3rd_petrovac": "Bosanski Petrovac",
    "vrs_5th_glamoc": "Glamoč",
    "vrs_7th_krajina_motorized": "Kupres",
    "vrs_9th_grahovo": "Bosansko Grahovo",
    "vrs_11th_krupa": "Bosanska Krupa",
    "vrs_15th_bihac": "Ripač",
    "vrs_17th_kljuc": "Ključ",

    // VRS - East Bosnia
    "vrs_1st_semberija": "Bijeljina",
    "vrs_2nd_semberija": "Bijeljina",
    "vrs_3rd_semberija": "Bijeljina",
    "vrs_1st_bijeljina": "Bijeljina",
    "vrs_1st_majevica": "Ugljevik",
    "vrs_2nd_majevica": "Priboj",
    "vrs_3rd_majevica": "Lopare",
    "vrs_1st_posavina": "Brčko",
    "vrs_2nd_posavina": "Bosanski Šamac",
    "vrs_3rd_posavina": "Pelagićevo",

    // HVO
    "hvo_101st_orasje": "Orašje",
    "hvo_102nd": "Odžak",
    "hvo_108th_brcko": "Brčko",
    "hvo_111th_zepce": "Žepče",
    "hvo_110th_usora": "Sivša",
    "hvo_115th_zrinski": "Tuzla",
    "hvo_vitezovi": "Vitez",
    "hvo_vitez": "Vitez",
    "hvo_busovaca": "Busovača",
    "hvo_kiseljak": "Kiseljak",
    "hvo_kresevo": "Kreševo",
    "hvo_novi_travnik": "Novi Travnik",
    "hvo_travnik": "Travnik",
    "hvo_capljina": "Čapljina",
    "hvo_citluk": "Čitluk",
    "hvo_grude": "Grude",
    "hvo_ljubuski": "Ljubuški",
    "hvo_mostar": "Mostar",
    "hvo_1st_mostar": "Mostar",
    "hvo_2nd_mostar": "Mostar",
    "hvo_siroki_brijeg": "Široki Brijeg",
    "hvo_rama": "Prozor",
    "hvo_tomislavgrad": "Tomislavgrad",
    "hvo_livno": "Livno",

    // ARBiH 
    "arbih_1st_muslim_podrinje": "Kladanj",
    "arbih_28th_division": "Srebrenica",
    "arbih_srebrenica": "Srebrenica",
    "arbih_zepa": "Žepa",
    "arbih_gorazde": "Goražde",
    "arbih_81st_gorazde": "Goražde",
    "arbih_82nd_foca": "Foča",
    "arbih_1st_orjen": "Srebrenik"
};

// 1. Update OOB Source
const raw = fs.readFileSync(OOB_PATH, 'utf8');
const data = JSON.parse(raw);
let updatedCount = 0;

data.brigades.forEach(brigade => {
    // If we have a historical override
    if (HISTORICAL_LOCATIONS[brigade.id]) {
        const newLoc = HISTORICAL_LOCATIONS[brigade.id];
        if (brigade.home_settlement !== newLoc) {
            brigade.home_settlement = newLoc;
            updatedCount++;
        }
    }
    // Also ensure kind is set
    if (!brigade.kind) brigade.kind = 'brigade';
});

if (updatedCount > 0) {
    fs.writeFileSync(OOB_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${updatedCount} brigades in ${OOB_PATH}`);
} else {
    console.log("OOB source up to date.");
}

// 2. Generate Initial Formations for Jan 1993
// We include ALL brigades that have a home_settlement (or we found one for).
// Later filtering can be applied if we have start/end dates.
// For now, we assume oob_brigades.json represents the 1992-1995 stack.

const formations = data.brigades.map(b => ({
    id: b.id,
    faction: b.faction,
    name: b.name,
    kind: b.kind || 'brigade'
    // We rely on OOB 'home_settlement' for location defaults in game logic,
    // so we don't explicitly list it here unless overriding.
    // The previous apr1995 file didn't list location, so it likely defaults to registry.
}));

// Also add Corps (from oob_corps.json if we want, but apr1995 example mixed them?)
// apr1995 example had "arbih_1st_corps", "vrs_1st_krajina_corps" etc as 'brigade' kind?
// Let's check oob_corps.json? No, those IDs look like Corps IDs.
// If the game spawns corps as units, we should include them.
// The apr1995 file had IDs like "vrs_1st_krajina_corps".
// oob_brigades.json usually doesn't have "corps".
// Let's assume we just output the brigades for now. The user said "full OOBs".

const formationsData = { formations };
fs.writeFileSync(SCENARIO_FORMATIONS_PATH, JSON.stringify(formationsData, null, 2), 'utf8');
console.log(`Generated ${formations.length} formations in ${SCENARIO_FORMATIONS_PATH}`);

// 3. Generate Scenario Start File
const scenarioStart = {
    "scenario_id": "jan1993_start",
    "weeks": 52,
    "init_formations": "jan1993", // Resolves to initial_formations_jan1993.json
    // "init_control": "jan1993", // Resolves to ..._initial_political_controllers_jan1993.json (User needs to create the map first!)
    // We omit init_control for now or set to 'sep1992' as placeholder?
    // User said "create a January 1993 scenario".
    // We'll leave init_control commented out or point to 'baseline' if exists.
    // Or just omit, game state might warn.
    "turns": [
        {
            "week_index": 0,
            "actions": [
                {
                    "type": "note",
                    "text": "January 1993: Vance-Owen Peace Plan negotiations. Heavy fighting in Central Bosnia (Gornji Vakuf) and Eastern Bosnia (Cerska)."
                },
                { "type": "baseline_ops", "enabled": true, "intensity": 1.0 }
            ]
        }
    ]
};

fs.writeFileSync(SCENARIO_START_PATH, JSON.stringify(scenarioStart, null, 2), 'utf8');
console.log(`Generated scenario start in ${SCENARIO_START_PATH}`);
