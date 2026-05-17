/**
 * Dayton Negotiation Modal — interactive peace negotiation UI.
 *
 * Player selects territorial demands/concessions and institutional choices,
 * then submits. Bot factions respond. Patron overrides may force acceptance.
 * On resolution, game ends and VerdictScreen appears.
 *
 * v0.5.0: Single round (submit → resolve). v0.6.3 extends to 3 rounds with AI dialogue.
 *
 * Migrated to the shared `<Modal>` wrapper in
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION. Must-submit modal:
 * `dismissible={false}` (no ESC, no click-outside) — the only valid close
 * paths are (a) `handleSubmit` (Submit Proposal) and (b) `handleDeclineTalks`
 * (Decline Talks — submit empty proposal). Both route through IPC
 * `resolveDayton` and a game-state push that clears `pendingDayton` so the
 * parent stops rendering this modal. No `onClose` prop exists; the bespoke
 * action buttons stay on the inner panel content, NOT on Modal props.
 *
 * 2026-05-16 (decline-talks escape valve): added `handleDeclineTalks` to fix
 * a UX deadlock surfaced during external audit playtest. If the player's
 * available negotiation capital is too small to fund any viable proposal,
 * the original modal was hard-stuck — Submit was disabled by `overBudget`,
 * ESC/click-outside disabled by design, and no decline action existed. The
 * new button submits an empty proposal (no demands, no concessions, no
 * institutional choices) which is always within budget (capitalSpent=0)
 * and is interpreted at the IPC layer as the player refusing to negotiate
 * meaningfully.
 */
import { useState } from 'react';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerFacingFaction } from '../../shared/playerFacingLabels';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

type DaytonData = NonNullable<LoadedGameState['pendingDayton']>;

const HOLDER_COLORS: Record<string, string> = {
    RBiH: '#4a7a4a',
    RS: '#4a5a8a',
    HRHB: '#8a6a3a',
};

interface DaytonNegotiationModalProps {
    dayton: DaytonData;
}

export function DaytonNegotiationModal({ dayton }: DaytonNegotiationModalProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const playerFaction = getPlayerFacingFaction(useGameStore((s) => s.loadedGameState));

    const [demands, setDemands] = useState<Set<string>>(new Set());
    const [concessions, setConcessions] = useState<Set<string>>(new Set());
    const [institutions, setInstitutions] = useState<Record<string, 'centralized' | 'decentralized'>>({});
    const [submitting, setSubmitting] = useState(false);

    // Compute capital spent
    let capitalSpent = 0;
    for (const pkg of dayton.territorialPackages) {
        if (demands.has(pkg.id)) capitalSpent += pkg.demandCost;
        if (concessions.has(pkg.id)) capitalSpent += pkg.concedeCost;
    }
    for (const pkg of dayton.institutionalPackages) {
        const choice = institutions[pkg.id];
        if (choice === 'centralized') capitalSpent += pkg.centralizedCost;
        else if (choice === 'decentralized') capitalSpent += pkg.decentralizedCost;
    }
    const capitalAvailable = playerFaction ? (dayton.factionCapital[playerFaction] ?? 0) : 0;
    const overBudget = capitalSpent > capitalAvailable;

    const toggleDemand = (id: string) => {
        setDemands(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); concessions.delete(id); setConcessions(new Set(concessions)); }
            return next;
        });
    };

    const toggleConcession = (id: string) => {
        setConcessions(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); demands.delete(id); setDemands(new Set(demands)); }
            return next;
        });
    };

    const setInstitution = (id: string, choice: 'centralized' | 'decentralized') => {
        setInstitutions(prev => ({ ...prev, [id]: choice }));
    };

    const handleSubmit = async () => {
        if (!ipc.isAvailable || overBudget || !playerFaction) return;
        setSubmitting(true);
        const result = await ipc.resolveDayton({
            territorial_demands: [...demands],
            territorial_concessions: [...concessions],
            institutional_choices: institutions,
        });
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to resolve Dayton negotiation.');
            setSubmitting(false);
        }
        // On success, game state push will trigger VerdictScreen (game_over = true)
    };

    /**
     * Decline Talks — escape valve from an unsolvable Dayton.
     * Always within budget (empty proposal -> capitalSpent=0). Routes through
     * the existing `resolveDayton` IPC; the main process is expected to
     * interpret an empty proposal as the player refusing to negotiate.
     */
    const handleDeclineTalks = async () => {
        if (!ipc.isAvailable || submitting || !playerFaction) return;
        setSubmitting(true);
        const result = await ipc.resolveDayton({
            territorial_demands: [],
            territorial_concessions: [],
            institutional_choices: {},
        });
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to decline Dayton negotiation.');
            setSubmitting(false);
        }
    };

    const patronOverride = playerFaction ? (dayton.patronOverride[playerFaction] ?? 0) : 0;

    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="dayton-negotiation-title"
            backdropClassName="bg-black/80 backdrop-blur-sm"
            panelClassName="w-[95%] max-w-[800px] max-h-[92vh] overflow-auto rounded-lg border-2 border-[#8a7a60]/60 shadow-2xl"
            panelStyle={{
                background: 'linear-gradient(160deg, #f0e8d8 0%, #e0d8c0 50%, #d8ceb8 100%)',
                fontFamily: 'Georgia, "Times New Roman", serif',
            }}
        >
            <>
                {/* Header */}
                <div className="relative px-8 pt-8 pb-4 border-b-2 border-[#8a7a60]/30">
                    <div className="absolute top-4 right-4 text-[9px] uppercase tracking-widest text-[#8a7a60]/60 font-bold rotate-[-8deg] border-2 border-[#8a7a60]/30 px-2 py-1 rounded">
                        DIPLOMATIC — CLASSIFIED
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a7a60] font-bold mb-1">
                        General Framework Agreement for Peace
                    </div>
                    <h2 id="dayton-negotiation-title" className="text-[22px] font-bold text-[#2a2016] leading-tight">
                        Dayton Peace Accords
                    </h2>
                    <div className="text-[11px] text-[#6a5a40] mt-1" style={{ fontFamily: 'Courier New, monospace' }}>
                        Round 1 of 1 — Wright-Patterson AFB, Ohio
                    </div>
                </div>

                {/* Capital budget */}
                <div className="px-8 py-3 border-b border-[#c8b898]/40 flex items-center justify-between">
                    <div className="text-[11px] text-[#6a5a40]" style={{ fontFamily: 'Courier New, monospace' }}>
                        <span className="font-bold text-[#2a2016]">Negotiation Capital:</span>{' '}
                        <span className={overBudget ? 'text-red-700 font-bold' : 'text-[#2a6a2a]'}>
                            {capitalSpent}
                        </span>
                        {' / '}{Math.round(capitalAvailable)}
                    </div>
                    {patronOverride >= 75 && (
                        <div className="text-[10px] uppercase tracking-wider text-red-700 font-bold px-2 py-0.5 bg-red-100 border border-red-300 rounded">
                            Patron Override Active ({Math.round(patronOverride)}%)
                        </div>
                    )}
                </div>

                {/* Territorial Packages */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
                        Territorial Packages
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dayton.territorialPackages.map(pkg => {
                            const isDemand = demands.has(pkg.id);
                            const isConcession = concessions.has(pkg.id);
                            const isPlayerHeld = playerFaction != null && pkg.defaultHolder === playerFaction;
                            return (
                                <div key={pkg.id} className={`p-3 rounded border transition-colors ${
                                    isDemand ? 'border-[#2a6a2a] bg-[#d0e8d0]/60' :
                                    isConcession ? 'border-[#8a2a2a] bg-[#e8d0d0]/60' :
                                    'border-[#c8b898]/50 bg-[#e8dcc4]/30'
                                }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[12px] font-bold text-[#2a2016]">{pkg.name}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{
                                            backgroundColor: (HOLDER_COLORS[pkg.defaultHolder] ?? '#888') + '20',
                                            color: HOLDER_COLORS[pkg.defaultHolder] ?? '#888',
                                        }}>
                                            {pkg.defaultHolder}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {!isPlayerHeld && (
                                            <button type="button" onClick={() => toggleDemand(pkg.id)}
                                                className={`text-[10px] px-2 py-1 rounded border font-bold uppercase ${
                                                    isDemand ? 'bg-[#2a6a2a] text-white border-[#2a6a2a]' : 'text-[#2a6a2a] border-[#2a6a2a]/40 hover:bg-[#d0e8d0]'
                                                }`} style={{ fontFamily: 'Courier New, monospace' }}>
                                                Demand ({pkg.demandCost})
                                            </button>
                                        )}
                                        {isPlayerHeld && (
                                            <button type="button" onClick={() => toggleConcession(pkg.id)}
                                                className={`text-[10px] px-2 py-1 rounded border font-bold uppercase ${
                                                    isConcession ? 'bg-[#8a2a2a] text-white border-[#8a2a2a]' : 'text-[#8a2a2a] border-[#8a2a2a]/40 hover:bg-[#e8d0d0]'
                                                }`} style={{ fontFamily: 'Courier New, monospace' }}>
                                                Concede ({pkg.concedeCost})
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Institutional Choices */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
                        Institutional Architecture
                    </div>
                    <div className="space-y-2">
                        {dayton.institutionalPackages.map(pkg => {
                            const choice = institutions[pkg.id];
                            return (
                                <div key={pkg.id} className="flex items-center justify-between p-2.5 rounded border border-[#c8b898]/50 bg-[#e8dcc4]/30">
                                    <span className="text-[12px] font-bold text-[#2a2016]">{pkg.name}</span>
                                    <div className="flex gap-1.5">
                                        <button type="button" onClick={() => setInstitution(pkg.id, 'centralized')}
                                            className={`text-[10px] px-2 py-1 rounded border font-bold ${
                                                choice === 'centralized' ? 'bg-[#4a5a8a] text-white border-[#4a5a8a]' : 'text-[#4a5a8a] border-[#4a5a8a]/40 hover:bg-[#d0d8e8]'
                                            }`} style={{ fontFamily: 'Courier New, monospace' }}>
                                            Central ({pkg.centralizedCost})
                                        </button>
                                        <button type="button" onClick={() => setInstitution(pkg.id, 'decentralized')}
                                            className={`text-[10px] px-2 py-1 rounded border font-bold ${
                                                choice === 'decentralized' ? 'bg-[#8a6a3a] text-white border-[#8a6a3a]' : 'text-[#8a6a3a] border-[#8a6a3a]/40 hover:bg-[#e8dcc4]'
                                            }`} style={{ fontFamily: 'Courier New, monospace' }}>
                                            Decentral ({pkg.decentralizedCost})
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Submit */}
                <div className="px-8 py-5 flex flex-col items-center gap-2">
                    <div className="flex flex-row items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={submitting || overBudget}
                            className={`px-8 py-3 rounded border-2 font-bold text-[14px] uppercase tracking-wider transition-colors ${
                                overBudget
                                    ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#8a7a60] cursor-not-allowed'
                                    : submitting
                                        ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#6a5a40] cursor-wait'
                                        : 'border-[#2a6a2a]/50 bg-[#d0e8d0] text-[#1a4a1a] hover:bg-[#b8d8b8]'
                            }`}
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            {submitting ? 'Negotiating...' : overBudget ? 'Over Budget' : 'Submit Proposal'}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDeclineTalks()}
                            disabled={submitting}
                            title="Submit an empty proposal — refuse to negotiate meaningfully. Always within budget."
                            className={`px-6 py-3 rounded border-2 font-bold text-[12px] uppercase tracking-wider transition-colors ${
                                submitting
                                    ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#6a5a40] cursor-wait'
                                    : 'border-[#8a2a2a]/50 bg-[#e8d0d0] text-[#5a1a1a] hover:bg-[#d8b8b8]'
                            }`}
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            Decline Talks
                        </button>
                    </div>
                    {overBudget && (
                        <div className="text-[11px] text-red-700 font-bold">
                            Reduce demands — capital spent ({capitalSpent}) exceeds available ({Math.round(capitalAvailable)})
                        </div>
                    )}
                    <div className="text-[10px] text-[#6a5a40] mt-1" style={{ fontFamily: 'Courier New, monospace' }}>
                        Submit a proposal to negotiate, or Decline Talks to refuse meaningful negotiation.
                    </div>
                </div>
            </>
        </Modal>
    );
}
