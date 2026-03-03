const fs = require('fs');
const s = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const st = s.state || s;
const formations = st.formations || {};

const byFaction = {};
for (const [id, fm] of Object.entries(formations).sort(([a],[b]) => a.localeCompare(b))) {
    if (!fm) continue;
    const f = fm.faction || 'unknown';
    if (!byFaction[f]) byFaction[f] = { count: 0, tanks: 0, artillery: 0, aa: 0 };
    byFaction[f].count++;
    const comp = fm.composition || {};
    byFaction[f].tanks += (comp.tanks || 0);
    byFaction[f].artillery += (comp.artillery || 0);
    byFaction[f].aa += (comp.aa_systems || 0);
}

console.log('=== Heavy Weapons by Faction (w40 save) ===');
for (const f of Object.keys(byFaction).sort()) {
    const b = byFaction[f];
    console.log(`  ${f}: ${b.count} formations, ${b.tanks}T ${b.artillery}A ${b.aa}AA — total heavy: ${b.tanks + b.artillery}`);
}

// Income/drain math
console.log('\n=== Heavy Munitions Balance ===');
const gsr = st.general_supply_reserve || {};
const hmr = st.heavy_munitions_reserve || {};
for (const f of Object.keys(byFaction).sort()) {
    const fac = (st.factions || []).find(x => x.id === f);
    const matSup = fac?.patron_state?.material_support_level || 0;
    const ammoResup = fac?.embargo_profile?.ammunition_resupply_rate || 0;
    const smuggling = fac?.embargo_profile?.smuggling_efficiency || 0;
    const embargoHeavy = Math.min(1, ammoResup + smuggling * 0.3);
    const patronHeavy = matSup * 12 * 0.5;

    // Count siege drain for this faction
    const sc = st.siege_turn_counters || {};
    let siegeDrainHeavy = 0;
    for (const [k, counter] of Object.entries(sc).sort(([a],[b]) => a.localeCompare(b))) {
        const fid = k.substring(0, k.indexOf(':'));
        if (fid !== f) continue;
        const drain = Math.min(2.0, 0.3 * (1 + 0.1 * counter));
        siegeDrainHeavy += drain * 0.3;
    }

    const totalIncomeHeavy = patronHeavy * embargoHeavy; // ignoring production for now
    const netHeavy = totalIncomeHeavy - siegeDrainHeavy;
    const b = byFaction[f];

    console.log(`\n  ${f}:`);
    console.log(`    Current reserve: general=${(gsr[f]||0).toFixed(1)} heavy=${(hmr[f]||0).toFixed(1)}`);
    console.log(`    Patron heavy income: ${patronHeavy.toFixed(2)} × embargo=${embargoHeavy.toFixed(2)} = ${(patronHeavy * embargoHeavy).toFixed(2)}/turn`);
    console.log(`    Siege drain heavy: ${siegeDrainHeavy.toFixed(2)}/turn`);
    console.log(`    Net (no maintenance): ${netHeavy.toFixed(2)}/turn`);
    console.log(`    Heavy weapons: ${b.tanks}T + ${b.artillery}A = ${b.tanks + b.artillery} total`);

    // What drain constant X per weapon would make this faction reach strained (40) by w30?
    // From 100 (or init): need net drain of (100-40)/30 = 2.0/turn
    // X * total_heavy = netHeavy + 2.0
    const totalHeavy = b.tanks + b.artillery;
    if (totalHeavy > 0) {
        const targetDrainForStrained30 = netHeavy + (100 - 40) / 30; // reach 40 by w30
        const targetDrainForStrained40 = netHeavy + (100 - 40) / 40; // reach 40 by w40
        console.log(`    To reach 40 by w30: need X = ${(targetDrainForStrained30 / totalHeavy).toFixed(4)}/weapon/turn`);
        console.log(`    To reach 40 by w40: need X = ${(targetDrainForStrained40 / totalHeavy).toFixed(4)}/weapon/turn`);
    }
}
