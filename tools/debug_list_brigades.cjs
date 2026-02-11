const fs = require('fs');
const path = require('path');

const filePath = path.resolve('data/source/oob_brigades.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(`Total brigades: ${data.brigades.length}`);
data.brigades.forEach(b => {
    if (b.id.includes('novigrad') || b.id.includes('krajina') || b.name.includes('Novi')) {
        console.log(`${b.id}: ${b.name} (${b.home_settlement || 'no settlement'})`);
    }
});
