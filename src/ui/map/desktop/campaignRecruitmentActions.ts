import type { IPC } from './useIPC';
import type { RecruitmentCatalogBrigade, StartNewCampaignPayload } from './types';

const BROWSER_STARTUP_SNAPSHOT_PATH = '/data/derived/startup/apr_1992_initial_save.json';

interface LoadDeps {
    ipc: IPC;
    loadSave: (jsonOrText: unknown | string) => Promise<void>;
    setLoadError: (msg: string | null) => void;
}

/**
 * Starts a new campaign for the selected faction, loads resulting state.
 * Returns true on success.
 */
export async function startCampaignFromSidePicker(
    { ipc, loadSave, setLoadError }: LoadDeps,
    faction: StartNewCampaignPayload['playerFaction'],
    scenarioKey?: string,
): Promise<boolean> {
    if (ipc.isAvailable) {
        const result = await ipc.startNewCampaign({ playerFaction: faction, scenarioKey });
        if (!result.ok || !result.stateJson) {
            setLoadError(result.error ?? 'Failed to start campaign.');
            return false;
        }
        try {
            await loadSave(result.stateJson);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setLoadError(message);
            return false;
        }
    } else {
        console.warn('[dev-map] Desktop bridge unavailable, using baked startup snapshot fallback for scenario:', scenarioKey);
        try {
            if (scenarioKey !== 'apr_1992') {
                setLoadError(`Browser fallback does not support scenario: ${scenarioKey ?? 'unknown'}.`);
                return false;
            }
            const response = await fetch(BROWSER_STARTUP_SNAPSHOT_PATH);
            if (!response.ok) {
                setLoadError(`Baked startup snapshot unavailable (${response.status}).`);
                return false;
            }
            const snapshot = await response.json();
            if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
                setLoadError('Baked startup snapshot is not a valid game state object.');
                return false;
            }
            const state = snapshot as { meta?: { player_faction?: StartNewCampaignPayload['playerFaction'] } };
            state.meta = { ...(state.meta ?? {}), player_faction: faction };
            await loadSave(state);
            return true;
        } catch (err) {
            console.error('[dev-map] Fallback failed:', err);
            setLoadError('Browser fallback failed to initialize baked startup snapshot.');
            return false;
        }
    }
}

/**
 * Fetches the recruitment catalog from IPC. Returns empty array on error.
 */
export async function fetchRecruitmentCatalog({
    ipc,
    setLoadError,
}: {
    ipc: IPC;
    setLoadError: (msg: string | null) => void;
}): Promise<RecruitmentCatalogBrigade[]> {
    try {
        const result = await ipc.getRecruitmentCatalog();
        if (!result || typeof result !== 'object') return [];
        const raw = (result as { brigades?: unknown[] }).brigades;
        if (!Array.isArray(raw)) return [];
        return raw as RecruitmentCatalogBrigade[];
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
        return [];
    }
}

interface ApplyRecruitmentDeps extends LoadDeps {
    brigadeId: string;
    equipmentClass: string;
}

/**
 * Recruits a brigade via IPC and loads the updated state. Returns true on success.
 */
export async function applyRecruitmentAndSync({
    ipc,
    loadSave,
    setLoadError,
    brigadeId,
    equipmentClass,
}: ApplyRecruitmentDeps): Promise<boolean> {
    const result = await ipc.applyRecruitment(brigadeId, equipmentClass);
    if (!result.ok || !result.stateJson) {
        setLoadError(result.error ?? 'Recruitment failed.');
        return false;
    }
    try {
        await loadSave(result.stateJson);
        return true;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
        return false;
    }
}
