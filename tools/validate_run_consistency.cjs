#!/usr/bin/env node
/**
 * Post-run consistency validator — checks internal invariants of a scenario run.
 *
 *   node tools/validate_run_consistency.cjs <run_dir>
 *
 * Checks:
 *  1. Casualty balance: battle-specific taken vs inflicted across factions
 *  2. Peak personnel: no brigade exceeds its historical peak
 *  3. Brigade assignment completeness: canonical final unresolved-sector truth is empty
 *  4. Ghost paramilitaries: inactive paramilitaries with personnel > 0
 *  5. Offensive intel blindness: after turn 20, at least some intel records show offensive_signs
 *  6. Formation.assignment sync: sector-assigned brigades must have formation.assignment set
 *  7. Reserve cap: no sector has more than 1 reserve brigade
 *  8. Physical sector ownership: every brigade in a sector packet must be on the
 *     sector front, inside its territory, or in its sector-local reserve band
 *  9. War-front edge sector coverage: every persisted war-front edge must be
 *     owned by the sector layer, and sectors must not claim non-war edges
 *  9. Sector geometry: no sector spans disconnected frontline/territory pieces
 * 10. Empty contested sectors: no live sector with front edges is ownerless
 * 11. Sector floor shortfalls: fail only when a below-floor sector had a legal
 *     same-corps donor available under current engine rules; otherwise classify
 *     it as an unavoidable shortfall
 * 12. Undefended front subsegments: no wide gap=true subsegment persists
 * 13. Adjacent uncontested territory: no undefended friendly OSID sits next to
 *     an enemy brigade on a live war edge
 *
 * Exit code 0 = PASS, 1 = FAIL (any hard check fails; casualty gap is informational only).
 */

const fs = require('fs');
const path = require('path');

function resolveRunInput(input) {
    if (!input) {
        throw new Error('Usage: node tools/validate_run_consistency.cjs <run_dir_or_save_json>');
    }

    let finalPath;
    let runLabel;
    if (fs.existsSync(input) && fs.statSync(input).isFile()) {
        finalPath = input;
        runLabel = input;
    } else {
        finalPath = path.join(input, 'final_save.json');
        runLabel = input;
    }
    if (!fs.existsSync(finalPath)) {
        throw new Error(`final_save.json not found at ${finalPath}`);
    }

    return {
        finalPath,
        runLabel,
    };
}

function collectAssignmentCompletenessIssues(state) {
    const formations = state.military?.formations ?? {};
    const unresolved = Array.isArray(state.military?.unresolved_sector_brigades)
        ? [...state.military.unresolved_sector_brigades]
        : [];

    return unresolved
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((formationId) => {
            const formation = formations[formationId] ?? {};
            return {
                id: formationId,
                corps: formation.corps_id ?? 'unknown',
                faction: formation.faction ?? 'unknown',
            };
        });
}

function getSectorFrontOsids(sector) {
    const frontOsids = new Set();
    for (const subSegment of sector?.sub_segments || []) {
        for (const osid of subSegment.friendly_osids || []) frontOsids.add(osid);
    }
    return frontOsids;
}

function buildOneHopReserveBand(frontOsids, adjacency, friendlyOsids) {
    const reserveBand = new Set();
    for (const frontOsid of frontOsids) {
        for (const neighbor of adjacency.get(frontOsid) ?? []) {
            if (frontOsids.has(neighbor)) continue;
            if (!friendlyOsids.has(neighbor)) continue;
            reserveBand.add(neighbor);
        }
    }
    return reserveBand;
}

function buildFactionFriendlyOsids(state, faction) {
    const friendlyOsids = new Set();
    for (const [osid, owner] of Object.entries(state.political?.political_controllers ?? {})) {
        if (owner === faction) friendlyOsids.add(osid);
    }
    return friendlyOsids;
}

function buildFactionComponents(adjacency, friendlyOsids) {
    const componentOf = new Map();
    let nextId = 0;
    const sortedFriendly = [...friendlyOsids].sort((a, b) => String(a).localeCompare(String(b)));
    for (const start of sortedFriendly) {
        if (componentOf.has(start)) continue;
        const queue = [start];
        componentOf.set(start, nextId);
        for (let i = 0; i < queue.length; i++) {
            const current = queue[i];
            for (const neighbor of adjacency.get(current) ?? []) {
                if (!friendlyOsids.has(neighbor) || componentOf.has(neighbor)) continue;
                componentOf.set(neighbor, nextId);
                queue.push(neighbor);
            }
        }
        nextId++;
    }
    return componentOf;
}

function getSectorComponent(sector, componentOf) {
    const ownedOsids = new Set(sector?.territory_osids || []);
    for (const osid of getSectorFrontOsids(sector)) ownedOsids.add(osid);
    const componentIds = [...ownedOsids]
        .map((osid) => componentOf.get(osid))
        .filter((componentId) => componentId != null)
        .sort((a, b) => a - b);
    return componentIds.length > 0 ? componentIds[0] : -1;
}

function buildOperationParticipantSet(state) {
    const participants = new Set();
    for (const command of Object.values(state.military?.corps_command ?? {})) {
        for (const operation of command?.active_operations ?? []) {
            for (const brigadeId of operation.participating_brigades ?? []) {
                participants.add(brigadeId);
            }
        }
    }
    return participants;
}

function countActiveFieldBrigadesByOsid(state) {
    const counts = new Map();
    for (const formation of Object.values(state.military?.formations ?? {})) {
        if (!formation || formation.status !== 'active') continue;
        if (!isFieldBrigadeKind(formation.kind)) continue;
        if (!formation.location_osid) continue;
        counts.set(formation.location_osid, (counts.get(formation.location_osid) ?? 0) + 1);
    }
    return counts;
}

function classifySectorPosition(locationOsid, frontOsids, reserveBand, territoryOsids) {
    if (!locationOsid) return null;
    if (frontOsids.has(locationOsid)) return 'front';
    if (reserveBand.has(locationOsid)) return 'reserve';
    if (territoryOsids.has(locationOsid)) return 'territory';
    return null;
}

function friendlyDistanceToAny(startOsid, targets, adjacency, friendlyOsids, maxHops = 30) {
    if (!startOsid || targets.size === 0) return null;
    if (!friendlyOsids.has(startOsid)) return null;
    if (targets.has(startOsid)) return 0;
    const visited = new Set([startOsid]);
    let frontier = [startOsid];
    for (let hop = 1; hop <= maxHops; hop++) {
        const next = [];
        for (const osid of frontier) {
            for (const neighbor of adjacency.get(osid) ?? []) {
                if (visited.has(neighbor)) continue;
                visited.add(neighbor);
                if (!friendlyOsids.has(neighbor)) continue;
                if (targets.has(neighbor)) return hop;
                next.push(neighbor);
            }
        }
        if (next.length === 0) break;
        frontier = next;
    }
    return null;
}

function graphDistanceToAny(startOsid, targets, adjacency, maxHops = 30) {
    if (!startOsid || targets.size === 0) return null;
    if (targets.has(startOsid)) return 0;
    const visited = new Set([startOsid]);
    let frontier = [startOsid];
    for (let hop = 1; hop <= maxHops; hop++) {
        const next = [];
        for (const osid of frontier) {
            for (const neighbor of adjacency.get(osid) ?? []) {
                if (visited.has(neighbor)) continue;
                visited.add(neighbor);
                if (targets.has(neighbor)) return hop;
                next.push(neighbor);
            }
        }
        if (next.length === 0) break;
        frontier = next;
    }
    return null;
}

function computeNeededFrontBrigades(sector) {
    return Math.max(1, Math.ceil((sector?.length_edges || 0) / 8));
}

const LOCAL_FRONT_RELIEF_MAX_HOPS = 3;
const FRONT_DONOR_HOME_DISTANCE_MAX_HOPS = 4;

function buildSectorCoverageDonorContext(state) {
    const sectors = Object.values(state.military?.corps_front_sectors ?? {});
    const adjacency = loadOperationalAdjacency(state);
    const byFaction = new Map();
    for (const sector of sectors) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    const factionContext = new Map();
    for (const [faction, factionSectors] of byFaction.entries()) {
        const friendlyOsids = buildFactionFriendlyOsids(state, faction);
        const componentOf = buildFactionComponents(adjacency, friendlyOsids);
        const sectorContext = new Map();
        for (const sector of factionSectors) {
            const frontOsids = getSectorFrontOsids(sector);
            const territoryOsids = new Set(sector.territory_osids || []);
            const reserveBand = buildOneHopReserveBand(frontOsids, adjacency, friendlyOsids);
            sectorContext.set(sector.sector_id, {
                frontOsids,
                territoryOsids,
                reserveBand,
                component: getSectorComponent(sector, componentOf),
            });
        }
        factionContext.set(faction, { friendlyOsids, componentOf, sectorContext });
    }

    return {
        sectors,
        formations: state.military?.formations ?? {},
        adjacency,
        opParticipants: buildOperationParticipantSet(state),
        activeCounts: countActiveFieldBrigadesByOsid(state),
        factionContext,
    };
}

function targetPreservesHomeDistance(formation, targetOsid, adjacency) {
    if (!formation?.home_osid) return true;
    const dist = graphDistanceToAny(
        formation.home_osid,
        new Set([targetOsid]),
        adjacency,
        FRONT_DONOR_HOME_DISTANCE_MAX_HOPS,
    );
    return dist != null && dist <= FRONT_DONOR_HOME_DISTANCE_MAX_HOPS;
}

function findLegalReliefTarget(formation, targetOsids, ctx, maxHops = LOCAL_FRONT_RELIEF_MAX_HOPS) {
    for (const targetOsid of targetOsids) {
        if (!targetPreservesHomeDistance(formation, targetOsid, ctx.adjacency)) continue;
        const dist = friendlyDistanceToAny(
            formation.location_osid,
            new Set([targetOsid]),
            ctx.adjacency,
            ctx.friendlyOsids,
            maxHops,
        );
        if (dist != null) {
            return { target_osid: targetOsid, distance: dist };
        }
    }
    return null;
}

function collectLegalSectorDonorCandidates(state, recipientSector, targetOsids) {
    const strictCompare = (a, b) => String(a).localeCompare(String(b));
    const donorCtx = buildSectorCoverageDonorContext(state);
    const factionCtx = donorCtx.factionContext.get(recipientSector.faction);
    const recipientContext = factionCtx?.sectorContext.get(recipientSector.sector_id);
    if (!factionCtx || !recipientContext) return [];

    const vacantTargets = [...targetOsids]
        .filter((osid) => (donorCtx.activeCounts.get(osid) ?? 0) === 0)
        .sort(strictCompare);
    if (vacantTargets.length === 0) return [];

    const donorCandidates = [];
    const inspectEntry = (entry, donor, donorContext) => {
        const formation = donorCtx.formations[entry.bid];
        if (!formation?.location_osid) return;
        if (formation.status !== 'active') return;
        if (!isFieldBrigadeKind(formation.kind)) return;
        if ((formation.disrupted_turns ?? 0) > 0) return;
        if (donorCtx.opParticipants.has(entry.bid)) return;
        if (entry.donorRole === 'front') {
            const claim = classifySectorPosition(
                formation.location_osid,
                donorContext.frontOsids,
                donorContext.reserveBand,
                donorContext.territoryOsids,
            );
            if (claim !== 'front') return;
            if ((donor.assigned_brigade_ids || []).length <= computeNeededFrontBrigades(donor)) return;
        }
        const legalTarget = findLegalReliefTarget(formation, vacantTargets, {
            adjacency: donorCtx.adjacency,
            friendlyOsids: factionCtx.friendlyOsids,
        });
        if (!legalTarget) return;
        donorCandidates.push({
            donor_sector_id: donor.sector_id,
            donor_role: entry.donorRole,
            brigade_id: entry.bid,
            distance: legalTarget.distance,
            target_osid: legalTarget.target_osid,
        });
    };

    const ownEntries = [
        ...((recipientSector.rear_brigade_ids || []).map((bid) => ({ bid, donorRole: 'rear' }))),
        ...((recipientSector.reserve_brigade_ids || []).map((bid) => ({ bid, donorRole: 'reserve' }))),
    ];
    for (const entry of ownEntries) {
        inspectEntry(entry, recipientSector, recipientContext);
    }

    for (const donor of donorCtx.sectors
        .filter((candidate) =>
            candidate.faction === recipientSector.faction
            && candidate.corps_id === recipientSector.corps_id
            && candidate.sector_id !== recipientSector.sector_id)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id))) {
        const donorContext = factionCtx.sectorContext.get(donor.sector_id);
        if (!donorContext || donorContext.component !== recipientContext.component) continue;
        const donorNeeded = computeNeededFrontBrigades(donor);
        const canDonateFront =
            (donor.length_edges || 0) > 0
            && (donor.assigned_brigade_ids || []).length > donorNeeded
            && (donor.threat_ratio ?? 0) <= 250;
        const entries = [
            ...((donor.rear_brigade_ids || []).map((bid) => ({ bid, donorRole: 'rear' }))),
            ...((donor.reserve_brigade_ids || []).map((bid) => ({ bid, donorRole: 'reserve' }))),
            ...(canDonateFront ? (donor.assigned_brigade_ids || []).map((bid) => ({ bid, donorRole: 'front' })) : []),
        ];
        for (const entry of entries) {
            inspectEntry(entry, donor, donorContext);
        }
    }

    return donorCandidates.sort((a, b) =>
        a.distance - b.distance
        || strictCompare(a.donor_sector_id, b.donor_sector_id)
        || strictCompare(a.brigade_id, b.brigade_id));
}

function collectSectorFloorShortfallIssues(state) {
    const sectors = Object.values(state.military?.corps_front_sectors ?? {});
    if (sectors.length === 0) {
        return { missed_reinforcement: [], unavoidable_shortfall: [] };
    }

    const formations = state.military?.formations ?? {};
    const adjacency = loadOperationalAdjacency(state);
    const opParticipants = buildOperationParticipantSet(state);
    const brigadeMovementState = state.military?.brigade_movement_state ?? {};
    const brigadeMovementOrders = state.military?.brigade_movement_orders ?? {};
    const activeCounts = countActiveFieldBrigadesByOsid(state);
    const byFaction = new Map();
    for (const sector of sectors) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    const factionContext = new Map();
    for (const [faction, factionSectors] of byFaction.entries()) {
        const friendlyOsids = buildFactionFriendlyOsids(state, faction);
        const componentOf = buildFactionComponents(adjacency, friendlyOsids);
        const sectorContext = new Map();
        for (const sector of factionSectors) {
            const frontOsids = getSectorFrontOsids(sector);
            const territoryOsids = new Set(sector.territory_osids || []);
            const reserveBand = buildOneHopReserveBand(frontOsids, adjacency, friendlyOsids);
            sectorContext.set(sector.sector_id, {
                frontOsids,
                territoryOsids,
                reserveBand,
                component: getSectorComponent(sector, componentOf),
            });
        }
        factionContext.set(faction, { friendlyOsids, componentOf, sectorContext });
    }

    const missedReinforcement = [];
    const unavoidableShortfall = [];
    const strictCompare = (a, b) => String(a).localeCompare(String(b));

    for (const sector of sectors
        .filter((candidate) =>
            (candidate.length_edges || 0) > 0
            && !candidate.unstaffed_front
            && (candidate.assigned_brigade_ids || []).length > 0
            && (candidate.assigned_brigade_ids || []).length < computeNeededFrontBrigades(candidate))
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id))) {
        const needed = computeNeededFrontBrigades(sector);
        const assigned = (sector.assigned_brigade_ids || []).length;
        const recipientDensity = assigned / Math.max(1, sector.length_edges || 0);
        const recipientThreat = sector.threat_ratio ?? 0;
        const ctx = factionContext.get(sector.faction);
        const recipientContext = ctx?.sectorContext.get(sector.sector_id);
        if (!ctx || !recipientContext) continue;

        const vacantFrontOsids = [...recipientContext.frontOsids]
            .filter((osid) => (activeCounts.get(osid) ?? 0) === 0)
            .sort(strictCompare);
        if (vacantFrontOsids.length === 0) continue;

        const donorCandidates = [];
        const ownEntries = [
            ...((sector.rear_brigade_ids || []).map((bid) => ({ bid, donorRole: 'rear' }))),
            ...((sector.reserve_brigade_ids || []).map((bid) => ({ bid, donorRole: 'reserve' }))),
        ];
        for (const entry of ownEntries) {
            const formation = formations[entry.bid];
            if (!formation?.location_osid) continue;
            if (formation.status !== 'active') continue;
            if (!isFieldBrigadeKind(formation.kind)) continue;
            if ((formation.disrupted_turns ?? 0) > 0) continue;
            if (opParticipants.has(entry.bid)) continue;
            if (brigadeMovementState[entry.bid]?.status === 'in_transit') continue;
            if (brigadeMovementOrders[entry.bid]) continue;
            const legalTarget = findLegalReliefTarget(
                formation,
                vacantFrontOsids,
                { adjacency, friendlyOsids: ctx.friendlyOsids },
                3,
            );
            if (!legalTarget) continue;
            donorCandidates.push({
                donor_sector_id: sector.sector_id,
                donor_role: entry.donorRole,
                brigade_id: entry.bid,
                distance: legalTarget.distance,
                target_osid: legalTarget.target_osid,
            });
        }

        for (const donor of sectors
            .filter((candidate) =>
                candidate.faction === sector.faction
                && candidate.corps_id === sector.corps_id
                && candidate.sector_id !== sector.sector_id)
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id))) {
            const donorContext = ctx.sectorContext.get(donor.sector_id);
            if (!donorContext || donorContext.component !== recipientContext.component) continue;

            const donorDensity = (donor.assigned_brigade_ids || []).length / Math.max(1, donor.length_edges || 0);
            const donorThreat = donor.threat_ratio ?? 0;
            const donorNeeded = computeNeededFrontBrigades(donor);
            const canDonateFront =
                (donor.length_edges || 0) > 0
                && (donor.assigned_brigade_ids || []).length > donorNeeded
                && donorDensity >= recipientDensity + 0.05
                && donorThreat <= 250
                && recipientThreat >= donorThreat * 1.2;

            const entries = [
                ...((donor.rear_brigade_ids || []).map((bid) => ({ bid, donorRole: 'rear' }))),
                ...((donor.reserve_brigade_ids || []).map((bid) => ({ bid, donorRole: 'reserve' }))),
                ...(canDonateFront ? (donor.assigned_brigade_ids || []).map((bid) => ({ bid, donorRole: 'front' })) : []),
            ];

            for (const entry of entries) {
                const formation = formations[entry.bid];
                if (!formation?.location_osid) continue;
                if (formation.status !== 'active') continue;
                if (!isFieldBrigadeKind(formation.kind)) continue;
                if ((formation.disrupted_turns ?? 0) > 0) continue;
                if (opParticipants.has(entry.bid)) continue;
                if (brigadeMovementState[entry.bid]?.status === 'in_transit') continue;
                if (brigadeMovementOrders[entry.bid]) continue;
                if (entry.donorRole === 'front') {
                    const claim = classifySectorPosition(
                        formation.location_osid,
                        donorContext.frontOsids,
                        donorContext.reserveBand,
                        donorContext.territoryOsids,
                    );
                    if (claim !== 'front') continue;
                    if ((donor.assigned_brigade_ids || []).length <= donorNeeded) continue;
                }
                const legalTarget = findLegalReliefTarget(
                    formation,
                    vacantFrontOsids,
                    { adjacency, friendlyOsids: ctx.friendlyOsids },
                    3,
                );
                if (!legalTarget) continue;
                donorCandidates.push({
                    donor_sector_id: donor.sector_id,
                    donor_role: entry.donorRole,
                    brigade_id: entry.bid,
                    distance: legalTarget.distance,
                    target_osid: legalTarget.target_osid,
                });
            }
        }

        const issue = {
            sector: sector.sector_id,
            corps: sector.corps_id,
            faction: sector.faction,
            assigned,
            needed,
            threat_ratio: recipientThreat,
            donor_candidates: donorCandidates.sort((a, b) =>
                a.distance - b.distance
                || strictCompare(a.donor_sector_id, b.donor_sector_id)
                || strictCompare(a.brigade_id, b.brigade_id)),
        };
        if (donorCandidates.length > 0) {
            missedReinforcement.push(issue);
        } else {
            unavoidableShortfall.push(issue);
        }
    }

    return {
        missed_reinforcement: missedReinforcement,
        unavoidable_shortfall: unavoidableShortfall,
    };
}

function buildAdjacency(edges) {
    const adjacency = new Map();
    for (const edge of edges || []) {
        if (!edge?.a || !edge?.b) continue;
        const left = adjacency.get(edge.a) ?? [];
        if (!left.includes(edge.b)) left.push(edge.b);
        adjacency.set(edge.a, left);

        const right = adjacency.get(edge.b) ?? [];
        if (!right.includes(edge.a)) right.push(edge.a);
        adjacency.set(edge.b, right);
    }
    for (const neighbors of adjacency.values()) {
        neighbors.sort((a, b) => String(a).localeCompare(String(b)));
    }
    return adjacency;
}

function loadOperationalAdjacency(state) {
    if (Array.isArray(state.__contact_graph_edges)) {
        return buildAdjacency(state.__contact_graph_edges);
    }

    const graphPath = path.join(process.cwd(), 'data', 'derived', 'operational', 'operational_contact_graph.json');
    if (!fs.existsSync(graphPath)) return new Map();
    try {
        const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        return buildAdjacency(graph.edges || []);
    } catch {
        return new Map();
    }
}

function collectPhysicalSectorOwnershipIssues(state) {
    const formations = state.military?.formations ?? {};
    const sectors = state.military?.corps_front_sectors ?? {};
    const adjacency = loadOperationalAdjacency(state);
    const issues = [];

    for (const [sectorId, sec] of Object.entries(sectors).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
        const frontOsids = new Set();
        for (const subSegment of sec.sub_segments || []) {
            for (const osid of subSegment.friendly_osids || []) frontOsids.add(osid);
        }
        const territoryOsids = new Set(sec.territory_osids || []);
        const reserveBand = new Set();
        for (const frontOsid of frontOsids) {
            for (const neighbor of adjacency.get(frontOsid) ?? []) {
                if (frontOsids.has(neighbor)) continue;
                if (!territoryOsids.has(neighbor)) continue;
                reserveBand.add(neighbor);
            }
        }

        for (const [role, brigadeIds] of [
            ['assigned', sec.assigned_brigade_ids || []],
            ['reserve', sec.reserve_brigade_ids || []],
            ['rear', sec.rear_brigade_ids || []],
        ]) {
            for (const brigadeId of brigadeIds) {
                const location = formations[brigadeId]?.location_osid ?? null;
                const hasClaim =
                    location != null
                    && (frontOsids.has(location) || territoryOsids.has(location) || reserveBand.has(location));
                if (!hasClaim) {
                    issues.push({
                        id: brigadeId,
                        sector: sectorId,
                        role,
                        location,
                    });
                }
            }
        }
    }

    return issues;
}

function collectSectorRoleBucketSyncIssues(state) {
    const formations = state.military?.formations ?? {};
    const sectors = state.military?.corps_front_sectors ?? {};
    const adjacency = loadOperationalAdjacency(state);
    const issues = [];

    for (const [sectorId, sec] of Object.entries(sectors).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
        const frontOsids = new Set();
        for (const subSegment of sec.sub_segments || []) {
            for (const osid of subSegment.friendly_osids || []) frontOsids.add(osid);
        }
        const territoryOsids = new Set(sec.territory_osids || []);
        const reserveBand = new Set();
        for (const frontOsid of frontOsids) {
            for (const neighbor of adjacency.get(frontOsid) ?? []) {
                if (frontOsids.has(neighbor)) continue;
                if (!territoryOsids.has(neighbor)) continue;
                reserveBand.add(neighbor);
            }
        }

        for (const [bucket, expectedRole, brigadeIds] of [
            ['assigned_brigade_ids', 'front', sec.assigned_brigade_ids || []],
            ['reserve_brigade_ids', 'reserve', sec.reserve_brigade_ids || []],
            ['rear_brigade_ids', 'rear', sec.rear_brigade_ids || []],
        ]) {
            for (const brigadeId of brigadeIds) {
                const formation = formations[brigadeId];
                const assignment = formation?.assignment;
                const location = formation?.location_osid ?? null;
                const assignmentRole = assignment?.kind === 'sector' && assignment?.sector_id === sectorId
                    ? assignment.role
                    : null;
                let physicalRole = null;
                if (location != null) {
                    if (frontOsids.has(location)) physicalRole = 'front';
                    else if (reserveBand.has(location)) physicalRole = 'reserve';
                    else if (territoryOsids.has(location)) physicalRole = 'rear';
                }
                const physicalRoleAllowed = expectedRole === 'rear'
                    ? physicalRole === 'rear' || physicalRole === 'reserve'
                    : physicalRole === expectedRole;
                if (assignmentRole !== expectedRole || !physicalRoleAllowed) {
                    issues.push({
                        id: brigadeId,
                        sector: sectorId,
                        bucket,
                        expected_role: expectedRole,
                        assignment_role: assignmentRole,
                        physical_role: physicalRole,
                        location,
                    });
                }
            }
        }
    }

    return issues;
}

function collectSectorGeometryIssues(state) {
    const sectors = state.military?.corps_front_sectors ?? {};
    const adjacency = loadOperationalAdjacency(state);
    if (adjacency.size === 0) return [];

    const issues = [];

    for (const [sectorId, sec] of Object.entries(sectors).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
        const ownedOsids = new Set(sec.territory_osids || []);
        for (const subSegment of sec.sub_segments || []) {
            for (const osid of subSegment.friendly_osids || []) {
                ownedOsids.add(osid);
            }
        }

        if (ownedOsids.size <= 1) continue;

        const remaining = new Set([...ownedOsids].sort((a, b) => String(a).localeCompare(String(b))));
        let pieces = 0;

        while (remaining.size > 0) {
            const [start] = remaining;
            const queue = [start];
            remaining.delete(start);
            pieces++;

            for (let i = 0; i < queue.length; i++) {
                const current = queue[i];
                for (const neighbor of adjacency.get(current) ?? []) {
                    if (!ownedOsids.has(neighbor)) continue;
                    if (!remaining.has(neighbor)) continue;
                    remaining.delete(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        if (pieces > 1) {
            issues.push({
                sector: sectorId,
                pieces,
                osids: [...ownedOsids].sort((a, b) => String(a).localeCompare(String(b))),
            });
        }
    }

    return issues;
}

function collectWarFrontSectorCoverageIssues(state) {
    const warFactionSides = new Set();
    for (const edge of state.military?.war_front_edges_osid ?? []) {
        if (!edge || typeof edge === 'string') continue;
        if (typeof edge.edge_id !== 'string' || edge.edge_id.length === 0) continue;
        if (typeof edge.side_a === 'string' && edge.side_a.length > 0) {
            warFactionSides.add(`${edge.side_a}::${edge.edge_id}`);
        }
        if (typeof edge.side_b === 'string' && edge.side_b.length > 0) {
            warFactionSides.add(`${edge.side_b}::${edge.edge_id}`);
        }
    }
    const sectorFactionSides = new Set();

    for (const sector of Object.values(state.military?.corps_front_sectors ?? {})) {
        if (typeof sector?.faction !== 'string' || sector.faction.length === 0) continue;
        for (const edgeId of sector.edge_ids ?? []) {
            if (typeof edgeId === 'string' && edgeId.length > 0) {
                sectorFactionSides.add(`${sector.faction}::${edgeId}`);
            }
        }
    }

    const missing = [...warFactionSides]
        .filter((sideKey) => !sectorFactionSides.has(sideKey))
        .sort((a, b) => String(a).localeCompare(String(b)));
    const extra = [...sectorFactionSides]
        .filter((sideKey) => !warFactionSides.has(sideKey))
        .sort((a, b) => String(a).localeCompare(String(b)));

    return { missing, extra };
}

function activeFieldBrigadesByOsid(state) {
    const byOsid = new Map();
    for (const [id, formation] of Object.entries(state.military?.formations ?? {})) {
        if (!formation || formation.status !== 'active') continue;
        if (!['brigade', 'og', 'operational_group'].includes(formation.kind)) continue;
        if (!formation.location_osid) continue;
        const list = byOsid.get(formation.location_osid) ?? [];
        list.push({ id, formation });
        byOsid.set(formation.location_osid, list);
    }
    for (const list of byOsid.values()) {
        list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    }
    return byOsid;
}

function isFieldBrigadeKind(kind) {
    return kind === undefined || kind === 'brigade' || kind === 'og' || kind === 'operational_group';
}

function buildSectorCoverageFactions(state) {
    const formations = state.military?.formations ?? {};
    const sectors = state.military?.corps_front_sectors ?? {};
    const covered = new Map();

    for (const [sectorId, sector] of Object.entries(sectors).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
        void sectorId;
        const brigadeIds = [
            ...(sector.assigned_brigade_ids ?? []),
            ...(sector.reserve_brigade_ids ?? []),
            ...(sector.rear_brigade_ids ?? []),
        ].sort((a, b) => String(a).localeCompare(String(b)));
        const hasActiveCoverage = brigadeIds.some((brigadeId) => {
            const brigade = formations[brigadeId];
            return brigade?.status === 'active' && isFieldBrigadeKind(brigade.kind);
        });
        if (!hasActiveCoverage) continue;

        const osids = new Set(sector.territory_osids ?? []);
        for (const subSegment of sector.sub_segments ?? []) {
            for (const osid of subSegment.friendly_osids ?? []) osids.add(osid);
        }

        for (const osid of osids) {
            const factions = covered.get(osid) ?? new Set();
            factions.add(sector.faction);
            covered.set(osid, factions);
        }
    }

    return covered;
}

function hasCanonicalDefense(faction, osid, physicalByOsid, sectorCoverageFactions) {
    const local = physicalByOsid.get(osid) ?? [];
    if (local.some(({ formation }) => formation.faction === faction)) return true;
    return sectorCoverageFactions.get(osid)?.has(faction) ?? false;
}

function collectEmptyContestedSectorIssues(state) {
    const sectors = state.military?.corps_front_sectors ?? {};
    const missedReinforcement = [];
    const unavoidableEmpty = [];
    for (const [sectorId, sector] of Object.entries(sectors).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
        const lengthEdges = sector.length_edges ?? sector.edge_ids?.length ?? 0;
        if (lengthEdges <= 0) continue;
        if (sector.unstaffed_front === true) continue;
        const assigned = sector.assigned_brigade_ids?.length ?? 0;
        const reserve = sector.reserve_brigade_ids?.length ?? 0;
        const rear = sector.rear_brigade_ids?.length ?? 0;
        if (assigned + reserve + rear === 0) {
            const donorCandidates = collectLegalSectorDonorCandidates(state, sector, getSectorFrontOsids(sector));
            const issue = {
                sector: sectorId,
                length_edges: lengthEdges,
                donor_candidates: donorCandidates,
            };
            if (donorCandidates.length > 0) {
                missedReinforcement.push(issue);
            } else {
                unavoidableEmpty.push(issue);
            }
        }
    }
    return {
        missed_reinforcement: missedReinforcement,
        unavoidable_empty: unavoidableEmpty,
    };
}

function collectUndefendedFrontSubsegmentIssues(state) {
    const sectors = state.military?.corps_front_sectors ?? {};
    const missedReinforcement = [];
    const unavoidableGap = [];
    const staleGap = [];
    for (const [sectorId, sector] of Object.entries(sectors).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
        if (sector.unstaffed_front === true) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            const lengthEdges = subSegment.length_edges ?? subSegment.edge_ids?.length ?? 0;
            if (subSegment.gap === true && lengthEdges > 2) {
                const issue = {
                    sector: sectorId,
                    sub_segment_id: subSegment.sub_segment_id ?? 'unknown',
                    length_edges: lengthEdges,
                };
                const assigned = sector.assigned_brigade_ids?.length ?? 0;
                const reserve = sector.reserve_brigade_ids?.length ?? 0;
                const rear = sector.rear_brigade_ids?.length ?? 0;
                if (assigned + reserve + rear > 0) {
                    staleGap.push(issue);
                    continue;
                }
                const donorCandidates = collectLegalSectorDonorCandidates(
                    state,
                    sector,
                    new Set(subSegment.friendly_osids || []),
                );
                const classifiedIssue = {
                    ...issue,
                    donor_candidates: donorCandidates,
                };
                if (donorCandidates.length > 0) {
                    missedReinforcement.push(classifiedIssue);
                } else {
                    unavoidableGap.push(classifiedIssue);
                }
            }
        }
    }
    return {
        missed_reinforcement: missedReinforcement,
        unavoidable_gap: unavoidableGap,
        stale_gap: staleGap,
    };
}

function collectAdjacentUncontestedTerritoryIssues(state) {
    const controllers = state.political?.political_controllers ?? {};
    const byOsid = activeFieldBrigadesByOsid(state);
    const sectorCoverageFactions = buildSectorCoverageFactions(state);
    const sectors = Object.values(state.military?.corps_front_sectors ?? {});
    const grazActive = state.political?.graz_east_herzegovina_active_turn != null;
    const missedDefender = [];
    const unavoidableExposure = [];
    const unownedFront = [];
    const seen = new Set();
    const strictCompare = (a, b) => String(a).localeCompare(String(b));

    const candidateSectorsFor = (osid, faction) => sectors
        .filter((sector) =>
            sector.faction === faction
            && (getSectorFrontOsids(sector).has(osid) || (sector.territory_osids || []).includes(osid)))
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    const inspectSide = (friendlyOsid, enemyOsid, friendlyFaction, enemyFaction) => {
        if (!friendlyFaction || !enemyFaction || friendlyFaction === enemyFaction) return;
        if (hasCanonicalDefense(friendlyFaction, friendlyOsid, byOsid, sectorCoverageFactions)) return;
        const enemyBrigades = (byOsid.get(enemyOsid) ?? [])
            .filter(({ formation }) => formation.faction === enemyFaction);
        if (enemyBrigades.length === 0) return;
        const key = `${friendlyOsid}__${enemyOsid}`;
        if (seen.has(key)) return;
        seen.add(key);
        const issue = {
            osid: friendlyOsid,
            faction: friendlyFaction,
            enemy_osid: enemyOsid,
            enemy_faction: enemyFaction,
            enemy_brigades: enemyBrigades.map(({ id }) => id),
        };

        const candidateSectors = candidateSectorsFor(friendlyOsid, friendlyFaction);
        if (candidateSectors.length === 0) {
            unownedFront.push(issue);
            return;
        }

        const donorCandidates = candidateSectors.flatMap((sector) =>
            collectLegalSectorDonorCandidates(state, sector, new Set([friendlyOsid])));
        if (donorCandidates.length > 0) {
            missedDefender.push({
                ...issue,
                donor_candidates: donorCandidates.sort((a, b) =>
                    a.distance - b.distance
                    || strictCompare(a.donor_sector_id, b.donor_sector_id)
                    || strictCompare(a.brigade_id, b.brigade_id)),
            });
            return;
        }

        const serializedCoverageExists = candidateSectors.some((sector) =>
            (sector.assigned_brigade_ids || []).length + (sector.reserve_brigade_ids || []).length > 0);
        if (serializedCoverageExists) {
            missedDefender.push({
                ...issue,
                donor_candidates: [],
            });
            return;
        }

        unavoidableExposure.push({
            ...issue,
            donor_candidates: [],
        });
    };

        for (const edge of state.military?.war_front_edges_osid ?? []) {
        const a = edge.a;
        const b = edge.b;
        if (!a || !b) continue;
        const sideA = edge.side_a ?? controllers[a] ?? null;
        const sideB = edge.side_b ?? controllers[b] ?? null;
        if (grazActive) {
            const pair = [sideA, sideB].filter(Boolean).sort((x, y) => String(x).localeCompare(String(y)));
            if (pair[0] === 'HRHB' && pair[1] === 'RS') continue;
        }
        inspectSide(a, b, sideA, sideB);
        inspectSide(b, a, sideB, sideA);
    }

    const byLocation = (a, b) => strictCompare(a.osid, b.osid) || strictCompare(a.enemy_osid, b.enemy_osid);
    return {
        missed_defender: missedDefender.sort(byLocation),
        unavoidable_exposure: unavoidableExposure.sort(byLocation),
        unowned_front: unownedFront.sort(byLocation),
    };
}

function validateState(state, runLabel) {
    const lines = [];
    const log = (line = '') => lines.push(line);
    let failures = 0;

    const fail = (msg) => {
        log(`  FAIL: ${msg}`);
        failures++;
    };

    const ok = (msg) => {
        log(`  OK: ${msg}`);
    };

    const formations = state.military?.formations ?? {};
    const fmns = Object.values(formations);
    const sectors = state.military?.corps_front_sectors ?? {};
    const sectorIntel = state.military?.sector_intel ?? {};
    const currentTurn = state.meta?.turn ?? 0;

    log('=== AWWV Run Consistency Validation ===');
    log(`Run: ${runLabel}`);
    log(`Turn: ${currentTurn}`);
    log('');

    // ── 1. Casualty Accounting (informational) ──────────────────────────
    log('--- Casualty Accounting ---');

    const factionStats = {};
    for (const f of fmns) {
        if (f.kind === 'paramilitary' || f.kind === 'militia') continue;
        const faction = f.faction;
        if (!faction) continue;
        if (!factionStats[faction]) factionStats[faction] = { taken: 0, inflicted: 0 };
        const hist = f.brigade_history;
        if (!hist) continue;
        factionStats[faction].taken += hist.total_casualties_taken || 0;
        factionStats[faction].inflicted += hist.total_casualties_inflicted || 0;
    }

    let totalTaken = 0;
    let totalInflicted = 0;
    for (const [faction, stats] of Object.entries(factionStats).sort()) {
        log(`  ${faction.padEnd(6)} taken=${stats.taken}  inflicted=${stats.inflicted}`);
        totalTaken += stats.taken;
        totalInflicted += stats.inflicted;
    }
    const gap = totalTaken - totalInflicted;
    log(`  Total taken: ${totalTaken}  Total inflicted: ${totalInflicted}  Gap: ${gap}`);
    log('  NOTE: Gap includes friction/siege attrition (no opposing brigade)');
    log('');

    // ── 2. Peak Personnel ───────────────────────────────────────────────
    log('--- Peak Personnel ---');
    const peakViolations = [];
    for (const f of fmns) {
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade') continue;
        const hist = f.brigade_history;
        if (!hist || hist.peak_personnel == null) continue;
        if ((f.personnel || 0) > hist.peak_personnel) {
            peakViolations.push({
                id: f.id,
                personnel: f.personnel,
                peak: hist.peak_personnel,
            });
        }
    }

    if (peakViolations.length === 0) {
        ok('0 violations');
    } else {
        for (const v of peakViolations) {
            fail(`${v.id}: personnel ${v.personnel} > peak ${v.peak}`);
        }
    }
    log('');

    // ── 3. Brigade Assignment Completeness ──────────────────────────────
    log('--- Brigade Assignment ---');
    const unresolved = collectAssignmentCompletenessIssues(state);

    if (unresolved.length === 0) {
        ok('0 unresolved');
    } else {
        for (const u of unresolved) {
            fail(`${u.id} (${u.corps}, ${u.faction}) is canonically unresolved in military.unresolved_sector_brigades`);
        }
    }
    log('');

    // ── 4. Ghost Paramilitaries ─────────────────────────────────────────
    log('--- Ghost Paramilitaries ---');
    const ghosts = [];
    for (const f of fmns) {
        if (f.kind !== 'paramilitary' && f.kind !== 'militia') continue;
        if (f.status === 'active') continue;
        if ((f.personnel || 0) > 0) {
            ghosts.push({ id: f.id, status: f.status, personnel: f.personnel });
        }
    }

    if (ghosts.length === 0) {
        ok('0 ghosts');
    } else {
        for (const g of ghosts) {
            fail(`${g.id}: status=${g.status}, personnel=${g.personnel}`);
        }
    }
    log('');

    // ── 5. Intel System ─────────────────────────────────────────────────
    log('--- Intel System ---');
    let totalIntelRecords = 0;
    let offensiveSignsCount = 0;

    for (const records of Object.values(sectorIntel)) {
        if (!Array.isArray(records)) continue;
        for (const rec of records) {
            totalIntelRecords++;
            if (rec.offensive_signs === true) offensiveSignsCount++;
        }
    }

    log(`  Offensive signs: ${offensiveSignsCount}/${totalIntelRecords} records`);
    if (currentTurn > 20 && totalIntelRecords > 0 && offensiveSignsCount === 0) {
        fail('After turn 20, 0 intel records show offensive_signs — intel system may be broken');
    } else if (currentTurn > 20 && totalIntelRecords === 0) {
        fail('After turn 20, 0 intel records exist — intel system may be broken');
    } else {
        ok(`Intel system functional (turn ${currentTurn})`);
    }
    log('');

    // ── 6. Assignment Sync ──────────────────────────────────────────────
    log('--- Assignment Sync ---');
    const missingAssignment = [];

    for (const [sectorId, sec] of Object.entries(sectors)) {
        for (const bid of (sec.assigned_brigade_ids || [])) {
            const f = formations[bid];
            if (!f) continue;
            if (!f.assignment) {
                missingAssignment.push({ id: bid, sector: sectorId });
            }
        }
    }

    if (missingAssignment.length === 0) {
        ok('0 missing');
    } else {
        for (const m of missingAssignment) {
            fail(`${m.id} in ${m.sector} has no formation.assignment`);
        }
    }
    log('');

    // ── 7. Reserve Cap ───────────────────────────────────────────────────
    log('--- Sector Role Buckets ---');
    const roleBucketIssues = collectSectorRoleBucketSyncIssues(state);
    if (roleBucketIssues.length === 0) {
        ok('sector bucket roles match formation assignment and physical position');
    } else {
        for (const issue of roleBucketIssues) {
            fail(`${issue.id} in ${issue.sector}.${issue.bucket} expected ${issue.expected_role}, formation role=${issue.assignment_role ?? 'null'}, physical role=${issue.physical_role ?? 'null'} at ${issue.location ?? 'null'}`);
        }
    }
    log('');

    log('--- Reserve Cap ---');
    const reserveOverflows = [];
    for (const [sectorId, sec] of Object.entries(sectors)) {
        const reserves = sec.reserve_brigade_ids || [];
        if (reserves.length > 1) {
            reserveOverflows.push({ sector: sectorId, count: reserves.length, ids: reserves });
        }
    }

    if (reserveOverflows.length === 0) {
        ok('0 sectors with >1 reserve');
    } else {
        for (const r of reserveOverflows) {
            fail(`${r.sector}: ${r.count} reserves (${r.ids.join(', ')}) — exceeds 1-reserve-per-sector cap`);
        }
    }
    log('');

    // â”€â”€ 8. Physical Sector Ownership â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    log('--- Physical Sector Ownership ---');
    const falseOwners = collectPhysicalSectorOwnershipIssues(state);

    if (falseOwners.length === 0) {
        ok('0 false owners');
    } else {
        for (const issue of falseOwners) {
            fail(`${issue.id} in ${issue.sector} (${issue.role}) is not physically owned by that sector at ${issue.location ?? 'null'} â€” sector packets may only keep front, territory, or sector-local reserve claims`);
        }
    }
    log('');

    // --- 9. War-Front Faction-Side Coverage ---
    log('--- War-Front Faction-Side Coverage ---');
    const warFrontCoverage = collectWarFrontSectorCoverageIssues(state);

    if (warFrontCoverage.missing.length === 0 && warFrontCoverage.extra.length === 0) {
        ok('sector faction-side coverage exactly matches military.war_front_edges_osid');
    } else {
        for (const sideKey of warFrontCoverage.missing) {
            fail(`war-front faction-side missing from sector layer: ${sideKey}`);
        }
        for (const sideKey of warFrontCoverage.extra) {
            fail(`sector layer claims non-war faction-side: ${sideKey}`);
        }
    }
    log('');

    // --- 10. Sector Geometry ---
    log('--- Sector Geometry ---');
    const geometryIssues = collectSectorGeometryIssues(state);

    if (geometryIssues.length === 0) {
        ok('0 disconnected sectors');
    } else {
        for (const issue of geometryIssues) {
            fail(`${issue.sector} spans ${issue.pieces} disconnected frontline/territory pieces (${issue.osids.join(', ')})`);
        }
    }
    log('');

    // --- 11. Empty Contested Sectors ---
    log('--- Empty Contested Sectors ---');
    const emptyContested = collectEmptyContestedSectorIssues(state);

    if (emptyContested.missed_reinforcement.length === 0) {
        ok('0 empty contested sectors with missed legal donors');
    } else {
        for (const issue of emptyContested.missed_reinforcement) {
            const donors = issue.donor_candidates
                .map((candidate) =>
                    `${candidate.brigade_id} from ${candidate.donor_sector_id} (${candidate.donor_role}, ${candidate.distance} hop(s))`)
                .join('; ');
            fail(`${issue.sector} is empty with legal donor(s) available across ${issue.length_edges} front edge(s): ${donors}`);
        }
    }
    if (emptyContested.unavoidable_empty.length === 0) {
        ok('0 unavoidable empty contested sectors');
    } else {
        for (const issue of emptyContested.unavoidable_empty) {
            log(`  ~ ${issue.sector} remains empty with no legal same-corps donor under current rules (${issue.length_edges} front edge(s))`);
        }
    }
    log('');

    // --- 11. Sector Floor Shortfalls ---
    log('--- Sector Floor Shortfalls ---');
    const floorShortfalls = collectSectorFloorShortfallIssues(state);

    if (floorShortfalls.missed_reinforcement.length === 0) {
        ok('0 below-floor sectors with missed legal donors');
    } else {
        for (const issue of floorShortfalls.missed_reinforcement) {
            const donors = issue.donor_candidates
                .map((candidate) =>
                    `${candidate.brigade_id} from ${candidate.donor_sector_id} (${candidate.donor_role}, ${candidate.distance} hop(s))`)
                .join('; ');
            fail(`${issue.sector} is below floor ${issue.assigned}/${issue.needed} with legal donor(s) available: ${donors}`);
        }
    }
    if (floorShortfalls.unavoidable_shortfall.length === 0) {
        ok('0 unavoidable floor shortfalls');
    } else {
        for (const issue of floorShortfalls.unavoidable_shortfall) {
            log(`  ~ ${issue.sector} remains below floor ${issue.assigned}/${issue.needed} with no legal same-corps donor under current rules`);
        }
    }
    log('');

    // --- 12. Undefended Front Subsegments ---
    log('--- Undefended Front Subsegments ---');
    const undefendedSubsegments = collectUndefendedFrontSubsegmentIssues(state);

    if (undefendedSubsegments.missed_reinforcement.length === 0) {
        ok('0 wide gap=true subsegments with missed legal donors');
    } else {
        for (const issue of undefendedSubsegments.missed_reinforcement) {
            const donors = issue.donor_candidates
                .map((candidate) =>
                    `${candidate.brigade_id} from ${candidate.donor_sector_id} (${candidate.donor_role}, ${candidate.distance} hop(s))`)
                .join('; ');
            fail(`${issue.sub_segment_id} in ${issue.sector} remains gap=true across ${issue.length_edges} edge(s) with legal donor(s) available: ${donors}`);
        }
    }
    if (undefendedSubsegments.stale_gap.length === 0) {
        ok('0 wide gap=true subsegments inside partially covered sectors');
    } else {
        for (const issue of undefendedSubsegments.stale_gap) {
            fail(`${issue.sub_segment_id} in ${issue.sector} remains gap=true across ${issue.length_edges} edge(s) inside a partially covered sector`);
        }
    }
    if (undefendedSubsegments.unavoidable_gap.length === 0) {
        ok('0 unavoidable wide gap=true subsegments');
    } else {
        for (const issue of undefendedSubsegments.unavoidable_gap) {
            log(`  ~ ${issue.sub_segment_id} in ${issue.sector} remains gap=true with no legal same-corps donor under current rules (${issue.length_edges} edge(s))`);
        }
    }
    log('');

    // --- 13. Adjacent Uncontested Territory ---
    log('--- Adjacent Uncontested Territory ---');
    const adjacentUncontested = collectAdjacentUncontestedTerritoryIssues(state);

    if (
        adjacentUncontested.missed_defender.length === 0
        && adjacentUncontested.unowned_front.length === 0
    ) {
        ok('0 actionable undefended OSIDs adjacent to enemy brigades');
    } else {
        for (const issue of adjacentUncontested.unowned_front) {
            fail(`${issue.osid} (${issue.faction}) has no sector owner while ${issue.enemy_osid} (${issue.enemy_faction}) contains ${issue.enemy_brigades.join(', ')}`);
        }
        for (const issue of adjacentUncontested.missed_defender) {
            if ((issue.donor_candidates || []).length === 0) {
                fail(`${issue.osid} (${issue.faction}) has serialized coverage that is not canonical while ${issue.enemy_osid} (${issue.enemy_faction}) contains ${issue.enemy_brigades.join(', ')}`);
                continue;
            }
            const donors = issue.donor_candidates
                .map((candidate) =>
                    `${candidate.brigade_id} from ${candidate.donor_sector_id} (${candidate.donor_role}, ${candidate.distance} hop(s))`)
                .join('; ');
            fail(`${issue.osid} (${issue.faction}) has no local defender while ${issue.enemy_osid} (${issue.enemy_faction}) contains ${issue.enemy_brigades.join(', ')}`);
            log(`        legal donor(s): ${donors}`);
        }
    }
    if (adjacentUncontested.unavoidable_exposure.length === 0) {
        ok('0 unavoidable adjacent exposures');
    } else {
        for (const issue of adjacentUncontested.unavoidable_exposure) {
            log(`  ~ ${issue.osid} (${issue.faction}) is exposed to ${issue.enemy_osid} (${issue.enemy_faction}) with no legal same-corps donor under current rules`);
        }
    }
    log('');

    const result = failures === 0 ? 'PASS' : 'FAIL';
    log(`=== RESULT: ${result} ===`);
    if (failures > 0) {
        log(`${failures} failure(s) detected`);
    }

    return {
        failures,
        lines,
    };
}

function main() {
    let resolved;
    try {
        resolved = resolveRunInput(process.argv[2]);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    const state = JSON.parse(fs.readFileSync(resolved.finalPath, 'utf8'));
    const result = validateState(state, resolved.runLabel);
    for (const line of result.lines) {
        console.log(line);
    }
    if (result.failures > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    collectAssignmentCompletenessIssues,
    collectAdjacentUncontestedTerritoryIssues,
    collectEmptyContestedSectorIssues,
    collectSectorFloorShortfallIssues,
    collectSectorGeometryIssues,
    collectSectorRoleBucketSyncIssues,
    collectWarFrontSectorCoverageIssues,
    collectUndefendedFrontSubsegmentIssues,
    collectPhysicalSectorOwnershipIssues,
    resolveRunInput,
    validateState,
};
