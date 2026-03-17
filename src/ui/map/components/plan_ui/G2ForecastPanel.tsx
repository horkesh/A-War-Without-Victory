import { useMemo } from 'react';
import { CorpsFrontSectorView } from '../../data/types';

interface G2ForecastPanelProps {
    opType: 'offensive' | 'feint' | 'recon';
    tempo: 'slow' | 'normal' | 'fast';
    axisCount: number;
    sector?: CorpsFrontSectorView;
}

export function G2ForecastPanel({ opType, tempo, axisCount, sector }: G2ForecastPanelProps) {
    const odds = useMemo(() => {
        let base = 65;
        if (opType === 'feint') base = 85;
        if (opType === 'recon') base = 90;

        if (tempo === 'fast') base -= 10;
        if (tempo === 'slow') base += 5;

        base += (axisCount - 1) * 5;

        if (sector?.density) {
            base -= Math.floor(sector.density * 20);
        }

        return Math.max(10, Math.min(98, base));
    }, [opType, tempo, axisCount, sector]);

    const duration = useMemo(() => {
        let base = axisCount * 2;
        if (tempo === 'fast') base *= 0.7;
        if (tempo === 'slow') base *= 1.4;
        return Math.ceil(base);
    }, [axisCount, tempo]);

    const casualties = useMemo(() => {
        let base = axisCount * 500;
        if (tempo === 'fast') base *= 1.5;
        if (tempo === 'slow') base *= 0.6;
        if (opType === 'feint') base *= 0.4;
        return Math.round(base / 50) * 50;
    }, [axisCount, tempo, opType]);

    // Gauge color based on odds
    const gaugeColor = odds > 65 ? '#4a9a55' : odds > 40 ? '#c4a35a' : '#c24040';

    return (
        <div className="flex-1 flex flex-col space-y-5">
            <div className="flex items-center justify-between border-b border-[rgba(180,160,130,0.15)] pb-2">
                <h3 className="text-[10px] font-black text-accent-gold uppercase tracking-[0.2em]">G-2 Intelligence Forecast</h3>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
            </div>

            {/* Gauge */}
            <div className="relative h-44 flex flex-col items-center justify-center">
                <div className="absolute inset-0 border-[8px] border-[rgba(180,160,130,0.06)] rounded-full" />
                <div className="text-4xl font-black text-text-primary font-mono tracking-tighter">{odds}%</div>
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">Success Probability</div>

                <svg className="absolute inset-0 -rotate-90 w-full h-full p-2">
                    <circle
                        cx="50%" cy="50%" r="46%"
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth="8"
                        strokeDasharray="289"
                        strokeDashoffset={289 - (289 * (odds / 100))}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: `drop-shadow(0 0 4px ${gaugeColor}40)` }}
                    />
                </svg>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-panel-card border border-[rgba(180,160,130,0.1)] p-3 rounded space-y-1">
                    <div className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">Est. Duration</div>
                    <div className="text-xl font-mono text-text-primary leading-none">{duration} <span className="text-[10px] text-text-secondary">WEEKS</span></div>
                </div>
                <div className="bg-panel-card border border-[rgba(180,160,130,0.1)] p-3 rounded space-y-1">
                    <div className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">Expected Losses</div>
                    <div className="text-xl font-mono text-rs leading-none">~{casualties.toLocaleString()}</div>
                </div>
            </div>

            <div className="bg-accent-gold/5 border border-accent-gold/10 p-4 rounded space-y-2">
                <div className="text-[9px] font-black text-accent-gold uppercase tracking-[0.2em]">Operational Analysis</div>
                <p className="text-[11px] text-text-secondary leading-relaxed italic">
                    {odds > 70
                        ? "Conditions are favorable for a breakthrough. Aggressive tempo encouraged to maximize regional disruption."
                        : odds > 40
                            ? "Operation carries moderate risk. Recommend methodical preparation to sustain offensive momentum."
                            : "High risk of repulsion. Assigned forces insufficient for objective density."
                    }
                </p>
            </div>

            <div className="flex-1" />

            <div className="space-y-1.5 opacity-60">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-text-secondary">
                    <span>SIGINT Reliability</span>
                    <span>88%</span>
                </div>
                <div className="h-0.5 bg-[rgba(180,160,130,0.1)] w-full rounded-full">
                    <div className="h-full bg-accent-gold/40 w-[88%] rounded-full" />
                </div>
            </div>
        </div>
    );
}
