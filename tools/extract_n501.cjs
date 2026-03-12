const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const pc = data.political?.political_controllers || {};

// Bihac area
const bihacOsids = Object.entries(pc).filter(([k]) => k.startsWith('op:bihac:') || k.startsWith('op:cazin:') || k.startsWith('op:velika_kladusa:'));
const bihacByFaction = {};
bihacOsids.forEach(([k,v]) => { bihacByFaction[v] = (bihacByFaction[v] || 0) + 1; });
console.log('Bihac+Cazin+VelikaKladusa:', JSON.stringify(bihacByFaction));

// Casualties from state-level ledger
const cl = data.military?.casualty_ledger?.faction_totals || {};
console.log('Casualty ledger (faction_totals):', JSON.stringify(cl));

// Troop counts
const formations = data.military?.formations || {};
const troopsByFaction = {};
for (const [fid, f] of Object.entries(formations)) {
    if (f.status === 'active' && f.kind === 'brigade') {
        troopsByFaction[f.faction] = (troopsByFaction[f.faction] || 0) + (f.personnel || 0);
    }
}
console.log('Active brigade personnel:', JSON.stringify(troopsByFaction));

// Jajce
const jajceOsids = Object.entries(pc).filter(([k]) => k.startsWith('op:jajce:'));
const jajceByFaction = {};
jajceOsids.forEach(([k,v]) => { jajceByFaction[v] = (jajceByFaction[v] || 0) + 1; });
console.log('Jajce:', JSON.stringify(jajceByFaction));

// Cardak
console.log('Cardak:', pc['op:zavidovici:cardak_2']);

// Weekly report analysis
const runDir = fs.readdirSync('runs').filter(d => d.includes('n501')).sort().pop();
const weekly = fs.readFileSync(`runs/${runDir}/weekly_report.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);

let attByFaction = {};
let totalBattles = 0, successBattles = 0;
let outcomes = {};
let earlySuccess = 0, earlyTotal = 0, lateSuccess = 0, lateTotal = 0;
let attCas = 0, defCas = 0;

for (let i = 0; i < weekly.length; i++) {
    const w = weekly[i];
    const weekNum = w.week_index !== undefined ? w.week_index : i;
    if (w.battles) {
        for (const b of w.battles) {
            attByFaction[b.attacker_faction] = (attByFaction[b.attacker_faction] || 0) + 1;
            totalBattles++;
            outcomes[b.outcome] = (outcomes[b.outcome] || 0) + 1;
            const success = ['decisive_victory', 'victory', 'costly_victory'].includes(b.outcome);
            if (success) successBattles++;
            if (weekNum <= 12) { earlyTotal++; if (success) earlySuccess++; }
            else { lateTotal++; if (success) lateSuccess++; }
            attCas += (b.attacker_casualties || 0);
            defCas += (b.defender_casualties || 0);
        }
    }
}
console.log('Battles by attacker:', JSON.stringify(attByFaction));
console.log('Attack success: ' + (totalBattles > 0 ? (successBattles/totalBattles*100).toFixed(1) : 'N/A') + '% (' + successBattles + '/' + totalBattles + ')');
console.log('Early war (w1-12): ' + (earlyTotal > 0 ? (earlySuccess/earlyTotal*100).toFixed(1) : 'N/A') + '% (' + earlySuccess + '/' + earlyTotal + ')');
console.log('Late war (w13-40): ' + (lateTotal > 0 ? (lateSuccess/lateTotal*100).toFixed(1) : 'N/A') + '% (' + lateSuccess + '/' + lateTotal + ')');
console.log('Outcomes:', JSON.stringify(outcomes));
console.log('Battle casualties - Att:', attCas, 'Def:', defCas, 'Ratio:', defCas > 0 ? (attCas/defCas).toFixed(2) : 'N/A');

// Overall OSID counts
const counts = {};
for (const [k,v] of Object.entries(pc)) {
    if (k.startsWith('op:')) counts[v] = (counts[v] || 0) + 1;
}
const total = Object.values(counts).reduce((a,b) => a+b, 0);
for (const [f,c] of Object.entries(counts)) {
    console.log(f + ': ' + c + ' (' + (c/total*100).toFixed(1) + '%)');
}
