const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));

const withMax = oob.filter(b => b.max_personnel != null);
console.log('With max_personnel override:', withMax.length, '/', oob.length);

const withInit = oob.filter(b => b.initial_personnel != null);
console.log('With initial_personnel:', withInit.length);
if (withInit.length > 0) {
    const vals = [...new Set(withInit.map(b => b.initial_personnel))].sort((a, b) => a - b);
    console.log('Unique initial_personnel values:', vals);
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        const fb = withInit.filter(b => b.faction === f);
        if (fb.length > 0) {
            const fvals = fb.map(b => b.initial_personnel).sort((a, b) => a - b);
            console.log(`  ${f}: ${fb.length} brigades, range ${fvals[0]}-${fvals[fvals.length - 1]}`);
        }
    }
}

const bf = {};
oob.forEach(b => { bf[b.faction] = (bf[b.faction] || 0) + 1; });
console.log('By faction:', JSON.stringify(bf));

// Check the run output for personnel distribution at w40
try {
    const runDir = fs.readdirSync('runs').filter(d => d.includes('n622')).sort().pop();
    if (runDir) {
        const save = JSON.parse(fs.readFileSync(`runs/${runDir}/final_save.json`, 'utf8'));
        const formations = save.military.formations;
        const byFaction = { RBiH: [], RS: [], HRHB: [] };
        for (const [id, f] of Object.entries(formations)) {
            if (f.status === 'active' && f.kind !== 'paramilitary') {
                byFaction[f.faction]?.push(f.personnel);
            }
        }
        for (const [faction, persList] of Object.entries(byFaction)) {
            persList.sort((a, b) => b - a);
            const at3k = persList.filter(p => p >= 2900).length;
            console.log(`\n${faction} w40: ${persList.length} active, ${at3k} at 3000 cap`);
            console.log(`  Range: ${persList[persList.length - 1]}-${persList[0]}`);
            console.log(`  Top 5: ${persList.slice(0, 5).join(', ')}`);
            console.log(`  Bottom 5: ${persList.slice(-5).join(', ')}`);
        }
    }
} catch (e) {
    console.log('Could not read run output:', e.message);
}
