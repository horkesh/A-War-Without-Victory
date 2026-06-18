/**
 * ORBAT section for expanded corps card.
 * Warroom dark palette.
 */
import { useMemo, useState } from 'react';
import type { FormationView } from '../../data/types';
import { useGameStore } from '../../store/gameStore';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { getCohesionColor, OUTCOME_COLORS } from '../../utils/theme';
import { formatPersonnel, toTitleCase } from '../../utils/formatters';
import { getPlayerSafeFormationPostureLabel } from '../../utils/playerSafeText';
import { CollapsibleSection } from './CollapsibleSection';
import { EmptyState } from '../EmptyState';
import { t, useLocale } from '../../i18n';
import { getLocalizedFormationName } from '../../data/formationNameLocalizations';

interface OrbatSectionProps {
    corpsId: string;
    brigades: FormationView[];
}

const STATUS_COLOR: Record<string, string> = {
    active: 'text-emerald-400',
    disrupted: 'text-red-500',
    forming: 'text-amber-500',
    reserve: 'text-blue-400',
};

/** Inline bar — fraction 0..1, fixed width. */
function MiniBar({ value, max, color, width = 60 }: { value: number; max: number; color: string; width?: number }) {
    const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
    return (
        <div className="flex items-center gap-1.5">
            <div className="relative bg-panel-bg border border-panel-border/40" style={{ width, height: 6 }}>
                <div className="absolute inset-y-0 left-0" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color }}>{Math.round(value)}</span>
        </div>
    );
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
    const morale = Math.round(b.morale ?? 0);
    const cohesion = Math.round(Math.max(0, Math.min(100, b.cohesion ?? 0)));
    const entrenchment = b.entrenchment_turns ?? 0;
    const personnel = b.personnel ?? 0;
    const officerQuality = b.officer_quality;
    const comp = b.composition;
    const hist = b.brigade_history;
    const engagements = b.recent_engagements ?? [];
    const narrative = b.warNarrative;
    const arc = b.narrativeArc;
    const decorations = b.decorations;
    const locationOsid = b.location_osid;
    const homeOsid = b.home_osid;
    const cohesionColor = getCohesionColor(cohesion);
    const moraleColor = morale < 30 ? '#c24040' : morale < 50 ? '#c4a35a' : '#4a9a55';
    const totalCampaignCasualties = (b.campaignKia ?? 0) + (b.campaignWia ?? 0) + (b.campaignMia ?? 0);

    return (
        <div className="px-4 py-3 space-y-3 text-[11px] border-t border-panel-border/50 bg-panel-card font-mono">
            {/* Arc badge + location row */}
            <div className="flex items-center gap-2 flex-wrap">
                {arc && ARC_BADGE_STYLE[arc] && (
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${ARC_BADGE_STYLE[arc].bg} ${ARC_BADGE_STYLE[arc].text} tracking-widest`}>
                        {arc}
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
                    <span className="text-text-secondary font-bold">{formatPersonnel(personnel)}</span>
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
                    <span className="text-text-secondary">{t('orbat.turnsShort', { value: entrenchment.toFixed(1) })}</span>
                </div>
                {officerQuality != null && (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-text-secondary/50">{t('orbat.officers')}</span>
                        <span className="text-text-secondary">{(officerQuality * 100).toFixed(0)}%</span>
                    </div>
                )}
                {totalCampaignCasualties > 0 && (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-text-secondary/50">{t('orbat.campaignLosses')}</span>
                        <span className="text-red-500 font-bold">
                            {b.campaignKia ?? 0} KIA / {b.campaignWia ?? 0} WIA / {b.campaignMia ?? 0} MIA
                        </span>
                    </div>
                )}
            </div>

            {/* Equipment */}
            {comp && (comp.tanks > 0 || comp.artillery > 0) && (
                <div className="space-y-1.5">
                    <div className="text-[9px] font-bold uppercase text-text-secondary/50 tracking-widest">{t('orbat.materialStatus')}</div>
                    <div className="grid grid-cols-2 gap-4">
                        {comp.tanks > 0 && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-text-secondary/50 uppercase">{t('orbat.armour')}</span>
                                <span className="text-emerald-400 font-bold">{t('orbat.operationalCount', { current: Math.round(comp.tank_condition.operational), total: Math.round(comp.tanks) })}</span>
                            </div>
                        )}
                        {comp.artillery > 0 && (
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-text-secondary/50 uppercase">{t('orbat.artillery')}</span>
                                <span className="text-emerald-400 font-bold">{t('orbat.operationalCount', { current: Math.round(comp.artillery_condition.operational), total: Math.round(comp.artillery) })}</span>
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
                                    {d.type}
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
                                <span className="text-text-secondary/50 w-6 shrink-0">W{e.turn}</span>
                                <span
                                    className="text-text-secondary/40 truncate w-20 shrink-0"
                                    title={getOsidDisplayName(e.osid, osidDisplayNames)}
                                >
                                    {getOsidDisplayName(e.osid, osidDisplayNames)}
                                </span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border leading-none`}
                                    style={{ color: OUTCOME_COLORS[e.outcome] ?? '#d4c5a0', borderColor: (OUTCOME_COLORS[e.outcome] ?? '#d4c5a0') + '40' }}>
                                    {toTitleCase(e.outcome)}
                                </span>
                                <span className="text-text-secondary/60 w-6 shrink-0">{e.role === 'attacker' ? t('orbat.attackerShort') : t('orbat.defenderShort')}</span>
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

export function OrbatSection({ corpsId, brigades }: OrbatSectionProps) {
    const [locale] = useLocale();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const sorted = useMemo(() => [...brigades].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })), [brigades]);

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
                    const cohesion = Math.round(Math.max(0, Math.min(100, b.cohesion ?? 0)));
                    const fatigue = Math.round(b.fatigue ?? 0);
                    const personnel = b.personnel ?? 0;
                    const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                    const status = isDisrupted ? 'disrupted' : b.status;
                    const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.active;
                    const cohesionColor = getCohesionColor(cohesion);
                    const filledSegments = Math.ceil(cohesion / 20);
                    const isExpanded = expandedId === b.id;

                    return (
                        <div key={b.id} className={`border border-panel-border/30 mb-[1px] ${isExpanded ? 'bg-panel-bg' : ''}`}>
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 transition-all text-left ${isExpanded ? '' : 'hover:bg-panel-bg'
                                    }`}>
                                {/* Expand indicator */}
                                <span className={`text-[9px] text-text-secondary/60 w-2 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                    ▶
                                </span>

                                {/* Name */}
                                <span className="text-[12px] font-bold text-text-secondary flex-1 min-w-0 uppercase tracking-tight">
                                    {getLocalizedFormationName(b, locale)}
                                </span>

                                {/* Personnel */}
                                <span className="text-[11px] tabular-nums text-text-secondary w-16 text-right shrink-0">
                                    {formatPersonnel(personnel)}
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
                                <span className={`text-[11px] tabular-nums w-10 text-right shrink-0 font-bold ${fatigue >= 20 ? 'text-red-500 underline' : fatigue >= 10 ? 'text-amber-500' : 'text-text-secondary/60'
                                    }`}>
                                    {fatigue}
                                </span>

                                {/* Status posture */}
                                <span className={`text-[10px] font-bold uppercase w-14 text-right shrink-0 ${statusColor}`}>
                                    {isDisrupted ? t('orbat.disruptedShort') : getPlayerSafeFormationPostureLabel(b.posture, 'Pending')}
                                </span>
                            </button>
                            {isExpanded && <BrigadeExpandedDetail b={b} />}
                        </div>
                    );
                })}
            </div>
            )}
        </CollapsibleSection>
    );
}
