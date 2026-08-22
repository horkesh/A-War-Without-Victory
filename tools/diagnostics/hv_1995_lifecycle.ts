/**
 * Permanent diagnostic for the 1995 HV expeditionary formation lifecycle.
 *
 * The analyzer is deliberately artifact-driven. It joins independent live-run
 * projections and refuses to turn a zero into an absence claim unless the same
 * projection contains a positive control.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HV_1995_FORMATION_IDS = [
    'hv_112th_infantry_1995',
    'hv_126th_hgr_1995',
    'hv_134th_hgr_1995',
    'hv_141st_reserve_brigade_1995',
    'hv_1st_hgz_1995',
    'hv_7th_hgr_1995',
] as const;

export interface Hv1995LifecycleArtifacts {
    turnSummaries: Array<Record<string, unknown>>;
    temporalRows: Array<Record<string, unknown>>;
    weeklyRows: Array<Record<string, unknown>>;
    opportunityTraces: Array<Record<string, unknown>>;
    positiveControlId: string;
}

export function parseJsonLines(payload: string): Array<Record<string, unknown>> {
    const rows: Array<Record<string, unknown>> = [];
    for (const line of payload.split(/\r?\n/)) {
        if (line.trim().length === 0) continue;
        const parsed: unknown = JSON.parse(line);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
            rows.push(parsed as Record<string, unknown>);
        }
    }
    return rows;
}

type ObservationStatus = 'OBSERVED' | 'ABSENT_WITH_POSITIVE_CONTROL' | 'NOT_ESTABLISHED';

export interface Hv1995FormationDiagnostic {
    formation_id: string;
    spawn_count: number;
    temporal_row_count: number;
    movement_order_turn_count: number;
    transit_turn_count: number;
    operation_turn_count: number;
    movement_event_count: number;
    battle_stack_hit_count: number;
    battle_participation_status: ObservationStatus;
    first_unobserved_boundary: string | null;
}

function records(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value)
        ? value.filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
        : [];
}

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function countRows(rows: Array<Record<string, unknown>>, predicate: (row: Record<string, unknown>) => boolean): number {
    let count = 0;
    for (const row of rows) if (predicate(row)) count += 1;
    return count;
}

export function analyzeHv1995Lifecycle(artifacts: Hv1995LifecycleArtifacts) {
    const spawnCounts = new Map<string, number>();
    const movementCounts = new Map<string, number>();
    for (const summary of artifacts.turnSummaries) {
        for (const spawn of records(summary.formation_spawns)) {
            const id = typeof spawn.formation_id === 'string' ? spawn.formation_id : '';
            if (id) spawnCounts.set(id, (spawnCounts.get(id) ?? 0) + 1);
        }
        for (const movement of records(summary.movements)) {
            const id = typeof movement.formation_id === 'string' ? movement.formation_id : '';
            if (id) movementCounts.set(id, (movementCounts.get(id) ?? 0) + 1);
        }
    }

    const battleStackCounts = new Map<string, number>();
    let battleStackProjection = false;
    for (const weekly of artifacts.weeklyRows) {
        for (const battle of records(weekly.battles)) {
            if (!Array.isArray(battle.attacker_brigades)) continue;
            battleStackProjection = true;
            const ids = battle.attacker_brigades
                .filter((id): id is string => typeof id === 'string')
                .slice()
                .sort(compareText);
            for (const id of ids) battleStackCounts.set(id, (battleStackCounts.get(id) ?? 0) + 1);
        }
    }

    const positiveRows = artifacts.temporalRows.filter(
        (row) => row.brigade_id === artifacts.positiveControlId,
    );
    const positiveControls = {
        battle_stack_projection: battleStackProjection,
        movement_event_projection: (movementCounts.get(artifacts.positiveControlId) ?? 0) > 0,
        movement_order_projection: positiveRows.some((row) => Array.isArray(row.mv_destinations) && row.mv_destinations.length > 0),
        operation_membership_projection: positiveRows.some((row) => typeof row.active_op_id === 'string' && row.active_op_id.length > 0),
        temporal_population: positiveRows.length > 0,
    };

    const formations: Hv1995FormationDiagnostic[] = HV_1995_FORMATION_IDS.map((formationId) => {
        const temporal = artifacts.temporalRows.filter((row) => row.brigade_id === formationId);
        const spawnCount = spawnCounts.get(formationId) ?? 0;
        const movementOrderTurnCount = countRows(
            temporal,
            (row) => Array.isArray(row.mv_destinations) && row.mv_destinations.length > 0,
        );
        const transitTurnCount = countRows(
            temporal,
            (row) => typeof row.mv_state === 'string' && row.mv_state !== 'deployed',
        );
        const operationTurnCount = countRows(
            temporal,
            (row) => typeof row.active_op_id === 'string' && row.active_op_id.length > 0,
        );
        const movementEventCount = movementCounts.get(formationId) ?? 0;
        const battleStackHitCount = battleStackCounts.get(formationId) ?? 0;

        let firstUnobservedBoundary: string | null = null;
        if (spawnCount === 0) firstUnobservedBoundary = 'spawn';
        else if (temporal.length === 0) firstUnobservedBoundary = 'temporal_observation';
        else if (operationTurnCount === 0 && positiveControls.operation_membership_projection) {
            firstUnobservedBoundary = 'operation_assignment';
        } else if (movementOrderTurnCount === 0 && positiveControls.movement_order_projection) {
            firstUnobservedBoundary = 'movement_intent';
        } else if (movementEventCount === 0 && positiveControls.movement_event_projection) {
            firstUnobservedBoundary = 'physical_movement';
        } else if (battleStackHitCount === 0 && positiveControls.battle_stack_projection) {
            firstUnobservedBoundary = 'battle_participation';
        }

        const battleParticipationStatus: ObservationStatus = battleStackHitCount > 0
            ? 'OBSERVED'
            : positiveControls.battle_stack_projection
                ? 'ABSENT_WITH_POSITIVE_CONTROL'
                : 'NOT_ESTABLISHED';

        return {
            formation_id: formationId,
            spawn_count: spawnCount,
            temporal_row_count: temporal.length,
            movement_order_turn_count: movementOrderTurnCount,
            transit_turn_count: transitTurnCount,
            operation_turn_count: operationTurnCount,
            movement_event_count: movementEventCount,
            battle_stack_hit_count: battleStackHitCount,
            battle_participation_status: battleParticipationStatus,
            first_unobserved_boundary: firstUnobservedBoundary,
        };
    });

    const opportunityBlockers = artifacts.opportunityTraces
        .filter((row) => row.event === 'blocked')
        .map((row) => ({
            event: 'blocked',
            failed_required_axes: records(row.failed_required_axes),
            opportunity_id: typeof row.opportunity_id === 'string' ? row.opportunity_id : '',
            turn: typeof row.turn === 'number' ? row.turn : 0,
        }))
        .sort((a, b) => a.turn - b.turn || compareText(a.opportunity_id, b.opportunity_id));

    return {
        liveness: {
            expected_formations: HV_1995_FORMATION_IDS.length,
            spawned_formations: formations.filter((row) => row.spawn_count > 0).length,
            traced_formations: formations.filter((row) => row.temporal_row_count > 0).length,
        },
        positive_controls: positiveControls,
        formations,
        opportunity_blockers: opportunityBlockers,
    };
}

function readJsonObject(path: string): Record<string, unknown> {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Expected a JSON object: ${path}`);
    }
    return parsed as Record<string, unknown>;
}

export function analyzeHv1995Run(runDir: string, positiveControlId = 'hv_4th_guards_split') {
    const resolvedRunDir = resolve(runDir);
    const finalSave = readJsonObject(join(resolvedRunDir, 'final_save.json'));
    const military = finalSave.military !== null && typeof finalSave.military === 'object'
        ? finalSave.military as Record<string, unknown>
        : {};
    return {
        run_dir: basename(resolvedRunDir),
        ...analyzeHv1995Lifecycle({
            turnSummaries: records(finalSave.turn_summaries),
            temporalRows: parseJsonLines(readFileSync(join(resolvedRunDir, 'brigade_temporal_log.jsonl'), 'utf8')),
            weeklyRows: parseJsonLines(readFileSync(join(resolvedRunDir, 'weekly_report.jsonl'), 'utf8')),
            opportunityTraces: records(military.operation_opportunity_traces),
            positiveControlId,
        }),
    };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
    const runDir = process.argv[2];
    if (!runDir) {
        throw new Error('Usage: npm run diagnose:hv1995 -- <run-dir> [--write]');
    }
    const report = analyzeHv1995Run(runDir);
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (process.argv.includes('--write')) {
        writeFileSync(join(resolve(runDir), 'hv_1995_lifecycle_diagnostic.json'), serialized, 'utf8');
    }
    process.stdout.write(serialized);
}
