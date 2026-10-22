import type { GameState, MilitiaPoolState } from '../../state/game_state.js';
import { stableStringify } from '../../utils/stable_json.js';
import { isReasonCodeTopicEnabled } from './reason_code_debug.js';

export const POOL_FLOW_PREFIX = '[pool_flow]';
export const POOL_FLOW_KEY = 'pale:RS';

type NumberObservation =
    | { presence: 'unreached' }
    | { presence: 'present_undefined' }
    | { presence: 'present_null' }
    | { presence: 'present_nonfinite'; value: string }
    | { presence: 'present_value'; value: number };

export type PoolFlowPoolObservation = { presence: 'missing' } | { presence: 'access_error' } | {
    presence: 'present';
    available: NumberObservation;
    committed: NumberObservation;
    exhausted: NumberObservation;
    wounded_pending: NumberObservation;
};

export interface PoolFlowPhaseBoundary {
    phase_name: string;
    phase_family: string;
    phase_index: number;
}

export interface PoolFlowExpectedPhase {
    phase_name: string;
    phase_family: string;
}

let cachedSelected: boolean | undefined;
const activeByState = new WeakMap<GameState, PoolFlowObserver>();

function selected(): boolean {
    if (cachedSelected !== undefined) return cachedSelected;
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_DEBUG_REINFORCEMENT_POOLS;
    const keys = typeof raw === 'string' ? raw.split(',').map((part) => part.trim()).filter(Boolean) : [];
    return cachedSelected = keys.includes(POOL_FLOW_KEY);
}

export function resetPoolFlowSelectorCacheForTests(): void {
    cachedSelected = undefined;
}

function observeNumber(value: unknown, reached = true): NumberObservation {
    if (!reached) return { presence: 'unreached' };
    if (value === undefined) return { presence: 'present_undefined' };
    if (value === null) return { presence: 'present_null' };
    if (typeof value !== 'number' || !Number.isFinite(value)) return { presence: 'present_nonfinite', value: String(value) };
    return { presence: 'present_value', value };
}

function observePool(pool: MilitiaPoolState | undefined): PoolFlowPoolObservation {
    if (!pool) return { presence: 'missing' };
    return {
        presence: 'present',
        available: observeNumber(pool.available),
        committed: observeNumber(pool.committed),
        exhausted: observeNumber(pool.exhausted),
        wounded_pending: observeNumber(pool.wounded_pending),
    };
}

function observeOperands(values: Record<string, unknown>): Record<string, NumberObservation> {
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, observeNumber(value)]));
}

export class PoolFlowObserver {
    private attempted = 0;
    private emitted = 0;
    private diagnosticErrors = 0;
    private readonly observedPhases: PoolFlowExpectedPhase[] = [];
    private readonly coveredWriterGroups = new Set<string>();
    private currentPhaseIndex = -1;

    constructor(
        private readonly completedTurn: number,
        private readonly expectedPhases: readonly PoolFlowExpectedPhase[] | null,
        initialDiagnosticErrors = 0,
    ) {
        this.diagnosticErrors = initialDiagnosticErrors;
    }

    snapshot(state: GameState): PoolFlowPoolObservation {
        try {
            const pools = state.military.militia_pools as Record<string, MilitiaPoolState> | undefined;
            return observePool(pools?.[POOL_FLOW_KEY]);
        } catch {
            this.diagnosticErrors += 1;
            return { presence: 'access_error' };
        }
    }

    private emit(record: Record<string, unknown>): void {
        this.attempted += 1;
        const sequence = this.attempted;
        try {
            console.log(`${POOL_FLOW_PREFIX} ${stableStringify({
                schema_version: 1, sequence, completed_turn: this.completedTurn,
                pool_key: POOL_FLOW_KEY, ...record,
            })}`);
            this.emitted += 1;
        } catch {
            this.diagnosticErrors += 1;
        }
    }

    beforePhase(state: GameState, phaseName: string, phaseIndex: number, phaseFamily: string): PoolFlowPhaseBoundary {
        const boundary = { phase_name: phaseName, phase_family: phaseFamily, phase_index: phaseIndex };
        this.currentPhaseIndex = phaseIndex;
        this.observedPhases.push({ phase_name: phaseName, phase_family: phaseFamily });
        this.emit({ event: 'phase_start', ...boundary, pool: this.snapshot(state) });
        return boundary;
    }

    afterPhase(state: GameState, boundary: PoolFlowPhaseBoundary, status: 'executed' | 'skipped', skipReason: string | null): void {
        const expectedGroups = boundary.phase_name === 'ongoing-mobilization'
            ? ['direct', 'shared']
            : boundary.phase_name === 'pool-war-weariness-decay'
                ? ['decay']
                : boundary.phase_name === 'wia-trickleback' ? ['wia'] : [];
        for (const group of expectedGroups) {
            const coverageKey = `${boundary.phase_index}|${group}`;
            if (this.coveredWriterGroups.has(coverageKey)) continue;
            const pool = this.snapshot(state);
            this.emit({
                event: 'writer_qualification', ...boundary, writer_group: group,
                source: group === 'direct' ? 'ongoing_mobilization'
                    : group === 'shared' ? 'pool_population'
                        : group === 'decay' ? 'pool_decay' : 'formation_spawn',
                branch: 'not_reached', result: status === 'skipped' ? 'skipped' : 'unreached',
                skip_reason: status === 'skipped' ? skipReason : null,
                before: pool, after: pool, operands: {},
            });
        }
        this.emit({ event: 'phase_end', ...boundary, status, skip_reason: skipReason, pool: this.snapshot(state) });
        this.currentPhaseIndex = -1;
    }

    recordMutation(
        state: GameState,
        before: PoolFlowPoolObservation,
        source: string,
        branch: string,
        result: 'credited' | 'debited' | 'zero' | 'skipped',
        operands: Record<string, unknown>,
        writerGroup: 'direct' | 'shared' | 'decay' | 'wia',
    ): void {
        this.coveredWriterGroups.add(`${this.currentPhaseIndex}|${writerGroup}`);
        const after = this.snapshot(state);
        const beforeAvailable = before.presence === 'present' && before.available.presence === 'present_value'
            ? before.available.value : undefined;
        const afterAvailable = after.presence === 'present' && after.available.presence === 'present_value'
            ? after.available.value : undefined;
        this.emit({
            event: 'mutation', writer_group: writerGroup, source, branch, result, before, after,
            operands: observeOperands({ ...operands, available_before: beforeAvailable, available_after: afterAvailable }),
        });
    }

    finish(state: GameState, status: 'success' | 'invariant_failure', errorStatus: string | null = null): void {
        this.emit({
            event: 'terminal', status, error_status: errorStatus, pool: this.snapshot(state),
            expected_phase_manifest: this.expectedPhases,
            observed_phase_manifest: this.observedPhases,
            attempted_record_count: this.attempted + 1,
            emitted_record_count: this.emitted,
            diagnostic_error_count: this.diagnosticErrors,
        });
        activeByState.delete(state);
    }
}

export function createPoolFlowObserver(
    state: GameState,
    expectedPhases: readonly PoolFlowExpectedPhase[] | (() => readonly PoolFlowExpectedPhase[]) = [],
): PoolFlowObserver | undefined {
    if (!isReasonCodeTopicEnabled('pool_flow') || !selected()) return undefined;
    if (state.meta.turn !== 21 && state.meta.turn !== 22) return undefined;
    let resolvedExpectedPhases: readonly PoolFlowExpectedPhase[] | null;
    let initialDiagnosticErrors = 0;
    try {
        resolvedExpectedPhases = typeof expectedPhases === 'function' ? expectedPhases() : expectedPhases;
    } catch {
        resolvedExpectedPhases = null;
        initialDiagnosticErrors = 1;
    }
    const observer = new PoolFlowObserver(state.meta.turn, resolvedExpectedPhases, initialDiagnosticErrors);
    activeByState.set(state, observer);
    return observer;
}

export interface PoolFlowMutationAttempt {
    complete(source: string, branch: string, result: 'credited' | 'debited' | 'zero' | 'skipped', operands: Record<string, unknown>, writerGroup: 'direct' | 'shared' | 'decay' | 'wia'): void;
}

export function beginPoolFlowMutation(state: GameState, reachedPoolKey: string): PoolFlowMutationAttempt | undefined {
    const observer = activeByState.get(state);
    if (!observer || reachedPoolKey !== POOL_FLOW_KEY) return undefined;
    const before = observer.snapshot(state);
    return {
        complete(source, branch, result, operands, writerGroup) {
            observer.recordMutation(state, before, source, branch, result, operands, writerGroup);
        },
    };
}
