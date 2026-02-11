const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const msrs = data.features.filter(f => f.properties.role === 'road' && f.properties.nato_class === 'MSR');

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
let minXf, minYf, maxXf, maxYf;

msrs.forEach(f => {
    const visit = (pt) => {
        if (!pt || typeof pt[0] !== 'number') return;
        if (pt[0] < minX) { minX = pt[0]; minXf = f; }
        if (pt[1] < minY) { minY = pt[1]; minYf = f; }
        if (pt[0] > maxX) { maxX = pt[0]; maxXf = f; }
        if (pt[1] > maxY) { maxY = pt[1]; maxYf = f; }
    };
    const coords = f.geometry.coordinates;
    if (f.geometry.type === 'LineString') coords.forEach(visit);
    else coords.forEach(ln => ln && ln.forEach(visit));
});

console.log('Min X:', minX, minXf?.properties?.name || 'unnamed');
console.log('Max X:', maxX, maxXf?.properties?.name || 'unnamed');
console.log('Min Y:', minY, minYf?.properties?.name || 'unnamed');
console.log('Max Y:', maxY, maxYf?.properties?.name || 'unnamed');
