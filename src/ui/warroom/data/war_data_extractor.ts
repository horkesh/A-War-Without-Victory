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
    CorpsOperation,
    DetectedBrigadeInfo,
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
import { getLegacyAoR } from '../../../state/game_state.js';
import { getEnemyFactions, personnelToStrengthCategory } from './fog_of_war.js';

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
    territoryPercent: number;
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
    operation: CorpsOperation | null;
}

export interface ContactedFormation {
    formationId: string;
    name: string;
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
}

// ---------------------------------------------------------------------------
// Helper: deterministic sort
// ---------------------------------------------------------------------------

function sc(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export function extractWarData(gameState: GameState, playerFaction: FactionId): WarDataSnapshot {
    const turn = gameState.meta.turn;
    const phase = gameState.meta.phase ?? 'peace';

    // --- Own forces ---
    const ownForces = extractOwnForces(gameState, playerFaction);

    // --- Casualties ---
    const ownCasualties = extractCasualties(gameState, playerFaction);

    // --- Territory ---
    const ownTerritory = extractTerritory(gameState, playerFaction);

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

    // --- Contacted enemy formations (Tier 2) ---
    const contactedEnemyFormations = extractContactedEnemies(gameState, playerFaction);

    // --- Front edges (Tier 2) ---
    const engagedFrontEdges = extractFrontEdges(gameState, playerFaction);

    // --- Brigade movement ---
    const brigadeMovement = extractBrigadeMovement(gameState, playerFaction);

    // --- Exposed front settlements ---
    const exposedFrontSettlements = extractExposedFront(gameState, playerFaction);

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
    };
}

// ---------------------------------------------------------------------------
// Sub-extractors
// ---------------------------------------------------------------------------

function extractOwnForces(state: GameState, pf: FactionId): OwnForcesSnapshot {
    const formations = state.formations ?? {};
    const movementState = state.brigade_movement_state ?? {};

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
            name: f.name ?? fid,
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
    const ledger = state.casualty_ledger?.[pf];
    const formations = state.formations ?? {};

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

function extractTerritory(state: GameState, pf: FactionId): TerritorySnapshot {
    const controllers = state.political_controllers ?? {};
    const keys = Object.keys(controllers);
    const total = keys.length || 1;
    let controlled = 0;
    for (const sid of keys) {
        if (controllers[sid] === pf) controlled++;
    }
    return {
        settlementsControlled: controlled,
        settlementsTotal: total,
        territoryPercent: (controlled / total) * 100,
    };
}

function extractDisplacement(state: GameState, pf: FactionId): DisplacementSnapshot {
    const dispState = state.displacement_state ?? {};
    const controllers = state.political_controllers ?? {};
    const camps = state.displacement_camp_state ?? {};
    const timers = state.hostile_takeover_timers ?? {};
    const civCas = state.civilian_casualties;

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
    const level = state.war_exhaustion?.[pf] ?? 0;
    const trends = state.loss_of_control_trends?.by_faction?.[pf];
    return {
        level,
        trend: trends?.exhaustion_trend ?? 'flat',
    };
}

function extractSupply(state: GameState, pf: FactionId): SupplySnapshot {
    const sustState = state.sustainability_state ?? {};
    const controllers = state.political_controllers ?? {};

    let adequate = 0;
    let strained = 0;
    let critical = 0;
    const collapsed: string[] = [];

    // Map settlements to municipalities for controller check
    // Sustainability is per-municipality, so check if any settlement in that municipality is controlled by player
    for (const munId of Object.keys(sustState).sort(sc)) {
        const s = sustState[munId];
        if (!s) continue;

        // Check if this municipality is relevant to player (simplified: check if any settlement in it is player-controlled)
        // For now, include all municipalities in the supply overview
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
    const corpsCmd = state.corps_command ?? {};
    const formations = state.formations ?? {};
    const results: CorpsOperationSnapshot[] = [];

    for (const corpsId of Object.keys(corpsCmd).sort(sc)) {
        const corps = corpsCmd[corpsId];
        if (!corps) continue;
        const f = formations[corpsId];
        if (!f || f.faction !== pf) continue;

        results.push({
            corpsId,
            corpsName: f.name ?? corpsId,
            stance: corps.stance,
            operation: corps.active_operation ?? null,
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
    const rhs = state.rbih_hrhb_state;
    const alliance = state.war_alliance_rbih_hrhb;
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
    const ivp = state.international_visibility_pressure;
    const negotiationMomentum = ivp?.negotiation_momentum ?? 0;

    return {
        patronState,
        rbihHrhbState,
        embargoProfile,
        constraintSeverity,
        negotiationMomentum,
    };
}

function extractContactedEnemies(state: GameState, pf: FactionId): ContactedFormation[] {
    const allFactionIds = state.factions.map(f => f.id);
    const enemies = getEnemyFactions(pf, allFactionIds);
    const results: ContactedFormation[] = [];

    // Method 1: Recon intelligence (Tier 2 — detected via battle/probe/recon)
    const recon = state.recon_intelligence?.[pf];
    if (recon?.detected_brigades) {
        for (const sid of Object.keys(recon.detected_brigades).sort(sc)) {
            const info: DetectedBrigadeInfo = recon.detected_brigades[sid];
            if (!info) continue;
            results.push({
                formationId: info.formation_id ?? 'unknown',
                name: info.formation_id ? (state.formations[info.formation_id]?.name ?? info.formation_id) : 'Unknown formation',
                strengthCategory: info.strength_category,
                contactSettlement: sid,
                detectedTurn: info.detected_turn,
            });
        }
    }

    // Method 2: Casualty ledger per-formation keys (enemy formations that took casualties = contacted)
    // Only add formations not already in recon results
    const existingIds = new Set(results.map(r => r.formationId));
    for (const enemyFaction of enemies) {
        const enemyLedger = state.casualty_ledger?.[enemyFaction];
        if (!enemyLedger?.per_formation) continue;
        for (const fmtId of Object.keys(enemyLedger.per_formation).sort(sc)) {
            if (existingIds.has(fmtId)) continue;
            const f = state.formations[fmtId];
            if (!f) continue;
            results.push({
                formationId: fmtId,
                name: f.name ?? fmtId,
                strengthCategory: personnelToStrengthCategory(f.personnel ?? 1000),
                contactSettlement: null,
                detectedTurn: 0,
            });
            existingIds.add(fmtId);
        }
    }

    // Sort by settlement, then by formation ID
    results.sort((a, b) => sc(a.contactSettlement ?? '', b.contactSettlement ?? '') || sc(a.formationId, b.formationId));
    return results;
}

function extractFrontEdges(state: GameState, pf: FactionId): FrontEdgeSnapshot[] {
    const phase = state.meta?.phase as string | undefined;
    const useOsid = phase === 'war' && (state.war_front_edges_osid?.length ?? 0) > 0;
    const edges: FrontEdgeState[] = useOsid ? (state.war_front_edges_osid ?? []) : (state.front_edges ?? []);
    const pressure: Record<string, FrontPressureState> = state.front_pressure ?? {};
    const segments: Record<string, { friction: number }> = state.front_segments ?? {};
    const garrison = state.militia_garrison ?? {};
    const formations = state.formations ?? {};
    const osidToBrigade = new Set<string>();
    if (useOsid) {
        for (const fid of Object.keys(formations).sort(sc)) {
            const loc = (formations[fid] as { location_osid?: string }).location_osid;
            if (typeof loc === 'string' && loc) osidToBrigade.add(loc);
        }
    }
    const brigadeAor = useOsid ? undefined : getLegacyAoR(state).brigade_aor ?? {};

    const results: FrontEdgeSnapshot[] = [];

    for (const edge of edges) {
        if (edge.side_a !== pf && edge.side_b !== pf) continue;

        const playerSide = edge.side_a === pf ? 'a' : 'b';
        const playerNode = playerSide === 'a' ? edge.a : edge.b;

        const hasBrigade = useOsid ? osidToBrigade.has(playerNode) : (brigadeAor as Record<string, string | null>)[playerNode] != null;
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
    const movementState: Record<string, BrigadeMovementState> = state.brigade_movement_state ?? {};
    const formations = state.formations ?? {};
    const encircled = state.brigade_encircled ?? {};

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

function extractExposedFront(state: GameState, pf: FactionId): SettlementId[] {
    const phase = state.meta?.phase as string | undefined;
    const useOsid = phase === 'war' && (state.war_front_edges_osid?.length ?? 0) > 0;
    const edges: FrontEdgeState[] = useOsid ? (state.war_front_edges_osid ?? []) : (state.front_edges ?? []);
    const formations = state.formations ?? {};
    const osidToBrigade = new Set<string>();
    if (useOsid) {
        for (const fid of Object.keys(formations).sort(sc)) {
            const loc = (formations[fid] as { location_osid?: string }).location_osid;
            if (typeof loc === 'string' && loc) osidToBrigade.add(loc);
        }
    }
    const brigadeAor = useOsid ? undefined : getLegacyAoR(state).brigade_aor ?? {};
    const garrison = state.militia_garrison ?? {};

    const frontSettlements = new Set<SettlementId>();
    for (const edge of edges) {
        if (edge.side_a === pf) frontSettlements.add(edge.a);
        if (edge.side_b === pf) frontSettlements.add(edge.b);
    }

    const exposed: SettlementId[] = [];
    for (const nodeId of Array.from(frontSettlements).sort(sc)) {
        const hasBrigade = useOsid ? osidToBrigade.has(nodeId) : (brigadeAor as Record<string, string | null>)[nodeId] != null;
        const hasGarrison = (garrison[nodeId] ?? 0) > 0;
        if (!hasBrigade && !hasGarrison) exposed.push(nodeId);
    }
    return exposed;
}
