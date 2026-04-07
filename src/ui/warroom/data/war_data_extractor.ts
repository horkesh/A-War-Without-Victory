/**
 * War Data Extraction Layer for warroom modals.
 *
 * Single entry point: extractWarData(gameState, playerFaction) → WarDataSnapshot.
 * All war-phase modals consume this snapshot instead of independently querying GameState.
 * Fog of war is enforced here: Tier 3 data is never included in the snapshot.
 *
 * No Math.random(), no timestamps. Sorted iteration via strictCompare.
 */

import type {
    BrigadeMovementState,
    CorpsCommandState,
    EmbargoProfile,
    FactionId,
    FormationId,
    FormationState,
    FrontEdgeState,
    FrontPressureState,
    GameState,
    PatronState,
    RbihHrhbState,
    SettlementId,
    TrendDirection,
} from '../../../state/game_state.js';
import {
    getPlayerSafeBrigadeName,
    getPlayerSafeCorpsName,
    getPlayerSafeOfficerName,
} from '../../map/utils/playerSafeText.js';

// ---------------------------------------------------------------------------
// Snapshot sub-interfaces
// ---------------------------------------------------------------------------

export interface FormationDetail {
    id: FormationId;
    name: string;
    kind: string;
    personnel: number;
    cohesion: number;
    readiness: string;
    posture: string;
    disrupted: boolean;
    woundedPending: number;
    movementStatus: string;
    corpsId: FormationId | null;
}

export interface OwnForcesSnapshot {
    totalPersonnel: number;
    activeBrigades: number;
    totalBrigades: number;
    corpsCount: number;
    avgCohesion: number;
    formationDetails: FormationDetail[];
}

export interface CasualtiesSnapshot {
    killed: number;
    wounded: number;
    missingCaptured: number;
    equipmentLost: { tanks: number; artillery: number; aa: number };
    woundedPendingReturn: number;
}

export interface TerritorySnapshot {
    settlementsControlled: number;
    settlementsTotal: number;
    /** Area-weighted when osidAreas provided, count-based fallback. */
    territoryPercent: number;
    areaControlledKm2?: number;
    areaTotalKm2?: number;
}

export interface DisplacementSnapshot {
    totalDisplacedOut: number;
    totalDisplacedIn: number;
    civilianKilled: number;
    civilianFledAbroad: number;
    activeCamps: number;
    activeHostileTakeoverTimers: number;
}

export interface ExhaustionSnapshot {
    level: number;
    trend: TrendDirection;
    increasing: boolean;
    collapseEligible: boolean;
}

export interface SupplySnapshot {
    adequateCount: number;
    strainedCount: number;
    criticalCount: number;
    collapsedMunicipalities: string[];
}

export interface AuthoritySnapshot {
    authority: number;
    legitimacy: number;
}

export interface CorpsOperationSnapshot {
    corpsId: FormationId;
    corpsName: string;
    stance: string;
    operation: {
        type: string;
        phase: string;
        started_turn: number;
    } | null;
}

export interface ContactedFormation {
    label: string;
    strengthCategory: string;
    contactSettlement: SettlementId | null;
    detectedTurn: number;
}

export interface FrontEdgeSnapshot {
    edgeId: string;
    settlementA: SettlementId;
    settlementB: SettlementId;
    sideA: FactionId | null;
    sideB: FactionId | null;
    pressure: number;
    friction: number;
    tier: 'defended' | 'garrisoned' | 'exposed';
}

export interface BrigadeMovementSnapshot {
    packing: FormationId[];
    inTransit: FormationId[];
    unpacking: FormationId[];
    encircled: FormationId[];
}

/** Officer list entry for warroom (Officers Phase E). Sorted by id per faction. */
export interface OfficerListEntry {
    id: string;
    name: string;
    rank: string;
    status: string;
    assigned_corps_id: string | null;
    acting_commander: boolean;
    competence: number;
}

// Faction-specific diplomacy snapshots
export interface RSPatronSnapshot {
    patronCommitment: number;
    materialSupport: number;
    diplomaticIsolation: number;
}

export interface RBiHDiplomacySnapshot {
    allianceValue: number;
    bilateralFlipsThisTurn: number;
    stalemateTurns: number;
    totalBilateralFlips: number;
    alliedMixedMunicipalities: string[];
    ceasefireActive: boolean;
    ceasefireSinceTurn: number | null;
    washingtonSigned: boolean;
    washingtonTurn: number | null;
    warStartedTurn: number | null;
}

export interface EmbargoSnapshot {
    heavyEquipmentAccess: number;
    ammunitionResupplyRate: number;
    maintenanceCapacity: number;
    smugglingEfficiency: number;
    externalPipelineStatus: number;
}

export interface FactionDiplomacySnapshot {
    patronState: RSPatronSnapshot | null;
    rbihHrhbState: RBiHDiplomacySnapshot | null;
    embargoProfile: EmbargoSnapshot | null;
    constraintSeverity: number | null;
    negotiationMomentum: number;
}

// Top-level snapshot
export interface WarDataSnapshot {
    playerFaction: FactionId;
    turn: number;
    phase: string;

    ownForces: OwnForcesSnapshot;
    ownCasualties: CasualtiesSnapshot;
    ownTerritory: TerritorySnapshot;
    ownDisplacement: DisplacementSnapshot;
    ownExhaustion: ExhaustionSnapshot;
    ownSupply: SupplySnapshot;
    ownAuthority: AuthoritySnapshot;
    ownCorpsOps: CorpsOperationSnapshot[];
    ownDiplomacy: FactionDiplomacySnapshot;

    contactedEnemyFormations: ContactedFormation[];
    engagedFrontEdges: FrontEdgeSnapshot[];

    brigadeMovement: BrigadeMovementSnapshot;
    exposedFrontSettlements: SettlementId[];
    /** Officers by faction (fog of war: only player faction populated). Phase E. */
    officersByFaction?: Partial<Record<FactionId, OfficerListEntry[]>>;
}

// ---------------------------------------------------------------------------
// Helper: deterministic sort
// ---------------------------------------------------------------------------

function sc(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function deriveMunicipalityControllerByOsid(state: GameState): Map<string, FactionId | null> {
    const counts = new Map<string, Map<FactionId, number>>();
    const controllers = state.political.political_controllers ?? {};

    for (const settlementId of Object.keys(controllers).sort(sc)) {
        const controller = controllers[settlementId];
        if (controller == null) continue;
        if (!settlementId.startsWith('op:')) continue;
        const parts = settlementId.split(':');
        if (parts.length < 3) continue;
        const municipalityId = parts[1];
        if (!municipalityId) continue;

        const perFaction = counts.get(municipalityId) ?? new Map<FactionId, number>();
        perFaction.set(controller, (perFaction.get(controller) ?? 0) + 1);
        counts.set(municipalityId, perFaction);
    }

    const result = new Map<string, FactionId | null>();
    for (const [municipalityId, perFaction] of Array.from(counts.entries()).sort(([a], [b]) => sc(a, b))) {
        const ranking = Array.from(perFaction.entries()).sort((a, b) => {
            if (a[1] !== b[1]) return b[1] - a[1];
            return sc(a[0], b[0]);
        });
        result.set(municipalityId, ranking[0]?.[0] ?? null);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export function extractWarData(
    gameState: GameState,
    playerFaction: FactionId,
    osidAreas?: { totalArea: number; areas: Record<string, number> }
): WarDataSnapshot {
    const turn = gameState.meta.turn;
    const phase = gameState.meta.phase ?? 'peace';

    // --- Own forces ---
    const ownForces = extractOwnForces(gameState, playerFaction);

    // --- Casualties ---
    const ownCasualties = extractCasualties(gameState, playerFaction);

    // --- Territory ---
    const ownTerritory = extractTerritory(gameState, playerFaction, osidAreas);

    // --- Displacement ---
    const ownDisplacement = extractDisplacement(gameState, playerFaction);

    // --- Exhaustion ---
    const ownExhaustion = extractExhaustion(gameState, playerFaction);

    // --- Supply ---
    const ownSupply = extractSupply(gameState, playerFaction);

    // --- Authority ---
    const ownAuthority = extractAuthority(gameState, playerFaction);

    // --- Corps operations ---
    const ownCorpsOps = extractCorpsOps(gameState, playerFaction);

    // --- Diplomacy (faction-specific) ---
    const ownDiplomacy = extractDiplomacy(gameState, playerFaction);

    // --- Front edges (Tier 2) ---
    const engagedFrontEdges = extractFrontEdges(gameState, playerFaction);

    // --- Contacted enemy formations (Tier 2) ---
    const contactedEnemyFormations = extractContactedEnemies(playerFaction, engagedFrontEdges);

    // --- Brigade movement ---
    const brigadeMovement = extractBrigadeMovement(gameState, playerFaction);

    // --- Exposed front settlements ---
    const exposedFrontSettlements = extractExposedFront(gameState, playerFaction);

    // --- Officers by faction (fog of war: player faction only) ---
    const officersByFaction = extractOfficersByFaction(gameState, playerFaction);

    return {
        playerFaction,
        turn,
        phase,
        ownForces,
        ownCasualties,
        ownTerritory,
        ownDisplacement,
        ownExhaustion,
        ownSupply,
        ownAuthority,
        ownCorpsOps,
        ownDiplomacy,
        contactedEnemyFormations,
        engagedFrontEdges,
        brigadeMovement,
        exposedFrontSettlements,
        officersByFaction: Object.keys(officersByFaction).length > 0 ? officersByFaction : undefined,
    };
}

// ---------------------------------------------------------------------------
// Sub-extractors
// ---------------------------------------------------------------------------

function extractOwnForces(state: GameState, pf: FactionId): OwnForcesSnapshot {
    const formations = state.military.formations ?? {};
    const movementState = state.military.brigade_movement_state ?? {};

    const details: FormationDetail[] = [];
    let totalPersonnel = 0;
    let activeBrigades = 0;
    let totalBrigades = 0;
    let corpsCount = 0;
    let cohesionSum = 0;
    let cohesionCount = 0;

    const sortedIds = Object.keys(formations).sort(sc);
    for (const fid of sortedIds) {
        const f = formations[fid];
        if (!f || f.faction !== pf) continue;

        const kind = f.kind ?? 'brigade';
        if (kind === 'brigade' || kind === 'operational_group') {
            totalBrigades++;
            if (f.status === 'active') {
                activeBrigades++;
                const p = f.personnel ?? 1000;
                totalPersonnel += p;
                if (f.cohesion != null) {
                    cohesionSum += f.cohesion;
                    cohesionCount++;
                }
            }
        }
        if (kind === 'corps') corpsCount++;

        const ms = movementState[fid];
        details.push({
            id: fid,
            name: kind === 'corps' || kind === 'corps_asset'
                ? getPlayerSafeCorpsName(f.name ?? null, fid)
                : getPlayerSafeBrigadeName(f.name ?? null),
            kind,
            personnel: f.personnel ?? 0,
            cohesion: f.cohesion ?? 0,
            readiness: f.readiness ?? 'active',
            posture: f.posture ?? 'defend',
            disrupted: f.disrupted ?? false,
            woundedPending: f.wounded_pending ?? 0,
            movementStatus: ms?.status ?? 'deployed',
            corpsId: f.corps_id ?? null,
        });
    }

    return {
        totalPersonnel,
        activeBrigades,
        totalBrigades,
        corpsCount,
        avgCohesion: cohesionCount > 0 ? cohesionSum / cohesionCount : 0,
        formationDetails: details,
    };
}

function extractCasualties(state: GameState, pf: FactionId): CasualtiesSnapshot {
    const ledger = state.military.casualty_ledger?.[pf];
    const formations = state.military.formations ?? {};

    let woundedPending = 0;
    for (const fid of Object.keys(formations).sort(sc)) {
        const f = formations[fid];
        if (f?.faction === pf && f.wounded_pending) {
            woundedPending += f.wounded_pending;
        }
    }

    if (!ledger) {
        return {
            killed: 0, wounded: 0, missingCaptured: 0,
            equipmentLost: { tanks: 0, artillery: 0, aa: 0 },
            woundedPendingReturn: woundedPending,
        };
    }

    return {
        killed: ledger.killed,
        wounded: ledger.wounded,
        missingCaptured: ledger.missing_captured,
        equipmentLost: {
            tanks: ledger.equipment_lost?.tanks ?? 0,
            artillery: ledger.equipment_lost?.artillery ?? 0,
            aa: ledger.equipment_lost?.aa_systems ?? 0,
        },
        woundedPendingReturn: woundedPending,
    };
}

function extractTerritory(
    state: GameState,
    pf: FactionId,
    osidAreas?: { totalArea: number; areas: Record<string, number> }
): TerritorySnapshot {
    const controllers = state.political.political_controllers ?? {};
    const keys = Object.keys(controllers);
    const total = keys.length || 1;
    let controlled = 0;
    for (const sid of keys) {
        if (controllers[sid] === pf) controlled++;
    }

    if (osidAreas) {
        let areaControlled = 0;
        for (const sid of keys) {
            if (controllers[sid] === pf) {
                areaControlled += osidAreas.areas[sid] ?? 0;
            }
        }
        return {
            settlementsControlled: controlled,
            settlementsTotal: total,
            territoryPercent: osidAreas.totalArea > 0
                ? (areaControlled / osidAreas.totalArea) * 100
                : (controlled / total) * 100,
            areaControlledKm2: areaControlled,
            areaTotalKm2: osidAreas.totalArea,
        };
    }

    return {
        settlementsControlled: controlled,
        settlementsTotal: total,
        territoryPercent: (controlled / total) * 100,
    };
}

function extractDisplacement(state: GameState, pf: FactionId): DisplacementSnapshot {
    const dispState = state.displacement.displacement_state ?? {};
    const controllers = state.political.political_controllers ?? {};
    const camps = state.displacement.displacement_camp_state ?? {};
    const timers = state.displacement.hostile_takeover_timers ?? {};
    const civCas = state.displacement.civilian_casualties;

    let totalOut = 0;
    let totalIn = 0;
    // Sum displacement for municipalities controlled by player
    for (const munId of Object.keys(dispState).sort(sc)) {
        const d = dispState[munId];
        if (!d) continue;
        totalOut += d.displaced_out;
        totalIn += d.displaced_in;
    }

    // Civilian casualties for player's associated ethnicity
    const civEntry = civCas?.[pf];

    return {
        totalDisplacedOut: totalOut,
        totalDisplacedIn: totalIn,
        civilianKilled: civEntry?.killed ?? 0,
        civilianFledAbroad: civEntry?.fled_abroad ?? 0,
        activeCamps: Object.keys(camps).length,
        activeHostileTakeoverTimers: Object.keys(timers).length,
    };
}

function extractExhaustion(state: GameState, pf: FactionId): ExhaustionSnapshot {
    const level = state.political.war_exhaustion?.[pf] ?? 0;
    const trends = state.political.loss_of_control_trends?.by_faction?.[pf];
    return {
        level,
        trend: trends?.exhaustion_trend ?? 'flat',
        increasing: trends?.exhaustion_increasing ?? false,
        collapseEligible: trends?.collapse_eligible ?? false,
    };
}

function extractSupply(state: GameState, pf: FactionId): SupplySnapshot {
    const sustState = state.displacement.sustainability_state ?? {};
    const municipalityController = deriveMunicipalityControllerByOsid(state);

    let adequate = 0;
    let strained = 0;
    let critical = 0;
    const collapsed: string[] = [];

    for (const munId of Object.keys(sustState).sort(sc)) {
        const s = sustState[munId];
        if (!s) continue;
        if (municipalityController.get(munId) !== pf) continue;
        if (s.collapsed) {
            collapsed.push(munId);
        } else if (s.sustainability_score < 30) {
            critical++;
        } else if (s.sustainability_score < 60) {
            strained++;
        } else {
            adequate++;
        }
    }

    return {
        adequateCount: adequate,
        strainedCount: strained,
        criticalCount: critical,
        collapsedMunicipalities: collapsed,
    };
}

function extractAuthority(state: GameState, pf: FactionId): AuthoritySnapshot {
    const faction = state.factions.find(f => f.id === pf);
    const profile = faction?.profile ?? { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 };
    return {
        authority: profile.authority,
        legitimacy: profile.legitimacy,
    };
}

function extractCorpsOps(state: GameState, pf: FactionId): CorpsOperationSnapshot[] {
    const corpsCmd = state.military.corps_command ?? {};
    const formations = state.military.formations ?? {};
    const results: CorpsOperationSnapshot[] = [];

    for (const corpsId of Object.keys(corpsCmd).sort(sc)) {
        const corps = corpsCmd[corpsId];
        if (!corps) continue;
        const f = formations[corpsId];
        if (!f || f.faction !== pf) continue;

        results.push({
            corpsId,
            corpsName: getPlayerSafeCorpsName(f.name ?? null, corpsId),
            stance: corps.stance,
            operation: corps.active_operations?.[0]
                ? {
                    type: String(corps.active_operations[0].type ?? ''),
                    phase: String(corps.active_operations[0].phase ?? ''),
                    started_turn: Number(corps.active_operations[0].started_turn ?? 0),
                }
                : null,
        });
    }
    return results;
}

function extractDiplomacy(state: GameState, pf: FactionId): FactionDiplomacySnapshot {
    const faction = state.factions.find(f => f.id === pf);

    // Patron state (Tier 1 — own faction)
    const ps = faction?.patron_state;
    const patronState: RSPatronSnapshot | null = ps ? {
        patronCommitment: ps.patron_commitment,
        materialSupport: ps.material_support_level,
        diplomaticIsolation: ps.diplomatic_isolation,
    } : null;

    // RBiH-HRHB state (Tier 1 for both RBiH and HRHB)
    const rhs = state.political.rbih_hrhb_state;
    const alliance = state.political.war_alliance_rbih_hrhb;
    const rbihHrhbState: RBiHDiplomacySnapshot | null =
        (pf === 'RBiH' || pf === 'HRHB') && rhs != null ? {
            allianceValue: alliance ?? 0,
            bilateralFlipsThisTurn: rhs.bilateral_flips_this_turn,
            stalemateTurns: rhs.stalemate_turns,
            totalBilateralFlips: rhs.total_bilateral_flips,
            alliedMixedMunicipalities: [...rhs.allied_mixed_municipalities].sort(sc),
            ceasefireActive: rhs.ceasefire_active,
            ceasefireSinceTurn: rhs.ceasefire_since_turn,
            washingtonSigned: rhs.washington_signed,
            washingtonTurn: rhs.washington_turn,
            warStartedTurn: rhs.war_started_turn,
        } : null;

    // Embargo profile (Tier 1 — own faction)
    const ep = faction?.embargo_profile;
    const embargoProfile: EmbargoSnapshot | null = ep ? {
        heavyEquipmentAccess: ep.heavy_equipment_access,
        ammunitionResupplyRate: ep.ammunition_resupply_rate,
        maintenanceCapacity: ep.maintenance_capacity,
        smugglingEfficiency: ep.smuggling_efficiency,
        externalPipelineStatus: ep.external_pipeline_status,
    } : null;

    // Constraint severity (HRHB patron-specific)
    const constraintSeverity = pf === 'HRHB' ? (ps?.constraint_severity ?? null) : null;

    // Negotiation momentum (own faction's negotiation pressure)
    const ivp = state.political.international_visibility_pressure;
    const negotiationMomentum = ivp?.negotiation_momentum ?? 0;

    return {
        patronState,
        rbihHrhbState,
        embargoProfile,
        constraintSeverity,
        negotiationMomentum,
    };
}

function extractContactedEnemies(pf: FactionId, engagedFrontEdges: FrontEdgeSnapshot[]): ContactedFormation[] {
    const results: ContactedFormation[] = [];
    const seenEnemySettlements = new Set<string>();

    for (const edge of engagedFrontEdges) {
        const contactSettlement = edge.sideA === pf ? edge.settlementB : edge.settlementA;
        if (!contactSettlement || seenEnemySettlements.has(contactSettlement)) continue;
        seenEnemySettlements.add(contactSettlement);
        results.push({
            label: 'Enemy contact',
            strengthCategory: edge.tier === 'exposed' ? 'strong' : edge.tier === 'defended' ? 'moderate' : 'light',
            contactSettlement,
            detectedTurn: 0,
        });
    }
    results.sort((a, b) => sc(a.contactSettlement ?? '', b.contactSettlement ?? '') || sc(a.label, b.label));
    return results;
}

function extractFrontEdges(state: GameState, pf: FactionId): FrontEdgeSnapshot[] {
    const phase = state.meta?.phase as string | undefined;
    const useOsid = phase === 'war' && (state.military.war_front_edges_osid?.length ?? 0) > 0;
    const edges: FrontEdgeState[] = useOsid ? (state.military.war_front_edges_osid ?? []) : (state.military.front_edges ?? []);
    const pressure: Record<string, FrontPressureState> = state.military.front_pressure ?? {};
    const segments: Record<string, { friction: number }> = state.military.front_segments ?? {};
    const garrison = state.military.militia_garrison ?? {};
    const formations = state.military.formations ?? {};
    const osidToBrigade = new Set<string>();
    for (const fid of Object.keys(formations).sort(sc)) {
        const loc = (formations[fid] as { location_osid?: string }).location_osid;
        if (typeof loc === 'string' && loc) osidToBrigade.add(loc);
    }

    const results: FrontEdgeSnapshot[] = [];

    for (const edge of edges) {
        if (edge.side_a !== pf && edge.side_b !== pf) continue;

        const playerSide = edge.side_a === pf ? 'a' : 'b';
        const playerNode = playerSide === 'a' ? edge.a : edge.b;

        const hasBrigade = osidToBrigade.has(playerNode);
        const hasGarrison = (garrison[playerNode] ?? 0) > 0;
        const tier: 'defended' | 'garrisoned' | 'exposed' =
            hasBrigade ? 'defended' : hasGarrison ? 'garrisoned' : 'exposed';

        const p = pressure[edge.edge_id];
        const seg = segments[edge.edge_id];

        results.push({
            edgeId: edge.edge_id,
            settlementA: edge.a,
            settlementB: edge.b,
            sideA: edge.side_a,
            sideB: edge.side_b,
            pressure: p?.value ?? 0,
            friction: seg?.friction ?? 0,
            tier,
        });
    }

    results.sort((a, b) => Math.abs(b.pressure) - Math.abs(a.pressure) || sc(a.edgeId, b.edgeId));
    return results;
}

function extractBrigadeMovement(state: GameState, pf: FactionId): BrigadeMovementSnapshot {
    const movementState: Record<string, BrigadeMovementState> = state.military.brigade_movement_state ?? {};
    const formations = state.military.formations ?? {};
    const encircled = state.military.brigade_encircled ?? {};

    const packing: FormationId[] = [];
    const inTransit: FormationId[] = [];
    const unpacking: FormationId[] = [];
    const encircledList: FormationId[] = [];

    for (const fid of Object.keys(movementState).sort(sc)) {
        const f = formations[fid];
        if (!f || f.faction !== pf) continue;
        const ms = movementState[fid];
        if (!ms) continue;
        switch (ms.status) {
            case 'packing': packing.push(fid); break;
            case 'in_transit': inTransit.push(fid); break;
            case 'unpacking': unpacking.push(fid); break;
        }
    }

    for (const fid of Object.keys(encircled).sort(sc)) {
        const f = formations[fid];
        if (f?.faction === pf && encircled[fid]) {
            encircledList.push(fid);
        }
    }

    return { packing, inTransit, unpacking, encircled: encircledList };
}

function extractOfficersByFaction(
    state: GameState,
    playerFaction: FactionId
): Partial<Record<FactionId, OfficerListEntry[]>> {
    const data = state.military.named_officer_data ?? [];
    const officers = state.military.named_officers ?? {};
    const list: OfficerListEntry[] = [];
    for (const d of data) {
        const id = typeof (d as { id?: string }).id === 'string' ? (d as { id: string }).id : '';
        if (!id || (d as { faction?: string }).faction !== playerFaction) continue;
        const os = officers[id] as { status?: string; assigned_corps_id?: string | null; acting_commander?: boolean } | undefined;
        list.push({
            id,
            name: getPlayerSafeOfficerName(typeof (d as { name?: string }).name === 'string' ? (d as { name: string }).name : null),
            rank: typeof (d as { rank?: string }).rank === 'string' ? (d as { rank: string }).rank : 'corps_commander',
            status: typeof os?.status === 'string' ? os.status : 'active',
            assigned_corps_id: typeof os?.assigned_corps_id === 'string' ? os.assigned_corps_id : null,
            acting_commander: Boolean(os?.acting_commander),
            competence: typeof (d as { competence?: number }).competence === 'number' ? (d as { competence: number }).competence : 3,
        });
    }
    list.sort((a, b) => sc(a.id, b.id));
    return list.length > 0 ? { [playerFaction]: list } : {};
}

function extractExposedFront(state: GameState, pf: FactionId): SettlementId[] {
    const phase = state.meta?.phase as string | undefined;
    const useOsid = phase === 'war' && (state.military.war_front_edges_osid?.length ?? 0) > 0;
    const edges: FrontEdgeState[] = useOsid ? (state.military.war_front_edges_osid ?? []) : (state.military.front_edges ?? []);
    const formations = state.military.formations ?? {};
    const osidToBrigade = new Set<string>();
    for (const fid of Object.keys(formations).sort(sc)) {
        const loc = (formations[fid] as { location_osid?: string }).location_osid;
        if (typeof loc === 'string' && loc) osidToBrigade.add(loc);
    }
    const garrison = state.military.militia_garrison ?? {};

    const frontSettlements = new Set<SettlementId>();
    for (const edge of edges) {
        if (edge.side_a === pf) frontSettlements.add(edge.a);
        if (edge.side_b === pf) frontSettlements.add(edge.b);
    }

    const exposed: SettlementId[] = [];
    for (const nodeId of Array.from(frontSettlements).sort(sc)) {
        const hasBrigade = osidToBrigade.has(nodeId);
        const hasGarrison = (garrison[nodeId] ?? 0) > 0;
        if (!hasBrigade && !hasGarrison) exposed.push(nodeId);
    }
    return exposed;
}
