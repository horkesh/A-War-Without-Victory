import type {
    DiplomacyActorView,
    LocalizedCopyToken,
    DiplomacyNeedleHintView,
    DiplomacyPressureReasonView,
    DiplomacyProposalView,
    DiplomacyTimelineEntryView,
    DiplomacyView,
    PatronConfidenceView,
    PatronDefianceCutsView,
    PlayerKnowledgeConfidence,
} from '../data/types';
import { t, type MessageKey } from '../i18n';
import { turnToDateString } from '../utils/formatters';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { resolveCommandBannerArt } from '../data/commandSurfaceArt';
import {
    SurfaceBanner,
    SurfaceCloseButton,
    SurfaceColumns,
    SurfaceContent,
    SurfaceDetail,
    SurfaceHeader,
    SurfacePanel,
    SurfaceSection,
    SurfaceSections,
    SurfaceStat,
    SURFACE_CHIP,
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SURFACE_TONE,
} from './surface/Surface';

const CONFIDENCE_BAND_KEY: Record<PatronConfidenceView['band'], MessageKey> = {
    high: 'patronRelations.confidenceBand.high',
    steady: 'patronRelations.confidenceBand.steady',
    neutral: 'patronRelations.confidenceBand.neutral',
    low: 'patronRelations.confidenceBand.low',
    collapsed: 'patronRelations.confidenceBand.collapsed',
};

function PatronConfidenceGauge({ confidence, cuts }: { confidence?: PatronConfidenceView; cuts?: PatronDefianceCutsView }) {
    if (!confidence && !cuts) return null;
    // Gauge tone: above neutral (50) is steadier (amber); below is strained (red).
    const value = confidence?.value ?? 50;
    const fillPct = Math.max(0, Math.min(100, value));
    const tone = value >= 55 ? 'bg-amber-400/70' : value >= 45 ? 'bg-amber-400/45' : 'bg-red-400/60';
    const bandLabel = confidence ? t(CONFIDENCE_BAND_KEY[confidence.band]) : '';
    return (
        <div className="rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
            {confidence ? (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[15px] font-mono uppercase tracking-[0.12em] text-text-secondary">
                            {t('patronRelations.confidenceLabel')}
                        </span>
                        <span className="text-[15px] font-mono font-bold uppercase tracking-[0.12em] text-text-primary">
                            {t('patronRelations.confidenceReadout', { value: Math.round(confidence.value), band: bandLabel })}
                        </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#262b35]" role="presentation">
                        <div className={`h-full ${tone}`} style={{ width: `${fillPct}%` }} />
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                        {t('patronRelations.confidenceHelp')}
                    </p>
                </>
            ) : null}
            {cuts ? (
                <div className={confidence ? 'mt-2 border-t border-white/8 pt-2' : ''}>
                    <p className="text-[15px] leading-relaxed text-red-300">
                        {cuts.count > 1
                            ? t('patronRelations.defianceCutMulti', {
                                count: cuts.count,
                                pct: Math.round(cuts.latestCutFraction * 100),
                                date: turnToDateString(cuts.latestTurn),
                                support: Math.round(cuts.latestSupportAfter * 100),
                            })
                            : t('patronRelations.defianceCutSingle', {
                                pct: Math.round(cuts.latestCutFraction * 100),
                                date: turnToDateString(cuts.latestTurn),
                                support: Math.round(cuts.latestSupportAfter * 100),
                            })}
                    </p>
                    {cuts.entries && cuts.entries.length > 0 ? (
                        <div className="mt-2 rounded border border-red-400/20 bg-red-500/5 px-2 py-1.5">
                            <div className="text-[15px] font-mono font-bold uppercase tracking-[0.12em] text-red-200">
                                {t('patronRelations.defianceReceipts')}
                            </div>
                            <ul className="mt-1 space-y-1">
                                {cuts.entries.map((entry, index) => (
                                    <li key={`${entry.turn}:${entry.cutFraction}:${entry.supportAfter}:${index}`} className="flex items-center justify-between gap-2 text-[15px] font-mono uppercase tracking-[0.08em] text-red-100/90">
                                        <span>{t('patronRelations.defianceReceiptTurn', { date: turnToDateString(entry.turn) })}</span>
                                        <span>{t('patronRelations.defianceReceiptImpact', {
                                            pct: Math.round(entry.cutFraction * 100),
                                            support: Math.round(entry.supportAfter * 100),
                                        })}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

interface DiplomacyPanelProps {
    view: DiplomacyView;
    onClose: () => void;
}

function localizedCopy(token: LocalizedCopyToken | undefined, fallback: string, params?: Record<string, string | number>): string {
    const localizedParams = Object.fromEntries(
        Object.entries(token?.paramKeys ?? {}).map(([name, key]) => [name, t(key as MessageKey)]),
    );
    return token ? t(token.key as MessageKey, { ...token.params, ...localizedParams, ...params }) : fallback;
}

/** A label shown in a label/value row reads without its trailing colon. */
function plainLabel(label: string): string {
    return label.replace(/\s*:\s*$/u, '');
}

/** The player's side by its full name, not an abbreviation. */
function factionDisplayName(faction: string | null | undefined): string {
    if (faction === 'RBiH') return t('desk.faction.rbih');
    if (faction === 'RS') return t('desk.faction.rs');
    if (faction === 'HRHB') return t('desk.faction.hrhb');
    return t('desk.faction.fallback');
}

function confidenceLabel(confidence: PlayerKnowledgeConfidence): string {
    return confidence === 'known' ? t('diplomacy.known') : confidence === 'likely' ? t('diplomacy.likely') : t('diplomacy.uncertain');
}

const SUPPORT_BAND_KEY: Record<DiplomacyActorView['supportBand'], MessageKey> = {
    strong: 'diplomacy.band.support.strong',
    steady: 'diplomacy.band.support.steady',
    strained: 'diplomacy.band.support.strained',
    limited: 'diplomacy.band.support.limited',
};

const CONSTRAINT_BAND_KEY: Record<DiplomacyActorView['constraintBand'], MessageKey> = {
    high: 'diplomacy.band.constraint.high',
    elevated: 'diplomacy.band.constraint.elevated',
    limited: 'diplomacy.band.constraint.limited',
    quiet: 'diplomacy.band.constraint.quiet',
};

const COMMITMENT_BAND_KEY: Record<DiplomacyActorView['commitmentBand'], MessageKey> = {
    likely: 'diplomacy.band.commitment.likely',
    uncertain: 'diplomacy.band.commitment.uncertain',
    limited: 'diplomacy.band.commitment.limited',
    unknown: 'diplomacy.band.commitment.unknown',
};

const ISOLATION_BAND_KEY: Record<DiplomacyActorView['isolationBand'], MessageKey> = {
    high: 'diplomacy.band.isolation.high',
    elevated: 'diplomacy.band.isolation.elevated',
    limited: 'diplomacy.band.isolation.limited',
    quiet: 'diplomacy.band.isolation.quiet',
};

const PRESSURE_BAND_KEY: Record<DiplomacyPressureReasonView['band'], MessageKey> = {
    high: 'diplomacy.band.pressure.high',
    medium: 'diplomacy.band.pressure.medium',
    low: 'diplomacy.band.pressure.low',
    quiet: 'diplomacy.band.pressure.quiet',
};

function ActorRow({ actor, primary = false }: { actor: DiplomacyActorView; primary?: boolean }) {
    const patronLabel = localizedCopy(actor.patronLabelToken, actor.patronLabel);
    const supportLabel = t(SUPPORT_BAND_KEY[actor.supportBand]);
    const constraintLabel = t(CONSTRAINT_BAND_KEY[actor.constraintBand]);
    const commitmentLabel = t(COMMITMENT_BAND_KEY[actor.commitmentBand]);
    const isolationLabel = t(ISOLATION_BAND_KEY[actor.isolationBand]);
    return (
        <div className={`flex flex-col gap-3 rounded-md border px-5 py-4 ${primary ? 'border-[#c9a75c]/60 bg-[#1d1f22]' : 'border-[#2a303c] bg-[#161a22]'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                    <div className={`${primary ? 'text-[22px]' : 'text-[19px]'} font-semibold leading-snug text-[#f1e6c8]`}>
                        {patronLabel}
                    </div>
                    <div className="text-[15px] text-[#b9ad94]">
                        {t('diplomacy.factionChannel', { faction: getPlayerSafeMilitaryFactionName(actor.faction) })}
                    </div>
                </div>
                {actor.sanctionsActive ? (
                    <span className={`${SURFACE_CHIP} ${SURFACE_TONE.danger}`}>
                        {t('diplomacy.sanctions')}
                    </span>
                ) : null}
            </div>
            <div className="grid grid-cols-2 gap-x-6">
                <SurfaceStat label={plainLabel(t('diplomacy.support'))} value={supportLabel} />
                <SurfaceStat label={plainLabel(t('diplomacy.constraint'))} value={constraintLabel} />
                <SurfaceStat label={plainLabel(t('diplomacy.commitment'))} value={commitmentLabel} />
                <SurfaceStat label={plainLabel(t('diplomacy.isolation'))} value={isolationLabel} />
            </div>
            <p className="m-0 text-[16px] leading-relaxed text-[#ddd1b3]">
                {localizedCopy(actor.stanceSummaryToken, actor.stanceSummary, {
                    patron: patronLabel,
                    force: getPlayerSafeMilitaryFactionName(actor.faction),
                    support: supportLabel.toLowerCase(),
                    constraint: constraintLabel.toLowerCase(),
                })}
            </p>
        </div>
    );
}

function ProposalRow({ proposal }: { proposal: DiplomacyProposalView }) {
    const name = localizedCopy(proposal.nameToken, proposal.name);
    const statusLabel = localizedCopy(proposal.statusLabelToken, proposal.statusLabel);
    const detail = localizedCopy(proposal.detailToken, proposal.detail);
    return (
        <li className="flex flex-col gap-1.5 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                    <div className="text-[18px] font-semibold leading-snug text-[#f1e6c8]">
                        {name}
                    </div>
                    <div className="text-[15px] font-semibold text-amber-200">
                        {statusLabel}
                    </div>
                </div>
                <span className="shrink-0 text-[14px] text-[#9c917b]">
                    {confidenceLabel(proposal.confidence)}
                </span>
            </div>
            <p className="m-0 text-[16px] leading-relaxed text-[#c2b69c]">
                {detail}
            </p>
        </li>
    );
}

function PressureRow({ reason }: { reason: DiplomacyPressureReasonView }) {
    const tone = reason.band === 'high' ? 'text-red-300' : reason.band === 'medium' ? 'text-amber-200' : 'text-[#f1e6c8]';
    return (
        <li className="flex items-baseline justify-between gap-3 border-b border-[#262b35] py-2.5 last:border-b-0">
            <span className="text-[16px] leading-snug text-[#ddd1b3]">{localizedCopy(reason.labelToken, reason.label)}</span>
            <span className={`shrink-0 text-right text-[15px] font-semibold ${tone}`}>
                {t(PRESSURE_BAND_KEY[reason.band])} - {confidenceLabel(reason.confidence)}
            </span>
        </li>
    );
}

function TimelineRow({ entry }: { entry: DiplomacyTimelineEntryView }) {
    return (
        <li className="flex flex-col gap-1 border-b border-[#262b35] py-2.5 last:border-b-0">
            <div className="font-mono text-[14px] font-semibold text-[#e0c27a]">
                {entry.turn != null ? turnToDateString(entry.turn) : confidenceLabel(entry.confidence)}
            </div>
            <div className="text-[16px] font-semibold leading-snug text-[#f1e6c8]">
                {localizedCopy(entry.labelToken, entry.label)}
            </div>
            <div className="text-[15px] leading-relaxed text-[#c2b69c]">
                {localizedCopy(entry.detailToken, entry.detail)}
            </div>
        </li>
    );
}

function NeedleHintRow({ hint }: { hint: DiplomacyNeedleHintView }) {
    return (
        <li className="flex flex-col gap-1.5 rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="text-[16px] font-semibold leading-snug text-[#f1e6c8]">
                    {localizedCopy(hint.labelToken, hint.label)}
                </div>
                <span className="shrink-0 text-[14px] text-amber-200">
                    {confidenceLabel(hint.confidence)}
                </span>
            </div>
            <p className="m-0 text-[15px] leading-relaxed text-[#c2b69c]">
                {localizedCopy(hint.detailToken, hint.detail)}
            </p>
        </li>
    );
}

export function DiplomacyPanel({ view, onClose }: DiplomacyPanelProps) {
    // Patron Relations reframe: the player's own patron (view.patronStance) leads as the
    // headline ("what the patron will tolerate / current material support"). Other patrons
    // (externalActors) are kept as context. General-diplomacy signals (IVP pressureReasons,
    // activeConsequences, needleHints) sit apart, as "Related Diplomatic Tracks" in the
    // right-hand column — read-model unchanged, presentation only.
    //
    // Surface redesign (owner, 2026-11-10): one surface in the Command Surface's style —
    // header, the patron and proposals in the middle under the diplomacy art, the related
    // tracks on the right; each column scrolls on its own.
    const hasRelatedTracks =
        view.pressureReasons.length > 0 ||
        view.activeConsequences.length > 0 ||
        view.negotiationTimeline.length > 0 ||
        view.needleHints.length > 0;
    const patronlessRBiH = view.playerFaction === 'RBiH';
    const bannerArt = resolveCommandBannerArt('cat_diplomacy', view.playerFaction ?? null);
    return (
        <div className="fixed inset-0 z-[70] bg-[#05070a]/70" role="presentation">
            <section
                data-testid="diplomacy-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="diplomacy-panel-title"
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        onClose();
                    }
                }}
                className="absolute bottom-28 left-1/2 top-[4.5rem] flex w-[min(110rem,calc(100%-3rem))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
            >
                <SurfaceHeader
                    eyebrow={factionDisplayName(view.playerFaction)}
                    title={<span id="diplomacy-panel-title">{t(patronlessRBiH ? 'diplomacy.rbih.title' : 'patronRelations.title')}</span>}
                    close={<SurfaceCloseButton onClick={onClose} aria-label={t('patronRelations.closePanel')} />}
                />

                <SurfaceColumns layout={hasRelatedTracks ? 'content-wide-detail' : 'single'}>
                    <SurfaceContent>
                        {/* The title is in the header; the banner carries the subtitle, not a repeat. */}
                        <SurfaceBanner
                            art={bannerArt}
                            title={t(patronlessRBiH ? 'diplomacy.rbih.subtitle' : 'patronRelations.subtitle')}
                        />
                        <SurfaceSections className={hasRelatedTracks ? undefined : 'max-w-[80rem]'}>
                            {view.patronStance ? (
                                <SurfaceSection label={t('patronRelations.headline')}>
                                    <ActorRow actor={view.patronStance} primary />
                                    <PatronConfidenceGauge confidence={view.patronConfidence} cuts={view.patronDefianceCuts} />
                                </SurfaceSection>
                            ) : (
                                <SurfacePanel>
                                    <div className="text-[19px] font-semibold text-[#f1e6c8]">
                                        {t(patronlessRBiH ? 'diplomacy.rbih.noPatron' : 'patronRelations.noPatron')}
                                    </div>
                                    <p className="m-0 mt-2 text-[16px] leading-relaxed text-[#c2b69c]">
                                        {t(patronlessRBiH ? 'diplomacy.rbih.noPatronHelp' : 'patronRelations.noPatronHelp')}
                                    </p>
                                </SurfacePanel>
                            )}

                            {view.externalActors.length > 0 ? (
                                <SurfaceSection label={t('patronRelations.otherPatrons')}>
                                    {view.externalActors.map((actor) => <ActorRow key={`${actor.faction}:${actor.patronId}`} actor={actor} />)}
                                </SurfaceSection>
                            ) : null}

                            {view.activeProposals.length > 0 ? (
                                <SurfaceSection label={t('diplomacy.activeProposals')}>
                                    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                                        {view.activeProposals.map((proposal) => <ProposalRow key={proposal.id} proposal={proposal} />)}
                                    </ul>
                                </SurfaceSection>
                            ) : null}
                        </SurfaceSections>
                    </SurfaceContent>

                    {hasRelatedTracks ? (
                        <SurfaceDetail aria-label={t('patronRelations.relatedTracks')} data-testid="diplomacy-related-tracks">
                            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-7 py-6">
                                <div className={SURFACE_LABEL}>{t('patronRelations.relatedTracks')}</div>
                                {view.pressureReasons.length > 0 || view.activeConsequences.length > 0 ? (
                                    <section aria-label={t('diplomacy.internationalPressure')} className="flex flex-col gap-2">
                                        <div className={SURFACE_LABEL_MUTED}>
                                            {t('diplomacy.internationalPressure')}
                                        </div>
                                        <ul className="m-0 list-none p-0">
                                            {view.pressureReasons.map((reason) => <PressureRow key={reason.key} reason={reason} />)}
                                        </ul>
                                        {view.activeConsequences.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {view.activeConsequences.map((item) => (
                                                    <span key={item.id} className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>
                                                        {localizedCopy(item.labelToken, item.label)}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </section>
                                ) : null}

                                {view.negotiationTimeline.length > 0 ? (
                                    <section aria-label={t('diplomacy.negotiationTimeline')} className="flex flex-col gap-2">
                                        <div className={SURFACE_LABEL_MUTED}>
                                            {t('diplomacy.negotiationTimeline')}
                                        </div>
                                        <ul className="m-0 list-none p-0">
                                            {view.negotiationTimeline.map((entry) => <TimelineRow key={entry.id} entry={entry} />)}
                                        </ul>
                                    </section>
                                ) : null}

                                {view.needleHints.length > 0 ? (
                                    <section aria-label={t('diplomacy.needleMovesAria')} className="flex flex-col gap-2">
                                        <div className={SURFACE_LABEL_MUTED}>
                                            {t('diplomacy.needleMoves')}
                                        </div>
                                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                            {view.needleHints.map((hint) => <NeedleHintRow key={hint.id} hint={hint} />)}
                                        </ul>
                                    </section>
                                ) : null}
                            </div>
                        </SurfaceDetail>
                    ) : null}
                </SurfaceColumns>
            </section>
        </div>
    );
}
