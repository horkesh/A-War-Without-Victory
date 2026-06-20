/**
 * AutonomyPanel — Command Autonomy control surface for v0.8.4 Phase C.
 *
 * Two sections:
 *  1. Autonomy Slider — 4-button selector for levels 0–3 (Full Control / Assisted /
 *     Delegated / Observer). Levels 2–3 show "(not yet unlocked)" when the backend
 *     returns level_2_plus_not_yet_enabled.
 *  2. Proposal Review (READ-ONLY) — visible only when autonomy_level === 1 and there
 *     are pending proposals. Renders unresolved PendingProposalReview items for SCAN;
 *     the accept (commit) / withhold approval decision is issued from the Presidential
 *     Decision Room (DirectiveCard, review_proposal directive), not here. FULL
 *     DECISION-ROOM CONVERGENCE — every "approve/deny a general's proposal" happens at
 *     the one command desk.
 *
 * State management: local React state only — no global store.
 * IPC: calls window.awwv.getAutonomyState / setAutonomyLevel (the proposal accept/reject
 *      IPC now lives in the Decision Room's DirectiveCard via useIPC).
 */
import { useEffect, useState, useCallback } from 'react';
import { GlassPanel } from './GlassPanel';
import { OfficerDossierPanel } from './OfficerDossierPanel';
import { playerFactionMatch } from '../data/playerFactionMatch';
import { getPlayerSafeCorpsName } from '../utils/playerSafeText';
import { toTitleCase } from '../utils/formatters';
import { t, type MessageKey } from '../i18n';
import type { NamedOfficerView } from '../data/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PendingProposalReview {
    id: string;
    turn: number;
    faction: string;
    domain: 'military' | 'political' | 'events' | 'ops';
    description: string;
    proposed_action: string;
    current_value?: string;
    proposed_value?: string;
    accepted?: boolean;
    resolved_turn?: number;
}

/**
 * Phase 2 slice 1 "Back the Officer": named-officer decision card joined to a
 * pending 'ops' proposal. Built main-side by buildOpProposalCardData and keyed
 * to a proposal by proposal_id. Decision-only; never staged.
 */
export interface OpProposalCard {
    proposal_id: string;
    corps_id: string;
    corps_name: string;
    plan_id: string;
    op_id: string | null;
    op_name: string;
    commander: { officer_id: string; name: string; rank?: string; display: string } | null;
    force_ratio_estimate: number | null;
    commander_assessment: 'launch' | 'postpone' | 'abort' | null;
    override_available: boolean;
    override_ca_cost: number;
}

interface AutonomyState {
    autonomy_level: number;
    autonomy_level_pending?: number;
    autonomy_overrides?: Record<string, unknown>;
    pending_proposal_reviews?: PendingProposalReview[];
    op_proposal_cards?: OpProposalCard[];
}

export function filterPendingProposalsForPlayer(
    proposals: PendingProposalReview[] | undefined,
    playerFaction: string | null | undefined,
): PendingProposalReview[] {
    if (!Array.isArray(proposals)) return [];
    return proposals.filter((proposal) => playerFactionMatch(proposal.faction, playerFaction));
}

// Minimal extension of window.awwv for autonomy Phase C methods.
// The full WindowAwwv type lives in useIPC.ts; this covers only what we need here.
interface AutonomyBridge {
    getAutonomyState: () => Promise<AutonomyState>;
    setAutonomyLevel: (level: number) => Promise<{ ok: boolean; error?: string }>;
    // accept/reject-proposal IPC moved to the Presidential Decision Room
    // (DirectiveCard, review_proposal directive via useIPC). This panel is read-only
    // for the proposal queue; it keeps only the autonomy-level state bridge.
}

function getAutonomyBridge(): AutonomyBridge | undefined {
    return typeof window !== 'undefined'
        ? (window as Window & { awwv?: AutonomyBridge }).awwv
        : undefined;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LEVEL_LABEL_KEYS: Record<number, MessageKey> = {
    0: 'autonomy.level.fullControl',
    1: 'autonomy.level.assisted',
    2: 'autonomy.level.delegated',
    3: 'autonomy.level.observer',
};

const LEVEL_DESC_KEYS: Record<number, MessageKey> = {
    0: 'autonomy.level.fullControl.desc',
    1: 'autonomy.level.assisted.desc',
    2: 'autonomy.level.delegated.desc',
    3: 'autonomy.level.observer.desc',
};

// Phase 2 slice 1: commander go/no-go → assessment label key (typed, no cast).
const ASSESSMENT_LABEL_KEYS: Record<'launch' | 'postpone' | 'abort', MessageKey> = {
    launch: 'autonomy.proposal.assessment.launch',
    postpone: 'autonomy.proposal.assessment.postpone',
    abort: 'autonomy.proposal.assessment.abort',
};

const PROPOSAL_VALUE_LABEL_KEYS: Record<string, MessageKey> = {
    pending: 'autonomy.proposal.value.pending',
    pending_review: 'autonomy.proposal.value.pendingReview',
    approve: 'autonomy.proposal.value.approve',
    approved: 'autonomy.proposal.value.approved',
    reject: 'autonomy.proposal.value.reject',
    rejected: 'autonomy.proposal.value.rejected',
    balanced: 'autonomy.proposal.value.balanced',
    offensive: 'autonomy.proposal.value.offensive',
    defensive: 'autonomy.proposal.value.defensive',
};

const PROPOSAL_DOMAIN_LABEL_KEYS: Record<PendingProposalReview['domain'], MessageKey> = {
    military: 'autonomy.proposal.domain.military',
    political: 'autonomy.proposal.domain.political',
    events: 'autonomy.proposal.domain.events',
    ops: 'autonomy.proposal.opOrder',
};

function formatProposalValue(value: string | undefined): string {
    const safeValue = (value ?? '').trim();
    if (!safeValue) return '—';
    const labelKey = PROPOSAL_VALUE_LABEL_KEYS[safeValue.toLowerCase()];
    if (labelKey) return t(labelKey);
    return toTitleCase(safeValue.replace(/[:\-\s]+/g, '_'));
}

function formatProposalDomain(domain: PendingProposalReview['domain']): string {
    return t(PROPOSAL_DOMAIN_LABEL_KEYS[domain] ?? 'autonomy.proposal.domain.generic');
}

// ── ProposalCard ───────────────────────────────────────────────────────────

interface ProposalCardProps {
    proposal: PendingProposalReview;
    /** Phase 2 slice 1: named-officer decision card for an 'ops' proposal (joined main-side). */
    opCard?: OpProposalCard;
    /**
     * Phase 2 "Officer Dossier": open the dossier for the proposing officer by id.
     * Only wired when the officer can be resolved in namedOfficerData; otherwise the
     * commander name renders as plain text.
     */
    onInspectOfficer?: (officerId: string) => void;
    /** True when the proposing officer has a dossier available (clickable name). */
    inspectable?: boolean;
}

/** Force ratio → label colour. <1 is unfavourable (defender stronger). */
function ratioClass(ratio: number): string {
    if (ratio >= 2) return 'text-green-300';
    if (ratio >= 1) return 'text-[#d4d0c8]';
    return 'text-red-300';
}

function ProposalCard({ proposal, opCard, onInspectOfficer, inspectable }: ProposalCardProps) {
    const resolved = proposal.accepted !== undefined;

    // Parse a readable corps label from proposed_action.
    // Supported formats:
    //   SET_STANCE:<corps_id>:<stance>  → domain 'military'
    //   APPROVE_OP:<corps_id>:<plan_id> → domain 'ops'
    let corpsLabel = '';
    const parts = proposal.proposed_action.split(':');
    const isOp = parts[0] === 'APPROVE_OP';
    if ((parts[0] === 'SET_STANCE' || isOp) && parts[1]) {
        // e.g. "arbih_1st_corps" → "1st Corps" (strips leaked faction prefix).
        // Falls back to the humanized slug only when no corps resolves.
        corpsLabel = getPlayerSafeCorpsName(
            parts[1],
            parts[1],
            parts[1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        );
    } else {
        corpsLabel = proposal.description.split('.')[0] ?? proposal.domain;
    }
    // Prefer the joined card's player-facing corps name when present.
    if (opCard?.corps_name) corpsLabel = opCard.corps_name;

    const statusIndicator = resolved
        ? proposal.accepted
            ? { label: t('autonomy.proposal.accepted'), cls: 'text-green-400 border-green-500/30 bg-green-900/10' }
            : { label: t('autonomy.proposal.rejected'), cls: 'text-red-400 border-red-500/30 bg-red-900/10' }
        : null;

    return (
        <div
            className={`rounded border px-3 py-2.5 space-y-1.5 transition-opacity ${
                resolved
                    ? 'border-white/5 bg-black/10 opacity-50'
                    : 'border-white/10 bg-black/25'
            }`}
        >
            {/* Corps / domain header */}
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[#c4a04a] font-semibold tracking-wide truncate">
                    {isOp ? t('autonomy.proposal.opOrderFor', { corps: corpsLabel }) : corpsLabel}
                </span>
                <span className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.15em] shrink-0">
                    {formatProposalDomain(proposal.domain)}
                </span>
            </div>

            {/* Phase 2 slice 1: named-officer voice for an op proposal. */}
            {isOp && opCard && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        {opCard.commander && inspectable && onInspectOfficer ? (
                            <button
                                type="button"
                                onClick={() => {
                                    const id = opCard.commander?.officer_id;
                                    if (id) onInspectOfficer(id);
                                }}
                                title={t('officerDossier.title')}
                                className="text-[#c4a04a] truncate text-left underline decoration-dotted underline-offset-2 hover:text-[#e0c068] focus:outline-none focus:text-[#e0c068] transition-colors"
                            >
                                {opCard.commander.display}
                            </button>
                        ) : (
                            <span className="text-[#d4d0c8] truncate">
                                {opCard.commander
                                    ? opCard.commander.display
                                    : t('autonomy.proposal.fieldCommander')}
                            </span>
                        )}
                        {opCard.force_ratio_estimate != null && (
                            <span className={`shrink-0 ${ratioClass(opCard.force_ratio_estimate)}`}>
                                {t('autonomy.proposal.forceRatio', { ratio: opCard.force_ratio_estimate.toFixed(1) })}
                            </span>
                        )}
                    </div>
                    {opCard.commander_assessment && (
                        <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#8a8578]">
                            {t(ASSESSMENT_LABEL_KEYS[opCard.commander_assessment])}
                        </div>
                    )}
                </div>
            )}

            {/* Stance change arrow (non-op proposals) */}
            {!isOp && (proposal.current_value || proposal.proposed_value) && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-[#8a8578]">{formatProposalValue(proposal.current_value)}</span>
                    <span className="text-[#c4a04a]/60">→</span>
                    <span className="text-[#d4d0c8]">{formatProposalValue(proposal.proposed_value)}</span>
                </div>
            )}

            {/* Description (truncated) */}
            <p className="text-[9px] text-[#8a8578] leading-snug line-clamp-2">
                {proposal.description}
            </p>

            {/* Action row */}
            {statusIndicator ? (
                <div className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-[0.15em] ${statusIndicator.cls}`}>
                    {statusIndicator.label}
                </div>
            ) : (
                // FULL DECISION-ROOM CONVERGENCE: the accept (commit) / withhold approval
                // actions moved to the Presidential Decision Room (DirectiveCard,
                // review_proposal directive). This card is now read-only/inspect — it shows
                // the pending proposal so the player can READ it, but the approve/deny
                // decision is issued at the one command desk. (Mirrors how OperationsSection
                // was reduced to read-only "Review Command Decision".)
                <div className="inline-flex items-center px-2 py-0.5 rounded border border-[#c4a04a]/25 bg-[#c4a04a]/[0.06] text-[9px] font-mono uppercase tracking-[0.15em] text-[#c4a04a]/80">
                    {t('autonomy.proposal.decideInDecisionRoom')}
                </div>
            )}
        </div>
    );
}

// ── AutonomyPanel ──────────────────────────────────────────────────────────

export interface AutonomyPanelProps {
    onClose: () => void;
    playerFaction: string | null;
    /**
     * Officer Dossier source (Phase 2 "back the officer"): the merged officer
     * projection from LoadedGameState. Used to resolve a proposing officer by id
     * and open their dossier. Optional — when absent, commander names render as
     * plain text (no dossier link).
     */
    namedOfficerData?: NamedOfficerView[];
}

export function AutonomyPanel({ onClose, playerFaction, namedOfficerData }: AutonomyPanelProps) {
    // Officer Dossier: which officer (if any) is currently being inspected.
    const [dossierOfficerId, setDossierOfficerId] = useState<string | null>(null);
    const [autonomyState, setAutonomyState] = useState<AutonomyState | null>(null);
    const [loading, setLoading] = useState(true);
    const [levelError, setLevelError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const bridge = getAutonomyBridge();

    const refresh = useCallback(async () => {
        if (!bridge) {
            setLoading(false);
            return;
        }
        try {
            const state = await bridge.getAutonomyState();
            setAutonomyState(state);
        } catch (err) {
            console.warn('[AutonomyPanel] getAutonomyState failed:', err);
        } finally {
            setLoading(false);
        }
    }, [bridge]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const handleSetLevel = async (level: number) => {
        if (!bridge) return;
        setLevelError(null);
        setBusy(true);
        try {
            const result = await bridge.setAutonomyLevel(level);
            if (!result.ok && result.error) {
                if (result.error === 'level_2_plus_not_yet_enabled') {
                    setLevelError(t('autonomy.levelsLocked'));
                } else {
                    setLevelError(result.error);
                }
            } else {
                await refresh();
            }
        } catch (err) {
            console.warn('[AutonomyPanel] setAutonomyLevel failed:', err);
        } finally {
            setBusy(false);
        }
    };

    // FULL DECISION-ROOM CONVERGENCE: the proposal accept (acceptProposal) / withhold
    // (rejectProposal) approval actions moved to the Presidential Decision Room
    // (DirectiveCard, review_proposal directive). Force-launch (proposal override +
    // proactive held-ready override) likewise lives there (force_launch directive). This
    // panel now hosts only the autonomy-level selector + a READ-ONLY Level-1 review list
    // (pending proposals are shown for scan; the approve/deny decision is issued at the
    // Decision Room command desk).

    const currentLevel = autonomyState?.autonomy_level ?? 0;
    const pendingLevel = autonomyState?.autonomy_level_pending;
    const proposals = filterPendingProposalsForPlayer(autonomyState?.pending_proposal_reviews, playerFaction);
    const unresolvedCount = proposals.filter((p) => p.accepted === undefined).length;
    // Index op decision cards by proposal id (Phase 2 slice 1).
    const opCardsById = new Map<string, OpProposalCard>();
    for (const card of autonomyState?.op_proposal_cards ?? []) opCardsById.set(card.proposal_id, card);
    // Officer Dossier: index officers by id so a proposing officer can be resolved.
    const officerById = new Map<string, NamedOfficerView>();
    for (const officer of namedOfficerData ?? []) officerById.set(officer.id, officer);
    const dossierOfficer = dossierOfficerId ? officerById.get(dossierOfficerId) ?? null : null;
    const inspectOfficer = (officerId: string) => {
        if (officerById.has(officerId)) setDossierOfficerId(officerId);
    };

    return (
        <>
        <GlassPanel position="right" title={t('autonomy.title')} width="288px" onClose={onClose}>
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#c4a04a]/40 border-t-[#c4a04a] rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-5">
                    {/* IPC unavailable notice */}
                    {!bridge && (
                        <div className="text-[9px] font-mono text-[#8a8578] bg-black/20 border border-white/5 rounded px-2.5 py-1.5">
                            {t('autonomy.electronRequired')}
                        </div>
                    )}

                    {/* ── Autonomy Level Selector ── */}
                    <div className="space-y-2">
                        <div className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                            {t('autonomy.level')}
                        </div>

                        {([0, 1, 2, 3] as const).map((level) => {
                            const isActive = currentLevel === level;
                            const isPending = pendingLevel === level && !isActive;
                            const isLocked = level >= 2;

                            return (
                                <button
                                    key={level}
                                    onClick={() => void handleSetLevel(level)}
                                    disabled={busy || !bridge}
                                    className={`w-full text-left px-2.5 py-2 rounded border transition-all disabled:cursor-not-allowed ${
                                        isActive
                                            ? 'border-[#c4a04a]/50 bg-[#c4a04a]/8'
                                            : 'border-white/5 bg-black/20 hover:border-white/15 hover:bg-black/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {/* Active indicator */}
                                            <div
                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                    isActive
                                                        ? 'bg-[#c4a04a] shadow-[0_0_4px_rgba(196,160,74,0.6)]'
                                                        : 'bg-white/15'
                                                }`}
                                            />
                                            <span
                                                className={`text-[11px] font-mono font-medium ${
                                                    isActive ? 'text-[#c4a04a]' : 'text-[#d4d0c8]'
                                                }`}
                                            >
                                                {level} - {t(LEVEL_LABEL_KEYS[level])}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isPending && (
                                                <span className="text-[8px] font-mono text-[#c4a04a]/60 uppercase tracking-wide">
                                                    {t('autonomy.pending')}
                                                </span>
                                            )}
                                            {isLocked && (
                                                <span className="text-[8px] font-mono text-[#8a8578]/70 uppercase tracking-wide">
                                                    {t('autonomy.soon')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-[#8a8578] mt-0.5 ml-3.5 leading-snug">
                                        {t(LEVEL_DESC_KEYS[level])}
                                    </div>
                                </button>
                            );
                        })}

                        {/* Level error */}
                        {levelError && (
                            <div className="text-[9px] font-mono text-amber-400/80 bg-amber-900/10 border border-amber-500/20 rounded px-2 py-1">
                                {levelError}
                            </div>
                        )}
                    </div>

                    {/* ── Pending Proposals (Level 1 only) ── */}
                    {currentLevel === 1 && proposals.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                                    {t('autonomy.pendingProposals')}
                                </div>
                                {unresolvedCount > 0 && (
                                    <span className="text-[9px] font-mono text-[#c4a04a] bg-[#c4a04a]/10 border border-[#c4a04a]/25 rounded px-1.5 py-0.5">
                                        {unresolvedCount}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                {proposals.map((proposal) => {
                                    const card = opCardsById.get(proposal.id);
                                    const commanderId = card?.commander?.officer_id;
                                    const inspectable = Boolean(commanderId && officerById.has(commanderId));
                                    return (
                                        <ProposalCard
                                            key={proposal.id}
                                            proposal={proposal}
                                            opCard={card}
                                            onInspectOfficer={inspectOfficer}
                                            inspectable={inspectable}
                                        />
                                    );
                                })}
                            </div>

                            {unresolvedCount === 0 && (
                                <div className="text-[9px] font-mono text-[#8a8578] text-center py-1">
                                    {t('autonomy.allResolved')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Force-an-operation (proactive override of a held-ready plan) moved to
                        the Presidential Decision Room (DirectiveCard, force_launch directive
                        via the proactive-force-launch cards). */}

                    {/* Refresh button */}
                    {bridge && (
                        <button
                            onClick={() => void refresh()}
                            disabled={busy}
                            className="w-full py-1 text-[9px] font-mono uppercase tracking-[0.15em] text-[#8a8578] hover:text-[#d4d0c8] border border-white/5 hover:border-white/10 rounded transition-all disabled:opacity-40"
                        >
                            {t('autonomy.refresh')}
                        </button>
                    )}
                </div>
            )}
        </GlassPanel>
        {/* Officer Dossier overlay (Phase 2 "back the officer"): read-only inspection
            of the proposing officer. Keyboard-dismissible via GlassPanel (Escape). */}
        {dossierOfficer && (
            <OfficerDossierPanel
                officer={dossierOfficer}
                onClose={() => setDossierOfficerId(null)}
            />
        )}
        </>
    );
}

export default AutonomyPanel;
