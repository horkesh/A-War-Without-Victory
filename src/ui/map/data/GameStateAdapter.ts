/**
 * Adapter for loading and extracting data from a saved GameState (final_save.json).
 * Converts the rich GameState structure into the flat LoadedGameState view
 * needed by the map application.
 *
 * Migrated from legacy ui_legacy/data/GameStateAdapter.ts — import paths updated.
 */

import type {
    AoROrderView, AttackOrderView, CorpsFrontSectorView, FormationView, LoadedGameState,
    MilitiaPoolView, MovementOrderSettlementView, OperationView,
    ReconIntelligenceView, RepositionOrderView, RecruitmentView,
} from './types';
import { buildControlLookup, buildStatusLookup } from './ControlLookup';

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
    const phase = (meta.phase as string) ?? 'unknown';
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

    // War-phase: use formation location_osid. Peace/legacy: use brigade_aor. Accept phase_ii as war for backward compat.
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
            const corps_id = typeof f.corps_id === 'string' && f.corps_id ? f.corps_id : undefined;
            const movementState = rawMovementState?.[id] as { status?: string; stance?: string } | undefined;
            const movementStatus = (movementState?.status === 'packing' || movementState?.status === 'in_transit' || movementState?.status === 'unpacking')
                ? (movementState.status as 'packing' | 'in_transit' | 'unpacking')
                : 'deployed';
            const movementStance = movementState?.stance === 'column' ? 'column' : 'combat';

            formations.push({
                id, faction: (f.faction as string) ?? '', name: (f.name as string) ?? id,
                kind: (f.kind as string) ?? 'brigade', readiness: (f.readiness as string) ?? 'active',
                cohesion: (f.cohesion as number) ?? 100, fatigue: (ops?.fatigue as number) ?? 0,
                status: (f.status as string) ?? 'active', createdTurn: (f.created_turn as number) ?? 0,
                tags, municipalityId, hq_sid, location_osid, aorSettlementIds,
                personnel, posture, corps_id, movementStatus, movementStance,
            });
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
                operations.push({
                    corps_id: fv.id,
                    corps_name: fv.name,
                    faction: fv.faction,
                    name: op.name as string,
                    type: (op.type as string) ?? 'sector_attack',
                    phase: (op.phase as 'planning' | 'execution' | 'recovery') ?? 'execution',
                    sector_id: typeof op.sector_id === 'string' ? op.sector_id : undefined,
                    objectives: Array.isArray(op.objectives) ? (op.objectives as string[]).filter(o => typeof o === 'string') : undefined,
                    current_objective_index: typeof op.current_objective_index === 'number' ? op.current_objective_index : undefined,
                    momentum: typeof op.momentum === 'number' ? op.momentum : undefined,
                    participating_brigade_count: Array.isArray(op.participating_brigades) ? (op.participating_brigades as string[]).length : 0,
                    started_turn: typeof op.started_turn === 'number' ? op.started_turn : turn,
                    supply_readiness: typeof op.supply_readiness === 'number' ? op.supply_readiness : undefined,
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
            last_major_shift: finiteNumber(rawIvp.last_major_shift, turn),
        };
    }

    let phaseIiSupplyPressure: LoadedGameState['phaseIiSupplyPressure'] | undefined;
    const rawSupply = state.war_supply_pressure as Record<string, unknown> | undefined;
    if (rawSupply && typeof rawSupply === 'object' && !Array.isArray(rawSupply)) {
        const out: NonNullable<LoadedGameState['phaseIiSupplyPressure']> = {};
        for (const faction of Object.keys(rawSupply).sort((a, b) => a.localeCompare(b))) {
            out[faction] = finiteNumber(rawSupply[faction], 100);
        }
        if (Object.keys(out).length > 0) phaseIiSupplyPressure = out;
    }

    let phaseIiExhaustion: LoadedGameState['phaseIiExhaustion'] | undefined;
    const rawExhaustion = state.war_exhaustion as Record<string, unknown> | undefined;
    if (rawExhaustion && typeof rawExhaustion === 'object' && !Array.isArray(rawExhaustion)) {
        const out: NonNullable<LoadedGameState['phaseIiExhaustion']> = {};
        for (const faction of Object.keys(rawExhaustion).sort((a, b) => a.localeCompare(b))) {
            out[faction] = finiteNumber(rawExhaustion[faction], 0);
        }
        if (Object.keys(out).length > 0) phaseIiExhaustion = out;
    }

    const rbih_hrhb_war_earliest_turn = typeof meta?.rbih_hrhb_war_earliest_turn === 'number' ? meta.rbih_hrhb_war_earliest_turn : undefined;
    const war_alliance_rbih_hrhb = typeof state.war_alliance_rbih_hrhb === 'number' ? state.war_alliance_rbih_hrhb : undefined;
    const playerFaction = (meta?.player_faction as string | null | undefined) ?? null;

    const rawDesiredCap = state.brigade_desired_aor_cap as Record<string, number> | undefined;
    const brigadeDesiredAoRCap: Record<string, number> | undefined =
        rawDesiredCap && typeof rawDesiredCap === 'object' && !Array.isArray(rawDesiredCap)
            ? Object.fromEntries(Object.entries(rawDesiredCap).filter(([, v]) => typeof v === 'number' && v >= 1 && v <= 4).sort((a, b) => a[0].localeCompare(b[0])))
            : undefined;

    let reconIntelligence: ReconIntelligenceView | undefined;
    const rawRecon = state.recon_intelligence as Record<string, { detected_brigades?: Record<string, { strength_category?: string; detected_via?: string }>; confirmed_empty?: string[] }> | undefined;
    if (playerFaction && rawRecon?.[playerFaction]) {
        const r = rawRecon[playerFaction];
        const detected: ReconIntelligenceView['detected_brigades'] = {};
        if (r.detected_brigades && typeof r.detected_brigades === 'object') {
            for (const [sid, info] of Object.entries(r.detected_brigades).sort((a, b) => a[0].localeCompare(b[0]))) {
                detected[sid] = {
                    strength_category: typeof info?.strength_category === 'string' ? info.strength_category : 'moderate',
                    detected_via: typeof info?.detected_via === 'string' ? info.detected_via : 'recon',
                };
            }
        }
        reconIntelligence = { detected_brigades: detected, confirmed_empty: Array.isArray(r.confirmed_empty) ? [...r.confirmed_empty].sort() : [] };
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

    // Scan displacement_event_log for per-OSID per-faction departures
    const departedByOsid: LoadedGameState['departedByOsid'] = {};
    const rawEventLog = (state as Record<string, unknown>).displacement_event_log;
    if (Array.isArray(rawEventLog)) {
        for (const evt of rawEventLog as Array<Record<string, unknown>>) {
            const displaced = finiteNumber(evt.displaced);
            const originOsid = typeof evt.origin_osid === 'string' ? evt.origin_osid : '';
            const ethnicity = typeof evt.ethnicity === 'string' ? evt.ethnicity : '';
            if (displaced > 0 && originOsid && ethnicity) {
                if (!departedByOsid[originOsid]) departedByOsid[originOsid] = {};
                departedByOsid[originOsid][ethnicity] =
                    (departedByOsid[originOsid][ethnicity] ?? 0) + displaced;
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

    let enemyZocByFaction: LoadedGameState['enemyZocByFaction'];
    const rawEnemyZoc = state.war_enemy_zoc_by_faction as Record<string, string[]> | undefined;
    if (rawEnemyZoc && typeof rawEnemyZoc === 'object' && !Array.isArray(rawEnemyZoc)) {
        const out: Record<string, string[]> = {};
        for (const fid of Object.keys(rawEnemyZoc).sort((a, b) => a.localeCompare(b))) {
            const arr = rawEnemyZoc[fid];
            if (Array.isArray(arr)) out[fid] = [...arr].sort((a, b) => a.localeCompare(b));
        }
        if (Object.keys(out).length > 0) enemyZocByFaction = out;
    }

    let corpsFrontSectors: CorpsFrontSectorView[] | undefined;
    const rawSectors = state.corps_front_sectors as Record<string, Record<string, unknown>> | undefined;
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
            });
        }
        if (out.length > 0) corpsFrontSectors = out;
    }

    return {
        label, turn, phase, formations, militiaPools, controlBySettlement, statusBySettlement,
        brigadeAorByFormationId, brigadeFrontAssignment, theatres, armyTheatreAssignment,
        attackOrders, aorOrders, recentControlEvents, recruitment,
        armyStance, casualtyLedger, civilianCasualties, internationalVisibilityPressure, phaseIiSupplyPressure, phaseIiExhaustion,
        player_faction: playerFaction ?? undefined,
        rbih_hrhb_war_earliest_turn: rbih_hrhb_war_earliest_turn ?? null,
        war_alliance_rbih_hrhb: war_alliance_rbih_hrhb ?? null,
        brigadeDesiredAoRCap: brigadeDesiredAoRCap && Object.keys(brigadeDesiredAoRCap).length > 0 ? brigadeDesiredAoRCap : undefined,
        frontEdges: frontEdges && frontEdges.length > 0 ? frontEdges : undefined,
        frontEdgesOsid: frontEdgesOsid && frontEdgesOsid.length > 0 ? frontEdgesOsid : undefined,
        assignableFrontSegments, frontPressureByEdge,
        displacementByMun: Object.keys(displacementByMun).length > 0 ? displacementByMun : undefined,
        departedByOsid: departedByOsid && Object.keys(departedByOsid).length > 0 ? departedByOsid : undefined,
        reconIntelligence, enemyZocByFaction,
        movementOrdersSettlement: movementOrdersSettlement.length > 0 ? movementOrdersSettlement : undefined,
        repositionOrders: repositionOrders.length > 0 ? repositionOrders : undefined,
        corpsFrontSectors,
        operations: operations.length > 0 ? operations : undefined,
    };
}

