/**
 * Peace Phase Status Panel — displayed during peace/Phase 0.
 * Shows: capital balances, declaration pressure, referendum countdown, alliance value, events.
 */
import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
import {
    getPlayerSafeMilitaryFactionName,
    getPlayerSafePoliticalFactionName,
} from '../utils/playerSafeText';

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="space-y-0.5">
            <div className="flex justify-between text-[9px]">
                <span className="text-text-secondary uppercase tracking-wider">{label}</span>
                <span className="text-text-primary tabular-nums">{Math.round(value)}/{max}</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
}

function AllianceBar({ value }: { value: number }) {
    // -1 = hostile, 0 = neutral, +1 = allied
    const pct = ((value + 1) / 2) * 100; // map [-1,1] to [0,100]
    const color = value > 0.2 ? '#22c55e' : value > -0.2 ? '#eab308' : '#ef4444';
    const label = value > 0.5 ? 'Allied' : value > 0.2 ? 'Cooperative' : value > -0.2 ? 'Strained' : value > -0.5 ? 'Hostile' : 'Open War';
    return (
        <div className="space-y-0.5">
            <div className="flex justify-between text-[9px]">
                <span className="text-text-secondary uppercase tracking-wider">RBiH–HRHB Alliance</span>
                <span style={{ color }} className="font-semibold">{label}</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 flex">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
            </div>
        </div>
    );
}

export function PeaceStatusPanel() {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const loadSave = useGameStore((s) => s.loadSave);
    const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const ipc = useIPC();
    const [advancing, setAdvancing] = useState(false);

    const handleEndTurn = useCallback(async () => {
        if (!ipc.isAvailable || advancing) return;
        setAdvancing(true);
        await advanceTurnAndSync({ ipc, loadSave, clearStagedOrders, setLoadError });
        setAdvancing(false);
    }, [ipc, loadSave, clearStagedOrders, setLoadError, advancing]);

    if (!loadedGameState) return null;

    const { peaceFactions, peaceAllianceValue, peaceReferendum, peaceEvents, turn } = loadedGameState;
    const date = loadedGameState.metadata?.date;
    if (!peaceFactions) return null;

    const playerFaction = loadedGameState.player_faction;
    const hasInvestments = (loadedGameState.peaceEvents ?? []).some(
        (e) => e.type === 'investment' || e.type === 'staged_investment'
    );

    return (
        <div className="absolute top-2 left-2 z-50 w-[320px] max-h-[90vh] overflow-auto">
            <div className="bg-panel-bg/95 border border-panel-border rounded-lg shadow-2xl backdrop-blur-md">
                {/* Header */}
                <div className="px-4 py-3 border-b border-panel-border bg-panel-card/50">
                    <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-accent-gold/70 mb-0.5">Pre-War Phase</div>
                    <div className="text-sm font-bold text-text-primary uppercase tracking-wide">
                        {date ?? `Turn ${turn}`}
                    </div>
                    {peaceReferendum && !peaceReferendum.held && peaceReferendum.deadline_turn != null && (
                        <div className="text-[10px] text-amber-400 mt-1">
                            Referendum deadline: Turn {peaceReferendum.deadline_turn}
                            {turn != null && <span className="text-text-secondary"> ({peaceReferendum.deadline_turn - turn} turns)</span>}
                        </div>
                    )}
                    {peaceReferendum?.held && peaceReferendum.war_start_turn != null && (
                        <div className="text-[10px] text-red-400 font-bold mt-1">
                            WAR BEGINS: Turn {peaceReferendum.war_start_turn}
                            {turn != null && peaceReferendum.war_start_turn > turn && (
                                <span className="text-text-secondary"> ({peaceReferendum.war_start_turn - turn} turns)</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Faction Cards */}
                <div className="p-3 space-y-3">
                    {peaceFactions.map((f) => {
                        const color = FACTION_COLORS[f.id as keyof typeof FACTION_COLORS] ?? '#888';
                        const isPlayer = f.id === playerFaction;
                        return (
                            <div
                                key={f.id}
                                className={`p-2.5 rounded border space-y-2 ${isPlayer ? 'border-accent-gold/40 bg-accent-gold/5' : 'border-panel-border bg-panel-card/50'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                        <span className="text-[11px] font-bold text-text-primary uppercase tracking-wide">
                                            {getPlayerSafeMilitaryFactionName(f.id)}
                                        </span>
                                    </div>
                                    {isPlayer && (
                                        <span className="text-[8px] bg-accent-gold/20 text-accent-gold px-1.5 py-0.5 rounded border border-accent-gold/30 font-bold uppercase tracking-wider">
                                            You
                                        </span>
                                    )}
                                    {f.declared && (
                                        <span className="text-[8px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold uppercase">
                                            Declared
                                        </span>
                                    )}
                                </div>
                                <div className="text-[9px] text-text-secondary">{getPlayerSafePoliticalFactionName(f.id)}</div>

                                {/* Capital */}
                                <ProgressBar value={f.capital} max={100} color={color} label="Pre-War Capital" />

                                {/* Declaration Pressure (RS and HRHB only) */}
                                {f.id !== 'RBiH' && !f.declared && (
                                    <ProgressBar value={f.declaration_pressure} max={100} color="#ef4444" label="Declaration Pressure" />
                                )}
                            </div>
                        );
                    })}

                    {/* Alliance */}
                    {peaceAllianceValue != null && (
                        <div className="pt-2 border-t border-panel-border">
                            <AllianceBar value={peaceAllianceValue} />
                        </div>
                    )}

                    {/* Events */}
                    {peaceEvents && peaceEvents.length > 0 && (
                        <div className="pt-2 border-t border-panel-border space-y-1">
                            <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Events This Turn</div>
                            {peaceEvents.map((e, i) => (
                                <div key={i} className="text-[10px] text-text-primary bg-black/20 px-2 py-1 rounded">
                                    <span className="font-semibold text-accent-gold">{e.type.replace(/_/g, ' ')}</span>
                                    {e.faction && <span className="text-text-secondary ml-1">({getPlayerSafeMilitaryFactionName(e.faction)})</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* End Turn */}
                    <div className="pt-3 border-t border-panel-border">
                        {hasInvestments && (
                            <div className="text-[9px] text-amber-400 mb-2 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Staged investments pending
                            </div>
                        )}
                        <button
                            onClick={handleEndTurn}
                            disabled={!ipc.isAvailable || advancing}
                            className="w-full py-2 rounded text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-200 border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {advancing ? 'Advancing...' : 'End Turn'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
