import type { CostLedger } from '../../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../../sim/endgame/endgame_comparison.js';
import type { GameVerdict } from '../../../../state/negotiation_types.js';
import { buildVerdictScene, type VerdictSceneTone } from '../../data/verdictScene.js';
import { buildVerdictShareSummary } from '../../data/verdictShareSummary.js';

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
    return value && value.trim().length > 0 ? value : 'Not recorded';
}

export function CinematicVerdict({
    verdict,
    costLedger,
    historicalComparison,
    focusFaction,
    dateLabel,
    durationLabel,
}: CinematicVerdictProps) {
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
        >
            <div
                className="absolute inset-x-0 top-0 h-px opacity-80"
                style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
            />
            <div className="relative grid gap-3 px-4 py-3 sm:gap-5 sm:px-7 sm:py-5 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="min-w-0">
                    <div className="text-[10px] text-text-secondary">
                        {metricText(dateLabel)} / {metricText(durationLabel)} / {verdict.outcome_label}
                    </div>
                    <h1 className="mt-1 text-[24px] font-semibold leading-tight text-text-primary sm:mt-2 sm:text-[34px]">
                        {scene.headline}
                    </h1>
                    <p className="mt-2 max-w-[62ch] text-[12px] leading-relaxed text-text-secondary sm:mt-3 sm:text-[13px]">
                        {scene.subheadline}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
                        <VerdictMetric label="Focus" value={scene.focusFaction ?? 'Campaign'} accent={accent} />
                        <VerdictMetric label="Outcome" value={scene.focusOutcomeLabel} accent={accent} />
                        <VerdictMetric label="Cost Signal" value={scene.costEmphasis.severity.toString()} accent={accent} />
                    </div>
                </div>

                <div className="min-w-0 border-t border-panel-border/70 pt-3 sm:pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <div className="text-[10px] font-semibold text-text-primary">
                        {scene.costEmphasis.title}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-text-secondary sm:mt-2 sm:text-[12px]">
                        {scene.costEmphasis.text}
                    </p>
                    {comparisonCallouts.length > 0 && (
                        <div className="mt-2 space-y-1 sm:mt-4 sm:space-y-2" data-awwv-cinematic-comparison={comparisonCallouts.length}>
                            {comparisonCallouts.map(callout => (
                                <div key={callout} className="border-l-2 pl-2 text-[10px] leading-relaxed text-text-secondary sm:pl-3 sm:text-[11px]"
                                     style={{ borderLeftColor: accent }}>
                                    {callout}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-2 border-t border-panel-border/70 pt-2 sm:mt-4 sm:pt-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-[10px] font-semibold text-text-primary">
                                Share Summary
                            </div>
                            <button
                                type="button"
                                onClick={copySummary}
                                className="shrink-0 border border-panel-border px-3 py-1 text-[10px] font-semibold text-text-secondary hover:bg-white/5"
                            >
                                Copy
                            </button>
                        </div>
                        <pre className="mt-2 hidden max-h-28 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-text-secondary/85 sm:block">
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
        <div className="min-w-0 border-t border-panel-border/70 pt-2">
            <div className="text-[9px] text-text-secondary/70">{label}</div>
            <div className="mt-1 break-words text-[12px] font-semibold text-text-primary" style={{ color: accent }}>
                {value}
            </div>
        </div>
    );
}
