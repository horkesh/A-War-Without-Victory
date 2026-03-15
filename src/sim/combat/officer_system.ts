/**
 * Core officer system: named officer management, combat modifiers, succession.
 *
 * Tier 1 of the two-tier officer system. Named officers (corps and above)
 * provide per-corps combat modifiers and are managed through succession rules.
 *
 * Deterministic: officerHash for casualty checks, sorted iteration, no randomness.
 */

import type { FactionId, FormationState, GameState } from '../../state/game_state.js';
import type {
    NamedOfficer,
    NamedOfficerState,
    OfficerPoolTier,
    FactionOfficerConfig,
} from '../../state/officer_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getBrigadeOfficerMod } from './combat_math.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Modifier for acting/temporary commanders. */
const ACTING_COMMANDER_MOD = 0.92;

/** Incompatible corps penalty: -2 effective competence. */
const INCOMPATIBLE_PENALTY = 2;
/** Incompatible corps penalty duration. */
const INCOMPATIBLE_PENALTY_TURNS = 12;

/** Compatible corps penalty: -1 effective competence. */
const COMPATIBLE_PENALTY = 1;
/** Compatible corps penalty duration. */
const COMPATIBLE_PENALTY_TURNS = 8;

/** C.3: HVO political replacement delay (turns). */
const HVO_POLITICAL_REPLACEMENT_DELAY = 4;
/** C.3: HVO combat death replacement delay (turns). */
const HVO_COMBAT_DEATH_REPLACEMENT_DELAY = 1;

/** Pool tier succession priority ordering. */
const TIER_PRIORITY: Record<OfficerPoolTier, number> = {
    starter: 0,
    tier_a: 1,
    tier_b: 2,
    tier_c: 3,
};

// ═══════════════════════════════════════════════════════════════════════════
// Historical successor lookup
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the historical successor for a departing officer.
 * Looks for the next officer with the same home_corps_id, available this turn,
 * not yet in state, prioritized by pool_tier.
 */
function findHistoricalSuccessor(
    departing: NamedOfficer,
    allOfficers: NamedOfficer[],
    currentState: Record<string, NamedOfficerState>,
    turn: number,
): NamedOfficer | null {
    const corpsId = departing.home_corps_id;
    if (!corpsId) return null;

    const candidates = allOfficers
        .filter(o =>
            o.id !== departing.id &&
            o.faction === departing.faction &&
            o.home_corps_id === corpsId &&
            o.available_from_turn <= turn &&
            (o.available_until_turn === undefined || o.available_until_turn > turn) &&
            (!currentState[o.id] || currentState[o.id].status === 'reserve')
        )
        .sort((a, b) => {
            const tierDiff = (TIER_PRIORITY[a.pool_tier] ?? 99) - (TIER_PRIORITY[b.pool_tier] ?? 99);
            if (tierDiff !== 0) return tierDiff;
            return a.id.localeCompare(b.id);
        });

    return candidates[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Deterministic hash for casualty checks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deterministic hash for officer casualty vulnerability checks.
 * Produces a stable [0,1) value from (turn, officerId).
 * NOT random — same inputs always produce same output.
 */
export function officerHash(turn: number, officerId: string): number {
    let hash = 5381;
    const combined = `${turn}:${officerId}`;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) + hash + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(hash % 10000) / 10000;
}

// ═══════════════════════════════════════════════════════════════════════════
// Officer lookups
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the named officer currently commanding a corps.
 * Returns null if no named officer is assigned.
 */
export function getCorpsCommander(
    corpsId: string,
    state: GameState
): { data: NamedOfficer; state: NamedOfficerState } | null {
    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return null;

    const officerIds = Object.keys(officers).sort(strictCompare);
    for (const id of officerIds) {
        const os = officers[id]!;
        if (os.status === 'active' && os.assigned_corps_id === corpsId) {
            const data = officerData.find(o => o.id === id);
            if (data) return { data, state: os };
        }
    }
    return null;
}

/**
 * Get the army-level commander for a faction.
 */
export function getArmyCommander(
    faction: FactionId,
    state: GameState
): { data: NamedOfficer; state: NamedOfficerState } | null {
    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return null;

    const officerIds = Object.keys(officers).sort(strictCompare);
    for (const id of officerIds) {
        const os = officers[id]!;
        if (os.status !== 'active') continue;
        const data = officerData.find(o => o.id === id);
        if (data && data.faction === faction && data.rank === 'army_commander') {
            return { data, state: os };
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Effective competence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get effective competence of an officer, accounting for assignment penalties.
 * Clamped to [1, 5].
 */
export function getEffectiveCompetence(os: NamedOfficerState, data: NamedOfficer): number {
    const penalty = os.penalty_turns_remaining > 0 ? os.effective_competence_penalty : 0;
    return Math.max(1, Math.min(5, data.competence - penalty));
}

// ═══════════════════════════════════════════════════════════════════════════
// Combat modifiers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Corps commander attack modifier.
 * attack_mod = 0.90 + comp×0.03 + agg×0.01
 * Acting commanders get a flat 0.92.
 */
export function getCorpsCommanderAttackMod(data: NamedOfficer, os: NamedOfficerState): number {
    if (os.acting_commander) return ACTING_COMMANDER_MOD;
    const comp = getEffectiveCompetence(os, data);
    return 0.90 + comp * 0.03 + data.aggressiveness * 0.01;
}

/**
 * Corps commander defense modifier.
 * defense_mod = 0.90 + comp×0.03 + def×0.01
 * Acting commanders get a flat 0.92.
 */
export function getCorpsCommanderDefenseMod(data: NamedOfficer, os: NamedOfficerState): number {
    if (os.acting_commander) return ACTING_COMMANDER_MOD;
    const comp = getEffectiveCompetence(os, data);
    return 0.90 + comp * 0.03 + data.defensive_skill * 0.01;
}

/**
 * Combined Tier 1 × Tier 2 officer modifier for a formation.
 *
 * If named officers are present and the formation's corps has a named commander,
 * uses the corps commander modifier × brigade officer mod.
 * Otherwise falls back to brigade officer mod alone.
 */
export function getOfficerCombatMod(
    formation: FormationState,
    state: GameState,
    role: 'attack' | 'defend'
): number {
    const turn = state.meta?.turn ?? 0;
    const brigadeOfficerMod = getBrigadeOfficerMod(formation, turn);

    // Check for named corps commander
    const corpsId = formation.corps_id;
    if (!corpsId || !state.military.named_officers || !state.military.named_officer_data) {
        return brigadeOfficerMod;
    }

    const commander = getCorpsCommander(corpsId, state);
    if (!commander) return brigadeOfficerMod;

    const corpsMod = role === 'attack'
        ? getCorpsCommanderAttackMod(commander.data, commander.state)
        : getCorpsCommanderDefenseMod(commander.data, commander.state);

    return brigadeOfficerMod * corpsMod;
}

// ═══════════════════════════════════════════════════════════════════════════
// Operation commander
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Select an available officer to command an operation.
 *
 * Selection priority:
 *   1. Reserve officers with matching home_corps_id (regional match)
 *   2. Reserve officers with compatible_corps_ids containing the corps
 *   3. Any reserve officer of the same faction
 *
 * Within each tier: sort by competence (desc), aggressiveness (desc), then id.
 * Returns null if no officer is available.
 */
/**
 * Map corps IDs to the enclave they are physically located in (if any).
 * Officers with an enclave_lock can only command ops in corps within the same enclave.
 */
const CORPS_ENCLAVE_MAP: Record<string, string> = {
    // ARBiH 1st Corps — besieged in Sarajevo
    arbih_1st_corps: 'sarajevo',
    // ARBiH 5th Corps — isolated in Bihać pocket
    arbih_5th_corps: 'bihac',
    // VRS Sarajevo-Romanija Corps — locked to Sarajevo siege ring
    vrs_sarajevo_romanija: 'sarajevo_ring',
    // HVO OZ Posavina — isolated in Orasje pocket
    hvo_oz_posavina: 'orasje',
    // Note: Srebrenica is subordinate to 2nd Corps but geographically isolated.
    // Officers locked to 'srebrenica' can only command ops if the corps operating sector
    // overlaps Srebrenica. For now, this is handled by the home_corps_id filter:
    // Orić has home_corps_id=arbih_2nd_corps but enclave_lock=srebrenica.
    // Since arbih_2nd_corps is NOT in CORPS_ENCLAVE_MAP, Orić is filtered out
    // from all 2nd Corps ops (he can't leave Srebrenica to reach Tuzla).
};

/** Check whether an enclave-locked officer can command ops for a given corps. */
function isEnclaveCompatible(data: NamedOfficer, corpsId: string, currentTurn: number): boolean {
    if (!data.enclave_lock) return true; // No lock — always compatible
    // Lock expired (enclave broke out / officer evacuated)
    if (data.enclave_lock.locked_until_turn !== undefined && currentTurn >= data.enclave_lock.locked_until_turn) return true;
    // Corps is in the same enclave as the officer
    const corpsEnclave = CORPS_ENCLAVE_MAP[corpsId];
    return corpsEnclave === data.enclave_lock.enclave_id;
}

export function selectOperationCommander(
    state: GameState,
    corpsId: string,
    faction: FactionId,
): string | null {
    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return null;

    const currentTurn = state.meta?.turn ?? 0;
    const candidates: NamedOfficer[] = [];

    for (const data of officerData) {
        if (data.faction !== faction) continue;
        // Only corps_commander rank can command ops (not army/deputy).
        //
        // DESIGN NOTE: In real Bosnian War doctrine, the corps commander (Merdan,
        // Bahto, Mutevelija) does NOT personally lead the assault — he directs the
        // operation from HQ while delegating tactical command to a brigade CO or
        // a designated operational-group commander. The current model uses the
        // `corps_commander` pool as a proxy for "senior officer capable of
        // commanding an operation", which works for the 1992-1993 chaotic period
        // but becomes inaccurate as the war professionalises. Future work: add a
        // `tactical_commander` rank tier (brigade COs who actually lead assaults)
        // and reserve `corps_commander` pool for the planning/modifier role only.
        if (data.rank !== 'corps_commander') continue;

        const os = officers[data.id];
        if (!os || os.status !== 'reserve') continue;
        // Already commanding another operation
        if (os.assigned_operation) continue;
        // Enclave lock: officer physically cannot reach this corps
        if (!isEnclaveCompatible(data, corpsId, currentTurn)) continue;

        candidates.push(data);
    }

    if (candidates.length === 0) return null;

    // Sort: home corps match > compatible > other, then competence, then aggressiveness, then id
    candidates.sort((a, b) => {
        const aHome = a.home_corps_id === corpsId ? 0 : 1;
        const bHome = b.home_corps_id === corpsId ? 0 : 1;
        if (aHome !== bHome) return aHome - bHome;

        const aCompat = a.compatible_corps_ids?.includes(corpsId) ? 0 : 1;
        const bCompat = b.compatible_corps_ids?.includes(corpsId) ? 0 : 1;
        if (aCompat !== bCompat) return aCompat - bCompat;

        if (a.competence !== b.competence) return b.competence - a.competence;
        if (a.aggressiveness !== b.aggressiveness) return b.aggressiveness - a.aggressiveness;
        return strictCompare(a.id, b.id);
    });

    return candidates[0]!.id;
}

/**
 * Assign a selected commander to an operation and update officer state.
 */
export function assignOperationCommander(
    state: GameState,
    op: import('../../state/game_state.js').CorpsOperation,
    corpsId: string,
    faction: FactionId,
): void {
    const commanderId = selectOperationCommander(state, corpsId, faction);
    if (!commanderId) return;

    op.commander_officer_id = commanderId;
    const os = state.military.named_officers?.[commanderId];
    if (os) {
        os.status = 'active';
        os.assigned_operation = op.name;
    }
}

/**
 * Release an operation commander back to reserve when the operation ends.
 */
export function releaseOperationCommander(
    state: GameState,
    op: import('../../state/game_state.js').CorpsOperation,
): void {
    if (!op.commander_officer_id) return;
    const officers = state.military.named_officers;
    if (!officers) return;

    const os = officers[op.commander_officer_id];
    if (os && os.assigned_operation) {
        os.status = 'reserve';
        os.assigned_operation = undefined;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize named officers on GameState.
 * Assigns historical starters to their corps; places pool officers in reserve.
 */
export function initializeNamedOfficers(
    state: GameState,
    officerData: NamedOfficer[]
): void {
    state.military.named_officer_data = officerData;
    state.military.named_officers = {};
    const turn = state.meta?.turn ?? 0;

    // Sort for determinism
    const sorted = [...officerData].sort((a, b) => strictCompare(a.id, b.id));

    for (const officer of sorted) {
        // Skip officers not yet available
        if (officer.available_from_turn > turn) continue;
        // Skip officers already departed
        if (officer.available_until_turn !== undefined && officer.available_until_turn <= turn) continue;

        const isStarter = officer.is_historical_start === true;
        const assignedCorps = isStarter && officer.historical_corps_id
            ? officer.historical_corps_id
            : null;

        state.military.named_officers[officer.id] = {
            officer_id: officer.id,
            status: isStarter || assignedCorps ? 'active' : 'reserve',
            assigned_corps_id: assignedCorps,
            turns_in_command: 0,
            battles: 0,
            victories: 0,
            effective_competence_penalty: 0,
            penalty_turns_remaining: 0,
            acting_commander: false,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Succession
// ═══════════════════════════════════════════════════════════════════════════

export interface OfficerSuccessionReport {
    departures: string[];
    casualties: string[];
    replacements: Array<{ corps_id: string; old_officer: string; new_officer: string }>;
    new_arrivals: string[];
    generic_replacements: number;
}

/**
 * Process officer succession for one turn.
 *
 * 1. Process historical departures (available_until_turn).
 *    - Bot factions: auto-retire. Player faction: create replacement_suggested event.
 * 2. Check for newly available officers (available_from_turn).
 *    - Player faction: create officer_available notification event.
 * 3. Casualty checks for active officers in corps that fought.
 * 4. Fill vacant corps commands from pool.
 */
export function processOfficerSuccession(
    state: GameState,
    engagedCorpsIds: Set<string>
): OfficerSuccessionReport {
    const report: OfficerSuccessionReport = {
        departures: [],
        casualties: [],
        replacements: [],
        new_arrivals: [],
        generic_replacements: 0,
    };

    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return report;

    const turn = state.meta?.turn ?? 0;
    const playerFaction = state.meta?.player_faction ?? null;

    // Ensure pending_officer_events array exists
    if (!state.military.pending_officer_events) {
        state.military.pending_officer_events = [];
    }
    const pendingEvents = state.military.pending_officer_events;

    // 1. Historical departures
    for (const data of officerData) {
        const os = officers[data.id];
        if (!os || os.status !== 'active' && os.status !== 'reserve') continue;
        if (data.available_until_turn !== undefined && turn >= data.available_until_turn) {
            // Player faction: don't auto-retire, create a replacement_suggested event instead
            if (data.faction === playerFaction && os.status === 'active' && os.assigned_corps_id) {
                // Find the suggested replacement (next officer for this corps by tier)
                const suggestedReplacement = findHistoricalSuccessor(data, officerData, officers, turn);
                if (suggestedReplacement) {
                    const eventId = `replacement_${data.id}_t${turn}`;
                    const alreadyPending = pendingEvents.some(e => e.event_id === eventId);
                    if (!alreadyPending) {
                        pendingEvents.push({
                            event_id: eventId,
                            type: 'replacement_suggested',
                            faction: data.faction,
                            turn,
                            officer_id: suggestedReplacement.id,
                            current_commander_id: data.id,
                            corps_id: os.assigned_corps_id,
                            acknowledged: false,
                        });
                    }
                }
                // Don't retire — player decides
                continue;
            }

            os.status = 'retired';
            if (os.assigned_corps_id) {
                os.assigned_corps_id = null;
            }
            report.departures.push(data.id);
        }
    }

    // 2. New arrivals
    for (const data of officerData) {
        if (officers[data.id]) continue; // Already in state
        if (data.available_from_turn <= turn) {
            const isExpired = data.available_until_turn !== undefined && data.available_until_turn <= turn;
            if (isExpired) continue;

            officers[data.id] = {
                officer_id: data.id,
                status: 'reserve',
                assigned_corps_id: null,
                turns_in_command: 0,
                battles: 0,
                victories: 0,
                effective_competence_penalty: 0,
                penalty_turns_remaining: 0,
                acting_commander: false,
            };
            report.new_arrivals.push(data.id);

            // Player faction: notify about new officer availability
            if (data.faction === playerFaction) {
                const eventId = `arrival_${data.id}_t${turn}`;
                const alreadyPending = pendingEvents.some(e => e.event_id === eventId);
                if (!alreadyPending) {
                    pendingEvents.push({
                        event_id: eventId,
                        type: 'officer_available',
                        faction: data.faction,
                        turn,
                        officer_id: data.id,
                        acknowledged: false,
                    });
                }
            }
        }
    }

    // 3. Casualty checks for corps that fought
    const officerIds = Object.keys(officers).sort(strictCompare);
    for (const id of officerIds) {
        const os = officers[id]!;
        if (os.status !== 'active') continue;
        if (!os.assigned_corps_id || !engagedCorpsIds.has(os.assigned_corps_id)) continue;

        const data = officerData.find(o => o.id === id);
        if (!data) continue;

        const hash = officerHash(turn, id);
        if (hash < data.casualty_vulnerability * 0.1) {
            // Officer killed/captured
            os.status = 'killed';
            os.assigned_corps_id = null;
            report.casualties.push(id);
        }
    }

    // 4. Advance turns_in_command and reduce penalties
    for (const id of officerIds) {
        const os = officers[id]!;
        if (os.status !== 'active') continue;
        if (os.assigned_corps_id) {
            os.turns_in_command++;
            if (os.penalty_turns_remaining > 0) {
                os.penalty_turns_remaining--;
            }
        }
    }

    // 5. Fill vacant corps commands
    // C.3: HVO Zagreb delay — track whether vacancy was from combat or non-combat
    const combatCasualtiesThisTurn = new Set(report.casualties);
    const departureFactions = new Map<string, FactionId>();
    for (const depId of report.departures) {
        const depData = officerData.find(o => o.id === depId);
        if (depData) departureFactions.set(depId, depData.faction);
    }

    const formations = state.military.formations ?? {};
    const corpsFormationIds = Object.keys(formations)
        .filter(id => {
            const f = formations[id]!;
            return (f.kind === 'corps_asset' || f.kind === 'army_hq') && f.status === 'active';
        })
        .sort(strictCompare);

    for (const corpsFormId of corpsFormationIds) {
        const corpsFormation = formations[corpsFormId]!;
        if (corpsFormation.kind !== 'corps_asset') continue;

        const existingCommander = getCorpsCommander(corpsFormId, state);
        if (existingCommander) {
            // C.3: HVO acting commanders get replaced once their delay is served
            if (existingCommander.state.acting_commander && existingCommander.data.faction === 'HRHB') {
                // D.4: Read delays from war_timeline if available, else hardcoded fallback
                const hvoConfig = state.military.war_timeline?.officer_config?.HRHB;
                const politicalDelay = hvoConfig?.political_replacement_delay ?? HVO_POLITICAL_REPLACEMENT_DELAY;
                const combatDelay = hvoConfig?.combat_death_replacement_delay ?? HVO_COMBAT_DEATH_REPLACEMENT_DELAY;
                // Acting commander: check if enough turns have passed
                const requiredDelay = existingCommander.data.id.startsWith('generic_combat_')
                    ? combatDelay : politicalDelay;
                if (existingCommander.state.turns_in_command < requiredDelay) continue;
                // Delay served — retire acting, look for pool replacement below
                existingCommander.state.status = 'retired';
                existingCommander.state.assigned_corps_id = null;
            } else {
                continue;
            }
        }

        // Find best available replacement from pool
        const faction = corpsFormation.faction as FactionId;
        const replacement = findBestReplacement(officers, officerData, faction, corpsFormId);

        if (replacement) {
            const os = officers[replacement.id]!;
            os.status = 'active';
            os.assigned_corps_id = corpsFormId;
            os.turns_in_command = 0;
            os.acting_commander = false;

            // Compute assignment penalty
            const isHome = replacement.home_corps_id === corpsFormId;
            const isCompatible = replacement.compatible_corps_ids?.includes(corpsFormId) ?? false;

            if (!isHome && !isCompatible) {
                os.effective_competence_penalty = INCOMPATIBLE_PENALTY;
                os.penalty_turns_remaining = INCOMPATIBLE_PENALTY_TURNS;
            } else if (!isHome && isCompatible) {
                os.effective_competence_penalty = COMPATIBLE_PENALTY;
                os.penalty_turns_remaining = COMPATIBLE_PENALTY_TURNS;
            } else {
                os.effective_competence_penalty = 0;
                os.penalty_turns_remaining = 0;
            }

            report.replacements.push({
                corps_id: corpsFormId,
                old_officer: '',
                new_officer: replacement.id,
            });
        } else {
            // No pool officer available — create generic acting replacement
            // C.3: HVO uses combat-death or political prefix to track delay source
            const wasCombatDeath = [...combatCasualtiesThisTurn].some(id => {
                const d = officerData.find(o => o.id === id);
                return d && d.faction === faction;
            });
            const prefix = faction === 'HRHB' && wasCombatDeath ? 'generic_combat_' : 'generic_';
            const genericId = `${prefix}${faction}_${corpsFormId}_t${turn}`;
            // D.4: Read generic replacement competence from war_timeline if available
            const factionConfig = state.military.war_timeline?.officer_config?.[faction];
            const genericComp = factionConfig?.generic_replacement_competence ?? 2;

            const genericData: NamedOfficer = {
                id: genericId,
                name: `Acting Commander (${corpsFormId})`,
                faction,
                rank: 'corps_commander',
                competence: genericComp,
                aggressiveness: 3,
                defensive_skill: 2,
                political_reliability: 3,
                home_corps_id: corpsFormId,
                available_from_turn: turn,
                origin: 'military',
                casualty_vulnerability: 0.15,
                can_improve: true,
                improvement_rate: 0.06,
                pool_tier: 'tier_c',
            };
            officerData.push(genericData);
            officers[genericId] = {
                officer_id: genericId,
                status: 'active',
                assigned_corps_id: corpsFormId,
                turns_in_command: 0,
                battles: 0,
                victories: 0,
                effective_competence_penalty: 0,
                penalty_turns_remaining: 0,
                acting_commander: true,
            };
            report.generic_replacements++;
        }
    }

    return report;
}

/**
 * Find best available replacement officer for a corps.
 * Priority: pool_tier (starter > tier_a > tier_b > tier_c), then competence, then home corps match.
 */
function findBestReplacement(
    officers: Record<string, NamedOfficerState>,
    officerData: NamedOfficer[],
    faction: FactionId,
    corpsId: string
): NamedOfficer | null {
    const candidates: NamedOfficer[] = [];

    for (const data of officerData) {
        if (data.faction !== faction) continue;
        if (data.rank === 'army_commander' || data.rank === 'deputy') continue;

        const os = officers[data.id];
        if (!os || os.status !== 'reserve') continue;

        candidates.push(data);
    }

    if (candidates.length === 0) return null;

    // Sort by: home corps match, then pool tier, then competence desc, then id.
    // C.3: HVO sorts by political_reliability first (before competence).
    candidates.sort((a, b) => {
        // Home corps match
        const aHome = a.home_corps_id === corpsId ? 0 : 1;
        const bHome = b.home_corps_id === corpsId ? 0 : 1;
        if (aHome !== bHome) return aHome - bHome;

        // Compatible corps match
        const aCompat = a.compatible_corps_ids?.includes(corpsId) ? 0 : 1;
        const bCompat = b.compatible_corps_ids?.includes(corpsId) ? 0 : 1;
        if (aCompat !== bCompat) return aCompat - bCompat;

        // Pool tier
        const aTier = TIER_PRIORITY[a.pool_tier] ?? 99;
        const bTier = TIER_PRIORITY[b.pool_tier] ?? 99;
        if (aTier !== bTier) return aTier - bTier;

        // C.3: HVO — political_reliability first, then competence
        if (faction === 'HRHB') {
            if (a.political_reliability !== b.political_reliability) return b.political_reliability - a.political_reliability;
        }

        // Competence (higher first)
        if (a.competence !== b.competence) return b.competence - a.competence;

        // Deterministic tie-break
        return strictCompare(a.id, b.id);
    });

    return candidates[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate raw officer data from JSON.
 * Returns validated NamedOfficer[] or throws on invalid data.
 */
export function validateOfficerData(raw: unknown): NamedOfficer[] {
    if (!raw || typeof raw !== 'object') throw new Error('Officer data must be an object');
    const obj = raw as Record<string, unknown>;
    const officers = obj.officers;
    if (!Array.isArray(officers)) throw new Error('Officer data must have an "officers" array');

    const result: NamedOfficer[] = [];
    const seenIds = new Set<string>();
    const validFactions: FactionId[] = ['RBiH', 'RS', 'HRHB'];

    for (let i = 0; i < officers.length; i++) {
        const o = officers[i] as Record<string, unknown>;
        if (!o || typeof o !== 'object') throw new Error(`Officer at index ${i} is not an object`);

        const id = o.id;
        if (typeof id !== 'string' || !id) throw new Error(`Officer at index ${i}: missing id`);
        if (seenIds.has(id)) throw new Error(`Duplicate officer id: ${id}`);
        seenIds.add(id);

        const faction = o.faction as FactionId;
        if (!validFactions.includes(faction)) throw new Error(`Officer ${id}: invalid faction ${faction}`);

        const clampRating = (val: unknown, field: string): number => {
            const n = typeof val === 'number' ? val : 3;
            if (n < 1 || n > 5) throw new Error(`Officer ${id}: ${field} must be 1-5, got ${n}`);
            return n;
        };

        result.push({
            id,
            name: String(o.name ?? id),
            faction,
            rank: (o.rank as NamedOfficer['rank']) ?? 'corps_commander',
            competence: clampRating(o.competence, 'competence'),
            aggressiveness: clampRating(o.aggressiveness, 'aggressiveness'),
            defensive_skill: clampRating(o.defensive_skill, 'defensive_skill'),
            political_reliability: clampRating(o.political_reliability, 'political_reliability'),
            home_corps_id: typeof o.home_corps_id === 'string' ? o.home_corps_id : undefined,
            compatible_corps_ids: Array.isArray(o.compatible_corps_ids)
                ? (o.compatible_corps_ids as unknown[]).filter((x): x is string => typeof x === 'string')
                : undefined,
            available_from_turn: typeof o.available_from_turn === 'number' ? o.available_from_turn : 0,
            available_until_turn: typeof o.available_until_turn === 'number' ? o.available_until_turn : undefined,
            is_historical_start: o.is_historical_start === true,
            historical_corps_id: typeof o.historical_corps_id === 'string' ? o.historical_corps_id : undefined,
            origin: (o.origin as NamedOfficer['origin']) ?? 'military',
            casualty_vulnerability: typeof o.casualty_vulnerability === 'number'
                ? Math.max(0, Math.min(1, o.casualty_vulnerability)) : 0.1,
            can_improve: o.can_improve === true,
            improvement_rate: typeof o.improvement_rate === 'number' ? o.improvement_rate : 0,
            pool_tier: (o.pool_tier as OfficerPoolTier) ?? 'tier_c',
            enclave_lock: parseEnclaveLock(o.enclave_lock, id),
            war_crimes_record: parseWarCrimesRecord(o.war_crimes_record),
        });
    }

    return result;
}

function parseEnclaveLock(raw: unknown, officerId: string): NamedOfficer['enclave_lock'] {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw !== 'object') throw new Error(`Officer ${officerId}: enclave_lock must be an object`);
    const lock = raw as Record<string, unknown>;
    if (typeof lock.enclave_id !== 'string' || !lock.enclave_id) {
        throw new Error(`Officer ${officerId}: enclave_lock.enclave_id must be a non-empty string`);
    }
    if (lock.locked_until_turn !== undefined && typeof lock.locked_until_turn !== 'number') {
        throw new Error(`Officer ${officerId}: enclave_lock.locked_until_turn must be a number`);
    }
    return {
        enclave_id: lock.enclave_id,
        locked_until_turn: lock.locked_until_turn as number | undefined,
    };
}

function parseWarCrimesRecord(raw: unknown): NamedOfficer['war_crimes_record'] {
    if (raw === undefined || raw === null) return undefined;
    if (typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    if (typeof r.court !== 'string' || typeof r.verdict !== 'string') return undefined;
    return {
        court: r.court as 'ICTY' | 'BiH State Court',
        verdict: r.verdict as 'convicted' | 'acquitted' | 'died_before_trial' | 'indicted',
        sentence: typeof r.sentence === 'string' ? r.sentence : undefined,
        charges: typeof r.charges === 'string' ? r.charges : '',
        summary: typeof r.summary === 'string' ? r.summary : '',
    };
}
