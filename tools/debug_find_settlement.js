const fs = require('fs');
const path = require('path');

const filePath = path.resolve('data/derived/settlement_names.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Total settlements:', Object.keys(data.by_census_id).length);

const results = [];
for (const [id, record] of Object.entries(data.by_census_id)) {
    if (record.mun_code === '11479' || record.name.toLowerCase().includes('petrovo')) {
        results.push({ id, ...record });
    }
}

console.log(JSON.stringify(results, null, 2));
