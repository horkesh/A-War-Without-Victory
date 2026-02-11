const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));

const roadNames = new Set();
data.features.forEach(f => {
    if (f.properties.role === 'road' && f.properties.name) {
        roadNames.add(f.properties.name.toLowerCase());
    }
});

const common = [];
data.features.forEach(f => {
    if (f.properties.role === 'settlement' && f.properties.name) {
        if (roadNames.has(f.properties.name.toLowerCase())) {
            common.push(f.properties.name);
        }
    }
});

console.log('Common Names:', common.slice(0, 50));
