import { useEffect, useMemo, useState } from 'react';
import { buildTurnAftermathCampaignCost, buildTurnAftermathCampaignPulse, buildTurnAftermathLedgerSummary, buildTurnAftermathRecordViews, filterTurnAftermathRecords, type TurnAftermathCampaignMomentum, type TurnAftermathCostSeverity, type TurnAftermathRecordFilter, type TurnAftermathSignalKind, type TurnAftermathTone, type TurnAftermathView } from '../../data/turnAftermath';
import { getDecisionSurfaceForInboxType, type DecisionSurfaceFamilyId } from '../../data/decisionSurfaceRegistry';
import { useGameStore } from '../../store/gameStore';
import { t, type MessageKey } from '../../i18n';

const RECORD_FILTERS: Array<{ id: TurnAftermathRecordFilter; labelKey: MessageKey }> = [
    { id: 'all', labelKey: 'records.filter.all' },
    { id: 'hard', labelKey: 'records.filter.hard' },
    { id: 'signals', labelKey: 'records.filter.signals' },
    { id: 'actions', labelKey: 'records.filter.actions' },
    { id: 'territory', labelKey: 'records.filter.territory' },
];

function formatSigned(value: number): string {
    if (value > 0) return `+${value}`;
    return String(value);
}

function formatRatio(value: number | null): string {
    if (value == null) return '-';
    return value.toFixed(2);
}

function toneClass(tone: TurnAftermathView['tone']): string {
    if (tone === 'gain') return 'border-emerald-400/35 text-emerald-300 bg-emerald-400/10';
    if (tone === 'loss') return 'border-red-400/35 text-red-300 bg-red-400/10';
    if (tone === 'mixed') return 'border-amber-400/35 text-amber-300 bg-amber-400/10';
    return 'border-neutral-500/35 text-text-secondary bg-neutral-500/10';
}

function costClass(severity: TurnAftermathView['cost']['severity']): string {
    if (severity === 'critical') return 'border-red-400/35 text-red-300 bg-red-400/10';
    if (severity === 'severe') return 'border-amber-400/35 text-amber-300 bg-amber-400/10';
    if (severity === 'moderate') return 'border-sky-400/35 text-sky-300 bg-sky-400/10';
    return 'border-neutral-500/35 text-text-secondary bg-neutral-500/10';
}

function momentumClass(momentum: ReturnType<typeof buildTurnAftermathCampaignPulse>['momentum']): string {
    if (momentum === 'advancing') return 'border-emerald-400/35 text-emerald-300 bg-emerald-400/10';
    if (momentum === 'bleeding') return 'border-red-400/35 text-red-300 bg-red-400/10';
    if (momentum === 'contested') return 'border-amber-400/35 text-amber-300 bg-amber-400/10';
    return 'border-neutral-500/35 text-text-secondary bg-neutral-500/10';
}

function signalClass(severity: TurnAftermathView['signals'][number]['severity']): string {
    if (severity === 'urgent') return 'border-red-400/35 text-red-300 bg-red-400/10';
    if (severity === 'notable') return 'border-amber-400/35 text-amber-300 bg-amber-400/10';
    return 'border-panel-border/50 text-text-secondary bg-black/10';
}

const TONE_LABEL_KEYS = {
    gain: 'turnAftermath.tone.gain',
    loss: 'turnAftermath.tone.loss',
    mixed: 'turnAftermath.tone.mixed',
    quiet: 'turnAftermath.tone.quiet',
} satisfies Record<TurnAftermathTone, MessageKey>;

const COST_SEVERITY_LABEL_KEYS = {
    low: 'turnAftermath.severity.low',
    moderate: 'turnAftermath.severity.moderate',
    severe: 'turnAftermath.severity.severe',
    critical: 'turnAftermath.severity.critical',
} satisfies Record<TurnAftermathCostSeverity, MessageKey>;

const SIGNAL_KIND_LABEL_KEYS = {
    event: 'turnAftermath.signal.kind.event',
    decoration: 'turnAftermath.signal.kind.decoration',
    arc: 'turnAftermath.signal.kind.arc',
    supply: 'turnAftermath.signal.kind.supply',
    movement: 'turnAftermath.signal.kind.movement',
} satisfies Record<TurnAftermathSignalKind, MessageKey>;

const DIRECTION_LABEL_KEYS = {
    gain: 'turnAftermath.direction.gain',
    loss: 'turnAftermath.direction.loss',
    other: 'turnAftermath.direction.other',
} satisfies Record<TurnAftermathView['territory']['notable'][number]['direction'], MessageKey>;

const MOMENTUM_LABEL_KEYS = {
    advancing: 'turnAftermath.momentum.advancing',
    contested: 'turnAftermath.momentum.contested',
    bleeding: 'turnAftermath.momentum.bleeding',
    quiet: 'turnAftermath.momentum.quiet',
} satisfies Record<TurnAftermathCampaignMomentum, MessageKey>;

const ACTION_TYPE_LABEL_KEYS = {
    event_decision: 'records.actionType.event_decision',
    peace_plan: 'records.actionType.peace_plan',
    dayton_negotiation: 'records.actionType.dayton_negotiation',
    paramilitary_request: 'records.actionType.paramilitary_request',
    convoy_decision: 'records.actionType.convoy_decision',
    reserve_request: 'records.actionType.reserve_request',
    officer_event: 'records.actionType.officer_event',
    autonomy_proposal: 'records.actionType.autonomy_proposal',
    operation_opportunity: 'records.actionType.operation_opportunity',
    counter_offer: 'records.actionType.counter_offer',
    intelligence_notification: 'records.actionType.intelligence_notification',
    situation: 'records.actionType.situation',
} satisfies Record<DecisionSurfaceFamilyId, MessageKey>;

function toneLabel(tone: TurnAftermathTone): string {
    return t(TONE_LABEL_KEYS[tone]);
}

function costSeverityLabel(severity: TurnAftermathCostSeverity): string {
    return t(COST_SEVERITY_LABEL_KEYS[severity]);
}

function signalKindLabel(kind: TurnAftermathSignalKind): string {
    return t(SIGNAL_KIND_LABEL_KEYS[kind]);
}

function directionLabel(direction: TurnAftermathView['territory']['notable'][number]['direction']): string {
    return t(DIRECTION_LABEL_KEYS[direction]);
}

function momentumLabel(momentum: TurnAftermathCampaignMomentum): string {
    return t(MOMENTUM_LABEL_KEYS[momentum]);
}

function actionTypeLabel(type: TurnAftermathView['nextActions']['topItems'][number]['type']): string {
    const surface = getDecisionSurfaceForInboxType(type);
    if (!surface) return t('records.actionType.reviewItem');
    return t(ACTION_TYPE_LABEL_KEYS[surface.familyId]);
}

function RecordMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded border border-panel-border/50 bg-panel-bg/50 px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">{label}</div>
            <div className="text-[13px] font-bold tabular-nums text-text-primary">{value}</div>
            <div className="truncate text-[9px] text-text-secondary">{detail}</div>
        </div>
    );
}

function TurnAftermathRecordCard({ view, isLatest, isFocused }: { view: TurnAftermathView; isLatest: boolean; isFocused: boolean }) {
    const firstFlip = view.territory.notable[0] ?? null;
    const firstAction = isLatest ? (view.nextActions.topItems[0] ?? null) : null;
    const signalPreview = view.signals.slice(0, 3);

    return (
        <article
            data-focused-aftermath-turn={isFocused ? view.turn : undefined}
            className={[
                'rounded border px-3 py-2 transition-colors',
                isFocused
                    ? 'border-amber-300/70 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.18)]'
                    : 'border-panel-border/50 bg-panel-card/50',
            ].join(' ')}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[12px] font-bold text-text-primary">{view.dateLabel}</div>
                        <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${toneClass(view.tone)}`}>
                            {toneLabel(view.tone)}
                        </span>
                        <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${costClass(view.cost.severity)}`}>
                            {t('records.costSeverity', { severity: costSeverityLabel(view.cost.severity) })}
                        </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-text-secondary">{view.headline}</div>
                    <div className="mt-1 text-[11px] leading-5 text-text-primary/80">{view.narrativeLine}</div>
                </div>
                <div className="shrink-0 text-right">
                    <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">{t('records.metric.filing')}</div>
                    <div className="text-[13px] font-bold tabular-nums text-text-primary">{view.dateLabel}</div>
                </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <RecordMetric
                    label={t('aar.section.territory')}
                    value={formatSigned(view.territory.friendlyNet)}
                    detail={t('records.detail.territoryDelta', { gains: view.territory.gains, losses: view.territory.losses })}
                />
                <RecordMetric
                    label={t('combatRecord.battles')}
                    value={String(view.combat.friendlyBattleCount)}
                    detail={t('records.detail.theaterWide', { count: view.combat.battleCount })}
                />
                <RecordMetric
                    label={t('records.metric.cost')}
                    value={String(view.cost.friendlyMilitaryCasualties)}
                    detail={t('records.detail.displaced', { count: view.cost.displacedThisTurn })}
                />
                <RecordMetric
                    label={isLatest ? t('records.metric.desk') : t('records.metric.archive')}
                    value={isLatest ? String(view.nextActions.actionableCount) : '-'}
                    detail={isLatest ? t('records.detail.blocking', { count: view.nextActions.blockingCount }) : t('records.detail.closedTurn')}
                />
            </div>

            {signalPreview.length > 0 && (
                <div className="mt-2 rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                    <div className="mb-1 text-[8px] uppercase tracking-[0.14em] text-text-muted">{t('records.strategicSignals')}</div>
                    <div className="grid gap-1.5 md:grid-cols-3">
                        {signalPreview.map((signal) => (
                            <div key={signal.id} className={`min-w-0 rounded border px-2 py-1 ${signalClass(signal.severity)}`}>
                                <div className="truncate text-[10px] font-semibold">{signal.label}</div>
                                <div className="truncate text-[8px] uppercase tracking-[0.1em] opacity-75">{signalKindLabel(signal.kind)} / {signal.detail}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(firstFlip || firstAction) && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {firstFlip && (
                        <div className="rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                            <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">{t('records.leadTerritorialNote')}</div>
                            <div className="truncate text-[11px] font-semibold text-text-primary">{firstFlip.label}</div>
                            <div className="text-[9px] uppercase tracking-[0.1em] text-text-secondary">{directionLabel(firstFlip.direction)}</div>
                        </div>
                    )}
                    {firstAction && (
                        <div className="rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                            <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">{t('records.leadDeskItem')}</div>
                            <div className="truncate text-[11px] font-semibold text-text-primary">{firstAction.title}</div>
                            <div className="text-[9px] uppercase tracking-[0.1em] text-text-secondary">{actionTypeLabel(firstAction.type)}</div>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

export function TurnAftermathRecordsPanel() {
    const [filter, setFilter] = useState<TurnAftermathRecordFilter>('all');
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);
    const focusedAftermathTurn = useGameStore((s) => s.focusedAftermathTurn);

    const records = useMemo(
        () => buildTurnAftermathRecordViews({ state, osidNameMap, limit: focusedAftermathTurn == null ? 18 : 1000 }),
        [state, osidNameMap, focusedAftermathTurn],
    );

    useEffect(() => {
        if (focusedAftermathTurn != null) setFilter('all');
    }, [focusedAftermathTurn]);

    const visibleRecords = useMemo(
        () => filterTurnAftermathRecords(records, filter),
        [records, filter],
    );

    useEffect(() => {
        if (focusedAftermathTurn == null || typeof document === 'undefined') return;
        const el = document.querySelector(`[data-focused-aftermath-turn="${focusedAftermathTurn}"]`);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [focusedAftermathTurn, visibleRecords.length]);
    const summary = useMemo(
        () => buildTurnAftermathLedgerSummary(visibleRecords),
        [visibleRecords],
    );
    const pulse = useMemo(
        () => buildTurnAftermathCampaignPulse(visibleRecords),
        [visibleRecords],
    );
    const campaignCost = useMemo(
        () => buildTurnAftermathCampaignCost({ state, osidNameMap }),
        [state, osidNameMap],
    );

    if (records.length === 0) {
        return (
            <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-4 text-[11px] text-text-secondary">
                {t('records.emptyCampaign')}
            </div>
        );
    }

    const latest = records[0];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
                {RECORD_FILTERS.map((option) => {
                    const count = filterTurnAftermathRecords(records, option.id).length;
                    const active = filter === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setFilter(option.id)}
                            className={`rounded border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] transition ${
                                active
                                    ? 'border-amber-400/35 bg-amber-400/15 text-amber-300'
                                    : 'border-panel-border/60 bg-panel-card/60 text-text-secondary hover:border-white/20 hover:text-text-primary'
                            }`}
                        >
                            {t(option.labelKey)} <span className="ml-1 tabular-nums opacity-75">{count}</span>
                        </button>
                    );
                })}
            </div>

            <section className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('records.campaignPulse')}</div>
                        <div className="mt-0.5 text-[12px] font-semibold text-text-primary">{pulse.windowLabel}</div>
                        <div className="mt-1 max-w-3xl text-[11px] text-text-secondary">{pulse.briefing}</div>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${momentumClass(pulse.momentum)}`}>
                        {momentumLabel(pulse.momentum)}
                    </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <RecordMetric label={t('records.filter.signals')} value={String(pulse.signalCount)} detail={t('records.detail.events', { count: pulse.eventCount })} />
                    <RecordMetric label={t('records.metric.decorations')} value={String(pulse.decorationCount)} detail={t('records.detail.archiveWindow')} />
                    <RecordMetric label={t('records.filter.hard')} value={String(pulse.hardTurnCount)} detail={t('records.detail.severeCritical')} />
                    <RecordMetric label={t('records.metric.theaterCost')} value={String(pulse.totalTheaterMilitaryCasualties)} detail={t('records.detail.displaced', { count: pulse.totalDisplaced })} />
                </div>
            </section>

            <section className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2" data-testid="campaign-cost-spine">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('records.campaignCostSoFar')}</div>
                        <div className="mt-0.5 text-[12px] font-semibold text-text-primary">{campaignCost.headline}</div>
                        <div className="mt-1 max-w-3xl text-[11px] text-text-secondary">{campaignCost.briefing}</div>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${costClass(campaignCost.severity)}`}>
                        {costSeverityLabel(campaignCost.severity)}
                    </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                    <RecordMetric label={t('records.metric.window')} value={String(campaignCost.recordCount)} detail={campaignCost.windowLabel} />
                    <RecordMetric label={t('records.metric.friendlyCost')} value={String(campaignCost.totalFriendlyMilitaryCasualties)} detail={t('records.detail.perTurn', { count: campaignCost.averageFriendlyMilitaryCasualties.toFixed(1) })} />
                    <RecordMetric label={t('records.metric.exchange')} value={formatRatio(campaignCost.casualtyExchangeRatio)} detail={t('records.detail.opposing', { count: campaignCost.totalOpposingMilitaryCasualties })} />
                    <RecordMetric label={t('warSummary.label.displaced')} value={String(campaignCost.totalDisplaced)} detail={t('records.detail.archivedTurns')} />
                    <RecordMetric label={t('records.metric.lostFormations')} value={String(campaignCost.totalOwnFormationsDestroyed)} detail={t('records.detail.hardTurns', { count: campaignCost.hardTurnCount })} />
                    <RecordMetric label={t('records.metric.netOsids')} value={formatSigned(campaignCost.netFriendlyTerritory)} detail={t('records.detail.theaterCasualties', { count: campaignCost.totalTheaterMilitaryCasualties })} />
                </div>
                {(campaignCost.topDrivers.length > 0 || campaignCost.mostCostlyTurn) && (
                    <div className="mt-2 grid gap-2 lg:grid-cols-[1.2fr_0.8fr]">
                        {campaignCost.topDrivers.length > 0 && (
                            <div className="rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                                <div className="mb-1 text-[8px] uppercase tracking-[0.14em] text-text-muted">{t('records.costDrivers')}</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {campaignCost.topDrivers.map((driver) => (
                                        <span key={driver} className="rounded border border-panel-border/60 bg-panel-bg/60 px-2 py-1 text-[9px] text-text-secondary">
                                            {driver}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {campaignCost.mostCostlyTurn && (
                            <div className="rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                                <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">{t('records.costliestTurn')}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold text-text-primary">{campaignCost.mostCostlyTurn.dateLabel}</span>
                                    <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${costClass(campaignCost.mostCostlyTurn.severity)}`}>
                                        {costSeverityLabel(campaignCost.mostCostlyTurn.severity)}
                                    </span>
                                </div>
                                <div className="mt-1 text-[9px] text-text-secondary">
                                    {t('records.detail.casualtiesDisplacedFormations', {
                                        casualties: campaignCost.mostCostlyTurn.friendlyMilitaryCasualties,
                                        displaced: campaignCost.mostCostlyTurn.displacedThisTurn,
                                        formations: campaignCost.mostCostlyTurn.ownFormationsDestroyed,
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('records.metric.archive')}</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{summary.recordCount}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('records.metric.netTerritory')}</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{formatSigned(summary.netFriendlyTerritory)}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('situation.casualties')}</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{summary.totalFriendlyMilitaryCasualties}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('warSummary.label.displaced')}</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{summary.totalDisplaced}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('records.metric.lostFormations')}</div>
                    <div className="text-[16px] font-bold tabular-nums text-red-300">{summary.totalOwnFormationsDestroyed}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">{t('records.filter.hard')}</div>
                    <div className="text-[16px] font-bold tabular-nums text-amber-300">{summary.criticalTurns + summary.severeTurns}</div>
                </div>
            </div>

            <div className="space-y-2">
                {visibleRecords.length === 0 ? (
                    <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-4 text-[11px] text-text-secondary">
                        {t('records.noFilterMatches')}
                    </div>
                ) : visibleRecords.map((record) => (
                    <TurnAftermathRecordCard
                        key={record.turn}
                        view={record}
                        isLatest={record.turn === latest.turn}
                        isFocused={record.turn === focusedAftermathTurn}
                    />
                ))}
            </div>
        </div>
    );
}
