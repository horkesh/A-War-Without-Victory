/**
 * Operations section for expanded corps card.
 * Lists active operations with phase badges, momentum, and action placeholders.
 */
import type { OperationView, LoadedGameState } from '../../data/types';
import { CollapsibleSection } from './CollapsibleSection';

interface OperationsSectionProps {
    corpsId: string;
    operations: OperationView[];
    gameState: LoadedGameState;
}

const PHASE_BADGE: Record<string, { bg: string; text: string }> = {
    execution: { bg: 'bg-red-900/20 border-red-800/20', text: 'text-red-700' },
    planning: { bg: 'bg-amber-900/20 border-amber-800/20', text: 'text-amber-700' },
    recovery: { bg: 'bg-neutral-400/20 border-neutral-400/20', text: 'text-neutral-600' },
};

export function OperationsSection({ corpsId, operations, gameState }: OperationsSectionProps) {
    return (
        <CollapsibleSection sectionKey={`ops-${corpsId}`} title="Operations" count={operations.length}>
            {operations.length === 0 ? (
                <div className="text-[11px] text-[#8a7a60] italic py-1">No active operations</div>
            ) : (
                <div className="space-y-2">
                    {operations.map((op) => {
                        const badge = PHASE_BADGE[op.phase] ?? PHASE_BADGE.planning;
                        const momentum = op.momentum ?? 0;
                        const cmdOfficer = op.commander_officer_id
                            ? (gameState.namedOfficerData ?? []).find((o) => o.id === op.commander_officer_id)
                            : undefined;
                        const commander = cmdOfficer?.name;
                        const objectives = op.objectives ?? [];

                        return (
                            <div key={`${op.corps_id}|${op.name}`}
                                 className="px-2 py-2 rounded bg-[#e8dcc4]/40 border border-[#c8b898]/30 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-[#2a2016] uppercase"
                                          style={{ fontFamily: 'Georgia, serif' }}>
                                        {op.name}
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${badge.bg} ${badge.text}`}>
                                        {op.phase}
                                    </span>
                                </div>
                                <div className="text-[10px] tabular-nums text-[#6a5a40] flex gap-3"
                                     style={{ fontFamily: 'Courier New, monospace' }}>
                                    <span>{op.participating_brigade_count} bde</span>
                                    <span>{objectives.length} obj</span>
                                    {op.phase === 'execution' && (
                                        <span className={momentum >= 0 ? 'text-green-700' : 'text-red-700'}>
                                            Mom: {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                                {commander && (
                                    <div className="text-[9px] text-[#8a7a60]"
                                         style={{ fontFamily: 'Courier New, monospace' }}>
                                        Cmdr: {commander}
                                    </div>
                                )}
                                {/* Action buttons — wired in Phase 3 */}
                                <div className="flex gap-2 pt-1">
                                    {op.preparation_sub_phase === 'assessment' && (
                                        <button type="button" disabled
                                            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-green-600/30 text-green-700/50 opacity-50 cursor-not-allowed">
                                            Force Launch
                                        </button>
                                    )}
                                    {op.phase === 'execution' && (
                                        <button type="button" disabled
                                            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-red-600/30 text-red-700/50 opacity-50 cursor-not-allowed">
                                            Stand Down
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
}
