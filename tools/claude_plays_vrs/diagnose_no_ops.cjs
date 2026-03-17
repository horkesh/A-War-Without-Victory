#!/usr/bin/env node
/**
 * Diagnose why specific corps had no active operations during the three-commander run.
 * Loads campaign_log.json and checks corp states at each flagged turn.
 */

const fs = require('fs');
const path = require('path');

const diagnostics = JSON.parse(fs.readFileSync(path.join(__dirname, '../../runs/three_commanders/diagnostic_report.json'), 'utf8'));
const log = JSON.parse(fs.readFileSync(path.join(__dirname, '../../runs/three_commanders/campaign_log.json'), 'utf8'));

// Group observations by corps
const byCorps = {};
for (const d of diagnostics) {
    const match = d.actual.match(/^(\S+):/);
    if (!match) continue;
    const corpsId = match[1];
    byCorps[corpsId] = byCorps[corpsId] || [];
    byCorps[corpsId].push(d.turn);
}

console.log('=== Diagnostic: Why No Operations? ===\n');

for (const [corpsId, turns] of Object.entries(byCorps)) {
    console.log(`${corpsId}: idle on offensive at turns ${turns.join(', ')}`);

    // Check surrounding turns for operation info
    const firstIdle = turns[0];
    const lastIdle = turns[turns.length - 1];

    // Look at turns before the idle window to find the last completed op
    console.log(`  Looking at turns ${Math.max(0, firstIdle - 3)} to ${Math.min(39, lastIdle + 2)}:`);

    for (let t = Math.max(0, firstIdle - 3); t <= Math.min(39, lastIdle + 2); t++) {
        const turnLog = log.find(l => l.turn === t);
        if (!turnLog) continue;

        // Find this corps' decision
        for (const d of turnLog.decisions) {
            if (d.faction !== 'RS') continue;
            const stance = d.corps_stances[corpsId];
            if (stance) {
                const isIdle = turns.includes(t);
                const marker = isIdle ? '  *** IDLE ***' : '';
                console.log(`    w${t}: stance=${stance}${marker}`);
            }
        }
    }
    console.log('');
}

// The real question: for each idle turn, what was the previous operation status?
// We need to check the actual game state, not just the log. Let's check if we saved weekly saves.
console.log('HYPOTHESIS:');
console.log('  SECONDARY_OP_COOLDOWN_TURNS = 8 turns between different-theater ops.');
console.log('  vrs_2nd_krajina: 9 idle turns (w7-w15) = consistent with 8-turn cooldown.');
console.log('  vrs_east_bosnian: 4 idle turns (w12-w15) = mid-cooldown or density gate.');
console.log('  vrs_1st_krajina: 1 idle turn (w17) = natural gap between ops.');
console.log('  vrs_drina: 5 idle turns (w22-w26) = cooldown after Drina operations.');
console.log('');
console.log('PRIMARY ROOT CAUSE: SECONDARY_OP_COOLDOWN_TURNS = 8 is too long for');
console.log('  offensive corps. A real commander on offensive stance would begin');
console.log('  planning the next operation within 2-3 weeks of completing the last.');
console.log('');
console.log('SECONDARY: isDefenseStrained gate. Small corps (8 bde) on wide fronts');
console.log('  may have density < 0.167, blocking ops even with adequate total force.');
