import { Z } from '../../../shared/zIndex.js';
import { useGameStore } from '../../store/gameStore.js';
import { turnToDateString } from '../../utils/formatters.js';

export function ReplayInspectionBanner(): JSX.Element | null {
    const inspection = useGameStore((s) => s.replayInspection);
    const exitReplayInspection = useGameStore((s) => s.exitReplayInspection);

    if (!inspection) return null;

    const label = inspection.date ?? turnToDateString(inspection.turn);
    const finalLabel = `Final ${inspection.finalDate ?? turnToDateString(inspection.finalTurn)}`;

    return (
        <div
            className="fixed left-1/2 top-16 flex -translate-x-1/2 items-center gap-3 rounded border border-accent-gold/40 bg-panel-bg/95 px-4 py-2 shadow-2xl backdrop-blur"
            style={{ zIndex: Z.GAME_OVER - 1 }}
            data-awwv-replay-inspection-banner="true"
        >
            <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-accent-gold/80">
                    Replay Inspection
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <span className="font-mono text-text-primary">{label}</span>
                    <span className="text-text-secondary/50">{finalLabel}</span>
                </div>
            </div>
            <button
                type="button"
                onClick={exitReplayInspection}
                className="shrink-0 rounded border border-panel-border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-text-primary transition-colors hover:bg-white/5"
                data-awwv-replay-exit-inspection="true"
            >
                Return to Final
            </button>
        </div>
    );
}
