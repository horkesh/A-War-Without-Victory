
import { readFileSync } from 'fs';

const path = 'data/source/oob_brigades.json';
const raw = readFileSync(path, 'utf8');
const data = JSON.parse(raw);

// Handle object wrapper with 'brigades' property
const brigades = Array.isArray(data) ? data : (data.brigades || []);

console.log(`Loaded ${brigades.length} brigades.`);

for (let i = 0; i < brigades.length; i++) {
    const b = brigades[i];
    if (!b.id || !b.faction || !b.name || !b.home_mun) {
        console.error(`Invalid brigade at index ${i}:`, JSON.stringify(b));
    }
}
