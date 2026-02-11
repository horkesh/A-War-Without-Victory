const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const settlements = data.features.filter(f => f.properties.role === 'settlement' && f.properties.pop > 1000);

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

function visit(pt) {
    if (!pt || typeof pt[0] !== 'number') return;
    if (pt[0] === 0 && pt[1] === 0) return;
    if (pt[0] < minX) minX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] > maxY) maxY = pt[1];
}

settlements.forEach(s => {
    const type = s.geometry.type;
    const coords = s.geometry.coordinates;
    if (type === 'Point') visit(coords);
    else if (type === 'LineString') coords.forEach(visit);
    else if (type === 'Polygon' || type === 'MultiLineString') {
        coords.forEach(ring => ring && ring.forEach(visit));
    }
    else if (type === 'MultiPolygon') {
        coords.forEach(poly => poly && poly.forEach(ring => ring && ring.forEach(visit)));
    }
});

console.log('Pop > 1000 Settlements Bounds:', { minX, minY, maxX, maxY });
