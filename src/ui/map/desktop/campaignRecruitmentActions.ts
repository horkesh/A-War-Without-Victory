import type {
  DesktopBridgeClient,
  RecruitmentCatalogBrigade,
  RecruitmentCatalogResult,
  StartNewCampaignPayload,
} from './types';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function isRecruitmentCatalogBrigade(value: unknown): value is RecruitmentCatalogBrigade {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.faction === 'string' &&
    typeof item.name === 'string' &&
    typeof item.manpower_cost === 'number' &&
    typeof item.capital_cost === 'number' &&
    typeof item.default_equipment_class === 'string'
  );
}

interface SidePickerDeps {
  ipc: DesktopBridgeClient;
  loadSave: (jsonOrText: unknown | string) => Promise<void>;
  setLoadError: (message: string | null) => void;
}

export async function startCampaignFromSidePicker(
  deps: SidePickerDeps,
  playerFaction: StartNewCampaignPayload['playerFaction'],
  scenarioKey: StartNewCampaignPayload['scenarioKey'] = 'apr_1992'
): Promise<boolean> {
  const { ipc, loadSave, setLoadError } = deps;
  if (!ipc.isAvailable) {
    setLoadError('New campaign is available in desktop mode only.');
    return false;
  }
  try {
    const result = await ipc.startNewCampaign({ playerFaction, scenarioKey });
    if (!result.ok) {
      setLoadError(result.error ?? 'Failed to start campaign.');
      return false;
    }
    if (result.stateJson == null) {
      setLoadError('Campaign started but no state payload was returned.');
      return false;
    }
    await loadSave(result.stateJson);
    return true;
  } catch (error) {
    setLoadError(toErrorMessage(error));
    return false;
  }
}

interface RecruitmentCatalogDeps {
  ipc: DesktopBridgeClient;
  setLoadError: (message: string | null) => void;
}

export async function fetchRecruitmentCatalog(
  deps: RecruitmentCatalogDeps
): Promise<RecruitmentCatalogBrigade[]> {
  const { ipc, setLoadError } = deps;
  if (!ipc.isAvailable) {
    setLoadError('Recruitment catalog is available in desktop mode only.');
    return [];
  }
  try {
    const result: RecruitmentCatalogResult | null = await ipc.getRecruitmentCatalog();
    if (!result) {
      setLoadError('Recruitment catalog unavailable.');
      return [];
    }
    if (result.error) {
      setLoadError(result.error);
      return [];
    }
    const brigades = Array.isArray(result.brigades)
      ? result.brigades.filter(isRecruitmentCatalogBrigade)
      : [];
    return brigades.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    setLoadError(toErrorMessage(error));
    return [];
  }
}

interface ApplyRecruitmentDeps {
  ipc: DesktopBridgeClient;
  loadSave: (jsonOrText: unknown | string) => Promise<void>;
  setLoadError: (message: string | null) => void;
  brigadeId: string;
  equipmentClass: string;
}

export async function applyRecruitmentAndSync(deps: ApplyRecruitmentDeps): Promise<boolean> {
  const { ipc, loadSave, setLoadError, brigadeId, equipmentClass } = deps;
  if (!ipc.isAvailable) {
    setLoadError('Recruitment is available in desktop mode only.');
    return false;
  }
  try {
    const result = await ipc.applyRecruitment(brigadeId, equipmentClass);
    if (!result.ok) {
      setLoadError(result.error ?? 'Recruitment failed.');
      return false;
    }
    if (result.stateJson == null) {
      setLoadError('Recruitment succeeded but no state payload was returned.');
      return false;
    }
    await loadSave(result.stateJson);
    return true;
  } catch (error) {
    setLoadError(toErrorMessage(error));
    return false;
  }
}
