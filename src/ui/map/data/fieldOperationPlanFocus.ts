import { strictCompare } from '../../../state/validateGameState.js';
import { getPlayerFacingFaction } from '../../shared/playerVisibility.js';
import type { FieldOperationPlanTarget } from '../utils/fieldInspectionTarget.js';
import { getOsidDisplayName } from '../utils/osidDisplayName.js';
import type { FormationView, LoadedGameState } from './types.js';

export interface FieldOperationPlanLocation {
  osid: string;
  label: string;
}

export interface FieldOperationPlanParticipant {
  id: string;
  label: string;
  locationLabel: string;
}

export interface FieldOperationPlanPresentation {
  objectives: FieldOperationPlanLocation[];
  staging: FieldOperationPlanLocation[];
  participants: FieldOperationPlanParticipant[];
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(strictCompare);
}

export function normalizeFieldOperationPlanTarget(target: FieldOperationPlanTarget): FieldOperationPlanTarget {
  return {
    ...target,
    objectiveOsids: sortedUnique(target.objectiveOsids),
    stagingOsids: sortedUnique(target.stagingOsids),
    formationIds: sortedUnique(target.formationIds),
  };
}

function hasReportedFieldLocation(formation: FormationView): formation is FormationView & { location_osid: string } {
  return typeof formation.location_osid === 'string' && formation.location_osid.trim().length > 0;
}

function isFieldVisibleFriendly(formation: FormationView, playerFaction: string | null): boolean {
  if (playerFaction && formation.faction !== playerFaction) return false;
  if (formation.status.toLowerCase() !== 'active') return false;
  const readiness = formation.readiness.toLowerCase();
  return readiness !== 'destroyed' && readiness !== 'unreported';
}

export function buildFieldOperationPlanPresentation(args: {
  target: FieldOperationPlanTarget;
  state: LoadedGameState | null;
  osidNameMap?: Record<string, string> | null;
}): FieldOperationPlanPresentation {
  const target = normalizeFieldOperationPlanTarget(args.target);
  const location = (osid: string): FieldOperationPlanLocation => ({
    osid,
    label: getOsidDisplayName(osid, args.osidNameMap ?? null),
  });
  const state = args.state;
  const playerFaction = getPlayerFacingFaction(state);
  const formationById = new Map((state?.formations ?? []).map((formation) => [formation.id, formation]));
  const participants = target.formationIds.flatMap((id): FieldOperationPlanParticipant[] => {
    const formation = formationById.get(id);
    if (!formation || !hasReportedFieldLocation(formation) || !isFieldVisibleFriendly(formation, playerFaction)) return [];
    return [{
      id: formation.id,
      label: formation.name,
      locationLabel: getOsidDisplayName(formation.location_osid, args.osidNameMap ?? null),
    }];
  });

  return {
    objectives: target.objectiveOsids.map(location),
    staging: target.stagingOsids.map(location),
    participants,
  };
}
