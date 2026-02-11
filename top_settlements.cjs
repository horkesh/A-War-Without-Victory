const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const settlements = data.features.filter(f => f.properties.role === 'settlement');
settlements.sort((a, b) => (b.properties.pop || 0) - (a.properties.pop || 0));

console.log('--- TOP SETTLEMENTS ---');
settlements.slice(0, 20).forEach(s => {
    let pt = s.geometry.coordinates;
    if (s.geometry.type !== 'Point') pt = pt[0] && pt[0][0];
    console.log(`${s.properties.name} | Pop: ${s.properties.pop} | Coords: ${pt ? pt[0].toFixed(2) + ',' + pt[1].toFixed(2) : 'N/A'}`);
});
