const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const roads = data.features.filter(f => f.properties.role === 'road');
const settlements = data.features.filter(f => f.properties.role === 'settlement' && f.properties.pop > 100);

function getBounds(feats) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    feats.forEach(f => {
        const visit = (pt) => {
            if (!pt || typeof pt[0] !== 'number') return;
            if (pt[0] === 0 && pt[1] === 0) return;
            minX = Math.min(minX, pt[0]); minY = Math.min(minY, pt[1]);
            maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1]);
        };
        const coords = f.geometry.coordinates;
        if (f.geometry.type === 'Point') visit(coords);
        else if (f.geometry.type === 'LineString') coords.forEach(visit);
        else coords.forEach(r => r && r.forEach(visit));
    });
    return { minX, minY, maxX, maxY };
}

const roadBounds = getBounds(roads);
const settlementBounds = getBounds(settlements);

console.log('Road Bounds:', roadBounds);
console.log('Settlement Bounds:', settlementBounds);
