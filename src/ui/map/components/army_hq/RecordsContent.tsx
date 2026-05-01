/**
 * Records tab content — wraps AAR, Operation History panels,
 * and Codex (historical essays) for inline rendering inside Army HQ RECORDS tab.
 */
import { AARPanel } from '../AARPanel';
import { OperationHistoryPanel } from '../OperationHistoryPanel';
import { useGameStore } from '../../store/gameStore';
import { OpportunityLedgerPanel } from './OpportunityLedgerPanel';

const SUB_TABS = [
    { id: 'aar' as const, label: 'AFTER-ACTION REPORT' },
    { id: 'ops' as const, label: 'OPERATION HISTORY' },
    { id: 'opportunities' as const, label: 'OPPORTUNITIES' },
];

export function RecordsContent() {
    const subTab = useGameStore((s) => s.armyHQRecordsSubTab);
    const setSubTab = useGameStore((s) => s.setArmyHQRecordsSubTab);
    const setCodexOpen = useGameStore((s) => s.setCodexOpen);

    return (
        <div>
            {/* Sub-tab selector */}
            <div className="flex gap-1.5 mb-4">
                {SUB_TABS.map(({ id, label }) => (
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
                        {label}
                    </button>
                ))}
            </div>

            <div className="mb-4 rounded-md border border-panel-border bg-panel-card px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Codex</div>
                <div className="mt-1 text-[11px] text-text-secondary">
                    Historical essays and reference material live in the separate Codex shell.
                </div>
                <button
                    type="button"
                    onClick={() => setCodexOpen(true)}
                    className="mt-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-md border border-panel-border bg-panel-card text-text-secondary transition-all hover:text-text-primary hover:bg-white/5"
                >
                    Open Codex
                </button>
            </div>

            {/* Content */}
            {subTab === 'aar' && <AARPanel isOpen={true} onClose={() => {}} embedded />}
            {subTab === 'ops' && <OperationHistoryPanel isOpen={true} onClose={() => {}} embedded />}
            {subTab === 'opportunities' && <OpportunityLedgerPanel />}
        </div>
    );
}
