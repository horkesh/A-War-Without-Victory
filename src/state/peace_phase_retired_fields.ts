/**
 * Fields retired with the in-sim peace phase (schema v41).
 *
 * One list shared by the v41 save migration (which deletes them), the validator
 * (which rejects them at schema >= 41) and the tests. Kept on purpose because war code
 * reads them: meta.war_start_turn, meta.game_over, meta.outcome and faction.declared.
 */

export const PEACE_PHASE_RETIRED_SCHEMA_VERSION = 41;

export const PEACE_PHASE_RETIRED_META_FIELDS = [
    'referendum_held',
    'referendum_turn',
    'referendum_eligible_turn',
    'referendum_deadline_turn',
    'peace_scheduled_referendum_turn',
    'peace_scheduled_war_start_turn',
    'war_opposing_edges_streak',
    'war_force_transition_after_turns',
    'war_entrenchment_init_turns',
    'peace_end_turn',
    'war_start_lifecycle_phase_turn',
    'escalation_reason',
] as const;

export const PEACE_PHASE_RETIRED_FACTION_FIELDS = [
    'prewar_capital',
    'declaration_pressure',
    'declaration_turn',
] as const;

export const PEACE_PHASE_RETIRED_POLITICAL_FIELDS = [
    'phase0_relationships',
    'phase0_events_log',
] as const;
