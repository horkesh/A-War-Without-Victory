/**
 * Army HQ Corps Card — Warroom Panel.
 * Uses FlipCard for front (summary) / back (detail) with 3D flip animation.
 * Compressed mode stays as a single-line mini card when another card is flipped.
 */
import { useMemo } from 'react';
import type { FormationView, CorpsFrontSectorView, OperationView, LoadedGameState } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { formatCorpsDisplayName } from '../../utils/formatters';
import {
    addEquipmentCondition,
    emptyEquipmentConditionSummary,
    formatReportedPersonnel,
    sumReportedPersonnel,
    type EquipmentConditionSummary,
    type ReportedMetricSummary,
} from '../../utils/reportedMetrics';
import { aggregateEffectiveness, effectivenessBandLabel } from '../../utils/combatEffectiveness';
import { getFormationCommander, getSyntheticJnaCommandPresentation, resolveCorpsCommanderDisplay } from '../../utils/officerUtils';
import { Icon } from '../icons/Icon';
import { CommanderSection } from './CommanderSection';
import { CommandRelationshipSection } from './CommandRelationshipSection';
import { CorpsSituationSection } from './CorpsSituationSection';
import { SectorsSection } from './SectorsSection';
import { OperationsSection } from './OperationsSection';
import { OrbatSection } from './OrbatSection';
import { CombatRecordSection } from './CombatRecordSection';
import { FlipCard } from './FlipCard';
import { deriveCorpsDelegationSummary, normalizeCommandStrainLabel } from '../../data/command_strain';
import { isWithdrawnEmptySyntheticJnaCommand } from '../../data/syntheticJnaCommandVisibility';
import { t, type MessageKey } from '../../i18n';

import { readinessGradeLabel, type ReadinessGrade } from './ForceReadiness';

interface ArmyHQCorpsCardProps {
    corps: FormationView;
    brigades: FormationView[];
    sectors: CorpsFrontSectorView[];
    operations: OperationView[];
    factionBattles: TurnBattle[];
    gameState: LoadedGameState;
    isExpanded: boolean;
    isCompressed: boolean;
    onToggleExpand: () => void;
    /** Corps readiness grade from ForceReadiness computation. */
    readinessGrade?: ReadinessGrade;
    /** Whether enemy offensive preparation is detected facing this corps. */
    hasThreat?: boolean;
}

const COHESION_CRITICAL = 40;
const COHESION_HEALTHY = 70;

const GRADE_COLORS: Record<string, string> = {
    A: 'text-emerald-400', B: 'text-accent-gold', C: 'text-amber-500', D: 'text-red-400', F: 'text-red-300',
    UNREPORTED: 'text-text-secondary',
};

const STANCE_LABEL_KEYS: Record<string, MessageKey> = {
    offensive: 'armyHqCorps.stance.offensive',
    defensive: 'armyHqCorps.stance.defensive',
    balanced: 'armyHqCorps.stance.balanced',
    reorganize: 'armyHqCorps.stance.reorganize',
    unreported: 'armyHqCorps.stance.unreported',
};
const STANCE_COLORS: Record<string, string> = {
    offensive: 'text-red-400 border-red-500/30 bg-red-500/5',
    defensive: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    balanced: 'text-accent-gold border-accent-gold/30 bg-accent-gold/5',
    reorganize: 'text-neutral-400 border-neutral-400/30 bg-neutral-400/5',
    unreported: 'text-neutral-400 border-neutral-400/30 bg-neutral-400/5',
};

const READINESS_BORDER: Record<string, string> = {
    'COMBAT READY': 'border-l-emerald-400',
    'ADEQUATE': '',
    'STRAINED': 'border-l-amber-500',
    'DEGRADED': 'border-l-red-500',
    'INEFFECTIVE': 'border-l-red-600',
    'UNREPORTED': '',
};

function getPersonnelTone(summary: ReportedMetricSummary): { textClass: string; iconColor: string; state: string } {
    if (summary.totalCount === 0 || summary.reportedCount === 0) {
        return { textClass: 'text-text-secondary', iconColor: '#94a3b8', state: 'unreported' };
    }
    if (summary.unreportedCount > 0) {
        return { textClass: 'text-amber-400', iconColor: '#fbbf24', state: 'partial' };
    }
    if (summary.reportedTotal >= 8000) {
        return { textClass: 'text-emerald-400', iconColor: '#34d399', state: 'complete-strong' };
    }
    if (summary.reportedTotal >= 4000) {
        return { textClass: 'text-accent-gold', iconColor: '#fbbf24', state: 'complete-moderate' };
    }
    return { textClass: 'text-red-400', iconColor: '#f87171', state: 'complete-thin' };
}

function averageReported(values: ReadonlyArray<number | undefined | null>): number | null {
    const reported = values.filter((value): value is number => Number.isFinite(value));
    if (reported.length === 0) return null;
    return reported.reduce((sum, value) => sum + value, 0) / reported.length;
}

function roundConditionLabel(value: number | null): string {
    return value == null ? t('corpsFront.unreported') : String(Math.round(value));
}

function formatEquipmentSummary(summary: EquipmentConditionSummary): string {
    if (summary.unreportedCount > 0 && summary.reportedCount === 0) return t('corpsFront.unreported');
    const value = `${Math.round(summary.operational)}/${Math.round(summary.total)}`;
    return summary.unreportedCount > 0 ? t('corpsFront.partialEquipment', { value }) : value;
}

export function ArmyHQCorpsCard({
    corps, brigades, sectors, operations, factionBattles, gameState,
    isExpanded, isCompressed, onToggleExpand,
    readinessGrade, hasThreat,
}: ArmyHQCorpsCardProps) {
    const data = useMemo(() => {
        const personnelSummary = sumReportedPersonnel(brigades);
        const totalPersonnel = personnelSummary.reportedTotal;
        const totalPersonnelLabel = formatReportedPersonnel(personnelSummary, {
            partial: (personnel) => t('corpsFront.partialPersonnel', { personnel }),
            unreported: t('corpsFront.unreported'),
        });
        const personnelTone = getPersonnelTone(personnelSummary);
        const avgCohesion = averageReported(brigades.map(b => b.cohesion));
        const avgFatigue = averageReported(brigades.map(b => b.fatigue));
        const eff = aggregateEffectiveness(brigades);
        const commander = getFormationCommander(corps, gameState);
        const commanderDisplay = resolveCorpsCommanderDisplay(corps.id, corps.faction, gameState);
        const syntheticCommand = commanderDisplay?.source === 'synthetic'
            ? getSyntheticJnaCommandPresentation(corps, operations, gameState)
            : null;
        const stance = corps.corpsStance ?? 'unreported';
        const activeOp = operations.find((op) => op.phase === 'execution');
        const planningOp = activeOp ? null : operations.find((op) => op.phase === 'planning');
        const displayedOp = activeOp ?? planningOp ?? null;
        const displayedOpLabel = activeOp
            ? t('armyHqCorps.activeOperation')
            : planningOp
                ? t('armyHqCorps.planningOperation')
                : null;

        // This-week battles: count battles in this corps' territory
        const corpsTerritoryOsids = new Set<string>();
        for (const sec of sectors) {
            for (const sub of (sec.sub_segments ?? [])) {
                for (const osid of sub.friendly_osids) corpsTerritoryOsids.add(osid);
            }
        }
        const corpsBattles = factionBattles.filter((b) => corpsTerritoryOsids.has(b.osid));

        const rawEquip = brigades.reduce((acc, b) => {
            const c = b.composition;
            if (!c) return acc;
            addEquipmentCondition(acc.tanks, c.tanks, c.tank_condition?.operational);
            addEquipmentCondition(acc.arty, c.artillery, c.artillery_condition?.operational);
            return acc;
        }, { tanks: emptyEquipmentConditionSummary(), arty: emptyEquipmentConditionSummary() });
        const equipment = {
            tanksLabel: formatEquipmentSummary(rawEquip.tanks),
            artyLabel: formatEquipmentSummary(rawEquip.arty),
        };

        const strain = corps.commandStrain;
        const strainSource = corps.commandStrainSource ?? 'presidential_intervention';
        const commandStrainReported = typeof strain === 'number' && Number.isFinite(strain);
        const displayedStrain = commandStrainReported ? strain : 0;
        const strainLabel = normalizeCommandStrainLabel(displayedStrain, corps.commandStrainLabel);
        const frictionTypes = corps.activeFrictionTypes ?? [];
        const frictionEvents = corps.frictionEvents ?? [];
        const stabilizationAvailable = corps.stabilizationAvailable ?? false;
        const stabilizationCooldownUntil = corps.stabilizationCooldownUntil;
        const stabilizationCostCA = corps.stabilizationCostCA ?? 0;
        const currentTurn = gameState.turn ?? 0;

        const recoveryForecast = corps.recoveryForecast ?? null;
        const recoveryForecastToken = corps.recoveryForecastToken ?? null;
        // Delegation Visibility Wave 1: standing delegation summary from active ops
        const delegationSummary = deriveCorpsDelegationSummary(operations);
        return { totalPersonnel, totalPersonnelLabel, personnelTone, avgCohesion, avgFatigue, eff, commander, commanderDisplay, syntheticCommand, stance, activeOp, planningOp, displayedOp, displayedOpLabel, corpsBattles, equipment, strain, strainSource, commandStrainReported, displayedStrain, strainLabel, frictionTypes, frictionEvents, stabilizationAvailable, stabilizationCooldownUntil, stabilizationCostCA, currentTurn, recoveryForecast, recoveryForecastToken, delegationSummary };
    }, [corps, brigades, sectors, operations, factionBattles, gameState]);

    if (isWithdrawnEmptySyntheticJnaCommand(corps, gameState.formations, gameState.eventFlags)) {
        return null;
    }

    const displayName = formatCorpsDisplayName(corps.name, corps.id);
    const isCritical = data.avgCohesion != null && data.avgCohesion < COHESION_CRITICAL;
    const noCommander = !data.commanderDisplay;
    const commanderSourceUnreported = data.commanderDisplay?.source === 'unreported';
    const displayCommanderName = commanderSourceUnreported ? undefined : data.syntheticCommand?.commanderName ?? data.commanderDisplay?.name;
    const stanceClass = STANCE_COLORS[data.stance] ?? STANCE_COLORS.unreported;
    const stanceLabel = t(STANCE_LABEL_KEYS[data.stance] ?? 'armyHqCorps.stance.unreported');
    const effectivenessBand = effectivenessBandLabel(data.eff);
    const gradeColor = GRADE_COLORS[effectivenessBand.grade] ?? 'text-text-secondary';
    const effectivenessTitle = effectivenessBand.grade === 'UNREPORTED'
        ? t('armyHqCorps.effectivenessShort', {
            grade: effectivenessBand.grade,
            label: t(effectivenessBand.labelKey),
        })
        : t('effectiveness.exactTooltip', { value: data.eff.totalEffectiveness.toLocaleString() });
    const expandCardAria = t('armyHqCorps.expandCardAria', { corps: displayName });
    const collapseCardAria = t('armyHqCorps.collapseCardAria', { corps: displayName });
    const reportedCohesion = data.avgCohesion;
    const cohesionReported = reportedCohesion != null;
    const cohesionReportState = cohesionReported ? 'reported' : 'unreported';
    const cohesionTitle = reportedCohesion != null
        ? t('armyHqCorps.cohesionReported', { value: Math.round(reportedCohesion) })
        : t('armyHqCorps.cohesionUnreported');
    const compressedCohesionWidth = reportedCohesion != null ? Math.min(100, reportedCohesion) : 0;
    const frontCohesionWidth = reportedCohesion != null ? Math.min(70, reportedCohesion * 0.7) : 0;

    // Compressed: single line when another card is flipped
    if (isCompressed) {
        return (
            <button
                type="button"
                onClick={onToggleExpand}
                aria-label={expandCardAria}
                className="bg-panel-card border border-panel-border overflow-hidden hover:border-amber-400/40 transition-colors cursor-pointer group"
            >
                <div className="flex items-center justify-between px-3 py-2 bg-panel-card">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest font-mono">
                        {displayName}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold tabular-nums font-mono ${gradeColor}`}>
                            {data.eff.grade}
                        </span>
                    </div>
                </div>
                {/* Thin cohesion bar */}
                <div className="h-[1px] bg-white/5">
                    <div
                        data-testid="army-hq-corps-cohesion-stripe"
                        data-report-state={cohesionReportState}
                        title={cohesionTitle}
                        aria-label={cohesionTitle}
                        className={`h-full ${data.avgCohesion == null ? 'bg-panel-border/40' : data.avgCohesion >= COHESION_HEALTHY ? 'bg-emerald-400/60' : data.avgCohesion >= COHESION_CRITICAL ? 'bg-accent-gold/60' : 'bg-red-500/60'}`}
                        style={{ width: `${compressedCohesionWidth}%` }}
                    />
                </div>
            </button>
        );
    }

    // Front face: summary card (clickable to flip)
    const cardFront = (
        <button
            type="button"
            onClick={onToggleExpand}
            data-testid="army-hq-corps-card"
            data-commander-source={data.commanderDisplay?.source ?? 'none'}
            aria-label={expandCardAria}
            className={`min-h-[256px] w-full bg-panel-card border border-panel-border overflow-hidden hover:border-amber-400/50 transition-all cursor-pointer relative flex flex-col text-left
                ${readinessGrade && READINESS_BORDER[readinessGrade] ? `border-l-[3px] ${READINESS_BORDER[readinessGrade]}` : isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
        >
            {/* Threat badge */}
            {hasThreat && (
                <div className="absolute top-2 left-2 text-xs text-red-400 font-bold animate-pulse tracking-[0.15em] bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 z-10">
                    {t('armyHqCorps.incoming')}
                </div>
            )}

            {/* Status Stamp */}
            <div className={`absolute top-4 right-4 text-xs font-bold uppercase tracking-[0.2em] px-2 py-1 border ${stanceClass} z-10 font-mono`}>
                {stanceLabel}
            </div>

            <div className="px-4 py-4 flex-1 flex flex-col">
                {/* Line 1: Corps name */}
                <div className="text-[16px] font-bold text-amber-400 uppercase tracking-widest leading-tight pr-24" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                    {displayName}
                </div>

                {/* Line 2: Commander + grade */}
                <div className="mt-1.5 flex flex-wrap items-start gap-x-2.5 gap-y-1 text-[12px] text-text-secondary font-mono">
                    {displayCommanderName ? (
                        <span className="min-w-0 basis-full break-words sm:basis-auto sm:flex-1">
                            {data.syntheticCommand ? `${t('armyHqCorps.operationCommander')}: ` : ''}
                            {displayCommanderName}
                            {!data.syntheticCommand && data.commanderDisplay?.acting && (
                                <span className="text-amber-400/80"> ({t('commanderSection.actingCommander')})</span>
                            )}
                        </span>
                    ) : (
                        <span className={`min-w-0 basis-full break-words italic sm:basis-auto sm:flex-1 ${commanderSourceUnreported ? 'text-text-secondary' : 'text-red-400'}`}>
                            {commanderSourceUnreported ? t('armyHqCorps.commanderUnreported') : t('armyHqCorps.unassigned')}
                        </span>
                    )}
                    <div className="hidden h-3 w-1 border-l border-panel-border sm:block" />
                    <span
                        data-testid="army-hq-corps-effectiveness"
                        className={`shrink-0 font-bold ${gradeColor}`}
                        title={effectivenessTitle}
                    >
                        {t('armyHqCorps.effectivenessShort', {
                            grade: effectivenessBand.grade,
                            label: t(effectivenessBand.labelKey),
                        })}
                    </span>
                    {readinessGrade && (
                        <>
                            <div className="hidden h-3 w-1 border-l border-panel-border sm:block" />
                            <span className={`shrink-0 font-bold uppercase ${readinessGrade === 'COMBAT READY' ? 'text-emerald-400' : readinessGrade === 'ADEQUATE' ? 'text-text-primary' : readinessGrade === 'STRAINED' ? 'text-amber-400' : readinessGrade === 'UNREPORTED' ? 'text-text-secondary' : 'text-red-400'}`}>
                                {readinessGradeLabel(readinessGrade)}
                            </span>
                        </>
                    )}
                </div>

                {data.commanderDisplay?.source === 'opening_read_model' && (
                    <div data-testid="army-hq-opening-command-provenance" className="mt-1 text-xs leading-4 text-amber-300/85 font-mono">
                        <span className="font-bold uppercase tracking-[0.12em]">{t('commanderDisplay.openingCommand')}</span>
                        <span className="text-text-secondary"> - {t('commanderDisplay.openingCommandHelp')}</span>
                    </div>
                )}
                {data.commanderDisplay?.source === 'synthetic' && (
                    <div data-testid="army-hq-command-staff-provenance" className="mt-1 text-xs leading-4 text-amber-300/85 font-mono">
                        <span className="font-bold uppercase tracking-[0.12em]">{t('commanderDisplay.commandStaff')}</span>
                        <span className="text-text-secondary"> - {t('commanderDisplay.commandStaffHelp')}</span>
                    </div>
                )}

                {readinessGrade && (
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-text-secondary font-mono">
                        {t('armyHqCorps.readinessVitals', {
                            fatigue: roundConditionLabel(data.avgFatigue),
                            cohesion: roundConditionLabel(data.avgCohesion),
                        })}
                    </div>
                )}

                {/* Equipment icons */}
                <div className="flex items-center gap-4 mt-1.5 text-[12px]">
                    <span className="flex items-center gap-1">
                        <Icon name="tanks" size={14} className="text-text-secondary" />
                        <span className="text-text-primary font-bold tabular-nums">{data.equipment.tanksLabel}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Icon name="artillery" size={14} className="text-text-secondary" />
                        <span className="text-text-primary font-bold tabular-nums">{data.equipment.artyLabel}</span>
                    </span>
                </div>

                {/* Line 3: Stats */}
                <div className="flex items-center gap-4 mt-3 text-[12px] tabular-nums font-mono">
                    <div className="flex flex-col">
                        <span className="text-xs text-text-secondary uppercase tracking-tighter">{t('armyHqCorps.personnel')}</span>
                        <span
                            data-testid="army-hq-corps-card-personnel"
                            data-report-state={data.personnelTone.state}
                            className={`font-bold ${data.personnelTone.textClass}`}
                        >
                            {data.totalPersonnelLabel}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-text-secondary uppercase tracking-tighter">{t('armyHqCorps.orbat')}</span>
                        <span className="text-text-secondary font-bold">{t('armyHqCorps.brigadeShortCount', { count: brigades.length })}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-text-secondary uppercase tracking-tighter">{t('armyHqCorps.front')}</span>
                        <span className="text-text-secondary font-bold">{t('armyHqCorps.sectorShortCount', { count: sectors.length })}</span>
                    </div>
                </div>

                {/* Active op indicator */}
                {data.displayedOp && data.displayedOpLabel && (
                    <div className="mt-3 pt-2.5 border-t border-panel-border flex flex-col gap-1">
                        <span className="text-xs text-red-400 font-bold tracking-[0.2em] uppercase">{data.displayedOpLabel}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs text-red-400 font-bold truncate uppercase font-mono">
                                {data.displayedOp.display_name}
                            </span>
                        </div>
                    </div>
                )}

                {/* This-week battles */}
                {data.corpsBattles.length > 0 && (
                    <div className="mt-2.5 flex gap-2">
                        <div className="px-2 py-0.5 bg-red-900/40 border border-red-500/40 text-red-400 text-xs font-bold tracking-widest animate-pulse">
                            {t('armyHqCorps.contactEngagements', { count: data.corpsBattles.length })}
                        </div>
                    </div>
                )}

                {!data.commandStrainReported && (
                    <div className="mt-2.5">
                        <div
                            className="inline-flex px-2 py-0.5 text-xs font-bold tracking-widest border bg-panel-bg/60 border-panel-border/60 text-text-secondary"
                            title={t('armyHqCorps.commandStrainUnreported')}
                        >
                            {t('armyHqCorps.commandStrainUnreported')}
                        </div>
                    </div>
                )}

                {/* Command Strain indicator — only when strain > 0 */}
                {data.displayedStrain > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <div
                            className={`px-2 py-0.5 text-xs font-bold tracking-widest border ${
                                data.strainLabel === 'compromised'
                                    ? 'bg-red-900/30 border-red-500/40 text-red-400'
                                    : 'bg-amber-900/30 border-amber-500/40 text-amber-400'
                            }`}
                            title={
                                data.strainSource === 'commander_friction'
                                    ? t('armyHqCorps.commandCommanderFrictionTitle')
                                    : data.strainSource === 'exhaustion'
                                        ? t('armyHqCorps.commandExhaustionTitle')
                                        : data.strainSource === 'mixed'
                                            ? t('armyHqCorps.commandMixedTitle')
                                            : data.strainLabel === 'compromised'
                                                ? t('armyHqCorps.commandCompromisedTitle')
                                                : t('armyHqCorps.commandStrainedTitle')
                            }
                        >
                            {data.strainLabel === 'compromised' ? t('armyHqCorps.commandCompromised') : t('armyHqCorps.commandStrained')}
                        </div>
                        {/* Friction dot — demoted from badge to dot indicator (back face owns the detail list) */}
                        {data.frictionTypes.length > 0 && (
                            <div
                                className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold tracking-widest border bg-amber-900/20 border-amber-600/40 text-amber-500"
                                title={t('armyHqCorps.frictionTitle')}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                {t('armyHqCorps.friction')}
                            </div>
                        )}
                    </div>
                )}
                {/* Warlord friction dot — shown even when strain = 0, signals "flip to see" */}
                {data.displayedStrain === 0 && data.frictionTypes.length > 0 && (
                    <div className="mt-2.5">
                        <div
                            className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold tracking-widest border bg-amber-900/20 border-amber-600/40 text-amber-500 inline-flex"
                            title={t('armyHqCorps.frictionTitle')}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            {t('armyHqCorps.friction')}
                        </div>
                    </div>
                )}
            </div>

            {/* Health stripe: cohesion (green/amber/red) + fatigue (blue) */}
            <div className="flex h-[4px] bg-panel-bg w-full">
                <div
                    data-testid="army-hq-corps-cohesion-stripe"
                    data-report-state={cohesionReportState}
                    title={cohesionTitle}
                    aria-label={cohesionTitle}
                    className={`h-full transition-all duration-500 ${data.avgCohesion == null ? 'bg-panel-border/40' : data.avgCohesion >= COHESION_HEALTHY ? 'bg-emerald-400' : data.avgCohesion >= COHESION_CRITICAL ? 'bg-accent-gold' : 'bg-red-500'
                    }`}
                    style={{ width: `${frontCohesionWidth}%` }}
                />
                <div className="h-full bg-blue-500/60 transition-all duration-500"
                    style={{ width: `${data.avgFatigue == null ? 0 : Math.min(30, (data.avgFatigue / 30) * 30)}%` }} />
            </div>
        </button>
    );

    // Back face: full detail sections (scrollable)
    const cardBack = (
        <div
            data-testid="army-hq-corps-card-detail"
            className={`min-h-[256px] bg-panel-card border border-panel-border overflow-hidden flex flex-col
                ${isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
        >
            {/* Header with back button + stance dropdown */}
            <div className="flex items-center justify-between px-4 py-3 bg-panel-card border-b border-panel-border">
                <button
                    type="button"
                    onClick={onToggleExpand}
                    aria-label={collapseCardAria}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                    <span className="text-[12px] text-text-secondary font-mono">&larr; {t('armyHqCorps.back')}</span>
                    <div className="text-[18px] font-bold text-amber-400 uppercase tracking-widest" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                        {displayName}
                    </div>
                    <span className={`text-[14px] font-bold font-mono px-2 py-0.5 border border-panel-border bg-panel-bg ${gradeColor}`}>
                        {t('armyHqCorps.effectivenessShort', {
                            grade: effectivenessBand.grade,
                            label: t(effectivenessBand.labelKey),
                        })}
                    </span>
                </button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-[12px] tabular-nums font-mono text-text-secondary uppercase">
                        <span><b className="text-text-primary">{data.totalPersonnelLabel}</b> {t('armyHqCorps.personnelShort')}</span>
                        <span><b className="text-text-primary">{brigades.length}</b> {t('armyHqCorps.brigadeShort')}</span>
                        <span><b className="text-text-primary">{sectors.length}</b> {t('armyHqCorps.sectorShort')}</span>
                    </div>
                </div>
            </div>

            {/* Sections wrapper */}
            <div className="flex flex-col gap-[1px] bg-panel-bg">
                <SectorsSection corpsId={corps.id} sectors={sectors} factionBattles={factionBattles} defaultOpen={sectors.length > 0} />
                <OperationsSection corpsId={corps.id} operations={operations} gameState={gameState} commandStrain={data.strain} commandStrainLabel={data.strainLabel} defaultOpen={operations.length > 0} />
                {/* Command Relationship — consolidated surface (strain + friction + stabilize) */}
                <CommandRelationshipSection
                    corpsId={corps.id}
                    commandStrain={data.strain}
                    commandStrainLabel={data.strainLabel}
                    recoveryForecast={data.recoveryForecast}
                    recoveryForecastToken={data.recoveryForecastToken}
                    frictionEvents={data.frictionEvents}
                    corpsExhaustion={corps.corpsExhaustion}
                    factionWarExhaustion={gameState.warPhaseExhaustion?.[corps.faction]}
                    delegationSummary={data.delegationSummary}
                    stabilizationAvailable={data.stabilizationAvailable}
                    stabilizationCooldownUntil={data.stabilizationCooldownUntil}
                    stabilizationCostCA={data.stabilizationCostCA}
                    currentTurn={data.currentTurn}
                />
                {/* Corps Situation Assessment — Commander Explanation Surfaces Wave 1 */}
                <CorpsSituationSection assessment={corps.situationAssessment} />
                <CommanderSection corps={corps} gameState={gameState} operations={operations} />
                <OrbatSection corpsId={corps.id} brigades={brigades} sectors={sectors} />
                <CombatRecordSection corpsId={corps.id} corps={corps} />
            </div>
        </div>
    );

    return (
        <FlipCard
            isFlipped={isExpanded}
            className={isExpanded ? 'col-span-full' : ''}
            front={cardFront}
            back={cardBack}
        />
    );
}
