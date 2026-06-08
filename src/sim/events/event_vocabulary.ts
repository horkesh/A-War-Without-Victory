/**
 * Canonical event semantic vocabulary shared by runtime loaders and diagnostics.
 * Additive event kinds or condition predicates must be registered here before
 * catalog rows can load.
 */

export const VALID_EVENT_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

export const KNOWN_EVENT_EFFECT_KINDS = [
    'aggression_modifier',
    'alliance_change',
    'alliance_lock',
    'bot_priority_shift',
    'cohesion_change',
    'control_change',
    'cost_ledger_annotation',
    'doctrine_constraint',
    'equipment_grant',
    'equipment_quality_modifier',
    'guerrilla_threat',
    'humanitarian_impact',
    'morale_change',
    'narrative',
    'negotiation_capital',
    'offensive_ops_suppression',
    'patron_pressure',
    'recruitment_modifier',
    'supply_delta',
] as const;

export const KNOWN_EVENT_CONDITION_TYPES = [
    'alliance_above',
    'alliance_below',
    'alliance_drift',
    'and',
    'corridor_severed',
    'dimension_above',
    'dimension_below',
    'displaced_in_aggregate',
    'enclave_resilience_aggregate',
    'enclave_supply_status',
    'event_fire_count',
    'faction_area_ratio',
    'faction_controls_municipality',
    'flag_at_least',
    'flag_equals',
    'flag_not_set',
    'metric_compare_factions',
    'morale_average_below',
    'not',
    'operation_completed',
    'or',
    'paramilitary_mode_equals',
    'patron_pressure_above',
    'siege_active',
    'supply_above',
    'supply_below',
    'territory_control',
    'territory_loss_window',
    'territory_percentage',
    'war_crimes_above',
    'week_since_event',
] as const;

export const VALID_EVENT_FACTION_SET = new Set<string>(VALID_EVENT_FACTIONS);
export const KNOWN_EVENT_EFFECT_KIND_SET = new Set<string>(KNOWN_EVENT_EFFECT_KINDS);
export const KNOWN_EVENT_CONDITION_TYPE_SET = new Set<string>(KNOWN_EVENT_CONDITION_TYPES);
