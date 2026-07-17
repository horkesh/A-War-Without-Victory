/**
 * Peace Phase Status Panel — displayed during peace/Phase 0.
 * Shows: capital balances, declaration pressure, referendum countdown, alliance value, events.
 */
import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from '../desktop/turnAftermathAdvanceDeps';
import {
    getPlayerSafeMilitaryFactionName,
    getPlayerSafePoliticalFactionName,
} from '../utils/playerSafeText';
import { turnToDateString } from '../utils/formatters';
import { t } from '../i18n';

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="space-y-0.5">
            <div className="flex justify-between text-xs">
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
    const label = value > 0.5 ? t('peace.allied') : value > 0.2 ? t('peace.cooperative') : value > -0.2 ? t('peace.strained') : value > -0.5 ? t('peace.hostile') : t('peace.openWar');
    return (
        <div className="space-y-0.5">
            <div className="flex justify-between text-xs">
                <span className="text-text-secondary uppercase tracking-wider">{t('peace.bosniakCroatAlliance')}</span>
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

function getDeclarationPressureStatus(value: number, declared: boolean): string {
    if (declared) return t('peace.declared');
    if (value >= 80) return t('peace.critical');
    if (value >= 50) return t('peace.elevated');
    if (value >= 25) return t('peace.watch');
    return t('peace.quiet');
}

function peaceEventTypeLabel(type: string): string {
    switch (type) {
        case 'investment':
        case 'staged_investment':
            return t('peace.event.investment');
        case 'referendum':
        case 'referendum_result':
            return t('peace.event.referendum');
        case 'declaration':
        case 'declaration_pressure':
            return t('peace.event.declaration');
        case 'alliance_shift':
            return t('peace.event.alliance');
        default:
            return t('peace.event.politicalDevelopment');
    }
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
        await advanceTurnAndSync({
            ipc,
            loadSave,
            clearStagedOrders,
            setLoadError,
            ...getTurnAftermathAdvanceDeps(),
        });
        setAdvancing(false);
    }, [ipc, loadSave, clearStagedOrders, setLoadError, advancing]);

    if (!loadedGameState) return null;

    const { peaceFactions, peaceAllianceValue, peaceReferendum, peaceEvents, turn } = loadedGameState;
    const date = loadedGameState.metadata?.date ?? turnToDateString(turn ?? 0);
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
                    <div className="text-xs font-mono uppercase tracking-[0.3em] text-accent-gold/70 mb-0.5">{t('peace.preWarPhase')}</div>
                    <div className="text-sm font-bold text-text-primary uppercase tracking-wide">
                        {date}
                    </div>
                    {peaceReferendum && !peaceReferendum.held && peaceReferendum.deadline_turn != null && (
                        <div className="text-xs text-amber-400 mt-1">
                            {t('peace.referendumDeadline', { date: turnToDateString(peaceReferendum.deadline_turn) })}
                            {turn != null && <span className="text-text-secondary"> ({t('peace.turnsRemaining', { count: peaceReferendum.deadline_turn - turn })})</span>}
                        </div>
                    )}
                    {peaceReferendum?.held && peaceReferendum.war_start_turn != null && (
                        <div className="text-xs text-red-400 font-bold mt-1">
                            {t('peace.warBegins', { date: turnToDateString(peaceReferendum.war_start_turn) })}
                            {turn != null && peaceReferendum.war_start_turn > turn && (
                                <span className="text-text-secondary"> ({t('peace.turnsRemaining', { count: peaceReferendum.war_start_turn - turn })})</span>
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
                                        <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                                            {getPlayerSafeMilitaryFactionName(f.id)}
                                        </span>
                                    </div>
                                    {isPlayer && (
                                        <span className="text-xs bg-accent-gold/20 text-accent-gold px-1.5 py-0.5 rounded border border-accent-gold/30 font-bold uppercase tracking-wider">
                                            {t('peace.you')}
                                        </span>
                                    )}
                                    {f.declared && (
                                        <span className="text-xs bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold uppercase">
                                            {t('peace.declared')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-text-secondary">{getPlayerSafePoliticalFactionName(f.id)}</div>

                                {isPlayer ? (
                                    <ProgressBar value={f.capital} max={100} color={color} label={t('peace.preWarCapital')} />
                                ) : (
                                    <div className="text-xs text-text-secondary uppercase tracking-wider">
                                        {f.declared
                                            ? t('peace.politicalCourseDeclared')
                                            : t('peace.declarationPosture', { status: getDeclarationPressureStatus(f.declaration_pressure, f.declared) })}
                                    </div>
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
                            <div className="text-xs uppercase tracking-wider text-text-secondary font-semibold">{t('peace.eventsThisTurn')}</div>
                            {peaceEvents.map((e, i) => (
                                <div key={i} className="text-xs text-text-primary bg-black/20 px-2 py-1 rounded">
                                    <span className="font-semibold text-accent-gold">{peaceEventTypeLabel(e.type)}</span>
                                    {e.faction && <span className="text-text-secondary ml-1">({getPlayerSafeMilitaryFactionName(e.faction)})</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* End Turn */}
                    <div className="pt-3 border-t border-panel-border">
                        {hasInvestments && (
                            <div className="text-xs text-amber-400 mb-2 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                                {t('peace.investmentsPending')}
                            </div>
                        )}
                        <button
                            onClick={handleEndTurn}
                            disabled={!ipc.isAvailable || advancing}
                            className="w-full py-2 rounded text-xs font-bold uppercase tracking-[0.2em] transition-all duration-200 border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {advancing ? t('peace.advancing') : t('peace.endTurn')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
