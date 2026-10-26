const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = process.argv[2];
if (!OUT) throw new Error('output path required');
const OSID = 'op:donji_vakuf:korenici';
const ATTACKER = 'rs_16th_krajina_motorized';
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const posix = (p) => path.relative(ROOT, p).replaceAll('\\', '/');
const at = (...p) => path.join(ROOT, ...p);

const graphPath = at('data', 'derived', 'operational', 'operational_contact_graph.json');
const terrainPath = at('data', 'derived', 'terrain', 'settlements_terrain_scalars.json');
const osPath = at('data', 'derived', 'operational', 'operational_settlements.geojson');
const graph = read(graphPath);
const terrain = read(terrainPath);
const osFeature = read(osPath).features.find((f) => f.properties.osid === OSID);
if (!osFeature) throw new Error('Korenici OSID missing');
const adjacency = new Map(graph.nodes.map((n) => [n.id, []]));
for (const e of graph.edges) {
  const a = e.a ?? e.source, b = e.b ?? e.target;
  if (!adjacency.has(a)) adjacency.set(a, []);
  if (!adjacency.has(b)) adjacency.set(b, []);
  adjacency.get(a).push(b); adjacency.get(b).push(a);
}
for (const v of adjacency.values()) v.sort();

function hops(from, to, max = 12) {
  if (from === to) return 0;
  const seen = new Set([from]); let q = [from];
  for (let h = 1; h <= max; h++) {
    const next = [];
    for (const p of q) for (const n of adjacency.get(p) ?? []) {
      if (seen.has(n)) continue;
      if (n === to) return h;
      seen.add(n); next.push(n);
    }
    q = next;
  }
  return null;
}

function terrainComposite(t) {
  let mult = 1;
  if (t.river_crossing_penalty >= 0.5) mult *= 1.3;
  if (t.slope_index >= 0.5) mult *= 1.4;
  else if (t.slope_index >= 0.35) mult *= 1.15;
  if (t.road_access_index >= 0.6) mult *= 0.9;
  if (t.terrain_friction_index >= 0.5) mult *= 1.2;
  return mult;
}
const terrainRows = osFeature.properties.constituent_sids.map((sid) => ({ sid, ...terrain.by_sid[sid], composite: terrainComposite(terrain.by_sid[sid]) }));
const defenderTerrainMult = terrainRows.reduce((s, x) => s + x.composite, 0) / terrainRows.length;
const meanSlope = terrainRows.reduce((s, x) => s + x.slope_index, 0) / terrainRows.length;

function formation(state, id) {
  const f = state.military.formations[id];
  if (!f) return null;
  const supply = state.political.last_supply_state_by_osid?.[f.location_osid] ?? null;
  const fatigue = f.ops?.fatigue ?? 0;
  return {
    id, faction: f.faction, corps_id: f.corps_id, location_osid: f.location_osid,
    personnel: f.personnel, morale: f.morale, cohesion: f.cohesion,
    posture: f.posture ?? null, readiness: f.readiness ?? null,
    disrupted_turns: f.disrupted_turns ?? 0, entrenchment_turns: f.entrenchment_turns ?? 0,
    fatigue, attack_fatigue_mult_from_current_formula: 1 - Math.min(1, fatigue / 30) * 0.4,
    defend_fatigue_mult_from_current_formula: 1 - Math.min(1, fatigue / 30) * 0.25,
    supply_at_location: supply,
    composition: f.composition,
    equipment_class: f.equipment_class,
    equipment_state: f.equipment_state ?? null,
    experience: f.experience ?? null,
    officer_quality: f.officer_quality ?? null,
    assignment: f.assignment ?? null,
    sub_segment: f.assigned_sub_segment_id ?? null,
  };
}

function opContext(state) {
  for (const [corpsId, cmd] of Object.entries(state.military.corps_command ?? {})) {
    for (const op of cmd.active_operations ?? []) {
      if (!(op.participating_brigades ?? []).includes(ATTACKER)) continue;
      const axis = (op.axes ?? []).find((a) => (a.assigned_brigades ?? []).includes(ATTACKER));
      const attackers = new Set([ATTACKER]);
      let weighted = 0;
      const mates = (axis?.assigned_brigades ?? []).filter((id) => id !== ATTACKER).sort().map((id) => {
        const f = state.military.formations[id];
        const distance = f?.location_osid ? hops(f.location_osid, OSID) : null;
        const contribution = f?.status === 'active' && distance != null && distance <= 2 ? (distance <= 1 ? 1 : 0.5) : 0;
        weighted += contribution;
        return { id, location_osid: f?.location_osid ?? null, status: f?.status ?? null, hops_to_korenici: distance, weighted_contribution: contribution };
      });
      const countedSupport = Math.floor(weighted);
      const effectiveCount = Math.min(4, 1 + countedSupport);
      return {
        corps_id: corpsId, operation: op.name, phase: op.phase,
        execution_attack_power_mult: op.execution_attack_power_mult ?? 1,
        axis_id: axis?.axis_id ?? null, main_brigade: axis?.main_brigade ?? null,
        support_brigades: axis?.support_brigades ?? [], assigned_brigades: axis?.assigned_brigades ?? [],
        current_objective: axis?.objectives?.[axis.current_objective_index ?? 0] ?? null,
        axis_mates: mates, counted_axis_support: countedSupport,
        effective_attacker_count: effectiveCount,
        concentration_mult_from_current_formula: 1 + Math.min(0.3, (effectiveCount - 1) * 0.1),
      };
    }
  }
  return null;
}

const ratioBand = (outcome) => ({
  decisive_victory: '[2.0,+inf)', victory: '[1.5,2.0)', costly_victory: '[1.0,1.5)',
  stalemate: '[0.7,1.0)', repulsed: '[0.5,0.7)', catastrophic: '[0,0.5)',
}[outcome] ?? null);

function battleAudit(prePath, postPath, cohort) {
  const pre = read(prePath), post = read(postPath);
  const summary = post.turn_summaries.find((x) => x.turn === post.meta.turn);
  const b = summary?.battles?.find((x) => x.osid === OSID && x.primary_attacker_id === ATTACKER);
  if (!b) return null;
  const defenderIds = [...new Set([b.primary_defender_id, ...(b.defender_contributions ?? []).map((x) => x.brigade_id)].filter(Boolean))];
  return {
    cohort, turn: post.meta.turn,
    pre_path: posix(prePath), pre_sha256: sha(prePath),
    post_path: posix(postPath), post_sha256: sha(postPath),
    target_controller_pre: pre.political.political_controllers[OSID],
    target_supply_pre: pre.political.last_supply_state_by_osid?.[OSID] ?? null,
    attacker_pre: formation(pre, ATTACKER),
    defenders_pre: defenderIds.map((id) => formation(pre, id)),
    operation_pre: opContext(pre),
    reported_battle: b,
    inferred_effective_power_ratio_band_from_outcome: ratioBand(b.outcome),
    attacker_post: formation(post, ATTACKER),
    defenders_post: defenderIds.map((id) => formation(post, id)),
  };
}

function nativeCohort(dir, name) {
  const battles = [];
  for (let turn = 34; turn <= 37; turn++) {
    const row = battleAudit(path.join(dir, `turn-${String(turn - 1).padStart(3, '0')}.json`), path.join(dir, `turn-${String(turn).padStart(3, '0')}.json`), name);
    if (row) battles.push(row);
  }
  return battles;
}

function referenceBattles(p, name) {
  const state = read(p);
  return (state.turn_summaries ?? []).flatMap((t) => (t.battles ?? [])
    .filter((b) => b.osid === OSID && b.primary_attacker_id === ATTACKER)
    .map((b) => ({
      cohort: name, turn: t.turn, source_path: posix(p), source_sha256: sha(p),
      reported_battle: b, inferred_effective_power_ratio_band_from_outcome: ratioBand(b.outcome),
      prebattle_state: 'unreported: no retained immediately-prior autosave in this reference run',
    })));
}

const currentDir = at('tmp-paradox-qa-20260710', 'evidence', 'fractional-fatigue-p03-rbih-t39-01', 'rbih', 'turn-autosaves');
const oldDir = at('tmp-paradox-qa-20260710', 'evidence', 'player-parity-rbih-t39-20261025-04', 'rbih', 'turn-autosaves');
const n101 = at('runs', 'apr1992_definitive_188w__6deb5845c150c196__w188_n101', 'save_w39.json');
const n102 = at('runs', 'apr1992_definitive_188w__6deb5845c150c196__w188_n102', 'save_w39.json');
const sourceFiles = [
  at('src', 'sim', 'combat', 'attack_resolution_osid.ts'),
  at('src', 'sim', 'combat', 'combat_math.ts'),
  at('src', 'sim', 'combat', 'corps_operation_helpers.ts'),
  at('src', 'sim', 'combat', 'bot_constants.ts'),
];

const result = {
  schema: 'awwv.korenici-combat-input-audit.v1',
  scope: 'one retained-file extraction; no engine import/API/query/advance/state mutation',
  source_contract: {
    files: sourceFiles.map((p) => ({ path: posix(p), sha256: sha(p) })),
    outcome_ratio_bands: { decisive_victory: '[2.0,+inf)', victory: '[1.5,2.0)', costly_victory: '[1.0,1.5)', stalemate: '[0.7,1.0)', repulsed: '[0.5,0.7)', catastrophic: '[0,0.5)' },
    fatigue: 'FATIGUE_MAX=30; attack multiplier linearly 1.0 to 0.6; defend multiplier linearly 1.0 to 0.75',
    operation: 'execution multiplier is formation-scoped; axis mates within 1 hop count 1 and at 2 hops count 0.5, floored; concentration adds 0.10 per effective brigade capped at 0.30',
    support_power_mult: 1.0,
  },
  terrain: {
    graph: { path: posix(graphPath), sha256: sha(graphPath) },
    scalars: { path: posix(terrainPath), sha256: sha(terrainPath) },
    operational_settlements: { path: posix(osPath), sha256: sha(osPath) },
    constituent_rows: terrainRows,
    defender_terrain_mult_from_current_formula: defenderTerrainMult,
    mean_slope_for_seasonal_consumer: meanSlope,
  },
  current_p03_a306: nativeCohort(currentDir, 'current_p03_a306'),
  old_native04_77a2_comparison_only: nativeCohort(oldDir, 'old_native04_77a2_comparison_only'),
  n101_reported_only: referenceBattles(n101, 'n101'),
  n102_reported_only: referenceBattles(n102, 'n102'),
  limits: [
    'Retained public battle records do not include numeric attacker power, defender power, exact effective ratio, random roll, or a decomposed combat trace.',
    'Current and old-native autosaves permit exact pre/post formation, supply, operation, and proximity reads; n101/n102 do not retain immediately-prior battle autosaves.',
    'Derived fatigue, terrain, concentration multipliers and ratio bands are source-formula reconstructions and are labeled as such; they are not recorded trace fields.',
  ],
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ok: true, output: OUT, current_battles: result.current_p03_a306.length, old_battles: result.old_native04_77a2_comparison_only.length }));
