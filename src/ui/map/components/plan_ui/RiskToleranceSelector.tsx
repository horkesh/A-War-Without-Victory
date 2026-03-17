export type RiskTolerance = 'low' | 'moderate' | 'high';

interface RiskToleranceSelectorProps {
    value: RiskTolerance;
    onChange: (val: RiskTolerance) => void;
}

const OPTIONS: { id: RiskTolerance; label: string; color: string }[] = [
    { id: 'low', label: 'DEFER TO SAFETY', color: 'text-interactive' },
    { id: 'moderate', label: 'BALANCED RISK', color: 'text-accent-gold' },
    { id: 'high', label: 'DECISIVE ACTION', color: 'text-rs' },
];

export function RiskToleranceSelector({ value, onChange }: RiskToleranceSelectorProps) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.2em]">Commitment / Risk</label>
            <div className="grid grid-cols-2 gap-1.5">
                {OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => onChange(opt.id)}
                        className={`p-2 border rounded text-left transition-all group ${value === opt.id
                            ? 'bg-white/10 border-accent-gold'
                            : 'bg-black/20 border-white/5 hover:border-white/10'
                            }`}
                    >
                        <div className={`text-[9px] font-black uppercase tracking-widest ${value === opt.id ? 'text-accent-gold' : 'text-slate-500 group-hover:text-slate-300'}`}>
                            {opt.label}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
