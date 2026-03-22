/**
 * PresidentialToolbar — The president's desk.
 *
 * Minimal chrome: date (left), alert badges + army crest (center), advance turn (right).
 * Everything else lives in Army HQ (military), pause menu (settings/save), or dev overlay.
 *
 * Replaces TopToolbar for the "president's desk" metaphor.
 */

import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
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

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between h-12 px-4 bg-[#0a0a14]/95 backdrop-blur-sm border-b border-white/8">

                {/* LEFT: Date */}
                <div className="flex items-center gap-3 min-w-[180px]">
                    {loadedGameState ? (
                        <div className="font-mono text-[12px] text-text-primary tracking-wider uppercase">
                            {formatTurnLabel(loadedGameState.label)}
                        </div>
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

                {/* CENTER: Alert + Crest + Alert */}
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

                    {/* Army Crest — gateway to HQ */}
                    <button
                        onClick={handleOpenHQ}
                        className="group relative flex items-center gap-3 px-4 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                        title={`${armyName ?? 'Army'} HQ [H]`}
                    >
                        {crestUrl && (
                            <img
                                src={crestUrl}
                                alt=""
                                className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(212,167,58,0.4)] group-hover:drop-shadow-[0_0_12px_rgba(212,167,58,0.6)] transition-all"
                                draggable={false}
                            />
                        )}
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-400/90 group-hover:text-amber-400 transition-colors">
                                {armyName ?? playerFaction ?? 'COMMAND'}
                            </span>
                            <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-text-secondary/60">
                                Headquarters
                            </span>
                        </div>
                        {/* Subtle glow ring when alerts pending */}
                        {hasAlerts && (
                            <div className="absolute inset-0 rounded-lg border border-amber-400/20 animate-pulse pointer-events-none" />
                        )}
                    </button>

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

            {/* Error bar */}
            {loadError && (
                <div className="fixed top-12 left-0 right-0 z-10 bg-red-900/60 backdrop-blur-md border-b border-red-500/30 px-4 py-1 flex items-center justify-between">
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
