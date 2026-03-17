import type { IPC } from './useIPC';
import type { RecruitmentCatalogBrigade, StartNewCampaignPayload } from './types';

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
        // Browser fallback: construct a mock state for April 1992
        console.warn('[dev-map] Desktop bridge unavailable, using browser fallback for scenario:', scenarioKey);
        try {
            let polControl: Record<string, string | null> = {};
            if (scenarioKey === 'apr_1992') {
                const r = await fetch('/data/derived/operational/operational_political_control.json');
                if (r.ok) {
                    const data = await r.json();
                    polControl = data.by_settlement_id || {};
                }
            }

            const mockState: any = {
                meta: {
                    turn: scenarioKey === 'apr_1992' ? 30 : 0,
                    phase: scenarioKey === 'apr_1992' ? 'war' : 'peace',
                    player_faction: faction,
                    date: scenarioKey === 'apr_1992' ? 'Apr 1992' : 'Sep 1991',
                },
                military: {
                    formations: {},
                    militia_pools: {},
                    brigade_movement_state: {},
                    brigade_front_assignment: {},
                    army_theatre_assignment: {},
                    theatres: {},
                    casualty_ledger: {},
                },
                political: {
                    political_controllers: polControl,
                    contested_control: {},
                    control_events: [],
                },
                displacement: {
                    civilian_casualties: {},
                },
            };

            await loadSave(mockState);
            return true;
        } catch (err) {
            console.error('[dev-map] Fallback failed:', err);
            setLoadError('Browser fallback failed to initialize mock state.');
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
