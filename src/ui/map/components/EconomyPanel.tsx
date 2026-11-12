/**
 * EconomyPanel — v0.4.3 Economy & War Production ("War Footing").
 *
 * Shows:
 * - Supply reserve gauges (general + heavy per faction)
 * - Production facility cards (name, location, condition bar)
 * - Smuggling routes (capacity bar, active/disrupted status)
 * - Embargo status
 *
 * Surface redesign, step 4 (2026-11-12): one surface in the Command Surface style
 * (was a translucent right-side panel): header, the readout as figure tiles, then the four
 * sections in a two-column grid. Presentation only; filtering and ordering unchanged.
 */
import { FACTION_COLORS } from '../utils/theme';
import type { LoadedGameState } from '../data/types';
import {
    getPlayerSafeMilitaryFactionName,
    getPlayerSafePoliticalFactionName,
} from '../utils/playerSafeText';
import { t } from '../i18n';
import { strictCompare } from '../../../state/validateGameState';
import {
    SURFACE_CHIP,
    SURFACE_TONE,
    SurfaceCloseButton,
    SurfaceColumns,
    SurfaceContent,
    SurfaceFigure,
    SurfaceFrame,
    SurfaceHeader,
    SurfacePanel,
    SurfaceSection,
    SurfaceSections,
} from './surface/Surface';
import { useSurfaceEscape } from './surface/useSurfaceEscape';
import { surfaceFactionName } from './surface/surfaceFactionName';
import { SurfaceModalLayer } from './surface/SurfaceModalLayer';

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
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#262b35]">
            <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function ReserveGauge({ label, value }: { label: string; value: number | null | undefined }) {
    const reported = typeof value === 'number' && Number.isFinite(value);
    const pct = reported ? Math.max(0, Math.min(100, value)) : 0;
    const barColor =
        pct >= 50 ? 'bg-green-500' :
        pct >= 20 ? 'bg-yellow-400' :
        'bg-red-500';
    return (
        <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3">
            <span className="text-[16px] text-[#b9ad94]">{label}</span>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-[#262b35]">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
                    style={{ width: reported ? `${pct}%` : '0%' }}
                />
            </div>
            <span className={`text-right font-mono text-[16px] tabular-nums ${reported ? 'min-w-[2.5rem] font-semibold text-[#f1e6c8]' : 'italic text-[#b9ad94]'}`}>
                {reported ? Math.round(pct) : t('corpsFront.unreported')}
            </span>
        </div>
    );
}

function reserveValueIsStrained(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value < 20;
}

function EmptyLine({ children }: { children: string }) {
    return <p className="m-0 text-[16px] italic text-[#b9ad94]">{children}</p>;
}

export function EconomyPanel({ state, onClose }: EconomyPanelProps) {
    useSurfaceEscape(true, onClose);
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
        <SurfaceModalLayer>
        <SurfaceFrame
            layerClassName=""
            data-testid="economy-panel"
            aria-modal="true"
            aria-labelledby="economy-panel-title"
        >
            <SurfaceHeader
                eyebrow={surfaceFactionName(playerFaction)}
                title={<span id="economy-panel-title">{t('economy.title')}</span>}
                close={<SurfaceCloseButton onClick={onClose} />}
            />
            <SurfaceColumns layout="single">
                <SurfaceContent>
                    <SurfaceSections className="max-w-[96rem]">
                        <SurfaceSection label={t('economy.summaryTitle')}>
                            <div className="grid grid-cols-3 gap-3">
                                <SurfaceFigure label={t('economy.summaryStrainedReserves')} value={strainedReserveCount} tone="font-mono text-amber-200" />
                                <SurfaceFigure label={t('economy.summaryFacilities')} value={facilities.length} tone="font-mono text-[#f1e6c8]" />
                                <SurfaceFigure label={t('economy.summaryDisruptedRoutes')} value={disruptedRouteCount} tone="font-mono text-red-200" />
                            </div>
                        </SurfaceSection>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-7">
                            <SurfaceSection label={t('economy.supplyReserves')}>
                                {reserves ? (
                                    <div className="flex flex-col gap-3">
                                        {reserveFactions.map((faction) => {
                                            const r = reserves[faction];
                                            const color = FACTION_COLORS[faction] ?? 'text-text-primary';
                                            return (
                                                <SurfacePanel key={faction} className="flex flex-col gap-2.5">
                                                    <span className={`text-[17px] font-semibold ${color}`}>{getPlayerSafeMilitaryFactionName(faction)}</span>
                                                    <ReserveGauge label={t('economy.supply')} value={r?.generalSupply} />
                                                    <ReserveGauge label={t('economy.ammo')} value={r?.heavyMunitions} />
                                                </SurfacePanel>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <EmptyLine>{t('economy.reservesDisabled')}</EmptyLine>
                                )}
                            </SurfaceSection>

                            <SurfaceSection label={t('economy.productionFacilities')}>
                                {facilities.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {facilities.map((f) => (
                                            <SurfacePanel key={f.id} className="flex flex-col gap-2">
                                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                                    <span className="text-[17px] font-semibold text-[#f1e6c8]">{f.name}</span>
                                                    {f.controller && (
                                                        <span className={`text-[15px] ${FACTION_COLORS[f.controller] ?? 'text-[#b9ad94]'}`}>
                                                            {getPlayerSafePoliticalFactionName(f.controller)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-[9rem_minmax(0,1fr)_auto] items-center gap-3">
                                                    <span className="truncate text-[15px] text-[#b9ad94]">{getPlayerSafeFacilityTypeLabel(f.type)}</span>
                                                    <ConditionBar value={f.condition} />
                                                    <span className="min-w-[3rem] text-right font-mono text-[15px] tabular-nums text-[#f1e6c8]">
                                                        {Math.round(f.condition * 100)}%
                                                    </span>
                                                </div>
                                            </SurfacePanel>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyLine>{isPlayerFaction ? t('economy.noFriendlyFacilities') : t('economy.noFacilities')}</EmptyLine>
                                )}
                            </SurfaceSection>

                            <SurfaceSection label={t('economy.smugglingRoutes')}>
                                {routes.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {routes.map((r) => (
                                            <SurfacePanel key={r.id} className="flex flex-col gap-2">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="text-[17px] font-semibold text-[#f1e6c8]">{r.name}</span>
                                                    <span className={`text-[15px] ${FACTION_COLORS[r.faction] ?? 'text-[#b9ad94]'}`}>
                                                        {getPlayerSafeMilitaryFactionName(r.faction)}
                                                    </span>
                                                    <span className="flex-grow" />
                                                    {r.disrupted && (
                                                        <span className={`${SURFACE_CHIP} ${SURFACE_TONE.danger}`}>{t('economy.disrupted')}</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3">
                                                    <span className="text-[15px] text-[#b9ad94]">{t('economy.cap')}</span>
                                                    <ConditionBar value={r.capacity} max={100} />
                                                    <span className="min-w-[2.5rem] text-right font-mono text-[15px] tabular-nums text-[#f1e6c8]">
                                                        {Math.round(r.capacity)}
                                                    </span>
                                                </div>
                                            </SurfacePanel>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyLine>{isPlayerFaction ? t('economy.noFriendlyRoutes') : t('economy.noRoutes')}</EmptyLine>
                                )}
                            </SurfaceSection>

                            <SurfaceSection label={t('economy.embargoStatus')}>
                                {embargoEntries.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {embargoEntries.sort(([a], [b]) => strictCompare(a, b)).map(([faction, status]) => (
                                            <SurfacePanel key={faction} className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                                                <span className={`text-[17px] font-semibold ${FACTION_COLORS[faction] ?? 'text-[#f1e6c8]'}`}>{getPlayerSafeMilitaryFactionName(faction)}</span>
                                                <span className="font-mono text-[16px] tabular-nums text-[#ddd1b3]">
                                                    {t('economy.pipeline', { pct: Math.round(status.pipeline * 100) })}
                                                </span>
                                                <span className="font-mono text-[16px] tabular-nums text-[#ddd1b3]">
                                                    {t('economy.smuggling', { pct: Math.round(status.smuggling * 100) })}
                                                </span>
                                            </SurfacePanel>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyLine>{isPlayerFaction ? t('economy.noFriendlyEmbargo') : t('economy.noEmbargo')}</EmptyLine>
                                )}
                            </SurfaceSection>
                        </div>
                    </SurfaceSections>
                </SurfaceContent>
            </SurfaceColumns>
        </SurfaceFrame>
        </SurfaceModalLayer>
    );
}

export default EconomyPanel;
