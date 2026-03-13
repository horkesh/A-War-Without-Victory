const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n646/weekly_report.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const opsTracker = {};
for (const w of lines) {
    const wk = w.week_index || w.week;
    if (!w.operation_diagnostics) continue;
    for (const od of w.operation_diagnostics.filter(od => od.corps_id && od.corps_id.startsWith('vrs'))) {
        const key = od.corps_id + ':' + od.operation_name;
        if (!opsTracker[key]) opsTracker[key] = {corps: od.corps_id, name: od.operation_name, start: wk, end: wk, captures: 0, battles: 0, brigades: 0, phase: ''};
        opsTracker[key].end = wk;
        opsTracker[key].captures = Math.max(opsTracker[key].captures, od.objective_capture_count || 0);
        opsTracker[key].battles += od.battle_count || 0;
        opsTracker[key].brigades = Math.max(opsTracker[key].brigades, od.participating_brigades ? od.participating_brigades.length : 0);
        opsTracker[key].phase = od.operation_phase || '';
    }
}
console.log('=== VRS OPERATIONS (n646) ===');
for (const [k, v] of Object.entries(opsTracker)) {
    console.log(`${v.corps} | ${v.name} | w${v.start}-w${v.end} (${v.end-v.start+1}w) | ${v.battles} battles | ${v.captures} captures | ${v.brigades} brigades`);
}

// Count orders per week
console.log('\n=== ATTACK ORDERS PER WEEK ===');
for (const w of lines) {
    const wk = w.week_index || w.week;
    const orders = w.attack_orders || w.orders || {};
    const rsOrders = (orders.RS || orders.rs || 0);
    console.log(`w${wk}: RS orders=${typeof rsOrders === 'number' ? rsOrders : JSON.stringify(rsOrders)}`);
}

// Check activity summary
const act = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n646/activity_summary.json','utf8'));
console.log('\n=== ACTIVITY SUMMARY ===');
console.log(JSON.stringify(act, null, 2));
