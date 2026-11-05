import type { FactionId, MilitiaPoolState } from '../../state/game_state.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { stableStringify } from '../../utils/stable_json.js';
import { isReasonCodeTopicEnabled, sortedIds } from './reason_code_debug.js';

export const REINFORCEMENT_ALLOCATION_PREFIX = '[reinforcement_allocation]';

type NumberObservation =
    | { presence: 'unreached' }
    | { presence: 'present_undefined' }
    | { presence: 'present_null' }
    | { presence: 'present_nonfinite'; value: string }
    | { presence: 'present_value'; value: number };

type PoolObservation =
    | { presence: 'missing' }
    | { presence: 'present'; available: NumberObservation; committed: NumberObservation };

const RECIPIENT_NUMBER_FIELDS = [
    'current_personnel',
    'cap',
    'rate',
    'need',
    'reserve_for_spawn',
    'effective_available',
    'transfer',
    'personnel_after',
    'pool_available_before',
    'pool_committed_before',
    'pool_available_after',
    'pool_committed_after',
] as const;

type RecipientNumberField = typeof RECIPIENT_NUMBER_FIELDS[number];

export interface ReinforcementAllocationRecipient {
    formation_id: string;
    global_order: number;
    disposition: 'skipped' | 'transferred';
    reason: 'ineligible' | 'at_cap' | 'pool_missing' | 'pool_empty' | 'reserve_exhausted' | 'no_transfer' | null;
    numbers?: Partial<Record<RecipientNumberField, unknown>>;
}

let cachedPoolSelection: { configured: boolean; keys: string[] } | undefined;

function selectedPoolKeys(): { configured: boolean; keys: string[] } {
    if (cachedPoolSelection) return cachedPoolSelection;
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_DEBUG_REINFORCEMENT_POOLS;
    const keys = typeof raw === 'string'
        ? sortedIds([...new Set(raw.split(',').map((key) => key.trim()).filter(Boolean))])
        : [];
    return cachedPoolSelection = { configured: keys.length > 0, keys };
}

export function resetReinforcementAllocationSelectorCacheForTests(): void {
    cachedPoolSelection = undefined;
}

function observeNumber(value: unknown, reached = true): NumberObservation {
    if (!reached) return { presence: 'unreached' };
    if (value === undefined) return { presence: 'present_undefined' };
    if (value === null) return { presence: 'present_null' };
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { presence: 'present_nonfinite', value: String(value) };
    }
    return { presence: 'present_value', value };
}

function observePool(pool: MilitiaPoolState | undefined): PoolObservation {
    if (!pool) return { presence: 'missing' };
    return {
        presence: 'present',
        available: observeNumber(pool.available),
        committed: observeNumber(pool.committed),
    };
}

function emit(record: Record<string, unknown>): void {
    try {
        console.log(`${REINFORCEMENT_ALLOCATION_PREFIX} ${stableStringify({
            schema_version: 2,
            source: 'formation_spawn.reinforce',
            ...record,
        })}`);
    } catch {
        // Diagnostic serialization and stdout failures must not affect gameplay.
    }
}

export class ReinforcementAllocationObserver {
    private readonly attemptedRecipients = new Map<string, Array<{ formation_id: string; global_order: number }>>();
    private diagnosticErrorCount = 0;

    constructor(
        private readonly completedTurn: number,
        private readonly poolKeys: readonly string[],
        private readonly pools: Record<string, MilitiaPoolState>,
    ) {}

    isSelected(poolKey: string): boolean {
        return this.poolKeys.includes(poolKey);
    }

    stageOpen(): void {
        try {
            this.poolKeys.forEach((pool_key, selected_pool_ordinal) => emit({
                event: 'stage_open', branch: 'regular', completed_turn: this.completedTurn,
                pool_key, selected_pool_ordinal, pool: observePool(this.pools[pool_key]),
            }));
        } catch {
            // Observation cannot prevent the regular reinforcement stage.
        }
    }

    recordRecipient(poolKey: string, build: () => ReinforcementAllocationRecipient): void {
        if (!this.isSelected(poolKey)) return;
        try {
            const record = build();
            const attempted = this.attemptedRecipients.get(poolKey) ?? [];
            attempted.push({ formation_id: record.formation_id, global_order: record.global_order });
            this.attemptedRecipients.set(poolKey, attempted);
            const numbers = record.numbers ?? {};
            const observed = Object.fromEntries(RECIPIENT_NUMBER_FIELDS.map((field) => [
                field,
                observeNumber(numbers[field], Object.prototype.hasOwnProperty.call(numbers, field)),
            ]));
            emit({
                event: 'recipient', branch: 'regular', completed_turn: this.completedTurn,
                pool_key: poolKey, formation_id: record.formation_id, global_order: record.global_order,
                disposition: record.disposition, reason: record.reason, ...observed,
            });
        } catch {
            this.diagnosticErrorCount += 1;
            // Observation and record construction cannot change allocation.
        }
    }

    recordRecipientBeforePoolSelection(
        munId: string,
        faction: FactionId,
        readRecruitPoolFaction: () => FactionId | undefined,
        build: () => ReinforcementAllocationRecipient,
    ): void {
        try {
            const poolFaction = readRecruitPoolFaction() ?? faction;
            this.recordRecipient(militiaPoolKey(munId, poolFaction), build);
        } catch {
            this.diagnosticErrorCount += 1;
            // Lazy pool association is diagnostic-only and cannot alter an early gameplay guard.
        }
    }

    stageClose(): void {
        try {
            this.poolKeys.forEach((pool_key, selected_pool_ordinal) => {
                const attempted_recipients = this.attemptedRecipients.get(pool_key) ?? [];
                emit({
                    event: 'stage_close', branch: 'regular', completed_turn: this.completedTurn,
                    pool_key, selected_pool_ordinal, pool: observePool(this.pools[pool_key]),
                    attempted_recipient_count: attempted_recipients.length,
                    attempted_recipients: attempted_recipients.map((recipient) => ({ ...recipient })),
                    diagnostic_error_count: this.diagnosticErrorCount,
                });
            });
        } catch {
            // Observation cannot mask a completed regular reinforcement stage.
        }
    }
}

export function createReinforcementAllocationObserver(
    completedTurn: number,
    pools: Record<string, MilitiaPoolState>,
): ReinforcementAllocationObserver | undefined {
    if (!isReasonCodeTopicEnabled('reinforcement_allocation')) return undefined;
    const selection = selectedPoolKeys();
    if (!selection.configured) return undefined;
    return new ReinforcementAllocationObserver(completedTurn, selection.keys, pools);
}
