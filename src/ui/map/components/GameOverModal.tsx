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
 */
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { t, useLocale, type MessageKey } from '../i18n';

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
    return labelKeys ? { title: t(labelKeys.title), subtitle: t(labelKeys.subtitle) } : { title: outcome.replace(/_/g, ' '), subtitle: '' };
}

export function GameOverModal() {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const ipc = useIPC();
    useLocale();

    if (!loadedGameState?.gameOver) return null;
    const isOpen = true;

    const { title, subtitle } = getOutcomeDisplay(loadedGameState.gameOutcome);
    const turn = loadedGameState.turn ?? 0;
    const date = loadedGameState.metadata?.date ?? t('operationsPanel.turnCount', { turn });

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
        if (f.kind === 'brigade' && f.status === 'active') {
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
            backdropClassName="bg-black/80 backdrop-blur-sm"
            panelClassName="w-[560px] max-h-[85vh] bg-panel-bg border border-panel-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
        >
            <>
                {/* Header */}
                <div className="px-8 py-6 border-b border-panel-border bg-panel-card/50 text-center">
                    <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-accent-gold/60 mb-2">
                        {t('gameOver.header', { date })}
                    </div>
                    <div id="game-over-title" className="text-xl font-bold text-text-primary uppercase tracking-wide mb-1">
                        {title}
                    </div>
                    <div className="text-[11px] text-text-secondary italic leading-relaxed max-w-sm mx-auto">
                        {subtitle}
                    </div>
                </div>

                {/* Faction Standings */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">{t('gameOver.finalStandings')}</div>
                    {factionIds.map((fid) => {
                        const color = FACTION_COLORS[fid as keyof typeof FACTION_COLORS] ?? '#888';
                        const osids = factionOsids[fid] ?? 0;
                        const pct = ((osids / totalOsids) * 100).toFixed(1);
                        const brigades = factionBrigades[fid] ?? 0;
                        return (
                            <div key={fid} className="p-3 rounded border border-panel-border bg-panel-card/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                                        <span className="text-[12px] font-bold text-text-primary uppercase tracking-wide">{fid}</span>
                                    </div>
                                    <span className="text-[11px] text-text-primary tabular-nums font-bold">{pct}%</span>
                                </div>
                                <div className="flex gap-4 text-[10px] text-text-secondary">
                                    <span>{t('gameOver.osidsControlled', { count: osids })}</span>
                                    <span>{t('gameOver.activeBrigades', { count: brigades })}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 bg-black/30 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}

                    <div className="text-[10px] text-text-secondary text-center pt-2 border-t border-panel-border">
                        {t('gameOver.campaignDuration', { weeks: turn, years: Math.floor(turn / 52), remainder: turn % 52 })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-panel-border bg-panel-card/30 flex justify-center gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
                    >
                        {t('mainMenu.newGame')}
                    </button>
                    {ipc.isAvailable && (
                        <button
                            onClick={() => ipc.loadStateDialog?.()}
                            className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-panel-border text-text-secondary hover:bg-white/5 transition-colors"
                        >
                            {t('gameOver.loadSave')}
                        </button>
                    )}
                </div>
            </>
        </Modal>
    );
}
