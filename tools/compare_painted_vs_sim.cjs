/**
 * Compare painted calibration targets against a simulation run's final save.
 * Usage: node tools/compare_painted_vs_sim.cjs <run_dir> [painted_json]
 * Example: node tools/compare_painted_vs_sim.cjs runs/apr1992_definitive_40w__abc123__w40_n1
 */
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
const paintedPath = process.argv[3] || 'data/source/calibration/painted_control_jan1993.json';

if (!runDir) {
    console.error('Usage: node tools/compare_painted_vs_sim.cjs <run_dir> [painted_json]');
    process.exit(1);
}

const painted = JSON.parse(fs.readFileSync(paintedPath, 'utf8')).by_settlement_id;
const finalPath = path.join(runDir, 'final_save.json');
if (!fs.existsSync(finalPath)) {
    console.error('No final_save.json in', runDir);
    process.exit(1);
}
const final = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const pc = final.political_controllers || {};

// Count totals
const paintedCounts = {};
const simCounts = {};
for (const osid of Object.keys(painted)) {
    const p = painted[osid];
    paintedCounts[p] = (paintedCounts[p] || 0) + 1;
}
for (const osid of Object.keys(pc)) {
    const s = pc[osid];
    simCounts[s] = (simCounts[s] || 0) + 1;
}

console.log('=== TERRITORY COMPARISON ===');
console.log('Painted targets:', JSON.stringify(paintedCounts));
console.log('Sim results:    ', JSON.stringify(simCounts));
console.log();

// Mismatch analysis
const mismatches = {};
let matchCount = 0;
const totalOsids = Object.keys(painted).length;
for (const osid of Object.keys(painted)) {
    const target = painted[osid];
    const actual = pc[osid] || 'none';
    if (target === actual) { matchCount++; continue; }
    const key = actual + '_should_be_' + target;
    if (!(key in mismatches)) mismatches[key] = [];
    mismatches[key].push(osid);
}

console.log('Match rate: ' + matchCount + '/' + totalOsids + ' (' + (100 * matchCount / totalOsids).toFixed(1) + '%)');
console.log('Mismatched: ' + (totalOsids - matchCount));
console.log();

// Regional breakdown
const regions = {
    'Central Bosnia': ['bugojno', 'gornji_vakuf', 'konjic', 'novi_travnik', 'prozor', 'vitez', 'busovaca', 'kiseljak', 'travnik', 'fojnica', 'jablanica', 'kakanj'],
    'Drina Valley': ['bratunac', 'visegrad', 'gorazde', 'srebrenica', 'zepa', 'vlasenica', 'rogatica', 'foca', 'zvornik', 'milici'],
    'Central Corridor': ['tesanj', 'maglaj', 'zavidovici', 'zenica', 'visoko', 'doboj', 'teslic', 'kotor_varos'],
    'Posavina/NE': ['brcko', 'gradacac', 'orasje', 'odzak', 'lopare', 'srebrenik', 'bijeljina', 'ugljevik'],
    'Sarajevo': ['centar_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo', 'novi_grad_sarajevo', 'ilidza', 'hadzici', 'vogosca', 'ilijas', 'trnovo', 'pale'],
    'Bihac': ['bihac', 'cazin', 'velika_kladusa', 'bosanska_krupa', 'sanski_most', 'kljuc'],
    'Krajina': ['banja_luka', 'prijedor', 'bosanski_petrovac', 'jajce', 'donji_vakuf', 'sipovo', 'kupres', 'mrkonjic_grad'],
    'Herzegovina': ['mostar', 'siroki_brijeg', 'citluk', 'capljina', 'stolac', 'neum', 'ljubuski', 'grude', 'posusje', 'livno', 'tomislavgrad', 'nevesinje', 'bileca', 'gacko', 'trebinje'],
};

console.log('=== REGIONAL MISMATCH BREAKDOWN ===');
for (const [region, muns] of Object.entries(regions)) {
    let regionMismatches = 0;
    let regionTotal = 0;
    const regionDetails = {};
    for (const osid of Object.keys(painted)) {
        const mun = osid.split(':')[1];
        if (!muns.includes(mun)) continue;
        regionTotal++;
        const target = painted[osid];
        const actual = pc[osid] || 'none';
        if (target !== actual) {
            regionMismatches++;
            const key = actual + '→' + target;
            regionDetails[key] = (regionDetails[key] || 0) + 1;
        }
    }
    if (regionTotal === 0) continue;
    const pct = (100 * (regionTotal - regionMismatches) / regionTotal).toFixed(0);
    console.log(region + ': ' + regionMismatches + ' wrong / ' + regionTotal + ' total (' + pct + '% match)');
    for (const [k, v] of Object.entries(regionDetails).sort((a, b) => b[1] - a[1])) {
        console.log('  ' + k + ': ' + v);
    }
}
console.log();

// Edge case check
const edgeCases = [
    { osid: 'op:orasje:orasje', expected: 'HRHB', label: 'Orasje' },
    { osid: 'op:ugljevik:teocak_krstac_2', expected: 'RBiH', label: 'Teocak' },
    { osid: 'op:zvornik:vitinica_2', expected: 'RBiH', label: 'Sapna' },
    { osid: 'op:zavidovici:vozuca_2', expected: 'RS', label: 'Vozuca' },
    { osid: 'op:brcko:brka_2', expected: 'RBiH', label: 'Brcko South' },
    { osid: 'op:gorazde:gorazde_2', expected: 'RBiH', label: 'Gorazde' },
    { osid: 'op:srebrenica:srebrenica_2', expected: 'RBiH', label: 'Srebrenica' },
];

console.log('=== EDGE CASES ===');
for (const ec of edgeCases) {
    const actual = pc[ec.osid] || 'none';
    const pass = actual === ec.expected ? 'PASS' : 'FAIL';
    console.log(pass + ' ' + ec.label + ': expected=' + ec.expected + ' actual=' + actual);
}
console.log();

// Army sizes from summary
const summaryPath = path.join(runDir, 'summary.json');
if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log('=== ARMY SIZES ===');
    const factionSummary = summary.faction_summary || summary.factions || {};
    for (const [fid, data] of Object.entries(factionSummary)) {
        const personnel = data.total_personnel || data.personnel || 'N/A';
        console.log(fid + ': ' + personnel + ' personnel');
    }
}

// Mismatch detail by type
console.log();
console.log('=== MISMATCH DETAIL ===');
for (const [key, list] of Object.entries(mismatches).sort((a, b) => b[1].length - a[1].length)) {
    const byMun = {};
    for (const osid of list) {
        const mun = osid.split(':')[1];
        byMun[mun] = (byMun[mun] || 0) + 1;
    }
    console.log(key + ': ' + list.length + ' OSIDs');
    const sorted = Object.entries(byMun).sort((a, b) => b[1] - a[1]);
    for (const [m, c] of sorted.slice(0, 15)) console.log('  ' + m + ': ' + c);
    if (sorted.length > 15) console.log('  ... and ' + (sorted.length - 15) + ' more muns');
    console.log();
}
