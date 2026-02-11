const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));

const cities = ['Bihać', 'Gradiška', 'Prijedor', 'Bijeljina', 'Sarajevo', 'Zenica', 'Banja Luka', 'Mostar'];

const results = [];

cities.forEach(name => {
    const s = data.features.find(f => f.properties.role === 'settlement' && f.properties.name === name);
    // Find MSRs that are likely in that city or leading to it
    // Or just find the main town center for the road network if it exists?
    // Let's find roads named EXACTLY after the city if possible, or just the city center in road space if the user provided it.
    // Wait, I don't have a lookup.
    
    // Let's try to find features where nato_class is 'CITY' 
    // Wait, the roads don't have CITY class.
    
    // Maybe I can find the CLOSEST road point to each city center?
    // That would give us the road-space coordinates for that city.
    if (s) {
        let sPt = s.geometry.coordinates;
        if (s.geometry.type !== 'Point') sPt = sPt[0][0];
        
        // This won't work because they are in different spaces.
    }
});

// Let's try searching for something unique.
// Is there a city with a very unique name?
// 'Velika Kladuša' 
const vk_s = data.features.find(f => f.properties.name === 'Velika Kladuša' && f.properties.role === 'settlement');
const vk_r = data.features.filter(f => f.properties.role === 'road' && f.properties.name?.includes('Velika Kladuša'));

console.log('Velika Kladuša S:', vk_s ? vk_s.geometry.coordinates[0][0] : 'not found');
if (vk_r.length > 0) {
    let rSumX = 0, rSumY = 0, count = 0;
    vk_r.forEach(f => f.geometry.coordinates.forEach(pt => { 
        if (Array.isArray(pt[0])) pt.forEach(p => { rSumX += p[0]; rSumY += p[1]; count++ });
        else { rSumX += pt[0]; rSumY += pt[1]; count++ }
    }));
    console.log('Velika Kladuša R:', rSumX/count, rSumY/count);
}
