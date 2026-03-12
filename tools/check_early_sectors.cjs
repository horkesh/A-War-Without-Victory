const fs = require('fs');

// Load w2 and w3 weekly reports to find sector state at time of Gradačac battle
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));

// Check which weeks have sector data
for (const w of lines.slice(0, 10)) {
    const wk = w.week_index || w.week;
    const hasSectors = w.corps_sectors || w.sectors || w.sector_report;
    console.log(`w${wk}: phase=${w.phase || '?'}, has_sectors=${!!hasSectors}, keys: ${Object.keys(w).filter(k => k.includes('sector')).join(',')}`);
}

// Check when war phase starts
for (const w of lines.slice(0, 15)) {
    const wk = w.week_index || w.week;
    console.log(`w${wk}: phase=${w.phase}, battles=${(w.battles || []).length}`);
}

// Check initial save for formations at w0 — is 107th present?
const init = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/initial_save.json', 'utf8'));
console.log('\n=== INITIAL SAVE ===');
console.log('Phase:', init.meta.phase, 'Turn:', init.meta.turn);
const f107_init = init.military.formations['hrhb_107th_gradaac_brigade'];
const f108_init = init.military.formations['hrhb_108th_brko_brigade'];
console.log('107th at init:', f107_init ? `status=${f107_init.status} loc=${f107_init.location_osid} pers=${f107_init.personnel}` : 'NOT PRESENT');
console.log('108th at init:', f108_init ? `status=${f108_init.status} loc=${f108_init.location_osid} pers=${f108_init.personnel}` : 'NOT PRESENT');

// What RBiH brigades ARE present at Gradačac/Brčko initially?
console.log('\n=== INITIAL RBiH BRIGADES AT GRADAČAC/BRČKO ===');
for (const [fid, f] of Object.entries(init.military.formations)) {
    if (f.faction === 'RBiH' && f.status === 'active') {
        const loc = f.location_osid || '';
        if (loc.startsWith('op:gradacac:') || loc.startsWith('op:brcko:')) {
            console.log(fid, '| loc:', loc, '| home:', f.home_osid, '| pers:', f.personnel);
        }
    }
}

// What about ALL brigades (any faction) in Gradačac/Brčko area initially?
console.log('\n=== ALL INITIAL BRIGADES AT GRADAČAC/BRČKO ===');
for (const [fid, f] of Object.entries(init.military.formations)) {
    if (f.status === 'active') {
        const loc = f.location_osid || '';
        if (loc.startsWith('op:gradacac:') || loc.startsWith('op:brcko:')) {
            console.log(fid, '| loc:', loc, '| faction:', f.faction, '| pers:', f.personnel);
        }
    }
}

// Check available_from for 107th/108th in OOB
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const b107 = oob.find(b => b.id === 'hrhb_107th_gradaac_brigade');
const b108 = oob.find(b => b.id === 'hrhb_108th_brko_brigade');
console.log('\n107th OOB available_from:', b107.available_from);
console.log('108th OOB available_from:', b108.available_from);

// The scenario starts at w0 in peace phase, transitions to war phase around w2-4
// available_from=2 means they spawn at w2
// Gradačac fell at w3 — so they had 1 week active before the attack

// Check what RS brigades are attacking Gradačac
console.log('\n=== RS BRIGADES NEAR GRADAČAC/BRČKO ===');
for (const [fid, f] of Object.entries(init.military.formations)) {
    if (f.faction === 'RS' && f.status === 'active') {
        const loc = f.location_osid || '';
        const home = f.home_osid || '';
        const munis = ['gradacac', 'brcko', 'bosanski_samac', 'modrica', 'doboj', 'orasje', 'odzak', 'derventa', 'brod'];
        const locMun = loc.split(':')[1];
        const homeMun = home.split(':')[1];
        if (munis.includes(locMun) || munis.includes(homeMun)) {
            console.log(fid, '| loc:', loc, '| home:', home, '| pers:', f.personnel, '| equip:', f.equipment_class);
        }
    }
}
