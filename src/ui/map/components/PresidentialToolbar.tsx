/**
 * PresidentialToolbar — The president's field command bar.
 *
 * This toolbar sits on the Tactical Map (the field situation room).
 * The president's desk is the Warroom; this bar is the command interface
 * the president uses while observing the battlefield.
 *
 * Layout: date + navigation (left), alert badges + army crest (center), advance turn (right).
 * Deep review routes to Army HQ. Campaign context routes to Warroom.
 *
 * Command levels on this bar:
 * - Level 1 (Strategic Guidance): ADVANCE TURN, SUMMARY (map-local briefing)
 * - Level 2 (Army HQ handoff): RECORDS, OPS (opens Army HQ or map-local panels)
 * - Reference: EVENTS, CODEX, CHRONICLE
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { InboxBadge } from './PresidentialInbox';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from '../desktop/turnAftermathAdvanceDeps';
import { loadLatestRunSaveAsText, loadRunFinalSaveAsText } from '../data/DataLoader';
import { getArmyCrest, getArmyName } from '../utils/factionAssets';
import { formatTurnLabel } from '../utils/formatters';
import { getArmyReserveToolbarSignal } from '../utils/armyReserveSeverity';
import { shouldShowWarroomReturn, isEmbeddedTacticalMap } from '../utils/warroomReturn';
import { openChronicle } from '../utils/shellNavigation';
import {
    buildPreAdvanceCommandReviewView,
    formatPreAdvanceGateBlockTitle,
} from '../data/preAdvanceCommandReview';
import { Z } from '../../shared/zIndex';

/**
 * Pre-Advance review-queue severity tone derived directly from the canonical
 * adapter-owned `presidentialReviewQueue` view-model.
 *
 * NIGHTSHIFT-G5 — On-Map Pre-Advance Severity Pip.
 *
 * The map toolbar `INBOX` badge surfaces actionable count from `inboxItems`,
 * but that is a different aggregation than the canonical presidential review
 * queue used by AdvanceTurnModal / WarroomStatusBar. If the player dismisses
 * AdvanceTurnModal back to the map without resolving review work, there is
 * no persistent on-map severity cue. This helper derives the ring tone from
 * the queue's existing fields (no new state, no engine touch) so the toolbar
 * can render a thin severity ring around the inbox badge.
 *
 * Tone derivation (deterministic, count-threshold based — no random, no time):
 *  - 'blocking' (red)   when `criticalCount > 0`
 *  - 'urgent'   (amber) when `pendingCount  > 5`
 *  - null               otherwise (no ring)
 *
 * Pure visual augment — kept inside the toolbar file so Decision Room /
 * Pre-Advance / Warroom-owned files are untouched.
 */
export type PreAdvanceSeverityTone = 'blocking' | 'urgent';

export function derivePreAdvanceSeverityTone(
    queue: { pendingCount: number; criticalCount: number } | null | undefined,
): PreAdvanceSeverityTone | null {
    if (!queue) return null;
    if (queue.criticalCount > 0) return 'blocking';
    if (queue.pendingCount > 5) return 'urgent';
    return null;
}

/** Command Authority gauge — shows the president's override resource. Level 3 actions deplete this. */
function CommandAuthorityGauge({ current, max }: { current: number; max: number }) {
    const pct = max > 0 ? Math.round((current / max) * 100) : 0;
    const color = pct >= 60 ? 'text-emerald-400' : pct >= 30 ? 'text-amber-400' : 'text-red-400';
    const barColor = pct >= 60 ? 'bg-emerald-400/70' : pct >= 30 ? 'bg-amber-400/70' : 'bg-red-400/70';
    return (
        <div
            className="flex items-center gap-1.5"
            role="group"
            aria-label={`Command Authority: ${current}/${max}`}
            aria-describedby="command-authority-description"
            title={`Command Authority: ${current}/${max}\nSpent on Level 3 overrides (force-launch, manual orders).\nRecovers +2 per turn.`}
        >
            <span id="command-authority-description" className="sr-only">
                Command Authority is the president's override resource. Level 3 overrides spend it, and it recovers by 2 per turn.
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-text-secondary">AUTH</span>
            <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[9px] font-mono font-bold ${color}`}>{current}</span>
        </div>
    );
}

interface PresidentialToolbarProps {
    /** Canonical pending military review count (from presidentialReviewQueue). */
    pendingReviews: number;
    /** Canonical army-level reserve pressure summary (from armyReserveQueue). */
    reserveAttention?: {
        pendingCount: number;
        criticalCount: number;
        leadCriticalReason?: string;
        leadCriticalProvenanceDriver?: 'active_operation' | 'sector_threat' | 'captured_objectives' | 'commander_request';
        leadCriticalCommanderPriority?: 'critical' | 'high' | 'medium' | 'low';
        leadCriticalCommanderBrigadesNeeded?: number;
        leadCriticalFocusZoneId?: string;
        leadCriticalPurpose?: 'offensive' | 'defensive';
        leadCriticalWhyNeeded?: string;
        leadCriticalDescription?: string;
        leadCriticalThreatRatio?: number;
        leadCriticalAssignedBrigadeCount?: number;
        leadCriticalOperationName?: string;
        leadCriticalOperationPhase?: string;
        leadCriticalOperationPreparationSubPhase?: string;
        leadCriticalOperationMomentum?: number;
        leadCriticalOperationObjectiveCaptureCount?: number;
    } | null;
    /** Whether any event has readiness > 50% of threshold. */
    pressureWarning: boolean;
    onOpenSummary?: () => void;
    onOpenRecords?: () => void;
    onOpenOpsHistory?: () => void;
    onOpenCodex?: () => void;
    onOpenEventLog?: () => void;
}

export function PresidentialToolbar({
    pendingReviews,
    reserveAttention,
    pressureWarning,
    onOpenSummary,
    onOpenRecords,
    onOpenOpsHistory,
    onOpenCodex,
    onOpenEventLog,
}: PresidentialToolbarProps) {
    const ipc = useIPC();
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const loadSave = useGameStore((s) => s.loadSave);
    const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
    const setArmyHQOpen = useGameStore((s) => s.setArmyHQOpen);
    const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
    const setSelectedArmyHqId = useGameStore((s) => s.setSelectedArmyHqId);
    const loadError = useGameStore((s) => s.loadError);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const setAdvanceTurnPending = useGameStore((s) => s.setAdvanceTurnPending);
    const devMode = useGameStore((s) => s.devMode);
    const [advancing, setAdvancing] = useState(false);

    const playerFaction = loadedGameState?.player_faction ?? '';
    const crestUrl = getArmyCrest(playerFaction);
    const armyName = getArmyName(playerFaction);
    const embedded = typeof window !== 'undefined' && isEmbeddedTacticalMap(window.location.search);
    const showWarroomReturn = typeof window !== 'undefined' && shouldShowWarroomReturn(window.location.search, ipc.isAvailable);
    const reserveSignal = reserveAttention ? getArmyReserveToolbarSignal(reserveAttention) : null;
    // NIGHTSHIFT-G5: severity tone for on-map pre-advance pip ring around INBOX.
    // Reads canonical adapter-owned presidentialReviewQueue (criticalCount / pendingCount).
    // Visual-only; no new state; deterministic count-threshold derivation.
    const preAdvanceSeverityTone = derivePreAdvanceSeverityTone(loadedGameState?.presidentialReviewQueue);
    const preAdvanceReview = useMemo(
        () => buildPreAdvanceCommandReviewView({ state: loadedGameState, osidNameMap: osidDisplayNames }),
        [loadedGameState, osidDisplayNames],
    );
    const advanceBlocked = preAdvanceReview.status === 'blocked';
    const advanceGateTitle = advanceBlocked
        ? formatPreAdvanceGateBlockTitle(preAdvanceReview)
        : !ipc.isAvailable
            ? 'Advance turn requires the desktop app.'
            : 'Advance turn';

    const handleAdvanceTurn = useCallback(async () => {
        if (advanceBlocked) {
            setAdvanceTurnPending(true);
            return;
        }
        if (!ipc.isAvailable || advancing) return;
        setAdvancing(true);
        try {
            await advanceTurnAndSync({
                ipc,
                loadSave,
                clearStagedOrders,
                setLoadError,
                ...getTurnAftermathAdvanceDeps(),
            });
        } finally {
            setAdvancing(false);
        }
    }, [advanceBlocked, setAdvanceTurnPending, ipc, advancing, loadSave, clearStagedOrders, setLoadError]);

    const handleOpenHQ = useCallback(() => {
        if (!playerFaction) return;
        // NOTE: This is a reopen-with-last-tab dispatch, not a navigation to a
        // specific tab. shellNavigation.openArmyHQTab() would force a specific
        // tab and stomp the user's last-viewed tab, so we keep the two-setter
        // sequence here. Treat this pair as the canonical "reopen HQ" idiom.
        setSelectedArmyId(playerFaction);
        setArmyHQOpen(true);
    }, [playerFaction, setSelectedArmyId, setArmyHQOpen]);

    const handleOpenArmyReserve = useCallback(() => {
        if (!playerFaction || !loadedGameState) return;
        const armyReserveFormation = loadedGameState.formations.find((formation) =>
            formation.faction === playerFaction && formation.kind === 'army_hq',
        );
        if (!armyReserveFormation) return;
        setArmyHQOpen(false);
        setSelectedArmyHqId(armyReserveFormation.id);
    }, [loadedGameState, playerFaction, setArmyHQOpen, setSelectedArmyHqId]);

    const hasAlerts = pendingReviews > 0 || pressureWarning || (reserveAttention?.pendingCount ?? 0) > 0;

    // Dev tools state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [runIdInput, setRunIdInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveFlash, setSaveFlash] = useState(false);

    const handleLoadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try { await loadSave(JSON.parse(await file.text())); } catch (err) { setLoadError(String(err)); }
        finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    }, [loadSave, setLoadError]);

    const handleLoadLatest = useCallback(async () => {
        setLoading(true);
        try { await loadSave(await loadLatestRunSaveAsText()); } catch (err) { setLoadError(String(err)); }
        finally { setLoading(false); }
    }, [loadSave, setLoadError]);

    const handleLoadRun = useCallback(async () => {
        const id = runIdInput.trim(); if (!id) return;
        setLoading(true);
        try { await loadSave(await loadRunFinalSaveAsText(id)); } catch (err) { setLoadError(String(err)); }
        finally { setLoading(false); }
    }, [runIdInput, loadSave, setLoadError]);

    const handleSave = useCallback(async () => {
        if (!ipc.isAvailable) return;
        try { await ipc.saveGame(); setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1500); }
        catch (err) { setLoadError(String(err)); }
    }, [ipc, setLoadError]);

    return (
        <>
            {/* Toolbar bar — LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1 spotlight target for step 03_brief. */}
            <div
                data-tutorial-step="presidential-toolbar"
                className="fixed top-0 left-0 right-0 grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-center h-12 px-4 bg-[#0a0a14]/95 backdrop-blur-sm border-b border-white/8"
                style={{ zIndex: Z.TOOLBAR }}
            >

                {/* LEFT: Date */}
                <div className="col-start-1 flex items-center gap-2 min-w-0 pr-2 justify-start">
                    {showWarroomReturn && (
                        <button
                            onClick={() => {
                                if (embedded) {
                                    window.parent.postMessage({ type: 'awwv-back-to-hq' }, '*');
                                    return;
                                }
                                void ipc.focusWarroom();
                            }}
                            className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-amber-400 hover:text-amber-300 transition-colors"
                            title="Return to president's desk"
                        >
                            WARROOM
                        </button>
                    )}
                    <button
                        onClick={() => openChronicle(useGameStore.getState())}
                        className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors"
                        title="Campaign timeline"
                    >
                        CHRONICLE
                    </button>
                    {loadedGameState ? (
                        <span
                            className="font-mono text-[12px] text-text-primary tracking-wider uppercase"
                            title="Current date — use CHRONICLE to review timeline"
                        >
                            {formatTurnLabel(loadedGameState.label)}
                        </span>
                    ) : (
                        <div className="font-mono text-[10px] text-text-secondary italic uppercase">
                            No state loaded
                        </div>
                    )}
                    {devMode && (
                        <span className="px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-[0.3em] bg-amber-900/40 text-amber-500 border border-amber-500/30 rounded-full">
                            DEV
                        </span>
                    )}
                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                        <button
                            onClick={onOpenSummary}
                            disabled={!loadedGameState}
                            className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors disabled:opacity-30"
                            title="Field situation briefing"
                        >
                            SUMMARY
                        </button>
                        <button
                            onClick={onOpenRecords}
                            disabled={!loadedGameState}
                            className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors disabled:opacity-30"
                            title="Open Army HQ Records: after-action reports"
                        >
                            RECORDS
                        </button>
                        <button
                            onClick={onOpenOpsHistory}
                            disabled={!loadedGameState}
                            className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors disabled:opacity-30"
                            title="Active operations"
                        >
                            OPS
                        </button>
                    </div>
                </div>

                {/* CENTER: reserved for the floating crest. */}
                <div className="col-start-2 row-start-1 h-full pointer-events-none" aria-hidden="true" />

                {/* RIGHT: Reference, alert badges, command authority, advance turn. */}
                <div className="col-start-3 row-start-1 flex items-center justify-end gap-3 min-w-0">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onOpenEventLog}
                            disabled={!loadedGameState}
                            className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors disabled:opacity-30"
                            title="Event log"
                        >
                            EVENTS
                        </button>
                        <button
                            onClick={onOpenCodex}
                            disabled={!loadedGameState}
                            data-coachmark-id="codex"
                            className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors disabled:opacity-30"
                            title="Historical reference"
                        >
                            CODEX
                        </button>
                    </div>
                    {/*
                      NIGHTSHIFT-G5: Pre-Advance Severity Pip.
                      The InboxBadge surfaces inboxItems count/severity. The ring
                      wrapper below adds a complementary thin ring derived from
                      the canonical presidentialReviewQueue so AdvanceTurnModal
                      dismiss → back-to-map persistently signals unresolved
                      pre-advance review work. Visual-only; pointer events stay
                      with the wrapped badge button.
                    */}
                    <div
                        data-testid="pre-advance-severity-pip"
                        data-severity-tone={preAdvanceSeverityTone ?? 'none'}
                        className={`relative inline-flex items-center rounded-md ${
                            preAdvanceSeverityTone === 'blocking'
                                ? 'ring-1 ring-red-500/70 ring-offset-1 ring-offset-[#0a0a14]'
                                : preAdvanceSeverityTone === 'urgent'
                                    ? 'ring-1 ring-amber-400/60 ring-offset-1 ring-offset-[#0a0a14]'
                                    : ''
                        }`}
                        title={
                            preAdvanceSeverityTone === 'blocking'
                                ? 'Pre-Advance review queue: blocking items unresolved'
                                : preAdvanceSeverityTone === 'urgent'
                                    ? 'Pre-Advance review queue: pending items above urgent threshold'
                                    : undefined
                        }
                    >
                        {/* Inbox badge — unified presidential decision queue */}
                        <InboxBadge onClick={() => {
                            const gs = useGameStore.getState();
                            // Deselect everything to return to inbox home state
                            gs.setSelectedOsid(null);
                            gs.setSelectedFormationId(null);
                            gs.setSelectedCorpsId(null);
                            gs.setSelectedCorpsFrontSectorId(null);
                            gs.setSelectedArmyId(null);
                            gs.setSelectedArmyHqId(null);
                            gs.setSelectedOperationKey(null);
                            gs.setSelectedOrbatCorpsId(null);
                        }} />
                    </div>

                    {/* Left alert: Pending decisions */}
                    {pendingReviews > 0 && (
                        <button
                            onClick={handleOpenHQ}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wide bg-red-900/30 text-red-400 border border-red-500/30 rounded animate-pulse hover:bg-red-900/50 transition-colors"
                            title="Open Army HQ presidential attention queue"
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {pendingReviews} {pendingReviews === 1 ? 'REVIEW' : 'REVIEWS'}
                        </button>
                    )}

                    {reserveAttention && reserveAttention.pendingCount > 0 && reserveSignal && (
                        <button
                            onClick={handleOpenArmyReserve}
                            className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wide border rounded transition-colors ${
                                reserveSignal.tone === 'critical'
                                    ? 'bg-amber-900/30 text-amber-400 border-amber-500/30 hover:bg-amber-900/50'
                                    : 'bg-sky-900/30 text-sky-300 border-sky-400/30 hover:bg-sky-900/50'
                            }`}
                            title={reserveSignal.title}
                        >
                            <span className={`w-2 h-2 rounded-full ${reserveSignal.tone === 'critical' ? 'bg-amber-500' : 'bg-sky-300'}`} />
                            {reserveSignal.label}
                        </button>
                    )}

                    {/* Right alert: Pressure warning */}
                    {pressureWarning && (
                        <button
                            onClick={handleOpenHQ}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wide bg-amber-900/30 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-900/50 transition-colors"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            TENSIONS RISING
                        </button>
                    )}
                    {/* Command Authority + Advance Turn */}
                    {loadedGameState?.commandAuthority && (
                        <CommandAuthorityGauge
                            current={loadedGameState.commandAuthority.current}
                            max={loadedGameState.commandAuthority.max}
                        />
                    )}
                    <button
                        data-tutorial-step="advance-turn-button"
                        onClick={handleAdvanceTurn}
                        disabled={advancing || !loadedGameState || (!advanceBlocked && !ipc.isAvailable)}
                        title={advanceGateTitle}
                        aria-label={advanceBlocked ? advanceGateTitle : undefined}
                        className={`px-5 py-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.15em] border rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 ${
                            advanceBlocked
                                ? 'bg-red-500/10 text-red-300 border-red-500/45 hover:bg-red-500/20 hover:border-red-400/60'
                                : 'bg-amber-400/10 text-amber-400 border-amber-400/30 hover:bg-amber-400/20 hover:border-amber-400/50'
                        }`}
                    >
                        {advancing ? 'ADVANCING...' : 'ADVANCE TURN →'}
                    </button>
                </div>
            </div>

            {/* Army Crest — floating on top of toolbar, extends below */}
            <button
                onClick={handleOpenHQ}
                className="fixed top-0.5 left-1/2 -translate-x-1/2 group flex flex-col items-center pointer-events-auto"
                style={{ zIndex: Z.SHELL_FLOATING }}
                aria-label={`${armyName ?? 'Army'} HQ [H]`}
                title="Visit Army HQ [H]"
            >
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-amber-400/60 group-hover:text-amber-400 transition-colors mb-0.5">
                    {armyName ?? playerFaction ?? 'COMMAND'}
                </span>
                {crestUrl && (
                    <img
                        src={crestUrl}
                        alt=""
                        className="w-[84px] h-[84px] object-contain drop-shadow-[0_0_12px_rgba(212,167,58,0.4)] group-hover:drop-shadow-[0_0_18px_rgba(212,167,58,0.6)] transition-all"
                        draggable={false}
                    />
                )}
                {hasAlerts && (
                    <div className="absolute inset-0 rounded-lg border border-amber-400/20 animate-pulse pointer-events-none" />
                )}
            </button>

            {/* Dev tools strip — compact, below main toolbar */}
            {devMode && (
                <div className="fixed top-12 left-0 right-0 z-10 flex items-center gap-2 px-4 py-1 bg-[#0a0a14]/90 border-b border-amber-500/20">
                    <span className="text-[8px] font-mono text-amber-500/60 uppercase tracking-widest mr-2">DEV</span>
                    <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="px-2 py-0.5 text-[9px] font-mono uppercase bg-black/40 text-text-secondary border border-white/10 rounded hover:text-text-primary hover:border-white/20 transition-colors disabled:opacity-30">LOAD</button>
                    <button onClick={handleLoadLatest} disabled={loading} className="px-2 py-0.5 text-[9px] font-mono uppercase bg-black/40 text-text-secondary border border-white/10 rounded hover:text-text-primary hover:border-white/20 transition-colors disabled:opacity-30">LATEST</button>
                    <input
                        type="text" value={runIdInput} onChange={(e) => setRunIdInput(e.target.value)}
                        placeholder="RUN_ID" onKeyDown={(e) => e.key === 'Enter' && handleLoadRun()}
                        aria-label="Dev: load run by ID"
                        className="w-20 px-1 py-0.5 text-[9px] font-mono bg-black/40 border border-white/10 rounded text-text-primary focus:border-amber-400/40 focus:outline-none"
                    />
                    <button onClick={handleLoadRun} disabled={loading || !runIdInput.trim()} className="px-2 py-0.5 text-[9px] font-mono uppercase bg-black/40 text-text-secondary border border-white/10 rounded hover:text-text-primary hover:border-white/20 transition-colors disabled:opacity-30">SYNC</button>
                    <button onClick={handleSave} disabled={!loadedGameState || !ipc.isAvailable} className={`px-2 py-0.5 text-[9px] font-mono uppercase bg-black/40 border border-white/10 rounded transition-colors disabled:opacity-30 ${saveFlash ? 'text-green-400 border-green-500/30' : 'text-text-secondary hover:text-text-primary hover:border-white/20'}`}>{saveFlash ? 'SAVED!' : 'SAVE'}</button>
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoadFile} aria-label="Dev: load save file" className="hidden" />
                </div>
            )}

            {/* Error bar */}
            {loadError && (
                <div className={`fixed ${devMode ? 'top-[4.5rem]' : 'top-12'} left-0 right-0 z-10 bg-red-900/60 backdrop-blur-md border-b border-red-500/30 px-4 py-1 flex items-center justify-between`}>
                    <span className="text-[10px] font-mono text-red-200 uppercase tracking-widest">
                        {loadError}
                    </span>
                    <button onClick={() => setLoadError(null)} className="text-red-200/50 hover:text-red-200 text-[10px] font-mono uppercase">
                        DISMISS
                    </button>
                </div>
            )}
        </>
    );
}
