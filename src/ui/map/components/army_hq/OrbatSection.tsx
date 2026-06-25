/**
 * ORBAT section for expanded corps card.
 * Warroom dark palette.
 */
import { useMemo, useState } from 'react';
import type { CorpsFrontSectorView, FormationView } from '../../data/types';
import { useGameStore } from '../../store/gameStore';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { getCohesionColor, OUTCOME_COLORS } from '../../utils/theme';
import { formatPersonnel, turnToDateString } from '../../utils/formatters';
import { getPlayerSafeFormationNarrativeArcLabel, getPlayerSafeFormationPostureLabel } from '../../utils/playerSafeText';
import { getDecorationName } from '../../utils/decorationUtils';
import { inspectOnField } from '../../utils/shellNavigation';
import { sortRecentEngagements } from '../../utils/recentEngagements';
import { resolveCurrentSectorForFormation } from '../../utils/sectorUtils';
import { addEquipmentCondition, emptyEquipmentConditionSummary } from '../../utils/reportedMetrics';
import { CollapsibleSection } from './CollapsibleSection';
import { EmptyState } from '../EmptyState';
import { EliteCommanderSummary } from '../EliteCommanderSummary';
import { t, useLocale, type MessageKey } from '../../i18n';
import { compareLocalizedFormationNames, getLocalizedFormationName } from '../../data/formationNameLocalizations';

interface OrbatSectionProps {
    corpsId: string;
    brigades: FormationView[];
    sectors?: CorpsFrontSectorView[];
}

const STATUS_COLOR: Record<string, string> = {
    active: 'text-emerald-400',
    disrupted: 'text-red-500',
    forming: 'text-amber-500',
    reserve: 'text-blue-400',
    unreported: 'text-text-secondary/50',
};

const ENGAGEMENT_OUTCOME_LABEL_KEYS: Record<string, MessageKey> = {
    decisive_victory: 'aar.outcome.decisive',
    victory: 'aar.outcome.victory',
    costly_victory: 'aar.outcome.costly',
    stalemate: 'aar.outcome.stalemate',
    repulsed: 'aar.outcome.repulsed',
    catastrophic: 'aar.outcome.collapse',
};

function engagementOutcomeLabel(outcome: string): string {
    const key = ENGAGEMENT_OUTCOME_LABEL_KEYS[outcome];
    return key ? t(key) : t('aar.outcome.recorded');
}

/** Inline bar — fraction 0..1, fixed width. */
function engagementTurnLabel(turn: number): string {
    if (!Number.isFinite(turn)) return t('formationDetail.undated');
    if (turn <= 0) return t('formationDetail.setupRecord');
    return turnToDateString(turn);
}

function MiniBar({ value, max, color, width = 60 }: { value: number | null; max: number; color: string; width?: number }) {
    const pct = value != null && max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
    return (
        <div className="flex items-center gap-1.5">
            <div className="relative bg-panel-bg border border-panel-border/40" style={{ width, height: 6 }}>
                <div className="absolute inset-y-0 left-0" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color }}>
                {value == null ? t('orbat.metricUnreported') : Math.round(value)}
            </span>
        </div>
    );
}

function reportedPercent(value: number | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.round(Math.max(0, Math.min(100, value)))
        : null;
}

function reportedNonNegative(value: number | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, value)
        : null;
}

function formatCampaignLossValue(value: number | undefined): string {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.round(value)).toLocaleString()
        : t('orbat.metricUnreported');
}

function formatOperationalEquipment(total: number | undefined, operational: number | undefined): { label: string; reported: boolean } | null {
    const summary = addEquipmentCondition(emptyEquipmentConditionSummary(), total, operational);
    if (summary.total <= 0) return null;
    if (summary.unreportedCount > 0) return { label: t('orbat.metricUnreported'), reported: false };
    return {
        label: t('orbat.operationalCount', {
            current: Math.round(summary.operational),
            total: Math.round(summary.total),
        }),
        reported: true,
    };
}

const ARC_BADGE_STYLE: Record<string, { bg: string; text: string }> = {
    veteran:   { bg: 'bg-emerald-900/60', text: 'text-emerald-300' },
    bloodied:  { bg: 'bg-red-900/60',     text: 'text-red-400' },
    shattered: { bg: 'bg-red-950/80',     text: 'text-red-600' },
    risen:     { bg: 'bg-amber-900/60',   text: 'text-amber-300' },
    destroyed: { bg: 'bg-neutral-900/80', text: 'text-neutral-500' },
    garrison:  { bg: 'bg-blue-950/60',    text: 'text-blue-400' },
};

const DECORATION_TIER_STYLE: Record<string, string> = {
    gold:   'text-amber-300 border-amber-500/40',
    silver: 'text-neutral-300 border-neutral-400/40',
    bronze: 'text-orange-400 border-orange-500/40',
};

function BrigadeExpandedDetail({ b }: { b: FormationView }) {
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const morale = reportedPercent(b.morale);
    const cohesion = reportedPercent(b.cohesion);
    const entrenchment = reportedNonNegative(b.entrenchment_turns);
    const personnel = reportedNonNegative(b.personnel);
    const officerQuality = b.officer_quality;
    const comp = b.composition;
    const tankStatus = formatOperationalEquipment(comp?.tanks, comp?.tank_condition?.operational);
    const artilleryStatus = formatOperationalEquipment(comp?.artillery, comp?.artillery_condition?.operational);
    const hist = b.brigade_history;
    const engagements = sortRecentEngagements(b.recent_engagements);
    const narrative = b.warNarrative;
    const arc = b.narrativeArc;
    const decorations = b.decorations;
    const locationOsid = b.location_osid;
    const homeOsid = b.home_osid;
    const cohesionColor = cohesion == null ? '#8a8170' : getCohesionColor(cohesion);
    const moraleColor = morale == null ? '#8a8170' : morale < 30 ? '#c24040' : morale < 50 ? '#c4a35a' : '#4a9a55';
    const reportedCampaignCasualties = [b.campaignKia, b.campaignWia, b.campaignMia]
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const totalCampaignCasualties = reportedCampaignCasualties.reduce((sum, value) => sum + Math.max(0, value), 0);

    return (
        <div className="px-4 py-3 space-y-3 text-[11px] border-t border-panel-border/50 bg-panel-card font-mono">
            {/* Arc badge + location row */}
            <div className="flex items-center gap-2 flex-wrap">
                {arc && ARC_BADGE_STYLE[arc] && (
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${ARC_BADGE_STYLE[arc].bg} ${ARC_BADGE_STYLE[arc].text} tracking-widest`}>
                        {getPlayerSafeFormationNarrativeArcLabel(arc)}
                    </span>
                )}
                {locationOsid && (
                    <span className="text-[10px] text-text-secondary/50">
                        {t('orbat.loc')} <span className="text-text-secondary">{getOsidDisplayName(locationOsid, osidDisplayNames)}</span>
                    </span>
                )}
                {homeOsid && homeOsid !== locationOsid && (
                    <span className="text-[10px] text-text-secondary/40">
                        {t('orbat.home')} <span className="text-text-secondary/60">{getOsidDisplayName(homeOsid, osidDisplayNames)}</span>
                    </span>
                )}
                {b.home_defense_active && (
                    <span className="text-[9px] font-bold text-panel-bg bg-amber-400 px-2 py-0.5 tracking-widest">{t('orbat.homeDef')}</span>
                )}
            </div>

            {/* Stats grid with inline bars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 uppercase tracking-tight">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-text-secondary/50">{t('orbat.personnel')}</span>
                    <span className="text-text-secondary font-bold">
                        {personnel == null ? t('orbat.metricUnreported') : formatPersonnel(personnel)}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-text-secondary/50">{t('orbat.morale')}</span>
                    <MiniBar value={morale} max={100} color={moraleColor} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-text-secondary/50">{t('orbat.cohesion')}</span>
                    <MiniBar value={cohesion} max={100} color={cohesionColor} />
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-text-secondary/50">{t('orbat.entrench')}</span>
                    <span className="text-text-secondary">
                        {entrenchment == null ? t('orbat.metricUnreported') : t('orbat.turnsShort', { value: entrenchment.toFixed(1) })}
                    </span>
                </div>
                {officerQuality != null && (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-text-secondary/50">{t('orbat.officers')}</span>
                        <span className="text-text-secondary">{(officerQuality * 100).toFixed(0)}%</span>
                    </div>
                )}
                {reportedCampaignCasualties.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-text-secondary/50">{t('orbat.campaignLosses')}</span>
                        <span className="text-red-500 font-bold">
                            {t('orbat.campaignLossBreakdown', {
                                killed: formatCampaignLossValue(b.campaignKia),
                                wounded: formatCampaignLossValue(b.campaignWia),
                                missing: formatCampaignLossValue(b.campaignMia),
                            })}
                        </span>
                    </div>
                )}
            </div>

            {b.eliteCommander && (
                <EliteCommanderSummary commander={b.eliteCommander} compact />
            )}

            {/* Equipment */}
            {(tankStatus || artilleryStatus) && (
                <div className="space-y-1.5">
                    <div className="text-[9px] font-bold uppercase text-text-secondary/50 tracking-widest">{t('orbat.materialStatus')}</div>
                    <div className="grid grid-cols-2 gap-4">
                        {tankStatus && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-text-secondary/50 uppercase">{t('orbat.armour')}</span>
                                <span className={`${tankStatus.reported ? 'text-emerald-400' : 'text-text-secondary/60'} font-bold`}>{tankStatus.label}</span>
                            </div>
                        )}
                        {artilleryStatus && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-text-secondary/50 uppercase">{t('orbat.artillery')}</span>
                                <span className={`${artilleryStatus.reported ? 'text-emerald-400' : 'text-text-secondary/60'} font-bold`}>{artilleryStatus.label}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Decorations */}
            {decorations && decorations.length > 0 && (
                <div className="space-y-1">
                    <div className="text-[9px] font-bold uppercase text-text-secondary/50 tracking-widest">{t('orbat.decorations')}</div>
                    <div className="flex flex-wrap gap-1.5">
                        {decorations.map((d, i) => {
                            const style = DECORATION_TIER_STYLE[d.tier] ?? 'text-text-secondary border-panel-border/40';
                            return (
                                <span key={i} className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border rounded ${style}`}
                                    title={d.notes ?? ''}>
                                    {getDecorationName(b.faction, d.tier)}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Brigade history stats */}
            {hist && (hist.longest_victory_streak > 0 || hist.turns_under_siege > 0) && (
                <div className="flex gap-4 text-[10px] text-text-secondary/60">
                    {hist.longest_victory_streak > 0 && <span>{t('orbat.winStreak')} <span className="text-emerald-400 font-bold">{hist.longest_victory_streak}</span></span>}
                    {hist.turns_under_siege > 0 && <span>{t('orbat.siegeTurns')} <span className="text-amber-400 font-bold">{hist.turns_under_siege}</span></span>}
                </div>
            )}

            {/* Recent engagements */}
            {engagements.length > 0 && (
                <div className="space-y-1.5 pt-1">
                    <div className="text-[9px] font-bold uppercase text-red-500/50 tracking-widest border-b border-red-500/10 pb-1">{t('orbat.recentEngagements')}</div>
                    <div className="space-y-1">
                        {engagements.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                                <span className="text-text-secondary/50 w-16 shrink-0">{engagementTurnLabel(e.turn)}</span>
                                <span
                                    className="text-text-secondary/40 truncate w-20 shrink-0"
                                    title={getOsidDisplayName(e.osid, osidDisplayNames)}
                                >
                                    {getOsidDisplayName(e.osid, osidDisplayNames)}
                                </span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border leading-none`}
                                    style={{ color: OUTCOME_COLORS[e.outcome] ?? '#d4c5a0', borderColor: (OUTCOME_COLORS[e.outcome] ?? '#d4c5a0') + '40' }}>
                                    {engagementOutcomeLabel(e.outcome)}
                                </span>
                                <span className="text-text-secondary/60 w-16 shrink-0">{e.role === 'attacker' ? t('orbat.attackerShort') : t('orbat.defenderShort')}</span>
                                <span className="text-red-500 font-bold">-{e.casualties_taken}</span>
                                {e.territory_flipped && <span className="text-emerald-400 text-[9px] font-bold">[!]</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Narrative */}
            {narrative && (
                <div className="border-t border-panel-border/50 pt-2">
                    <div className="text-[9px] font-bold uppercase text-text-secondary/50 tracking-widest mb-1">{t('orbat.intelNarrative')}</div>
                    <div className="text-[11px] text-text-secondary leading-relaxed italic">{narrative}</div>
                </div>
            )}
        </div>
    );
}

export function OrbatSection({ corpsId, brigades, sectors }: OrbatSectionProps) {
    const [locale] = useLocale();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const sorted = useMemo(() => [...brigades].sort((a, b) => compareLocalizedFormationNames(a, b, locale)), [brigades, locale]);

    return (
        <CollapsibleSection sectionKey={`orbat-${corpsId}`} title={t('orbat.title')} count={brigades.length}>
            {sorted.length === 0 ? (
                <EmptyState
                    message={t('orbat.empty')}
                    helpText={t('orbat.emptyHelp')}
                    density="compact"
                />
            ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-1 pr-2 custom-scrollbar font-mono">
                <div className="flex items-center px-4 py-1 text-[9px] text-text-secondary/60 uppercase tracking-widest font-bold">
                    <span className="w-6 shrink-0" />
                    <span className="flex-1 min-w-0">{t('orbat.unitIdentifier')}</span>
                    <span className="w-16 text-right shrink-0">{t('orbat.strengthShort')}</span>
                    <span className="w-20 text-center shrink-0">{t('orbat.cohesion')}</span>
                    <span className="w-10 text-right shrink-0">{t('orbat.fatigueShort')}</span>
                    <span className="w-14 text-right shrink-0">{t('orbat.posture')}</span>
                </div>

                {sorted.map((b) => {
                    const cohesion = reportedPercent(b.cohesion);
                    const fatigue = reportedPercent(b.fatigue);
                    const personnel = reportedNonNegative(b.personnel);
                    const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                    const status = isDisrupted ? 'disrupted' : b.status ?? 'unreported';
                    const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.unreported;
                    const cohesionColor = cohesion == null ? '#8a8170' : getCohesionColor(cohesion);
                    const filledSegments = cohesion == null ? 0 : Math.ceil(cohesion / 20);
                    const fatigueClass = fatigue == null
                        ? 'text-text-secondary/50'
                        : fatigue >= 20
                            ? 'text-red-500 underline'
                            : fatigue >= 10
                                ? 'text-amber-500'
                                : 'text-text-secondary/60';
                    const isExpanded = expandedId === b.id;
                    const formationName = getLocalizedFormationName(b, locale);
                    const detailId = `army-hq-formation-detail-${b.id}`;
                    const toggleLabel = isExpanded
                        ? t('orbat.collapseFormationAria', { formation: formationName })
                        : t('orbat.expandFormationAria', { formation: formationName });

                    return (
                        <div key={b.id} className={`border border-panel-border/30 mb-[1px] ${isExpanded ? 'bg-panel-bg' : ''}`}>
                            <div className={`flex items-center transition-all ${isExpanded ? '' : 'hover:bg-panel-bg'}`}>
                                <button
                                    type="button"
                                    data-testid="army-hq-formation-toggle"
                                    data-formation-id={b.id}
                                    aria-expanded={isExpanded}
                                    aria-controls={detailId}
                                    aria-label={toggleLabel}
                                    title={toggleLabel}
                                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                    className="min-w-0 flex flex-1 items-center gap-3 px-4 py-2 text-left"
                                >
                                    {/* Expand indicator */}
                                    <span className={`text-[9px] text-text-secondary/60 w-2 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                        ▶
                                    </span>

                                    {/* Name */}
                                    <span className="text-[12px] font-bold text-text-secondary flex-1 min-w-0 uppercase tracking-tight">
                                        {formationName}
                                    </span>

                                    {/* Personnel */}
                                    <span className="text-[11px] tabular-nums text-text-secondary w-16 text-right shrink-0">
                                        {personnel == null ? t('orbat.metricUnreportedShort') : formatPersonnel(personnel)}
                                    </span>

                                    {/* Cohesion segments */}
                                    <div className="flex gap-1 w-20 justify-center shrink-0">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <div
                                                key={i}
                                                className={`h-2.5 w-2 border border-black/40 ${i < filledSegments ? '' : 'bg-panel-card opacity-20'}`}
                                                style={{ backgroundColor: i < filledSegments ? cohesionColor : undefined }}
                                            />
                                        ))}
                                    </div>

                                    {/* Fatigue */}
                                    <span className={`text-[11px] tabular-nums w-10 text-right shrink-0 font-bold ${fatigueClass}`}>
                                        {fatigue == null ? t('orbat.metricUnreportedShort') : fatigue}
                                    </span>

                                    {/* Status posture */}
                                    <span className={`text-[10px] font-bold uppercase w-14 text-right shrink-0 ${statusColor}`}>
                                        {isDisrupted ? t('orbat.disruptedShort') : getPlayerSafeFormationPostureLabel(b.posture, t('orbat.postureUnreported'))}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    data-testid="army-hq-formation-inspect"
                                    data-formation-id={b.id}
                                    data-corps-id={corpsId}
                                    aria-label={t('orbat.inspectOnField', { formation: formationName })}
                                    onClick={() => {
                                        const sector = resolveCurrentSectorForFormation(b, sectors);
                                        inspectOnField(useGameStore.getState(), sector
                                            ? {
                                                kind: 'field-formation-in-sector',
                                                formationId: b.id,
                                                corpsId,
                                                sectorId: sector.sector_id,
                                                osid: b.location_osid ?? null,
                                            }
                                            : {
                                                kind: 'field-formation-in-corps',
                                                formationId: b.id,
                                                corpsId,
                                                osid: b.location_osid ?? null,
                                            });
                                    }}
                                    className="mr-3 shrink-0 rounded border border-panel-border/70 bg-black/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-400/80 transition-colors hover:border-amber-400/40 hover:text-amber-300"
                                >
                                    {t('orbat.inspect')}
                                </button>
                            </div>
                            {isExpanded && (
                                <div id={detailId} data-testid="army-hq-formation-detail">
                                    <BrigadeExpandedDetail b={b} />
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
