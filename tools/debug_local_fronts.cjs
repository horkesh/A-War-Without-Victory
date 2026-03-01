#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2] || 'runs/apr1992_definitive_40w__205b3676c8fe3ce4__w40_n297';
const finalSavePath = path.join(runDir, 'final_save.json');

console.log('Reading:', finalSavePath);
const data = JSON.parse(fs.readFileSync(finalSavePath, 'utf8'));
const state = data.state || data.gameState || data;

const segments = state.assignable_front_segments || [];
const assignments = state.brigade_front_assignment || {};
const formations = state.formations || {};

// Step 1: Group brigades by their assigned front_id
const brigadesByFront = {};
const sortedBrigadeIds = Object.keys(assignments).sort();
let nullCount = 0;
for (const brigId of sortedBrigadeIds) {
    const frontId = assignments[brigId];
    if (frontId === null || frontId === undefined) {
        nullCount++;
        continue;
    }
    if (typeof frontId !== 'string') {
        console.log('Non-string frontId:', typeof frontId, frontId, 'for brigade:', brigId);
        continue;
    }
    if (!brigadesByFront[frontId]) brigadesByFront[frontId] = [];
    brigadesByFront[frontId].push(brigId);
}

console.log('\n=== STEP 1: Brigade grouping ===');
console.log('Total brigades in BFA:', sortedBrigadeIds.length);
console.log('Null/reserve brigades:', nullCount);
console.log('Grouped into', Object.keys(brigadesByFront).length, 'unique front IDs');

// Step 2: Match against segment front_ids
console.log('\n=== STEP 2: Segment matching ===');
console.log('Total segments:', segments.length);

let frontsBuilt = 0;
let segmentsWithoutBrigades = 0;
let segmentsWithBrigades = 0;

for (const seg of segments) {
    const brigIds = brigadesByFront[seg.front_id];
    if (!brigIds || brigIds.length === 0) {
        segmentsWithoutBrigades++;
        continue;
    }
    segmentsWithBrigades++;

    // Check first brigade exists
    const firstBrig = formations[brigIds[0]];
    if (!firstBrig) {
        console.log('ERROR: First brigade not found:', brigIds[0]);
        continue;
    }

    frontsBuilt++;
    console.log('MATCH: ' + seg.front_id.substring(0, 70) + '  brigades=' + brigIds.length + '  edges=' + seg.length_edges);
}

console.log('\nSegments with brigades:', segmentsWithBrigades);
console.log('Segments without brigades:', segmentsWithoutBrigades);
console.log('Local fronts that SHOULD be built:', frontsBuilt);
console.log('Actual local_fronts in save:', Object.keys(state.local_fronts || {}).length);

// Step 3: Check for BFA front IDs that don't match any segment
console.log('\n=== STEP 3: Orphan BFA front IDs ===');
const segFrontIds = new Set(segments.map(s => s.front_id));
const orphanFrontIds = Object.keys(brigadesByFront).filter(fid => !segFrontIds.has(fid));
if (orphanFrontIds.length > 0) {
    console.log('BFA front IDs not in segments (' + orphanFrontIds.length + '):');
    for (const fid of orphanFrontIds) {
        console.log('  ' + fid + ' (' + brigadesByFront[fid].length + ' brigades)');
    }
} else {
    console.log('All BFA front IDs match a segment');
}

// Step 4: Check if segment has 'name' field
console.log('\n=== STEP 4: Segment schema check ===');
const firstSeg = segments[0];
if (firstSeg) {
    console.log('Segment keys:', Object.keys(firstSeg).join(', '));
    console.log('Has name?', 'name' in firstSeg, firstSeg.name);
}

// Step 5: Check formation kinds — only brigades/OG count
console.log('\n=== STEP 5: Brigade-to-front via corps ===');
for (const seg of segments.slice(0, 3)) {
    const brigIds = brigadesByFront[seg.front_id];
    if (!brigIds) continue;
    console.log('\nFront: ' + seg.front_id.substring(0, 60));
    for (const bid of brigIds.slice(0, 5)) {
        const f = formations[bid];
        if (f) {
            console.log('  ' + bid + ' kind=' + f.kind + ' status=' + f.status + ' faction=' + f.faction + ' corps=' + (f.corps_id || 'none'));
        }
    }
}
