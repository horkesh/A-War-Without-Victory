/**
 * AutonomyPanel — Command Autonomy control surface for v0.8.4 Phase C.
 *
 * Two sections:
 *  1. Autonomy Slider — 4-button selector for levels 0–3 (Full Control / Assisted /
 *     Delegated / Observer). Levels 2–3 show "(not yet unlocked)" when the backend
 *     returns level_2_plus_not_yet_enabled.
 *  2. Proposal Review — visible only when autonomy_level === 1 and there are pending
 *     proposals. Renders Accept / Reject cards for unresolved PendingProposalReview
 *     items.
 *
 * State management: local React state only — no global store.
 * IPC: calls window.awwv.getAutonomyState / setAutonomyLevel / acceptProposal /
 *      rejectProposal directly (methods exposed by v0.8.4 Phase B/C preload).
 */
import { useEffect, useState, useCallback } from 'react';
import { GlassPanel } from './GlassPanel';
import { OfficerDossierPanel } from './OfficerDossierPanel';
import { playerFactionMatch } from '../data/playerFactionMatch';
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

interface CommandAuthorityState {
    current: number;
    max: number;
    spent_this_turn: number;
    lifetime_spent: number;
}

interface AutonomyState {
    autonomy_level: number;
    autonomy_level_pending?: number;
    autonomy_overrides?: Record<string, unknown>;
    pending_proposal_reviews?: PendingProposalReview[];
    op_proposal_cards?: OpProposalCard[];
    command_authority?: CommandAuthorityState | null;
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
    acceptProposal?: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
    rejectProposal?: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
    forceLaunchProposal?: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
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

// ── ProposalCard ───────────────────────────────────────────────────────────

interface ProposalCardProps {
    proposal: PendingProposalReview;
    /** Phase 2 slice 1: named-officer decision card for an 'ops' proposal (joined main-side). */
    opCard?: OpProposalCard;
    /** Current command authority, for the Override (force-launch) affordability gate. */
    commandAuthorityCurrent?: number;
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onForceLaunch: (id: string) => void;
    /**
     * Phase 2 "Officer Dossier": open the dossier for the proposing officer by id.
     * Only wired when the officer can be resolved in namedOfficerData; otherwise the
     * commander name renders as plain text.
     */
    onInspectOfficer?: (officerId: string) => void;
    /** True when the proposing officer has a dossier available (clickable name). */
    inspectable?: boolean;
    busy: boolean;
}

/** Force ratio → label colour. <1 is unfavourable (defender stronger). */
function ratioClass(ratio: number): string {
    if (ratio >= 2) return 'text-green-300';
    if (ratio >= 1) return 'text-[#d4d0c8]';
    return 'text-red-300';
}

function ProposalCard({ proposal, opCard, commandAuthorityCurrent, onAccept, onReject, onForceLaunch, onInspectOfficer, inspectable, busy }: ProposalCardProps) {
    const resolved = proposal.accepted !== undefined;

    // Parse a readable corps label from proposed_action.
    // Supported formats:
    //   SET_STANCE:<corps_id>:<stance>  → domain 'military'
    //   APPROVE_OP:<corps_id>:<plan_id> → domain 'ops'
    let corpsLabel = '';
    const parts = proposal.proposed_action.split(':');
    const isOp = parts[0] === 'APPROVE_OP';
    if ((parts[0] === 'SET_STANCE' || isOp) && parts[1]) {
        // e.g. "2nd_corps" → "2nd Corps"
        corpsLabel = parts[1]
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
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

    // Phase 2 slice 1: Override (force-launch) only when the commander recommends
    // NOT launching (postpone | abort). Disabled when CA can't cover the cost.
    const overrideOffered = isOp && !!opCard?.override_available;
    const overrideCost = opCard?.override_ca_cost ?? 0;
    const canAffordOverride = (commandAuthorityCurrent ?? 0) >= overrideCost;

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
                    {proposal.domain === 'ops' ? t('autonomy.proposal.opOrder') : proposal.domain}
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
                    <span className="text-[#8a8578]">{proposal.current_value ?? '—'}</span>
                    <span className="text-[#c4a04a]/60">→</span>
                    <span className="text-[#d4d0c8]">{proposal.proposed_value ?? '—'}</span>
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
                <div className="space-y-2 pt-0.5">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onAccept(proposal.id)}
                            disabled={busy}
                            className="flex-1 py-1 text-[9px] font-mono uppercase tracking-[0.15em] rounded border border-green-500/25 bg-green-900/15 text-green-300 hover:bg-green-900/30 hover:border-green-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {isOp ? t('autonomy.proposal.commit') : t('autonomy.proposal.accept')}
                        </button>
                        <button
                            onClick={() => onReject(proposal.id)}
                            disabled={busy}
                            className="flex-1 py-1 text-[9px] font-mono uppercase tracking-[0.15em] rounded border border-red-500/25 bg-red-900/10 text-red-400 hover:bg-red-900/25 hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {isOp ? t('autonomy.proposal.withhold') : t('autonomy.proposal.reject')}
                        </button>
                    </div>
                    {/* Override (Level 3 Direct Intervention) — only when the commander
                        recommends NOT launching. Disabled when CA can't cover the cost. */}
                    {overrideOffered && (
                        <button
                            onClick={() => onForceLaunch(proposal.id)}
                            disabled={busy || !canAffordOverride}
                            title={canAffordOverride
                                ? t('autonomy.proposal.overrideCost', { cost: overrideCost })
                                : t('autonomy.proposal.overrideInsufficient', { current: commandAuthorityCurrent ?? 0, cost: overrideCost })}
                            className="w-full py-1 text-[9px] font-mono uppercase tracking-[0.15em] rounded border border-amber-500/30 bg-amber-900/15 text-amber-300 hover:bg-amber-900/30 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {canAffordOverride
                                ? t('autonomy.proposal.override', { cost: overrideCost })
                                : t('autonomy.proposal.overrideInsufficient', { current: commandAuthorityCurrent ?? 0, cost: overrideCost })}
                        </button>
                    )}
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

    const handleAccept = async (proposalId: string) => {
        if (!bridge?.acceptProposal) return;
        setBusy(true);
        try {
            await bridge.acceptProposal(proposalId);
            await refresh();
        } catch (err) {
            console.warn('[AutonomyPanel] acceptProposal failed:', err);
        } finally {
            setBusy(false);
        }
    };

    const handleReject = async (proposalId: string) => {
        if (!bridge?.rejectProposal) return;
        setBusy(true);
        try {
            await bridge.rejectProposal(proposalId);
            await refresh();
        } catch (err) {
            console.warn('[AutonomyPanel] rejectProposal failed:', err);
        } finally {
            setBusy(false);
        }
    };

    // Phase 2 slice 1: Override (Level 3 Direct Intervention) on an op proposal.
    const handleForceLaunch = async (proposalId: string) => {
        if (!bridge?.forceLaunchProposal) return;
        setBusy(true);
        try {
            await bridge.forceLaunchProposal(proposalId);
            await refresh();
        } catch (err) {
            console.warn('[AutonomyPanel] forceLaunchProposal failed:', err);
        } finally {
            setBusy(false);
        }
    };

    const currentLevel = autonomyState?.autonomy_level ?? 0;
    const pendingLevel = autonomyState?.autonomy_level_pending;
    const proposals = filterPendingProposalsForPlayer(autonomyState?.pending_proposal_reviews, playerFaction);
    const unresolvedCount = proposals.filter((p) => p.accepted === undefined).length;
    // Index op decision cards by proposal id (Phase 2 slice 1).
    const opCardsById = new Map<string, OpProposalCard>();
    for (const card of autonomyState?.op_proposal_cards ?? []) opCardsById.set(card.proposal_id, card);
    const commandAuthorityCurrent = autonomyState?.command_authority?.current;

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
                                            commandAuthorityCurrent={commandAuthorityCurrent}
                                            onAccept={handleAccept}
                                            onReject={handleReject}
                                            onForceLaunch={handleForceLaunch}
                                            onInspectOfficer={inspectOfficer}
                                            inspectable={inspectable}
                                            busy={busy}
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
