/**
 * Build a GeoJSON FeatureCollection for defense strength map mode.
 * Colors front-adjacent OSIDs by their computed defense strength using
 * Layer A's distance-weighted reactive defense model.
 *
 * Replaces the old 3-tier density classification with a continuous
 * per-OSID defense strength value normalized against a reference attacker.
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import type { CorpsFrontSectorView, FrontEdgeView, FormationView } from '../../data/types';
import { buildSectorFormationAssignment, collectSectorFriendlyOsids } from '../../utils/sectorUtils';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility';

// ── Constants (mirror engine values from combat_math.ts) ────────────────────
const REACTIVE_DISTANCE_BASE = 0.60;
const REACTIVE_DISTANCE_MAX_HOPS = 5;
const HOME_DEFENSE_REACTIVE_BONUS = 1.3;
const REACTIVE_DEFENSE_RATIO = 1.5;
/** Reference attacker power for normalization (typical brigade ~2000 personnel). */
const REFERENCE_ATTACKER_POWER = 2000;

const SECTOR_STANCE_REACTIVE_BONUS: Record<string, number> = {
    fortify: 1.3,
    defend: 1.15,
    elastic: 1.0,
    active_defense: 0.85,
    screening: 0.5,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function munFromOsid(osid: string): string | undefined {
    return osid.split(':')[1];
}

function getReactiveDistanceWeight(hops: number): number {
    if (!Number.isFinite(hops) || hops < 0 || hops > REACTIVE_DISTANCE_MAX_HOPS) return 0;
    return Math.pow(REACTIVE_DISTANCE_BASE, hops);
}

/**
 * BFS through friendly territory from `from` to `to`.
 * Returns hop count, or Infinity if unreachable within maxHops.
 */
function bfsDistanceFriendly(
    from: string,
    to: string,
    adjacency: Map<string, string[]>,
    politicalControllers: Record<string, string | null>,
    factionId: string,
    maxHops: number = REACTIVE_DISTANCE_MAX_HOPS,
): number {
    if (from === to) return 0;
    const visited = new Set<string>([from]);
    let frontier = [from];
    let dist = 0;
    while (frontier.length > 0 && dist < maxHops) {
        dist++;
        const next: string[] = [];
        for (const osid of frontier) {
            for (const n of (adjacency.get(osid) ?? [])) {
                if (visited.has(n)) continue;
                visited.add(n);
                if (n === to) return dist;
                if (politicalControllers[n] === factionId) next.push(n);
            }
        }
        frontier = next;
    }
    return Infinity;
}

// ── Properties ──────────────────────────────────────────────────────────────

export interface DefenseStrengthProperties {
    osid: string;
    /** Normalized defense strength (1.0 = matched to reference attacker). */
    defense_strength: number;
    sector_id: string;
    faction: string;
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build defense-strength-colored features from OSID control GeoJSON + sector/formation data.
 * For each friendly front OSID, computes per-OSID defense strength using distance-weighted
 * reactive defense, home-municipality bonus, and sector stance modifier.
 */
export function buildDefenseStrengthGeoJSON(
    controlGeoJson: FeatureCollection,
    sectors: CorpsFrontSectorView[],
    frontEdgesOsid: FrontEdgeView[],
    formations: FormationView[],
    politicalControllers: Record<string, string | null>,
    adjacency: Map<string, string[]>,
): FeatureCollection<Polygon | MultiPolygon, DefenseStrengthProperties> {
    // Build formation lookup
    const formationsById = new Map<string, FormationView>();
    for (const f of formations) formationsById.set(f.id, f);

    // Per-OSID defense strength map
    const osidStrength = new Map<string, { strength: number; sector_id: string; faction: string }>();

    for (const sector of sectors) {
        const friendlyOsids = collectSectorFriendlyOsids(sector, frontEdgesOsid);
        if (friendlyOsids.length === 0) continue;

        // Collect live line holders with their locations and power (personnel as proxy).
        // Reserve/rear membership is sector context, not staffed frontline truth.
        const sectorBrigadeIds = buildSectorFormationAssignment(sector, formations, sectors)
            .lineHoldingIds
            .filter((id) => {
                const formation = formationsById.get(id);
                return formation != null && isFieldedTacticalFormation(formation);
            });
        if (sectorBrigadeIds.length === 0) continue;
        const sectorBrigades: { id: string; locationOsid: string; homeOsid: string; power: number }[] = [];
        for (const bid of sectorBrigadeIds) {
            const f = formationsById.get(bid);
            if (!f || !f.location_osid || !f.personnel || f.personnel <= 0) continue;
            sectorBrigades.push({
                id: bid,
                locationOsid: f.location_osid,
                homeOsid: f.home_osid ?? '',
                power: f.personnel,
            });
        }

        const stanceBonus = sector.sector_stance
            ? SECTOR_STANCE_REACTIVE_BONUS[sector.sector_stance] ?? 1.0
            : 1.0;

        // For each friendly front OSID, compute defense strength
        for (const targetOsid of friendlyOsids) {
            const targetMun = munFromOsid(targetOsid);
            let physicalPower = 0;
            let reactiveContributions = 0;

            for (const brigade of sectorBrigades) {
                if (brigade.locationOsid === targetOsid) {
                    // Brigade physically present — full power
                    const homeMun = munFromOsid(brigade.homeOsid);
                    const homeBonus = (homeMun && homeMun === targetMun) ? HOME_DEFENSE_REACTIVE_BONUS : 1.0;
                    physicalPower += brigade.power * homeBonus;
                } else {
                    // Reactive contribution — distance weighted
                    const hops = bfsDistanceFriendly(
                        brigade.locationOsid, targetOsid,
                        adjacency, politicalControllers, sector.faction,
                    );
                    const distWeight = getReactiveDistanceWeight(hops);
                    if (distWeight <= 0) continue;
                    const homeMun = munFromOsid(brigade.homeOsid);
                    const homeBonus = (homeMun && homeMun === targetMun) ? HOME_DEFENSE_REACTIVE_BONUS : 1.0;
                    reactiveContributions += brigade.power * distWeight * homeBonus;
                }
            }

            // Apply stance bonus and cap
            const reactiveResponse = Math.min(
                reactiveContributions * stanceBonus,
                REFERENCE_ATTACKER_POWER * REACTIVE_DEFENSE_RATIO,
            );

            const totalDefense = physicalPower + reactiveResponse;
            const normalizedStrength = totalDefense / REFERENCE_ATTACKER_POWER;

            osidStrength.set(targetOsid, {
                strength: normalizedStrength,
                sector_id: sector.sector_id,
                faction: sector.faction,
            });
        }
    }

    // Build GeoJSON features
    const features: Feature<Polygon | MultiPolygon, DefenseStrengthProperties>[] = [];
    for (const feature of controlGeoJson.features) {
        const osid = (feature.properties as Record<string, unknown>)?.osid;
        if (typeof osid !== 'string') continue;
        const info = osidStrength.get(osid);
        if (!info) continue;

        features.push({
            type: 'Feature',
            properties: {
                osid,
                defense_strength: Math.round(info.strength * 100) / 100,
                sector_id: info.sector_id,
                faction: info.faction,
            },
            geometry: feature.geometry as Polygon | MultiPolygon,
        });
    }

    return { type: 'FeatureCollection', features };
}
