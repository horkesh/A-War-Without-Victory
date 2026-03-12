const fs = require('fs');
const lines = fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n633/weekly_report.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));

// Check ops reports for w1-w6 — what operations are RS running?
console.log('=== RS OPERATIONS w1-w12 ===');
for (const w of lines.slice(0, 12)) {
    const wk = w.week_index || w.week;
    if (w.ops) {
        for (const op of w.ops) {
            if (op.faction === 'RS' || (op.corps && op.corps.startsWith('vrs'))) {
                console.log(`w${wk}: ${op.name || op.operation_id || '?'} | corps:${op.corps} | target:${op.target_osid || op.objective || '?'} | status:${op.status || '?'}`);
            }
        }
    }
    if (w.operation_diagnostics) {
        for (const od of w.operation_diagnostics) {
            if (od.faction === 'RS' || (od.corps && od.corps.startsWith('vrs'))) {
                console.log(`w${wk} diag: ${od.corps || '?'} | ${od.operation || '?'} | target:${od.target || od.target_osid || '?'} | status:${od.status || od.phase || '?'}`);
            }
        }
    }
}

// Check the RS timeline doctrine — what targets are specified for the Posavina corps?
console.log('\n=== CHECKING TIMELINE DIRECTIVES ===');
try {
    const timeline = JSON.parse(fs.readFileSync('data/scenarios/timelines/apr1992.json', 'utf8'));
    if (timeline.doctrine_phases) {
        for (const [faction, phases] of Object.entries(timeline.doctrine_phases)) {
            if (faction === 'RS') {
                console.log('RS doctrine phases:', JSON.stringify(phases, null, 2).slice(0, 2000));
            }
        }
    }
    // Check for corps-specific directives
    if (timeline.corps_directives) {
        for (const [corps, dirs] of Object.entries(timeline.corps_directives)) {
            if (corps.startsWith('vrs')) {
                console.log(`\n${corps} directives:`, JSON.stringify(dirs, null, 2).slice(0, 1000));
            }
        }
    }
} catch (e) {
    console.log('Timeline error:', e.message);
}

// Check what pre-planned operations exist
console.log('\n=== SCENARIO PRE-PLANNED OPS ===');
try {
    const scenario = JSON.parse(fs.readFileSync('data/scenarios/apr1992_definitive_40w.json', 'utf8'));
    if (scenario.pre_planned_operations) {
        for (const op of scenario.pre_planned_operations) {
            if (op.faction === 'RS') {
                console.log(JSON.stringify(op));
            }
        }
    }
} catch (e) {
    console.log('Scenario error:', e.message);
}

// What corps do these Posavina RS brigades belong to?
console.log('\n=== RS CORPS FOR POSAVINA ===');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const posavina_bdes = ['rs_1st_posavina_infantry', 'rs_2nd_posavina_light_infantry', 'rs_3rd_posavina_light_infantry',
    'rs_1st_doboj_light_infantry', 'rs_1st_krnjin_light_infantry', 'rs_1st_trebava_infantry', 'rs_27th_derventa_motorized'];
for (const bid of posavina_bdes) {
    const b = oob.find(x => x.id === bid);
    if (b) console.log(`${bid} | corps:${b.corps} | home:${b.home_osid}`);
}
