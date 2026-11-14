import type { CostLedger } from '../../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../../sim/endgame/endgame_comparison.js';
import type { GameVerdict } from '../../../../state/negotiation_types.js';
import { buildVerdictScene, OUTCOME_CLASS_COLOR, type VerdictSceneTone } from '../../data/verdictScene.js';
import { resolveVerdictBackground } from '../../data/verdictArt.js';
import { buildHistoricalComparisonLines } from '../../data/verdictComparison.js';
import { buildVerdictShareSummary } from '../../data/verdictShareSummary.js';
import { t, useLocale } from '../../i18n';
import { SURFACE_LABEL } from '../surface/Surface';

export interface CinematicVerdictProps {
    verdict: GameVerdict;
    costLedger?: CostLedger;
    historicalComparison?: ComparisonResult;
    focusFaction?: string;
    dateLabel: string;
    durationLabel: string;
    /** Shares under the signed settlement (all cells, overrun safe areas included). */
    settledShares?: Readonly<Record<string, number>>;
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
    // 5.0:1 on the metric card (#11141b); the former #c24040 read 3.6:1 (R8 dry run, RBiH Verdict).
    catastrophic: '#e05a5a',
    early_peace: '#6a9ec2',
};

function metricText(value: string | undefined): string {
    return value && value.trim().length > 0 ? value : t('verdict.notRecorded');
}

/**
 * The Verdict's banner (R8 ending truth pass, 2026-11-14): one headline that holds the
 * war-record grade, the outcome and any cap (shown as a chip), the Srebrenica record named
 * with its perpetrator, and the cost of the war with each figure's basis.
 */
export function CinematicVerdict({
    verdict,
    costLedger,
    historicalComparison,
    focusFaction,
    dateLabel,
    durationLabel,
    settledShares,
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
    const comparisonLines = buildHistoricalComparisonLines({ verdict, costLedger, comparison: historicalComparison, settledShares })
        .filter(line => line.id !== 'srebrenica');
    const accent = TONE_ACCENT[scene.tone];
    const outcomeColor = scene.focusOutcomeClass ? OUTCOME_CLASS_COLOR[scene.focusOutcomeClass] : accent;
    // Graceful-fallback art: a tone-mapped documentary background renders behind
    // the gradient when its asset is present; absent → null and the gradient
    // alone shows (never a broken image). A scrim over the image preserves the
    // reserved text-band legibility built into each 1920×1080 plate.
    const backgroundUrl = resolveVerdictBackground(scene.tone);

    const copySummary = () => {
        void navigator.clipboard?.writeText(shareSummary);
    };

    return (
        <section
            className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${TONE_CLASSES[scene.tone]}`}
            data-awwv-cinematic-verdict={scene.tone}
            data-awwv-verdict-bg={backgroundUrl ? 'image' : 'gradient'}
        >
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
            {/* Stacked below 2xl (UI/UX review A1): at 1280 px the cost column held four long
                comparison lines in ~300 px and the tiles wrapped side names to three lines. */}
            <div className="relative grid gap-x-10 gap-y-6 px-8 py-7 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
                <div className="flex min-w-0 flex-col gap-3">
                    <div className="font-mono text-[14px] font-semibold tracking-[0.08em] text-[#e2d6b8]">
                        {metricText(dateLabel)} / {metricText(durationLabel)} / {verdict.outcome_label}
                    </div>
                    <h1 className="m-0 text-[34px] font-semibold leading-tight text-[#f6ecd2]" data-awwv-verdict-headline>
                        {scene.headline}
                    </h1>
                    {scene.subheadline && (
                        <p className="m-0 max-w-[68ch] text-[18px] leading-relaxed text-[#e2d6b8]" data-awwv-verdict-subheadline>
                            {scene.subheadline}
                        </p>
                    )}
                    {/* The recorded genocide, named with its perpetrators, on its own line
                        (never run on after a cap sentence; §4 panel 2026-11-14). */}
                    {scene.stain && (
                        <p className="m-0 max-w-[68ch] border-l-2 border-red-400/60 pl-3 text-[18px] leading-relaxed text-[#ecdcc4]"
                           data-awwv-verdict-stain={scene.stain.relation}>
                            {scene.stain.text}
                        </p>
                    )}
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
                        <VerdictMetric label={t('verdict.metric.side')} value={scene.focusSideName} color="#f1e6c8" />
                        <VerdictMetric
                            label={t('verdict.metric.grade')}
                            value={scene.focusGrade ?? t('verdict.notRecorded')}
                            color="#f1e6c8"
                            testId="grade"
                        />
                        <VerdictMetric label={t('verdict.metric.outcome')} value={scene.focusOutcomeLabel} color={outcomeColor} testId="outcome" />
                    </div>
                    {scene.cap && (
                        <p className="m-0 inline-flex w-fit flex-wrap items-center gap-2 rounded border px-3 py-1.5 text-[16px] font-semibold"
                           style={{ borderColor: OUTCOME_CLASS_COLOR[scene.cap.to], color: OUTCOME_CLASS_COLOR[scene.cap.to] }}
                           data-awwv-verdict-cap={scene.cap.source}>
                            {scene.cap.chip}
                        </p>
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-3 border-t border-[#3a4150] pt-5 2xl:border-l 2xl:border-t-0 2xl:pl-8 2xl:pt-0">
                    <div className="text-[18px] font-semibold text-[#f1e6c8]">
                        {scene.costEmphasis.title}
                    </div>
                    <p className="m-0 text-[16px] leading-relaxed text-[#ddd1b3]">
                        {scene.costEmphasis.text}
                    </p>
                    {comparisonLines.length > 0 && (
                        <div className="flex flex-col gap-2" data-awwv-cinematic-comparison={comparisonLines.length}>
                            {comparisonLines.map(line => (
                                <div key={line.id} className="border-l-2 pl-3 text-[16px] leading-relaxed text-[#ddd1b3]"
                                     style={{ borderLeftColor: accent }}
                                     data-awwv-comparison-line={line.id}>
                                    {line.text}
                                </div>
                            ))}
                            <div className="text-[14px] text-[#b9ad94]">{t('verdict.compare.sources')}</div>
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

function VerdictMetric({ label, value, color, testId }: { label: string; value: string; color: string; testId?: string }) {
    return (
        <div className="flex min-w-0 flex-col gap-1 rounded-md border border-[#2a303c] bg-[#11141b] px-4 py-3"
             data-awwv-verdict-metric={testId}>
            <div className="text-[15px] leading-snug text-[#b9ad94]">{label}</div>
            <div className="break-words text-[19px] font-semibold leading-snug" style={{ color }}>
                {value}
            </div>
        </div>
    );
}
