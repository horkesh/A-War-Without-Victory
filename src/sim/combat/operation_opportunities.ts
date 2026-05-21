/**
 * operation_opportunities.ts — Phase 1 of LANE B (Operation Opportunity MVP).
 *
 * Generic substrate for the late-war Operation Opportunity system. An operation
 * opportunity is a typed proposal that:
 *
 *   (a) appears when its prerequisite axes are satisfied,
 *   (b) waits for an authorization decision from the player or bot,
 *   (c) on approval, instantiates a normal CorpsOperation through the canonical
 *       `buildCorpsOperation` factory, and
 *   (d) on completion, writes an OperationOpportunityResolution record so the
 *       Cost Ledger / Codex / Wrapped consumers can observe the catalog truth.
 *
 * This file is the SUBSTRATE only:
 *   - Types
 *   - Empty catalog (Phase 3 adds 5th Corps / Sana 95 content)
 *   - Pure deterministic evaluator (`evaluateOperationOpportunities`)
 *   - Pipeline step (`runOpportunityEvaluationStep`)
 *   - Decision applier (`applyOpportunityDecision`) routing approval through
 *     `buildCorpsOperation` — ONE owner path.
 *
 * It is NOT:
 *   - A combat-math change.
 *   - A new lifecycle (sector_offensive.ts remains the lifecycle owner).
 *   - A parallel CorpsOperation factory (corps_operation_helpers.ts is the
 *     ONLY factory; we call it).
 *   - A sensitive-history surface (Krivaja-95 / Stupcanica-95 / Gorazde T4 are
 *     out of scope per SENSITIVE_HISTORY_DESIGN_GATE.md §6).
 *
 * Design source: docs/plans/late-war-operation-opportunity-system-design.md
 * Architecture contract: docs/plans/2026-05-01-force-quality-operation-architecture-contract.md
 *
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical owner of operation-opportunity proposal lifecycle.
 * DOMAIN:    Authorization shell on top of CorpsOperation execution.
 * ═══════════════════════════════════════════════════════════════
 *
 * READS:     GameState (catalog predicates may read any field; evaluator
 *            itself reads only state.meta + state.military.operation_opportunities).
 * WRITES:    state.military.operation_opportunities (proposal queue),
 *            state.military.operation_opportunity_resolutions (decision log),
 *            state.military.corps_command[primary_corps].active_operations
 *            (only via buildCorpsOperation, on approval).
 * MUST NOT:  Touch combat math, attack share, or any combat multiplier.
 *            Write directly to map / political control. Build CorpsOperation
 *            objects bypassing the factory. Apply effects without going
 *            through the existing sector_offensive lifecycle.
 *
 * UPSTREAM:  war_phases.ts (`evaluate-operation-opportunities` step).
 * DOWNSTREAM: corps_operation_helpers.ts (`buildCorpsOperation`),
 *            sector_offensive.ts (lifecycle takes over after approval).
 *
 * TRUTH INVARIANTS:
 * - Pure evaluator: no Math.random, no Date.now, no localeCompare.
 * - Sorted iteration via strictCompare for catalog and proposal queues.
 * - Proposal IDs deterministic: "OPP_<turn>_<opportunity_id>".
 * - Approval ALWAYS routes through `buildCorpsOperation`.
 * - Sensitive-history T4 opportunities (Krivaja-95, Stupcanica-95, Gorazde)
 *   are NOT in this catalog and will require explicit historian +
 *   game-designer + war-or-game sign-off before being added.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    OperationAxis,
    PendingProposalReview,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { buildCorpsOperation } from './corps_operation_helpers.js';
import {
    computeCorpsOperationReadiness,
    type CorpsOperationReadinessTraits,
} from './corps_operation_readiness.js';
import type { OperationAAR } from './operation_aar.js';
import { FIFTH_CORPS_OPPORTUNITIES } from './operation_opportunity_catalog_5th_corps.js';
import { CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES } from './operation_opportunity_catalog_central_bosnia.js';
import { FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES } from './operation_opportunity_catalog_federation_western_bosnia.js';

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

/** Whether a prerequisite axis is required, optional, or not applicable. */
export type PrereqMode = 'required' | 'optional' | 'n_a';

/** The nine prerequisite axes per the design doc §4. */
export type PrereqAxis =
    | 'date_window'
    | 'political_authorization'
    | 'corps_readiness'
    | 'logistics'
    | 'staging_access'
    | 'weather_season'
    | 'commander_confidence'
    | 'enemy_weakness'
    | 'alliance_context'
    /**
     * LANE E: institutional force-quality signal beyond gross `corps_readiness`.
     * Designed for use as an OPTIONAL alternative to `logistics` so a single
     * saturating substrate signal cannot lock an entire opportunity family
     * away (LANE D railroad-by-omission finding). Predicate body should read
     * specific traits from `computeCorpsOperationReadiness` (e.g.
     * `staging_reliability`, `failure_recovery`, `axis_coordination`) — NOT
     * `operation_readiness`, which `corps_readiness` already gates on.
     */
    | 'force_quality';

/**
 * Tier mapping inherits from the late-war research catalog:
 *   T1 = first-class operation opportunity (offensive)
 *   T3 = defensive crisis subtype (counterattack/relief authorization)
 *   T4 = sensitive-history operation (territorial only; locked in §9)
 *
 * T4 is reserved for future authoring under the Sensitive History Design
 * Gate. The MVP content (5th Corps / Sana 95) is T1.
 */
export type OpportunityTier = 'T1' | 'T3' | 'T4';

/** Result of a single axis evaluation against current state. */
export interface AxisEvaluation {
    readonly axis: PrereqAxis;
    readonly mode: PrereqMode;
    /** True iff the axis is satisfied. */
    readonly green: boolean;
    /** Player-safe reason text (no raw OSIDs). */
    readonly reason: string;
}

/** Player-safe display surface for a single objective on the dossier. */
export interface OpportunityObjective {
    readonly osid: string;
    readonly label: string;
    readonly risk?: 'low' | 'medium' | 'high';
}

/**
 * One axis of attack within an opportunity. Mirrors `TriggeredAxisDef` shape
 * but lives here so the catalog has no cross-import to triggered_operations.ts.
 */
export interface OpportunityAxisDef {
    readonly axis_id: string;
    readonly name: string;
    /** Which corps provides the brigades for this axis. */
    readonly corps: string;
    /** Pre-authored brigade pool (catalog-time defaults; evaluator may filter). */
    readonly brigades: readonly FormationId[];
    /** OSID objectives in priority order. */
    readonly objectives: readonly string[];
    /** Optional per-axis staging override (otherwise the opportunity-level staging is used). */
    readonly staging_osid?: string;
}

/**
 * A named alternative variant the player can pick under "Redirect".
 * Catalog-only; the player UI maps this to a sub-decision.
 */
export interface OpportunityVariant {
    readonly variant_id: string;
    readonly name: string;
    /** The axes this variant uses (subset / alternative axis configuration). */
    readonly axes: readonly OpportunityAxisDef[];
    /** Optional staging override for the variant. */
    readonly staging_osid?: string;
}

/** Persisted map footprint for one opportunity proposal. UI resolves labels on read. */
export interface OperationOpportunityFootprintSnapshot {
    readonly objectives: readonly string[];
    readonly staging_osids: readonly string[];
}

/** Persisted player-selectable redirect variant surface for one proposal. */
export interface OperationOpportunityRedirectVariantSnapshot extends OperationOpportunityFootprintSnapshot {
    readonly variant_id: string;
    readonly name: string;
}

/**
 * Catalog-level opportunity definition. Authored in family docs and loaded into
 * `OPERATION_OPPORTUNITY_CATALOG`. Predicates are pure functions of GameState.
 */
export interface OperationOpportunityDef {
    /** Stable identifier. Lowercase snake_case. e.g. "sana_95". */
    readonly opportunity_id: string;
    /** Player-safe display name. e.g. "Operation Sana". */
    readonly name: string;
    readonly tier: OpportunityTier;
    readonly faction: FactionId;
    /** Primary corps that owns the operation. */
    readonly primary_corps: string;
    /** Default axes. Variants may override. */
    readonly axes: readonly OpportunityAxisDef[];
    /** Default staging OSID. Per-axis or per-variant overrides take precedence. */
    readonly staging_osid: string;
    /** Planning duration once approved. */
    readonly planning_duration: number;
    /** Optional minimum-attack-outcome override on the resulting CorpsOperation. */
    readonly min_attack_outcome?: CorpsOperation['min_attack_outcome'];
    /** Family identifier — multiple opportunities may share a family (e.g. "5th_corps"). */
    readonly family: string;
    /** BB / ICTY / primary citation strings. */
    readonly citations: readonly string[];
    /** Catalog historical-reference outcome — for divergence reporting only. */
    readonly historical_exit_class:
        | 'did_not_launch'
        | 'decisive_success'
        | 'partial_success'
        | 'failed'
        | 'aborted';
    /**
     * Per-axis prerequisite mode mapping. Every axis must be listed (or `n_a`)
     * so reviewers can see how the family interpreted the generic vocabulary.
     */
    readonly prerequisites: Readonly<Record<PrereqAxis, PrereqMode>> & {
        /** How many `optional` axes must be green to consider the opportunity eligible. */
        readonly min_optional_axes: number;
    };
    /** Per-axis predicate. Returns the green flag + a player-safe reason. */
    readonly evaluators: Readonly<Record<PrereqAxis, AxisPredicate>>;
    /** Optional named alternative variants for the "Redirect" decision. */
    readonly variants?: readonly OpportunityVariant[];
    /**
     * Default staff recommendation when all required axes are green. The bot
     * default decision routes from this; player can override.
     */
    readonly staff_recommendation: 'approve' | 'delay' | 'under_resource' | 'decline';
    /**
     * CANONICAL: per late-war design §10, APWB / SVK ride as RS-aligned auxiliaries;
     * APWB-controlled OSIDs may be RBiH-painted in jan1993 baseline yet still
     * represent enemy targets. This override exempts them from the friendly-controller
     * filter at the buildCorpsOperation seam.
     *
     * SCOPE-RESTRICTED: only honored when `tier === 'T1'` AND `family === 'fifth_corps'`.
     * Outside that scope the override is ignored to prevent cross-family contamination.
     *
     * Default `undefined` — Sana 95 and any other entry not setting this is unaffected.
     */
    readonly targets_friendly_overrides?: readonly string[];
}

/** Pure predicate: returns whether an axis is green + a player-safe reason. */
export type AxisPredicate = (
    state: GameState,
    turn: number,
    def: OperationOpportunityDef,
) => { green: boolean; reason: string };

/** Lifecycle status of a live opportunity proposal. */
export type OpportunityStatus =
    | 'eligible_pending_review'
    | 'delayed'
    | 'approved'
    | 'declined'
    | 'expired'
    | 'redirected'
    | 'under_resourced_approved';

/** Decision the player or bot can register against a proposal. */
export type OpportunityDecision =
    | 'approve'
    | 'delay'
    | 'redirect'
    | 'under_resource'
    | 'decline';

const OPPORTUNITY_DECISION_SET: ReadonlySet<string> = new Set([
    'approve',
    'delay',
    'redirect',
    'under_resource',
    'decline',
]);

/** Live state of one opportunity instance in the proposal queue. */
export interface OperationOpportunityState {
    readonly opportunity_id: string;
    /** Deterministic: "OPP_<eligibility_turn>_<opportunity_id>". */
    readonly proposal_id: string;
    readonly eligibility_turn: number;
    /** Hard expiry — derived from `prerequisites.date_window.turn_max` if any. */
    readonly expires_turn: number;
    status: OpportunityStatus;
    /** Faction that decides — usually the opportunity's own faction. */
    readonly approver_faction: FactionId;
    response_turn?: number;
    redirect_variant_id?: string;
    /** Set once approval has spawned the CorpsOperation. */
    executed_op_id?: string;
    /** Last full axis evaluation (re-snapshotted each turn the proposal sits in queue). */
    last_axis_evaluation: AxisEvaluation[];
    /** Latest authored objective/staging footprint snapshot for UI map highlighting. */
    last_footprint?: OperationOpportunityFootprintSnapshot;
    /** Latest authored redirect choices, if this opportunity has safe variants. */
    redirect_variants?: OperationOpportunityRedirectVariantSnapshot[];
    /**
     * Re-evaluation turn when in `delayed` status. Bot uses this to decide
     * whether to re-surface; cleared on response.
     */
    reevaluate_at_turn?: number;
    /** Latest player-safe force-quality trait snapshot for the primary corps. */
    last_force_quality_traits?: CorpsOperationReadinessTraits;
}

/**
 * LANE E observability: per-turn diagnostic emitted by the evaluator when an
 * opportunity is in its date_window but fails the eligibility check. Bounded
 * by len(catalog × in-window-turns); excludes out-of-season entries to avoid
 * log noise. Read by `tools/diagnostics/opportunity_health_audit.cjs` and any
 * future LANE-D-class stress audit.
 *
 * Owner: `evaluateOperationOpportunities` skip path. Pure observability —
 * does NOT affect eligibility, decision, op spawning, or AAR linkage.
 */
export interface OperationOpportunityIneligibilityDiagnostic {
    readonly turn: number;
    readonly opportunity_id: string;
    /** Required axes that were red. Empty if eligibility failed only on optional count. */
    readonly failed_required_axes: ReadonlyArray<{ readonly axis: PrereqAxis; readonly reason: string }>;
    /** Optional axes that were red. Useful for "what would have helped" diagnosis. */
    readonly failed_optional_axes: ReadonlyArray<{ readonly axis: PrereqAxis; readonly reason: string }>;
    /** How many optional axes were green. */
    readonly optional_green_count: number;
    /** Catalog-defined min_optional_axes threshold. */
    readonly min_optional_axes: number;
}

export type OperationOpportunityTraceEvent =
    | 'blocked'
    | 'eligible'
    | 'expired'
    | 'declined'
    | 'delayed'
    | 'redirected'
    | 'under_resourced_approved'
    | 'approved'
    | 'spawn_failed'
    | 't3_authorized_no_offensive';

/**
 * Compact opportunity lifecycle trace. Observability only: records enough to
 * separate in-window blocked, surfaced, accepted, and spawn-failed outcomes
 * before any late-war operation tuning.
 */
export interface OperationOpportunityTraceRow {
    readonly turn: number;
    readonly opportunity_id: string;
    readonly event: OperationOpportunityTraceEvent;
    readonly proposal_id?: string;
    readonly failed_required_axes?: ReadonlyArray<{ readonly axis: PrereqAxis; readonly reason: string }>;
    readonly failed_optional_axes?: ReadonlyArray<{ readonly axis: PrereqAxis; readonly reason: string }>;
    readonly optional_green_count?: number;
    readonly min_optional_axes?: number;
    readonly executed_op_name?: string;
    readonly redirect_variant_id?: string;
}

function opportunityTraceEventRank(event: OperationOpportunityTraceEvent): number {
    switch (event) {
        case 'blocked': return 0;
        case 'eligible': return 1;
        case 'delayed': return 2;
        case 'declined': return 3;
        case 'expired': return 4;
        case 'redirected': return 5;
        case 'under_resourced_approved': return 6;
        case 't3_authorized_no_offensive': return 7;
        case 'spawn_failed': return 8;
        case 'approved': return 9;
    }
}

/** Resolution log entry written when a proposal exits the queue. */
export interface OperationOpportunityResolution {
    readonly proposal_id: string;
    readonly opportunity_id: string;
    readonly response: OpportunityDecision | 'expire';
    readonly response_turn: number;
    /** Linked CorpsOperation name if approval spawned one. */
    executed_op_name?: string;
    /** Filled when the spawned op completes — set by AAR closer (Phase 4 wiring). */
    executed_op_aar_id?: string;
    /**
     * Filled at AAR close — see design doc §7 exit classes.
     *
     * CANONICAL: `'t3_authorized_no_offensive'` is the T3 sentinel. T3 = defensive-crisis
     * subtype (per design doc §10): approve = "commit reserves to defend, accept the strain."
     * Resolution flows through the existing reactive defense / sector morale chain.
     * NO offensive CorpsOperation is built, so there is no AAR to link — the resolution
     * carries this sentinel instead. UI/records consumers must handle it explicitly.
     */
    exit_class?:
        | 'did_not_launch'
        | 'decisive_success'
        | 'partial_success'
        | 'failed'
        | 'aborted'
        | 't3_authorized_no_offensive';
}

// ═══════════════════════════════════════════════════════════════════════════
type OpportunityExitClass = NonNullable<OperationOpportunityResolution['exit_class']>;

export function exitClassFromOperationAAR(aar: OperationAAR): OpportunityExitClass {
    if (aar.outcome === 'success') return 'decisive_success';
    if (aar.outcome === 'partial') return 'partial_success';
    if (aar.outcome === 'orphaned') return 'aborted';
    if (aar.total_attacks === 0) return 'did_not_launch';
    return 'failed';
}

/**
 * Close the opportunity observability loop after sector_offensive finalizes a
 * normal OperationAAR. Matching is intentionally narrow: same operation name,
 * same response/start turn, and an unresolved AAR link.
 */
export function linkOpportunityResolutionToAAR(
    state: GameState,
    aar: OperationAAR,
): boolean {
    const resolutions = state.military.operation_opportunity_resolutions;
    if (!resolutions || resolutions.length === 0) return false;

    const matches = resolutions
        .map((resolution, index) => ({ resolution, index }))
        .filter(({ resolution }) =>
            resolution.executed_op_aar_id === undefined
            && resolution.executed_op_name === aar.operation_name
            && resolution.response_turn === aar.started_turn)
        .sort((a, b) => {
            const turnDelta = a.resolution.response_turn - b.resolution.response_turn;
            if (turnDelta !== 0) return turnDelta;
            const proposalDelta = strictCompare(a.resolution.proposal_id, b.resolution.proposal_id);
            if (proposalDelta !== 0) return proposalDelta;
            return a.index - b.index;
        });
    const target = matches[0]?.resolution;
    if (!target) return false;

    target.executed_op_aar_id = aar.operation_id;
    target.exit_class = exitClassFromOperationAAR(aar);
    return true;
}

// Catalog
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical opportunity catalog. Phase 3 adds the 5th Corps / Sana 95 family.
 * Sensitive-history T4 entries (Krivaja-95, Stupcanica-95, Gorazde) require
 * historian + game-designer + war-or-game sign-off before appearing here.
 *
 * The catalog is composed from family-scoped sub-catalogs so each family doc
 * has a single source file. Ordering is irrelevant — the evaluator sorts by
 * opportunity_id deterministically.
 */
export const OPERATION_OPPORTUNITY_CATALOG: readonly OperationOpportunityDef[] = [
    ...FIFTH_CORPS_OPPORTUNITIES,
    ...CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES,
    ...FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES,
];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const AXES_IN_DETERMINISTIC_ORDER: readonly PrereqAxis[] = [
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
];

/**
 * Default expiry-turn extractor — reads `evaluators.date_window` if present
 * via a probe and falls back to a wide horizon otherwise. The catalog can
 * always store the actual window inside the evaluator closure.
 *
 * For the substrate we accept a separate explicit field via the catalog
 * (Phase 3 sets it). The default fallback is current_turn + 24 (≈6 months).
 */
function defaultExpiryTurn(currentTurn: number): number {
    return currentTurn + 24;
}

/** Build the deterministic proposal id for one opportunity at one turn. */
export function buildProposalId(opportunityId: string, eligibilityTurn: number): string {
    return `OPP_${eligibilityTurn}_${opportunityId}`;
}

/**
 * Evaluate every axis predicate. Pure read of state. Returns the axis records
 * in canonical (deterministic) order.
 */
export function evaluateAxes(
    state: GameState,
    turn: number,
    def: OperationOpportunityDef,
): AxisEvaluation[] {
    const results: AxisEvaluation[] = [];
    for (const axis of AXES_IN_DETERMINISTIC_ORDER) {
        const mode = def.prerequisites[axis];
        if (mode === 'n_a') {
            results.push({ axis, mode, green: true, reason: 'not applicable' });
            continue;
        }
        const predicate = def.evaluators[axis];
        if (!predicate) {
            // Catalog gap — treat as red so we do not silently surface broken opportunities.
            results.push({
                axis,
                mode,
                green: false,
                reason: 'no predicate authored',
            });
            continue;
        }
        const result = predicate(state, turn, def);
        results.push({ axis, mode, green: result.green, reason: result.reason });
    }
    return results;
}

/**
 * Determine whether an opportunity is eligible given its axis evaluation.
 * Required axes must all be green; optional axes must meet the
 * `min_optional_axes` threshold; n_a axes are ignored.
 */
export function isOpportunityEligible(
    def: OperationOpportunityDef,
    axes: readonly AxisEvaluation[],
): boolean {
    let optionalGreen = 0;
    for (const a of axes) {
        if (a.mode === 'required' && !a.green) return false;
        if (a.mode === 'optional' && a.green) optionalGreen++;
    }
    return optionalGreen >= def.prerequisites.min_optional_axes;
}

function pushUniqueOsid(out: string[], osid: string | undefined): void {
    if (!osid || out.includes(osid)) return;
    out.push(osid);
}

export function buildOpportunityFootprintSnapshot(
    axes: readonly OpportunityAxisDef[],
    stagingOsid: string | undefined,
): OperationOpportunityFootprintSnapshot {
    const objectives: string[] = [];
    const staging_osids: string[] = [];
    pushUniqueOsid(staging_osids, stagingOsid);
    for (const axis of axes) {
        for (const objective of axis.objectives) pushUniqueOsid(objectives, objective);
        pushUniqueOsid(staging_osids, axis.staging_osid);
    }
    return { objectives, staging_osids };
}

export function buildOpportunityRedirectVariantSnapshots(
    def: OperationOpportunityDef,
): OperationOpportunityRedirectVariantSnapshot[] {
    return (def.variants ?? []).map((variant) => {
        const footprint = buildOpportunityFootprintSnapshot(
            variant.axes,
            variant.staging_osid ?? def.staging_osid,
        );
        return {
            variant_id: variant.variant_id,
            name: variant.name,
            objectives: footprint.objectives,
            staging_osids: footprint.staging_osids,
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Evaluator (pipeline step body)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pure evaluator. Given the state and the catalog, produce the next state
 * for `state.military.operation_opportunities`:
 *
 *   - Existing proposals: refresh `last_axis_evaluation`. Move to `expired`
 *     once `turn > expires_turn`. Move out of `delayed` once
 *     `reevaluate_at_turn <= turn`. Resolved/terminal statuses are preserved.
 *   - New proposals: any catalog entry that is currently eligible AND has no
 *     live (non-terminal) proposal in the queue is enqueued at this turn.
 *
 * Determinism: catalog walked in stable id order; the returned proposal queue
 * is sorted by (eligibility_turn, opportunity_id, proposal_id).
 */
export function evaluateOperationOpportunities(
    state: GameState,
    turn: number,
    catalog: readonly OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG,
): {
    proposals: OperationOpportunityState[];
    newResolutions: OperationOpportunityResolution[];
    /**
     * LANE E observability: in-window ineligibility records for this turn only.
     * The pipeline wrapper appends these to `state.military.operation_opportunity_diagnostics`.
     * Empty when every catalog entry was either eligible, out of date_window,
     * or already enqueued under the one-shot guard.
     */
    newDiagnostics: OperationOpportunityIneligibilityDiagnostic[];
    newTraces: OperationOpportunityTraceRow[];
} {
    // Defensive shallow clone of each proposal record so this evaluator is a
    // pure function of the snapshot at call time. The pipeline-step wrapper
    // (`runOpportunityEvaluationStep`) re-assigns the result back to state.
    const working: OperationOpportunityState[] = (state.military.operation_opportunities ?? [])
        .map(p => ({
            ...p,
            last_axis_evaluation: [...p.last_axis_evaluation],
            last_force_quality_traits: p.last_force_quality_traits
                ? { ...p.last_force_quality_traits }
                : undefined,
            last_footprint: p.last_footprint
                ? {
                    objectives: [...p.last_footprint.objectives],
                    staging_osids: [...p.last_footprint.staging_osids],
                }
                : undefined,
            redirect_variants: p.redirect_variants
                ? p.redirect_variants.map(v => ({
                    variant_id: v.variant_id,
                    name: v.name,
                    objectives: [...v.objectives],
                    staging_osids: [...v.staging_osids],
                }))
                : undefined,
        }));

    // Track every opportunity_id that already has a proposal in the queue —
    // whether pending, delayed, OR terminal. Terminal-status opportunities
    // (approved, under_resourced_approved, redirected, declined, expired)
    // must NOT be re-enqueued: a one-shot historical operation that has
    // already been authorized, declined, or expired is consumed for the
    // remainder of the scenario. (Future packets may add re-eligibility
    // cooldowns per design doc §5; for the MVP one-shot is correct.)
    //
    // The `live` map (only pending/delayed) is the subset that can transition
    // back to eligible via reevaluate_at_turn or be marked expired.
    const seenOpportunityIds = new Set<string>();
    const liveByOpportunityId = new Map<string, OperationOpportunityState>();
    for (const p of working) {
        seenOpportunityIds.add(p.opportunity_id);
        if (p.status === 'eligible_pending_review' || p.status === 'delayed') {
            liveByOpportunityId.set(p.opportunity_id, p);
        }
    }

    const newResolutions: OperationOpportunityResolution[] = [];
    const newDiagnostics: OperationOpportunityIneligibilityDiagnostic[] = [];
    const newTraces: OperationOpportunityTraceRow[] = [];

    const sortedCatalog = [...catalog].sort((a, b) =>
        strictCompare(a.opportunity_id, b.opportunity_id));

    for (const def of sortedCatalog) {
        const live = liveByOpportunityId.get(def.opportunity_id);
        const axes = evaluateAxes(state, turn, def);
        const eligible = isOpportunityEligible(def, axes);
        const footprint = buildOpportunityFootprintSnapshot(def.axes, def.staging_osid);
        const redirectVariants = buildOpportunityRedirectVariantSnapshots(def);
        let forceQualityTraits: CorpsOperationReadinessTraits | undefined;
        const getForceQualityTraits = (): CorpsOperationReadinessTraits => {
            forceQualityTraits ??= computeCorpsOperationReadiness(state, def.primary_corps);
            return forceQualityTraits;
        };

        if (live) {
            live.last_axis_evaluation = axes;
            live.last_force_quality_traits = getForceQualityTraits();
            live.last_footprint = footprint;
            live.redirect_variants = redirectVariants;

            if (live.status === 'delayed'
                && live.reevaluate_at_turn !== undefined
                && turn >= live.reevaluate_at_turn
                && eligible) {
                live.status = 'eligible_pending_review';
                live.reevaluate_at_turn = undefined;
            }

            if (turn > live.expires_turn
                && (live.status === 'eligible_pending_review' || live.status === 'delayed')) {
                live.status = 'expired';
                newResolutions.push({
                    proposal_id: live.proposal_id,
                    opportunity_id: live.opportunity_id,
                    response: 'expire',
                    response_turn: turn,
                });
                newTraces.push({
                    turn,
                    opportunity_id: live.opportunity_id,
                    event: 'expired',
                    proposal_id: live.proposal_id,
                });
            }
            continue;
        }

        if (!eligible) {
            // LANE E observability: emit a diagnostic only when the entry is in
            // its date_window — otherwise this writes ~7 records/turn for entries
            // that are simply out of season. "In window" = date_window axis is
            // present and green (every catalog entry uses date_window: 'required'
            // today, but the policy is robust against future n_a / optional uses).
            // Also skip if the one-shot guard would have blocked this entry
            // anyway: a terminal-status proposal isn't an interesting "miss."
            if (!seenOpportunityIds.has(def.opportunity_id)) {
                const dateWindowAxis = axes.find(a => a.axis === 'date_window');
                const inWindow = dateWindowAxis === undefined || dateWindowAxis.green;
                if (inWindow) {
                    const failedRequired: Array<{ axis: PrereqAxis; reason: string }> = [];
                    const failedOptional: Array<{ axis: PrereqAxis; reason: string }> = [];
                    let optionalGreen = 0;
                    for (const a of axes) {
                        if (a.mode === 'required' && !a.green) {
                            failedRequired.push({ axis: a.axis, reason: a.reason });
                        } else if (a.mode === 'optional') {
                            if (a.green) optionalGreen++;
                            else failedOptional.push({ axis: a.axis, reason: a.reason });
                        }
                    }
                    const traceShape = {
                        turn,
                        opportunity_id: def.opportunity_id,
                        failed_required_axes: failedRequired,
                        failed_optional_axes: failedOptional,
                        optional_green_count: optionalGreen,
                        min_optional_axes: def.prerequisites.min_optional_axes,
                    };
                    newDiagnostics.push(traceShape);
                    newTraces.push({
                        ...traceShape,
                        event: 'blocked',
                    });
                }
            }
            continue;
        }

        // One-shot guard: if this opportunity_id has ever been enqueued
        // (pending OR terminal), do not re-enqueue. This prevents the
        // post-approval re-enqueue bug surfaced in 188w n1601 verification
        // where Sana was approved at t175, then re-proposed every turn
        // because the prior `live` filter only looked at pending/delayed.
        if (seenOpportunityIds.has(def.opportunity_id)) continue;

        const proposalId = buildProposalId(def.opportunity_id, turn);
        const expiresTurn = defaultExpiryTurn(turn);
        const fresh: OperationOpportunityState = {
            opportunity_id: def.opportunity_id,
            proposal_id: proposalId,
            eligibility_turn: turn,
            expires_turn: expiresTurn,
            status: 'eligible_pending_review',
            approver_faction: def.faction,
            last_axis_evaluation: axes,
            last_force_quality_traits: getForceQualityTraits(),
            last_footprint: footprint,
            redirect_variants: redirectVariants,
        };
        working.push(fresh);
        seenOpportunityIds.add(def.opportunity_id);
        liveByOpportunityId.set(def.opportunity_id, fresh);
        let optionalGreen = 0;
        for (const a of axes) {
            if (a.mode === 'optional' && a.green) optionalGreen++;
        }
        newTraces.push({
            turn,
            opportunity_id: def.opportunity_id,
            event: 'eligible',
            proposal_id: proposalId,
            optional_green_count: optionalGreen,
            min_optional_axes: def.prerequisites.min_optional_axes,
        });
    }

    const sortedProposals = working.sort((a, b) => {
        if (a.eligibility_turn !== b.eligibility_turn) return a.eligibility_turn - b.eligibility_turn;
        const cmpId = strictCompare(a.opportunity_id, b.opportunity_id);
        if (cmpId !== 0) return cmpId;
        return strictCompare(a.proposal_id, b.proposal_id);
    });

    // LANE E observability: sort diagnostics deterministically by
    // (turn, opportunity_id) — the wrapper appends them to a per-turn
    // log on state.military.
    const sortedDiagnostics = newDiagnostics.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        return strictCompare(a.opportunity_id, b.opportunity_id);
    });

    const sortedTraces = newTraces.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        const cmpId = strictCompare(a.opportunity_id, b.opportunity_id);
        if (cmpId !== 0) return cmpId;
        return opportunityTraceEventRank(a.event) - opportunityTraceEventRank(b.event);
    });

    return { proposals: sortedProposals, newResolutions, newDiagnostics: sortedDiagnostics, newTraces: sortedTraces };
}

/**
 * War-pipeline step entry point. Mutates state.military in place per the
 * deterministic evaluator's output.
 */
export function runOpportunityEvaluationStep(
    state: GameState,
    turn: number,
    catalog: readonly OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG,
): void {
    const { proposals, newResolutions, newDiagnostics, newTraces } = evaluateOperationOpportunities(state, turn, catalog);
    state.military.operation_opportunities = proposals;
    if (newResolutions.length > 0) {
        if (!state.military.operation_opportunity_resolutions) {
            state.military.operation_opportunity_resolutions = [];
        }
        state.military.operation_opportunity_resolutions.push(...newResolutions);
    }
    // LANE E observability: append per-turn ineligibility records for
    // in-window misses. Append-only; future audits / health-diagnostic tools
    // read this for "why didn't opportunity X surface in window Y."
    if (newDiagnostics.length > 0) {
        if (!state.military.operation_opportunity_diagnostics) {
            state.military.operation_opportunity_diagnostics = [];
        }
        state.military.operation_opportunity_diagnostics.push(...newDiagnostics);
    }
    appendOpportunityTraces(state, newTraces);
}

function appendOpportunityTraces(state: GameState, rows: readonly OperationOpportunityTraceRow[]): void {
    if (rows.length === 0) return;
    if (!state.military.operation_opportunity_traces) {
        state.military.operation_opportunity_traces = [];
    }
    state.military.operation_opportunity_traces.push(...rows);
    state.military.operation_opportunity_traces.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        const cmpId = strictCompare(a.opportunity_id, b.opportunity_id);
        if (cmpId !== 0) return cmpId;
        const proposalA = a.proposal_id ?? '';
        const proposalB = b.proposal_id ?? '';
        const cmpProposal = strictCompare(proposalA, proposalB);
        if (cmpProposal !== 0) return cmpProposal;
        return opportunityTraceEventRank(a.event) - opportunityTraceEventRank(b.event);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Decision applier (Phase 2 wires this from the IPC; Phase 1 ships the body)
// ═══════════════════════════════════════════════════════════════════════════

/** Optional knobs passed alongside a decision. */
export interface OpportunityDecisionOptions {
    readonly redirect_variant_id?: string;
    readonly delay_turns?: number;
    /** Reduces brigade roster on under-resource; "minimum" cuts to half (rounded down). */
    readonly commitment_profile?: 'minimum' | 'standard' | 'reinforced';
}

function normalizeOpportunityDecision(value: unknown): OpportunityDecision | null {
    if (typeof value !== 'string') return null;
    return OPPORTUNITY_DECISION_SET.has(value) ? value as OpportunityDecision : null;
}

function normalizeOpportunityDecisionOptions(value: unknown): OpportunityDecisionOptions {
    const raw = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
    const out: {
        redirect_variant_id?: string;
        delay_turns?: number;
        commitment_profile?: 'minimum' | 'standard' | 'reinforced';
    } = {};
    if (typeof raw.redirect_variant_id === 'string' && raw.redirect_variant_id.length > 0) {
        out.redirect_variant_id = raw.redirect_variant_id;
    }
    if (typeof raw.delay_turns === 'number' && Number.isFinite(raw.delay_turns)) {
        out.delay_turns = raw.delay_turns;
    }
    if (
        raw.commitment_profile === 'minimum'
        || raw.commitment_profile === 'standard'
        || raw.commitment_profile === 'reinforced'
    ) {
        out.commitment_profile = raw.commitment_profile;
    }
    return out;
}

/**
 * Apply a player or bot decision to a pending proposal. Single owner path:
 * approval ALWAYS routes through `buildCorpsOperation` so the resulting op is
 * indistinguishable from any other in `sector_offensive.ts`.
 *
 * Returns the updated proposal record (or null if the proposal id was not
 * found / was already terminal).
 */
export function applyOpportunityDecision(
    state: GameState,
    turn: number,
    proposalId: string,
    decision: OpportunityDecision,
    catalog: readonly OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG,
    options: OpportunityDecisionOptions = {},
): OperationOpportunityState | null {
    const proposals = state.military.operation_opportunities;
    if (!proposals) return null;
    const proposal = proposals.find(p => p.proposal_id === proposalId);
    if (!proposal) return null;
    if (proposal.status !== 'eligible_pending_review' && proposal.status !== 'delayed') {
        return null;
    }
    const def = catalog.find(d => d.opportunity_id === proposal.opportunity_id);
    if (!def) return null;

    if (!state.military.operation_opportunity_resolutions) {
        state.military.operation_opportunity_resolutions = [];
    }

    switch (decision) {
        case 'delay': {
            const delayTurns = Math.max(1, options.delay_turns ?? 4);
            proposal.status = 'delayed';
            proposal.reevaluate_at_turn = Math.min(turn + delayTurns, proposal.expires_turn + 1);
            appendOpportunityTraces(state, [{
                turn,
                opportunity_id: proposal.opportunity_id,
                event: 'delayed',
                proposal_id: proposal.proposal_id,
            }]);
            return proposal;
        }
        case 'decline': {
            proposal.status = 'declined';
            proposal.response_turn = turn;
            state.military.operation_opportunity_resolutions.push({
                proposal_id: proposal.proposal_id,
                opportunity_id: proposal.opportunity_id,
                response: 'decline',
                response_turn: turn,
            });
            appendOpportunityTraces(state, [{
                turn,
                opportunity_id: proposal.opportunity_id,
                event: 'declined',
                proposal_id: proposal.proposal_id,
            }]);
            return proposal;
        }
        case 'redirect': {
            const variantId = options.redirect_variant_id;
            if (!variantId || !def.variants?.some(v => v.variant_id === variantId)) {
                // Unknown variant → no-op, leaves proposal pending so caller can retry.
                return null;
            }
            proposal.status = 'redirected';
            proposal.response_turn = turn;
            proposal.redirect_variant_id = variantId;
            // Spawning the redirected op is the same approval path with overridden axes.
            const variant = def.variants.find(v => v.variant_id === variantId)!;
            const opName = spawnCorpsOperationFromOpportunity(
                state,
                turn,
                def,
                variant.axes,
                variant.staging_osid ?? def.staging_osid,
                'standard',
            );
            if (opName) proposal.executed_op_id = opName;
            state.military.operation_opportunity_resolutions.push({
                proposal_id: proposal.proposal_id,
                opportunity_id: proposal.opportunity_id,
                response: 'redirect',
                response_turn: turn,
                executed_op_name: opName ?? undefined,
            });
            appendOpportunityTraces(state, [{
                turn,
                opportunity_id: proposal.opportunity_id,
                event: opName ? 'redirected' : 'spawn_failed',
                proposal_id: proposal.proposal_id,
                executed_op_name: opName ?? undefined,
                redirect_variant_id: variantId,
            }]);
            return proposal;
        }
        case 'under_resource': {
            proposal.status = 'under_resourced_approved';
            proposal.response_turn = turn;
            const opName = spawnCorpsOperationFromOpportunity(
                state,
                turn,
                def,
                def.axes,
                def.staging_osid,
                'minimum',
            );
            if (opName) proposal.executed_op_id = opName;
            state.military.operation_opportunity_resolutions.push({
                proposal_id: proposal.proposal_id,
                opportunity_id: proposal.opportunity_id,
                response: 'under_resource',
                response_turn: turn,
                executed_op_name: opName ?? undefined,
            });
            appendOpportunityTraces(state, [{
                turn,
                opportunity_id: proposal.opportunity_id,
                event: opName ? 'under_resourced_approved' : 'spawn_failed',
                proposal_id: proposal.proposal_id,
                executed_op_name: opName ?? undefined,
            }]);
            return proposal;
        }
        case 'approve': {
            proposal.status = 'approved';
            proposal.response_turn = turn;
            // CANONICAL: T3 = defensive-crisis subtype. Approve = "commit reserves to
            // defend, accept the strain." Resolution flows through existing reactive
            // defense / sector morale chain. NO offensive CorpsOperation, NO new
            // lifecycle, NO new combat math. Decline / delay / under_resource / redirect
            // for T3 are unchanged and behave identically to T1 — only `approve` short-
            // circuits.
            if (def.tier === 'T3') {
                state.military.operation_opportunity_resolutions.push({
                    proposal_id: proposal.proposal_id,
                    opportunity_id: proposal.opportunity_id,
                    response: 'approve',
                    response_turn: turn,
                    executed_op_name: undefined,
                    executed_op_aar_id: undefined,
                    exit_class: 't3_authorized_no_offensive',
                });
                appendOpportunityTraces(state, [{
                    turn,
                    opportunity_id: proposal.opportunity_id,
                    event: 't3_authorized_no_offensive',
                    proposal_id: proposal.proposal_id,
                }]);
                return proposal;
            }
            const opName = spawnCorpsOperationFromOpportunity(
                state,
                turn,
                def,
                def.axes,
                def.staging_osid,
                options.commitment_profile ?? 'standard',
            );
            if (opName) proposal.executed_op_id = opName;
            state.military.operation_opportunity_resolutions.push({
                proposal_id: proposal.proposal_id,
                opportunity_id: proposal.opportunity_id,
                response: 'approve',
                response_turn: turn,
                executed_op_name: opName ?? undefined,
            });
            appendOpportunityTraces(state, [{
                turn,
                opportunity_id: proposal.opportunity_id,
                event: opName ? 'approved' : 'spawn_failed',
                proposal_id: proposal.proposal_id,
                executed_op_name: opName ?? undefined,
            }]);
            return proposal;
        }
    }
}

/**
 * Build a CorpsOperation through the canonical factory and attach it to the
 * primary corps's active operations. Single owner path — never builds a
 * CorpsOperation directly; never bypasses `buildCorpsOperation`.
 *
 * Returns the operation name on success, null if the primary corps does not
 * exist or no axis has any participating brigades.
 */
function spawnCorpsOperationFromOpportunity(
    state: GameState,
    turn: number,
    def: OperationOpportunityDef,
    axesIn: readonly OpportunityAxisDef[],
    stagingOsid: string,
    commitment: 'minimum' | 'standard' | 'reinforced',
): string | null {
    const cmd = state.military.corps_command?.[def.primary_corps];
    if (!cmd) return null;

    // CANONICAL: scope-restricted to T1 fifth_corps to prevent cross-family contamination.
    // Other tiers / families ignore the override even if authored, so an accidental copy
    // into (e.g.) a T1 posavina entry cannot cross-target friendly OSIDs.
    const overrideActive = def.tier === 'T1' && def.family === 'fifth_corps';
    const overrideSet: ReadonlySet<string> = overrideActive && def.targets_friendly_overrides
        ? new Set(def.targets_friendly_overrides)
        : new Set<string>();

    const builtAxes: OperationAxis[] = [];
    const allParticipating: FormationId[] = [];
    for (const axis of axesIn) {
        const brigadesForAxis = applyCommitmentProfile(axis.brigades, commitment);
        if (brigadesForAxis.length === 0) continue;

        // Friendly-controller filter — mirrors triggered_operations.ts:buildOperation
        // (lines 542-545). Objectives painted/controlled by the acting faction or its
        // ally are skipped UNLESS the OSID is in `targets_friendly_overrides` AND the
        // override scope (T1 fifth_corps) holds. This is the single seam where
        // APWB-paint-as-RBiH OSIDs get exempted for the 5th Corps family.
        const filteredObjectives = axis.objectives.filter((osid) => {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            if (controller === null) return true;            // unpainted / unknown → keep
            if (controller !== def.faction) return true;     // enemy-controlled → keep
            return overrideSet.has(osid);                    // friendly-controlled → keep iff override
        });

        if (filteredObjectives.length === 0) continue;
        // Full OperationAxis init shape — mirrors createSingleAxis() in
        // sector_offensive_axis_helpers.ts so the lifecycle owner can advance
        // these axes without ever distinguishing opportunity-spawned ops from
        // any other corps op.
        builtAxes.push({
            axis_id: axis.axis_id,
            name: axis.name,
            assigned_brigades: brigadesForAxis,
            objectives: [...filteredObjectives],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            ...(axis.staging_osid ? { staging_osid: axis.staging_osid } : {}),
        });
        for (const b of brigadesForAxis) allParticipating.push(b);
    }
    if (builtAxes.length === 0) return null;

    const op = buildCorpsOperation(
        {
            name: def.name,
            planning_duration: def.planning_duration,
            staging_osid: stagingOsid,
            ...(def.min_attack_outcome ? { min_attack_outcome: def.min_attack_outcome } : {}),
        },
        builtAxes,
        allParticipating,
        turn,
        false,            // is_pre_planned: false — opportunity ops do NOT occupy slot 0.
        undefined,
    );

    cmd.active_operations.push(op);
    return op.name;
}

/** "minimum" trims the brigade pool to the floor of half the authored set. */
function applyCommitmentProfile(
    brigades: readonly FormationId[],
    commitment: 'minimum' | 'standard' | 'reinforced',
): FormationId[] {
    if (commitment === 'minimum') {
        const cut = Math.max(1, Math.floor(brigades.length / 2));
        return [...brigades].sort(strictCompare).slice(0, cut);
    }
    // standard + reinforced both ship the authored pool. "reinforced" is reserved
    // for a future reserve-loan integration (army HQ pulls extra brigades into
    // the op). Phase 1 keeps reinforced == standard at the catalog boundary.
    return [...brigades].sort(strictCompare);
}

// ═══════════════════════════════════════════════════════════════════════════
// Bot default decision (Phase 2 will wire this; Phase 1 ships the body)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deterministic default decision for a bot-controlled faction. Reads only the
 * proposal's own state + the catalog's `staff_recommendation`. No randomness;
 * no faction personality look-ups (those land in a future packet).
 *
 * The default is the catalog's `staff_recommendation` when all required axes
 * are green; otherwise `delay`. The bot will never `redirect` or
 * `under_resource` by default — those require explicit personality wiring.
 */
export function defaultBotDecisionForOpportunity(
    proposal: OperationOpportunityState,
    def: OperationOpportunityDef,
): OpportunityDecision {
    const allRequiredGreen = proposal.last_axis_evaluation
        .filter(a => a.mode === 'required')
        .every(a => a.green);
    if (!allRequiredGreen) return 'delay';
    return def.staff_recommendation;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2 — autonomy / IPC review surface
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Proposed_action prefix for opportunity decisions in `pending_proposal_reviews`.
 * Format: "OPPORTUNITY:<proposal_id>" — the IPC accept/reject handler simply
 * marks `accepted` on the proposal row; the war-pipeline consumer
 * `applyResolvedOpportunityDecisions` reads the accepted flag and routes to
 * `applyOpportunityDecision`. Phase E may add a richer IPC for the
 * delay/redirect/under_resource branches; the binary accept/reject path here
 * intentionally maps to approve/decline only.
 */
export const OPPORTUNITY_PROPOSAL_ACTION_PREFIX = 'OPPORTUNITY:';

/**
 * Apply default bot decisions for any pending opportunity whose
 * `approver_faction` is NOT the player. Runs synchronously after the
 * evaluator so bot opportunities are resolved on the same turn they become
 * eligible — never sitting in the player's review queue.
 *
 * Player faction may be null (no human player) — in which case all factions'
 * opportunities are bot-decided.
 */
export function applyBotOpportunityDecisions(
    state: GameState,
    turn: number,
    playerFaction: FactionId | null,
    catalog: readonly OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG,
): void {
    const proposals = state.military.operation_opportunities;
    if (!proposals || proposals.length === 0) return;
    // Snapshot the proposal ids first — the apply mutates the underlying array.
    const targets: Array<{ proposalId: string; def: OperationOpportunityDef; proposal: OperationOpportunityState }> = [];
    for (const p of proposals) {
        if (p.status !== 'eligible_pending_review') continue;
        if (playerFaction !== null && p.approver_faction === playerFaction) continue;
        const def = catalog.find(d => d.opportunity_id === p.opportunity_id);
        if (!def) continue;
        targets.push({ proposalId: p.proposal_id, def, proposal: p });
    }
    // Sort deterministically so bot decisions are stable across replays.
    targets.sort((a, b) => strictCompare(a.proposalId, b.proposalId));
    for (const t of targets) {
        const decision = defaultBotDecisionForOpportunity(t.proposal, t.def);
        applyOpportunityDecision(state, turn, t.proposalId, decision, catalog);
    }
}

/**
 * Build `PendingProposalReview` rows for any opportunity whose
 * `approver_faction === playerFaction` AND status is
 * `eligible_pending_review`. Returns an empty array when autonomy is disabled
 * (level 0) or when the player faction is undefined.
 *
 * The proposed_action format is `OPPORTUNITY:<proposal_id>`. The accept/reject
 * IPC handlers (electron-main.cjs) simply mark `accepted` on the row; the
 * `applyResolvedOpportunityDecisions` step consumes those marks on the next
 * turn and routes to `applyOpportunityDecision`.
 *
 * The description is the player-safe opportunity name plus a short staff line
 * derived from the catalog's `staff_recommendation`. NO raw OSIDs leak.
 */
export function generateOpportunityProposalReviews(
    state: GameState,
    playerFaction: FactionId,
    catalog: readonly OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG,
): PendingProposalReview[] {
    if (state.meta.autonomy_level !== 1) return [];
    const proposals = state.military.operation_opportunities;
    if (!proposals || proposals.length === 0) return [];

    const pending = proposals
        .filter(p => p.status === 'eligible_pending_review' && p.approver_faction === playerFaction)
        .sort((a, b) => strictCompare(a.proposal_id, b.proposal_id));

    const out: PendingProposalReview[] = [];
    for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        const def = catalog.find(d => d.opportunity_id === p.opportunity_id);
        if (!def) continue;
        const recommendation = def.staff_recommendation;
        const desc = `${def.name} — staff recommendation: ${recommendation}`;
        out.push({
            id: `PROP_${state.meta.turn}_opportunity_${i}`,
            turn: state.meta.turn,
            faction: playerFaction,
            domain: 'ops',
            description: desc,
            proposed_action: `${OPPORTUNITY_PROPOSAL_ACTION_PREFIX}${p.proposal_id}`,
            current_value: 'pending_review',
            proposed_value: recommendation,
        });
    }
    return out;
}

/**
 * Consume any `pending_proposal_reviews` rows whose `proposed_action` starts
 * with `OPPORTUNITY:` and which carry either an explicit rich
 * `opportunity_decision` or the legacy binary `accepted` flag. Rich decisions
 * let the desktop bridge expose delay / redirect / under_resource without
 * moving opportunity state ownership out of the war pipeline.
 *
 * Runs at the START of each war turn, before `apply-autonomy-transition` GCs
 * the prior turn's resolved proposals. The IPC handler only marks `accepted`;
 * this step is the single owner that translates that into a decision on the
 * opportunity queue.
 */
export function applyResolvedOpportunityDecisions(
    state: GameState,
    turn: number,
    catalog: readonly OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG,
): void {
    const reviews = state.meta.pending_proposal_reviews;
    if (!reviews || reviews.length === 0) return;
    // Sort deterministically so the order of decisions is replay-stable.
    const targets = reviews
        .filter(r =>
            r.proposed_action.startsWith(OPPORTUNITY_PROPOSAL_ACTION_PREFIX)
            && (normalizeOpportunityDecision(r.opportunity_decision) !== null || r.accepted !== undefined))
        .sort((a, b) => strictCompare(a.id, b.id));
    for (const r of targets) {
        const proposalId = r.proposed_action.slice(OPPORTUNITY_PROPOSAL_ACTION_PREFIX.length);
        const explicitDecision = normalizeOpportunityDecision(r.opportunity_decision);
        const decision: OpportunityDecision = explicitDecision ?? (r.accepted ? 'approve' : 'decline');
        const options = explicitDecision
            ? normalizeOpportunityDecisionOptions(r.opportunity_decision_options)
            : {};
        applyOpportunityDecision(state, turn, proposalId, decision, catalog, options);
    }
}
