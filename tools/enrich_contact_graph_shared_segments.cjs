/**
 * Enrich operational_contact_graph.json with shared_segments field.
 * For each edge, counts the number of consecutive shared vertex pairs
 * (i.e. shared boundary segments) between the two OSID polygons.
 *
 * Point-only contacts (shared_segments=0, min_dist=0) are artifacts from
 * polygon derivation — two polygons share a single snapped vertex but NO
 * actual boundary segment. These must be filtered by downstream consumers.
 *
 * Usage: node tools/enrich_contact_graph_shared_segments.cjs
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data/derived/operational');
const graphFile = path.join(DATA_DIR, 'operational_contact_graph.json');
const geoFile = path.join(DATA_DIR, 'operational_settlements.geojson');

const graphData = JSON.parse(fs.readFileSync(graphFile, 'utf8'));
const geoData = JSON.parse(fs.readFileSync(geoFile, 'utf8'));

// Build OSID → all polygon rings (outer rings only)
// For MultiPolygon, collect all outer rings so we check all parts.
const ringsByOsid = new Map();
for (const feature of geoData.features) {
    const osid = feature.properties?.osid;
    if (!osid) continue;
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
        ringsByOsid.set(osid, [geom.coordinates[0]]);
    } else if (geom.type === 'MultiPolygon') {
        const rings = geom.coordinates.map(poly => poly[0]);
        ringsByOsid.set(osid, rings);
    }
}

/**
 * Build a Set of coordinate keys from a polygon ring for fast lookup.
 * Key format: "lon,lat" with full precision.
 */
function buildVertexSet(ring) {
    const set = new Set();
    for (let i = 0; i < ring.length; i++) {
        set.add(ring[i][0] + ',' + ring[i][1]);
    }
    return set;
}

/**
 * Count shared boundary segments between two sets of polygon rings.
 * A "shared segment" is a pair of consecutive vertices in ring A that
 * both appear in ring B (exact coordinate match). We count how many
 * such consecutive pairs exist across all ring combinations.
 *
 * Deterministic: iterates rings and vertices in source order.
 */
function countSharedSegments(ringsA, ringsB) {
    let totalSegments = 0;

    for (const ringA of ringsA) {
        // Build vertex set from all B rings for fast lookup
        const vertexSetB = new Set();
        for (const ringB of ringsB) {
            for (let i = 0; i < ringB.length; i++) {
                vertexSetB.add(ringB[i][0] + ',' + ringB[i][1]);
            }
        }

        // Count consecutive shared vertex pairs in ring A
        // Skip closing vertex (ringA[len-1] === ringA[0] for closed rings)
        const len = ringA.length - 1;
        for (let i = 0; i < len; i++) {
            const keyI = ringA[i][0] + ',' + ringA[i][1];
            const nextIdx = (i + 1) % len;
            const keyNext = ringA[nextIdx][0] + ',' + ringA[nextIdx][1];
            if (vertexSetB.has(keyI) && vertexSetB.has(keyNext)) {
                totalSegments++;
            }
        }
    }

    return totalSegments;
}

let enriched = 0;
let missing = 0;

for (const edge of graphData.edges) {
    const ringsA = ringsByOsid.get(edge.a);
    const ringsB = ringsByOsid.get(edge.b);
    if (!ringsA || !ringsB) {
        missing++;
        continue;
    }
    edge.shared_segments = countSharedSegments(ringsA, ringsB);
    enriched++;
}

// Sort edges for deterministic output (a then b)
graphData.edges.sort((e1, e2) => {
    if (e1.a !== e2.a) return e1.a < e2.a ? -1 : 1;
    return e1.b < e2.b ? -1 : e1.b > e2.b ? 1 : 0;
});

fs.writeFileSync(graphFile, JSON.stringify(graphData, null, 2) + '\n', 'utf8');

// Stats
const withSegments = graphData.edges.filter(e => e.shared_segments !== undefined);
const pointOnly = withSegments.filter(e => e.shared_segments === 0);
const realContact = withSegments.filter(e => e.shared_segments >= 1);
const minDistZero = graphData.edges.filter(e => e.min_dist === 0);
const pointOnlyMinZero = minDistZero.filter(e => e.shared_segments === 0);

console.log(`Enriched ${enriched}/${graphData.edges.length} edges with shared_segments (${missing} missing polygons)`);
console.log(`  Total edges:              ${graphData.edges.length}`);
console.log(`  shared_segments = 0:      ${pointOnly.length} (point-only contacts)`);
console.log(`  shared_segments >= 1:     ${realContact.length} (real boundary contacts)`);
console.log(`  min_dist=0 AND segments=0: ${pointOnlyMinZero.length} (phantom adjacency)`);
console.log();

if (pointOnly.length > 0) {
    console.log('Point-only contacts (shared_segments=0):');
    for (const e of pointOnly) {
        console.log(`  ${e.a} <-> ${e.b}  (min_dist=${e.min_dist})`);
    }
}
