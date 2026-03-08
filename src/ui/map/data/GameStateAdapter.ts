/**
 * Adapter for loading and extracting data from a saved GameState (final_save.json).
 * Converts the rich GameState structure into the flat LoadedGameState view
 * needed by the map application.
 *
 * Migrated from legacy ui_legacy/data/GameStateAdapter.ts — import paths updated.
 */

import type {
    AoROrderView, AttackOrderView, CommandBriefingItemView, CommandBriefingSeverity, CommandBriefingView,
    CorpsFrontSectorView, EnclaveResilienceView, FogOfWarView, FormationView, LoadedGameState,
    MilitiaPoolView, MobilizationSummaryView, MovementOrderSettlementView, NamedOfficerStateView, NamedOfficerView,
    OperationView, RepositionOrderView, RecruitmentView,
} from './types';
import { buildControlLookup, buildStatusLookup } from './ControlLookup.js';
import { getMunicipalitySupportLabel } from '../../../sim/combat/municipality_support.js';
import { strictCompare } from '../../../state/validateGameState.js';

function pointsByFaction(rec: Record<string, { points?: number }>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const fid of Object.keys(rec).sort()) {
        const v = rec[fid];
        out[fid] = typeof v?.points === 'number' && Number.isFinite(v.points) ? v.points : 0;
    }
    return out;
}

function finiteNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function humanizeMunicipalitySlug(slug: string): string {
    return slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function operationKeyFromView(operation: OperationView): string {
    return `${operation.corps_id}|${operation.name}`;
}

function compareCommandSeverity(a: CommandBriefingSeverity, b: CommandBriefingSeverity): number {
    const rank: Record<CommandBriefingSeverity, number> = {
        critical: 0,
        warning: 1,
        info: 2,
    };
    return rank[a] - rank[b];
}

function compareCommandItems(a: CommandBriefingItemView, b: CommandBriefingItemView): number {
    const kindOrder: Record<CommandBriefingItemView['kind'], number> = {
        convoy: 0,
        enclave: 1,
        operation: 2,
        ivp: 3,
        sector: 4,
        opsec: 5,
        support: 6,
    };
    return compareCommandSeverity(a.severity, b.severity)
        || kindOrder[a.kind] - kindOrder[b.kind]
        || a.id.localeCompare(b.id);
}

function buildCommandHeadline(criticalCount: number, pendingCount: number): string {
    if (criticalCount > 0) {
        return criticalCount === 1
            ? '1 critical command matter requires attention'
            : `${criticalCount} critical command matters require attention`;
    }
    if (pendingCount > 0) {
        return pendingCount === 1
            ? '1 command update available'
            : `${pendingCount} command updates available`;
    }
    return 'Command situation stable';
}

function getAirdropAllocationValue(state: Record<string, unknown>, enclaveId: string): number {
    return finiteNumber((state.airdrop_allocation as Record<string, number> | undefined)?.[enclaveId]);
}

const ENCLAVE_UI_DEFINITIONS: Array<{
    id: string;
    display_name: string;
    faction: 'RBiH';
    osid_prefixes: string[];
}> = [
    { id: 'bihac_pocket', display_name: 'Bihac Pocket', faction: 'RBiH', osid_prefixes: ['op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:'] },
    { id: 'gorazde', display_name: 'Gorazde', faction: 'RBiH', osid_prefixes: ['op:gorazde:'] },
    { id: 'sarajevo', display_name: 'Sarajevo', faction: 'RBiH', osid_prefixes: ['op:centar_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad_sarajevo:', 'op:novi_grad_sarajevo:'] },
    { id: 'srebrenica', display_name: 'Srebrenica', faction: 'RBiH', osid_prefixes: ['op:srebrenica:'] },
    { id: 'zepa', display_name: 'Zepa', faction: 'RBiH', osid_prefixes: ['op:rogatica:zepa'] },
];

function deriveEnclaveSupplyState(
    enclaveId: string,
    rawSupplyStateByOsid: Record<string, unknown> | undefined,
    fallbackIsolationTurns: number,
    fallbackHardening: boolean,
    fallbackResilience: number,
): 'adequate' | 'strained' | 'critical' {
    const enclave = ENCLAVE_UI_DEFINITIONS.find((entry) => entry.id === enclaveId);
    const factions = Array.isArray(rawSupplyStateByOsid?.factions) ? rawSupplyStateByOsid.factions as Array<Record<string, unknown>> : [];
    const factionEntry = enclave ? factions.find((entry) => entry.faction_id === enclave.faction) : undefined;
    const byOsid = Array.isArray(factionEntry?.by_osid) ? factionEntry.by_osid as Array<Record<string, unknown>> : [];
    let adequate = 0;
    let strained = 0;
    let critical = 0;
    if (enclave) {
        for (const entry of byOsid) {
            const osid = typeof entry.osid === 'string' ? entry.osid : '';
            if (!enclave.osid_prefixes.some((prefix) => osid.startsWith(prefix))) continue;
            if (entry.state === 'critical') critical++;
            else if (entry.state === 'strained') strained++;
            else if (entry.state === 'adequate') adequate++;
        }
    }
    if (critical + strained + adequate > 0) {
        if (critical >= strained && critical >= adequate) return 'critical';
        if (strained >= critical && strained >= adequate) return 'strained';
        return 'adequate';
    }
    if (fallbackIsolationTurns <= 0) return 'adequate';
    if (fallbackHardening || fallbackResilience >= 8) return 'critical';
    return 'strained';
}

function buildCommandBriefing(params: {
    playerFaction: string | null;
    turn: number;
    pendingConvoyDecisions?: LoadedGameState['pendingConvoyDecisions'];
    enclaveResilience?: LoadedGameState['enclaveResilience'];
    operations: OperationView[];
    corpsFrontSectors?: LoadedGameState['corpsFrontSectors'];
    internationalVisibilityPressure?: LoadedGameState['internationalVisibilityPressure'];
    ivpConsequencesActive?: LoadedGameState['ivpConsequencesActive'];
    municipalitySupportOrders?: LoadedGameState['municipalitySupportOrders'];
}): CommandBriefingView | undefined {
    const {
        playerFaction,
        turn,
        pendingConvoyDecisions,
        enclaveResilience,
        operations,
        corpsFrontSectors,
        internationalVisibilityPressure,
        ivpConsequencesActive,
        municipalitySupportOrders,
    } = params;

    if (playerFaction !== 'RS' && playerFaction !== 'RBiH' && playerFaction !== 'HRHB') {
        return undefined;
    }

    const items: CommandBriefingItemView[] = [];

    if (pendingConvoyDecisions && pendingConvoyDecisions.length > 0) {
        const firstConvoy = [...pendingConvoyDecisions].sort((a, b) => a.id.localeCompare(b.id))[0];
        items.push({
            id: `convoy:${firstConvoy.id}`,
            kind: 'convoy',
            severity: 'critical',
            title: pendingConvoyDecisions.length === 1 ? 'Convoy decision pending' : `${pendingConvoyDecisions.length} convoy decisions pending`,
            detail: `${humanizeMunicipalitySlug(firstConvoy.target_enclave.replace(/_/g, '-'))} requires corridor authorization.`,
            actionLabel: 'Review convoys',
            target: { type: 'summary', summaryFocus: 'convoys', enclaveId: firstConvoy.target_enclave },
        });
    }

    const playerEnclaves = Object.entries(enclaveResilience ?? {})
        .filter(([, enclave]) => enclave.faction === playerFaction)
        .sort((a, b) => (a[1].display_name ?? a[0]).localeCompare(b[1].display_name ?? b[0]));
    const highestRiskEnclave = playerEnclaves
        .filter(([, enclave]) => enclave.supply_state === 'critical' || enclave.resilience <= 8 || enclave.isolation_turns >= 4)
        .sort((a, b) => {
            const aScore = (a[1].supply_state === 'critical' ? 100 : 0) + (a[1].isolation_turns * 2) + (30 - a[1].resilience);
            const bScore = (b[1].supply_state === 'critical' ? 100 : 0) + (b[1].isolation_turns * 2) + (30 - b[1].resilience);
            return bScore - aScore || (a[1].display_name ?? a[0]).localeCompare(b[1].display_name ?? b[0]);
        })[0];
    if (highestRiskEnclave) {
        const [enclaveId, enclave] = highestRiskEnclave;
        items.push({
            id: `enclave:${enclaveId}`,
            kind: 'enclave',
            severity: enclave.supply_state === 'critical' || enclave.resilience <= 8 ? 'critical' : 'warning',
            title: `${enclave.display_name ?? humanizeMunicipalitySlug(enclaveId.replace(/_/g, '-'))} under severe strain`,
            detail: `${enclave.isolation_turns} isolated turn(s), resilience ${enclave.resilience.toFixed(1)}.`,
            actionLabel: 'Open enclaves',
            target: { type: 'enclaves', enclaveId },
        });
    }

    const playerOperations = operations
        .filter((operation) => operation.faction === playerFaction)
        .sort((a, b) => operationKeyFromView(a).localeCompare(operationKeyFromView(b)));
    const mostFragileOperation = playerOperations
        .filter((operation) => (
            (operation.supply_readiness ?? 1) < 0.5
            || (operation.avg_cohesion ?? 100) < 65
            || (operation.failure_count ?? 0) >= 2
            || (operation.consecutive_failures_on_current ?? 0) >= 2
        ))
        .sort((a, b) => {
            const aScore = ((a.supply_readiness ?? 1) < 0.4 ? 100 : 0) + ((a.failure_count ?? 0) * 10) + ((a.consecutive_failures_on_current ?? 0) * 5);
            const bScore = ((b.supply_readiness ?? 1) < 0.4 ? 100 : 0) + ((b.failure_count ?? 0) * 10) + ((b.consecutive_failures_on_current ?? 0) * 5);
            return bScore - aScore || operationKeyFromView(a).localeCompare(operationKeyFromView(b));
        })[0];
    if (mostFragileOperation) {
        items.push({
            id: `operation:${operationKeyFromView(mostFragileOperation)}`,
            kind: 'operation',
            severity: (mostFragileOperation.supply_readiness ?? 1) < 0.4 || (mostFragileOperation.failure_count ?? 0) >= 2 ? 'critical' : 'warning',
            title: `${mostFragileOperation.name} losing momentum`,
            detail: `Supply ${Math.round((mostFragileOperation.supply_readiness ?? 0) * 100)}%, failures ${mostFragileOperation.failure_count ?? 0}.`,
            actionLabel: 'Open operation',
            target: { type: 'operation', operationKey: operationKeyFromView(mostFragileOperation) },
        });
    }

    const compositeIvp = internationalVisibilityPressure?.composite_ivp ?? 0;
    if (compositeIvp >= 0.6 || (ivpConsequencesActive?.length ?? 0) > 0) {
        items.push({
            id: 'ivp:composite',
            kind: 'ivp',
            severity: 'warning',
            title: `International pressure at ${Math.round(compositeIvp * 100)}%`,
            detail: (ivpConsequencesActive?.length ?? 0) > 0
                ? `Consequences active: ${ivpConsequencesActive?.join(', ')}.`
                : [
                    internationalVisibilityPressure?.sarajevo_siege_visibility ? `Sarajevo ${Math.round(internationalVisibilityPressure.sarajevo_siege_visibility * 100)}%` : null,
                    internationalVisibilityPressure?.enclave_humanitarian_pressure ? `Enclaves ${Math.round(internationalVisibilityPressure.enclave_humanitarian_pressure * 100)}%` : null,
                    internationalVisibilityPressure?.atrocity_visibility ? `Atrocities ${Math.round(internationalVisibilityPressure.atrocity_visibility * 100)}%` : null,
                ].filter((value): value is string => value != null).join(', ') || 'Pressure is elevated across the current war posture.',
            actionLabel: 'Review IVP',
            target: { type: 'summary', summaryFocus: 'ivp' },
        });
    }

    const mostThreatenedSector = [...(corpsFrontSectors ?? [])]
        .filter((sector) => sector.faction === playerFaction)
        .filter((sector) => sector.offensive_signs || sector.threat_ratio >= 1.2 || sector.intel_confidence < 0.5)
        .sort((a, b) => {
            const aScore = (a.offensive_signs ? 100 : 0) + (a.threat_ratio * 10) + ((1 - a.intel_confidence) * 10);
            const bScore = (b.offensive_signs ? 100 : 0) + (b.threat_ratio * 10) + ((1 - b.intel_confidence) * 10);
            return bScore - aScore || a.sector_id.localeCompare(b.sector_id);
        })[0];
    if (mostThreatenedSector) {
        items.push({
            id: `sector:${mostThreatenedSector.sector_id}`,
            kind: 'sector',
            severity: 'warning',
            title: `${mostThreatenedSector.display_name} needs attention`,
            detail: `Threat ${mostThreatenedSector.threat_ratio.toFixed(2)}, intel ${(mostThreatenedSector.intel_confidence * 100).toFixed(0)}%.`,
            actionLabel: 'Open sector',
            target: { type: 'sector', sectorId: mostThreatenedSector.sector_id },
        });
    }

    const activeOpsecSector = [...(corpsFrontSectors ?? [])]
        .filter((sector) => sector.faction === playerFaction && sector.opsec_active)
        .sort((a, b) => {
            const aScore = (a.offensive_signs ? 100 : 0) + (a.threat_ratio * 10);
            const bScore = (b.offensive_signs ? 100 : 0) + (b.threat_ratio * 10);
            return bScore - aScore || a.sector_id.localeCompare(b.sector_id);
        })[0];
    if (activeOpsecSector) {
        items.push({
            id: `opsec:${activeOpsecSector.sector_id}`,
            kind: 'opsec',
            severity: activeOpsecSector.offensive_signs || activeOpsecSector.threat_ratio >= 1.2 ? 'warning' : 'info',
            title: `${activeOpsecSector.display_name} running under OPSEC`,
            detail: `Masking active while threat sits at ${activeOpsecSector.threat_ratio.toFixed(2)} and intel reads ${(activeOpsecSector.intel_confidence * 100).toFixed(0)}%.`,
            actionLabel: 'Review OPSEC',
            target: { type: 'summary', summaryFocus: 'opsec', sectorId: activeOpsecSector.sector_id },
        });
    }

    const activeSupportOrder = municipalitySupportOrders?.[playerFaction];
    if (activeSupportOrder && activeSupportOrder.staged_turn === turn) {
        items.push({
            id: `support:${playerFaction}`,
            kind: 'support',
            severity: 'info',
            title: `${activeSupportOrder.label} staged`,
            detail: `${humanizeMunicipalitySlug(activeSupportOrder.mun_id.replace(/_/g, '-'))} is the current municipality support focus.`,
            actionLabel: 'Review support',
            target: { type: 'summary', summaryFocus: 'support' },
        });
    }

    const sortedItems = items.sort(compareCommandItems);
    if (sortedItems.length === 0) return undefined;
    const criticalCount = sortedItems.filter((item) => item.severity === 'critical').length;
    return {
        headline: buildCommandHeadline(criticalCount, sortedItems.length),
        criticalCount,
        pendingCount: sortedItems.length,
        items: sortedItems,
    };
}

/**
 * Parse a final_save.json file content into a LoadedGameState.
 * Validates required fields and extracts formations, militia pools, and control data.
 * Accepts raw GameState or a single-level wrapper (e.g. { state: GameState }) for IPC/legacy.
 */
export function parseGameState(json: unknown): LoadedGameState {
    // Normalize: unwrap common wrappers so we always work with the flat GameState object.
    let state = json as Record<string, unknown>;
    if (state != null && typeof state === 'object' && !Array.isArray(state)) {
        const keys = Object.keys(state);
        if (keys.length === 1 && (keys[0] === 'state' || keys[0] === 'gameState')) {
            const inner = state[keys[0]];
            if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
                state = inner as Record<string, unknown>;
            }
        }
    }

    const meta = state.meta as Record<string, unknown> | undefined;
    if (!meta || typeof meta !== 'object') {
        throw new Error('Invalid game state: missing meta. Ensure the file is a final_save.json from the scenario runner.');
    }
    const turnVal = meta.turn;
    if (typeof turnVal !== 'number' || !Number.isFinite(turnVal)) {
        throw new Error('Invalid game state: meta.turn must be a number. Ensure the file is a final_save.json from the scenario runner.');
    }

    const turn = turnVal;
    const phase = typeof meta.phase === 'string' ? meta.phase : 'unknown';
    const metadataDate = typeof meta.date === 'string' && meta.date.length > 0 ? meta.date : 'UNKNOWN';
    const label = `Turn ${turn} (${phase})`;

    const rawMovementState = state.brigade_movement_state as Record<string, { status?: string; stance?: string }> | undefined;

    // Normalize formations to record (engine sends object; accept array for robustness).
    let formationsRecord: Record<string, Record<string, unknown>> = {};
    const rawFormationsInput = state.formations;
    if (rawFormationsInput && typeof rawFormationsInput === 'object') {
        if (Array.isArray(rawFormationsInput)) {
            for (const row of rawFormationsInput) {
                const r = row as Record<string, unknown>;
                const id = (typeof r?.id === 'string' ? r.id : '') || (typeof r?.id === 'number' ? String(r.id) : '');
                if (id) formationsRecord[id] = r;
            }
        } else {
            formationsRecord = rawFormationsInput as Record<string, Record<string, unknown>>;
        }
    }

    // War-phase: use formation location_osid. Peace/legacy: use brigade_aor. Accept phase_ii value as war for backward compat.
    const brigadeAorByFormationId: Record<string, string[]> = {};
    const isWarPhase = phase === 'war' || phase === 'phase_ii';
    if (isWarPhase) {
        if (Object.keys(formationsRecord).length > 0) {
            for (const id of Object.keys(formationsRecord).sort()) {
                const loc = (formationsRecord[id] as { location_osid?: string }).location_osid;
                if (typeof loc === 'string' && loc) {
                    brigadeAorByFormationId[id] = [loc];
                }
            }
        }
    } else {
        const rawBrigadeAor = state.brigade_aor as Record<string, string | null> | undefined;
        if (rawBrigadeAor) {
            const sidKeys = Object.keys(rawBrigadeAor).sort();
            for (const sid of sidKeys) {
                const formationId = rawBrigadeAor[sid];
                if (formationId) {
                    const list = brigadeAorByFormationId[formationId] ?? [];
                    list.push(sid);
                    brigadeAorByFormationId[formationId] = list;
                }
            }
            for (const fid of Object.keys(brigadeAorByFormationId)) {
                brigadeAorByFormationId[fid].sort();
            }
        }
    }

    let brigadeFrontAssignment: LoadedGameState['brigadeFrontAssignment'] | undefined;
    const rawFrontAssignment = state.brigade_front_assignment as Record<string, unknown> | undefined;
    if (rawFrontAssignment && typeof rawFrontAssignment === 'object' && !Array.isArray(rawFrontAssignment)) {
        const out: NonNullable<LoadedGameState['brigadeFrontAssignment']> = {};
        for (const formationId of Object.keys(rawFrontAssignment).sort((a, b) => a.localeCompare(b))) {
            const value = rawFrontAssignment[formationId];
            out[formationId] = typeof value === 'string' ? value : null;
        }
        if (Object.keys(out).length > 0) brigadeFrontAssignment = out;
    }

    let armyTheatreAssignment: LoadedGameState['armyTheatreAssignment'] | undefined;
    const rawArmyTheatreAssignment = state.army_theatre_assignment as Record<string, unknown> | undefined;
    if (rawArmyTheatreAssignment && typeof rawArmyTheatreAssignment === 'object' && !Array.isArray(rawArmyTheatreAssignment)) {
        const out: NonNullable<LoadedGameState['armyTheatreAssignment']> = {};
        for (const armyId of Object.keys(rawArmyTheatreAssignment).sort((a, b) => a.localeCompare(b))) {
            const theatreId = rawArmyTheatreAssignment[armyId];
            if (typeof theatreId === 'string' && theatreId.length > 0) out[armyId] = theatreId;
        }
        if (Object.keys(out).length > 0) armyTheatreAssignment = out;
    }

    let theatres: LoadedGameState['theatres'] | undefined;
    const rawTheatres = state.theatres as Record<string, Record<string, unknown>> | undefined;
    if (rawTheatres && typeof rawTheatres === 'object' && !Array.isArray(rawTheatres)) {
        const out: NonNullable<LoadedGameState['theatres']> = {};
        for (const theatreId of Object.keys(rawTheatres).sort((a, b) => a.localeCompare(b))) {
            const row = rawTheatres[theatreId] ?? {};
            const faction = typeof row.faction === 'string' ? row.faction : '';
            if (!faction) continue;
            const armyIds = Array.isArray(row.army_ids)
                ? row.army_ids.filter((id): id is string => typeof id === 'string' && id.length > 0).sort((a, b) => a.localeCompare(b))
                : undefined;
            const regionScope = Array.isArray(row.region_scope)
                ? row.region_scope.filter((id): id is string => typeof id === 'string' && id.length > 0).sort((a, b) => a.localeCompare(b))
                : undefined;
            out[theatreId] = {
                id: typeof row.id === 'string' && row.id.length > 0 ? row.id : theatreId,
                name: typeof row.name === 'string' && row.name.length > 0 ? row.name : `${faction} Theatre`,
                faction,
            };
            if (armyIds && armyIds.length > 0) out[theatreId].army_ids = armyIds;
            if (regionScope && regionScope.length > 0) out[theatreId].region_scope = regionScope;
        }
        if (Object.keys(out).length > 0) theatres = out;
    }

    // Index brigade_history so brigades can get a synthesized combatSummary.
    const brigadeHistoryRecord = state.brigade_history as Record<string, Record<string, unknown>> | undefined;

    const formations: FormationView[] = [];
    if (Object.keys(formationsRecord).length > 0) {
        const sortedIds = Object.keys(formationsRecord).sort();
        for (const id of sortedIds) {
            const f = formationsRecord[id];
            const tags = (f.tags as string[]) ?? [];

            let municipalityId: string | undefined;
            for (const tag of tags) {
                if (tag.startsWith('mun:')) {
                    municipalityId = tag.slice(4);
                    break;
                }
            }

            const ops = f.ops as Record<string, unknown> | undefined;
            const hq_sid = typeof f.hq_sid === 'string' && f.hq_sid ? f.hq_sid : undefined;
            const location_osid = typeof (f as { location_osid?: string }).location_osid === 'string' && (f as { location_osid?: string }).location_osid ? (f as { location_osid?: string }).location_osid : undefined;
            const aorSettlementIds = brigadeAorByFormationId[id];
            const personnel = typeof f.personnel === 'number' ? f.personnel : undefined;
            const posture = typeof f.posture === 'string' && f.posture ? f.posture : undefined;
            const home_defense_active = f.home_defense_active === true ? true : undefined;
            const corps_id = typeof f.corps_id === 'string' && f.corps_id ? f.corps_id : undefined;
            const movementState = rawMovementState?.[id] as { status?: string; stance?: string } | undefined;
            const movementStatus = (movementState?.status === 'packing' || movementState?.status === 'in_transit' || movementState?.status === 'unpacking')
                ? (movementState.status as 'packing' | 'in_transit' | 'unpacking')
                : 'deployed';
            const movementStance = movementStatus !== 'deployed'
                ? (movementState?.stance === 'column' ? 'column' : 'combat')
                : undefined;

            // Extract war story if present
            const warStory = f.war_story as { arc?: string; narrative?: string; notable_moments?: Array<{ turn: number; description: string }> } | undefined;
            const narrativeArc = (warStory?.arc === 'veteran' || warStory?.arc === 'bloodied' || warStory?.arc === 'shattered' || warStory?.arc === 'risen' || warStory?.arc === 'destroyed' || warStory?.arc === 'garrison')
                ? warStory.arc : undefined;

            // Extract combat summary if present (corps/army_hq); brigades get a fallback below.
            const rawCS = f.combat_summary as Record<string, unknown> | undefined;
            let combatSummary = rawCS && typeof rawCS.battles_fought === 'number' ? {
                battles_fought: finiteNumber(rawCS.battles_fought),
                victories: finiteNumber(rawCS.victories),
                defeats: finiteNumber(rawCS.defeats),
                stalemates: finiteNumber(rawCS.stalemates),
                battles_as_attacker: finiteNumber(rawCS.battles_as_attacker),
                battles_as_defender: finiteNumber(rawCS.battles_as_defender),
                total_casualties_taken: finiteNumber(rawCS.total_casualties_taken),
                total_casualties_inflicted: finiteNumber(rawCS.total_casualties_inflicted),
                total_osids_captured: finiteNumber(rawCS.total_osids_captured),
                total_osids_lost: finiteNumber(rawCS.total_osids_lost),
                win_rate: finiteNumber(rawCS.win_rate),
                casualty_exchange_ratio: finiteNumber(rawCS.casualty_exchange_ratio),
                current_personnel: finiteNumber(rawCS.current_personnel),
                peak_aggregate_personnel: finiteNumber(rawCS.peak_aggregate_personnel),
                nadir_aggregate_personnel: finiteNumber(rawCS.nadir_aggregate_personnel),
                arc_distribution: (rawCS.arc_distribution != null && typeof rawCS.arc_distribution === 'object' && !Array.isArray(rawCS.arc_distribution))
                    ? rawCS.arc_distribution as Record<string, number> : {},
                brigade_count: finiteNumber(rawCS.brigade_count),
                active_brigade_count: finiteNumber(rawCS.active_brigade_count),
                most_casualties_brigade_id: typeof rawCS.most_casualties_brigade_id === 'string' ? rawCS.most_casualties_brigade_id : null,
                most_victories_brigade_id: typeof rawCS.most_victories_brigade_id === 'string' ? rawCS.most_victories_brigade_id : null,
            } : undefined;

            const fv: FormationView = {
                id, faction: (f.faction as string) ?? '', name: (f.name as string) ?? id,
                kind: (f.kind as string) ?? 'brigade', readiness: (f.readiness as string) ?? 'active',
                cohesion: (f.cohesion as number) ?? 100, fatigue: (ops?.fatigue as number) ?? 0,
                status: (f.status as string) ?? 'active', createdTurn: (f.created_turn as number) ?? 0,
                tags, municipalityId, hq_sid, location_osid, aorSettlementIds,
                personnel, posture, home_defense_active, corps_id, movementStatus, movementStance,
                narrativeArc,
                warNarrative: typeof warStory?.narrative === 'string' ? warStory.narrative : undefined,
                notableMoments: Array.isArray(warStory?.notable_moments) ? warStory.notable_moments : undefined,
                officer_quality: typeof f.officer_quality === 'number' && Number.isFinite(f.officer_quality) ? f.officer_quality : undefined,
                combatSummary,
                morale: typeof f.morale === 'number' ? f.morale : undefined,
                entrenchment_turns: typeof f.entrenchment_turns === 'number' ? f.entrenchment_turns : undefined,
                dig_in_progress: typeof f.dig_in_progress === 'number' ? f.dig_in_progress : undefined,
                disrupted_turns: typeof f.disrupted_turns === 'number' ? f.disrupted_turns : undefined,
                equipment_decay: typeof f.equipment_decay === 'number' ? f.equipment_decay : undefined,
                honor: typeof f.honor === 'string' ? f.honor : undefined,
                composition: f.composition as FormationView['composition'] ?? undefined,
                decorations: Array.isArray(f.decorations) ? f.decorations as NonNullable<FormationView['decorations']> : undefined,
                last_repulsed_from: f.last_repulsed_from as NonNullable<FormationView['last_repulsed_from']> ?? undefined,
                last_retreat_from: f.last_retreat_from as NonNullable<FormationView['last_retreat_from']> ?? undefined,
            };

            // Brigade first battle milestone
            if ((f.kind === 'brigade' || f.kind === 'operational_group') && brigadeHistoryRecord) {
                const bh = brigadeHistoryRecord[id];
                if (bh && typeof bh === 'object') {
                    fv.firstBattleTurn = typeof bh.first_battle_turn === 'number' ? bh.first_battle_turn : null;
                    fv.firstBattleOsid = typeof bh.first_battle_osid === 'string' ? bh.first_battle_osid : null;

                    fv.brigade_history = {
                        longest_victory_streak: finiteNumber(bh.longest_victory_streak, 0),
                        turns_under_siege: finiteNumber(bh.turns_under_siege, 0),
                        total_equipment_destroyed: typeof bh.total_equipment_destroyed === 'object' ? bh.total_equipment_destroyed as any : undefined,
                        total_equipment_captured: typeof bh.total_equipment_captured === 'object' ? bh.total_equipment_captured as any : undefined,
                    };

                    const engs = bh.engagements;
                    if (Array.isArray(engs) && engs.length > 0) {
                        const last8 = (engs as Array<Record<string, unknown>>).slice(-8);
                        fv.recent_engagements = last8.map((e) => ({
                            turn: typeof e.turn === 'number' ? e.turn : 0,
                            osid: typeof e.osid === 'string' ? e.osid : '',
                            role: (e.role === 'attacker' || e.role === 'defender') ? e.role : 'defender',
                            outcome: typeof e.outcome === 'string' ? e.outcome : '',
                            casualties_taken: typeof e.casualties_taken === 'number' ? e.casualties_taken : 0,
                            territory_flipped: e.territory_flipped === true,
                        }));
                    }
                }
            }

            // Brigade fallback: synthesize combatSummary from brigade_history running tallies.
            if (!combatSummary && (f.kind === 'brigade' || f.kind === 'operational_group') && brigadeHistoryRecord) {
                const bh = brigadeHistoryRecord[id];
                if (bh && typeof bh.battles_fought === 'number' && bh.battles_fought > 0) {
                    const bf = finiteNumber(bh.battles_fought);
                    const vic = finiteNumber(bh.victories);
                    const taken = finiteNumber(bh.total_casualties_taken);
                    const inflicted = finiteNumber(bh.total_casualties_inflicted);
                    combatSummary = {
                        battles_fought: bf,
                        victories: vic,
                        defeats: finiteNumber(bh.defeats),
                        stalemates: finiteNumber(bh.stalemates),
                        battles_as_attacker: finiteNumber(bh.battles_as_attacker),
                        battles_as_defender: finiteNumber(bh.battles_as_defender),
                        total_casualties_taken: taken,
                        total_casualties_inflicted: inflicted,
                        total_osids_captured: finiteNumber(bh.total_osids_captured),
                        total_osids_lost: finiteNumber(bh.total_osids_lost),
                        win_rate: bf > 0 ? vic / bf : 0,
                        casualty_exchange_ratio: taken > 0 ? inflicted / taken : (inflicted > 0 ? inflicted : 1),
                        current_personnel: personnel ?? 0,
                        peak_aggregate_personnel: finiteNumber(bh.peak_personnel),
                        nadir_aggregate_personnel: finiteNumber(bh.nadir_personnel),
                        arc_distribution: {},
                        brigade_count: 1,
                        active_brigade_count: 1,
                        most_casualties_brigade_id: null,
                        most_victories_brigade_id: null,
                    };
                }
            }
            fv.combatSummary = combatSummary; // Assign the potentially synthesized combatSummary
            formations.push(fv);
        }
    }

    const rawCorpsCommand = state.corps_command as Record<string, Record<string, unknown>> | undefined;
    if (rawCorpsCommand) {
        for (const fv of formations) {
            if (fv.kind === 'corps' || fv.kind === 'corps_asset') {
                const cc = rawCorpsCommand[fv.id];
                if (cc) {
                    fv.corpsStance = (cc.stance as string) ?? undefined;
                    fv.corpsExhaustion = typeof cc.corps_exhaustion === 'number' ? cc.corps_exhaustion : undefined;
                    fv.corpsOgSlots = typeof cc.og_slots === 'number' ? cc.og_slots : undefined;
                    fv.corpsCommandSpan = typeof cc.command_span === 'number' ? cc.command_span : undefined;
                    const rawActiveOgs = cc.active_ogs;
                    if (Array.isArray(rawActiveOgs)) {
                        fv.corpsActiveOgIds = [...(rawActiveOgs as string[])].sort();
                    }
                }
                fv.subordinateIds = formations
                    .filter((sub) => sub.corps_id === fv.id && sub.id !== fv.id)
                    .map((sub) => sub.id)
                    .sort();
            }
        }
    }

    for (const fv of formations) {
        if (fv.kind === 'army_hq') {
            fv.subordinateIds = formations
                .filter((sub) => (sub.kind === 'corps' || sub.kind === 'corps_asset') && sub.faction === fv.faction && sub.id !== fv.id)
                .map((sub) => sub.id)
                .sort();
        }
    }

    // Parse active operations from corps_command
    const operations: OperationView[] = [];
    if (rawCorpsCommand) {
        for (const fv of formations) {
            if (fv.kind !== 'corps' && fv.kind !== 'corps_asset') continue;
            const cc = rawCorpsCommand[fv.id];
            const op = cc?.active_operation as Record<string, unknown> | undefined;
            if (op && typeof op === 'object' && op.name) {
                const participatingBrigadeIds = Array.isArray(op.participating_brigades)
                    ? (op.participating_brigades as string[]).filter((id): id is string => typeof id === 'string').sort(strictCompare)
                    : undefined;
                const participatingFormations = participatingBrigadeIds
                    ? formations.filter((formation) => participatingBrigadeIds.includes(formation.id))
                    : [];
                const avgCohesion = participatingFormations.length > 0
                    ? participatingFormations.reduce((sum, formation) => sum + finiteNumber(formation.cohesion, 0), 0) / participatingFormations.length
                    : undefined;
                const avgPersonnelPct = participatingFormations.length > 0
                    ? participatingFormations.reduce((sum, formation) => {
                        const personnel = finiteNumber(formation.personnel, 0);
                        const baseline = personnel > 0 ? Math.min(1, personnel / 2500) : 0;
                        return sum + baseline;
                    }, 0) / participatingFormations.length
                    : undefined;
                const sectorIntelRecords = typeof op.sector_id === 'string'
                    ? (state.sector_intel as Record<string, Array<Record<string, unknown>>> | undefined)?.[op.sector_id]
                    : undefined;
                const intelReadiness = Array.isArray(sectorIntelRecords) && sectorIntelRecords.length > 0
                    ? sectorIntelRecords.reduce((best, record) => {
                        const confidence = finiteNumber(record.confidence, 0);
                        return confidence > best ? confidence : best;
                    }, 0)
                    : undefined;
                const supplyReadiness = typeof op.supply_readiness === 'number' ? op.supply_readiness : undefined;
                operations.push({
                    corps_id: fv.id,
                    corps_name: fv.name,
                    faction: fv.faction,
                    name: op.name as string,
                    type: (op.type as string) ?? 'sector_attack',
                    phase: (op.phase as 'planning' | 'execution' | 'recovery') ?? 'execution',
                    sector_id: typeof op.sector_id === 'string' ? op.sector_id : undefined,
                    staging_osid: typeof op.staging_osid === 'string' ? op.staging_osid : undefined,
                    objectives: Array.isArray(op.objectives) ? (op.objectives as string[]).filter(o => typeof o === 'string') : undefined,
                    current_objective_index: typeof op.current_objective_index === 'number' ? op.current_objective_index : undefined,
                    momentum: typeof op.momentum === 'number' ? op.momentum : undefined,
                    failure_count: typeof op.failure_count === 'number' ? op.failure_count : undefined,
                    consecutive_failures_on_current: typeof op.consecutive_failures_on_current === 'number' ? op.consecutive_failures_on_current : undefined,
                    phase_started_turn: typeof op.phase_started_turn === 'number' ? op.phase_started_turn : undefined,
                    participating_brigade_count: participatingBrigadeIds?.length ?? 0,
                    participating_brigade_ids: participatingBrigadeIds,
                    started_turn: typeof op.started_turn === 'number' ? op.started_turn : turn,
                    supply_readiness: supplyReadiness,
                    avg_cohesion: avgCohesion,
                    avg_personnel_pct: avgPersonnelPct,
                    readiness: supplyReadiness != null || avgCohesion != null || intelReadiness != null
                        ? {
                            supply: supplyReadiness ?? 0,
                            cohesion: avgCohesion != null ? Math.max(0, Math.min(1, avgCohesion / 100)) : 0,
                            intel: intelReadiness ?? 0,
                        }
                        : undefined,
                    min_attack_outcome: typeof op.min_attack_outcome === 'string' ? op.min_attack_outcome as OperationView['min_attack_outcome'] : undefined,
                    tempo: typeof op.tempo === 'string' ? op.tempo as OperationView['tempo'] : undefined,
                    schwerpunkt_osid: typeof op.schwerpunkt_osid === 'string' ? op.schwerpunkt_osid : undefined,
                    artillery_preparation: op.artillery_preparation === true ? true : undefined,
                    force_launch: op.force_launch === true ? true : undefined,
                    recovery_reason: typeof op.recovery_reason === 'string' ? op.recovery_reason as OperationView['recovery_reason'] : undefined,
                    axes: Array.isArray(op.axes) ? (op.axes as Array<Record<string, unknown>>).map(a => ({
                        axis_id: String(a.axis_id ?? ''),
                        name: String(a.name ?? ''),
                        assigned_brigades: Array.isArray(a.assigned_brigades) ? (a.assigned_brigades as string[]).filter(s => typeof s === 'string') : [],
                        objectives: Array.isArray(a.objectives) ? (a.objectives as string[]).filter(s => typeof s === 'string') : [],
                        current_objective_index: typeof a.current_objective_index === 'number' ? a.current_objective_index : 0,
                        status: (a.status as 'executing' | 'stalled' | 'complete') ?? 'executing',
                        momentum: typeof a.momentum === 'number' ? a.momentum : 0,
                        staging_osid: typeof a.staging_osid === 'string' ? a.staging_osid : undefined,
                    })) : undefined,
                });
            }
        }
        operations.sort((a, b) => a.faction.localeCompare(b.faction) || a.corps_id.localeCompare(b.corps_id));
    }

    const militiaPools: MilitiaPoolView[] = [];
    const rawPools = state.militia_pools as Record<string, Record<string, unknown>> | undefined;
    if (rawPools) {
        for (const key of Object.keys(rawPools).sort()) {
            const p = rawPools[key];
            militiaPools.push({
                munId: (p.mun_id as string) ?? key, faction: (p.faction as string) ?? '',
                available: (p.available as number) ?? 0, committed: (p.committed as number) ?? 0,
                exhausted: (p.exhausted as number) ?? 0, fatigue: (p.fatigue as number) ?? 0,
            });
        }
    }

    let controlBySettlement: Record<string, string | null> = {};
    let statusBySettlement: Record<string, string> = {};
    const pc = state.political_controllers as Record<string, string | null> | undefined;
    if (pc) controlBySettlement = buildControlLookup(pc);
    const contested = state.contested_control as Record<string, boolean> | undefined;
    if (contested) {
        for (const [sid, isContested] of Object.entries(contested)) {
            if (isContested) statusBySettlement[sid] = 'CONTESTED';
        }
        statusBySettlement = buildStatusLookup(statusBySettlement);
    }

    const attackOrders: AttackOrderView[] = [];
    const rawAttackOrders = state.brigade_attack_orders as Record<string, string | null> | Array<{ brigade_id?: string; target_settlement_id?: string }> | undefined;
    if (Array.isArray(rawAttackOrders)) {
        for (const row of rawAttackOrders) {
            const brigadeId = typeof row?.brigade_id === 'string' ? row.brigade_id : '';
            const targetSid = typeof row?.target_settlement_id === 'string' ? row.target_settlement_id : '';
            if (brigadeId && targetSid) attackOrders.push({ brigadeId, targetSettlementId: targetSid });
        }
        attackOrders.sort((a, b) => a.brigadeId.localeCompare(b.brigadeId) || a.targetSettlementId.localeCompare(b.targetSettlementId));
    } else if (rawAttackOrders && typeof rawAttackOrders === 'object') {
        for (const [brigadeId, targetSid] of Object.entries(rawAttackOrders).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) {
            if (targetSid) attackOrders.push({ brigadeId, targetSettlementId: targetSid });
        }
    }

    const movementOrdersSettlement: MovementOrderSettlementView[] = [];
    const rawMovementOrders = state.brigade_movement_orders as Record<string, { destination_sids?: string[] }> | undefined;
    if (rawMovementOrders && typeof rawMovementOrders === 'object' && !Array.isArray(rawMovementOrders)) {
        for (const [brigadeId, order] of Object.entries(rawMovementOrders).sort((a, b) => a[0].localeCompare(b[0]))) {
            const sids = order?.destination_sids;
            if (Array.isArray(sids) && sids.length > 0) {
                movementOrdersSettlement.push({ brigadeId, targetSettlementIds: [...sids].sort() });
            }
        }
    }

    const repositionOrders: RepositionOrderView[] = [];
    const rawReposition = state.brigade_reposition_orders as Record<string, { settlement_ids?: string[] }> | undefined;
    if (rawReposition && typeof rawReposition === 'object' && !Array.isArray(rawReposition)) {
        for (const [brigadeId, order] of Object.entries(rawReposition).sort((a, b) => a[0].localeCompare(b[0]))) {
            const sids = order?.settlement_ids;
            if (Array.isArray(sids) && sids.length > 0) {
                repositionOrders.push({ brigadeId, settlementIds: [...sids].sort() });
            }
        }
    }

    const aorOrders: AoROrderView[] = [];
    const rawAoROrders = state.brigade_aor_orders as Array<{ settlement_id?: string; from_brigade?: string; to_brigade?: string }> | undefined;
    if (Array.isArray(rawAoROrders) && rawAoROrders.length > 0) {
        for (const o of rawAoROrders) {
            const settlementId = typeof o.settlement_id === 'string' ? o.settlement_id : '';
            const fromBrigadeId = typeof o.from_brigade === 'string' ? o.from_brigade : '';
            const toBrigadeId = typeof o.to_brigade === 'string' ? o.to_brigade : '';
            if (settlementId && fromBrigadeId && toBrigadeId) aorOrders.push({ settlementId, fromBrigadeId, toBrigadeId });
        }
        aorOrders.sort((a, b) => {
            if (a.settlementId !== b.settlementId) return a.settlementId < b.settlementId ? -1 : 1;
            if (a.fromBrigadeId !== b.fromBrigadeId) return a.fromBrigadeId < b.fromBrigadeId ? -1 : 1;
            return a.toBrigadeId < b.toBrigadeId ? -1 : a.toBrigadeId > b.toBrigadeId ? 1 : 0;
        });
    }

    const recentControlEvents = (((state.control_events as unknown[]) ?? [])
        .map((entry) => {
            const rec = entry as Record<string, unknown>;
            const turnRaw = Number(rec.turn ?? NaN);
            const settlementId = String(rec.settlement_id ?? '');
            const mechanism = String(rec.mechanism ?? 'unknown');
            if (!Number.isFinite(turnRaw) || !settlementId) return null;
            return {
                turn: turnRaw, settlementId, mechanism,
                from: rec.from == null ? null : String(rec.from),
                to: rec.to == null ? null : String(rec.to),
                municipalityId: rec.mun_id == null ? null : String(rec.mun_id),
            };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null))
        .sort((a, b) => {
            if (a.turn !== b.turn) return a.turn - b.turn;
            return a.settlementId.localeCompare(b.settlementId) || a.mechanism.localeCompare(b.mechanism);
        });

    let recruitment: RecruitmentView | undefined;
    const rawRecruitment = state.recruitment_state as Record<string, unknown> | undefined;
    if (rawRecruitment) {
        const capitalByFaction = pointsByFaction((rawRecruitment.recruitment_capital as Record<string, { points?: number }> | undefined) ?? {});
        const equipmentByFaction = pointsByFaction((rawRecruitment.equipment_pools as Record<string, { points?: number }> | undefined) ?? {});
        const recruitedBrigadeIds = Array.isArray(rawRecruitment.recruited_brigade_ids)
            ? [...(rawRecruitment.recruited_brigade_ids as string[])].sort()
            : [];
        if (Object.keys(capitalByFaction).length > 0) {
            recruitment = { capitalByFaction, equipmentByFaction: Object.keys(equipmentByFaction).length > 0 ? equipmentByFaction : undefined, recruitedBrigadeIds };
        }
    }

    let armyStance: LoadedGameState['armyStance'] | undefined;
    const rawArmyStance = state.army_stance as Record<string, unknown> | undefined;
    if (rawArmyStance && typeof rawArmyStance === 'object' && !Array.isArray(rawArmyStance)) {
        const out: NonNullable<LoadedGameState['armyStance']> = {};
        for (const faction of Object.keys(rawArmyStance).sort((a, b) => a.localeCompare(b))) {
            const stance = rawArmyStance[faction];
            if (typeof stance === 'string' && stance.length > 0) out[faction] = stance;
        }
        if (Object.keys(out).length > 0) armyStance = out;
    }

    let casualtyLedger: LoadedGameState['casualtyLedger'] | undefined;
    const rawCasualtyLedger = state.casualty_ledger as Record<string, Record<string, unknown>> | undefined;
    if (rawCasualtyLedger && typeof rawCasualtyLedger === 'object' && !Array.isArray(rawCasualtyLedger)) {
        const out: NonNullable<LoadedGameState['casualtyLedger']> = {};
        for (const faction of Object.keys(rawCasualtyLedger).sort((a, b) => a.localeCompare(b))) {
            const row = rawCasualtyLedger[faction] ?? {};
            out[faction] = {
                killed: finiteNumber(row.killed),
                wounded: finiteNumber(row.wounded),
                missing_captured: finiteNumber(row.missing_captured),
            };
        }
        if (Object.keys(out).length > 0) casualtyLedger = out;
    }

    let civilianCasualties: LoadedGameState['civilianCasualties'] | undefined;
    const rawCivilianCasualties = state.civilian_casualties as Record<string, Record<string, unknown>> | undefined;
    if (rawCivilianCasualties && typeof rawCivilianCasualties === 'object' && !Array.isArray(rawCivilianCasualties)) {
        const out: NonNullable<LoadedGameState['civilianCasualties']> = {};
        for (const faction of Object.keys(rawCivilianCasualties).sort((a, b) => a.localeCompare(b))) {
            const row = rawCivilianCasualties[faction] ?? {};
            out[faction] = {
                killed: finiteNumber(row.killed),
                fled_abroad: finiteNumber(row.fled_abroad),
            };
        }
        if (Object.keys(out).length > 0) civilianCasualties = out;
    }

    let internationalVisibilityPressure: LoadedGameState['internationalVisibilityPressure'] | undefined;
    const rawIvp = state.international_visibility_pressure as Record<string, unknown> | undefined;
    if (rawIvp && typeof rawIvp === 'object' && !Array.isArray(rawIvp)) {
        internationalVisibilityPressure = {
            atrocity_visibility: finiteNumber(rawIvp.atrocity_visibility),
            enclave_humanitarian_pressure: finiteNumber(rawIvp.enclave_humanitarian_pressure),
            sarajevo_siege_visibility: finiteNumber(rawIvp.sarajevo_siege_visibility),
            negotiation_momentum: finiteNumber(rawIvp.negotiation_momentum),
            composite_ivp: finiteNumber(rawIvp.composite_ivp),
            last_major_shift: finiteNumber(rawIvp.last_major_shift, turn),
        };
    }
    const ivpConsequencesActive = Array.isArray(state.ivp_consequences_active)
        ? (state.ivp_consequences_active as unknown[])
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
            .sort(strictCompare)
        : undefined;
    const pendingConvoyDecisions = Array.isArray(state.pending_convoy_decisions)
        ? (state.pending_convoy_decisions as Array<Record<string, unknown>>)
            .map((convoy) => {
                const id = typeof convoy.id === 'string' ? convoy.id : '';
                const targetEnclave = typeof convoy.target_enclave === 'string' ? convoy.target_enclave : '';
                const routeFaction = convoy.route_faction === 'RS' || convoy.route_faction === 'RBiH' || convoy.route_faction === 'HRHB'
                    ? convoy.route_faction
                    : null;
                if (!id || !targetEnclave || !routeFaction) return null;
                const decision = convoy.decision === 'allow' || convoy.decision === 'block' || convoy.decision === 'divert'
                    ? convoy.decision
                    : undefined;
                return {
                    id,
                    target_enclave: targetEnclave,
                    route_faction: routeFaction as 'RS' | 'RBiH' | 'HRHB',
                    supply_amount: finiteNumber(convoy.supply_amount),
                    ...(decision ? { decision: decision as 'allow' | 'block' | 'divert' } : {}),
                };
            })
            .filter((value): value is NonNullable<typeof value> => value !== null)
            .sort((a, b) => a.id.localeCompare(b.id))
        : undefined;

    const municipalitySupportOrders = state.municipality_support_orders && typeof state.municipality_support_orders === 'object'
        ? Object.fromEntries(
            Object.entries(state.municipality_support_orders as Record<string, Record<string, unknown>>)
                .sort(([a], [b]) => a.localeCompare(b))
                .flatMap(([faction, order]) => {
                    if ((faction !== 'RS' && faction !== 'RBiH' && faction !== 'HRHB') || !order || typeof order !== 'object') return [];
                    const mun_id = typeof order.mun_id === 'string' ? order.mun_id : '';
                    const type = order.type === 'weapons_shipment' || order.type === 'staff_priority' || order.type === 'croatian_support_package'
                        ? order.type
                        : null;
                    const staged_turn = finiteNumber(order.staged_turn, -1);
                    if (!mun_id || !type || staged_turn < 0) return [];
                    return [[faction, { faction, mun_id, type, staged_turn, label: getMunicipalitySupportLabel(faction) }]];
                })
        ) as LoadedGameState['municipalitySupportOrders']
        : undefined;

    let warPhaseSupplyPressure: LoadedGameState['warPhaseSupplyPressure'] | undefined;
    const rawSupply = state.war_supply_pressure as Record<string, unknown> | undefined;
    if (rawSupply && typeof rawSupply === 'object' && !Array.isArray(rawSupply)) {
        const out: NonNullable<LoadedGameState['warPhaseSupplyPressure']> = {};
        for (const faction of Object.keys(rawSupply).sort((a, b) => a.localeCompare(b))) {
            out[faction] = finiteNumber(rawSupply[faction], 100);
        }
        if (Object.keys(out).length > 0) warPhaseSupplyPressure = out;
    }

    let factionReserves: LoadedGameState['factionReserves'] | undefined;
    const rawGeneral = state.general_supply_reserve as Record<string, unknown> | undefined;
    if (rawGeneral && typeof rawGeneral === 'object' && !Array.isArray(rawGeneral)) {
        const out: NonNullable<LoadedGameState['factionReserves']> = {};
        const rawHeavy = state.heavy_munitions_reserve as Record<string, unknown> | undefined;
        for (const faction of Object.keys(rawGeneral).sort((a, b) => a.localeCompare(b))) {
            out[faction] = {
                generalSupply: finiteNumber(rawGeneral[faction], 0),
                heavyMunitions: finiteNumber(rawHeavy?.[faction] ?? 0, 0),
            };
        }
        if (Object.keys(out).length > 0) factionReserves = out;
    }

    let mobilizationSummary: LoadedGameState['mobilizationSummary'] | undefined;
    const rawMilitiaPoolsForSummary = state.militia_pools as Record<string, Record<string, unknown>> | undefined;
    const rawStrategicReserves = state.strategic_reserves as Record<string, unknown> | undefined;
    if (rawMilitiaPoolsForSummary && typeof rawMilitiaPoolsForSummary === 'object' && !Array.isArray(rawMilitiaPoolsForSummary)) {
        const byFaction: Record<string, MobilizationSummaryView & { _poolByMun: Map<string, number> }> = {};
        for (const poolKey of Object.keys(rawMilitiaPoolsForSummary).sort(strictCompare)) {
            const pool = rawMilitiaPoolsForSummary[poolKey] ?? {};
            const faction = typeof pool.faction === 'string' ? pool.faction : '';
            if (!faction) continue;
            const munId = poolKey.includes(':') ? poolKey.split(':', 2)[0] : poolKey;
            if (!byFaction[faction]) {
                byFaction[faction] = {
                    faction: faction as MobilizationSummaryView['faction'],
                    total_available: 0,
                    total_committed: 0,
                    total_exhausted: 0,
                    exhaustion_pct: 0,
                    strategic_reserve: finiteNumber(rawStrategicReserves?.[faction], 0),
                    top_pools: [],
                    _poolByMun: new Map<string, number>(),
                };
            }
            byFaction[faction].total_available += finiteNumber(pool.available);
            byFaction[faction].total_committed += finiteNumber(pool.committed);
            byFaction[faction].total_exhausted += finiteNumber(pool.exhausted);
            byFaction[faction]._poolByMun.set(munId, (byFaction[faction]._poolByMun.get(munId) ?? 0) + finiteNumber(pool.available));
        }
        const out: NonNullable<LoadedGameState['mobilizationSummary']> = {};
        for (const faction of Object.keys(byFaction).sort(strictCompare)) {
            const entry = byFaction[faction];
            const denominator = entry.total_available + entry.total_committed + entry.total_exhausted;
            entry.exhaustion_pct = denominator > 0 ? (entry.total_exhausted / denominator) * 100 : 0;
            entry.top_pools = Array.from(entry._poolByMun.entries())
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 5)
                .map(([mun_id, available]) => ({ mun_id, available }));
            out[faction] = {
                faction: entry.faction,
                total_available: entry.total_available,
                total_committed: entry.total_committed,
                total_exhausted: entry.total_exhausted,
                exhaustion_pct: entry.exhaustion_pct,
                strategic_reserve: entry.strategic_reserve,
                top_pools: entry.top_pools,
            };
        }
        if (Object.keys(out).length > 0) mobilizationSummary = out;
    }

    let warPhaseExhaustion: LoadedGameState['warPhaseExhaustion'] | undefined;
    const rawExhaustion = state.war_exhaustion as Record<string, unknown> | undefined;
    if (rawExhaustion && typeof rawExhaustion === 'object' && !Array.isArray(rawExhaustion)) {
        const out: NonNullable<LoadedGameState['warPhaseExhaustion']> = {};
        for (const faction of Object.keys(rawExhaustion).sort((a, b) => a.localeCompare(b))) {
            out[faction] = finiteNumber(rawExhaustion[faction], 0);
        }
        if (Object.keys(out).length > 0) warPhaseExhaustion = out;
    }

    let namedOfficerData: LoadedGameState['namedOfficerData'] | undefined;
    let namedOfficerStateById: LoadedGameState['namedOfficerStateById'] | undefined;
    const rawOfficerData = state.named_officer_data as Array<Record<string, unknown>> | undefined;
    const rawOfficers = state.named_officers as Record<string, Record<string, unknown>> | undefined;
    if (Array.isArray(rawOfficerData) && rawOfficers && typeof rawOfficers === 'object' && !Array.isArray(rawOfficers)) {
        const officerList: NamedOfficerView[] = [];
        const sortedData = [...rawOfficerData].sort((a, b) => strictCompare(String(a?.id ?? ''), String(b?.id ?? '')));
        for (const data of sortedData) {
            const id = typeof data?.id === 'string' ? data.id : '';
            if (!id) continue;
            const os = rawOfficers[id];
            officerList.push({
                id,
                name: typeof data.name === 'string' ? data.name : id,
                faction: typeof data.faction === 'string' ? data.faction : '',
                rank: typeof data.rank === 'string' ? data.rank : 'corps_commander',
                competence: finiteNumber(data.competence, 0),
                aggressiveness: finiteNumber(data.aggressiveness, 0),
                defensive_skill: finiteNumber(data.defensive_skill, 0),
                political_reliability: finiteNumber(data.political_reliability, 0),
                home_corps_id: typeof data.home_corps_id === 'string' ? data.home_corps_id : undefined,
                origin: typeof data.origin === 'string' ? data.origin : 'military',
                status: typeof os?.status === 'string' ? os.status : 'active',
                assigned_corps_id: typeof os?.assigned_corps_id === 'string' ? os.assigned_corps_id : null,
                acting_commander: Boolean(os?.acting_commander),
                turns_in_command: finiteNumber(os?.turns_in_command, 0),
                battles: finiteNumber(os?.battles, 0),
                victories: finiteNumber(os?.victories, 0),
            });
        }
        if (officerList.length > 0) namedOfficerData = officerList;

        const stateById: Record<string, NamedOfficerStateView> = {};
        for (const officerId of Object.keys(rawOfficers).sort(strictCompare)) {
            const os = rawOfficers[officerId];
            if (!os || typeof os !== 'object') continue;
            stateById[officerId] = {
                officer_id: officerId,
                status: typeof os.status === 'string' ? os.status : 'active',
                assigned_corps_id: typeof os.assigned_corps_id === 'string' ? os.assigned_corps_id : null,
                acting_commander: Boolean(os.acting_commander),
                turns_in_command: finiteNumber(os.turns_in_command, 0),
                battles: finiteNumber(os.battles, 0),
                victories: finiteNumber(os.victories, 0),
            };
        }
        if (Object.keys(stateById).length > 0) namedOfficerStateById = stateById;
    }

    const rbih_hrhb_war_earliest_turn = typeof meta?.rbih_hrhb_war_earliest_turn === 'number' ? meta.rbih_hrhb_war_earliest_turn : undefined;
    const war_alliance_rbih_hrhb = typeof state.war_alliance_rbih_hrhb === 'number' ? state.war_alliance_rbih_hrhb : undefined;
    const playerFaction = (meta?.player_faction as string | null | undefined) ?? null;

    const rawDesiredCap = state.brigade_desired_aor_cap as Record<string, number> | undefined;
    const brigadeDesiredAoRCap: Record<string, number> | undefined =
        rawDesiredCap && typeof rawDesiredCap === 'object' && !Array.isArray(rawDesiredCap)
            ? Object.fromEntries(Object.entries(rawDesiredCap).filter(([, v]) => typeof v === 'number' && v >= 1 && v <= 4).sort((a, b) => a[0].localeCompare(b[0])))
            : undefined;

    let fogOfWar: FogOfWarView | undefined;
    const rawSectorIntel = state.sector_intel as Record<string, Array<Record<string, unknown>>> | undefined;
    const rawCorpsFrontSectors = state.corps_front_sectors as Record<string, Record<string, unknown>> | undefined;
    if (playerFaction && rawSectorIntel && rawCorpsFrontSectors) {
        const visibleEnemySectorIds = new Set<string>();
        const visibleEnemyOsids = new Set<string>();
        for (const [friendlySectorId, records] of Object.entries(rawSectorIntel).sort((a, b) => a[0].localeCompare(b[0]))) {
            const friendlySector = rawCorpsFrontSectors[friendlySectorId];
            if (!friendlySector || friendlySector.faction !== playerFaction || !Array.isArray(records)) continue;
            for (const rec of records) {
                const enemySectorId = typeof rec.enemy_sector_id === 'string' ? rec.enemy_sector_id : '';
                if (!enemySectorId) continue;
                visibleEnemySectorIds.add(enemySectorId);
                const enemySector = rawCorpsFrontSectors[enemySectorId];
                const subSegments = Array.isArray(enemySector?.sub_segments)
                    ? enemySector.sub_segments as Array<Record<string, unknown>>
                    : [];
                for (const sub of subSegments) {
                    const friendlyOsids = Array.isArray(sub.friendly_osids) ? sub.friendly_osids : [];
                    for (const osid of friendlyOsids) {
                        if (typeof osid === 'string' && osid.length > 0) visibleEnemyOsids.add(osid);
                    }
                }
                const visibleBrigadeIds = Array.isArray(rec.visible_brigade_ids) ? rec.visible_brigade_ids : [];
                for (const brigadeId of visibleBrigadeIds) {
                    if (typeof brigadeId !== 'string' || brigadeId.length === 0) continue;
                    const brigade = formationsRecord[brigadeId];
                    const locationOsid = typeof brigade?.location_osid === 'string' ? brigade.location_osid : '';
                    if (locationOsid) visibleEnemyOsids.add(locationOsid);
                }
            }
        }
        if (visibleEnemySectorIds.size > 0 || visibleEnemyOsids.size > 0) {
            fogOfWar = {
                visibleEnemyOsids: Array.from(visibleEnemyOsids).sort(strictCompare),
                visibleEnemySectorIds: Array.from(visibleEnemySectorIds).sort(strictCompare),
            };
        }
    }

    const displacementByMun: LoadedGameState['displacementByMun'] = {};
    const rawDisplacement = state.displacement_state as Record<string, Record<string, unknown>> | undefined;
    if (rawDisplacement && typeof rawDisplacement === 'object' && !Array.isArray(rawDisplacement)) {
        for (const [munId, row] of Object.entries(rawDisplacement).sort((a, b) => a[0].localeCompare(b[0]))) {
            const originalPopulation = typeof row.original_population === 'number' && Number.isFinite(row.original_population) ? row.original_population : 0;
            const displacedOut = typeof row.displaced_out === 'number' && Number.isFinite(row.displaced_out) ? row.displaced_out : 0;
            const displacedIn = typeof row.displaced_in === 'number' && Number.isFinite(row.displaced_in) ? row.displaced_in : 0;
            const lostPopulation = typeof row.lost_population === 'number' && Number.isFinite(row.lost_population) ? row.lost_population : 0;
            const arrivedByFaction: Partial<Record<string, number>> = {};
            const rawArrived = row.displaced_in_by_faction;
            if (rawArrived && typeof rawArrived === 'object' && !Array.isArray(rawArrived)) {
                for (const [fid, val] of Object.entries(rawArrived as Record<string, unknown>).sort((a, b) => a[0].localeCompare(b[0]))) {
                    if (typeof val === 'number' && Number.isFinite(val) && val > 0) arrivedByFaction[fid] = val;
                }
            }
            displacementByMun[munId] = {
                originalPopulation, displacedOut, displacedIn, lostPopulation,
                currentPopulation: Math.max(0, originalPopulation - displacedOut - lostPopulation + displacedIn),
                ...(Object.keys(arrivedByFaction).length > 0 ? { arrivedByFaction } : {}),
            };
        }
    }

    // Scan displacement_event_log for per-OSID per-faction departures and per-mun totals (for fallback when OSID has no events)
    const departedByOsid: LoadedGameState['departedByOsid'] = {};
    const departedByMun: LoadedGameState['departedByMun'] = {};
    const displacementByOsid: LoadedGameState['displacementByOsid'] = {};
    const rawEventLog = (state as Record<string, unknown>).displacement_event_log;
    if (Array.isArray(rawEventLog)) {
        for (const evt of rawEventLog as Array<Record<string, unknown>>) {
            const displaced = finiteNumber(evt.displaced);
            const killed = finiteNumber(evt.killed);
            const fledAbroad = finiteNumber(evt.fled_abroad);
            const settled = finiteNumber(evt.settled);
            const originOsid = typeof evt.origin_osid === 'string' ? evt.origin_osid : '';
            const destOsid = typeof evt.dest_osid === 'string' ? evt.dest_osid : '';
            const originMun = typeof evt.origin_mun === 'string' ? evt.origin_mun : '';
            const ethnicity = typeof evt.ethnicity === 'string' ? evt.ethnicity : '';
            if (originOsid) {
                if (!displacementByOsid[originOsid]) displacementByOsid[originOsid] = { out: 0, lost: 0, in: 0 };
                const outDelta = displaced + killed + fledAbroad;
                displacementByOsid[originOsid].out += outDelta;
                displacementByOsid[originOsid].lost += killed + fledAbroad;
            }
            if (destOsid) {
                if (!displacementByOsid[destOsid]) displacementByOsid[destOsid] = { out: 0, lost: 0, in: 0 };
                displacementByOsid[destOsid].in += settled;
            }
            if (displaced > 0 && ethnicity) {
                if (originOsid) {
                    if (!departedByOsid[originOsid]) departedByOsid[originOsid] = {};
                    departedByOsid[originOsid][ethnicity] =
                        (departedByOsid[originOsid][ethnicity] ?? 0) + displaced;
                }
                if (originMun) {
                    if (!departedByMun[originMun]) departedByMun[originMun] = {};
                    departedByMun[originMun][ethnicity] =
                        (departedByMun[originMun][ethnicity] ?? 0) + displaced;
                }
            }
        }
    }

    const frontEdges: LoadedGameState['frontEdges'] = Array.isArray(state.front_edges)
        ? (state.front_edges as Array<Record<string, unknown>>)
            .map((edge) => {
                const a = typeof edge.a === 'string' ? edge.a : '';
                const b = typeof edge.b === 'string' ? edge.b : '';
                if (!a || !b) return null;
                const [na, nb] = a < b ? [a, b] : [b, a];
                const edgeId = typeof edge.edge_id === 'string' && edge.edge_id ? edge.edge_id : `${na}__${nb}`;
                const sideA = edge.side_a === 'RS' || edge.side_a === 'RBiH' || edge.side_a === 'HRHB' ? edge.side_a : null;
                const sideB = edge.side_b === 'RS' || edge.side_b === 'RBiH' || edge.side_b === 'HRHB' ? edge.side_b : null;
                return { edge_id: edgeId, a: na, b: nb, side_a: a < b ? sideA : sideB, side_b: a < b ? sideB : sideA };
            })
            .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
            .sort((a, b) => a.edge_id.localeCompare(b.edge_id))
        : undefined;

    const frontEdgesOsid: LoadedGameState['frontEdgesOsid'] = Array.isArray((state as Record<string, unknown>).war_front_edges_osid)
        ? ((state as Record<string, unknown>).war_front_edges_osid as Array<Record<string, unknown>>)
            .map((edge) => {
                const a = typeof edge.a === 'string' ? edge.a : '';
                const b = typeof edge.b === 'string' ? edge.b : '';
                if (!a || !b) return null;
                const [na, nb] = a < b ? [a, b] : [b, a];
                const edgeId = typeof edge.edge_id === 'string' && edge.edge_id ? edge.edge_id : `${na}__${nb}`;
                const sideA = edge.side_a === 'RS' || edge.side_a === 'RBiH' || edge.side_a === 'HRHB' ? edge.side_a : null;
                const sideB = edge.side_b === 'RS' || edge.side_b === 'RBiH' || edge.side_b === 'HRHB' ? edge.side_b : null;
                return { edge_id: edgeId, a: na, b: nb, side_a: a < b ? sideA : sideB, side_b: a < b ? sideB : sideA };
            })
            .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
            .sort((a, b) => a.edge_id.localeCompare(b.edge_id))
        : undefined;

    let assignableFrontSegments: LoadedGameState['assignableFrontSegments'] | undefined;
    if (Array.isArray(state.assignable_front_segments)) {
        const out: NonNullable<LoadedGameState['assignableFrontSegments']> = [];
        for (const segment of state.assignable_front_segments as Array<Record<string, unknown>>) {
            const frontId = typeof segment.front_id === 'string' ? segment.front_id : '';
            const edgeIds = (Array.isArray(segment.edge_ids) ? segment.edge_ids : [])
                .map((id) => (typeof id === 'string' ? id : '')).filter((id) => id.length > 0).sort((a, b) => a.localeCompare(b));
            if (!frontId || edgeIds.length === 0) continue;
            const sideA = segment.side_a === 'RS' || segment.side_a === 'RBiH' || segment.side_a === 'HRHB' ? segment.side_a : null;
            const sideB = segment.side_b === 'RS' || segment.side_b === 'RBiH' || segment.side_b === 'HRHB' ? segment.side_b : null;
            const lengthEdges = Number.isFinite(Number(segment.length_edges)) && Number(segment.length_edges) > 0 ? Math.floor(Number(segment.length_edges)) : edgeIds.length;
            const entry: NonNullable<LoadedGameState['assignableFrontSegments']>[number] = { front_id: frontId, edge_ids: edgeIds, side_a: sideA, side_b: sideB, length_edges: lengthEdges };
            if (typeof segment.name === 'string' && segment.name.length > 0) entry.name = segment.name;
            if (typeof segment.theatre_id === 'string' && segment.theatre_id.length > 0) entry.theatre_id = segment.theatre_id;
            out.push(entry);
        }
        out.sort((a, b) => a.front_id.localeCompare(b.front_id));
        if (out.length > 0) assignableFrontSegments = out;
    }

    let frontPressureByEdge: LoadedGameState['frontPressureByEdge'] | undefined;
    const rawFrontPressure = state.front_pressure as Record<string, Record<string, unknown>> | undefined;
    if (rawFrontPressure && typeof rawFrontPressure === 'object' && !Array.isArray(rawFrontPressure)) {
        const out: NonNullable<LoadedGameState['frontPressureByEdge']> = {};
        for (const key of Object.keys(rawFrontPressure).sort((a, b) => a.localeCompare(b))) {
            const item = rawFrontPressure[key] ?? {};
            const edgeId = typeof item.edge_id === 'string' && item.edge_id ? item.edge_id : key;
            const value = Number(item.value ?? 0);
            const maxAbs = Number(item.max_abs ?? Math.abs(value));
            const lastUpdatedTurn = Number(item.last_updated_turn ?? turn);
            out[edgeId] = { edge_id: edgeId, value: Number.isFinite(value) ? value : 0, max_abs: Number.isFinite(maxAbs) ? Math.max(1, maxAbs) : 1, last_updated_turn: Number.isFinite(lastUpdatedTurn) ? lastUpdatedTurn : turn };
        }
        if (Object.keys(out).length > 0) frontPressureByEdge = out;
    }

    let corpsFrontSectors: CorpsFrontSectorView[] | undefined;
    const rawSectors = state.corps_front_sectors as Record<string, Record<string, unknown>> | undefined;
    const opsecSectorSet = new Set(
        Array.isArray((state as Record<string, unknown>).opsec_sectors)
            ? ((state as Record<string, unknown>).opsec_sectors as string[]).filter((value): value is string => typeof value === 'string')
            : []
    );
    if (rawSectors && typeof rawSectors === 'object' && !Array.isArray(rawSectors)) {
        const out: CorpsFrontSectorView[] = [];
        for (const sectorId of Object.keys(rawSectors).sort((a, b) => a.localeCompare(b))) {
            const s = rawSectors[sectorId] ?? {};
            const corpsId = typeof s.corps_id === 'string' ? s.corps_id : '';
            const faction = typeof s.faction === 'string' ? s.faction : '';
            if (!corpsId || !faction) continue;
            const corpsFormation = formationsRecord[corpsId];
            const corpsName = corpsFormation && typeof corpsFormation.name === 'string' ? corpsFormation.name : corpsId;
            const edgeIds = Array.isArray(s.edge_ids) ? (s.edge_ids as string[]).filter(e => typeof e === 'string').sort((a, b) => a.localeCompare(b)) : [];
            const opposingFactions = Array.isArray(s.opposing_factions) ? (s.opposing_factions as string[]).filter(f => typeof f === 'string').sort((a, b) => a.localeCompare(b)) : [];
            const subSegments = Array.isArray(s.sub_segments) ? s.sub_segments as Array<Record<string, unknown>> : [];
            const assignedBrigadeIds = Array.isArray(s.assigned_brigade_ids) ? (s.assigned_brigade_ids as string[]).filter(id => typeof id === 'string').sort((a, b) => a.localeCompare(b)) : [];
            const reserveBrigadeIds = Array.isArray(s.reserve_brigade_ids) ? (s.reserve_brigade_ids as string[]).filter(id => typeof id === 'string').sort((a, b) => a.localeCompare(b)) : [];

            // Derive display_name from municipality slugs in friendly_osids
            const munCounts = new Map<string, number>();
            for (const ss of subSegments) {
                const friendlyOsids = Array.isArray(ss.friendly_osids) ? ss.friendly_osids as string[] : [];
                for (const osid of friendlyOsids) {
                    const parts = osid.split(':');
                    if (parts.length >= 2) {
                        const mun = parts[1];
                        munCounts.set(mun, (munCounts.get(mun) ?? 0) + 1);
                    }
                }
            }
            const topMuns = [...munCounts.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 2)
                .map(([m]) => humanizeMunicipalitySlug(m));
            const displayName = topMuns.length > 0
                ? `${corpsName} \u2013 ${topMuns.join(', ')}`
                : corpsName;

            out.push({
                sector_id: typeof s.sector_id === 'string' ? s.sector_id : sectorId,
                corps_id: corpsId,
                corps_name: corpsName,
                display_name: displayName,
                faction,
                opposing_factions: opposingFactions,
                edge_ids: edgeIds,
                sub_segment_count: subSegments.length,
                length_edges: typeof s.length_edges === 'number' ? s.length_edges : edgeIds.length,
                assigned_brigade_ids: assignedBrigadeIds,
                reserve_brigade_ids: reserveBrigadeIds,
                density: typeof s.density === 'number' ? s.density : 0,
                threat_ratio: typeof s.threat_ratio === 'number' ? s.threat_ratio : 0,
                defensive_power: typeof s.defensive_power === 'number' ? s.defensive_power : 0,
                // New intel fields defaulting for backwards compatibility:
                intel_confidence: typeof s.intel_confidence === 'number' ? s.intel_confidence : 1.0,
                offensive_signs: Boolean(s.offensive_signs),
                logistics_priority: edgeIds.length > 0
                    ? edgeIds.reduce((sum, edgeId) => {
                        const factionPriorities = (state.logistics_priority as Record<string, Record<string, number>> | undefined)?.[faction];
                        const value = factionPriorities?.[edgeId];
                        return sum + (typeof value === 'number' ? value : 1);
                    }, 0) / edgeIds.length
                    : 1,
                opsec_active: opsecSectorSet.has(sectorId),
            });
        }
        if (out.length > 0) corpsFrontSectors = out;
    }

    let sectorEntrenchmentSummary: LoadedGameState['sectorEntrenchmentSummary'] | undefined;
    if (corpsFrontSectors && corpsFrontSectors.length > 0) {
        const formationsById = new Map(formations.map((formation) => [formation.id, formation]));
        const out: NonNullable<LoadedGameState['sectorEntrenchmentSummary']> = {};
        for (const sector of corpsFrontSectors) {
            const assigned = sector.assigned_brigade_ids
                .map((formationId) => formationsById.get(formationId))
                .filter((formation): formation is FormationView => Boolean(formation));
            if (assigned.length === 0) continue;
            out[sector.sector_id] = {
                avgEntrenchment: assigned.reduce((sum, formation) => sum + finiteNumber(formation.entrenchment_turns), 0) / assigned.length,
                avgDigIn: assigned.reduce((sum, formation) => sum + finiteNumber(formation.dig_in_progress), 0) / assigned.length,
                digInCount: assigned.filter((formation) => formation.posture === 'dig_in').length,
                totalCount: assigned.length,
            };
        }
        if (Object.keys(out).length > 0) sectorEntrenchmentSummary = out;
    }

    let enclaveResilience: LoadedGameState['enclaveResilience'] | undefined;
    const rawEnclave = state.enclave_resilience as Record<string, unknown> | undefined;
    const rawSupplyStateByOsid = state.supply_state_by_osid as Record<string, unknown> | undefined;
    if (rawEnclave && typeof rawEnclave === 'object' && !Array.isArray(rawEnclave)) {
        const out: Record<string, EnclaveResilienceView> = {};
        for (const key of Object.keys(rawEnclave).sort()) {
            const entry = rawEnclave[key];
            const enclaveDef = ENCLAVE_UI_DEFINITIONS.find((enclave) => enclave.id === key);
            if (typeof entry === 'number') {
                out[key] = {
                    resilience: entry,
                    isolation_turns: 0,
                    hardening_active: false,
                    supply_state: deriveEnclaveSupplyState(key, rawSupplyStateByOsid, 0, false, entry),
                    airdrop_status: enclaveDef?.faction === 'RBiH' ? 'not_isolated_long_enough' : 'not_eligible',
                    airdrop_allocation: getAirdropAllocationValue(state as Record<string, unknown>, key),
                    faction: enclaveDef?.faction ?? null,
                    display_name: enclaveDef?.display_name ?? humanizeMunicipalitySlug(key.replace(/_/g, '-')),
                };
            } else if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                const e = entry as Record<string, unknown>;
                const resilienceValue = finiteNumber(e.resilience);
                const isolationTurns = finiteNumber(e.isolation_turns);
                const hardeningActive = Boolean(e.hardening_active);
                out[key] = {
                    resilience: resilienceValue,
                    isolation_turns: isolationTurns,
                    hardening_active: hardeningActive,
                    supply_state: deriveEnclaveSupplyState(key, rawSupplyStateByOsid, isolationTurns, hardeningActive, resilienceValue),
                    airdrop_status: enclaveDef?.faction !== 'RBiH'
                        ? 'not_eligible'
                        : isolationTurns >= 4
                            ? 'receiving'
                        : isolationTurns > 0
                            ? 'not_isolated_long_enough'
                            : 'not_eligible',
                    airdrop_allocation: getAirdropAllocationValue(state as Record<string, unknown>, key),
                    faction: enclaveDef?.faction ?? null,
                    display_name: enclaveDef?.display_name ?? humanizeMunicipalitySlug(key.replace(/_/g, '-')),
                };
            }
        }
        if (Object.keys(out).length > 0) enclaveResilience = out;
    }

    const commandBriefing = buildCommandBriefing({
        playerFaction,
        turn,
        pendingConvoyDecisions,
        enclaveResilience,
        operations,
        corpsFrontSectors,
        internationalVisibilityPressure,
        ivpConsequencesActive,
        municipalitySupportOrders,
    });

    return {
        label, turn, phase,
        metadata: {
            turn,
            date: metadataDate,
        },
        formations, militiaPools, controlBySettlement, statusBySettlement,
        brigadeAorByFormationId, brigadeFrontAssignment, theatres, armyTheatreAssignment,
        attackOrders, aorOrders, recentControlEvents, recruitment,
        armyStance, casualtyLedger, civilianCasualties, internationalVisibilityPressure, ivpConsequencesActive, pendingConvoyDecisions, municipalitySupportOrders,
        sarajevoTunnelOperational: Boolean(state.sarajevo_tunnel_operational), warPhaseSupplyPressure, warPhaseExhaustion,
        player_faction: playerFaction ?? undefined,
        rbih_hrhb_war_earliest_turn: rbih_hrhb_war_earliest_turn ?? null,
        war_alliance_rbih_hrhb: war_alliance_rbih_hrhb ?? null,
        brigadeDesiredAoRCap: brigadeDesiredAoRCap && Object.keys(brigadeDesiredAoRCap).length > 0 ? brigadeDesiredAoRCap : undefined,
        frontEdges: frontEdges && frontEdges.length > 0 ? frontEdges : undefined,
        frontEdgesOsid: frontEdgesOsid && frontEdgesOsid.length > 0 ? frontEdgesOsid : undefined,
        assignableFrontSegments, frontPressureByEdge,
        displacementByMun: Object.keys(displacementByMun).length > 0 ? displacementByMun : undefined,
        departedByOsid: departedByOsid && Object.keys(departedByOsid).length > 0 ? departedByOsid : undefined,
        departedByMun: departedByMun && Object.keys(departedByMun).length > 0 ? departedByMun : undefined,
        displacementByOsid: Object.keys(displacementByOsid).length > 0 ? displacementByOsid : undefined,
        fogOfWar,
        movementOrdersSettlement: movementOrdersSettlement.length > 0 ? movementOrdersSettlement : undefined,
        repositionOrders: repositionOrders.length > 0 ? repositionOrders : undefined,
        corpsFrontSectors,
        operations: operations.length > 0 ? operations : undefined,
        namedOfficerData,
        namedOfficerStateById,
        factionReserves,
        enclaveResilience,
        sectorEntrenchmentSummary,
        mobilizationSummary,
        commandBriefing,
        latestTurnSummary: (state.turn_summaries as import('../../../state/turn_summary.js').TurnSummary[] | undefined)?.[0] ?? null,
    };
}

