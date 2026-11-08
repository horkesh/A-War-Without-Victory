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
 * paths are (a) `handleSubmit` (Submit Proposal, IPC `resolveDayton`) and (b)
 * `handleDeclineTalks` (Decline Settlement, two-step confirm, IPC `declineDayton`).
 * Both end in a game-state push that clears `pendingDayton` so the parent stops
 * rendering this modal. No `onClose` prop exists; the bespoke action buttons stay
 * on the inner panel content, NOT on Modal props.
 *
 * 2026-11-07 (owner): Decline is now a real refusal. Previously it signed an empty
 * proposal (ending the war). Now the engine withdraws the menu, the war continues
 * eight more weeks, and then the faction's coercion event fires and the table reopens with no decline
 * (dayton_negotiation.ts declineDaytonNegotiation / enforceDaytonImposition).
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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DaytonAgreementRecord, DaytonProposal } from '../../../state/negotiation_types.js';
import { getInstitutionalCost, getInstitutionalPackageById } from '../../../sim/negotiation/institutional_packages.js';
import { DaytonSettlementViewer } from './DaytonSettlementViewer';
import { DaytonConferenceRoom, type DaytonConferencePanel } from '../dayton_conference/DaytonConferenceRoom';
import { counterClauses, reviewClauses, type DaytonClause } from '../dayton_conference/clauses';
import { DAYTON_MAX_ROUNDS } from '../../../sim/negotiation/dayton_rounds.js';
import type { LoadedGameState } from '../data/types';
import { useIPC, type IpcDaytonBotResponse } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerFacingFaction } from '../../shared/playerFacingLabels';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { t } from '../i18n';
import { turnToDateString } from '../utils/formatters';
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
import { legacyProjection } from '../../../sim/negotiation/power_overlap.js';
import { DelegationFolder } from '../dayton_conference/DelegationFolder';
import { TreatyLedger } from '../dayton_conference/TreatyLedger';

type DaytonData = NonNullable<LoadedGameState['pendingDayton']>;
type CounterProposal = NonNullable<IpcDaytonBotResponse['counter_proposal']>;
type ClauseInspection = {
    clause: DaytonClause;
    origin: 'draft' | 'review';
    counter?: { faction: string; proposal: CounterProposal };
    agreement?: DaytonAgreementRecord;
    failed?: boolean;
};

function counterSelections(counter: CounterProposal): InstitutionalSelections {
    return {
        dial: counter.entity_autonomy ?? 'dayton-historical',
        competency: { ...counter.competency_allocation } as InstitutionalSelections['competency'],
        constitutional: { ...counter.constitutional_choices },
        returnJustice: { ...counter.return_justice },
    };
}

/** The Federation parties; ground between them is not negotiable at Dayton. */
const FEDERATION = new Set(['RBiH', 'HRHB']);

/** Banner text for the imposed table, by the power that forced it. */
const FORCED_MESSAGE: Record<string, Parameters<typeof t>[0]> = {
    united_states: 'dayton.forced.united_states',
    belgrade: 'dayton.forced.belgrade',
    zagreb: 'dayton.forced.zagreb',
};

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
    conference?: boolean;
}

export function DaytonNegotiationModal({ dayton, conference = false }: DaytonNegotiationModalProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const playerFaction = getPlayerFacingFaction(loadedGameState);
    const headerImage = !conference && getDecisionHeaderForFamily('dayton_negotiation');

    const [demands, setDemands] = useState<Set<string>>(new Set());
    const [concessions, setConcessions] = useState<Set<string>>(new Set());
    const [institutions, setInstitutions] = useState<Record<string, InstitutionChoice>>({});
    // Institutional-architecture expansion (Phase 3): the 4 structural dimensions
    // (autonomy dial + competencies + constitutional + return/justice).
    const [instArch, setInstArch] = useState<InstitutionalSelections>(defaultInstitutionalSelections());
    const [submitting, setSubmitting] = useState(false);
    const [conferenceError, setConferenceError] = useState<'preview' | 'submit' | 'decline' | null>(null);
    const [confirmDecline, setConfirmDecline] = useState(false);
    const [probing, setProbing] = useState(false);
    const [panel, setPanel] = useState<DaytonConferencePanel | null>(null);
    const [inspection, setInspection] = useState<ClauseInspection | null>(null);
    const [returnFocus, setReturnFocus] = useState<{ clause: string; faction?: string } | undefined>();
    const [openingAgreement, setOpeningAgreement] = useState<DaytonAgreementRecord | null>(null);
    const [adopted, setAdopted] = useState(false);
    const [preview, setPreview] = useState<{
        revision: number;
        proposal: DaytonProposal;
        agreement?: DaytonAgreementRecord;
        botResponses?: Record<string, IpcDaytonBotResponse>;
    } | null>(null);
    const agreement = preview?.agreement;
    const botResponses = preview?.botResponses;
    const draftRevision = useRef(0);
    const inspectionRevision = useRef(0);
    const probeInFlight = useRef<number | null>(null);
    const mutationInFlight = useRef(false);
    const reviewButton = useRef<HTMLButtonElement>(null);
    const reviewChangesHeading = useRef<HTMLHeadingElement>(null);
    useEffect(() => () => { draftRevision.current++; inspectionRevision.current++; }, []);
    useLayoutEffect(() => {
        if (panel === 'review' && agreement && document.activeElement === document.body) reviewChangesHeading.current?.focus();
    }, [panel, agreement]);

    // ── Capital budget ────────────────────────────────────────────────────────
    const frontPackages = dayton.frontPackages ?? [];
    const territoryPackages = [...dayton.territorialPackages, ...frontPackages];
    const institutionalPackages = dayton.institutionalPackages.map(pkg => {
        if (!conference || !playerFaction) return pkg;
        const definition = getInstitutionalPackageById(pkg.id);
        return definition ? { ...pkg, centralizedCost: getInstitutionalCost(definition, 'centralized', playerFaction),
            decentralizedCost: getInstitutionalCost(definition, 'decentralized', playerFaction) } : pkg;
    });
    let capitalSpent = 0;
    for (const pkg of territoryPackages) {
        if (demands.has(pkg.id)) capitalSpent += pkg.demandCost;
        if (concessions.has(pkg.id)) capitalSpent += pkg.concedeCost;
    }
    for (const pkg of institutionalPackages) {
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
    // The readouts take the six legacy toggles; project the operative slots onto them
    // so the bar reads the same treaty the binder shows (power_overlap.ts).
    const projectedInstitutions = useMemo(
        () => legacyProjection({ institutional_choices: institutions, ...buildInstitutionalProposalFields(instArch) }),
        [institutions, instArch],
    );
    const draftCompetencies = buildInstitutionalProposalFields(instArch).competency_allocation;
    const autonomyIndex = useMemo(() => computeAutonomyPreview(projectedInstitutions, draftCompetencies), [projectedInstitutions, draftCompetencies]);
    const brckoOutcome: BrckoOutcome = agreement?.terms.brcko_status
        ?? previewBrckoOutcome(playerFaction, demands, concessions);
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
        () => computeDysfunctionPreview(projectedInstitutions, liveSplit, brckoOutcome, draftCompetencies),
        [projectedInstitutions, liveSplit, brckoOutcome, draftCompetencies],
    );

    // ── Mutators (clear stale probe whenever the proposal changes) ─────────────
    const clearProbe = () => {
        draftRevision.current++;
        setPreview(null);
        setAdopted(false);
        setProbing(false);
    };

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

    const setInstArchAndClear = (next: InstitutionalSelections) => {
        clearProbe();
        setInstArch(next);
    };

    const buildProposal = (): DaytonProposal => ({
        territorial_demands: [...demands],
        territorial_concessions: [...concessions],
        institutional_choices: institutions,
        // Phase 3 structural dimensions — only attached when non-default, so an
        // all-historical proposal is byte-identical to the pre-expansion shape.
        ...buildInstitutionalProposalFields(instArch),
    });

    // ── Probe Positions — read-only counter-offer preview (no mutation) ────────
    const handleProbe = async () => {
        const revision = draftRevision.current;
        if (!ipc.isAvailable || probeInFlight.current === revision || mutationInFlight.current || submitting || overBudget || !playerFaction) return;
        if (conference) {
            setConferenceError(null);
            setPreview(null);
        }
        probeInFlight.current = revision;
        setProbing(true);
        const proposal = buildProposal();
        try {
            const res = await ipc.previewDayton(proposal);
            if (revision !== draftRevision.current) return;
            if (res.ok && (!conference || res.agreement)) {
                setPreview({ revision, proposal, agreement: res.agreement, botResponses: res.botResponses });
                const resolved = res.agreement;
                if (conference && resolved) setOpeningAgreement(opening => opening ?? resolved);
            } else {
                if (conference) setConferenceError('preview');
                else setLoadError(res.error ?? 'Failed to probe Dayton positions.');
            }
        } catch (error) {
            if (revision === draftRevision.current) {
                if (conference) setConferenceError('preview');
                else setLoadError(error instanceof Error ? error.message : 'Failed to probe Dayton positions.');
            }
        } finally {
            if (probeInFlight.current === revision) {
                probeInFlight.current = null;
                if (revision === draftRevision.current) setProbing(false);
            }
        }
    };

    const openPanel = (next: DaytonConferencePanel | null) => {
        if (mutationInFlight.current) return;
        inspectionRevision.current++;
        setReturnFocus(inspection && next === inspection.origin ? { clause: inspection.clause.id, faction: inspection.counter?.faction } : undefined);
        setInspection(null);
        setPanel(next);
    };

    const review = () => {
        if (overBudget || submitting) return;
        openPanel('review');
        if (!agreement) void handleProbe();
    };

    const inspectClause = async (clause: DaytonClause, origin: ClauseInspection['origin'], counter?: ClauseInspection['counter']) => {
        if (mutationInFlight.current) return;
        const revision = ++inspectionRevision.current;
        const next = { clause, origin, counter };
        setReturnFocus(undefined);
        setPanel(clause.kind);
        setInspection(next);
        if (!counter) return;
        try {
            const { territorial_demands, territorial_concessions, institutional_choices } = counter.proposal;
            const proposal = { territorial_demands, territorial_concessions, institutional_choices, ...buildInstitutionalProposalFields(counterSelections(counter.proposal)) };
            const result = await ipc.previewDayton(proposal);
            if (revision === inspectionRevision.current) {
                setInspection(result.ok && result.agreement ? { ...next, agreement: result.agreement } : { ...next, failed: true });
            }
        } catch {
            if (revision === inspectionRevision.current) setInspection({ ...next, failed: true });
        }
    };

    /** Adopt a bot's counter-offer: fold its terms back into the player's proposal.
     *  Mirrors the inverse of `buildInstitutionalProposalFields` — the counter can move
     *  the autonomy dial or flip a competency / constitutional / return-justice slot,
     *  so we must reconstruct `instArch` from those structural fields too, not just the
     *  territorial demands/concessions and legacy institutional toggles. Omitting them
     *  made "Adopt counter-offer" a no-op for any institutional-only counter (#297). */
    const adoptCounter = (resp: IpcDaytonBotResponse) => {
        const counter = resp.counter_proposal;
        if (!counter || mutationInFlight.current) return;
        // Conference answers come from a tabled round (saved), not a live probe.
        if (!conference && (probeInFlight.current === draftRevision.current || preview?.revision !== draftRevision.current)) return;
        reviewButton.current?.focus();
        clearProbe();
        setDemands(new Set(counter.territorial_demands ?? []));
        setConcessions(new Set(counter.territorial_concessions ?? []));
        setInstitutions({ ...(counter.institutional_choices ?? {}) });
        setInstArch(counterSelections(counter));
        setAdopted(true);
    };

    // ── Bounded rounds (DC A2) ─────────────────────────────────────────────────
    const rounds = dayton.rounds ?? [];
    const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : undefined;
    const nextRound = rounds.length >= DAYTON_MAX_ROUNDS ? null : rounds.length + 1;
    const [tabling, setTabling] = useState(false);
    const [tableError, setTableError] = useState(false);
    const handleTable = async () => {
        if (!ipc.isAvailable || nextRound === null || overBudget || tabling || mutationInFlight.current || !playerFaction) return;
        setTabling(true);
        setTableError(false);
        setAdopted(false);
        try {
            const res = await ipc.tableDaytonRound(buildProposal());
            if (!res.ok) setTableError(true);
            // The answers arrive with the saved state push (pendingDayton.rounds).
        } catch {
            setTableError(true);
        } finally {
            setTabling(false);
        }
    };

    const runConferenceMutation = async (action: 'submit' | 'decline', request: () => Promise<{ ok: boolean }>) => {
        if (mutationInFlight.current) return;
        mutationInFlight.current = true;
        setConferenceError(null);
        setSubmitting(true);
        let succeeded = false;
        try {
            succeeded = (await request()).ok;
        } catch {
            // A rejected bridge call follows the same retry path as a failed response.
        } finally {
            // Successful mutations close the conference through the existing state push.
            if (!succeeded) {
                mutationInFlight.current = false;
                setConferenceError(action);
                setSubmitting(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!ipc.isAvailable || overBudget || !playerFaction) return;
        if (conference) {
            if (panel === 'review' && !submitting && probeInFlight.current !== draftRevision.current && preview?.agreement && preview.revision === draftRevision.current) {
                await runConferenceMutation('submit', () => ipc.resolveDayton(preview.proposal));
            }
            return;
        }
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
        // 2026-11-07 (owner): Decline is a real refusal, not an empty signature. First
        // click shows the consequence; the second confirms. The engine withdraws the
        // menu, the war continues eight weeks, then the table reopens with no decline.
        if (!confirmDecline) {
            setConfirmDecline(true);
            return;
        }
        if (conference) {
            await runConferenceMutation('decline', () => ipc.declineDayton());
            return;
        }
        setSubmitting(true);
        const result = await ipc.declineDayton();
        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to decline Dayton negotiation.');
            setSubmitting(false);
        }
        // On success the state push clears pendingDayton and the parent unmounts this modal.
    };

    const patronOverride = playerFaction ? (dayton.patronOverride[playerFaction] ?? 0) : 0;

    const forcedBanner = (
        dayton.forced && (
            <div className="px-8 py-3 border-b border-[#8a2a2a]/40 bg-[#e8d0d0]/60" role="status">
                <div className="text-xs uppercase tracking-widest text-[#5a1a1a] font-bold">
                    {t('dayton.forcedTitle')}
                </div>
                <div className="text-xs text-[#5a1a1a] mt-0.5">
                    {t(FORCED_MESSAGE[dayton.forced.by] ?? 'dayton.forced.united_states')}
                </div>
            </div>
        )
    );

    // Conference (DC A2): no cost figures. The budget reads as room left to bargain.
    const roomShare = capitalAvailable > 0 ? Math.min(1, capitalSpent / capitalAvailable) : (capitalSpent > 0 ? 1 : 0);
    const roomBand = overBudget ? 'over' : roomShare >= 0.85 ? 'little' : roomShare >= 0.5 ? 'some' : 'plenty';
    const demandLabel = (pkg: { demandCost: number }) => conference ? t('dayton.demandPlain') : t('dayton.demand', { cost: pkg.demandCost });
    const concedeLabel = (pkg: { concedeCost: number }) => conference ? t('dayton.concedePlain') : t('dayton.concede', { cost: pkg.concedeCost });
    const actionName = (label: string, pkg: { name: string }) => conference ? `${label}: ${pkg.name}` : undefined;

    const budget = conference ? (
        <div className="px-8 py-3 border-b border-[#c8b898]/40 grid gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="font-bold text-[#2a2016]">{t('dayton.room.title')}</span>
                <span className={overBudget ? 'font-bold text-[#651e18]' : 'text-[#4a3a26]'}>{t(`dayton.room.${roomBand}` as 'dayton.room.plenty')}</span>
            </div>
            <div className="dayton-room-meter" role="meter" aria-label={t('dayton.room.title')}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 * (1 - roomShare))}
                aria-valuetext={t(`dayton.room.${roomBand}` as 'dayton.room.plenty')}>
                <span style={{ width: `${100 * (1 - roomShare)}%` }} data-band={roomBand} />
            </div>
            {patronOverride >= 75 && (
                <p className="text-xs font-bold text-[#651e18]">{t('dayton.room.patronHolds')}</p>
            )}
        </div>
    ) : (
        <div className="px-8 py-3 border-b border-[#c8b898]/40 flex items-center justify-between">
            <div className="text-xs text-[#6a5a40]" style={{ fontFamily: 'var(--font-data)' }}>
                <span className="font-bold text-[#2a2016]">{t('peace.negotiationCapital')}</span>{' '}
                <span className={overBudget ? 'text-red-700 font-bold' : 'text-[#2a6a2a]'}>
                    {capitalSpent}
                </span>
                {' / '}{Math.round(capitalAvailable)}
            </div>
            {patronOverride >= 75 && (
                <div className="text-xs uppercase tracking-wider text-red-700 font-bold px-2 py-0.5 bg-red-100 border border-red-300 rounded">
                    {t('dayton.patronOverrideActive', { pct: Math.round(patronOverride) })}
                </div>
            )}
        </div>
    );

    const readouts = (
        <div className="px-8 py-4 border-b border-[#c8b898]/40">
            <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
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
                <div className="mt-3 text-xs text-[#5a1a1a] bg-[#e8d0d0]/60 border border-[#8a2a2a]/40 rounded px-3 py-2">
                    <span className="font-bold uppercase tracking-wider text-xs block mb-0.5">
                        {t('dayton.capActive')}
                    </span>
                    {t('dayton.capWarning')}
                </div>
            )}
        </div>
    );

    const territory = (
        <div className="px-8 py-4 border-b border-[#c8b898]/40">
            <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
                {t('dayton.territorialPackages')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dayton.territorialPackages.map(pkg => {
                    const isDemand = demands.has(pkg.id);
                    const isConcession = concessions.has(pkg.id);
                    const isPlayerHeld = playerFaction != null && pkg.defaultHolder === playerFaction;
                    // Dayton drew the inter-entity line only: Federation-partner ground is not negotiable.
                    const isPartnerHeld = playerFaction != null && !isPlayerHeld
                        && FEDERATION.has(pkg.defaultHolder) && FEDERATION.has(playerFaction);
                    return (
                        <div key={pkg.id} className={`p-3 rounded border transition-colors ${
                            isDemand ? 'border-[#2a6a2a] bg-[#d0e8d0]/60' :
                            isConcession ? 'border-[#8a2a2a] bg-[#e8d0d0]/60' :
                            'border-[#c8b898]/50 bg-[#e8dcc4]/30'
                        }`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[12px] font-bold text-[#2a2016]">{pkg.name}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{
                                    backgroundColor: (HOLDER_COLORS[pkg.defaultHolder] ?? '#888') + '20',
                                    color: HOLDER_COLORS[pkg.defaultHolder] ?? '#888',
                                }}>
                                    {pkg.defaultHolder}
                                </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                                {isPartnerHeld && (
                                    <span className="text-xs text-[#6a5a40] italic">{t('dayton.federationPartner')}</span>
                                )}
                                {!isPlayerHeld && !isPartnerHeld && (
                                    <button type="button" onClick={() => toggleDemand(pkg.id)} aria-label={actionName(t('dayton.demandPlain'), pkg)} aria-pressed={conference ? isDemand : undefined}
                                        className={`text-xs px-2 py-1 rounded border font-bold uppercase ${
                                            isDemand ? 'bg-[#2a6a2a] text-white border-[#2a6a2a]' : 'text-[#2a6a2a] border-[#2a6a2a]/40 hover:bg-[#d0e8d0]'
                                        }`} style={{ fontFamily: 'var(--font-command)' }}>
                                        {demandLabel(pkg)}
                                    </button>
                                )}
                                {isPlayerHeld && 'protectedCore' in pkg && pkg.protectedCore && (
                                    <span className="text-xs text-[#6a5a40] italic">{t('dayton.protectedCore')}</span>
                                )}
                                {isPlayerHeld && !('protectedCore' in pkg && pkg.protectedCore) && (
                                    <button type="button" onClick={() => toggleConcession(pkg.id)} aria-label={actionName(t('dayton.concedePlain'), pkg)} aria-pressed={conference ? isConcession : undefined}
                                        className={`text-xs px-2 py-1 rounded border font-bold uppercase ${
                                            isConcession ? 'bg-[#8a2a2a] text-white border-[#8a2a2a]' : 'text-[#8a2a2a] border-[#8a2a2a]/40 hover:bg-[#e8d0d0]'
                                        }`} style={{ fontFamily: 'var(--font-command)' }}>
                                        {concedeLabel(pkg)}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Captured ground: where the front departs from the Dayton map */}
            {frontPackages.length > 0 && (
                <div className="mt-4">
                    <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-1">
                        {t('dayton.frontPackagesTitle')}
                    </div>
                    <div className="text-xs text-[#6a5a40] italic mb-2">{t('dayton.frontPackagesHint')}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {frontPackages.map(pkg => {
                            const isDemand = demands.has(pkg.id);
                            const isConcession = concessions.has(pkg.id);
                            const mapGivesPlayer = playerFaction != null && pkg.defaultHolder === playerFaction;
                            const holder = pkg.claimant ?? '';
                            return (
                                <div key={pkg.id} className={`p-3 rounded border transition-colors ${
                                    isDemand ? 'border-[#2a6a2a] bg-[#d0e8d0]/60' :
                                    isConcession ? 'border-[#8a2a2a] bg-[#e8d0d0]/60' :
                                    'border-[#c8b898]/50 bg-[#e8dcc4]/30'
                                }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[12px] font-bold text-[#2a2016]">{pkg.name}</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{
                                            backgroundColor: (HOLDER_COLORS[holder] ?? '#888') + '20',
                                            color: HOLDER_COLORS[holder] ?? '#888',
                                        }}>
                                            {holder}
                                        </span>
                                    </div>
                                    <div className="text-xs text-[#6a5a40]" style={{ fontFamily: 'var(--font-data)' }}>
                                        {t('dayton.frontHeld', {
                                            holder,
                                            assignee: pkg.defaultHolder,
                                            pct: (pkg.areaPct ?? 0).toFixed(2),
                                        })}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {!mapGivesPlayer && (
                                            <button type="button" onClick={() => toggleDemand(pkg.id)} aria-label={actionName(t('dayton.demandPlain'), pkg)} aria-pressed={conference ? isDemand : undefined}
                                                className={`text-xs px-2 py-1 rounded border font-bold uppercase ${
                                                    isDemand ? 'bg-[#2a6a2a] text-white border-[#2a6a2a]' : 'text-[#2a6a2a] border-[#2a6a2a]/40 hover:bg-[#d0e8d0]'
                                                }`} style={{ fontFamily: 'var(--font-command)' }}>
                                                {demandLabel(pkg)}
                                            </button>
                                        )}
                                        {mapGivesPlayer && (
                                            <button type="button" onClick={() => toggleConcession(pkg.id)} aria-label={actionName(t('dayton.concedePlain'), pkg)} aria-pressed={conference ? isConcession : undefined}
                                                className={`text-xs px-2 py-1 rounded border font-bold uppercase ${
                                                    isConcession ? 'bg-[#8a2a2a] text-white border-[#8a2a2a]' : 'text-[#8a2a2a] border-[#8a2a2a]/40 hover:bg-[#e8d0d0]'
                                                }`} style={{ fontFamily: 'var(--font-command)' }}>
                                                {concedeLabel(pkg)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Brčko — the Annex-2 condominium-district outcome */}
            {hasBrckoPackage && (
                <div className="mt-3 p-3 rounded border border-[#8a7a60]/40 bg-[#e8dcc4]/40">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold text-[#2a2016]">{t('dayton.brckoTitle')}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-bold uppercase ${
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
                        <div className="text-xs text-[#6a5a40] italic mt-1">
                            {t('dayton.brckoArbitrationNote')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const institutionalTerms = (
        <>
            {/* The six legacy centralized/decentralized toggles are no longer offered: each
                power is set once, through the competency matrix and constitutional
                choices below (power_overlap.ts). A bot counter may still carry legacy
                toggles; adopting it keeps them in `institutions` for their cost. */}
            {/* Institutional-architecture expansion (Phase 3): the 4 structural
                dimensions the player authors — autonomy dial, competency matrix,
                constitutional architecture, return & justice. */}
            <DaytonInstitutionalDimensions
                selections={instArch}
                onChange={setInstArchAndClear}
                playerFaction={playerFaction}
                capitalAvailable={capitalAvailable}
                hideCosts={conference}
            />
        </>
    );

    const probeButton = (
        <button
            type="button"
            onClick={() => void handleProbe()}
            disabled={overBudget || (!conference && (probing || submitting))}
            aria-disabled={conference && (probing || submitting) ? true : undefined}
            className={`text-xs px-3 py-1.5 rounded border font-bold uppercase tracking-wider ${
                probing || (conference && submitting)
                    ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#6a5a40] cursor-wait'
                    : 'border-[#4a5a8a]/50 bg-[#d0d8e8] text-[#2a3a6a] enabled:hover:bg-[#b8c8e0] disabled:cursor-not-allowed disabled:opacity-50'
            }`}
            style={{ fontFamily: 'var(--font-command)' }}
        >
            {probing ? t('dayton.probing') : t('dayton.probePositions')}
        </button>
    );

    // Conference: answers come only from tabled rounds (DC A2). No free probing.
    const roundResponses = conference && (
        <section className="px-8 py-4 border-b border-[#c8b898]/40 dayton-rounds" aria-labelledby="dayton-rounds-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h3 id="dayton-rounds-title" className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold">
                    {lastRound ? t('dayton.rounds.answersTitle', { round: lastRound.round }) : t('dayton.rounds.title')}
                </h3>
                <ol className="dayton-round-track" aria-label={t('dayton.rounds.trackLabel')}>
                    {Array.from({ length: DAYTON_MAX_ROUNDS }, (_, i) => i + 1).map(n => (
                        <li key={n} data-state={n <= rounds.length ? 'done' : n === nextRound ? 'next' : 'later'}>
                            {t('dayton.rounds.trackItem', { round: n })}
                        </li>
                    ))}
                </ol>
            </div>
            {!lastRound && <p className="text-xs text-[#4a3a26]">{t('dayton.rounds.intro', { max: DAYTON_MAX_ROUNDS })}</p>}
            {adopted && <p className="mb-2 text-xs font-bold" role="status">{t('dayton.conference.adopted')}</p>}
            {lastRound && (
                <div className="space-y-2">
                    {Object.keys(lastRound.responses).sort().map((faction) => {
                        const resp = lastRound.responses[faction] as IpcDaytonBotResponse | undefined;
                        if (!resp) return null;
                        return (
                            <BotResponseRow
                                key={faction}
                                faction={faction}
                                resp={resp}
                                reasonText={plainReply(faction, resp)}
                                probedDemands={lastRound.proposal.territorial_demands}
                                packageNames={packageNameLookup(dayton)}
                                clauses={resp.counter_proposal ? counterClauses(lastRound.proposal, resp.counter_proposal, territoryPackages) : undefined}
                                onClause={clause => {
                                    if (resp.counter_proposal) void inspectClause(clause, 'draft', { faction, proposal: resp.counter_proposal });
                                }}
                                onAdopt={() => adoptCounter(resp)}
                            />
                        );
                    })}
                </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
                {nextRound !== null ? (
                    <button
                        type="button"
                        onClick={() => void handleTable()}
                        disabled={overBudget}
                        aria-disabled={tabling || submitting ? true : undefined}
                        className="dayton-live-button dayton-live-primary"
                    >
                        {tabling ? t('dayton.rounds.tabling') : t('dayton.rounds.table', { round: nextRound, max: DAYTON_MAX_ROUNDS })}
                    </button>
                ) : (
                    <p className="text-xs font-bold text-[#5a1a1a]" role="status">{t('dayton.rounds.spent')}</p>
                )}
                {nextRound === DAYTON_MAX_ROUNDS && <p className="text-xs font-bold text-[#5a1a1a]">{t('dayton.rounds.lastWarning')}</p>}
                {nextRound !== null && rounds.length > 0 && <p className="text-xs text-[#4a3a26]">{t('dayton.rounds.pressure')}</p>}
            </div>
            {tableError && <p className="mt-2 text-xs font-bold text-[#651e18]" role="alert">{t('dayton.rounds.error')}</p>}
        </section>
    );

    const responses = conference ? roundResponses : (
        <div className="px-8 py-4 border-b border-[#c8b898]/40">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold">
                    {t('dayton.botResponsesTitle')}
                </div>
                {probeButton}
            </div>
            {conference && agreement && (
                <p className="mb-2 text-xs font-bold" role="status">{t('dayton.conference.previewReady')}</p>
            )}
            {!botResponses && (
                <div className="text-xs text-[#6a5a40] italic">{t('dayton.probeHint')}</div>
            )}
            {conference && adopted && <p className="mb-2 text-xs font-bold" role="status">{t('dayton.conference.adopted')}</p>}
            {botResponses && preview && (
                <div className="space-y-2">
                    {Object.keys(botResponses).sort().map((faction) => {
                        const resp = botResponses[faction];
                        if (!resp) return null;
                        return (
                            <BotResponseRow
                                key={faction}
                                faction={faction}
                                resp={resp}
                                probedDemands={preview.proposal.territorial_demands}
                                packageNames={packageNameLookup(dayton)}
                                clauses={conference && resp.counter_proposal ? counterClauses(preview.proposal, resp.counter_proposal, territoryPackages) : undefined}
                                onClause={clause => {
                                    if (resp.counter_proposal) void inspectClause(clause, 'draft', { faction, proposal: resp.counter_proposal });
                                }}
                                onAdopt={() => adoptCounter(resp)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );

    const submission = (
        <div className="px-8 py-5 flex flex-col items-center gap-2">
            <div className="flex flex-row items-center gap-3">
                <button
                    type="button"
                    ref={conference ? reviewButton : undefined}
                    onClick={conference ? review : () => void handleSubmit()}
                    disabled={overBudget || (!conference && submitting)}
                    aria-disabled={conference && submitting ? true : undefined}
                    className={`px-8 py-3 rounded border-2 font-bold text-[14px] uppercase tracking-wider transition-colors ${
                        overBudget
                            ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#8a7a60] cursor-not-allowed'
                            : submitting
                                ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#6a5a40] cursor-wait'
                                : 'border-[#2a6a2a]/50 bg-[#d0e8d0] text-[#1a4a1a] hover:bg-[#b8d8b8]'
                    }`}
                    style={{ fontFamily: 'var(--font-command)' }}
                >
                    {submitting ? 'Negotiating...' : overBudget ? 'Over Budget' : conference ? t('dayton.conference.reviewAction') : 'Submit Proposal'}
                </button>
                {!dayton.forced && (
                    <button
                        type="button"
                        onClick={() => void handleDeclineTalks()}
                        disabled={!conference && submitting}
                        aria-disabled={conference && submitting ? true : undefined}
                        title={t('peace.declineTalksTitle')}
                        className={`px-6 py-3 rounded border-2 font-bold text-[12px] uppercase tracking-wider transition-colors ${
                            submitting
                                ? 'border-[#8a7a60]/30 bg-[#d8d0c4] text-[#6a5a40] cursor-wait'
                                : 'border-[#8a2a2a]/50 bg-[#e8d0d0] text-[#5a1a1a] hover:bg-[#d8b8b8]'
                        }`}
                        style={{ fontFamily: 'var(--font-command)' }}
                    >
                        {confirmDecline ? t('dayton.declineConfirm') : t('dayton.declineSettlement')}
                    </button>
                )}
            </div>
            {confirmDecline && !dayton.forced && (
                <div className="text-xs text-[#5a1a1a] font-bold" role="alert">
                    {t(playerFaction === 'RS'
                        ? 'dayton.declineWarningRS'
                        : playerFaction === 'HRHB'
                            ? 'dayton.declineWarningHRHB'
                            : 'dayton.declineWarningRBiH')}
                </div>
            )}
            {overBudget && (
                <div className="text-xs text-red-700 font-bold">
                    {conference ? t('dayton.room.overHint')
                        : `Reduce demands — capital spent (${capitalSpent}) exceeds available (${Math.round(capitalAvailable)})`}
                </div>
            )}
            <div className="text-xs text-[#6a5a40] mt-1" style={{ fontFamily: 'var(--font-command)' }}>
                {dayton.forced ? t('dayton.forcedFooter') : conference ? t('dayton.conference.reviewHint')
                    : 'Submit a proposal to negotiate, or Decline Talks to refuse meaningful negotiation.'}
            </div>
        </div>
    );

    if (conference) {
        const displayedAgreement = inspection?.counter ? inspection.agreement : agreement;
        const inspectionPanel = inspection && (
            <div className="space-y-3 px-5 py-4">
                {inspection.counter && <p className="font-bold">{t('dayton.conference.counterProjection', { faction: FACTION_DISPLAY[inspection.counter.faction] ?? inspection.counter.faction })}</p>}
                {displayedAgreement ? (
                    <DaytonSettlementViewer agreement={displayedAgreement} mode="draft"
                        view={inspection.clause.kind === 'map' ? 'territory' : 'institutions'} clause={inspection.clause}
                        counterProjection={Boolean(inspection.counter)}
                        openingMap={inspection.origin === 'review' ? openingAgreement?.map : undefined} />
                ) : inspection.failed ? (
                    <>
                        <p role="alert">{t('dayton.conference.error.clause')}</p>
                        <button type="button" className="dayton-clause-link" onClick={event => {
                            event.currentTarget.closest('[data-dayton-panel]')?.querySelector('h2')?.focus();
                            void inspectClause(inspection.clause, inspection.origin, inspection.counter);
                        }}>
                            {t('dayton.conference.retryClause')}
                        </button>
                    </>
                ) : <p role="status">{t('dayton.probing')}</p>}
            </div>
        );
        const changes = openingAgreement && agreement && openingAgreement !== agreement
            ? reviewClauses(openingAgreement, agreement, territoryPackages) : [];
        const savedDate = loadedGameState?.metadata?.date?.trim();
        const date = savedDate && savedDate !== 'UNKNOWN'
            ? savedDate
            : loadedGameState && Number.isFinite(loadedGameState.turn)
                ? turnToDateString(loadedGameState.turn)
                : undefined;
        return (
            <Modal
                isOpen={true}
                dismissible={false}
                zIndex={Z.CRITICAL_MODAL}
                ariaLabel={t('dayton.title')}
                backdropClassName="bg-[#1c1b17]"
                panelClassName="h-full w-full overflow-hidden"
            >
                <DaytonConferenceRoom
                    date={date}
                    status={nextRound === null
                        ? t('dayton.conference.roundsSpent')
                        : t('dayton.conference.roundStatus', { round: nextRound, max: DAYTON_MAX_ROUNDS })}
                    error={conferenceError ? t(`dayton.conference.error.${conferenceError}`) : undefined}
                    forced={Boolean(dayton.forced)}
                    previewReady={Boolean(agreement)}
                    panel={panel}
                    backTo={inspection?.origin ?? (panel === 'review' ? 'draft' : undefined)}
                    returnFocus={returnFocus}
                    onPanelChange={openPanel}
                    panels={{
                        // The folder is the campaign's receipt (DC A1); the bargaining readouts
                        // and the budget belong with the draft the player is shaping.
                        folder: (
                            <>
                                {forcedBanner}
                                <DelegationFolder folder={dayton.delegationFolder} />
                            </>
                        ),
                        draft: (
                            <>
                                {forcedBanner}
                                {budget}
                                {readouts}
                                {territory}
                                {responses}
                                {submission}
                            </>
                        ),
                        map: inspectionPanel ?? (
                            <div className="space-y-3 px-5 py-4">
                                {!agreement && <p>{t('dayton.conference.previewHint')}</p>}
                                {probeButton}
                                {agreement && <DaytonSettlementViewer agreement={agreement} mode="draft" view="territory" />}
                            </div>
                        ),
                        binder: inspectionPanel ?? (
                            <>
                                {budget}
                                {agreement && (
                                    <div className="px-5 py-4">
                                        <DaytonSettlementViewer agreement={agreement} mode="draft" view="institutions" />
                                    </div>
                                )}
                                {institutionalTerms}
                                <div className="space-y-3 px-5 py-4">
                                    {!agreement && <p>{t('dayton.conference.previewHint')}</p>}
                                    {probeButton}
                                </div>
                            </>
                        ),
                        review: (
                            <div className="space-y-3 px-5 py-4">
                                {agreement ? (
                                    <>
                                        <section aria-label={t('dayton.conference.changes')}>
                                            <h3 className="font-bold" ref={reviewChangesHeading} tabIndex={-1}>{t('dayton.conference.changes')}</h3>
                                            {changes.length ? <ClauseLinks clauses={changes} onClause={clause => void inspectClause(clause, 'review')} />
                                                : <p>{t('dayton.conference.noChanges')}</p>}
                                        </section>
                                        <TreatyLedger treaty={agreement.treaty} signed={false} />
                                        <DaytonSettlementViewer agreement={agreement} mode="draft" view="both" />
                                    </>
                                ) : (
                                    <>
                                        <p>{t('dayton.conference.previewHint')}</p>
                                        {probeButton}
                                    </>
                                )}
                                <div className="border-t border-[#a78e5c] pt-3">
                                    <button type="button" className="dayton-live-button dayton-live-primary disabled:opacity-50"
                                        onClick={() => void handleSubmit()} disabled={!agreement || overBudget || probing}
                                        aria-disabled={submitting || undefined}>
                                        {t('dayton.conference.sign')}
                                    </button>
                                </div>
                            </div>
                        ),
                    }}
                />
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="dayton-negotiation-title"
            backdropClassName="bg-black/80 backdrop-blur-sm"
            panelClassName="w-[95%] max-w-[800px] max-h-[calc(var(--interface-viewport-height,100vh)*0.92)] overflow-auto rounded-lg border-2 border-[#8a7a60]/60 shadow-2xl"
            panelStyle={{
                background: 'linear-gradient(160deg, #f0e8d8 0%, #e0d8c0 50%, #d8ceb8 100%)',
                fontFamily: 'var(--font-command)',
            }}
        >
            <>
                {/* Header */}
                <div className="relative px-8 pt-8 pb-4 border-b-2 border-[#8a7a60]/30">
                    {headerImage && (
                        <img
                            src={headerImage}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none select-none absolute inset-x-0 top-0 h-28 w-full object-cover opacity-35"
                        />
                    )}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#1b130c]/35 to-transparent" />
                    <div className="absolute z-10 top-4 right-4 text-xs uppercase tracking-widest text-[#8a7a60]/60 font-bold rotate-[-8deg] border-2 border-[#8a7a60]/30 px-2 py-1 rounded">
                        {t('dayton.classified')}
                    </div>
                    <div className="relative z-10 text-xs uppercase tracking-[0.2em] text-[#8a7a60] font-bold mb-1">
                        {t('dayton.subtitle')}
                    </div>
                    <h2 id="dayton-negotiation-title" className="relative z-10 text-[22px] font-bold text-[#2a2016] leading-tight">
                        {t('dayton.title')}
                    </h2>
                    <div className="relative z-10 text-xs text-[#6a5a40] mt-1" style={{ fontFamily: 'var(--font-command)' }}>
                        {t('dayton.location')}
                    </div>
                </div>

                {forcedBanner}
                {budget}
                {readouts}
                {territory}
                {institutionalTerms}
                {agreement && (
                    <div className="px-8 py-4">
                        <DaytonSettlementViewer agreement={agreement} mode="draft" />
                    </div>
                )}

                {responses}
                {submission}
            </>
        </Modal>
    );
}

function ClauseLinks({ clauses, onClause }: { clauses: readonly DaytonClause[]; onClause: (clause: DaytonClause) => void }) {
    return (
        <ul className="mt-2 space-y-1 text-xs">
            {clauses.map(clause => (
                <li key={clause.id}>
                    <button type="button" className="dayton-clause-link" data-dayton-clause={clause.id} onClick={() => onClause(clause)}>
                        <strong>{clause.label}</strong><span>{clause.before} → {clause.after}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

/** A labelled 0-100 readout bar. */
function ReadoutBar({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div title={hint}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#2a2016]">{label}</span>
                <span className="text-[12px] font-bold" style={{ color, fontFamily: 'var(--font-data)' }}>
                    {Math.round(value)}
                </span>
            </div>
            <div className="h-2 rounded-full bg-[#c8b898]/40 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div className="text-xs text-[#6a5a40] italic mt-1 leading-tight">{hint}</div>
        </div>
    );
}

/** Build a package id → display name map from the pending packet. */
function packageNameLookup(dayton: DaytonData): Record<string, string> {
    const map: Record<string, string> = {};
    for (const p of dayton.territorialPackages) map[p.id] = p.name;
    for (const p of dayton.frontPackages ?? []) map[p.id] = p.name;
    for (const p of dayton.institutionalPackages) map[p.id] = p.name;
    return map;
}

/** One bot delegation's response, with counter-offer detail + adopt action. */
/**
 * The room's plain-language reading of a delegation's answer (DC A2). The engine's
 * `reason` carries cost figures and is never shown in the conference.
 */
function plainReply(faction: string, resp: IpcDaytonBotResponse): string {
    const who = t(`dayton.folder.faction.${faction}` as 'dayton.folder.faction.RS');
    const patron = t(`dayton.folder.patron.${faction}` as 'dayton.folder.patron.RS');
    const code = resp.reason_code
        ?? (resp.decision === 'accept' ? 'accept' : resp.decision === 'counter' ? 'counter_close' : 'reject');
    return t(`dayton.reply.${code}` as 'dayton.reply.accept', { faction: who, patron });
}

function BotResponseRow({
    faction,
    resp,
    reasonText,
    probedDemands,
    packageNames,
    clauses,
    onClause,
    onAdopt,
}: {
    faction: string;
    resp: IpcDaytonBotResponse;
    /** Plain-language reply shown instead of the engine's diagnostic reason (conference). */
    reasonText?: string;
    probedDemands: readonly string[];
    packageNames: Record<string, string>;
    clauses?: DaytonClause[];
    onClause: (clause: DaytonClause) => void;
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
        <div className="p-2.5 rounded border border-[#c8b898]/50 bg-[#e8dcc4]/30" data-dayton-counter={resp.decision === 'counter' ? faction : undefined}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color }}>{display}</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{
                    backgroundColor: decisionColor + '20', color: decisionColor,
                }}>
                    {decisionLabel}
                </span>
            </div>
            {(reasonText ?? resp.reason) && <p className="mt-1 text-xs">{reasonText ?? resp.reason}</p>}
            {counter && resp.decision === 'counter' && (
                <div className="mt-2 text-xs text-[#5a4a30]">
                    {clauses && <ClauseLinks clauses={clauses} onClause={onClause} />}
                    {!clauses && droppedDemands.length > 0 && (
                        <div>{t('dayton.counterDropsDemands', { items: droppedDemands.map(id => packageNames[id] ?? id).join(', ') })}</div>
                    )}
                    {(clauses ? clauses.length === 0 : droppedDemands.length === 0) && (
                        <div className="italic">{t('dayton.counterNoChange')}</div>
                    )}
                    <button
                        type="button"
                        onClick={onAdopt}
                        className="mt-1.5 text-xs px-2 py-1 rounded border font-bold uppercase text-[#8a6a3a] border-[#8a6a3a]/40 hover:bg-[#e8dcc4]"
                        style={{ fontFamily: 'var(--font-command)' }}
                    >
                        {t('dayton.adoptCounter')}
                    </button>
                </div>
            )}
        </div>
    );
}
