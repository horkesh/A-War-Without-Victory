/**
 * LANE-NIGHTSHIFT-CONSEQUENCE-BREADTH — Cost Ledger Templates (8).
 *
 * These are static template definitions consumed by `buildCostLedger` and
 * downstream narrative surfaces (Wrapped, VerdictScreen, divergence essays).
 *
 * Per `docs/plans/2026-03-26-cost-ledger-template-format.md`:
 *   { category, title, description_template, data_sources[], historical_comparison? }
 *
 * Voice rule (per `docs/plans/2026-04-14-design-gate-resolutions-and-ungating.md`
 * §5 Ring 3): ICTY-style historical-voice prose. No second-person. Integers for
 * casualties. Specific atrocity names where applicable. No minimization.
 *
 * Templates use `{placeholder}` markers for variables that the renderer
 * (NOT this module) substitutes from `data_sources`. This file owns the
 * shape and the prose only — never reads or mutates GameState.
 */

import type { FactionId } from '../../../state/game_state.js';

export type CostLedgerTemplateCategory =
    | 'casualties'
    | 'displacement'
    | 'condemnation'
    | 'economic'
    | 'patron'
    | 'alliance'
    | 'divergence'
    | 'duration';

export interface CostLedgerHistoricalComparison {
    /** Numeric historical reference (RDC / ICTY / BB), used as a baseline only. */
    value: number;
    /** Source label, e.g. 'RDC 2007', 'ICTY IT-98-33-T (Krstić)', 'Balkan Battlegrounds II'. */
    source: string;
}

export interface CostLedgerTemplate {
    /** Stable identifier; matches the consumer registry key. */
    id: string;
    category: CostLedgerTemplateCategory;
    title: string;
    /** Prose template with {placeholder} markers. ICTY-voice; no second-person. */
    description_template: string;
    /** GameState field paths the renderer reads to fill the template. Read-only. */
    data_sources: string[];
    /** Optional historical reference value (does NOT appear in description by default). */
    historical_comparison?: CostLedgerHistoricalComparison;
    /** Optional faction binding when the template renders per-faction (per spec). */
    per_faction?: boolean;
}

/** Canonical template list, sorted by id for deterministic emission. */
export const COST_LEDGER_TEMPLATES: readonly CostLedgerTemplate[] = Object.freeze([
    {
        id: 'alliance_arc_ledger',
        category: 'alliance',
        title: 'Alliance Arc',
        description_template:
            'The RBiH-HRHB alliance opened the war at {alliance_initial} and closed at {alliance_final}. ' +
            'Its lowest recorded value was {alliance_low_water_mark} at turn {alliance_low_water_turn}. ' +
            'Open hostility between RBiH and HRHB {war_active_text} during the conflict.',
        data_sources: [
            'state.political.war_alliance_rbih_hrhb',
            'state.military.event_flags.alliance_low_water_mark_below_0_10',
            'state.military.event_flags.rbih_hrhb_war_active',
        ],
    },
    {
        id: 'casualty_ledger_per_faction',
        category: 'casualties',
        title: 'Military Casualties',
        description_template:
            '{faction} recorded {military_killed} killed and {military_wounded} wounded across {war_duration_weeks} weeks of war. ' +
            'These figures aggregate per-brigade casualty entries and exclude civilian dead.',
        data_sources: [
            'state.military.casualty_ledger[faction].killed',
            'state.military.casualty_ledger[faction].wounded',
            'state.meta.turn',
        ],
        historical_comparison: {
            value: 100000,
            source: 'RDC Sarajevo "Bosnian Book of the Dead" (2007), aggregate across all sides',
        },
        per_faction: true,
    },
    {
        id: 'civilian_displacement_aggregate',
        category: 'displacement',
        title: 'Civilian Displacement',
        description_template:
            '{total_displaced} persons were displaced from their pre-war municipalities of residence. ' +
            'Of these, {displaced_in_aggregate} were absorbed by territory under {receiving_faction} control. ' +
            'Civilian dead recorded in the displacement ledger: {civilian_killed}.',
        data_sources: [
            'state.displacement.displacement_state[*].displaced_out',
            'state.displacement.displacement_state[*].displaced_in_by_faction',
            'state.displacement.civilian_casualties',
        ],
        historical_comparison: {
            value: 2200000,
            source: 'UNHCR (1996) and ICTY findings; cumulative across the war',
        },
    },
    {
        id: 'condemnation_flags_recorded',
        category: 'condemnation',
        title: 'Condemnation Flags',
        description_template:
            'The verdict layer recorded {condemnation_count} condemnation flags against {faction}. ' +
            'These flags reflect cumulative actions weighted by ICTY-comparable categories: ' +
            'systematic ethnic cleansing, atrocity rupture events, mass-displacement causation, ' +
            'and patron-disavowal-grade abandonment of civilian protection.',
        data_sources: [
            'state.military.negotiation.capital[faction].war_crimes_events',
            'state.military.negotiation.rupture_consequences',
            'verdict.condemnation_flags',
        ],
        per_faction: true,
    },
    {
        id: 'divergence_from_history_ledger',
        category: 'divergence',
        title: 'Divergence From History',
        description_template:
            'The simulated war diverged from the historical record on {divergence_count} substantive points. ' +
            'Where the canonical record names Srebrenica, Ahmici, Markale, and the Drina valley as the war\'s defining ruptures, ' +
            'the simulated path produced {ruptures_fired_list}. ' +
            'Events absent from the simulation but present in history: {ruptures_suppressed_list}. ' +
            'This register is observational. It does not claim the alternative was achievable, nor does it minimize the historical fact.',
        data_sources: [
            'state.military.fired_event_ids',
            'state.military.event_flags',
            'state.military.negotiation.rupture_consequences',
        ],
        historical_comparison: {
            value: 0,
            source: 'ICTY case roster (Krstić IT-98-33-T, Karadžić IT-95-5/18, Mladić IT-09-92, Prlić IT-04-74) as canonical reference set',
        },
    },
    {
        id: 'economic_strain_ledger',
        category: 'economic',
        title: 'Economic And Logistical Strain',
        description_template:
            '{faction} closed the war with general supply reserve at {supply_final} and heavy munitions reserve at {munitions_final}. ' +
            '{strain_event_count} consequence events recorded supply or recruitment strain on this faction. ' +
            'Cumulative recruitment-modifier turns under value <1.0: {restrictive_recruitment_turns}.',
        data_sources: [
            'state.military.general_supply_reserve[faction]',
            'state.military.heavy_munitions_reserve[faction]',
            'state.military.recruitment_modifiers',
            'state.military.cost_ledger_annotations',
        ],
        per_faction: true,
    },
    {
        id: 'patron_relationship_ledger',
        category: 'patron',
        title: 'Patron Relationship',
        description_template:
            'The patron relationship for {faction} closed at confidence {patron_confidence_final} (initial {patron_confidence_initial}). ' +
            'Patron-pressure events recorded: {patron_pressure_event_count}. ' +
            'Arms-review imposition: {patron_arms_review_active}. Partial disavowal: {patron_partial_disavowal}. ' +
            'Recovery offer outcome: {patron_recovery_outcome}.',
        data_sources: [
            'state.military.negotiation.patron_relationships[faction]',
            'state.military.event_flags.patron_arms_review_active',
            'state.military.event_flags.patron_partial_disavowal',
            'state.military.event_flags.patron_recovery_accepted',
            'state.military.event_flags.patron_recovery_refused',
        ],
        per_faction: true,
    },
    {
        id: 'war_duration_and_endgame_ledger',
        category: 'duration',
        title: 'War Duration And Endgame',
        description_template:
            'The war lasted {war_duration_weeks} weeks, ending at {endgame_class}. ' +
            'Termination trigger: {termination_trigger}. ' +
            'Of the canonical 188-week historical war, the simulated path concluded {duration_delta_weeks} weeks ' +
            '{duration_delta_direction} the historical reference. ' +
            'No claim of moral comparability is made — only the duration arithmetic.',
        data_sources: [
            'state.meta.turn',
            'state.military.negotiation.endgame_class',
            'state.military.event_flags.war_ended_early',
            'state.military.endgame_snapshot',
        ],
        historical_comparison: {
            value: 188,
            source: 'War duration April 1992 - December 1995 (Dayton initialing), 188 calendar weeks',
        },
    },
]);

/** Look up a template by id. Returns undefined when not found. */
export function getCostLedgerTemplate(id: string): CostLedgerTemplate | undefined {
    return COST_LEDGER_TEMPLATES.find(t => t.id === id);
}

/** Filter templates by category, sorted by id (templates are already sorted). */
export function getCostLedgerTemplatesByCategory(
    category: CostLedgerTemplateCategory,
): readonly CostLedgerTemplate[] {
    return COST_LEDGER_TEMPLATES.filter(t => t.category === category);
}

/** Per-faction templates (require a faction binding at render time). */
export function getPerFactionTemplates(): readonly CostLedgerTemplate[] {
    return COST_LEDGER_TEMPLATES.filter(t => t.per_faction === true);
}

/** Faction-agnostic templates (single-shot at render time). */
export function getFactionAgnosticTemplates(): readonly CostLedgerTemplate[] {
    return COST_LEDGER_TEMPLATES.filter(t => t.per_faction !== true);
}

/**
 * Annotate a template with a concrete faction binding for downstream renderers.
 * Returns a shallow-cloned descriptor. Pure; does not mutate inputs.
 */
export function bindTemplateToFaction(
    template: CostLedgerTemplate,
    faction: FactionId,
): CostLedgerTemplate & { faction: FactionId } {
    return { ...template, faction };
}
