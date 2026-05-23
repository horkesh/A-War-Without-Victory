/**
 * Verdict Screen — canonical endgame presentation surface.
 *
 * Owner split (do not collapse):
 * - TERMINATION: war_termination.ts (how the war ends)
 * - JUDGMENT: scoring.ts → GameVerdict (how the outcome is assessed)
 * - COMPARISON: cost_ledger.ts + endgame_comparison.ts (player war vs history)
 * - PRESENTATION: this file (display only — no truth derivation)
 *
 * Flow: War header → Faction tabs (with outcome badge) → Faction detail →
 *       War Reckoning (cost ledger + historical comparison) → Footer
 *
 * "The least bad version of a tragedy."
 */
import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import type { FactionVerdict, DimensionGrade } from '../../../state/negotiation_types.js';
import { WarCostSummary } from './WarCostSummary';
import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult, MilestoneComparison, MilestoneComparisonStatus } from '../../../sim/endgame/endgame_comparison.js';
// LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE: read-only consumption of ghost-entry
// path-not-taken records for the Codex tab. Builder is pure/deterministic
// and refuses §6 sensitive-history flags via its own Ring guard.
import { buildGhostEntries, type BuiltGhostEntry } from '../../../sim/codex/dynamic_section_builder.js';
// LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER: read-only turn scrubber for the
// Replay tab. Renders only when gameOver === true AND a save sequence has
// been plumbed into the loaded adapter. Consumes byte-identical save
// round-trip; does NOT advance turns or mutate engine state.
import { ReplayScrubber } from './replay/index.js';
import { Z } from '../../shared/zIndex.js';
import { CinematicVerdict } from './verdict/CinematicVerdict.js';
import { t, useLocale, type MessageKey } from '../i18n';

// ═══════════════════════════════════════════════════════════════════════════
// Outcome Class & Condemnation Helpers (exported for testing)
// ═══════════════════════════════════════════════════════════════════════════

export function formatOutcomeClass(oc: string | undefined): string {
    const labels: Record<string, string> = {
        strategic_success: 'Strategic Success',
        survival: 'Survival',
        negotiated_escape: 'Negotiated Escape',
        pyrrhic_success: 'Pyrrhic Success',
        hollow_victory: 'Hollow Victory',
        failure: 'Failure',
        collapse: 'Collapse',
    };
    return labels[oc ?? ''] ?? 'Unknown';
}

export function getOutcomeClassStyle(oc: string | undefined): string {
    const styles: Record<string, string> = {
        strategic_success: 'bg-green-900/40 text-green-400 border border-green-500/30',
        survival: 'bg-green-900/30 text-green-300 border border-green-500/20',
        negotiated_escape: 'bg-blue-900/30 text-blue-300 border border-blue-500/20',
        pyrrhic_success: 'bg-amber-900/30 text-amber-300 border border-amber-500/20',
        hollow_victory: 'bg-orange-900/30 text-orange-300 border border-orange-500/20',
        failure: 'bg-red-900/30 text-red-300 border border-red-500/20',
        collapse: 'bg-red-900/40 text-red-400 border border-red-500/30',
    };
    return styles[oc ?? ''] ?? 'bg-panel-card text-text-secondary border border-panel-border';
}

export function formatCondemnationFlag(flag: string): string {
    const labels: Record<string, string> = {
        genocide_condemnation: 'Condemned for genocide \u2014 international tribunal proceedings inevitable',
        civilian_atrocities: 'Condemned for systematic atrocities against civilian population',
    };
    return labels[flag] ?? flag.replace(/_/g, ' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// Endgame summary composition (pure, testable — no React)
// ═══════════════════════════════════════════════════════════════════════════

/** War-level summary built from adapted endgame state. Pure, deterministic. */
export interface EndgameSummary {
    /** Per-faction outcome + grade + condemnation for tab display. */
    factionSummaries: Array<{
        faction: string;
        outcomeClass: string;
        outcomeLabel: string;
        outcomeStyle: string;
        grade: string;
        score: number;
        condemnationNotices: string[];
    }>;
    /** True if any faction has condemnation flags. */
    hasCondemnation: boolean;
    /** Total military killed across all factions (from cost ledger). */
    totalMilitaryKilled: number;
    /** Total civilian killed across all factions (from cost ledger). */
    totalCivilianKilled: number;
}

/**
 * Build the canonical endgame summary from verdict + cost ledger data.
 * Exported for testing — pure function, no React, no side effects.
 * Deterministic: factions sorted in canonical order.
 */
export function buildEndgameSummary(
    verdict: import('../../../state/negotiation_types.js').GameVerdict | undefined,
    costLedger: import('../../../sim/endgame/cost_ledger.js').CostLedger | undefined,
): EndgameSummary {
    const CANONICAL_ORDER = ['RBiH', 'RS', 'HRHB'];
    const factionSummaries: EndgameSummary['factionSummaries'] = [];
    let hasCondemnation = false;

    for (const faction of CANONICAL_ORDER) {
        const fv = verdict?.faction_verdicts?.[faction];
        const condemnationFlags = fv?.condemnation_flags ?? [];
        const condemnationNotices = condemnationFlags.map(formatCondemnationFlag);
        if (condemnationFlags.length > 0) hasCondemnation = true;

        factionSummaries.push({
            faction,
            outcomeClass: fv?.outcome_class ?? 'collapse',
            outcomeLabel: formatOutcomeClass(fv?.outcome_class),
            outcomeStyle: getOutcomeClassStyle(fv?.outcome_class),
            grade: fv?.grade ?? 'F',
            score: fv?.pyrrhic_score ?? 0,
            condemnationNotices,
        });
    }

    return {
        factionSummaries,
        hasCondemnation,
        totalMilitaryKilled: costLedger?.total_military_killed ?? 0,
        totalCivilianKilled: costLedger?.total_civilian_killed ?? 0,
    };
}

export interface EndgameMilestoneRow {
    id: string;
    label: string;
    historicalWeekLabel: string;
    playerWeekLabel: string;
    deltaLabel: string;
    status: MilestoneComparisonStatus;
    statusLabel: string;
    summary: string;
}

function compareMilestones(a: MilestoneComparison, b: MilestoneComparison): number {
    const weekDelta = a.historical_week - b.historical_week;
    if (weekDelta !== 0) return weekDelta;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function statusFromDelta(deltaWeeks: number | null): MilestoneComparisonStatus {
    if (deltaWeeks === null) return 'absent';
    if (deltaWeeks < 0) return 'early';
    if (deltaWeeks > 0) return 'late';
    return 'on_time';
}

function formatMilestoneStatus(status: MilestoneComparisonStatus): string {
    const labels: Record<MilestoneComparisonStatus, string> = {
        early: 'Early',
        late: 'Late',
        on_time: 'On Time',
        absent: 'Absent',
    };
    return labels[status];
}

function formatWeekLabel(week: number | null): string {
    return week === null ? 'Not recorded' : `W${week}`;
}

function formatDeltaLabel(deltaWeeks: number | null): string {
    if (deltaWeeks === null) return 'No player match';
    if (deltaWeeks === 0) return 'On historical week';
    const direction = deltaWeeks < 0 ? 'early' : 'late';
    return `${Math.abs(deltaWeeks)}w ${direction}`;
}

function rowFromMilestone(milestone: MilestoneComparison): EndgameMilestoneRow {
    const status = milestone.status ?? statusFromDelta(milestone.delta_weeks);
    return {
        id: milestone.id,
        label: milestone.label,
        historicalWeekLabel: formatWeekLabel(milestone.historical_week),
        playerWeekLabel: formatWeekLabel(milestone.player_week),
        deltaLabel: formatDeltaLabel(milestone.delta_weeks),
        status,
        statusLabel: formatMilestoneStatus(status),
        summary: milestone.summary,
    };
}

/**
 * Build milestone comparison rows for endgame presentation.
 * Explicit upstream rows are authoritative; the duration fallback keeps
 * older saves from losing the milestone comparison section entirely.
 */
export function buildMilestoneComparisonRows(
    costLedger: CostLedger | undefined,
    comparison: ComparisonResult | undefined,
): EndgameMilestoneRow[] {
    const explicit = comparison?.milestone_comparison ?? [];
    if (explicit.length > 0) {
        return explicit
            .filter(m => Number.isFinite(m.historical_week))
            .slice()
            .sort(compareMilestones)
            .map(rowFromMilestone);
    }

    if (!costLedger || !comparison || !Number.isFinite(costLedger.war_duration_weeks) || !Number.isFinite(comparison.duration_delta_weeks)) {
        return [];
    }

    const historicalWeek = costLedger.war_duration_weeks - comparison.duration_delta_weeks;
    const deltaWeeks = comparison.duration_delta_weeks;
    const status = statusFromDelta(deltaWeeks);
    const timingPhrase = deltaWeeks < 0
        ? `${Math.abs(deltaWeeks)} weeks earlier`
        : `${deltaWeeks} weeks later`;

    return [rowFromMilestone({
        id: 'war_duration',
        label: 'War Duration',
        historical_week: historicalWeek,
        player_week: costLedger.war_duration_weeks,
        delta_weeks: deltaWeeks,
        status,
        summary: deltaWeeks === 0
            ? 'The campaign reached its end on the historical reference week.'
            : `The campaign ended ${timingPhrase} than the historical reference.`,
    })];
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction hex colors (from tailwind.config.ts)
// ═══════════════════════════════════════════════════════════════════════════

const FACTION_HEX: Record<string, string> = {
    RS: '#c24040',
    RBiH: '#4a9a55',
    HRHB: '#4080b8',
};

const FACTION_NAMES: Record<string, string> = {
    RBiH: 'Republic of Bosnia and Herzegovina',
    RS: 'Republika Srpska',
    HRHB: 'Herzeg-Bosnia',
};

const FACTION_SHORT: Record<string, string> = {
    RBiH: 'ARBiH',
    RS: 'VRS',
    HRHB: 'HVO',
};

const GRADE_COLORS: Record<string, string> = {
    'A+': '#c4a35a',
    'A':  '#a8b040',
    'B':  '#6a9ec2',
    'C':  '#9a9080',
    'D':  '#b77272',
    'F':  '#c24040',
};

type VerdictLowerSection = 'report' | 'reckoning' | 'codex' | 'replay';

const LOWER_SECTION_LABELS: Record<VerdictLowerSection, string> = {
    report: 'Report',
    reckoning: 'Reckoning',
    codex: 'Codex',
    replay: 'Replay',
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function VerdictScreen() {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const startReplayInspection = useGameStore((s) => s.startReplayInspection);
    const ipc = useIPC();
    const [selectedFaction, setSelectedFaction] = useState<string>('RBiH');
    const [activeLowerSection, setActiveLowerSection] = useState<VerdictLowerSection>('report');

    // LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE: build ghost entries via useMemo.
    // CRITICAL: useMemo MUST be called before any early return to satisfy
    // the React Rules of Hooks — otherwise renders with/without verdict
    // call different numbers of hooks and React throws.
    const turnForCodex = loadedGameState?.turn ?? 0;
    const codexGhosts: BuiltGhostEntry[] = useMemo(() => {
        if (!loadedGameState) return [];
        try {
            return buildGhostEntries(loadedGameState, turnForCodex);
        } catch {
            return [];
        }
    }, [loadedGameState, turnForCodex]);

    if (!loadedGameState?.gameOver) return null;

    const verdict = loadedGameState.gameVerdict;
    const turn = loadedGameState.turn ?? 0;
    const date = loadedGameState.metadata?.date ?? `Turn ${turn}`;
    const years = Math.floor(turn / 52);
    const weeks = turn % 52;

    // Gather territory stats for the statistics section
    const controllers = loadedGameState.controlBySettlement ?? {};
    const factionOsids: Record<string, number> = {};
    for (const controller of Object.values(controllers)) {
        if (typeof controller === 'string') {
            factionOsids[controller] = (factionOsids[controller] ?? 0) + 1;
        }
    }
    const totalOsids = Object.keys(controllers).length || 1;

    // Formation counts
    const formations = loadedGameState.formations ?? [];
    const factionBrigades: Record<string, number> = {};
    const factionPersonnel: Record<string, number> = {};
    for (const f of formations) {
        if (f.kind === 'brigade' && f.status === 'active') {
            factionBrigades[f.faction] = (factionBrigades[f.faction] ?? 0) + 1;
            factionPersonnel[f.faction] = (factionPersonnel[f.faction] ?? 0) + (f.personnel ?? 0);
        }
    }

    const factionIds = ['RBiH', 'RS', 'HRHB'];

    // If no verdict data available (no negotiation capital was tracked), show fallback
    if (!verdict) {
        return <FallbackGameOver
            date={date}
            turn={turn}
            years={years}
            weeks={weeks}
            factionIds={factionIds}
            factionOsids={factionOsids}
            totalOsids={totalOsids}
            factionBrigades={factionBrigades}
            outcome={loadedGameState.gameOutcome}
            ipc={ipc}
        />;
    }

    const currentVerdict = verdict.faction_verdicts[selectedFaction];
    const milestoneRows = buildMilestoneComparisonRows(
        loadedGameState.costLedger,
        loadedGameState.historicalComparison,
    );
    const hasReckoning = Boolean(loadedGameState?.costLedger && loadedGameState?.historicalComparison);
    const hasCodex = codexGhosts.length > 0;
    const hasReplay = Boolean((loadedGameState.replaySaveSequence && loadedGameState.replaySaveSequence.length > 0)
        || (loadedGameState.replaySaveManifest && loadedGameState.replaySaveManifest.frame_count > 0));
    const lowerSections: VerdictLowerSection[] = [
        'report',
        ...(hasReckoning ? ['reckoning' as const] : []),
        ...(hasCodex ? ['codex' as const] : []),
        ...(hasReplay ? ['replay' as const] : []),
    ];
    const mobileSectionClass = (section: VerdictLowerSection) => (
        activeLowerSection === section ? 'block' : 'hidden sm:block'
    );

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
             style={{ zIndex: Z.GAME_OVER }}
             data-awwv-endgame-surface="verdict"
             data-awwv-endgame-outcome={verdict.outcome_label}>
            <div className="w-[min(980px,calc(100vw-24px))] max-h-[92vh] bg-panel-bg border border-panel-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
                <CinematicVerdict
                    verdict={verdict}
                    costLedger={loadedGameState.costLedger}
                    historicalComparison={loadedGameState.historicalComparison}
                    focusFaction={selectedFaction}
                    dateLabel={date}
                    durationLabel={years > 0 ? `${years}y ${weeks}w` : `${weeks} weeks`}
                />

                <div className="flex min-h-0 flex-1 flex-col"
                     data-awwv-mobile-verdict-flow
                     data-awwv-mobile-section-active={activeLowerSection}>
                    {lowerSections.length > 1 && (
                        <div className="shrink-0 border-b border-panel-border bg-panel-card/25 px-3 py-2 sm:hidden">
                            <div className="grid grid-cols-2 gap-2">
                                {lowerSections.map(section => {
                                    const active = activeLowerSection === section;
                                    return (
                                        <button
                                            key={section}
                                            type="button"
                                            onClick={() => setActiveLowerSection(section)}
                                            data-awwv-mobile-flow-tab={section}
                                            className={`min-h-9 border px-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                                active
                                                    ? 'border-accent-gold/60 bg-accent-gold/15 text-accent-gold'
                                                    : 'border-panel-border bg-black/20 text-text-secondary hover:bg-white/5'
                                            }`}
                                            aria-pressed={active}
                                        >
                                            {LOWER_SECTION_LABELS[section]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-auto">
                        <section className={mobileSectionClass('report')}
                                 data-awwv-mobile-section="report">
                {/* Faction Selector Tabs */}
                <div className="flex border-b border-panel-border">
                    {factionIds.map((fid) => {
                        const v = verdict.faction_verdicts[fid];
                        const active = fid === selectedFaction;
                        return (
                            <button
                                key={fid}
                                onClick={() => setSelectedFaction(fid)}
                                className={`flex-1 px-2 py-2 text-center transition-colors sm:px-4 sm:py-3 ${
                                    active
                                        ? 'bg-panel-card border-b-2'
                                        : 'bg-transparent hover:bg-panel-card/30'
                                }`}
                                style={active ? { borderBottomColor: FACTION_HEX[fid] } : undefined}
                            >
                                <div className="text-[10px] font-bold uppercase tracking-wider"
                                     style={{ color: FACTION_HEX[fid] }}>
                                    {FACTION_SHORT[fid] ?? fid}
                                </div>
                                {v && (
                                    <>
                                        <div className="flex items-center justify-center gap-1.5 mt-1 sm:gap-2">
                                            <span className="text-[16px] font-bold text-text-primary tabular-nums sm:text-[18px]">
                                                {v.pyrrhic_score.toFixed(1)}
                                            </span>
                                            <span className="text-[13px] font-bold sm:text-[14px]"
                                                  style={{ color: GRADE_COLORS[v.grade] ?? '#9a9080' }}>
                                                {v.grade}
                                            </span>
                                        </div>
                                        <div className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider sm:px-2 ${getOutcomeClassStyle(v.outcome_class)}`}>
                                            {formatOutcomeClass(v.outcome_class)}
                                        </div>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Faction Report */}
                <div>
                    {currentVerdict ? (
                        <FactionReport
                            verdict={currentVerdict}
                            factionOsids={factionOsids[selectedFaction] ?? 0}
                            totalOsids={totalOsids}
                            brigadeCount={factionBrigades[selectedFaction] ?? 0}
                            personnel={factionPersonnel[selectedFaction] ?? 0}
                            daytonResult={verdict.dayton_result}
                        />
                    ) : (
                        <div className="p-8 text-center text-text-secondary text-sm">
                            No verdict data for this faction.
                        </div>
                    )}
                </div>
                        </section>

                {/* War Reckoning — per-war cost ledger and historical comparison */}
                {hasReckoning && (
                    <section className={`border-t border-panel-border sm:block ${mobileSectionClass('reckoning')}`}
                             data-awwv-mobile-section="reckoning">
                        <WarCostSummary
                            costLedger={loadedGameState.costLedger!}
                            comparison={loadedGameState.historicalComparison!}
                        />
                        {milestoneRows.length > 0 && (
                            <EndgameMilestoneComparison rows={milestoneRows} />
                        )}
                    </section>
                )}

                {/* Codex — paths not taken (LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE).
                    Ring 2 narrative observations only. Hidden when no ghosts emit. */}
                {hasCodex && (
                    <section className={`border-t border-panel-border px-6 py-4 bg-panel-card/20 sm:block ${mobileSectionClass('codex')}`}
                             data-awwv-mobile-section="codex"
                             data-awwv-codex-ghosts={codexGhosts.length}>
                        <div className="text-[9px] uppercase tracking-[0.3em] text-text-secondary font-semibold mb-2">
                            Codex &mdash; Paths Not Taken
                        </div>
                        <ul className="space-y-1">
                            {codexGhosts.map((g) => (
                                <li key={g.ghost_id} className="text-[10px] text-text-secondary"
                                    data-awwv-ghost-id={g.ghost_id}
                                    data-awwv-ghost-variant={g.variant}
                                    data-awwv-ghost-ring={g.ring_classification}>
                                    <span className="text-text-primary font-mono">{g.ghost_id}</span>
                                    <span className="text-text-secondary/70"> &mdash; {g.path}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Replay — turn-by-turn scrub (LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER).
                    Stacked AFTER Codex tab (Mission E). Visible only when
                    gameOver === true (already gated above) AND a save sequence
                    has been plumbed into the loaded adapter. Read-only; does
                    NOT advance turns or mutate engine state. */}
                {hasReplay && (
                    <section className={`border-t border-panel-border sm:block ${mobileSectionClass('replay')}`}
                             data-awwv-mobile-section="replay"
                             data-awwv-endgame-section="replay">
                        <ReplayScrubber
                            saveSequence={loadedGameState.replaySaveSequence}
                            saveManifest={loadedGameState.replaySaveManifest}
                            onInspectFrame={startReplayInspection}
                        />
                    </section>
                )}
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-panel-border bg-panel-card/30 px-4 py-2 sm:px-6 sm:py-4">
                    <div className="mb-2 text-center text-[9px] italic text-text-secondary/60 sm:mb-3">
                        The least bad version of a tragedy
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                        <button
                            onClick={() => useGameStore.getState().setWrappedOpen(true)}
                            className="min-h-8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors sm:min-h-9 sm:px-6 sm:py-2"
                        >
                            View Your War
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="min-h-8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors sm:min-h-9 sm:px-6 sm:py-2"
                        >
                            New Game
                        </button>
                        {ipc.isAvailable && (
                            <button
                                onClick={() => ipc.loadStateDialog?.()}
                                className="min-h-8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-panel-border text-text-secondary hover:bg-white/5 transition-colors sm:min-h-9 sm:px-6 sm:py-2"
                            >
                                Load Save
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction Report Card
// ═══════════════════════════════════════════════════════════════════════════

export function EndgameMilestoneComparison({ rows }: { rows: EndgameMilestoneRow[] }) {
    return (
        <div className="px-6 pb-5 space-y-2"
             data-awwv-milestone-comparison={rows.length}>
            <div className="text-[9px] uppercase tracking-[0.3em] text-text-secondary font-semibold">
                Milestone Comparison
            </div>
            <div className="space-y-2">
                {rows.map(row => (
                    <div key={row.id}
                         className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.7fr_0.7fr] gap-3 items-start rounded border border-panel-border bg-panel-card/30 px-3 py-2"
                         data-awwv-milestone-id={row.id}
                         data-awwv-milestone-status={row.status}>
                        <div>
                            <div className="text-[11px] text-text-primary font-semibold">
                                {row.label}
                            </div>
                            <div className="text-[9px] text-text-secondary leading-relaxed mt-0.5">
                                {row.summary}
                            </div>
                        </div>
                        <MilestoneCell label="History" value={row.historicalWeekLabel} />
                        <MilestoneCell label="You" value={row.playerWeekLabel} />
                        <MilestoneCell label="Delta" value={row.deltaLabel} />
                        <MilestoneCell label="Status" value={row.statusLabel} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function MilestoneCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <div className="text-[8px] uppercase tracking-wider text-text-secondary/70">
                {label}
            </div>
            <div className="text-[10px] text-text-primary tabular-nums leading-snug break-words">
                {value}
            </div>
        </div>
    );
}

/** Exported for direct mount proof testing. */
export function FactionReport({
    verdict,
    factionOsids,
    totalOsids,
    brigadeCount,
    personnel,
    daytonResult,
}: {
    verdict: FactionVerdict;
    factionOsids: number;
    totalOsids: number;
    brigadeCount: number;
    personnel: number;
    daytonResult?: import('../../../state/negotiation_types.js').DaytonResult;
}) {
    const color = FACTION_HEX[verdict.faction] ?? '#888';
    const cap = verdict.capital_breakdown;

    return (
        <div className="p-6 space-y-5">
            {/* Pyrrhic Score Hero — always-visible primary signal, NOT collapsible. */}
            <div data-testid="faction-report-score" className="text-center py-4">
                <div className="text-[9px] uppercase tracking-[0.3em] text-text-secondary mb-1">
                    Pyrrhic Score
                </div>
                <div className="text-[48px] font-bold tabular-nums leading-none"
                     style={{ color }}>
                    {verdict.pyrrhic_score.toFixed(1)}
                </div>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border"
                     style={{ borderColor: GRADE_COLORS[verdict.grade] ?? '#9a9080' }}>
                    <span className="text-[20px] font-bold"
                          style={{ color: GRADE_COLORS[verdict.grade] ?? '#9a9080' }}>
                        {verdict.grade}
                    </span>
                </div>
                {/* Outcome Classification */}
                <div className="mt-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getOutcomeClassStyle(verdict.outcome_class)}`}>
                        {formatOutcomeClass(verdict.outcome_class)}
                    </span>
                </div>
                {/* Condemnation Flags — shown only when present */}
                {verdict.condemnation_flags && verdict.condemnation_flags.length > 0 && (
                    <div className="mt-3 p-3 rounded bg-red-950/40 border border-red-800/40">
                        <div className="text-[9px] uppercase tracking-wider text-red-400/80 font-semibold mb-1.5">
                            International Condemnation
                        </div>
                        {verdict.condemnation_flags.map((flag: string, i: number) => (
                            <div key={i} className="text-[10px] text-red-300/90 leading-relaxed">
                                {formatCondemnationFlag(flag)}
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-2 text-[11px] text-text-secondary italic max-w-md mx-auto leading-relaxed">
                    {verdict.grade_description}
                </div>
            </div>

            {/* UI-5 Batch 44 mobile subdivision: subsections wrap in <details>
                with `open` set + a `sm:hidden` summary so desktop renders dense
                and unchanged while mobile gains a tap-to-collapse affordance.
                Content stays in the DOM regardless of toggle state, so no
                score/result text is ever hidden from automated tests or
                accessibility tooling. */}

            {/* 6-Dimension Breakdown */}
            <details
                data-testid="faction-report-dimensions"
                open
                className="block"
            >
                <summary className="sm:hidden cursor-pointer list-none flex items-center justify-between rounded border border-panel-border bg-panel-card px-3 py-2 mb-2">
                    <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">
                        Capital Dimensions
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-text-muted">
                        {verdict.dimension_grades.length} bars
                    </span>
                </summary>
                <div className="hidden sm:block text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-3">
                    Capital Dimensions
                </div>
                <div className="space-y-2">
                    {verdict.dimension_grades.map((dg) => (
                        <DimensionBar key={dg.dimension} dg={dg} factionColor={color} />
                    ))}
                </div>
            </details>

            {/* Statistics */}
            <details
                data-testid="faction-report-statistics"
                open
                className="block"
            >
                <summary className="sm:hidden cursor-pointer list-none flex items-center justify-between rounded border border-panel-border bg-panel-card px-3 py-2 mb-2">
                    <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">
                        Final Statistics
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.12em] text-text-muted">
                        Tap to toggle
                    </span>
                </summary>
                <div className="hidden sm:block text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-3">
                    Final Statistics
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    <StatRow label="Territory" value={`${((factionOsids / totalOsids) * 100).toFixed(1)}% (${factionOsids} OSIDs)`} />
                    {cap && (
                        <>
                            <StatRow label="Territory (km2)" value={`${Math.round(cap.territory_controlled_km2).toLocaleString()} km\u00b2`} />
                            <StatRow label="Active Brigades" value={String(brigadeCount)} />
                            <StatRow label="Personnel" value={personnel.toLocaleString()} />
                            <StatRow label="Casualties Inflicted" value={cap.military_casualties_inflicted.toLocaleString()} />
                            <StatRow label="Casualties Taken" value={cap.military_casualties_taken.toLocaleString()} />
                            <StatRow label="Civilians Protected" value={cap.civilians_under_protection.toLocaleString()} />
                            <StatRow label="Refugees Created" value={cap.refugees_created.toLocaleString()} />
                            <StatRow label="Refugees Received" value={cap.refugees_received.toLocaleString()} />
                            <StatRow label="Operations Launched" value={String(cap.operations_launched)} />
                            <StatRow label="Operations Successful" value={String(cap.operations_successful)} />
                            {cap.enclaves_held.length > 0 && (
                                <StatRow label="Enclaves Held" value={cap.enclaves_held.map(titleCase).join(', ')} />
                            )}
                            {cap.enclaves_lost.length > 0 && (
                                <StatRow label="Enclaves Lost" value={cap.enclaves_lost.map(titleCase).join(', ')} />
                            )}
                            {cap.peace_plans_accepted.length > 0 && (
                                <StatRow label="Plans Accepted" value={cap.peace_plans_accepted.join(', ')} />
                            )}
                            {cap.peace_plans_rejected.length > 0 && (
                                <StatRow label="Plans Rejected" value={cap.peace_plans_rejected.join(', ')} />
                            )}
                            {cap.war_crimes_events > 0 && (
                                <StatRow label="War Crimes Events" value={String(cap.war_crimes_events)} />
                            )}
                        </>
                    )}
                </div>
            </details>

            {/* Dayton Details (if applicable) */}
            {daytonResult && (
                <details
                    data-testid="faction-report-dayton"
                    open
                    className="block"
                >
                    <summary className="sm:hidden cursor-pointer list-none flex items-center justify-between rounded border border-panel-border bg-panel-card px-3 py-2 mb-2">
                        <span className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold">
                            Dayton Agreement
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.12em] text-text-muted">
                            Tap to toggle
                        </span>
                    </summary>
                    <div className="hidden sm:block text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-3">
                        Dayton Agreement
                    </div>
                    <div className="space-y-2 text-[11px] text-text-secondary">
                        {daytonResult.territorial_packages_accepted.length > 0 && (
                            <div>
                                <span className="text-text-primary font-semibold">Packages Accepted: </span>
                                {daytonResult.territorial_packages_accepted.join(', ')}
                            </div>
                        )}
                        {daytonResult.territorial_packages_rejected.length > 0 && (
                            <div>
                                <span className="text-text-primary font-semibold">Packages Rejected: </span>
                                {daytonResult.territorial_packages_rejected.join(', ')}
                            </div>
                        )}
                        {Object.keys(daytonResult.institutional_choices).length > 0 && (
                            <div>
                                <span className="text-text-primary font-semibold">Institutions: </span>
                                {Object.entries(daytonResult.institutional_choices)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join('; ')}
                            </div>
                        )}
                        {daytonResult.final_territory_split && (
                            <div>
                                <span className="text-text-primary font-semibold">Final Split: </span>
                                {Object.entries(daytonResult.final_territory_split)
                                    .map(([k, v]) => `${k} ${(v as number).toFixed(1)}%`)
                                    .join(', ')}
                            </div>
                        )}
                        {daytonResult.patron_overrides_applied.length > 0 && (
                            <div className="text-faction-rs-subtle">
                                <span className="font-semibold">Patron Overrides: </span>
                                {daytonResult.patron_overrides_applied.join(', ')}
                            </div>
                        )}
                    </div>
                </details>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function DimensionBar({ dg, factionColor }: { dg: DimensionGrade; factionColor: string }) {
    const gradeColor = GRADE_COLORS[dg.grade] ?? '#9a9080';
    const barWidth = Math.max(2, Math.min(100, dg.score));

    return (
        <div className="flex items-center gap-3">
            <div className="w-[140px] text-[10px] text-text-secondary truncate">
                {dg.label}
            </div>
            <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: factionColor, opacity: 0.7 }}
                />
            </div>
            <div className="w-[32px] text-right text-[10px] tabular-nums text-text-primary">
                {Math.round(dg.score)}
            </div>
            <div className="w-[24px] text-[11px] font-bold text-right" style={{ color: gradeColor }}>
                {dg.grade}
            </div>
        </div>
    );
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-[10px]">
            <span className="text-text-secondary">{label}</span>
            <span className="text-text-primary tabular-nums font-medium">{value}</span>
        </div>
    );
}

function titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// Fallback (no verdict data — simple game over display)
// ═══════════════════════════════════════════════════════════════════════════

const FALLBACK_OUTCOME_LABEL_KEYS: Record<string, { title: MessageKey; subtitle: MessageKey }> = {
    victory_RBiH: { title: 'gameOver.outcome.victory_RBiH.title', subtitle: 'gameOver.outcome.victory_RBiH.subtitle' },
    victory_RS: { title: 'gameOver.outcome.victory_RS.title', subtitle: 'gameOver.outcome.victory_RS.subtitle' },
    victory_HRHB: { title: 'gameOver.outcome.victory_HRHB.title', subtitle: 'gameOver.outcome.victory_HRHB.subtitle' },
    timeout_stalemate: { title: 'gameOver.outcome.timeout_stalemate.title', subtitle: 'gameOver.outcome.timeout_stalemate.subtitle' },
    faction_collapse: { title: 'gameOver.outcome.faction_collapse.title', subtitle: 'gameOver.outcome.faction_collapse.subtitle' },
    ceasefire: { title: 'gameOver.outcome.ceasefire.title', subtitle: 'gameOver.outcome.ceasefire.subtitle' },
};

function fallbackOutcomeDisplay(outcome?: string): { title: string; subtitle: string } {
    if (!outcome) return { title: t('gameOver.fallback.title'), subtitle: '' };
    const keys = FALLBACK_OUTCOME_LABEL_KEYS[outcome];
    return keys ? { title: t(keys.title), subtitle: t(keys.subtitle) } : { title: outcome.replace(/_/g, ' '), subtitle: '' };
}

function formatFallbackOsidsControlled(count: number): string {
    return t(count === 1 ? 'gameOver.osidControlled.one' : 'gameOver.osidControlled.many', { count });
}

function formatFallbackActiveBrigades(count: number): string {
    return t(count === 1 ? 'gameOver.activeBrigade.one' : 'gameOver.activeBrigade.many', { count });
}

function formatFallbackYearCount(count: number): string {
    return t(count === 1 ? 'gameOver.year.one' : 'gameOver.year.many', { count });
}

function formatFallbackWeekCount(count: number): string {
    return t(count === 1 ? 'gameOver.week.one' : 'gameOver.week.many', { count });
}

function FallbackGameOver({
    date, turn, years, weeks, factionIds, factionOsids, totalOsids, factionBrigades, outcome, ipc,
}: {
    date: string;
    turn: number;
    years: number;
    weeks: number;
    factionIds: string[];
    factionOsids: Record<string, number>;
    totalOsids: number;
    factionBrigades: Record<string, number>;
    outcome?: string;
    ipc: { isAvailable: boolean; loadStateDialog?: () => void };
}) {
    useLocale();
    const display = fallbackOutcomeDisplay(outcome);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
             style={{ zIndex: Z.GAME_OVER }}
             data-awwv-endgame-surface="fallback"
             data-awwv-endgame-outcome={display.title}>
            <div className="w-[560px] max-h-[85vh] bg-panel-bg border border-panel-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-panel-border bg-panel-card/50 text-center">
                    <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-accent-gold/60 mb-2">
                        {date} &mdash; A War Without Victory
                    </div>
                    <div className="text-xl font-bold text-text-primary uppercase tracking-wide mb-1">
                        {display.title}
                    </div>
                    <div className="text-[11px] text-text-secondary italic leading-relaxed max-w-sm mx-auto">
                        {display.subtitle}
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">{t('gameOver.finalStandings')}</div>
                    {factionIds.map((fid) => {
                        const color = FACTION_HEX[fid] ?? '#888';
                        const osids = factionOsids[fid] ?? 0;
                        const pct = ((osids / totalOsids) * 100).toFixed(1);
                        const brigades = factionBrigades[fid] ?? 0;
                        return (
                            <div key={fid} className="p-3 rounded border border-panel-border bg-panel-card/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                                        <span className="text-[12px] font-bold text-text-primary uppercase tracking-wide">{fid}</span>
                                    </div>
                                    <span className="text-[11px] text-text-primary tabular-nums font-bold">{pct}%</span>
                                </div>
                                <div className="flex gap-4 text-[10px] text-text-secondary">
                                    <span>{formatFallbackOsidsControlled(osids)}</span>
                                    <span>{formatFallbackActiveBrigades(brigades)}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 bg-black/30 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}
                    <div className="text-[10px] text-text-secondary text-center pt-2 border-t border-panel-border">
                        {t('gameOver.campaignLasted', {
                            turn,
                            years: formatFallbackYearCount(years),
                            weeks: formatFallbackWeekCount(weeks),
                        })}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-panel-border bg-panel-card/30 flex justify-center gap-3">
                    <button
                        onClick={() => useGameStore.getState().setWrappedOpen(true)}
                        className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"
                    >
                        {t('gameOver.viewYourWar')}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
                    >
                        {t('gameOver.newGame')}
                    </button>
                    {ipc.isAvailable && (
                        <button
                            onClick={() => ipc.loadStateDialog?.()}
                            className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-panel-border text-text-secondary hover:bg-white/5 transition-colors"
                        >
                            {t('gameOver.loadSave')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
