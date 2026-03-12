const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));

// Check ALL battles w1-w12 — where is RS attacking?
console.log('=== RS ATTACKS w1-w12 ===');
for (const w of lines.slice(0, 12)) {
    const wk = w.week_index || w.week;
    if (!w.battles) continue;
    for (const b of w.battles) {
        if (b.attacker_faction === 'RS') {
            const mun = (b.target_osid || b.osid || '').split(':')[1];
            console.log(`w${wk}: ${b.target_osid || b.osid} (${mun}) | outcome:${b.outcome} | att_power:${b.attacker_power?.toFixed(0) || '?'} def_power:${b.defender_power?.toFixed(0) || '?'}`);
        }
    }
}

// Check the corridor municipalities — who controls them initially?
const init = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/initial_save.json', 'utf8'));
const pc = init.political.political_controllers;

// The Posavina corridor runs through: Brčko, Bosanski Šamac, Modrica, Derventa, Brod, Odžak, Orašje
const corridorMunis = ['brcko', 'bosanski_samac', 'modrica', 'derventa', 'bosanski_brod', 'odzak', 'orasje', 'gradacac', 'doboj'];
console.log('\n=== CORRIDOR INITIAL CONTROL ===');
for (const mun of corridorMunis) {
    const osids = Object.keys(pc).filter(k => k.startsWith('op:' + mun + ':'));
    const byFaction = {};
    for (const o of osids) { byFaction[pc[o]] = (byFaction[pc[o]] || 0) + 1; }
    console.log(`${mun}: ${JSON.stringify(byFaction)} (${osids.length} total)`);
}

// Check RS operations/directives if available in weekly reports
console.log('\n=== WEEKLY REPORT KEYS (w1) ===');
if (lines[0]) {
    console.log(Object.keys(lines[0]).join(', '));
    if (lines[0].operations) console.log('Operations:', JSON.stringify(lines[0].operations).slice(0, 500));
    if (lines[0].corps_directives) console.log('Directives:', JSON.stringify(lines[0].corps_directives).slice(0, 500));
}

// Check what RS corps covers Posavina
const fmns = init.military.formations;
console.log('\n=== RS POSAVINA BRIGADES CORPS ASSIGNMENT ===');
for (const [fid, f] of Object.entries(fmns)) {
    if (f.faction === 'RS' && f.status === 'active') {
        const home = f.home_osid || '';
        const homeMun = home.split(':')[1];
        if (corridorMunis.includes(homeMun)) {
            console.log(`${fid} | corps:${f.corps} | home:${home} | loc:${f.location_osid}`);
        }
    }
}

// Which corps is attacking Gradačac? Check the battle details
console.log('\n=== W3 BATTLE DETAILS ===');
const w3 = lines[2];
if (w3 && w3.battles) {
    for (const b of w3.battles) {
        console.log(JSON.stringify(b, null, 2));
    }
}
