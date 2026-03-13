const fs = require('fs');
const dir = process.argv[2] || 'runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n662';
const initial = JSON.parse(fs.readFileSync(`${dir}/initial_save.json`, 'utf8'));
const final = JSON.parse(fs.readFileSync(`${dir}/final_save.json`, 'utf8'));
const lines = fs.readFileSync(`${dir}/weekly_report.jsonl`, 'utf8').trim().split('\n');

// Check what VRS defends in the Jackal target area
const jackalTargets = [
    'op:capljina:tasovcici_2', 'op:stolac:rotimlja_2', 'op:stolac:pjesivac_kula_2',
    'op:stolac:stolac_2', 'op:mostar:vranjevici_2', 'op:mostar:kruzanj_2'
];

console.log('=== VRS DEFENDERS AT JACKAL TARGETS (INITIAL) ===\n');
for (const [id, f] of Object.entries(initial.military.formations)) {
    if (f.faction === 'RS' && jackalTargets.includes(f.location_osid)) {
        console.log(`  ${id}: pers=${f.personnel} loc=${f.location_osid} tanks=${f.tanks||0} art=${f.artillery||0}`);
    }
}

console.log('\n=== HVO ATTACKERS (INITIAL) ===\n');
const jackalBrigades = [
    'hrhb_stolac_units', 'hrhb_apljina_brigade', 'hrhb_1st_herzegovina_brigade_knez_domagoj',
    'hv_4th_guards_tg', 'hrhb_1st_brigade_mostar', 'hrhb_2nd_brigade_mostar',
    'hrhb_mostar_brigade', 'hv_116th_brigade_tg'
];
for (const id of jackalBrigades) {
    const f = initial.military.formations[id];
    if (f) {
        console.log(`  ${id}: pers=${f.personnel} loc=${f.location_osid} tanks=${f.tanks||0} art=${f.artillery||0} status=${f.status}`);
    } else {
        console.log(`  ${id}: NOT FOUND`);
    }
}

// Check dissolution of HV phantoms
console.log('\n=== HV PHANTOM DISSOLUTION ===\n');
for (const line of lines) {
    const r = JSON.parse(line);
    if (r.brigade_dissolution && Array.isArray(r.brigade_dissolution)) {
        for (const b of r.brigade_dissolution) {
            if (b.id && (b.id.includes('hv_') || jackalBrigades.includes(b.id))) {
                console.log(`  w${r.week_index} DISSOLVED: ${b.id} pers=${b.personnel_remaining} coh=${b.cohesion} mor=${b.morale}`);
            }
        }
    }
}

// Check VRS sector defense in Herzegovina area
console.log('\n=== VRS FORMATIONS IN HERZEGOVINA (INITIAL) ===\n');
const herzMuns = ['mostar', 'capljina', 'stolac', 'nevesinje', 'gacko', 'trebinje', 'ljubinje', 'bileca'];
for (const [id, f] of Object.entries(initial.military.formations)) {
    if (f.faction === 'RS' && f.location_osid) {
        const mun = f.location_osid.split(':')[1];
        if (herzMuns.includes(mun)) {
            console.log(`  ${id}: pers=${f.personnel} loc=${f.location_osid} tanks=${f.tanks||0} art=${f.artillery||0}`);
        }
    }
}

// Check initial control of Jackal targets
console.log('\n=== INITIAL CONTROL OF JACKAL TARGETS ===\n');
for (const osid of jackalTargets) {
    console.log(`  ${osid}: ${initial.political.political_controllers[osid]}`);
}

// Check OSIDs adjacent to Jackal staging
console.log('\n=== HRHB-CONTROLLED OSIDS IN CAPLJINA/MOSTAR (INITIAL) ===\n');
const pc = initial.political.political_controllers;
for (const [osid, ctrl] of Object.entries(pc)) {
    if (ctrl === 'HRHB' && (osid.includes(':capljina:') || osid.includes(':mostar:') || osid.includes(':stolac:'))) {
        console.log(`  ${osid}: ${ctrl}`);
    }
}
