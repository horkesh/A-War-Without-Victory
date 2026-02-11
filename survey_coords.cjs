const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const stats = {};
data.features.forEach(f => {
    const role = f.properties.role || 'none';
    if (!stats[role]) stats[role] = { count: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const visit = (pt) => {
        if (!pt || typeof pt[0] !== 'number') return;
        stats[role].minX = Math.min(stats[role].minX, pt[0]);
        stats[role].minY = Math.min(stats[role].minY, pt[1]);
        stats[role].maxX = Math.max(stats[role].maxX, pt[0]);
        stats[role].maxY = Math.max(stats[role].maxY, pt[1]);
    };
    const coords = f.geometry.coordinates;
    const type = f.geometry.type;
    if (type === 'Point') visit(coords);
    else if (type === 'LineString') coords.forEach(visit);
    else if (type === 'MultiLineString' || type === 'Polygon') coords.forEach(r => r && r.forEach(visit));
    else if (type === 'MultiPolygon') coords.forEach(p => p && p.forEach(r => r && r.forEach(visit)));
    stats[role].count++;
});
console.log(JSON.stringify(stats, null, 2));
