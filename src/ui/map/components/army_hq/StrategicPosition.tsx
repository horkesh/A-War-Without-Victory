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

const DIMENSION_CONFIG: Array<{
    id: string;
    label: string;
    color: string;
    bgColor: string;
}> = [
    { id: 'military_credibility', label: 'Military Credibility', color: 'bg-red-500', bgColor: 'bg-red-500/20' },
    { id: 'territorial_legitimacy', label: 'Territorial Legitimacy', color: 'bg-amber-500', bgColor: 'bg-amber-500/20' },
    { id: 'international_standing', label: 'International Standing', color: 'bg-blue-400', bgColor: 'bg-blue-400/20' },
    { id: 'patron_confidence', label: 'Patron Confidence', color: 'bg-emerald-500', bgColor: 'bg-emerald-500/20' },
    { id: 'internal_cohesion', label: 'Internal Cohesion', color: 'bg-purple-400', bgColor: 'bg-purple-400/20' },
    { id: 'negotiating_leverage', label: 'Negotiating Leverage', color: 'bg-yellow-400', bgColor: 'bg-yellow-400/20' },
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
    const score = compositeScore ?? 50;

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-3 pb-2 border-b border-panel-border">
                STRATEGIC POSITION
            </div>

            {/* Composite Negotiating Capital bar — friendly-state weighted composite. */}
            <div className="mb-3 pb-2 border-b border-panel-border/50">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-300/90">
                        NEGOTIATING CAPITAL
                    </span>
                    <span className={`text-[13px] font-mono font-bold tabular-nums ${compositeGradeColor(score)}`}>
                        {score}
                    </span>
                </div>
                <div className="h-[6px] rounded-full bg-emerald-500/15 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                </div>
                <div className="text-[8px] text-text-secondary/50 mt-0.5 font-mono text-right">
                    WEIGHTED COMPOSITE
                </div>
            </div>

            {/* Individual dimension bars */}
            <div className="space-y-2">
                {DIMENSION_CONFIG.map(({ id, label, color, bgColor }) => {
                    const dim = dimensions[id];
                    const effective = dim?.effective_value ?? 50;
                    const base = dim?.base_value ?? 50;
                    const eventMod = dim?.event_modifier ?? 0;
                    const mod = modifierDisplay(eventMod);
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
                                    {label}
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
                                    <span className={`text-[11px] font-mono font-bold tabular-nums ${gradeColor(effective)}`}>
                                        {Math.round(effective)}
                                    </span>
                                </div>
                            </div>
                            <div className={`h-[4px] rounded-full ${bgColor} overflow-hidden`}>
                                <div
                                    className={`h-full rounded-full ${color} transition-all duration-500`}
                                    style={{ width: `${Math.max(0, Math.min(100, effective))}%` }}
                                />
                            </div>

                            {/* Tooltip on hover */}
                            {isHovered && (
                                <div className="absolute z-50 left-0 top-full mt-1 bg-panel-bg border border-panel-border rounded px-2 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
                                    <div className="text-[9px] font-mono text-text-secondary space-y-0.5">
                                        <div>Base: <span className="text-text-primary font-bold">{Math.round(base)}</span></div>
                                        <div>Events: <span className={eventMod >= 0 ? 'text-emerald-400' : 'text-red-400'}>{eventMod >= 0 ? '+' : ''}{Math.round(eventMod)}</span></div>
                                        <div>Effective: <span className={`font-bold ${gradeColor(effective)}`}>{Math.round(effective)}</span></div>
                                        {weight != null && (
                                            <div className="border-t border-panel-border/50 pt-0.5 mt-0.5">
                                                Weight: <span className="text-amber-400">{formatWeight(weight)}</span>
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
