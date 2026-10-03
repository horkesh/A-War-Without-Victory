const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '../..');
const tracePath = resolve(__dirname, 'continuation_sana_t188_trace_artifacts/final_save.json');
const n37Path = resolve(root, 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n37/final_save.json');
const temporalPath = resolve(root, 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n37/brigade_temporal_log.jsonl');
const exact187Path = resolve(__dirname, 'continuation_sana_t187_exact_artifacts/final_save.json');
const outPath = resolve(__dirname, 'continuation_sana_t188_diff_classification.json');
const diagnosticKeys = new Set(['launch_blocker_detail', 'launch_readiness_detail', 'order_generation_details']);

function strip(node) {
  if (Array.isArray(node)) return node.map(strip);
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.keys(node).filter((key) => !diagnosticKeys.has(key)).map((key) => [key, strip(node[key])]));
  }
  return node;
}

function collect(a, b, path, out) {
  if (Object.is(a, b)) return;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    out.push(path || '$');
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      out.push(path || '$');
      return;
    }
    if (a.length !== b.length) out.push(`${path}[length]`);
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      if (i >= a.length || i >= b.length) out.push(`${path}[${i}]`);
      else collect(a[i], b[i], `${path}[${i}]`, out);
    }
    return;
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const key of keys) {
    const next = path ? `${path}.${key}` : key;
    if (!(key in a) || !(key in b)) out.push(next);
    else collect(a[key], b[key], next, out);
  }
}

function group(paths, depth) {
  const counts = {};
  for (const path of paths) {
    const key = path.replace(/\[\d+\]/g, '[]').split('.').slice(0, depth).join('.');
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

const trace = JSON.parse(readFileSync(tracePath, 'utf8'));
const n37 = JSON.parse(readFileSync(n37Path, 'utf8'));
const exact187 = JSON.parse(readFileSync(exact187Path, 'utf8'));
const paths = [];
collect(strip(trace), strip(n37), '', paths);

const retainedRows = readFileSync(temporalPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const retained188 = new Map(retainedRows.filter((row) => row.turn === 188).map((row) => [row.brigade_id, row]));
const retained187 = new Map(retainedRows.filter((row) => row.turn === 187).map((row) => [row.brigade_id, row]));
const finalMovementDifferences = [];
for (const [id, expected] of retained188) {
  const formation = trace.military.formations?.[id];
  const movementState = trace.military.brigade_movement_state?.[id];
  const movementOrder = trace.military.brigade_movement_orders?.[id];
  const actual = {
    location_osid: formation?.location_osid ?? null,
    movement_destination: movementState?.destination_sids?.[0] ?? movementOrder?.destination_sids?.[0] ?? null,
    movement_status: movementState?.status ?? null,
  };
  const wanted = {
    location_osid: expected.location_osid ?? null,
    movement_destination: expected.mv_destinations?.[0] ?? null,
    movement_status: expected.mv_state ?? null,
  };
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) finalMovementDifferences.push({ id, wanted, actual });
}

const input187FormationDifferences = [];
for (const [id, expected] of retained187) {
  const formation = exact187.military.formations?.[id];
  const movementState = exact187.military.brigade_movement_state?.[id];
  const movementOrder = exact187.military.brigade_movement_orders?.[id];
  const actual = {
    status: formation?.status ?? null,
    location_osid: formation?.location_osid ?? null,
    movement_destination: movementState?.destination_sids?.[0] ?? movementOrder?.destination_sids?.[0] ?? null,
    movement_status: movementState?.status ?? null,
  };
  const wanted = {
    status: expected.status ?? null,
    location_osid: expected.location_osid ?? null,
    movement_destination: expected.mv_destinations?.[0] ?? null,
    movement_status: expected.mv_state ?? null,
  };
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) input187FormationDifferences.push({ id, wanted, actual });
}

const result = {
  normalized_leaf_difference_count: paths.length,
  counts_by_top_level: group(paths, 1),
  counts_by_system: group(paths, 2),
  counts_by_subsystem: group(paths, 3),
  samples_by_system: Object.fromEntries(Object.keys(group(paths, 2)).map((system) => [
    system,
    paths.filter((path) => path.startsWith(system)).slice(0, 5),
  ])),
  column_aggregate_difference: {
    n37: { column_advances: 1, column_arrivals: 6, column_blocked: 11, column_starts: 6 },
    trace: { column_advances: 1, column_arrivals: 6, column_blocked: 12, column_starts: 5 },
    final_formation_movement_differences: finalMovementDifferences,
    retained_t187_vs_unflagged_replay_formation_snapshot_differences: input187FormationDifferences,
    extra_trace_turn188_movements: [
      { formation_id: 'arbih_1st_cerska', from_osid: 'op:srebrenica:bostahovine_2', to_osid: 'op:tuzla:gornja_tuzla', resumed_reconstitution: true },
      { formation_id: 'hrhb_105th_modrica_brigade', from_osid: 'op:bosanski_samac:novo_selo_2', to_osid: 'op:orasje:donja_mahala', resumed_reconstitution: true },
    ],
    actor_identifiable_from_retained_evidence: false,
    missing_receipt: 'Both weekly reports omit movement_reject column_rejections. Two destroyed formations reconstituted and moved only in the resumed trace, proving broader divergence, but the retained aggregates do not identify which pending column order accounts for blocked +1 / starts -1.',
  },
};
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
