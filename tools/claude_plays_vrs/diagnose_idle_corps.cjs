#!/usr/bin/env node
/**
 * Diagnose why specific corps are idle despite offensive stance.
 * Runs a 40w scenario and dumps status_reason + op_launch_trace for target corps at target turns.
 */
const fs = require('fs');
const path = require('path');

// Load the final save from the QA run
const savePath = path.join(__dirname, '../../runs/three_commanders/final_save.json');
if (!fs.existsSync(savePath)) {
    console.error('No final save found. Run npm run sim:qa:commanders first.');
    process.exit(1);
}

const state = JSON.parse(fs.readFileSync(savePath, 'utf8'));
const cc = state.military?.corps_command ?? {};

console.log('=== Corps Diagnostic: status_reason + op_launch_trace ===\n');
console.log('(Shows FINAL turn state — to see per-turn traces, need weekly saves)\n');

const targetCorps = ['vrs_1st_krajina', 'vrs_2nd_krajina', 'vrs_drina', 'vrs_east_bosnian', 'vrs_herzegovina', 'vrs_sarajevo_romanija'];

for (const corpsId of targetCorps) {
    const cmd = cc[corpsId];
    if (!cmd) continue;
    const stance = cmd.stance ?? '?';
    const statusReason = cmd.status_reason ?? 'not set';
    const trace = (cmd.op_launch_trace ?? []).join(', ') || 'not set';
    const ops = cmd.active_operations ?? [];
    const op = ops[0] ?? null;
    const opStr = op ? `${op.name} (${op.phase})` : 'none';
    const lastOpTurn = cmd.last_completed_operation_turn ?? -1;
    const exhaustion = cmd.corps_exhaustion ?? 0;

    console.log(`${corpsId}:`);
    console.log(`  stance: ${stance}`);
    console.log(`  status_reason: ${statusReason}`);
    console.log(`  op_launch_trace: ${trace}`);
    console.log(`  active_op: ${opStr}`);
    console.log(`  last_completed_op_turn: ${lastOpTurn}`);
    console.log(`  corps_exhaustion: ${exhaustion}`);
    console.log('');
}

// Also check formation counts per corps
const formations = state.military?.formations ?? {};
console.log('=== Brigade counts per corps ===\n');
for (const corpsId of targetCorps) {
    let count = 0, totalPers = 0;
    for (const [, f] of Object.entries(formations)) {
        if (f.faction === 'RS' && f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active') {
            count++;
            totalPers += f.personnel ?? 0;
        }
    }
    console.log(`  ${corpsId}: ${count} brigades, ${totalPers} personnel`);
}

// Check sectors for the problematic corps
const sectors = state.military?.corps_front_sectors;
if (sectors) {
    console.log('\n=== Sector density per corps ===\n');
    for (const corpsId of targetCorps) {
        const corpsSectors = Object.values(sectors).filter(s => s.corps_id === corpsId);
        const totalEdges = corpsSectors.reduce((sum, s) => sum + (s.length_edges ?? 0), 0);
        const totalBrigades = corpsSectors.reduce((sum, s) => sum + (s.assigned_brigade_ids?.length ?? 0), 0);
        const density = totalEdges > 0 ? (totalBrigades / totalEdges).toFixed(3) : 'N/A';
        const cmd = cc[corpsId];
        const stanceThreshold = cmd?.stance === 'offensive' ? 0.08 : cmd?.stance === 'balanced' ? 0.12 : 0.167;
        const strained = totalEdges > 0 && (totalBrigades / totalEdges) < stanceThreshold;
        console.log(`  ${corpsId}: ${corpsSectors.length} sectors, ${totalEdges} edges, ${totalBrigades} bde assigned, density=${density} (threshold=${stanceThreshold}, strained=${strained})`);
    }
}
