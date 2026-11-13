/**
 * Peace Phase Status Panel — displayed during peace/Phase 0.
 * Shows: capital balances, declaration pressure, referendum countdown, alliance value, events.
 *
 * Surface redesign, step 4 (2026-11-12): the pre-war status stays docked at the left,
 * because the map is what this phase shows, but it is an opaque surface card: gold
 * border, the surface header and section labels, text 13 px and up, a gold End week.
 */
import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { factionHex } from '../../shared/factionPalette';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
import { getTurnAftermathAdvanceDeps } from '../desktop/turnAftermathAdvanceDeps';
import {
    getPlayerSafeMilitaryFactionName,
    getPlayerSafePoliticalFactionName,
} from '../utils/playerSafeText';
import { turnToDateString } from '../utils/formatters';
import { t } from '../i18n';
import {
    SURFACE_CHIP,
    SURFACE_LABEL,
    SURFACE_PRIMARY_BUTTON_COMPACT,
    SURFACE_TONE,
    SurfaceSection,
} from './surface/Surface';

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] text-[#b9ad94]">{label}</span>
                <span className="font-mono text-[15px] font-semibold tabular-nums text-[#f1e6c8]">{Math.round(value)}/{max}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#262b35]">
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
        <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] text-[#b9ad94]">{t('peace.bosniakCroatAlliance')}</span>
                <span style={{ color }} className="text-[15px] font-semibold">{label}</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-[#262b35]">
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
        <aside
            data-testid="peace-status-panel"
            aria-label={t('peace.preWarPhase')}
            className="absolute left-4 top-[4.5rem] z-50 flex max-h-[calc(var(--interface-viewport-height,100vh)-7rem)] w-[clamp(21rem,calc(var(--interface-viewport-width,100vw)*0.2),27rem)] flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
        >
            <header className="flex shrink-0 flex-col gap-1 border-b border-[#262b35] bg-[#141821] px-5 py-4">
                <span className={SURFACE_LABEL}>{t('peace.preWarPhase')}</span>
                <h2 className="m-0 text-[24px] font-semibold leading-tight text-[#f1e6c8]">{date}</h2>
                {peaceReferendum && !peaceReferendum.held && peaceReferendum.deadline_turn != null && (
                    <p className="m-0 pt-1 text-[15px] leading-snug text-amber-200">
                        {t('peace.referendumDeadline', { date: turnToDateString(peaceReferendum.deadline_turn) })}
                        {turn != null && <span className="text-[#b9ad94]"> ({t('peace.turnsRemaining', { count: peaceReferendum.deadline_turn - turn })})</span>}
                    </p>
                )}
                {peaceReferendum?.held && peaceReferendum.war_start_turn != null && (
                    <p className="m-0 pt-1 text-[15px] font-semibold leading-snug text-red-200">
                        {t('peace.warBegins', { date: turnToDateString(peaceReferendum.war_start_turn) })}
                        {turn != null && peaceReferendum.war_start_turn > turn && (
                            <span className="font-normal text-[#b9ad94]"> ({t('peace.turnsRemaining', { count: peaceReferendum.war_start_turn - turn })})</span>
                        )}
                    </p>
                )}
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
                <div className="flex flex-col gap-3">
                    {peaceFactions.map((f) => {
                        const color = factionHex(f.id);
                        const isPlayer = f.id === playerFaction;
                        return (
                            <div
                                key={f.id}
                                className={`flex flex-col gap-2.5 rounded-md border px-4 py-3.5 ${isPlayer ? 'border-[#c9a75c] bg-[#232936]' : 'border-[#2a303c] bg-[#161a22]'}`}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                                    <span className="text-[17px] font-semibold text-[#f1e6c8]">
                                        {getPlayerSafeMilitaryFactionName(f.id)}
                                    </span>
                                    <span className="flex-grow" />
                                    {isPlayer && (
                                        <span className={`${SURFACE_CHIP} ${SURFACE_TONE.info}`}>
                                            {t('peace.you')}
                                        </span>
                                    )}
                                    {f.declared && (
                                        <span className={`${SURFACE_CHIP} ${SURFACE_TONE.danger}`}>
                                            {t('peace.declared')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[15px] text-[#b9ad94]">{getPlayerSafePoliticalFactionName(f.id)}</div>

                                {isPlayer ? (
                                    <ProgressBar value={f.capital} max={100} color={color} label={t('peace.preWarCapital')} />
                                ) : (
                                    <div className="text-[15px] text-[#ddd1b3]">
                                        {f.declared
                                            ? t('peace.politicalCourseDeclared')
                                            : t('peace.declarationPosture', { status: getDeclarationPressureStatus(f.declaration_pressure, f.declared) })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {peaceAllianceValue != null && (
                    <div className="border-t border-[#262b35] pt-4">
                        <AllianceBar value={peaceAllianceValue} />
                    </div>
                )}

                {peaceEvents && peaceEvents.length > 0 && (
                    <SurfaceSection label={t('peace.eventsThisTurn')}>
                        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                            {peaceEvents.map((e, i) => (
                                <li key={i} className="rounded-md border border-[#2a303c] bg-[#161a22] px-3.5 py-2.5 text-[15px] text-[#ddd1b3]">
                                    <span className="font-semibold text-[#e0c27a]">{peaceEventTypeLabel(e.type)}</span>
                                    {e.faction && <span className="ml-1 text-[#b9ad94]">({getPlayerSafeMilitaryFactionName(e.faction)})</span>}
                                </li>
                            ))}
                        </ul>
                    </SurfaceSection>
                )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-[#262b35] bg-[#12161e] px-5 pb-5 pt-4">
                {hasInvestments && (
                    <div className="flex items-center gap-2 text-[15px] text-amber-200">
                        <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                        {t('peace.investmentsPending')}
                    </div>
                )}
                <button
                    type="button"
                    onClick={handleEndTurn}
                    disabled={!ipc.isAvailable || advancing}
                    className={`w-full ${SURFACE_PRIMARY_BUTTON_COMPACT}`}
                >
                    {advancing ? t('peace.advancing') : t('peace.endTurn')}
                </button>
            </div>
        </aside>
    );
}
