import { useEffect } from 'react';
import { useGameStore, type LastTurnReport } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';

type ProbeReactionWindow = Window & {
    __AWWV_RUNTIME_PROBE_ACTIVE?: boolean;
};

type ProbeReactionKind = 'game_state_updated' | 'turn_report_updated';

function recordDesktopProbeReaction(kind: ProbeReactionKind, payload: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    const probeWindow = window as ProbeReactionWindow;
    if (!probeWindow.__AWWV_RUNTIME_PROBE_ACTIVE) return;
    const root = document.documentElement;
    if (!root) return;
    const prefix = kind === 'game_state_updated'
        ? 'awwvProbeGameState'
        : 'awwvProbeTurnReport';

    for (const [key, value] of Object.entries(payload).sort(([left], [right]) => left.localeCompare(right))) {
        const datasetKey = `${prefix}${key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()).replace(/^([a-z])/, (_match, letter: string) => letter.toUpperCase())}`;
        root.dataset[datasetKey] = value == null ? 'null' : String(value);
    }
}

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
    // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: stage sidecar before next loadSave().
    const setPendingReplaySaveSequence = useGameStore((s) => s.setPendingReplaySaveSequence);
    const setPendingReplaySaveManifest = useGameStore((s) => s.setPendingReplaySaveManifest);

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.awwvDesktopSessionReady = '1';
        }
        if (!ipc.isAvailable) return;

        let active = true;

        const applyStateJson = async (stateJson: string | null) => {
            if (!active || !stateJson) return;
            try {
                await loadSave(stateJson);
                const storeState = useGameStore.getState();
                const nextState = storeState.loadedGameState;
                recordDesktopProbeReaction('game_state_updated', {
                    fingerprint_matches_payload: storeState.lastLoadedStateFingerprint === stateJson,
                    location_path: window.location.pathname,
                    payload_length: stateJson.length,
                    player_faction: nextState?.player_faction ?? null,
                    route_mode: window.location.search.includes('desktop_window=sandbox') ? 'sandbox' : 'operational',
                    turn: nextState?.turn ?? null,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setLoadError(message);
            }
        };

        // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: subscribe to sidecar
        // BEFORE game-state. The desktop main process emits the sequence
        // BEFORE the game-state on load, so by the time loadSave() runs the
        // pending sequence is already staged and gets merged via parseGameState.
        const unsubscribeReplaySequence = ipc.subscribeReplaySequenceUpdated((sequenceJson: string) => {
            if (!active || !sequenceJson) return;
            try {
                const parsed = JSON.parse(sequenceJson);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setPendingReplaySaveSequence(parsed as ReadonlyArray<unknown>);
                } else {
                    setPendingReplaySaveSequence(null);
                }
            } catch (_err) {
                // Bad sidecar JSON — fail closed (no replay tab) rather than crashing the load.
                setPendingReplaySaveSequence(null);
            }
        });

        const unsubscribeReplayManifest = ipc.subscribeReplayManifestUpdated((manifestJson: string) => {
            if (!active || !manifestJson) return;
            try {
                const parsed = JSON.parse(manifestJson);
                if (parsed?.schema_version === 1 && Array.isArray(parsed.frames) && parsed.frames.length > 0) {
                    setPendingReplaySaveManifest(parsed);
                } else {
                    setPendingReplaySaveManifest(null);
                }
            } catch (_err) {
                setPendingReplaySaveManifest(null);
            }
        });

        const unsubscribeGameState = ipc.subscribeGameStateUpdated((stateJson: string) => {
            void applyStateJson(stateJson);
        });

        const unsubscribeTurnReport = ipc.subscribeTurnReportUpdated((report: unknown) => {
            if (active && report != null && typeof report === 'object') {
                setLastTurnReport(report as LastTurnReport);
                const lastTurnReport = useGameStore.getState().lastTurnReport;
                recordDesktopProbeReaction('turn_report_updated', {
                    location_path: window.location.pathname,
                    payload_matches_probe: lastTurnReport?.probe === (typeof (report as { probe?: unknown }).probe === 'string'
                        ? (report as { probe?: string }).probe ?? null
                        : null),
                    player_faction: lastTurnReport?.player_faction ?? null,
                    probe: typeof (report as { probe?: unknown }).probe === 'string'
                        ? (report as { probe?: string }).probe ?? null
                        : null,
                    route_mode: window.location.search.includes('desktop_window=sandbox') ? 'sandbox' : 'operational',
                    turn: lastTurnReport?.turn ?? null,
                });
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
            unsubscribeReplaySequence();
            unsubscribeReplayManifest();
            if (typeof document !== 'undefined') {
                delete document.documentElement.dataset.awwvDesktopSessionReady;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // stable: ipc never changes, store slices are stable setters
}
