/**
 * ForceReadiness — per-corps readiness assessment for Army HQ Nerve Center.
 *
 * Grades each corps from COMBAT READY to INEFFECTIVE based on brigade-level
 * health metrics (personnel, fatigue, cohesion, disruption).
 * All data comes from formations already in LoadedGameState — no adapter changes.
 */
import type { FormationView, OperationView } from '../../data/types';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';
import { t, type MessageKey } from '../../i18n';

// ── Types ────────────────────────────────────────────────────────────────

export type ReadinessGrade = 'COMBAT READY' | 'ADEQUATE' | 'STRAINED' | 'DEGRADED' | 'INEFFECTIVE';

export interface CorpsReadiness {
    corpsId: string;
    corpsName: string;
    grade: ReadinessGrade;
    ineffectiveCount: number;
    totalBrigades: number;
    avgFatigue: number;
    avgCohesion: number;
    disruptedCount: number;
    overextendedCount: number;  // brigades far from home
    activeOpName?: string;
    activeOpBrigadeCount?: number;
    hasThreat: boolean;
    recommendation: string;
}

// ── Pure computation ─────────────────────────────────────────────────────

const PERSONNEL_INEFFECTIVE = 400;
const FATIGUE_MAX = 30;

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

function getRecommendation(grade: ReadinessGrade, hasThreat: boolean, hasActiveOp: boolean): string {
    if (grade === 'INEFFECTIVE') return 'Reorganize immediately';
    if (grade === 'DEGRADED' && !hasThreat) return 'Reorganize for 2 turns';
    if (grade === 'DEGRADED' && hasThreat) return 'Reinforce: threat detected';
    if (hasThreat) return 'Reinforce front sectors';
    if (hasActiveOp) return 'Hold: operation in progress';
    if (grade === 'STRAINED') return 'Reduce operations tempo';
    return 'Hold';
}

export function generateForceReadiness(
    formations: FormationView[],
    operations: OperationView[],
    faction: string,
    threatCorpsIds: Set<string>,
): CorpsReadiness[] {
    const brigades = formations.filter(f =>
        f.kind === 'brigade' && f.status === 'active' && f.faction === faction,
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
                recommendation: 'No brigades assigned',
            });
            continue;
        }

        const ineffectiveCount = corpsBrigades.filter(b => (b.personnel ?? 0) < PERSONNEL_INEFFECTIVE).length;
        const ineffPct = ineffectiveCount / corpsBrigades.length;
        const avgFatigue = corpsBrigades.reduce((s, b) => s + (b.fatigue ?? 0), 0) / corpsBrigades.length;
        const avgCohesion = corpsBrigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / corpsBrigades.length;
        const disruptedCount = corpsBrigades.filter(b => (b.disrupted_turns ?? 0) > 0).length;
        const overextendedCount = corpsBrigades.filter(b => (b.homeHops ?? 0) >= 7).length;

        const activeOp = operations.find(op =>
            op.corps_id === corps.id && op.phase === 'execution',
        );
        const hasThreat = threatCorpsIds.has(corps.id);

        const grade = computeReadinessGrade(ineffPct, avgFatigue, avgCohesion, disruptedCount);
        const recommendation = getRecommendation(grade, hasThreat, !!activeOp);

        result.push({
            corpsId: corps.id,
            corpsName: getPlayerSafeCorpsName(corps.name, corps.id),
            grade,
            ineffectiveCount,
            totalBrigades: corpsBrigades.length,
            avgFatigue: Math.round(avgFatigue * 10) / 10,
            avgCohesion: Math.round(avgCohesion),
            disruptedCount,
            overextendedCount,
            activeOpName: activeOp?.name,
            activeOpBrigadeCount: activeOp?.participating_brigade_ids?.length,
            hasThreat,
            recommendation,
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

const RECOMMENDATION_LABEL_KEYS: Record<string, MessageKey> = {
    'Reorganize immediately': 'forceReadiness.recommendation.reorganizeImmediately',
    'Reorganize for 2 turns': 'forceReadiness.recommendation.reorganizeTwoTurns',
    'Reinforce: threat detected': 'forceReadiness.recommendation.reinforceThreat',
    'Reinforce front sectors': 'forceReadiness.recommendation.reinforceFront',
    'Hold: operation in progress': 'forceReadiness.recommendation.holdOperation',
    'Reduce operations tempo': 'forceReadiness.recommendation.reduceTempo',
    'Hold': 'forceReadiness.recommendation.hold',
    'No brigades assigned': 'forceReadiness.recommendation.noBrigades',
};

export function readinessGradeLabel(grade: ReadinessGrade): string {
    return t(READINESS_GRADE_LABEL_KEYS[grade]);
}

function recommendationLabel(recommendation: string): string {
    return t(RECOMMENDATION_LABEL_KEYS[recommendation] ?? 'forceReadiness.recommendation.recorded', { recommendation });
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
                                <span>{t('forceReadiness.fatigue', { value: item.avgFatigue, max: FATIGUE_MAX })}</span>
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
                            <span className="text-[10px] text-text-secondary/60 italic">{recommendationLabel(item.recommendation)}</span>
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
