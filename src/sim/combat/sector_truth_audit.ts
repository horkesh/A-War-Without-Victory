import type {
    CorpsFrontSector,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { strictCompare } from '../../state/validateGameState.js';

type TruthClaim = 'front' | 'territory' | 'reserve';

export interface SectorTruthAuditIssue {
    sector_id: string;
    brigade_id?: FormationId;
    edge_id?: string;
    osid?: string;
    details?: string;
}

export interface SectorTruthAuditResult {
    ok: boolean;
    counts: {
        reserve_only_live_sectors: number;
        stale_density_sectors: number;
        same_corps_front_overlaps: number;
        untruthful_assigned_brigades: number;
        edge_front_mismatches: number;
        unresolved_sector_brigades: number;
        active_formations_in_enemy_territory: number;
    };
    issues: {
        reserve_only_live_sectors: SectorTruthAuditIssue[];
        stale_density_sectors: SectorTruthAuditIssue[];
        same_corps_front_overlaps: SectorTruthAuditIssue[];
        untruthful_assigned_brigades: SectorTruthAuditIssue[];
        edge_front_mismatches: SectorTruthAuditIssue[];
        unresolved_sector_brigades: SectorTruthAuditIssue[];
        active_formations_in_enemy_territory: SectorTruthAuditIssue[];
    };
}

type EdgeMeta = { a: string; b: string; side_a?: string | null; side_b?: string | null };

function getFriendlyEndpoint(edge: EdgeMeta, faction: string): string | null {
    if (edge.side_a === faction) return edge.a;
    if (edge.side_b === faction) return edge.b;
    return null;
}

function buildOneHopBehind(
    sector: CorpsFrontSector,
    adjacency: Map<Osid, Osid[]>,
    controllers: Record<string, string | null>,
): Set<string> {
    const frontSet = new Set<string>(sector.sub_segments.flatMap((subSegment) => subSegment.friendly_osids));
    const oneHopBehind = new Set<string>();
    for (const frontOsid of frontSet) {
        for (const neighbor of adjacency.get(frontOsid as Osid) ?? []) {
            if (frontSet.has(neighbor)) continue;
            if (controllers[neighbor] !== sector.faction) continue;
            oneHopBehind.add(neighbor);
        }
    }
    return oneHopBehind;
}

function classifyClaim(
    sector: CorpsFrontSector,
    formation: FormationState | undefined,
    adjacency: Map<Osid, Osid[]>,
    controllers: Record<string, string | null>,
): TruthClaim | null {
    const locationOsid = formation?.location_osid;
    if (!locationOsid) return null;
    const frontSet = new Set<string>(sector.sub_segments.flatMap((subSegment) => subSegment.friendly_osids));
    if (frontSet.has(locationOsid)) return 'front';
    if (sector.territory_osids.includes(locationOsid)) return 'territory';
    return buildOneHopBehind(sector, adjacency, controllers).has(locationOsid) ? 'reserve' : null;
}

function incidentHostileEndpointsForFrontOsid(
    sector: CorpsFrontSector,
    frontOsid: string,
    edgeMeta: Map<string, EdgeMeta>,
): Set<string> {
    const hostile = new Set<string>();
    for (const edgeId of sector.edge_ids ?? []) {
        const edge = edgeMeta.get(edgeId);
        if (!edge) continue;
        const friendly = getFriendlyEndpoint(edge, sector.faction);
        if (friendly !== frontOsid) continue;
        hostile.add(friendly === edge.a ? edge.b : edge.a);
    }
    return hostile;
}

export function auditSectorTruth(
    state: GameState,
    sectors: CorpsFrontSector[],
    edges: EdgeRecord[],
): SectorTruthAuditResult {
    const adjacency = buildOsidAdjacency(edges);
    const controllers = state.political?.political_controllers ?? {};
    const formations = state.military?.formations ?? {};
    const edgeMeta = new Map<string, EdgeMeta>(
        (state.military?.war_front_edges_osid ?? []).map((edge) => [edge.edge_id, edge])
    );

    const result: SectorTruthAuditResult = {
        ok: true,
        counts: {
            reserve_only_live_sectors: 0,
            stale_density_sectors: 0,
            same_corps_front_overlaps: 0,
            untruthful_assigned_brigades: 0,
            edge_front_mismatches: 0,
            unresolved_sector_brigades: 0,
            active_formations_in_enemy_territory: 0,
        },
        issues: {
            reserve_only_live_sectors: [],
            stale_density_sectors: [],
            same_corps_front_overlaps: [],
            untruthful_assigned_brigades: [],
            edge_front_mismatches: [],
            unresolved_sector_brigades: [],
            active_formations_in_enemy_territory: [],
        },
    };

    const byCorps = new Map<string, Map<string, string[]>>();

    for (const sector of sectors) {
        const frontSet = new Set<string>(sector.sub_segments.flatMap((subSegment) => subSegment.friendly_osids));
        const expectedDensity = sector.length_edges > 0 ? sector.assigned_brigade_ids.length / sector.length_edges : 0;
        if (sector.length_edges > 0 && sector.assigned_brigade_ids.length === 0 && sector.reserve_brigade_ids.length > 0) {
            result.counts.reserve_only_live_sectors++;
            result.issues.reserve_only_live_sectors.push({ sector_id: sector.sector_id });
        }
        if (Math.abs((sector.density ?? 0) - expectedDensity) > 1e-9) {
            result.counts.stale_density_sectors++;
            result.issues.stale_density_sectors.push({
                sector_id: sector.sector_id,
                details: `saved=${sector.density ?? 0} expected=${expectedDensity}`,
            });
        }

        for (const brigadeId of sector.assigned_brigade_ids) {
            const claim = classifyClaim(sector, formations[brigadeId], adjacency, controllers);
            if (claim === null) {
                result.counts.untruthful_assigned_brigades++;
                result.issues.untruthful_assigned_brigades.push({
                    sector_id: sector.sector_id,
                    brigade_id: brigadeId,
                    osid: formations[brigadeId]?.location_osid,
                });
            }
        }

        for (const edgeId of sector.edge_ids) {
            const meta = edgeMeta.get(edgeId);
            if (!meta) continue;
            const friendlyEndpoint = getFriendlyEndpoint(meta, sector.faction);
            if (friendlyEndpoint != null && !frontSet.has(friendlyEndpoint)) {
                result.counts.edge_front_mismatches++;
                result.issues.edge_front_mismatches.push({
                    sector_id: sector.sector_id,
                    edge_id: edgeId,
                    osid: friendlyEndpoint,
                });
            }
        }

        const corpsMap = byCorps.get(sector.corps_id) ?? new Map<string, string[]>();
        for (const osid of frontSet) {
            const owners = corpsMap.get(osid) ?? [];
            owners.push(sector.sector_id);
            corpsMap.set(osid, owners);
        }
        byCorps.set(sector.corps_id, corpsMap);
    }

    for (const [corpsId, frontOwners] of [...byCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        for (const [osid, owners] of [...frontOwners.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
            if (owners.length <= 1) continue;

            const ownerSectors = owners
                .map((sectorId) => sectors.find((sector) => sector.sector_id === sectorId))
                .filter((sector): sector is CorpsFrontSector => sector != null);
            const hostileBySector = new Map<string, Set<string>>();
            for (const sector of ownerSectors) {
                const hostileEndpoints = incidentHostileEndpointsForFrontOsid(sector, osid, edgeMeta);
                hostileBySector.set(sector.sector_id, hostileEndpoints);
            }
            const hostileToSectors = new Map<string, Set<string>>();

            for (const sector of ownerSectors) {
                const hostileEndpoints = hostileBySector.get(sector.sector_id) ?? new Set<string>();
                for (const hostileOsid of hostileEndpoints) {
                    const bucket = hostileToSectors.get(hostileOsid) ?? new Set<string>();
                    bucket.add(sector.sector_id);
                    hostileToSectors.set(hostileOsid, bucket);
                }
            }

            for (const ownersAtHostileSeam of hostileToSectors.values()) {
                if (ownersAtHostileSeam.size <= 1) continue;
                const sortedOwners = [...ownersAtHostileSeam].sort(strictCompare);
                result.counts.same_corps_front_overlaps++;
                result.issues.same_corps_front_overlaps.push({
                    sector_id: sortedOwners[0]!,
                    osid,
                    details: `${corpsId}: ${sortedOwners.join(', ')}`,
                });
            }
        }
    }

    for (const brigadeId of [...(state.military?.unresolved_sector_brigades ?? [])].sort(strictCompare)) {
        result.counts.unresolved_sector_brigades++;
        result.issues.unresolved_sector_brigades.push({
            sector_id: 'unresolved',
            brigade_id: brigadeId,
            osid: formations[brigadeId]?.location_osid,
        });
    }

    for (const formation of Object.values(formations)) {
        if (!formation || formation.status !== 'active' || !formation.location_osid) continue;
        const controller = controllers[formation.location_osid];
        if (!controller || controller === formation.faction) continue;
        result.counts.active_formations_in_enemy_territory++;
        result.issues.active_formations_in_enemy_territory.push({
            sector_id: 'enemy-territory',
            brigade_id: formation.id,
            osid: formation.location_osid,
            details: `controller=${controller}`,
        });
    }

    const {
        reserve_only_live_sectors: _diagnosticReserveOnlyLiveSectors,
        ...releaseGateCounts
    } = result.counts;
    result.ok = Object.values(releaseGateCounts).every((count) => count === 0);
    return result;
}
