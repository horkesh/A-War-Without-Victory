
import { readFileSync } from 'fs';

const path = 'data/source/settlements_initial_master.json';
const raw = readFileSync(path, 'utf8');
const data = JSON.parse(raw); // { meta: ..., settlements: [] }

const targets = [
    "Sarajevo", "Zenica", "Tuzla", "Bihać", // RBiH
    "Banja Luka", "Pale", "Bijeljina", // RS
    "Mostar", "Grude", "Livno" // HRHB
];

const found: Record<string, string[]> = {};

// data.settlements is an array
for (const val of data.settlements) {
    const name = val.name;
    const sid = val.sid;
    if (!name || !sid) continue;

    // Check if name contains any target
    for (const t of targets) {
        // normalize for case insensitive and loose match
        // Also check if mun name matches if name is just "Centar" or similar
        const mun = val.mun || "";
        const mun1990 = val.mun1990_name || "";

        if (name.toLowerCase().includes(t.toLowerCase()) || mun.toLowerCase().includes(t.toLowerCase()) || mun1990.toLowerCase().includes(t.toLowerCase())) {
            // We want the MAIN settlement for the city if possible, often same name as Mun
            // Filter for exact match or close match on name
            if (name.toLowerCase() === t.toLowerCase() || name.toLowerCase().includes(t.toLowerCase())) {
                if (!found[t]) found[t] = [];
                found[t].push(`${sid}: ${name} (${mun})`);
            }
        }
    }
}

console.log(JSON.stringify(found, null, 2));
