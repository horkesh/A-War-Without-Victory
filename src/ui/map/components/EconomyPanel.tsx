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
import { t } from '../i18n';
import { strictCompare } from '../../../state/validateGameState';

const FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

const FACILITY_TYPE_LABEL_KEYS = {
    ammunition: 'economy.facilityType.ammunition',
    heavy_equipment: 'economy.facilityType.heavyEquipment',
    small_arms: 'economy.facilityType.smallArms',
} as const;

interface EconomyPanelProps {
    state: LoadedGameState;
    onClose: () => void;
}

function getPlayerSafeFacilityTypeLabel(type: string | null | undefined): string {
    const key = (type ?? '').trim().toLowerCase();
    const labelKey = FACILITY_TYPE_LABEL_KEYS[key as keyof typeof FACILITY_TYPE_LABEL_KEYS];
    return labelKey ? t(labelKey) : t('economy.facilityType.unknown');
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

function ReserveGauge({ label, value, color }: { label: string; value: number | null | undefined; color: string }) {
    const reported = typeof value === 'number' && Number.isFinite(value);
    const pct = reported ? Math.max(0, Math.min(100, value)) : 0;
    const barColor =
        pct >= 50 ? 'bg-green-500' :
        pct >= 20 ? 'bg-yellow-400' :
        'bg-red-500';
    return (
        <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-[42px] shrink-0 text-xs ${color}`}>{label}</span>
            <div className="relative flex-1 h-1.5 bg-panel-border/40 rounded-full overflow-hidden">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
                    style={{ width: reported ? `${pct}%` : '0%' }}
                />
            </div>
            <span className={`shrink-0 text-right text-xs tabular-nums text-text-secondary ${reported ? 'w-6' : 'w-16 italic'}`}>
                {reported ? Math.round(pct) : t('corpsFront.unreported')}
            </span>
        </div>
    );
}

function reserveValueIsStrained(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value < 20;
}

export function EconomyPanel({ state, onClose }: EconomyPanelProps) {
    const reserves = state.factionReserves;
    const playerFaction = state.player_faction;
    const isPlayerFaction = playerFaction === 'RS' || playerFaction === 'RBiH' || playerFaction === 'HRHB';
    const reserveFactions = isPlayerFaction ? [playerFaction] : [...FACTIONS];
    const facilities = (state.productionFacilities ?? [])
        .filter((facility) => !isPlayerFaction || facility.controller === playerFaction)
        .sort((a, b) => strictCompare(a.id, b.id));
    const routes = (state.smugglingRoutes ?? [])
        .filter((route) => !isPlayerFaction || route.faction === playerFaction)
        .sort((a, b) => strictCompare(a.id, b.id));
    const embargoEntries = state.embargoStatus
        ? Object.entries(state.embargoStatus).filter(([faction]) => !isPlayerFaction || faction === playerFaction)
        : [];
    const strainedReserveCount = reserves
        ? reserveFactions.filter((faction) => {
            const reserve = reserves[faction];
            return reserveValueIsStrained(reserve?.generalSupply) || reserveValueIsStrained(reserve?.heavyMunitions);
        }).length
        : 0;
    const disruptedRouteCount = routes.filter((route) => route.disrupted).length;

    return (
        <GlassPanel position="right" title={t('economy.title')} onClose={onClose} width="340px">
            <section className="space-y-2 mb-4 rounded border border-panel-border bg-panel-card/60 p-2">
                <h3 className="text-xs uppercase tracking-wide text-accent-gold font-semibold">
                    {t('economy.summaryTitle')}
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                        <div className="text-text-secondary">{t('economy.summaryStrainedReserves')}</div>
                        <div className="font-mono text-amber-300">{strainedReserveCount}</div>
                    </div>
                    <div>
                        <div className="text-text-secondary">{t('economy.summaryFacilities')}</div>
                        <div className="font-mono text-text-primary">{facilities.length}</div>
                    </div>
                    <div>
                        <div className="text-text-secondary">{t('economy.summaryDisruptedRoutes')}</div>
                        <div className="font-mono text-red-400">{disruptedRouteCount}</div>
                    </div>
                </div>
            </section>
            {/* Supply Reserves */}
            <section className="space-y-2 mb-4">
                <h3 className="text-xs uppercase tracking-wide text-accent-gold font-semibold">
                    {t('economy.supplyReserves')}
                </h3>
                {reserves ? (
                    <div className="space-y-2">
                        {reserveFactions.map((faction) => {
                            const r = reserves[faction];
                            const color = FACTION_COLORS[faction] ?? 'text-text-primary';
                            return (
                                <div key={faction} className="space-y-0.5">
                                    <span className={`text-xs font-semibold ${color}`}>{getPlayerSafeMilitaryFactionName(faction)}</span>
                                    <ReserveGauge label={t('economy.supply')} value={r?.generalSupply} color="text-text-secondary" />
                                    <ReserveGauge label={t('economy.ammo')} value={r?.heavyMunitions} color="text-text-secondary" />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-text-secondary text-xs italic">{t('economy.reservesDisabled')}</div>
                )}
            </section>

            {/* Production Facilities */}
            <section className="space-y-2 mb-4">
                <h3 className="text-xs uppercase tracking-wide text-accent-gold font-semibold">
                    {t('economy.productionFacilities')}
                </h3>
                {facilities.length > 0 ? (
                    <div className="space-y-1.5">
                        {facilities.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 text-xs">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-text-primary truncate">{f.name}</span>
                                        {f.controller && (
                                            <span className={`text-xs ${FACTION_COLORS[f.controller] ?? 'text-text-secondary'}`}>
                                                [{getPlayerSafePoliticalFactionName(f.controller)}]
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-text-secondary w-[72px] shrink-0 truncate">{getPlayerSafeFacilityTypeLabel(f.type)}</span>
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
                    <div className="text-text-secondary text-xs italic">
                        {isPlayerFaction ? t('economy.noFriendlyFacilities') : t('economy.noFacilities')}
                    </div>
                )}
            </section>

            {/* Smuggling Routes */}
            <section className="space-y-2 mb-4">
                <h3 className="text-xs uppercase tracking-wide text-accent-gold font-semibold">
                    {t('economy.smugglingRoutes')}
                </h3>
                {routes.length > 0 ? (
                    <div className="space-y-1.5">
                        {routes.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 text-xs">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="text-text-primary truncate">{r.name}</span>
                                        <span className={`text-xs ${FACTION_COLORS[r.faction] ?? 'text-text-secondary'}`}>
                                            [{getPlayerSafeMilitaryFactionName(r.faction)}]
                                        </span>
                                        {r.disrupted && (
                                            <span className="text-red-400 text-xs uppercase tracking-wider">{t('economy.disrupted')}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-text-secondary w-[32px] shrink-0">{t('economy.cap')}</span>
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
                    <div className="text-text-secondary text-xs italic">
                        {isPlayerFaction ? t('economy.noFriendlyRoutes') : t('economy.noRoutes')}
                    </div>
                )}
            </section>

            {/* Embargo Status */}
            <section className="space-y-1">
                <h3 className="text-xs uppercase tracking-wide text-accent-gold font-semibold">
                    {t('economy.embargoStatus')}
                </h3>
                <div className="text-xs text-text-secondary space-y-0.5">
                    {embargoEntries.length > 0 ? (
                        embargoEntries.sort(([a], [b]) => strictCompare(a, b)).map(([faction, status]) => (
                            <div key={faction} className="flex items-center gap-1">
                                <span className={`w-[42px] ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>{getPlayerSafeMilitaryFactionName(faction)}</span>
                                <span className="tabular-nums">
                                    {t('economy.pipeline', { pct: Math.round(status.pipeline * 100) })}
                                </span>
                                <span className="tabular-nums ml-1">
                                    {t('economy.smuggling', { pct: Math.round(status.smuggling * 100) })}
                                </span>
                            </div>
                        ))
                    ) : (
                        <span className="italic">{isPlayerFaction ? t('economy.noFriendlyEmbargo') : t('economy.noEmbargo')}</span>
                    )}
                </div>
            </section>
        </GlassPanel>
    );
}

export default EconomyPanel;
