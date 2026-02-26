import fs from 'fs';
const dir = 'runs/apr1992_definitive_52w__102fea508092873d__w52_n136';
const initial = JSON.parse(fs.readFileSync(dir + '/initial_save.json', 'utf8'));
const final_ = JSON.parse(fs.readFileSync(dir + '/final_save.json', 'utf8'));
const iForms = initial.formations || {};
const fForms = final_.formations || {};
let moved = 0, stayed = 0;
const movedList = [];
for (const [id, ff] of Object.entries(fForms)) {
    const ii = iForms[id];
    if (ii == null) continue;
    const il = ii.location_osid;
    const fl = ff.location_osid;
    if (il == null || fl == null) continue;
    if (il !== fl) {
        moved++;
        movedList.push({ id, from: il, to: fl, faction: ff.faction });
    } else {
        stayed++;
    }
}
console.log('Moved:', moved, 'Stayed:', stayed);
console.log('--- Moved brigades ---');
for (const m of movedList.slice(0, 40)) {
    console.log(m.faction, m.id, m.from, '->', m.to);
}

// Week-over-week for all 52 weeks
console.log('\n--- Week-over-week movement ---');
for (let w = 1; w < 52; w++) {
    const prev = JSON.parse(fs.readFileSync(dir + '/save_w' + w + '.json', 'utf8'));
    const next = JSON.parse(fs.readFileSync(dir + '/save_w' + (w + 1) + '.json', 'utf8'));
    let rsMoved = 0, rbihMoved = 0, hrhbMoved = 0;
    for (const [id, ff] of Object.entries(next.formations || {})) {
        const pf = (prev.formations || {})[id];
        if (pf == null) continue;
        if (pf.location_osid && ff.location_osid && pf.location_osid !== ff.location_osid) {
            if (ff.faction === 'RS') rsMoved++;
            else if (ff.faction === 'RBiH') rbihMoved++;
            else if (ff.faction === 'HRHB') hrhbMoved++;
        }
    }
    const total = rsMoved + rbihMoved + hrhbMoved;
    if (total > 0 || w <= 25 || w % 5 === 0)
        console.log('W' + w + '->' + (w+1) + ': RS=' + rsMoved + ' RBiH=' + rbihMoved + ' HRHB=' + hrhbMoved + ' total=' + total);
}

// Check brigade distribution near Brčko at various weeks
console.log('\n--- Brigade locations near Brčko ---');
const brckoPatterns = ['brcko', 'bijeljina', 'bosanski_samac', 'modrica', 'gradacac', 'orasje', 'odzak'];
for (const w of [1, 5, 10, 20, 40, 52]) {
    const s = JSON.parse(fs.readFileSync(dir + '/save_w' + w + '.json', 'utf8'));
    const forms = s.formations || {};
    const near = { RS: 0, RBiH: 0, HRHB: 0 };
    const inBrcko = { RS: 0, RBiH: 0, HRHB: 0 };
    for (const [id, f] of Object.entries(forms)) {
        if (f.kind !== 'brigade' || f.status !== 'active') continue;
        const loc = f.location_osid || '';
        for (const p of brckoPatterns) {
            if (loc.includes(p)) {
                near[f.faction] = (near[f.faction] || 0) + 1;
                if (loc.includes('brcko')) inBrcko[f.faction] = (inBrcko[f.faction] || 0) + 1;
                break;
            }
        }
    }
    console.log('W' + w + ' corridor area: RS=' + near.RS + ' RBiH=' + near.RBiH + ' HRHB=' + near.HRHB +
        ' | in brcko: RS=' + inBrcko.RS + ' RBiH=' + inBrcko.RBiH);
}
