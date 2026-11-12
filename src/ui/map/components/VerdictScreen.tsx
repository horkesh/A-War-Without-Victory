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
import { lazy, Suspense, useState, useMemo, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import type { FactionVerdict, DimensionGrade, GameVerdict } from '../../../state/negotiation_types.js';
import { WarCostSummary } from './WarCostSummary';
import { TreatyLedger } from '../dayton_conference/TreatyLedger';
import { operativeOwners } from '../dayton_conference/annexes';

// Dayton screens load on demand, out of the entry chunk (vite.config.ts chunk-size limit).
const DaytonSettlementViewer = lazy(() => import('./DaytonSettlementViewer').then(m => ({ default: m.DaytonSettlementViewer })));
const BoundaryMap = lazy(() => import('../dayton_conference/BoundaryMap').then(m => ({ default: m.BoundaryMap })));
const DaytonSigningBeat = lazy(() => import('../dayton_conference/DaytonSigningBeat').then(m => ({ default: m.DaytonSigningBeat })));
import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult, MilestoneComparison, MilestoneComparisonStatus } from '../../../sim/endgame/endgame_comparison.js';
import { getPeacePlanById } from '../../../sim/negotiation/peace_plan_data.js';
// LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE: read-only consumption of ghost-entry
// discriminated campaign-context records for the Codex tab. Builder is pure/deterministic
// and refuses §6 sensitive-history flags via its own Ring guard.
import {
    buildGhostEntries,
    buildDynamicSections,
    type BuiltGhostEntry,
    type BuiltDynamicSection,
    type GhostRecordClassification,
} from '../../../sim/codex/dynamic_section_builder.js';
// T2-A / content C5 (orphaned-wiring audit): resolve the authored ghost-entry
// markdown body (EN/BCS) instead of rendering the raw repo path. §6-adjacent
// bodies are gated out inside the resolver.
import { parseGhostEntryProse, resolveGhostEntryProse } from '../data/ghostEntryProse.js';
// LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER: read-only turn scrubber for the
// Replay tab. Renders only when gameOver === true AND a save sequence has
// been plumbed into the loaded adapter. Consumes byte-identical save
// round-trip; does NOT advance turns or mutate engine state.
import { ReplayScrubber } from './replay/index.js';
import { Z } from '../../shared/zIndex.js';
import { FACTION_COLORS_SUBTLE } from '../utils/theme.js';
import { Modal } from '../../shared/Modal.js';
import { CinematicVerdict } from './verdict/CinematicVerdict.js';
import { t, useLocale, type MessageKey } from '../i18n';
import {
    getPlayerSafeDisplayLabel,
    getPlayerSafeMilitaryFactionName,
} from '../utils/playerSafeText.js';
import { turnToDateString } from '../utils/formatters.js';
import { isFieldedTacticalFormation } from '../../shared/playerVisibility';
import {
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SURFACE_MODAL_BACKDROP,
    SURFACE_MODAL_PANEL_COMPACT,
    SURFACE_MODAL_PANEL_FULL,
    SURFACE_PRIMARY_BUTTON_COMPACT,
    SURFACE_SECONDARY_BUTTON,
    SurfaceColumns,
    SurfaceContent,
    SurfaceEmpty,
    SurfaceHeader,
    SurfaceModalBody,
    SurfaceModalFooter,
    SurfacePanel,
    SurfaceRail,
    SurfaceRailItem,
    SurfaceSection,
    SurfaceSections,
    SurfaceStat,
} from './surface/Surface';

function verdictGhostClassificationLabel(classification: GhostRecordClassification): string {
    switch (classification) {
        case 'path_not_taken': return t('codex.record.pathNotTaken');
        case 'audit_context': return t('codex.record.auditContext');
        case 'divergence_context':
        default: return t('codex.record.divergenceContext');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Outcome Class & Condemnation Helpers (exported for testing)
// ═══════════════════════════════════════════════════════════════════════════

export function formatOutcomeClass(oc: string | undefined): string {
    const labels: Record<string, MessageKey> = {
        strategic_success: 'verdict.outcome.strategicSuccess',
        survival: 'verdict.outcome.survival',
        negotiated_escape: 'verdict.outcome.negotiatedEscape',
        pyrrhic_success: 'verdict.outcome.pyrrhicSuccess',
        hollow_victory: 'verdict.outcome.hollowVictory',
        failure: 'verdict.outcome.failure',
        collapse: 'verdict.outcome.collapse',
    };
    const key = labels[oc ?? ''];
    return key ? t(key) : t('verdict.outcome.unknown');
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
    const labels: Record<string, MessageKey> = {
        genocide_condemnation: 'verdict.condemnation.genocide',
        civilian_atrocities: 'verdict.condemnation.civilianAtrocities',
    };
    const key = labels[flag];
    return key ? t(key) : t('verdict.condemnation.unreported');
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
    const labels: Record<MilestoneComparisonStatus, MessageKey> = {
        early: 'verdict.milestone.status.early',
        late: 'verdict.milestone.status.late',
        on_time: 'verdict.milestone.status.onTime',
        absent: 'verdict.milestone.status.absent',
    };
    return t(labels[status]);
}

function formatWeekLabel(week: number | null): string {
    return week === null
        ? t('verdict.milestone.notRecorded')
        : t('verdict.milestone.weekLabel', { date: turnToDateString(week) });
}

function formatDeltaLabel(deltaWeeks: number | null): string {
    if (deltaWeeks === null) return t('verdict.milestone.noPlayerMatch');
    if (deltaWeeks === 0) return t('verdict.milestone.onHistoricalWeek');
    const direction = deltaWeeks < 0
        ? t('verdict.milestone.direction.early')
        : t('verdict.milestone.direction.late');
    return t('verdict.milestone.delta', { weeks: Math.abs(deltaWeeks), direction });
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
    const timingDirection = deltaWeeks < 0
        ? t('verdict.milestone.summary.direction.earlier')
        : t('verdict.milestone.summary.direction.later');

    return [rowFromMilestone({
        id: 'war_duration',
        label: t('verdict.milestone.warDuration'),
        historical_week: historicalWeek,
        player_week: costLedger.war_duration_weeks,
        delta_weeks: deltaWeeks,
        status,
        summary: deltaWeeks === 0
            ? t('verdict.milestone.summary.onTime')
            : t('verdict.milestone.summary.delta', { weeks: Math.abs(deltaWeeks), direction: timingDirection }),
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

type VerdictLoadSaveIPC = {
    isAvailable: boolean;
    loadStateDialog?: () => Promise<{ ok: boolean; stateJson?: string; error?: string }>;
};

type VerdictLoadSaveStateHandler = (stateJson: string) => void | Promise<void>;

type VerdictLoadSaveErrorHandler = (message: string) => void;

/**
 * Shared dialog-result handler for both the full verdict and fallback footers.
 * A successful, non-empty stateJson is handed to App's existing campaign
 * replacement owner; the screen never installs returned state itself.
 */
function useVerdictLoadSave(
    ipc: VerdictLoadSaveIPC,
    onLoadSaveState: VerdictLoadSaveStateHandler | undefined,
    onLoadSaveError: VerdictLoadSaveErrorHandler | undefined,
) {
    const [pending, setPending] = useState(false);
    const pendingRef = useRef(false);
    const canLoadSave = ipc.isAvailable
        && typeof ipc.loadStateDialog === 'function'
        && typeof onLoadSaveState === 'function';

    const handleLoadSave = async () => {
        if (!canLoadSave || !ipc.loadStateDialog || !onLoadSaveState || pendingRef.current) return;
        pendingRef.current = true;
        setPending(true);
        try {
            const result = await ipc.loadStateDialog();
            const stateJson = result?.stateJson;
            if (!result?.ok || typeof stateJson !== 'string' || stateJson.trim().length === 0) return;
            await onLoadSaveState(stateJson);
        } catch (err) {
            onLoadSaveError?.(err instanceof Error ? err.message : String(err));
        } finally {
            pendingRef.current = false;
            setPending(false);
        }
    };

    return { canLoadSave, pending, handleLoadSave };
}

function VerdictLoadSaveButton({
    ipc,
    onLoadSaveState,
    onLoadSaveError,
    className,
}: {
    ipc: VerdictLoadSaveIPC;
    onLoadSaveState: VerdictLoadSaveStateHandler | undefined;
    onLoadSaveError: VerdictLoadSaveErrorHandler | undefined;
    className: string;
}) {
    const { canLoadSave, pending, handleLoadSave } = useVerdictLoadSave(ipc, onLoadSaveState, onLoadSaveError);
    if (!canLoadSave) return null;
    return (
        <button
            type="button"
            onClick={() => { void handleLoadSave(); }}
            disabled={pending}
            aria-busy={pending}
            className={className}
        >
            {t('gameOver.loadSave')}
        </button>
    );
}

const LOWER_SECTION_LABEL_KEYS: Record<VerdictLowerSection, MessageKey> = {
    report: 'verdict.lowerSection.report',
    reckoning: 'verdict.lowerSection.reckoning',
    codex: 'verdict.lowerSection.codex',
    replay: 'verdict.lowerSection.replay',
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export interface VerdictScreenProps {
    /** App-owned campaign replacement callback (the Main Menu load-game path). */
    onLoadSaveState?: VerdictLoadSaveStateHandler;
    /** Existing loadError conduit for dialog/callback failures. */
    onLoadSaveError?: VerdictLoadSaveErrorHandler;
}

export function VerdictScreen({ onLoadSaveState, onLoadSaveError }: VerdictScreenProps = {}) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const startReplayInspection = useGameStore((s) => s.startReplayInspection);
    // The Wrapped overlay (Z.MODAL_RAISED) is opened FROM this screen's own
    // "View Your War" button but renders below GAME_OVER — without this,
    // it mounts permanently invisible underneath the still-open Verdict
    // screen (see docs/40_reports/20260805_VERDICT_WRAPPED_ZINDEX_BUG.md).
    const wrappedOpen = useGameStore((s) => s.wrappedOpen);
    const ipc = useIPC();
    const [locale] = useLocale();
    const [verdictSelection, setVerdictSelection] = useState<{ verdict: GameVerdict; faction: string } | null>(null);
    const [activeLowerSection, setActiveLowerSection] = useState<VerdictLowerSection>('report');
    // DC A5: the signing beat sits between final review and the Verdict, once per mount.
    const [signingSeen, setSigningSeen] = useState(false);

    // LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE: build ghost entries via useMemo.
    // CRITICAL: useMemo MUST be called before any early return to satisfy
    // the React Rules of Hooks — otherwise renders with/without verdict
    // call different numbers of hooks and React throws.
    const turnForCodex = loadedGameState?.turn ?? 0;
    const codexGhosts: BuiltGhostEntry[] = useMemo(() => {
        const rawState = loadedGameState?.rawGameState;
        if (!rawState) return [];
        try {
            return buildGhostEntries(rawState, turnForCodex);
        } catch {
            return [];
        }
    }, [loadedGameState, turnForCodex]);

    // §6 rupture-receipt un-hold (#78, panel-approved 2026-06-10): surface the
    // already-recorded Srebrenica genocide rupture as a somber, ICTY-grounded
    // entry at campaign close. READ-MODEL ONLY — `buildDynamicSections` observes
    // the locked `military.negotiation.rupture_consequences` array off the raw
    // GameState handle and writes nothing; it never records/flips/re-times the
    // rupture (owned by rupture_consequences.ts). The receipt emits ONLY when the
    // rupture is actually recorded (keyed on `srebrenica_genocide_1995`); unknown
    // ids emit nothing. The builder pins the receipt to `variant: 'divergence'`
    // and throws on any `outcome`-framed record — the genocide can never read as
    // a player-induced "win". useMemo MUST run before any early return (hooks).
    const ruptureReceipts: BuiltDynamicSection[] = useMemo(() => {
        const rawState = loadedGameState?.rawGameState;
        if (!rawState) return [];
        try {
            return buildDynamicSections({ state: rawState, currentTurn: turnForCodex }).filter(
                (s) => s.id.startsWith('rupture_receipt_'),
            );
        } catch {
            return [];
        }
    }, [loadedGameState, turnForCodex]);

    if (!loadedGameState?.gameOver) return null;

    const verdict = loadedGameState.gameVerdict;
    const turn = loadedGameState.turn ?? 0;
    const metadataDate = loadedGameState.metadata?.date;
    const date = metadataDate && metadataDate !== 'UNKNOWN' ? metadataDate : turnToDateString(turn);
    const years = Math.floor(turn / 52);
    const weeks = turn % 52;

    // DC A5: a signed Dayton opens on the initialling table, then the Verdict.
    const signedAgreement = loadedGameState.daytonAgreement?.version === 1 ? loadedGameState.daytonAgreement : undefined;
    if (signedAgreement && !signingSeen) {
        return (
            <div className="fixed inset-0" style={wrappedOpen ? { display: 'none' } : { zIndex: Z.GAME_OVER }}
                 data-awwv-endgame-surface="signing">
                <Modal
                    isOpen={!wrappedOpen}
                    dismissible={false}
                    zIndex={Z.GAME_OVER}
                    ariaLabel={t('dayton.signing.kicker')}
                    backdropClassName="bg-[#1c1b17]"
                    panelClassName="h-full w-full overflow-hidden"
                >
                    <Suspense fallback={null}>
                        <DaytonSigningBeat agreement={signedAgreement} fallbackDate={date} onContinue={() => setSigningSeen(true)} />
                    </Suspense>
                </Modal>
            </div>
        );
    }

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
        if (isFieldedTacticalFormation(f)) {
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
            onLoadSaveState={onLoadSaveState}
            onLoadSaveError={onLoadSaveError}
        />;
    }

    const playerFaction = loadedGameState.player_faction;
    const defaultFaction = playerFaction && verdict.faction_verdicts[playerFaction]
        ? playerFaction
        : factionIds.find(faction => Boolean(verdict.faction_verdicts[faction])) ?? factionIds[0];
    const selectedFaction = verdictSelection?.verdict === verdict
        && verdict.faction_verdicts[verdictSelection.faction]
        ? verdictSelection.faction
        : defaultFaction;
    const currentVerdict = verdict.faction_verdicts[selectedFaction];
    const milestoneRows = buildMilestoneComparisonRows(
        loadedGameState.costLedger,
        loadedGameState.historicalComparison,
    );
    const hasReckoning = Boolean(loadedGameState?.costLedger && loadedGameState?.historicalComparison);
    const hasCodex = codexGhosts.length > 0;
    const hasRuptureReceipts = ruptureReceipts.length > 0;
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

    // Surface redesign, step 4 (2026-11-12): the verdict is one surface in the Command
    // Surface style — header, the three factions in the left rail, the scene as the
    // banner of the middle column and the report, record, reckoning, campaign records
    // and replay under it as sections, the actions in a footer that never scrolls away.
    // Layout only: every figure, grade and sentence is the same as before.
    return (
        <div className="fixed inset-0"
             style={wrappedOpen ? { display: 'none' } : { zIndex: Z.GAME_OVER }}
             data-awwv-endgame-surface="verdict"
             data-awwv-endgame-outcome={verdict.outcome_label}
             data-awwv-verdict-focus={selectedFaction}>
            <Modal
                isOpen={!wrappedOpen}
                dismissible={false}
                zIndex={Z.GAME_OVER}
                ariaLabel={t('gameOver.title')}
                backdropClassName={SURFACE_MODAL_BACKDROP}
                panelClassName={SURFACE_MODAL_PANEL_FULL}
            >
                <SurfaceHeader eyebrow={t('gameOver.header', { date })} title={t('gameOver.title')} />

                <SurfaceColumns layout="rail-content">
                    <SurfaceRail as="div" aria-label={t('verdict.metric.focus')}>
                        {factionIds.map((fid) => {
                            const v = verdict.faction_verdicts[fid];
                            const active = fid === selectedFaction;
                            return (
                                <SurfaceRailItem
                                    key={fid}
                                    selected={active}
                                    onClick={() => setVerdictSelection({ verdict, faction: fid })}
                                    style={active ? { boxShadow: `inset 3px 0 0 ${FACTION_HEX[fid]}` } : undefined}
                                    title={<span className={FACTION_COLORS_SUBTLE[fid] ?? ''}>{FACTION_SHORT[fid] ?? fid}</span>}
                                    status={v ? (
                                        <span className="flex flex-col items-start gap-1.5">
                                            <span className="flex items-baseline gap-2">
                                                <span className="font-mono text-[18px] font-semibold tabular-nums text-[#f1e6c8]">
                                                    {v.pyrrhic_score.toFixed(1)}
                                                </span>
                                                <span className="text-[16px] font-bold"
                                                      style={{ color: GRADE_COLORS[v.grade] ?? '#9a9080' }}>
                                                    {v.grade}
                                                </span>
                                            </span>
                                            <span
                                                className={`inline-block rounded px-2 py-0.5 text-[14px] font-semibold ${getOutcomeClassStyle(v.outcome_class)}`}
                                                data-awwv-faction-tab-outcome={fid}
                                            >
                                                {formatOutcomeClass(v.outcome_class)}
                                            </span>
                                        </span>
                                    ) : undefined}
                                />
                            );
                        })}
                    </SurfaceRail>

                    <SurfaceContent
                        data-awwv-mobile-verdict-flow
                        data-awwv-mobile-section-active={activeLowerSection}>
                <CinematicVerdict
                    verdict={verdict}
                    costLedger={loadedGameState.costLedger}
                    historicalComparison={loadedGameState.historicalComparison}
                    focusFaction={selectedFaction}
                    dateLabel={date}
                    durationLabel={years > 0 ? `${years}y ${weeks}w` : `${weeks} weeks`}
                />

                    {lowerSections.length > 1 && (
                        <div className="shrink-0 border-b border-[#262b35] bg-[#141821] px-4 py-3 sm:hidden">
                            <div className="grid grid-cols-2 gap-2">
                                {lowerSections.map(section => {
                                    const active = activeLowerSection === section;
                                    return (
                                        <button
                                            key={section}
                                            type="button"
                                            onClick={() => setActiveLowerSection(section)}
                                            data-awwv-mobile-flow-tab={section}
                                            className={`min-h-11 rounded border px-2 text-[14px] font-semibold transition-colors ${
                                                active
                                                    ? 'border-[#c9a75c] bg-[#232936] text-[#f1e6c8]'
                                                    : 'border-[#3a4150] bg-[#1b2029] text-[#c2b69c] hover:border-accent-gold/60'
                                            }`}
                                            aria-pressed={active}
                                        >
                                            {t(LOWER_SECTION_LABEL_KEYS[section])}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <SurfaceSections>
                        <section className={`flex-col gap-6 ${activeLowerSection === 'report' ? 'flex' : 'hidden sm:flex'}`}
                                 data-awwv-mobile-section="report">
                {loadedGameState.daytonAgreement?.version === 1 ? (
                    <Suspense fallback={null}>
                        {/* The grade judges the war; this shows what the table changed (owner, 2026-11-08). */}
                        <TreatyLedger treaty={loadedGameState.daytonAgreement.treaty} signed />
                        {/* DC A3: the signed line against the front it ended. */}
                        <div className="rounded border border-[#a78e5c] bg-[#efe5cf] p-3">
                            <BoundaryMap special={loadedGameState.daytonAgreement.map.specialOsids}
                                owners={operativeOwners(loadedGameState.daytonAgreement.terms)} stages={[
                                { id: 'front', controllers: loadedGameState.daytonAgreement.map.wartimeControllers },
                                { id: 'signed', controllers: loadedGameState.daytonAgreement.map.controllers },
                            ]} />
                        </div>
                        <DaytonSettlementViewer agreement={loadedGameState.daytonAgreement} mode="signed" />
                    </Suspense>
                ) : verdict.dayton_result ? (
                    <p className="m-0 text-[16px] text-[#c2b69c]">{t('dayton.agreement.legacy')}</p>
                ) : null}

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
                        <SurfaceEmpty title="No verdict data for this faction." />
                    )}
                </div>
                        </section>

                {/* §6 Historical Record — rupture receipt (#78, panel-approved).
                    READ-MODEL ONLY: surfaces the already-recorded Srebrenica
                    genocide rupture as a somber, ICTY-grounded permanent entry
                    at campaign close. Renders ONLY when the rupture is actually
                    recorded (buildDynamicSections keys it on the locked finding;
                    unknown ids emit nothing). It is a CONSEQUENCE / record — never
                    a score, badge, or reward. Shown on the report tab on mobile so
                    the gravest event in the war is never buried behind a sub-tab. */}
                {hasRuptureReceipts && (
                    <section className={`rounded-md border border-red-400/35 bg-[#1a1316] px-6 py-5 sm:block ${mobileSectionClass('report')}`}
                             data-awwv-mobile-section="report"
                             data-awwv-rupture-receipts={ruptureReceipts.length}>
                        <div className="mb-3 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-red-200">
                            Historical Record
                        </div>
                        <ul className="m-0 flex list-none flex-col gap-3 p-0">
                            {ruptureReceipts.map((r) => (
                                <li key={r.id} className="max-w-[62rem] text-[17px] leading-relaxed text-[#ddd1b3]"
                                    data-awwv-rupture-receipt="true"
                                    data-awwv-rupture-receipt-variant={r.variant}>
                                    {r.content}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* War Reckoning — per-war cost ledger and historical comparison */}
                {hasReckoning && (
                    <section className={`border-t border-[#262b35] pt-6 sm:block ${mobileSectionClass('reckoning')}`}
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

                {/* Campaign Codex context records. Ring 2 narrative only. */}
                {hasCodex && (
                    <section className={`border-t border-[#262b35] pt-6 sm:block ${mobileSectionClass('codex')}`}
                             data-awwv-mobile-section="codex"
                             data-awwv-codex-ghosts={codexGhosts.length}>
                        <h4 className={`m-0 mb-3 ${SURFACE_LABEL}`}>
                            {t('codex.campaignContext.title')}
                        </h4>
                        <ul className="m-0 flex list-none flex-col gap-3 p-0">
                            {codexGhosts.map((g) => {
                                // T2-A / content C5: render the authored EN/BCS
                                // narrative body. §6-adjacent bodies resolve to
                                // null and fall back to the label only — never
                                // the raw repo path that was shown before.
                                const prose = resolveGhostEntryProse(g.ghost_id, locale);
                                const proseBlocks = prose === null
                                    ? []
                                    : parseGhostEntryProse(prose, g.classification);
                                const headingIndex = proseBlocks.findIndex((block) => block.kind === 'heading');
                                const rowTitle = headingIndex >= 0
                                    ? proseBlocks[headingIndex].text
                                    : verdictGhostClassificationLabel(g.classification);
                                const bodyBlocks = headingIndex >= 0
                                    ? proseBlocks.filter((_block, index) => index !== headingIndex)
                                    : proseBlocks;
                                return (
                                <li key={g.ghost_id} className="flex flex-col gap-1.5 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4 text-[16px] text-[#c2b69c]"
                                    data-awwv-ghost-variant={g.variant}
                                    data-awwv-ghost-classification={g.classification}
                                    data-awwv-ghost-has-prose={prose !== null ? 'true' : 'false'}>
                                    <div className="text-[18px] font-semibold text-[#f1e6c8]">{rowTitle}</div>
                                    <div className={SURFACE_LABEL_MUTED}>
                                        {verdictGhostClassificationLabel(g.classification)}
                                    </div>
                                    {bodyBlocks.length > 0 && (
                                        <div className="flex max-w-[62rem] flex-col gap-2 leading-relaxed text-[#ddd1b3]"
                                             data-awwv-ghost-prose>
                                            {bodyBlocks.map((block, index) => block.kind === 'heading' ? (
                                                <div key={index} className="font-semibold">{block.text}</div>
                                            ) : (
                                                <p key={index}>{block.text}</p>
                                            ))}
                                        </div>
                                    )}
                                </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {/* Replay — turn-by-turn scrub (LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER).
                    Stacked AFTER Codex tab (Mission E). Visible only when
                    gameOver === true (already gated above) AND a save sequence
                    has been plumbed into the loaded adapter. Read-only; does
                    NOT advance turns or mutate engine state. */}
                {hasReplay && (
                    <section className={`border-t border-[#262b35] pt-6 sm:block ${mobileSectionClass('replay')}`}
                             data-awwv-mobile-section="replay"
                             data-awwv-endgame-section="replay">
                        <ReplayScrubber
                            saveSequence={loadedGameState.replaySaveSequence}
                            saveManifest={loadedGameState.replaySaveManifest}
                            onInspectFrame={startReplayInspection}
                        />
                    </section>
                )}
                    </SurfaceSections>
                    </SurfaceContent>
                </SurfaceColumns>

                {/* Footer */}
                <SurfaceModalFooter className="justify-between">
                    <p className="m-0 min-w-0 flex-1 text-[16px] italic text-text-secondary">
                        {t('verdict.footer.tagline')}
                    </p>
                    <div className="flex flex-wrap justify-end gap-3">
                        <VerdictLoadSaveButton
                            ipc={ipc}
                            onLoadSaveState={onLoadSaveState}
                            onLoadSaveError={onLoadSaveError}
                            className={SURFACE_SECONDARY_BUTTON}
                        />
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className={SURFACE_SECONDARY_BUTTON}
                        >
                            {t('gameOver.newGame')}
                        </button>
                        <button
                            type="button"
                            onClick={() => useGameStore.getState().setWrappedOpen(true)}
                            className={SURFACE_PRIMARY_BUTTON_COMPACT}
                        >
                            {t('gameOver.viewYourWar')}
                        </button>
                    </div>
                </SurfaceModalFooter>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction Report Card
// ═══════════════════════════════════════════════════════════════════════════

export function EndgameMilestoneComparison({ rows }: { rows: EndgameMilestoneRow[] }) {
    useLocale();
    return (
        <div className="flex flex-col gap-3 pt-6"
             data-awwv-milestone-comparison={rows.length}>
            <div className={SURFACE_LABEL_MUTED}>
                {t('verdict.milestone.title')}
            </div>
            <div className="flex flex-col gap-2">
                {rows.map(row => (
                    <div key={row.id}
                         className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.7fr_0.7fr] items-start gap-4 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4"
                         data-awwv-milestone-status={row.status}>
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="text-[17px] font-semibold text-[#f1e6c8]">
                                {row.label}
                            </div>
                            <div className="text-[15px] leading-relaxed text-[#c2b69c]">
                                {row.summary}
                            </div>
                        </div>
                        <MilestoneCell label={t('verdict.milestone.cell.history')} value={row.historicalWeekLabel} />
                        <MilestoneCell label={t('verdict.milestone.cell.you')} value={row.playerWeekLabel} />
                        <MilestoneCell label={t('verdict.milestone.cell.delta')} value={row.deltaLabel} />
                        <MilestoneCell label={t('verdict.milestone.cell.status')} value={row.statusLabel} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function MilestoneCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <div className="text-[14px] text-[#9c917b]">
                {label}
            </div>
            <div className="break-words text-[15px] leading-snug tabular-nums text-[#f1e6c8]">
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
    useLocale();
    const color = FACTION_HEX[verdict.faction] ?? '#888';
    const cap = verdict.capital_breakdown;

    return (
        <div className="flex flex-col gap-7">
            {/* Pyrrhic Score Hero — always-visible primary signal, NOT collapsible. */}
            <div data-testid="faction-report-score" className="flex flex-col items-center gap-3 rounded-md border border-[#2a303c] bg-[#161a22] px-6 py-6 text-center">
                <div className={SURFACE_LABEL_MUTED}>
                    {t('verdict.report.pyrrhicScore')}
                </div>
                <div className={`text-[56px] font-bold tabular-nums leading-none ${FACTION_COLORS_SUBTLE[verdict.faction] ?? ''}`}>
                    {verdict.pyrrhic_score.toFixed(1)}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1"
                     style={{ borderColor: GRADE_COLORS[verdict.grade] ?? '#9a9080' }}>
                    <span className="text-[22px] font-bold"
                          style={{ color: GRADE_COLORS[verdict.grade] ?? '#9a9080' }}>
                        {verdict.grade}
                    </span>
                </div>
                {/* Outcome Classification */}
                <div className="text-center">
                    <span className={`inline-block rounded px-3 py-1.5 text-[15px] font-semibold ${getOutcomeClassStyle(verdict.outcome_class)}`}>
                        {formatOutcomeClass(verdict.outcome_class)}
                    </span>
                </div>
                {/* Condemnation Flags — shown only when present */}
                {verdict.condemnation_flags && verdict.condemnation_flags.length > 0 && (
                    <div className="w-full max-w-[44rem] rounded-md border border-red-400/40 bg-[#1a1316] px-5 py-4 text-left">
                        <div className="mb-2 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-red-200">
                            {t('verdict.report.internationalCondemnation')}
                        </div>
                        {verdict.condemnation_flags.map((flag: string, i: number) => (
                            <div key={i} className="text-[16px] leading-relaxed text-red-100">
                                {formatCondemnationFlag(flag)}
                            </div>
                        ))}
                    </div>
                )}
                <div className="mx-auto max-w-[44rem] text-[17px] italic leading-relaxed text-[#ddd1b3]">
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
                <summary className="sm:hidden mb-2 flex min-h-11 cursor-pointer list-none items-center justify-between rounded border border-[#3a4150] bg-[#1b2029] px-4 py-2">
                    <span className={SURFACE_LABEL}>
                        {t('verdict.report.capitalDimensions')}
                    </span>
                    <span className="text-[14px] text-[#b9ad94]">
                        {t('verdict.report.dimensionBars', { count: verdict.dimension_grades.length })}
                    </span>
                </summary>
                <div className={`mb-3 hidden sm:block ${SURFACE_LABEL}`}>
                    {t('verdict.report.capitalDimensions')}
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
                <summary className="sm:hidden mb-2 flex min-h-11 cursor-pointer list-none items-center justify-between rounded border border-[#3a4150] bg-[#1b2029] px-4 py-2">
                    <span className={SURFACE_LABEL}>
                        {t('verdict.report.finalStatistics')}
                    </span>
                    <span className="text-[14px] text-[#b9ad94]">
                        {t('verdict.report.tapToToggle')}
                    </span>
                </summary>
                <div className={`mb-3 hidden sm:block ${SURFACE_LABEL}`}>
                    {t('verdict.report.finalStatistics')}
                </div>
                <div className="grid grid-cols-2 gap-x-8 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-2">
                    <StatRow label={t('verdict.report.stat.territory')} value={`${((factionOsids / totalOsids) * 100).toFixed(1)}% (${factionOsids} settlements)`} />
                    {cap && (
                        <>
                            <StatRow label={t('verdict.report.stat.territoryKm2')} value={`${Math.round(cap.territory_controlled_km2).toLocaleString()} km\u00b2`} />
                            <StatRow label={t('verdict.report.stat.activeBrigades')} value={String(brigadeCount)} />
                            <StatRow label={t('verdict.report.stat.personnel')} value={personnel.toLocaleString()} />
                            <StatRow label={t('verdict.report.stat.casualtiesInflicted')} value={cap.military_casualties_inflicted.toLocaleString()} />
                            <StatRow label={t('verdict.report.stat.casualtiesTaken')} value={cap.military_casualties_taken.toLocaleString()} />
                            <StatRow label={t('verdict.report.stat.civiliansProtected')} value={cap.civilians_under_protection.toLocaleString()} />
                            <StatRow label={t('verdict.report.stat.refugeesCreated')} value={cap.refugees_created.toLocaleString()} />
                            <StatRow label={t('verdict.report.stat.refugeesReceived')} value={cap.refugees_received.toLocaleString()} />
                            <StatRow label={t('verdict.report.stat.operationsLaunched')} value={String(cap.operations_launched)} />
                            <StatRow label={t('verdict.report.stat.operationsSuccessful')} value={String(cap.operations_successful)} />
                            {cap.enclaves_held.length > 0 && (
                                <StatRow label={t('verdict.report.stat.enclavesHeld')} value={cap.enclaves_held.map(titleCase).join(', ')} />
                            )}
                            {cap.enclaves_lost.length > 0 && (
                                <StatRow label={t('verdict.report.stat.enclavesLost')} value={cap.enclaves_lost.map(titleCase).join(', ')} />
                            )}
                            {cap.peace_plans_accepted.length > 0 && (
                                <StatRow label={t('verdict.report.stat.plansAccepted')} value={cap.peace_plans_accepted.map(formatPeacePlanName).join(', ')} />
                            )}
                            {cap.peace_plans_rejected.length > 0 && (
                                <StatRow label={t('verdict.report.stat.plansRejected')} value={cap.peace_plans_rejected.map(formatPeacePlanName).join(', ')} />
                            )}
                            {cap.war_crimes_events > 0 && (
                                <StatRow label={t('verdict.report.stat.warCrimesEvents')} value={String(cap.war_crimes_events)} />
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
                    <summary className="sm:hidden mb-2 flex min-h-11 cursor-pointer list-none items-center justify-between rounded border border-[#3a4150] bg-[#1b2029] px-4 py-2">
                        <span className={SURFACE_LABEL}>
                            {t('verdict.daytonAgreement')}
                        </span>
                        <span className="text-[14px] text-[#b9ad94]">
                            {t('verdict.tapToToggle')}
                        </span>
                    </summary>
                    <div className={`mb-3 hidden sm:block ${SURFACE_LABEL}`}>
                        {t('verdict.daytonAgreement')}
                    </div>
                    <div className="flex flex-col gap-2 text-[16px] leading-relaxed text-[#c2b69c]">
                        {daytonResult.territorial_packages_accepted.length > 0 && (
                            <div>
                                <span className="text-text-primary font-semibold">{t('verdict.packagesAccepted')} </span>
                                {daytonResult.territorial_packages_accepted.map(formatDaytonPackageLabel).join(', ')}
                            </div>
                        )}
                        {daytonResult.territorial_packages_rejected.length > 0 && (
                            <div>
                                <span className="text-text-primary font-semibold">{t('verdict.packagesRejected')} </span>
                                {daytonResult.territorial_packages_rejected.map(formatDaytonPackageLabel).join(', ')}
                            </div>
                        )}
                        {Object.keys(daytonResult.institutional_choices).length > 0 && (
                            <div>
                                <span className="text-text-primary font-semibold">{t('verdict.institutions')} </span>
                                {Object.entries(daytonResult.institutional_choices)
                                    .map(([k, v]) => `${formatDaytonInstitutionLabel(k)}: ${formatDaytonInstitutionValue(v)}`)
                                    .join('; ')}
                            </div>
                        )}
                        {daytonResult.final_territory_split && (
                            <div>
                                <span className="text-text-primary font-semibold">{t('verdict.finalSplit')} </span>
                                {Object.entries(daytonResult.final_territory_split)
                                    .map(([k, v]) => `${getPlayerSafeMilitaryFactionName(k, k)} ${(v as number).toFixed(1)}%`)
                                    .join(', ')}
                            </div>
                        )}
                        {daytonResult.patron_overrides_applied.length > 0 && (
                            <div className="text-faction-rs-subtle">
                                <span className="font-semibold">{t('verdict.patronOverrides')} </span>
                                {daytonResult.patron_overrides_applied.map(formatDaytonPatronOverride).join(', ')}
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

function formatDimensionLabel(dg: DimensionGrade): string {
    const labels: Record<string, MessageKey> = {
        military_credibility: 'verdict.dimension.militaryCredibility',
        territorial_legitimacy: 'verdict.dimension.territorialLegitimacy',
        international_standing: 'verdict.dimension.internationalStanding',
        patron_confidence: 'verdict.dimension.patronConfidence',
        internal_cohesion: 'verdict.dimension.internalCohesion',
        negotiating_leverage: 'verdict.dimension.negotiatingLeverage',
    };
    const key = labels[dg.dimension];
    return key ? t(key) : dg.label;
}

function formatDaytonPackageLabel(id: string): string {
    const labels: Record<string, MessageKey> = {
        package_a: 'verdict.dayton.package.packageA',
        package_b: 'verdict.dayton.package.packageB',
    };
    const key = labels[id];
    return key ? t(key) : id;
}

function formatDaytonInstitutionLabel(key: string): string {
    const labels: Record<string, MessageKey> = {
        presidency: 'verdict.dayton.institution.presidency',
    };
    const messageKey = labels[key];
    return messageKey ? t(messageKey) : key;
}

function formatDaytonInstitutionValue(value: string): string {
    const labels: Record<string, MessageKey> = {
        decentralized: 'verdict.dayton.institutionValue.decentralized',
        centralized: 'verdict.dayton.institutionValue.centralized',
    };
    const key = labels[value];
    return key ? t(key) : value;
}

function formatDaytonPatronOverride(id: string): string {
    const labels: Record<string, MessageKey> = {
        belgrade_pressure: 'verdict.dayton.patronOverride.belgradePressure',
    };
    const key = labels[id];
    return key ? t(key) : id;
}

function DimensionBar({ dg, factionColor }: { dg: DimensionGrade; factionColor: string }) {
    const gradeColor = GRADE_COLORS[dg.grade] ?? '#9a9080';
    const barWidth = Math.max(2, Math.min(100, dg.score));

    return (
        <div className="grid grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)_2.75rem_2rem] items-center gap-4">
            <div className="truncate text-[16px] text-[#c2b69c]">
                {formatDimensionLabel(dg)}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#262b35]">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: factionColor, opacity: 0.7 }}
                />
            </div>
            <div className="text-right font-mono text-[16px] tabular-nums text-[#f1e6c8]">
                {Math.round(dg.score)}
            </div>
            <div className="text-right text-[16px] font-bold" style={{ color: gradeColor }}>
                {dg.grade}
            </div>
        </div>
    );
}

function StatRow({ label, value }: { label: string; value: string }) {
    return <SurfaceStat label={label} value={value} />;
}

function titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPeacePlanName(planId: string): string {
    return getPeacePlanById(planId)?.name ?? getPlayerSafeDisplayLabel(planId, 'Peace plan');
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
    return keys ? { title: t(keys.title), subtitle: t(keys.subtitle) } : { title: t('gameOver.outcome.unreported.title'), subtitle: '' };
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
    onLoadSaveState, onLoadSaveError,
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
    ipc: VerdictLoadSaveIPC;
    onLoadSaveState: VerdictLoadSaveStateHandler | undefined;
    onLoadSaveError: VerdictLoadSaveErrorHandler | undefined;
}) {
    useLocale();
    const display = fallbackOutcomeDisplay(outcome);
    // Same yield-to-Wrapped fix as the main verdict branch above — see
    // docs/40_reports/20260805_VERDICT_WRAPPED_ZINDEX_BUG.md.
    const wrappedOpen = useGameStore((s) => s.wrappedOpen);

    return (
        <div className="fixed inset-0"
             style={wrappedOpen ? { display: 'none' } : { zIndex: Z.GAME_OVER }}
             data-awwv-endgame-surface="fallback"
             data-awwv-endgame-outcome={display.title}>
            <Modal
                isOpen={!wrappedOpen}
                dismissible={false}
                zIndex={Z.GAME_OVER}
                ariaLabel={t('gameOver.title')}
                backdropClassName={SURFACE_MODAL_BACKDROP}
                panelClassName={SURFACE_MODAL_PANEL_COMPACT}
            >
                <SurfaceHeader eyebrow={t('gameOver.header', { date })} title={display.title} />
                <SurfaceModalBody>
                    {display.subtitle && (
                        <p className="m-0 max-w-[48rem] text-[18px] leading-relaxed text-[#ddd1b3]">{display.subtitle}</p>
                    )}
                    <SurfaceSection label={t('gameOver.finalStandings')}>
                        <div className="flex flex-col gap-2.5">
                            {factionIds.map((fid) => {
                                const color = FACTION_HEX[fid] ?? '#888';
                                const osids = factionOsids[fid] ?? 0;
                                const pct = ((osids / totalOsids) * 100).toFixed(1);
                                const brigades = factionBrigades[fid] ?? 0;
                                return (
                                    <SurfacePanel key={fid} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                                                <span className={`text-[18px] font-semibold ${FACTION_COLORS_SUBTLE[fid] ?? 'text-text-primary'}`}>{getPlayerSafeMilitaryFactionName(fid, fid)}</span>
                                            </div>
                                            <span className="font-mono text-[18px] font-semibold tabular-nums text-[#f1e6c8]">{pct}%</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[16px] text-[#c2b69c]">
                                            <span>{formatFallbackOsidsControlled(osids)}</span>
                                            <span>{formatFallbackActiveBrigades(brigades)}</span>
                                        </div>
                                        <div className="h-2.5 overflow-hidden rounded-full bg-[#262b35]">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                        </div>
                                    </SurfacePanel>
                                );
                            })}
                        </div>
                    </SurfaceSection>
                    <p className="m-0 border-t border-[#262b35] pt-3 text-[16px] text-[#b9ad94]">
                        {t('gameOver.campaignLasted', {
                            turn,
                            years: formatFallbackYearCount(years),
                            weeks: formatFallbackWeekCount(weeks),
                        })}
                    </p>
                </SurfaceModalBody>
                <SurfaceModalFooter>
                    <VerdictLoadSaveButton
                        ipc={ipc}
                        onLoadSaveState={onLoadSaveState}
                        onLoadSaveError={onLoadSaveError}
                        className={SURFACE_SECONDARY_BUTTON}
                    />
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className={SURFACE_SECONDARY_BUTTON}
                    >
                        {t('gameOver.newGame')}
                    </button>
                    <button
                        type="button"
                        onClick={() => useGameStore.getState().setWrappedOpen(true)}
                        className={SURFACE_PRIMARY_BUTTON_COMPACT}
                    >
                        {t('gameOver.viewYourWar')}
                    </button>
                </SurfaceModalFooter>
            </Modal>
        </div>
    );
}
