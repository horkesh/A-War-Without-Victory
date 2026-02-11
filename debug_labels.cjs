const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const list = data.features.filter(f => f.properties.role === 'settlement' && (f.properties.pop > 1000 || f.properties.nato_class === 'CITY' || f.properties.nato_class === 'TOWN'));
console.log('Count for labeling:', list.length);
list.slice(0, 5).forEach(s => console.log('-', s.properties.name, 'Pop:', s.properties.pop, 'Class:', s.properties.nato_class, 'Coords:', s.geometry.coordinates));
