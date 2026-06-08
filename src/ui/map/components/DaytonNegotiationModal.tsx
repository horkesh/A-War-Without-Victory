/**
 * Dayton Negotiation Modal — interactive peace negotiation UI.
 *
 * Player selects territorial demands/concessions and institutional choices,
 * then submits. Bot factions respond. Patron overrides may force acceptance.
 * On resolution, game ends and VerdictScreen appears.
 *
 * v0.5.0: Single round (submit → resolve). v0.6.3 extends to 3 rounds with AI dialogue.
 *
 * Dayton Phase-4 (2026-06-07) — player-agency negotiation surface. Exposes the
 * shipped P1-3 read-models so the player AUTHORS the settlement, not just the map:
 *   (a) Brčko outcome (demand → your side / concede → other side / leave →
 *       international arbitration → the Annex-2 condominium district of both entities);
 *   (b) the 6 institutional centralized/decentralized choices (unchanged);
 *   (c) LIVE readouts — entity_autonomy_index + a peace_dysfunction FLOOR (with the
 *       outcome-class cap consequence shown honestly: a dysfunctional peace can never
 *       read as a clean win) + composite negotiating capital;
 *   (d) the bot COUNTER-OFFER — "Probe Positions" calls the read-only `previewDayton`
 *       IPC (runs the real resolver + bot evaluator on a throwaway clone, mutates
 *       nothing) and surfaces each delegation's accept/reject/counter, with a one-click
 *       "Adopt counter-offer" to fold the bot's terms back into the player's proposal.
 * All read-model only — no negotiation logic lives here.
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
import { useMemo, useState } from 'react';
import type { LoadedGameState } from '../data/types';
import { useIPC, type IpcDaytonBotResponse } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerFacingFaction } from '../../shared/playerFacingLabels';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { t } from '../i18n';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import {
    computeAutonomyPreview,
    computeDysfunctionPreview,
    previewBrckoOutcome,
    BRCKO_PACKAGE_ID,
    type InstitutionChoice,
    type BrckoOutcome,
} from '../data/daytonReadouts';
import {
    DaytonInstitutionalDimensions,
    computeInstitutionalCost,
    buildInstitutionalProposalFields,
    defaultInstitutionalSelections,
    type InstitutionalSelections,
} from './DaytonInstitutionalDimensions';

type DaytonData = NonNullable<LoadedGameState['pendingDayton']>;

const HOLDER_COLORS: Record<string, string> = {
    RBiH: '#4a7a4a',
    RS: '#4a5a8a',
    HRHB: '#8a6a3a',
};

/** Canonical faction display labels (matches VerdictScreen). */
const FACTION_DISPLAY: Record<string, string> = {
    RBiH: 'Republic of Bosnia and Herzegovina',
    RS: 'Republika Srpska',
    HRHB: 'Herzeg-Bosnia',
};

interface DaytonNegotiationModalProps {
    dayton: DaytonData;
}

export function DaytonNegotiationModal({ dayton }: DaytonNegotiationModalProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const playerFaction = getPlayerFacingFaction(useGameStore((s) => s.loadedGameState));
    const headerImage = getDecisionHeaderForFamily('dayton_negotiation');

    const [demands, setDemands] = useState<Set<string>>(new Set());
    const [concessions, setConcessions] = useState<Set<string>>(new Set());
    const [institutions, setInstitutions] = useState<Record<string, InstitutionChoice>>({});
    // Institutional-architecture expansion (Phase 3): the 4 structural dimensions
    // (autonomy dial + competencies + constitutional + return/justice).
    const [instArch, setInstArch] = useState<InstitutionalSelections>(defaultInstitutionalSelections());
    const [submitting, setSubmitting] = useState(false);
    const [probing, setProbing] = useState(false);
    const [botResponses, setBotResponses] = useState<Record<string, IpcDaytonBotResponse> | null>(null);
    /** The demand set that was probed — retained so the counter-offer diff is real. */
    const [probedDemands, setProbedDemands] = useState<Set<string>>(new Set());

    // ── Capital budget ────────────────────────────────────────────────────────
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
    // Institutional-architecture expansion (Phase 3): dial declaration + Dim-3/4/5
    // deviation costs to the player (authoritative engine cost functions; 0 at the
    // all-historical default so an untouched settlement is byte-identical).
    capitalSpent += computeInstitutionalCost(instArch, playerFaction);
    const capitalAvailable = playerFaction ? (dayton.factionCapital[playerFaction] ?? 0) : 0;
    const overBudget = capitalSpent > capitalAvailable;

    const hasBrckoPackage = dayton.territorialPackages.some((p) => p.id === BRCKO_PACKAGE_ID);

    // ── Live readouts (client-side mirrors of the shipped read-models) ─────────
    const autonomyIndex = useMemo(() => computeAutonomyPreview(institutions), [institutions]);
    const brckoOutcome: BrckoOutcome = useMemo(
        () => previewBrckoOutcome(playerFaction, demands, concessions),
        [playerFaction, demands, concessions],
    );
    // Live split estimate the player is shaping: start from the historical 51:49 and
    // nudge it by demands/concessions on the player's side. Display-only — bounded
    // input into the fragmentation term; the authoritative split comes from the engine.
    const liveSplit = useMemo(() => {
        const fed = playerFaction === 'RS' ? 49 : 51;
        const rs = 100 - fed;
        if (playerFaction === 'RS') return { RBiH: Math.round(fed * 0.5), RS: rs, HRHB: Math.round(fed * 0.5) };
        return { RBiH: Math.round(fed * 0.7), RS: rs, HRHB: Math.round(fed * 0.3) };
    }, [playerFaction]);
    const dysfunction = useMemo(
        () => computeDysfunctionPreview(institutions, liveSplit, brckoOutcome),
        [institutions, liveSplit, brckoOutcome],
    );

    // ── Mutators (clear stale probe whenever the proposal changes) ─────────────
    const clearProbe = () => { setBotResponses(null); setProbedDemands(new Set()); };

    const toggleDemand = (id: string) => {
        clearProbe();
        setDemands(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); concessions.delete(id); setConcessions(new Set(concessions)); }
            return next;
        });
    };

    const toggleConcession = (id: string) => {
        clearProbe();
        setConcessions(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); demands.delete(id); setDemands(new Set(demands)); }
            return next;
        });
    };

    const setInstitution = (id: string, choice: InstitutionChoice) => {
        clearProbe();
        setInstitutions(prev => ({ ...prev, [id]: choice }));
    };

    const setInstArchAndClear = (next: InstitutionalSelections) => {
        clearProbe();
        setInstArch(next);
    };

    const buildProposal = () => ({
        territorial_demands: [...demands],
        territorial_concessions: [...concessions],
        institutional_choices: institutions,
        // Phase 3 structural dimensions — only attached when non-default, so an
        // all-historical proposal is byte-identical to the pre-expansion shape.
        ...buildInstitutionalProposalFields(instArch),
    });

    // ── Probe Positions — read-only counter-offer preview (no mutation) ────────
    const handleProbe = async () => {
        if (!ipc.isAvailable || probing || !playerFaction) return;
        setProbing(true);
        const snapshot = new Set(demands);
        const res = await ipc.previewDayton(buildProposal());
        if (res.ok && res.botResponses) {
            setProbedDemands(snapshot);
            setBotResponses(res.botResponses);
        } else if (!res.ok) {
            setLoadError(res.error ?? 'Failed to probe Dayton positions.');
        }
        setProbing(false);
    };

    /** Adopt a bot's counter-offer: fold its terms back into the player's proposal.
     *  Mirrors the inverse of `buildInstitutionalProposalFields` — the counter can move
     *  the autonomy dial or flip a competency / constitutional / return-justice slot,
     *  so we must reconstruct `instArch` from those structural fields too, not just the
     *  territorial demands/concessions and legacy institutional toggles. Omitting them
     *  made "Adopt counter-offer" a no-op for any institutional-only counter (#297). */
    const adoptCounter = (resp: IpcDaytonBotResponse) => {
        const counter = resp.counter_proposal;
        if (!counter) return;
        clearProbe();
        setDemands(new Set(counter.territorial_demands ?? []));
        setConcessions(new Set(counter.territorial_concessions ?? []));
        setInstitutions({ ...(counter.institutional_choices ?? {}) });
        const nextInstArch: InstitutionalSelections = {
            ...defaultInstitutionalSelections(),
            dial: counter.entity_autonomy ?? 'dayton-historical',
            competency: { ...(counter.competency_allocation ?? {}) } as InstitutionalSelections['competency'],
            constitutional: { ...(counter.constitutional_choices ?? {}) },
            returnJustice: { ...(counter.return_justice ?? {}) },
        };
        setInstArch(nextInstArch);
    };

    const handleSubmit = async () => {
        if (!ipc.isAvailable || overBudget || !playerFaction) return;
        setSubmitting(true);
        const result = await ipc.resolveDayton(buildProposal());
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
                    {headerImage && (
                        <img
                            src={headerImage}
                            alt={t('dayton.headerAlt')}
                            className="absolute inset-x-0 top-0 h-28 w-full object-cover opacity-35"
                        />
                    )}
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#1b130c]/35 to-transparent" />
                    <div className="absolute top-4 right-4 text-[9px] uppercase tracking-widest text-[#8a7a60]/60 font-bold rotate-[-8deg] border-2 border-[#8a7a60]/30 px-2 py-1 rounded">
                        {t('dayton.classified')}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a7a60] font-bold mb-1">
                        {t('dayton.subtitle')}
                    </div>
                    <h2 id="dayton-negotiation-title" className="text-[22px] font-bold text-[#2a2016] leading-tight">
                        {t('dayton.title')}
                    </h2>
                    <div className="text-[11px] text-[#6a5a40] mt-1" style={{ fontFamily: 'Courier New, monospace' }}>
                        {t('dayton.location')}
                    </div>
                </div>

                {/* Capital budget */}
                <div className="px-8 py-3 border-b border-[#c8b898]/40 flex items-center justify-between">
                    <div className="text-[11px] text-[#6a5a40]" style={{ fontFamily: 'Courier New, monospace' }}>
                        <span className="font-bold text-[#2a2016]">{t('peace.negotiationCapital')}</span>{' '}
                        <span className={overBudget ? 'text-red-700 font-bold' : 'text-[#2a6a2a]'}>
                            {capitalSpent}
                        </span>
                        {' / '}{Math.round(capitalAvailable)}
                    </div>
                    {patronOverride >= 75 && (
                        <div className="text-[10px] uppercase tracking-wider text-red-700 font-bold px-2 py-0.5 bg-red-100 border border-red-300 rounded">
                            {t('dayton.patronOverrideActive', { pct: Math.round(patronOverride) })}
                        </div>
                    )}
                </div>

                {/* Live Settlement Readouts */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
                        {t('dayton.readoutsTitle')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ReadoutBar
                            label={t('dayton.entityAutonomy')}
                            value={autonomyIndex}
                            color="#8a6a3a"
                            hint={t('dayton.entityAutonomyHint')}
                        />
                        <ReadoutBar
                            label={t('dayton.peaceDysfunctionFloor')}
                            value={dysfunction.indexFloor}
                            color={dysfunction.capsCleanWin ? '#8a2a2a' : '#6a6a3a'}
                            hint={t('dayton.peaceDysfunctionHint')}
                        />
                    </div>
                    {dysfunction.capsCleanWin && (
                        <div className="mt-3 text-[11px] text-[#5a1a1a] bg-[#e8d0d0]/60 border border-[#8a2a2a]/40 rounded px-3 py-2">
                            <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
                                {t('dayton.capActive')}
                            </span>
                            {t('dayton.capWarning')}
                        </div>
                    )}
                </div>

                {/* Territorial Packages */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
                        {t('dayton.territorialPackages')}
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
                                                {t('dayton.demand', { cost: pkg.demandCost })}
                                            </button>
                                        )}
                                        {isPlayerHeld && (
                                            <button type="button" onClick={() => toggleConcession(pkg.id)}
                                                className={`text-[10px] px-2 py-1 rounded border font-bold uppercase ${
                                                    isConcession ? 'bg-[#8a2a2a] text-white border-[#8a2a2a]' : 'text-[#8a2a2a] border-[#8a2a2a]/40 hover:bg-[#e8d0d0]'
                                                }`} style={{ fontFamily: 'Courier New, monospace' }}>
                                                {t('dayton.concede', { cost: pkg.concedeCost })}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Brčko — the Annex-2 condominium-district outcome */}
                    {hasBrckoPackage && (
                        <div className="mt-3 p-3 rounded border border-[#8a7a60]/40 bg-[#e8dcc4]/40">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[12px] font-bold text-[#2a2016]">{t('dayton.brckoTitle')}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    brckoOutcome === 'arbitration'
                                        ? 'bg-[#8a7a60]/25 text-[#6a5a40]'
                                        : 'bg-[#4a5a8a]/15 text-[#3a4a7a]'
                                }`}>
                                    {brckoOutcome === 'arbitration'
                                        ? t('dayton.brckoArbitration')
                                        : brckoOutcome === 'rs'
                                            ? t('dayton.brckoRs')
                                            : t('dayton.brckoFederation')}
                                </span>
                            </div>
                            {brckoOutcome === 'arbitration' && (
                                <div className="text-[10px] text-[#6a5a40] italic mt-1">
                                    {t('dayton.brckoArbitrationNote')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Institutional Choices */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
                        {t('dayton.institutionalArchitecture')}
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
                                            {t('dayton.central', { cost: pkg.centralizedCost })}
                                        </button>
                                        <button type="button" onClick={() => setInstitution(pkg.id, 'decentralized')}
                                            className={`text-[10px] px-2 py-1 rounded border font-bold ${
                                                choice === 'decentralized' ? 'bg-[#8a6a3a] text-white border-[#8a6a3a]' : 'text-[#8a6a3a] border-[#8a6a3a]/40 hover:bg-[#e8dcc4]'
                                            }`} style={{ fontFamily: 'Courier New, monospace' }}>
                                            {t('dayton.decentral', { cost: pkg.decentralizedCost })}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Institutional-architecture expansion (Phase 3): the 4 structural
                    dimensions the player authors — autonomy dial, competency matrix,
                    constitutional architecture, return & justice. */}
                <DaytonInstitutionalDimensions
                    selections={instArch}
                    onChange={setInstArchAndClear}
                    playerFaction={playerFaction}
                    capitalAvailable={capitalAvailable}
                />

                {/* Probe Positions — bot counter-offer preview */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold">
                            {t('dayton.botResponsesTitle')}
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleProbe()}
                            disabled={probing || submitting}
                            className={`text-[10px] px-3 py-1.5 rounded border font-bold uppercase tracking-wider ${
                                probing
                                    ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#6a5a40] cursor-wait'
                                    : 'border-[#4a5a8a]/50 bg-[#d0d8e8] text-[#2a3a6a] hover:bg-[#b8c8e0]'
                            }`}
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            {probing ? t('dayton.probing') : t('dayton.probePositions')}
                        </button>
                    </div>
                    {!botResponses && (
                        <div className="text-[10px] text-[#6a5a40] italic">{t('dayton.probeHint')}</div>
                    )}
                    {botResponses && (
                        <div className="space-y-2">
                            {Object.keys(botResponses).sort().map((faction) => {
                                const resp = botResponses[faction];
                                if (!resp) return null;
                                return (
                                    <BotResponseRow
                                        key={faction}
                                        faction={faction}
                                        resp={resp}
                                        probedDemands={probedDemands}
                                        packageNames={packageNameLookup(dayton)}
                                        onAdopt={() => adoptCounter(resp)}
                                    />
                                );
                            })}
                        </div>
                    )}
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
                            title={t('peace.declineTalksTitle')}
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

/** A labelled 0-100 readout bar. */
function ReadoutBar({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div title={hint}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#2a2016]">{label}</span>
                <span className="text-[12px] font-bold" style={{ color, fontFamily: 'Courier New, monospace' }}>
                    {Math.round(value)}
                </span>
            </div>
            <div className="h-2 rounded-full bg-[#c8b898]/40 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="text-[9px] text-[#6a5a40] italic mt-1 leading-tight">{hint}</div>
        </div>
    );
}

/** Build a package id → display name map from the pending packet. */
function packageNameLookup(dayton: DaytonData): Record<string, string> {
    const map: Record<string, string> = {};
    for (const p of dayton.territorialPackages) map[p.id] = p.name;
    for (const p of dayton.institutionalPackages) map[p.id] = p.name;
    return map;
}

/** One bot delegation's response, with counter-offer detail + adopt action. */
function BotResponseRow({
    faction,
    resp,
    probedDemands,
    packageNames,
    onAdopt,
}: {
    faction: string;
    resp: IpcDaytonBotResponse;
    probedDemands: ReadonlySet<string>;
    packageNames: Record<string, string>;
    onAdopt: () => void;
}) {
    const display = FACTION_DISPLAY[faction] ?? faction;
    const color = HOLDER_COLORS[faction] ?? '#666';
    const decisionLabel =
        resp.decision === 'accept' ? t('dayton.botAccept')
        : resp.decision === 'counter' ? t('dayton.botCounter')
        : t('dayton.botReject');
    const decisionColor =
        resp.decision === 'accept' ? '#2a6a2a'
        : resp.decision === 'counter' ? '#8a6a3a'
        : '#8a2a2a';

    // Diff the counter against the terms that were probed: demands present in the
    // player's probed proposal but absent from the bot's surviving counter were
    // dropped. Real diff (probedDemands is the snapshot captured at probe time).
    const counter = resp.counter_proposal;
    const survived = new Set(counter?.territorial_demands ?? []);
    const droppedDemands = counter
        ? [...probedDemands].filter((id) => !survived.has(id)).sort()
        : [];

    return (
        <div className="p-2.5 rounded border border-[#c8b898]/50 bg-[#e8dcc4]/30">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold" style={{ color }}>{display}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{
                    backgroundColor: decisionColor + '20', color: decisionColor,
                }}>
                    {decisionLabel}
                </span>
            </div>
            {counter && resp.decision === 'counter' && (
                <div className="mt-2 text-[10px] text-[#5a4a30]">
                    {droppedDemands.length > 0 && (
                        <div>{t('dayton.counterDropsDemands', { items: droppedDemands.map(id => packageNames[id] ?? id).join(', ') })}</div>
                    )}
                    {droppedDemands.length === 0 && (
                        <div className="italic">{t('dayton.counterNoChange')}</div>
                    )}
                    <button
                        type="button"
                        onClick={onAdopt}
                        className="mt-1.5 text-[10px] px-2 py-1 rounded border font-bold uppercase text-[#8a6a3a] border-[#8a6a3a]/40 hover:bg-[#e8dcc4]"
                        style={{ fontFamily: 'Courier New, monospace' }}
                    >
                        {t('dayton.adoptCounter')}
                    </button>
                </div>
            )}
        </div>
    );
}

