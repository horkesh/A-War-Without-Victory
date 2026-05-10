/**
 * Cost Ledger — downstream aggregation of war costs.
 *
 * This is a REFLECTION surface, not a new owner. It reads upstream truth
 * (casualty ledger, displacement, verdict, rupture consequences) and
 * produces a serializable summary for comparison and narrative surfaces.
 *
 * Deterministic: no Math.random(), no timestamps, sorted iteration via strictCompare.
 */

import type { GameState } from '../../state/game_state.js';
import type { RuptureConsequence, OutcomeClass } from '../../state/negotiation_types.js';
import type { OperationAAR } from '../combat/operation_aar.js';
import type {
    OperationOpportunityResolution,
    OperationOpportunityState,
} from '../combat/operation_opportunities.js';
import { computeFactionVerdict } from '../negotiation/scoring.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS: readonly string[] = ['HRHB', 'RBiH', 'RS'] as const;

function emptyOpportunityFactionSummary(): OpportunityCostFactionSummary {
    return {
        total_decisions: 0,
        approved: 0,
        declined: 0,
        expired: 0,
        completed: 0,
        successes: 0,
        failures: 0,
        did_not_launch: 0,
        t3_authorized: 0,
    };
}

function emptyOpportunityCostLedger(): OpportunityCostLedger {
    return {
        total_decisions: 0,
        approved: 0,
        declined: 0,
        expired: 0,
        completed: 0,
        successes: 0,
        failures: 0,
        by_faction: {},
        entries: [],
    };
}

function isApprovedResponse(response: OperationOpportunityResolution['response']): boolean {
    return response === 'approve'
        || response === 'redirect'
        || response === 'under_resource';
}

function isSuccessExit(entry: OpportunityCostLedgerEntry): boolean {
    return entry.exit_class === 'decisive_success'
        || entry.exit_class === 'partial_success'
        || entry.aar_outcome === 'success'
        || entry.aar_outcome === 'partial';
}

function isFailureExit(entry: OpportunityCostLedgerEntry): boolean {
    return entry.exit_class === 'failed'
        || entry.exit_class === 'aborted'
        || entry.aar_outcome === 'failure'
        || entry.aar_outcome === 'orphaned';
}

function displayNameForOpportunity(resolution: OperationOpportunityResolution, aar?: OperationAAR): string {
    if (resolution.executed_op_name) return resolution.executed_op_name;
    if (aar?.operation_name) return aar.operation_name;
    return resolution.opportunity_id.replace(/_/g, ' ');
}

function buildOpportunityCostLedger(state: GameState): OpportunityCostLedger {
    const resolutions = [...(state.military?.operation_opportunity_resolutions ?? [])];
    if (resolutions.length === 0) return emptyOpportunityCostLedger();

    const proposalsById = new Map<string, OperationOpportunityState>();
    for (const proposal of state.military?.operation_opportunities ?? []) {
        proposalsById.set(proposal.proposal_id, proposal);
    }

    const aarById = new Map<string, OperationAAR>();
    for (const aar of state.operation_history ?? []) {
        aarById.set(aar.operation_id, aar);
    }

    const entries = resolutions
        .map((resolution): OpportunityCostLedgerEntry => {
            const proposal = proposalsById.get(resolution.proposal_id);
            const aar = resolution.executed_op_aar_id
                ? aarById.get(resolution.executed_op_aar_id)
                : undefined;
            const faction = proposal?.approver_faction ?? aar?.faction ?? 'unknown';
            return {
                proposal_id: resolution.proposal_id,
                opportunity_id: resolution.opportunity_id,
                display_name: displayNameForOpportunity(resolution, aar),
                faction,
                response: resolution.response,
                response_turn: resolution.response_turn,
                executed_op_name: resolution.executed_op_name,
                executed_op_aar_id: resolution.executed_op_aar_id,
                exit_class: resolution.exit_class,
                aar_outcome: aar?.outcome,
                total_attacks: aar?.total_attacks ?? 0,
                objectives_targeted: aar?.objectives_targeted?.length ?? 0,
                objectives_captured: aar?.objectives_captured?.length ?? 0,
                grade_stars: aar?.grade?.stars,
            };
        })
        .sort((a, b) => {
            if (a.response_turn !== b.response_turn) return a.response_turn - b.response_turn;
            const oppDelta = strictCompare(a.opportunity_id, b.opportunity_id);
            if (oppDelta !== 0) return oppDelta;
            return strictCompare(a.proposal_id, b.proposal_id);
        });

    const ledger = emptyOpportunityCostLedger();
    ledger.entries = entries;
    for (const entry of entries) {
        ledger.total_decisions++;

        if (!ledger.by_faction[entry.faction]) {
            ledger.by_faction[entry.faction] = emptyOpportunityFactionSummary();
        }
        const faction = ledger.by_faction[entry.faction];
        faction.total_decisions++;

        if (isApprovedResponse(entry.response)) {
            ledger.approved++;
            faction.approved++;
        }
        if (entry.response === 'decline') {
            ledger.declined++;
            faction.declined++;
        }
        if (entry.response === 'expire') {
            ledger.expired++;
            faction.expired++;
        }
        if (entry.executed_op_aar_id || entry.exit_class === 't3_authorized_no_offensive') {
            ledger.completed++;
            faction.completed++;
        }
        if (isSuccessExit(entry)) {
            ledger.successes++;
            faction.successes++;
        }
        if (isFailureExit(entry)) {
            ledger.failures++;
            faction.failures++;
        }
        if (entry.exit_class === 'did_not_launch') {
            faction.did_not_launch++;
        }
        if (entry.exit_class === 't3_authorized_no_offensive') {
            faction.t3_authorized++;
        }
    }

    return ledger;
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CostLedgerEntry {
    faction: string;
    military_killed: number;
    military_wounded: number;
    civilian_casualties_caused: number;
    refugees_created: number;
    territory_controlled_pct: number;
    enclaves_held: string[];
    enclaves_lost: string[];
    war_crimes_events: number;
    outcome_class: OutcomeClass;
    condemnation_flags: string[];
}

export interface OpportunityCostLedgerEntry {
    proposal_id: string;
    opportunity_id: string;
    display_name: string;
    faction: string;
    response: OperationOpportunityResolution['response'];
    response_turn: number;
    executed_op_name?: string;
    executed_op_aar_id?: string;
    exit_class?: OperationOpportunityResolution['exit_class'];
    aar_outcome?: OperationAAR['outcome'];
    total_attacks: number;
    objectives_targeted: number;
    objectives_captured: number;
    grade_stars?: OperationAAR['grade']['stars'];
}

export interface OpportunityCostFactionSummary {
    total_decisions: number;
    approved: number;
    declined: number;
    expired: number;
    completed: number;
    successes: number;
    failures: number;
    did_not_launch: number;
    t3_authorized: number;
}

export interface OpportunityCostLedger {
    total_decisions: number;
    approved: number;
    declined: number;
    expired: number;
    completed: number;
    successes: number;
    failures: number;
    by_faction: Record<string, OpportunityCostFactionSummary>;
    entries: OpportunityCostLedgerEntry[];
}

/** Audit-only annotations attached by divergence events.
 *  Reflection of state.military.cost_ledger_annotations — not a writer. */
export interface CostLedgerAnnotation {
    event_id: string;
    tag: string;
    text?: string;
    turn: number;
    faction?: string;
}

export type CostLedgerFindingCategory =
    | 'human_cost'
    | 'displacement'
    | 'rupture'
    | 'duration'
    | 'war_crimes';

export type CostLedgerFindingSeverity = 'record' | 'grave' | 'rupture';

export interface CostLedgerFinding {
    id: string;
    category: CostLedgerFindingCategory;
    severity: CostLedgerFindingSeverity;
    title: string;
    text: string;
    sources: string[];
    faction?: string;
}

export interface CostLedger {
    war_duration_weeks: number;
    entries: CostLedgerEntry[];
    rupture_consequences: { id: string; recorded_turn?: number; perpetrator_faction: string; description: string }[];
    operation_opportunities?: OpportunityCostLedger;
    total_military_killed: number;
    total_civilian_killed: number;
    findings: CostLedgerFinding[];
    /** Audit-only divergence-event annotations. Sorted (turn, tag) for determinism. */
    annotations?: CostLedgerAnnotation[];
}

const COST_LEDGER_SOURCES = Object.freeze({
    sensitiveHistoryGate: 'Sensitive History Design Gate §4',
    victoryScoring: 'Victory Conditions and Pyrrhic Scoring section 1',
    rdc: 'RDC Sarajevo, Bosnian Book of the Dead (2007)',
    unhcr: 'UNHCR (1996) displacement estimates',
    srebrenica: 'ICTY Krstic IT-98-33-T; Karadzic IT-95-5/18-T; Mladic IT-09-92-T; ICJ Bosnia v. Serbia (2007)',
});

function formatInteger(value: number): string {
    return Math.trunc(Math.max(0, value)).toLocaleString('en-US');
}

function plural(value: number, singular: string, pluralForm = `${singular}s`): string {
    return value === 1 ? singular : pluralForm;
}

function buildProsecutorialFindings(
    entries: readonly CostLedgerEntry[],
    ruptures: readonly { id: string; perpetrator_faction: string; description: string }[],
    totalMilitaryKilled: number,
    totalCivilianKilled: number,
    state: GameState,
): CostLedgerFinding[] {
    const findings: CostLedgerFinding[] = [];
    const totalRefugeesCreated = entries.reduce((sum, entry) => sum + Math.max(0, entry.refugees_created), 0);
    const flags = state.military?.event_flags ?? {};
    const earlyPeaceId = flags.war_ended_early === true
        ? String(flags.early_peace_implemented ?? 'negotiated')
        : null;

    findings.push({
        id: 'human_cost_record',
        category: 'human_cost',
        severity: totalCivilianKilled > 0 || totalMilitaryKilled > 0 ? 'grave' : 'record',
        title: 'Human cost record',
        text:
            `The ledger records ${formatInteger(totalMilitaryKilled)} military killed and ` +
            `${formatInteger(totalCivilianKilled)} civilian killed across ${entries.length} faction records. ` +
            'These counts are accounting facts for the verdict surface, not a score.',
        sources: [COST_LEDGER_SOURCES.rdc, COST_LEDGER_SOURCES.sensitiveHistoryGate],
    });

    if (earlyPeaceId) {
        findings.push({
            id: 'early_peace_implementation_record',
            category: 'duration',
            severity: 'record',
            title: 'Early negotiated settlement',
            text:
                `The ledger records acceptance of peace plan ${earlyPeaceId} at week ${state.meta?.turn ?? 0}. ` +
                'This is a termination fact, not proof that political or civilian costs vanished.',
            sources: [COST_LEDGER_SOURCES.victoryScoring, COST_LEDGER_SOURCES.sensitiveHistoryGate],
        });
    }

    if (totalRefugeesCreated > 0) {
        findings.push({
            id: 'civilian_displacement_record',
            category: 'displacement',
            severity: 'grave',
            title: 'Civilian displacement record',
            text:
                `The negotiation capital record attributes ${formatInteger(totalRefugeesCreated)} refugees created ` +
                'to the war path. The figure is reported as an integer civilian record, not as a percentage or efficiency measure.',
            sources: [COST_LEDGER_SOURCES.unhcr, COST_LEDGER_SOURCES.sensitiveHistoryGate],
        });
    }

    for (const rupture of ruptures) {
        if (rupture.id === 'srebrenica_genocide_1995') {
            findings.push({
                id: 'rupture_srebrenica_genocide_1995',
                category: 'rupture',
                severity: 'rupture',
                faction: rupture.perpetrator_faction,
                title: 'Srebrenica genocide',
                text:
                    `The ledger records the Srebrenica genocide after ${rupture.description}. ` +
                    'The historical reference is 8,000 killed; the finding remains a locked condemnation fact.',
                sources: [COST_LEDGER_SOURCES.srebrenica, COST_LEDGER_SOURCES.sensitiveHistoryGate],
            });
        } else {
            findings.push({
                id: `rupture_${rupture.id}`,
                category: 'rupture',
                severity: 'rupture',
                faction: rupture.perpetrator_faction,
                title: rupture.id.replace(/_/g, ' '),
                text:
                    `The ledger records rupture ${rupture.id}: ${rupture.description}. ` +
                    'The finding remains locked in the verdict packet.',
                sources: [COST_LEDGER_SOURCES.sensitiveHistoryGate],
            });
        }
    }

    const warCrimeEntries = entries
        .filter((entry) => entry.war_crimes_events > 0)
        .sort((a, b) => {
            if (a.war_crimes_events !== b.war_crimes_events) return b.war_crimes_events - a.war_crimes_events;
            return strictCompare(a.faction, b.faction);
        });
    for (const entry of warCrimeEntries) {
        findings.push({
            id: `war_crimes_record_${entry.faction}`,
            category: 'war_crimes',
            severity: entry.condemnation_flags.length > 0 || entry.war_crimes_events >= 10 ? 'grave' : 'record',
            faction: entry.faction,
            title: `${entry.faction} war-crimes record`,
            text:
                `${entry.faction} capital records contain ${formatInteger(entry.war_crimes_events)} ` +
                `${plural(entry.war_crimes_events, 'war-crime event')}, ${formatInteger(entry.civilian_casualties_caused)} ` +
                'civilian casualties caused, and ' +
                `${formatInteger(entry.refugees_created)} refugees created. The ledger records these facts without mitigation or reward language.`,
            sources: [COST_LEDGER_SOURCES.sensitiveHistoryGate],
        });
    }

    return findings;
}

// ═══════════════════════════════════════════════════════════════════════════
// Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build cost ledger from current game state. Pure, deterministic.
 * Reads upstream truth only — does not write or own any state.
 */
export function buildCostLedger(state: GameState): CostLedger {
    const turn = state.meta?.turn ?? 0;
    const casualtyLedger = state.military?.casualty_ledger ?? {};
    const negotiation = state.military?.negotiation;
    const capitalMap = negotiation?.capital ?? {};
    const ruptures = negotiation?.rupture_consequences ?? [];
    const civCasualties = state.displacement?.civilian_casualties ?? {};

    // Build entries sorted by faction ID for determinism
    const factions = [...CANONICAL_FACTIONS].sort(strictCompare);
    const entries: CostLedgerEntry[] = [];
    let totalMilitaryKilled = 0;
    let totalCivilianKilled = 0;

    for (const faction of factions) {
        // Read from casualty ledger (upstream truth for military casualties)
        const factionCasualties = casualtyLedger[faction];
        const militaryKilled = factionCasualties?.killed ?? 0;
        const militaryWounded = factionCasualties?.wounded ?? 0;
        totalMilitaryKilled += militaryKilled;

        // Read from negotiation capital (upstream truth for territory, enclaves, etc.)
        const capital = capitalMap[faction];
        const territoryPct = capital?.territory_controlled_pct ?? 0;
        const refugeesCreated = capital?.refugees_created ?? 0;
        const enclavesHeld = [...(capital?.enclaves_held ?? [])].sort(strictCompare);
        const enclavesLost = [...(capital?.enclaves_lost ?? [])].sort(strictCompare);
        const warCrimesEvents = capital?.war_crimes_events ?? 0;
        const civilianCasualtiesCaused = capital?.civilian_casualties_caused ?? 0;

        // Read civilian killed from displacement state (ethnicity-aligned)
        const civKilled = civCasualties[faction]?.killed ?? 0;
        totalCivilianKilled += civKilled;

        // Compute verdict for outcome_class and condemnation_flags
        const verdict = computeFactionVerdict(state, faction);

        entries.push({
            faction,
            military_killed: militaryKilled,
            military_wounded: militaryWounded,
            civilian_casualties_caused: civilianCasualtiesCaused,
            refugees_created: refugeesCreated,
            territory_controlled_pct: territoryPct,
            enclaves_held: enclavesHeld,
            enclaves_lost: enclavesLost,
            war_crimes_events: warCrimesEvents,
            outcome_class: verdict.outcome_class,
            condemnation_flags: [...verdict.condemnation_flags].sort(strictCompare),
        });
    }

    // Build rupture consequence summaries, sorted by id for determinism
    const ruptureEntries = [...ruptures]
        .sort((a, b) => strictCompare(a.id, b.id))
        .map((r: RuptureConsequence) => ({
            id: r.id,
            recorded_turn: r.recorded_turn,
            perpetrator_faction: r.perpetrator_faction,
            description: r.description,
        }));

    // Reflect divergence-event annotations (audit-only). Sorted by (turn, tag) for determinism.
    const rawAnnotations = state.military?.cost_ledger_annotations ?? [];
    const annotations: CostLedgerAnnotation[] = rawAnnotations.length === 0 ? [] : [...rawAnnotations]
        .map((a) => ({
            event_id: a.event_id,
            tag: a.tag,
            text: a.text,
            turn: a.turn,
            faction: a.faction,
        }))
        .sort((a, b) => {
            if (a.turn !== b.turn) return a.turn - b.turn;
            const t = strictCompare(a.tag, b.tag);
            if (t !== 0) return t;
            return strictCompare(a.event_id, b.event_id);
        });

    return {
        war_duration_weeks: turn,
        entries,
        rupture_consequences: ruptureEntries,
        operation_opportunities: buildOpportunityCostLedger(state),
        total_military_killed: totalMilitaryKilled,
        total_civilian_killed: totalCivilianKilled,
        findings: buildProsecutorialFindings(entries, ruptureEntries, totalMilitaryKilled, totalCivilianKilled, state),
        annotations: annotations.length > 0 ? annotations : undefined,
    };
}
