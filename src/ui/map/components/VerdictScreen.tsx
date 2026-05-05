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

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function VerdictScreen() {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const ipc = useIPC();
    const [selectedFaction, setSelectedFaction] = useState<string>('RBiH');

    // LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE: build ghost entries via useMemo.
    // CRITICAL: useMemo MUST be called before any early return to satisfy
    // the React Rules of Hooks — otherwise renders with/without verdict
    // call different numbers of hooks and React throws.
    const turnForCodex = loadedGameState?.turn ?? 0;
    const codexGhosts: BuiltGhostEntry[] = useMemo(() => {
        if (!loadedGameState) return [];
        try {
            return buildGhostEntries(loadedGameState as unknown as Parameters<typeof buildGhostEntries>[0], turnForCodex);
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

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
             style={{ zIndex: Z.GAME_OVER }}
             data-awwv-endgame-surface="verdict"
             data-awwv-endgame-outcome={verdict.outcome_label}>
            <div className="w-[780px] max-h-[92vh] bg-panel-bg border border-panel-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-8 py-5 border-b border-panel-border bg-panel-card/50 text-center">
                    <div className="text-[9px] font-mono uppercase tracking-[0.5em] text-accent-gold/50 mb-1">
                        A War Without Victory
                    </div>
                    <div className="text-lg font-bold text-text-primary uppercase tracking-wide mb-1">
                        {verdict.outcome_label}
                    </div>
                    <div className="text-[10px] text-text-secondary">
                        {date} &mdash; {years > 0 ? `${years}y ${weeks}w` : `${weeks} weeks`} of war
                    </div>
                </div>

                {/* Faction Selector Tabs */}
                <div className="flex border-b border-panel-border">
                    {factionIds.map((fid) => {
                        const v = verdict.faction_verdicts[fid];
                        const active = fid === selectedFaction;
                        return (
                            <button
                                key={fid}
                                onClick={() => setSelectedFaction(fid)}
                                className={`flex-1 px-4 py-3 text-center transition-colors ${
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
                                        <div className="flex items-center justify-center gap-2 mt-1">
                                            <span className="text-[18px] font-bold text-text-primary tabular-nums">
                                                {v.pyrrhic_score.toFixed(1)}
                                            </span>
                                            <span className="text-[14px] font-bold"
                                                  style={{ color: GRADE_COLORS[v.grade] ?? '#9a9080' }}>
                                                {v.grade}
                                            </span>
                                        </div>
                                        <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getOutcomeClassStyle(v.outcome_class)}`}>
                                            {formatOutcomeClass(v.outcome_class)}
                                        </div>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Faction Report */}
                <div className="flex-1 overflow-auto">
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

                {/* War Reckoning — per-war cost ledger and historical comparison */}
                {loadedGameState?.costLedger && loadedGameState?.historicalComparison && (
                    <div className="border-t border-panel-border">
                        <WarCostSummary
                            costLedger={loadedGameState.costLedger}
                            comparison={loadedGameState.historicalComparison}
                        />
                    </div>
                )}

                {/* Codex — paths not taken (LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE).
                    Ring 2 narrative observations only. Hidden when no ghosts emit. */}
                {codexGhosts.length > 0 && (
                    <div className="border-t border-panel-border px-6 py-4 bg-panel-card/20"
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
                    </div>
                )}

                {/* Replay — turn-by-turn scrub (LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER).
                    Stacked AFTER Codex tab (Mission E). Visible only when
                    gameOver === true (already gated above) AND a save sequence
                    has been plumbed into the loaded adapter. Read-only; does
                    NOT advance turns or mutate engine state. */}
                {loadedGameState.replaySaveSequence
                    && loadedGameState.replaySaveSequence.length > 0 && (
                    <div className="border-t border-panel-border"
                         data-awwv-endgame-section="replay">
                        <ReplayScrubber saveSequence={loadedGameState.replaySaveSequence} />
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-panel-border bg-panel-card/30">
                    <div className="text-[9px] text-text-secondary/60 text-center italic mb-3">
                        The least bad version of a tragedy
                    </div>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => useGameStore.getState().setWrappedOpen(true)}
                            className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"
                        >
                            View Your War
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
                        >
                            New Game
                        </button>
                        {ipc.isAvailable && (
                            <button
                                onClick={() => ipc.loadStateDialog?.()}
                                className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-panel-border text-text-secondary hover:bg-white/5 transition-colors"
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
            {/* Pyrrhic Score Hero */}
            <div className="text-center py-4">
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

            {/* 5-Dimension Breakdown */}
            <div>
                <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-3">
                    Capital Dimensions
                </div>
                <div className="space-y-2">
                    {verdict.dimension_grades.map((dg) => (
                        <DimensionBar key={dg.dimension} dg={dg} factionColor={color} />
                    ))}
                </div>
            </div>

            {/* Statistics */}
            <div>
                <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-3">
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
            </div>

            {/* Dayton Details (if applicable) */}
            {daytonResult && (
                <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-3">
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
                </div>
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

const OUTCOME_LABELS: Record<string, { title: string; subtitle: string }> = {
    victory_RBiH: { title: 'Republic of Bosnia and Herzegovina Prevails', subtitle: 'The multi-ethnic state endures -- but at what cost?' },
    victory_RS: { title: 'Republika Srpska Achieves Its Aims', subtitle: 'The Serb entity consolidates -- but the land is emptied.' },
    victory_HRHB: { title: 'Herzeg-Bosnia Secures Its Territory', subtitle: 'The Croatian entity holds -- but the alliance is shattered.' },
    timeout_stalemate: { title: 'Stalemate', subtitle: 'The war grinds to exhaustion. No side achieves its aims.' },
    faction_collapse: { title: 'Faction Collapse', subtitle: 'A faction has been driven from the field.' },
    ceasefire: { title: 'Ceasefire', subtitle: 'The guns fall silent -- for now.' },
};

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
    const display = outcome
        ? (OUTCOME_LABELS[outcome] ?? { title: outcome.replace(/_/g, ' '), subtitle: '' })
        : { title: 'Game Over', subtitle: '' };

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
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">Final Standings</div>
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
                                    <span>{osids} OSIDs controlled</span>
                                    <span>{brigades} active brigades</span>
                                </div>
                                <div className="mt-1.5 h-1.5 bg-black/30 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}
                    <div className="text-[10px] text-text-secondary text-center pt-2 border-t border-panel-border">
                        Campaign lasted {turn} weeks ({years} years, {weeks} weeks)
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-panel-border bg-panel-card/30 flex justify-center gap-3">
                    <button
                        onClick={() => useGameStore.getState().setWrappedOpen(true)}
                        className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"
                    >
                        View Your War
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-accent-gold/40 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 transition-colors"
                    >
                        New Game
                    </button>
                    {ipc.isAvailable && (
                        <button
                            onClick={() => ipc.loadStateDialog?.()}
                            className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider rounded border border-panel-border text-text-secondary hover:bg-white/5 transition-colors"
                        >
                            Load Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
