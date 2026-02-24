import type { FactionId, FormationRecord, GameSave } from '../types';

/** Parse canonical state JSON into the lighter 3D viewer shape. */
export function toViewerSave(raw: unknown): GameSave | null {
    if (!raw || typeof raw !== 'object') return null;
    const state = raw as Record<string, unknown>;
    const formationsRaw = (state.formations ?? {}) as Record<string, Record<string, unknown>>;
    const formations: Record<string, FormationRecord> = {};
    for (const id of Object.keys(formationsRaw).sort()) {
        const f = formationsRaw[id] ?? {};
        const movementState = ((state.brigade_movement_state ?? {}) as Record<string, Record<string, unknown>>)[id] ?? {};
        const compositionRaw = (f.composition ?? {}) as Record<string, unknown>;
        formations[id] = {
            id,
            faction: String(f.faction ?? ''),
            name: String(f.name ?? id),
            kind: String(f.kind ?? 'brigade'),
            personnel: Number(f.personnel ?? 0),
            cohesion: Number(f.cohesion ?? 0),
            fatigue: Number(f.fatigue ?? 0),
            posture: String(f.posture ?? 'defend'),
            hq_sid: String(f.hq_sid ?? ''),
            status: String(f.status ?? 'active'),
            corps_id: typeof f.corps_id === 'string' ? f.corps_id : undefined,
            location_osid: typeof (f as { location_osid?: string }).location_osid === 'string' && (f as { location_osid?: string }).location_osid ? (f as { location_osid?: string }).location_osid : undefined,
            movement_status: movementState.status as FormationRecord['movement_status'] | undefined,
            movement_stance: movementState.stance as FormationRecord['movement_stance'] | undefined,
            composition: {
                infantry: Number(compositionRaw.infantry ?? 0),
                tanks: Number(compositionRaw.tanks ?? 0),
                artillery: Number(compositionRaw.artillery ?? 0),
                aa_systems: Number(compositionRaw.aa_systems ?? 0),
            },
        };
    }
    const pcRaw = (state.political_controllers ?? {}) as Record<string, unknown>;
    const politicalControllers: Record<string, FactionId> = {};
    for (const sid of Object.keys(pcRaw).sort()) {
        const v = pcRaw[sid];
        politicalControllers[sid] = v === 'RS' || v === 'RBiH' || v === 'HRHB' ? v : null;
    }
    const phase = (state.meta as Record<string, unknown>)?.phase as string | undefined;
    const brigadeAor: Record<string, string | null> = {};
    if (phase === 'phase_ii') {
        for (const id of Object.keys(formationsRaw).sort()) {
            const loc = (formationsRaw[id] as { location_osid?: string }).location_osid;
            if (typeof loc === 'string' && loc) brigadeAor[loc] = id;
        }
    } else {
        const brigadeAorRaw = (state.brigade_aor ?? {}) as Record<string, unknown>;
        for (const sid of Object.keys(brigadeAorRaw).sort()) {
            const v = brigadeAorRaw[sid];
            brigadeAor[sid] = typeof v === 'string' ? v : null;
        }
    }
    const frontAssignmentRaw = (state.brigade_front_assignment ?? {}) as Record<string, unknown>;
    const brigadeFrontAssignment: Record<string, string | null> = {};
    for (const formationId of Object.keys(frontAssignmentRaw).sort()) {
        const v = frontAssignmentRaw[formationId];
        brigadeFrontAssignment[formationId] = typeof v === 'string' ? v : null;
    }
    const armyTheatreAssignmentRaw = (state.army_theatre_assignment ?? {}) as Record<string, unknown>;
    const armyTheatreAssignment: Record<string, string> = {};
    for (const armyId of Object.keys(armyTheatreAssignmentRaw).sort()) {
        const theatreId = armyTheatreAssignmentRaw[armyId];
        if (typeof theatreId === 'string' && theatreId.length > 0) {
            armyTheatreAssignment[armyId] = theatreId;
        }
    }
    const rawTheatres = (state.theatres ?? {}) as Record<string, Record<string, unknown>>;
    const theatres: Record<string, {
        id: string;
        name: string;
        faction: string;
        army_ids?: string[];
        region_scope?: string[];
    }> = {};
    for (const theatreId of Object.keys(rawTheatres).sort()) {
        const row = rawTheatres[theatreId] ?? {};
        const faction = typeof row.faction === 'string' ? row.faction : '';
        if (!faction) continue;
        const entry: {
            id: string;
            name: string;
            faction: string;
            army_ids?: string[];
            region_scope?: string[];
        } = {
            id: typeof row.id === 'string' && row.id.length > 0 ? row.id : theatreId,
            name: typeof row.name === 'string' && row.name.length > 0 ? row.name : `${faction} Theatre`,
            faction,
        };
        if (Array.isArray(row.army_ids)) {
            const armyIds = row.army_ids.filter((id): id is string => typeof id === 'string' && id.length > 0).sort();
            if (armyIds.length > 0) entry.army_ids = armyIds;
        }
        if (Array.isArray(row.region_scope)) {
            const regionScope = row.region_scope.filter((id): id is string => typeof id === 'string' && id.length > 0).sort();
            if (regionScope.length > 0) entry.region_scope = regionScope;
        }
        theatres[theatreId] = entry;
    }
    const csbsRaw = (state.control_status_by_settlement_id ?? {}) as Record<string, unknown>;
    const controlStatusBySettlementId: Record<string, string> = {};
    for (const sid of Object.keys(csbsRaw).sort()) {
        controlStatusBySettlementId[sid] = String(csbsRaw[sid] ?? 'controlled');
    }
    const reconIntelligenceRaw = (state.recon_intelligence ?? {}) as Record<string, {
        detected_brigades?: Record<string, { strength_category?: string; detected_via?: string }>;
        confirmed_empty?: string[];
    }>;
    const reconIntelligence: Record<string, {
        detected_brigades?: Record<string, { strength_category?: string; detected_via?: string }>;
        confirmed_empty?: string[];
    }> = {};
    for (const faction of Object.keys(reconIntelligenceRaw).sort()) {
        const factionRecon = reconIntelligenceRaw[faction];
        const detected = factionRecon?.detected_brigades ?? {};
        const detectedSorted: Record<string, { strength_category?: string; detected_via?: string }> = {};
        for (const sid of Object.keys(detected).sort()) {
            detectedSorted[sid] = {
                strength_category: typeof detected[sid]?.strength_category === 'string' ? detected[sid].strength_category : 'unknown',
                detected_via: typeof detected[sid]?.detected_via === 'string' ? detected[sid].detected_via : 'recon',
            };
        }
        reconIntelligence[faction] = {
            detected_brigades: detectedSorted,
            confirmed_empty: Array.isArray(factionRecon?.confirmed_empty) ? [...factionRecon.confirmed_empty].sort() : [],
        };
    }
    const displacementRaw = (state.settlement_displacement ?? {}) as Record<string, unknown>;
    const settlementDisplacement: Record<string, number> = {};
    for (const sid of Object.keys(displacementRaw).sort()) {
        const v = displacementRaw[sid];
        if (typeof v === 'number' && Number.isFinite(v)) {
            settlementDisplacement[sid] = Math.max(0, Math.min(1, v));
        }
    }
    const controlEventsRaw = Array.isArray(state.control_events) ? state.control_events as Array<Record<string, unknown>> : [];
    const controlEvents = controlEventsRaw
        .filter((ev) => typeof ev.turn === 'number' && typeof ev.settlement_id === 'string')
        .map((ev) => ({
            turn: ev.turn as number,
            settlement_id: ev.settlement_id as string,
            from: typeof ev.from === 'string' ? ev.from : null,
            to: typeof ev.to === 'string' ? ev.to : null,
            mechanism: typeof ev.mechanism === 'string' ? ev.mechanism : 'unknown',
            mun_id: typeof ev.mun_id === 'string' ? ev.mun_id : null,
        }))
        .sort((a, b) => {
            if (a.turn !== b.turn) return a.turn - b.turn;
            const mech = a.mechanism.localeCompare(b.mechanism);
            if (mech !== 0) return mech;
            return a.settlement_id.localeCompare(b.settlement_id);
        });
    const normalizeFrontEdges = (raw: unknown): Array<{ edge_id: string; a: string; b: string; side_a: FactionId; side_b: FactionId }> => {
        const frontEdgesRaw = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
        return frontEdgesRaw
            .map((edge) => {
                const a = typeof edge.a === 'string' ? edge.a : '';
                const b = typeof edge.b === 'string' ? edge.b : '';
                if (!a || !b) return null;
                const edgeId = typeof edge.edge_id === 'string' && edge.edge_id
                    ? edge.edge_id
                    : (a < b ? `${a}__${b}` : `${b}__${a}`);
                const sideA = edge.side_a === 'RS' || edge.side_a === 'RBiH' || edge.side_a === 'HRHB'
                    ? edge.side_a
                    : null;
                const sideB = edge.side_b === 'RS' || edge.side_b === 'RBiH' || edge.side_b === 'HRHB'
                    ? edge.side_b
                    : null;
                const [na, nb, nsa, nsb] = a < b ? [a, b, sideA, sideB] : [b, a, sideB, sideA];
                return {
                    edge_id: edgeId,
                    a: na,
                    b: nb,
                    side_a: nsa,
                    side_b: nsb,
                };
            })
            .filter((edge): edge is { edge_id: string; a: string; b: string; side_a: FactionId; side_b: FactionId } => edge !== null)
            .sort((a, b) => a.edge_id.localeCompare(b.edge_id));
    };
    const frontEdges = normalizeFrontEdges(state.front_edges);
    const frontEdgesOsid = normalizeFrontEdges((state as Record<string, unknown>).phase_ii_front_edges_osid);
    const assignableFrontSegmentsRaw = Array.isArray(state.assignable_front_segments)
        ? state.assignable_front_segments as Array<Record<string, unknown>>
        : [];
    const assignableFrontSegments: NonNullable<GameSave['assignable_front_segments']> = [];
    for (const segment of assignableFrontSegmentsRaw) {
        const frontId = typeof segment.front_id === 'string' ? segment.front_id : '';
        const edgeIdsRaw = Array.isArray(segment.edge_ids) ? segment.edge_ids : [];
        const edgeIds = edgeIdsRaw
            .map((id) => (typeof id === 'string' ? id : ''))
            .filter((id) => id.length > 0)
            .sort();
        if (!frontId || edgeIds.length === 0) continue;
        const sideA = segment.side_a === 'RS' || segment.side_a === 'RBiH' || segment.side_a === 'HRHB'
            ? segment.side_a
            : null;
        const sideB = segment.side_b === 'RS' || segment.side_b === 'RBiH' || segment.side_b === 'HRHB'
            ? segment.side_b
            : null;
        const lengthEdgesRaw = Number(segment.length_edges);
        const lengthEdges = Number.isFinite(lengthEdgesRaw) && lengthEdgesRaw > 0
            ? Math.floor(lengthEdgesRaw)
            : edgeIds.length;
        const name = typeof segment.name === 'string' && segment.name.length > 0 ? segment.name : undefined;
        const theatreId = typeof segment.theatre_id === 'string' && segment.theatre_id.length > 0
            ? segment.theatre_id
            : undefined;
        const entry: NonNullable<GameSave['assignable_front_segments']>[number] = {
            front_id: frontId,
            edge_ids: edgeIds,
            side_a: sideA,
            side_b: sideB,
            length_edges: lengthEdges,
        };
        if (name) entry.name = name;
        if (theatreId) entry.theatre_id = theatreId;
        assignableFrontSegments.push(entry);
    }
    assignableFrontSegments.sort((a, b) => a.front_id.localeCompare(b.front_id));
    const rawFrontPressure = (state.front_pressure ?? {}) as Record<string, Record<string, unknown>>;
    const frontPressure: Record<string, { edge_id: string; value: number; max_abs: number; last_updated_turn: number }> = {};
    for (const key of Object.keys(rawFrontPressure).sort()) {
        const item = rawFrontPressure[key] ?? {};
        const edgeId = typeof item.edge_id === 'string' && item.edge_id ? item.edge_id : key;
        const value = Number(item.value ?? 0);
        const maxAbs = Number(item.max_abs ?? Math.abs(value));
        const lastUpdatedTurn = Number(item.last_updated_turn ?? 0);
        frontPressure[edgeId] = {
            edge_id: edgeId,
            value: Number.isFinite(value) ? value : 0,
            max_abs: Number.isFinite(maxAbs) ? Math.max(1, maxAbs) : 1,
            last_updated_turn: Number.isFinite(lastUpdatedTurn) ? lastUpdatedTurn : 0,
        };
    }
    const meta = (state.meta ?? {}) as Record<string, unknown>;
    return {
        political_controllers: politicalControllers,
        control_status_by_settlement_id: controlStatusBySettlementId,
        formations,
        brigade_aor: brigadeAor,
        brigade_front_assignment: Object.keys(brigadeFrontAssignment).length > 0 ? brigadeFrontAssignment : undefined,
        theatres: Object.keys(theatres).length > 0 ? theatres : undefined,
        army_theatre_assignment: Object.keys(armyTheatreAssignment).length > 0 ? armyTheatreAssignment : undefined,
        front_edges: frontEdges.length > 0 ? frontEdges : undefined,
        phase_ii_front_edges_osid: frontEdgesOsid.length > 0 ? frontEdgesOsid : undefined,
        assignable_front_segments: assignableFrontSegments.length > 0 ? assignableFrontSegments : undefined,
        front_pressure: Object.keys(frontPressure).length > 0 ? frontPressure : undefined,
        player_faction: typeof meta.player_faction === 'string' ? meta.player_faction : null,
        recon_intelligence: reconIntelligence,
        settlement_displacement: settlementDisplacement,
        control_events: controlEvents,
        turn: typeof meta.turn === 'number' ? meta.turn : undefined,
        phase: typeof phase === 'string' && phase ? phase : undefined,
        rbih_hrhb_war_earliest_turn: typeof meta.rbih_hrhb_war_earliest_turn === 'number'
            ? meta.rbih_hrhb_war_earliest_turn
            : null,
        phase_i_alliance_rbih_hrhb: typeof state.phase_i_alliance_rbih_hrhb === 'number'
            ? state.phase_i_alliance_rbih_hrhb as number
            : null,
    };
}
