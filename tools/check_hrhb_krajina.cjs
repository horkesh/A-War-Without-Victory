const fs = require('fs');
const settlements = JSON.parse(fs.readFileSync('./data/settlements.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('./runs/apr1992_definitive_40w__137cf28f1ee0a9c8__w40_n472/final_save.json', 'utf8'));
const state = save.state || save;
const pc = state.political_controllers || {};

const adj = {};
const edges = settlements.edges || [];
for (const e of edges) {
    const a = e.a || e.osid_a;
    const b = e.b || e.osid_b;
    if (a && b) {
        if (!adj[a]) adj[a] = [];
        if (!adj[b]) adj[b] = [];
        adj[a].push(b);
        adj[b].push(a);
    }
}

const targets = [
    'op:banja_luka:dragocaj',
    'op:banja_luka:potkozarje_3',
    'op:bosanska_gradiska:mackovac',
    'op:prijedor:raljas',
    'op:odzak:bosanski_samac',
    'op:orasje:ostra_luka',
    'op:teslic:kamenica_2'
];
for (const t of targets) {
    const neighbors = adj[t] || [];
    console.log('\n' + t + ' -> sim=' + (pc[t]||'?'));
    for (const n of neighbors) {
        console.log('  neighbor: ' + n + ' -> ' + (pc[n]||'?'));
    }
}

// Also show all HRHB cells
console.log('\n\n--- All HRHB cells in sim ---');
for (const [osid, ctrl] of Object.entries(pc)) {
    if (ctrl === 'HRHB') {
        const mun = osid.split(':')[1];
        if (['banja_luka','bosanska_gradiska','prijedor','odzak','orasje','teslic','prnjavor'].includes(mun)) {
            console.log(osid);
        }
    }
}
