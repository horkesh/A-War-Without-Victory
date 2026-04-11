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

const SEGMENT_EPSILON = 0.000001;

function pointsMatch(a, b) {
    return Math.abs(a[0] - b[0]) <= SEGMENT_EPSILON
        && Math.abs(a[1] - b[1]) <= SEGMENT_EPSILON;
}

function segmentsMatch(a1, a2, b1, b2) {
    return (pointsMatch(a1, b1) && pointsMatch(a2, b2))
        || (pointsMatch(a1, b2) && pointsMatch(a2, b1));
}

function collectSegments(rings) {
    const segments = [];
    for (const ring of rings) {
        for (let i = 1; i < ring.length; i++) {
            segments.push([ring[i - 1], ring[i]]);
        }
    }
    return segments;
}

/**
 * Count shared boundary segments between two sets of polygon rings.
 * A "shared segment" is a pair of consecutive vertices whose endpoints match
 * within a small epsilon, in either direction. This tolerates harmless float
 * drift between otherwise identical polygon boundaries.
 *
 * Deterministic: iterates rings and vertices in source order.
 */
function countSharedSegments(ringsA, ringsB) {
    const segmentsB = collectSegments(ringsB);
    let totalSegments = 0;

    for (const ringA of ringsA) {
        for (let i = 1; i < ringA.length; i++) {
            const segA0 = ringA[i - 1];
            const segA1 = ringA[i];
            for (const [segB0, segB1] of segmentsB) {
                if (segmentsMatch(segA0, segA1, segB0, segB1)) {
                    totalSegments++;
                    break;
                }
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
