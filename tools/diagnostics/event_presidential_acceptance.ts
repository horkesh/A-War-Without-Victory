import { fileURLToPath } from 'node:url';
import path from 'node:path';

import type { FactionId, GameState } from '../../src/state/game_state.js';
import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import { evaluateEvents } from '../../src/sim/events/evaluate_events.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import { stableStringify } from '../../src/utils/stable_json.js';
import { buildEventAcceptanceReport } from './event_acceptance_report.js';

type ProbeStatus = 'surfaced' | 'resolved' | 'auto_resolved' | 'failed';

export type PresidentialAcceptanceFailure = {
    event_id: string;
    code: string;
    message: string;
};

export type PresidentialAcceptanceRow = {
    event_id: string;
    title: string | null;
    responding_faction: FactionId;
    historical_default_response_id: string;
    player_surface: {
        status: ProbeStatus;
        fired_count: number;
        pending_count: number;
        pending_event_ids: string[];
        decision_log_count: number;
    };
    player_resolve: {
        status: ProbeStatus;
        pending_count: number;
        decision_log_count: number;
        decision_source: string | null;
        response_id: string | null;
    };
    headless_auto: {
        status: ProbeStatus;
        fired_count: number;
        pending_count: number;
        decision_log_count: number;
        decision_source: string | null;
        response_id: string | null;
        historical_default_match: boolean;
    };
    consequence_trace: {
        event_flag_keys: string[];
        event_dimension_shifts: string[];
        option_count: number;
        option_traces: Array<{
            response_id: string;
            effect_kinds: string[];
            flag_keys: string[];
            dimension_shifts: string[];
        }>;
    };
};

export type PresidentialAcceptanceReport = {
    summary: {
        probe_turn: number;
        catalog_total_events: number;
        catalog_required_response_events: number;
        catalog_production_modal_authoring_ready_events: number;
        catalog_acceptance_status: 'READY' | 'NOT_READY';
        probed_event_count: number;
        player_surfaced_count: number;
        player_resolved_log_count: number;
        headless_auto_resolved_count: number;
        stuck_pending_count: number;
        duplicate_or_missing_definition_count: number;
        failure_count: number;
        status: 'READY' | 'NOT_READY';
    };
    rows: PresidentialAcceptanceRow[];
    failures: PresidentialAcceptanceFailure[];
};

const PROBE_TURN = 52;

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function makeState(playerFaction: FactionId | null): GameState {
    return {
        schema_version: 22,
        meta: {
            turn: PROBE_TURN,
            seed: 'event-presidential-acceptance',
            phase: 'war',
            ...(playerFaction === null ? { headless_scenario_auto_control: true } : { player_faction: playerFaction }),
        },
        factions: {
            RBiH: {},
            RS: {},
            HRHB: {},
        },
        military: {
            formations: {},
            fired_event_ids: [],
            event_decision_log: [],
            event_overflow_queue: [],
            general_supply_reserve: { RBiH: 50, RS: 50, HRHB: 50 },
            negotiation: {
                strategic_dimensions: {
                    RBiH: {},
                    RS: {},
                    HRHB: {},
                },
            },
        },
        political: {},
        displacement: {},
        economic: {},
    } as unknown as GameState;
}

function cloneForProbe(definition: EventDefinition): EventDefinition {
    return {
        ...definition,
        trigger: { turn_min: PROBE_TURN, turn_max: PROBE_TURN, phase: 'war' },
        pressure: undefined,
    };
}

function uniqueSorted(values: Iterable<string>): string[] {
    return [...new Set([...values].filter((value) => value.length > 0))].sort(strictCompare);
}

function flagKeys(flags: Record<string, string | number | boolean> | undefined): string[] {
    return Object.keys(flags ?? {}).sort(strictCompare);
}

function dimensionLabels(shifts: EventDefinition['dimension_shifts']): string[] {
    if (!Array.isArray(shifts)) return [];
    return shifts.map((shift) => `${shift.faction}:${shift.dimension}:${shift.delta}`).sort(strictCompare);
}

function decisionLogFor(state: GameState, eventId: string) {
    return [...(state.military.event_decision_log ?? [])].filter((entry) => entry.event_id === eventId);
}

function buildConsequenceTrace(definition: EventDefinition): PresidentialAcceptanceRow['consequence_trace'] {
    const optionTraces = [...(definition.response_options ?? [])]
        .map((option) => ({
            response_id: option.id,
            effect_kinds: (option.effects ?? []).map((effect) => effect.kind).sort(strictCompare),
            flag_keys: flagKeys(option.sets_flags),
            dimension_shifts: dimensionLabels(option.dimension_shifts),
        }))
        .sort((a, b) => strictCompare(a.response_id, b.response_id));

    return {
        event_flag_keys: flagKeys(definition.sets_flags),
        event_dimension_shifts: dimensionLabels(definition.dimension_shifts),
        option_count: optionTraces.length,
        option_traces: optionTraces,
    };
}

function rowFailure(eventId: string, code: string, message: string): PresidentialAcceptanceFailure {
    return { event_id: eventId, code, message };
}

function probeDefinition(definition: EventDefinition): { row: PresidentialAcceptanceRow; failures: PresidentialAcceptanceFailure[] } {
    const failures: PresidentialAcceptanceFailure[] = [];
    const probe = cloneForProbe(definition);
    const respondingFaction = probe.responding_faction;
    const historicalDefault = probe.historical_default_response_id;
    if (!respondingFaction || !historicalDefault) {
        throw new Error(`Production-ready event ${probe.id} is missing responding_faction or historical_default_response_id.`);
    }

    const playerSurfaceState = makeState(respondingFaction);
    const playerSurfaceResult = evaluateEvents(playerSurfaceState, () => 0, PROBE_TURN, [probe]);
    const surfacePendingIds = (playerSurfaceState.military.pending_event_decisions ?? []).map((decision) => decision.event_id).sort(strictCompare);
    const surfaceLogCount = decisionLogFor(playerSurfaceState, probe.id).length;
    const playerSurfaceOk =
        playerSurfaceResult.fired.length === 1 &&
        surfacePendingIds.length === 1 &&
        surfacePendingIds[0] === probe.id &&
        surfaceLogCount === 0;
    if (!playerSurfaceOk) {
        failures.push(rowFailure(probe.id, 'player_surface_failed', 'Player-faction probe did not surface exactly one pending decision without a decision log.'));
    }

    const playerResolveState = makeState(respondingFaction);
    evaluateEvents(playerResolveState, () => 0, PROBE_TURN, [probe]);
    if ((playerResolveState.military.pending_event_decisions ?? []).some((decision) => decision.event_id === probe.id)) {
        resolveEventDecision(playerResolveState, probe.id, historicalDefault);
    }
    const playerResolveLog = decisionLogFor(playerResolveState, probe.id);
    const playerResolvePending = (playerResolveState.military.pending_event_decisions ?? []).map((decision) => decision.event_id).sort(strictCompare);
    const playerResolveEntry = playerResolveLog[0] ?? null;
    const playerResolveOk =
        playerResolvePending.length === 0 &&
        playerResolveLog.length === 1 &&
        playerResolveEntry?.decision_source === 'player' &&
        playerResolveEntry.response_id === historicalDefault;
    if (!playerResolveOk) {
        failures.push(rowFailure(probe.id, 'player_resolve_failed', 'Resolving the player pending decision did not produce exactly one historical player decision-log row.'));
    }

    const headlessState = makeState(null);
    const headlessResult = evaluateEvents(headlessState, () => 0, PROBE_TURN, [probe]);
    const headlessPending = (headlessState.military.pending_event_decisions ?? []).map((decision) => decision.event_id).sort(strictCompare);
    const headlessLog = decisionLogFor(headlessState, probe.id);
    const headlessEntry = headlessLog[0] ?? null;
    const headlessOk =
        headlessResult.fired.length === 1 &&
        headlessPending.length === 0 &&
        headlessLog.length === 1 &&
        headlessEntry?.response_id === historicalDefault;
    if (!headlessOk) {
        failures.push(rowFailure(probe.id, 'headless_auto_resolve_failed', 'Headless probe did not auto-resolve exactly once on the historical default with no pending decision.'));
    }

    return {
        row: {
            event_id: probe.id,
            title: probe.title ?? null,
            responding_faction: respondingFaction,
            historical_default_response_id: historicalDefault,
            player_surface: {
                status: playerSurfaceOk ? 'surfaced' : 'failed',
                fired_count: playerSurfaceResult.fired.length,
                pending_count: surfacePendingIds.length,
                pending_event_ids: surfacePendingIds,
                decision_log_count: surfaceLogCount,
            },
            player_resolve: {
                status: playerResolveOk ? 'resolved' : 'failed',
                pending_count: playerResolvePending.length,
                decision_log_count: playerResolveLog.length,
                decision_source: playerResolveEntry?.decision_source ?? null,
                response_id: playerResolveEntry?.response_id ?? null,
            },
            headless_auto: {
                status: headlessOk ? 'auto_resolved' : 'failed',
                fired_count: headlessResult.fired.length,
                pending_count: headlessPending.length,
                decision_log_count: headlessLog.length,
                decision_source: headlessEntry?.decision_source ?? null,
                response_id: headlessEntry?.response_id ?? null,
                historical_default_match: headlessEntry?.response_id === historicalDefault,
            },
            consequence_trace: buildConsequenceTrace(probe),
        },
        failures,
    };
}

export function buildEventPresidentialAcceptanceReport(): PresidentialAcceptanceReport {
    const catalogAcceptance = buildEventAcceptanceReport();
    const definitionsById = new Map<string, EventDefinition[]>();
    for (const definition of loadEventDefinitions(0)) {
        const existing = definitionsById.get(definition.id) ?? [];
        existing.push(definition);
        definitionsById.set(definition.id, existing);
    }

    const rows: PresidentialAcceptanceRow[] = [];
    const failures: PresidentialAcceptanceFailure[] = [];
    let duplicateOrMissingDefinitionCount = 0;

    const readyRows = [...catalogAcceptance.production_modal_authoring_ready_rows]
        .sort((a, b) => strictCompare(a.id, b.id));
    for (const readyRow of readyRows) {
        const definitions = definitionsById.get(readyRow.id) ?? [];
        if (definitions.length !== 1) {
            duplicateOrMissingDefinitionCount += 1;
            failures.push(rowFailure(readyRow.id, 'definition_lookup_failed', `Expected exactly one loaded definition, found ${definitions.length}.`));
            continue;
        }
        const result = probeDefinition(definitions[0]);
        rows.push(result.row);
        failures.push(...result.failures);
    }

    const stuckPendingCount = rows.filter((row) =>
        row.player_resolve.pending_count > 0 || row.headless_auto.pending_count > 0
    ).length;
    const sortedFailures = failures.sort((a, b) => strictCompare(`${a.event_id}:${a.code}:${a.message}`, `${b.event_id}:${b.code}:${b.message}`));

    return {
        summary: {
            probe_turn: PROBE_TURN,
            catalog_total_events: catalogAcceptance.summary.total_events,
            catalog_required_response_events: catalogAcceptance.summary.required_response_events,
            catalog_production_modal_authoring_ready_events: catalogAcceptance.summary.production_modal_authoring_ready_events,
            catalog_acceptance_status: catalogAcceptance.summary.acceptance_status,
            probed_event_count: rows.length,
            player_surfaced_count: rows.filter((row) => row.player_surface.status === 'surfaced').length,
            player_resolved_log_count: rows.filter((row) => row.player_resolve.status === 'resolved').length,
            headless_auto_resolved_count: rows.filter((row) => row.headless_auto.status === 'auto_resolved').length,
            stuck_pending_count: stuckPendingCount,
            duplicate_or_missing_definition_count: duplicateOrMissingDefinitionCount,
            failure_count: sortedFailures.length,
            status: sortedFailures.length === 0 ? 'READY' : 'NOT_READY',
        },
        rows,
        failures: sortedFailures,
    };
}

function printTextReport(report: PresidentialAcceptanceReport): void {
    process.stdout.write(`Event presidential acceptance diagnostic: ${report.summary.status}\n`);
    process.stdout.write(`Probed production modal-ready events: ${report.summary.probed_event_count}\n`);
    process.stdout.write(`Player surfaced: ${report.summary.player_surfaced_count}; player resolved logs: ${report.summary.player_resolved_log_count}; headless auto-resolved: ${report.summary.headless_auto_resolved_count}\n`);
    process.stdout.write(`Failures: ${report.summary.failure_count}; stuck pending: ${report.summary.stuck_pending_count}\n`);
}

function main(): void {
    const report = buildEventPresidentialAcceptanceReport();
    if (process.argv.includes('--json')) {
        process.stdout.write(`${stableStringify(report, 2)}\n`);
        return;
    }
    printTextReport(report);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
