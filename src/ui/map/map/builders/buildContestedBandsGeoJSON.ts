import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import { strictCompare } from '../../../../state/validateGameState.js';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility.js';

type PolygonFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties>;

export type ContestedReason = 'recent_change' | 'adjacent_pressure';

export interface ContestedBandProperties {
  osid: string;
  controller: string | null;
  contested_reason: ContestedReason;
  contested_score: number;
  turns_since_flip?: number;
  enemy_pressure_ratio?: number;
}

export interface ContestedBandControlEvent {
  turn: number;
  settlementId: string;
  from?: string | null;
  to?: string | null;
  mechanism?: string;
}

export interface ContestedBandFrontEdge {
  edge_id: string;
  a: string;
  b: string;
  side_a: string | null;
  side_b: string | null;
}

export interface ContestedBandFormation {
  kind?: string | null;
  faction?: string | null;
  location_osid?: string | null;
  personnel?: number | null;
  readiness?: string | null;
  status?: string | null;
}

export interface BuildContestedBandsArgs {
  controlGeoJson: FeatureCollection;
  currentTurn: number;
  recentControlEvents?: ContestedBandControlEvent[];
  frontEdgesOsid?: ContestedBandFrontEdge[];
  formations?: ContestedBandFormation[];
  recentWindowTurns?: number;
}

const DEFAULT_RECENT_WINDOW_TURNS = 4;

function finitePositive(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function isPolygonFeature(feature: Feature): feature is PolygonFeature {
  return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon';
}

function featureOsid(feature: Feature): string {
  const raw = (feature.properties as Record<string, unknown> | null | undefined)?.osid;
  return typeof raw === 'string' ? raw : '';
}

function featureController(feature: Feature): string | null {
  const raw = (feature.properties as Record<string, unknown> | null | undefined)?.controller;
  return typeof raw === 'string' ? raw : null;
}

function addOrUpgrade(
  contested: Map<string, ContestedBandProperties>,
  next: ContestedBandProperties,
): void {
  const existing = contested.get(next.osid);
  if (!existing || next.contested_score > existing.contested_score) {
    contested.set(next.osid, next);
  }
}

export function buildContestedBandsGeoJSON(args: BuildContestedBandsArgs): FeatureCollection<Polygon | MultiPolygon, ContestedBandProperties> {
  const recentWindowTurns = args.recentWindowTurns ?? DEFAULT_RECENT_WINDOW_TURNS;
  const featuresByOsid = new Map<string, PolygonFeature>();
  for (const feature of args.controlGeoJson.features) {
    if (!isPolygonFeature(feature)) continue;
    const osid = featureOsid(feature);
    if (!osid) continue;
    featuresByOsid.set(osid, feature);
  }

  const contested = new Map<string, ContestedBandProperties>();

  for (const event of [...(args.recentControlEvents ?? [])].sort((a, b) => {
    const turnCompare = a.turn - b.turn;
    if (turnCompare !== 0) return turnCompare;
    return strictCompare(a.settlementId, b.settlementId);
  })) {
    if (!event.settlementId) continue;
    if (!featuresByOsid.has(event.settlementId)) continue;
    const turnsSinceFlip = args.currentTurn - event.turn;
    if (turnsSinceFlip < 0 || turnsSinceFlip > recentWindowTurns) continue;
    const feature = featuresByOsid.get(event.settlementId)!;
    addOrUpgrade(contested, {
      osid: event.settlementId,
      controller: featureController(feature),
      contested_reason: 'recent_change',
      contested_score: 1,
      turns_since_flip: turnsSinceFlip,
    });
  }

  const strengthByOsidFaction = new Map<string, number>();
  for (const formation of args.formations ?? []) {
    const osid = typeof formation.location_osid === 'string' ? formation.location_osid : '';
    const faction = typeof formation.faction === 'string' ? formation.faction : '';
    if (!osid || !faction) continue;
    if (!isFieldedTacticalFormation(formation)) continue;
    const key = `${osid}\0${faction}`;
    strengthByOsidFaction.set(key, (strengthByOsidFaction.get(key) ?? 0) + finitePositive(formation.personnel));
  }

  const assessSide = (friendlyOsid: string, friendlyFaction: string | null, hostileOsid: string, hostileFaction: string | null) => {
    if (!friendlyOsid || !friendlyFaction || !hostileOsid || !hostileFaction) return;
    if (!featuresByOsid.has(friendlyOsid)) return;
    const friendlyStrength = strengthByOsidFaction.get(`${friendlyOsid}\0${friendlyFaction}`) ?? 0;
    const hostileStrength = strengthByOsidFaction.get(`${hostileOsid}\0${hostileFaction}`) ?? 0;
    if (hostileStrength <= 0) return;
    const ratio = hostileStrength / Math.max(1, friendlyStrength);
    if (ratio <= 0.5) return;
    const feature = featuresByOsid.get(friendlyOsid)!;
    addOrUpgrade(contested, {
      osid: friendlyOsid,
      controller: featureController(feature),
      contested_reason: 'adjacent_pressure',
      contested_score: Math.min(1, ratio),
      enemy_pressure_ratio: ratio,
    });
  };

  for (const edge of [...(args.frontEdgesOsid ?? [])].sort((a, b) => strictCompare(a.edge_id, b.edge_id))) {
    if (!edge.a || !edge.b || !edge.side_a || !edge.side_b || edge.side_a === edge.side_b) continue;
    assessSide(edge.a, edge.side_a, edge.b, edge.side_b);
    assessSide(edge.b, edge.side_b, edge.a, edge.side_a);
  }

  const features = [...contested.keys()]
    .sort(strictCompare)
    .map((osid) => {
      const source = featuresByOsid.get(osid)!;
      return {
        type: 'Feature' as const,
        geometry: source.geometry,
        properties: contested.get(osid)!,
      };
    });

  return { type: 'FeatureCollection', features };
}
