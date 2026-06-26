/**
 * Sectors section for expanded corps card.
 * Warroom dark palette.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CorpsFrontSectorView, FormationView } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { useGameStore } from '../../store/gameStore';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { OUTCOME_COLORS } from '../../utils/theme';
import { formatPersonnel } from '../../utils/formatters';
import {
    getPlayerSafeSectorStanceLabel,
    getPlayerSafeSectorStrengthLabel,
} from '../../utils/playerSafeText';
import { getPlayerSafeThreatPresentation } from '../../utils/playerSafeThreat';
import { getPlayerFacingSectorName } from '../../../shared/playerFacingLabels';
import { inspectOnField } from '../../utils/shellNavigation';
import { CollapsibleSection } from './CollapsibleSection';
import { EmptyState } from '../EmptyState';
import { t, useLocale, type MessageKey } from '../../i18n';
import { getLocalizedFormationName } from '../../data/formationNameLocalizations';
import { buildSectorFormationAssignment, getSectorCoverageTier } from '../../utils/sectorUtils';

interface SectorsSectionProps {
    corpsId: string;
    sectors: CorpsFrontSectorView[];
    factionBattles: TurnBattle[];
    defaultOpen?: boolean;
}

type BattleCasualtyPayload = TurnBattle & {
    attacker_casualties?: number | null;
    defender_casualties?: number | null;
    casualties_reported?: boolean;
};

const SECTOR_BATTLE_OUTCOME_LABEL_KEYS: Record<string, MessageKey> = {
    decisive_victory: 'aar.outcome.decisive',
    victory: 'aar.outcome.victory',
    costly_victory: 'aar.outcome.costly',
    stalemate: 'aar.outcome.stalemate',
    repulsed: 'aar.outcome.repulsed',
    catastrophic: 'aar.outcome.collapse',
};

function sectorBattleOutcomeLabel(outcome: string): string {
    const key = SECTOR_BATTLE_OUTCOME_LABEL_KEYS[outcome];
    return key ? t(key) : t('aar.outcome.recorded');
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

function isReportedNumber(value: number | undefined | null): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function reportedPersonnelLabel(value: number | undefined | null): string {
    return isReportedNumber(value) ? formatPersonnel(value) : t('corpsFront.unreported');
}

function reportedBattleLossLabel(battle: TurnBattle): string {
    const casualtyPayload: BattleCasualtyPayload = battle;
    const attackerCasualties = isReportedNumber(casualtyPayload.attacker_casualties) ? casualtyPayload.attacker_casualties : null;
    const defenderCasualties = isReportedNumber(casualtyPayload.defender_casualties) ? casualtyPayload.defender_casualties : null;
    if (casualtyPayload.casualties_reported === false || attackerCasualties === null || defenderCasualties === null) {
        return t('aar.casualtiesUnreported');
    }
    return t('sectorsSection.personnelLosses', { count: attackerCasualties + defenderCasualties });
}

function reportedCohesionLabel(value: number | undefined | null): { label: string; className: string } {
    if (!isReportedNumber(value)) {
        return { label: t('corpsFront.unreported'), className: 'text-text-secondary/60 italic' };
    }
    const cohesion = Math.round(value);
    return {
        label: `${cohesion}%`,
        className: cohesion >= 70 ? 'text-emerald-400' : cohesion >= 40 ? 'text-accent-gold' : 'text-red-500',
    };
}

function partialAggregateLabel(value: number, formatter: (reported: number) => string = (reported) => String(Math.round(reported))): string {
    return t('corpsFront.partialEquipment', { value: formatter(value) });
}

const STRENGTH_CLASS_COLORS: Record<string, string> = {
    fortress: 'text-emerald-400',
    strong: 'text-emerald-400/80',
    adequate: 'text-accent-gold',
    thin: 'text-amber-500',
    critical: 'text-red-500',
};

const THREAT_INTEL_CONFIDENCE_MIN = 0.4;

const SECTOR_STANCES = ['fortify', 'defend', 'elastic', 'active_defense', 'screening'] as const;
type SectorStanceType = typeof SECTOR_STANCES[number];

function normalizeSectorStance(stance: string | null | undefined): SectorStanceType | null {
    return SECTOR_STANCES.includes(stance as SectorStanceType) ? stance as SectorStanceType : null;
}

function SectorExpandedDetail({
    sector,
    sectors,
    sectorBattles,
    formationMap,
}: {
    sector: CorpsFrontSectorView;
    sectors: CorpsFrontSectorView[];
    sectorBattles: TurnBattle[];
    formationMap: Map<string, FormationView>;
}) {
    const [locale] = useLocale();
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const sectorAssignment = buildSectorFormationAssignment(sector, [...formationMap.values()], sectors);
    const frontIds = sectorAssignment.frontlineIds;
    const reserveIds = sectorAssignment.reserveIds;
    const rearIds = sectorAssignment.rearIds;
    const overrideIds = sectorAssignment.overrideIds;
    const unresolvedRosterIds = sectorAssignment.unresolvedRosterIds;
    const frontFormations = frontIds
        .map((id) => formationMap.get(id))
        .filter((formation): formation is FormationView => Boolean(formation));
    const hasPartialLineReports = frontFormations.some((formation) => (
        !isReportedNumber(formation.personnel)
        || !isReportedNumber(formation.cohesion)
        || !isReportedNumber(formation.fatigue)
    ));
    const projectedLineCount = sectorAssignment.lineHoldingIds.length;
    const hasCurrentFieldedLine = projectedLineCount > 0;
    const projectedDensity = computeCurrentFrontDensity(sector, projectedLineCount);

    const threatRatio = sector.threat_ratio;
    const hasReportedThreat = isReportedNumber(threatRatio);
    const threatPresentation = hasReportedThreat ? getPlayerSafeThreatPresentation(threatRatio) : null;
    const stanceHint = !hasReportedThreat ? null : threatRatio > 1.5 ? 'fortify' : threatRatio > 1.0 ? 'defend' : null;
    const currentStance = normalizeSectorStance(sector.sector_stance);
    const hasThreatIntel = isReportedNumber(sector.intel_confidence) && sector.intel_confidence >= THREAT_INTEL_CONFIDENCE_MIN;

    return (
        <div className="px-4 py-3 space-y-4 text-[11px] border-t border-panel-border/50 bg-panel-card font-mono">
            <div className="space-y-2">
                {isReportedNumber(sector.intel_confidence)
                    ? <IntelBar value={sector.intel_confidence} label={t('sectorsSection.intel')} />
                    : <div className="text-[10px] text-text-secondary/60">{t('corpsFront.unreported')}</div>}
                {!hasThreatIntel && hasReportedThreat && threatRatio > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary/60">
                        {t('sectorsSection.threatUnconfirmed')}
                    </div>
                )}
                {hasThreatIntel && sector.offensive_signs && (
                    <div className="flex items-center gap-2 text-[10px] text-red-400 font-bold animate-pulse">
                        <span className="text-red-500">!</span> {t('sectorsSection.offensiveSignsDetected', { threat: threatPresentation?.label ?? t('corpsFront.unreported') })}
                    </div>
                )}
                {hasThreatIntel && !sector.offensive_signs && hasReportedThreat && threatRatio > 0 && threatPresentation && (
                    <div className="flex items-center gap-2 text-[10px] text-text-secondary/60">
                        {t('sectorsSection.threat')} <span className={`font-bold ${threatPresentation.toneClass}`}>{threatPresentation.summary.toUpperCase()}</span>
                    </div>
                )}
                {hasThreatIntel && stanceHint !== null && currentStance !== null && stanceHint !== currentStance && (
                    <div className="text-[9px] text-amber-400/80 uppercase tracking-wider">
                        {t('sectorsSection.recommend', {
                            stance: getPlayerSafeSectorStanceLabel(stanceHint),
                            current: getPlayerSafeSectorStanceLabel(currentStance),
                        })}
                    </div>
                )}
            </div>

            {hasCurrentFieldedLine && sector.combat_strength_class && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-text-secondary/60 uppercase tracking-wider border-t border-panel-border/30 pt-2">
                    <span>{t('sectorsSection.class')} <span className={`font-bold ${STRENGTH_CLASS_COLORS[sector.combat_strength_class] ?? 'text-text-secondary'}`}>{getPlayerSafeSectorStrengthLabel(sector.combat_strength_class)}</span></span>
                    {sector.combat_defense_per_edge != null && <span>{t('sectorsSection.defPerEdge')} <span className="font-bold text-text-secondary">{Math.round(sector.combat_defense_per_edge)}</span></span>}
                    {sector.combat_morale_avg != null && (
                        <span>{t('sectorsSection.morShort')} <span className={`font-bold ${hasPartialLineReports ? 'text-amber-400' : sector.combat_morale_avg >= 60 ? 'text-emerald-400' : sector.combat_morale_avg >= 35 ? 'text-accent-gold' : 'text-red-500'}`}>{hasPartialLineReports ? partialAggregateLabel(sector.combat_morale_avg) : Math.round(sector.combat_morale_avg)}</span></span>
                    )}
                    {sector.combat_fatigue_avg != null && (
                        <span>{t('sectorsSection.fatShort')} <span className={`font-bold ${hasPartialLineReports ? 'text-amber-400' : sector.combat_fatigue_avg <= 8 ? 'text-emerald-400' : sector.combat_fatigue_avg <= 16 ? 'text-accent-gold' : 'text-red-500'}`}>{hasPartialLineReports ? partialAggregateLabel(sector.combat_fatigue_avg) : Math.round(sector.combat_fatigue_avg)}</span></span>
                    )}
                    {sector.combat_personnel != null && (
                        <span>{t('sectorsSection.persShort')} <span className={`font-bold ${hasPartialLineReports ? 'text-amber-400' : 'text-text-secondary'}`}>{hasPartialLineReports ? t('corpsFront.partialPersonnel', { personnel: formatPersonnel(sector.combat_personnel) }) : formatPersonnel(sector.combat_personnel)}</span></span>
                    )}
                </div>
            )}

            {frontIds.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest mb-1.5 border-b border-panel-border/30 pb-0.5">{t('sectorsSection.frontLineDeployment', { count: frontIds.length })}</div>
                    <div className="space-y-1.5">
                        {frontIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">{t('sectorsSection.unknownFormation')}</div>;
                            const cohesion = reportedCohesionLabel(b.cohesion);
                            const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                            return (
                                <div key={id}>
                                    <div className="flex items-center gap-3">
                                        <span className="truncate flex-1 min-w-0 text-text-secondary">{getLocalizedFormationName(b, locale)}</span>
                                        <span className="text-text-secondary tabular-nums w-12 text-right shrink-0">
                                            {reportedPersonnelLabel(b.personnel)}
                                        </span>
                                        <span className={`tabular-nums w-10 text-right shrink-0 font-bold ${cohesion.className}`}>
                                            {cohesion.label}
                                        </span>
                                        {isDisrupted && <span className="text-red-500 font-bold shrink-0 animate-pulse text-[9px]">{t('sectorsSection.disrupted')}</span>}
                                        <button
                                            type="button"
                                            data-testid="army-hq-sector-brigade-inspect"
                                            data-formation-id={b.id}
                                            data-sector-id={sector.sector_id}
                                            aria-label={t('sectorsSection.inspectFormationOnField', { formation: getLocalizedFormationName(b, locale) })}
                                            onClick={() => inspectOnField(useGameStore.getState(), {
                                                kind: 'field-formation-in-sector',
                                                formationId: b.id,
                                                sectorId: sector.sector_id,
                                                corpsId: sector.corps_id,
                                                osid: b.location_osid ?? null,
                                            })}
                                            className="shrink-0 rounded border border-panel-border/60 bg-black/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-400/75 transition-colors hover:border-amber-400/40 hover:text-amber-300"
                                        >
                                            {t('sectorsSection.inspect')}
                                        </button>
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
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">{t('sectorsSection.unknownFormation')}</div>;
                            return (
                                <div key={id} className="flex items-center gap-3 text-text-secondary">
                                    <span className="truncate flex-1 min-w-0 font-bold">{getLocalizedFormationName(b, locale)}</span>
                                    <span className="tabular-nums w-12 text-right shrink-0">
                                        {reportedPersonnelLabel(b.personnel)}
                                    </span>
                                    {b.location_osid && (
                                        <span className="text-[9px] text-text-secondary/40 truncate max-w-[120px]">
                                            @ {getOsidDisplayName(b.location_osid, osidDisplayNames)}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        data-testid="army-hq-sector-brigade-inspect"
                                        data-formation-id={b.id}
                                        data-sector-id={sector.sector_id}
                                        aria-label={t('sectorsSection.inspectFormationOnField', { formation: getLocalizedFormationName(b, locale) })}
                                        onClick={() => inspectOnField(useGameStore.getState(), {
                                            kind: 'field-formation-in-sector',
                                            formationId: b.id,
                                            sectorId: sector.sector_id,
                                            corpsId: sector.corps_id,
                                            osid: b.location_osid ?? null,
                                        })}
                                        className="shrink-0 rounded border border-panel-border/60 bg-black/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-400/75 transition-colors hover:border-amber-400/40 hover:text-amber-300"
                                    >
                                        {t('sectorsSection.inspect')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {rearIds.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest mb-1.5 border-b border-panel-border/30 pb-0.5">{t('corpsFront.rearSupportElements', { count: rearIds.length })}</div>
                    <div className="space-y-1.5">
                        {rearIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">{t('sectorsSection.unknownFormation')}</div>;
                            return (
                                <div key={id} className="flex items-center gap-3 text-text-secondary">
                                    <span className="truncate flex-1 min-w-0 font-bold">{getLocalizedFormationName(b, locale)}</span>
                                    <span className="tabular-nums w-12 text-right shrink-0">
                                        {reportedPersonnelLabel(b.personnel)}
                                    </span>
                                    {b.location_osid && (
                                        <span className="text-[9px] text-text-secondary/40 truncate max-w-[120px]">
                                            @ {getOsidDisplayName(b.location_osid, osidDisplayNames)}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        data-testid="army-hq-sector-brigade-inspect"
                                        data-formation-id={b.id}
                                        data-sector-id={sector.sector_id}
                                        aria-label={t('sectorsSection.inspectFormationOnField', { formation: getLocalizedFormationName(b, locale) })}
                                        onClick={() => inspectOnField(useGameStore.getState(), {
                                            kind: 'field-formation-in-sector',
                                            formationId: b.id,
                                            sectorId: sector.sector_id,
                                            corpsId: sector.corps_id,
                                            osid: b.location_osid ?? null,
                                        })}
                                        className="shrink-0 rounded border border-panel-border/60 bg-black/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-400/75 transition-colors hover:border-amber-400/40 hover:text-amber-300"
                                    >
                                        {t('sectorsSection.inspect')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {overrideIds.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase text-accent-gold tracking-widest mb-1.5 border-b border-panel-border/30 pb-0.5">{t('sectorsSection.commandDirected', { count: overrideIds.length })}</div>
                    <div className="space-y-1.5">
                        {overrideIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">{t('sectorsSection.unknownFormation')}</div>;
                            return (
                                <div key={id} className="flex items-center gap-3 text-text-secondary">
                                    <span className="truncate flex-1 min-w-0 font-bold">{getLocalizedFormationName(b, locale)}</span>
                                    <span className="tabular-nums w-12 text-right shrink-0">
                                        {reportedPersonnelLabel(b.personnel)}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-wide text-accent-gold shrink-0">{t('sectorsSection.overrideBadge')}</span>
                                    <button
                                        type="button"
                                        data-testid="army-hq-sector-brigade-inspect"
                                        data-formation-id={b.id}
                                        data-sector-id={sector.sector_id}
                                        aria-label={t('sectorsSection.inspectFormationOnField', { formation: getLocalizedFormationName(b, locale) })}
                                        onClick={() => inspectOnField(useGameStore.getState(), {
                                            kind: 'field-formation-in-sector',
                                            formationId: b.id,
                                            sectorId: sector.sector_id,
                                            corpsId: sector.corps_id,
                                            osid: b.location_osid ?? null,
                                        })}
                                        className="shrink-0 rounded border border-panel-border/60 bg-black/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-400/75 transition-colors hover:border-amber-400/40 hover:text-amber-300"
                                    >
                                        {t('sectorsSection.inspect')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {unresolvedRosterIds.length > 0 && (
                <div
                    data-testid="army-hq-sector-stale-roster"
                    data-stale-roster-count={unresolvedRosterIds.length}
                    data-stale-roster-ids={unresolvedRosterIds.join(' ')}
                >
                    <div className="text-[10px] font-bold uppercase text-red-400 tracking-widest mb-1.5 border-b border-red-500/20 pb-0.5">
                        {t(unresolvedRosterIds.length === 1 ? 'corpsFront.staleRosterEntries.one' : 'corpsFront.staleRosterEntries.many', { count: unresolvedRosterIds.length })}
                    </div>
                    <div className="text-[10px] text-text-secondary/70">
                        {t('corpsFront.staleRosterHelp')}
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
                                    {sectorBattleOutcomeLabel(battle.outcome)}
                                </span>
                                <span className="text-text-secondary truncate flex-1">
                                    {getOsidDisplayName(battle.osid, osidDisplayNames)}
                                </span>
                                <span className="text-red-500 font-bold shrink-0">{reportedBattleLossLabel(battle)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="border-t border-panel-border/50 pt-3 flex flex-wrap gap-x-6 gap-y-2 text-text-secondary/60 text-[10px] uppercase tracking-wider">
                <span data-testid="army-hq-sector-frontage" data-front-segments={sector.length_edges}>{t('sectorsSection.frontage', { count: sector.length_edges })}</span>
                {hasCurrentFieldedLine && (
                    <>
                        <span>{t('sectorsSection.bdePerFrontSegment', { value: projectedDensity })}</span>
                    </>
                )}
                {sector.sub_segments && <span>{t('sectorsSection.segments', { count: sector.sub_segments.length })}</span>}
            </div>
        </div>
    );
}

function computeCurrentFrontDensity(sector: CorpsFrontSectorView, frontlineCount: number): string {
    return sector.length_edges > 0 ? (frontlineCount / sector.length_edges).toFixed(2) : '0.00';
}

function sectorSummaryLine(
    lineHoldingCount: number,
    reserveCount: number,
    frontSegmentCount: number,
    projectedDensity: string,
): string {
    const lineSegment = lineHoldingCount > 0
        ? t('sectorsSection.lineSegment', { count: lineHoldingCount })
        : t('sectorsSection.noFriendlyLine');
    const frontSegment = t(
        frontSegmentCount === 1 ? 'sectorsSection.frontSegment.one' : 'sectorsSection.frontSegment.many',
        { count: frontSegmentCount },
    );
    const densitySegment = lineHoldingCount > 0
        ? t('sectorsSection.densitySegment', { density: projectedDensity })
        : '';
    const reserveSegment = reserveCount > 0 ? `; ${t('sectorsSection.reserveSegment', { count: reserveCount })}` : '';
    return `${lineSegment}${reserveSegment}; ${frontSegment}${densitySegment}`;
}

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function isUnsafeRawLabel(value: string | null | undefined): boolean {
    if (!value) return false;
    return /(?:[a-z]{2,}_[a-z0-9_]+|[:|])/.test(value);
}

function safeSectorLabel(sectorId: string, sectors: CorpsFrontSectorView[]): string {
    const label = getPlayerFacingSectorName(sectorId, sectors, t('sectorsSection.assignedSector'));
    return isUnsafeRawLabel(label) ? t('sectorsSection.assignedSector') : label;
}

function pickSectorInspectAnchorOsid(sector: CorpsFrontSectorView): string | null {
    const seen = new Set<string>();
    for (const segment of sector.sub_segments ?? []) {
        for (const osid of segment.friendly_osids ?? []) {
            if (seen.has(osid)) continue;
            seen.add(osid);
            return osid;
        }
    }
    return null;
}

function pickDefaultSectorId(sectors: CorpsFrontSectorView[], factionBattles: TurnBattle[], sectorOsidSets: Map<string, Set<string>>): string | null {
    if (sectors.length === 0) return null;
    const battleCounts = new Map<string, number>();
    for (const sector of sectors) {
        const sectorOsids = sectorOsidSets.get(sector.sector_id) ?? new Set<string>();
        battleCounts.set(sector.sector_id, factionBattles.filter((battle) => sectorOsids.has(battle.osid)).length);
    }
    return [...sectors].sort((a, b) => {
        if (Number(a.offensive_signs) !== Number(b.offensive_signs)) return Number(b.offensive_signs) - Number(a.offensive_signs);
        const aBattles = battleCounts.get(a.sector_id) ?? 0;
        const bBattles = battleCounts.get(b.sector_id) ?? 0;
        if (aBattles !== bBattles) return bBattles - aBattles;
        const aThreat = isReportedNumber(a.threat_ratio) ? a.threat_ratio : -Infinity;
        const bThreat = isReportedNumber(b.threat_ratio) ? b.threat_ratio : -Infinity;
        if (aThreat !== bThreat) return bThreat - aThreat;
        const aDensity = isReportedNumber(a.density) ? a.density : Infinity;
        const bDensity = isReportedNumber(b.density) ? b.density : Infinity;
        if (aDensity !== bDensity) return aDensity - bDensity;
        return compareText(a.sector_id, b.sector_id);
    })[0]?.sector_id ?? null;
}

export function SectorsSection({ corpsId, sectors, factionBattles, defaultOpen = false }: SectorsSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null | undefined>(undefined);
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
    const defaultExpandedId = useMemo(
        () => pickDefaultSectorId(sectors, factionBattles, sectorOsidSets),
        [factionBattles, sectors, sectorOsidSets],
    );
    const effectiveExpandedId = expandedId === undefined ? defaultExpandedId : expandedId;

    useEffect(() => {
        if (expandedId == null) return;
        if (!sectors.some((sector) => sector.sector_id === expandedId)) setExpandedId(undefined);
    }, [expandedId, sectors]);

    return (
        <CollapsibleSection sectionKey={`sec-${corpsId}`} title={t('sectorsSection.title')} count={sectors.length} defaultOpen={defaultOpen}>
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
                        const isExpanded = effectiveExpandedId === sector.sector_id;
                        const sectorLabel = safeSectorLabel(sector.sector_id, sectors);
                        const sectorAssignment = buildSectorFormationAssignment(sector, formations, sectors);
                        const coverageTier = getSectorCoverageTier(sector.density, sectorAssignment);
                        const projectedDensity = computeCurrentFrontDensity(
                            sector,
                            sectorAssignment.lineHoldingIds.length,
                        );
                        const detailId = `army-hq-sector-detail-${sector.sector_id}`;
                        const toggleLabel = isExpanded
                            ? t('sectorsSection.collapseSectorAria', { sector: sectorLabel })
                            : t('sectorsSection.expandSectorAria', { sector: sectorLabel });

                        return (
                            <div
                                key={sector.sector_id}
                                data-testid="army-hq-sector-row"
                                data-sector-id={sector.sector_id}
                                data-coverage-tier={coverageTier}
                                data-current-brigade-count={sectorAssignment.allCurrentIds.length}
                                data-frontline-brigade-count={sectorAssignment.frontlineIds.length}
                                data-reserve-brigade-count={sectorAssignment.reserveIds.length}
                                data-rear-brigade-count={sectorAssignment.rearIds.length}
                                data-command-directed-brigade-count={sectorAssignment.overrideIds.length}
                                data-stale-roster-count={sectorAssignment.unresolvedRosterIds.length}
                                className="border border-panel-border/50 bg-panel-card rounded-md"
                            >
                                <div className={`flex items-center justify-between px-3 py-2.5 transition-colors ${isExpanded ? 'bg-panel-bg' : 'hover:bg-panel-bg'}`}>
                                    <button
                                        type="button"
                                        data-testid="army-hq-sector-toggle"
                                        aria-expanded={isExpanded}
                                        aria-controls={detailId}
                                        aria-label={toggleLabel}
                                        title={toggleLabel}
                                        onClick={() => setExpandedId(isExpanded ? null : sector.sector_id)}
                                        className="min-w-0 text-left flex-1"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                aria-hidden="true"
                                                className={`block h-0 w-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-text-secondary/60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                                            />
                                            <span className="text-[12px] font-bold text-text-primary uppercase font-mono truncate"
                                                style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                                                {sectorLabel}
                                            </span>
                                            {hasBattle && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-sm bg-red-900/40 text-red-400 border border-red-500/30 animate-pulse">
                                                    {t('sectorsSection.contacts', { count: battleCount })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-text-secondary tabular-nums mt-1.5 ml-5 font-mono uppercase tracking-tight">
                                            {sectorSummaryLine(
                                                sectorAssignment.lineHoldingIds.length,
                                                sectorAssignment.reserveIds.length,
                                                sector.length_edges,
                                                projectedDensity,
                                            )}
                                            {sectorAssignment.rearIds.length > 0 && `; ${t('sectorsSection.rearSupportSegment', { count: sectorAssignment.rearIds.length })}`}
                                            {sectorAssignment.overrideIds.length > 0 && `; ${t('sectorsSection.overrideSegment', { count: sectorAssignment.overrideIds.length })}`}
                                            {sectorAssignment.unresolvedRosterIds.length > 0 && `; ${t(sectorAssignment.unresolvedRosterIds.length === 1 ? 'corpsFront.staleRosterEntries.one' : 'corpsFront.staleRosterEntries.many', { count: sectorAssignment.unresolvedRosterIds.length })}`}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        data-testid="army-hq-sector-inspect"
                                        data-sector-id={sector.sector_id}
                                        data-corps-id={corpsId}
                                        aria-label={t('sectorsSection.inspectOnField', { sector: sectorLabel })}
                                        onClick={() => {
                                            inspectOnField(useGameStore.getState(), {
                                                kind: 'field-sector-in-corps',
                                                sectorId: sector.sector_id,
                                                corpsId,
                                                osid: pickSectorInspectAnchorOsid(sector),
                                            });
                                        }}
                                        className="ml-3 shrink-0 rounded border border-panel-border/70 bg-black/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-400/80 transition-colors hover:border-amber-400/40 hover:text-amber-300"
                                    >
                                        {t('sectorsSection.inspect')}
                                    </button>
                                </div>
                                {isExpanded && (
                                    <div id={detailId} data-testid="army-hq-sector-detail">
                                        <SectorExpandedDetail
                                            sector={sector}
                                            sectors={sectors}
                                            sectorBattles={factionBattles.filter((b) => sectorOsids.has(b.osid))}
                                            formationMap={formationMap}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
}
