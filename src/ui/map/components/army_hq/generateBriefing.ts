import type { LoadedGameState, FactionId } from '../../data/types';
import { turnToDateString } from '../../utils/formatters';
import { isSectorAssignmentExemptCorpsId } from '../../../../sim/combat/corps_front_sectors_constants.js';
import {
    getPlayerSafeCorpsName,
    getPlayerSafeDecisionTitle,
    getPlayerSafeEnclaveName,
} from '../../utils/playerSafeText';

export type BriefingTarget =
    | { type: 'corps'; corpsId: string }
    | { type: 'sector'; sectorId: string }
    | { type: 'operation'; operationKey: string }
    | { type: 'none' };

export interface BriefingItem {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: string;
    title: string;
    detail: string;
    corpsId?: string;
    target: BriefingTarget;
}

const MAX_ITEMS = 12;

function sectorLabel(displayName?: string): string {
    return displayName ?? 'this sector';
}

export function generateBriefing(
    state: LoadedGameState,
    faction: Exclude<FactionId, null>,
): BriefingItem[] {
    const items: BriefingItem[] = [];
    let nextId = 0;
    const id = () => `brief-${nextId++}`;

    const formations = state.formations ?? [];
    const brigades = formations.filter(
        (formation) =>
            formation.kind === 'brigade' &&
            formation.status === 'active' &&
            formation.faction === faction,
    );
    const corpsFormations = formations.filter(
        (formation) =>
            (formation.kind === 'corps' || formation.kind === 'corps_asset') &&
            formation.faction === faction,
    );
    const brigadesByCorps = new Map<string, typeof brigades>();
    for (const brigade of brigades) {
        const corpsId = brigade.corps_id ?? '';
        const list = brigadesByCorps.get(corpsId) || [];
        list.push(brigade);
        brigadesByCorps.set(corpsId, list);
    }
    const sectors = (state.corpsFrontSectors ?? []).filter(
        (sector) => sector.faction === faction,
    );
    const operations = (state.operations ?? []).filter((operation) =>
        corpsFormations.some((corps) => corps.id === operation.corps_id),
    );
    const pendingOfficerEvents = (state.pendingOfficerEvents ?? []).filter(
        (event) => event.faction === faction && !event.acknowledged,
    );
    const getCorpsLabel = (corpsId: string | null | undefined): string => {
        const corps = corpsFormations.find((entry) => entry.id === corpsId);
        return getPlayerSafeCorpsName(corps?.name, corpsId);
    };

    const pendingDecisions = (state.pendingEventDecisions ?? []).filter(
        (decision) => decision.faction === faction,
    );
    for (const decision of pendingDecisions) {
        items.push({
            id: id(),
            severity: 'critical',
            category: 'event_decision',
            title: getPlayerSafeDecisionTitle(decision.event_title),
            detail: `${decision.response_options?.length ?? 0} options — awaiting your response`,
            target: { type: 'none' },
        });
    }

    for (const enclave of Object.values(state.enclaveResilience ?? {})) {
        if (enclave.supply_state === 'critical' && enclave.faction === faction) {
            items.push({
                id: id(),
                severity: 'critical',
                category: 'supply',
                title: `${getPlayerSafeEnclaveName(enclave.display_name)} supply critical`,
                detail: `Enclave resilience ${enclave.resilience ?? 0} — isolated ${enclave.isolation_turns ?? 0} turns`,
                target: { type: 'none' },
            });
        }
    }

    for (const corps of corpsFormations) {
        if (isSectorAssignmentExemptCorpsId(corps.id)) continue;
        const corpsHasSectors = sectors.some((sector) => sector.corps_id === corps.id);
        const corpsBrigades = brigadesByCorps.get(corps.id) ?? [];
        if (!corpsHasSectors && corpsBrigades.length > 0) {
            items.push({
                id: id(),
                severity: 'critical',
                category: 'sectors',
                title: `${getPlayerSafeCorpsName(corps.name, corps.id)} has no front sectors assigned`,
                detail: `${corpsBrigades.length} brigades without sector assignment`,
                corpsId: corps.id,
                target: { type: 'corps', corpsId: corps.id },
            });
        }
    }

    for (const operation of operations) {
        const subPhase = operation.preparation_sub_phase;
        if (subPhase === 'assessment' || subPhase === 'ready') {
            items.push({
                id: id(),
                severity: 'critical',
                category: 'operations',
                title: `Op ${operation.name ?? 'UNNAMED'} awaits GO/NO-GO`,
                detail:
                    subPhase === 'ready'
                        ? 'Forces staged and ready — awaiting launch order'
                        : `Commander assessment: ${operation.commander_assessment ?? 'pending'}`,
                corpsId: operation.corps_id,
                target: {
                    type: 'operation',
                    operationKey: `${operation.corps_id}|${operation.name}`,
                },
            });
        }
    }

    if (pendingOfficerEvents.length > 0) {
        items.push({
            id: id(),
            severity: 'critical',
            category: 'personnel',
            title: `${pendingOfficerEvents.length} personnel decision${pendingOfficerEvents.length > 1 ? 's' : ''} pending`,
            detail: pendingOfficerEvents.map((event) => event.officer_name).join(', '),
            target: { type: 'none' },
        });
    }

    for (const corps of corpsFormations) {
        const corpsBrigades = brigadesByCorps.get(corps.id) ?? [];
        if (corpsBrigades.length === 0) continue;
        const avgCohesion =
            corpsBrigades.reduce((sum, brigade) => sum + (brigade.cohesion ?? 0), 0) /
            corpsBrigades.length;
        if (avgCohesion < 40) {
            items.push({
                id: id(),
                severity: 'critical',
                category: 'cohesion',
                title: `${getPlayerSafeCorpsName(corps.name, corps.id)} cohesion critical (${Math.round(avgCohesion)})`,
                detail: `${corpsBrigades.length} brigades, avg cohesion ${Math.round(avgCohesion)}`,
                corpsId: corps.id,
                target: { type: 'corps', corpsId: corps.id },
            });
        }
    }

    for (const sector of sectors) {
        if ((sector.intel_confidence ?? 1) < 0.3) {
            items.push({
                id: id(),
                severity: 'warning',
                category: 'intel',
                title: `Low intel in ${sectorLabel(sector.display_name)}`,
                detail: `Intel confidence ${Math.round((sector.intel_confidence ?? 0) * 100)}%`,
                corpsId: sector.corps_id,
                target: { type: 'sector', sectorId: sector.sector_id },
            });
        }
    }

    const exhaustion = state.warPhaseExhaustion?.[faction] ?? 0;
    if (exhaustion > 20) {
        items.push({
            id: id(),
            severity: 'warning',
            category: 'exhaustion',
            title: `War exhaustion ${Math.round(exhaustion)} -- offensive capacity degraded`,
            detail: exhaustion > 40 ? 'Critical exhaustion level' : 'Moderate exhaustion',
            target: { type: 'none' },
        });
    }

    const ineffectiveByCorps: Record<string, number> = {};
    for (const brigade of brigades) {
        if ((brigade.personnel ?? 9999) < 400) {
            const corpsId = brigade.corps_id ?? 'unknown';
            ineffectiveByCorps[corpsId] = (ineffectiveByCorps[corpsId] ?? 0) + 1;
        }
    }
    for (const [corpsId, count] of Object.entries(ineffectiveByCorps)) {
        items.push({
            id: id(),
            severity: 'warning',
            category: 'personnel',
            title: `${count} brigade${count > 1 ? 's' : ''} combat ineffective in ${getCorpsLabel(corpsId)}`,
            detail: 'Personnel below 400 — cannot attack',
            corpsId,
            target: { type: 'corps', corpsId },
        });
    }

    const reserves = state.factionReserves?.[faction];
    if (reserves && (reserves.generalSupply ?? 100) < 30) {
        items.push({
            id: id(),
            severity: 'warning',
            category: 'supply',
            title: `Supply reserves LOW (${Math.round(reserves.generalSupply ?? 0)})`,
            detail: 'General supply critically low — operations constrained',
            target: { type: 'none' },
        });
    }

    if ((faction === 'RBiH' || faction === 'HRHB') && state.war_alliance_rbih_hrhb != null) {
        const alliance = state.war_alliance_rbih_hrhb;
        if (alliance < 0.5) {
            items.push({
                id: id(),
                severity: 'warning',
                category: 'diplomacy',
                title: `Alliance deteriorating (${(alliance * 100).toFixed(0)}%)`,
                detail: alliance < 0.2 ? 'War between factions imminent' : 'Cooperation strained',
                target: { type: 'none' },
            });
        }
    }

    for (const sector of sectors) {
        const brigadeCount =
            (sector.assigned_brigade_ids?.length ?? 0) +
            (sector.reserve_brigade_ids?.length ?? 0);
        const edgeCount = sector.edge_ids?.length ?? 0;
        if (brigadeCount < 2 && edgeCount > 4) {
            items.push({
                id: id(),
                severity: 'warning',
                category: 'defense',
                title: `Thin front: ${sectorLabel(sector.display_name)}`,
                detail: `${brigadeCount} brigade${brigadeCount !== 1 ? 's' : ''} covering ${edgeCount} edges`,
                corpsId: sector.corps_id,
                target: { type: 'sector', sectorId: sector.sector_id },
            });
        }
    }

    for (const operation of operations) {
        if (operation.phase === 'execution') {
            const captured = operation.current_objective_index ?? 0;
            const total = operation.objectives?.length ?? 0;
            items.push({
                id: id(),
                severity: 'info',
                category: 'operations',
                title: `Op ${operation.name ?? 'UNNAMED'} in execution`,
                detail: `${captured}/${total} objectives captured`,
                corpsId: operation.corps_id,
                target: {
                    type: 'operation',
                    operationKey: `${operation.corps_id}|${operation.name}`,
                },
            });
        }
    }

    items.push({
        id: id(),
        severity: 'info',
        category: 'territory',
        title: turnToDateString(state.turn ?? 0),
        detail: `${brigades.length} active brigades, ${operations.length} operations`,
        target: { type: 'none' },
    });

    const battles = state.latestTurnSummary?.battles ?? [];
    const factionBattles = battles.filter(
        (battle) =>
            battle.attacker_faction === faction || battle.defender_faction === faction,
    );
    if (factionBattles.length > 0) {
        items.push({
            id: id(),
            severity: 'info',
            category: 'combat',
            title: `${factionBattles.length} engagement${factionBattles.length > 1 ? 's' : ''} this turn`,
            detail: 'See battle reports for details',
            target: { type: 'none' },
        });
    }

    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    items.sort(
        (left, right) =>
            (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9),
    );

    return items.slice(0, MAX_ITEMS);
}
