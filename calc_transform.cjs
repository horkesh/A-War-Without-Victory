const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/A1_BASE_MAP.geojson', 'utf-8'));

const cities = ['Bihać', 'Gradiška', 'Prijedor', 'Brčko', 'Bijeljina', 'Tuzla', 'Zenica', 'Mostar', 'Sarajevo', 'Doboj'];

const results = [];

cities.forEach(name => {
    const s = data.features.find(f => f.properties.role === 'settlement' && f.properties.name === name);
    const r = data.features.filter(f => f.properties.role === 'road' && f.properties.name?.includes(name));

    if (s && r.length > 0) {
        let sPt = s.geometry.coordinates;
        if (s.geometry.type !== 'Point') sPt = sPt[0][0];

        let rSumX = 0, rSumY = 0, rCount = 0;
        r.forEach(feat => {
            const coords = feat.geometry.coordinates;
            const visit = pt => {
                rSumX += pt[0]; rSumY += pt[1]; rCount++;
            };
            if (feat.geometry.type === 'LineString') coords.forEach(visit);
            else coords.forEach(ln => ln && ln.forEach(visit));
        });

        results.push({
            name,
            settle: sPt,
            road: [rSumX / rCount, rSumY / rCount]
        });
    }
});

console.log(JSON.stringify(results, null, 2));
