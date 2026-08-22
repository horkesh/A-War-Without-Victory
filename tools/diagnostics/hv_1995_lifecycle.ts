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
    operationAars: Array<Record<string, unknown>>;
    politicalControllers: Record<string, unknown>;
    positiveControlId: string;
    formations?: Record<string, unknown>;
    opInjectionWarnings?: Array<Record<string, unknown>>;
}

const CASCADE_OPERATIONS = [
    { opportunity_id: 'kupres_cincar_94', operation_name: 'Operation Cincar / Kupres' },
    { opportunity_id: 'mistral_1_95', operation_name: 'Operation Mistral 1' },
    { opportunity_id: 'mistral_2_95', operation_name: 'Operation Mistral 2' },
    { opportunity_id: 'southern_move_95', operation_name: 'Operation Southern Move' },
] as const;

const CASCADE_DEPENDENCY_ANCHORS = [
    { consumer_opportunity_id: 'mistral_1_95', osid: 'op:kupres:bucovaca' },
    { consumer_opportunity_id: 'mistral_2_95', osid: 'op:kupres:bucovaca' },
    { consumer_opportunity_id: 'mistral_2_95', osid: 'op:glamoc:glamoc_2' },
    { consumer_opportunity_id: 'southern_move_95', osid: 'op:sipovo:sipovo_2' },
    { consumer_opportunity_id: 'southern_move_95', osid: 'op:sipovo:pribeljci_2' },
] as const;

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

function record(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function countRows(rows: Array<Record<string, unknown>>, predicate: (row: Record<string, unknown>) => boolean): number {
    let count = 0;
    for (const row of rows) if (predicate(row)) count += 1;
    return count;
}

function strings(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string').slice().sort(compareText)
        : [];
}

function warningFormationId(detail: unknown): string | null {
    if (typeof detail !== 'string') return null;
    const firstQuote = detail.indexOf('"');
    const secondQuote = firstQuote >= 0 ? detail.indexOf('"', firstQuote + 1) : -1;
    return firstQuote >= 0 && secondQuote > firstQuote
        ? detail.slice(firstQuote + 1, secondQuote)
        : null;
}

function analyzeOperationReferenceIntegrity(artifacts: Hv1995LifecycleArtifacts) {
    const formations = artifacts.formations ?? {};
    const missingWarnings = (artifacts.opInjectionWarnings ?? [])
        .filter((warning) => warning.check === 'brigade_missing')
        .map((warning) => {
            const authoredFormationId = warningFormationId(warning.detail);
            const warningTurn = typeof warning.turn === 'number' ? warning.turn : null;
            const exactFormationPresent = authoredFormationId !== null
                && Object.prototype.hasOwnProperty.call(formations, authoredFormationId);
            const firstObservedTurn = authoredFormationId === null
                ? null
                : artifacts.temporalRows
                    .filter((row) => row.brigade_id === authoredFormationId && typeof row.turn === 'number')
                    .reduce<number | null>((earliest, row) => {
                        const turn = row.turn as number;
                        return earliest === null || turn < earliest ? turn : earliest;
                    }, null);
            const aliasMatches = authoredFormationId === null
                ? []
                : Object.entries(formations)
                    .filter(([, value]) => strings(record(value)?.tags).includes(`oob:${authoredFormationId}`))
                    .map(([formationId]) => formationId)
                    .sort(compareText);
            return {
                turn: warningTurn,
                operation_name: typeof warning.op_name === 'string' ? warning.op_name : '',
                axis_id: typeof warning.axis_id === 'string' ? warning.axis_id : null,
                authored_formation_id: authoredFormationId,
                first_observed_turn: firstObservedTurn,
                live_oob_aliases: aliasMatches,
                classification: exactFormationPresent
                    ? warningTurn !== null && firstObservedTurn !== null && firstObservedTurn > warningTurn
                        ? 'not_yet_spawned_at_warning'
                        : 'exact_formation_present_in_final_registry'
                    : aliasMatches.length === 0
                        ? 'true_missing'
                        : aliasMatches.length === 1
                            ? 'alias_backed_false_missing'
                            : 'ambiguous_oob_alias',
            };
        })
        .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0)
            || compareText(a.operation_name, b.operation_name)
            || compareText(a.authored_formation_id ?? '', b.authored_formation_id ?? ''));

    return {
        positive_controls: {
            brigade_missing_warning_projection: missingWarnings.length > 0,
            non_alias_warning_positive_control: missingWarnings.some((row) =>
                row.classification !== 'alias_backed_false_missing'
                && row.classification !== 'ambiguous_oob_alias'),
        },
        alias_backed_false_missing_count: missingWarnings.filter((row) =>
            row.classification === 'alias_backed_false_missing').length,
        ambiguous_oob_alias_count: missingWarnings.filter((row) =>
            row.classification === 'ambiguous_oob_alias').length,
        warnings: missingWarnings,
    };
}

function compactAxis(axis: Record<string, unknown>) {
    return {
        axis_id: typeof axis.axis_id === 'string' ? axis.axis_id : '',
        brigades: strings(axis.brigades),
        launch_blocker: typeof axis.launch_blocker === 'string' ? axis.launch_blocker : null,
        objectives_captured: strings(axis.objectives_captured),
        objectives_targeted: strings(axis.objectives_targeted),
        total_attacks: typeof axis.total_attacks === 'number' ? axis.total_attacks : 0,
        unreachable_at_launch: axis.unreachable_at_launch === true,
    };
}

function compactAar(aar: Record<string, unknown> | undefined) {
    if (!aar) return null;
    return {
        operation_id: typeof aar.operation_id === 'string' ? aar.operation_id : '',
        started_turn: typeof aar.started_turn === 'number' ? aar.started_turn : null,
        ended_turn: typeof aar.ended_turn === 'number' ? aar.ended_turn : null,
        outcome: typeof aar.outcome === 'string' ? aar.outcome : null,
        recovery_reason: typeof aar.recovery_reason === 'string' ? aar.recovery_reason : null,
        participating_brigades: strings(aar.participating_brigades),
        objectives_targeted: strings(aar.objectives_targeted),
        objectives_captured: strings(aar.objectives_captured),
        total_attacks: typeof aar.total_attacks === 'number' ? aar.total_attacks : 0,
        axes: records(aar.axis_summaries).map(compactAxis).sort((a, b) => compareText(a.axis_id, b.axis_id)),
    };
}

function analyzeCascade(artifacts: Hv1995LifecycleArtifacts) {
    const turnBattleRows = artifacts.turnSummaries.flatMap((summary) => records(summary.battles).map((battle) => ({
        battle,
        turn: typeof summary.turn === 'number' ? summary.turn : null,
    })));
    const weeklyDiagnostics = artifacts.weeklyRows.flatMap((weekly) => records(weekly.operation_diagnostics).map((diagnostic) => ({
        diagnostic,
        turn: typeof weekly.week_index === 'number' ? weekly.week_index : null,
    })));

    const operations = CASCADE_OPERATIONS.map((definition) => {
        const traces = artifacts.opportunityTraces
            .filter((row) => row.opportunity_id === definition.opportunity_id)
            .map((row) => ({
                turn: typeof row.turn === 'number' ? row.turn : null,
                event: typeof row.event === 'string' ? row.event : '',
                failed_required_axes: records(row.failed_required_axes),
                participant_evaluations: records(row.participant_evaluations),
            }))
            .sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0) || compareText(a.event, b.event));
        const aar = artifacts.operationAars.find((row) => row.operation_name === definition.operation_name);
        const diagnostics = weeklyDiagnostics
            .filter((row) => row.diagnostic.operation_name === definition.operation_name)
            .map((row) => ({
                turn: row.turn,
                phase: typeof row.diagnostic.operation_phase === 'string' ? row.diagnostic.operation_phase : null,
                participating_brigades: strings(row.diagnostic.participating_brigades),
                eligible_attacker_count: typeof row.diagnostic.eligible_attacker_count === 'number' ? row.diagnostic.eligible_attacker_count : 0,
                movement_order_count: typeof row.diagnostic.movement_order_count === 'number' ? row.diagnostic.movement_order_count : 0,
                attack_attempt_count: typeof row.diagnostic.attack_attempt_count === 'number' ? row.diagnostic.attack_attempt_count : 0,
                battle_count: typeof row.diagnostic.battle_count === 'number' ? row.diagnostic.battle_count : 0,
                objective_capture_count: typeof row.diagnostic.objective_capture_count === 'number' ? row.diagnostic.objective_capture_count : 0,
                recovery_reason: typeof row.diagnostic.recovery_reason === 'string' ? row.diagnostic.recovery_reason : null,
            }));
        const battles = artifacts.weeklyRows.flatMap((weekly) => records(weekly.battles)
            .filter((battle) => battle.operation_name === definition.operation_name)
            .map((battle) => {
                const turn = typeof weekly.week_index === 'number' ? weekly.week_index : null;
                const target = typeof battle.target_osid === 'string' ? battle.target_osid : '';
                const attacker = typeof battle.attacker_brigade === 'string' ? battle.attacker_brigade : '';
                const outcome = typeof battle.outcome === 'string' ? battle.outcome : '';
                const turnProjection = turnBattleRows.find((candidate) =>
                    candidate.turn === turn
                    && candidate.battle.osid === target
                    && candidate.battle.primary_attacker_id === attacker
                    && candidate.battle.outcome === outcome);
                return {
                    turn,
                    target_osid: target,
                    outcome,
                    attacker_won: battle.attacker_won === true,
                    attacker_brigades: strings(battle.attacker_brigades),
                    power_ratio: typeof battle.power_ratio === 'number' ? battle.power_ratio : null,
                    territory_flipped: typeof turnProjection?.battle.territory_flipped === 'boolean'
                        ? turnProjection.battle.territory_flipped
                        : null,
                };
            }));
        return {
            ...definition,
            traces,
            aar: compactAar(aar),
            weekly_diagnostics: diagnostics,
            battles,
        };
    });
    const cascadeParticipants = new Set<string>(HV_1995_FORMATION_IDS);
    for (const operation of operations) {
        for (const id of operation.aar?.participating_brigades ?? []) cascadeParticipants.add(id);
        for (const diagnostic of operation.weekly_diagnostics) {
            for (const id of diagnostic.participating_brigades) cascadeParticipants.add(id);
        }
    }
    const columnReports = artifacts.weeklyRows
        .map((weekly) => ({
            turn: typeof weekly.week_index === 'number' ? weekly.week_index : null,
            report: record(weekly.column_movement),
        }))
        .filter((row): row is { turn: number | null; report: Record<string, unknown> } => row.report !== null);
    const movementRejections = columnReports.flatMap(({ turn, report }) =>
        records(report.column_rejections)
            .filter((rejection) => typeof rejection.formation_id === 'string'
                && cascadeParticipants.has(rejection.formation_id))
            .map((rejection) => ({ turn, ...rejection })));

    return {
        positive_controls: {
            column_movement_projection: columnReports.some(({ report }) =>
                typeof report.column_starts === 'number' && report.column_starts > 0),
            final_controller_projection: CASCADE_DEPENDENCY_ANCHORS.some(({ osid }) =>
                Object.prototype.hasOwnProperty.call(artifacts.politicalControllers, osid)),
            movement_reject_projection: columnReports.some(({ report }) =>
                Object.prototype.hasOwnProperty.call(report, 'column_rejections')),
            operation_aar_projection: artifacts.operationAars.length > 0,
            opportunity_trace_projection: artifacts.opportunityTraces.length > 0,
            opportunity_roster_projection: artifacts.opportunityTraces.some((row) =>
                Object.prototype.hasOwnProperty.call(row, 'participant_evaluations')),
            opportunity_roster_admission_positive_control: artifacts.opportunityTraces.some((row) =>
                records(row.participant_evaluations).some((entry) => entry.decision === 'admitted')),
            turn_battle_flip_projection: turnBattleRows.some((row) => typeof row.battle.territory_flipped === 'boolean'),
            weekly_operation_diagnostic_projection: weeklyDiagnostics.length > 0,
        },
        operations,
        movement_rejections: movementRejections,
        dependency_anchors: CASCADE_DEPENDENCY_ANCHORS.map((anchor) => ({
            ...anchor,
            final_controller: typeof artifacts.politicalControllers[anchor.osid] === 'string'
                ? artifacts.politicalControllers[anchor.osid]
                : null,
        })),
    };
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
            const ids = battle.attacker_brigades
                .filter((id): id is string => typeof id === 'string')
                .slice()
                .sort(compareText);
            if (ids.includes(artifacts.positiveControlId)) battleStackProjection = true;
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
        spawn_projection: (spawnCounts.get(artifacts.positiveControlId) ?? 0) > 0,
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
        if (spawnCount === 0 && positiveControls.spawn_projection) firstUnobservedBoundary = 'spawn';
        else if (temporal.length === 0 && positiveControls.temporal_population) firstUnobservedBoundary = 'temporal_observation';
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
        operation_reference_integrity: analyzeOperationReferenceIntegrity(artifacts),
        cascade: analyzeCascade(artifacts),
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
            operationAars: JSON.parse(readFileSync(join(resolvedRunDir, 'operation_aars.json'), 'utf8')) as Array<Record<string, unknown>>,
            politicalControllers: finalSave.political !== null && typeof finalSave.political === 'object'
                ? ((finalSave.political as Record<string, unknown>).political_controllers as Record<string, unknown> ?? {})
                : {},
            positiveControlId,
            formations: record(military.formations) ?? {},
            opInjectionWarnings: records(military.op_injection_warnings),
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
