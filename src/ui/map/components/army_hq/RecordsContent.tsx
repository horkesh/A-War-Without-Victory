/**
 * Records tab content — wraps AAR and Operation History panels
 * for inline rendering inside Army HQ RECORDS tab.
 */
import { useState } from 'react';
import { AARPanel } from '../AARPanel';
import { OperationHistoryPanel } from '../OperationHistoryPanel';

const SUB_TABS = [
    { id: 'aar' as const, label: 'AFTER-ACTION REPORT' },
    { id: 'ops' as const, label: 'OPERATION HISTORY' },
];

export function RecordsContent() {
    const [subTab, setSubTab] = useState<'aar' | 'ops'>('aar');

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

            {/* Content */}
            {subTab === 'aar' && <AARPanel isOpen={true} onClose={() => {}} embedded />}
            {subTab === 'ops' && <OperationHistoryPanel isOpen={true} onClose={() => {}} embedded />}
        </div>
    );
}
