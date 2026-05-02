import { useMemo, useState } from 'react';
import { buildTurnAftermathCampaignCost, buildTurnAftermathCampaignPulse, buildTurnAftermathLedgerSummary, buildTurnAftermathRecordViews, filterTurnAftermathRecords, type TurnAftermathRecordFilter, type TurnAftermathView } from '../../data/turnAftermath';
import { useGameStore } from '../../store/gameStore';

const RECORD_FILTERS: Array<{ id: TurnAftermathRecordFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'hard', label: 'Hard turns' },
    { id: 'signals', label: 'Signals' },
    { id: 'actions', label: 'Actions' },
    { id: 'territory', label: 'Territory' },
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

function RecordMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded border border-panel-border/50 bg-panel-bg/50 px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">{label}</div>
            <div className="text-[13px] font-bold tabular-nums text-text-primary">{value}</div>
            <div className="truncate text-[9px] text-text-secondary">{detail}</div>
        </div>
    );
}

function TurnAftermathRecordCard({ view, isLatest }: { view: TurnAftermathView; isLatest: boolean }) {
    const firstFlip = view.territory.notable[0] ?? null;
    const firstAction = isLatest ? (view.nextActions.topItems[0] ?? null) : null;
    const signalPreview = view.signals.slice(0, 3);

    return (
        <article className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[12px] font-bold text-text-primary">{view.dateLabel}</div>
                        <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${toneClass(view.tone)}`}>
                            {view.tone}
                        </span>
                        <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${costClass(view.cost.severity)}`}>
                            Cost {view.cost.severity}
                        </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-text-secondary">{view.headline}</div>
                </div>
                <div className="shrink-0 text-right">
                    <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">Turn</div>
                    <div className="text-[13px] font-bold tabular-nums text-text-primary">{view.turn}</div>
                </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <RecordMetric
                    label="Territory"
                    value={formatSigned(view.territory.friendlyNet)}
                    detail={`${view.territory.gains} gained / ${view.territory.losses} lost`}
                />
                <RecordMetric
                    label="Battles"
                    value={String(view.combat.friendlyBattleCount)}
                    detail={`${view.combat.battleCount} theater-wide`}
                />
                <RecordMetric
                    label="Cost"
                    value={String(view.cost.friendlyMilitaryCasualties)}
                    detail={`${view.cost.displacedThisTurn} displaced`}
                />
                <RecordMetric
                    label={isLatest ? 'Desk' : 'Archive'}
                    value={isLatest ? String(view.nextActions.actionableCount) : '-'}
                    detail={isLatest ? `${view.nextActions.blockingCount} blocking` : 'Closed turn'}
                />
            </div>

            {signalPreview.length > 0 && (
                <div className="mt-2 rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                    <div className="mb-1 text-[8px] uppercase tracking-[0.14em] text-text-muted">Strategic signals</div>
                    <div className="grid gap-1.5 md:grid-cols-3">
                        {signalPreview.map((signal) => (
                            <div key={signal.id} className={`min-w-0 rounded border px-2 py-1 ${signalClass(signal.severity)}`}>
                                <div className="truncate text-[10px] font-semibold">{signal.label}</div>
                                <div className="truncate text-[8px] uppercase tracking-[0.1em] opacity-75">{signal.kind} / {signal.detail}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(firstFlip || firstAction) && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {firstFlip && (
                        <div className="rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                            <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">Lead territorial note</div>
                            <div className="truncate text-[11px] font-semibold text-text-primary">{firstFlip.label}</div>
                            <div className="text-[9px] uppercase tracking-[0.1em] text-text-secondary">{firstFlip.direction}</div>
                        </div>
                    )}
                    {firstAction && (
                        <div className="rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                            <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">Lead desk item</div>
                            <div className="truncate text-[11px] font-semibold text-text-primary">{firstAction.title}</div>
                            <div className="text-[9px] uppercase tracking-[0.1em] text-text-secondary">{firstAction.type.replace(/_/g, ' ')}</div>
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

    const records = useMemo(
        () => buildTurnAftermathRecordViews({ state, osidNameMap, limit: 18 }),
        [state, osidNameMap],
    );
    const visibleRecords = useMemo(
        () => filterTurnAftermathRecords(records, filter),
        [records, filter],
    );
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
                No turn aftermath records have been written for this campaign yet.
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
                            {option.label} <span className="ml-1 tabular-nums opacity-75">{count}</span>
                        </button>
                    );
                })}
            </div>

            <section className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Campaign pulse</div>
                        <div className="mt-0.5 text-[12px] font-semibold text-text-primary">{pulse.windowLabel}</div>
                        <div className="mt-1 max-w-3xl text-[11px] text-text-secondary">{pulse.briefing}</div>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${momentumClass(pulse.momentum)}`}>
                        {pulse.momentum}
                    </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <RecordMetric label="Signals" value={String(pulse.signalCount)} detail={`${pulse.eventCount} events`} />
                    <RecordMetric label="Decorations" value={String(pulse.decorationCount)} detail="Archive window" />
                    <RecordMetric label="Hard Turns" value={String(pulse.hardTurnCount)} detail="Severe / critical" />
                    <RecordMetric label="Theater Cost" value={String(pulse.totalTheaterMilitaryCasualties)} detail={`${pulse.totalDisplaced} displaced`} />
                </div>
            </section>

            <section className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2" data-testid="campaign-cost-spine">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Campaign cost so far</div>
                        <div className="mt-0.5 text-[12px] font-semibold text-text-primary">{campaignCost.headline}</div>
                        <div className="mt-1 max-w-3xl text-[11px] text-text-secondary">{campaignCost.briefing}</div>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${costClass(campaignCost.severity)}`}>
                        {campaignCost.severity}
                    </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                    <RecordMetric label="Window" value={String(campaignCost.recordCount)} detail={campaignCost.windowLabel} />
                    <RecordMetric label="Friendly Cost" value={String(campaignCost.totalFriendlyMilitaryCasualties)} detail={`${campaignCost.averageFriendlyMilitaryCasualties.toFixed(1)} per turn`} />
                    <RecordMetric label="Exchange" value={formatRatio(campaignCost.casualtyExchangeRatio)} detail={`${campaignCost.totalOpposingMilitaryCasualties} opposing`} />
                    <RecordMetric label="Displaced" value={String(campaignCost.totalDisplaced)} detail="Archived turns" />
                    <RecordMetric label="Lost Formations" value={String(campaignCost.totalOwnFormationsDestroyed)} detail={`${campaignCost.hardTurnCount} hard turns`} />
                    <RecordMetric label="Net OSIDs" value={formatSigned(campaignCost.netFriendlyTerritory)} detail={`${campaignCost.totalTheaterMilitaryCasualties} theater casualties`} />
                </div>
                {(campaignCost.topDrivers.length > 0 || campaignCost.mostCostlyTurn) && (
                    <div className="mt-2 grid gap-2 lg:grid-cols-[1.2fr_0.8fr]">
                        {campaignCost.topDrivers.length > 0 && (
                            <div className="rounded border border-panel-border/40 bg-black/10 px-2 py-1.5">
                                <div className="mb-1 text-[8px] uppercase tracking-[0.14em] text-text-muted">Cost drivers</div>
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
                                <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">Costliest turn</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold text-text-primary">{campaignCost.mostCostlyTurn.dateLabel}</span>
                                    <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] ${costClass(campaignCost.mostCostlyTurn.severity)}`}>
                                        {campaignCost.mostCostlyTurn.severity}
                                    </span>
                                </div>
                                <div className="mt-1 text-[9px] text-text-secondary">
                                    {campaignCost.mostCostlyTurn.friendlyMilitaryCasualties} casualties / {campaignCost.mostCostlyTurn.displacedThisTurn} displaced / {campaignCost.mostCostlyTurn.ownFormationsDestroyed} formations
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Archive</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{summary.recordCount}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Net Territory</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{formatSigned(summary.netFriendlyTerritory)}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Casualties</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{summary.totalFriendlyMilitaryCasualties}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Displaced</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{summary.totalDisplaced}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Lost Formations</div>
                    <div className="text-[16px] font-bold tabular-nums text-red-300">{summary.totalOwnFormationsDestroyed}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Hard Turns</div>
                    <div className="text-[16px] font-bold tabular-nums text-amber-300">{summary.criticalTurns + summary.severeTurns}</div>
                </div>
            </div>

            <div className="space-y-2">
                {visibleRecords.length === 0 ? (
                    <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-4 text-[11px] text-text-secondary">
                        No aftermath records match this review filter.
                    </div>
                ) : visibleRecords.map((record) => (
                    <TurnAftermathRecordCard key={record.turn} view={record} isLatest={record.turn === latest.turn} />
                ))}
            </div>
        </div>
    );
}
