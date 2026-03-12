const fs = require('fs');
const final_ = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/final_save.json', 'utf8'));
const fmns = final_.military.formations;

// Check 107th — does it exist at all?
const f107 = fmns['hrhb_107th_gradaac_brigade'];
if (f107) {
    console.log('107th EXISTS:', JSON.stringify(f107, null, 2));
} else {
    console.log('107th: COMPLETELY ABSENT from formations');
}

// Check 108th
const f108 = fmns['hrhb_108th_brko_brigade'];
if (f108) {
    console.log('\n108th:', JSON.stringify({
        status: f108.status, location: f108.location_osid, home: f108.home_osid,
        corps: f108.corps, faction: f108.faction, personnel: f108.personnel,
        cohesion: f108.cohesion?.toFixed(1), morale: f108.morale?.toFixed(1)
    }));
}

// Find ALL brigades whose home is in gradacac or brcko
console.log('\n=== ALL BRIGADES WITH HOME IN GRADAČAC/BRČKO ===');
for (const [fid, f] of Object.entries(fmns)) {
    if (f.home_osid && (f.home_osid.startsWith('op:gradacac:') || f.home_osid.startsWith('op:brcko:'))) {
        console.log(fid, '| status:', f.status, '| loc:', f.location_osid, '| home:', f.home_osid,
            '| pers:', f.personnel, '| faction:', f.faction);
    }
}

// Check what brigades ARE in the 2nd corps area (Tuzla region)
console.log('\n=== ALL RBiH BRIGADES NEAR POSAVINA ===');
const posavina_munis = ['gradacac', 'brcko', 'orasje', 'bosanski_samac', 'odzak', 'modrica',
    'doboj', 'gracanica', 'lukavac', 'tuzla', 'zivinice', 'kalesija', 'srebrenik'];
for (const [fid, f] of Object.entries(fmns)) {
    if (f.faction === 'RBiH' && f.status === 'active' && f.location_osid) {
        const mun = f.location_osid.split(':')[1];
        if (posavina_munis.includes(mun)) {
            console.log(fid, '| loc:', f.location_osid, '| home:', f.home_osid, '| pers:', f.personnel);
        }
    }
}

// Check corps_front_sectors for 2nd corps
const sectors = final_.military.corps_front_sectors;
if (sectors) {
    console.log('\n=== CORPS FRONT SECTORS (2nd Corps) ===');
    for (const [sid, sec] of Object.entries(sectors)) {
        if (sec.corps_id === 'arbih_2nd_corps' || sid.includes('2nd')) {
            console.log(sid, '| corps:', sec.corps_id, '| edges:', sec.front_edges?.length,
                '| brigades:', sec.assigned_brigades?.length);
        }
    }
    // Also check what corps have sectors
    const corpsSectors = {};
    for (const [sid, sec] of Object.entries(sectors)) {
        const c = sec.corps_id || 'unknown';
        corpsSectors[c] = (corpsSectors[c] || 0) + 1;
    }
    console.log('\nSectors by corps:', JSON.stringify(corpsSectors));
}

// Check weekly reports for when Gradačac fell
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));

console.log('\n=== GRADAČAC BATTLES ===');
for (const w of lines) {
    if (!w.battles) continue;
    for (const b of w.battles) {
        const osid = b.target_osid || b.osid || '';
        if (osid.startsWith('op:gradacac:') || osid.startsWith('op:brcko:')) {
            console.log(`w${w.week_index || w.week}: ${osid} | att:${b.attacker_faction} def:${b.defender_faction} | outcome:${b.outcome}`);
        }
    }
}
