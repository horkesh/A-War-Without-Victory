import type { CostLedger } from '../../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../../sim/endgame/endgame_comparison.js';
import type { GameVerdict } from '../../../../state/negotiation_types.js';
import { buildVerdictScene, type VerdictSceneTone } from '../../data/verdictScene.js';
import { resolveVerdictBackground } from '../../data/verdictArt.js';
import { formatHistoricalDivergenceNote } from '../../data/historicalDivergenceNotes.js';
import { buildVerdictShareSummary } from '../../data/verdictShareSummary.js';
import { t, useLocale } from '../../i18n';
import { formatFindingSeverity } from '../WarCostSummary';
import { SURFACE_LABEL } from '../surface/Surface';

export interface CinematicVerdictProps {
    verdict: GameVerdict;
    costLedger?: CostLedger;
    historicalComparison?: ComparisonResult;
    focusFaction?: string;
    dateLabel: string;
    durationLabel: string;
}

const TONE_CLASSES: Record<VerdictSceneTone, string> = {
    somber: 'from-zinc-950 via-stone-950 to-neutral-950',
    pyrrhic: 'from-stone-950 via-zinc-950 to-amber-950/60',
    catastrophic: 'from-neutral-950 via-red-950/60 to-zinc-950',
    early_peace: 'from-zinc-950 via-emerald-950/40 to-stone-950',
};

const TONE_ACCENT: Record<VerdictSceneTone, string> = {
    somber: '#9a9080',
    pyrrhic: '#c4a35a',
    catastrophic: '#c24040',
    early_peace: '#6a9ec2',
};

function metricText(value: string | undefined): string {
    return value && value.trim().length > 0 ? value : t('verdict.notRecorded');
}

export function CinematicVerdict({
    verdict,
    costLedger,
    historicalComparison,
    focusFaction,
    dateLabel,
    durationLabel,
}: CinematicVerdictProps) {
    useLocale();
    const scene = buildVerdictScene({
        verdict,
        costLedger,
        historicalComparison,
        focusFaction,
    });
    const shareSummary = buildVerdictShareSummary({
        verdict,
        costLedger,
        historicalComparison,
        focusFaction,
    });
    const accent = TONE_ACCENT[scene.tone];
    // Graceful-fallback art: a tone-mapped documentary background renders behind
    // the gradient when its asset is present; absent → null and the gradient
    // alone shows (never a broken image). A scrim over the image preserves the
    // reserved text-band legibility built into each 1920×1080 plate.
    const backgroundUrl = resolveVerdictBackground(scene.tone);
    const comparisonCallouts = (historicalComparison?.divergence_notes ?? [])
        .filter(note => note.trim().length > 0)
        .slice(0, 3);

    const copySummary = () => {
        void navigator.clipboard?.writeText(shareSummary);
    };

    return (
        <section
            className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${TONE_CLASSES[scene.tone]}`}
            data-awwv-cinematic-verdict={scene.tone}
            data-awwv-verdict-bg={backgroundUrl ? 'image' : 'gradient'}
        >
            {/* Tone-mapped documentary background (graceful fallback): renders
                behind the content only when its asset resolves; otherwise the
                gradient above stands alone. A scrim keeps the reserved text band
                legible over the 1920×1080 plate. */}
            {backgroundUrl && (
                <>
                    <div
                        aria-hidden="true"
                        data-awwv-verdict-bg-image
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-black/80"
                    />
                </>
            )}
            <div
                className="absolute inset-x-0 top-0 h-px opacity-80"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
            />
            {/* Surface redesign, step 4 (2026-11-12): the scene is the verdict surface's
                banner — 34px headline, 18px reading text, figure tiles; every string unchanged. */}
            <div className="relative grid gap-x-10 gap-y-6 px-8 py-7 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
                <div className="flex min-w-0 flex-col gap-3">
                    <div className="font-mono text-[14px] font-semibold tracking-[0.08em] text-[#e2d6b8]">
                        {metricText(dateLabel)} / {metricText(durationLabel)} / {verdict.outcome_label}
                    </div>
                    <h1 className="m-0 text-[34px] font-semibold leading-tight text-[#f6ecd2]">
                        {scene.headline}
                    </h1>
                    <p className="m-0 max-w-[62ch] text-[18px] leading-relaxed text-[#e2d6b8]">
                        {scene.subheadline}
                    </p>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <VerdictMetric label={t('verdict.metric.focus')} value={scene.focusFaction ?? t('verdict.campaign')} accent={accent} />
                        <VerdictMetric label={t('verdict.metric.outcome')} value={scene.focusOutcomeLabel} accent={accent} />
                        <VerdictMetric label={t('verdict.metric.costSignal')} value={formatFindingSeverity(scene.costEmphasis.severity)} accent={accent} />
                    </div>
                </div>

                <div className="flex min-w-0 flex-col gap-3 border-t border-[#3a4150] pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                    <div className="text-[18px] font-semibold text-[#f1e6c8]">
                        {scene.costEmphasis.title}
                    </div>
                    <p className="m-0 text-[16px] leading-relaxed text-[#ddd1b3]">
                        {scene.costEmphasis.text}
                    </p>
                    {comparisonCallouts.length > 0 && (
                        <div className="flex flex-col gap-2" data-awwv-cinematic-comparison={comparisonCallouts.length}>
                            {comparisonCallouts.map(callout => (
                                <div key={callout} className="border-l-2 pl-3 text-[16px] leading-relaxed text-[#ddd1b3]"
                                     style={{ borderLeftColor: accent }}>
                                    {formatHistoricalDivergenceNote(callout)}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-1 flex flex-col gap-2 border-t border-[#3a4150] pt-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className={SURFACE_LABEL}>
                                {t('verdict.shareSummary')}
                            </div>
                            <button
                                type="button"
                                onClick={copySummary}
                                className="h-10 shrink-0 rounded border border-[#3a4150] bg-[#1b2029] px-4 text-[15px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60"
                            >
                                {t('verdict.copy')}
                            </button>
                        </div>
                        <pre
                            role="region"
                            tabIndex={0}
                            aria-label={t('verdict.shareSummary')}
                            className="m-0 hidden max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border border-[#2a303c] bg-[#0f1218] px-3 py-2 font-mono text-[14px] leading-relaxed text-[#c2b69c] sm:block"
                        >
                            {shareSummary}
                        </pre>
                    </div>
                </div>
            </div>
        </section>
    );
}

function VerdictMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <div className="flex min-w-0 flex-col gap-1 rounded-md border border-[#2a303c] bg-[#11141b] px-4 py-3">
            <div className="text-[15px] leading-snug text-[#b9ad94]">{label}</div>
            <div className="break-words text-[19px] font-semibold leading-snug" style={{ color: accent }}>
                {value}
            </div>
        </div>
    );
}
