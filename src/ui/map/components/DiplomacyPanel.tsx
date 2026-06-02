import type {
    DiplomacyActorView,
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
        <div className="mt-2 rounded border border-white/10 bg-black/20 p-3">
            {confidence ? (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary">
                            {t('patronRelations.confidenceLabel')}
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-text-primary">
                            {t('patronRelations.confidenceReadout', { value: Math.round(confidence.value), band: bandLabel })}
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10" role="presentation">
                        <div className={`h-full ${tone}`} style={{ width: `${fillPct}%` }} />
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-text-secondary">
                        {t('patronRelations.confidenceHelp')}
                    </p>
                </>
            ) : null}
            {cuts ? (
                <p className={`text-[11px] leading-5 text-red-300 ${confidence ? 'mt-2 border-t border-white/8 pt-2' : ''}`}>
                    {cuts.count > 1
                        ? t('patronRelations.defianceCutMulti', {
                            count: cuts.count,
                            pct: Math.round(cuts.latestCutFraction * 100),
                            turn: cuts.latestTurn,
                            support: Math.round(cuts.latestSupportAfter * 100),
                        })
                        : t('patronRelations.defianceCutSingle', {
                            pct: Math.round(cuts.latestCutFraction * 100),
                            turn: cuts.latestTurn,
                            support: Math.round(cuts.latestSupportAfter * 100),
                        })}
                </p>
            ) : null}
        </div>
    );
}

interface DiplomacyPanelProps {
    view: DiplomacyView;
    onClose: () => void;
}

function titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

function confidenceLabel(confidence: PlayerKnowledgeConfidence): string {
    return confidence === 'known' ? t('diplomacy.known') : confidence === 'likely' ? t('diplomacy.likely') : t('diplomacy.uncertain');
}

function ActorRow({ actor, primary = false }: { actor: DiplomacyActorView; primary?: boolean }) {
    return (
        <div className={`rounded border ${primary ? 'border-amber-400/35 bg-amber-400/8' : 'border-white/10 bg-black/20'} p-3`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-text-primary">
                        {actor.patronLabel}
                    </div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary">
                        {t('diplomacy.factionChannel', { faction: actor.faction })}
                    </div>
                </div>
                {actor.sanctionsActive ? (
                    <span className="rounded border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-red-300">
                        {t('diplomacy.sanctions')}
                    </span>
                ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono uppercase tracking-[0.1em] text-text-secondary">
                <span>{t('diplomacy.support')} <b className="text-text-primary">{titleCase(actor.supportBand)}</b></span>
                <span>{t('diplomacy.constraint')} <b className="text-text-primary">{titleCase(actor.constraintBand)}</b></span>
                <span>{t('diplomacy.commitment')} <b className="text-text-primary">{titleCase(actor.commitmentBand)}</b></span>
                <span>{t('diplomacy.isolation')} <b className="text-text-primary">{titleCase(actor.isolationBand)}</b></span>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-text-secondary">
                {actor.stanceSummary}
            </p>
        </div>
    );
}

function ProposalRow({ proposal }: { proposal: DiplomacyProposalView }) {
    return (
        <li className="rounded border border-white/10 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-text-primary">
                        {proposal.name}
                    </div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.1em] text-amber-300">
                        {proposal.statusLabel}
                    </div>
                </div>
                <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.12em] text-text-secondary">
                    {confidenceLabel(proposal.confidence)}
                </span>
            </div>
            <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-text-secondary">
                {proposal.detail}
            </p>
        </li>
    );
}

function PressureRow({ reason }: { reason: DiplomacyPressureReasonView }) {
    const tone = reason.band === 'high' ? 'text-red-300' : reason.band === 'medium' ? 'text-amber-300' : 'text-text-primary';
    return (
        <li className="flex items-center justify-between gap-3 border-b border-white/8 py-2 last:border-b-0">
            <span className="text-[11px] text-text-primary">{reason.label}</span>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.12em] ${tone}`}>
                {titleCase(reason.band)} - {confidenceLabel(reason.confidence)}
            </span>
        </li>
    );
}

function TimelineRow({ entry }: { entry: DiplomacyTimelineEntryView }) {
    return (
        <li className="flex gap-3 border-b border-white/8 py-2 last:border-b-0">
            <div className="w-14 shrink-0 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-amber-300">
                {entry.turn != null ? `T${entry.turn}` : confidenceLabel(entry.confidence)}
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-mono font-bold uppercase tracking-[0.1em] text-text-primary">
                    {entry.label}
                </div>
                <div className="mt-1 text-[10px] leading-4 text-text-secondary">
                    {entry.detail}
                </div>
            </div>
        </li>
    );
}

function NeedleHintRow({ hint }: { hint: DiplomacyNeedleHintView }) {
    return (
        <li className="rounded border border-amber-400/20 bg-amber-400/8 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] font-mono font-bold uppercase tracking-[0.1em] text-text-primary">
                    {hint.label}
                </div>
                <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.12em] text-amber-300">
                    {confidenceLabel(hint.confidence)}
                </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-text-secondary">
                {hint.detail}
            </p>
        </li>
    );
}

export function DiplomacyPanel({ view, onClose }: DiplomacyPanelProps) {
    // Patron Relations reframe: the player's own patron (view.patronStance) leads as the
    // headline ("what the patron will tolerate / current material support"). Other patrons
    // (externalActors) are kept as context. General-diplomacy signals (IVP pressureReasons,
    // activeConsequences, needleHints) are de-emphasised into a "Related Diplomatic Tracks"
    // section at the bottom — read-model unchanged, presentation reframe only.
    const hasRelatedTracks =
        view.pressureReasons.length > 0 ||
        view.activeConsequences.length > 0 ||
        view.negotiationTimeline.length > 0 ||
        view.needleHints.length > 0;
    return (
        <div className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[1px]" role="presentation">
            <section
                data-testid="diplomacy-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="diplomacy-panel-title"
                className="absolute right-4 top-16 flex max-h-[calc(100vh-5rem)] w-[min(31rem,calc(100vw-2rem))] flex-col overflow-hidden rounded border border-amber-400/25 bg-[#101018]/95 shadow-2xl"
            >
                <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <div>
                        <h2 id="diplomacy-panel-title" className="text-[13px] font-mono font-bold uppercase tracking-[0.16em] text-amber-300">
                            {t('patronRelations.title')}
                        </h2>
                        <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary">
                            {t('patronRelations.subtitle')}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded border border-white/10 px-2 py-1 text-[11px] font-mono font-bold text-text-secondary hover:border-amber-400/40 hover:text-amber-300"
                        aria-label={t('patronRelations.closePanel')}
                    >
                        X
                    </button>
                </header>

                <div className="space-y-4 overflow-y-auto px-4 py-4">
                    {view.patronStance ? (
                        <section aria-label={t('patronRelations.headline')}>
                            <div className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-amber-300">
                                {t('patronRelations.headline')}
                            </div>
                            <ActorRow actor={view.patronStance} primary />
                            <PatronConfidenceGauge confidence={view.patronConfidence} cuts={view.patronDefianceCuts} />
                        </section>
                    ) : (
                        <div className="rounded border border-white/10 bg-black/20 p-4">
                            <div className="text-[12px] font-mono font-bold uppercase tracking-[0.14em] text-text-primary">
                                {t('patronRelations.noPatron')}
                            </div>
                            <p className="mt-2 text-[11px] leading-5 text-text-secondary">
                                {t('patronRelations.noPatronHelp')}
                            </p>
                        </div>
                    )}

                    {view.externalActors.length > 0 ? (
                        <section aria-label={t('patronRelations.otherPatrons')}>
                            <div className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-secondary">
                                {t('patronRelations.otherPatrons')}
                            </div>
                            <div className="space-y-2">
                                {view.externalActors.map((actor) => <ActorRow key={`${actor.faction}:${actor.patronId}`} actor={actor} />)}
                            </div>
                        </section>
                    ) : null}

                    {view.activeProposals.length > 0 ? (
                        <section aria-label={t('diplomacy.activeProposals')}>
                            <div className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-secondary">
                                {t('diplomacy.activeProposals')}
                            </div>
                            <ul className="space-y-2">
                                {view.activeProposals.map((proposal) => <ProposalRow key={proposal.id} proposal={proposal} />)}
                            </ul>
                        </section>
                    ) : null}

                    {hasRelatedTracks ? (
                        <details className="rounded border border-white/8 bg-black/10 px-3 py-2 [&_summary]:list-none">
                            <summary className="cursor-pointer text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-secondary/80">
                                {t('patronRelations.relatedTracks')}
                            </summary>
                            <div className="mt-3 space-y-4">
                                {view.pressureReasons.length > 0 || view.activeConsequences.length > 0 ? (
                                    <section aria-label={t('diplomacy.internationalPressure')}>
                                        <div className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-secondary">
                                            {t('diplomacy.internationalPressure')}
                                        </div>
                                        <div className="rounded border border-white/10 bg-black/20 px-3">
                                            <ul>
                                                {view.pressureReasons.map((reason) => <PressureRow key={reason.key} reason={reason} />)}
                                            </ul>
                                            {view.activeConsequences.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 border-t border-white/8 py-3">
                                                    {view.activeConsequences.map((item) => (
                                                        <span key={item.id} className="rounded border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.1em] text-amber-200">
                                                            {item.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </section>
                                ) : null}

                                {view.negotiationTimeline.length > 0 ? (
                                    <section aria-label="Negotiation timeline">
                                        <div className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-secondary">
                                            Negotiation Timeline
                                        </div>
                                        <div className="rounded border border-white/10 bg-black/20 px-3">
                                            <ul>
                                                {view.negotiationTimeline.map((entry) => <TimelineRow key={entry.id} entry={entry} />)}
                                            </ul>
                                        </div>
                                    </section>
                                ) : null}

                                {view.needleHints.length > 0 ? (
                                    <section aria-label="What would move the needle">
                                        <div className="mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-secondary">
                                            What Moves The Needle
                                        </div>
                                        <ul className="space-y-2">
                                            {view.needleHints.map((hint) => <NeedleHintRow key={hint.id} hint={hint} />)}
                                        </ul>
                                    </section>
                                ) : null}
                            </div>
                        </details>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
