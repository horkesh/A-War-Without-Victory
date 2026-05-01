import { useMemo } from 'react';
import { buildTurnAftermathRecordViews, type TurnAftermathView } from '../../data/turnAftermath';
import { useGameStore } from '../../store/gameStore';

function formatSigned(value: number): string {
    if (value > 0) return `+${value}`;
    return String(value);
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
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);

    const records = useMemo(
        () => buildTurnAftermathRecordViews({ state, osidNameMap, limit: 18 }),
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
            <div className="grid grid-cols-3 gap-2">
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Records</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{records.length}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Latest Net</div>
                    <div className="text-[16px] font-bold tabular-nums text-text-primary">{formatSigned(latest.territory.friendlyNet)}</div>
                </div>
                <div className="rounded border border-panel-border/50 bg-panel-card/50 px-3 py-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-text-muted">Latest Cost</div>
                    <div className={`text-[16px] font-bold uppercase ${latest.cost.severity === 'low' ? 'text-text-primary' : latest.cost.severity === 'moderate' ? 'text-sky-300' : latest.cost.severity === 'severe' ? 'text-amber-300' : 'text-red-300'}`}>
                        {latest.cost.severity}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {records.map((record) => (
                    <TurnAftermathRecordCard key={record.turn} view={record} isLatest={record.turn === latest.turn} />
                ))}
            </div>
        </div>
    );
}
