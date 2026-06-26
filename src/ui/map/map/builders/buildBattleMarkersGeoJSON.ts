/**
 * buildBattleMarkersGeoJSON — Enriched battle markers.
 *
 * Builds a point FeatureCollection marking OSIDs where battles occurred
 * in the last 3 turns. Enriched with TurnBattle data (attacker, defender,
 * outcome, casualties) for tooltips and click interaction.
 *
 * Deterministic: input events are pre-sorted; output features sorted by OSID.
 */
import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon } from 'geojson';
import type { LoadedGameState, RecentControlEventView } from '../../data/types.js';
import type { TurnBattle } from '../../../../state/turn_summary.js';
import { isPlayerVisibleBattle } from '../../../shared/playerVisibility.js';

function polygonCentroid(coordinates: number[][][]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  const ring = coordinates[0];
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
    count++;
  }
  return [sumX / count, sumY / count];
}

function geometryCentroid(geometry: Polygon | MultiPolygon): [number, number] {
  if (geometry.type === 'Polygon') {
    return polygonCentroid(geometry.coordinates);
  }
  const coords = geometry.coordinates[0];
  return polygonCentroid(coords);
}

export function buildBattleMarkersGeoJSON(
  recentControlEvents: RecentControlEventView[],
  baseGeoJson: FeatureCollection,
  currentTurn: number,
  battles?: TurnBattle[],
  battleSummaryTurn: number | null = currentTurn,
  visibility?: {
    playerFaction?: string | null;
    fogOfWar?: { visibleEnemyOsids?: readonly string[]; visibleEnemySectorIds?: readonly string[] } | null;
  },
): FeatureCollection<Point> {
  const centroidByOsid = new Map<string, [number, number]>();
  for (const feature of baseGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown> | null)?.osid;
    if (typeof osid !== 'string') continue;
    const geom = feature.geometry;
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      centroidByOsid.set(osid, geometryCentroid(geom as Polygon | MultiPolygon));
    }
  }

  // Index battles by OSID for enrichment
  const battleByOsid = new Map<string, TurnBattle>();
  const battlesAreCurrentTurn = currentTurn > 0 && (battleSummaryTurn ?? currentTurn) === currentTurn;
  const visibilityState: Pick<LoadedGameState, 'player_faction' | 'fogOfWar'> = {
    player_faction: visibility?.playerFaction ?? null,
    fogOfWar: {
      visibleEnemyOsids: [...(visibility?.fogOfWar?.visibleEnemyOsids ?? [])],
      visibleEnemySectorIds: [],
    },
  };
  if (battles && battlesAreCurrentTurn) {
    for (const b of battles) {
      if (isPlayerVisibleBattle(b, visibilityState)) battleByOsid.set(b.osid, b);
    }
  }

  // Filter to combat flips in the last 3 turns
  const combatEvents = recentControlEvents.filter(
    (e) => e.mechanism === 'combat'
      && e.turn > 0
      && e.turn <= currentTurn
      && e.turn >= currentTurn - 2
      && isPlayerVisibleBattle({
        osid: e.settlementId,
        attacker_faction: e.from,
        defender_faction: e.to,
      }, visibilityState),
  );

  const latestByOsid = new Map<string, RecentControlEventView>();
  for (const e of combatEvents) {
    const existing = latestByOsid.get(e.settlementId);
    if (!existing || e.turn > existing.turn) {
      latestByOsid.set(e.settlementId, e);
    }
  }

  // Also include battles from this turn that didn't flip territory
  if (battles && battlesAreCurrentTurn) {
    for (const b of battles) {
      if (!isPlayerVisibleBattle(b, visibilityState)) continue;
      if (!latestByOsid.has(b.osid) && centroidByOsid.has(b.osid)) {
        latestByOsid.set(b.osid, {
          settlementId: b.osid,
          from: b.defender_faction,
          to: b.territory_flipped ? b.attacker_faction : b.defender_faction,
          turn: currentTurn,
          mechanism: 'combat',
          municipalityId: b.mun_id ?? null,
        });
      }
    }
  }

  const features: Feature<Point>[] = [];
  for (const [osid, event] of [...latestByOsid.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const centroid = centroidByOsid.get(osid);
    if (!centroid) continue;

    const battle = battleByOsid.get(osid);
    const attackerCasualties = typeof battle?.attacker_casualties === 'number' && Number.isFinite(battle.attacker_casualties)
      ? battle.attacker_casualties
      : null;
    const defenderCasualties = typeof battle?.defender_casualties === 'number' && Number.isFinite(battle.defender_casualties)
      ? battle.defender_casualties
      : null;
    const casualtiesReported = attackerCasualties != null && defenderCasualties != null;
    const totalCasualties = casualtiesReported ? attackerCasualties + defenderCasualties : null;
    const battleReported = battle != null;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: centroid },
      properties: {
        osid,
        from: event.from,
        to: event.to,
        turn: event.turn,
        age: currentTurn - event.turn,
        // Enriched battle data for tooltip
        battle_reported: battleReported,
        attacker_faction: battle?.attacker_faction ?? null,
        defender_faction: battle?.defender_faction ?? null,
        outcome: battle?.outcome ?? null,
        casualties_reported: casualtiesReported,
        attacker_casualties: attackerCasualties,
        defender_casualties: defenderCasualties,
        total_casualties: totalCasualties,
        territory_flipped: battle?.territory_flipped ?? false,
        was_concentrated: battle?.was_concentrated ?? false,
        attacker_count: battle?.all_attacker_ids?.length ?? null,
        primary_attacker_id: battle?.primary_attacker_id ?? null,
        primary_defender_id: battle?.primary_defender_id ?? null,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}
