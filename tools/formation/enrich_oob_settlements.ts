import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const OOB_FILE = resolve('data/source/oob_brigades.json');
const VALIDATION_FILE = resolve('data/derived/settlements_index_1990.json');

// Mappings derived from knowledge/ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md and VRS_APPENDIX_G_FULL_UNIT_LIST.md
// Key: Brigade Name (exact or partial match if sufficiently unique)
// Value: Settlement Name
const HQ_MAPPINGS: Record<string, string> = {
    // --- ARBiH 1st Corps ---
    "17th Muslim Light": "Pazaric", // Hadžići
    "101st Mountain": "Sarajevo", // Sarajevo–Mojmilo -> Sarajevo (Mojmilo is neighborhood)
    "102nd Motorized": "Sarajevo", // Sarajevo–Stup
    "105th Motorized": "Sarajevo", // Sarajevo–Kosevo
    "111th Vitezka Motorized": "Sarajevo", // Sarajevo–Zuc Hill
    "112th Vitezka Motorized": "Sarajevo", // Sarajevo–Rajlovac
    "115th Mountain": "Sarajevo", // Sarajevo–Bistrik
    "152nd Mountain": "Vasin Han", // Vasin Han (Sarajevo area)
    "155th Motorized": "Sarajevo", // Sarajevo–Dobrinja
    "104th Vitezka Motorized": "Hrasnica", // Hadžići
    "109th Mountain": "Pazaric", // Hadžići
    "123rd Light": "Bilalovac", // Kiseljak area? Source says Bilalovac.
    "181st Mountain": "Pazaric",
    "182nd Vitezka Light": "Pazaric",
    "161st Slavna Olovo Mountain": "Olovo",
    "165th Mountain": "Visoko",

    // --- ARBiH 2nd Corps ---
    "9th Muslim Liberation": "Smoluca", // Lukavac/Tuzla area?
    "215th Vitezka Mountain": "Gornji Rahic", // Brčko
    "221st Mountain": "Gračanica",
    "222nd Liberation": "Gračanica",
    "224th Mountain": "Klokotnica", // Doboj
    "254th Mountain": "Celic", // Lopare -> Čelić
    "255th Slavna Mountain": "Teočak", // Ugljevik -> Teočak

    // --- ARBiH 3rd Corps ---
    "319th Liberation": "Žepče",
    "327th Vitezka Mountain": "Maglaj",
    "328th Mountain": "Zavidovići",
    "372nd Vitezka Mountain": "Tešanj",
    "373rd Slavna Mountain": "Tešanj",
    "377th Vitezka Mountain": "Jelah", // Tešanj

    // --- ARBiH 4th Corps ---
    "4th Muslim Light": "Bradina", // Konjic
    "445th Mountain": "Bijelo Polje", // Mostar
    "447th Liberation": "Dreznica", // Mostar
    "450th Light": "Bjelimici", // Konjic (Bijelimici -> Bjelimici)

    // --- ARBiH 5th Corps ---
    "505th Vitezka Mountain": "Buzim", // Bosanska Krupa -> Bužim
    "517th Light": "Sturlica", // Cazin

    // --- ARBiH 7th Corps ---
    "705th Slavna Mountain": "Rostovo", // Bugojno

    // --- ARBiH 28th/81st ---
    "241st Spreca Muslim Light": "Kalesija",
    "246th Vitezka Mountain": "Sapna", // Zvornik -> Sapna
    "286th Mountain": "Stupari", // Kladanj
    "287th Mountain": "Vitalj", // Kladanj
    "24th Sabotage Battalion": "Donje Vukovije", // Kalesija

    // --- VRS 1st Krajina ---
    "5th Kozara Light Infantry": "Omarska", // Prijedor
    "12th Kotorsko Light Infantry": "Kotorsko", // Doboj
    "19th Krajina Light Infantry": "Srbobran", // Donji Vakuf -> Srbobran matches
    "22nd Krajina Infantry": "Kneževo", // Skender Vakuf
    "1st Novigrad Infantry": "Bosanski Novi", // Novigrad is Bosanski Novi
    "1st Ozren Light Infantry": "Petrovo", // Gračanica -> Petrovo (Handled by patch)
    "2nd Ozren Light Infantry": "Tumare", // Lukavac/Ozren
    "3rd Ozren Light Infantry": "Gornja Paklenica", // Doboj
    "4th Ozren Light Infantry": "Vozuća", // Zavidovici
    "1st Krnjin Light Infantry": "Krnjin", // Not a settlement, region? Skip or find closest.

    // --- VRS 2nd Krajina ---
    "3rd Petrovac Light Infantry": "Bosanski Petrovac", // Petrovac settlement is Bosanski Petrovac
    "15th Bihać Infantry": "Ripac", // Bihać
    "17th Ključ Light Infantry": "Laniste", // Ključ

    // --- VRS East Bosnian ---
    "3rd Posavina Light Infantry": "Pelagićevo", // Gradačac -> Pelagićevo
    "1st Sarajevo Mechanized": "Lukavica", // Novo Sarajevo -> Lukavica
    "2nd Sarajevo Light Infantry": "Vojkovići", // Ilidža -> Vojkovići
    "1st Milići": "Milići", // Vlasenica -> Milići

    // --- HVO (re-verifying) ---
    "108th HVO Brigade": "Brčko",
    "115th Brigade Zrinski": "Tuzla",
    "110th Usora Brigade": "Sivša" // Tešanj
};

// Settlements that might need manual normalization to match 1991 census names
const NAME_NORMALIZATION: Record<string, string> = {
    "Pazaric": "Pazarić",
    "Bilalovac": "Bilalovac", // matches
    "Vasin Han": "Vasin Han", // matches
    "Smoluca": "Smoluća Gornja", // or Donja? Usually just Smoluća refered to Gornja.
    "Gornji Rahic": "Gornji Rahić",
    "Klokotnica": "Klokotnica",
    "Celic": "Čelić",
    "Teočak": "Teočak-Krstac", // Teočak itself might be Teočak-Krstac in census
    "Jelah": "Jelah",
    "Bradina": "Bradina",
    "Bijelo Polje": "Potoci", // Bijelo Polje is the valley, Potoci is the main settlement
    "Dreznica": "Donja Drežnica", // or Gornja
    "Bjelimici": "Bjelimići", // region? Odžaci is central? Bjelimići is a community.
    "Buzim": "Bužim",
    "Sturlica": "Šturlić",
    "Rostovo": "Rostovo",
    "Sapna": "Sapna",
    "Stupari": "Stupari",
    "Vitalj": "Vitalj",
    "Donje Vukovije": "Vukovije Donje",
    "Omarska": "Omarska",
    "Kotorsko": "Kotorsko",
    "Srbobran": "Donji Vakuf", // Srbobran was purely the wartime name for Donji Vakuf
    "Kneževo": "Skender Vakuf", // Skender Vakuf in 1991
    "Tumare": "Tumare",
    "Gornja Paklenica": "Paklenica Gornja",
    "Vozuća": "Vozuća",
    "Ripac": "Ripač",
    "Laniste": "Lanište",
    "Pelagićevo": "Pelagićevo",
    "Lukavica": "Lukavica",
    "Vojkovići": "Vojkovići",
    "Milići": "Milići",
    "Sivša": "Sivša"
};

interface OOBEntry {
    id: string;
    name: string;
    home_mun: string;
    home_settlement?: string;
    subordinate_to?: string;
}

interface OOBFile {
    brigades: OOBEntry[];
}

function main() {
    console.log('Loading OOB...');
    const oobRaw = readFileSync(OOB_FILE, 'utf8');
    const oob = JSON.parse(oobRaw) as OOBFile;

    console.log('Loading Validation Index...');
    const valRaw = readFileSync(VALIDATION_FILE, 'utf8');
    const valIndex = JSON.parse(valRaw);
    // Build lookup: mun1990_id -> Set<SettlementName>
    const settlementsByMun: Record<string, Set<string>> = {};
    for (const s of valIndex.settlements) {
        // s.mun = mun name, we typically need to key by ID if possible, but OOB uses "home_mun" strings like "tuzla"
        // The validation tool maps numeric IDs. For strictness, we should use the same logic.
        // Simpler: Just rely on string matching within the mun specified in OOB if we assume OOB home_mun is valid.
        // We can iterate settlement_names.json to find where they belong.
        // For this script, we trust the mapping intent but check if the name exists in the target mun's list?
        // Let's just blindly apply and let `derive_oob_brigades.ts` validate.
        // It is the source of truth for "Does this settlement exist in this mun?".
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const brigade of oob.brigades) {
        let targetSettlement: string | undefined;

        // 1. Check exact name match
        if (HQ_MAPPINGS[brigade.name]) {
            targetSettlement = HQ_MAPPINGS[brigade.name];
        } else {
            // 2. Partial match? (Risky, but useful for "17th Muslim" vs "17th Muslim Light")
            const key = Object.keys(HQ_MAPPINGS).find(k => brigade.name.includes(k));
            if (key) {
                targetSettlement = HQ_MAPPINGS[key];
            }
        }

        if (targetSettlement) {
            // Normalize name
            const normalized = NAME_NORMALIZATION[targetSettlement] || targetSettlement;

            if (brigade.home_settlement !== normalized) {
                console.log(`Updating ${brigade.name}: ${brigade.home_settlement || '(none)'} -> ${normalized}`);
                brigade.home_settlement = normalized;
                updatedCount++;
            } else {
                skippedCount++;
            }
        }
    }

    console.log(`Updated ${updatedCount} brigades. Skipped ${skippedCount} (already set).`);

    if (updatedCount > 0) {
        writeFileSync(OOB_FILE, JSON.stringify(oob, null, 2));
        console.log('Changes saved.');
    }
}

main();
