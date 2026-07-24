import { strictCompare } from '../../../state/validateGameState.js';
import { formatPlayerFacingZoneLabel } from '../../../utils/player_facing_zone_label.js';
import { getArmyReserveRequestSeverityCopy } from '../utils/armyReserveSeverity.js';
import { getOsidDisplayName } from '../utils/osidDisplayName.js';
import {
  getPlayerSafeBrigadeName,
  getPlayerSafeCorpsName,
  getPlayerSafeDisplayLabel,
  looksLikeRawPlayerFacingToken,
} from '../utils/playerSafeText.js';
import { t, type MessageKey } from '../i18n/index.js';
import type { LoadedGameState } from './types.js';

export interface ReserveRequestPresentation {
  requestingCommand: string;
  recipientSector: string;
  recipient: string;
  candidateForce: string;
  donorCommand: string;
  sourcePosition: string;
  readiness: string;
  travelTime: string;
  expectedEffect: string;
  weakenedPosition: string;
  opportunityCost: string;
  severity: string;
}

function playerSafeCandidateName(name: string | null | undefined): string {
  return looksLikeRawPlayerFacingToken(name)
    ? getPlayerSafeDisplayLabel(name, 'Assigned brigade')
    : getPlayerSafeBrigadeName(name);
}

export function buildReserveRequestPresentation(
  state: LoadedGameState,
  request: NonNullable<LoadedGameState['pendingReserveRequests']>[number],
  osidNameMap: Record<string, string> | null = null,
): ReserveRequestPresentation {
  const unavailable = t('corpsFront.unreported');
  const command = state.formations.find((formation) => formation.id === request.corps_id);
  const candidate = request.suggested_brigade_id
    ? state.formations.find((formation) => formation.id === request.suggested_brigade_id)
    : undefined;
  const corpsSectors = (state.corpsFrontSectors ?? [])
    .filter((sector) => sector.corps_id === request.corps_id)
    .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
  const recipientSector = request.commander_focus_zone_id
    ? formatPlayerFacingZoneLabel(request.commander_focus_zone_id)
    : corpsSectors.length === 1
      ? corpsSectors[0]!.display_name
      : unavailable;
  const requestingCommand = command ? getPlayerSafeCorpsName(command.name, command.id) : unavailable;
  const readinessKeyByValue: Record<string, MessageKey> = {
    active: 'armyReserve.readiness.active',
    ready: 'armyReserve.readiness.ready',
    forming: 'armyReserve.readiness.forming',
    mobilizing: 'armyReserve.readiness.mobilizing',
    degraded: 'armyReserve.readiness.degraded',
    refitting: 'armyReserve.readiness.refitting',
    disrupted: 'armyReserve.readiness.disrupted',
    reserve: 'armyReserve.readiness.reserve',
  };
  const readinessKey = candidate?.readiness
    ? readinessKeyByValue[candidate.readiness.trim().toLowerCase()]
    : undefined;
  const effectKeyByReason: Record<string, MessageKey> = {
    offensive_support: 'armyReserve.expectedEffect.offensiveSupport',
    defensive_gap: 'armyReserve.expectedEffect.defensiveGap',
    exploitation: 'armyReserve.expectedEffect.exploitation',
    enclave_relief: 'armyReserve.expectedEffect.enclaveRelief',
    sector_threat: 'armyReserve.expectedEffect.defensiveGap',
  };
  const effectKey = effectKeyByReason[request.reason];
  const travelTime = typeof request.travel_hops === 'number' && Number.isFinite(request.travel_hops) && request.travel_hops >= 0
    ? request.travel_hops <= 1
      ? t('armyReserve.travelLessThanWeek')
      : Math.ceil(request.travel_hops / 2) === 1
        ? t('armyReserve.travelOneWeek')
        : t('armyReserve.travelWeeks', { count: Math.ceil(request.travel_hops / 2) })
    : unavailable;
  const availableReserveCount = state.formations.filter((formation) =>
    formation.faction === request.faction
    && formation.eliteLoanState != null
    && !formation.eliteLoanState.on_loan
    && !formation.eliteLoanState.in_cooldown
    && !formation.eliteLoanState.permanently_degraded
  ).length;
  const candidateLocation = candidate?.location_osid ?? candidate?.eliteLoanState?.base_osid ?? null;
  const sourcePosition = candidateLocation ? getOsidDisplayName(candidateLocation, osidNameMap) : unavailable;
  const donor = candidate?.corps_id
    ? state.formations.find((formation) => formation.id === candidate.corps_id)
    : undefined;
  const donorCommand = donor ? getPlayerSafeCorpsName(donor.name, donor.id) : unavailable;
  const opportunityCost = candidate
    ? candidateLocation
      ? t('armyReserve.opportunityCost.location', {
          count: Math.max(0, availableReserveCount - 1),
          location: sourcePosition,
        })
      : t('armyReserve.opportunityCost.locationUnreported', {
          count: Math.max(0, availableReserveCount - 1),
        })
    : unavailable;
  const weakenedPosition = candidate && donorCommand !== unavailable && sourcePosition !== unavailable
    ? t('armyReserve.presentation.weakenedPositionValue', {
        donor: donorCommand,
        position: sourcePosition,
        opportunityCost,
      })
    : unavailable;
  return {
    requestingCommand,
    recipientSector,
    recipient: recipientSector === unavailable ? requestingCommand : `${requestingCommand} - ${recipientSector}`,
    candidateForce: candidate ? playerSafeCandidateName(candidate.name) : unavailable,
    donorCommand,
    sourcePosition,
    readiness: readinessKey ? t(readinessKey) : unavailable,
    travelTime,
    expectedEffect: effectKey ? t(effectKey) : unavailable,
    weakenedPosition,
    opportunityCost,
    severity: getArmyReserveRequestSeverityCopy(request.priority).label,
  };
}

export function buildReserveRequestSummary(presentation: ReserveRequestPresentation): string {
  return t('armyReserve.presentation.summary', {
    severity: presentation.severity,
    candidateForce: presentation.candidateForce,
    donorCommand: presentation.donorCommand,
    sourcePosition: presentation.sourcePosition,
    recipient: presentation.recipient,
    travelTime: presentation.travelTime,
    expectedEffect: presentation.expectedEffect,
    weakenedPosition: presentation.weakenedPosition,
  });
}
