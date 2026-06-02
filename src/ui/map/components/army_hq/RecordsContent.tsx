/**
 * Records tab content — wraps AAR, Operation History panels,
 * and Codex (historical essays) for inline rendering inside Army HQ RECORDS tab.
 */
import { AARPanel } from '../AARPanel';
import { OperationHistoryPanel } from '../OperationHistoryPanel';
import { useGameStore } from '../../store/gameStore';
import { OpportunityLedgerPanel } from './OpportunityLedgerPanel';
import { TurnAftermathRecordsPanel } from './TurnAftermathRecordsPanel';
import { DecisionConsequenceRecordsPanel } from './DecisionConsequenceRecordsPanel';
import { TerritoryOverTimeChart } from '../TerritoryOverTimeChart';
import { t, type MessageKey } from '../../i18n';

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

    return (
        <div>
            {/* Territory-over-time trend chart — re-hosted from the retired
                StrategicDashboard. The War's Record surface owns the campaign
                trend; this is the player-reachable home for the chart. */}
            <div className="mb-4 rounded-md border border-panel-border bg-panel-card px-3 py-3">
                <TerritoryOverTimeChart />
            </div>

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
