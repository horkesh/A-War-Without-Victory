const fs = require('fs');
const dir = process.argv[2];

// Load final save to check sectors at a late state (sectors are rebuilt each turn)
// Better: check at the turn Jackal first attacks
const lines = fs.readFileSync(`${dir}/weekly_report.jsonl`, 'utf8').trim().split('\n');

// Find first Jackal battle week
let firstBattleWeek = null;
for (const line of lines) {
    const r = JSON.parse(line);
    if (r.battles) {
        for (const b of r.battles) {
            if (b.target_osid && b.target_osid.includes('tasovcici')) {
                firstBattleWeek = r.week_index;
                break;
            }
        }
    }
    if (firstBattleWeek) break;
}
console.log('First Jackal battle at week:', firstBattleWeek);

// Check initial VRS formations in Herzegovina area
const initial = JSON.parse(fs.readFileSync(`${dir}/initial_save.json`, 'utf8'));
const final = JSON.parse(fs.readFileSync(`${dir}/final_save.json`, 'utf8'));

// Check front sectors for RS in Herzegovina region
const herzOsids = new Set();
const pc = initial.political.political_controllers;
for (const [osid, ctrl] of Object.entries(pc)) {
    const mun = osid.split(':')[1];
    if (['mostar', 'capljina', 'stolac', 'nevesinje', 'gacko', 'trebinje', 'ljubinje', 'bileca', 'konjic'].includes(mun)) {
        herzOsids.add(osid);
    }
}

// Count RS formations in Herzegovina at init
const herzFormations = [];
for (const [id, f] of Object.entries(initial.military.formations)) {
    if (f.faction === 'RS' && f.location_osid && herzOsids.has(f.location_osid)) {
        herzFormations.push({ id, pers: f.personnel, loc: f.location_osid, status: f.status });
    }
}

console.log('\nRS formations in Herzegovina area (initial):', herzFormations.length);
for (const f of herzFormations) {
    console.log(`  ${f.id}: pers=${f.pers} loc=${f.loc} status=${f.status}`);
}

// Check HRHB formations in Herzegovina at init
const hrhbFormations = [];
for (const [id, f] of Object.entries(initial.military.formations)) {
    if (f.faction === 'HRHB' && f.location_osid && herzOsids.has(f.location_osid)) {
        hrhbFormations.push({ id, pers: f.personnel, loc: f.location_osid, status: f.status });
    }
}

console.log('\nHRHB formations in Herzegovina area (initial):', hrhbFormations.length);
for (const f of hrhbFormations) {
    console.log(`  ${f.id}: pers=${f.pers} loc=${f.loc} status=${f.status}`);
}

// Check front_sectors in final state if available
const sectors = final.military?.corps_front_sectors;
if (sectors) {
    console.log('\n=== CORPS FRONT SECTORS (FINAL) ===');
    for (const [corps, sectorList] of Object.entries(sectors)) {
        if (corps.includes('herzegovina') || corps.includes('hvo_southeast')) {
            console.log(`\n${corps}: ${sectorList.length} sectors`);
            for (const s of sectorList) {
                const jackalOsids = (s.front_edges || []).filter(e =>
                    e.friendly_osids?.some(o => ['op:capljina:tasovcici_2', 'op:stolac:stolac_2', 'op:mostar:vranjevici_2'].includes(o)) ||
                    e.hostile_osids?.some(o => ['op:capljina:tasovcici_2', 'op:stolac:stolac_2', 'op:mostar:vranjevici_2'].includes(o))
                );
                if (jackalOsids.length > 0 || s.front_edges?.length < 5) {
                    console.log(`  Sector ${s.sector_id}: ${s.front_edges?.length || 0} front edges, brigades=${s.assigned_brigade_ids?.length || 0}, territory_osids=${s.territory_osids?.length || 0}`);
                    if (s.assigned_brigade_ids) console.log(`    brigades: ${s.assigned_brigade_ids.join(', ')}`);
                }
            }
        }
    }
}

// Check total RS power in sectors touching Jackal targets
console.log('\n=== TOTAL DEFENDER POWER CHECK ===');
// Count all RS brigades that could potentially defend Jackal targets
let totalRSpers = 0;
let rsCount = 0;
for (const [id, f] of Object.entries(final.military.formations)) {
    if (f.faction === 'RS' && f.status === 'active') {
        const mun = f.location_osid?.split(':')[1];
        if (['mostar', 'capljina', 'stolac', 'nevesinje', 'gacko', 'trebinje', 'ljubinje', 'bileca'].includes(mun)) {
            totalRSpers += f.personnel || 0;
            rsCount++;
        }
    }
}
console.log(`Total RS in Herzegovina (final): ${rsCount} brigades, ${totalRSpers} personnel`);
