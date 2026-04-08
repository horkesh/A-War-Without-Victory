/**
 * Operation History Panel — shows completed operation AARs and active ops.
 * Two tabs: Active (in-progress) and History (completed with star grades).
 */
import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import type { LoadedGameState } from '../data/types';
import {
    filterPlayerFacingActiveOperations,
    filterPlayerFacingFormations,
    filterPlayerFacingOperationHistory,
} from '../../shared/playerVisibility';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { deriveOperationOutcomeCategory, buildOperationTrendSummary } from '../data/command_strain';

// --- Faction styling ---
const FACTION_COLOR: Record<string, string> = {
    RS: '#c04040',
    RBiH: '#4a9a55',
    HRHB: '#4080b8',
};

const OUTCOME_COLOR: Record<string, string> = {
    success: 'text-green-400',
    partial: 'text-amber-400',
    failure: 'text-red-400',
    orphaned: 'text-neutral-500',
};

const OUTCOME_LABEL: Record<string, string> = {
    success: 'Success',
    partial: 'Partial',
    failure: 'Failure',
    orphaned: 'Orphaned',
};

const RECOVERY_REASON_BADGE: Record<string, { label: string; className: string }> = {
    completed: { label: 'COMPLETED', className: 'bg-green-700/60 text-green-200' },
    max_failures: { label: 'FAILED \u2014 MAX FAILURES', className: 'bg-red-700/60 text-red-200' },
    orphaned_sector: { label: 'ENDED \u2014 SECTOR LOST', className: 'bg-amber-700/60 text-amber-200' },
    no_logged_attempt: { label: 'ENDED \u2014 NO CONTACT', className: 'bg-neutral-600/60 text-neutral-300' },
    manual_termination: { label: 'HALTED BY COMMAND', className: 'bg-blue-700/60 text-blue-200' },
};

const PHASE_COLOR: Record<string, string> = {
    planning: 'text-blue-400',
    execution: 'text-amber-400',
    recovery: 'text-neutral-400',
};

const NOTABLE_EVENT_LABEL: Record<string, string> = {
    first_blood: 'First Blood',
    breakthrough: 'Breakthrough',
    stalled: 'Stalled',
    heavy_losses: 'Heavy Losses',
};

const CAPTURE_PROVENANCE_LABEL: Record<string, string | null> = {
    no_objectives_held: null,
    logged_capture: null,
    held_without_logged_capture: 'Objectives were held at finalization but never logged as captured during this operation.',
    held_without_logged_attack: 'Objectives were held at finalization without any logged attacks. This record shows final control, not confirmed combat capture.',
    mixed: 'Some objectives were logged during the operation; others were only held at finalization.',
};

// --- Types ---
type CompletedOp = NonNullable<LoadedGameState['operationHistory']>[number];
type ActiveOp = NonNullable<LoadedGameState['activeOperations']>[number];
type Tab = 'active' | 'history';

function getCorpsDisplayName(corpsNameById: Map<string, string>, corpsId: string): string {
    return corpsNameById.get(corpsId) ?? 'Field Command';
}

// --- Sub-components ---

/**
 * Three-tier outcome category badge for completed op cards.
 * Silence = healthy: ordinary_compliance returns null (no badge).
 * Only shown when commander_assessment_at_launch snapshot exists (post-feature ops).
 */
function OutcomeCategoryBadge({ assessmentAtLaunch, wasForce }: {
    assessmentAtLaunch: 'launch' | 'postpone' | 'abort' | null | undefined;
    wasForce: boolean;
}) {
    // No snapshot means pre-feature op — no badge
    if (assessmentAtLaunch == null && !wasForce) return null;

    const category = deriveOperationOutcomeCategory(assessmentAtLaunch, wasForce);

    if (category === 'ordinary_compliance') return null; // silence = healthy

    if (category === 'direct_intervention') {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/60">
                ⚠ Direct Intervention
            </span>
        );
    }
    // reluctant_compliance
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-amber-400/5 text-amber-500/80 border border-amber-400/40">
            Approved Against Recommendation
        </span>
    );
}

function FactionTag({ faction }: { faction: string }) {
    return (
        <span
            className="text-[9px] font-mono px-1 rounded border"
            style={{ color: FACTION_COLOR[faction] ?? '#aaa', borderColor: `${FACTION_COLOR[faction] ?? '#555'}44` }}
        >
            {getPlayerSafeMilitaryFactionName(faction, 'Unknown force')}
        </span>
    );
}

function StarRating({ stars, verdict }: { stars: number; verdict: string }) {
    const filled = Math.max(0, Math.min(5, stars));
    return (
        <span className="flex items-center gap-1">
            <span className="text-[12px]" style={{ color: '#d4a644' }}>
                {'\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled)}
            </span>
            <span className="text-[9px] text-text-secondary font-mono">{verdict}</span>
        </span>
    );
}

function CasualtyLine({ label, cas }: { label: string; cas: { killed: number; wounded: number } }) {
    const total = cas.killed + cas.wounded;
    if (total === 0) return null;
    return (
        <div className="text-[10px] text-text-muted tabular-nums">
            {label}: {total.toLocaleString()} ({cas.killed.toLocaleString()} KIA, {cas.wounded.toLocaleString()} WIA)
        </div>
    );
}

function ExchangeRatio({ suffered, inflicted }: { suffered: { killed: number; wounded: number }; inflicted: { killed: number; wounded: number } }) {
    const totalSuffered = suffered.killed + suffered.wounded;
    const totalInflicted = inflicted.killed + inflicted.wounded;
    const ratio = totalSuffered > 0 ? (totalInflicted / totalSuffered) : (totalInflicted > 0 ? Infinity : 0);
    const ratioStr = ratio === Infinity ? 'INF' : ratio.toFixed(2);
    const color = ratio >= 2.0 ? 'text-green-400' : ratio >= 1.0 ? 'text-amber-400' : 'text-red-400';
    return (
        <span className={`text-[10px] font-mono ${color}`}>
            Exchange: {ratioStr}:1
        </span>
    );
}

// --- Completed operation card ---

function CompletedOpCard({
    op,
    corpsName,
    osidDisplayNames,
}: {
    op: CompletedOp;
    corpsName: string;
    osidDisplayNames: Record<string, string> | null;
}) {
    const [expanded, setExpanded] = useState(false);
    const objRate = op.objectives_targeted.length > 0
        ? `${op.objectives_captured.length}/${op.objectives_targeted.length}`
        : '0/0';
    const captureProvenanceNotice = CAPTURE_PROVENANCE_LABEL[op.capture_provenance ?? 'no_objectives_held'];

    return (
        <div className="border border-panel-border/50 rounded bg-panel-card/50 mb-2">
            <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-panel-hover/30 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <FactionTag faction={op.faction} />
                            <span className="text-[11px] text-text-primary font-semibold truncate">{op.operation_name}</span>
                        </div>
                        {op.commander_name && (
                            <div className="text-[9px] text-text-muted">
                                OiC: {op.commander_rank ? `${op.commander_rank} ` : ''}{op.commander_name}
                            </div>
                        )}
                        <div className="text-[9px] text-text-muted">
                            {corpsName} | W{op.started_turn}-W{op.ended_turn} ({op.duration_turns}w) | Held at end {objRate}
                        </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                        <StarRating stars={op.grade.stars} verdict={op.grade.verdict} />
                        <span className={`text-[10px] font-mono ${OUTCOME_COLOR[op.outcome] ?? 'text-text-secondary'}`}>
                            {OUTCOME_LABEL[op.outcome] ?? op.outcome}
                        </span>
                        {op.recovery_reason && RECOVERY_REASON_BADGE[op.recovery_reason] && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${RECOVERY_REASON_BADGE[op.recovery_reason].className}`}>
                                {RECOVERY_REASON_BADGE[op.recovery_reason].label}
                            </span>
                        )}
                        <OutcomeCategoryBadge
                            assessmentAtLaunch={op.commander_assessment_at_launch}
                            wasForce={op.force_launched ?? false}
                        />
                        {op.force_launched && op.ca_cost_at_launch != null && (
                            <span className="text-[9px] text-amber-300/70 font-mono tabular-nums">{op.ca_cost_at_launch} CA</span>
                        )}
                    </div>
                </div>
            </button>

            {expanded && (
                <div className="px-3 pb-2 pt-1 border-t border-panel-border/30 space-y-1.5">
                    {/* Casualties */}
                    <div>
                        <CasualtyLine label="Suffered" cas={op.casualties_suffered} />
                        <CasualtyLine label="Inflicted" cas={op.casualties_inflicted} />
                        <div className="flex gap-3 mt-0.5">
                            <ExchangeRatio suffered={op.casualties_suffered} inflicted={op.casualties_inflicted} />
                        </div>
                    </div>

                    {/* Equipment */}
                    {(op.equipment_lost.tanks + op.equipment_lost.artillery > 0 ||
                      op.equipment_destroyed.tanks + op.equipment_destroyed.artillery > 0 ||
                      op.equipment_captured.tanks + op.equipment_captured.artillery > 0) && (
                        <div className="text-[10px] text-text-muted space-y-0.5">
                            {(op.equipment_lost.tanks > 0 || op.equipment_lost.artillery > 0) && (
                                <div>Lost: {op.equipment_lost.tanks}T {op.equipment_lost.artillery}A</div>
                            )}
                            {(op.equipment_destroyed.tanks > 0 || op.equipment_destroyed.artillery > 0) && (
                                <div>Destroyed: {op.equipment_destroyed.tanks}T {op.equipment_destroyed.artillery}A</div>
                            )}
                            {(op.equipment_captured.tanks > 0 || op.equipment_captured.artillery > 0) && (
                                <div className="text-green-400">Captured: {op.equipment_captured.tanks}T {op.equipment_captured.artillery}A</div>
                            )}
                        </div>
                    )}

                    {/* Grade factors */}
                    <div className="text-[9px] text-text-muted flex gap-3 flex-wrap">
                        {Object.entries(op.grade.factors).map(([key, val]) => (
                            <span key={key}>
                                {key.replace(/_/g, ' ')}: <span className="text-text-secondary tabular-nums">{typeof val === 'number' ? val.toFixed(0) : val}</span>
                            </span>
                        ))}
                    </div>

                    {/* Command Record — expanded provenance sentence */}
                    {(op.commander_assessment_at_launch != null || op.force_launched) && (
                        <div className="text-[9px] text-text-muted border-t border-panel-border/30 pt-1.5">
                            <span className="uppercase font-bold text-text-secondary">Command Record: </span>
                            {op.force_launched ? (
                                <>
                                    Commander recommended <span className="font-semibold text-text-primary capitalize">{op.commander_assessment_at_launch ?? 'unknown'}</span>
                                    {' — '}
                                    <span className="text-amber-400 font-bold">Direct Intervention</span>
                                    {op.ca_cost_at_launch != null && (
                                        <span className="text-text-muted"> ({op.ca_cost_at_launch} CA spent)</span>
                                    )}
                                </>
                            ) : op.commander_assessment_at_launch === 'postpone' || op.commander_assessment_at_launch === 'abort' ? (
                                <>
                                    Commander recommended <span className="font-semibold text-text-primary capitalize">{op.commander_assessment_at_launch}</span>
                                    {' — '}
                                    <span className="text-amber-500/80 font-semibold">Approved Against Recommendation</span>
                                </>
                            ) : (
                                <>
                                    Commander recommended <span className="font-semibold text-text-primary capitalize">{op.commander_assessment_at_launch}</span>
                                    {' — '}
                                    <span className="text-green-400 font-semibold">Approved</span>
                                </>
                            )}
                        </div>
                    )}
                    {/* Institutional strain note — only for direct interventions */}
                    {op.force_launched && (
                        <div className="text-[9px] text-amber-500/80 italic">
                            Note: Direct Intervention contributed to command strain on this corps.
                        </div>
                    )}

                    {captureProvenanceNotice && (
                        <div className="text-[9px] text-amber-300/80 border-t border-panel-border/30 pt-1.5">
                            <span className="uppercase font-bold text-amber-300">AAR provenance: </span>
                            {captureProvenanceNotice}
                        </div>
                    )}

                    {/* Objectives */}
                    {op.objectives_targeted.length > 0 && (
                        <div>
                            <div className="text-[9px] uppercase tracking-wide text-text-secondary mb-0.5">Objectives Held at End</div>
                            <div className="space-y-0.5">
                                {op.objectives_targeted.map(osid => {
                                    const heldAtEnd = op.objectives_captured.includes(osid);
                                    const loggedDuringOperation = op.objectives_logged_captured?.includes(osid) ?? false;
                                    return (
                                        <div key={osid} className="text-[10px] flex items-center gap-1.5">
                                            <span className={heldAtEnd ? (loggedDuringOperation ? 'text-green-400' : 'text-amber-300') : 'text-red-400'}>
                                                {heldAtEnd ? (loggedDuringOperation ? '\u2713' : '\u25cf') : '\u2717'}
                                            </span>
                                            <span className="text-text-primary capitalize">{getOsidDisplayName(osid, osidDisplayNames)}</span>
                                            {heldAtEnd && !loggedDuringOperation && (
                                                <span className="text-[9px] text-amber-300/80 uppercase tracking-wide">Held at end</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {(op.objectives_logged_captured?.length ?? 0) > 0 && (
                                <div className="mt-1 text-[9px] text-text-muted">
                                    Logged during operation: {op.objectives_logged_captured!.map((osid) => getOsidDisplayName(osid, osidDisplayNames)).join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Per-axis breakdown */}
                    {op.axis_summaries && op.axis_summaries.length > 0 && (
                        <div>
                            <div className="text-[9px] uppercase tracking-wide text-text-secondary mb-0.5">Axes</div>
                            {op.axis_summaries.map(ax => (
                                <div key={ax.axis_id} className="text-[10px] border-l-2 border-panel-border/50 pl-2 mb-1">
                                    <div className="text-text-primary font-semibold">{ax.axis_name}</div>
                                    <div className="text-text-muted">
                                        Obj {ax.objectives_captured.length}/{ax.objectives_targeted.length} | Attacks {ax.total_attacks}
                                    </div>
                                    <CasualtyLine label="Cas" cas={ax.casualties_suffered} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Weekly timeline */}
                    {op.weekly_log.length > 0 && (
                        <div>
                            <div className="text-[9px] uppercase tracking-wide text-text-secondary mb-0.5">Weekly Timeline</div>
                            <div className="space-y-0.5 max-h-32 overflow-auto">
                                {op.weekly_log.map((entry, i) => {
                                    const hasCas = entry.casualties_suffered.killed + entry.casualties_suffered.wounded > 0;
                                    const hasCaptures = entry.objectives_captured_this_turn.length > 0;
                                    const hasNotable = entry.notable_events.length > 0;
                                    if (!entry.attacks_this_turn && !hasCas && !hasCaptures && !hasNotable) {
                                        return null;
                                    }
                                    return (
                                        <div key={i} className="text-[9px] flex items-start gap-1.5">
                                            <span className="text-text-muted tabular-nums shrink-0 w-7">W{entry.turn}</span>
                                            <span className={`shrink-0 ${PHASE_COLOR[entry.phase] ?? 'text-text-muted'}`}>{entry.phase[0].toUpperCase()}</span>
                                            <div className="flex-1 min-w-0">
                                                {entry.attacks_this_turn > 0 && (
                                                    <span className="text-text-secondary">{entry.attacks_this_turn} atk </span>
                                                )}
                                                {hasCaptures && entry.objectives_captured_this_turn.map(osid => (
                                                    <span key={osid} className="text-green-400 capitalize">{getOsidDisplayName(osid, osidDisplayNames)} </span>
                                                ))}
                                                {hasCas && (
                                                    <span className="text-text-muted">
                                                        -{(entry.casualties_suffered.killed + entry.casualties_suffered.wounded).toLocaleString()}
                                                    </span>
                                                )}
                                                {hasNotable && entry.notable_events.map((evt, j) => (
                                                    <span key={j} className="text-accent-gold ml-1">
                                                        {NOTABLE_EVENT_LABEL[evt] ?? evt}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Active operation card ---

function ActiveOpCard({ op, corpsName }: { op: ActiveOp; corpsName: string }) {
    const objRate = op.objectives_count > 0 ? `${op.objectives_captured}/${op.objectives_count}` : '0/0';
    return (
        <div className="border border-panel-border/50 rounded bg-panel-card/50 mb-2 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <FactionTag faction={op.faction} />
                        <span className="text-[11px] text-text-primary font-semibold truncate">{op.operation_name}</span>
                    </div>
                    {op.commander_name && (
                        <div className="text-[9px] text-text-muted">OiC: {op.commander_name}</div>
                    )}
                    <div className="text-[9px] text-text-muted">
                        {corpsName} | Since W{op.started_turn} | {op.participating_brigades.length} bdes
                    </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <span className={`text-[10px] font-mono uppercase ${PHASE_COLOR[op.phase] ?? 'text-text-secondary'}`}>
                        {op.phase}
                    </span>
                    <span className="text-[10px] text-text-muted tabular-nums">
                        Obj {objRate} | {op.attacks} atk
                    </span>
                </div>
            </div>
        </div>
    );
}

// --- Main panel ---

interface OperationHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    /** When true, renders content only (no modal wrapper/backdrop). */
    embedded?: boolean;
}

export function OperationHistoryPanel({ isOpen, onClose, embedded }: OperationHistoryPanelProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const [tab, setTab] = useState<Tab>('active');
    const corpsNameById = useMemo(
        () =>
            new Map(
                filterPlayerFacingFormations(loadedGameState)
                    .filter((f) => f.kind === 'corps' || f.kind === 'army_hq' || f.kind === 'corps_asset')
                    .map((f) => [f.id, f.name]),
            ),
        [loadedGameState?.formations],
    );

    if (!isOpen || !loadedGameState) return null;

    const history = filterPlayerFacingOperationHistory(loadedGameState);
    const active = filterPlayerFacingActiveOperations(loadedGameState);
    const sortedHistory = [...history].sort((a, b) => b.ended_turn - a.ended_turn);

    const tabClass = (t: Tab) =>
        `px-3 py-1 text-[10px] uppercase tracking-wide font-semibold transition-colors border-b-2 ${
            tab === t
                ? 'text-accent-gold border-accent-gold'
                : 'text-text-secondary border-transparent hover:text-text-primary'
        }`;

    const body = (
        <div>
            <div className="flex border-b border-panel-border mb-3">
                <button type="button" className={tabClass('active')} onClick={() => setTab('active')}>
                    Active {active.length > 0 && <span className="ml-1 text-text-muted">({active.length})</span>}
                </button>
                <button type="button" className={tabClass('history')} onClick={() => setTab('history')}>
                    History {history.length > 0 && <span className="ml-1 text-text-muted">({history.length})</span>}
                </button>
            </div>
            <div>
                {tab === 'active' && (
                    active.length === 0 ? (
                        <div className="text-text-muted text-center py-8 text-[11px]">No active operations.</div>
                    ) : (
                        active.map((op) => (
                            <ActiveOpCard
                                key={`${op.corps_id}:${op.operation_name}:${op.started_turn}`}
                                op={op}
                                corpsName={getCorpsDisplayName(corpsNameById, op.corps_id)}
                            />
                        ))
                    )
                )}
                {tab === 'history' && (
                    sortedHistory.length === 0 ? (
                        <div className="text-text-muted text-center py-8 text-[11px]">No completed operations yet.</div>
                    ) : (
                        <>
                            {(() => {
                                const trend = buildOperationTrendSummary(sortedHistory);
                                return trend.trendNotice ? (
                                    <div className="mb-2 px-2 py-1 rounded bg-amber-500/5 border border-amber-500/20 text-[9px] text-amber-400/80">
                                        Command relationship: {trend.trendNotice}
                                    </div>
                                ) : null;
                            })()}
                            {sortedHistory.map((op) => (
                                <CompletedOpCard
                                    key={op.operation_id}
                                    op={op}
                                    corpsName={getCorpsDisplayName(corpsNameById, op.corps_id)}
                                    osidDisplayNames={osidDisplayNames}
                                />
                            ))}
                        </>
                    )
                )}
            </div>
        </div>
    );

    if (embedded) return body;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end pointer-events-none">
            <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose} />
            <div className="relative panel-slide-in-right pointer-events-auto w-[24rem] max-h-[calc(100vh-4rem)] mt-12 mr-2 flex flex-col bg-panel-bg/97 backdrop-blur-sm border border-panel-border rounded-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border shrink-0">
                    <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">Operations</span>
                    <button onClick={onClose} className="text-text-secondary hover:text-interactive text-sm leading-none">&#x2715;</button>
                </div>
                <div className="p-3 overflow-auto flex-1">{body}</div>
            </div>
        </div>
    );
}
