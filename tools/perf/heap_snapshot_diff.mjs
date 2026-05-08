/**
 * Heap snapshot diff/analyzer (V8 .heapsnapshot JSON format).
 *
 * LANE-NIGHTSHIFT-V093-HEAP-SNAPSHOT-ANALYZER-N1736
 *
 * Reads N V8 heap snapshots and produces:
 *   1. Per-snapshot top-K retainer-type tables (by aggregate self_size and count)
 *   2. Top-K string-name frequencies (constructor / property / variable names)
 *   3. Snapshot-to-snapshot deltas (absolute and fractional) by retainer type
 *   4. Largest individual array nodes per snapshot (accumulator candidates)
 *
 * Format reference (V8 9.x+ — superset compatible across modern Node):
 *   snapshot.meta.node_fields    : ["type","name","id","self_size","edge_count","trace_node_id","detachedness"]
 *   snapshot.meta.node_types[0]  : ["hidden","array","string","object","code","closure","regexp","number","native","synthetic","concatenated string","sliced string","symbol","bigint"]
 *   snapshot.meta.edge_fields    : ["type","name_or_index","to_node"]
 *   nodes  : flat Int32-like array, length = node_count * node_fields.length (typically 7)
 *   edges  : flat array, length = edge_count * edge_fields.length (typically 3)
 *   strings: array of string literals; nodes[i*7+1] is index into strings.
 *
 * Usage:
 *   node tools/perf/heap_snapshot_diff.mjs <snap1> [snap2] [snap3] ...
 *
 * Memory: each snapshot is loaded one-at-a-time, summarised to a small
 * aggregate object, then released for GC. We never hold three full snapshots
 * in memory simultaneously — important because the largest snapshot here is
 * ~127 MB JSON which expands ~3-4x in V8 object space.
 *
 * Determinism: pure function of input bytes. No clocks, no Math.random, no
 * env reads. Output ordering is sorted by aggregate size descending then by
 * type name ascending so byte-stable across runs.
 */

import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const TOP_K = 15;
const NODE_FIELDS_DEFAULT = ['type', 'name', 'id', 'self_size', 'edge_count', 'trace_node_id', 'detachedness'];

/** Load a heap snapshot, summarise, return aggregate. Releases parsed object. */
function summariseSnapshot(path) {
    const fileSize = statSync(path).size;
    const raw = readFileSync(path, 'utf8');
    const snap = JSON.parse(raw);

    const nodeFields = snap.snapshot?.meta?.node_fields || NODE_FIELDS_DEFAULT;
    const nodeFieldCount = nodeFields.length;
    const typeIdx = nodeFields.indexOf('type');
    const nameIdx = nodeFields.indexOf('name');
    const selfSizeIdx = nodeFields.indexOf('self_size');
    const edgeCountIdx = nodeFields.indexOf('edge_count');

    const nodeTypes = snap.snapshot?.meta?.node_types?.[0] || [];
    const nodes = snap.nodes;
    const strings = snap.strings;
    const totalNodes = nodes.length / nodeFieldCount;
    const totalEdges = (snap.edges?.length || 0) / (snap.snapshot?.meta?.edge_fields?.length || 3);

    // type -> {count, total_self_size}
    const byType = new Map();
    // name (string) -> {count, total_self_size, sample_type}  — only for object/closure types; skips strings/numbers/etc which would explode
    const byNameObject = new Map();
    // largest individual nodes (any type) — heap of top-K
    const largestNodes = []; // [{self_size, type, name, edge_count}]

    for (let i = 0; i < totalNodes; i++) {
        const off = i * nodeFieldCount;
        const t = nodes[off + typeIdx];
        const nameStrIdx = nodes[off + nameIdx];
        const sz = nodes[off + selfSizeIdx];
        const ec = nodes[off + edgeCountIdx];
        const typeName = nodeTypes[t] || `type_${t}`;

        let bucket = byType.get(typeName);
        if (!bucket) {
            bucket = { count: 0, total_self_size: 0 };
            byType.set(typeName, bucket);
        }
        bucket.count++;
        bucket.total_self_size += sz;

        // Track names for the structurally interesting types: object, closure, array
        if (typeName === 'object' || typeName === 'closure' || typeName === 'array') {
            const nm = strings[nameStrIdx];
            if (nm && nm.length > 0 && nm.length < 200) {
                let nb = byNameObject.get(nm);
                if (!nb) {
                    nb = { count: 0, total_self_size: 0, sample_type: typeName };
                    byNameObject.set(nm, nb);
                }
                nb.count++;
                nb.total_self_size += sz;
            }
        }

        // Track largest by self_size — useful for finding the actual accumulators
        if (sz >= 1024) {
            largestNodes.push({
                self_size: sz,
                type: typeName,
                name: strings[nameStrIdx] || '',
                edge_count: ec
            });
        }
    }

    // Sort and trim largestNodes
    largestNodes.sort((a, b) => b.self_size - a.self_size);
    const topLargest = largestNodes.slice(0, 30);

    // Sort byType by total_self_size desc
    const typeRows = [...byType.entries()]
        .map(([k, v]) => ({ type: k, count: v.count, total_self_size: v.total_self_size }))
        .sort((a, b) => b.total_self_size - a.total_self_size || a.type.localeCompare(b.type));

    // Sort byNameObject by total_self_size desc
    const nameRows = [...byNameObject.entries()]
        .map(([k, v]) => ({ name: k, count: v.count, total_self_size: v.total_self_size, type: v.sample_type }))
        .sort((a, b) => b.total_self_size - a.total_self_size || a.name.localeCompare(b.name));

    return {
        path,
        file_size_bytes: fileSize,
        total_nodes: totalNodes,
        total_edges: totalEdges,
        type_rows: typeRows,
        name_rows: nameRows.slice(0, 100),
        top_largest_nodes: topLargest
    };
}

function fmtBytes(n) {
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
    if (n >= 1024) return (n / 1024).toFixed(2) + ' KB';
    return n + ' B';
}

function printSummary(s) {
    console.log(`\n=== ${basename(s.path)} (file=${fmtBytes(s.file_size_bytes)}) ===`);
    console.log(`total_nodes=${s.total_nodes}  total_edges=${s.total_edges}`);
    const totalSize = s.type_rows.reduce((a, r) => a + r.total_self_size, 0);
    console.log(`sum(self_size) all nodes = ${fmtBytes(totalSize)}`);

    console.log(`\nTop-${TOP_K} retainer types by aggregate self_size:`);
    console.log('  rank | type             | count       | aggregate_self_size');
    for (let i = 0; i < Math.min(TOP_K, s.type_rows.length); i++) {
        const r = s.type_rows[i];
        console.log(`  ${String(i + 1).padStart(4)} | ${r.type.padEnd(16)} | ${String(r.count).padStart(11)} | ${fmtBytes(r.total_self_size).padStart(14)}`);
    }

    console.log(`\nTop-${TOP_K} object/closure/array names by aggregate self_size:`);
    console.log('  rank | type    | name                                                | count    | aggregate_self_size');
    for (let i = 0; i < Math.min(TOP_K, s.name_rows.length); i++) {
        const r = s.name_rows[i];
        const nm = r.name.length > 50 ? r.name.slice(0, 47) + '...' : r.name;
        console.log(`  ${String(i + 1).padStart(4)} | ${r.type.padEnd(7)} | ${nm.padEnd(50)} | ${String(r.count).padStart(8)} | ${fmtBytes(r.total_self_size).padStart(14)}`);
    }

    console.log(`\nTop-15 individual largest nodes (by self_size):`);
    console.log('  rank | type           | self_size       | edge_count | name');
    for (let i = 0; i < Math.min(15, s.top_largest_nodes.length); i++) {
        const r = s.top_largest_nodes[i];
        const nm = r.name.length > 60 ? r.name.slice(0, 57) + '...' : r.name;
        console.log(`  ${String(i + 1).padStart(4)} | ${r.type.padEnd(14)} | ${fmtBytes(r.self_size).padStart(14)} | ${String(r.edge_count).padStart(10)} | ${nm}`);
    }
}

function diffSummaries(a, b) {
    console.log(`\n=== DELTA ${basename(a.path)} -> ${basename(b.path)} ===`);
    console.log(`nodes: ${a.total_nodes} -> ${b.total_nodes} (Δ ${b.total_nodes - a.total_nodes})`);
    console.log(`edges: ${a.total_edges} -> ${b.total_edges} (Δ ${b.total_edges - a.total_edges})`);
    const aTotal = a.type_rows.reduce((x, r) => x + r.total_self_size, 0);
    const bTotal = b.type_rows.reduce((x, r) => x + r.total_self_size, 0);
    console.log(`aggregate self_size: ${fmtBytes(aTotal)} -> ${fmtBytes(bTotal)} (Δ ${fmtBytes(bTotal - aTotal)})`);

    // Build maps
    const aTypeMap = new Map(a.type_rows.map(r => [r.type, r]));
    const bTypeMap = new Map(b.type_rows.map(r => [r.type, r]));
    const allTypes = new Set([...aTypeMap.keys(), ...bTypeMap.keys()]);

    const typeDeltas = [];
    for (const t of allTypes) {
        const ar = aTypeMap.get(t) || { count: 0, total_self_size: 0 };
        const br = bTypeMap.get(t) || { count: 0, total_self_size: 0 };
        const dSize = br.total_self_size - ar.total_self_size;
        const dCount = br.count - ar.count;
        const fracChange = ar.total_self_size > 0 ? dSize / ar.total_self_size : (br.total_self_size > 0 ? Infinity : 0);
        typeDeltas.push({
            type: t,
            count_a: ar.count,
            count_b: br.count,
            d_count: dCount,
            size_a: ar.total_self_size,
            size_b: br.total_self_size,
            d_size: dSize,
            frac_change: fracChange
        });
    }

    const byAbsSize = [...typeDeltas].sort((x, y) => Math.abs(y.d_size) - Math.abs(x.d_size));
    console.log(`\nTop-${TOP_K} type deltas by |Δ self_size|:`);
    console.log('  rank | type             | size_a        | size_b        | Δ_size          | Δ_count    | frac_change');
    for (let i = 0; i < Math.min(TOP_K, byAbsSize.length); i++) {
        const r = byAbsSize[i];
        const fc = isFinite(r.frac_change) ? (r.frac_change * 100).toFixed(2) + '%' : 'NEW';
        const sign = r.d_size >= 0 ? '+' : '-';
        console.log(`  ${String(i + 1).padStart(4)} | ${r.type.padEnd(16)} | ${fmtBytes(r.size_a).padStart(13)} | ${fmtBytes(r.size_b).padStart(13)} | ${sign + fmtBytes(Math.abs(r.d_size)).padStart(14)} | ${String(r.d_count).padStart(10)} | ${fc.padStart(10)}`);
    }

    // Name-level deltas (objects/closures/arrays)
    const aNameMap = new Map(a.name_rows.map(r => [r.name, r]));
    const bNameMap = new Map(b.name_rows.map(r => [r.name, r]));
    const allNames = new Set([...aNameMap.keys(), ...bNameMap.keys()]);
    const nameDeltas = [];
    for (const nm of allNames) {
        const ar = aNameMap.get(nm) || { count: 0, total_self_size: 0, type: '?' };
        const br = bNameMap.get(nm) || { count: 0, total_self_size: 0, type: '?' };
        const dSize = br.total_self_size - ar.total_self_size;
        nameDeltas.push({
            name: nm,
            type: br.type !== '?' ? br.type : ar.type,
            count_a: ar.count,
            count_b: br.count,
            d_count: br.count - ar.count,
            size_a: ar.total_self_size,
            size_b: br.total_self_size,
            d_size: dSize
        });
    }
    nameDeltas.sort((x, y) => Math.abs(y.d_size) - Math.abs(x.d_size));
    console.log(`\nTop-${TOP_K} object/closure/array name deltas by |Δ self_size|:`);
    console.log('  rank | type    | name                                       | count_a    | count_b    | Δ_size');
    for (let i = 0; i < Math.min(TOP_K, nameDeltas.length); i++) {
        const r = nameDeltas[i];
        const sign = r.d_size >= 0 ? '+' : '-';
        const nm = r.name.length > 42 ? r.name.slice(0, 39) + '...' : r.name;
        console.log(`  ${String(i + 1).padStart(4)} | ${r.type.padEnd(7)} | ${nm.padEnd(42)} | ${String(r.count_a).padStart(10)} | ${String(r.count_b).padStart(10)} | ${sign + fmtBytes(Math.abs(r.d_size))}`);
    }
}

// ─── main ──────────────────────────────────────────────────────────────────
const paths = process.argv.slice(2);
if (paths.length === 0) {
    console.error('usage: node heap_snapshot_diff.mjs <snap1> [snap2] [snap3] ...');
    process.exit(1);
}

const summaries = [];
for (const p of paths) {
    process.stderr.write(`loading ${p}...\n`);
    const s = summariseSnapshot(p);
    printSummary(s);
    summaries.push(s);
}

if (summaries.length >= 2) {
    for (let i = 1; i < summaries.length; i++) {
        diffSummaries(summaries[i - 1], summaries[i]);
    }
    if (summaries.length >= 3) {
        diffSummaries(summaries[0], summaries[summaries.length - 1]);
    }
}
