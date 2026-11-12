import type { IPC } from './useIPC';
import type { LoadedGameState } from '../data/types';
import { buildTurnAftermathDigest, buildTurnAftermathView, classifyTurnAftermathWeight, type TurnAftermathDigest, type TurnAftermathReportInput, type TurnAftermathView } from '../data/turnAftermath';
import type { LastTurnReport } from '../store/gameStore';
import { playerFacingErrorCopy } from '../utils/errorCopy';

interface AdvanceTurnDeps {
    ipc: Pick<IPC, 'advanceTurn' | 'getCurrentGameState'>;
    loadSave: (jsonOrText: unknown | string) => Promise<void>;
    clearStagedOrders: () => void;
    setLoadError: (msg: string | null) => void;
    getCurrentState?: () => LoadedGameState | null;
    getOsidNameMap?: () => Record<string, string> | null;
    setLastTurnReport?: (report: LastTurnReport | null) => void;
    setTurnAftermath?: (view: TurnAftermathView | null) => void;
    setTurnAftermathOpen?: (open: boolean) => void;
    setTurnAftermathDigest?: (digest: TurnAftermathDigest | null) => void;
}

function normalizeTurnReport(report: unknown): (LastTurnReport & TurnAftermathReportInput) | null {
    if (report == null || typeof report !== 'object') return null;
    const candidate = report as Record<string, unknown>;
    return {
        phase: typeof candidate.phase === 'string' ? candidate.phase : undefined,
        turn: typeof candidate.turn === 'number' ? candidate.turn : undefined,
        player_faction: typeof candidate.player_faction === 'string' || candidate.player_faction === null
            ? candidate.player_faction
            : undefined,
        probe: typeof candidate.probe === 'string' || candidate.probe === null
            ? candidate.probe
            : undefined,
        details: candidate.details && typeof candidate.details === 'object'
            ? candidate.details as LastTurnReport['details']
            : undefined,
    };
}

/**
 * Calls advance-turn IPC, loads resulting state into store, and clears staged orders.
 * The mounted tactical shell (`PresidentialToolbar`) wraps this with setAdvancing(true/false).
 */
export async function advanceTurnAndSync({
    ipc,
    loadSave,
    clearStagedOrders,
    setLoadError,
    getCurrentState,
    getOsidNameMap,
    setLastTurnReport,
    setTurnAftermath,
    setTurnAftermathOpen,
    setTurnAftermathDigest,
}: AdvanceTurnDeps): Promise<void> {
    const previousState = getCurrentState?.() ?? null;
    setTurnAftermathDigest?.(null);
    const result = await ipc.advanceTurn();
    if (!result.ok) {
        setLoadError(playerFacingErrorCopy(result.error ?? 'Advance turn failed.'));
        return;
    }
    const stateJson = await ipc.getCurrentGameState();
    if (!stateJson) {
        setLoadError('Turn advanced, but the updated player-visible state was unavailable.');
        return;
    }
    clearStagedOrders();
    const report = normalizeTurnReport(result.report);
    if (report) setLastTurnReport?.(report);
    try {
        await loadSave(stateJson);
        const nextState = getCurrentState?.() ?? null;
        const aftermath = buildTurnAftermathView({
            previousState,
            nextState,
            lastTurnReport: report,
            osidNameMap: getOsidNameMap?.() ?? null,
        });
        if (aftermath) {
            setTurnAftermath?.(aftermath);
            if (classifyTurnAftermathWeight(aftermath) === 'heavy') {
                setTurnAftermathDigest?.(null);
                setTurnAftermathOpen?.(true);
            } else {
                setTurnAftermathDigest?.(buildTurnAftermathDigest(aftermath));
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
    }
}

// Retired 2026-11-12 (posture model option 2): stagePostureOrderAction,
// stageAssignBrigadeToSectorAction and assignBrigadeToSectorOverrideAction had no screen.
// The president never sets brigade posture or moves brigades between OGs; corps and OG
// stance changes reach him as stance matters (src/sim/combat/stance_matters.ts).
