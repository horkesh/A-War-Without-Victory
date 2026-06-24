/**
 * ForceReadiness — per-corps readiness assessment for Army HQ Nerve Center.
 *
 * Grades each corps from COMBAT READY to INEFFECTIVE based on brigade-level
 * health metrics (personnel, fatigue, cohesion, disruption).
 * All data comes from formations already in LoadedGameState — no adapter changes.
 */
import type { FormationView, OperationView } from '../../data/types';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';
import { t, type MessageKey } from '../../i18n';

// ── Types ────────────────────────────────────────────────────────────────

export type ReadinessGrade = 'COMBAT READY' | 'ADEQUATE' | 'STRAINED' | 'DEGRADED' | 'INEFFECTIVE';
export type ForceReadinessRecommendationId =
    | 'reorganize_immediately'
    | 'reorganize_two_turns'
    | 'reinforce_threat'
    | 'reinforce_front'
    | 'hold_operation'
    | 'reduce_tempo'
    | 'hold'
    | 'no_brigades';

export interface CorpsReadiness {
    corpsId: string;
    corpsName: string;
    grade: ReadinessGrade;
    ineffectiveCount: number;
    totalBrigades: number;
    avgFatigue: number | null;
    avgCohesion: number | null;
    disruptedCount: number;
    overextendedCount: number;  // brigades far from home
    activeOpName?: string;
    activeOpBrigadeCount?: number;
    hasThreat: boolean;
    recommendationId?: ForceReadinessRecommendationId;
    recommendation: string;
}

// ── Pure computation ─────────────────────────────────────────────────────

const PERSONNEL_INEFFECTIVE = 400;
const FATIGUE_MAX = 30;

function averageReported(values: ReadonlyArray<number | undefined | null>): number | null {
    const reported = values.filter((value): value is number => Number.isFinite(value));
    if (reported.length === 0) return null;
    return reported.reduce((sum, value) => sum + value, 0) / reported.length;
}

export function computeReadinessGrade(
    ineffPct: number,
    avgFatigue: number,
    avgCohesion: number,
    disruptedCount: number,
): ReadinessGrade {
    if (ineffPct > 0.5 || avgCohesion < 30) return 'INEFFECTIVE';
    if (ineffPct > 0.3 || avgFatigue > 20 || avgCohesion < 45) return 'DEGRADED';
    if (ineffPct > 0.15 || avgFatigue > 15 || disruptedCount > 3) return 'STRAINED';
    if (ineffPct > 0.05 || avgFatigue > 10) return 'ADEQUATE';
    return 'COMBAT READY';
}

function getRecommendationId(
    grade: ReadinessGrade,
    hasThreat: boolean,
    hasActiveOp: boolean,
): ForceReadinessRecommendationId {
    if (grade === 'INEFFECTIVE') return 'reorganize_immediately';
    if (grade === 'DEGRADED' && !hasThreat) return 'reorganize_two_turns';
    if (grade === 'DEGRADED' && hasThreat) return 'reinforce_threat';
    if (hasThreat) return 'reinforce_front';
    if (hasActiveOp) return 'hold_operation';
    if (grade === 'STRAINED') return 'reduce_tempo';
    return 'hold';
}

export function generateForceReadiness(
    formations: FormationView[],
    operations: OperationView[],
    faction: string,
    threatCorpsIds: Set<string>,
): CorpsReadiness[] {
    const brigades = formations.filter(f =>
        f.faction === faction && isFieldedTacticalFormation(f),
    );
    const corpsFormations = formations.filter(f =>
        (f.kind === 'corps' || f.kind === 'corps_asset') && f.faction === faction,
    );

    const result: CorpsReadiness[] = [];

    for (const corps of corpsFormations) {
        const corpsBrigades = brigades.filter(b => b.corps_id === corps.id);
        if (corpsBrigades.length === 0) {
            result.push({
                corpsId: corps.id,
                corpsName: getPlayerSafeCorpsName(corps.name, corps.id),
                grade: 'INEFFECTIVE',
                ineffectiveCount: 0,
                totalBrigades: 0,
                avgFatigue: 0,
                avgCohesion: 0,
                disruptedCount: 0,
                overextendedCount: 0,
                hasThreat: threatCorpsIds.has(corps.id),
                recommendationId: 'no_brigades',
                recommendation: 'No brigades assigned',
            });
            continue;
        }

        const ineffectiveCount = corpsBrigades.filter(b => (b.personnel ?? 0) < PERSONNEL_INEFFECTIVE).length;
        const ineffPct = ineffectiveCount / corpsBrigades.length;
        const avgFatigue = averageReported(corpsBrigades.map(b => b.fatigue));
        const avgCohesion = averageReported(corpsBrigades.map(b => b.cohesion));
        const disruptedCount = corpsBrigades.filter(b => (b.disrupted_turns ?? 0) > 0).length;
        const overextendedCount = corpsBrigades.filter(b => (b.homeHops ?? 0) >= 7).length;

        const activeOp = operations.find(op =>
            op.corps_id === corps.id && op.phase === 'execution',
        );
        const hasThreat = threatCorpsIds.has(corps.id);

        const grade = computeReadinessGrade(ineffPct, avgFatigue ?? 0, avgCohesion ?? 100, disruptedCount);
        const recommendationId = getRecommendationId(grade, hasThreat, !!activeOp);

        result.push({
            corpsId: corps.id,
            corpsName: getPlayerSafeCorpsName(corps.name, corps.id),
            grade,
            ineffectiveCount,
            totalBrigades: corpsBrigades.length,
            avgFatigue: avgFatigue == null ? null : Math.round(avgFatigue * 10) / 10,
            avgCohesion: avgCohesion == null ? null : Math.round(avgCohesion),
            disruptedCount,
            overextendedCount,
            activeOpName: activeOp?.name,
            activeOpBrigadeCount: activeOp?.participating_brigade_ids?.length,
            hasThreat,
            recommendationId,
            recommendation: t(RECOMMENDATION_LABEL_KEYS[recommendationId]),
        });
    }

    return result;
}

// ── Component ────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<ReadinessGrade, string> = {
    'COMBAT READY': 'text-emerald-400',
    'ADEQUATE': 'text-text-primary',
    'STRAINED': 'text-amber-400',
    'DEGRADED': 'text-red-400',
    'INEFFECTIVE': 'text-red-500',
};

const GRADE_BORDERS: Record<ReadinessGrade, string> = {
    'COMBAT READY': 'border-emerald-500/40',
    'ADEQUATE': 'border-panel-border/50',
    'STRAINED': 'border-amber-500/40',
    'DEGRADED': 'border-red-500/40',
    'INEFFECTIVE': 'border-red-600/60',
};

export const READINESS_GRADE_LABEL_KEYS: Record<ReadinessGrade, MessageKey> = {
    'COMBAT READY': 'forceReadiness.grade.combatReady',
    'ADEQUATE': 'forceReadiness.grade.adequate',
    'STRAINED': 'forceReadiness.grade.strained',
    'DEGRADED': 'forceReadiness.grade.degraded',
    'INEFFECTIVE': 'forceReadiness.grade.ineffective',
};

const RECOMMENDATION_LABEL_KEYS: Record<ForceReadinessRecommendationId, MessageKey> = {
    reorganize_immediately: 'forceReadiness.recommendation.reorganizeImmediately',
    reorganize_two_turns: 'forceReadiness.recommendation.reorganizeTwoTurns',
    reinforce_threat: 'forceReadiness.recommendation.reinforceThreat',
    reinforce_front: 'forceReadiness.recommendation.reinforceFront',
    hold_operation: 'forceReadiness.recommendation.holdOperation',
    reduce_tempo: 'forceReadiness.recommendation.reduceTempo',
    hold: 'forceReadiness.recommendation.hold',
    no_brigades: 'forceReadiness.recommendation.noBrigades',
};

const LEGACY_RECOMMENDATION_IDS: Record<string, ForceReadinessRecommendationId> = {
    'Reorganize immediately': 'reorganize_immediately',
    'Reorganize for 2 turns': 'reorganize_two_turns',
    'Reinforce: threat detected': 'reinforce_threat',
    'Reinforce front sectors': 'reinforce_front',
    'Hold: operation in progress': 'hold_operation',
    'Reduce operations tempo': 'reduce_tempo',
    Hold: 'hold',
    'No brigades assigned': 'no_brigades',
};

export function readinessGradeLabel(grade: ReadinessGrade): string {
    return t(READINESS_GRADE_LABEL_KEYS[grade]);
}

function recommendationLabel(item: CorpsReadiness): string {
    const recommendationId = item.recommendationId ?? LEGACY_RECOMMENDATION_IDS[item.recommendation];
    if (recommendationId) return t(RECOMMENDATION_LABEL_KEYS[recommendationId]);
    return t('forceReadiness.recommendation.recorded', { recommendation: item.recommendation });
}

function fatigueLabel(item: CorpsReadiness): string {
    if (item.avgFatigue == null) return t('forceReadiness.fatigueUnreported');
    return t('forceReadiness.fatigue', { value: item.avgFatigue, max: FATIGUE_MAX });
}

interface ForceReadinessProps {
    items: CorpsReadiness[];
    onCorpsClick?: (corpsId: string) => void;
}

export function ForceReadiness({ items, onCorpsClick }: ForceReadinessProps) {
    if (items.length === 0) return null;

    return (
        <div className="bg-panel-card border border-panel-border rounded p-4 mb-4">
            <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-3 pb-2 border-b border-panel-border">
                {t('forceReadiness.title')}
            </div>
            <div className="space-y-1">
                {items.map(item => (
                    <div
                        key={item.corpsId}
                        className={`flex items-start justify-between gap-3 border-l-2 ${GRADE_BORDERS[item.grade]} pl-2 py-1`}
                    >
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] leading-snug flex items-center gap-2">
                                <span className="text-text-primary font-bold">{item.corpsName}</span>
                                <span className="text-[10px] text-text-secondary">—</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${GRADE_COLORS[item.grade]}`}>
                                    {readinessGradeLabel(item.grade)}
                                </span>
                                {item.hasThreat && (
                                    <span className="text-[9px] text-red-400 font-bold animate-pulse tracking-widest">
                                        {t('forceReadiness.incoming')}
                                    </span>
                                )}
                            </div>
                            <div className="text-[11px] text-text-secondary leading-snug flex flex-wrap gap-x-3">
                                {item.ineffectiveCount > 0 && (
                                    <span>{t('forceReadiness.ineffectiveCount', { count: item.ineffectiveCount })}</span>
                                )}
                                <span>{fatigueLabel(item)}</span>
                                {item.disruptedCount > 0 && (
                                    <span>{t('forceReadiness.disruptedCount', { count: item.disruptedCount })}</span>
                                )}
                                {item.overextendedCount > 0 && (
                                    <span>{t('forceReadiness.overextendedCount', { count: item.overextendedCount })}</span>
                                )}
                                {item.activeOpName && (
                                    <span className="text-red-400">
                                        {item.activeOpBrigadeCount
                                            ? t('forceReadiness.activeOperationWithBrigades', { name: item.activeOpName, count: item.activeOpBrigadeCount })
                                            : t('forceReadiness.activeOperation', { name: item.activeOpName })}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-text-secondary/60 italic">{recommendationLabel(item)}</span>
                            {onCorpsClick && (
                                <button
                                    type="button"
                                    onClick={() => onCorpsClick(item.corpsId)}
                                    className="text-amber-400 hover:underline cursor-pointer text-[11px] whitespace-nowrap"
                                >
                                    {t('forceReadiness.openCorps')}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
