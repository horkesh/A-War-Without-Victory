/**
 * Phase A1.1: Canonical GameState shape validation (foundation-only).
 * Lightweight validator: no derived state, political_controller presence, weekly turn invariant.
 * Engine Invariants §9.1, §11, §13.
 */


import type { PhaseName } from './game_state.js';


/** Known phase names (must match PhaseName in game_state.ts). */
const KNOWN_PHASES: readonly PhaseName[] = ['peace', 'war'];
const CANONICAL_PLAYER_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const DOCTRINE_OVERRIDE_FORCED_STANCES = ['defensive', 'balanced', 'offensive', 'reorganize'] as const;
const SECTOR_STANCES = ['fortify', 'defend', 'elastic', 'active_defense', 'screening'] as const;
const MUNICIPALITY_SUPPORT_TYPES = ['weapons_shipment', 'staff_priority', 'croatian_support_package'] as const;
const ARMY_HQ_OVERRIDE_TYPES = ['offensive', 'probe', 'feint'] as const;
const CAMPAIGN_PLAN_FRONT_ROLES = ['primary', 'secondary', 'economy', 'contain'] as const;
const CAMPAIGN_PLAN_FRONT_STANCES = ['offensive', 'balanced', 'defensive', 'reorganize'] as const;
const CAMPAIGN_PLAN_ARMY_STANCES = ['general_defensive', 'balanced', 'general_offensive', 'total_mobilization'] as const;
const CAMPAIGN_PLAN_SYNC_PARTICIPANT_ROLES = ['main_effort', 'supporting', 'feint', 'fixing'] as const;
const OPPORTUNITY_AXES = [
    'date_window',
    'political_authorization',
    'corps_readiness',
    'logistics',
    'staging_access',
    'weather_season',
    'commander_confidence',
    'enemy_weakness',
    'alliance_context',
    'force_quality',
] as const;
const OPPORTUNITY_AXIS_MODES = ['required', 'optional', 'n_a'] as const;
const OPPORTUNITY_STATUSES = [
    'eligible_pending_review',
    'delayed',
    'approved',
    'declined',
    'expired',
    'redirected',
    'under_resourced_approved',
] as const;
const OPPORTUNITY_RESPONSES = ['approve', 'delay', 'redirect', 'under_resource', 'decline', 'expire'] as const;
const OPPORTUNITY_TRACE_EVENTS = [
    'blocked',
    'eligible',
    'expired',
    'declined',
    'delayed',
    'redirected',
    'under_resourced_approved',
    'approved',
    'spawn_failed',
    't3_authorized_no_offensive',
] as const;
const OPPORTUNITY_EXIT_CLASSES = [
    'did_not_launch',
    'decisive_success',
    'partial_success',
    'failed',
    'aborted',
    't3_authorized_no_offensive',
] as const;
const OPPORTUNITY_FORCE_QUALITY_TRAITS = [
    'operation_readiness',
    'staging_reliability',
    'axis_coordination',
    'support_delivery',
    'failure_recovery',
    'reserve_response',
    'collapse_susceptibility',
] as const;
const AI_DECISION_LEVELS = ['army', 'corps', 'advisor', 'political', 'event'] as const;
const AI_CORPS_STANCES = ['offensive', 'balanced', 'defensive'] as const;
const AI_PEACE_PLAN_RESPONSES = ['accept', 'reject'] as const;
const AI_OPERATION_APPROACHES = ['concentrated_assault', 'broad_front', 'probing', 'envelopment'] as const;
const AI_OPERATION_TIMINGS = ['immediate', 'next_turn', 'after_preparation'] as const;
const AI_ADVISOR_CONTEXT_TYPES = ['situation_analysis', 'operation_planning', 'peace_plan'] as const;
const AI_ALLIANCE_POSTURES = ['maintain', 'distance', 'break'] as const;
const COMMAND_BRIEFING_SEVERITIES = ['critical', 'warning', 'info'] as const;
const MUNICIPALITY_SUPPORT_TYPE_BY_FACTION: Record<string, string> = {
    RBiH: 'weapons_shipment',
    RS: 'staff_priority',
    HRHB: 'croatian_support_package',
};

/**
 * Strict comparator for deterministic ordering (Engine Invariants §11.3).
 * No localeCompare; avoids locale-dependent behavior.
 */
export function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Stable key ordering for records/maps (Engine Invariants §11.3).
 * Use when producing arrays from Record<Id, T> for output or deterministic comparison.
 */
export function sortedKeysForRecord<K extends string>(record: Record<K, unknown>): K[] {
    return (Object.keys(record) as K[]).slice().sort(strictCompare);
}

/**
 * Top-level keys that must NOT appear in GameState (derived state; Engine Invariants §13.1).
 * Conservative denylist: do not serialize these; they must be recomputed each turn.
 */
const DERIVED_STATE_DENYLIST: readonly string[] = [
    'fronts',
    'corridors',
    'derived',
    'cache',
    // Phase E: AoR and rear zone are derived each turn; must not be serialized (Engine Invariants §13.1).
    'phase_e_aor_membership',
    'phase_e_aor_influence',
    'phase_e_rear_zone'
];

export type ValidateGameStateShapeResult =
    | { ok: true }
    | { ok: false; errors: string[] };

export interface ValidateGameStateShapeOptions {
    /**
     * When supplied, fields introduced by migrations up through this version
     * are required if state.schema_version is at least the introducing version.
     */
    requireVersion?: number;
}

interface VersionRequiredField {
    version: number;
    path: string;
    check: (value: unknown) => boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function isCivilianCasualtiesRecord(value: unknown): boolean {
    if (!isRecord(value)) return false;
    for (const entry of Object.values(value)) {
        if (!isRecord(entry)) return false;
        if (!isFiniteNonNegativeNumber(entry.killed)) return false;
        if (!isFiniteNonNegativeNumber(entry.fled_abroad)) return false;
    }
    return true;
}

function isStringArray(value: unknown): boolean {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isNonNegativeIntegerRecord(value: unknown): boolean {
    if (!isRecord(value)) return false;
    return Object.values(value).every(isNonNegativeInteger);
}

function isDeclinedOperationRecord(value: unknown): boolean {
    if (!isRecord(value)) return false;
    for (const entry of Object.values(value)) {
        if (!isRecord(entry)) return false;
        if (!isNonNegativeInteger(entry.declined_turn)) return false;
        if (!isNonNegativeInteger(entry.decline_count)) return false;
    }
    return true;
}

function isCanonicalPlayerFaction(value: unknown): boolean {
    return typeof value === 'string' && CANONICAL_PLAYER_FACTIONS.includes(value as typeof CANONICAL_PLAYER_FACTIONS[number]);
}

function isDoctrineOverrideForcedStance(value: unknown): boolean {
    return typeof value === 'string' && DOCTRINE_OVERRIDE_FORCED_STANCES.includes(value as typeof DOCTRINE_OVERRIDE_FORCED_STANCES[number]);
}

function isSectorStanceValue(value: unknown): boolean {
    return typeof value === 'string' && SECTOR_STANCES.includes(value as typeof SECTOR_STANCES[number]);
}

function isMunicipalitySupportType(value: unknown): boolean {
    return typeof value === 'string' && MUNICIPALITY_SUPPORT_TYPES.includes(value as typeof MUNICIPALITY_SUPPORT_TYPES[number]);
}

function isArmyHqOverrideType(value: unknown): boolean {
    return typeof value === 'string' && ARMY_HQ_OVERRIDE_TYPES.includes(value as typeof ARMY_HQ_OVERRIDE_TYPES[number]);
}

function isCampaignPlanFrontRole(value: unknown): boolean {
    return typeof value === 'string' && CAMPAIGN_PLAN_FRONT_ROLES.includes(value as typeof CAMPAIGN_PLAN_FRONT_ROLES[number]);
}

function isCampaignPlanFrontStance(value: unknown): boolean {
    return typeof value === 'string' && CAMPAIGN_PLAN_FRONT_STANCES.includes(value as typeof CAMPAIGN_PLAN_FRONT_STANCES[number]);
}

function isCampaignPlanArmyStance(value: unknown): boolean {
    return typeof value === 'string' && CAMPAIGN_PLAN_ARMY_STANCES.includes(value as typeof CAMPAIGN_PLAN_ARMY_STANCES[number]);
}

function isCampaignPlanSyncParticipantRole(value: unknown): boolean {
    return typeof value === 'string' && CAMPAIGN_PLAN_SYNC_PARTICIPANT_ROLES.includes(value as typeof CAMPAIGN_PLAN_SYNC_PARTICIPANT_ROLES[number]);
}

function isOpportunityAxis(value: unknown): boolean {
    return typeof value === 'string' && OPPORTUNITY_AXES.includes(value as typeof OPPORTUNITY_AXES[number]);
}

function isOpportunityAxisMode(value: unknown): boolean {
    return typeof value === 'string' && OPPORTUNITY_AXIS_MODES.includes(value as typeof OPPORTUNITY_AXIS_MODES[number]);
}

function isOpportunityStatus(value: unknown): boolean {
    return typeof value === 'string' && OPPORTUNITY_STATUSES.includes(value as typeof OPPORTUNITY_STATUSES[number]);
}

function isOpportunityResponse(value: unknown): boolean {
    return typeof value === 'string' && OPPORTUNITY_RESPONSES.includes(value as typeof OPPORTUNITY_RESPONSES[number]);
}

function isOpportunityTraceEvent(value: unknown): boolean {
    return typeof value === 'string' && OPPORTUNITY_TRACE_EVENTS.includes(value as typeof OPPORTUNITY_TRACE_EVENTS[number]);
}

function isOpportunityExitClass(value: unknown): boolean {
    return typeof value === 'string' && OPPORTUNITY_EXIT_CLASSES.includes(value as typeof OPPORTUNITY_EXIT_CLASSES[number]);
}

function isAiDecisionLevel(value: unknown): boolean {
    return typeof value === 'string' && AI_DECISION_LEVELS.includes(value as typeof AI_DECISION_LEVELS[number]);
}

function isAiCorpsStance(value: unknown): boolean {
    return typeof value === 'string' && AI_CORPS_STANCES.includes(value as typeof AI_CORPS_STANCES[number]);
}

function isAiPeacePlanResponse(value: unknown): boolean {
    return value === null || (typeof value === 'string' && AI_PEACE_PLAN_RESPONSES.includes(value as typeof AI_PEACE_PLAN_RESPONSES[number]));
}

function isAiOperationApproach(value: unknown): boolean {
    return typeof value === 'string' && AI_OPERATION_APPROACHES.includes(value as typeof AI_OPERATION_APPROACHES[number]);
}

function isAiOperationTiming(value: unknown): boolean {
    return typeof value === 'string' && AI_OPERATION_TIMINGS.includes(value as typeof AI_OPERATION_TIMINGS[number]);
}

function isAiAdvisorContextType(value: unknown): boolean {
    return typeof value === 'string' && AI_ADVISOR_CONTEXT_TYPES.includes(value as typeof AI_ADVISOR_CONTEXT_TYPES[number]);
}

function isAiAlliancePosture(value: unknown): boolean {
    return typeof value === 'string' && AI_ALLIANCE_POSTURES.includes(value as typeof AI_ALLIANCE_POSTURES[number]);
}

function isCommandBriefingSeverity(value: unknown): boolean {
    return typeof value === 'string' && COMMAND_BRIEFING_SEVERITIES.includes(value as typeof COMMAND_BRIEFING_SEVERITIES[number]);
}

function isEventDecisionSource(value: unknown): boolean {
    return value === 'bot_political' || value === 'bot_v1' || value === 'bot_ai_default' || value === 'player';
}

function isOfficerEventType(value: unknown): boolean {
    return value === 'officer_available'
        || value === 'replacement_suggested'
        || value === 'order_pushback'
        || value === 'order_modified'
        || value === 'order_refused'
        || value === 'order_exceeded'
        || value === 'officer_relieved'
        || value === 'army_directive_pushback'
        || value === 'army_co_proposes_op';
}

function isOfficerDecision(value: unknown): boolean {
    return value === 'acknowledged' || value === 'override_confirmed' || value === 'replacement_accepted';
}

function isAllianceLockMode(value: unknown): boolean {
    return value === 'floor' || value === 'ceiling';
}

/** Phase B Sub-slice B2: enum gate for `CausalityLogEntry.kind`.
 *  Packet `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` §2.3. */
function isCausalityKind(value: unknown): boolean {
    return value === 'enables'
        || value === 'closes'
        || value === 'opens_flag'
        || value === 'closes_flag'
        || value === 'mutex_suppressed'
        || value === 'overflowed';
}

function isOrderSnapshotType(value: unknown): boolean {
    return value === 'stance_change'
        || value === 'operation_launch'
        || value === 'operation_halt'
        || value === 'brigade_reassign'
        || value === 'political_directive'
        || value === 'army_co_proposed_op';
}

function getPathValue(root: unknown, path: string): unknown {
    let current: unknown = root;
    for (const part of path.split('.')) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

function validatePendingEventDecisions(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.pending_event_decisions must be an array when present');
        return;
    }

    value.forEach((decision, i) => {
        if (!isRecord(decision)) {
            errors.push(`military.pending_event_decisions[${i}] must be an object`);
            return;
        }
        for (const key of ['event_id', 'event_title']) {
            if (!isNonEmptyString(decision[key])) {
                errors.push(`military.pending_event_decisions[${i}].${key} must be a non-empty string`);
            }
        }
        if (!isNonNegativeInteger(decision.turn_fired)) {
            errors.push(`military.pending_event_decisions[${i}].turn_fired must be a non-negative integer`);
        }
        if (!Array.isArray(decision.response_options)) {
            errors.push(`military.pending_event_decisions[${i}].response_options must be an array`);
        } else {
            if (decision.response_options.length === 0) {
                errors.push(`military.pending_event_decisions[${i}].response_options must not be empty`);
            }
            const responseOptionIds = new Set<string>();
            decision.response_options.forEach((option, optionIndex) => {
                const optionPath = `military.pending_event_decisions[${i}].response_options[${optionIndex}]`;
                if (!isRecord(option)) {
                    errors.push(`${optionPath} must be an object`);
                    return;
                }
                if (!isNonEmptyString(option.id)) {
                    errors.push(`${optionPath}.id must be a non-empty string`);
                } else if (responseOptionIds.has(option.id)) {
                    errors.push(`${optionPath}.id must be unique within response_options: ${option.id}`);
                } else {
                    responseOptionIds.add(option.id);
                }
                if (!isNonEmptyString(option.label)) {
                    errors.push(`${optionPath}.label must be a non-empty string`);
                }
                if ('effect' in option && option.effect !== undefined) {
                    if (!isRecord(option.effect) || !isNonEmptyString(option.effect.kind)) {
                        errors.push(`${optionPath}.effect must be an object with a non-empty kind`);
                    }
                }
                if ('effects' in option && option.effects !== undefined && !Array.isArray(option.effects)) {
                    errors.push(`${optionPath}.effects must be an array when present`);
                } else if (Array.isArray(option.effects)) {
                    option.effects.forEach((effect, effectIndex) => {
                        if (!isRecord(effect) || !isNonEmptyString(effect.kind)) {
                            errors.push(`${optionPath}.effects[${effectIndex}] must be an object with a non-empty kind`);
                        }
                    });
                }
            });
            if (
                'historical_default_response_id' in decision
                && decision.historical_default_response_id !== undefined
                && isNonEmptyString(decision.historical_default_response_id)
                && !responseOptionIds.has(decision.historical_default_response_id)
            ) {
                errors.push(`military.pending_event_decisions[${i}].historical_default_response_id must match a response option id`);
            }
            if (
                'staff_recommended_response_id' in decision
                && decision.staff_recommended_response_id !== undefined
                && isNonEmptyString(decision.staff_recommended_response_id)
                && !responseOptionIds.has(decision.staff_recommended_response_id)
            ) {
                errors.push(`military.pending_event_decisions[${i}].staff_recommended_response_id must match a response option id`);
            }
        }
        if (!isCanonicalPlayerFaction(decision.faction)) {
            errors.push(`military.pending_event_decisions[${i}].faction must be one of: RBiH, RS, HRHB`);
        }
        if ('requires_player_response' in decision && decision.requires_player_response !== undefined && typeof decision.requires_player_response !== 'boolean') {
            errors.push(`military.pending_event_decisions[${i}].requires_player_response must be boolean when present`);
        }
        if ('historical_default_response_id' in decision && decision.historical_default_response_id !== undefined && !isNonEmptyString(decision.historical_default_response_id)) {
            errors.push(`military.pending_event_decisions[${i}].historical_default_response_id must be a non-empty string when present`);
        }
        if ('staff_recommended_response_id' in decision && decision.staff_recommended_response_id !== undefined && !isNonEmptyString(decision.staff_recommended_response_id)) {
            errors.push(`military.pending_event_decisions[${i}].staff_recommended_response_id must be a non-empty string when present`);
        }
        if ('trigger_evidence' in decision && decision.trigger_evidence !== undefined && !isStringArray(decision.trigger_evidence)) {
            errors.push(`military.pending_event_decisions[${i}].trigger_evidence must be a string array when present`);
        }
    });
}

function validateEventDecisionLog(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.event_decision_log must be an array when present');
        return;
    }

    value.forEach((entry, i) => {
        if (!isRecord(entry)) {
            errors.push(`military.event_decision_log[${i}] must be an object`);
            return;
        }
        for (const key of ['event_id', 'response_id']) {
            if (!isNonEmptyString(entry[key])) {
                errors.push(`military.event_decision_log[${i}].${key} must be a non-empty string`);
            }
        }
        if (!isEventDecisionSource(entry.decision_source)) {
            errors.push(`military.event_decision_log[${i}].decision_source must be one of: bot_political, bot_v1, bot_ai_default, player`);
        }
        if (entry.faction !== null && !isCanonicalPlayerFaction(entry.faction)) {
            errors.push(`military.event_decision_log[${i}].faction must be null or one of: RBiH, RS, HRHB`);
        }
        if (!isNonNegativeInteger(entry.turn)) {
            errors.push(`military.event_decision_log[${i}].turn must be a non-negative integer`);
        }
    });
}

/** Phase B Sub-slice B2: shape proof for `military.closed_event_ids`.
 *  Enforces string[] with no duplicates and canonical `strictCompare` sort
 *  (packet §3.7 — sort-on-read is the canonical defense against save/reload drift). */
function validateClosedEventIds(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.closed_event_ids must be a string array when present');
        return;
    }
    let prior: string | null = null;
    const seen = new Set<string>();
    for (let i = 0; i < value.length; i++) {
        const entry = value[i];
        if (typeof entry !== 'string') {
            errors.push(`military.closed_event_ids[${i}] must be a string`);
            continue;
        }
        if (seen.has(entry)) {
            errors.push(`military.closed_event_ids[${i}] must be unique: ${entry}`);
        } else {
            seen.add(entry);
        }
        if (prior !== null && strictCompare(prior, entry) > 0) {
            errors.push(`military.closed_event_ids must be sorted via strictCompare (entry at index ${i} breaks order)`);
        }
        prior = entry;
    }
}

/** Phase B Sub-slice B2: shape proof for `military.event_causality_log`.
 *  Each entry is a CausalityLogEntry. Log must be sorted on read per
 *  (turn, from_event, to_event ?? '', to_flag ?? '', kind, source_response_id ?? '')
 *  via strictCompare. Determinism Auditor Wave 2 ruling (packet §3.7). */
/** Field-wise tuple compare for causality entries (no string concatenation,
 *  so component boundaries cannot collide).
 *  Phase B Sub-slice B3: exported so `evaluate_events.ts` writers share the
 *  same compare contract as the validator (packet §3.7 — single sort key). */
export function compareCausalityEntries(
    a: { turn: number; from_event: string; to_event: string; to_flag: string; kind: string; source_response_id: string },
    b: { turn: number; from_event: string; to_event: string; to_flag: string; kind: string; source_response_id: string },
): number {
    if (a.turn !== b.turn) return a.turn - b.turn;
    const fe = strictCompare(a.from_event, b.from_event);
    if (fe !== 0) return fe;
    const te = strictCompare(a.to_event, b.to_event);
    if (te !== 0) return te;
    const tf = strictCompare(a.to_flag, b.to_flag);
    if (tf !== 0) return tf;
    const k = strictCompare(a.kind, b.kind);
    if (k !== 0) return k;
    return strictCompare(a.source_response_id, b.source_response_id);
}

function validateEventCausalityLog(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.event_causality_log must be an array when present');
        return;
    }
    type CausalityTupleKey = { turn: number; from_event: string; to_event: string; to_flag: string; kind: string; source_response_id: string };
    let priorTuple: CausalityTupleKey | null = null;
    for (let i = 0; i < value.length; i++) {
        const entry = value[i];
        if (!isRecord(entry)) {
            errors.push(`military.event_causality_log[${i}] must be an object`);
            priorTuple = null;
            continue;
        }
        const path = `military.event_causality_log[${i}]`;
        let entryValid = true;
        if (!isNonNegativeInteger(entry.turn)) {
            errors.push(`${path}.turn must be a non-negative integer`);
            entryValid = false;
        }
        if (!isNonEmptyString(entry.from_event)) {
            errors.push(`${path}.from_event must be a non-empty string`);
            entryValid = false;
        }
        if (entry.to_event !== null && !isNonEmptyString(entry.to_event)) {
            errors.push(`${path}.to_event must be null or a non-empty string`);
            entryValid = false;
        }
        if (entry.to_flag !== null && !isNonEmptyString(entry.to_flag)) {
            errors.push(`${path}.to_flag must be null or a non-empty string`);
            entryValid = false;
        }
        if (!isCausalityKind(entry.kind)) {
            errors.push(`${path}.kind must be one of: enables, closes, opens_flag, closes_flag, mutex_suppressed, overflowed`);
            entryValid = false;
        }
        if ('source_response_id' in entry && entry.source_response_id !== undefined && !isNonEmptyString(entry.source_response_id)) {
            errors.push(`${path}.source_response_id must be a non-empty string when present`);
            entryValid = false;
        }
        if (!entryValid) {
            priorTuple = null;
            continue;
        }
        const tuple: CausalityTupleKey = {
            turn: entry.turn as number,
            from_event: entry.from_event as string,
            to_event: (entry.to_event ?? '') as string,
            to_flag: (entry.to_flag ?? '') as string,
            kind: entry.kind as string,
            source_response_id: (entry.source_response_id ?? '') as string,
        };
        if (priorTuple !== null && compareCausalityEntries(priorTuple, tuple) > 0) {
            errors.push(`military.event_causality_log must be sorted by (turn, from_event, to_event, to_flag, kind, source_response_id) via strictCompare (entry at index ${i} breaks order)`);
        }
        priorTuple = tuple;
    }
}

function validateOrderSnapshot(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isOrderSnapshotType(value.order_type)) {
        errors.push(`${path}.order_type must be a valid order_type`);
    }
    if (typeof value.corps_id !== 'string') {
        errors.push(`${path}.corps_id must be a string`);
    }
    for (const key of ['stance', 'operation_name', 'directive_verb', 'opportunity_id']) {
        if (key in value && value[key] !== undefined && typeof value[key] !== 'string') {
            errors.push(`${path}.${key} must be a string when present`);
        }
    }
    if ('objectives' in value && value.objectives !== undefined && !isStringArray(value.objectives)) {
        errors.push(`${path}.objectives must be a string array when present`);
    }
    if ('delay_turns' in value && value.delay_turns !== undefined && !isNonNegativeInteger(value.delay_turns)) {
        errors.push(`${path}.delay_turns must be a non-negative integer when present`);
    }
}

function validatePendingOfficerEvents(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.pending_officer_events must be an array when present');
        return;
    }

    value.forEach((event, i) => {
        const path = `military.pending_officer_events[${i}]`;
        if (!isRecord(event)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (!isNonEmptyString(event.event_id)) {
            errors.push(`${path}.event_id must be a non-empty string`);
        }
        if (!isOfficerEventType(event.type)) {
            errors.push(`${path}.type must be a known OfficerEventType`);
        }
        if (!isCanonicalPlayerFaction(event.faction)) {
            errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isNonNegativeInteger(event.turn)) {
            errors.push(`${path}.turn must be a non-negative integer`);
        }
        if (!isNonEmptyString(event.officer_id)) {
            errors.push(`${path}.officer_id must be a non-empty string`);
        }
        if (typeof event.acknowledged !== 'boolean') {
            errors.push(`${path}.acknowledged must be boolean`);
        }
        for (const key of ['current_commander_id', 'corps_id']) {
            if (key in event && event[key] !== undefined && !isNonEmptyString(event[key])) {
                errors.push(`${path}.${key} must be a non-empty string when present`);
            }
        }
        if ('reason' in event && event.reason !== undefined && typeof event.reason !== 'string') {
            errors.push(`${path}.reason must be a string when present`);
        }
        if ('overridable' in event && event.overridable !== undefined && typeof event.overridable !== 'boolean') {
            errors.push(`${path}.overridable must be boolean when present`);
        }
        if ('override_action' in event && event.override_action !== undefined && typeof event.override_action !== 'string') {
            errors.push(`${path}.override_action must be a string when present`);
        }
        if ('original_order' in event && event.original_order !== undefined) {
            validateOrderSnapshot(event.original_order, `${path}.original_order`, errors);
        }
        if ('interpreted_order' in event && event.interpreted_order !== undefined) {
            validateOrderSnapshot(event.interpreted_order, `${path}.interpreted_order`, errors);
        }
    });
}

function validateOfficerDecisionHistory(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.officer_decision_history must be an array when present');
        return;
    }

    value.forEach((entry, i) => {
        const path = `military.officer_decision_history[${i}]`;
        if (!isRecord(entry)) {
            errors.push(`${path} must be an object`);
            return;
        }
        for (const key of ['id', 'event_id', 'event_type', 'officer_id']) {
            if (!isNonEmptyString(entry[key])) {
                errors.push(`${path}.${key} must be a non-empty string`);
            }
        }
        if (!isNonNegativeInteger(entry.turn)) {
            errors.push(`${path}.turn must be a non-negative integer`);
        }
        if (!isCanonicalPlayerFaction(entry.faction)) {
            errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isOfficerDecision(entry.decision)) {
            errors.push(`${path}.decision must be one of: acknowledged, override_confirmed, replacement_accepted`);
        }
        for (const key of ['current_commander_id', 'corps_id', 'new_officer_id', 'outgoing_officer_id']) {
            if (key in entry && entry[key] !== undefined && !isNonEmptyString(entry[key])) {
                errors.push(`${path}.${key} must be a non-empty string when present`);
            }
        }
    });
}

function validateExpiringFactionNumberModifiers(
    value: unknown,
    path: string,
    numericField: string,
    errors: string[],
): void {
    if (!Array.isArray(value)) {
        errors.push(`${path} must be an array when present`);
        return;
    }

    value.forEach((modifier, i) => {
        if (!isRecord(modifier)) {
            errors.push(`${path}[${i}] must be an object`);
            return;
        }
        if (!isCanonicalPlayerFaction(modifier.faction)) {
            errors.push(`${path}[${i}].faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isFiniteNumber(modifier[numericField])) {
            errors.push(`${path}[${i}].${numericField} must be a finite number`);
        }
        if (!isNonNegativeInteger(modifier.expires_turn)) {
            errors.push(`${path}[${i}].expires_turn must be a non-negative integer`);
        }
    });
}

function validateCascadePenalties(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.cascade_penalties must be an array when present');
        return;
    }

    value.forEach((penalty, i) => {
        const path = `military.cascade_penalties[${i}]`;
        if (!isRecord(penalty)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (!isNonEmptyString(penalty.osid)) {
            errors.push(`${path}.osid must be a non-empty string`);
        }
        if (!isFiniteNumber(penalty.multiplier)) {
            errors.push(`${path}.multiplier must be a finite number`);
        }
        if (!isNonNegativeInteger(penalty.expires_turn)) {
            errors.push(`${path}.expires_turn must be a non-negative integer`);
        }
    });
}

function validateOffensiveOpsSuppressions(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.offensive_ops_suppressions must be an array when present');
        return;
    }

    value.forEach((suppression, i) => {
        const path = `military.offensive_ops_suppressions[${i}]`;
        if (!isRecord(suppression)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (!isCanonicalPlayerFaction(suppression.faction)) {
            errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isNonNegativeInteger(suppression.expires_turn)) {
            errors.push(`${path}.expires_turn must be a non-negative integer`);
        }
        if ('reason' in suppression && suppression.reason !== undefined && typeof suppression.reason !== 'string') {
            errors.push(`${path}.reason must be a string when present`);
        }
    });
}

function validateAllianceLocks(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.alliance_locks must be an array when present');
        return;
    }

    value.forEach((lock, i) => {
        const path = `military.alliance_locks[${i}]`;
        if (!isRecord(lock)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (!isAllianceLockMode(lock.mode)) {
            errors.push(`${path}.mode must be one of: floor, ceiling`);
        }
        if (!isFiniteNumber(lock.value)) {
            errors.push(`${path}.value must be a finite number`);
        }
        if (!isNonNegativeInteger(lock.expires_turn)) {
            errors.push(`${path}.expires_turn must be a non-negative integer`);
        }
    });
}

function validateBotPriorityShifts(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.bot_priority_shifts must be an array when present');
        return;
    }

    value.forEach((shift, i) => {
        const path = `military.bot_priority_shifts[${i}]`;
        if (!isRecord(shift)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (!isCanonicalPlayerFaction(shift.faction)) {
            errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
        }
        if ('add_objectives' in shift && shift.add_objectives !== undefined && !isStringArray(shift.add_objectives)) {
            errors.push(`${path}.add_objectives must be a string array when present`);
        }
        if ('remove_objectives' in shift && shift.remove_objectives !== undefined && !isStringArray(shift.remove_objectives)) {
            errors.push(`${path}.remove_objectives must be a string array when present`);
        }
        if (!isNonNegativeInteger(shift.expires_turn)) {
            errors.push(`${path}.expires_turn must be a non-negative integer`);
        }
    });
}

function validateEventConstraintFactionExpiryReasonEntry(
    entry: unknown,
    path: string,
    errors: string[],
): entry is Record<string, unknown> {
    if (!isRecord(entry)) {
        errors.push(`${path} must be an object`);
        return false;
    }
    if (!isCanonicalPlayerFaction(entry.faction)) {
        errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
    }
    if (!isNonNegativeInteger(entry.expires_turn)) {
        errors.push(`${path}.expires_turn must be a non-negative integer`);
    }
    if (!isNonEmptyString(entry.reason)) {
        errors.push(`${path}.reason must be a non-empty string`);
    }
    return true;
}

function validateEventConstraints(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.event_constraints must be an object when present');
        return;
    }

    if ('operation_blocks' in value && value.operation_blocks !== undefined) {
        if (!Array.isArray(value.operation_blocks)) {
            errors.push('military.event_constraints.operation_blocks must be an array when present');
        } else {
            value.operation_blocks.forEach((block, i) => {
                validateEventConstraintFactionExpiryReasonEntry(block, `military.event_constraints.operation_blocks[${i}]`, errors);
            });
        }
    }

    if ('doctrine_overrides' in value && value.doctrine_overrides !== undefined) {
        if (!Array.isArray(value.doctrine_overrides)) {
            errors.push('military.event_constraints.doctrine_overrides must be an array when present');
        } else {
            value.doctrine_overrides.forEach((override, i) => {
                const path = `military.event_constraints.doctrine_overrides[${i}]`;
                if (!validateEventConstraintFactionExpiryReasonEntry(override, path, errors)) return;
                if (!isDoctrineOverrideForcedStance(override.forced_stance)) {
                    errors.push(`${path}.forced_stance must be one of: defensive, balanced, offensive, reorganize`);
                }
            });
        }
    }

    if ('scope_restrictions' in value && value.scope_restrictions !== undefined) {
        if (!Array.isArray(value.scope_restrictions)) {
            errors.push('military.event_constraints.scope_restrictions must be an array when present');
        } else {
            value.scope_restrictions.forEach((restriction, i) => {
                const path = `military.event_constraints.scope_restrictions[${i}]`;
                if (!isRecord(restriction)) {
                    errors.push(`${path} must be an object`);
                    return;
                }
                if (!isCanonicalPlayerFaction(restriction.faction)) {
                    errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
                }
                if ('allowed_municipalities' in restriction && restriction.allowed_municipalities !== undefined && !isStringArray(restriction.allowed_municipalities)) {
                    errors.push(`${path}.allowed_municipalities must be a string array when present`);
                }
                if ('blocked_municipalities' in restriction && restriction.blocked_municipalities !== undefined && !isStringArray(restriction.blocked_municipalities)) {
                    errors.push(`${path}.blocked_municipalities must be a string array when present`);
                }
                if ('expires_turn' in restriction && restriction.expires_turn !== undefined && !isNonNegativeInteger(restriction.expires_turn)) {
                    errors.push(`${path}.expires_turn must be a non-negative integer when present`);
                }
                if (!isNonEmptyString(restriction.reason)) {
                    errors.push(`${path}.reason must be a non-empty string`);
                }
            });
        }
    }
}

function validatePatronDefianceSupplyCuts(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.patron_defiance_supply_cuts must be an array when present');
        return;
    }

    value.forEach((cut, i) => {
        const path = `military.patron_defiance_supply_cuts[${i}]`;
        if (!isRecord(cut)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (cut.faction !== 'RS' && cut.faction !== 'HRHB') {
            errors.push(`${path}.faction must be RS or HRHB`);
        }
        if (!isNonNegativeInteger(cut.turn)) {
            errors.push(`${path}.turn must be a non-negative integer`);
        }
        if (!isFiniteNumber(cut.cut_fraction) || cut.cut_fraction <= 0 || cut.cut_fraction > 1) {
            errors.push(`${path}.cut_fraction must be > 0 and <= 1`);
        }
        if (!isFiniteNumber(cut.support_after) || cut.support_after < 0 || cut.support_after > 1) {
            errors.push(`${path}.support_after must be a finite number in [0,1]`);
        }
    });
}

function validateFiniteNonNegativeNumberRecord(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object when present`);
        return;
    }
    for (const [key, entry] of Object.entries(value)) {
        if (!isFiniteNonNegativeNumber(entry)) {
            errors.push(`${path}.${key} must be a finite non-negative number`);
        }
    }
}

function validateSmugglingAllocation(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.smuggling_allocation must be an object when present');
        return;
    }

    for (const [key, entry] of Object.entries(value)) {
        const path = `military.smuggling_allocation.${key}`;
        if (!isRecord(entry)) {
            errors.push(`${path} must be an object`);
            continue;
        }
        if (entry.type !== 'ammo' && entry.type !== 'food') {
            errors.push(`${path}.type must be ammo or food`);
        }
        if (!isFiniteNonNegativeNumber(entry.amount)) {
            errors.push(`${path}.amount must be a finite non-negative number`);
        }
    }
}

function isArmyStanceValue(value: unknown): boolean {
    return value === 'general_defensive'
        || value === 'balanced'
        || value === 'general_offensive'
        || value === 'total_mobilization';
}

function validateArmyStanceRecord(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.army_stance must be an object when present');
        return;
    }

    for (const [key, stance] of Object.entries(value)) {
        if (!isCanonicalPlayerFaction(key)) {
            errors.push(`military.army_stance.${key} must use a canonical faction id key`);
        }
        if (!isArmyStanceValue(stance)) {
            errors.push(`military.army_stance.${key} must be a valid army stance`);
        }
    }
}

function validateSectorStanceOrders(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.sector_stance_orders must be an array when present');
        return;
    }

    value.forEach((order, i) => {
        if (!isRecord(order)) {
            errors.push(`military.sector_stance_orders[${i}] must be an object`);
            return;
        }
        if (!isNonEmptyString(order.sector_id)) {
            errors.push(`military.sector_stance_orders[${i}].sector_id must be a non-empty string`);
        }
        if (!isSectorStanceValue(order.stance)) {
            errors.push(`military.sector_stance_orders[${i}].stance must be a valid sector stance`);
        }
    });
}

function validateMunicipalitySupportOrders(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.municipality_support_orders must be an object when present');
        return;
    }

    for (const [faction, order] of Object.entries(value)) {
        const path = `military.municipality_support_orders.${faction}`;
        if (!isCanonicalPlayerFaction(faction)) {
            errors.push(`${path} must use a canonical faction id key`);
        }
        if (!isRecord(order)) {
            errors.push(`${path} must be an object`);
            continue;
        }
        if (order.faction !== faction) {
            errors.push(`${path}.faction must match its faction key`);
        }
        if (!isNonEmptyString(order.mun_id)) {
            errors.push(`${path}.mun_id must be a non-empty string`);
        }
        if (!isMunicipalitySupportType(order.type)) {
            errors.push(`${path}.type must be a valid municipality support type`);
        } else if (isCanonicalPlayerFaction(faction) && order.type !== MUNICIPALITY_SUPPORT_TYPE_BY_FACTION[faction]) {
            errors.push(`${path}.type must match its faction support type`);
        }
        if (!isNonNegativeInteger(order.staged_turn)) {
            errors.push(`${path}.staged_turn must be a non-negative integer`);
        }
    }
}

function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function validateArmyHqOverrides(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.army_hq_overrides must be an array when present');
        return;
    }

    value.forEach((entry, i) => {
        const path = `military.army_hq_overrides[${i}]`;
        if (!isRecord(entry)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (!isNonEmptyString(entry.corps_id)) {
            errors.push(`${path}.corps_id must be a non-empty string`);
        }
        if (!isNonEmptyString(entry.operation_name)) {
            errors.push(`${path}.operation_name must be a non-empty string`);
        }
        if (!isPositiveInteger(entry.min_brigades)) {
            errors.push(`${path}.min_brigades must be a positive integer`);
        }
        if (!isStringArray(entry.target_osids)) {
            errors.push(`${path}.target_osids must be a string array`);
        }
        if (!isNonEmptyString(entry.reason)) {
            errors.push(`${path}.reason must be a non-empty string`);
        }
        if (!isNonNegativeInteger(entry.issued_turn)) {
            errors.push(`${path}.issued_turn must be a non-negative integer`);
        }
        if (!isArmyHqOverrideType(entry.type)) {
            errors.push(`${path}.type must be offensive, probe, or feint`);
        }
        if ('max_brigades' in entry && entry.max_brigades !== undefined && !isPositiveInteger(entry.max_brigades)) {
            errors.push(`${path}.max_brigades must be a positive integer when present`);
        }
    });
}

function validateCampaignPlanFrontPriority(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.corps_id)) {
        errors.push(`${path}.corps_id must be a non-empty string`);
    }
    if (!isCampaignPlanFrontRole(value.role)) {
        errors.push(`${path}.role must be a valid front priority role`);
    }
    if (!isCampaignPlanFrontStance(value.suggested_stance)) {
        errors.push(`${path}.suggested_stance must be a valid front priority stance`);
    }
    if ('offensive_targets' in value && value.offensive_targets !== undefined && !isStringArray(value.offensive_targets)) {
        errors.push(`${path}.offensive_targets must be a string array`);
    }
    if ('hold_targets' in value && value.hold_targets !== undefined && !isStringArray(value.hold_targets)) {
        errors.push(`${path}.hold_targets must be a string array`);
    }
}

function validateCampaignPlanDoctrineOverride(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isCampaignPlanArmyStance(value.army_stance)) {
        errors.push(`${path}.army_stance must be a valid army stance`);
    }
    if (!isFiniteNumber(value.aggression_modifier)) {
        errors.push(`${path}.aggression_modifier must be a finite number`);
    }
    if ('corps_stance_ceilings' in value && value.corps_stance_ceilings !== undefined) {
        if (!isRecord(value.corps_stance_ceilings)) {
            errors.push(`${path}.corps_stance_ceilings must be an object when present`);
        } else {
            for (const [corpsId, stance] of Object.entries(value.corps_stance_ceilings)) {
                if (!isCampaignPlanFrontStance(stance)) {
                    errors.push(`${path}.corps_stance_ceilings.${corpsId} must be a valid front priority stance`);
                }
            }
        }
    }
}

function validateCampaignPlanSyncParticipant(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.corps_id)) {
        errors.push(`${path}.corps_id must be a non-empty string`);
    }
    if (!isCampaignPlanSyncParticipantRole(value.role)) {
        errors.push(`${path}.role must be a valid synchronized operation participant role`);
    }
    if (!isStringArray(value.target_osids)) {
        errors.push(`${path}.target_osids must be a string array`);
    }
    if (!isPositiveInteger(value.min_brigades)) {
        errors.push(`${path}.min_brigades must be a positive integer`);
    }
}

function validateCampaignPlanSynchronizedOperation(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.name)) {
        errors.push(`${path}.name must be a non-empty string`);
    }
    if (!isNonNegativeInteger(value.launch_window_start)) {
        errors.push(`${path}.launch_window_start must be a non-negative integer`);
    }
    if (!isNonNegativeInteger(value.launch_window_end)) {
        errors.push(`${path}.launch_window_end must be a non-negative integer`);
    } else if (isNonNegativeInteger(value.launch_window_start) && value.launch_window_end < value.launch_window_start) {
        errors.push(`${path}.launch_window_end must be greater than or equal to launch_window_start`);
    }
    if (!isStringArray(value.target_area)) {
        errors.push(`${path}.target_area must be a string array`);
    }
    if (!Array.isArray(value.participants)) {
        errors.push(`${path}.participants must be an array`);
    } else {
        value.participants.forEach((participant, i) => {
            validateCampaignPlanSyncParticipant(participant, `${path}.participants[${i}]`, errors);
        });
    }
}

function validateCampaignPlanForceTransfer(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.brigade_id)) {
        errors.push(`${path}.brigade_id must be a non-empty string`);
    }
    if (!isNonEmptyString(value.from_corps)) {
        errors.push(`${path}.from_corps must be a non-empty string`);
    }
    if (!isNonEmptyString(value.to_corps)) {
        errors.push(`${path}.to_corps must be a non-empty string`);
    }
    if (!isNonNegativeInteger(value.march_turns)) {
        errors.push(`${path}.march_turns must be a non-negative integer`);
    }
    if (!isNonNegativeInteger(value.issued_turn)) {
        errors.push(`${path}.issued_turn must be a non-negative integer`);
    }
    if (typeof value.completed !== 'boolean') {
        errors.push(`${path}.completed must be a boolean`);
    }
}

function validateCampaignPlan(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be null or a CampaignPlan object`);
        return;
    }
    if (!isNonNegativeInteger(value.issued_turn)) {
        errors.push(`${path}.issued_turn must be a non-negative integer`);
    }
    if (!isNonNegativeInteger(value.valid_until_turn)) {
        errors.push(`${path}.valid_until_turn must be a non-negative integer`);
    } else if (isNonNegativeInteger(value.issued_turn) && value.valid_until_turn < value.issued_turn) {
        errors.push(`${path}.valid_until_turn must be greater than or equal to issued_turn`);
    }
    if (!Array.isArray(value.front_priorities)) {
        errors.push(`${path}.front_priorities must be an array`);
    } else {
        value.front_priorities.forEach((entry, i) => {
            validateCampaignPlanFrontPriority(entry, `${path}.front_priorities[${i}]`, errors);
        });
    }
    if ('doctrine_override' in value && value.doctrine_override !== undefined) {
        validateCampaignPlanDoctrineOverride(value.doctrine_override, `${path}.doctrine_override`, errors);
    }
    if (!Array.isArray(value.synchronized_operations)) {
        errors.push(`${path}.synchronized_operations must be an array`);
    } else {
        value.synchronized_operations.forEach((entry, i) => {
            validateCampaignPlanSynchronizedOperation(entry, `${path}.synchronized_operations[${i}]`, errors);
        });
    }
    if (!Array.isArray(value.force_transfers)) {
        errors.push(`${path}.force_transfers must be an array`);
    } else {
        value.force_transfers.forEach((entry, i) => {
            validateCampaignPlanForceTransfer(entry, `${path}.force_transfers[${i}]`, errors);
        });
    }
    if (!isStringArray(value.excluded_corps)) {
        errors.push(`${path}.excluded_corps must be a string array`);
    }
    if (typeof value.emergency !== 'boolean') {
        errors.push(`${path}.emergency must be a boolean`);
    }
    if (!isNonEmptyString(value.trigger_reason)) {
        errors.push(`${path}.trigger_reason must be a non-empty string`);
    }
}

function validateOpportunityAxisReason(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isOpportunityAxis(value.axis)) {
        errors.push(`${path}.axis must be a valid opportunity axis`);
    }
    if (typeof value.reason !== 'string') {
        errors.push(`${path}.reason must be a string`);
    }
}

function validateOpportunityAxisReasonArray(value: unknown, path: string, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push(`${path} must be an array when present`);
        return;
    }
    value.forEach((entry, i) => {
        validateOpportunityAxisReason(entry, `${path}[${i}]`, errors);
    });
}

function validateOpportunityAxisEvaluation(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isOpportunityAxis(value.axis)) {
        errors.push(`${path}.axis must be a valid opportunity axis`);
    }
    if (!isOpportunityAxisMode(value.mode)) {
        errors.push(`${path}.mode must be required, optional, or n_a`);
    }
    if (typeof value.green !== 'boolean') {
        errors.push(`${path}.green must be a boolean`);
    }
    if (typeof value.reason !== 'string') {
        errors.push(`${path}.reason must be a string`);
    }
}

function validateOpportunityFootprint(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isStringArray(value.objectives)) {
        errors.push(`${path}.objectives must be a string array`);
    }
    if (!isStringArray(value.staging_osids)) {
        errors.push(`${path}.staging_osids must be a string array`);
    }
}

function validateOpportunityRedirectVariant(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.variant_id)) {
        errors.push(`${path}.variant_id must be a non-empty string`);
    }
    if (!isNonEmptyString(value.name)) {
        errors.push(`${path}.name must be a non-empty string`);
    }
    validateOpportunityFootprint(value, path, errors);
}

function validateOpportunityForceQualityTraits(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object when present`);
        return;
    }
    for (const trait of OPPORTUNITY_FORCE_QUALITY_TRAITS) {
        const traitValue = value[trait];
        if (!isFiniteNumber(traitValue) || traitValue < 0 || traitValue > 1) {
            errors.push(`${path}.${trait} must be a finite number between 0 and 1`);
        }
    }
}

function validateOperationOpportunityState(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.opportunity_id)) {
        errors.push(`${path}.opportunity_id must be a non-empty string`);
    }
    if (!isNonEmptyString(value.proposal_id)) {
        errors.push(`${path}.proposal_id must be a non-empty string`);
    }
    if (!isNonNegativeInteger(value.eligibility_turn)) {
        errors.push(`${path}.eligibility_turn must be a non-negative integer`);
    }
    if (!isNonNegativeInteger(value.expires_turn)) {
        errors.push(`${path}.expires_turn must be a non-negative integer`);
    } else if (isNonNegativeInteger(value.eligibility_turn) && value.expires_turn < value.eligibility_turn) {
        errors.push(`${path}.expires_turn must be greater than or equal to eligibility_turn`);
    }
    if (!isOpportunityStatus(value.status)) {
        errors.push(`${path}.status must be a valid opportunity status`);
    }
    if (!isCanonicalPlayerFaction(value.approver_faction)) {
        errors.push(`${path}.approver_faction must be one of: RBiH, RS, HRHB`);
    }
    if ('response_turn' in value && value.response_turn !== undefined && !isNonNegativeInteger(value.response_turn)) {
        errors.push(`${path}.response_turn must be a non-negative integer when present`);
    }
    if ('redirect_variant_id' in value && value.redirect_variant_id !== undefined && !isNonEmptyString(value.redirect_variant_id)) {
        errors.push(`${path}.redirect_variant_id must be a non-empty string when present`);
    }
    if ('executed_op_id' in value && value.executed_op_id !== undefined && !isNonEmptyString(value.executed_op_id)) {
        errors.push(`${path}.executed_op_id must be a non-empty string when present`);
    }
    if ('reevaluate_at_turn' in value && value.reevaluate_at_turn !== undefined && !isNonNegativeInteger(value.reevaluate_at_turn)) {
        errors.push(`${path}.reevaluate_at_turn must be a non-negative integer when present`);
    }
    if (!Array.isArray(value.last_axis_evaluation)) {
        errors.push(`${path}.last_axis_evaluation must be an array`);
    } else {
        value.last_axis_evaluation.forEach((entry, i) => {
            validateOpportunityAxisEvaluation(entry, `${path}.last_axis_evaluation[${i}]`, errors);
        });
    }
    if ('last_footprint' in value && value.last_footprint !== undefined) {
        validateOpportunityFootprint(value.last_footprint, `${path}.last_footprint`, errors);
    }
    if ('redirect_variants' in value && value.redirect_variants !== undefined) {
        if (!Array.isArray(value.redirect_variants)) {
            errors.push(`${path}.redirect_variants must be an array when present`);
        } else {
            value.redirect_variants.forEach((entry, i) => {
                validateOpportunityRedirectVariant(entry, `${path}.redirect_variants[${i}]`, errors);
            });
        }
    }
    if ('last_force_quality_traits' in value && value.last_force_quality_traits !== undefined) {
        validateOpportunityForceQualityTraits(value.last_force_quality_traits, `${path}.last_force_quality_traits`, errors);
    }
}

function validateOperationOpportunityResolution(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.proposal_id)) {
        errors.push(`${path}.proposal_id must be a non-empty string`);
    }
    if (!isNonEmptyString(value.opportunity_id)) {
        errors.push(`${path}.opportunity_id must be a non-empty string`);
    }
    if (!isOpportunityResponse(value.response)) {
        errors.push(`${path}.response must be a valid opportunity response`);
    }
    if (!isNonNegativeInteger(value.response_turn)) {
        errors.push(`${path}.response_turn must be a non-negative integer`);
    }
    if ('executed_op_name' in value && value.executed_op_name !== undefined && !isNonEmptyString(value.executed_op_name)) {
        errors.push(`${path}.executed_op_name must be a non-empty string when present`);
    }
    if ('executed_op_aar_id' in value && value.executed_op_aar_id !== undefined && !isNonEmptyString(value.executed_op_aar_id)) {
        errors.push(`${path}.executed_op_aar_id must be a non-empty string when present`);
    }
    if ('exit_class' in value && value.exit_class !== undefined && !isOpportunityExitClass(value.exit_class)) {
        errors.push(`${path}.exit_class must be a valid opportunity exit class when present`);
    }
}

function validateOperationOpportunityDiagnostic(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonNegativeInteger(value.turn)) {
        errors.push(`${path}.turn must be a non-negative integer`);
    }
    if (!isNonEmptyString(value.opportunity_id)) {
        errors.push(`${path}.opportunity_id must be a non-empty string`);
    }
    validateOpportunityAxisReasonArray(value.failed_required_axes, `${path}.failed_required_axes`, errors);
    validateOpportunityAxisReasonArray(value.failed_optional_axes, `${path}.failed_optional_axes`, errors);
    if (!isNonNegativeInteger(value.optional_green_count)) {
        errors.push(`${path}.optional_green_count must be a non-negative integer`);
    }
    if (!isNonNegativeInteger(value.min_optional_axes)) {
        errors.push(`${path}.min_optional_axes must be a non-negative integer`);
    }
}

function validateOperationOpportunityTrace(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonNegativeInteger(value.turn)) {
        errors.push(`${path}.turn must be a non-negative integer`);
    }
    if (!isNonEmptyString(value.opportunity_id)) {
        errors.push(`${path}.opportunity_id must be a non-empty string`);
    }
    if (!isOpportunityTraceEvent(value.event)) {
        errors.push(`${path}.event must be a valid opportunity trace event`);
    }
    if ('proposal_id' in value && value.proposal_id !== undefined && !isNonEmptyString(value.proposal_id)) {
        errors.push(`${path}.proposal_id must be a non-empty string when present`);
    }
    if ('failed_required_axes' in value && value.failed_required_axes !== undefined) {
        validateOpportunityAxisReasonArray(value.failed_required_axes, `${path}.failed_required_axes`, errors);
    }
    if ('failed_optional_axes' in value && value.failed_optional_axes !== undefined) {
        validateOpportunityAxisReasonArray(value.failed_optional_axes, `${path}.failed_optional_axes`, errors);
    }
    if ('optional_green_count' in value && value.optional_green_count !== undefined && !isNonNegativeInteger(value.optional_green_count)) {
        errors.push(`${path}.optional_green_count must be a non-negative integer when present`);
    }
    if ('min_optional_axes' in value && value.min_optional_axes !== undefined && !isNonNegativeInteger(value.min_optional_axes)) {
        errors.push(`${path}.min_optional_axes must be a non-negative integer when present`);
    }
    if ('executed_op_name' in value && value.executed_op_name !== undefined && !isNonEmptyString(value.executed_op_name)) {
        errors.push(`${path}.executed_op_name must be a non-empty string when present`);
    }
    if ('redirect_variant_id' in value && value.redirect_variant_id !== undefined && !isNonEmptyString(value.redirect_variant_id)) {
        errors.push(`${path}.redirect_variant_id must be a non-empty string when present`);
    }
}

function validateOperationOpportunityArray(
    value: unknown,
    path: string,
    errors: string[],
    validateEntry: (entry: unknown, path: string, errors: string[]) => void,
): void {
    if (!Array.isArray(value)) {
        errors.push(`${path} must be an array when present`);
        return;
    }
    value.forEach((entry, i) => {
        validateEntry(entry, `${path}[${i}]`, errors);
    });
}

function validateAiStringArray(value: unknown, path: string, errors: string[]): void {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
        errors.push(`${path} must be a string array`);
    }
}

function validateAiCorpsDirective(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isAiCorpsStance(value.stance)) {
        errors.push(`${path}.stance must be a valid AI corps stance`);
    }
    if ('priority' in value && value.priority !== undefined && typeof value.priority !== 'string') {
        errors.push(`${path}.priority must be a string when present`);
    }
    if ('hold_municipalities' in value && value.hold_municipalities !== undefined) {
        validateAiStringArray(value.hold_municipalities, `${path}.hold_municipalities`, errors);
    }
    if ('offensive_targets' in value && value.offensive_targets !== undefined) {
        validateAiStringArray(value.offensive_targets, `${path}.offensive_targets`, errors);
    }
}

function validateAiArmyDecision(value: unknown, path: string, errors: string[], expectedFaction?: string): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isCanonicalPlayerFaction(value.faction)) {
        errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
    } else if (expectedFaction !== undefined && value.faction !== expectedFaction) {
        errors.push(`${path}.faction must match its faction key`);
    }
    if (!isNonNegativeInteger(value.turn)) {
        errors.push(`${path}.turn must be a non-negative integer`);
    }
    if (!isRecord(value.corps_directives)) {
        errors.push(`${path}.corps_directives must be an object`);
    } else {
        for (const [corpsId, directive] of Object.entries(value.corps_directives)) {
            validateAiCorpsDirective(directive, `${path}.corps_directives.${corpsId}`, errors);
        }
    }
    if (!isRecord(value.operation_decisions)) {
        errors.push(`${path}.operation_decisions must be an object`);
    } else {
        validateAiStringArray(value.operation_decisions.approve, `${path}.operation_decisions.approve`, errors);
        validateAiStringArray(value.operation_decisions.postpone, `${path}.operation_decisions.postpone`, errors);
        validateAiStringArray(value.operation_decisions.abort, `${path}.operation_decisions.abort`, errors);
    }
    if ('peace_plan_response' in value && value.peace_plan_response !== undefined && !isAiPeacePlanResponse(value.peace_plan_response)) {
        errors.push(`${path}.peace_plan_response must be accept, reject, or null when present`);
    }
    if ('reserve_deployment' in value && value.reserve_deployment !== undefined && value.reserve_deployment !== null) {
        const reserveDeployment = value.reserve_deployment;
        if (!isRecord(reserveDeployment)) {
            errors.push(`${path}.reserve_deployment must be an object or null when present`);
        } else {
            if (!isNonEmptyString(reserveDeployment.deploy_to)) {
                errors.push(`${path}.reserve_deployment.deploy_to must be a non-empty string`);
            }
            if (typeof reserveDeployment.reason !== 'string') {
                errors.push(`${path}.reserve_deployment.reason must be a string`);
            }
        }
    }
    if (typeof value.strategic_reasoning !== 'string') {
        errors.push(`${path}.strategic_reasoning must be a string`);
    }
    if (typeof value.briefing_text !== 'string') {
        errors.push(`${path}.briefing_text must be a string`);
    }
}

function validateAiOperationPlan(value: unknown, path: string, errors: string[]): void {
    if (value === null) return;
    if (!isRecord(value)) {
        errors.push(`${path} must be an object or null when present`);
        return;
    }
    if (!isNonEmptyString(value.target)) {
        errors.push(`${path}.target must be a non-empty string`);
    }
    validateAiStringArray(value.force, `${path}.force`, errors);
    if (!isAiOperationApproach(value.approach)) {
        errors.push(`${path}.approach must be a valid operation approach`);
    }
    if (!isAiOperationTiming(value.timing)) {
        errors.push(`${path}.timing must be a valid operation timing`);
    }
}

function validateAiCorpsDecision(value: unknown, path: string, errors: string[], expectedFaction?: string, expectedCorpsId?: string): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isNonEmptyString(value.corps_id)) {
        errors.push(`${path}.corps_id must be a non-empty string`);
    } else if (expectedCorpsId !== undefined && value.corps_id !== expectedCorpsId) {
        errors.push(`${path}.corps_id must match its log corps_id`);
    }
    if (!isCanonicalPlayerFaction(value.faction)) {
        errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
    } else if (expectedFaction !== undefined && value.faction !== expectedFaction) {
        errors.push(`${path}.faction must match its log faction`);
    }
    if (!isNonNegativeInteger(value.turn)) {
        errors.push(`${path}.turn must be a non-negative integer`);
    }
    if (!isRecord(value.sector_stances)) {
        errors.push(`${path}.sector_stances must be an object`);
    } else {
        for (const [sectorId, stance] of Object.entries(value.sector_stances)) {
            if (!isSectorStanceValue(stance)) {
                errors.push(`${path}.sector_stances.${sectorId} must be a valid sector stance`);
            }
        }
    }
    if ('operation_plan' in value && value.operation_plan !== undefined) {
        validateAiOperationPlan(value.operation_plan, `${path}.operation_plan`, errors);
    }
    if (!isRecord(value.brigade_movements)) {
        errors.push(`${path}.brigade_movements must be an object`);
    } else {
        for (const [brigadeId, movement] of Object.entries(value.brigade_movements)) {
            const movementPath = `${path}.brigade_movements.${brigadeId}`;
            if (!isRecord(movement)) {
                errors.push(`${movementPath} must be an object`);
                continue;
            }
            if (!isNonEmptyString(movement.destination)) {
                errors.push(`${movementPath}.destination must be a non-empty string`);
            }
            if (typeof movement.reason !== 'string') {
                errors.push(`${movementPath}.reason must be a string`);
            }
        }
    }
    if (typeof value.assessment !== 'string') {
        errors.push(`${path}.assessment must be a string`);
    }
}

function validateAiAdvisorResponse(value: unknown, path: string, errors: string[], expectedFaction?: string): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (typeof value.commander_name !== 'string') {
        errors.push(`${path}.commander_name must be a string`);
    }
    if (!isCanonicalPlayerFaction(value.faction)) {
        errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
    } else if (expectedFaction !== undefined && value.faction !== expectedFaction) {
        errors.push(`${path}.faction must match its log faction`);
    }
    if (typeof value.assessment !== 'string') {
        errors.push(`${path}.assessment must be a string`);
    }
    if (!Array.isArray(value.recommendations)) {
        errors.push(`${path}.recommendations must be an array`);
    } else {
        value.recommendations.forEach((recommendation, i) => {
            const recommendationPath = `${path}.recommendations[${i}]`;
            if (!isRecord(recommendation)) {
                errors.push(`${recommendationPath} must be an object`);
                return;
            }
            if (!isFiniteNonNegativeNumber(recommendation.priority)) {
                errors.push(`${recommendationPath}.priority must be a finite non-negative number`);
            }
            if (typeof recommendation.action !== 'string') {
                errors.push(`${recommendationPath}.action must be a string`);
            }
            if (typeof recommendation.reasoning !== 'string') {
                errors.push(`${recommendationPath}.reasoning must be a string`);
            }
        });
    }
    if (!isAiAdvisorContextType(value.context_type)) {
        errors.push(`${path}.context_type must be a valid advisor context type`);
    }
}

function validateAiPoliticalDecision(value: unknown, path: string, errors: string[], expectedFaction?: string): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isCanonicalPlayerFaction(value.faction)) {
        errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
    } else if (expectedFaction !== undefined && value.faction !== expectedFaction) {
        errors.push(`${path}.faction must match its log faction`);
    }
    if (!isNonNegativeInteger(value.turn)) {
        errors.push(`${path}.turn must be a non-negative integer`);
    }
    if (!isRecord(value.event_responses)) {
        errors.push(`${path}.event_responses must be an object`);
    } else {
        for (const [eventId, response] of Object.entries(value.event_responses)) {
            const responsePath = `${path}.event_responses.${eventId}`;
            if (!isRecord(response)) {
                errors.push(`${responsePath} must be an object`);
                continue;
            }
            if (!isNonEmptyString(response.choice)) {
                errors.push(`${responsePath}.choice must be a non-empty string`);
            }
            if (typeof response.reasoning !== 'string') {
                errors.push(`${responsePath}.reasoning must be a string`);
            }
        }
    }
    if ('peace_plan_response' in value && value.peace_plan_response !== undefined && !isAiPeacePlanResponse(value.peace_plan_response)) {
        errors.push(`${path}.peace_plan_response must be accept, reject, or null when present`);
    }
    if ('alliance_posture' in value && value.alliance_posture !== undefined && !isAiAlliancePosture(value.alliance_posture)) {
        errors.push(`${path}.alliance_posture must be a valid alliance posture when present`);
    }
    if (typeof value.reasoning !== 'string') {
        errors.push(`${path}.reasoning must be a string`);
    }
}

function validateAiDecisionLogDecision(entry: Record<string, unknown>, path: string, errors: string[]): void {
    if (entry.level === 'army') {
        validateAiArmyDecision(entry.decision, path, errors, entry.faction as string);
    } else if (entry.level === 'corps') {
        validateAiCorpsDecision(entry.decision, path, errors, entry.faction as string, typeof entry.corps_id === 'string' ? entry.corps_id : undefined);
    } else if (entry.level === 'advisor') {
        validateAiAdvisorResponse(entry.decision, path, errors, entry.faction as string);
    } else if (entry.level === 'political' || entry.level === 'event') {
        validateAiPoliticalDecision(entry.decision, path, errors, entry.faction as string);
    } else if (!isRecord(entry.decision)) {
        errors.push(`${path} must be an object`);
    }
}

function validateAiDecisionLog(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.ai_decision_log must be an array when present');
        return;
    }

    value.forEach((entry, i) => {
        const path = `military.ai_decision_log[${i}]`;
        if (!isRecord(entry)) {
            errors.push(`${path} must be an object`);
            return;
        }
        if (!isNonNegativeInteger(entry.turn)) {
            errors.push(`${path}.turn must be a non-negative integer`);
        }
        if (!isAiDecisionLevel(entry.level)) {
            errors.push(`${path}.level must be a valid AI decision level`);
        }
        if (!isCanonicalPlayerFaction(entry.faction)) {
            errors.push(`${path}.faction must be one of: RBiH, RS, HRHB`);
        }
        if (entry.level === 'corps' && !isNonEmptyString(entry.corps_id)) {
            errors.push(`${path}.corps_id must be a non-empty string for corps-level decisions`);
        } else if ('corps_id' in entry && entry.corps_id !== undefined && !isNonEmptyString(entry.corps_id)) {
            errors.push(`${path}.corps_id must be a non-empty string when present`);
        }
        validateAiDecisionLogDecision(entry, `${path}.decision`, errors);
        if (!isNonEmptyString(entry.model_used)) {
            errors.push(`${path}.model_used must be a non-empty string`);
        }
        if ('prompt_tokens' in entry && entry.prompt_tokens !== undefined && !isFiniteNonNegativeNumber(entry.prompt_tokens)) {
            errors.push(`${path}.prompt_tokens must be a finite non-negative number when present`);
        }
        if ('completion_tokens' in entry && entry.completion_tokens !== undefined && !isFiniteNonNegativeNumber(entry.completion_tokens)) {
            errors.push(`${path}.completion_tokens must be a finite non-negative number when present`);
        }
        if ('latency_ms' in entry && entry.latency_ms !== undefined && !isFiniteNonNegativeNumber(entry.latency_ms)) {
            errors.push(`${path}.latency_ms must be a finite non-negative number when present`);
        }
    });
}

function validateAiArmyDecisions(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.ai_army_decisions must be an object when present');
        return;
    }

    for (const [faction, decision] of Object.entries(value)) {
        const path = `military.ai_army_decisions.${faction}`;
        if (!isCanonicalPlayerFaction(faction)) {
            errors.push(`${path} must use a canonical faction id key`);
        }
        validateAiArmyDecision(decision, path, errors, faction);
    }
}

function validateLogisticsPriority(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.logistics_priority must be an object when present');
        return;
    }

    for (const [faction, priorities] of Object.entries(value)) {
        const path = `military.logistics_priority.${faction}`;
        if (!isCanonicalPlayerFaction(faction)) {
            errors.push(`${path} must use a canonical faction id key`);
        }
        if (!isRecord(priorities)) {
            errors.push(`${path} must be an object`);
            continue;
        }
        for (const [targetId, priority] of Object.entries(priorities)) {
            if (!isFiniteNonNegativeNumber(priority)) {
                errors.push(`${path}.${targetId} must be a finite non-negative number`);
            }
        }
    }
}

function validateCommandAuthority(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.command_authority must be an object when present');
        return;
    }

    const current = value.current;
    const max = value.max;
    if (!isFiniteNonNegativeNumber(current)) {
        errors.push('military.command_authority.current must be a finite non-negative number');
    }
    if (!isFiniteNonNegativeNumber(max)) {
        errors.push('military.command_authority.max must be a finite non-negative number');
    }
    if (!isFiniteNonNegativeNumber(value.spent_this_turn)) {
        errors.push('military.command_authority.spent_this_turn must be a finite non-negative number');
    }
    if (!isFiniteNonNegativeNumber(value.lifetime_spent)) {
        errors.push('military.command_authority.lifetime_spent must be a finite non-negative number');
    }
    if (isFiniteNonNegativeNumber(current) && isFiniteNonNegativeNumber(max) && current > max) {
        errors.push('military.command_authority.current must be less than or equal to military.command_authority.max');
    }
}

function validateCommandBriefing(value: unknown, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push('military.last_briefing must be an object when present');
        return;
    }

    if (!isNonNegativeInteger(value.turn)) {
        errors.push('military.last_briefing.turn must be a non-negative integer');
    }
    if (!isCanonicalPlayerFaction(value.faction)) {
        errors.push('military.last_briefing.faction must be one of: RBiH, RS, HRHB');
    }
    if (typeof value.headline !== 'string') {
        errors.push('military.last_briefing.headline must be a string');
    }
    if (!isNonNegativeInteger(value.criticalCount)) {
        errors.push('military.last_briefing.criticalCount must be a non-negative integer');
    }
    if (!isNonNegativeInteger(value.warningCount)) {
        errors.push('military.last_briefing.warningCount must be a non-negative integer');
    }

    if (!Array.isArray(value.items)) {
        errors.push('military.last_briefing.items must be an array');
        return;
    }

    const criticalItemCount = value.items.filter((item) => isRecord(item) && item.severity === 'critical').length;
    const warningItemCount = value.items.filter((item) => isRecord(item) && item.severity === 'warning').length;
    if (isNonNegativeInteger(value.criticalCount) && value.criticalCount !== criticalItemCount) {
        errors.push('military.last_briefing.criticalCount must match critical item count');
    }
    if (isNonNegativeInteger(value.warningCount) && value.warningCount !== warningItemCount) {
        errors.push('military.last_briefing.warningCount must match warning item count');
    }

    value.items.forEach((item, i) => {
        const path = `military.last_briefing.items[${i}]`;
        if (!isRecord(item)) {
            errors.push(`${path} must be an object`);
            return;
        }
        for (const key of ['id', 'section', 'title', 'detail']) {
            if (!isNonEmptyString(item[key])) {
                errors.push(`${path}.${key} must be a non-empty string`);
            }
        }
        if (!isCommandBriefingSeverity(item.severity)) {
            errors.push(`${path}.severity must be one of: critical, warning, info`);
        }
        if ('actionLabel' in item && item.actionLabel !== undefined && typeof item.actionLabel !== 'string') {
            errors.push(`${path}.actionLabel must be a string when present`);
        }
        if ('target' in item && item.target !== undefined) {
            if (!isRecord(item.target)) {
                errors.push(`${path}.target must be an object when present`);
            } else {
                for (const key of ['kind', 'osid', 'corpsId', 'enclaveId']) {
                    if (key in item.target && item.target[key] !== undefined && typeof item.target[key] !== 'string') {
                        errors.push(`${path}.target.${key} must be a string when present`);
                    }
                }
            }
        }
    });
}

function validateCostLedgerAnnotations(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.cost_ledger_annotations must be an array when present');
        return;
    }

    value.forEach((annotation, i) => {
        if (!isRecord(annotation)) {
            errors.push(`military.cost_ledger_annotations[${i}] must be an object`);
            return;
        }
        if (!isNonEmptyString(annotation.event_id)) {
            errors.push(`military.cost_ledger_annotations[${i}].event_id must be a non-empty string`);
        }
        if (!isNonEmptyString(annotation.tag)) {
            errors.push(`military.cost_ledger_annotations[${i}].tag must be a non-empty string`);
        }
        if (!isNonNegativeInteger(annotation.turn)) {
            errors.push(`military.cost_ledger_annotations[${i}].turn must be a non-negative integer`);
        }
        if ('text' in annotation && annotation.text !== undefined && typeof annotation.text !== 'string') {
            errors.push(`military.cost_ledger_annotations[${i}].text must be a string when present`);
        }
        if ('faction' in annotation && annotation.faction !== undefined && !isCanonicalPlayerFaction(annotation.faction)) {
            errors.push(`military.cost_ledger_annotations[${i}].faction must be one of: RBiH, RS, HRHB`);
        }
    });
}

function isConvoyDecision(value: unknown): boolean {
    return value === 'allow' || value === 'block' || value === 'divert';
}

function validatePendingConvoyDecisions(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.pending_convoy_decisions must be an array when present');
        return;
    }

    value.forEach((decision, i) => {
        if (!isRecord(decision)) {
            errors.push(`military.pending_convoy_decisions[${i}] must be an object`);
            return;
        }
        for (const key of ['id', 'target_enclave']) {
            if (!isNonEmptyString(decision[key])) {
                errors.push(`military.pending_convoy_decisions[${i}].${key} must be a non-empty string`);
            }
        }
        if (!isCanonicalPlayerFaction(decision.route_faction)) {
            errors.push(`military.pending_convoy_decisions[${i}].route_faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isFiniteNonNegativeNumber(decision.supply_amount)) {
            errors.push(`military.pending_convoy_decisions[${i}].supply_amount must be a finite non-negative number`);
        }
        if ('decision' in decision && decision.decision !== undefined && !isConvoyDecision(decision.decision)) {
            errors.push(`military.pending_convoy_decisions[${i}].decision must be one of: allow, block, divert when present`);
        }
    });
}

function validateConvoyDecisionHistory(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.convoy_decision_history must be an array when present');
        return;
    }

    value.forEach((decision, i) => {
        if (!isRecord(decision)) {
            errors.push(`military.convoy_decision_history[${i}] must be an object`);
            return;
        }
        for (const key of ['id', 'target_enclave']) {
            if (!isNonEmptyString(decision[key])) {
                errors.push(`military.convoy_decision_history[${i}].${key} must be a non-empty string`);
            }
        }
        if (!isNonNegativeInteger(decision.turn)) {
            errors.push(`military.convoy_decision_history[${i}].turn must be a non-negative integer`);
        }
        if (!isCanonicalPlayerFaction(decision.route_faction)) {
            errors.push(`military.convoy_decision_history[${i}].route_faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isCanonicalPlayerFaction(decision.target_faction)) {
            errors.push(`military.convoy_decision_history[${i}].target_faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isFiniteNonNegativeNumber(decision.supply_amount)) {
            errors.push(`military.convoy_decision_history[${i}].supply_amount must be a finite non-negative number`);
        }
        if (!isConvoyDecision(decision.decision)) {
            errors.push(`military.convoy_decision_history[${i}].decision must be one of: allow, block, divert`);
        }
        if (decision.decided_by !== 'player' && decision.decided_by !== 'bot') {
            errors.push(`military.convoy_decision_history[${i}].decided_by must be one of: player, bot`);
        }
    });
}

function isReserveRequestReason(value: unknown): boolean {
    return value === 'offensive_support' || value === 'defensive_gap' || value === 'exploitation' || value === 'enclave_relief';
}

function isReserveRequestProvenanceDriver(value: unknown): boolean {
    return value === 'active_operation' || value === 'sector_threat' || value === 'captured_objectives' || value === 'commander_request';
}

function isCommanderRequestPriority(value: unknown): boolean {
    return value === 'critical' || value === 'high' || value === 'medium' || value === 'low';
}

function isReserveRequestPurpose(value: unknown): boolean {
    return value === 'offensive' || value === 'defensive';
}

function isReserveDecisionOutcome(value: unknown): boolean {
    return value === 'accepted' || value === 'declined' || value === 'terminated';
}

function validatePendingReserveRequests(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.pending_reserve_requests must be an array when present');
        return;
    }

    value.forEach((request, i) => {
        if (!isRecord(request)) {
            errors.push(`military.pending_reserve_requests[${i}] must be an object`);
            return;
        }
        for (const key of ['corps_id', 'faction', 'description']) {
            if (!isNonEmptyString(request[key])) {
                errors.push(`military.pending_reserve_requests[${i}].${key} must be a non-empty string`);
            }
        }
        if ('request_id' in request && request.request_id !== undefined && !isNonEmptyString(request.request_id)) {
            errors.push(`military.pending_reserve_requests[${i}].request_id must be a non-empty string when present`);
        }
        if (!isCanonicalPlayerFaction(request.faction)) {
            errors.push(`military.pending_reserve_requests[${i}].faction must be one of: RBiH, RS, HRHB`);
        }
        if (!isReserveRequestReason(request.reason)) {
            errors.push(`military.pending_reserve_requests[${i}].reason must be one of: offensive_support, defensive_gap, exploitation, enclave_relief`);
        }
        if (!isFiniteNumber(request.priority)) {
            errors.push(`military.pending_reserve_requests[${i}].priority must be a finite number`);
        }
        if (!isFiniteNumber(request.raw_priority)) {
            errors.push(`military.pending_reserve_requests[${i}].raw_priority must be a finite number`);
        }
        if (!isNonNegativeInteger(request.travel_hops)) {
            errors.push(`military.pending_reserve_requests[${i}].travel_hops must be a non-negative integer`);
        }
        if (!isNonNegativeInteger(request.turn_requested)) {
            errors.push(`military.pending_reserve_requests[${i}].turn_requested must be a non-negative integer`);
        }
        if (request.suggested_brigade_id !== null && !isNonEmptyString(request.suggested_brigade_id)) {
            errors.push(`military.pending_reserve_requests[${i}].suggested_brigade_id must be null or a non-empty string`);
        }
        if ('provenance_driver' in request && request.provenance_driver !== undefined && !isReserveRequestProvenanceDriver(request.provenance_driver)) {
            errors.push(`military.pending_reserve_requests[${i}].provenance_driver must be one of: active_operation, sector_threat, captured_objectives, commander_request`);
        }
        if ('commander_request_priority' in request && request.commander_request_priority !== undefined && !isCommanderRequestPriority(request.commander_request_priority)) {
            errors.push(`military.pending_reserve_requests[${i}].commander_request_priority must be one of: critical, high, medium, low`);
        }
        if ('commander_request_brigades_needed' in request && request.commander_request_brigades_needed !== undefined && !isNonNegativeInteger(request.commander_request_brigades_needed)) {
            errors.push(`military.pending_reserve_requests[${i}].commander_request_brigades_needed must be a non-negative integer when present`);
        }
        for (const key of ['commander_focus_zone_id', 'operation_name', 'operation_phase', 'operation_preparation_sub_phase', 'why_needed', 'how_to_use']) {
            if (key in request && request[key] !== undefined && !isNonEmptyString(request[key])) {
                errors.push(`military.pending_reserve_requests[${i}].${key} must be a non-empty string when present`);
            }
        }
        for (const key of ['sector_threat_ratio', 'operation_momentum']) {
            if (key in request && request[key] !== undefined && !isFiniteNumber(request[key])) {
                errors.push(`military.pending_reserve_requests[${i}].${key} must be a finite number when present`);
            }
        }
        for (const key of ['sector_assigned_brigade_count', 'operation_objective_capture_count']) {
            if (key in request && request[key] !== undefined && !isNonNegativeInteger(request[key])) {
                errors.push(`military.pending_reserve_requests[${i}].${key} must be a non-negative integer when present`);
            }
        }
        if ('purpose' in request && request.purpose !== undefined && !isReserveRequestPurpose(request.purpose)) {
            errors.push(`military.pending_reserve_requests[${i}].purpose must be one of: offensive, defensive when present`);
        }
    });
}

function validateReserveRequestHistory(value: unknown, errors: string[]): void {
    if (!Array.isArray(value)) {
        errors.push('military.reserve_request_history must be an array when present');
        return;
    }

    value.forEach((record, i) => {
        if (!isRecord(record)) {
            errors.push(`military.reserve_request_history[${i}] must be an object`);
            return;
        }
        for (const key of ['request_id', 'faction', 'corps_id', 'reason', 'why_needed', 'how_to_use']) {
            if (!isNonEmptyString(record[key])) {
                errors.push(`military.reserve_request_history[${i}].${key} must be a non-empty string`);
            }
        }
        if (!isNonNegativeInteger(record.turn)) {
            errors.push(`military.reserve_request_history[${i}].turn must be a non-negative integer`);
        }
        if (!isCanonicalPlayerFaction(record.faction)) {
            errors.push(`military.reserve_request_history[${i}].faction must be one of: RBiH, RS, HRHB`);
        }
        if (record.brigade_id !== null && !isNonEmptyString(record.brigade_id)) {
            errors.push(`military.reserve_request_history[${i}].brigade_id must be null or a non-empty string`);
        }
        if (!isReserveDecisionOutcome(record.outcome)) {
            errors.push(`military.reserve_request_history[${i}].outcome must be one of: accepted, declined, terminated`);
        }
        if (record.decided_by !== 'army_ai' && record.decided_by !== 'player') {
            errors.push(`military.reserve_request_history[${i}].decided_by must be one of: army_ai, player`);
        }
        if (!isReserveRequestPurpose(record.purpose)) {
            errors.push(`military.reserve_request_history[${i}].purpose must be one of: offensive, defensive`);
        }
    });
}

function validateNonNegativeIntegerRecord(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object when present`);
        return;
    }
    for (const [key, turn] of Object.entries(value)) {
        if (!isNonNegativeInteger(turn)) {
            errors.push(`${path}.${key} must be a non-negative integer`);
        }
    }
}

function validateDeclinedOperationRecord(value: unknown, errors: string[]): void {
    const path = 'military.declined_operations';
    if (!isRecord(value)) {
        errors.push(`${path} must be an object when present`);
        return;
    }
    for (const [key, entry] of Object.entries(value)) {
        if (!isRecord(entry)) {
            errors.push(`${path}.${key} must be an object`);
            continue;
        }
        if (!isNonNegativeInteger(entry.declined_turn)) {
            errors.push(`${path}.${key}.declined_turn must be a non-negative integer`);
        }
        if (!isNonNegativeInteger(entry.decline_count)) {
            errors.push(`${path}.${key}.decline_count must be a non-negative integer`);
        }
    }
}

const VERSION_REQUIRED_FIELDS: readonly VersionRequiredField[] = [
    { version: 3, path: 'meta.referendum_held', check: (v) => typeof v === 'boolean' },
    { version: 3, path: 'meta.referendum_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.war_start_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.peace_scheduled_referendum_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.peace_scheduled_war_start_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.peace_war_start_control_path', check: (v) => v === null || typeof v === 'string' },
    { version: 3, path: 'meta.referendum_eligible_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.referendum_deadline_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.game_over', check: (v) => typeof v === 'boolean' },
    { version: 4, path: 'political.negotiation_status', check: isRecord },
    { version: 4, path: 'political.ceasefire', check: isRecord },
    { version: 4, path: 'political.negotiation_ledger', check: Array.isArray },
    { version: 4, path: 'political.supply_rights', check: isRecord },
    { version: 5, path: 'military.front_segments', check: isRecord },
    { version: 5, path: 'military.theatres', check: isRecord },
    { version: 5, path: 'military.army_theatre_assignment', check: isRecord },
    { version: 5, path: 'military.formations', check: isRecord },
    { version: 5, path: 'military.front_posture', check: isRecord },
    { version: 5, path: 'military.front_posture_regions', check: isRecord },
    { version: 5, path: 'military.front_pressure', check: isRecord },
    { version: 5, path: 'military.assignable_front_segments', check: Array.isArray },
    { version: 5, path: 'military.brigade_front_assignment', check: isRecord },
    { version: 5, path: 'military.militia_pools', check: isRecord },
    { version: 6, path: 'political.war_consolidation_until', check: isRecord },
    { version: 6, path: 'political.war_control_strain', check: isRecord },
    { version: 7, path: 'political.war_supply_pressure', check: isRecord },
    { version: 7, path: 'political.war_supply_condition', check: isRecord },
    { version: 7, path: 'political.war_exhaustion', check: isRecord },
    { version: 7, path: 'political.war_exhaustion_local', check: isRecord },
    { version: 7, path: 'displacement.displacement_event_log', check: Array.isArray },
    { version: 8, path: 'displacement.displacement_humanitarian_aggregates', check: isRecord },
    { version: 8, path: 'displacement.displacement_origin_dest_arrivals', check: isRecord },
    { version: 8, path: 'displacement.displacement_recent_by_turn', check: isRecord },
    { version: 10, path: 'military.army_co_decision_traces', check: isRecord },
    { version: 10, path: 'military.army_corps_directives_by_faction', check: isRecord },
    { version: 14, path: 'military.event_decision_log', check: Array.isArray },
    { version: 15, path: 'military.fired_event_ids', check: Array.isArray },
    { version: 15, path: 'military.event_readiness', check: isRecord },
    { version: 15, path: 'military.event_fire_counts', check: isRecord },
    { version: 15, path: 'military.event_last_fired_turn', check: isRecord },
    { version: 15, path: 'military.event_flags', check: isRecord },
    { version: 15, path: 'military.enabled_event_ids', check: Array.isArray },
    { version: 16, path: 'displacement.settlement_displacement', check: isRecord },
    { version: 16, path: 'displacement.settlement_displacement_started_turn', check: isRecord },
    { version: 16, path: 'displacement.municipality_displacement', check: isRecord },
    { version: 17, path: 'displacement.war_displacement_initiated', check: isRecord },
    { version: 17, path: 'displacement.hostile_takeover_timers', check: isRecord },
    { version: 17, path: 'displacement.displacement_camp_state', check: isRecord },
    { version: 18, path: 'displacement.displacement_state', check: isRecord },
    { version: 18, path: 'displacement.minority_flight_state', check: isRecord },
    { version: 18, path: 'displacement.sustainability_state', check: isRecord },
    { version: 19, path: 'displacement.civilian_casualties', check: isCivilianCasualtiesRecord },
    { version: 20, path: 'military.phantoms_spawned', check: isStringArray },
    { version: 21, path: 'paramilitary_decision_history', check: Array.isArray },
    { version: 22, path: 'military.event_overflow_queue', check: isStringArray },
    { version: 23, path: 'military.pending_event_notifications', check: Array.isArray },
    { version: 24, path: 'military.pending_event_decisions', check: Array.isArray },
    { version: 25, path: 'military.event_aggression_modifiers', check: Array.isArray },
    { version: 25, path: 'military.recruitment_modifiers', check: Array.isArray },
    { version: 25, path: 'military.equipment_quality_modifiers', check: Array.isArray },
    { version: 26, path: 'military.cost_ledger_annotations', check: Array.isArray },
    { version: 27, path: 'military.pending_convoy_decisions', check: Array.isArray },
    { version: 27, path: 'military.convoy_decision_history', check: Array.isArray },
    { version: 28, path: 'military.pending_reserve_requests', check: Array.isArray },
    { version: 28, path: 'military.reserve_request_history', check: Array.isArray },
    { version: 29, path: 'military.triggered_operations_accepted', check: isNonNegativeIntegerRecord },
    { version: 29, path: 'military.declined_operations', check: isDeclinedOperationRecord },
    { version: 29, path: 'military.used_operation_names', check: isNonNegativeIntegerRecord },
    { version: 30, path: 'military.pending_officer_events', check: Array.isArray },
    { version: 30, path: 'military.officer_decision_history', check: Array.isArray },
    { version: 31, path: 'military.cascade_penalties', check: Array.isArray },
    { version: 31, path: 'military.offensive_ops_suppressions', check: Array.isArray },
    { version: 31, path: 'military.alliance_locks', check: Array.isArray },
    { version: 31, path: 'military.bot_priority_shifts', check: Array.isArray },
    { version: 32, path: 'military.closed_event_ids', check: isStringArray },
    { version: 33, path: 'military.event_causality_log', check: Array.isArray },
];

/**
 * Validates Phase A1.1 canonical GameState shape (foundation-only).
 * - current_turn (meta.turn) is integer >= 0
 * - phase (if present) is one of known PhaseName
 * - Every settlement in political_controllers has political_controller defined (value may be null)
 * - No denylisted derived-state keys at top level
 */
export function validateGameStateShape(
    state: unknown,
    options: ValidateGameStateShapeOptions = {},
): ValidateGameStateShapeResult {
    const errors: string[] = [];

    if (state == null || typeof state !== 'object') {
        return { ok: false, errors: ['State must be an object'] };
    }

    const s = state as Record<string, unknown>;
    const stateVersion = typeof s.schema_version === 'number' && Number.isInteger(s.schema_version)
        ? s.schema_version
        : 0;

    // Denylist: no derived-state keys at top level
    for (const key of DERIVED_STATE_DENYLIST) {
        if (Object.prototype.hasOwnProperty.call(s, key)) {
            errors.push(`Top-level key "${key}" is denylisted (derived state must not be stored; Engine Invariants §13.1)`);
        }
    }

    if (options.requireVersion !== undefined) {
        for (const field of VERSION_REQUIRED_FIELDS) {
            if (stateVersion < field.version || field.version > options.requireVersion) continue;
            const value = getPathValue(s, field.path);
            if (value === undefined || !field.check(value)) {
                errors.push(`v${field.version} required field missing or invalid: ${field.path}`);
            }
        }
    }

    if (!Object.prototype.hasOwnProperty.call(s, 'meta')) {
        errors.push('Missing required field: meta');
    } else {
        const meta = s.meta;
        if (meta == null || typeof meta !== 'object') {
            errors.push('meta must be an object');
        } else {
            const m = meta as Record<string, unknown>;
            if (!('turn' in m)) {
                errors.push('meta.turn is required');
            } else {
                const turn = m.turn;
                if (typeof turn !== 'number' || !Number.isInteger(turn) || turn < 0) {
                    errors.push('meta.turn must be a non-negative integer (weeks)');
                }
            }
            if ('phase' in m && m.phase !== undefined) {
                const phase = m.phase;
                if (typeof phase !== 'string' || !KNOWN_PHASES.includes(phase as PhaseName)) {
                    errors.push(`meta.phase must be one of: ${KNOWN_PHASES.join(', ')}`);
                }
            }
            // player_faction is required for current loaded gameplay state. Scenario JSON may remain neutral;
            // legacy saves receive the desktop default through save migration v14.
            // Headless harness exemption: scenario_runner sets headless_scenario_auto_control=true and
            // leaves player_faction undefined so the event evaluator routes all events through bot
            // auto-respond. Don't require player_faction in this case (matches save-migration v14 exemption).
            const requirePlayerFaction = stateVersion >= 14 || (options.requireVersion !== undefined && options.requireVersion >= 14);
            const isHeadlessHarness = m.headless_scenario_auto_control === true;
            if (requirePlayerFaction && !isHeadlessHarness) {
                if (!isCanonicalPlayerFaction(m.player_faction)) {
                    errors.push('meta.player_faction is required and must be one of: RBiH, RS, HRHB');
                }
            } else if ('player_faction' in m && m.player_faction !== undefined) {
                if (!isCanonicalPlayerFaction(m.player_faction)) {
                    errors.push('meta.player_faction must be one of: RBiH, RS, HRHB when present');
                }
            }
            // Phase 0: Referendum and war-start fields (optional; validate type when present)
            if ('referendum_held' in m && m.referendum_held !== undefined && typeof m.referendum_held !== 'boolean') {
                errors.push('meta.referendum_held must be boolean when present');
            }
            if ('referendum_turn' in m && m.referendum_turn !== undefined && m.referendum_turn !== null && (typeof m.referendum_turn !== 'number' || !Number.isInteger(m.referendum_turn) || m.referendum_turn < 0)) {
                errors.push('meta.referendum_turn must be null or a non-negative integer when present');
            }
            if ('war_start_turn' in m && m.war_start_turn !== undefined && m.war_start_turn !== null && (typeof m.war_start_turn !== 'number' || !Number.isInteger(m.war_start_turn) || m.war_start_turn < 0)) {
                errors.push('meta.war_start_turn must be null or a non-negative integer when present');
            }
            if ('peace_scheduled_referendum_turn' in m && m.peace_scheduled_referendum_turn !== undefined && m.peace_scheduled_referendum_turn !== null && (typeof m.peace_scheduled_referendum_turn !== 'number' || !Number.isInteger(m.peace_scheduled_referendum_turn) || m.peace_scheduled_referendum_turn < 0)) {
                errors.push('meta.peace_scheduled_referendum_turn must be null or a non-negative integer when present');
            }
            if ('peace_scheduled_war_start_turn' in m && m.peace_scheduled_war_start_turn !== undefined && m.peace_scheduled_war_start_turn !== null && (typeof m.peace_scheduled_war_start_turn !== 'number' || !Number.isInteger(m.peace_scheduled_war_start_turn) || m.peace_scheduled_war_start_turn < 0)) {
                errors.push('meta.peace_scheduled_war_start_turn must be null or a non-negative integer when present');
            }
            if ('peace_war_start_control_path' in m && m.peace_war_start_control_path !== undefined && m.peace_war_start_control_path !== null && typeof m.peace_war_start_control_path !== 'string') {
                errors.push('meta.peace_war_start_control_path must be string or null when present');
            }
            if ('referendum_eligible_turn' in m && m.referendum_eligible_turn !== undefined && m.referendum_eligible_turn !== null && (typeof m.referendum_eligible_turn !== 'number' || !Number.isInteger(m.referendum_eligible_turn) || m.referendum_eligible_turn < 0)) {
                errors.push('meta.referendum_eligible_turn must be null or a non-negative integer when present');
            }
            if ('referendum_deadline_turn' in m && m.referendum_deadline_turn !== undefined && m.referendum_deadline_turn !== null && (typeof m.referendum_deadline_turn !== 'number' || !Number.isInteger(m.referendum_deadline_turn) || m.referendum_deadline_turn < 0)) {
                errors.push('meta.referendum_deadline_turn must be null or a non-negative integer when present');
            }
            if ('game_over' in m && m.game_over !== undefined && typeof m.game_over !== 'boolean') {
                errors.push('meta.game_over must be boolean when present');
            }
            if ('outcome' in m && m.outcome !== undefined && m.outcome !== null && typeof m.outcome !== 'string') {
                errors.push('meta.outcome must be string or null when present');
            }
            // Phase 0→I transition audit (§8 Output Contract; optional when present)
            if ('peace_end_turn' in m && m.peace_end_turn !== undefined && m.peace_end_turn !== null && (typeof m.peace_end_turn !== 'number' || !Number.isInteger(m.peace_end_turn) || m.peace_end_turn < 0)) {
                errors.push('meta.peace_end_turn must be null or a non-negative integer when present');
            }
            if ('war_start_lifecycle_phase_turn' in m && m.war_start_lifecycle_phase_turn !== undefined && m.war_start_lifecycle_phase_turn !== null && (typeof m.war_start_lifecycle_phase_turn !== 'number' || !Number.isInteger(m.war_start_lifecycle_phase_turn) || m.war_start_lifecycle_phase_turn < 0)) {
                errors.push('meta.war_start_lifecycle_phase_turn must be null or a non-negative integer when present');
            }
            if ('escalation_reason' in m && m.escalation_reason !== undefined && m.escalation_reason !== null && typeof m.escalation_reason !== 'string') {
                errors.push('meta.escalation_reason must be string or null when present');
            }
            // D0.9.1: Peace phase opposing-edges streak (optional; non-negative integer when present)
            if (
                'war_opposing_edges_streak' in m &&
                m.war_opposing_edges_streak !== undefined &&
                (typeof m.war_opposing_edges_streak !== 'number' ||
                    !Number.isInteger(m.war_opposing_edges_streak) ||
                    m.war_opposing_edges_streak < 0)
            ) {
                errors.push('meta.war_opposing_edges_streak must be a non-negative integer when present');
            }
            if (
                'rbih_hrhb_war_earliest_turn' in m &&
                m.rbih_hrhb_war_earliest_turn !== undefined &&
                m.rbih_hrhb_war_earliest_turn !== null &&
                (typeof m.rbih_hrhb_war_earliest_turn !== 'number' ||
                    !Number.isInteger(m.rbih_hrhb_war_earliest_turn) ||
                    m.rbih_hrhb_war_earliest_turn < 0)
            ) {
                errors.push('meta.rbih_hrhb_war_earliest_turn must be null or a non-negative integer when present');
            }
            // Free War Phase 0: bot event-decision mode. Legacy/unset saves migrate to
            // explicit historical at v35; current loaded saves must carry the mode.
            const requireDecisionMode = stateVersion >= 35 || (options.requireVersion !== undefined && options.requireVersion >= 35);
            if (requireDecisionMode && m.decision_mode === undefined) {
                errors.push("meta.decision_mode is required and must be 'historical' or 'emergent'");
            }
            if (
                'decision_mode' in m &&
                m.decision_mode !== undefined &&
                m.decision_mode !== 'historical' &&
                m.decision_mode !== 'emergent'
            ) {
                errors.push("meta.decision_mode must be 'historical' or 'emergent' when present");
            }
        }
    }

    // Partition root validation: military, political, displacement
    if (!Object.prototype.hasOwnProperty.call(s, 'military') || s.military == null || typeof s.military !== 'object' || Array.isArray(s.military)) {
        errors.push('state.military must be a non-null object');
    }
    if (!Object.prototype.hasOwnProperty.call(s, 'political') || s.political == null || typeof s.political !== 'object' || Array.isArray(s.political)) {
        errors.push('state.political must be a non-null object');
    } else {
        const pol = s.political as Record<string, unknown>;
        if (!Object.prototype.hasOwnProperty.call(pol, 'political_controllers') || pol.political_controllers == null || typeof pol.political_controllers !== 'object' || Array.isArray(pol.political_controllers)) {
            errors.push('state.political.political_controllers must be a non-null object');
        }
    }
    // displacement is optional (may be undefined for pre-displacement saves)
    if (Object.prototype.hasOwnProperty.call(s, 'displacement') && s.displacement !== undefined) {
        if (s.displacement === null || typeof s.displacement !== 'object' || Array.isArray(s.displacement)) {
            errors.push('state.displacement must be an object when present');
        }
    }

    // Peace phase: optional early-war fields live under state.military/state.political
    const military = s.military as Record<string, unknown>;
    if (military && typeof military === 'object' && !Array.isArray(military) && 'pending_event_decisions' in military && military.pending_event_decisions !== undefined) {
        validatePendingEventDecisions(military.pending_event_decisions, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'event_decision_log' in military && military.event_decision_log !== undefined) {
        validateEventDecisionLog(military.event_decision_log, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'event_overflow_queue' in military && military.event_overflow_queue !== undefined && !isStringArray(military.event_overflow_queue)) {
        errors.push('military.event_overflow_queue must be a string array when present');
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'event_aggression_modifiers' in military && military.event_aggression_modifiers !== undefined) {
        validateExpiringFactionNumberModifiers(military.event_aggression_modifiers, 'military.event_aggression_modifiers', 'delta', errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'recruitment_modifiers' in military && military.recruitment_modifiers !== undefined) {
        validateExpiringFactionNumberModifiers(military.recruitment_modifiers, 'military.recruitment_modifiers', 'pool_multiplier', errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'equipment_quality_modifiers' in military && military.equipment_quality_modifiers !== undefined) {
        validateExpiringFactionNumberModifiers(military.equipment_quality_modifiers, 'military.equipment_quality_modifiers', 'multiplier', errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'cost_ledger_annotations' in military && military.cost_ledger_annotations !== undefined) {
        validateCostLedgerAnnotations(military.cost_ledger_annotations, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'pending_convoy_decisions' in military && military.pending_convoy_decisions !== undefined) {
        validatePendingConvoyDecisions(military.pending_convoy_decisions, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'convoy_decision_history' in military && military.convoy_decision_history !== undefined) {
        validateConvoyDecisionHistory(military.convoy_decision_history, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'pending_reserve_requests' in military && military.pending_reserve_requests !== undefined) {
        validatePendingReserveRequests(military.pending_reserve_requests, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'reserve_request_history' in military && military.reserve_request_history !== undefined) {
        validateReserveRequestHistory(military.reserve_request_history, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'triggered_operations_accepted' in military && military.triggered_operations_accepted !== undefined) {
        validateNonNegativeIntegerRecord(military.triggered_operations_accepted, 'military.triggered_operations_accepted', errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'declined_operations' in military && military.declined_operations !== undefined) {
        validateDeclinedOperationRecord(military.declined_operations, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'used_operation_names' in military && military.used_operation_names !== undefined) {
        validateNonNegativeIntegerRecord(military.used_operation_names, 'military.used_operation_names', errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'operation_opportunities' in military && military.operation_opportunities !== undefined) {
        validateOperationOpportunityArray(military.operation_opportunities, 'military.operation_opportunities', errors, validateOperationOpportunityState);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'operation_opportunity_resolutions' in military && military.operation_opportunity_resolutions !== undefined) {
        validateOperationOpportunityArray(military.operation_opportunity_resolutions, 'military.operation_opportunity_resolutions', errors, validateOperationOpportunityResolution);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'operation_opportunity_diagnostics' in military && military.operation_opportunity_diagnostics !== undefined) {
        validateOperationOpportunityArray(military.operation_opportunity_diagnostics, 'military.operation_opportunity_diagnostics', errors, validateOperationOpportunityDiagnostic);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'operation_opportunity_traces' in military && military.operation_opportunity_traces !== undefined) {
        validateOperationOpportunityArray(military.operation_opportunity_traces, 'military.operation_opportunity_traces', errors, validateOperationOpportunityTrace);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'pending_officer_events' in military && military.pending_officer_events !== undefined) {
        validatePendingOfficerEvents(military.pending_officer_events, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'officer_decision_history' in military && military.officer_decision_history !== undefined) {
        validateOfficerDecisionHistory(military.officer_decision_history, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'cascade_penalties' in military && military.cascade_penalties !== undefined) {
        validateCascadePenalties(military.cascade_penalties, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'offensive_ops_suppressions' in military && military.offensive_ops_suppressions !== undefined) {
        validateOffensiveOpsSuppressions(military.offensive_ops_suppressions, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'alliance_locks' in military && military.alliance_locks !== undefined) {
        validateAllianceLocks(military.alliance_locks, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'bot_priority_shifts' in military && military.bot_priority_shifts !== undefined) {
        validateBotPriorityShifts(military.bot_priority_shifts, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'event_constraints' in military && military.event_constraints !== undefined) {
        validateEventConstraints(military.event_constraints, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'patron_defiance_supply_cuts' in military && military.patron_defiance_supply_cuts !== undefined) {
        validatePatronDefianceSupplyCuts(military.patron_defiance_supply_cuts, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'airdrop_allocation' in military && military.airdrop_allocation !== undefined) {
        validateFiniteNonNegativeNumberRecord(military.airdrop_allocation, 'military.airdrop_allocation', errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'smuggling_allocation' in military && military.smuggling_allocation !== undefined) {
        validateSmugglingAllocation(military.smuggling_allocation, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'army_stance' in military && military.army_stance !== undefined) {
        validateArmyStanceRecord(military.army_stance, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'sector_stance_orders' in military && military.sector_stance_orders !== undefined) {
        validateSectorStanceOrders(military.sector_stance_orders, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'municipality_support_orders' in military && military.municipality_support_orders !== undefined) {
        validateMunicipalitySupportOrders(military.municipality_support_orders, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'army_hq_overrides' in military && military.army_hq_overrides !== undefined) {
        validateArmyHqOverrides(military.army_hq_overrides, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'opsec_sectors' in military && military.opsec_sectors !== undefined && !isStringArray(military.opsec_sectors)) {
        errors.push('military.opsec_sectors must be a string array when present');
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'logistics_priority' in military && military.logistics_priority !== undefined) {
        validateLogisticsPriority(military.logistics_priority, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'command_authority' in military && military.command_authority !== undefined) {
        validateCommandAuthority(military.command_authority, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'last_briefing' in military && military.last_briefing !== undefined) {
        validateCommandBriefing(military.last_briefing, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'ai_decision_log' in military && military.ai_decision_log !== undefined) {
        validateAiDecisionLog(military.ai_decision_log, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'ai_army_decisions' in military && military.ai_army_decisions !== undefined) {
        validateAiArmyDecisions(military.ai_army_decisions, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'closed_event_ids' in military && military.closed_event_ids !== undefined) {
        validateClosedEventIds(military.closed_event_ids, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'event_causality_log' in military && military.event_causality_log !== undefined) {
        validateEventCausalityLog(military.event_causality_log, errors);
    }
    if (military && typeof military === 'object' && !Array.isArray(military) && 'pending_event_notifications' in military && military.pending_event_notifications !== undefined) {
        const notifications = military.pending_event_notifications;
        if (!Array.isArray(notifications)) {
            errors.push('military.pending_event_notifications must be an array when present');
        } else {
            for (let i = 0; i < notifications.length; i++) {
                const notification = notifications[i];
                if (notification == null || typeof notification !== 'object' || Array.isArray(notification)) {
                    errors.push(`military.pending_event_notifications[${i}] must be an object`);
                    continue;
                }
                const n = notification as Record<string, unknown>;
                for (const key of ['notification_id', 'event_id', 'source_faction', 'target_faction', 'response_id', 'headline', 'body']) {
                    if (typeof n[key] !== 'string' || (n[key] as string).length === 0) {
                        errors.push(`military.pending_event_notifications[${i}].${key} must be a non-empty string`);
                    }
                }
                if (!isCanonicalPlayerFaction(n.source_faction)) {
                    errors.push(`military.pending_event_notifications[${i}].source_faction must be one of: RBiH, RS, HRHB`);
                }
                if (!isCanonicalPlayerFaction(n.target_faction)) {
                    errors.push(`military.pending_event_notifications[${i}].target_faction must be one of: RBiH, RS, HRHB`);
                }
                if (
                    typeof n.surfaced_on_turn !== 'number' ||
                    !Number.isInteger(n.surfaced_on_turn) ||
                    n.surfaced_on_turn < 0
                ) {
                    errors.push(`military.pending_event_notifications[${i}].surfaced_on_turn must be a non-negative integer`);
                }
                if (typeof n.consumed !== 'boolean') {
                    errors.push(`military.pending_event_notifications[${i}].consumed must be boolean`);
                }
            }
        }
    }

    if (military && typeof military === 'object' && !Array.isArray(military) && 'war_jna' in military && military.war_jna !== undefined) {
        const jna = military.war_jna;
        if (jna !== null && typeof jna === 'object') {
            const j = jna as Record<string, unknown>;
            if (typeof j.transition_begun !== 'boolean') {
                errors.push('military.war_jna.transition_begun must be boolean when present');
            }
            if (typeof j.withdrawal_progress !== 'number' || j.withdrawal_progress < 0 || j.withdrawal_progress > 1) {
                errors.push('military.war_jna.withdrawal_progress must be a number in [0, 1] when present');
            }
            if (typeof j.asset_transfer_rs !== 'number' || j.asset_transfer_rs < 0 || j.asset_transfer_rs > 1) {
                errors.push('military.war_jna.asset_transfer_rs must be a number in [0, 1] when present');
            }
        } else {
            errors.push('military.war_jna must be an object when present');
        }
    }

    // War phase: optional supply pressure and exhaustion live under state.political
    const political = s.political as Record<string, unknown>;
    if (political && typeof political === 'object' && !Array.isArray(political)) {
        if ('war_alliance_rbih_hrhb' in political && political.war_alliance_rbih_hrhb !== undefined) {
            const v = political.war_alliance_rbih_hrhb;
            if (typeof v !== 'number' || v < -1 || v > 1) {
                errors.push('political.war_alliance_rbih_hrhb must be a number in [-1, 1] when present');
            }
        }
        if ('war_supply_pressure' in political && political.war_supply_pressure !== undefined) {
            const pp = political.war_supply_pressure;
            if (pp !== null && typeof pp === 'object' && !Array.isArray(pp)) {
                for (const [fid, val] of Object.entries(pp)) {
                    if (typeof val !== 'number' || val < 0 || val > 100) {
                        errors.push(`political.war_supply_pressure.${fid} must be a number in [0, 100] when present`);
                    }
                }
            } else {
                errors.push('political.war_supply_pressure must be an object (Record<FactionId, number>) when present');
            }
        }
        if ('war_supply_condition' in political && political.war_supply_condition !== undefined) {
            const sc = political.war_supply_condition;
            if (sc !== null && typeof sc === 'object' && !Array.isArray(sc)) {
                for (const [fid, val] of Object.entries(sc)) {
                    if (typeof val !== 'number' || val < 0 || val > 100) {
                        errors.push(`political.war_supply_condition.${fid} must be a number in [0, 100] when present`);
                    }
                }
            } else {
                errors.push('political.war_supply_condition must be an object (Record<FactionId, number>) when present');
            }
        }
        if ('war_exhaustion' in political && political.war_exhaustion !== undefined) {
            const ex = political.war_exhaustion;
            if (ex !== null && typeof ex === 'object' && !Array.isArray(ex)) {
                for (const [fid, val] of Object.entries(ex)) {
                    if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
                        errors.push(`political.war_exhaustion.${fid} must be a non-negative finite number when present`);
                    }
                }
            } else {
                errors.push('political.war_exhaustion must be an object (Record<FactionId, number>) when present');
            }
        }
        if ('war_exhaustion_local' in political && political.war_exhaustion_local !== undefined) {
            const loc = political.war_exhaustion_local;
            if (loc !== null && typeof loc === 'object' && !Array.isArray(loc)) {
                for (const [sid, val] of Object.entries(loc)) {
                    if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
                        errors.push(`political.war_exhaustion_local.${sid} must be a non-negative finite number when present`);
                    }
                }
            } else {
                errors.push('political.war_exhaustion_local must be an object (Record<SettlementId, number>) when present');
            }
        }
    }

    // War phase: AoR keys removed (brigade_municipality_assignment, brigade_mun_orders not validated; legacy load may strip)

    // Phase F: displacement state (stored; monotonic [0, 1]); current v16 saves require capacity maps.
    const displacement = s.displacement;
    if (isRecord(displacement)) {
        if ('settlement_displacement' in displacement && displacement.settlement_displacement !== undefined) {
            const sd = displacement.settlement_displacement;
            if (sd !== null && typeof sd === 'object' && !Array.isArray(sd)) {
                for (const [sid, val] of Object.entries(sd)) {
                    if (typeof val !== 'number' || val < 0 || val > 1 || !Number.isFinite(val)) {
                        errors.push(`displacement.settlement_displacement.${sid} must be a number in [0, 1] when present`);
                    }
                }
            } else {
                errors.push('displacement.settlement_displacement must be an object (Record<SettlementId, number>) when present');
            }
        }
        if ('settlement_displacement_started_turn' in displacement && displacement.settlement_displacement_started_turn !== undefined) {
            const st = displacement.settlement_displacement_started_turn;
            if (st !== null && typeof st === 'object' && !Array.isArray(st)) {
                for (const [sid, val] of Object.entries(st)) {
                    if (!Number.isInteger(val) || (val as number) < 0) {
                        errors.push(`displacement.settlement_displacement_started_turn.${sid} must be a non-negative integer when present`);
                    }
                }
            } else {
                errors.push('displacement.settlement_displacement_started_turn must be an object (Record<SettlementId, number>) when present');
            }
        }
        if ('municipality_displacement' in displacement && displacement.municipality_displacement !== undefined) {
            const md = displacement.municipality_displacement;
            if (md !== null && typeof md === 'object' && !Array.isArray(md)) {
                for (const [munId, val] of Object.entries(md)) {
                    if (typeof val !== 'number' || val < 0 || val > 1 || !Number.isFinite(val)) {
                        errors.push(`displacement.municipality_displacement.${munId} must be a number in [0, 1] when present`);
                    }
                }
            } else {
                errors.push('displacement.municipality_displacement must be an object (Record<MunicipalityId, number>) when present');
            }
        }
        if ('hostile_takeover_timers' in displacement && displacement.hostile_takeover_timers !== undefined) {
            const timers = displacement.hostile_takeover_timers;
            if (timers !== null && typeof timers === 'object' && !Array.isArray(timers)) {
                for (const [munId, raw] of Object.entries(timers)) {
                    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
                        errors.push(`displacement.hostile_takeover_timers.${munId} must be an object when present`);
                        continue;
                    }
                    const rec = raw as Record<string, unknown>;
                    if (typeof rec.mun_id !== 'string' || rec.mun_id.length === 0) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.mun_id must be a non-empty string`);
                    }
                    if (typeof rec.from_faction !== 'string' || rec.from_faction.length === 0) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.from_faction must be a non-empty string`);
                    }
                    if (typeof rec.to_faction !== 'string' || rec.to_faction.length === 0) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.to_faction must be a non-empty string`);
                    }
                    if (
                        typeof rec.started_turn !== 'number' ||
                        !Number.isInteger(rec.started_turn) ||
                        rec.started_turn < 0
                    ) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.started_turn must be a non-negative integer`);
                    }
                }
            } else {
                errors.push('displacement.hostile_takeover_timers must be an object (Record<string, HostileTakeoverTimerState>) when present');
            }
        }
    }
    if (displacement && typeof displacement === 'object' && !Array.isArray(displacement) && 'displacement_camp_state' in displacement && displacement.displacement_camp_state !== undefined) {
        const camps = displacement.displacement_camp_state;
        if (camps !== null && typeof camps === 'object' && !Array.isArray(camps)) {
            for (const [munId, raw] of Object.entries(camps)) {
                if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
                    errors.push(`displacement.displacement_camp_state.${munId} must be an object when present`);
                    continue;
                }
                const rec = raw as Record<string, unknown>;
                if (typeof rec.mun_id !== 'string' || rec.mun_id.length === 0) {
                    errors.push(`displacement.displacement_camp_state.${munId}.mun_id must be a non-empty string`);
                }
                if (typeof rec.population !== 'number' || !Number.isFinite(rec.population) || rec.population < 0) {
                    errors.push(`displacement.displacement_camp_state.${munId}.population must be a non-negative number`);
                }
                if (
                    typeof rec.started_turn !== 'number' ||
                    !Number.isInteger(rec.started_turn) ||
                    rec.started_turn < 0
                ) {
                    errors.push(`displacement.displacement_camp_state.${munId}.started_turn must be a non-negative integer`);
                }
                const byFaction = rec.by_faction;
                if (byFaction !== undefined) {
                    if (byFaction == null || typeof byFaction !== 'object' || Array.isArray(byFaction)) {
                        errors.push(`displacement.displacement_camp_state.${munId}.by_faction must be an object when present`);
                    } else {
                        for (const [fid, val] of Object.entries(byFaction as Record<string, unknown>)) {
                            if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
                                errors.push(`displacement.displacement_camp_state.${munId}.by_faction.${fid} must be a non-negative number`);
                            }
                        }
                    }
                }
            }
        } else {
            errors.push('displacement.displacement_camp_state must be an object (Record<MunicipalityId, DisplacementCampState>) when present');
        }
    }

    if ('recruitment_state' in s && s.recruitment_state !== undefined) {
        const recruitment = s.recruitment_state;
        if (recruitment !== null && typeof recruitment === 'object' && !Array.isArray(recruitment)) {
            const r = recruitment as Record<string, unknown>;
            const capital = r.recruitment_capital;
            const equipment = r.equipment_pools;
            const recruited = r.recruited_brigade_ids;
            if (capital == null || typeof capital !== 'object' || Array.isArray(capital)) {
                errors.push('recruitment_state.recruitment_capital must be an object when recruitment_state is present');
            }
            if (equipment == null || typeof equipment !== 'object' || Array.isArray(equipment)) {
                errors.push('recruitment_state.equipment_pools must be an object when recruitment_state is present');
            }
            if (!Array.isArray(recruited)) {
                errors.push('recruitment_state.recruited_brigade_ids must be string[] when recruitment_state is present');
            }
            const capTrickle = r.recruitment_capital_trickle;
            if (capTrickle !== undefined && (capTrickle == null || typeof capTrickle !== 'object' || Array.isArray(capTrickle))) {
                errors.push('recruitment_state.recruitment_capital_trickle must be an object when present');
            }
            const equipTrickle = r.equipment_points_trickle;
            if (equipTrickle !== undefined && (equipTrickle == null || typeof equipTrickle !== 'object' || Array.isArray(equipTrickle))) {
                errors.push('recruitment_state.equipment_points_trickle must be an object when present');
            }
            const maxPerTurn = r.max_recruits_per_faction_per_turn;
            if (
                maxPerTurn !== undefined &&
                (typeof maxPerTurn !== 'number' || !Number.isInteger(maxPerTurn) || maxPerTurn < 0)
            ) {
                errors.push('recruitment_state.max_recruits_per_faction_per_turn must be a non-negative integer when present');
            }
        } else {
            errors.push('recruitment_state must be an object when present');
        }
    }

    // Army HQ Gathering: campaign_plans and last_gathering_turn (nested under military)
    const mil = s.military as Record<string, unknown>;
    if (mil && typeof mil === 'object') {
        if ('campaign_plans' in mil && mil.campaign_plans !== undefined) {
            const cp = mil.campaign_plans;
            if (cp === null || typeof cp !== 'object' || Array.isArray(cp)) {
                errors.push('military.campaign_plans must be an object (Record<FactionId, CampaignPlan | null>) when present');
            } else {
                for (const [fid, plan] of Object.entries(cp)) {
                    const planPath = `military.campaign_plans.${fid}`;
                    if (!isCanonicalPlayerFaction(fid)) {
                        errors.push(`${planPath} must use a canonical faction id key`);
                    }
                    if (plan === null) continue; // null is valid (cleared plan)
                    validateCampaignPlan(plan, planPath, errors);
                }
            }
        }

        if ('last_gathering_turn' in mil && mil.last_gathering_turn !== undefined) {
            const lgt = mil.last_gathering_turn;
            if (lgt === null || typeof lgt !== 'object' || Array.isArray(lgt)) {
                errors.push('military.last_gathering_turn must be an object (Record<FactionId, number>) when present');
            } else {
                for (const [fid, val] of Object.entries(lgt)) {
                    const path = `military.last_gathering_turn.${fid}`;
                    if (!isCanonicalPlayerFaction(fid)) {
                        errors.push(`${path} must use a canonical faction id key`);
                    }
                    if (!isNonNegativeInteger(val)) {
                        errors.push(`military.last_gathering_turn.${fid} must be a non-negative integer`);
                    }
                }
            }
        }

        // ── A2 substrate (LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE) ──────────
        // DDR-cited per audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
        // (eee308e0). Top-level record is required as of v10; nested metadata stays optional.

        // army_co_decision_traces: per-faction append-only "why" log.
        if ('army_co_decision_traces' in mil && mil.army_co_decision_traces !== undefined) {
            const traces = mil.army_co_decision_traces;
            if (traces === null || typeof traces !== 'object' || Array.isArray(traces)) {
                errors.push('military.army_co_decision_traces must be an object (Record<FactionId, DecisionTraceEntry[]>) when present');
            } else {
                for (const [fid, list] of Object.entries(traces)) {
                    if (!Array.isArray(list)) {
                        errors.push(`military.army_co_decision_traces.${fid} must be an array`);
                        continue;
                    }
                    for (let i = 0; i < list.length; i++) {
                        const entry = list[i] as Record<string, unknown>;
                        if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}] must be an object`);
                            continue;
                        }
                        if (typeof entry.turn !== 'number' || !Number.isInteger(entry.turn) || entry.turn < 0) {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].turn must be a non-negative integer`);
                        }
                        if (typeof entry.campaign_role !== 'string' || entry.campaign_role.length === 0) {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].campaign_role must be a non-empty string`);
                        }
                        if (typeof entry.rationale !== 'string') {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].rationale must be a string`);
                        }
                        if (entry.raw_directive_id !== undefined && typeof entry.raw_directive_id !== 'string') {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].raw_directive_id must be a string when present`);
                        }
                    }
                }
            }
        }

        // ── C1 substrate (LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE) ───
        // DDR: docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md
        // (57cec91c). Top-level record is required as of v10; nested metadata stays optional.
        // Per-faction × per-corps directive map written by A3, read by briefing.
        if ('army_corps_directives_by_faction' in mil && mil.army_corps_directives_by_faction !== undefined) {
            const slot = mil.army_corps_directives_by_faction;
            if (slot === null || typeof slot !== 'object' || Array.isArray(slot)) {
                errors.push('military.army_corps_directives_by_faction must be an object (Record<FactionId, Record<corpsId, ArmyCorpsDirective>>) when present');
            } else {
                const validRoles = new Set(['primary', 'secondary', 'economy', 'contain']);
                for (const [fid, factionMap] of Object.entries(slot)) {
                    if (factionMap === null || typeof factionMap !== 'object' || Array.isArray(factionMap)) {
                        errors.push(`military.army_corps_directives_by_faction.${fid} must be an object`);
                        continue;
                    }
                    // Q2 (LANE-NIGHTSHIFT-Q2-COMPLIANCE-DEVIATION-REASON):
                    // optional `deviation_reason` field when `deviated=true`.
                    // Closed enum; field is omitted when `deviated=false`.
                    // Validator is permissive: allows `deviation_reason` even
                    // when `deviated=false` (back-compat) but if the field is
                    // present it MUST be one of the canonical codes.
                    const validDeviationReasons = new Set([
                        'aggressive_preference',
                        'cautious_preference',
                        'compliance_score_low',
                    ]);
                    const validMagnitudes = new Set(['limited', 'standard', 'maximum']);
                    const validPermissionFlags = new Set([
                        'authorize_offensive',
                        'authorize_reserve_commitment',
                        'preserve_reserve',
                        'avoid_escalation',
                    ]);
                    for (const [corpsId, cd] of Object.entries(factionMap as Record<string, unknown>)) {
                        if (cd == null || typeof cd !== 'object' || Array.isArray(cd)) {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId} must be an object`);
                            continue;
                        }
                        const entry = cd as {
                            corps_id?: unknown;
                            role?: unknown;
                            directive_magnitude?: unknown;
                            permission_flags?: unknown;
                            deviated?: unknown;
                            deviation_reason?: unknown;
                        };
                        if (typeof entry.corps_id !== 'string' || entry.corps_id.length === 0) {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.corps_id must be a non-empty string`);
                        }
                        if (typeof entry.role !== 'string' || !validRoles.has(entry.role)) {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.role must be one of 'primary'|'secondary'|'economy'|'contain'`);
                        }
                        if (typeof entry.deviated !== 'boolean') {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.deviated must be a boolean`);
                        }
                        if (entry.directive_magnitude !== undefined) {
                            if (typeof entry.directive_magnitude !== 'string' || !validMagnitudes.has(entry.directive_magnitude)) {
                                errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.directive_magnitude must be one of 'limited'|'standard'|'maximum' when present`);
                            }
                        }
                        if (entry.permission_flags !== undefined) {
                            if (!Array.isArray(entry.permission_flags) || entry.permission_flags.some(flag => typeof flag !== 'string' || !validPermissionFlags.has(flag))) {
                                errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.permission_flags must contain only canonical political directive permission flags when present`);
                            }
                        }
                        if (entry.deviation_reason !== undefined) {
                            if (typeof entry.deviation_reason !== 'string' || !validDeviationReasons.has(entry.deviation_reason)) {
                                errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.deviation_reason must be one of 'aggressive_preference'|'cautious_preference'|'compliance_score_low' when present`);
                            }
                        }
                    }
                }
            }
        }

        // named_officer_data: stubbornness + override_tolerance bounds (1-5 inclusive).
        if ('named_officer_data' in mil && mil.named_officer_data !== undefined) {
            const data = mil.named_officer_data;
            if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    const o = data[i] as Record<string, unknown>;
                    if (o == null || typeof o !== 'object') continue; // existing officer-shape validator owns this
                    if (o.stubbornness !== undefined) {
                        if (typeof o.stubbornness !== 'number' || !Number.isInteger(o.stubbornness) || o.stubbornness < 1 || o.stubbornness > 5) {
                            errors.push(`military.named_officer_data[${i}].stubbornness must be an integer in [1,5] when present`);
                        }
                    }
                    if (o.override_tolerance !== undefined) {
                        if (typeof o.override_tolerance !== 'number' || !Number.isInteger(o.override_tolerance) || o.override_tolerance < 1 || o.override_tolerance > 5) {
                            errors.push(`military.named_officer_data[${i}].override_tolerance must be an integer in [1,5] when present`);
                        }
                    }
                }
            }
        }

        // named_officers: last_autonomous_launch_turn + recent_overrides.
        if ('named_officers' in mil && mil.named_officers !== undefined) {
            const officers = mil.named_officers;
            if (officers !== null && typeof officers === 'object' && !Array.isArray(officers)) {
                for (const [oid, st] of Object.entries(officers)) {
                    const s2 = st as Record<string, unknown>;
                    if (s2 == null || typeof s2 !== 'object') continue;
                    if (s2.last_autonomous_launch_turn !== undefined) {
                        if (typeof s2.last_autonomous_launch_turn !== 'number' || !Number.isInteger(s2.last_autonomous_launch_turn) || s2.last_autonomous_launch_turn < 0) {
                            errors.push(`military.named_officers.${oid}.last_autonomous_launch_turn must be a non-negative integer when present`);
                        }
                    }
                    if (s2.recent_overrides !== undefined) {
                        if (!Array.isArray(s2.recent_overrides)) {
                            errors.push(`military.named_officers.${oid}.recent_overrides must be an array when present`);
                        } else {
                            for (let i = 0; i < s2.recent_overrides.length; i++) {
                                const ro = s2.recent_overrides[i];
                                if (ro == null || typeof ro !== 'object' || Array.isArray(ro)) {
                                    errors.push(`military.named_officers.${oid}.recent_overrides[${i}] must be an object`);
                                    continue;
                                }
                                if (typeof ro.turn !== 'number' || !Number.isInteger(ro.turn) || ro.turn < 0) {
                                    errors.push(`military.named_officers.${oid}.recent_overrides[${i}].turn must be a non-negative integer`);
                                }
                                if (ro.resolution !== 'accept' && ro.resolution !== 'override' && ro.resolution !== 'relieve') {
                                    errors.push(`military.named_officers.${oid}.recent_overrides[${i}].resolution must be 'accept'|'override'|'relieve'`);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // political_controllers: every entry must have value defined (can be null)
    if (Object.prototype.hasOwnProperty.call(s, 'political_controllers')) {
        const pc = isRecord(s.political) ? s.political.political_controllers : undefined;
        if (pc !== null && typeof pc === 'object' && !Array.isArray(pc)) {
            for (const [sid, val] of Object.entries(pc)) {
                if (val !== null && typeof val !== 'string') {
                    errors.push(`Settlement ${sid}: political_controller must be FactionId or null, got ${typeof val}`);
                }
            }
        }
    }

    // contested_control: boolean flag per settlement
    if (Object.prototype.hasOwnProperty.call(s, 'contested_control')) {
        const cc = s.contested_control;
        if (cc !== null && typeof cc === 'object' && !Array.isArray(cc)) {
            for (const [sid, val] of Object.entries(cc)) {
                if (typeof val !== 'boolean') {
                    errors.push(`Settlement ${sid}: contested_control must be boolean, got ${typeof val}`);
                }
            }
        } else if (cc !== undefined) {
            errors.push('contested_control must be an object (Record<SettlementId, boolean>) when present');
        }
    }

    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true };
}
