/**
 * ArmyCoPushbackPanel — A5 Army HQ pushback surface (read-only).
 *
 * Lane: LANE-NIGHTSHIFT-A5-ARMY-HQ-PUSHBACK-UI
 * DDR (authoritative): docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md (eee308e0)
 * Predecessors:
 *   A1 closeout: docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md (18136710)
 *   A2 closeout: docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md (ba6955bf)
 *   A3 closeout: docs/40_reports/implemented/20260506_A3_ARMY_LEVEL_ORDER_INTERPRETATION.md (c8ff93d8)
 *   A4 closeout: docs/40_reports/implemented/20260506_A4_ARMY_CO_ROSTER_PERSONALITIES.md (93c75b1d)
 *
 * Surface design (DDR Q3 + Q4 binding decisions):
 *   1. Mladić-class autonomous-launch warnings (most urgent — shown FIRST)
 *      - Officers with stubbornness >= STUBBORNNESS_AUTONOMOUS_THRESHOLD AND
 *        a recent autonomous-launch event OR an active `army_co_proposes_op`
 *        pending officer event surface here. Override cost is the A3 constant.
 *
 *   2. Current-turn army CO objections (army_directive_pushback events)
 *      - Surfaced from pendingOfficerEvents typed `army_directive_pushback`,
 *        rendering officer name + stubbornness + the pushback rationale.
 *
 *   3. Recent override history (least urgent — informational badge)
 *      - Per political leader: count of recent_overrides over last 12 turns.
 *      - If >= 3 → "AT RELIEF THRESHOLD" badge per DDR auto-relief rule.
 *
 * Conditional render: when no objections AND no warnings AND no override
 * history, the panel renders NOTHING (returns null) — keeping the shell
 * clean per brief.
 *
 * No engine surface change. No store mutation. No IPC. Pure read-only display.
 *
 * Faction-symmetric: same render path for RBiH / RS / HRHB officers.
 * Determinism: no Math.random / Date.now / new Date / locale-sort. Sorted
 * iteration via Object.keys(...).sort() and stable numeric ordering.
 */
import { useMemo } from 'react';
import {
    STUBBORNNESS_AUTONOMOUS_THRESHOLD,
    AUTONOMOUS_LAUNCH_COOLDOWN_TURNS,
    ARMY_OVERRIDE_POLITICAL_CAPITAL_COST,
} from '../../sim/combat/army_order_interpretation';
import { turnToDateString } from '../map/utils/formatters';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Decision-trace entry shape (mirrors MilitaryState.army_co_decision_traces[*]
 * value-array element type from src/state/game_state.ts). Rationale strings
 * containing "PARTIAL", "REFUSED", or "pushback" are treated as objections.
 */
export interface ArmyCoDecisionTraceInput {
    turn: number;
    campaign_role: string;
    rationale: string;
    raw_directive_id?: string;
}

/** Subset of NamedOfficer + NamedOfficerState A5 needs (read-only). */
export interface ArmyCoOfficerInput {
    id: string;
    name: string;
    faction: string;
    rank: string;
    /** A2 substrate (DDR Q3). Undefined treated as 0 (does not gate autonomous-launch). */
    stubbornness?: number;
    /** A2 substrate (DDR Q4). Political-leader tolerance (1-5). */
    override_tolerance?: number;
    /** A2 substrate (DDR Q3). Most recent autonomous-launch turn for this CO. */
    last_autonomous_launch_turn?: number;
    /** A2 substrate (DDR Q4). 12-turn rolling override window. */
    recent_overrides?: Array<{ turn: number; resolution: 'accept' | 'override' | 'relieve' }>;
}

/** Pending officer event subset A5 reads. */
export interface ArmyCoPendingEventInput {
    event_id: string;
    type: string;
    faction: string;
    turn: number;
    officer_id: string;
    officer_name?: string;
    reason?: string;
    overridable?: boolean;
}

export interface ArmyCoPushbackPanelProps {
    /** Current simulation turn (for cooldown / override-window math). */
    currentTurn: number;
    /** Officer roster snapshot (substrate fields). */
    officers: ArmyCoOfficerInput[];
    /** Pending officer events from the current state. */
    pendingOfficerEvents?: ArmyCoPendingEventInput[];
    /** Per-faction decision traces (A3 writes; A5 reads last entry). */
    decisionTraces?: Record<string, ArmyCoDecisionTraceInput[]>;
    /** Optional: the active player faction (used only to label the panel). */
    playerFaction?: string | null;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/**
 * "Recent autonomous launch" window. Per DDR: a launch fired this turn or
 * within the last turn (1-turn-advance warning shape). The cooldown constant
 * is *separately* used to characterize the override window's urgency.
 */
const RECENT_AUTONOMOUS_LAUNCH_WINDOW = 1;

/** Override-history relief threshold (DDR Q4 auto-relief rule). */
const OVERRIDE_RELIEF_THRESHOLD = 3;

/** Override-history rolling window (turns). */
const OVERRIDE_HISTORY_WINDOW = 12;

const COMMANDER_RECORD_UNREPORTED = 'Commander record unreported';

function displayOfficerName(...candidates: Array<string | null | undefined>): string {
    for (const candidate of candidates) {
        const trimmed = candidate?.trim();
        if (trimmed) return trimmed;
    }
    return COMMANDER_RECORD_UNREPORTED;
}

function isObjectionRationale(rationale: string | undefined): boolean {
    if (!rationale) return false;
    const r = rationale.toLowerCase();
    // Mirror compliance-band wording from A3 (army_order_interpretation.ts
    // buildArmyReason: "pushes back", "untenable", "asks for an override").
    return (
        r.includes('pushes back') ||
        r.includes('untenable') ||
        r.includes('asks for an override') ||
        r.includes('partial') ||
        r.includes('refused')
    );
}

/**
 * Active Mladić-class warnings, sorted by faction asc + officer id asc for
 * deterministic ordering.
 */
interface MladicWarning {
    officerId: string;
    officerName: string;
    faction: string;
    stubbornness: number;
    /**
     * Source of the warning:
     * - 'pending_event': an active `army_co_proposes_op` pending event
     * - 'recent_launch': last_autonomous_launch_turn within RECENT window
     */
    source: 'pending_event' | 'recent_launch';
    /** Optional turn for source-attribution display. */
    sourceTurn?: number;
}

function selectMladicWarnings(props: ArmyCoPushbackPanelProps): MladicWarning[] {
    const warnings: MladicWarning[] = [];
    const officersByID = new Map<string, ArmyCoOfficerInput>();
    for (const o of props.officers) officersByID.set(o.id, o);

    // Pass 1: pending `army_co_proposes_op` events (most authoritative).
    const events = props.pendingOfficerEvents ?? [];
    for (const ev of events) {
        if (ev.type !== 'army_co_proposes_op') continue;
        const officer = officersByID.get(ev.officer_id);
        const stubbornness = typeof officer?.stubbornness === 'number' ? officer.stubbornness : 0;
        if (stubbornness < STUBBORNNESS_AUTONOMOUS_THRESHOLD) continue;
        warnings.push({
            officerId: ev.officer_id,
            officerName: displayOfficerName(officer?.name, ev.officer_name),
            faction: officer?.faction ?? ev.faction,
            stubbornness,
            source: 'pending_event',
            sourceTurn: ev.turn,
        });
    }

    // Pass 2: officers whose last_autonomous_launch_turn is within the recent
    // window AND stubbornness is at threshold. Skip when an event-source
    // warning is already present for the same officer (avoid duplicates).
    const seen = new Set(warnings.map((w) => w.officerId));
    const sortedOfficerIds = props.officers.map((o) => o.id).sort();
    for (const officerId of sortedOfficerIds) {
        if (seen.has(officerId)) continue;
        const officer = officersByID.get(officerId);
        if (!officer) continue;
        const stubbornness = typeof officer.stubbornness === 'number' ? officer.stubbornness : 0;
        if (stubbornness < STUBBORNNESS_AUTONOMOUS_THRESHOLD) continue;
        const last = officer.last_autonomous_launch_turn;
        if (typeof last !== 'number') continue;
        const elapsed = props.currentTurn - last;
        if (elapsed < 0 || elapsed > RECENT_AUTONOMOUS_LAUNCH_WINDOW) continue;
        warnings.push({
            officerId,
            officerName: officer.name,
            faction: officer.faction,
            stubbornness,
            source: 'recent_launch',
            sourceTurn: last,
        });
    }

    // Deterministic order: faction asc, then officer_id asc.
    warnings.sort((a, b) => {
        if (a.faction !== b.faction) return a.faction < b.faction ? -1 : 1;
        return a.officerId < b.officerId ? -1 : 1;
    });
    return warnings;
}

interface ArmyObjection {
    faction: string;
    officerName: string;
    campaignRole: string;
    rationale: string;
    turn: number;
    /** Officer id when resolvable from pending events (decision-trace lacks officer_id). */
    officerId?: string;
}

function selectArmyObjections(props: ArmyCoPushbackPanelProps): ArmyObjection[] {
    const objections: ArmyObjection[] = [];

    // Source 1: per-faction last decision-trace entry whose rationale flags
    // pushback (PARTIAL / REFUSED). Iterates faction keys in sorted order
    // for determinism.
    const traces = props.decisionTraces ?? {};
    const factionKeys = Object.keys(traces).sort();
    for (const faction of factionKeys) {
        const arr = traces[faction];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        const last = arr[arr.length - 1];
        if (!last || !isObjectionRationale(last.rationale)) continue;
        // Resolve officer name from the army CO of the faction (best-effort).
        const armyCO = props.officers.find(
            (o) => o.faction === faction && o.rank === 'army_commander',
        );
        objections.push({
            faction,
            officerName: displayOfficerName(armyCO?.name, 'Army staff'),
            campaignRole: last.campaign_role,
            rationale: last.rationale,
            turn: last.turn,
            officerId: armyCO?.id,
        });
    }

    // Source 2: pending `army_directive_pushback` events (current turn). Adds
    // entries when the event is for a faction not already covered by a trace.
    const seenFactions = new Set(objections.map((o) => o.faction));
    const events = props.pendingOfficerEvents ?? [];
    const sortedEvents = [...events].sort((a, b) => {
        if (a.faction !== b.faction) return a.faction < b.faction ? -1 : 1;
        if (a.turn !== b.turn) return a.turn - b.turn;
        return a.event_id < b.event_id ? -1 : 1;
    });
    for (const ev of sortedEvents) {
        if (ev.type !== 'army_directive_pushback') continue;
        if (seenFactions.has(ev.faction)) continue;
        const officer = props.officers.find((o) => o.id === ev.officer_id);
        objections.push({
            faction: ev.faction,
            officerName: displayOfficerName(officer?.name, ev.officer_name, 'Army staff'),
            campaignRole: '(directive)',
            rationale: ev.reason ?? 'Army CO objected to political directive.',
            turn: ev.turn,
            officerId: ev.officer_id,
        });
        seenFactions.add(ev.faction);
    }

    return objections;
}

interface OverrideHistoryRow {
    officerId: string;
    officerName: string;
    faction: string;
    count: number;
    atReliefThreshold: boolean;
}

function selectOverrideHistory(props: ArmyCoPushbackPanelProps): OverrideHistoryRow[] {
    const rows: OverrideHistoryRow[] = [];
    const sortedOfficerIds = props.officers.map((o) => o.id).sort();
    for (const officerId of sortedOfficerIds) {
        const officer = props.officers.find((o) => o.id === officerId);
        if (!officer) continue;
        // Only political leaders carry override_tolerance (per A2 substrate
        // semantics). We treat presence of override_tolerance as the marker
        // that this officer is the political leader for that faction.
        const overrides = officer.recent_overrides ?? [];
        if (overrides.length === 0) continue;
        const inWindow = overrides.filter(
            (e) => e.turn >= props.currentTurn - OVERRIDE_HISTORY_WINDOW && e.turn <= props.currentTurn,
        );
        if (inWindow.length === 0) continue;
        rows.push({
            officerId,
            officerName: officer.name,
            faction: officer.faction,
            count: inWindow.length,
            atReliefThreshold: inWindow.length >= OVERRIDE_RELIEF_THRESHOLD,
        });
    }
    rows.sort((a, b) => {
        if (a.faction !== b.faction) return a.faction < b.faction ? -1 : 1;
        return a.officerId < b.officerId ? -1 : 1;
    });
    return rows;
}

function commandCycleLabel(count: number): string {
    return count === 1 ? '1 command cycle' : `${count} command cycles`;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Visible ARIA labels. Stable for snapshot tests + accessibility audits.
 */
const SECTION_LABELS = {
    warnings: 'Mladić-class autonomous-launch warnings',
    objections: 'Army commander objections',
    overrides: 'Override history',
} as const;

export function ArmyCoPushbackPanel(props: ArmyCoPushbackPanelProps): JSX.Element | null {
    const warnings = useMemo(() => selectMladicWarnings(props), [props]);
    const objections = useMemo(() => selectArmyObjections(props), [props]);
    const overrideRows = useMemo(() => selectOverrideHistory(props), [props]);

    // Conditional render: nothing to surface → return null (keep shell clean).
    if (warnings.length === 0 && objections.length === 0 && overrideRows.length === 0) {
        return null;
    }

    return (
        <section
            data-testid="army-co-pushback-panel"
            aria-label="Army HQ pushback"
            className="space-y-2 border border-neutral-300 bg-neutral-50 px-3 py-2"
        >
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                Army HQ Pushback
            </div>

            {/* Section 1 — Mladić-class warnings (most urgent, first) */}
            {warnings.length > 0 && (
                <details
                    data-testid="army-co-pushback-warnings"
                    aria-label={SECTION_LABELS.warnings}
                    open
                    className="border border-red-400 bg-red-50 px-2 py-1.5"
                >
                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
                        Autonomous-launch warning ({warnings.length})
                    </summary>
                    <ul className="mt-1.5 space-y-1.5">
                        {warnings.map((w) => (
                            <li
                                key={`warning:${w.officerId}`}
                                data-testid={`army-co-pushback-warning-${w.officerId}`}
                                className="border border-red-300 bg-white px-2 py-1"
                            >
                                <div className="text-[11px] font-bold text-red-800">
                                    WARNING: {w.officerName} ({w.faction}) is preparing an autonomous operation despite political directive.
                                </div>
                                <div className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-red-600">
                                    Stubbornness {w.stubbornness} / threshold {STUBBORNNESS_AUTONOMOUS_THRESHOLD}
                                    {' · '}Override cost: {ARMY_OVERRIDE_POLITICAL_CAPITAL_COST} command authority
                                    {' · '}Review pause {commandCycleLabel(AUTONOMOUS_LAUNCH_COOLDOWN_TURNS)}
                                </div>
                                {typeof w.sourceTurn === 'number' && (
                                    <div className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-neutral-500">
                                        Source: {w.source === 'pending_event' ? 'proposal date' : 'last launch'} {turnToDateString(w.sourceTurn)}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {/* Section 2 — Current-turn army CO objections */}
            {objections.length > 0 && (
                <details
                    data-testid="army-co-pushback-objections"
                    aria-label={SECTION_LABELS.objections}
                    open
                    className="border border-amber-400 bg-amber-50 px-2 py-1.5"
                >
                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                        Army CO objections ({objections.length})
                    </summary>
                    <ul className="mt-1.5 space-y-1.5">
                        {objections.map((o, idx) => (
                            <li
                                key={`obj:${o.faction}:${idx}`}
                                data-testid={`army-co-pushback-objection-${o.faction}`}
                                className="border border-amber-300 bg-white px-2 py-1"
                            >
                                <div className="text-[11px] font-bold text-amber-900">
                                    {o.faction} Main Staff ({o.officerName}): pushed back on directive — {o.campaignRole}.
                                </div>
                                <div className="mt-0.5 line-clamp-3 text-[10px] leading-snug text-amber-800">
                                    {o.rationale}
                                </div>
                                <div className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-amber-600">
                                    {turnToDateString(o.turn)}
                                </div>
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {/* Section 3 — Recent override history (informational) */}
            {overrideRows.length > 0 && (
                <details
                    data-testid="army-co-pushback-overrides"
                    aria-label={SECTION_LABELS.overrides}
                    className="border border-neutral-300 bg-white px-2 py-1.5"
                >
                    <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-700">
                        Override history ({overrideRows.length})
                    </summary>
                    <ul className="mt-1.5 space-y-1">
                        {overrideRows.map((row) => (
                            <li
                                key={`ovr:${row.officerId}`}
                                data-testid={`army-co-pushback-override-${row.officerId}`}
                                className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-2 py-1"
                            >
                                <span className="text-[11px] text-neutral-800">
                                    {row.officerName} ({row.faction})
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[10px] tabular-nums text-neutral-600">
                                        {row.count} / last {commandCycleLabel(OVERRIDE_HISTORY_WINDOW)}
                                    </span>
                                    {row.atReliefThreshold && (
                                        <span
                                            data-testid={`army-co-pushback-relief-${row.officerId}`}
                                            className="border border-red-500 bg-red-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-red-700"
                                        >
                                            At relief threshold
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}

export default ArmyCoPushbackPanel;
