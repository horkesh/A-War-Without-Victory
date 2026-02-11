const fs = require('fs');
const path = require('path');

const filePath = path.resolve('data/source/oob_brigades.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const fixes = {
    'vrs_1st_novigrad': 'Novi Grad',
    'vrs_22nd_krajina': 'Kneževo',
    'vrs_2nd_sarajevo': 'Krupac',
    'vrs_3rd_ozren': 'Gornja Paklenica'
};

let updated = 0;
data.brigades.forEach(b => {
    if (fixes[b.id]) {
        if (b.home_settlement !== fixes[b.id]) {
            console.log(`Updating ${b.id}: ${b.home_settlement} -> ${fixes[b.id]}`);
            b.home_settlement = fixes[b.id];
            updated++;
        }
    }
});

if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved ${updated} changes.`);
} else {
    console.log('No changes needed.');
}
