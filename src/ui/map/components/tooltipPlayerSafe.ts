import type {
  CorpsFrontSectorView,
  FormationView,
  FrontEdgeView,
  LoadedGameState,
} from '../data/types';
import { getPlayerFacingFaction, filterPlayerVisibleMapFormations, isFieldedTacticalFormation } from '../../shared/playerVisibility';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeThreatPresentation } from '../utils/playerSafeThreat';
import { buildSectorFormationAssignment } from '../utils/sectorUtils';
import { t, type Locale, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { getPlayerFacingSectorName } from '../../shared/playerFacingLabels';

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
  sectorStatusLine: string | null;
  pressureLine: string;
  densityValue: number | null;
  densityLabel: string | null;
  threatSummary: string | null;
  ownFormationLabels: string[];
  enemyContactSummary: string | null;
}

const FORMATION_POSTURE_LABEL_KEY: Record<string, MessageKey> = {
  hold: 'tooltip.posture.hold',
  defend: 'tooltip.posture.defend',
  defend_at_all_costs: 'tooltip.posture.defendAtAllCosts',
  elastic_defense: 'tooltip.posture.elasticDefense',
  counterattack: 'tooltip.posture.counterattack',
  dig_in: 'tooltip.posture.digIn',
  attack: 'tooltip.posture.attack',
  assault: 'tooltip.posture.assault',
  fortify: 'tooltip.posture.fortify',
  offensive: 'tooltip.posture.attack',
  reserve: 'tooltip.posture.reserve',
  rest: 'tooltip.posture.rest',
  retreat: 'tooltip.posture.retreat',
};

function getFormationPostureLabel(posture: string | null | undefined, locale: Locale): string | null {
  const key = (posture ?? '').trim().toLowerCase();
  if (!key) return null;
  return t(FORMATION_POSTURE_LABEL_KEY[key] ?? 'tooltip.posture.pending', undefined, locale);
}

function getDensityLabel(density: number, locale: Locale): string {
  if (density < 0.5) return t('tooltip.density.lightlyHeld', undefined, locale);
  if (density > 1.0) return t('tooltip.density.reinforced', undefined, locale);
  return t('tooltip.density.normal', undefined, locale);
}

function isOwnFormation(formation: Pick<FormationView, 'faction'>, playerFaction: string | null): boolean {
  return Boolean(playerFaction && formation.faction === playerFaction);
}

export function getSyntheticEnemyContactOsid(formationId: string): string | null {
  if (!formationId.startsWith('enemy_contact:')) return null;
  const encoded = formationId.slice('enemy_contact:'.length);
  const indexSeparator = encoded.lastIndexOf(':');
  const osid = indexSeparator > 0 ? encoded.slice(0, indexSeparator) : encoded;
  return osid.length > 0 ? osid : null;
}

export function getPlayerSafeSettlementTooltipFormations(
  state: LoadedGameState | null | undefined,
  osid: string,
  locale: Locale = 'en',
): Array<Pick<FormationView, 'id' | 'name' | 'faction' | 'personnel' | 'kind'>> {
  if (!state?.formations) return [];
  const playerFaction = getPlayerFacingFaction(state);
  return state.formations
    .filter((formation) => isFieldedTacticalFormation(formation) && formation.location_osid === osid && isOwnFormation(formation, playerFaction))
    .map((formation) => ({
      id: formation.id,
      name: getLocalizedFormationName(formation, locale),
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
  locale?: Locale;
}): PlayerSafeFormationTooltipModel {
  const formation = args.formations?.find((entry) => entry.id === args.formationId);
  const locale = args.locale ?? 'en';
  if (args.formationId.startsWith('enemy_contact:')) {
    const contactOsid = getSyntheticEnemyContactOsid(args.formationId);
    return {
      classification: 'enemy_contact',
      title: t('tooltip.enemyContactTitle', undefined, locale),
      subtitle: contactOsid ? (getOsidDisplayName(contactOsid, args.osidDisplayNames) ?? null) : null,
      personnel: null,
      cohesion: null,
      posture: null,
      aorSummary: null,
      orderLine: null,
      statusLine: t('tooltip.status.observedUnit', undefined, locale),
      showHomeMunicipality: false,
    };
  }
  if (!formation) {
    return {
      classification: 'enemy_contact',
      title: t('tooltip.unknownFormation', undefined, locale),
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
      title: t('tooltip.enemyContactTitle', undefined, locale),
      subtitle: formation.location_osid ? (getOsidDisplayName(formation.location_osid, args.osidDisplayNames) ?? null) : null,
      personnel: null,
      cohesion: null,
      posture: null,
      aorSummary: null,
      orderLine: null,
      statusLine: t('tooltip.status.observedUnit', undefined, locale),
      showHomeMunicipality: false,
    };
  }

  const corps = args.formations?.find((entry) => entry.id === formation.corps_id);
  const aorIds = formation.aorSettlementIds ?? [];
  const attack = args.attackOrders?.find((entry) => entry.brigadeId === formation.id);
  const attackTarget = attack
    ? (getOsidDisplayName(attack.targetSettlementId, args.osidDisplayNames) || t('tooltip.positionFallback', undefined, locale))
    : t('tooltip.positionFallback', undefined, locale);
  const orderLine = attack
    ? t('tooltip.order.attack', {
      target: attackTarget,
    }, locale)
    : t('tooltip.order.none', undefined, locale);
  const munFrom = (osid: string | undefined) => osid?.split(':')[1];
  const showHomeMunicipality = Boolean(
    formation.home_osid
    && formation.location_osid
    && munFrom(formation.home_osid) === munFrom(formation.location_osid),
  );

  return {
    classification: 'own',
    title: getLocalizedFormationName(formation, locale),
    subtitle: corps?.name ?? null,
    personnel: formation.personnel ?? null,
    cohesion: formation.cohesion ?? null,
    posture: getFormationPostureLabel(formation.posture, locale),
    aorSummary: t(aorIds.length === 1 ? 'tooltip.aorSettlement.one' : 'tooltip.aorSettlement.many', { count: aorIds.length }, locale),
    orderLine,
    statusLine: t('tooltip.status.active', undefined, locale),
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
  locale?: Locale;
}): PlayerSafeFrontTooltipModel {
  const edge = args.frontEdgesOsid?.find((entry) => entry.edge_id === args.edgeId);
  const locale = args.locale ?? 'en';
  const sideA = getPlayerSafeMilitaryFactionName(edge?.side_a, '?');
  const sideB = getPlayerSafeMilitaryFactionName(edge?.side_b, '?');
  const pressure = args.frontPressureByEdge?.[args.edgeId];
  const pressureValue = pressure?.value;
  const pressureLine =
    typeof pressureValue !== 'number' || !Number.isFinite(pressureValue)
      ? t('tooltip.pressure.unreported', undefined, locale)
      : pressureValue > 0 ? t('tooltip.pressure.advantage', { value: `+${pressureValue.toFixed(1)}`, side: sideA }, locale) :
        pressureValue < 0 ? t('tooltip.pressure.advantage', { value: pressureValue.toFixed(1), side: sideB }, locale) :
        t('tooltip.pressure.balanced', undefined, locale);

  const sector = args.corpsFrontSectors?.find((entry) => entry.edge_ids.includes(args.edgeId));
  const ownSector = sector?.faction === args.playerFaction ? sector : null;
  const sectorAssignment = ownSector
    ? buildSectorFormationAssignment(ownSector, args.formations ?? [], args.corpsFrontSectors ?? [])
    : null;
  const fieldedFormationIds = new Set(
    (args.formations ?? [])
      .filter((formation) => isOwnFormation(formation, args.playerFaction) && isFieldedTacticalFormation(formation))
      .map((formation) => formation.id),
  );
  const ownSectorHasCurrentLine = (sectorAssignment?.lineHoldingIds ?? []).some((id) => fieldedFormationIds.has(id));
  const visibleFormations = filterPlayerVisibleMapFormations({
    player_faction: args.playerFaction,
    fogOfWar: args.fogOfWar,
    formations: args.formations ?? [],
  } as LoadedGameState);
  const edgeEndpointSet = new Set([edge?.a, edge?.b].filter((osid): osid is string => typeof osid === 'string' && osid.length > 0));
  const formationsOnEdge = visibleFormations.filter((formation) => (
    isFieldedTacticalFormation(formation)
    && typeof formation.location_osid === 'string'
    && edgeEndpointSet.has(formation.location_osid)
  ));
  const formationById = new Map((args.formations ?? []).map((formation) => [formation.id, formation]));
  const ownLineHoldingFormations = sectorAssignment
    ? sectorAssignment.lineHoldingIds
      .map((id) => formationById.get(id))
      .filter((formation): formation is FormationView => Boolean(
        formation
        && isOwnFormation(formation, args.playerFaction)
        && isFieldedTacticalFormation(formation)
      ))
    : formationsOnEdge.filter((formation) => isOwnFormation(formation, args.playerFaction));
  const enemyContacts = formationsOnEdge.filter((formation) => !isOwnFormation(formation, args.playerFaction));
  const ownFormationLabels = ownLineHoldingFormations.map((formation) => {
    const posture = getFormationPostureLabel(formation.posture, locale);
    return posture ? `${getLocalizedFormationName(formation, locale)} - ${posture}` : getLocalizedFormationName(formation, locale);
  });

  return {
    title: t('tooltip.frontTitle', { sideA, sideB }, locale),
    sectorName: ownSector ? getPlayerFacingSectorName(ownSector.sector_id, [ownSector]) : null,
    sectorStatusLine: ownSector && !ownSectorHasCurrentLine ? t('tooltip.noFriendlyLine', undefined, locale) : null,
    pressureLine,
    densityValue: ownSector && ownSectorHasCurrentLine && typeof ownSector.density === 'number' && Number.isFinite(ownSector.density) ? ownSector.density : null,
    densityLabel: ownSector && ownSectorHasCurrentLine && typeof ownSector.density === 'number' && Number.isFinite(ownSector.density) ? getDensityLabel(ownSector.density, locale) : null,
    threatSummary: ownSector && ownSectorHasCurrentLine && typeof ownSector.threat_ratio === 'number' && Number.isFinite(ownSector.threat_ratio) ? getPlayerSafeThreatPresentation(ownSector.threat_ratio).summary : null,
    ownFormationLabels,
    enemyContactSummary: enemyContacts.length > 0
      ? t(enemyContacts.length === 1 ? 'tooltip.enemyContact.one' : 'tooltip.enemyContact.many', { count: enemyContacts.length }, locale)
      : null,
  };
}
