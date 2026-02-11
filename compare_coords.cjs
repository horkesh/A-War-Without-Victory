const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));

console.log('--- LUKAVAC SETTLEMENTS ---');
data.features.filter(f => f.properties.role === 'settlement' && f.properties.name === 'Lukavac').forEach(f => {
    console.log(f.properties.pop, f.geometry.coordinates[0][0]); // Assumes polygon
});

console.log('--- LUKAVAC ROADS ---');
data.features.filter(f => f.properties.role === 'road' && f.properties.name?.includes('Lukavac')).forEach(f => {
    console.log(f.properties.name, f.geometry.coordinates[0]);
});

console.log('--- GRADIŠKA SETTLEMENTS ---');
data.features.filter(f => f.properties.role === 'settlement' && f.properties.name === 'Gradiška').forEach(f => {
    console.log(f.properties.pop, f.geometry.coordinates[0][0]);
});

console.log('--- GRADIŠKA ROADS ---');
data.features.filter(f => f.properties.role === 'road' && f.properties.name?.includes('Gradiška')).forEach(f => {
    console.log(f.properties.name, f.geometry.coordinates[0]);
});
