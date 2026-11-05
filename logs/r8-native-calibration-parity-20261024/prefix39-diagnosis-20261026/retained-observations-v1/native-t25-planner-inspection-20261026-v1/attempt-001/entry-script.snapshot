import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadOperationalEdges } from '../../../src/data/operational_data.js';
import { buildOsidAdjacency } from '../../../src/sim/combat/osid_adjacency.js';
import { bfsDistance } from '../../../src/sim/combat/sector_utils.js';
import { isFriendlyFaction } from '../../../src/sim/early_war/alliance_update.js';
import { planDirectiveOperation } from '../../../src/sim/turn_phases/war_phases.js';
import type { GameState } from '../../../src/state/game_state.js';

type FrozenFile = { path: string; sha256: string };
type InspectionConfig = {
  schema: string;
  workspace: string;
  runtime: { node_version: string; node_exec_path: string; files: FrozenFile[] };
  sources: FrozenFile[];
  input: FrozenFile;
  graph: FrozenFile & { endpoint_count: number; controller_key_count: number };
  target_osid: string;
  corps_ids: [string, string];
  expected: {
    turn: number;
    phase: string;
    player_faction: string;
    target_controller: string;
    target_neighbors: Array<{ id: string; controller: string }>;
  };
};

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function parseArgs(argv: string[]): { configPath: string; outputPath: string } {
  const configAt = argv.indexOf('--config');
  const outputAt = argv.indexOf('--output');
  if (configAt < 0 || outputAt < 0 || !argv[configAt + 1] || !argv[outputAt + 1]) {
    throw new Error('usage: inspect_t25_planner.ts --config FILE --output FILE');
  }
  return { configPath: resolve(argv[configAt + 1]), outputPath: resolve(argv[outputAt + 1]) };
}

function verifyFrozenFile(baseDir: string, expected: FrozenFile): { path: string; bytes: number; sha256: string } {
  const absolute = resolve(baseDir, expected.path);
  const bytes = readFileSync(absolute);
  const actual = sha256(bytes);
  if (actual !== expected.sha256) {
    throw new Error(`hash mismatch for ${expected.path}: expected ${expected.sha256}, got ${actual}`);
  }
  return { path: absolute.replaceAll('\\', '/'), bytes: bytes.length, sha256: actual };
}

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function currentAssignment(state: GameState, brigadeId: string): unknown {
  const formation = state.military.formations?.[brigadeId] as unknown as Record<string, unknown> | undefined;
  const sectors = Object.values(state.military.corps_front_sectors ?? {})
    .filter((sector) =>
      sector.assigned_brigade_ids?.includes(brigadeId)
      || sector.reserve_brigade_ids?.includes(brigadeId)
      || sector.rear_brigade_ids?.includes(brigadeId))
    .map((sector) => ({
      sector_id: sector.sector_id,
      role: sector.assigned_brigade_ids?.includes(brigadeId)
        ? 'line'
        : sector.reserve_brigade_ids?.includes(brigadeId)
          ? 'reserve'
          : 'rear',
    }))
    .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
  return {
    formation_assignment: formation?.assignment ?? null,
    assigned_sub_segment_id: formation?.assigned_sub_segment_id ?? null,
    live_sector_memberships: sectors,
    legacy_front_assignment: state.military.brigade_front_assignment?.[brigadeId] ?? null,
  };
}

function reportForPlan(
  state: GameState,
  corpsId: string,
  targetOsid: string,
  adjacency: Map<string, string[]>,
  plan: ReturnType<typeof planDirectiveOperation>,
  beforeJson: string,
  afterJson: string,
): unknown {
  const purity = {
    before_bytes: Buffer.byteLength(beforeJson),
    after_bytes: Buffer.byteLength(afterJson),
    before_sha256: sha256(beforeJson),
    after_sha256: sha256(afterJson),
    byte_identical: beforeJson === afterJson,
  };
  if (!purity.byte_identical) throw new Error(`${corpsId}: planner mutated its input clone`);

  if (!plan.ok) return { corps_id: corpsId, target_osid: targetOsid, purity, full_plan_return: plan };

  const formations = state.military.formations ?? {};
  const controllers = state.political.political_controllers ?? {};
  const corpsFaction = formations[corpsId]?.faction;
  if (!corpsFaction) throw new Error(`${corpsId}: missing corps faction after accepted plan`);
  const friendlyOsids = new Set(
    [...adjacency.keys()].filter((osid) => isFriendlyFaction(controllers[osid], corpsFaction, state)),
  );
  const roster = plan.participants.map((brigadeId) => {
    const formation = formations[brigadeId];
    if (!formation) throw new Error(`${corpsId}: planner returned missing formation ${brigadeId}`);
    const location = formation.location_osid ?? null;
    const distance = location === null
      ? Number.POSITIVE_INFINITY
      : bfsDistance(location, plan.stagingOsid, adjacency, friendlyOsids);
    return {
      id: brigadeId,
      personnel: formation.personnel ?? null,
      location_osid: location,
      supply_at_location: location === null
        ? null
        : state.political.last_supply_state_by_osid?.[location] ?? null,
      assignment: currentAssignment(state, brigadeId),
      current_movement_order: state.military.brigade_movement_orders?.[brigadeId] ?? null,
      current_movement_state: state.military.brigade_movement_state?.[brigadeId] ?? null,
      normal_friendly_hops_to_staging: Number.isFinite(distance) ? distance : null,
      normal_friendly_route_exists: Number.isFinite(distance),
      already_at_staging: location === plan.stagingOsid,
      adjacent_to_staging: location !== null && (adjacency.get(location) ?? []).includes(plan.stagingOsid),
    };
  });
  return {
    corps_id: corpsId,
    target_osid: targetOsid,
    purity,
    full_plan_return: plan,
    roster,
    physical_summary: {
      roster_count: roster.length,
      already_at_staging_count: roster.filter((row) => row.already_at_staging).length,
      adjacent_to_staging_count: roster.filter((row) => row.adjacent_to_staging).length,
      hop_metric_note: 'BFS hops through territory accepted by the existing isFriendlyFaction route predicate; proxy distance only, not ETA or delivery proof.',
    },
  };
}

async function main(): Promise<void> {
  const { configPath, outputPath } = parseArgs(process.argv.slice(2));
  const config = readJson<InspectionConfig>(configPath);
  const cwd = resolve(process.cwd());
  if (cwd !== resolve(config.workspace)) throw new Error(`wrong workspace: ${cwd}`);
  if (process.version !== config.runtime.node_version) {
    throw new Error(`wrong Node runtime: expected ${config.runtime.node_version}, got ${process.version}`);
  }
  if (resolve(process.execPath) !== resolve(config.runtime.node_exec_path)) {
    throw new Error(`wrong Node executable: expected ${config.runtime.node_exec_path}, got ${process.execPath}`);
  }

  const frozenFiles = [
    ...config.runtime.files,
    ...config.sources,
    config.input,
    config.graph,
  ].map((file) => verifyFrozenFile(cwd, file));
  const saveBytes = readFileSync(resolve(cwd, config.input.path));
  const baseState = JSON.parse(saveBytes.toString('utf8')) as GameState;
  if (baseState.meta.turn !== config.expected.turn
    || baseState.meta.phase !== config.expected.phase
    || baseState.meta.player_faction !== config.expected.player_faction) {
    throw new Error('save metadata does not match frozen T25 RBiH contract');
  }
  if (baseState.meta.game_over || baseState.political.end_state) {
    throw new Error('save is blocked by game-over/end-state state');
  }
  for (const corpsId of config.corps_ids) {
    if (!baseState.military.corps_command?.[corpsId]) throw new Error(`missing corps command key ${corpsId}`);
  }

  const edges = await loadOperationalEdges(cwd);
  const adjacency = buildOsidAdjacency(edges);
  const endpoints = [...new Set(edges.flatMap((edge) => [edge.a, edge.b]))].sort(strictCompare);
  const controllerKeys = Object.keys(baseState.political.political_controllers ?? {}).sort(strictCompare);
  const endpointDomainEqualsControllerDomain = endpoints.length === controllerKeys.length
    && endpoints.every((osid, index) => osid === controllerKeys[index]);
  if (endpoints.length !== config.graph.endpoint_count
    || controllerKeys.length !== config.graph.controller_key_count
    || !endpointDomainEqualsControllerDomain
    || endpoints.some((osid) => !osid.startsWith('op:'))
    || controllerKeys.some((osid) => !osid.startsWith('op:'))) {
    throw new Error('operational graph/controller domain precheck failed');
  }
  const targetController = baseState.political.political_controllers?.[config.target_osid] ?? null;
  const targetNeighbors = (adjacency.get(config.target_osid) ?? [])
    .map((id) => ({ id, controller: baseState.political.political_controllers?.[id] ?? null }))
    .sort((a, b) => strictCompare(a.id, b.id));
  if (targetController !== config.expected.target_controller
    || JSON.stringify(targetNeighbors) !== JSON.stringify(config.expected.target_neighbors)) {
    throw new Error('target controller/neighbors precheck failed');
  }

  const firstState = structuredClone(baseState);
  const firstBefore = JSON.stringify(firstState);
  const firstPlan = planDirectiveOperation(
    firstState,
    firstState.military.corps_command![config.corps_ids[0]]!,
    config.corps_ids[0],
    config.target_osid,
    adjacency,
  );
  const firstAfter = JSON.stringify(firstState);

  const fourthState = structuredClone(baseState);
  const fourthBefore = JSON.stringify(fourthState);
  const fourthPlan = planDirectiveOperation(
    fourthState,
    fourthState.military.corps_command![config.corps_ids[1]]!,
    config.corps_ids[1],
    config.target_osid,
    adjacency,
  );
  const fourthAfter = JSON.stringify(fourthState);

  const result = {
    schema: 'awwv.native-t25-request-op-planner-inspection.v1',
    read_only_scope: {
      turn: config.expected.turn,
      player_faction: config.expected.player_faction,
      target_osid: config.target_osid,
      corps_ids: config.corps_ids,
      planner_call_count: 2,
      no_engine_advance_query_or_stage: true,
    },
    runtime: { node_version: process.version, exec_path: process.execPath.replaceAll('\\', '/') },
    frozen_files: frozenFiles,
    graph_precheck: {
      edge_count: edges.length,
      endpoint_count: endpoints.length,
      controller_key_count: controllerKeys.length,
      endpoint_domain_equals_controller_domain: endpointDomainEqualsControllerDomain,
      non_operational_endpoint_count: endpoints.filter((osid) => !osid.startsWith('op:')).length,
      non_operational_controller_key_count: controllerKeys.filter((osid) => !osid.startsWith('op:')).length,
      target_controller: targetController,
      target_neighbors: targetNeighbors,
    },
    planner_results: [
      reportForPlan(firstState, config.corps_ids[0], config.target_osid, adjacency, firstPlan, firstBefore, firstAfter),
      reportForPlan(fourthState, config.corps_ids[1], config.target_osid, adjacency, fourthPlan, fourthBefore, fourthAfter),
    ],
    claim_limits: [
      'Planner output is read-only eligibility/roster/staging evidence for this frozen T25 state.',
      'Friendly BFS hops are a physical-distance proxy, not ETA or delivery proof.',
      'No capture, admission, combat, movement execution, or command-authority claim follows.',
    ],
  };
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
}

await main();
