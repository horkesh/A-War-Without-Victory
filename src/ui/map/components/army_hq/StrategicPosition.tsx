/**
 * StrategicPosition — 6 dimension bars showing the faction's political and
 * strategic standing. Replaces the plain StatRow list in Army HQ.
 *
 * Each bar: label + effective_value (0-100) + event_modifier indicator.
 * Warroom aesthetic: amber/gold accents, compact, scannable.
 */

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

interface DimValue {
    base_value: number;
    event_modifier: number;
    effective_value: number;
}

interface StrategicPositionProps {
    dimensions?: Record<string, DimValue>;
    faction: string;
}

function gradeColor(value: number): string {
    if (value >= 70) return 'text-emerald-400';
    if (value >= 40) return 'text-amber-400';
    return 'text-red-400';
}

function modifierDisplay(modifier: number): { text: string; color: string } | null {
    if (modifier === 0) return null;
    if (modifier > 0) return { text: `+${modifier}`, color: 'text-emerald-400' };
    return { text: `${modifier}`, color: 'text-red-400' };
}

export function StrategicPosition({ dimensions, faction }: StrategicPositionProps) {
    if (!dimensions) {
        return (
            <div className="bg-panel-card border border-panel-border rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-3 pb-2 border-b border-panel-border">
                    STRATEGIC POSITION
                </div>
                <div className="text-[11px] text-text-secondary/60 italic py-4 font-mono text-center">
                    DIMENSION DATA NOT AVAILABLE
                </div>
            </div>
        );
    }

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-3 pb-2 border-b border-panel-border">
                STRATEGIC POSITION
            </div>
            <div className="space-y-2">
                {DIMENSION_CONFIG.map(({ id, label, color, bgColor }) => {
                    const dim = dimensions[id];
                    const effective = dim?.effective_value ?? 50;
                    const mod = modifierDisplay(dim?.event_modifier ?? 0);

                    return (
                        <div key={id} className="group">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                                    {label}
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
