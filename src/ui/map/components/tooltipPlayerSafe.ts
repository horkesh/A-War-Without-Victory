import type {
  CorpsFrontSectorView,
  FormationView,
  FrontEdgeView,
  LoadedGameState,
} from '../data/types';
import { getPlayerFacingFaction, filterPlayerVisibleMapFormations } from '../../shared/playerVisibility';
import { getOsidDisplayName } from '../utils/osidDisplayName';

export interface PlayerSafeFormationTooltipModel {
  classification: 'own' | 'enemy_contact';
  title: string;
  subtitle: string | null;
  personnel: number | null;
  cohesion: number | null;
  posture: string | null;
  aorSummary: string | null;
  orderLine: string | null;
  statusLine: string | null;
  showHomeMunicipality: boolean;
}

export interface PlayerSafeFrontTooltipModel {
  title: string;
  sectorName: string | null;
  pressureLine: string;
  densityValue: number | null;
  densityLabel: string | null;
  threatValue: number | null;
  threatLabel: string | null;
  ownFormationLabels: string[];
  enemyContactSummary: string | null;
}

function getDensityLabel(density: number): string {
  if (density < 0.5) return 'THIN';
  if (density > 1.0) return 'DENSE';
  return 'Normal';
}

function getThreatLabel(ratio: number): string {
  if (ratio > 1.5) return 'critical';
  if (ratio > 0.8) return 'contested';
  return 'secure';
}

function isOwnFormation(formation: Pick<FormationView, 'faction'>, playerFaction: string | null): boolean {
  return Boolean(playerFaction && formation.faction === playerFaction);
}

export function getPlayerSafeSettlementTooltipFormations(
  state: LoadedGameState | null | undefined,
  osid: string,
): Array<Pick<FormationView, 'id' | 'name' | 'faction' | 'personnel' | 'kind'>> {
  if (!state?.formations) return [];
  const playerFaction = getPlayerFacingFaction(state);
  return state.formations
    .filter((formation) => formation.location_osid === osid && isOwnFormation(formation, playerFaction))
    .map((formation) => ({
      id: formation.id,
      name: formation.name,
      faction: formation.faction,
      personnel: formation.personnel,
      kind: formation.kind,
    }));
}

export function buildPlayerSafeFormationTooltipModel(args: {
  formationId: string;
  formations: Array<Pick<FormationView, 'id' | 'name' | 'faction' | 'corps_id' | 'personnel' | 'cohesion' | 'posture' | 'aorSettlementIds' | 'home_osid' | 'location_osid'>> | undefined;
  attackOrders: Array<{ brigadeId: string; targetSettlementId: string }> | undefined;
  osidDisplayNames: Record<string, string> | null;
  playerFaction: string | null;
}): PlayerSafeFormationTooltipModel {
  const formation = args.formations?.find((entry) => entry.id === args.formationId);
  if (!formation) {
    return {
      classification: 'enemy_contact',
      title: 'Unknown contact',
      subtitle: null,
      personnel: null,
      cohesion: null,
      posture: null,
      aorSummary: null,
      orderLine: null,
      statusLine: null,
      showHomeMunicipality: false,
    };
  }

  if (!isOwnFormation(formation, args.playerFaction)) {
    return {
      classification: 'enemy_contact',
      title: 'Enemy contact',
      subtitle: formation.location_osid ? (getOsidDisplayName(formation.location_osid, args.osidDisplayNames) ?? null) : null,
      personnel: null,
      cohesion: null,
      posture: null,
      aorSummary: null,
      orderLine: null,
      statusLine: 'Observed unit',
      showHomeMunicipality: false,
    };
  }

  const corps = args.formations?.find((entry) => entry.id === formation.corps_id);
  const aorIds = formation.aorSettlementIds ?? [];
  const attack = args.attackOrders?.find((entry) => entry.brigadeId === formation.id);
  const orderLine = attack
    ? `→ Attack ${getOsidDisplayName(attack.targetSettlementId, args.osidDisplayNames)}`
    : '—';
  const munFrom = (osid: string | undefined) => osid?.split(':')[1];
  const showHomeMunicipality = Boolean(
    formation.home_osid
    && formation.location_osid
    && munFrom(formation.home_osid) === munFrom(formation.location_osid),
  );

  return {
    classification: 'own',
    title: formation.name,
    subtitle: corps?.name ?? null,
    personnel: formation.personnel ?? null,
    cohesion: formation.cohesion ?? null,
    posture: formation.posture ?? null,
    aorSummary: `${aorIds.length} settlements`,
    orderLine,
    statusLine: 'Active',
    showHomeMunicipality,
  };
}

export function buildPlayerSafeFrontTooltipModel(args: {
  edgeId: string;
  frontEdgesOsid: Array<Pick<FrontEdgeView, 'edge_id' | 'a' | 'b' | 'side_a' | 'side_b'>> | undefined;
  frontPressureByEdge: Record<string, { value: number; max_abs: number; last_updated_turn?: number }> | undefined;
  formations: FormationView[] | undefined;
  fogOfWar: LoadedGameState['fogOfWar'] | undefined;
  corpsFrontSectors: CorpsFrontSectorView[] | undefined;
  playerFaction: string | null;
}): PlayerSafeFrontTooltipModel {
  const edge = args.frontEdgesOsid?.find((entry) => entry.edge_id === args.edgeId);
  const sideA = edge?.side_a ?? '?';
  const sideB = edge?.side_b ?? '?';
  const pressure = args.frontPressureByEdge?.[args.edgeId];
  const pressureValue = pressure?.value ?? 0;
  const pressureLine =
    pressureValue > 0 ? `+${pressureValue.toFixed(1)} (${sideA} advantage)` :
      pressureValue < 0 ? `${pressureValue.toFixed(1)} (${sideB} advantage)` :
        'Balanced';

  const sector = args.corpsFrontSectors?.find((entry) => entry.edge_ids.includes(args.edgeId));
  const visibleFormations = filterPlayerVisibleMapFormations({
    player_faction: args.playerFaction,
    fogOfWar: args.fogOfWar,
    formations: args.formations ?? [],
  } as LoadedGameState);
  const formationsOnEdge = visibleFormations.filter((formation) => (
    formation.aorSettlementIds?.includes(edge?.a ?? '') || formation.aorSettlementIds?.includes(edge?.b ?? '')
  ));
  const ownFormations = formationsOnEdge.filter((formation) => isOwnFormation(formation, args.playerFaction));
  const enemyContacts = formationsOnEdge.filter((formation) => !isOwnFormation(formation, args.playerFaction));
  const ownFormationLabels = ownFormations.map((formation) => `${formation.name} (${formation.posture ?? '—'})`);

  return {
    title: `Front: ${sideA} — ${sideB}`,
    sectorName: sector?.faction === args.playerFaction ? sector.display_name : null,
    pressureLine,
    densityValue: sector?.faction === args.playerFaction ? sector.density : null,
    densityLabel: sector?.faction === args.playerFaction ? getDensityLabel(sector.density) : null,
    threatValue: sector?.faction === args.playerFaction ? sector.threat_ratio : null,
    threatLabel: sector?.faction === args.playerFaction ? getThreatLabel(sector.threat_ratio) : null,
    ownFormationLabels,
    enemyContactSummary: enemyContacts.length > 0 ? `${enemyContacts.length} enemy contact${enemyContacts.length === 1 ? '' : 's'} observed` : null,
  };
}
