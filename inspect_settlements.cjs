const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const settlements = data.features.filter(f => f.properties.role === 'settlement');
console.log('Total Settlements:', settlements.length);
if (settlements.length > 0) {
    const s = settlements[0];
    console.log('Props:', JSON.stringify(s.properties, null, 2));
}
