
import { readFileSync, writeFileSync } from 'fs';

const oobPath = 'data/source/oob_brigades.json';
const masterPath = 'data/source/settlements_initial_master.json';

const oobRaw = readFileSync(oobPath, 'utf8');
const oobData = JSON.parse(oobRaw);
const brigades = Array.isArray(oobData) ? oobData : oobData.brigades;

const masterRaw = readFileSync(masterPath, 'utf8');
const masterData = JSON.parse(masterRaw);
const settlements = masterData.settlements;

// Build lookup map: name_lower -> mun1990_id
const settlementMap = new Map<string, string>();
for (const s of settlements) {
    if (s.name && s.mun1990_id) {
        settlementMap.set(s.name.toLowerCase(), s.mun1990_id);
    }
}

// Manual overrides for known tricky ones or renames
const manualOverrides: Record<string, string> = {
    "siroki brijeg": "listica",
    "široki brijeg": "listica",
    "tomislavgrad": "duvno",
    "novi travnik": "novi_travnik", // or pucarevo? check master
    "buzim": "bosanska_krupa", // Buzim was part of Bos. Krupa in 1991
    "teočak": "ugljevik",
    "teocak": "ugljevik",
    "bradina": "konjic",
    "vozuća": "zavidovici",
    "vozuca": "zavidovici",
    "tumare": "lukavac", // bordering ozren
    "milići": "vlasenica",
    "milici": "vlasenica",
    "pelagićevo": "gradacac", // or samac?
    "pelagicevo": "gradacac",
    "krnjin": "doboj", // Krnjin mountain area west of Doboj
    "gornja paklenica": "doboj",
    "posavina": "odzak", // 102nd HVO is Odzak
    "novi travnik area": "novi_travnik",
    "tomislavgrad—posušje battalion, kupres battalion": "duvno",

    // HVO / Empty settlement overrides
    "kralj petar krešimir iv brigade": "livno",
    "ban jelačić brigade": "kiseljak",
    "herceg stjepan brigade": "konjic",
    "mario hrkač čikota brigade": "listica", // Siroki Brijeg
    "6th brigade \"ranko boban\"": "grude",
    "103rd, 104th, 105th, 106th brigades": "derventa", // Posavina group
    "108th brigade (listed again in narrative)": "brcko"
};

let fixedCount = 0;
let remainingCount = 0;

for (const b of brigades) {
    if (!b.home_mun) { // Check even if home_settlement is empty
        const key = (b.home_settlement || b.name).toLowerCase();
        let mun = manualOverrides[key];

        // Try looking up by name if settlement lookup failed
        if (!mun && b.name) {
            mun = manualOverrides[b.name.toLowerCase()];
        }

        if (!mun && b.home_settlement) {
            mun = settlementMap.get(b.home_settlement.toLowerCase());
        }

        if (mun) {
            b.home_mun = mun;
            fixedCount++;
            console.log(`Fixed ${b.name}: ${b.home_settlement || b.name} -> ${mun}`);
        } else {
            console.warn(`Could not find mun for ${b.name} (${b.home_settlement})`);
            remainingCount++;
            // Default fallback for critical ones to prevent crash? 
            // Better to leave null and fail if we can't be sure, but for now lets try to map basic ones.

            // Heuristic for "Sarajevo" or "Mostar" if exact match fail?
            if (key.includes("sarajevo")) b.home_mun = "centar_sarajevo";
            else if (key.includes("mostar")) b.home_mun = "mostar";
            else if (key.includes("tuzla")) b.home_mun = "tuzla";
            else if (key.includes("zenica")) b.home_mun = "zenica";
            else if (key.includes("banja luka")) b.home_mun = "banja_luka";

            if (b.home_mun) {
                fixedCount++;
                console.log(`Heuristic fixed ${b.name}: ${b.home_settlement} -> ${b.home_mun}`);
                remainingCount--;
            }
        }
    }
}

console.log(`Fixed ${fixedCount} entries. ${remainingCount} remain unfixed.`);

// Write back
writeFileSync(oobPath, JSON.stringify(oobData, null, 2), 'utf8');
