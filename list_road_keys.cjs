const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));
const roads = data.features.filter(f => f.properties.role === 'road');
const keys = new Set();
roads.forEach(r => Object.keys(r.properties).forEach(k => keys.add(k)));
console.log('Road Keys:', Array.from(keys));
