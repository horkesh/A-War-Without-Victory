const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const msrs = data.features.filter(f => f.properties.role === 'road' && f.properties.nato_class === 'MSR');
console.log('MSR Count:', msrs.length);
if (msrs.length > 0) {
    console.log('Sample MSR Props:', JSON.stringify(msrs[0].properties, null, 2));
}
const namedMsrs = msrs.filter(f => f.properties.name);
console.log('Named MSRs:', namedMsrs.length);
