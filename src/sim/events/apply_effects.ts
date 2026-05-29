/**
 * v0.4.1 Unified Event Effect System: apply mechanical effects to GameState.
 * Deterministic: effects sorted by kind before application; no timestamps or randomness.
 */

import type { GameState, FactionId, ControlEvent } from '../../state/game_state.js';
import type { EventEffect } from './event_types.js';
import type { EventConstraints } from './event_constraints.js';
import { getActiveAllianceBounds } from './active_modifiers.js';

/** Deterministic kind ordering for effect application (alphabetical).
 *  NOTE: alphabetic insertion shifts indices of every kind sorted after the
 *  new entry. Hash-stability on the historical 40w path is preserved because
 *  the new kind only fires on csq_weapons_embargo_partial_lift (turn>=60),
 *  which is outside the 40w window. The sort is stable, so prior kinds keep
 *  their relative order; only the absolute index numbers shift. */
const EFFECT_KIND_ORDER: Record<string, number> = {
    aggression_modifier: 0,
    alliance_change: 1,
    alliance_lock: 2,
    bot_priority_shift: 3,
    cohesion_change: 4,
    control_change: 5,
    cost_ledger_annotation: 6,
    doctrine_constraint: 7,
    equipment_grant: 8,
    equipment_quality_modifier: 9,
    guerrilla_threat: 10,
    humanitarian_impact: 11,
    morale_change: 12,
    narrative: 13,
    negotiation_capital: 14,
    offensive_ops_suppression: 15,
    patron_pressure: 16,
    recruitment_modifier: 17,
    supply_delta: 18,
};

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Apply event effects to GameState. Effects are sorted by kind for determinism.
 * Mutates state in place.
 */
export function applyEventEffects(state: GameState, effects: EventEffect[]): void {
    if (effects.length === 0) return;

    // Sort by kind for deterministic application order
    const sorted = [...effects].sort((a, b) => {
        const oa = EFFECT_KIND_ORDER[a.kind] ?? 99;
        const ob = EFFECT_KIND_ORDER[b.kind] ?? 99;
        return oa - ob;
    });

    for (const effect of sorted) {
        applySingleEffect(state, effect);
    }
}

function applySingleEffect(state: GameState, effect: EventEffect): void {
    switch (effect.kind) {
        case 'morale_change':
            applyMoraleChange(state, effect.faction, effect.delta);
            break;
        case 'supply_delta':
            applySupplyDelta(state, effect.faction, effect.delta);
            break;
        case 'cohesion_change':
            applyCohesionChange(state, effect.faction, effect.delta);
            break;
        case 'humanitarian_impact':
            applyHumanitarianImpact(state, effect.faction, effect.war_crimes_delta);
            break;
        case 'patron_pressure':
            applyPatronPressure(state, effect.faction, effect.delta);
            break;
        case 'alliance_change':
            applyAllianceChange(state, effect.delta);
            break;
        case 'negotiation_capital':
            applyNegotiationBreakdown(state, effect.faction, effect.dimension, effect.delta);
            break;
        case 'equipment_grant':
            applyEquipmentGrant(state, effect.faction, effect.tanks, effect.artillery, effect.aa_systems, effect.target_municipality);
            break;
        case 'aggression_modifier':
            applyAggressionModifier(state, effect.faction, effect.delta, effect.duration_turns);
            break;
        case 'control_change':
            applyControlChange(state, effect.faction, effect.osids);
            break;
        case 'guerrilla_threat':
            applyGuerrillaThreat(state, effect.faction, effect.municipalities, effect.intensity, effect.duration_turns);
            break;
        case 'recruitment_modifier':
            applyRecruitmentModifier(state, effect.faction, effect.pool_multiplier, effect.duration_turns);
            break;
        case 'equipment_quality_modifier':
            applyEquipmentQualityModifier(state, effect.faction, effect.multiplier, effect.duration_turns);
            break;
        case 'doctrine_constraint':
            applyDoctrineConstraint(state, effect.constraint, effect.duration_turns);
            break;
        case 'alliance_lock':
            applyAllianceLock(state, effect.mode, effect.value, effect.duration_turns);
            break;
        case 'bot_priority_shift':
            applyBotPriorityShift(state, effect.faction, effect.add_objectives, effect.remove_objectives, effect.duration_turns);
            break;
        case 'cost_ledger_annotation':
            applyCostLedgerAnnotation(state, effect.tag, effect.text, effect.faction);
            break;
        case 'offensive_ops_suppression':
            applyOffensiveOpsSuppression(state, effect.faction, effect.duration_turns, effect.reason);
            break;
        case 'narrative':
            // No mechanical effect; narrative text is logged via FiredEvent.
            break;
    }
}

/** Fall-1995 mechanic E-A5: push an offensive-ops suppression entry into
 *  `state.military.offensive_ops_suppressions`. Consumer: launch-gate in
 *  `sector_offensive.ts` reads via `isFactionOffensiveOpsSuppressed`.
 *  See `docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md` §3 E-A5. */
function applyOffensiveOpsSuppression(
    state: GameState,
    faction: FactionId,
    durationTurns: number,
    reason?: string,
): void {
    if (!state.military.offensive_ops_suppressions) {
        state.military.offensive_ops_suppressions = [];
    }
    const currentTurn = state.meta.turn ?? 0;
    state.military.offensive_ops_suppressions.push({
        faction,
        expires_turn: currentTurn + Math.max(0, durationTurns),
        reason,
    });
}

/** Apply morale delta to all active brigades of the given faction. Clamped [0, 100]. */
function applyMoraleChange(state: GameState, faction: FactionId, delta: number): void {
    const formations = state.military.formations;
    for (const fid of Object.keys(formations).sort()) {
        const f = formations[fid];
        if (f.faction === faction && f.status === 'active' && f.morale != null) {
            f.morale = clamp(f.morale + delta, 0, 100);
        }
    }
}

/** Apply cohesion delta to all active brigades of the given faction. Clamped [0, 100]. */
function applyCohesionChange(state: GameState, faction: FactionId, delta: number): void {
    const formations = state.military.formations;
    for (const fid of Object.keys(formations).sort()) {
        const f = formations[fid];
        if (f.faction === faction && f.status === 'active' && f.cohesion != null) {
            f.cohesion = clamp(f.cohesion + delta, 0, 100);
        }
    }
}

/** Add delta to faction's general supply reserve. Floor at 0. */
function applySupplyDelta(state: GameState, faction: FactionId, delta: number): void {
    if (!state.military.general_supply_reserve) return;
    const current = state.military.general_supply_reserve[faction] ?? 0;
    state.military.general_supply_reserve[faction] = Math.max(0, current + delta);
}

/** Adjust war_crimes_events in faction's negotiation capital. */
function applyHumanitarianImpact(state: GameState, faction: FactionId, warCrimesDelta?: number): void {
    if (warCrimesDelta == null) return;
    const neg = state.military.negotiation;
    if (!neg?.capital?.[faction]) return;
    const cap = neg.capital[faction];
    cap.war_crimes_events = (cap.war_crimes_events ?? 0) + warCrimesDelta;
}

/** Adjust patron support_level for faction's patron relationship. */
function applyPatronPressure(state: GameState, faction: FactionId, delta: number): void {
    const neg = state.military.negotiation;
    if (!neg?.patron_relationships?.[faction]) return;
    const rel = neg.patron_relationships[faction];
    rel.support_level = clamp(rel.support_level + delta, 0, 100);
}

/** Adjust RBiH-HRHB alliance value.
 *  Applies delta, clamps to [-1, 1], then clamps against any active
 *  alliance_locks (floor/ceiling). Active locks override any incoming delta
 *  that would push the value past them.
 *
 *  Clamp order is ceiling-then-floor so that floor wins when locks contradict
 *  (e.g. Washington Agreement floor=0.80 simultaneously active with a stale
 *  recovery-event ceiling=0.55). Floor is the stronger semantic guarantee —
 *  a minimum that must hold — so a contradictory ceiling cannot pull the
 *  value below it. */
function applyAllianceChange(state: GameState, delta: number): void {
    const current = state.political.war_alliance_rbih_hrhb ?? 0;
    let next = clamp(current + delta, -1, 1);
    const currentTurn = state.meta.turn ?? 0;
    const bounds = getActiveAllianceBounds(state, currentTurn);
    if (bounds.ceiling != null && next > bounds.ceiling) next = bounds.ceiling;
    if (bounds.floor != null && next < bounds.floor) next = bounds.floor;
    state.political.war_alliance_rbih_hrhb = next;
}

/** Grant equipment to a faction's best-equipped brigade (or one in target municipality).
 *  Equipment starts degraded (battlefield recovery / barracks seizure condition). */
function applyEquipmentGrant(
    state: GameState,
    faction: FactionId,
    tanks?: number,
    artillery?: number,
    aa_systems?: number,
    target_municipality?: string
): void {
    const formations = state.military.formations;
    const formationIds = Object.keys(formations).sort();

    // Find best recipient: prefer brigade in target municipality, else best-equipped
    let bestId: string | null = null;
    let bestScore = -1;

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.faction !== faction) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;
        if (!f.composition) continue;

        const munMatch = target_municipality && f.location_osid?.includes(`:${target_municipality}:`) ? 1000 : 0;
        const score = munMatch + (f.composition.tanks ?? 0) + (f.composition.artillery ?? 0);
        if (score > bestScore) { bestScore = score; bestId = fid; }
    }

    if (!bestId || !formations[bestId]?.composition) return;
    const comp = formations[bestId].composition!;

    if (tanks && tanks > 0) {
        const oldCount = comp.tanks;
        comp.tanks += tanks;
        // Seized equipment: 70% operational (barracks storage, some neglected)
        const frac = tanks / Math.max(1, comp.tanks);
        comp.tank_condition.operational = comp.tank_condition.operational * (1 - frac) + 0.7 * frac;
        comp.tank_condition.degraded = comp.tank_condition.degraded * (1 - frac) + 0.2 * frac;
        comp.tank_condition.non_operational = Math.max(0, 1 - comp.tank_condition.operational - comp.tank_condition.degraded);
    }
    if (artillery && artillery > 0) {
        comp.artillery += artillery;
        const frac = artillery / Math.max(1, comp.artillery);
        comp.artillery_condition.operational = comp.artillery_condition.operational * (1 - frac) + 0.7 * frac;
        comp.artillery_condition.degraded = comp.artillery_condition.degraded * (1 - frac) + 0.2 * frac;
        comp.artillery_condition.non_operational = Math.max(0, 1 - comp.artillery_condition.operational - comp.artillery_condition.degraded);
    }
    if (aa_systems && aa_systems > 0) {
        comp.aa_systems = (comp.aa_systems ?? 0) + aa_systems;
    }
}

/** Apply a temporary aggression modifier to a faction. Stored on state for consumption by bot AI. */
function applyAggressionModifier(
    state: GameState,
    faction: FactionId,
    delta: number,
    durationTurns: number
): void {
    if (!state.military.event_aggression_modifiers) {
        state.military.event_aggression_modifiers = [];
    }
    const mods = state.military.event_aggression_modifiers;
    const currentTurn = state.meta.turn ?? 0;
    mods.push({ faction, delta, expires_turn: currentTurn + durationTurns });
}

/** Flip OSID control to a faction. Used for barracks seizures, territorial events.
 *  Also records a ControlEvent so the GUI battle-markers layer and consistency
 *  assertions can track the flip. */
function applyControlChange(state: GameState, faction: FactionId, osids: string[]): void {
    const pc = state.political.political_controllers ??= {};
    const turn = state.meta?.turn ?? 0;
    for (const osid of osids) {
        const prev = pc[osid] ?? null;
        pc[osid] = faction;
        (state.political.control_events ??= []).push({
            turn,
            settlement_id: osid,
            mechanism: 'event',
            from: prev,
            to: faction,
            mun_id: osid.split(':')[1] ?? undefined,
        } satisfies ControlEvent);
    }
}

/** Adjust a specific negotiation capital dimension for a faction. */
function applyNegotiationBreakdown(
    state: GameState,
    faction: FactionId,
    dimension: string,
    delta: number
): void {
    const neg = state.military.negotiation;
    if (!neg?.capital?.[faction]) return;
    const cap = neg.capital[faction] as typeof neg.capital[typeof faction] & Record<string, unknown>;
    if (dimension in cap) {
        const current = cap[dimension];
        if (typeof current === 'number') {
            cap[dimension] = current + delta;
        }
    }
}

// ─── v0.9.0 Consequence System writers (Phase 1 Session 1) ──────────────────
// Consumers land in Phase 1 Session 2. Readers MUST filter by
// `expires_turn > currentTurn` because cleanup GC runs at most once per turn.

/** Push a guerrilla threat entry onto state.military.guerrilla_threats.
 *  Municipalities are sorted for deterministic serialization. Intensity is
 *  clamped to [0, 1]. */
function applyGuerrillaThreat(
    state: GameState,
    faction: FactionId,
    municipalities: string[],
    intensity: number,
    durationTurns: number
): void {
    if (!state.military.guerrilla_threats) {
        state.military.guerrilla_threats = [];
    }
    const currentTurn = state.meta.turn ?? 0;
    state.military.guerrilla_threats.push({
        faction,
        municipalities: [...municipalities].sort(),
        intensity: clamp(intensity, 0, 1),
        expires_turn: currentTurn + durationTurns,
    });
}

/** Push a recruitment modifier onto state.military.recruitment_modifiers.
 *  Multiplier is passed through unclamped — consumer stacks multiplicatively. */
function applyRecruitmentModifier(
    state: GameState,
    faction: FactionId,
    poolMultiplier: number,
    durationTurns: number
): void {
    if (!state.military.recruitment_modifiers) {
        state.military.recruitment_modifiers = [];
    }
    const currentTurn = state.meta.turn ?? 0;
    state.military.recruitment_modifiers.push({
        faction,
        pool_multiplier: poolMultiplier,
        expires_turn: currentTurn + durationTurns,
    });
}

/** Push an equipment-quality modifier onto state.military.equipment_quality_modifiers.
 *  Multiplier is passed through unclamped — consumer
 *  (`getActiveEquipmentQualityMultiplier` in active_modifiers.ts) stacks
 *  multiplicatively. Combat-math consumer gates `if (eqMult !== 1.0)` so the
 *  no-event historical path is byte-stable. */
function applyEquipmentQualityModifier(
    state: GameState,
    faction: FactionId,
    multiplier: number,
    durationTurns: number
): void {
    if (!state.military.equipment_quality_modifiers) {
        state.military.equipment_quality_modifiers = [];
    }
    const currentTurn = state.meta.turn ?? 0;
    state.military.equipment_quality_modifiers.push({
        faction,
        multiplier,
        expires_turn: currentTurn + durationTurns,
    });
}

/** Merge a constraint payload into the existing state.military.event_constraints
 *  bus. Stamps expires_turn on every pushed sub-entry using
 *  currentTurn + durationTurns, overriding any per-entry value in the payload.
 *  Each sub-entry owns its own `faction` field per EventConstraints contract. */
function applyDoctrineConstraint(
    state: GameState,
    constraint: EventConstraints,
    durationTurns: number
): void {
    if (!state.military.event_constraints) {
        state.military.event_constraints = {};
    }
    const bus = state.military.event_constraints;
    const currentTurn = state.meta.turn ?? 0;
    const expiresTurn = currentTurn + durationTurns;

    if (constraint.operation_blocks) {
        bus.operation_blocks ??= [];
        for (const entry of constraint.operation_blocks) {
            bus.operation_blocks.push({ ...entry, expires_turn: expiresTurn });
        }
    }
    if (constraint.doctrine_overrides) {
        bus.doctrine_overrides ??= [];
        for (const entry of constraint.doctrine_overrides) {
            bus.doctrine_overrides.push({ ...entry, expires_turn: expiresTurn });
        }
    }
    if (constraint.scope_restrictions) {
        bus.scope_restrictions ??= [];
        for (const entry of constraint.scope_restrictions) {
            bus.scope_restrictions.push({ ...entry, expires_turn: expiresTurn });
        }
    }
}

/** Push an alliance floor/ceiling lock onto state.military.alliance_locks.
 *  Value is clamped to the alliance's legal range [-1, 1]. */
function applyAllianceLock(
    state: GameState,
    mode: 'floor' | 'ceiling',
    value: number,
    durationTurns: number
): void {
    if (!state.military.alliance_locks) {
        state.military.alliance_locks = [];
    }
    const currentTurn = state.meta.turn ?? 0;
    state.military.alliance_locks.push({
        mode,
        value: clamp(value, -1, 1),
        expires_turn: currentTurn + durationTurns,
    });
}

/** Append an audit-only cost-ledger annotation. Read by `buildCostLedger`;
 *  never drives mechanical effects. The annotation is keyed by `tag` (a stable
 *  identifier) and tagged with the current turn for deterministic ordering.
 *  Single-writer: `applyEventEffects` only. Single-reader: `buildCostLedger`. */
function applyCostLedgerAnnotation(
    state: GameState,
    tag: string,
    text: string | undefined,
    faction: FactionId | undefined
): void {
    if (!state.military.cost_ledger_annotations) {
        state.military.cost_ledger_annotations = [];
    }
    const currentTurn = state.meta.turn ?? 0;
    state.military.cost_ledger_annotations.push({
        event_id: tag, // tag doubles as the stable identifier for the source event family
        tag,
        text,
        turn: currentTurn,
        faction,
    });
}

/** Push a bot priority shift onto state.military.bot_priority_shifts.
 *  Objective lists are sorted for deterministic serialization. */
function applyBotPriorityShift(
    state: GameState,
    faction: FactionId,
    addObjectives: string[] | undefined,
    removeObjectives: string[] | undefined,
    durationTurns: number
): void {
    if (!state.military.bot_priority_shifts) {
        state.military.bot_priority_shifts = [];
    }
    const currentTurn = state.meta.turn ?? 0;
    state.military.bot_priority_shifts.push({
        faction,
        add_objectives: addObjectives ? [...addObjectives].sort() : undefined,
        remove_objectives: removeObjectives ? [...removeObjectives].sort() : undefined,
        expires_turn: currentTurn + durationTurns,
    });
}
