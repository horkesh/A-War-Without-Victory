import type { FormationView, LoadedGameState, OperationView } from './types.js';
import { sumReportedPersonnel, type ReportedMetricSummary } from '../utils/reportedMetrics.js';
import { getPlayerSafeOperationName } from '../utils/playerSafeText.js';

const TEMPORARY_JNA_OPERATION_COMMAND_IDS = new Set(['jna_herzegovina_command']);

export interface OperationTaskForceInspectionView {
  operationName: string;
  participants: FormationView[];
  personnel: ReportedMetricSummary;
  goalCount: number;
  commanderName: string | null;
  organicStaffAbsent: boolean;
  permanentSectorsAbsent: boolean;
  provenance: 'scenario_authored';
}

function isJnaPhantomParticipant(formation: FormationView): boolean {
  return formation.kind === 'jna_phantom' || formation.tags?.includes('jna_phantom') === true;
}

export function buildOperationTaskForceInspection(
  operation: OperationView,
  state: LoadedGameState,
): OperationTaskForceInspectionView | null {
  if (!TEMPORARY_JNA_OPERATION_COMMAND_IDS.has(operation.corps_id)) return null;

  const participantIds = operation.participating_brigade_ids ?? [];
  if (participantIds.length === 0) return null;
  const formationById = new Map(state.formations.map((formation) => [formation.id, formation]));
  const participants = participantIds
    .map((id) => formationById.get(id))
    .filter((formation): formation is FormationView => formation != null);
  if (participants.length !== participantIds.length || !participants.every(isJnaPhantomParticipant)) return null;

  const command = formationById.get(operation.corps_id);
  const commander = state.namedOfficerData?.find((officer) => officer.id === operation.commander_officer_id);
  return {
    operationName: getPlayerSafeOperationName(operation.name, operation.corps_id, operation.display_name),
    participants,
    personnel: sumReportedPersonnel(participants),
    goalCount: operation.objectives?.length ?? 0,
    commanderName: commander?.name ?? null,
    organicStaffAbsent: command?.kind === 'corps_asset' && (command.personnel ?? 0) === 0,
    permanentSectorsAbsent: !(state.corpsFrontSectors ?? []).some((sector) => sector.corps_id === operation.corps_id),
    provenance: 'scenario_authored',
  };
}
