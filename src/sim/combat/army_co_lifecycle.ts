/**
 * A4 — Browser-safe Army CO roster behavior + emergent lifecycle
 * LANE-NIGHTSHIFT-A4-ARMY-CO-ROSTER-PERSONALITIES
 *
 * Authoritative DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
 * (eee308e0).
 *
 * Predecessors:
 *   A1 closeout: 18136710 (CampaignPlan wiring regression net)
 *   A2 closeout: ba6955bf (substrate fields + validators)
 *   A3 closeout: c8ff93d8 (army-level Order Interpretation + autonomous launch)
 *
 * What A4 ships:
 *   1. applyRosterToOfficers(state, roster) — populate `stubbornness` on
 *      NamedOfficer entries; populate per-faction `override_tolerance` map on
 *      state.military.army_co_political_tolerance (forward-compat: stored on a
 *      faction-keyed map so the corps officer schema is not polluted).
 *   2. evaluateScheduledTransitions(state, turn, roster) — record
 *      `kept_past_schedule_since_turn` markers for variation rules.
 *   3. applyEmergentVariationRules(state, turn, roster) — competence decay,
 *      stubbornness escalation, cooldown halving. Faction-symmetric mechanism.
 *   4. processArmyCommanderLifecycle(state, engagedCorpsIds, roster) —
 *      deterministic death, political relief, and authored succession.
 *   5. applyArmyCoRosterStep(state, roster) — browser-safe pipeline entry.
 *
 * What A4 does NOT do:
 *   • Mutate A3 source (`army_order_interpretation.ts` is frozen).
 *   • Mutate A1/A2 source (`army_hq_gathering.ts`, officer_types.ts schema).
 *   • Handle corps-command succession; `processOfficerSuccession` retains that
 *     responsibility and delegates only Army CO lifecycle here.
 *   • Reach into UI / canon code, FORAWWV, paint anchors, political_controllers,
 *     OOB JSON, rupture wiring, enclave_resilience.
 *
 * Tenure-end discipline (mini-panel REFINEMENT, see lane report):
 *   The roster JSON's `tenure_end_default` field is OPTIONAL. When null, A4
 *   resolves the effective tenure end at runtime from
 *   NamedOfficer.available_until_turn (OOB canon source). This avoids
 *   dual-canon-source conflict with `data/scenarios/officers/apr1992_officers.json`.
 *
 * Faction-symmetric: NO `if (faction === 'X')` branches. All asymmetry comes
 * from data fields in the roster JSON.
 *
 * Determinism: injected immutable roster data, no Math.random / Date.now /
 * new Date, and sorted iteration via Object.keys().sort().
 *
 * Sensitive-history compliance:
 *   Ring 1 mechanism (faction-symmetric); Ring 2 data (faction-asymmetric values
 *   in roster JSON). No FORAWWV / paint anchor / political_controllers / OOB
 *   / rupture-wiring touch. §6 surface flag (per A3 closeout c8ff93d8): A4
 *   enables A3's autonomous-launch path to FIRE; parity-with-existing — does
 *   NOT introduce a new §6 surface.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type {
    NamedOfficer,
    NamedOfficerState,
    PendingOfficerEvent,
} from '../../state/officer_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Roster schema (mirrors data/scenarios/army_co_roster.json)
// ═══════════════════════════════════════════════════════════════════════════

export interface ArmyCoRosterScheduleEntry {
    officer_id: string;
    tenure_start: number;
    /**
     * When null, A4 resolves the effective tenure end at runtime from
     * NamedOfficer.available_until_turn (OOB canon source). When a number,
     * the roster overrides the OOB value (rare; reserved for scenarios that
     * deliberately diverge from canon).
     */
    tenure_end_default: number | null;
    stubbornness: number;
    replacement_trigger: string;
    replaces_with: string | null;
}

export interface ArmyCoRosterFaction {
    main_staff_formation_id: string;
    schedule: ArmyCoRosterScheduleEntry[];
}

export interface ArmyCoVariationRules {
    keep_past_schedule: {
        competence_decay_per_12w: number;
        stubbornness_escalation: number;
        stubbornness_cap: number;
        cooldown_halving: boolean;
        cooldown_halved_to_turns: number;
    };
    early_relief: {
        political_capital_cost: number;
        predecessor_morale_penalty: number;
    };
}

export interface ArmyCoRoster {
    schema_version: string;
    ddr_commit: string;
    rosters: Record<FactionId, ArmyCoRosterFaction>;
    political_leader_tolerance: Record<FactionId, number>;
    variation_rules: ArmyCoVariationRules;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants — DDR-locked variation-rule defaults (used when roster omits them)
// ═══════════════════════════════════════════════════════════════════════════

export const A4_PIPELINE_STEP_NAME = 'evaluate-army-co-transitions';

export const A4_DEFAULT_COMPETENCE_DECAY_PER_12W = -0.05;
export const A4_DEFAULT_STUBBORNNESS_ESCALATION = 1;
export const A4_DEFAULT_STUBBORNNESS_CAP = 5;
export const A4_DEFAULT_COOLDOWN_HALVED_TO_TURNS = 6;
export const A4_DEFAULT_EARLY_RELIEF_PC_COST = 4;
export const A4_DEFAULT_PREDECESSOR_MORALE_PENALTY = -0.5;

const KEEP_PAST_SCHEDULE_WINDOW = 12;
const ARMY_CO_CASUALTY_EXPOSURE_RATE = 0.1;
const ARMY_CO_AUTO_RELIEF_OVERRIDE_THRESHOLD = 3;
const ARMY_CO_OVERRIDE_WINDOW_TURNS = 12;

const CANONICAL_FACTIONS: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'];

export type ArmyCommanderDepartureCause =
    | 'combat_death'
    | 'political_relief'
    | 'authored_schedule';

export interface ArmyCommanderLifecycleChange {
    faction: FactionId;
    old_officer: string;
    new_officer: string;
    cause: ArmyCommanderDepartureCause;
}

export interface ArmyCommanderLifecycleReport {
    replacements: ArmyCommanderLifecycleChange[];
    casualties: string[];
    departures: string[];
}

function findActiveArmyCommander(
    state: GameState,
    faction: FactionId,
): { data: NamedOfficer; state: NamedOfficerState } | null {
    const officerData = state.military.named_officer_data;
    const officers = state.military.named_officers;
    if (!officerData || !officers) return null;

    const dataById = new Map(officerData.map((entry) => [entry.id, entry]));
    for (const id of Object.keys(officers).sort(strictCompare)) {
        const officerState = officers[id];
        const data = dataById.get(id);
        if (officerState?.status === 'active'
            && data?.faction === faction
            && data.rank === 'army_commander') {
            return { data, state: officerState };
        }
    }
    return null;
}

function makeOfficerState(officerId: string, status: NamedOfficerState['status']): NamedOfficerState {
    return {
        officer_id: officerId,
        status,
        assigned_corps_id: null,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
    };
}

function rosterEntryForOfficer(
    roster: ArmyCoRoster,
    faction: FactionId,
    officerId: string,
): ArmyCoRosterScheduleEntry | null {
    return roster.rosters[faction]?.schedule.find((entry) => entry.officer_id === officerId) ?? null;
}

function parsedReplacementTokens(entry: ArmyCoRosterScheduleEntry | null): string[] {
    return (entry?.replaces_with ?? '')
        .split('|')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
}

function isTerminalOfficerState(state: NamedOfficerState | undefined): boolean {
    return state?.status === 'killed'
        || state?.status === 'captured'
        || state?.status === 'retired'
        || state?.status === 'defected';
}

function selectPoliticalPoolCandidate(
    state: GameState,
    faction: FactionId,
    outgoingOfficerId: string,
): NamedOfficer | null {
    const officerData = state.military.named_officer_data ?? [];
    const officers = state.military.named_officers ?? {};
    const turn = state.meta?.turn ?? 0;
    const rankPriority: Record<NamedOfficer['rank'], number> = {
        army_commander: 0,
        deputy: 1,
        corps_commander: 2,
        tactical_commander: 3,
    };
    const tierPriority: Record<NamedOfficer['pool_tier'], number> = {
        starter: 0,
        tier_a: 1,
        tier_b: 2,
        tier_c: 3,
    };

    return officerData
        .filter((candidate) => candidate.id !== outgoingOfficerId
            && candidate.faction === faction
            && candidate.rank !== 'tactical_commander'
            && candidate.available_from_turn <= turn
            && (candidate.available_until_turn === undefined || candidate.available_until_turn > turn)
            && officers[candidate.id]?.status === 'reserve')
        .sort((a, b) => {
            const rank = rankPriority[a.rank] - rankPriority[b.rank];
            if (rank !== 0) return rank;
            if (a.political_reliability !== b.political_reliability) {
                return b.political_reliability - a.political_reliability;
            }
            const tier = tierPriority[a.pool_tier] - tierPriority[b.pool_tier];
            if (tier !== 0) return tier;
            if (a.competence !== b.competence) return b.competence - a.competence;
            return strictCompare(a.id, b.id);
        })[0] ?? null;
}

function selectArmyCommanderReplacement(
    state: GameState,
    roster: ArmyCoRoster,
    faction: FactionId,
    outgoingOfficerId: string,
): NamedOfficer | null {
    const data = state.military.named_officer_data ?? [];
    const officers = state.military.named_officers ?? {};
    const entry = rosterEntryForOfficer(roster, faction, outgoingOfficerId);
    const turn = state.meta?.turn ?? 0;

    for (const token of parsedReplacementTokens(entry)) {
        if (token === 'political_bot_pick') {
            const candidate = selectPoliticalPoolCandidate(state, faction, outgoingOfficerId);
            if (candidate) return candidate;
            continue;
        }
        const candidate = data.find((officer) => officer.id === token && officer.faction === faction);
        if (!candidate
            || candidate.available_from_turn > turn
            || (candidate.available_until_turn !== undefined && candidate.available_until_turn <= turn)
            || isTerminalOfficerState(officers[candidate.id])) continue;
        if (!officers[candidate.id]) officers[candidate.id] = makeOfficerState(candidate.id, 'reserve');
        return candidate;
    }

    return selectPoliticalPoolCandidate(state, faction, outgoingOfficerId);
}

function installActingArmyCommander(
    state: GameState,
    faction: FactionId,
    cause: ArmyCommanderDepartureCause,
): string {
    const turn = state.meta?.turn ?? 0;
    const id = `generic_army_${cause}_${faction}_t${turn}`;
    const officerData = state.military.named_officer_data;
    const officers = state.military.named_officers;
    if (!officerData || !officers) {
        throw new Error('Army commander replacement requires initialized officer state');
    }
    if (!officerData.some((entry) => entry.id === id)) {
        const genericComp = state.military.war_timeline?.officer_config?.[faction]
            ?.generic_replacement_competence ?? 2;
        officerData.push({
            id,
            name: `Acting Army Commander (${faction})`,
            faction,
            rank: 'army_commander',
            competence: genericComp,
            aggressiveness: 3,
            defensive_skill: 2,
            political_reliability: 3,
            available_from_turn: turn,
            origin: 'military',
            casualty_vulnerability: 0.05,
            can_improve: true,
            improvement_rate: 0.03,
            pool_tier: 'tier_c',
        });
    }
    officers[id] = {
        ...makeOfficerState(id, 'active'),
        acting_commander: true,
    };
    return id;
}

function emitArmyCommanderReliefEvent(
    state: GameState,
    faction: FactionId,
    officer: NamedOfficer,
    mainStaffFormationId: string,
): void {
    if (!state.military.pending_officer_events) state.military.pending_officer_events = [];
    const eventId = `army:${faction}:relieved:${state.meta?.turn ?? 0}:${officer.id}`;
    if (state.military.pending_officer_events.some((event) => event.event_id === eventId)) return;
    const event: PendingOfficerEvent = {
        event_id: eventId,
        type: 'officer_relieved',
        faction,
        turn: state.meta?.turn ?? 0,
        officer_id: officer.id,
        corps_id: mainStaffFormationId,
        acknowledged: false,
        reason: `Officer ${officer.name} was relieved of army command.`,
    };
    state.military.pending_officer_events.push(event);
}

function executeArmyCommanderTransition(
    state: GameState,
    roster: ArmyCoRoster,
    faction: FactionId,
    commander: { data: NamedOfficer; state: NamedOfficerState },
    cause: ArmyCommanderDepartureCause,
): ArmyCommanderLifecycleChange {
    const officers = state.military.named_officers;
    if (!officers) {
        throw new Error('Army commander transition requires initialized officer state');
    }
    commander.state.status = cause === 'combat_death' ? 'killed' : 'retired';
    commander.state.assigned_corps_id = null;

    if (cause === 'political_relief') {
        const turn = state.meta?.turn ?? 0;
        const history = commander.state.recent_overrides ?? [];
        if (!history.some((entry) => entry.turn === turn && entry.resolution === 'relieve')) {
            history.push({ turn, resolution: 'relieve' });
            history.sort((a, b) => a.turn - b.turn);
            commander.state.recent_overrides = history;
        }
        emitArmyCommanderReliefEvent(
            state,
            faction,
            commander.data,
            roster.rosters[faction]?.main_staff_formation_id ?? `${faction}_main_staff`,
        );
    }

    const replacement = selectArmyCommanderReplacement(state, roster, faction, commander.data.id);
    let replacementId: string;
    if (replacement) {
        replacement.rank = 'army_commander';
        const replacementState = officers[replacement.id]
            ?? makeOfficerState(replacement.id, 'reserve');
        replacementState.status = 'active';
        replacementState.assigned_corps_id = null;
        replacementState.turns_in_command = 0;
        replacementState.effective_competence_penalty = 0;
        replacementState.penalty_turns_remaining = 0;
        replacementState.acting_commander = false;
        officers[replacement.id] = replacementState;
        replacementId = replacement.id;
    } else {
        replacementId = installActingArmyCommander(state, faction, cause);
    }

    return {
        faction,
        old_officer: commander.data.id,
        new_officer: replacementId,
        cause,
    };
}

function engagedFactionsForCorps(state: GameState, engagedCorpsIds: Set<string>): Set<FactionId> {
    const formations = state.military.formations ?? {};
    const engagedFactions = new Set<FactionId>();
    for (const corpsId of [...engagedCorpsIds].sort(strictCompare)) {
        const corps = formations[corpsId];
        if (corps?.faction) {
            engagedFactions.add(corps.faction);
            continue;
        }
        for (const formationId of Object.keys(formations).sort(strictCompare)) {
            const formation = formations[formationId];
            if (formation?.corps_id === corpsId) {
                engagedFactions.add(formation.faction);
                break;
            }
        }
    }
    return engagedFactions;
}

function emitArmyCommanderScheduleSuggestion(
    state: GameState,
    roster: ArmyCoRoster,
    faction: FactionId,
    commander: { data: NamedOfficer; state: NamedOfficerState },
): void {
    const replacement = selectArmyCommanderReplacement(state, roster, faction, commander.data.id);
    if (!replacement) return;
    if (!state.military.pending_officer_events) state.military.pending_officer_events = [];
    const entry = rosterEntryForOfficer(roster, faction, commander.data.id);
    const tenureEnd = entry ? resolveTenureEnd(entry, commander.data) : null;
    const eventId = `army_replacement_${commander.data.id}_t${tenureEnd ?? state.meta?.turn ?? 0}`;
    if (state.military.pending_officer_events.some((event) => event.event_id === eventId)) return;
    state.military.pending_officer_events.push({
        event_id: eventId,
        type: 'replacement_suggested',
        faction,
        turn: state.meta?.turn ?? 0,
        officer_id: replacement.id,
        current_commander_id: commander.data.id,
        corps_id: roster.rosters[faction]?.main_staff_formation_id,
        acknowledged: false,
    });
}

/**
 * Resolve army-command departures after combat. Cause precedence is fixed:
 * combat death, political relief, then a roster-authored tenure transition.
 * A null roster tenure never creates a calendar departure.
 */
export function processArmyCommanderLifecycle(
    state: GameState,
    engagedCorpsIds: Set<string>,
    roster: ArmyCoRoster,
): ArmyCommanderLifecycleReport {
    const report: ArmyCommanderLifecycleReport = {
        replacements: [],
        casualties: [],
        departures: [],
    };
    if (!state.military.named_officer_data || !state.military.named_officers) return report;

    const turn = state.meta?.turn ?? 0;
    const engagedFactions = engagedFactionsForCorps(state, engagedCorpsIds);
    for (const faction of [...CANONICAL_FACTIONS].sort(strictCompare)) {
        const commander = findActiveArmyCommander(state, faction);
        if (!commander) continue;
        const rosterEntry = rosterEntryForOfficer(roster, faction, commander.data.id);
        const tenureEnd = rosterEntry ? resolveTenureEnd(rosterEntry, commander.data) : null;
        const combatExposure = commander.data.casualty_vulnerability
            * ARMY_CO_CASUALTY_EXPOSURE_RATE
            * Math.max(1, commander.state.turns_in_command);
        const combatDeath = engagedFactions.has(faction) && combatExposure >= 1;
        const explicitRelief = (commander.state.recent_overrides ?? [])
            .some((entry) => entry.turn === turn && entry.resolution === 'relieve');
        const recentOverrides = (commander.state.recent_overrides ?? [])
            .filter((entry) => entry.resolution === 'override'
                && entry.turn >= turn - ARMY_CO_OVERRIDE_WINDOW_TURNS
                && entry.turn <= turn).length;
        const botAutoRelief = state.meta?.player_faction !== faction
            && recentOverrides >= ARMY_CO_AUTO_RELIEF_OVERRIDE_THRESHOLD;
        const authoredScheduleDue = typeof tenureEnd === 'number' && turn >= tenureEnd;

        let cause: ArmyCommanderDepartureCause | null = null;
        if (combatDeath) cause = 'combat_death';
        else if (explicitRelief || botAutoRelief) cause = 'political_relief';
        else if (authoredScheduleDue && state.meta?.player_faction !== faction) cause = 'authored_schedule';

        if (cause) {
            const change = executeArmyCommanderTransition(state, roster, faction, commander, cause);
            report.replacements.push(change);
            if (cause === 'combat_death') report.casualties.push(commander.data.id);
            else report.departures.push(commander.data.id);
            continue;
        }

        if (authoredScheduleDue && state.meta?.player_faction === faction) {
            emitArmyCommanderScheduleSuggestion(state, roster, faction, commander);
        }
        commander.state.turns_in_command += 1;
        if (commander.state.penalty_turns_remaining > 0) {
            commander.state.penalty_turns_remaining -= 1;
        }
    }
    return report;
}

/** Immediate political relief entry point for a player or political-bot owner. */
export function relieveArmyCommander(
    state: GameState,
    faction: FactionId,
    roster: ArmyCoRoster,
): ArmyCommanderLifecycleChange | null {
    const commander = findActiveArmyCommander(state, faction);
    if (!commander) return null;
    return executeArmyCommanderTransition(state, roster, faction, commander, 'political_relief');
}

// ═══════════════════════════════════════════════════════════════════════════
// Public predicate 1: applyRosterToOfficers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Populate `stubbornness` on NamedOfficer entries from the roster JSON, and
 * populate per-faction `override_tolerance` on state.military.army_co_political_tolerance.
 *
 * Faction-symmetric: iterates a sorted faction list; no per-faction branches.
 *
 * Idempotent: when stubbornness is already set on an officer (e.g. from a
 * pre-A4 scenario JSON or a manual override), the roster value DOES NOT
 * overwrite. This preserves per-scenario authorial intent.
 */
export function applyRosterToOfficers(
    state: GameState,
    roster: ArmyCoRoster,
): void {
    const officerData = state.military.named_officer_data;
    if (!officerData) return;

    // Build an index by officer_id for O(1) lookup. Sorted iteration on the
    // schedule list ensures determinism regardless of caller insertion order.
    const officerIndex = new Map<string, NamedOfficer>();
    for (const o of officerData) officerIndex.set(o.id, o);

    const factions = [...CANONICAL_FACTIONS].sort();
    for (const faction of factions) {
        const factionRoster = roster.rosters[faction];
        if (!factionRoster) continue;
        const sched = [...factionRoster.schedule].sort((a, b) => strictCompare(a.officer_id, b.officer_id));
        for (const entry of sched) {
            const officer = officerIndex.get(entry.officer_id);
            if (!officer) continue;
            // Idempotent: only set when undefined
            if (typeof officer.stubbornness !== 'number') {
                officer.stubbornness = entry.stubbornness;
            }
        }
    }

    // Per-faction political-leader tolerance — stored on a forward-compat slot
    // on military state. A3 does not need to read this (its consumer is the
    // future political-bot lane); we land it now so 188w validation has the
    // value populated.
    type LooseMilitary = GameState['military'] & {
        army_co_political_tolerance?: Record<string, number>;
    };
    const mil = state.military as LooseMilitary;
    if (!mil.army_co_political_tolerance) mil.army_co_political_tolerance = {};
    const tolerances = roster.political_leader_tolerance ?? {};
    const tolFactions = Object.keys(tolerances).sort();
    for (const faction of tolFactions) {
        const v = tolerances[faction];
        if (typeof v === 'number') {
            mil.army_co_political_tolerance[faction] = v;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public predicate 2: evaluateScheduledTransitions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the effective tenure-end turn for a roster entry. Falls back to the
 * OOB canon source when the roster's `tenure_end_default` is null.
 */
function resolveTenureEnd(
    entry: ArmyCoRosterScheduleEntry,
    officer: NamedOfficer | undefined,
): number | null {
    if (typeof entry.tenure_end_default === 'number') return entry.tenure_end_default;
    if (officer && typeof officer.available_until_turn === 'number') {
        return officer.available_until_turn;
    }
    return null;
}

/**
 * Evaluate scheduled transitions per faction. INFORMATIONAL ONLY — the
 * canonical owner of relief events is `processOfficerSuccession` (officer_system.ts).
 * A4 records `kept_past_schedule_since_turn` markers on NamedOfficerState when
 * the officer is held past their resolved tenure end. The marker drives
 * `applyEmergentVariationRules`.
 *
 * Faction-symmetric: same code path for every faction.
 */
export function evaluateScheduledTransitions(
    state: GameState,
    turn: number,
    roster: ArmyCoRoster,
): void {
    const officerData = state.military.named_officer_data;
    const officers = state.military.named_officers;
    if (!officerData || !officers) return;

    const officerIndex = new Map<string, NamedOfficer>();
    for (const o of officerData) officerIndex.set(o.id, o);

    const factions = [...CANONICAL_FACTIONS].sort();
    for (const faction of factions) {
        const factionRoster = roster.rosters[faction];
        if (!factionRoster) continue;
        const sched = [...factionRoster.schedule].sort((a, b) => strictCompare(a.officer_id, b.officer_id));
        for (const entry of sched) {
            const officer = officerIndex.get(entry.officer_id);
            if (!officer) continue;
            const officerState = officers[entry.officer_id];
            if (!officerState) continue;
            // Only mark active officers — retired/relieved officers are not
            // candidates for kept-past-schedule degradation.
            if (officerState.status !== 'active') continue;
            const tenureEnd = resolveTenureEnd(entry, officer);
            if (typeof tenureEnd !== 'number') continue;
            type LooseOS = NamedOfficerState & { kept_past_schedule_since_turn?: number };
            const os = officerState as LooseOS;
            if (turn > tenureEnd) {
                if (typeof os.kept_past_schedule_since_turn !== 'number') {
                    // First turn the officer overstays — record the marker.
                    os.kept_past_schedule_since_turn = tenureEnd + 1;
                }
            } else {
                // Officer is within tenure — clear any stale marker (defensive;
                // same code path for all factions).
                if (typeof os.kept_past_schedule_since_turn === 'number') {
                    delete os.kept_past_schedule_since_turn;
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public predicate 3: applyEmergentVariationRules
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply emergent variation rules per DDR Q5 to officers held past schedule.
 * Faction-symmetric: same code path for every officer.
 *
 * Rules applied each turn the officer is held past `tenure_end_default`:
 *   • Competence decays by `competence_decay_per_12w / 12` per turn (linearized
 *     to per-turn so the rule is well-defined for any turn delta). Floored at
 *     1.0 to preserve combat-formula bounds.
 *   • Stubbornness escalates by +1 once at the moment the officer first
 *     overstays (capped at `stubbornness_cap`).
 *   • Cooldown halving is signaled by mutating the officer's
 *     `last_autonomous_launch_turn` so that A3's existing cooldown gate
 *     (12 turns) computes the halved duration without modifying A3 source.
 *     We subtract `(AUTONOMOUS_LAUNCH_COOLDOWN_TURNS - cooldown_halved_to_turns)`
 *     from the stored value when first overstaying, which makes the next launch
 *     eligible after `cooldown_halved_to_turns` turns instead of the full
 *     12-turn window.
 */
export function applyEmergentVariationRules(
    state: GameState,
    turn: number,
    roster: ArmyCoRoster,
): void {
    const officerData = state.military.named_officer_data;
    const officers = state.military.named_officers;
    if (!officerData || !officers) return;

    const rules = roster.variation_rules?.keep_past_schedule;
    if (!rules) return;

    const decayPer12w = rules.competence_decay_per_12w ?? A4_DEFAULT_COMPETENCE_DECAY_PER_12W;
    const stubbornnessEscalation = rules.stubbornness_escalation ?? A4_DEFAULT_STUBBORNNESS_ESCALATION;
    const stubbornnessCap = rules.stubbornness_cap ?? A4_DEFAULT_STUBBORNNESS_CAP;
    const cooldownHalvingEnabled = rules.cooldown_halving === true;
    const cooldownHalvedTo = rules.cooldown_halved_to_turns ?? A4_DEFAULT_COOLDOWN_HALVED_TO_TURNS;

    const officerIndex = new Map<string, NamedOfficer>();
    for (const o of officerData) officerIndex.set(o.id, o);

    // Sorted iteration of officers for determinism (same pattern as A3).
    const officerIds = Object.keys(officers).sort();
    for (const id of officerIds) {
        const os = officers[id];
        if (!os) continue;
        if (os.status !== 'active') continue;
        type LooseOS = NamedOfficerState & {
            kept_past_schedule_since_turn?: number;
            cooldown_halved_applied?: boolean;
        };
        const losse = os as LooseOS;
        const overstayStart = losse.kept_past_schedule_since_turn;
        if (typeof overstayStart !== 'number') continue;
        const officer = officerIndex.get(id);
        if (!officer || officer.rank !== 'army_commander') continue;

        // Overstay duration in turns (>= 1 when present).
        const overstayTurns = Math.max(0, turn - overstayStart + 1);

        // Competence decay — linearized: decay_per_12w / 12 per turn.
        const decayPerTurn = decayPer12w / 12;
        const totalDecay = decayPerTurn * overstayTurns;
        if (totalDecay !== 0) {
            const newCompetence = Math.max(1, Math.min(5, officer.competence + totalDecay));
            officer.competence = newCompetence;
        }

        // Stubbornness escalation — one-shot at first overstay.
        if (stubbornnessEscalation !== 0 && overstayTurns === 1) {
            const cur = typeof officer.stubbornness === 'number' ? officer.stubbornness : 3;
            officer.stubbornness = Math.min(stubbornnessCap, cur + stubbornnessEscalation);
        }

        // Cooldown halving — one-shot at first overstay. Mutates A2 substrate
        // field consumed by A3's existing read API (no A3 source modification).
        if (cooldownHalvingEnabled && overstayTurns === 1 && !losse.cooldown_halved_applied) {
            // A3's AUTONOMOUS_LAUNCH_COOLDOWN_TURNS = 12. Halving means the
            // next launch is eligible after `cooldown_halved_to_turns` turns
            // (default 6). Mutate stored last_autonomous_launch_turn so the
            // gate (turn - last >= 12) effectively requires only 6.
            const last = losse.last_autonomous_launch_turn;
            const A3_FULL_COOLDOWN = 12;
            const shift = A3_FULL_COOLDOWN - cooldownHalvedTo;
            if (typeof last === 'number') {
                losse.last_autonomous_launch_turn = last - shift;
            } else {
                // Officer hasn't launched yet; set a synthetic prior so the
                // first overstay still permits an early launch after the
                // halved window.
                losse.last_autonomous_launch_turn = turn - cooldownHalvedTo;
            }
            losse.cooldown_halved_applied = true;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline entry — invoked from war_phases.ts (A4 step)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Single pipeline-step entry. Caller (war_phases.ts) gates by phase==='war'
 * and orders this step AFTER `evaluate-army-hq-gathering` and BEFORE
 * `apply-army-directive-interpretation`.
 *
 * The roster is injected so this module remains browser-safe. Node-only A/B
 * tooling supplies the `disabled` argument through army_co_roster_loader.ts.
 */
export function applyArmyCoRosterStep(
    state: GameState,
    roster: ArmyCoRoster,
    disabled = false,
): void {
    if (disabled) return;
    const turn = state.meta?.turn ?? 0;
    applyRosterToOfficers(state, roster);
    evaluateScheduledTransitions(state, turn, roster);
    applyEmergentVariationRules(state, turn, roster);
}
