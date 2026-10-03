/**
 * Bounded Sana pre-order diagnostic (2026-10-03).
 *
 * Question: can the retained post-turn-186 save, resumed through the canonical
 * scenario runner with its production inputs, reproduce n37 at t187 and expose
 * the exact 517th order-generation predicate at t188?
 *
 * Commands:
 *   node node_modules/tsx/dist/cli.mjs logs/prusac-diagnostic-20260929/continuation_sana_preorder_trace.ts exact-t187
 *   $env:AWWV_DEBUG_REASON_CODES='axis_reject'; node node_modules/tsx/dist/cli.mjs logs/prusac-diagnostic-20260929/continuation_sana_preorder_trace.ts trace-t188
 *
 * Cost: two resumed single-turn replays, expected under two minutes each.
 * Pass: t187 formation movement, Sana objective, battle, control counts, and
 * movement report match retained n37; then t188 matches the same counterpart,
 * records 517th's objective/decision/destination, and differs from n37 only in
 * the documented diagnostic-only axis fields.
 * Stop: do not run t188 after any t187 mismatch; stop after the t188 run on any
 * mismatch. Never invoke the preflight runner, a full suite, or a campaign.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runScenario } from '../../src/scenario/scenario_runner.js';
import { loadOperationalData } from '../../src/data/operational_data.js';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { findNearestFriendlyOsidDestination } from '../../src/sim/combat/bot_brigade_context.js';
import { getSectorOffensiveApproachOsids } from '../../src/sim/combat/operation_approach_osids.js';
import { buildOsidAdjacency } from '../../src/sim/combat/osid_adjacency.js';
import { getTacticalAdjacentOsids } from '../../src/sim/combat/tactical_adjacency.js';
import { getPoliticalControllerOSID } from '../../src/state/settlement_control.js';

const ROOT = resolve(import.meta.dirname, '../..');
const LOG_DIR = resolve(ROOT, 'logs/prusac-diagnostic-20260929');
const N38 = resolve(ROOT, 'runs/apr1992_definitive_188w__4658849344f21642__w186_n38');
const N37 = resolve(ROOT, 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n37');
const SCENARIO = resolve(ROOT, 'data/scenarios/apr1992_definitive_188w.json');
const SAVE_W186 = resolve(N38, 'save_w186.json');
const EXACT_DIR = resolve(LOG_DIR, 'continuation_sana_t187_exact_artifacts');
const TRACE_DIR = resolve(LOG_DIR, 'continuation_sana_t188_trace_artifacts');
const EXACT_RESULT = resolve(LOG_DIR, 'continuation_sana_t187_exact_result.json');
const TRACE_RESULT = resolve(LOG_DIR, 'continuation_sana_t188_trace_result.json');

type Json = Record<string, any>;

function readJson(path: string): Json {
    return JSON.parse(readFileSync(path, 'utf8')) as Json;
}

function readJsonl(path: string): Json[] {
    return readFileSync(path, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function sha256Text(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

function stable(value: any): any {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    }
    return value;
}

const DIAGNOSTIC_KEYS = new Set([
    'launch_blocker_detail',
    'launch_readiness_detail',
    'order_generation_details',
]);

function stripDiagnosticFields(node: any): any {
    if (Array.isArray(node)) return node.map(stripDiagnosticFields);
    if (node && typeof node === 'object') {
        return Object.fromEntries(Object.keys(node)
            .filter((key) => !DIAGNOSTIC_KEYS.has(key))
            .map((key) => [key, stripDiagnosticFields(node[key])]));
    }
    return node;
}

function normalizedDiagnosticFreeHash(value: any): string {
    return sha256Text(JSON.stringify(stable(stripDiagnosticFields(value))));
}

function diffPaths(a: any, b: any, prefix = '', limit = 100): string[] {
    if (Object.is(a, b)) return [];
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return [prefix || '$'];
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return [`${prefix || '$'}[length]`];
        const out: string[] = [];
        for (let i = 0; i < a.length && out.length < limit; i += 1) out.push(...diffPaths(a[i], b[i], `${prefix}[${i}]`, limit - out.length));
        return out;
    }
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const out: string[] = [];
    for (const key of keys) {
        if (out.length >= limit) break;
        const path = prefix ? `${prefix}.${key}` : key;
        if (!(key in a) || !(key in b)) out.push(path);
        else out.push(...diffPaths(a[key], b[key], path, limit - out.length));
    }
    return out;
}

function axis(state: Json): Json {
    const op = state.military.corps_command.arbih_5th_corps.active_operations
        .find((candidate: Json) => candidate.name === 'Operation Sana');
    const found = op?.axes?.find((candidate: Json) => candidate.axis_id === 'sana_sanski_most_kljuc');
    if (!found) throw new Error('Operation Sana Sanski axis missing');
    return found;
}

function formationSnapshot(state: Json, id: string): Json {
    const formation = state.military.formations[id];
    return {
        location_osid: formation?.location_osid ?? null,
        movement_order: state.military.brigade_movement_orders?.[id] ?? null,
        movement_state: state.military.brigade_movement_state?.[id] ?? null,
    };
}

function retainedWeek(turn: number): Json {
    const row = readJsonl(resolve(N37, 'weekly_report.jsonl')).find((candidate) => candidate.week_index === turn);
    if (!row) throw new Error(`retained n37 weekly row ${turn} missing`);
    return row;
}

function retainedFormation(turn: number, id: string): Json {
    const row = readJsonl(resolve(N37, 'brigade_temporal_log.jsonl'))
        .find((candidate) => candidate.turn === turn && candidate.brigade_id === id);
    if (!row) throw new Error(`retained n37 formation row ${turn}/${id} missing`);
    return {
        location_osid: row.location_osid ?? null,
        movement_destination: row.mv_destinations?.[0] ?? null,
        movement_status: row.mv_state ?? null,
    };
}

function actualFormation(snapshot: Json): Json {
    return {
        location_osid: snapshot.location_osid,
        movement_destination: snapshot.movement_state?.destination_sids?.[0]
            ?? snapshot.movement_order?.destination_sids?.[0]
            ?? null,
        movement_status: snapshot.movement_state?.status ?? null,
    };
}

function sanaWeekly(row: Json): Json {
    const op = row.operation_diagnostics?.find((candidate: Json) => candidate.operation_name === 'Operation Sana');
    if (!op) throw new Error(`Operation Sana weekly diagnostic missing at ${row.week_index}`);
    return op;
}

function matchingBattle(row: Json, brigade: string, target: string): Json | null {
    const found = row.battles?.find((battle: Json) =>
        battle.operation_name === 'Operation Sana'
        && battle.attacker_brigade === brigade
        && battle.target_osid === target);
    return found ? {
        attacker_brigade: found.attacker_brigade,
        target_osid: found.target_osid,
        attacker_won: found.attacker_won,
        outcome: found.outcome,
    } : null;
}

function same(a: any, b: any): boolean {
    return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function requireFiles(): Json {
    const required = [SCENARIO, SAVE_W186, resolve(N38, 'initial_save.json'), resolve(N37, 'initial_save.json'),
        resolve(N38, 'run_meta.json'), resolve(N37, 'run_meta.json'),
        resolve(N37, 'weekly_report.jsonl'), resolve(N37, 'brigade_temporal_log.jsonl'), resolve(N37, 'final_save.json')];
    const missing = required.filter((path) => !existsSync(path));
    if (missing.length) throw new Error(`missing prerequisites: ${missing.join(', ')}`);
    const save = readJson(SAVE_W186);
    const n38Meta = readJson(resolve(N38, 'run_meta.json'));
    const n37Meta = readJson(resolve(N37, 'run_meta.json'));
    const initial38 = readFileSync(resolve(N38, 'initial_save.json'), 'utf8');
    const initial37 = readFileSync(resolve(N37, 'initial_save.json'), 'utf8');
    const prerequisites = {
        save_turn: save.meta.turn,
        scenario_id_equal: n38Meta.scenario_id === n37Meta.scenario_id,
        consumed_input_digest_n38: n38Meta.provenance?.consumed_inputs?.digest ?? null,
        consumed_input_digest_n37: n37Meta.provenance?.consumed_inputs?.digest ?? null,
        consumed_input_digest_equal: n38Meta.provenance?.consumed_inputs?.digest === n37Meta.provenance?.consumed_inputs?.digest,
        initial_save_sha256_n38: sha256Text(initial38),
        initial_save_sha256_n37: sha256Text(initial37),
        initial_save_equal: initial38 === initial37,
    };
    if (prerequisites.save_turn !== 186 || !prerequisites.scenario_id_equal
        || !prerequisites.consumed_input_digest_equal || !prerequisites.initial_save_equal) {
        throw new Error(`prerequisite mismatch: ${JSON.stringify(prerequisites)}`);
    }
    return prerequisites;
}

async function exactT187(): Promise<void> {
    const prerequisites = requireFiles();
    if (existsSync(EXACT_DIR) || existsSync(EXACT_RESULT)) throw new Error('exact-t187 output already exists; refusing overwrite');
    if (process.env.AWWV_DEBUG_REASON_CODES) throw new Error('exact-t187 requires AWWV_DEBUG_REASON_CODES unset');
    const run = await runScenario({
        scenarioPath: SCENARIO,
        outDirOverride: EXACT_DIR,
        weeksOverride: 187,
        resumeFromSavePath: SAVE_W186,
        resumeFromWeekIndex: 186,
        consoleDiagnostics: false,
    });
    const replayState = readJson(run.paths.final_save);
    const replayWeek = readJsonl(run.paths.weekly_report).find((row) => row.week_index === 187);
    if (!replayWeek) throw new Error('replay t187 weekly row missing');
    const retained = retainedWeek(187);
    const current = axis(replayState).objectives[axis(replayState).current_objective_index];
    const expectedOp = sanaWeekly(retained);
    const checks = {
        turn: replayState.meta.turn === 187,
        formation_506: same(actualFormation(formationSnapshot(replayState, 'arbih_506th_mountain')), retainedFormation(187, 'arbih_506th_mountain')),
        formation_517: same(actualFormation(formationSnapshot(replayState, 'arbih_517th_light')), retainedFormation(187, 'arbih_517th_light')),
        current_objective: expectedOp.current_objectives.includes(current),
        battle: same(
            matchingBattle(replayWeek, 'arbih_506th_mountain', 'op:sanski_most:skucani_vakuf_2'),
            matchingBattle(retained, 'arbih_506th_mountain', 'op:sanski_most:skucani_vakuf_2'),
        ),
        control_counts: same(replayWeek.control_counts, retained.control_counts),
        column_movement: same(replayWeek.column_movement, retained.column_movement),
    };
    const result = {
        mode: 'exact-t187', prerequisites, run_out_dir: run.outDir, checks,
        pass: Object.values(checks).every(Boolean),
        observed: {
            current_objective: current,
            formation_506: actualFormation(formationSnapshot(replayState, 'arbih_506th_mountain')),
            formation_517: actualFormation(formationSnapshot(replayState, 'arbih_517th_light')),
            battle: matchingBattle(replayWeek, 'arbih_506th_mountain', 'op:sanski_most:skucani_vakuf_2'),
            control_counts: replayWeek.control_counts,
            column_movement: replayWeek.column_movement,
        },
    };
    writeFileSync(EXACT_RESULT, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
    if (!result.pass) process.exitCode = 2;
}

async function traceT188(): Promise<void> {
    const prerequisites = requireFiles();
    if (!existsSync(EXACT_RESULT)) throw new Error('exact-t187 result missing');
    const exactResult = readJson(EXACT_RESULT);
    if (exactResult.pass !== true) throw new Error('exact-t187 did not pass; stopping');
    const exactFinal = resolve(EXACT_DIR, 'final_save.json');
    if (!existsSync(exactFinal)) throw new Error('exact-t187 final save missing');
    if (existsSync(TRACE_DIR) || existsSync(TRACE_RESULT)) throw new Error('trace-t188 output already exists; refusing overwrite');
    if (process.env.AWWV_DEBUG_REASON_CODES !== 'axis_reject') {
        throw new Error('trace-t188 requires AWWV_DEBUG_REASON_CODES=axis_reject exactly');
    }
    const run = await runScenario({
        scenarioPath: SCENARIO,
        outDirOverride: TRACE_DIR,
        weeksOverride: 188,
        resumeFromSavePath: exactFinal,
        resumeFromWeekIndex: 187,
        consoleDiagnostics: false,
    });
    const replayState = readJson(run.paths.final_save);
    const replayWeek = readJsonl(run.paths.weekly_report).find((row) => row.week_index === 188);
    if (!replayWeek) throw new Error('replay t188 weekly row missing');
    const retained = retainedWeek(188);
    const sanaAxis = axis(replayState);
    const current = sanaAxis.objectives[sanaAxis.current_objective_index];
    const detail = sanaAxis.order_generation_details?.find((candidate: Json) => candidate.brigade_id === 'arbih_517th_light') ?? null;
    const n37Final = readJson(resolve(N37, 'final_save.json'));
    const expectedOp = sanaWeekly(retained);
    const operationalData = await loadOperationalData(ROOT);
    const operationalGraph = await loadSettlementGraph({
        settlementsPath: resolve(ROOT, 'data/derived/operational/operational_settlements.geojson'),
        edgesPath: resolve(ROOT, 'data/derived/operational/operational_contact_graph.json'),
    });
    const adjacency = buildOsidAdjacency(operationalGraph.edges);
    const sanaOp = replayState.military.corps_command.arbih_5th_corps.active_operations
        .find((candidate: Json) => candidate.name === 'Operation Sana');
    const objective = detail?.objective;
    const tacticalNeighbors = objective
        ? getTacticalAdjacentOsids(replayState, objective, adjacency)
        : [];
    const directApproaches = tacticalNeighbors
        .map((osid: string) => ({ osid, controller: getPoliticalControllerOSID(replayState, osid, operationalData.operationalToCanonical) }))
        .filter((entry: Json) => entry.controller === 'RBiH' || entry.controller === 'HRHB');
    const approachSet = getSectorOffensiveApproachOsids(
        replayState,
        sanaOp,
        'RBiH',
        adjacency,
        operationalData.operationalToCanonical,
        'arbih_517th_light',
    );
    const selectedApproach = findNearestFriendlyOsidDestination(
        replayState,
        'RBiH',
        detail?.location_osid,
        adjacency,
        operationalData.operationalToCanonical,
        approachSet,
    );
    const normalizedReplayHash = normalizedDiagnosticFreeHash(replayState);
    const normalizedN37Hash = normalizedDiagnosticFreeHash(n37Final);
    const normalizedDiffPaths = diffPaths(stripDiagnosticFields(replayState), stripDiagnosticFields(n37Final));
    const checks = {
        turn: replayState.meta.turn === 188,
        formation_506: same(actualFormation(formationSnapshot(replayState, 'arbih_506th_mountain')), retainedFormation(188, 'arbih_506th_mountain')),
        formation_517: same(actualFormation(formationSnapshot(replayState, 'arbih_517th_light')), retainedFormation(188, 'arbih_517th_light')),
        current_objective: expectedOp.current_objectives.includes(current),
        battle: same(
            matchingBattle(replayWeek, 'arbih_506th_mountain', 'op:sanski_most:stari_majdan'),
            matchingBattle(retained, 'arbih_506th_mountain', 'op:sanski_most:stari_majdan'),
        ),
        control_counts: same(replayWeek.control_counts, retained.control_counts),
        column_movement: same(replayWeek.column_movement, retained.column_movement),
        trace_predicate: detail?.turn === 188
            && detail?.location_osid === 'op:sanski_most:lusci_palanka_2'
            && detail?.objective === 'op:sanski_most:stari_majdan'
            && detail?.decision === 'march_to_approach'
            && detail?.issued_target_osid === 'op:sanski_most:budimlic_japra_2',
        direct_approach_not_fallback: directApproaches.length > 0,
        selected_approach_reproduced: selectedApproach === detail?.issued_target_osid,
        diagnostic_free_state_hash: normalizedReplayHash === normalizedN37Hash,
    };
    const result = {
        mode: 'trace-t188', prerequisites, run_out_dir: run.outDir, checks,
        pass: Object.values(checks).every(Boolean),
        observed: {
            current_objective: current,
            formation_506: actualFormation(formationSnapshot(replayState, 'arbih_506th_mountain')),
            formation_517: actualFormation(formationSnapshot(replayState, 'arbih_517th_light')),
            order_generation_detail_517: detail,
            approach_branch: {
                tactical_neighbors_with_controllers: tacticalNeighbors.map((osid: string) => ({
                    osid,
                    controller: getPoliticalControllerOSID(replayState, osid, operationalData.operationalToCanonical),
                })),
                direct_friendly_approaches: directApproaches,
                full_approach_set: [...approachSet].sort(),
                fallback_used: directApproaches.length === 0,
                nearest_friendly_bfs_selection: selectedApproach,
            },
            battle: matchingBattle(replayWeek, 'arbih_506th_mountain', 'op:sanski_most:stari_majdan'),
            control_counts: replayWeek.control_counts,
            column_movement: replayWeek.column_movement,
            normalized_replay_sha256: normalizedReplayHash,
            normalized_n37_sha256: normalizedN37Hash,
            raw_replay_sha256: sha256Text(readFileSync(run.paths.final_save, 'utf8')),
            raw_n37_sha256: sha256Text(readFileSync(resolve(N37, 'final_save.json'), 'utf8')),
            normalized_diff_paths: normalizedDiffPaths,
        },
    };
    writeFileSync(TRACE_RESULT, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
    if (!result.pass) process.exitCode = 2;
}

const mode = process.argv[2];
if (mode === 'exact-t187') await exactT187();
else if (mode === 'trace-t188') await traceT188();
else throw new Error('usage: continuation_sana_preorder_trace.ts exact-t187|trace-t188');
