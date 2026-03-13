const fs = require('fs');
const dir = process.argv[2];
const targetWeek = parseInt(process.argv[3] || '10');

// We need to look at what the game state was at the turn of battle.
// Weekly report doesn't have full game state, but it has battle details.
// Let's extract all we can from the battle events.

const lines = fs.readFileSync(`${dir}/weekly_report.jsonl`, 'utf8').trim().split('\n');

// Find battles in the Jackal area across all weeks
console.log('=== ALL JACKAL-AREA BATTLES ===\n');
const jackalMuns = ['capljina', 'stolac', 'mostar'];
for (const line of lines) {
    const r = JSON.parse(line);
    if (!r.battles) continue;
    for (const b of r.battles) {
        if (!b.target_osid) continue;
        const mun = b.target_osid.split(':')[1];
        if (jackalMuns.includes(mun)) {
            const fields = [
                `w${r.week_index}`,
                b.attacker_faction,
                'attacks',
                b.target_osid,
                `ratio=${b.power_ratio?.toFixed(2)}`,
                `outcome=${b.outcome}`,
                `att_cas=${b.attacker_casualties}`,
                `def_cas=${b.defender_casualties}`,
            ];
            // Check for additional fields that might reveal defender composition
            if (b.attacker_power !== undefined) fields.push(`att_pow=${b.attacker_power?.toFixed(0)}`);
            if (b.defender_power !== undefined) fields.push(`def_pow=${b.defender_power?.toFixed(0)}`);
            if (b.attacker_brigades !== undefined) fields.push(`att_brigs=${b.attacker_brigades}`);
            if (b.defender_brigades !== undefined) fields.push(`def_brigs=${b.defender_brigades}`);
            if (b.sector_defense_total !== undefined) fields.push(`sector_def=${b.sector_defense_total?.toFixed(0)}`);
            if (b.sector_front_edges !== undefined) fields.push(`front_edges=${b.sector_front_edges}`);
            console.log(fields.join(' '));
        }
    }
}

// Check column movements to/from Herzegovina
console.log('\n=== COLUMN MOVEMENTS TO HERZEGOVINA ===\n');
for (const line of lines) {
    const r = JSON.parse(line);
    if (!r.column_movement) continue;
    for (const m of (Array.isArray(r.column_movement) ? r.column_movement : [])) {
        if (!m.destination_osid) continue;
        const destMun = m.destination_osid.split(':')[1];
        if (jackalMuns.includes(destMun) && m.faction === 'RS') {
            console.log(`w${r.week_index}: ${m.formation_id} → ${m.destination_osid} (from ${m.origin_osid || '?'})`);
        }
    }
}

// Check JNA garrison withdrawal
console.log('\n=== JNA WITHDRAWAL EVENTS ===\n');
for (const line of lines) {
    const r = JSON.parse(line);
    // Check for brigade dissolution or withdrawal of JNA phantoms
    if (r.brigade_dissolution) {
        const diss = Array.isArray(r.brigade_dissolution) ? r.brigade_dissolution : [];
        for (const d of diss) {
            if (d.id && d.id.includes('jna_mostar')) {
                console.log(`w${r.week_index} DISSOLVED: ${d.id} pers=${d.personnel_remaining}`);
            }
        }
    }
}

// Try to find JNA garrison in formation_delta
const fd = `${dir}/formation_delta.json`;
if (fs.existsSync(fd)) {
    const delta = JSON.parse(fs.readFileSync(fd, 'utf8'));
    if (delta.jna_mostar_east_garrison) {
        console.log('jna_mostar_east_garrison delta:', JSON.stringify(delta.jna_mostar_east_garrison, null, 2));
    }
}
