/**
 * PresidentialToolbar — The president's desk.
 *
 * Minimal chrome: date (left), alert badges + army crest (center), advance turn (right).
 * Everything else lives in Army HQ (military), pause menu (settings/save), or dev overlay.
 *
 * Replaces TopToolbar for the "president's desk" metaphor.
 */

import { useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
import { loadLatestRunSaveAsText, loadRunFinalSaveAsText } from '../data/DataLoader';
import { getArmyCrest, getArmyName } from '../utils/factionAssets';
import { formatTurnLabel } from '../utils/formatters';
import { OfficerEventBadge } from './OfficerEventBadge';

interface PresidentialToolbarProps {
    /** Pending event decisions count (from loadedGameState). */
    pendingDecisions: number;
    /** Whether any event has readiness > 50% of threshold. */
    pressureWarning: boolean;
    /** Pending officer events. */
    pendingOfficerEvents: boolean;
}

export function PresidentialToolbar({ pendingDecisions, pressureWarning, pendingOfficerEvents }: PresidentialToolbarProps) {
    const ipc = useIPC();
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const loadSave = useGameStore((s) => s.loadSave);
    const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
    const setArmyHQOpen = useGameStore((s) => s.setArmyHQOpen);
    const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
    const loadError = useGameStore((s) => s.loadError);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const devMode = useGameStore((s) => s.devMode);
    const [advancing, setAdvancing] = useState(false);

    const playerFaction = loadedGameState?.player_faction ?? '';
    const crestUrl = getArmyCrest(playerFaction);
    const armyName = getArmyName(playerFaction);

    const handleAdvanceTurn = useCallback(async () => {
        if (!ipc.isAvailable || advancing) return;
        setAdvancing(true);
        try {
            await advanceTurnAndSync({ ipc, loadSave, clearStagedOrders, setLoadError });
        } finally {
            setAdvancing(false);
        }
    }, [ipc, advancing, loadSave, clearStagedOrders, setLoadError]);

    const handleOpenHQ = useCallback(() => {
        if (!playerFaction) return;
        setSelectedArmyId(playerFaction);
        setArmyHQOpen(true);
    }, [playerFaction, setSelectedArmyId, setArmyHQOpen]);

    const hasAlerts = pendingDecisions > 0 || pressureWarning || pendingOfficerEvents;

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
            {/* Toolbar bar */}
            <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between h-12 px-4 bg-[#0a0a14]/95 backdrop-blur-sm border-b border-white/8">

                {/* LEFT: Date */}
                <div className="flex items-center gap-3 min-w-[180px]">
                    <button
                        onClick={() => useGameStore.getState().setChronicleOpen(true)}
                        className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors"
                    >
                        CHRONICLE
                    </button>
                    {loadedGameState ? (
                        <button
                            onClick={() => useGameStore.getState().setChronicleOpen(true)}
                            className="font-mono text-[12px] text-text-primary tracking-wider uppercase hover:text-amber-400 transition-colors cursor-pointer bg-transparent border-none p-0"
                        >
                            {formatTurnLabel(loadedGameState.label)}
                        </button>
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
                </div>

                {/* CENTER: Alert badges (crest is separate floating element below) */}
                <div className="flex items-center gap-4">
                    {/* Left alert: Pending decisions */}
                    {pendingDecisions > 0 && (
                        <button
                            onClick={handleOpenHQ}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wide bg-red-900/30 text-red-400 border border-red-500/30 rounded animate-pulse hover:bg-red-900/50 transition-colors"
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {pendingDecisions} {pendingDecisions === 1 ? 'DECISION' : 'DECISIONS'}
                        </button>
                    )}

                    {/* Officer badge */}
                    {pendingOfficerEvents && <OfficerEventBadge />}

                    {/* Spacer for crest area */}
                    <div className="w-28" />

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
                </div>

                {/* RIGHT: Advance Turn */}
                <div className="flex items-center gap-3 min-w-[180px] justify-end">
                    <button
                        onClick={handleAdvanceTurn}
                        disabled={advancing || !loadedGameState || !ipc.isAvailable}
                        className="px-5 py-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.15em] bg-amber-400/10 text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/20 hover:border-amber-400/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    >
                        {advancing ? 'ADVANCING...' : 'ADVANCE TURN →'}
                    </button>
                </div>
            </div>

            {/* Army Crest — floating on top of toolbar, extends below */}
            <button
                onClick={handleOpenHQ}
                className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] group flex flex-col items-center pointer-events-auto"
                aria-label={`${armyName ?? 'Army'} HQ [H]`}
            >
                <span className="text-[8px] font-mono font-bold uppercase tracking-[0.25em] text-amber-400/60 group-hover:text-amber-400 transition-colors mt-1 mb-0.5">
                    {armyName ?? playerFaction ?? 'COMMAND'}
                </span>
                {crestUrl && (
                    <img
                        src={crestUrl}
                        alt=""
                        className="w-[100px] h-[100px] object-contain drop-shadow-[0_0_12px_rgba(212,167,58,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(212,167,58,0.6)] transition-all"
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
                        className="w-20 px-1 py-0.5 text-[9px] font-mono bg-black/40 border border-white/10 rounded text-text-primary focus:border-amber-400/40 focus:outline-none"
                    />
                    <button onClick={handleLoadRun} disabled={loading || !runIdInput.trim()} className="px-2 py-0.5 text-[9px] font-mono uppercase bg-black/40 text-text-secondary border border-white/10 rounded hover:text-text-primary hover:border-white/20 transition-colors disabled:opacity-30">SYNC</button>
                    <button onClick={handleSave} disabled={!loadedGameState || !ipc.isAvailable} className={`px-2 py-0.5 text-[9px] font-mono uppercase bg-black/40 border border-white/10 rounded transition-colors disabled:opacity-30 ${saveFlash ? 'text-green-400 border-green-500/30' : 'text-text-secondary hover:text-text-primary hover:border-white/20'}`}>{saveFlash ? 'SAVED!' : 'SAVE'}</button>
                    <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoadFile} className="hidden" />
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
