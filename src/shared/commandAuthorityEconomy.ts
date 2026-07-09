export const COMMAND_AUTHORITY_BASE_RECOVERY_PER_TURN = 3.25;
export const COMMAND_AUTHORITY_MIN_RECOVERY_PER_TURN = 3.25;
export const COMMAND_AUTHORITY_QUIET_FRONT_DIVIDEND = 2;
export const COMMAND_AUTHORITY_MAX_FRICTION_PENALTY = 2;
export const COMMAND_AUTHORITY_RESERVE_MAX = 15;

export const COMMAND_AUTHORITY_ALLOWED_INCOME_SOURCES = [
    'international_standing',
    'patron_confidence',
    'internal_cohesion',
    'quiet_front_restraint',
    'base_recovery',
] as const;

export type CommandAuthorityIncomeSource = typeof COMMAND_AUTHORITY_ALLOWED_INCOME_SOURCES[number];

export interface CommandAuthorityPoliticalDimensions {
    internationalStanding?: number;
    patronConfidence?: number;
    internalCohesion?: number;
}

export interface CommandAuthorityRecoveryInput {
    dimensions?: CommandAuthorityPoliticalDimensions;
    recentInterventions: number;
    unresolvedFriction: number;
}

export interface CommandAuthorityRecoveryBreakdown {
    recovery: number;
    base: number;
    politicalBonus: number;
    quietFrontDividend: number;
    frictionPenalty: number;
    topSource: CommandAuthorityIncomeSource;
}

export interface CommandAuthorityAccount {
    current: number;
    max: number;
    reserve?: number;
    reserve_max?: number;
    spent_this_turn: number;
    lifetime_spent: number;
    last_recovery?: number;
    last_recovery_source?: CommandAuthorityIncomeSource;
}

function finiteOr(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) ? Number(value) : fallback;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function roundQuarter(value: number): number {
    return Math.round(value * 4) / 4;
}

function politicalDelta(value: number): number {
    return clamp((value - 50) / 10, -2, 5);
}

function strongestSource(dimensions: Required<CommandAuthorityPoliticalDimensions>, quietFrontDividend: number): CommandAuthorityIncomeSource {
    const candidates: Array<{ source: CommandAuthorityIncomeSource; value: number }> = [
        { source: 'international_standing', value: dimensions.internationalStanding - 50 },
        { source: 'patron_confidence', value: dimensions.patronConfidence - 50 },
        { source: 'internal_cohesion', value: dimensions.internalCohesion - 50 },
        { source: 'quiet_front_restraint', value: quietFrontDividend > 0 ? quietFrontDividend * 10 : 0 },
        { source: 'base_recovery', value: 0 },
    ];
    candidates.sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return COMMAND_AUTHORITY_ALLOWED_INCOME_SOURCES.indexOf(a.source)
            - COMMAND_AUTHORITY_ALLOWED_INCOME_SOURCES.indexOf(b.source);
    });
    return candidates[0]?.source ?? 'base_recovery';
}

export function computeCommandAuthorityRecovery(input: CommandAuthorityRecoveryInput): CommandAuthorityRecoveryBreakdown {
    const dimensions = {
        internationalStanding: finiteOr(input.dimensions?.internationalStanding, 50),
        patronConfidence: finiteOr(input.dimensions?.patronConfidence, 50),
        internalCohesion: finiteOr(input.dimensions?.internalCohesion, 50),
    };
    const averageDelta = (
        politicalDelta(dimensions.internationalStanding)
        + politicalDelta(dimensions.patronConfidence)
        + politicalDelta(dimensions.internalCohesion)
    ) / 3;
    const recentInterventions = Math.max(0, finiteOr(input.recentInterventions, 0));
    const unresolvedFriction = Math.max(0, finiteOr(input.unresolvedFriction, 0));
    const quietFrontDividend = recentInterventions === 0 && unresolvedFriction === 0
        ? COMMAND_AUTHORITY_QUIET_FRONT_DIVIDEND
        : 0;
    const frictionPenalty = Math.min(
        COMMAND_AUTHORITY_MAX_FRICTION_PENALTY,
        (recentInterventions + unresolvedFriction) * 0.5,
    );
    const rawRecovery = COMMAND_AUTHORITY_BASE_RECOVERY_PER_TURN
        + averageDelta
        + quietFrontDividend
        - frictionPenalty;
    const recovery = roundQuarter(Math.max(COMMAND_AUTHORITY_MIN_RECOVERY_PER_TURN, rawRecovery));

    return {
        recovery,
        base: COMMAND_AUTHORITY_BASE_RECOVERY_PER_TURN,
        politicalBonus: roundQuarter(averageDelta),
        quietFrontDividend,
        frictionPenalty,
        topSource: strongestSource(dimensions, quietFrontDividend),
    };
}

export function applyCommandAuthorityRecovery(
    account: CommandAuthorityAccount,
    breakdown: CommandAuthorityRecoveryBreakdown,
): void {
    const max = Math.max(0, finiteOr(account.max, 100));
    const reserveMax = Math.max(0, finiteOr(account.reserve_max, COMMAND_AUTHORITY_RESERVE_MAX));
    let current = clamp(finiteOr(account.current, 0), 0, max);
    let reserve = clamp(finiteOr(account.reserve, 0), 0, reserveMax);
    const recovery = Math.max(0, finiteOr(breakdown.recovery, 0));

    if (current < max && reserve > 0) {
        const fromReserve = Math.min(max - current, reserve);
        current += fromReserve;
        reserve -= fromReserve;
    }

    if (current < max) {
        const toCurrent = Math.min(max - current, recovery);
        current += toCurrent;
        reserve = Math.min(reserveMax, reserve + (recovery - toCurrent));
    } else {
        reserve = Math.min(reserveMax, reserve + recovery);
    }

    account.current = current;
    account.max = max;
    account.reserve = reserve;
    account.reserve_max = reserveMax;
    account.last_recovery = recovery;
    account.last_recovery_source = breakdown.topSource;
}
