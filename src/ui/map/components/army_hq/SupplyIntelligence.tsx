/**
 * SupplyIntelligence — enclave resilience bars and mobilization summary for
 * Army HQ Nerve Center. Enclave data comes directly from enclaveResilience on
 * LoadedGameState.
 *
 * The reserve breakdown (general supply, maintenance drain, patron aid, depletion
 * runway) was retired 2026-11-17 with the supply-reserve economy (Fable consult 6).
 */
import type { LoadedGameState } from '../../data/types';
import { getPlayerSafeEnclaveName } from '../../utils/playerSafeText';

// ── Types ────────────────────────────────────────────────────────────────

export interface EnclaveStatus {
    id: string;
    displayName: string;
    resilience: number;
    maxResilience: number;
    siegeTurns: number;
    supplyState: 'adequate' | 'strained' | 'critical' | 'unreported';
    faction: string | null;
}

export interface MobilizationInfo {
    exhaustionPct: number;
    activePoolCount: number;
    currentPoolTotal: number;
}

// ── Pure computation ─────────────────────────────────────────────────────

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
            supplyState: enc.supply_state ?? 'unreported',
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

const SUPPLY_STATE_TEXT = {
    adequate: 'text-emerald-400',
    strained: 'text-amber-400',
    critical: 'text-red-400',
    unreported: 'text-text-secondary',
} as const;

const SUPPLY_STATE_LABEL = {
    adequate: 'adequate',
    strained: 'strained',
    critical: 'critical',
    unreported: 'unreported',
} as const;

interface SupplyIntelligenceProps {
    enclaves: EnclaveStatus[];
    mobilization: MobilizationInfo | null;
}

export function SupplyIntelligence({ enclaves, mobilization }: SupplyIntelligenceProps) {
    return (
        <div className="bg-panel-card border border-panel-border rounded p-4 mb-4">
            <div className="text-[13px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-3 pb-2 border-b border-panel-border">
                SUPPLY &amp; SUSTAINABILITY
            </div>

            {/* Enclave bars */}
            {enclaves.length > 0 && (
                <div className="mb-3">
                    <div className="text-[13px] uppercase tracking-[0.2em] text-text-secondary font-bold mb-1.5">
                        ENCLAVES
                    </div>
                    <div className="space-y-1">
                        {enclaves.map(enc => {
                            const pct = Math.min(100, (enc.resilience / enc.maxResilience) * 100);
                            const barColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500';
                            return (
                                <div key={enc.id} className="flex items-center gap-2">
                                    <span className="text-[13px] text-text-primary w-24 truncate font-bold">{enc.displayName}</span>
                                    <div className="flex-1 h-[6px] bg-panel-bg rounded-sm overflow-hidden">
                                        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[13px] text-text-secondary tabular-nums w-8 text-right">{enc.resilience}</span>
                                    <span className="text-[13px] text-text-secondary/60">·</span>
                                    <span className="text-[13px] text-text-secondary/60 tabular-nums w-12">{enc.siegeTurns}t siege</span>
                                    <span className={`text-[13px] font-bold uppercase ${SUPPLY_STATE_TEXT[enc.supplyState]}`}>
                                        {SUPPLY_STATE_LABEL[enc.supplyState]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Mobilization */}
            {mobilization && (
                <div className="text-[13px] text-text-secondary flex flex-wrap gap-x-4">
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
