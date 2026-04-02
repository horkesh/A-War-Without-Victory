/**
 * EconomyPanel — v0.4.3 Economy & War Production
 *
 * Right-side GlassPanel showing:
 * - Supply reserve gauges (general + heavy per faction)
 * - Production facility cards (name, location, condition bar)
 * - Smuggling routes (capacity bar, active/disrupted status)
 * - Embargo status
 */
import { GlassPanel } from './GlassPanel';
import { FACTION_COLORS } from '../utils/theme';
import type { LoadedGameState } from '../data/types';
import {
    getPlayerSafeMilitaryFactionName,
    getPlayerSafePoliticalFactionName,
} from '../utils/playerSafeText';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

interface EconomyPanelProps {
    state: LoadedGameState;
    onClose: () => void;
}

function ConditionBar({ value, max = 1 }: { value: number; max?: number }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const color =
        pct >= 70 ? 'bg-green-500' :
        pct >= 40 ? 'bg-yellow-400' :
        'bg-red-500';
    return (
        <div className="relative flex-1 h-1.5 bg-panel-border/40 rounded-full overflow-hidden">
            <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function ReserveGauge({ label, value, color }: { label: string; value: number; color: string }) {
    const pct = Math.max(0, Math.min(100, value));
    const barColor =
        pct >= 50 ? 'bg-green-500' :
        pct >= 20 ? 'bg-yellow-400' :
        'bg-red-500';
    return (
        <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-[42px] shrink-0 text-[10px] ${color}`}>{label}</span>
            <div className="relative flex-1 h-1.5 bg-panel-border/40 rounded-full overflow-hidden">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-text-secondary">{Math.round(pct)}</span>
        </div>
    );
}

export function EconomyPanel({ state, onClose }: EconomyPanelProps) {
    const reserves = state.factionReserves;
    const facilities = state.productionFacilities ?? [];
    const routes = state.smugglingRoutes ?? [];

    return (
        <GlassPanel position="right" title="Economy" onClose={onClose} width="340px">
            {/* Supply Reserves */}
            <section className="space-y-2 mb-4">
                <h3 className="text-[10px] uppercase tracking-wide text-accent-gold font-semibold">
                    Supply Reserves
                </h3>
                {reserves ? (
                    <div className="space-y-2">
                        {FACTIONS.map((faction) => {
                            const r = reserves[faction];
                            const color = FACTION_COLORS[faction] ?? 'text-text-primary';
                            return (
                                <div key={faction} className="space-y-0.5">
                                    <span className={`text-[10px] font-semibold ${color}`}>{getPlayerSafeMilitaryFactionName(faction)}</span>
                                    <ReserveGauge label="Supply" value={r?.generalSupply ?? 0} color="text-text-secondary" />
                                    <ReserveGauge label="Ammo" value={r?.heavyMunitions ?? 0} color="text-text-secondary" />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-text-secondary text-[10px] italic">Reserves disabled</div>
                )}
            </section>

            {/* Production Facilities */}
            <section className="space-y-2 mb-4">
                <h3 className="text-[10px] uppercase tracking-wide text-accent-gold font-semibold">
                    Production Facilities
                </h3>
                {facilities.length > 0 ? (
                    <div className="space-y-1.5">
                        {facilities.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 text-[10px]">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-text-primary truncate">{f.name}</span>
                                        {f.controller && (
                                            <span className={`text-[8px] ${FACTION_COLORS[f.controller] ?? 'text-text-secondary'}`}>
                                                [{getPlayerSafePoliticalFactionName(f.controller)}]
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-text-secondary w-[32px] shrink-0">{f.type}</span>
                                        <ConditionBar value={f.condition} />
                                        <span className="text-text-secondary tabular-nums w-[28px] text-right">
                                            {Math.round(f.condition * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-text-secondary text-[10px] italic">No facilities data</div>
                )}
            </section>

            {/* Smuggling Routes */}
            <section className="space-y-2 mb-4">
                <h3 className="text-[10px] uppercase tracking-wide text-accent-gold font-semibold">
                    Smuggling Routes
                </h3>
                {routes.length > 0 ? (
                    <div className="space-y-1.5">
                        {routes.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 text-[10px]">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-text-primary truncate">{r.name}</span>
                                        <span className={`text-[8px] ${FACTION_COLORS[r.faction] ?? 'text-text-secondary'}`}>
                                            [{getPlayerSafeMilitaryFactionName(r.faction)}]
                                        </span>
                                        {r.disrupted && (
                                            <span className="text-red-400 text-[8px] uppercase tracking-wider">disrupted</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-text-secondary w-[32px] shrink-0">Cap</span>
                                        <ConditionBar value={r.capacity} max={100} />
                                        <span className="text-text-secondary tabular-nums w-[28px] text-right">
                                            {Math.round(r.capacity)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-text-secondary text-[10px] italic">No route data</div>
                )}
            </section>

            {/* Embargo Status */}
            <section className="space-y-1">
                <h3 className="text-[10px] uppercase tracking-wide text-accent-gold font-semibold">
                    Embargo Status
                </h3>
                <div className="text-[10px] text-text-secondary space-y-0.5">
                    {state.embargoStatus ? (
                        Object.entries(state.embargoStatus).sort(([a], [b]) => a.localeCompare(b)).map(([faction, status]) => (
                            <div key={faction} className="flex items-center gap-1">
                                <span className={`w-[42px] ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>{getPlayerSafeMilitaryFactionName(faction)}</span>
                                <span className="tabular-nums">
                                    pipeline: {Math.round(status.pipeline * 100)}%
                                </span>
                                <span className="tabular-nums ml-1">
                                    smuggling: {Math.round(status.smuggling * 100)}%
                                </span>
                            </div>
                        ))
                    ) : (
                        <span className="italic">No embargo data</span>
                    )}
                </div>
            </section>
        </GlassPanel>
    );
}

export default EconomyPanel;
