/**
 * A3 — Army-Level Order Interpretation
 * LANE-NIGHTSHIFT-A3-ARMY-LEVEL-ORDER-INTERPRETATION
 *
 * Authoritative DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
 * (eee308e0).
 * A1 closeout: docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md (18136710)
 * A2 closeout: docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md (ba6955bf)
 *
 * What A3 ships:
 *   1. interpretArmyDirective(state, faction, directive)
 *      — translates a POLITICAL directive (DDR Q1 vocabulary) into a faction-keyed
 *        per-corps directive map; emits an `army_directive_pushback` PendingOfficerEvent
 *        when compliance score is below FULL_COMPLIANCE_THRESHOLD (DDR Q2 advisory shape).
 *
 *   2. proposeAutonomousArmyLaunch(state, faction)
 *      — when the army CO has stubbornness ≥ STUBBORNNESS_AUTONOMOUS_THRESHOLD AND
 *        the autonomous-launch cooldown has elapsed AND an opportunity-catalog entry
 *        matches the army CO's faction + readiness gates, emits an
 *        `army_co_proposes_op` PendingOfficerEvent (1-turn warning per DDR Q3).
 *        Caller (pipeline step in war_phases.ts) fires the proposal one turn
 *        before any preparation entry, giving the political leader a deterministic
 *        override window.
 *
 * What A3 does NOT do:
 *   • Mutate corps stance directly (corps Phase 1 path remains canonical for that).
 *   • Apply political_capital cost (UI handler / political-bot decision; A5/A4 wire that).
 *   • Modify operation_opportunity_catalog* (read-only consumer here).
 *   • Modify army_hq_gathering.ts behavior (A1 already wired CampaignPlan into briefing).
 *   • Populate stubbornness / override_tolerance values (A4 owns roster data).
 *
 * Faction-symmetric: NO `if (faction === 'X')` branches. All asymmetry comes
 * from data fields (stubbornness, competence, aggressiveness, override_tolerance).
 *
 * Determinism: no Math.random(), no Date.now(), no `new Date()`, no locale-sort.
 * All maps iterated via sorted keys.
 *
 * Sensitive-history compliance:
 *   Ring 1 mechanism (faction-symmetric); Ring 2 data (faction-asymmetric values
 *   land via canonical roster in A4). No FORAWWV / paint anchor /
 *   political_controllers / OOB / rupture-wiring touch.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type {
    NamedOfficer,
    NamedOfficerState,
    PendingOfficerEvent,
    OrderSnapshot,
} from '../../state/officer_types.js';
import { getArmyCommander } from './officer_system.js';
import { OPERATION_OPPORTUNITY_CATALOG, evaluateAxes, isOpportunityEligible, buildProposalId } from './operation_opportunities.js';
import type { OperationOpportunityDef } from './operation_opportunities.js';

// node:fs / node:path imported only for the env-flag-gated jsonl writer used
// by C2 telemetry (`emitC2TelemetryEvent` / `flushC2TurnTelemetry` below).
// They are dead-code-eliminable when the C2 flag is OFF — the writer's first
// line is `if (C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED) return;` — but ESM
// forbids dynamic require() so we name the modules here. UI builds (Electron
// renderer / Vite map) never import this file; it is a sim-only module.
// Mirrors the precedent established in src/sim/combat/corps_front_sectors.ts
// (LANE-NIGHTSHIFT-SECTOR-PARTITION-INSTRUMENTATION).
import * as _fsModule from 'node:fs';
import * as _pathModule from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// Constants (DDR-locked per panel defaults table at DDR §"AI-officers
// P1-P5 — confirmed panel defaults")
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maximum directive deviation: corps directives may shift this many steps from
 * the army CO's "raw" interpretation of the political directive (mirrors corps
 * Phase 1 MAX_STANCE_SHIFT). DDR Q2 advisory shape — bounded, predictable.
 */
export const MAX_DIRECTIVE_DEVIATION = 1;

/**
 * Stubbornness threshold for autonomous launch (DDR Q3, locked in panel-defaults
 * table). Officers with stubbornness ≥ this value MAY autonomously propose
 * opportunity-catalog operations the political leader did NOT explicitly order.
 */
export const STUBBORNNESS_AUTONOMOUS_THRESHOLD = 4;

/**
 * Autonomous-launch cooldown window in turns (DDR Q3, locked). Maximum one
 * autonomous proposal per army CO per N-turn rolling window. Enforced via
 * NamedOfficerState.last_autonomous_launch_turn (A2 substrate).
 */
export const AUTONOMOUS_LAUNCH_COOLDOWN_TURNS = 12;

/**
 * Player override cost (DDR Q1). Charged when a player faction directly sets
 * a corps directive that contradicts the army CO's interpretation. A3 exposes
 * the constant; the IPC handler / political-bot decision lane (A5/A4) consumes
 * it. Not deducted here (A3 is a pure interpretation predicate).
 */
export const ARMY_OVERRIDE_POLITICAL_CAPITAL_COST = 2;

// Compliance score thresholds — mirror corps Phase 1 (order_interpretation.ts)
const FULL_COMPLIANCE_THRESHOLD = 0.80;
const MODIFIED_COMPLIANCE_THRESHOLD = 0.50;
const PARTIAL_COMPLIANCE_THRESHOLD = 0.25;
// Below PARTIAL_COMPLIANCE_THRESHOLD = refusal

// Alignment / misalignment bonuses on the base compliance score
const ALIGNMENT_BONUS = 0.20;
const MISALIGNMENT_PENALTY = 0.20;

// Reliability-modifier integration is a Phase-3-of-corps concern; A3 leaves
// it as a 0.0 placeholder slot for forward compatibility.
const A3_RELIABILITY_PLACEHOLDER = 0.0;

// ═══════════════════════════════════════════════════════════════════════════
// C2 — Corps Directive Telemetry Surface
// LANE-NIGHTSHIFT-C2-CORPS-DIRECTIVE-TELEMETRY-SURFACE
//
// DDR: docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md
// (57cec91c) — Q3 + Q5.
// Predecessors: A3 c8ff93d8 • B1 44053a32 • B2 d019bef7 • C1 5084071d.
//
// Closes the observability gap surfaced by A4's 188w A/B finding: B-lane
// thresholds PASS but `weekly_report.jsonl` showed zero observable telemetry
// because (a) A3 didn't persist directives (closed by C1) AND (b) no events
// were emitted to the post-run telemetry stream (closed here).
//
// Three event types per DDR Q3 (emitted at the C-lane consumer site, not at
// A3's emit site, so the panel observes whether the consumer actually used
// the persisted directive):
//   1. `army_directive_application` — per (faction × corps × turn) when A3
//      persists a corps_directive.
//      Payload: { turn, faction, corps_id, directive_verb, role_overlay,
//                 source_political_directive_id }
//   2. `corps_role_overlay_count` — weekly aggregate (per faction).
//      Payload: { turn, faction, count, by_role: { primary, secondary,
//                 contain, economy } }
//   3. `political_directive_chain_active` — turn-end assertion when both
//      the B1 producer fired AND A3 persisted ≥1 directive that turn.
//      Payload: { turn, factions_with_active_chain: ['HRHB','RBiH','RS'] }
//
// Channel: side-channel JSONL at `data/derived/_debug/
// c_lane_corps_directive_telemetry.jsonl` (gitignored — see `.gitignore`
// `data/derived/_debug/` rule). Mirrors the corps_front_sectors.ts perf-
// instrumentation precedent. Post-run panel reads this file directly.
//
// CRITICAL byte-stability invariants (verified by tests T4 + T9):
//   • C2 NEVER mutates GameState — all events are written to the side-channel
//     JSONL file. `final_state_hash` is identical whether C2 is enabled or
//     disabled. weekly_report.jsonl is byte-identical with C2 enabled vs.
//     disabled (we never write to weekly_report.jsonl from C2).
//   • Env flag `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true` short-circuits
//     ALL three emissions → side-channel JSONL is not written. When the flag
//     is set, the file is byte-identical to a pre-C2 baseline (i.e. absent
//     when no other code wrote to it).
//   • Determinism: no Math.random / Date.now / new Date / setTimeout. All
//     iteration via sorted keys. Event order is (faction-alphabetical, then
//     corps_id-alphabetical) — same as the directive iteration order.
//
// Faction-symmetric mechanism: same code path for RBiH / RS / HRHB. No
// per-faction string-equality branches (T10 static-grep guard).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Side-channel JSONL output path, relative to process.cwd(). Gitignored via
 * the `data/derived/_debug/` rule in `.gitignore`. The post-run panel reads
 * this path directly when the C2 flag is enabled.
 */
const C2_TELEMETRY_OUTPUT_REL_PATH = 'data/derived/_debug/c_lane_corps_directive_telemetry.jsonl';

/**
 * Schema version for emitted lines. Bump when payload shape changes so panel
 * readers can route by version. v1 ships the three types defined in DDR Q3.
 */
const C2_TELEMETRY_SCHEMA_VERSION = 1;

/**
 * Returns true iff the C2 telemetry surface is short-circuited (env flag set).
 * Exposed so tests can verify flag-gating without touching env globals.
 */
export function isC2TelemetryDisabled(): boolean {
    return process.env.C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED === 'true';
}

/**
 * Per-turn aggregation buffer for C2 telemetry. Module-local — never lives
 * inside GameState (telemetry-only invariance, T9). Reset at the start of
 * each `applyArmyDirectiveInterpretation` invocation; flushed at the end of
 * the same call. There is no cross-turn state.
 */
interface C2TurnTelemetryBuffer {
    turn: number;
    /** One entry per persisted (faction × corps) directive application this turn. */
    applications: Array<{
        turn: number;
        faction: FactionId;
        corps_id: string;
        directive_verb: PoliticalDirectiveVerb;
        role_overlay: ArmyCorpsDirectiveRole;
        source_political_directive_id: string | null;
    }>;
    /** Per-faction set of factions for which BOTH a B1 directive existed AND A3 persisted ≥1 corps_directive this turn. */
    factionsWithActiveChain: Set<FactionId>;
    /** Per-faction tally for `corps_role_overlay_count` aggregate event. */
    perFactionRoleCounts: Map<FactionId, { primary: number; secondary: number; contain: number; economy: number }>;
}

let _activeTurnBuffer: C2TurnTelemetryBuffer | null = null;

function _newTurnBuffer(turn: number): C2TurnTelemetryBuffer {
    return {
        turn,
        applications: [],
        factionsWithActiveChain: new Set(),
        perFactionRoleCounts: new Map(),
    };
}

function _bumpRoleCount(
    buffer: C2TurnTelemetryBuffer,
    faction: FactionId,
    role: ArmyCorpsDirectiveRole,
): void {
    let counts = buffer.perFactionRoleCounts.get(faction);
    if (!counts) {
        counts = { primary: 0, secondary: 0, contain: 0, economy: 0 };
        buffer.perFactionRoleCounts.set(faction, counts);
    }
    counts[role] += 1;
}

/**
 * Record a per-corps directive application into the active turn buffer.
 * Caller (persistCorpsDirectives) invokes this once per persisted corps
 * directive when both the C2 flag is OFF (i.e. telemetry is ENABLED) and
 * the C1 consumer flag is OFF (i.e. C1 actually persisted the slot).
 *
 * The weekly aggregate (`corps_role_overlay_count`) and chain-active marker
 * are computed from this buffer at flush time.
 *
 * State-free: writes to module-local buffer, NOT to GameState.
 */
function recordC2Application(
    faction: FactionId,
    corpsId: string,
    verb: PoliticalDirectiveVerb,
    role: ArmyCorpsDirectiveRole,
    sourcePoliticalDirectiveId: string | null,
    turn: number,
): void {
    if (isC2TelemetryDisabled()) return;
    if (!_activeTurnBuffer || _activeTurnBuffer.turn !== turn) {
        // Defensive: caller should have opened the buffer at the top of the
        // turn. If the buffer is missing or stale, open a fresh one so the
        // event is not silently dropped (test T6 guards determinism).
        _activeTurnBuffer = _newTurnBuffer(turn);
    }
    _activeTurnBuffer.applications.push({
        turn,
        faction,
        corps_id: corpsId,
        directive_verb: verb,
        role_overlay: role,
        source_political_directive_id: sourcePoliticalDirectiveId,
    });
    _bumpRoleCount(_activeTurnBuffer, faction, role);
    _activeTurnBuffer.factionsWithActiveChain.add(faction);
}

/**
 * Flush the active turn buffer to the side-channel JSONL file. Emits up to
 * three event lines per faction × turn:
 *   • One `army_directive_application` line per persisted corps directive.
 *   • One `corps_role_overlay_count` line per faction with non-zero counts.
 *   • One `political_directive_chain_active` line at end-of-turn when at
 *     least one faction had active chain.
 *
 * State-free; only side effect is fs.appendFileSync to the gitignored
 * `data/derived/_debug/` path. No-op when the C2 flag is set or when the
 * buffer is empty.
 */
function flushC2TurnTelemetry(): void {
    if (isC2TelemetryDisabled()) {
        // Drop the buffer regardless so a re-enabled future turn starts clean.
        _activeTurnBuffer = null;
        return;
    }
    const buffer = _activeTurnBuffer;
    _activeTurnBuffer = null;
    if (!buffer) return;
    if (buffer.applications.length === 0 && buffer.factionsWithActiveChain.size === 0) return;

    const fs = _fsModule;
    const path = _pathModule;
    const cwd = process.cwd();
    const outDir = path.join(cwd, 'data', 'derived', '_debug');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'c_lane_corps_directive_telemetry.jsonl');

    const lines: string[] = [];

    // 1. army_directive_application — per (faction × corps × turn).
    //    Iterate in deterministic order: faction-alphabetical, then corps-id
    //    alphabetical. The applications array was filled in the same order
    //    by applyArmyDirectiveInterpretation (factions: ['HRHB','RBiH','RS'])
    //    + persistCorpsDirectives (sorted by corps_id).
    for (const app of buffer.applications) {
        lines.push(JSON.stringify({
            schema_version: C2_TELEMETRY_SCHEMA_VERSION,
            event_type: 'army_directive_application',
            turn: app.turn,
            faction: app.faction,
            corps_id: app.corps_id,
            directive_verb: app.directive_verb,
            role_overlay: app.role_overlay,
            source_political_directive_id: app.source_political_directive_id,
        }));
    }

    // 2. corps_role_overlay_count — weekly aggregate per faction. Iterate
    //    factions in alphabetical order for deterministic output.
    const orderedFactions: FactionId[] = (Array.from(buffer.perFactionRoleCounts.keys()) as FactionId[])
        .sort();
    for (const faction of orderedFactions) {
        const counts = buffer.perFactionRoleCounts.get(faction)!;
        const total = counts.primary + counts.secondary + counts.contain + counts.economy;
        if (total === 0) continue;
        lines.push(JSON.stringify({
            schema_version: C2_TELEMETRY_SCHEMA_VERSION,
            event_type: 'corps_role_overlay_count',
            turn: buffer.turn,
            faction,
            count: total,
            by_role: {
                primary: counts.primary,
                secondary: counts.secondary,
                contain: counts.contain,
                economy: counts.economy,
            },
        }));
    }

    // 3. political_directive_chain_active — turn-end assertion. Single line
    //    when at least one faction had both producer fired AND ≥1 persisted
    //    directive.
    if (buffer.factionsWithActiveChain.size > 0) {
        const factionsArr: FactionId[] = (Array.from(buffer.factionsWithActiveChain) as FactionId[])
            .sort();
        lines.push(JSON.stringify({
            schema_version: C2_TELEMETRY_SCHEMA_VERSION,
            event_type: 'political_directive_chain_active',
            turn: buffer.turn,
            factions_with_active_chain: factionsArr,
        }));
    }

    if (lines.length === 0) return;
    fs.appendFileSync(outPath, lines.join('\n') + '\n', { encoding: 'utf8' });
}

// ── Test-only surfaces ───────────────────────────────────────────────────
// Exposed solely so tests can verify flag-gating, deterministic ordering,
// and chain-observability without spinning up a full scenario run.
export const __c2TelemetryTestHooks = {
    isFlagDisabled: () => isC2TelemetryDisabled(),
    openTurn: (turn: number): void => {
        _activeTurnBuffer = _newTurnBuffer(turn);
    },
    snapshotTurn: () => {
        if (!_activeTurnBuffer) return null;
        const b = _activeTurnBuffer;
        return {
            turn: b.turn,
            applications: b.applications.slice(),
            factions_with_active_chain: Array.from(b.factionsWithActiveChain).sort(),
            per_faction_role_counts: Array.from(b.perFactionRoleCounts.entries())
                .sort((a, b2) => a[0].localeCompare(b2[0]))
                .map(([faction, counts]) => ({ faction, ...counts })),
        };
    },
    closeTurn: (): void => {
        _activeTurnBuffer = null;
    },
    flush: (): void => flushC2TurnTelemetry(),
    outputRelPath: () => C2_TELEMETRY_OUTPUT_REL_PATH,
};

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical political-directive vocabulary (DDR Q1).
 *
 * The player UI (A5) issues one of these per turn. The army CO interprets
 * the verb into a per-corps directive role (FrontPriority['role']) — this is
 * the political → corps translation that A3 owns.
 */
export type PoliticalDirectiveVerb =
    | 'HOLD_AT_ALL_COSTS'        // DEFENSIVE-WEIGHT
    | 'PRESS_OFFENSIVE'          // OFFENSIVE-WEIGHT in named theater
    | 'MAINTAIN_CORRIDOR'        // CONTINGENT-DEFENSE
    | 'PREPARE_RESERVE'          // RESERVE-WEIGHT
    | 'HONOR_TRUCE'              // NEGOTIATION-WEIGHT
    | 'BALANCE_FRONTS';          // default / undirected

export interface PoliticalDirective {
    /** Directive verb from the canonical vocabulary. */
    verb: PoliticalDirectiveVerb;
    /** Optional corps focus — when present, the army CO weights translation toward this corps. */
    target_corps_id?: string;
    /** Optional opaque directive id (for cross-reference into army_co_decision_traces). */
    directive_id?: string;
}

export type ArmyComplianceCategory = 'full' | 'modified' | 'partial' | 'refused';

/**
 * Per-corps directive output of A3 interpretation. A "raw" reading of the
 * political verb produces a base role; the army CO's deviation may shift that
 * role at most MAX_DIRECTIVE_DEVIATION steps along the role ladder (below).
 */
export type ArmyCorpsDirectiveRole = 'primary' | 'secondary' | 'economy' | 'contain';

export interface ArmyCorpsDirective {
    corps_id: string;
    role: ArmyCorpsDirectiveRole;
    /** True when this directive deviated from the raw political-verb baseline. */
    deviated: boolean;
}

export interface ArmyDirectiveInterpretation {
    compliance: ArmyComplianceCategory;
    /** Per-corps directives, sorted by corps_id ascending for determinism. */
    corps_directives: ArmyCorpsDirective[];
    /** Optional pushback event — only populated for non-FULL compliance. */
    event?: PendingOfficerEvent;
    /** Human-readable reason (always populated; empty string for FULL compliance). */
    reason: string;
    /** Raw compliance score in [0, 1] (debug + UI surfacing). */
    compliance_score: number;
}

export interface AutonomousLaunchProposal {
    /** True when the proposal fired this turn. */
    proposed: boolean;
    /** Catalog opportunity_id, or null when no proposal fired. */
    opportunity_id: string | null;
    /** PendingOfficerEvent — pushed onto state.military.pending_officer_events when proposed. */
    event?: PendingOfficerEvent;
    /** Player-safe reason when proposed (or empty when not). */
    reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Role ladder used for deviation calculations. Higher index = more aggressive
 * commitment. Mirrors the Phase 1 STANCE_RANKS pattern at the corps level
 * (defensive=0, balanced=1, offensive=2) but applied to FrontPriority['role'].
 */
const ROLE_LADDER: readonly ArmyCorpsDirectiveRole[] = ['contain', 'economy', 'secondary', 'primary'];

function roleRank(role: ArmyCorpsDirectiveRole): number {
    const idx = ROLE_LADDER.indexOf(role);
    return idx === -1 ? 1 : idx;
}

/**
 * Map a political directive verb to the "raw" baseline corps role for a corps.
 * Faction-symmetric: depends only on the verb + whether the corps is the
 * directive's named focus (target_corps_id).
 */
function rawRoleForVerb(verb: PoliticalDirectiveVerb, isTargetCorps: boolean): ArmyCorpsDirectiveRole {
    switch (verb) {
        case 'HOLD_AT_ALL_COSTS':
            return isTargetCorps ? 'primary' : 'economy';
        case 'PRESS_OFFENSIVE':
            return isTargetCorps ? 'primary' : 'secondary';
        case 'MAINTAIN_CORRIDOR':
            return isTargetCorps ? 'primary' : 'economy';
        case 'PREPARE_RESERVE':
            return isTargetCorps ? 'secondary' : 'economy';
        case 'HONOR_TRUCE':
            return 'contain';
        case 'BALANCE_FRONTS':
        default:
            return isTargetCorps ? 'secondary' : 'economy';
    }
}

/**
 * Derive the army CO's preferred posture from aggressiveness + stubbornness.
 * High-aggressiveness officers prefer offensive directives; cautious officers
 * prefer defensive directives.
 */
function preferredVerbForOfficer(data: NamedOfficer): PoliticalDirectiveVerb {
    if (data.aggressiveness >= 4) return 'PRESS_OFFENSIVE';
    if (data.aggressiveness <= 2) return 'HOLD_AT_ALL_COSTS';
    return 'BALANCE_FRONTS';
}

/**
 * Whether the directive verb aligns with the army CO's preferred posture.
 * Returns +1 (aligned), -1 (misaligned), 0 (neutral).
 */
function alignmentForVerb(verb: PoliticalDirectiveVerb, data: NamedOfficer): -1 | 0 | 1 {
    const preferred = preferredVerbForOfficer(data);
    if (verb === preferred) return 1;
    // Strong opposition: aggressive officer told to honor truce / reserve, or
    // cautious officer told to press offensive.
    if (preferred === 'PRESS_OFFENSIVE' && (verb === 'HONOR_TRUCE' || verb === 'PREPARE_RESERVE')) return -1;
    if (preferred === 'HOLD_AT_ALL_COSTS' && verb === 'PRESS_OFFENSIVE') return -1;
    return 0;
}

/**
 * Compute the compliance score in [0, 1].
 *
 * Formula (DDR-locked, mirrors corps Phase 1 baseline shape):
 *   base = (competence + (5 - stubbornness)) / 10
 *   + ALIGNMENT_BONUS    when verb aligns with stubbornness-driven preference
 *   - MISALIGNMENT_PENALTY when verb misaligns
 *   + reliability_modifier (placeholder; A3 leaves at 0.0)
 *
 * Inputs are pure functions of officer data + directive; same inputs → same
 * output (determinism).
 */
function computeArmyComplianceScore(
    data: NamedOfficer,
    verb: PoliticalDirectiveVerb,
): number {
    const stubbornness = typeof data.stubbornness === 'number' ? data.stubbornness : 3;
    const competence = typeof data.competence === 'number' ? data.competence : 3;
    const base = (competence + (5 - stubbornness)) / 10;

    const align = alignmentForVerb(verb, data);
    const alignmentDelta = align === 1 ? ALIGNMENT_BONUS : (align === -1 ? -MISALIGNMENT_PENALTY : 0);

    const raw = base + alignmentDelta + A3_RELIABILITY_PLACEHOLDER;
    return Math.max(0.0, Math.min(1.0, raw));
}

/**
 * Map score → compliance category (mirrors corps Phase 1 thresholds).
 */
function categoryForScore(score: number): ArmyComplianceCategory {
    if (score >= FULL_COMPLIANCE_THRESHOLD) return 'full';
    if (score >= MODIFIED_COMPLIANCE_THRESHOLD) return 'modified';
    if (score >= PARTIAL_COMPLIANCE_THRESHOLD) return 'partial';
    return 'refused';
}

/**
 * Compute deviation steps applied to the raw role given the compliance category.
 * - FULL:     0 (raw role)
 * - MODIFIED: ±1 toward officer preference (within MAX_DIRECTIVE_DEVIATION)
 * - PARTIAL:  ±1 toward officer preference (explicit pushback)
 * - REFUSED:  shift fully to officer's preferred role
 */
function deviationStepsForCategory(
    category: ArmyComplianceCategory,
    rawRoleRank: number,
    preferredRoleRank: number,
): number {
    if (category === 'full') return 0;
    const direction = preferredRoleRank > rawRoleRank ? 1 : (preferredRoleRank < rawRoleRank ? -1 : 0);
    if (direction === 0) return 0;
    if (category === 'modified') return direction * MAX_DIRECTIVE_DEVIATION;
    if (category === 'partial') return direction * MAX_DIRECTIVE_DEVIATION;
    // refused → shift all the way to preferred (clamped by ladder bounds at apply time)
    const fullShift = Math.abs(preferredRoleRank - rawRoleRank);
    return direction * fullShift;
}

/**
 * Officer's preferred role: cautious officers default to 'economy' (defensive
 * concentration), aggressive officers default to 'primary'.
 */
function preferredRoleForOfficer(data: NamedOfficer): ArmyCorpsDirectiveRole {
    if (data.aggressiveness >= 4) return 'primary';
    if (data.aggressiveness <= 2) return 'economy';
    return 'secondary';
}

/**
 * Build a player-safe reason string for the interpretation event.
 */
function buildArmyReason(
    officerName: string,
    verb: PoliticalDirectiveVerb,
    category: ArmyComplianceCategory,
): string {
    const display = officerName || 'The army commander';
    if (category === 'full') return '';
    if (category === 'modified') {
        return `${display} acknowledges the political directive but routes it through the staff's reading of conditions before passing to corps commanders.`;
    }
    if (category === 'partial') {
        return `${display} pushes back on the political directive — corps allocations will deviate from the literal reading.`;
    }
    return `${display} considers the political directive (${verb}) untenable; he asks for an override or to be relieved.`;
}

/**
 * Pure helper to read the stable list of corps_ids for a faction from
 * GameState in deterministic order. Iterates corps_command keys (the canonical
 * "active corps" set) and resolves faction via formations[corpsId].faction
 * (the same lookup pattern used by computeCorpsOperationReadiness).
 */
function listCorpsIdsForFaction(state: GameState, faction: FactionId): string[] {
    const corpsCommand = state.military.corps_command;
    const formations = state.military.formations;
    if (!corpsCommand) return [];
    const ids: string[] = [];
    const keys = Object.keys(corpsCommand).sort();
    for (const corpsId of keys) {
        const cmd = corpsCommand[corpsId];
        if (!cmd) continue;
        const corpsFaction = formations?.[corpsId]?.faction;
        if (corpsFaction === faction) ids.push(corpsId);
    }
    return ids;
}

/**
 * Append a decision-trace entry. A2 substrate; A3 owns writes.
 * Sorted by turn ascending for determinism (caller guarantees monotonic turn).
 */
function appendDecisionTrace(
    state: GameState,
    faction: FactionId,
    entry: { turn: number; campaign_role: string; rationale: string; raw_directive_id?: string },
): void {
    if (!state.military.army_co_decision_traces) {
        state.military.army_co_decision_traces = {};
    }
    if (!state.military.army_co_decision_traces[faction]) {
        state.military.army_co_decision_traces[faction] = [];
    }
    state.military.army_co_decision_traces[faction]!.push(entry);
}

function pushOfficerEvent(state: GameState, event: PendingOfficerEvent): void {
    if (!state.military.pending_officer_events) {
        state.military.pending_officer_events = [];
    }
    state.military.pending_officer_events.push(event);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public predicate 1: interpretArmyDirective
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Translate a POLITICAL directive into per-corps directives via the army CO's
 * advisory interpretation (DDR Q1, Q2). Mirrors the corps-level Phase 1 shape:
 * full / modified / partial / refused — deviation bounded by
 * MAX_DIRECTIVE_DEVIATION; pushback PendingOfficerEvent emitted on non-FULL
 * compliance; player retains override authority at ARMY_OVERRIDE_POLITICAL_CAPITAL_COST.
 *
 * Substrate-driven: when the army CO has no stubbornness/competence values
 * populated (pre-A4 roster data), defaults (3, 3) yield a baseline compliance
 * of 0.50 → MODIFIED for non-aligned verbs but 0.70 → MODIFIED for aligned, so
 * behavior surfaces only once A4 lands real values. (40w byte-stable
 * pre-A4 because no political directive is issued yet — pipeline step short-
 * circuits when verb is undefined.)
 */
export function interpretArmyDirective(
    state: GameState,
    faction: FactionId,
    directive: PoliticalDirective,
): ArmyDirectiveInterpretation {
    const commander = getArmyCommander(faction, state);
    const corpsIds = listCorpsIdsForFaction(state, faction);

    // No army commander (or no corps) → pass through as full compliance with
    // raw role mapping. Mirrors corps Phase 1's "no commander → full" path.
    if (!commander) {
        const corpsDirectives: ArmyCorpsDirective[] = corpsIds.map(corpsId => ({
            corps_id: corpsId,
            role: rawRoleForVerb(directive.verb, corpsId === directive.target_corps_id),
            deviated: false,
        }));
        return {
            compliance: 'full',
            corps_directives: corpsDirectives,
            reason: '',
            compliance_score: 1.0,
        };
    }

    const { data, state: officerState } = commander;

    // Acting commanders always comply (mirrors corps Phase 1).
    if (officerState.acting_commander) {
        const corpsDirectives: ArmyCorpsDirective[] = corpsIds.map(corpsId => ({
            corps_id: corpsId,
            role: rawRoleForVerb(directive.verb, corpsId === directive.target_corps_id),
            deviated: false,
        }));
        return {
            compliance: 'full',
            corps_directives: corpsDirectives,
            reason: '',
            compliance_score: 1.0,
        };
    }

    const score = computeArmyComplianceScore(data, directive.verb);
    const category = categoryForScore(score);
    const preferredRole = preferredRoleForOfficer(data);
    const preferredRank = roleRank(preferredRole);

    const corpsDirectives: ArmyCorpsDirective[] = corpsIds.map(corpsId => {
        const isTarget = corpsId === directive.target_corps_id;
        const rawRole = rawRoleForVerb(directive.verb, isTarget);
        const rawRank = roleRank(rawRole);
        const steps = deviationStepsForCategory(category, rawRank, preferredRank);
        const newRank = Math.max(0, Math.min(ROLE_LADDER.length - 1, rawRank + steps));
        const finalRole = ROLE_LADDER[newRank]!;
        return {
            corps_id: corpsId,
            role: finalRole,
            deviated: finalRole !== rawRole,
        };
    });

    const reason = buildArmyReason(data.name, directive.verb, category);

    // Decision trace — every interpretation gets a trace entry.
    appendDecisionTrace(state, faction, {
        turn: state.meta.turn,
        campaign_role: directive.verb,
        rationale: reason || `${data.name} executes ${directive.verb} as issued.`,
        raw_directive_id: directive.directive_id,
    });

    if (category === 'full') {
        return {
            compliance: 'full',
            corps_directives: corpsDirectives,
            reason,
            compliance_score: score,
        };
    }

    // Build pushback event for non-FULL compliance (DDR Q2 advisory shape).
    const original: OrderSnapshot = {
        order_type: 'political_directive',
        corps_id: directive.target_corps_id ?? '',
        directive_verb: directive.verb,
    };
    const interpreted: OrderSnapshot = {
        order_type: 'political_directive',
        corps_id: directive.target_corps_id ?? '',
        directive_verb: directive.verb,
        objectives: corpsDirectives
            .filter(cd => cd.deviated)
            .map(cd => `${cd.corps_id}:${cd.role}`),
    };

    const event: PendingOfficerEvent = {
        event_id: `army:${faction}:directive:${state.meta.turn}`,
        type: 'army_directive_pushback',
        faction,
        turn: state.meta.turn,
        officer_id: data.id,
        acknowledged: false,
        original_order: original,
        interpreted_order: interpreted,
        reason,
        overridable: true,
        override_action: 'override-army-directive',
    };
    pushOfficerEvent(state, event);

    return {
        compliance: category,
        corps_directives: corpsDirectives,
        event,
        reason,
        compliance_score: score,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Public predicate 2: proposeAutonomousArmyLaunch
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mladić-class autonomous-launch proposal (DDR Q3).
 *
 * When ALL of:
 *   • the army CO has stubbornness ≥ STUBBORNNESS_AUTONOMOUS_THRESHOLD
 *   • last_autonomous_launch_turn is undefined OR
 *     state.meta.turn − last_autonomous_launch_turn ≥ AUTONOMOUS_LAUNCH_COOLDOWN_TURNS
 *   • at least one OperationOpportunityDef in the catalog matches the army CO's
 *     faction AND is currently eligible (all required axes green)
 * then the army CO emits an `army_co_proposes_op` PendingOfficerEvent with a
 * 1-turn override window (the political leader / player can relieve or override
 * before the op enters preparation).
 *
 * The actual operation creation entry happens NEXT TURN if the proposal is not
 * overridden. A3 only emits the proposal; A5 / IPC handler consumes it.
 *
 * NOTE: A3 does NOT mutate last_autonomous_launch_turn here — that mutation
 * occurs at the moment the un-overridden proposal converts into a real op
 * (downstream lane). Emitting a proposal is not yet a launch.
 */
export function proposeAutonomousArmyLaunch(
    state: GameState,
    faction: FactionId,
): AutonomousLaunchProposal {
    const commander = getArmyCommander(faction, state);
    const empty: AutonomousLaunchProposal = { proposed: false, opportunity_id: null, reason: '' };

    if (!commander) return empty;

    const { data, state: officerState } = commander;

    // Acting commanders never autonomously launch.
    if (officerState.acting_commander) return empty;

    const stubbornness = typeof data.stubbornness === 'number' ? data.stubbornness : 0;
    if (stubbornness < STUBBORNNESS_AUTONOMOUS_THRESHOLD) return empty;

    // Cooldown enforcement
    const lastLaunch = officerState.last_autonomous_launch_turn;
    if (typeof lastLaunch === 'number') {
        const elapsed = state.meta.turn - lastLaunch;
        if (elapsed < AUTONOMOUS_LAUNCH_COOLDOWN_TURNS) return empty;
    }

    // Find the first eligible catalog entry for this faction (deterministic
    // order: catalog is sorted by opportunity_id).
    const candidates: OperationOpportunityDef[] = OPERATION_OPPORTUNITY_CATALOG
        .filter(def => def.faction === faction)
        .slice()
        .sort((a, b) => a.opportunity_id.localeCompare(b.opportunity_id));

    let chosen: OperationOpportunityDef | null = null;
    for (const def of candidates) {
        const axes = evaluateAxes(state, state.meta.turn, def);
        if (isOpportunityEligible(def, axes)) {
            chosen = def;
            break;
        }
    }
    if (!chosen) return empty;

    const reason =
        `${data.name} has decided to launch ${chosen.name} on his own authority. ` +
        `The political leader has one turn to override or relieve before preparation begins.`;

    const proposalId = buildProposalId(chosen.opportunity_id, state.meta.turn);

    const interpreted: OrderSnapshot = {
        order_type: 'army_co_proposed_op',
        corps_id: chosen.primary_corps,
        operation_name: chosen.name,
        opportunity_id: chosen.opportunity_id,
    };

    const event: PendingOfficerEvent = {
        event_id: `army:${faction}:autonomous_launch:${proposalId}:${state.meta.turn}`,
        type: 'army_co_proposes_op',
        faction,
        turn: state.meta.turn,
        officer_id: data.id,
        corps_id: chosen.primary_corps,
        acknowledged: false,
        interpreted_order: interpreted,
        reason,
        overridable: true,
        override_action: 'override-army-autonomous-launch',
    };
    pushOfficerEvent(state, event);

    appendDecisionTrace(state, faction, {
        turn: state.meta.turn,
        campaign_role: 'AUTONOMOUS_LAUNCH_PROPOSAL',
        rationale: reason,
        raw_directive_id: chosen.opportunity_id,
    });

    return {
        proposed: true,
        opportunity_id: chosen.opportunity_id,
        event,
        reason,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline entry — invoked from war_phases.ts (A3 step)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read the soft-state political directive for a faction from
 * `state.military.political_directives_by_faction` (consumed defensively;
 * the state slot may be undefined pre-A5). Returns null when no directive
 * is present — pipeline step short-circuits in that case (byte-stable
 * 40w pre-A4-roster-data per DDR substrate-driven design).
 */
function readPoliticalDirective(state: GameState, faction: FactionId): PoliticalDirective | null {
    type LooseMilitary = GameState['military'] & {
        political_directives_by_faction?: Record<string, PoliticalDirective | undefined>;
    };
    const mil = state.military as LooseMilitary;
    const slot = mil.political_directives_by_faction?.[faction];
    if (!slot) return null;
    return slot;
}

/**
 * C1 (LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE) — persist
 * the per-corps directive map produced by `interpretArmyDirective` into
 * `state.military.army_corps_directives_by_faction[faction]` so the
 * commander briefing can overlay `frontPriority.role` → `campaign_role`.
 *
 * Env flag `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` short-circuits
 * the persist path (mirrors briefing.ts read-path short-circuit) for
 * byte-stable A/B verification per DDR (57cec91c).
 *
 * Lazy slot init — when no directives are persisted (env flag set, or no
 * faction produced one) the slot remains undefined, preserving pre-C1
 * save byte-stability.
 *
 * Faction-symmetric: same code path for RBiH / RS / HRHB.
 */
function persistCorpsDirectives(
    state: GameState,
    faction: FactionId,
    interpretation: ArmyDirectiveInterpretation,
): void {
    if (process.env.C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED === 'true') return;
    if (!interpretation.corps_directives.length) return;

    type LooseMilitary = GameState['military'] & {
        army_corps_directives_by_faction?: Record<string, Record<string, ArmyCorpsDirective>>;
    };
    const mil = state.military as LooseMilitary;
    if (!mil.army_corps_directives_by_faction) {
        mil.army_corps_directives_by_faction = {};
    }
    const factionMap: Record<string, ArmyCorpsDirective> = {};
    // Iterate in deterministic order (interpretation already sorts; double-guard).
    const sorted = [...interpretation.corps_directives].sort((a, b) =>
        a.corps_id < b.corps_id ? -1 : (a.corps_id > b.corps_id ? 1 : 0),
    );
    for (const cd of sorted) {
        factionMap[cd.corps_id] = {
            corps_id: cd.corps_id,
            role: cd.role,
            deviated: cd.deviated,
        };
    }
    mil.army_corps_directives_by_faction[faction] = factionMap;
}

/**
 * C2 (LANE-NIGHTSHIFT-C2-CORPS-DIRECTIVE-TELEMETRY-SURFACE) — record each
 * persisted directive application into the side-channel telemetry buffer.
 *
 * Caller invokes this AFTER `persistCorpsDirectives` returns — only when
 * the C1 consumer flag is OFF AND the persist slot for this faction was
 * actually written. (We detect persistence by inspecting the slot post-call:
 * when the C1 flag is set, persist short-circuits and the slot is absent for
 * this faction → no telemetry recorded → T5 transitive silence holds.)
 *
 * Explicit T4 contract: `recordC2Application` is itself a no-op when the C2
 * flag is set, so the side-channel JSONL is not written.
 *
 * State-free: only mutates the module-local `_activeTurnBuffer`. C1's
 * `persistCorpsDirectives` signature is preserved (frozen at C1 5084071d
 * per DDR Q5 split — see closeout report).
 */
function recordC2ApplicationsForFaction(
    state: GameState,
    faction: FactionId,
    interpretation: ArmyDirectiveInterpretation,
    directive: PoliticalDirective,
): void {
    if (isC2TelemetryDisabled()) return;
    // Detect actual persist (C1 flag may have suppressed it).
    type LooseMilitary = GameState['military'] & {
        army_corps_directives_by_faction?: Record<string, Record<string, ArmyCorpsDirective>>;
    };
    const factionSlot = (state.military as LooseMilitary).army_corps_directives_by_faction?.[faction];
    if (!factionSlot) return;
    // Iterate in the same deterministic order as persistCorpsDirectives.
    const sorted = [...interpretation.corps_directives].sort((a, b) =>
        a.corps_id < b.corps_id ? -1 : (a.corps_id > b.corps_id ? 1 : 0),
    );
    for (const cd of sorted) {
        // Defensive: only record applications that were actually persisted.
        if (!factionSlot[cd.corps_id]) continue;
        recordC2Application(
            faction,
            cd.corps_id,
            directive.verb,
            cd.role,
            directive.directive_id ?? null,
            state.meta.turn,
        );
    }
}

/**
 * Single pipeline-step entry: for each (non-player) faction, run the A3
 * predicates and emit traces / events. Faction-symmetric: no per-faction
 * branches.
 *
 * Caller (war_phases.ts) gates by phase==='war' and orders this step AFTER
 * `evaluate-army-hq-gathering` and BEFORE `generate-bot-corps-orders`.
 *
 * C1 (LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE): when an interpretation
 * is produced, persist its corps_directives[] into
 * `state.military.army_corps_directives_by_faction[faction]` so the briefing
 * overlay path can read it. Persist short-circuits when env flag
 * `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` is set.
 *
 * C2 (LANE-NIGHTSHIFT-C2-CORPS-DIRECTIVE-TELEMETRY-SURFACE): opens a per-turn
 * telemetry buffer at top, persistCorpsDirectives records per-corps
 * applications into it, then flushes the buffer at end of turn to the
 * side-channel JSONL `data/derived/_debug/c_lane_corps_directive_telemetry.jsonl`.
 * Both buffer-open and flush short-circuit when env flag
 * `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true` is set, leaving the JSONL
 * file byte-identical (and weekly_report.jsonl + final_state_hash also
 * byte-identical, since C2 never mutates state and never touches
 * weekly_report.jsonl).
 */
export function applyArmyDirectiveInterpretation(state: GameState): void {
    const factions: FactionId[] = ['HRHB', 'RBiH', 'RS']; // sorted alphabetically — determinism

    // C2 — open the per-turn telemetry buffer. No-op when the C2 flag is set
    // (recordC2Application & flushC2TurnTelemetry both early-return). When
    // the C1 flag is set, persistCorpsDirectives early-returns BEFORE
    // recording anything, so the buffer stays empty and flush is a no-op.
    if (!isC2TelemetryDisabled()) {
        _activeTurnBuffer = _newTurnBuffer(state.meta.turn);
    }

    for (const faction of factions) {
        const directive = readPoliticalDirective(state, faction);
        if (directive) {
            const interpretation = interpretArmyDirective(state, faction, directive);
            persistCorpsDirectives(state, faction, interpretation);
            // C2 — record telemetry AFTER persist. Helper short-circuits when
            // either the C2 flag is set OR C1's persist short-circuited (i.e.
            // the C1 flag was set, leaving the slot absent for this faction).
            // Singular ownership: C1's persistCorpsDirectives is unchanged
            // (frozen at 5084071d); C2 owns recordC2ApplicationsForFaction.
            recordC2ApplicationsForFaction(state, faction, interpretation, directive);
        }
        // Autonomous-launch evaluation is independent of the political directive
        // (it is the army CO's volitional act). Always evaluate; the function
        // short-circuits when stubbornness / cooldown gate fails, so pre-A4
        // populated rosters yield zero behavior change.
        proposeAutonomousArmyLaunch(state, faction);
    }

    // C2 — flush the per-turn telemetry buffer to the side-channel JSONL.
    // Determinism: emission order is (faction-alphabetical, then corps-id
    // alphabetical) for `army_directive_application` events; `corps_role_
    // overlay_count` events follow in faction-alphabetical order; the
    // single `political_directive_chain_active` event closes the turn.
    flushC2TurnTelemetry();
}

// Validator-friendly named export for the A3 pipeline step name. The pipeline
// definition file (war_phases.ts) imports this constant so the step name has
// a single canonical owner (test T12 static-grep guards this).
export const A3_PIPELINE_STEP_NAME = 'apply-army-directive-interpretation';
