/**
 * Diagnostic: sector size histogram from the latest save.
 * Investigates the n668→n682 jump from ~92 to 144 sectors.
 */
const save = require('../data/derived/latest_run_final_save.json');

const sectors = save.military.corps_front_sectors;
if (!sectors || typeof sectors !== 'object') {
    console.error('No corps_front_sectors found in save');
    process.exit(1);
}

const sectorList = Object.values(sectors);
console.log(`\n=== SECTOR SIZE ANALYSIS ===`);
console.log(`Total sectors: ${sectorList.length}\n`);

// Histogram bins
const bins = [
    { label: '1-2 edges', min: 1, max: 2 },
    { label: '3-5 edges', min: 3, max: 5 },
    { label: '6-10 edges', min: 6, max: 10 },
    { label: '11-15 edges', min: 11, max: 15 },
    { label: '16-25 edges', min: 16, max: 25 },
    { label: '26+ edges', min: 26, max: Infinity },
];

function histogram(list, label) {
    const counts = bins.map(b => ({ ...b, count: 0 }));
    let total = 0;
    for (const s of list) {
        const edgeCount = (s.edge_ids || []).length;
        total++;
        for (const bin of counts) {
            if (edgeCount >= bin.min && edgeCount <= bin.max) {
                bin.count++;
                break;
            }
        }
    }
    console.log(`--- ${label} (${total} sectors) ---`);
    for (const bin of counts) {
        const pct = total > 0 ? ((bin.count / total) * 100).toFixed(1) : '0.0';
        const bar = '#'.repeat(Math.round(bin.count / Math.max(1, total) * 40));
        console.log(`  ${bin.label.padEnd(12)} ${String(bin.count).padStart(4)}  (${pct.padStart(5)}%)  ${bar}`);
    }
    console.log();
}

// Overall histogram
histogram(sectorList, 'ALL FACTIONS');

// Per-faction
const factions = {};
for (const s of sectorList) {
    const f = s.faction || 'unknown';
    if (!factions[f]) factions[f] = [];
    factions[f].push(s);
}
for (const [faction, list] of Object.entries(factions).sort()) {
    histogram(list, faction);
}

// Per-corps breakdown for tiny sectors
console.log(`=== TINY SECTORS (1-2 edges) — Detail ===`);
const tiny = sectorList.filter(s => (s.edge_ids || []).length <= 2);
tiny.sort((a, b) => (a.edge_ids || []).length - (b.edge_ids || []).length);
for (const s of tiny) {
    const edgeCount = (s.edge_ids || []).length;
    const brigCount = (s.assigned_brigade_ids || []).length + (s.reserve_brigade_ids || []).length;
    const terr = (s.territory_osids || []).length;
    console.log(`  ${s.sector_id.padEnd(45)} edges=${edgeCount}  brigades=${brigCount}  territory=${terr}  corps=${s.corps_id}`);
}
console.log();

// Per-corps sector count
console.log(`=== SECTORS PER CORPS ===`);
const corpsCounts = {};
for (const s of sectorList) {
    const c = s.corps_id || 'unknown';
    if (!corpsCounts[c]) corpsCounts[c] = { total: 0, tiny: 0, small: 0, medium: 0, large: 0 };
    corpsCounts[c].total++;
    const e = (s.edge_ids || []).length;
    if (e <= 2) corpsCounts[c].tiny++;
    else if (e <= 5) corpsCounts[c].small++;
    else if (e <= 15) corpsCounts[c].medium++;
    else corpsCounts[c].large++;
}
for (const [corps, counts] of Object.entries(corpsCounts).sort()) {
    console.log(`  ${corps.padEnd(35)} total=${String(counts.total).padStart(3)}  tiny(1-2)=${String(counts.tiny).padStart(2)}  small(3-5)=${String(counts.small).padStart(2)}  med(6-15)=${String(counts.medium).padStart(2)}  large(16+)=${String(counts.large).padStart(2)}`);
}
console.log();

// Edge count statistics
const edgeCounts = sectorList.map(s => (s.edge_ids || []).length);
edgeCounts.sort((a, b) => a - b);
const sum = edgeCounts.reduce((a, b) => a + b, 0);
const mean = sum / edgeCounts.length;
const median = edgeCounts[Math.floor(edgeCounts.length / 2)];
console.log(`=== EDGE COUNT STATISTICS ===`);
console.log(`  Mean:   ${mean.toFixed(1)}`);
console.log(`  Median: ${median}`);
console.log(`  Min:    ${edgeCounts[0]}`);
console.log(`  Max:    ${edgeCounts[edgeCounts.length - 1]}`);
console.log(`  Total edges across all sectors: ${sum}`);
console.log();

// Brigade distribution
const brigCounts = sectorList.map(s => (s.assigned_brigade_ids || []).length + (s.reserve_brigade_ids || []).length);
const emptyBrig = brigCounts.filter(b => b === 0).length;
const singleBrig = brigCounts.filter(b => b === 1).length;
console.log(`=== BRIGADE ASSIGNMENT ===`);
console.log(`  Sectors with 0 brigades: ${emptyBrig}`);
console.log(`  Sectors with 1 brigade:  ${singleBrig}`);
console.log(`  Sectors with 2+ brigades: ${brigCounts.filter(b => b >= 2).length}`);
console.log();

// Check for sectors created by the strict Case B split (subseg IDs containing 'ftsplit')
const ftSplitSectors = sectorList.filter(s =>
    (s.sub_segments || []).some(ss => ss.sub_segment_id && ss.sub_segment_id.includes('ftsplit'))
);
console.log(`=== STRICT CASE B SPLITS (ftsplit) ===`);
console.log(`  Sectors created by strict Case B re-check: ${ftSplitSectors.length}`);
for (const s of ftSplitSectors) {
    const edgeCount = (s.edge_ids || []).length;
    const brigCount = (s.assigned_brigade_ids || []).length + (s.reserve_brigade_ids || []).length;
    console.log(`  ${s.sector_id.padEnd(45)} edges=${edgeCount}  brigades=${brigCount}  corps=${s.corps_id}`);
}
console.log();

// Check for sectors from regular splits
const regularSplitSectors = sectorList.filter(s =>
    (s.sub_segments || []).some(ss => ss.sub_segment_id && ss.sub_segment_id.includes(':split'))
);
console.log(`=== REGULAR SPLITS (non-contiguous component splits) ===`);
console.log(`  Sectors with split sub-segments: ${regularSplitSectors.length}`);
console.log();

// Summary comparison
console.log(`=== COMPARISON SUMMARY ===`);
console.log(`  n668 baseline: ~92 sectors`);
console.log(`  Current save:  ${sectorList.length} sectors`);
console.log(`  Delta:         +${sectorList.length - 92} sectors`);
console.log(`  Sectors ≤2 edges: ${tiny.length} (${((tiny.length / sectorList.length) * 100).toFixed(1)}%)`);
console.log(`  Sectors ≤5 edges: ${sectorList.filter(s => (s.edge_ids||[]).length <= 5).length} (${((sectorList.filter(s => (s.edge_ids||[]).length <= 5).length / sectorList.length) * 100).toFixed(1)}%)`);
