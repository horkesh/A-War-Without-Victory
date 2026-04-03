import { useEffect } from 'react';
import { useGameStore, type LastTurnReport } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';

/**
 * Subscribes to Electron preload bridge events (game-state-updated, turn-report-updated)
 * and fetches the initial game state when running in desktop mode.
 *
 * Replaces the inline useEffect in the Phase 3 App.tsx.
 * No-op when window.awwv is not available (browser dev mode).
 */
export function useDesktopSession(): void {
    const ipc = useIPC();
    const loadSave = useGameStore((s) => s.loadSave);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const setLastTurnReport = useGameStore((s) => s.setLastTurnReport);

    useEffect(() => {
        if (!ipc.isAvailable) return;

        let active = true;

        const applyStateJson = async (stateJson: string | null) => {
            if (!active || !stateJson) return;
            try {
                await loadSave(stateJson);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setLoadError(message);
            }
        };

        const unsubscribeGameState = ipc.subscribeGameStateUpdated((stateJson: string) => {
            void applyStateJson(stateJson);
        });

        const unsubscribeTurnReport = ipc.subscribeTurnReportUpdated((report: unknown) => {
            if (active && report != null && typeof report === 'object') {
                setLastTurnReport(report as LastTurnReport);
            }
        });

        ipc.getCurrentGameState()
            .then((stateJson) => applyStateJson(stateJson))
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : String(err);
                setLoadError(message);
            });

        return () => {
            active = false;
            unsubscribeGameState();
            unsubscribeTurnReport();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // stable: ipc never changes, store slices are stable setters
}
