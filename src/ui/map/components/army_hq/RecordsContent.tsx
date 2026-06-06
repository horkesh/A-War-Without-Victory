/**
 * Records tab content — wraps AAR, Operation History panels,
 * and Codex (historical essays) for inline rendering inside Army HQ RECORDS tab.
 */
import { useMemo } from 'react';
import { AARPanel } from '../AARPanel';
import { OperationHistoryPanel } from '../OperationHistoryPanel';
import { useGameStore } from '../../store/gameStore';
import { OpportunityLedgerPanel } from './OpportunityLedgerPanel';
import { TurnAftermathRecordsPanel } from './TurnAftermathRecordsPanel';
import { DecisionConsequenceRecordsPanel } from './DecisionConsequenceRecordsPanel';
import { TerritoryOverTimeChart } from '../TerritoryOverTimeChart';
import { t, type MessageKey } from '../../i18n';
import { buildDecisionConsequenceLedger, buildDecisionConsequenceLedgerSummary } from '../../data/decisionConsequenceLedger';
import { buildTurnAftermathRecordViews } from '../../data/turnAftermath';

const SUB_TABS = [
    { id: 'aftermath' as const, labelKey: 'recordsContent.tab.aftermath' },
    { id: 'aar' as const, labelKey: 'recordsContent.tab.aar' },
    { id: 'ops' as const, labelKey: 'recordsContent.tab.ops' },
    { id: 'decisions' as const, labelKey: 'recordsContent.tab.decisions' },
    { id: 'opportunities' as const, labelKey: 'recordsContent.tab.opportunities' },
];

export function RecordsContent() {
    const subTab = useGameStore((s) => s.armyHQRecordsSubTab);
    const setSubTab = useGameStore((s) => s.setArmyHQRecordsSubTab);
    const setCodexOpen = useGameStore((s) => s.setCodexOpen);
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);

    const archiveCounts = useMemo(() => {
        const aftermathCount = buildTurnAftermathRecordViews({ state, osidNameMap, limit: Number.MAX_SAFE_INTEGER }).length;
        const decisionRecords = buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER);
        const decisionSummary = buildDecisionConsequenceLedgerSummary(decisionRecords);
        const aarCount = state?.latestTurnSummary ? 1 : 0;
        const operationCount = state?.operationHistory?.length ?? 0;
        const opportunityCount = (state?.operationOpportunityRecords ?? []).filter((record) =>
            record.status !== 'eligible_pending_review' || record.response_turn != null
        ).length;
        return {
            aftermath: aftermathCount,
            aar: aarCount,
            ops: operationCount,
            decisions: decisionSummary.total,
            opportunities: opportunityCount,
            decisionSummary,
        };
    }, [state, osidNameMap]);

    return (
        <div>
            {/* Territory-over-time trend chart — re-hosted from the retired
                StrategicDashboard. The War's Record surface owns the campaign
                trend; this is the player-reachable home for the chart. */}
            <div className="mb-4 rounded-md border border-panel-border bg-panel-card px-3 py-3">
                <TerritoryOverTimeChart />
            </div>

            <section className="mb-4 rounded-md border border-panel-border bg-panel-card px-3 py-3" aria-label="Records archive summary">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Archive Routes</div>
                        <div className="mt-1 text-[11px] text-text-secondary">
                            Turn aftermath, completed operations, opportunity decisions, and presidential consequences are filed here; Chronicle-filed decisions remain one click away.
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">Latest Decision</div>
                        <div className="max-w-[14rem] truncate text-[11px] text-text-primary">
                            {archiveCounts.decisionSummary.latestTitle ?? 'No filed decision yet'}
                        </div>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                    <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
                        <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">Turn Records</div>
                        <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{archiveCounts.aftermath}</div>
                    </div>
                    <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
                        <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">Operation AARs</div>
                        <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{archiveCounts.ops}</div>
                    </div>
                    <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
                        <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">Decisions</div>
                        <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{archiveCounts.decisions}</div>
                    </div>
                    <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
                        <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">Chronicle Filed</div>
                        <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{archiveCounts.decisionSummary.chronicleRouteCount}</div>
                    </div>
                    <div className="rounded border border-panel-border/60 bg-black/20 px-2 py-2">
                        <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted">Opportunities</div>
                        <div className="mt-1 text-[14px] font-bold tabular-nums text-text-primary">{archiveCounts.opportunities}</div>
                    </div>
                </div>
            </section>

            {/* Sub-tab selector */}
            <div className="flex gap-1.5 mb-4">
                {SUB_TABS.map(({ id, labelKey }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setSubTab(id)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-md border transition-all ${
                            subTab === id
                                ? 'bg-amber-400/15 border-amber-400/30 text-amber-400'
                                : 'bg-panel-card border-panel-border text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                    >
                        {t(labelKey as MessageKey)}
                        <span className="ml-1 tabular-nums opacity-70">{archiveCounts[id]}</span>
                    </button>
                ))}
            </div>

            <div className="mb-4 rounded-md border border-panel-border bg-panel-card px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">{t('codex.title')}</div>
                <div className="mt-1 text-[11px] text-text-secondary">
                    {t('recordsContent.codexHelp')}
                </div>
                <button
                    type="button"
                    onClick={() => setCodexOpen(true)}
                    className="mt-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-md border border-panel-border bg-panel-card text-text-secondary transition-all hover:text-text-primary hover:bg-white/5"
                >
                    {t('recordsContent.openCodex')}
                </button>
            </div>

            {/* Content */}
            {subTab === 'aftermath' && <TurnAftermathRecordsPanel />}
            {subTab === 'aar' && <AARPanel isOpen={true} onClose={() => {}} embedded />}
            {subTab === 'ops' && <OperationHistoryPanel isOpen={true} onClose={() => {}} embedded />}
            {subTab === 'decisions' && <DecisionConsequenceRecordsPanel />}
            {subTab === 'opportunities' && <OpportunityLedgerPanel />}
        </div>
    );
}
