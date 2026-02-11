const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const settlements = data.features.filter(f => f.properties.role === 'settlement');
const small = settlements.filter(s => {
    let pt = s.geometry.coordinates;
    if (s.geometry.type !== 'Point') pt = pt[0] && pt[0][0];
    return pt && Math.abs(pt[0]) < 2000 && Math.abs(pt[1]) < 2000;
});
console.log('Small coord settlements:', small.length);
if (small.length > 0) {
    console.log('Sample:', small[0].properties.name, small[0].geometry.coordinates);
}
