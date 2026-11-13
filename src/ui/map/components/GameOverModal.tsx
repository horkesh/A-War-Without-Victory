/**
 * Game Over Modal - shown when state.meta.game_over is true.
 * Displays outcome, faction standings, and options (New Game / Load).
 *
 * Migrated to the shared `<Modal>` wrapper in
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION. Terminal modal: `dismissible={false}`
 * (no ESC, no click-outside) - the only valid close path is starting a new
 * game (`window.location.reload()`) or loading a save (which replaces the
 * game state and clears `gameOver`). No `onClose` callback exists or is
 * needed.
 *
 * Surface redesign, step 4 (2026-11-12): the Modal panel is a compact surface frame
 * (surface header, standings as panels, fixed action footer). Wording unchanged.
 */
import { useEffect } from 'react';
import { playCue } from '../audio/audio_engine';
import { useGameStore } from '../store/gameStore';
import { factionHex } from '../../shared/factionPalette';
import { useIPC } from '../desktop/useIPC';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { t, useLocale, type Locale, type MessageKey } from '../i18n';
import { turnToDateString } from '../utils/formatters';
import { isFieldedTacticalFormation } from '../../shared/playerVisibility';
import {
    SURFACE_MODAL_BACKDROP,
    SURFACE_MODAL_PANEL_COMPACT,
    SURFACE_PRIMARY_BUTTON_COMPACT,
    SURFACE_SECONDARY_BUTTON,
    SurfaceHeader,
    SurfaceModalBody,
    SurfaceModalFooter,
    SurfacePanel,
    SurfaceSection,
} from './surface/Surface';

const OUTCOME_LABEL_KEYS: Record<string, { title: MessageKey; subtitle: MessageKey }> = {
    victory_RBiH: { title: 'gameOver.outcome.victory_RBiH.title', subtitle: 'gameOver.outcome.victory_RBiH.subtitle' },
    victory_RS: { title: 'gameOver.outcome.victory_RS.title', subtitle: 'gameOver.outcome.victory_RS.subtitle' },
    victory_HRHB: { title: 'gameOver.outcome.victory_HRHB.title', subtitle: 'gameOver.outcome.victory_HRHB.subtitle' },
    timeout_stalemate: { title: 'gameOver.outcome.timeout_stalemate.title', subtitle: 'gameOver.outcome.timeout_stalemate.subtitle' },
    faction_collapse: { title: 'gameOver.outcome.faction_collapse.title', subtitle: 'gameOver.outcome.faction_collapse.subtitle' },
    ceasefire: { title: 'gameOver.outcome.ceasefire.title', subtitle: 'gameOver.outcome.ceasefire.subtitle' },
};

function getOutcomeDisplay(outcome?: string): { title: string; subtitle: string } {
    if (!outcome) return { title: t('gameOver.title'), subtitle: '' };
    const labelKeys = OUTCOME_LABEL_KEYS[outcome];
    return labelKeys ? { title: t(labelKeys.title), subtitle: t(labelKeys.subtitle) } : { title: t('gameOver.outcome.unreported.title'), subtitle: '' };
}

function formatSettlementsControlled(count: number, locale: Locale): string {
    if (locale === 'bcs') {
        return t('gameOver.osidsControlled', { count });
    }
    return t(count === 1 ? 'gameOver.osidControlled.one' : 'gameOver.osidControlled.many', { count });
}

export function GameOverModal() {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const ipc = useIPC();
    const [locale] = useLocale();
    const gameOver = loadedGameState?.gameOver === true;
    useEffect(() => { if (gameOver) void playCue('game_over'); }, [gameOver]);

    if (!loadedGameState?.gameOver) return null;
    const isOpen = true;

    const { title, subtitle } = getOutcomeDisplay(loadedGameState.gameOutcome);
    const turn = loadedGameState.turn ?? 0;
    const date = loadedGameState.metadata?.date ?? turnToDateString(turn);

    // Gather territory stats from controlBySettlement.
    const controllers = loadedGameState.controlBySettlement ?? {};
    const factionOsids: Record<string, number> = {};
    for (const controller of Object.values(controllers)) {
        if (typeof controller === 'string') {
            factionOsids[controller] = (factionOsids[controller] ?? 0) + 1;
        }
    }
    const totalOsids = Object.keys(controllers).length || 1;

    // Gather formation counts.
    const formations = loadedGameState.formations ?? [];
    const factionBrigades: Record<string, number> = {};
    for (const f of formations) {
        if (isFieldedTacticalFormation(f)) {
            factionBrigades[f.faction] = (factionBrigades[f.faction] ?? 0) + 1;
        }
    }

    const factionIds = ['RBiH', 'RS', 'HRHB'];

    return (
        <Modal
            isOpen={isOpen}
            dismissible={false}
            zIndex={Z.GAME_OVER}
            ariaLabelledBy="game-over-title"
            backdropClassName={SURFACE_MODAL_BACKDROP}
            panelClassName={SURFACE_MODAL_PANEL_COMPACT}
        >
            <>
                <SurfaceHeader eyebrow={t('gameOver.header', { date })} title={title} titleId="game-over-title" />

                <SurfaceModalBody>
                    {subtitle && <p className="m-0 max-w-[48rem] text-[18px] leading-relaxed text-[#ddd1b3]">{subtitle}</p>}
                    <SurfaceSection label={t('gameOver.finalStandings')}>
                        <div className="flex flex-col gap-2.5">
                            {factionIds.map((fid) => {
                                const color = factionHex(fid);
                                const osids = factionOsids[fid] ?? 0;
                                const pct = ((osids / totalOsids) * 100).toFixed(1);
                                const brigades = factionBrigades[fid] ?? 0;
                                return (
                                    <SurfacePanel key={fid} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                                                <span className="text-[18px] font-semibold text-[#f1e6c8]">{fid}</span>
                                            </div>
                                            <span className="font-mono text-[18px] font-semibold tabular-nums text-[#f1e6c8]">{pct}%</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[16px] text-[#c2b69c]">
                                            <span>{formatSettlementsControlled(osids, locale)}</span>
                                            <span>{t('gameOver.activeBrigades', { count: brigades })}</span>
                                        </div>
                                        <div className="h-2.5 overflow-hidden rounded-full bg-[#262b35]">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                        </div>
                                    </SurfacePanel>
                                );
                            })}
                        </div>
                    </SurfaceSection>

                    <p className="m-0 border-t border-[#262b35] pt-3 text-[16px] text-[#b9ad94]">
                        {t('gameOver.campaignDuration', { weeks: turn, years: Math.floor(turn / 52), remainder: turn % 52 })}
                    </p>
                </SurfaceModalBody>

                <SurfaceModalFooter>
                    {ipc.isAvailable && (
                        <button
                            type="button"
                            onClick={() => ipc.loadStateDialog?.()}
                            className={SURFACE_SECONDARY_BUTTON}
                        >
                            {t('gameOver.loadSave')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className={SURFACE_PRIMARY_BUTTON_COMPACT}
                    >
                        {t('mainMenu.newGame')}
                    </button>
                </SurfaceModalFooter>
            </>
        </Modal>
    );
}
