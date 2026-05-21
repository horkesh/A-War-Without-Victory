/**
 * SupplyIntelligence — supply breakdown, enclave resilience bars,
 * and mobilization summary for Army HQ Nerve Center.
 *
 * Supply breakdown is estimated from formation count + known constants
 * (the exact breakdown is computed transiently in the pipeline, not stored).
 * Enclave data comes directly from enclaveResilience on LoadedGameState.
 */
import type { LoadedGameState, FormationView } from '../../data/types';
import { turnToDateString } from '../../utils/formatters';
import { getPlayerSafeEnclaveName } from '../../utils/playerSafeText';

import {
    MAINTENANCE_DRAIN_PER_FORMATION,
    HEAVY_MAINTENANCE_PER_WEAPON,
    PATRON_AID_SCALE,
} from '../../../../state/supply_reserve_constants.js';

// Historical patron commitment profiles (simplified midpoints)
const PATRON_COMMITMENT: Record<string, number> = {
    RBiH: 0.45,  // 0.3 → 0.6 over war
    RS: 0.65,    // 0.8 → 0.55 over war
    HRHB: 0.08,  // 0 → 0.15
};

// ── Types ────────────────────────────────────────────────────────────────

export interface SupplyBreakdown {
    currentGeneral: number;
    currentHeavy: number;
    estimatedMaintenanceDrain: number;
    estimatedHeavyDrain: number;
    estimatedPatronAid: number;
    estimatedNetPerTurn: number;
    estimatedRunwayTurns: number | null;  // null = sustainable
}

export interface EnclaveStatus {
    id: string;
    displayName: string;
    resilience: number;
    maxResilience: number;
    siegeTurns: number;
    supplyState: 'adequate' | 'strained' | 'critical';
    faction: string | null;
}

export interface MobilizationInfo {
    exhaustionPct: number;
    activePoolCount: number;
    currentPoolTotal: number;
}

// ── Pure computation ─────────────────────────────────────────────────────

export function computeSupplyBreakdown(
    state: LoadedGameState,
    faction: string,
): SupplyBreakdown {
    const reserves = state.factionReserves?.[faction];
    const currentGeneral = reserves?.generalSupply ?? 0;
    const currentHeavy = reserves?.heavyMunitions ?? 0;

    const formations = state.formations?.filter(f =>
        f.faction === faction && f.status === 'active',
    ) ?? [];

    const formationCount = formations.length;
    const totalHeavyWeapons = formations.reduce((sum, f) => {
        const c = f.composition;
        if (!c) return sum;
        return sum + (c.tanks ?? 0) + (c.artillery ?? 0) + (c.aa_systems ?? 0);
    }, 0);

    const estimatedMaintenanceDrain = formationCount * MAINTENANCE_DRAIN_PER_FORMATION;
    const estimatedHeavyDrain = totalHeavyWeapons * HEAVY_MAINTENANCE_PER_WEAPON;
    const estimatedPatronAid = (PATRON_COMMITMENT[faction] ?? 0.1) * PATRON_AID_SCALE * 0.01;
    const estimatedNetPerTurn = estimatedPatronAid - estimatedMaintenanceDrain;
    const estimatedRunwayTurns = estimatedNetPerTurn < 0
        ? Math.round(currentGeneral / Math.abs(estimatedNetPerTurn))
        : null;

    return {
        currentGeneral: Math.round(currentGeneral * 10) / 10,
        currentHeavy: Math.round(currentHeavy * 10) / 10,
        estimatedMaintenanceDrain: Math.round(estimatedMaintenanceDrain * 100) / 100,
        estimatedHeavyDrain: Math.round(estimatedHeavyDrain * 100) / 100,
        estimatedPatronAid: Math.round(estimatedPatronAid * 100) / 100,
        estimatedNetPerTurn: Math.round(estimatedNetPerTurn * 100) / 100,
        estimatedRunwayTurns,
    };
}

export function getEnclaveStatuses(
    state: LoadedGameState,
    faction: string,
): EnclaveStatus[] {
    const resilience = state.enclaveResilience ?? {};
    const statuses: EnclaveStatus[] = [];

    for (const [id, enc] of Object.entries(resilience)) {
        if (enc.faction !== faction) continue;
        statuses.push({
            id,
            displayName: getPlayerSafeEnclaveName(enc.display_name),
            resilience: Math.round(enc.resilience ?? 0),
            maxResilience: 50, // ENCLAVE_CONFIG max
            siegeTurns: Math.round(enc.isolation_turns ?? 0),
            supplyState: (enc.supply_state as 'adequate' | 'strained' | 'critical') ?? 'adequate',
            faction: enc.faction ?? null,
        });
    }

    // Sort by resilience ascending (most vulnerable first)
    statuses.sort((a, b) => a.resilience - b.resilience);
    return statuses;
}

export function getMobilizationInfo(
    state: LoadedGameState,
    faction: string,
): MobilizationInfo | null {
    const mob = state.mobilizationSummary?.[faction];
    if (!mob) return null;

    return {
        exhaustionPct: mob.exhaustion_pct,
        activePoolCount: mob.top_pools.length,
        currentPoolTotal: mob.total_available,
    };
}

// ── Component ────────────────────────────────────────────────────────────

const SUPPLY_STATE_COLORS = {
    adequate: 'bg-emerald-500',
    strained: 'bg-amber-500',
    critical: 'bg-red-500',
} as const;

const SUPPLY_STATE_TEXT = {
    adequate: 'text-emerald-400',
    strained: 'text-amber-400',
    critical: 'text-red-400',
} as const;

interface SupplyIntelligenceProps {
    breakdown: SupplyBreakdown;
    enclaves: EnclaveStatus[];
    mobilization: MobilizationInfo | null;
    currentTurn: number;
}

export function SupplyIntelligence({ breakdown, enclaves, mobilization, currentTurn }: SupplyIntelligenceProps) {
    return (
        <div className="bg-panel-card border border-panel-border rounded p-4 mb-4">
            <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-3 pb-2 border-b border-panel-border">
                SUPPLY &amp; SUSTAINABILITY
            </div>

            {/* Supply breakdown */}
            <div className="mb-3">
                <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-[12px] text-text-primary font-bold">
                        GENERAL SUPPLY: {breakdown.currentGeneral}
                    </span>
                    <span className={`text-[11px] font-bold ${breakdown.estimatedNetPerTurn < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {breakdown.estimatedNetPerTurn >= 0 ? '▲' : '▼'} {breakdown.estimatedNetPerTurn}/turn
                    </span>
                    {breakdown.estimatedRunwayTurns != null && (
                        <span className="text-[10px] text-red-400/80">
                            Depletion ~{breakdown.estimatedRunwayTurns} turns ({turnToDateString(currentTurn + breakdown.estimatedRunwayTurns)})
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-text-secondary/70 flex flex-wrap gap-x-3 ml-1">
                    <span>maint −{breakdown.estimatedMaintenanceDrain}</span>
                    <span>patron +{breakdown.estimatedPatronAid}</span>
                    <span>heavy equip −{breakdown.estimatedHeavyDrain}</span>
                </div>
            </div>

            {/* Enclave bars */}
            {enclaves.length > 0 && (
                <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold mb-1.5">
                        ENCLAVES
                    </div>
                    <div className="space-y-1">
                        {enclaves.map(enc => {
                            const pct = Math.min(100, (enc.resilience / enc.maxResilience) * 100);
                            const barColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500';
                            return (
                                <div key={enc.id} className="flex items-center gap-2">
                                    <span className="text-[11px] text-text-primary w-24 truncate font-bold">{enc.displayName}</span>
                                    <div className="flex-1 h-[6px] bg-panel-bg rounded-sm overflow-hidden">
                                        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[10px] text-text-secondary tabular-nums w-8 text-right">{enc.resilience}</span>
                                    <span className="text-[10px] text-text-secondary/60">·</span>
                                    <span className="text-[10px] text-text-secondary/60 tabular-nums w-12">{enc.siegeTurns}t siege</span>
                                    <span className={`text-[9px] font-bold uppercase ${SUPPLY_STATE_TEXT[enc.supplyState]}`}>
                                        {enc.supplyState}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Mobilization */}
            {mobilization && (
                <div className="text-[11px] text-text-secondary flex flex-wrap gap-x-4">
                    <span>
                        <span className="text-text-primary font-bold tabular-nums">{mobilization.exhaustionPct.toFixed(1)}%</span>
                        {' '}pool exhausted
                    </span>
                    <span>
                        <span className="text-text-primary font-bold tabular-nums">{mobilization.activePoolCount}</span>
                        {' '}active municipality pools
                    </span>
                    <span>
                        Manpower pool: <span className="text-text-primary font-bold tabular-nums">{mobilization.currentPoolTotal.toLocaleString()}</span>
                    </span>
                </div>
            )}
        </div>
    );
}
