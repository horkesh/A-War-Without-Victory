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
    const brigadeAorRaw = (state.brigade_aor ?? {}) as Record<string, unknown>;
    const brigadeAor: Record<string, string | null> = {};
    for (const sid of Object.keys(brigadeAorRaw).sort()) {
        const v = brigadeAorRaw[sid];
        brigadeAor[sid] = typeof v === 'string' ? v : null;
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
    const meta = (state.meta ?? {}) as Record<string, unknown>;
    return {
        political_controllers: politicalControllers,
        control_status_by_settlement_id: controlStatusBySettlementId,
        formations,
        brigade_aor: brigadeAor,
        player_faction: typeof meta.player_faction === 'string' ? meta.player_faction : null,
        recon_intelligence: reconIntelligence,
        settlement_displacement: settlementDisplacement,
        control_events: controlEvents,
        turn: typeof meta.turn === 'number' ? meta.turn : undefined,
    };
}
