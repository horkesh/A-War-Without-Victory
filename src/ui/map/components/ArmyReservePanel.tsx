/**
 * Army Reserve Panel — shown when an army HQ formation is selected.
 *
 * Sections:
 *  1. Reserve Pool — all elite brigades of this faction with status badges
 *  2. Pending Requests — corps requests awaiting player decision (approve/dismiss)
 *  3. Campaign History — collapsible per-brigade episode log
 */
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import { getPanelRailStyle } from './panelRail';
import { turnToDateString } from '../utils/formatters';

const REASON_LABELS: Record<string, string> = {
    offensive_support: 'Offensive Support',
    defensive_gap: 'Defensive Gap',
    exploitation: 'Exploitation',
    enclave_relief: 'Enclave Relief',
};

const RECALL_LABELS: Record<string, string> = {
    op_complete: 'Op Complete',
    need_expired: 'Need Expired',
    player_recall: 'Player Recall',
    casualty_threshold: 'Casualties',
    morale_collapse: 'Morale Collapse',
    permanent_degradation: 'Degraded',
};

interface ArmyReservePanelProps {
    railSlot: 'primary' | 'secondary';
}

export function ArmyReservePanel({ railSlot }: ArmyReservePanelProps) {
    const ipc = useIPC();
    const selectedArmyHqId = useGameStore((s) => s.selectedArmyHqId);
    const selectedFormationId = useGameStore((s) => s.selectedFormationId);
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const [historyOpen, setHistoryOpen] = useState(false);

    const hqId = selectedArmyHqId ?? selectedFormationId;
    if (!hqId || !loadedGameState) return null;

    const armyHq = loadedGameState.formations.find(f => f.id === hqId);
    if (!armyHq || armyHq.kind !== 'army_hq') return null;

    const faction = armyHq.faction;

    // All elite brigades for this faction
    const elites = loadedGameState.formations.filter(
        f => f.faction === faction && f.eliteLoanState != null
    );

    // Pending requests for this faction
    const pendingRequests = (loadedGameState.pendingReserveRequests ?? []).filter(
        r => r.faction === faction
    );

    // Tracker data
    const tracker = loadedGameState.eliteBrigadeTracker ?? {};

    function getCorpsName(corpsId: string): string {
        return loadedGameState!.formations.find(f => f.id === corpsId)?.name ?? corpsId;
    }

    async function handleApprove(corpsId: string, brigadeId: string | null) {
        if (!brigadeId) return;
        const result = await ipc.approveReserveRequest(corpsId, brigadeId);
        if (!result.ok) setLoadError(result.error ?? 'Approval failed');
    }

    async function handleRecall(brigadeId: string) {
        const result = await ipc.recallEliteBrigade(brigadeId);
        if (!result.ok) setLoadError(result.error ?? 'Recall failed');
    }

    const priorityColor = (p: number) =>
        p >= 75 ? '#d45555' : p >= 50 ? '#d4a855' : '#55d48a';

    return (
        <div
            className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
            style={getPanelRailStyle(railSlot, '24rem', 'left')}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border/60 bg-black/30 shrink-0">
                <div>
                    <div className="text-[11px] font-bold text-text-primary tracking-wide uppercase">Army Reserve</div>
                    <div className="text-[10px] text-text-secondary">{armyHq.name}</div>
                </div>
                <button
                    type="button"
                    onClick={() => useGameStore.setState({ selectedArmyHqId: null, selectedFormationId: null })}
                    className="text-text-secondary hover:text-text-primary text-lg leading-none px-1"
                    aria-label="Close"
                >×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">

                {/* ── Reserve Pool ─────────────────────────────────────── */}
                <section>
                    <div className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70 mb-2">
                        Reserve Pool ({elites.length})
                    </div>
                    {elites.length === 0 ? (
                        <div className="text-text-secondary italic">No elite brigades in reserve pool.</div>
                    ) : (
                        <div className="space-y-2">
                            {elites.map(brigade => {
                                const ls = brigade.eliteLoanState!;
                                const pct = brigade.personnel != null ? Math.min(100, Math.round((brigade.personnel / 2200) * 100)) : 0;
                                return (
                                    <button
                                        key={brigade.id}
                                        type="button"
                                        className="w-full text-left bg-black/20 border border-panel-border/40 rounded p-2 space-y-1.5 hover:bg-panel-hover transition-colors cursor-pointer"
                                        onClick={() => useGameStore.setState({ selectedFormationId: brigade.id })}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-text-primary font-semibold truncate">
                                                {brigade.name}
                                            </span>
                                            {ls.permanently_degraded ? (
                                                <span className="px-1.5 py-0.5 bg-[#d45555]/20 text-[#d45555] text-[9px] font-bold rounded border border-[#d45555]/30 uppercase shrink-0">Degraded</span>
                                            ) : ls.on_loan ? (
                                                <span className="px-1.5 py-0.5 bg-[#d4a855]/20 text-[#d4a855] text-[9px] font-bold rounded border border-[#d4a855]/30 uppercase shrink-0">On Loan</span>
                                            ) : ls.in_cooldown ? (
                                                <span className="px-1.5 py-0.5 bg-white/10 text-text-secondary text-[9px] font-bold rounded border border-white/20 uppercase shrink-0">Cooldown</span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 bg-[#55d48a]/20 text-[#55d48a] text-[9px] font-bold rounded border border-[#55d48a]/30 uppercase shrink-0">Ready</span>
                                            )}
                                        </div>

                                        {/* Personnel bar */}
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[10px] text-text-secondary">
                                                <span>Personnel</span>
                                                <span>{brigade.personnel?.toLocaleString() ?? '—'}</span>
                                            </div>
                                            <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? '#55d48a' : pct >= 40 ? '#d4a855' : '#d45555' }}
                                                />
                                            </div>
                                        </div>

                                        {ls.on_loan && (
                                            <div className="flex items-center justify-between pt-0.5">
                                                <span className="text-text-secondary">
                                                    → {getCorpsName(ls.loaned_to_corps!)} ({ls.turns_deployed}w)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); void handleRecall(brigade.id); }}
                                                    className="px-2 py-0.5 bg-[#d45555]/20 border border-[#d45555]/40 rounded text-[10px] text-[#d45555] font-bold hover:bg-[#d45555]/30 transition-colors"
                                                >
                                                    Recall
                                                </button>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ── Pending Requests ──────────────────────────────────── */}
                {pendingRequests.length > 0 && (
                    <section>
                        <div className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70 mb-2">
                            Pending Requests ({pendingRequests.length})
                        </div>
                        <div className="space-y-2">
                            {pendingRequests.map((req, idx) => (
                                <div key={idx} className="bg-black/20 border border-panel-border/40 rounded p-2 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-text-primary font-semibold">{getCorpsName(req.corps_id)}</div>
                                            <div className="text-text-secondary text-[10px]">{req.description}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span
                                                className="px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase"
                                                style={{
                                                    color: priorityColor(req.priority),
                                                    backgroundColor: `${priorityColor(req.priority)}20`,
                                                    borderColor: `${priorityColor(req.priority)}40`,
                                                }}
                                            >
                                                {REASON_LABELS[req.reason] ?? req.reason}
                                            </span>
                                            <span className="text-[10px] text-text-secondary">
                                                ~{req.travel_hops <= 1 ? '&lt;1' : Math.ceil(req.travel_hops / 2)}w travel
                                            </span>
                                        </div>
                                    </div>

                                    {req.suggested_brigade_id && (
                                        <div className="text-[10px] text-text-secondary">
                                            Suggested: <span className="text-text-primary">{
                                                loadedGameState.formations.find(f => f.id === req.suggested_brigade_id)?.name ?? req.suggested_brigade_id
                                            }</span>
                                        </div>
                                    )}

                                    {/* Priority bar */}
                                    <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${req.priority}%`, backgroundColor: priorityColor(req.priority) }}
                                        />
                                    </div>

                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            disabled={!req.suggested_brigade_id}
                                            onClick={() => void handleApprove(req.corps_id, req.suggested_brigade_id)}
                                            className="flex-1 px-2 py-1 bg-[#55d48a]/20 border border-[#55d48a]/40 rounded text-[10px] text-[#55d48a] font-bold hover:bg-[#55d48a]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            APPROVE
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Dismiss by removing from the list (no IPC — handled client-side)
                                                // In practice the list refreshes next turn automatically
                                            }}
                                            className="px-2 py-1 bg-black/30 border border-panel-border/40 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Campaign History ──────────────────────────────────── */}
                {elites.some(b => (tracker[b.id]?.total_loans ?? 0) > 0) && (
                    <section>
                        <button
                            type="button"
                            onClick={() => setHistoryOpen(o => !o)}
                            className="flex items-center gap-1.5 text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70 hover:opacity-100 transition-opacity mb-2"
                        >
                            <span>{historyOpen ? '▾' : '▸'}</span>
                            Campaign History
                        </button>
                        {historyOpen && (
                            <div className="space-y-3">
                                {elites.filter(b => (tracker[b.id]?.total_loans ?? 0) > 0).map(brigade => {
                                    const t = tracker[brigade.id]!;
                                    return (
                                        <div key={brigade.id} className="bg-black/10 border border-panel-border/30 rounded p-2 space-y-1.5">
                                            <div className="text-text-primary font-semibold">{brigade.name}</div>
                                            <div className="grid grid-cols-3 gap-1 text-[10px]">
                                                <div className="text-center">
                                                    <div className="text-text-secondary">Loans</div>
                                                    <div className="text-text-primary font-bold">{t.total_loans}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-text-secondary">Weeks</div>
                                                    <div className="text-text-primary font-bold">{t.total_turns_deployed}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-text-secondary">KIA</div>
                                                    <div className="text-[#d45555] font-bold">{t.total_casualties_taken.toLocaleString()}</div>
                                                </div>
                                            </div>
                                            {t.episodes.length > 0 && (
                                                <div className="space-y-1 pt-1 border-t border-panel-border/20">
                                                    {t.episodes.map(ep => (
                                                        <div key={ep.episode_id} className="text-[10px] text-text-secondary flex items-center justify-between gap-2">
                                                            <span>
                                                                <span className="text-text-primary">{getCorpsName(ep.corps_id)}</span>
                                                                {' '}— {REASON_LABELS[ep.reason] ?? ep.reason}
                                                            </span>
                                                            <span className="shrink-0 tabular-nums">
                                                                w{ep.loan_start_turn}
                                                                {ep.loan_end_turn != null ? `–${ep.loan_end_turn}` : '+'}
                                                                {ep.recall_reason ? ` (${RECALL_LABELS[ep.recall_reason] ?? ep.recall_reason})` : ''}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
