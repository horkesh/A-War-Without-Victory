const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const sarajevo = data.features.find(f => f.properties.name === 'Sarajevo' && f.properties.role === 'settlement');
console.log('Sarajevo Settlement Props:', JSON.stringify(sarajevo?.properties, null, 2));
console.log('Sarajevo Settlement Coords:', JSON.stringify(sarajevo?.geometry.coordinates));

const roadsWithSarajevo = data.features.filter(f => f.properties.role === 'road' && f.properties.name?.includes('Sarajevo'));
console.log('Roads with Sarajevo:', roadsWithSarajevo.length);
if (roadsWithSarajevo.length > 0) {
    console.log('Sample Road Coords:', JSON.stringify(roadsWithSarajevo[0].geometry.coordinates[0]));
}
