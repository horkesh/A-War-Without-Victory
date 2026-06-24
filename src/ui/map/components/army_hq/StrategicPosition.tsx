/**
 * StrategicPosition — 6 dimension bars showing the faction's political and
 * strategic standing. Replaces the plain StatRow list in Army HQ.
 *
 * Each bar: label + effective_value (0-100) + event_modifier indicator.
 * Composite "Negotiating Capital" bar at top — weighted score.
 * Warroom aesthetic: amber/gold accents, compact, scannable.
 */

import { useState } from 'react';
import { DIMENSION_WEIGHTS } from '../../../../sim/events/strategic_dimensions.js';
import { t, type MessageKey } from '../../i18n';

const DIMENSION_CONFIG: Array<{
    id: string;
    labelKey: MessageKey;
    color: string;
    bgColor: string;
}> = [
    { id: 'military_credibility', labelKey: 'strategicPosition.militaryCredibility', color: 'bg-red-500', bgColor: 'bg-red-500/20' },
    { id: 'territorial_legitimacy', labelKey: 'strategicPosition.territorialLegitimacy', color: 'bg-amber-500', bgColor: 'bg-amber-500/20' },
    { id: 'international_standing', labelKey: 'strategicPosition.internationalStanding', color: 'bg-blue-400', bgColor: 'bg-blue-400/20' },
    { id: 'patron_confidence', labelKey: 'strategicPosition.patronConfidence', color: 'bg-emerald-500', bgColor: 'bg-emerald-500/20' },
    { id: 'internal_cohesion', labelKey: 'strategicPosition.internalCohesion', color: 'bg-purple-400', bgColor: 'bg-purple-400/20' },
    { id: 'negotiating_leverage', labelKey: 'strategicPosition.negotiatingLeverage', color: 'bg-yellow-400', bgColor: 'bg-yellow-400/20' },
];

/** Per-faction dimension weights — canonical source: DIMENSION_WEIGHTS in strategic_dimensions.ts */
const FACTION_WEIGHTS = DIMENSION_WEIGHTS;

interface DimValue {
    base_value: number;
    event_modifier: number;
    effective_value: number;
}

interface StrategicPositionProps {
    dimensions?: Record<string, DimValue>;
    faction: string;
    compositeScore?: number;
}

function gradeColor(value: number): string {
    if (value >= 70) return 'text-emerald-400';
    if (value >= 40) return 'text-amber-400';
    return 'text-red-400';
}

function compositeGradeColor(value: number): string {
    // Friendly-state composite reads in blue-green; reserve amber/gold for
    // command-action surfaces (selection, primary CTA, presidential authority).
    if (value >= 70) return 'text-emerald-300';
    if (value >= 40) return 'text-emerald-400';
    return 'text-red-400';
}

function modifierDisplay(modifier: number): { text: string; color: string } | null {
    if (modifier === 0) return null;
    if (modifier > 0) return { text: `+${modifier}`, color: 'text-emerald-400' };
    return { text: `${modifier}`, color: 'text-red-400' };
}

function finiteMetric(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatWeight(w: number): string {
    return `${Math.round(w * 100)}%`;
}

export function StrategicPosition({ dimensions, faction, compositeScore }: StrategicPositionProps) {
    const [hoveredDim, setHoveredDim] = useState<string | null>(null);

    // Render nothing when dimensions are absent — do not occupy prime briefing
    // space with a "DATA NOT AVAILABLE" card. Decision-relevant absence belongs
    // to staff prose (Chief of Staff briefing), not a hero-sized empty card.
    if (!dimensions) {
        return null;
    }

    const weights = FACTION_WEIGHTS[faction];
    const score = finiteMetric(compositeScore);

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-3 pb-2 border-b border-panel-border">
                {t('strategicPosition.title')}
            </div>

            {/* Composite Negotiating Capital bar — friendly-state weighted composite. */}
            <div className="mb-3 pb-2 border-b border-panel-border/50">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300/90">
                        {t('strategicPosition.negotiatingCapital')}
                    </span>
                    <span className={`text-[13px] font-mono font-bold ${score == null ? 'text-text-secondary italic' : `tabular-nums ${compositeGradeColor(score)}`}`}>
                        {score == null ? t('strategicPosition.unreported') : score}
                    </span>
                </div>
                <div className="h-[6px] rounded-full bg-emerald-500/15 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-500"
                        style={{ width: `${score == null ? 0 : Math.max(0, Math.min(100, score))}%` }}
                    />
                </div>
                <div className="text-[8px] text-text-secondary/50 mt-0.5 font-mono text-right">
                    {score == null ? t('strategicPosition.compositeUnreported') : t('strategicPosition.weightedComposite')}
                </div>
            </div>

            {/* Individual dimension bars */}
            <div className="space-y-2">
                {DIMENSION_CONFIG.map(({ id, labelKey, color, bgColor }) => {
                    const dim = dimensions[id];
                    const effective = finiteMetric(dim?.effective_value);
                    const base = finiteMetric(dim?.base_value);
                    const eventMod = finiteMetric(dim?.event_modifier);
                    const mod = eventMod == null ? null : modifierDisplay(eventMod);
                    const weight = weights?.[id];
                    const isHovered = hoveredDim === id;

                    return (
                        <div
                            key={id}
                            className="group relative"
                            onMouseEnter={() => setHoveredDim(id)}
                            onMouseLeave={() => setHoveredDim(null)}
                        >
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                                    {t(labelKey)}
                                    {weight != null && (
                                        <span className="text-[8px] text-text-secondary/40 ml-1 font-mono">
                                            {formatWeight(weight)}
                                        </span>
                                    )}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {mod && (
                                        <span className={`text-[9px] font-mono font-bold ${mod.color}`}>
                                            {mod.text}
                                        </span>
                                    )}
                                    <span className={`text-[11px] font-mono font-bold ${effective == null ? 'text-text-secondary italic' : `tabular-nums ${gradeColor(effective)}`}`}>
                                        {effective == null ? t('strategicPosition.unreported') : Math.round(effective)}
                                    </span>
                                </div>
                            </div>
                            <div className={`h-[4px] rounded-full ${bgColor} overflow-hidden`}>
                                <div
                                    className={`h-full rounded-full ${color} transition-all duration-500`}
                                    style={{ width: `${effective == null ? 0 : Math.max(0, Math.min(100, effective))}%` }}
                                />
                            </div>

                            {/* Tooltip on hover */}
                            {isHovered && (
                                <div className="absolute z-50 left-0 top-full mt-1 bg-panel-bg border border-panel-border rounded px-2 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
                                    <div className="text-[9px] font-mono text-text-secondary space-y-0.5">
                                        <div>{t('strategicPosition.base')} <span className="text-text-primary font-bold">{base == null ? t('strategicPosition.unreported') : Math.round(base)}</span></div>
                                        <div>{t('strategicPosition.events')} <span className={eventMod == null ? 'text-text-secondary italic' : eventMod >= 0 ? 'text-emerald-400' : 'text-red-400'}>{eventMod == null ? t('strategicPosition.unreported') : `${eventMod >= 0 ? '+' : ''}${Math.round(eventMod)}`}</span></div>
                                        <div>{t('strategicPosition.effective')} <span className={`font-bold ${effective == null ? 'text-text-secondary italic' : gradeColor(effective)}`}>{effective == null ? t('strategicPosition.unreported') : Math.round(effective)}</span></div>
                                        {weight != null && (
                                            <div className="border-t border-panel-border/50 pt-0.5 mt-0.5">
                                                {t('strategicPosition.weight')} <span className="text-amber-400">{formatWeight(weight)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
