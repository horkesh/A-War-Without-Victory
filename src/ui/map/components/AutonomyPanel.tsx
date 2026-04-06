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

// ── Types ──────────────────────────────────────────────────────────────────

export interface PendingProposalReview {
    id: string;
    turn: number;
    faction: string;
    domain: 'military' | 'political' | 'events';
    description: string;
    proposed_action: string;
    current_value?: string;
    proposed_value?: string;
    accepted?: boolean;
    resolved_turn?: number;
}

interface AutonomyState {
    autonomy_level: number;
    autonomy_level_pending?: number;
    autonomy_overrides?: Record<string, unknown>;
    pending_proposal_reviews?: PendingProposalReview[];
}

// Minimal extension of window.awwv for autonomy Phase C methods.
// The full WindowAwwv type lives in useIPC.ts; this covers only what we need here.
interface AutonomyBridge {
    getAutonomyState: () => Promise<AutonomyState>;
    setAutonomyLevel: (level: number) => Promise<{ ok: boolean; error?: string }>;
    acceptProposal?: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
    rejectProposal?: (proposalId: string) => Promise<{ ok: boolean; error?: string }>;
}

function getAutonomyBridge(): AutonomyBridge | undefined {
    return typeof window !== 'undefined'
        ? (window as unknown as { awwv?: AutonomyBridge }).awwv
        : undefined;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
    0: 'Full Control',
    1: 'Assisted',
    2: 'Delegated',
    3: 'Observer',
};

const LEVEL_DESCS: Record<number, string> = {
    0: 'All decisions yours. No AI proposals.',
    1: 'AI proposes corps stances. You approve each.',
    2: 'AI executes unless you override.',
    3: 'Full AI command. You observe.',
};

// ── ProposalCard ───────────────────────────────────────────────────────────

interface ProposalCardProps {
    proposal: PendingProposalReview;
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    busy: boolean;
}

function ProposalCard({ proposal, onAccept, onReject, busy }: ProposalCardProps) {
    const resolved = proposal.accepted !== undefined;

    // Parse a readable corps label from proposed_action ("SET_STANCE:corps_id:stance")
    // or fall back to description first line.
    let corpsLabel = '';
    const parts = proposal.proposed_action.split(':');
    if (parts[0] === 'SET_STANCE' && parts[1]) {
        // e.g. "2nd_corps" → "2nd Corps"
        corpsLabel = parts[1]
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    } else {
        corpsLabel = proposal.description.split('.')[0] ?? proposal.domain;
    }

    const statusIndicator = resolved
        ? proposal.accepted
            ? { label: 'Accepted', cls: 'text-green-400 border-green-500/30 bg-green-900/10' }
            : { label: 'Rejected', cls: 'text-red-400 border-red-500/30 bg-red-900/10' }
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
                    {corpsLabel}
                </span>
                <span className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.15em] shrink-0">
                    {proposal.domain}
                </span>
            </div>

            {/* Stance change arrow */}
            {(proposal.current_value || proposal.proposed_value) && (
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
            {resolved ? (
                <div className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-[0.15em] ${statusIndicator!.cls}`}>
                    {statusIndicator!.label}
                </div>
            ) : (
                <div className="flex gap-2 pt-0.5">
                    <button
                        onClick={() => onAccept(proposal.id)}
                        disabled={busy}
                        className="flex-1 py-1 text-[9px] font-mono uppercase tracking-[0.15em] rounded border border-green-500/25 bg-green-900/15 text-green-300 hover:bg-green-900/30 hover:border-green-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Accept
                    </button>
                    <button
                        onClick={() => onReject(proposal.id)}
                        disabled={busy}
                        className="flex-1 py-1 text-[9px] font-mono uppercase tracking-[0.15em] rounded border border-red-500/25 bg-red-900/10 text-red-400 hover:bg-red-900/25 hover:border-red-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Reject
                    </button>
                </div>
            )}
        </div>
    );
}

// ── AutonomyPanel ──────────────────────────────────────────────────────────

export interface AutonomyPanelProps {
    onClose: () => void;
}

export function AutonomyPanel({ onClose }: AutonomyPanelProps) {
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
                    setLevelError('Levels 2–3 are not yet unlocked.');
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

    const currentLevel = autonomyState?.autonomy_level ?? 0;
    const pendingLevel = autonomyState?.autonomy_level_pending;
    const proposals = (autonomyState?.pending_proposal_reviews ?? []).filter(
        (p) => p.faction === 'RBiH',
    );
    const unresolvedCount = proposals.filter((p) => p.accepted === undefined).length;

    return (
        <GlassPanel position="right" title="Command Autonomy" width="288px" onClose={onClose}>
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#c4a04a]/40 border-t-[#c4a04a] rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-5">
                    {/* IPC unavailable notice */}
                    {!bridge && (
                        <div className="text-[9px] font-mono text-[#8a8578] bg-black/20 border border-white/5 rounded px-2.5 py-1.5">
                            Autonomy controls require the Electron desktop shell.
                        </div>
                    )}

                    {/* ── Autonomy Level Selector ── */}
                    <div className="space-y-2">
                        <div className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                            Autonomy Level
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
                                                {level} — {LEVEL_LABELS[level]}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isPending && (
                                                <span className="text-[8px] font-mono text-[#c4a04a]/60 uppercase tracking-wide">
                                                    pending
                                                </span>
                                            )}
                                            {isLocked && (
                                                <span className="text-[8px] font-mono text-[#8a8578]/70 uppercase tracking-wide">
                                                    soon
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-[#8a8578] mt-0.5 ml-3.5 leading-snug">
                                        {LEVEL_DESCS[level]}
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
                                    Pending AI Proposals
                                </div>
                                {unresolvedCount > 0 && (
                                    <span className="text-[9px] font-mono text-[#c4a04a] bg-[#c4a04a]/10 border border-[#c4a04a]/25 rounded px-1.5 py-0.5">
                                        {unresolvedCount}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                {proposals.map((proposal) => (
                                    <ProposalCard
                                        key={proposal.id}
                                        proposal={proposal}
                                        onAccept={handleAccept}
                                        onReject={handleReject}
                                        busy={busy}
                                    />
                                ))}
                            </div>

                            {unresolvedCount === 0 && (
                                <div className="text-[9px] font-mono text-[#8a8578] text-center py-1">
                                    All proposals resolved.
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
                            Refresh
                        </button>
                    )}
                </div>
            )}
        </GlassPanel>
    );
}

export default AutonomyPanel;
