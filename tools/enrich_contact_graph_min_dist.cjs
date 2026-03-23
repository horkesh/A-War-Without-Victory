/**
 * Enrich operational_contact_graph.json with min_dist field.
 * Computes minimum distance between polygon boundaries for each edge pair.
 * This is critical for sector splitting — without min_dist, all adjacency
 * filters are no-ops and sectors can span disconnected fronts.
 *
 * Usage: node tools/enrich_contact_graph_min_dist.cjs
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data/derived/operational');
const graphFile = path.join(DATA_DIR, 'operational_contact_graph.json');
const geoFile = path.join(DATA_DIR, 'operational_settlements.geojson');

const graphData = JSON.parse(fs.readFileSync(graphFile, 'utf8'));
const geoData = JSON.parse(fs.readFileSync(geoFile, 'utf8'));

// Build OSID → polygon ring lookup
const polygonByOsid = new Map();
for (const feature of geoData.features) {
    const osid = feature.properties?.osid;
    if (!osid) continue;
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
        polygonByOsid.set(osid, geom.coordinates[0]); // outer ring
    } else if (geom.type === 'MultiPolygon') {
        // Use largest ring
        let bestRing = geom.coordinates[0][0];
        let bestLen = bestRing.length;
        for (const poly of geom.coordinates) {
            if (poly[0].length > bestLen) {
                bestRing = poly[0];
                bestLen = poly[0].length;
            }
        }
        polygonByOsid.set(osid, bestRing);
    }
}

/**
 * Compute minimum distance between two polygon rings.
 * Uses vertex-to-vertex minimum (fast approximation, sufficient for our thresholds).
 * Returns distance in degrees.
 */
function minDistBetweenRings(ringA, ringB) {
    let minDist = Infinity;
    // Sample every vertex of A against every vertex of B
    // For performance, skip closing vertex (same as first)
    const lenA = ringA.length - 1;
    const lenB = ringB.length - 1;
    for (let i = 0; i < lenA; i++) {
        const ax = ringA[i][0], ay = ringA[i][1];
        for (let j = 0; j < lenB; j++) {
            const dx = ax - ringB[j][0];
            const dy = ay - ringB[j][1];
            const d = dx * dx + dy * dy;
            if (d < minDist) minDist = d;
        }
    }
    return Math.sqrt(minDist);
}

let enriched = 0;
let missing = 0;

for (const edge of graphData.edges) {
    const ringA = polygonByOsid.get(edge.a);
    const ringB = polygonByOsid.get(edge.b);
    if (!ringA || !ringB) {
        missing++;
        continue;
    }
    edge.min_dist = minDistBetweenRings(ringA, ringB);
    enriched++;
}

fs.writeFileSync(graphFile, JSON.stringify(graphData, null, 2) + '\n', 'utf8');

// Stats
const withDist = graphData.edges.filter(e => e.min_dist !== undefined);
const shared = withDist.filter(e => e.min_dist < 0.00005); // ~5.5m
const frontEdge = withDist.filter(e => e.min_dist <= 0.0003); // ~33m
const distant = withDist.filter(e => e.min_dist > 0.0003);

console.log(`✓ Enriched ${enriched}/${graphData.edges.length} edges with min_dist (${missing} missing polygons)`);
console.log(`  Shared boundary (<5.5m):  ${shared.length}`);
console.log(`  Front-edge (≤33m):        ${frontEdge.length}`);
console.log(`  Distant (>33m):           ${distant.length}`);

// Show some distant edges as sanity check
if (distant.length > 0) {
    console.log('\nSample distant edges:');
    for (const e of distant.slice(0, 10)) {
        const meters = e.min_dist * 111000;
        console.log(`  ${e.a} <-> ${e.b}: ${meters.toFixed(0)}m`);
    }
}
