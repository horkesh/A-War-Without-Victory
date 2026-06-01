/**
 * Sectors section for expanded corps card.
 * Warroom dark palette.
 */
import { useMemo, useState } from 'react';
import type { CorpsFrontSectorView, FormationView } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { useGameStore } from '../../store/gameStore';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { OUTCOME_COLORS } from '../../utils/theme';
import { formatPersonnel } from '../../utils/formatters';
import { getPlayerSafeThreatPresentation } from '../../utils/playerSafeThreat';
import { CollapsibleSection } from './CollapsibleSection';
import { EmptyState } from '../EmptyState';
import { t, useLocale } from '../../i18n';
import { getLocalizedFormationName } from '../../data/formationNameLocalizations';

interface SectorsSectionProps {
    corpsId: string;
    sectors: CorpsFrontSectorView[];
    factionBattles: TurnBattle[];
}

function IntelBar({ value, label }: { value: number; label: string }) {
    const pct = Math.round(value * 100);
    const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <span className="text-text-secondary/60 w-14 shrink-0 text-[9px] uppercase tracking-wider">{label}</span>
            <div className="flex-1 h-1.5 bg-panel-border/30 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`tabular-nums w-8 text-right text-[10px] font-bold ${pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
        </div>
    );
}

const STRENGTH_CLASS_COLORS: Record<string, string> = {
    fortress: 'text-emerald-400',
    strong: 'text-emerald-400/80',
    adequate: 'text-accent-gold',
    thin: 'text-amber-500',
    critical: 'text-red-500',
};

function SectorExpandedDetail({ sector, sectorBattles, formationMap }: { sector: CorpsFrontSectorView; sectorBattles: TurnBattle[]; formationMap: Map<string, FormationView> }) {
    const [locale] = useLocale();
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const frontIds = sector.assigned_brigade_ids;
    const reserveIds = sector.reserve_brigade_ids;

    const threatRatio = sector.threat_ratio;
    const threatPresentation = getPlayerSafeThreatPresentation(threatRatio);
    const stanceHint = threatRatio > 1.5 ? 'fortify' : threatRatio > 1.0 ? 'defend' : null;
    const currentStance = sector.sector_stance ?? 'defend';

    return (
        <div className="px-4 py-3 space-y-4 text-[11px] border-t border-panel-border/50 bg-panel-card font-mono">
            <div className="space-y-2">
                <IntelBar value={sector.intel_confidence} label={t('sectorsSection.intel')} />
                {sector.offensive_signs && (
                    <div className="flex items-center gap-2 text-[10px] text-red-400 font-bold animate-pulse">
                        <span className="text-red-500">!</span> {t('sectorsSection.offensiveSignsDetected', { threat: threatPresentation.label })}
                    </div>
                )}
                {!sector.offensive_signs && threatRatio > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary/60">
                        {t('sectorsSection.threat')} <span className={`font-bold ${threatPresentation.toneClass}`}>{threatPresentation.summary.toUpperCase()}</span>
                    </div>
                )}
                {stanceHint !== null && stanceHint !== currentStance && (
                    <div className="text-[9px] text-amber-400/80 uppercase tracking-wider">
                        {t('sectorsSection.recommend', { stance: stanceHint.toUpperCase(), current: currentStance.toUpperCase() })}
                    </div>
                )}
            </div>

            {sector.combat_strength_class && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-text-secondary/60 uppercase tracking-wider border-t border-panel-border/30 pt-2">
                    <span>{t('sectorsSection.class')} <span className={`font-bold ${STRENGTH_CLASS_COLORS[sector.combat_strength_class] ?? 'text-text-secondary'}`}>{sector.combat_strength_class.toUpperCase()}</span></span>
                    {sector.combat_defense_per_edge != null && <span>{t('sectorsSection.defPerEdge')} <span className="font-bold text-text-secondary">{Math.round(sector.combat_defense_per_edge)}</span></span>}
                    {sector.combat_morale_avg != null && <span>{t('sectorsSection.morShort')} <span className={`font-bold ${sector.combat_morale_avg >= 60 ? 'text-emerald-400' : sector.combat_morale_avg >= 35 ? 'text-accent-gold' : 'text-red-500'}`}>{Math.round(sector.combat_morale_avg)}</span></span>}
                    {sector.combat_fatigue_avg != null && <span>{t('sectorsSection.fatShort')} <span className={`font-bold ${sector.combat_fatigue_avg <= 8 ? 'text-emerald-400' : sector.combat_fatigue_avg <= 16 ? 'text-accent-gold' : 'text-red-500'}`}>{Math.round(sector.combat_fatigue_avg)}</span></span>}
                    {sector.combat_personnel != null && <span>{t('sectorsSection.persShort')} <span className="font-bold text-text-secondary">{formatPersonnel(sector.combat_personnel)}</span></span>}
                </div>
            )}

            {frontIds.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest mb-1.5 border-b border-panel-border/30 pb-0.5">{t('sectorsSection.frontLineDeployment', { count: frontIds.length })}</div>
                    <div className="space-y-1.5">
                        {frontIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">{t('sectorsSection.unknownFormation', { id })}</div>;
                            const cohesion = Math.round(b.cohesion ?? 0);
                            const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                            return (
                                <div key={id}>
                                    <div className="flex items-center gap-3">
                                        <span className="truncate flex-1 min-w-0 text-text-secondary">{getLocalizedFormationName(b, locale)}</span>
                                        <span className="text-text-secondary tabular-nums w-12 text-right shrink-0">
                                            {formatPersonnel(b.personnel ?? 0)}
                                        </span>
                                        <span className={`tabular-nums w-10 text-right shrink-0 font-bold ${cohesion >= 70 ? 'text-emerald-400' : cohesion >= 40 ? 'text-accent-gold' : 'text-red-500'}`}>
                                            {cohesion}%
                                        </span>
                                        {isDisrupted && <span className="text-red-500 font-bold shrink-0 animate-pulse text-[9px]">{t('sectorsSection.disrupted')}</span>}
                                    </div>
                                    {b.location_osid && (
                                        <div className="text-[9px] text-text-secondary/40 ml-4 mt-0.5 truncate">
                                            @ {getOsidDisplayName(b.location_osid, osidDisplayNames)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {reserveIds.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest mb-1.5 border-b border-panel-border/30 pb-0.5">{t('sectorsSection.sectorReserves', { count: reserveIds.length })}</div>
                    <div className="space-y-1.5">
                        {reserveIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">{t('sectorsSection.unknownFormation', { id })}</div>;
                            return (
                                <div key={id} className="flex items-center gap-3 text-text-secondary">
                                    <span className="truncate flex-1 min-w-0 font-bold">{getLocalizedFormationName(b, locale)}</span>
                                    <span className="tabular-nums w-12 text-right shrink-0">
                                        {formatPersonnel(b.personnel ?? 0)}
                                    </span>
                                    {b.location_osid && (
                                        <span className="text-[9px] text-text-secondary/40 truncate max-w-[120px]">
                                            @ {getOsidDisplayName(b.location_osid, osidDisplayNames)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {sectorBattles.length > 0 && (
                <div className="border-t border-panel-border/50 pt-3">
                    <div className="text-[10px] font-bold uppercase text-red-500/60 tracking-widest mb-1.5 border-b border-red-500/5 pb-0.5">{t('sectorsSection.recentEngagements', { count: sectorBattles.length })}</div>
                    <div className="space-y-1">
                        {sectorBattles.map((battle, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none shrink-0"
                                    style={{ color: OUTCOME_COLORS[battle.outcome] ?? '#d4c5a0', borderColor: (OUTCOME_COLORS[battle.outcome] ?? '#d4c5a0') + '40' }}>
                                    {battle.outcome.replace(/_/g, ' ')}
                                </span>
                                <span className="text-text-secondary truncate flex-1">
                                    {getOsidDisplayName(battle.osid, osidDisplayNames)}
                                </span>
                                <span className="text-red-500 font-bold shrink-0">{t('sectorsSection.personnelLosses', { count: battle.attacker_casualties + battle.defender_casualties })}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="border-t border-panel-border/50 pt-3 flex flex-wrap gap-x-6 gap-y-2 text-text-secondary/60 text-[10px] uppercase tracking-wider">
                <span>{t('sectorsSection.frontage', { km: sector.length_edges })}</span>
                <span>{t('sectorsSection.bdePerKm', { value: sector.length_edges > 0 ? (frontIds.length / sector.length_edges).toFixed(2) : '-' })}</span>
                <span>{t('sectorsSection.troopDensity', { value: sector.density.toFixed(2) })}</span>
                {sector.sub_segments && <span>{t('sectorsSection.segments', { count: sector.sub_segments.length })}</span>}
            </div>
        </div>
    );
}

export function SectorsSection({ corpsId, sectors, factionBattles }: SectorsSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const formations = useGameStore((s) => s.loadedGameState?.formations ?? []);
    const formationMap = useMemo(() => {
        const m = new Map<string, FormationView>();
        for (const f of formations) m.set(f.id, f);
        return m;
    }, [formations]);

    const sectorOsidSets = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const sector of sectors) {
            const osids = new Set<string>();
            for (const sub of (sector.sub_segments ?? [])) {
                for (const osid of sub.friendly_osids) osids.add(osid);
            }
            map.set(sector.sector_id, osids);
        }
        return map;
    }, [sectors]);

    return (
        <CollapsibleSection sectionKey={`sec-${corpsId}`} title={t('sectorsSection.title')} count={sectors.length}>
            {sectors.length === 0 ? (
                <EmptyState
                    message={t('sectorsSection.empty')}
                    helpText={t('sectorsSection.emptyHelp')}
                    density="compact"
                />
            ) : (
                <div className="space-y-2">
                    {sectors.map((sector) => {
                        const sectorOsids = sectorOsidSets.get(sector.sector_id) ?? new Set<string>();
                        const battleCount = factionBattles.filter((b) => sectorOsids.has(b.osid)).length;
                        const hasBattle = battleCount > 0;
                        const isExpanded = expandedId === sector.sector_id;

                        return (
                            <div key={sector.sector_id} className="border border-panel-border/50 bg-panel-card rounded-md">
                                <div className={`flex items-center justify-between px-3 py-2.5 transition-colors ${isExpanded ? 'bg-panel-bg' : 'hover:bg-panel-bg'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : sector.sector_id)}
                                        className="min-w-0 text-left flex-1"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] text-text-secondary/60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                                                {'>'}
                                            </span>
                                            <span className="text-[12px] font-bold text-text-primary uppercase font-mono truncate"
                                                style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                                                {sector.display_name}
                                            </span>
                                            {hasBattle && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-sm bg-red-900/40 text-red-400 border border-red-500/30 animate-pulse">
                                                    {t('sectorsSection.contacts', { count: battleCount })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-text-secondary tabular-nums mt-1.5 ml-5 font-mono uppercase tracking-tight">
                                            {t('sectorsSection.summaryLine', {
                                                front: sector.assigned_brigade_ids.length,
                                                reserveSegment: sector.reserve_brigade_ids.length > 0 ? t('sectorsSection.reserveSegment', { count: sector.reserve_brigade_ids.length }) : '',
                                                km: sector.length_edges,
                                                density: sector.density.toFixed(2),
                                            })}
                                        </div>
                                    </button>
                                </div>
                                {isExpanded && <SectorExpandedDetail
                                    sector={sector}
                                    sectorBattles={factionBattles.filter((b) => sectorOsids.has(b.osid))}
                                    formationMap={formationMap}
                                />}
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
}
