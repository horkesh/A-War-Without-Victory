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
import {
    getArmyReserveAttentionSummary,
    getArmyReserveRequestCauseCopy,
    getArmyReserveRequestEvidenceCopy,
    getArmyReserveRequestProvenanceCopy,
    getArmyReserveRequestSeverityCopy,
} from '../utils/armyReserveSeverity';
import { getPlayerFacingCorpsName } from '../../shared/playerFacingLabels';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeBrigadeName } from '../utils/playerSafeText';
import { EmptyState } from './EmptyState';
import { t, useLocale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';

const REASON_LABEL_KEYS: Record<string, MessageKey> = {
    offensive_support: 'armyReserve.reason.offensiveSupport',
    defensive_gap: 'armyReserve.reason.defensiveGap',
    exploitation: 'armyReserve.reason.exploitation',
    enclave_relief: 'armyReserve.reason.enclaveRelief',
};

const RECALL_LABEL_KEYS: Record<string, MessageKey> = {
    op_complete: 'armyReserve.recall.opComplete',
    need_expired: 'armyReserve.recall.needExpired',
    player_recall: 'armyReserve.recall.playerRecall',
    casualty_threshold: 'armyReserve.recall.casualties',
    morale_collapse: 'armyReserve.recall.moraleCollapse',
    permanent_degradation: 'armyReserve.status.degraded',
};

function reserveReasonLabel(reason: string): string {
    const key = REASON_LABEL_KEYS[reason];
    return key ? t(key) : reason;
}

function recallReasonLabel(reason: string): string {
    const key = RECALL_LABEL_KEYS[reason];
    return key ? t(key) : reason;
}

interface ArmyReservePanelProps {
    railSlot: 'primary' | 'secondary';
}

export function ArmyReservePanel({ railSlot }: ArmyReservePanelProps) {
    const [locale] = useLocale();
    const ipc = useIPC();
    const selectedArmyHqId = useGameStore((s) => s.selectedArmyHqId);
    const selectedFormationId = useGameStore((s) => s.selectedFormationId);
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const [historyOpen, setHistoryOpen] = useState(true);

    const hqId = selectedArmyHqId ?? selectedFormationId;
    if (!hqId || !loadedGameState) return null;
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

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
    const reserveAttentionSummary = loadedGameState.armyReserveQueue
        ? getArmyReserveAttentionSummary(loadedGameState.armyReserveQueue)
        : null;

    // Tracker data
    const tracker = loadedGameState.eliteBrigadeTracker ?? {};
    const activeLoans = elites.filter((brigade) => brigade.eliteLoanState?.on_loan);
    const corpsNameById = loadedGameState.formations
        .filter((formation) => formation.kind === 'corps' || formation.kind === 'corps_asset')
        .map((formation) => ({ id: formation.id, name: getLocalizedFormationName(formation, locale) }));

    function getCorpsName(corpsId: string): string {
        return getPlayerFacingCorpsName(corpsId, corpsNameById, 'Assigned command');
    }

    async function handleApprove(requestId: string, brigadeId: string | null) {
        if (!brigadeId) return;
        const result = await ipc.approveReserveRequest(
            requestId,
            brigadeId,
            'Army CO accepts this request: mission rationale and employment plan are credible.'
        );
        if (!result.ok) setLoadError(result.error ?? 'Approval failed');
    }

    async function handleDecline(requestId: string) {
        const result = await ipc.declineReserveRequest(
            requestId,
            'Army CO declines at this time: reserve commitment risk outweighs expected gain.'
        );
        if (!result.ok) setLoadError(result.error ?? 'Decline failed');
    }

    async function handleRecall(brigadeId: string) {
        const result = await ipc.recallEliteBrigade(
            brigadeId,
            'Loan terminated by player; brigade ordered back to base reserve.'
        );
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
                    <div className="text-[11px] font-bold text-text-primary tracking-wide uppercase">{t('armyReserve.title')}</div>
                    <div className="text-[10px] text-text-secondary">{armyHq.name}</div>
                </div>
                <button
                    type="button"
                    onClick={() => useGameStore.setState({ selectedArmyHqId: null, selectedFormationId: null })}
                    className="text-text-secondary hover:text-text-primary text-lg leading-none px-1"
                    aria-label={t('armyReserve.close')}
                >×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-3 text-[11px]">

                {/* ── Reserve Pool ─────────────────────────────────────── */}
                <section>
                    <div className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70 mb-2">
                        {t('armyReserve.reservePool', { count: elites.length })}
                    </div>
                    {elites.length === 0 ? (
                        <EmptyState
                            message={t('armyReserve.noEliteFormations')}
                            helpText={t('armyReserve.reservePoolEmpty')}
                            density="compact"
                        />
                    ) : (
                        <div className="space-y-1.5">
                            {elites.map(brigade => {
                                const ls = brigade.eliteLoanState!;
                                const pct = brigade.personnel != null ? Math.min(100, Math.round((brigade.personnel / 2200) * 100)) : 0;
                                return (
                                    <button
                                        key={brigade.id}
                                        type="button"
                                        className="w-full text-left bg-black/20 border border-panel-border/40 rounded p-1.5 space-y-1 hover:bg-panel-hover transition-colors cursor-pointer"
                                        onClick={() => useGameStore.setState({ selectedFormationId: brigade.id })}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-text-primary font-semibold truncate">
                                                {getLocalizedFormationName(brigade, locale)}
                                            </span>
                                            {ls.permanently_degraded ? (
                                                <span className="px-1.5 py-0.5 bg-[#d45555]/20 text-[#d45555] text-[9px] font-bold rounded border border-[#d45555]/30 uppercase shrink-0">{t('armyReserve.status.degraded')}</span>
                                            ) : ls.on_loan ? (
                                                <span className="px-1.5 py-0.5 bg-[#d4a855]/20 text-[#d4a855] text-[9px] font-bold rounded border border-[#d4a855]/30 uppercase shrink-0">{t('armyReserve.status.onLoan')}</span>
                                            ) : ls.in_cooldown ? (
                                                <span className="px-1.5 py-0.5 bg-white/10 text-text-secondary text-[9px] font-bold rounded border border-white/20 uppercase shrink-0">{t('armyReserve.status.cooldown')}</span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 bg-[#55d48a]/20 text-[#55d48a] text-[9px] font-bold rounded border border-[#55d48a]/30 uppercase shrink-0">{t('armyReserve.status.ready')}</span>
                                            )}
                                        </div>

                                        {/* Personnel bar */}
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[10px] text-text-secondary">
                                                <span>{t('armyReserve.personnel')}</span>
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
                                                    {t('armyReserve.terminate')}
                                                </button>
                                            </div>
                                        )}
                                        {!ls.on_loan && ls.base_osid && (
                                            <div className="text-[10px] text-text-secondary">
                                                {t('armyReserve.base', { base: getOsidDisplayName(ls.base_osid, osidDisplayNames) })}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ── Active Loans Snapshot ─────────────────────────────── */}
                <section>
                    <div className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70 mb-2">
                        {t('armyReserve.activeLoans', { count: activeLoans.length })}
                    </div>
                    {activeLoans.length === 0 ? (
                        <EmptyState
                            message={t('armyReserve.noActiveDeployments')}
                            helpText={t('armyReserve.noActiveDeploymentsHelp')}
                            density="compact"
                        />
                    ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {activeLoans.map((brigade) => {
                                const ls = brigade.eliteLoanState!;
                                return (
                                    <div
                                        key={brigade.id}
                                        className="bg-black/15 border border-panel-border/30 rounded px-2 py-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-text-primary truncate">{getLocalizedFormationName(brigade, locale)}</span>
                                            <span className="text-[10px] text-text-secondary shrink-0">
                                                {ls.turns_deployed}w
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-text-secondary truncate">
                                            {getCorpsName(ls.loaned_to_corps ?? 'unknown')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ── Pending Requests ──────────────────────────────────── */}
                {pendingRequests.length > 0 && (
                    <section>
                        <div className="text-[10px] text-accent-gold uppercase tracking-widest font-bold opacity-70 mb-2">
                            {t('armyReserve.pendingRequests', { count: pendingRequests.length })}
                        </div>
                        {reserveAttentionSummary && (
                            <div className="mb-2 rounded border border-panel-border/40 bg-black/20 px-2 py-1.5">
                                <div className={`text-[10px] font-semibold ${reserveAttentionSummary.tone === 'critical' ? 'text-amber-400' : 'text-text-primary'}`}>
                                    {reserveAttentionSummary.heading}
                                </div>
                                <div className="text-[10px] text-text-secondary mt-0.5">
                                    {reserveAttentionSummary.detail}
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            {pendingRequests.map((req, idx) => {
                                const severityCopy = getArmyReserveRequestSeverityCopy(req.priority);
                                const causeCopy = getArmyReserveRequestCauseCopy(req);
                                const evidenceCopy = getArmyReserveRequestEvidenceCopy(req);
                                const provenanceCopy = getArmyReserveRequestProvenanceCopy(req);
                                return (
                                    <div key={req.request_id ?? idx} className="bg-black/20 border border-panel-border/40 rounded p-2 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-text-primary font-semibold">{getCorpsName(req.corps_id)}</div>
                                            <div className="text-text-secondary text-[10px]">{req.description}</div>
                                            <div className="text-[10px] text-text-secondary mt-1">
                                                {severityCopy.detail}
                                            </div>
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
                                                {reserveReasonLabel(req.reason)}
                                            </span>
                                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${
                                                req.severityBand === 'critical'
                                                    ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                                                    : 'text-sky-300 border-sky-400/40 bg-sky-400/10'
                                            }`}>
                                                {severityCopy.label}
                                            </span>
                                            <span className="text-[10px] text-text-secondary">
                                                {t('armyReserve.travelWeeks', { weeks: req.travel_hops <= 1 ? '<1' : Math.ceil(req.travel_hops / 2) })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded border border-panel-border/30 bg-black/15 px-2 py-1.5">
                                        <div className={`text-[10px] font-semibold ${causeCopy.tone === 'critical' ? 'text-amber-400' : 'text-text-primary'}`}>
                                            {causeCopy.label}
                                        </div>
                                        <div className="text-[10px] text-text-primary mt-0.5">
                                            {causeCopy.summary}
                                        </div>
                                        <div className="text-[10px] text-text-secondary mt-0.5">
                                            {causeCopy.detail}
                                        </div>
                                    </div>

                                    <div className="rounded border border-panel-border/30 bg-black/10 px-2 py-1.5">
                                        <div className="text-[10px] font-semibold text-text-primary">
                                            {provenanceCopy.label}
                                        </div>
                                        <div className="text-[10px] text-text-primary mt-0.5">
                                            {provenanceCopy.summary}
                                        </div>
                                        <div className="text-[10px] text-text-secondary mt-0.5">
                                            {provenanceCopy.detail}
                                        </div>
                                    </div>

                                    {evidenceCopy && (
                                        <div className="rounded border border-panel-border/30 bg-black/10 px-2 py-1.5">
                                            <div className="text-[10px] font-semibold text-text-primary">
                                                {evidenceCopy.label}
                                            </div>
                                            <div className="text-[10px] text-text-primary mt-0.5">
                                                {evidenceCopy.summary}
                                            </div>
                                            <div className="text-[10px] text-text-secondary mt-0.5">
                                                {evidenceCopy.detail}
                                            </div>
                                        </div>
                                    )}

                                    {req.suggested_brigade_id && (
                                        <div className="text-[10px] text-text-secondary">
                                            {t('armyReserve.suggested')}: <span className="text-text-primary">{
                                                getPlayerSafeBrigadeName(
                                                    loadedGameState.formations.find(f => f.id === req.suggested_brigade_id)?.name,
                                                )
                                            }</span>
                                        </div>
                                    )}
                                    {req.why_needed && (
                                        <div className="text-[10px] text-text-secondary">
                                            <span className="text-text-primary font-semibold">{t('armyReserve.corpsWhy')}:</span> {req.why_needed}
                                        </div>
                                    )}
                                    {req.how_to_use && (
                                        <div className="text-[10px] text-text-secondary">
                                            <span className="text-text-primary font-semibold">{t('armyReserve.corpsHow')}:</span> {req.how_to_use}
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
                                            onClick={() => void handleApprove(req.request_id, req.suggested_brigade_id)}
                                            className="flex-1 px-2 py-1 bg-[#55d48a]/20 border border-[#55d48a]/40 rounded text-[10px] text-[#55d48a] font-bold hover:bg-[#55d48a]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {t('armyReserve.approve')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleDecline(req.request_id);
                                            }}
                                            className="px-2 py-1 bg-black/30 border border-panel-border/40 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                                        >
                                            {t('armyReserve.decline')}
                                        </button>
                                    </div>
                                    </div>
                                );
                            })}
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
                            {t('armyReserve.campaignHistory')}
                        </button>
                        {historyOpen && (
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {elites.filter(b => (tracker[b.id]?.total_loans ?? 0) > 0).map(brigade => {
                                    const brigadeTracker = tracker[brigade.id]!;
                                    return (
                                        <div key={brigade.id} className="bg-black/10 border border-panel-border/30 rounded p-2 space-y-1.5">
                                            <div className="text-text-primary font-semibold">{getLocalizedFormationName(brigade, locale)}</div>
                                            <div className="grid grid-cols-3 gap-1 text-[10px]">
                                                <div className="text-center">
                                                    <div className="text-text-secondary">{t('armyReserve.loans')}</div>
                                                    <div className="text-text-primary font-bold">{brigadeTracker.total_loans}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-text-secondary">{t('armyReserve.weeks')}</div>
                                                    <div className="text-text-primary font-bold">{brigadeTracker.total_turns_deployed}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-text-secondary">{t('armyReserve.kia')}</div>
                                                    <div className="text-[#d45555] font-bold">{brigadeTracker.total_casualties_taken.toLocaleString()}</div>
                                                </div>
                                            </div>
                                            {brigadeTracker.episodes.length > 0 && (
                                                <div className="space-y-1 pt-1 border-t border-panel-border/20">
                                                    {brigadeTracker.episodes.map(ep => (
                                                        <div key={ep.episode_id} className="text-[10px] text-text-secondary flex items-center justify-between gap-2">
                                                            <span>
                                                                <span className="text-text-primary">{getCorpsName(ep.corps_id)}</span>
                                                                {' '} - {reserveReasonLabel(ep.reason)}
                                                            </span>
                                                            <span className="shrink-0 tabular-nums">
                                                                w{ep.loan_start_turn}
                                                                {ep.loan_end_turn != null ? `–${ep.loan_end_turn}` : '+'}
                                                                {ep.recall_reason ? ` (${recallReasonLabel(ep.recall_reason)})` : ''}
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
